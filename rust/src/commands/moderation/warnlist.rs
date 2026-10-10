use super::banlist::{clamp_page_idx, dead_row, nav_buttons};
use super::*;
use poise::serenity_prelude as serenity;

/// Escape backticks in a warnlist field. Mirrors the TS
/// `.replace("`", "\\`")` calls: JS `String.replace` with a string
/// pattern replaces the first occurrence only.
fn escape_warn_field(s: &str) -> String {
    s.replacen('`', "\\`", 1)
}

/// Author mention for a warn row. Legacy rows (and rows without a
/// usable id) fall back to the `var_unknown` word.
fn author_mention(warn: &Warn, unknown: &str) -> String {
    match warn.author_id.as_deref().filter(|s| !s.is_empty()) {
        Some(id) => format!("<@{id}>"),
        None => unknown.to_string(),
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "warnlist",
    aliases("warns", "listwarns", "listwarn", "warnslist", "sanctions"),
    default_member_permissions = "MODERATE_MEMBERS"
)]
pub async fn mod_warnlist(
    ctx: Ctx<'_>,
    #[description = "Member"] member: serenity::User,
    #[description = "Page"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
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
    let mut cur = clamp_page_idx(page, total);
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
                    "mod-warnlist-prev",
                    "mod-warnlist-next",
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
            "mod-warnlist-prev" => cur = (cur + total - 1) % total,
            "mod-warnlist-next" => cur = (cur + 1) % total,
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur))
                        .components(vec![serenity::CreateActionRow::Buttons(nav_buttons(
                            "mod-warnlist-prev",
                            "mod-warnlist-next",
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
            serenity::EditMessage::new()
                .components(vec![dead_row("mod-warnlist-prev", "mod-warnlist-next")]),
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
        assert_eq!(author_mention(&warn_with(Some("123")), "Unknown"), "<@123>");
    }

    #[test]
    fn author_mention_falls_back_for_legacy_rows() {
        assert_eq!(author_mention(&warn_with(None), "Unknown"), "Unknown");
        assert_eq!(author_mention(&warn_with(Some("")), "Unknown"), "Unknown");
    }

    #[test]
    fn escape_warn_field_mirrors_js_replace() {
        assert_eq!(escape_warn_field("a`b`c"), "a\\`b`c");
        assert_eq!(escape_warn_field("plain"), "plain");
    }

    #[test]
    fn slash_option_names_match_ts() {
        // TS mod.ts warnlist option: member (`page` is a Rust-side
        // pagination extra with no TS counterpart).
        let cmd = mod_warnlist();
        let names: Vec<&str> = cmd.parameters.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names[0], "member");
    }
}
