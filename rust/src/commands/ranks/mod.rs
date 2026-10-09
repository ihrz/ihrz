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
    // Routed owner: table-first with legacy fallback (see show.rs).
    show::load_rank_routed(pool, guild_id, user_id).await
}

/// Routed owner: dual-write (table + legacy kv) so kv-only readers stay fresh.
pub async fn save_rank(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    entry: &RankEntry,
) -> anyhow::Result<()> {
    show::save_rank_routed(pool, guild_id, user_id, entry).await
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

    async fn mem_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:")
            .unwrap()
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn owner_load_rank_delegates_to_routed() {
        use crate::commands::owner::main::table_backend;
        let pool = mem_pool().await;
        // Legacy-only row surfaces through the owner.
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_rank(&pool, "g", 1).await.level, 2);
        // Table-only row wins (no legacy row present).
        table_backend(&pool)
            .table("g")
            .set(
                "RANKS.2",
                serde_json::json!({"level": 5, "xp": 1, "xptotal": 501}),
            )
            .await
            .unwrap();
        assert_eq!(load_rank(&pool, "g", 2).await.level, 5);
        assert_eq!(load_rank(&pool, "g", 9).await.level, 0);
    }
}
