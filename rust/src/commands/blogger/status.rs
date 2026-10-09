use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "status",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_status(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    save_blog_string(
        &ctx.data().pool,
        &gid,
        "BLOGGER.enabled",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Blogger on."
    } else {
        "Blogger off."
    })
    .await?;
    Ok(())
}
