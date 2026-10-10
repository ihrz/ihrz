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
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_config_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Starboard module is now ${action}**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", if enabled { "on" } else { "off" });
    ctx.say(text).await?;
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
    let yes = yes_markup(ctx.http()).await;
    let chan = format!("<#{}>", channel.id.get());
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_channel_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Starboard channel is now defined to be: ${channel.toString()}**. Now, when server members react '⭐' to messages and the threshold of **`${baseData.threshold}`** is exceeded, the message is sent to the ${channel.toString()}!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${channel.toString()}", &chan)
    .replace("${baseData.threshold}", &cfg.threshold.to_string());
    ctx.say(text).await?;
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
    // TS quirk: only out-of-range amounts are stored; in-range amounts
    // echo back while the stored threshold is left untouched.
    let (display, store) = resolve_threshold_reply_and_store(amount);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    if let Some(next) = store {
        cfg.threshold = next;
    }
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_threshold_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '⭐' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${amount}", &display.to_string());
    ctx.say(text).await?;
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
    let yes = yes_markup(ctx.http()).await;
    let action_text = crate::commands::lang_for(
        &ctx,
        if create {
            "starboard_create_thread_yes"
        } else {
            "starboard_create_thread_no"
        },
        if create {
            "and a discussion thread will be created"
        } else {
            "and a discussion thread will not be created"
        },
    )
    .await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_create_thread_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '⭐' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel **`${action}`**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", &action_text)
    .replace("${amount}", &cfg.threshold.to_string());
    ctx.say(text).await?;
    Ok(())
}
