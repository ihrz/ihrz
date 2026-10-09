use super::*;

/// Skullboard parent command. Mirrors skullboard.ts (no parent aliases in TS).
#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "skullboard",
    subcommands("skull_config", "skull_channel", "skull_threshold", "skull_thread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skullboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Enable or disable the module. Mirrors skullboard !config.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("skullboardconfig"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.enabled = if enabled {
        "yes".to_string()
    } else {
        "no".to_string()
    };
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    ctx.say(format!("skullboard {}", cfg.enabled)).await?;
    Ok(())
}

/// Change the board channel. Mirrors skullboard !channel.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("skullboardchannel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_channel(
    ctx: Ctx<'_>,
    #[description = "Target channel"]
    #[channel_types("Text", "News")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.channel = channel.id.get().to_string();
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    ctx.say("skullboard channel set.").await?;
    Ok(())
}

/// Skulls needed (2-10). Mirrors skullboard !threshold.ts (clamped).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "threshold",
    aliases("skullboardthreshold"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_threshold(
    ctx: Ctx<'_>,
    #[description = "Skulls needed (2-10)"] amount: i64,
) -> Result<(), anyhow::Error> {
    let clamped = clamp_threshold(amount);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.threshold = clamped;
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    ctx.say(format!("skullboard threshold: {clamped}")).await?;
    Ok(())
}

/// Toggle thread creation. Mirrors skullboard !create-thread.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create-thread",
    aliases("skullboardthread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: String,
) -> Result<(), anyhow::Error> {
    let create = matches!(action.to_ascii_lowercase().as_str(), "yes" | "on");
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.create_thread = create;
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    ctx.say(format!("skullboard create_thread: {create}"))
        .await?;
    Ok(())
}
