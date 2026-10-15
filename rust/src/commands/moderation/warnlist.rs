use super::banlist::{dead_row, nav_buttons, wrap_page};
use super::*;
use poise::serenity_prelude as serenity;

/// Escape every backtick in a warnlist field so the `` `reason` `` code
/// fence cannot break. !warnlist.ts:94-100 uses JS `.replace("`",
/// ...)` (string pattern: first occurrence only); global here is a
/// deliberate fix — a reason with two or more backticks would
/// otherwise render broken.
fn escape_warn_field(s: &str) -> String {
    s.replace('`', "\\`")
}

/// Raw author id for a warn row. The `warnlist_embed_desc` template
/// already wraps the placeholder (`> Author: <@${x.authorID}>`), so
/// like !warnlist.ts:94-100 this substitutes the bare id — never a
/// pre-wrapped mention. Legacy rows (and rows without a usable id)
/// fall back to the `var_unknown` word.
fn author_mention(warn: &Warn, unknown: &str) -> String {
    match warn.author_id.as_deref().filter(|s| !s.is_empty()) {
        Some(id) => id.to_string(),
        None => unknown.to_string(),
    }
}

/// show all warns of a user
// TS-exact options: only `member` (!warnlist.ts reads `member` via
// `interaction.options.getMember("member")`; there is no `page`
// option — the command always opens on the first page and pages via
// the `previousPage` / `nextPage` buttons (wrapping) on a 15-minute
// collector).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "warnlist",
    aliases("warns", "listwarns", "listwarn", "warnslist", "sanctions"),
    default_member_permissions = "MODERATE_MEMBERS",
    description_localized("fr", "afficher tout les avertissement d'un utilisateur"),
    description_localized("ja", "ユーザーの全警告を表示"),
    description_localized("ru", "показать все предупреждения пользователя"),
    description_localized("es-ES", "mostrar todas las advertencias de un usuario")
)]
pub async fn mod_warnlist(
    ctx: Ctx<'_>,
    #[description_localized("fr", "le membre que vous shouaiter vérifier")]
    #[description_localized("ja", "検索したいメンバー")]
    #[description_localized("ru", "Участник для поиска")]
    #[description_localized("es-ES", "El miembro que quieres buscar")]
    #[description = "The member you want to lookup"]
    member: serenity::User,
) -> Result<(), anyhow::Error> {
    // Ack first: mod.ts sets `thinking: true`, so TS defers the slash
    // reply before running; defer here for the same 3s window.
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let warns = load_warns(&ctx.data().pool, &gid, member.id.get()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    if warns.is_empty() {
        let no = emoji(&ctx, "No", "❌").await;
        ctx.say(
            crate::lang::get(&code, "warnlist_no_data")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.No}", &no)
                        .replace("${member?.toString()}", &member.to_string())
                })
                .unwrap_or_else(|| "No warns.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS uses a collector `filter` (author only), so foreign presses are
    // silently ignored; only banlist replies `help_not_for_you`.
    let page_word = t("var_page", "Page");
    let name = member
        .global_name
        .clone()
        .unwrap_or_else(|| member.name.clone());
    let unknown = t("var_unknown", "Unknown");
    // One (title, description) pair per page, like the TS `pages` array.
    let pages: Vec<(String, String)> = warns
        .chunks(LIST_PAGE_SIZE)
        .enumerate()
        .map(|(i, chunk)| {
            let title = t(
                "warnlist_embed_title",
                "${member?.user.globalName}'s WarnList | Page ${i / usersPerPage + 1}",
            )
            .replace("${member?.user.globalName}", &name)
            .replace("${i / usersPerPage + 1}", &(i + 1).to_string());
            let body = chunk
                .iter()
                .map(|w| {
                    t(
                        "warnlist_embed_desc",
                        "### ID: ${x.id} - ${format(x.timestamp, 'DD/MM/YYYY')}\n> Author: <@${x.authorID}>\n> Reason: `${x.reason}`",
                    )
                    .replace("${x.id}", &w.id)
                    .replace(
                        "${format(x.timestamp, 'DD/MM/YYYY')}",
                        // VERDICT (UTC, kept deliberately): the TS `format`
                        // helper reads local-time getters while this port
                        // formats UTC; warn dates stay UTC here by design.
                        &escape_warn_field(&crate::funcs::format_date(w.at / 1000, "DD/MM/YYYY")),
                    )
                    .replace("${x.authorID}", &escape_warn_field(&author_mention(w, &unknown)))
                    .replace("${x.reason}", &escape_warn_field(&w.reason))
                })
                .collect::<Vec<_>>()
                .join("\n");
            (title, body)
        })
        .collect();
    let total = pages.len();
    // TS always opens on the first page (no `page` option).
    let mut cur = 0usize;
    let author = ctx.author().id;
    let mk_embed = |cur: usize| {
        serenity::CreateEmbed::default()
            .title(pages[cur].0.clone())
            .description(pages[cur].1.clone())
            .footer(serenity::CreateEmbedFooter::new(format!(
                "{page_word} {}/{}",
                cur + 1,
                total
            )))
            .colour(0x010101)
            .timestamp(serenity::Timestamp::now())
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(cur))
                .components(vec![serenity::CreateActionRow::Buttons(nav_buttons(
                    "previousPage",
                    "nextPage",
                    cur,
                    total,
                ))]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    // 15-minute collector; paging wraps around like the TS modulo.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60 * 15))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            continue;
        }
        match press.data.custom_id.as_str() {
            "previousPage" => cur = wrap_page(cur, total, false),
            "nextPage" => cur = wrap_page(cur, total, true),
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur))
                        .components(vec![serenity::CreateActionRow::Buttons(nav_buttons(
                            "previousPage",
                            "nextPage",
                            cur,
                            total,
                        ))]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![dead_row("previousPage", "nextPage")]),
        )
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn warn_with(author_id: Option<&str>) -> Warn {
        Warn {
            id: "x".into(),
            reason: "r".into(),
            at: 1,
            author_id: author_id.map(|s| s.to_string()),
        }
    }

    #[test]
    fn author_mention_renders_real_author() {
        // Template already holds `<@...>`; substitute the bare id.
        assert_eq!(author_mention(&warn_with(Some("123")), "Unknown"), "123");
    }

    #[test]
    fn author_mention_falls_back_for_legacy_rows() {
        assert_eq!(author_mention(&warn_with(None), "Unknown"), "Unknown");
        assert_eq!(author_mention(&warn_with(Some("")), "Unknown"), "Unknown");
    }

    #[test]
    fn escape_warn_field_is_global() {
        // JS `.replace` with a string pattern stops at the first
        // backtick (!warnlist.ts:94-100); Rust escapes all of them so
        // multi-backtick reasons cannot break the code fence.
        assert_eq!(escape_warn_field("a`b`c"), "a\\`b\\`c");
        assert_eq!(escape_warn_field("plain"), "plain");
    }

    #[test]
    fn author_id_is_not_double_wrapped_by_template() {
        // End-to-end placeholder shape: template `<@${x.authorID}>` +
        // bare id must render exactly one mention, like TS.
        let template = "> Author: <@${x.authorID}>";
        let out = template.replace(
            "${x.authorID}",
            &author_mention(&warn_with(Some("123")), "Unknown"),
        );
        assert_eq!(out, "> Author: <@123>");
    }

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts warnlist option: member (only option; paging is via
        // the previousPage/nextPage buttons).
        let cmd = mod_warnlist();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["member"]);
    }
}
