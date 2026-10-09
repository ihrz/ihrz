use super::*;

/// Starboard parent command. Mirrors starboard.ts (no parent aliases in TS).
#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "starboard",
    subcommands(
        "starboard_config",
        "starboard_channel",
        "starboard_threshold",
        "starboard_thread"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Enable or disable the module. Mirrors !config.ts.
// Prefix alias "starboarconfig" keeps the exact TS prefixName (typo included).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("starboarconfig"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.enabled = if enabled {
        "yes".to_string()
    } else {
        "no".to_string()
    };
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    ctx.say(format!("starboard {}", cfg.enabled)).await?;
    Ok(())
}

/// Change the board channel. Mirrors !channel.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("starboard-channel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_channel(
    ctx: Ctx<'_>,
    #[description = "Target channel"]
    #[channel_types("Text", "News")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.channel = channel.id.get().to_string();
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    ctx.say("starboard channel set.").await?;
    Ok(())
}

/// Stars needed (2-10). Mirrors !threshold.ts (clamped, see clamp_threshold).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "threshold",
    aliases("starboardthreshold"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_threshold(
    ctx: Ctx<'_>,
    #[description = "Stars needed (2-10)"] amount: i64,
) -> Result<(), anyhow::Error> {
    let clamped = clamp_threshold(amount);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.threshold = clamped;
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    ctx.say(format!("starboard threshold: {clamped}")).await?;
    Ok(())
}

/// Toggle thread creation. Mirrors !create-thread.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create-thread",
    aliases("starboardthread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: String,
) -> Result<(), anyhow::Error> {
    let create = matches!(action.to_ascii_lowercase().as_str(), "yes" | "on");
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.create_thread = create;
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    ctx.say(format!("starboard create_thread: {create}"))
        .await?;
    Ok(())
}
