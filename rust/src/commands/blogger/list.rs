use super::*;

/// Show all configured blog RSS feeds
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    aliases("blog-list"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let blogs = load_blogs(&ctx.data().pool, &gid).await;
    // Blogs + configuration embeds (TS !list.ts sends
    // generateBlogsEmbed + generateConfigurationEmbed). Names resolve
    // live with channel mentions, like generateBlogsEmbed.
    let rows = blog_display_rows(ctx.http(), &blogs).await;
    let enabled = load_blogger_enabled(&ctx.data().pool, &gid).await;
    ctx.send(
        poise::CreateReply::default()
            .embed(blogs_embed(&code, &rows))
            .embed(config_embed(&code, enabled, blogs.len())),
    )
    .await?;
    Ok(())
}
