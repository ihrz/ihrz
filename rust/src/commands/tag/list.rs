use super::*;

/// List tags (one info embed per tag, chunked pages).
// Mirrors !list.ts per-tag embeds (tagHelper shape + stored embed).
// Nearest-viable pager: no component-dispatch hook here, so pages go
// out chunked (10 embeds max) with a Page x/y line, no buttons.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    aliases("tag-list"),
    default_member_permissions = "ADMINISTRATOR"
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
            "{} > **{}:** <@{}>\n{} > **{}:** {created}\n{} > **{}:** {updated}\n{} > **{}:** **{}**\n{} > **{}:** {updated_by}\n{} > **{}:** ** {content}**",
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
    for (i, embeds) in pages.into_iter().enumerate() {
        let footer = format!("{} {}/{}", page_lbl, i + 1, total);
        if i == 0 {
            let mut reply = poise::CreateReply::default().content(footer);
            for embed in embeds {
                reply = reply.embed(embed);
            }
            ctx.send(reply).await?;
        } else {
            // Follow-up page: plain channel message.
            let mut builder = poise::serenity_prelude::CreateMessage::default().content(footer);
            builder = builder.embeds(embeds);
            ctx.channel_id().send_message(ctx.http(), builder).await?;
        }
    }
    Ok(())
}
