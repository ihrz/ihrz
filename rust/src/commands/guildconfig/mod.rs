// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/guildconfig/* (autoreact,
// commandlimit, setlogschannel, support).
//
// TS keys: GUILD.AUTOREACT [{channelId, emoji}], UTILS.COMMAND_LIMITS
// {cmd: {count, windowMs}}, GUILD.SERVER_LOGS.<type>, GUILD.SUPPORT.

use crate::bot::Ctx;

use poise::serenity_prelude as serenity;

use serde::{Deserialize, Serialize};

use std::collections::HashMap;

pub use super::shared::{
    has_perm_requirements, load_all_cmd_perms, load_cmd_perms, load_guild_config, perm_key,
    save_guild_config, welcomer_set,
};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CommandLimit {
    pub count: u32,
    pub window_ms: i64,
}

/// Parse "10s/1m/1h" windows. Kept for the unit test; the command
/// itself uses the fuller time_ms port (mirrors to_ms).
pub fn parse_window_ms(s: &str) -> Option<i64> {
    let s = s.trim().to_ascii_lowercase();
    let (num, mult) = s
        .strip_suffix('s')
        .map(|n| (n, 1_000))
        .or_else(|| s.strip_suffix('m').map(|n| (n, 60_000)))
        .or_else(|| s.strip_suffix('h').map(|n| (n, 3_600_000)))?;
    let n: i64 = num.trim().parse().ok()?;
    if n <= 0 {
        None
    } else {
        Some(n * mult)
    }
}

pub const LOG_TYPES: [&str; 11] = [
    "antispam",
    "boosts",
    "channel",
    "messages",
    "moderation",
    "roles",
    "ticket",
    "voice",
    "confession",
    "economy",
    "all",
];

pub fn valid_log_type(t: &str) -> bool {
    LOG_TYPES.contains(&t)
}

/// Autoreact lookup. Mirrors Events/guildconfig/autoreact.ts: all emojis
/// configured for the channel fire.
pub fn autoreact_for_channel(list: &[serde_json::Value], channel_id: &str) -> Vec<String> {
    list.iter()
        .filter(|e| e.get("channelId").and_then(|c| c.as_str()) == Some(channel_id))
        .filter_map(|e| {
            e.get("emoji")
                .and_then(|x| x.as_str())
                .map(|s| s.to_string())
        })
        .collect()
}

/// Minimum account age check. Mirrors !too-new-account.ts
/// (GUILD.BLOCK_NEW_ACCOUNT {state, req}).
pub fn too_young(created_unix: i64, req_ms: i64, now_unix: i64) -> bool {
    req_ms > 0 && (now_unix - created_unix) * 1000 < req_ms
}

/// Custom automod detectors. Mirrors SlashCommands/guildconfig/automod/*
/// toggles (link, spam, mass-mention, discord-invite, telegram), enforced
/// in the message handler. Native Discord AutoMod rule sync pending.
pub fn automod_key(kind: &str) -> String {
    format!("GUILD.AUTOMOD.{kind}")
}

pub const AUTOMOD_KINDS: [&str; 5] = ["link", "spam", "mass-mention", "discord-invite", "telegram"];

/// discord.gg / discord.com/invite links (case-insensitive).
pub fn contains_discord_invite(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("discord.gg/")
        || lower.contains("discord.com/invite/")
        || lower.contains("discordapp.com/invite/")
}

/// t.me / telegram.me links.
pub fn contains_telegram_link(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("t.me/") || lower.contains("telegram.me/")
}

/// Bare http(s) links.
pub fn contains_link(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("http://") || lower.contains("https://")
}

/// Count user/role mentions in raw content.
pub fn mention_count(text: &str) -> usize {
    text.matches("<@").count() + text.matches("<@&").count()
}

macro_rules! automod_toggle {
    ($fn_name:ident, $sub:literal, $kind:literal) => {
        #[poise::command(slash_command, prefix_command, rename = $sub, default_member_permissions = "ADMINISTRATOR")]
        pub async fn $fn_name(
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
                &automod_key($kind),
                if enabled { "1" } else { "0" },
            )
            .await?;
            ctx.say(format!(
                "Automod {} {}.",
                $kind,
                if enabled { "on" } else { "off" }
            ))
            .await?;
            Ok(())
        }
    };
}

pub async fn load_ghost(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    crate::db::kv_get(pool, guild_id, ghost_key())
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Ghost-ping watch channels. Mirrors join-ghostping
/// (GUILD.GUILD_CONFIG.GHOST_PING.channels[]).
pub fn ghost_key() -> &'static str {
    "GUILD.GUILD_CONFIG.GHOST_PING.channels"
}

pub mod automod;
pub mod main;
