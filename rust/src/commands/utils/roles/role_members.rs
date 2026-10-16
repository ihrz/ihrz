use super::*;
use poise::serenity_prelude as serenity;

// Collector lifetime from !role-members.ts (`1_60_000` ms).
pub const ROLE_MEMBERS_COLLECTOR_SECS: u64 = 160;

// Role members pager size from !role-members.ts.
pub const ROLE_MEMBERS_PER_PAGE: usize = 5;

/// See all server member(s) who have the same roles
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "role-members",
    discard_spare_arguments,
    aliases("rolemembers", "rolemember"),
    default_member_permissions = "MANAGE_ROLES",
    description_localized(
        "fr",
        "Afficher tout les membres d'un serveur qui possèdent le même rôle"
    ),
    description_localized("ja", "同じロールを持つ全サーバーメンバーを表示"),
    description_localized("ru", "Показать участников с одинаковыми ролями"),
    description_localized(
        "es-ES",
        "Ver todos los miembros del servidor que tienen los mismos roles"
    )
)]
pub async fn role_members(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le rôle que vous voulez vérifier")]
    #[description_localized("ja", "確認したいロール")]
    #[description_localized("ru", "Роль для проверки")]
    #[description_localized("es-ES", "El rol que quieres comprobar")]
    #[description = "The role you want to check"]
    // Nullable: TS prefix `method.role(...)!` throws on a null role and
    // the body answers `addrolereact_role_not_found`; `Option` plus
    // `discard_spare_arguments` reaches the body as None instead of
    // hard-erroring as ArgumentParse.
    role: Option<poise::serenity_prelude::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS checkCommandArgs counts first (`role` required:true in
    // HybridCommands/utils/util/util.ts): a bare `.util role-members`
    // renders the caret usage embed, never the not-found content leg
    // (wlvc/unwlvc precedent). The content leg below stays for
    // unresolvable-role input, mirroring !role-members.ts.
    if let poise::Context::Prefix(pctx) = ctx {
        if prefix_role_missing(pctx.args) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
    // Null role: TS replies the not-found key (!role-members.ts).
    let Some(role) = role else {
        ctx.say(
            crate::lang::get(&code, "addrolereact_role_not_found")
                .unwrap_or_else(|| "Role not found.".to_string()),
        )
        .await?;
        return Ok(());
    };
    // TS reads `role.members` (gateway cache). Fetch over HTTP too so
    // members missing from the cache are still listed; cache fills the
    // gaps of the paged HTTP endpoint.
    let mut seen = std::collections::HashSet::new();
    let mut entries: Vec<String> = Vec::new();
    let mut push_member = |id: serenity::UserId, bot: bool| {
        if seen.insert(id) {
            entries.push(format_role_member(id.get(), bot));
        }
    };
    for m in guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default()
    {
        if m.roles.contains(&role.id) {
            push_member(m.user.id, m.user.bot);
        }
    }
    if let Some(g) = ctx.serenity_context().cache.guild(guild_id) {
        for m in g.members.values().filter(|m| m.roles.contains(&role.id)) {
            push_member(m.user.id, m.user.bot);
        }
    }
    if entries.is_empty() {
        ctx.say(
            crate::lang::get(&code, "util_role_members_no_one")
                .unwrap_or_else(|| "There is nobody with that role on the server".to_string()),
        )
        .await?;
        return Ok(());
    }
    let pages = role_members_pages(&entries, &t("util_role_members"));
    let total = pages.len();
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let not_for_you = t("help_not_for_you");
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let footer_icon = footer_bytes.is_some();
    let mk_embed = |cur: usize| {
        let (title, desc) = pages[cur].clone();
        let mut footer =
            serenity::CreateEmbedFooter::new(crate::commands::shared::footer_page_text(
                &footer_name,
                &page_word,
                (cur + 1) as u64,
                total as u64,
            ));
        if footer_icon {
            footer = footer.icon_url("attachment://footer_icon.png");
        }
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0x01, 0x01, 0x01))
            .title(title)
            .description(desc)
            .footer(footer)
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = || {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("previousPage")
                .label("<<<")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("nextPage")
                .label(">>>")
                .style(serenity::ButtonStyle::Secondary),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0))
        .components(vec![mk_row()]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let mut cur = 0usize;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(ROLE_MEMBERS_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            // TS wraps around both ends.
            "previousPage" => cur = (cur + total - 1) % total,
            "nextPage" => cur = (cur + 1) % total,
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur))
                        .components(vec![mk_row()]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

// One pager line: mention plus the TS `🤖 (BOT)` suffix for bots.
pub fn format_role_member(user_id: u64, bot: bool) -> String {
    if bot {
        format!("<@{user_id}>🤖 (BOT)")
    } else {
        format!("<@{user_id}>")
    }
}

// Build pager pages (5 members each) sharing one title.
pub fn role_members_pages(entries: &[String], title: &str) -> Vec<(String, String)> {
    entries
        .chunks(ROLE_MEMBERS_PER_PAGE)
        .map(|chunk| (title.to_string(), chunk.join("\n")))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pages_chunk_by_five_with_shared_title() {
        let entries: Vec<String> = (0..6).map(|i| format!("<@{i}>")).collect();
        let pages = role_members_pages(&entries, "List of users who have the roles");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "List of users who have the roles");
        assert_eq!(pages[0].1, "<@0>\n<@1>\n<@2>\n<@3>\n<@4>");
        assert_eq!(pages[1].1, "<@5>");
    }

    #[test]
    fn bots_get_suffix_humans_do_not() {
        assert_eq!(format_role_member(1, true), "<@1>🤖 (BOT)");
        assert_eq!(format_role_member(2, false), "<@2>");
    }

    #[test]
    fn collector_window_is_160s() {
        assert_eq!(ROLE_MEMBERS_COLLECTOR_SECS, 160);
    }

    #[test]
    fn bare_prefix_role_counts_as_missing() {
        // Pins the TS checkCommandArgs gate: bare or whitespace-only
        // prefix args render the caret usage embed (prod `+role-members`
        // bare renders the framework usage embed), never the
        // `addrolereact_role_not_found` content reply.
        assert!(prefix_role_missing(""));
        assert!(prefix_role_missing("   "));
        assert!(!prefix_role_missing("<@&1132574182270570557>"));
    }
}
