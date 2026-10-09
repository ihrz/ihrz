// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/notifier/* +
// src/core/StreamNotifier.ts (config surface).
//
// TS keys: NOTIFIER.users[] {id_or_username, platform}, NOTIFIER.channelId,
// NOTIFIER.message, NOTIFIER.lastMediaNotified. Live author validation +
// 120s polling pending API keys; dedup helper in notifier.rs.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NotifierEntry {
    pub id_or_username: String,
    pub platform: String,
}

pub fn valid_platform(p: &str) -> bool {
    matches!(
        p.to_ascii_lowercase().as_str(),
        "twitch" | "youtube" | "kick"
    )
}

pub async fn load_entries(pool: &crate::db::Pool, guild_id: &str) -> Vec<NotifierEntry> {
    crate::db::kv_get(pool, guild_id, "NOTIFIER.users")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    entries: &[NotifierEntry],
) -> anyhow::Result<()> {
    crate::db::kv_set(
        pool,
        guild_id,
        "NOTIFIER.users",
        &serde_json::to_string(entries)?,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platforms() {
        assert!(valid_platform("twitch"));
        assert!(valid_platform("YouTube"));
        assert!(!valid_platform("nope"));
    }
}

pub mod add;
pub mod channel;
pub mod list;
pub mod message;
#[allow(clippy::module_inception)]
pub mod notifier;
pub mod remove;

/// Old registry path (`notifier::main::notifier`) kept working.
pub mod main {
    pub use super::notifier::*;
}
