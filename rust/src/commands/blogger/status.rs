use super::*;

/// Blogger power choice. Mirrors the `power` on/off choices in
/// blogger.ts (display names `Power On` / `Power Off`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum BloggerPower {
    #[name = "Power On"]
    #[name = "on"]
    On,
    #[name = "Power Off"]
    #[name = "off"]
    Off,
}

/// Get the bot status!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "status",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_status(
    ctx: Ctx<'_>,
    #[description = "on or off"] power: BloggerPower,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS !status.ts reads `power` (choices on/off); only On enables.
    let enabled = matches!(power, BloggerPower::On);
    save_blog_string(
        &ctx.data().pool,
        &gid,
        "BLOGGER.enabled",
        if enabled { "1" } else { "0" },
    )
    .await?;
    // Lang status line + configuration embed (TS !status.ts sends
    // blogger_config_status_enabled/disabled + generateConfigurationEmbed).
    let content = if enabled {
        say(
            "blogger_config_status_enabled",
            "Blogger module has been **enabled**. RSS feeds will be monitored.",
        )
    } else {
        say(
            "blogger_config_status_disabled",
            "Blogger module has been **disabled**. RSS feeds will not be monitored.",
        )
    };
    let total = load_blogs(&ctx.data().pool, &gid).await.len();
    ctx.send(
        poise::CreateReply::default()
            .content(content)
            .embed(config_embed(&code, enabled, total)),
    )
    .await?;
    Ok(())
}
