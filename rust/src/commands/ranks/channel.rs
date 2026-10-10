use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("rchannel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                "GUILD.RANKS.channel",
                &ch.id.get().to_string(),
            )
            .await?;
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_enable")
                    .map(|s| s.replace("${argsid}", &ch.id.get().to_string()))
                    .unwrap_or_else(|| {
                        format!(
                            "You have successfully set the custom XP channel to <#{}>",
                            ch.id.get()
                        )
                    }),
            )
            .await?;
        }
        None => {
            crate::commands::owner::main::routed_del(
                &ctx.data().pool,
                &gid,
                &gid,
                "GUILD.RANKS.channel",
            )
            .await?;
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_disable").unwrap_or_else(
                    || "You have successfully disabled the custom XP channel!".to_string(),
                ),
            )
            .await?;
        }
    }
    Ok(())
}

/// XP allowlist channels. Only these channels grant XP when non-empty.
/// Complements the ignore list.
#[poise::command(slash_command, prefix_command, rename = "xp-channels")]
pub async fn ranks_xp_channels(
    ctx: Ctx<'_>,
    #[description = "Channel (omit to clear all)"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            let raw = crate::commands::owner::main::routed_get(
                &ctx.data().pool,
                &gid,
                &gid,
                "GUILD.RANKS.xpChannels",
            )
            .await;
            let mut list: Vec<String> = raw
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let id = ch.id.get().to_string();
            if !list.contains(&id) {
                list.push(id);
                crate::commands::owner::main::routed_set(
                    &ctx.data().pool,
                    &gid,
                    &gid,
                    "GUILD.RANKS.xpChannels",
                    &serde_json::to_string(&list)?,
                )
                .await?;
            }
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_enable")
                    .map(|s| s.replace("${argsid}", &ch.id.get().to_string()))
                    .unwrap_or_else(|| {
                        format!(
                            "You have successfully set the custom XP channel to <#{}>",
                            ch.id.get()
                        )
                    }),
            )
            .await?;
        }
        None => {
            let _ = crate::commands::owner::main::routed_del(
                &ctx.data().pool,
                &gid,
                &gid,
                "GUILD.RANKS.xpChannels",
            )
            .await;
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "setxpchannels_command_work_disable").unwrap_or_else(
                    || "You have successfully disabled the custom XP channel!".to_string(),
                ),
            )
            .await?;
        }
    }
    Ok(())
}
