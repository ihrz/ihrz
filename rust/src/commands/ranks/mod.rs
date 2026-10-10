// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/ranks/*.
//
// TS keys: GUILD.XP_LEVELING {disable, xpchannels, bypassChannels[],
// message, ranksRoles{}}, USER.<uid>.XP_LEVELING {level, xp, xptotal}.
// XP engine (message counting) lives in events; card/podHTML->PNG render
// pending (see PORT_INVENTORY.md).
//
// Legacy Rust keys (GUILD.RANKS.*, RANKS.<uid>) still read back and
// promote into the XP_LEVELING keys on load; saves dual-write both so
// kv-only readers (events_handler, leaderboard) stay fresh.

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

/// Canonical TS guild keys (DbGuildXpLeveling).
pub const GUILD_DISABLE_NEW: &str = "GUILD.XP_LEVELING.disable";
pub const GUILD_XPCHANNEL_NEW: &str = "GUILD.XP_LEVELING.xpchannels";
pub const GUILD_BYPASS_NEW: &str = "GUILD.XP_LEVELING.bypassChannels";
pub const GUILD_MESSAGE_NEW: &str = "GUILD.XP_LEVELING.message";
pub const GUILD_ROLES_NEW: &str = "GUILD.XP_LEVELING.ranksRoles";
/// Legacy Rust guild keys (pre-TS-parity). Read back as fallback.
pub const GUILD_DISABLE_OLD: &str = "GUILD.RANKS.disable";
pub const GUILD_XPCHANNEL_OLD_SINGLE: &str = "GUILD.RANKS.channel";
pub const GUILD_XPCHANNEL_OLD_LIST: &str = "GUILD.RANKS.xpChannels";
pub const GUILD_BYPASS_OLD: &str = "GUILD.RANKS.ignoreChannels";
pub const GUILD_MESSAGE_OLD: &str = "GUILD.RANKS.message";
pub const GUILD_ROLES_OLD: &str = "GUILD.RANKS.roles";

/// Canonical TS user key (XpLevelingUserSchema).
pub fn user_key_new(user_id: u64) -> String {
    format!("USER.{user_id}.XP_LEVELING")
}

/// Legacy Rust user key. Read back as fallback.
pub fn user_key_old(user_id: u64) -> String {
    format!("RANKS.{user_id}")
}

pub fn ranks_key(user_id: u64) -> String {
    user_key_new(user_id)
}

/// Routed read with old-key fallback: the new (TS-parity) key wins, a
/// legacy hit promotes into the new key so rows migrate lazily.
pub async fn migrated_get(
    pool: &crate::db::Pool,
    guild_id: &str,
    new_key: &str,
    old_keys: &[&str],
) -> Option<String> {
    use crate::commands::owner::main::{routed_get, routed_set};
    if let Some(v) = routed_get(pool, guild_id, guild_id, new_key).await {
        return Some(v);
    }
    for old in old_keys {
        if let Some(v) = routed_get(pool, guild_id, guild_id, old).await {
            let _ = routed_set(pool, guild_id, guild_id, new_key, &v).await;
            return Some(v);
        }
    }
    None
}

/// Routed write to the new key plus every legacy key (same bytes), so
/// old-key readers stay fresh while rows migrate.
pub async fn migrated_set(
    pool: &crate::db::Pool,
    guild_id: &str,
    new_key: &str,
    old_keys: &[&str],
    value: &str,
) -> anyhow::Result<()> {
    use crate::commands::owner::main::routed_set;
    routed_set(pool, guild_id, guild_id, new_key, value).await?;
    for old in old_keys {
        routed_set(pool, guild_id, guild_id, old, value).await?;
    }
    Ok(())
}

