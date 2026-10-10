use super::*;

/// Subcommand for counter category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "counter",
    subcommands("counter_channel", "counter_config"),
    subcommand_required
)]
pub async fn counter(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Set the channel where user earn new xp level message!
// Mirrors `!channel.ts`: setting the channel writes the whole
// `COUNTER` blob with `config: "on"` (so this enables the module),
// replies `counter_channel_command_work`, and posts the
// `counter_channel_embed_*` embed into the target channel. The TS
// `else` leg (`counter_channel_command_error`) maps to a failed
// channel send here (the option is required, so a missing channel
// never reaches this body).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn counter_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "COUNTER.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    // Setting the channel enables the module (TS `config: "on"`).
    crate::db::kv_set(&ctx.data().pool, &gid, "COUNTER.config", "on").await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author = format!("<@{}>", ctx.author().id.get());
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0x333333))
        .title(
            crate::lang::get(&code, "counter_channel_embed_title")
                .unwrap_or_else(|| "Counter Module set Here!".to_string()),
        )
        .description(
            crate::lang::get(&code, "counter_channel_embed_desc")
                .map(|s| s.replace("${interaction.user}", &author))
                .unwrap_or_else(|| {
                    format!("{author} has set the Counter module here!\nUsers can now count numbers here!")
                }),
        )
        .timestamp(serenity::Timestamp::now());
    if channel
        .id
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await
        .is_err()
    {
        ctx.say(
            crate::lang::get(&code, "counter_channel_command_error")
                .map(|s| s.replace("${interaction.user}", &author))
                .unwrap_or_else(|| {
                    format!("{author}, the command returned an error. Please verify the channel you specified exists, and verify the Counter Module has been enabled!")
                }),
        )
        .await?;
        return Ok(());
    }
    ctx.say(
        crate::lang::get(&code, "counter_channel_command_work")
            .map(|s| {
                s.replace("${interaction.user}", &author)
                    .replace("${channel}", &format!("<#{}>", channel.id.get()))
            })
            .unwrap_or_else(|| "${interaction.user}, you have successfully set the Counter module to the channel ${channel}!".to_string()),
    )
    .await?;
    Ok(())
}

/// Config the message when user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn counter_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "COUNTER.config",
        if enabled { "on" } else { "off" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author = format!("<@{}>", ctx.author().id.get());
    ctx.say(if enabled {
        crate::lang::get(&code, "counter_config_command_action_on")
            .map(|s| s.replace("${interaction.user}", &author))
            .unwrap_or_else(|| format!("{author}, you have set to `Power On` the Counter Module.\nIf the channel doesn't exist, configure it with the command: **/counter channel**."))
    } else {
        crate::lang::get(&code, "counter_config_command_action_off")
            .map(|s| s.replace("${interaction.user}", &author))
            .unwrap_or_else(|| format!("{author}, you have set to `Power Off` the Counter Module."))
    })
    .await?;
    Ok(())
}
