use super::*;

#[poise::command(slash_command, prefix_command, rename = "info")]
pub async fn tag_info(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let name = tag_name.trim().to_ascii_lowercase();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let Some(e) = store.stored_tags.get(&name) else {
        ctx.say(
            crate::commands::lang_for(&ctx, "tag_delete_dnt_exist", "Tag doesn't exist.")
                .await
                .replace("${tag_name}", &tag_name),
        )
        .await?;
        return Ok(());
    };
    // App-emoji markups from the boot-warmed cache (was one REST fetch).
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
    let no_set = crate::commands::lang_for(&ctx, "var_no_set", "Not Set").await;
    let thumb = ctx
        .guild()
        .as_ref()
        .and_then(|g| g.icon_url())
        .or_else(|| Some(ctx.author().face()))
        .or_else(|| Some(ctx.serenity_context().cache.current_user().face()));
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
    let uses = e.uses;
    let author_lbl = crate::commands::lang_for(&ctx, "var_author", "Author").await;
    let created_lbl = crate::commands::lang_for(&ctx, "tag_embed_created_at", "Created At").await;
    let updated_lbl = crate::commands::lang_for(&ctx, "tag_embed_last_update", "Last Update").await;
    let uses_lbl = crate::commands::lang_for(&ctx, "var_uses", "Uses").await;
    let updated_by_lbl =
        crate::commands::lang_for(&ctx, "tag_embed_last_updated_by", "Last Updated By").await;
    let message_lbl = crate::commands::lang_for(&ctx, "var_message", "Message").await;
    let title_lbl = crate::commands::lang_for(&ctx, "tag_name", "Tag").await;
    let desc = format!(
        "{} > **{}:** <@{}>\n{} > **{}:** {created}\n{} > **{}:** {updated}\n{} > **{}:** **{uses}**\n{} > **{}:** {updated_by}\n{} > **{}:** ** {content}**",
        crown,
        author_lbl,
        e.create_by.trim(),
        sparkles,
        created_lbl,
        timer,
        updated_lbl,
        timer,
        uses_lbl,
        badge,
        updated_by_lbl,
        msg_cmd,
        message_lbl,
    );
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(format!("{title_lbl} #{name}"))
        .colour(0x00FFFF)
        .description(desc);
    if let Some(url) = thumb {
        embed = embed.thumbnail(url);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