/// Routed delete across the new key and every legacy key. Returns true
/// when a row existed in either store under any of the keys.
pub async fn migrated_del(
    pool: &crate::db::Pool,
    guild_id: &str,
    new_key: &str,
    old_keys: &[&str],
) -> anyhow::Result<bool> {
    use crate::commands::owner::main::routed_del;
    let mut had = routed_del(pool, guild_id, guild_id, new_key).await?;
    for old in old_keys {
        if routed_del(pool, guild_id, guild_id, old).await? {
            had = true;
        }
    }
    Ok(had)
}

/// XP needed for next level. Mirrors TS level curve (level * 500).
pub fn xp_needed(level: u64) -> u64 {
    level.saturating_mul(500).max(500)
}

/// Coins rewarded on level-up. Mirrors ranks/onNewMessage.ts:
/// `randomNumber * memberBoost` credited via addCoins. The boost is the
/// float-preserving shop multiplier (already fallen back to 1 by
/// `member_boost_f64`); the product stays float like the TS number.
pub fn coins_for_levelup(xp_gain: u64, boost_mult: f64) -> f64 {
    (xp_gain as f64) * boost_mult
}

/// Apply one message of XP with TS onNewMessage.ts parity: the event
/// path defaults a missing/zero level to 1 (`baseData?.level || 1`),
/// then a SINGLE strict-`<` level-up per message
/// (`if (level * 500 < xp)`), subtracting the crossed threshold.
/// Returns (new_entry, leveled).
pub fn apply_xp(mut e: RankEntry, amount: u64) -> (RankEntry, bool) {
    let base = if e.level == 0 { 1 } else { e.level };
    e.xp += amount;
    e.xptotal += amount;
    let threshold = base.saturating_mul(500);
    if threshold < e.xp {
        e.xp -= threshold;
        e.level += 1;
        (e, true)
    } else {
        (e, false)
    }
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
/// (GUILD.XP_LEVELING.bypassChannels[], legacy GUILD.RANKS.ignoreChannels[]).
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
    ignore_channels::load_ignore_routed(pool, guild_id).await
}

/// Level-role rewards. Mirrors !roles.ts
/// (GUILD.XP_LEVELING.ranksRoles{}, legacy GUILD.RANKS.roles[]).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RankRole {
    pub role_id: String,
    pub level: u64,
}

/// Vec form (legacy) -> TS map form (`{ "<level>": "<roleId>" }`).
pub fn rank_roles_to_map(roles: &[RankRole]) -> serde_json::Map<String, serde_json::Value> {
    let mut map = serde_json::Map::new();
    for r in roles {
        map.insert(
            r.level.to_string(),
            serde_json::Value::String(r.role_id.clone()),
        );
    }
    map
}

/// TS map form -> vec form. Unknown levels are skipped; numbers coerce.
pub fn rank_roles_from_map(map: &serde_json::Map<String, serde_json::Value>) -> Vec<RankRole> {
    let mut out = Vec::new();
    for (level, role) in map {
        let Ok(level) = level.parse::<u64>() else {
            continue;
        };
        let role_id = match role {
            serde_json::Value::String(s) => s.clone(),
            other => other.to_string().trim_matches('"').to_string(),
        };
        out.push(RankRole { role_id, level });
    }
    out.sort_by_key(|r| r.level);
    out
}

/// Dual-shape parse: TS map (`ranksRoles`) or legacy vec (`roles[]`).
pub fn rank_roles_from_value(v: &serde_json::Value) -> Vec<RankRole> {
    match v {
        serde_json::Value::Object(map) => rank_roles_from_map(map),
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|e| serde_json::from_value(e.clone()).ok())
            .collect(),
        _ => Vec::new(),
    }
}

async fn load_rank_roles(pool: &crate::db::Pool, guild_id: &str) -> Vec<RankRole> {
    roles::load_rank_roles_routed(pool, guild_id).await
}

