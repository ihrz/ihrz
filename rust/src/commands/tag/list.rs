use super::*;
use poise::serenity_prelude as serenity;

// Mirrors !list.ts per-tag embeds (tagHelper shape + stored embed) with
// the TS first/previous/page/next/last button row + 5-min collector +
// `embed_interaction_not_for_you` gate. Content pages stay chunked (10
// embeds max) with the Page x/y line; the pager steps through them on a
// single message instead of fanning out follow-up messages.
const PAGE_FIRST_ID: &str = "first";
const PAGE_PREV_ID: &str = "previous";
const PAGE_LABEL_ID: &str = "page";
const PAGE_NEXT_ID: &str = "next";
const PAGE_LAST_ID: &str = "last";
/// TS collector `time: 60_000 * 5` (5 minutes).
const PAGER_TIMEOUT_SECS: u64 = 300;
/// List all tags
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    aliases("tag-list"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Lister tous les tags"),
    description_localized("ja", "全タグを一覧表示"),
    description_localized("ru", "Показать все теги"),
    description_localized("es-ES", "Listar todas las etiquetas")
)]
pub async fn tag_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude::CreateEmbed;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let mut names: Vec<String> = store.stored_tags.keys().cloned().collect();
    names.sort();
    if names.is_empty() {
        ctx.say(t(
            "tag_list_no_anything",
            "There are no tags saved on this guild!",
        ))
        .await?;
        return Ok(());
    }
    // Emoji markups fetched once and shared by every per-tag embed.
    let http = ctx.http();
    let crown = crate::emojis::app_emoji_markup(http, "Crown")
        .await
        .unwrap_or_default();
    let sparkles = crate::emojis::app_emoji_markup(http, "Sparkles")
        .await
        .unwrap_or_default();
    let timer = crate::emojis::app_emoji_markup(http, "Timer")
        .await
        .unwrap_or_default();
    let badge = crate::emojis::app_emoji_markup(http, "Boosting24Months_Badge")
        .await
        .unwrap_or_default();
    let msg_cmd = crate::emojis::app_emoji_markup(http, "Message_Commands")
        .await
        .unwrap_or_default();
    let no_set = t("var_no_set", "Not Set");
    let author_lbl = t("var_author", "Author");
    let created_lbl = t("tag_embed_created_at", "Created At");
    let updated_lbl = t("tag_embed_last_update", "Last Update");
    let uses_lbl = t("var_uses", "Uses");
    let updated_by_lbl = t("tag_embed_last_updated_by", "Last Updated By");
    let message_lbl = t("var_message", "Message");
    let title_lbl = t("tag_name", "Tag");
    let page_lbl = t("var_page", "Page");
    let mut pages: Vec<Vec<CreateEmbed>> = vec![Vec::new()];
    for name in &names {
        let Some(e) = store.stored_tags.get(name) else {
            continue;
        };
        let created = if e.create_timestamp > 0 {
            format!("<t:{}:D>", e.create_timestamp / 1000)
        } else {
            no_set.clone()
        };
        let updated = if e.last_use_timestamp > 0 {
            format!("<t:{}:D>", e.last_use_timestamp / 1000)
        } else {
            no_set.clone()
        };
        let updated_by = if e.last_use_by.trim().is_empty() {
            no_set.clone()
        } else {
            format!("<@{}>", e.last_use_by.trim())
        };
        let content = if e.content.trim().is_empty() {
            no_set.clone()
        } else {
            e.content.clone()
        };
        let desc = format!(
            "{} > **{}:** <@{}>\n{} > **{}:** {created}\n{} > **{}:** {updated}\n{} > **{}:** **`{}`**\n{} > **{}:** {updated_by}\n{} > **{}:** ** {content}**",
            crown,
            author_lbl,
            e.create_by.trim(),
            sparkles,
            created_lbl,
            timer,
            updated_lbl,
            timer,
            uses_lbl,
            e.uses,
            badge,
            updated_by_lbl,
            msg_cmd,
            message_lbl,
        );
        let info = CreateEmbed::default()
            .title(format!("{title_lbl} #{name}"))
            .colour(0x00FFFF_u32)
            .description(desc);
        let page = pages.last_mut().expect("pages non-empty");
        page.push(info);
        // The tag's stored embed rides alongside its info embed.
        if crate::commands::utils::admin::embed_post::is_valid_embed_id(Some(&e.embed_id)) {
            let stored = crate::commands::owner::main::tbl_get(
                &ctx.data().pool,
                "metas",
                &crate::commands::utils::admin::embed_post::saved_embed_key(&e.embed_id),
            )
            .await
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|v| {
                crate::commands::utils::admin::embed_post::stored_embed_source(&v).cloned()
            });
            if let Some(source) = stored {
                let page = pages.last_mut().expect("pages non-empty");
                page.push(
                    crate::commands::utils::admin::embed_post::create_embed_from_source(&source),
                );
            }
        }
        // Discord caps a message at 10 embeds: start a new page group.
        if pages.last().expect("pages non-empty").len() >= 10 {
            pages.push(Vec::new());
        }
    }
    if pages.last().map(|p| p.is_empty()).unwrap_or(false) {
        pages.pop();
    }
    let total = pages.len().max(1);
    let mut current: usize = 0;
    let author = ctx.author().id;
    let not_for_you = t(
        "embed_interaction_not_for_you",
        "This interaction is not for you",
    );
    let mut reply = poise::CreateReply::default()
        .content(format!("{} {}/{}", page_lbl, 1, total))
        .components(pager_row(&page_lbl, 0, total));
    for embed in &pages[0] {
        reply = reply.embed(embed.clone());
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let http = ctx.http();
    // Button collector, author-gated like the TS legs
    // (`time: 60_000 * 5`).
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(PAGER_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.user.id != author {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        // Handle button interactions like the TS switch.
        current = step_page(current, total, press.data.custom_id.as_str());
        let _ = press
            .create_response(
                http,
                serenity::CreateInteractionResponse::Defer(
                    serenity::CreateInteractionResponseMessage::new(),
                ),
            )
            .await;
        let _ = msg
            .edit(
                http,
                serenity::EditMessage::new()
                    .content(format!("{} {}/{}", page_lbl, current + 1, total))
                    .embeds(pages[current].clone())
                    .components(pager_row(&page_lbl, current, total)),
            )
            .await;
    }
    // Collector `end` leg: clear the row like TS.
    let _ = msg
        .edit(http, serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

/// Pager step mirroring the TS button switch (first / previous / next /
/// last); unknown ids (including the disabled `page` label) hold.
pub fn step_page(current: usize, total: usize, action: &str) -> usize {
    if total == 0 {
        return 0;
    }
    match action {
        x if x == PAGE_FIRST_ID => 0,
        x if x == PAGE_PREV_ID => current.saturating_sub(1),
        x if x == PAGE_NEXT_ID => current.saturating_add(1).min(total - 1),
        x if x == PAGE_LAST_ID => total - 1,
        _ => current,
    }
}

/// Navigation row mirroring TS `getButtons`: first/previous disabled on
/// page 0, next/last disabled on the last page, the Page x/y label always
/// disabled.
pub fn pager_row(page_lbl: &str, current: usize, total: usize) -> Vec<serenity::CreateActionRow> {
    let at_first = current == 0;
    let at_last = current + 1 >= total;
    vec![serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(PAGE_FIRST_ID)
            .label("◀◀")
            .style(serenity::ButtonStyle::Primary)
            .disabled(at_first),
        serenity::CreateButton::new(PAGE_PREV_ID)
            .label("◀")
            .style(serenity::ButtonStyle::Primary)
            .disabled(at_first),
        serenity::CreateButton::new(PAGE_LABEL_ID)
            .label(format!("{page_lbl} {}/{}", current + 1, total))
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true),
        serenity::CreateButton::new(PAGE_NEXT_ID)
            .label("▶")
            .style(serenity::ButtonStyle::Primary)
            .disabled(at_last),
        serenity::CreateButton::new(PAGE_LAST_ID)
            .label("▶▶")
            .style(serenity::ButtonStyle::Primary)
            .disabled(at_last),
    ])]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pager_ids_and_timeout_match_ts() {
        // Byte-exact custom ids from `!list.ts` `getButtons`, 5-min
        // collector (`time: 60_000 * 5`).
        assert_eq!(PAGE_FIRST_ID, "first");
        assert_eq!(PAGE_PREV_ID, "previous");
        assert_eq!(PAGE_LABEL_ID, "page");
        assert_eq!(PAGE_NEXT_ID, "next");
        assert_eq!(PAGE_LAST_ID, "last");
        assert_eq!(PAGER_TIMEOUT_SECS, 300);
    }

    #[test]
    fn step_page_matches_ts_switch() {
        assert_eq!(step_page(2, 5, "first"), 0);
        assert_eq!(step_page(2, 5, "previous"), 1);
        assert_eq!(step_page(0, 5, "previous"), 0);
        assert_eq!(step_page(2, 5, "next"), 3);
        assert_eq!(step_page(4, 5, "next"), 4);
        assert_eq!(step_page(2, 5, "last"), 4);
        assert_eq!(step_page(2, 5, "page"), 2);
        assert_eq!(step_page(0, 1, "next"), 0);
        assert_eq!(step_page(0, 0, "next"), 0);
    }

    #[test]
    fn pager_row_disables_at_ends_like_ts() {
        let first = pager_row("Page", 0, 3);
        let dbg = format!("{first:?}");
        for id in [
            PAGE_FIRST_ID,
            PAGE_PREV_ID,
            PAGE_LABEL_ID,
            PAGE_NEXT_ID,
            PAGE_LAST_ID,
        ] {
            assert!(dbg.contains(id), "missing {id}");
        }
        assert!(dbg.contains("Page 1/3"));
        for label in ["◀◀", "◀", "▶", "▶▶"] {
            assert!(dbg.contains(label), "missing {label}");
        }
        // End states render their Page x/y label and disabled rows.
        assert!(format!("{:?}", pager_row("Page", 2, 3)).contains("Page 3/3"));
        assert!(format!("{:?}", pager_row("Page", 0, 1)).contains("disabled: true"));
    }
}
