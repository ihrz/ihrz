// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/ranks/*.
//
// TS keys: GUILD.RANKS {disable, xpChannels, ignoreChannels[], roles[],
// message}, USER.<uid>.RANKS {level, xp, xptotal, message}.
// XP engine (message counting) lives in events; card/podHTML->PNG render
// pending (see PORT_INVENTORY.md).

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RankEntry {
    #[serde(default)]
    pub level: u64,
    #[serde(default)]
    pub xp: u64,
    #[serde(default)]
    pub xptotal: u64,
}

pub fn ranks_key(user_id: u64) -> String {
    format!("RANKS.{user_id}")
}

/// XP needed for next level. Mirrors TS level curve (level * 100).
pub fn xp_needed(level: u64) -> u64 {
    level.saturating_mul(100).max(100)
}

/// Apply XP, leveling up while threshold crossed. Returns (new_entry, leveled).
pub fn apply_xp(mut e: RankEntry, amount: u64) -> (RankEntry, bool) {
    e.xp += amount;
    e.xptotal += amount;
    let mut leveled = false;
    while e.xp >= xp_needed(e.level + 1) {
        e.xp -= xp_needed(e.level + 1);
        e.level += 1;
        leveled = true;
    }
    (e, leveled)
}

pub async fn load_rank(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> RankEntry {
    crate::db::kv_get(pool, guild_id, &ranks_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Ignore-list helpers. Mirrors !ignore-channels.ts
/// (GUILD.RANKS.ignoreChannels[]).
pub fn toggle_ignore(mut list: Vec<String>, channel_id: &str) -> (Vec<String>, bool) {
    if let Some(pos) = list.iter().position(|c| c == channel_id) {
        list.remove(pos);
        (list, false)
    } else {
        list.push(channel_id.to_string());
        (list, true)
    }
}

async fn load_ignore(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    crate::db::kv_get(pool, guild_id, "GUILD.RANKS.ignoreChannels")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Level-role rewards. Mirrors !roles.ts (GUILD.RANKS.roles[]).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RankRole {
    pub role_id: String,
    pub level: u64,
}

async fn load_rank_roles(pool: &crate::db::Pool, guild_id: &str) -> Vec<RankRole> {
    crate::db::kv_get(pool, guild_id, "GUILD.RANKS.roles")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub mod channel;
pub mod config;
pub mod grant;
pub mod greset;
pub mod ignore_channels;
pub mod leaderboard;
pub mod message;
#[allow(clippy::module_inception)]
pub mod ranks;
pub mod roles;
pub mod show;
pub mod ureset;

/// Old registry path (`ranks::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::channel::*;
    pub use super::config::*;
    pub use super::grant::*;
    pub use super::greset::*;
    pub use super::ignore_channels::*;
    pub use super::leaderboard::*;
    pub use super::message::*;
    pub use super::ranks::*;
    pub use super::roles::*;
    pub use super::show::*;
    pub use super::ureset::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xp_curve_starts_at_100() {
        assert_eq!(xp_needed(0), 100);
        assert_eq!(xp_needed(1), 100);
        assert_eq!(xp_needed(5), 500);
    }

    #[test]
    fn apply_xp_levels_up() {
        let (e, leveled) = apply_xp(RankEntry::default(), 150);
        assert!(leveled);
        assert_eq!(e.level, 1);
        assert_eq!(e.xp, 50);
        assert_eq!(e.xptotal, 150);
    }

    #[test]
    fn apply_xp_no_level() {
        let (e, leveled) = apply_xp(RankEntry::default(), 50);
        assert!(!leveled);
        assert_eq!(e.level, 0);
    }
}
