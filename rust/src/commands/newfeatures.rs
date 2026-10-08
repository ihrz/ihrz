// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/newfeatures/* (nightmode, gitlines,
// counter). Nightmode collector UI flattened to config subs; the 60s
// scheduler tick lives in scheduler.rs.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NightmodeConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub start_hour: u8,
    #[serde(default = "default_end")]
    pub end_hour: u8,
}

fn default_end() -> u8 {
    7
}

pub fn valid_hour(h: i64) -> bool {
    (0..=23).contains(&h)
}

/// Night window check, overnight wrap included (e.g. 22h-7h).
/// Mirrors nightmodeManager tick.
pub fn night_active(start_hour: u8, end_hour: u8, now_hour: u8) -> bool {
    if start_hour == end_hour {
        return false;
    }
    if start_hour < end_hour {
        (start_hour..end_hour).contains(&now_hour)
    } else {
        now_hour >= start_hour || now_hour < end_hour
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "counter",
    subcommands("counter_channel", "counter_config")
)]
pub async fn counter(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

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
    ctx.say("Counter channel set.").await?;
    Ok(())
}

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
    ctx.say(if enabled {
        "Counter on."
    } else {
        "Counter off."
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "nightmode",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nightmode(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Start hour 0-23"] start: Option<i64>,
    #[description = "End hour 0-23"] end: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let mut cfg = NightmodeConfig {
        enabled,
        start_hour: 22,
        end_hour: 7,
    };
    if let Some(s) = start {
        if !valid_hour(s) {
            ctx.say("Bad start hour.").await?;
            return Ok(());
        }
        cfg.start_hour = s as u8;
    }
    if let Some(e) = end {
        if !valid_hour(e) {
            ctx.say("Bad end hour.").await?;
            return Ok(());
        }
        cfg.end_hour = e as u8;
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.NIGHT_MODE",
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    ctx.say(format!(
        "Nightmode {} ({}h-{}h).",
        if enabled { "on" } else { "off" },
        cfg.start_hour,
        cfg.end_hour
    ))
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "gitlines",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gitlines(
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
        "UTILS.git_lines",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Git lines on."
    } else {
        "Git lines off."
    })
    .await?;
    Ok(())
}

/// Anti-pub spam config (amount/type/state).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "punishpub"
)]
pub async fn punishpub(
    ctx: Ctx<'_>,
    #[description = "Flags before sanction"] amount: Option<i64>,
    #[description = "ban, kick or mute"] punishment: Option<String>,
    #[description = "on or off"] action: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.PUNISH.PUNISH_PUB").await;
    let mut cfg: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    if let Some(a) = amount {
        cfg["amountMax"] = serde_json::Value::from(a.max(1) - 1);
    }
    if let Some(p) = punishment {
        cfg["punishementType"] = serde_json::Value::String(p.trim().to_string());
    }
    if let Some(a) = action {
        cfg["state"] = serde_json::Value::String(
            if a.trim().eq_ignore_ascii_case("on") {
                "true"
            } else {
                "false"
            }
            .to_string(),
        );
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.PUNISH.PUNISH_PUB",
        &cfg.to_string(),
    )
    .await?;
    ctx.say("Punishpub updated.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hours_validate() {
        assert!(valid_hour(0) && valid_hour(23));
        assert!(!valid_hour(-1) && !valid_hour(24));
    }

    #[test]
    fn night_window_wraps_midnight() {
        assert!(night_active(22, 7, 23));
        assert!(night_active(22, 7, 3));
        assert!(!night_active(22, 7, 12));
        assert!(night_active(9, 17, 12));
        assert!(!night_active(9, 17, 20));
        assert!(!night_active(8, 8, 8));
    }
}
