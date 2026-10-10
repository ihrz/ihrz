use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_add(
    ctx: Ctx<'_>,
    #[description = "RSS feed URL"] rss: String,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let (valid, feed_title) = validate_rss_feed(rss.trim()).await;
    if !valid {
        ctx.say(say(
            "blogger_blog_add_invalid_rss",
            "The provided RSS feed is invalid or unreachable. Please check the URL and try again.",
        ))
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut blogs = load_blogs(&ctx.data().pool, &gid).await;
    // Snowflake-style id, like `SnowflakeUtil.generate()` in !add.ts.
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(DISCORD_EPOCH_MS + 1);
    let id = new_blog_id(now_ms);
    blogs.push(BlogEntry {
        id: id.clone(),
        rss: rss.trim().to_string(),
        channel_id: channel.id.get().to_string(),
    });
    // Insertion order is kept (TS pushes); dedup keeps the first
    // occurrence of each rss+channel pair like the TS findIndex filter.
    let mut seen = std::collections::HashSet::new();
    blogs.retain(|b| seen.insert((b.rss.clone(), b.channel_id.clone())));
    save_blogs(&ctx.data().pool, &gid, &blogs).await?;
    // TS `validation.name || "Unknown"`: a title-less feed still adds.
    let feed_title = feed_title.unwrap_or_else(|| "Unknown".to_string());
    let content = say(
        "blogger_blog_add_success",
        "RSS feed **${validation.name}** has been added! Notifications will be sent to ${channel.toString()} (ID: `${blogId}`)",
    )
    .replace("${channel.toString()}", &format!("<#{}>", channel.id.get()))
    .replace("${blogId}", &id)
    .replace("${validation.name}", &feed_title);
    // Success content + blogs embed (TS !add.ts sends the
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
