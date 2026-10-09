use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let blogs = load_blogs(&ctx.data().pool, &gid).await;
    ctx.say(if blogs.is_empty() {
        "No blogs.".to_string()
    } else {
        blogs
            .iter()
            .map(|b| format!("{}: {} -> <#{}>", b.id, b.rss, b.channel_id))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}
