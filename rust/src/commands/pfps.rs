// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/pfps/*.
//
// TS keys: <guild>.PFPS.disable (bool), <guild>.PFPS.channel.
// YAML: pfps_config_command_action_on/off, pfps_channel_*.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub use super::security::parse_on_off;

#[poise::command(
    slash_command,
    prefix_command,
    category = "pfps",
    rename = "pfps",
    subcommands("pfps_channel", "pfps_config"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn pfps(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "channel")]
pub async fn pfps_channel(
    ctx: Ctx<'_>,
    #[description = "PFPS channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "PFPS.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "pfps_channel_command_work")
        .map(|s| {
            s.replace("${interaction.user}", &ctx.author().to_string())
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
        })
        .unwrap_or_else(|| "PFPS channel set.".to_string());
    ctx.say(msg).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn pfps_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(&action) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_use_on_off").unwrap_or_else(|| "Use on/off.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let flag = if enabled { "0" } else { "1" };
    crate::db::kv_set(&ctx.data().pool, &gid, "PFPS.disable", flag).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "pfps_config_command_action_on"
    } else {
        "pfps_config_command_action_off"
    };
    ctx.say(
        crate::lang::get(&code, key)
            .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
            .unwrap_or_else(|| key.to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pfps_reuses_security_on_off_parser() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
    }
}
