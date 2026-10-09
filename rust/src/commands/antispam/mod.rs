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

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

/// Table-routed load for the antispam config blob (keys unchanged).
pub async fn load_antispam(pool: &crate::db::Pool, guild_id: &str) -> AntispamConfig {
    table_value_or_legacy(pool, guild_id, ANTISPAM_KEY)
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// Table-routed write for the antispam config blob (keys unchanged).
pub async fn save_antispam(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &AntispamConfig,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(ANTISPAM_KEY, cfg)
        .await
}

/// Table-routed string-list load (bypass roles/channels) with legacy fallback.
pub async fn load_string_list(pool: &crate::db::Pool, guild_id: &str, key: &str) -> Vec<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// Table-routed string-list write (keys unchanged).
pub async fn save_string_list(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
    list: &[String],
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(key, list).await
}

/// Sliding-window check: true when `count` messages inside `interval_ms`
/// reach the threshold (pure core of the detector).
pub fn window_tripped(count: u32, threshold: u32, interval_ms: i64, max_interval_ms: i64) -> bool {
    threshold > 0 && interval_ms <= max_interval_ms && count >= threshold
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

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        let mut cfg = AntispamConfig::default();
        cfg.threshold = 9;
        save_antispam(&pool, "g1", &cfg).await.unwrap();
        assert_eq!(load_antispam(&pool, "g1").await.threshold, 9);
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.ANTISPAM'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read, table wins over legacy.
        crate::db::kv_set(&pool, "g2", ANTISPAM_KEY, r#"{"threshold":3}"#)
            .await
            .unwrap();
        assert_eq!(load_antispam(&pool, "g2").await.threshold, 3);
        crate::db::kv_set(&pool, "g1", ANTISPAM_KEY, r#"{"threshold":1}"#)
            .await
            .unwrap();
        assert_eq!(load_antispam(&pool, "g1").await.threshold, 9);
        // String lists round-trip with legacy fallback.
        save_string_list(
            &pool,
            "g1",
            "GUILD.ANTISPAM.BYPASS_ROLES",
            &["r1".to_string()],
        )
        .await
        .unwrap();
        assert_eq!(
            load_string_list(&pool, "g1", "GUILD.ANTISPAM.BYPASS_ROLES").await,
            vec!["r1".to_string()]
        );
        crate::db::kv_set(&pool, "g2", "GUILD.ANTISPAM.BYPASS_CHANNELS", r#"["c1"]"#)
            .await
            .unwrap();
        assert_eq!(
            load_string_list(&pool, "g2", "GUILD.ANTISPAM.BYPASS_CHANNELS").await,
            vec!["c1".to_string()]
        );
    }
}

#[allow(clippy::module_inception)]
pub mod antispam;
pub mod bypass_roles;
pub mod ignore_channels;
pub mod manage;

/// Old registry path (`antispam::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::antispam::*;
    pub use super::bypass_roles::*;
    pub use super::ignore_channels::*;
    pub use super::manage::*;
    pub use super::*;
}
