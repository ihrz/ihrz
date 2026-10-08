// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/antispam/* (!manage 780l,
// !bypass-roles, !ignore-channels).
//
// TS keys: GUILD.ANTISPAM {ignoreBots, maxInterval, enabled, threshold,
// removeMessages, punishment, punishTime}, GUILD.ANTISPAM.BYPASS_CHANNELS[],
// GUILD.ANTISPAM.BYPASS_ROLES[].
// The 780-line collector UI (!manage) is flattened to direct subcommands;
// runtime detection lives in Events/antispam (pending).

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AntispamConfig {
    #[serde(default = "on")]
    pub enabled: bool,
    #[serde(default = "def_threshold")]
    pub threshold: u32,
    #[serde(default = "def_interval")]
    pub max_interval_ms: i64,
    #[serde(default = "on")]
    pub remove_messages: bool,
    #[serde(default)]
    pub punishment: String,
    #[serde(default)]
    pub punish_time_ms: i64,
}

fn on() -> bool {
    true
}
fn def_threshold() -> u32 {
    5
}
fn def_interval() -> i64 {
    2000
}

impl Default for AntispamConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            threshold: 5,
            max_interval_ms: 2000,
            remove_messages: true,
            punishment: "mute".into(),
            punish_time_ms: 600_000,
        }
    }
}

pub const ANTISPAM_KEY: &str = "GUILD.ANTISPAM";

/// Sliding-window check: true when `count` messages inside `interval_ms`
/// reach the threshold (pure core of the detector).
pub fn window_tripped(count: u32, threshold: u32, interval_ms: i64, max_interval_ms: i64) -> bool {
    threshold > 0 && interval_ms <= max_interval_ms && count >= threshold
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "antispam",
    rename = "antispam",
    subcommands("as_config", "as_bypass_roles", "as_ignore_channels"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn antispam(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn as_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "messages threshold"] threshold: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, ANTISPAM_KEY).await;
    let mut cfg: AntispamConfig = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    cfg.enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    if let Some(t) = threshold {
        cfg.threshold = t.clamp(2, 20) as u32;
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        ANTISPAM_KEY,
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    ctx.say(format!(
        "Antispam {} (threshold {})",
        if cfg.enabled { "on" } else { "off" },
        cfg.threshold
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "bypass-roles")]
pub async fn as_bypass_roles(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = "GUILD.ANTISPAM.BYPASS_ROLES";
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, key).await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = role.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(&ctx.data().pool, &gid, key, &serde_json::to_string(&list)?).await?;
    }
    ctx.say("Bypass role added.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "ignore-channels")]
pub async fn as_ignore_channels(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = "GUILD.ANTISPAM.BYPASS_CHANNELS";
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, key).await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = channel.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(&ctx.data().pool, &gid, key, &serde_json::to_string(&list)?).await?;
    }
    ctx.say("Ignore channel added.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn window_logic() {
        assert!(window_tripped(5, 5, 1000, 2000));
        assert!(!window_tripped(4, 5, 1000, 2000));
        assert!(!window_tripped(9, 5, 5000, 2000));
        assert!(!window_tripped(9, 0, 100, 2000));
    }
}
