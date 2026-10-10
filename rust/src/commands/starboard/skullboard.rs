use super::*;

/// Skullboard parent command. Mirrors skullboard.ts (no parent aliases in TS).
#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "skullboard",
    subcommands("skull_config", "skull_channel", "skull_threshold", "skull_thread"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
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
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_config_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Skullboard module is now ${action}**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", if enabled { "on" } else { "off" });
    ctx.say(text).await?;
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
    #[rename = "to"]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.channel = channel.id.get().to_string();
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let chan = format!("<#{}>", channel.id.get());
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_channel_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Skullboard channel is now defined to be: ${channel.toString()}**. Now, when server members react '💀' to messages and the threshold of **`${baseData.threshold}`** is exceeded, the message is sent to ${channel.toString()}!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${channel.toString()}", &chan)
    .replace("${baseData.threshold}", &cfg.threshold.to_string());
    ctx.say(text).await?;
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
    // TS quirk: only out-of-range amounts are stored; in-range amounts
    // echo back while the stored threshold is left untouched.
    let (display, store) = resolve_threshold_reply_and_store(amount);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    if let Some(next) = store {
        cfg.threshold = next;
    }
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_threshold_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${amount}", &display.to_string());
    ctx.say(text).await?;
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
    let yes = yes_markup(ctx.http()).await;
    // TS skullboard create-thread reuses the starboard yes/no strings.
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
        "skullboard_create_thread_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel **`${action}`**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", &action_text)
    .replace("${amount}", &cfg.threshold.to_string());
    ctx.say(text).await?;
    Ok(())
}