pub mod channel;
pub mod config;
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
    fn xp_curve_starts_at_500() {
        assert_eq!(xp_needed(0), 500);
        assert_eq!(xp_needed(1), 500);
        assert_eq!(xp_needed(2), 1000);
        assert_eq!(xp_needed(5), 2500);
    }

    #[test]
    fn levelup_reward_scales_with_boost() {
        assert_eq!(coins_for_levelup(35, 1.0), 35.0);
        assert_eq!(coins_for_levelup(37, 3.0), 111.0);
        // Float-preserving like the TS `randomNumber * memberBoost`.
        assert_eq!(coins_for_levelup(35, 2.5), 87.5);
    }

    #[test]
    fn apply_xp_levels_up() {
        let (e, leveled) = apply_xp(RankEntry::default(), 550);
        assert!(leveled);
        assert_eq!(e.level, 1);
        assert_eq!(e.xp, 50);
        assert_eq!(e.xptotal, 550);
    }

    #[test]
    fn apply_xp_single_strict_levelup_per_message() {
        // Fresh row defaults to effective level 1 (`|| 1` in TS) but the
        // stored level stays 0 until a threshold actually crosses.
        let (e, leveled) = apply_xp(RankEntry::default(), 35);
        assert!(!leveled);
        assert_eq!((e.level, e.xp, e.xptotal), (0, 35, 35));
        // Strict `<`: exactly at the threshold does NOT level.
        let (e, leveled) = apply_xp(
            RankEntry {
                level: 1,
                xp: 465,
                xptotal: 465,
            },
            35,
        );
        assert!(!leveled);
        assert_eq!((e.level, e.xp), (1, 500));
        // One message levels at most once, even far past the curve.
        let (e, leveled) = apply_xp(RankEntry::default(), 5000);
        assert!(leveled);
        assert_eq!((e.level, e.xp, e.xptotal), (1, 4500, 5000));
    }

    #[test]
    fn apply_xp_no_level() {
        let (e, leveled) = apply_xp(RankEntry::default(), 50);
        assert!(!leveled);
        assert_eq!(e.level, 0);
    }

    #[test]
    fn rank_roles_map_roundtrip() {
        let roles = vec![
            RankRole {
                role_id: "7".to_string(),
                level: 5,
            },
            RankRole {
                role_id: "9".to_string(),
                level: 2,
            },
        ];
        let map = rank_roles_to_map(&roles);
        assert_eq!(map.get("5").and_then(|v| v.as_str()), Some("7"));
        assert_eq!(
            rank_roles_from_map(&map),
            vec![
                RankRole {
                    role_id: "9".to_string(),
                    level: 2
                },
                RankRole {
                    role_id: "7".to_string(),
                    level: 5
                },
            ]
        );
    }

    #[test]
    fn rank_roles_from_legacy_vec() {
        let v = serde_json::json!([{"role_id": "7", "level": 5}]);
        assert_eq!(
            rank_roles_from_value(&v),
            vec![RankRole {
                role_id: "7".to_string(),
                level: 5
            }]
        );
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
    async fn owner_load_rank_prefers_new_key() {
        let pool = mem_pool().await;
        // Legacy-only row surfaces through the owner and promotes.
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_rank(&pool, "g", 1).await.level, 2);
        assert!(crate::db::kv_get(&pool, "g", "USER.1.XP_LEVELING")
            .await
            .is_some());
        // New-key row wins over the legacy row on conflict.
        migrated_set(
            &pool,
            "g",
            &user_key_new(2),
            &[&user_key_old(2)],
            r#"{"level":5,"xp":1,"xptotal":501}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.2",
            r#"{"level":9,"xp":0,"xptotal":9000}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_rank(&pool, "g", 2).await.level, 5);
        assert_eq!(load_rank(&pool, "g", 9).await.level, 0);
    }

    #[tokio::test]
    async fn migrated_set_dual_writes_old_and_new() {
        let pool = mem_pool().await;
        migrated_set(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD], "gg")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
                .await
                .as_deref(),
            Some("gg")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_OLD)
                .await
                .as_deref(),
            Some("gg")
        );
        assert!(
            migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
    }
}
