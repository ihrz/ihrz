use super::*;

/// Remove Streamer/Youtuber/Twitcher
#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    aliases("blog-remove"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_remove(
    ctx: Ctx<'_>,
    #[description = "Blog id"] id: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut blogs = load_blogs(&ctx.data().pool, &gid).await;
    let before = blogs.len();
    blogs.retain(|b| b.id != id.trim());
    if blogs.len() == before {
        ctx.say(say(
            "blogger_blog_remove_not_found",
            "No RSS feed found with this ID.",
        ))
        .await?;
        return Ok(());
    }
    save_blogs(&ctx.data().pool, &gid, &blogs).await?;
    let content = say(
        "blogger_blog_remove_success",
        "RSS feed with ID `${blogId}` has been removed.",
    )
    .replace("${blogId}", id.trim());
    // Success content + blogs embed (TS !remove.ts sends the
    // generateBlogsEmbed alongside).
    let rows = blog_display_rows(ctx.http(), &blogs).await;
    ctx.send(
        poise::CreateReply::default()
            .content(content)
            .embed(blogs_embed(&code, &rows)),
    )
    .await?;
    Ok(())
}
