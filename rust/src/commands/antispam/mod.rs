// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/antispam/* (!manage 780l,
// !bypass-roles, !ignore-channels).
//
// TS keys: GUILD.ANTISPAM {Enabled, Threshold, maxInterval, ignoreBots,
// removeMessages, punishment_type, punishTime}, GUILD.ANTISPAM.BYPASS_CHANNELS[],
// GUILD.ANTISPAM.BYPASS_ROLES[].
// Fresh-row defaults (!manage baseData): ignoreBots false, maxInterval 1900,
// Enabled true, Threshold 3, removeMessages true, punishment_type "mute",
// punishTime 15m. Presets (AntiSpamPreset): chill 1900 / guard 2700 /
// extreme 3200 maxInterval.
// The 780-line collector UI (!manage) is flattened to direct subcommands;
// runtime detection lives in Events/antispam (pending).

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AntispamConfig {
    #[serde(rename = "Enabled", alias = "enabled", default = "on")]
    pub enabled: bool,
    #[serde(rename = "Threshold", alias = "threshold", default = "def_threshold")]
    pub threshold: u32,
    #[serde(
        rename = "maxInterval",
        alias = "max_interval_ms",
        alias = "maxinterval",
        default = "def_interval"
    )]
    pub max_interval_ms: i64,
    #[serde(
        rename = "ignoreBots",
        alias = "ignore_bots",
        alias = "ignorebots",
        default
    )]
    pub ignore_bots: bool,
    #[serde(
        rename = "removeMessages",
        alias = "remove_messages",
        alias = "removemessages",
        default = "on"
    )]
    pub remove_messages: bool,
    #[serde(
        rename = "punishment_type",
        alias = "punishment",
        default = "def_punishment"
    )]
    pub punishment_type: String,
    #[serde(
        rename = "punishTime",
        alias = "punish_time_ms",
        alias = "punishtime",
        default = "def_punish_time"
    )]
    pub punish_time_ms: i64,
}

fn on() -> bool {
    true
}
fn def_threshold() -> u32 {
    3
}
fn def_interval() -> i64 {
    1900
}
fn def_punishment() -> String {
    "mute".to_string()
}
fn def_punish_time() -> i64 {
    900_000
}

impl Default for AntispamConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            threshold: 3,
            max_interval_ms: 1900,
            ignore_bots: false,
            remove_messages: true,
            punishment_type: "mute".into(),
            punish_time_ms: 900_000,
        }
    }
}

impl AntispamConfig {
    /// Preset configs mirroring !manage AntiSpamPreset. Bypass lists live
    /// under separate keys, so presets never touch them (like the TS
    /// spread that preserves baseData.BYPASS_*).
    pub fn chill() -> Self {
        Self {
            enabled: true,
            threshold: 7,
            max_interval_ms: 1900,
            ignore_bots: true,
            remove_messages: true,
            punishment_type: "mute".into(),
            punish_time_ms: 120_000,
        }
    }

    pub fn guard() -> Self {
        Self {
            enabled: true,
            threshold: 5,
            max_interval_ms: 2700,
            ignore_bots: false,
            remove_messages: true,
            punishment_type: "mute".into(),
            punish_time_ms: 240_000,
        }
    }

    pub fn extreme() -> Self {
        Self {
            enabled: true,
            threshold: 3,
            max_interval_ms: 3200,
            ignore_bots: false,
            remove_messages: true,
            punishment_type: "mute".into(),
            punish_time_ms: 1_800_000,
        }
    }

    /// Look up a preset by name ("chill" | "guard" | "extreme").
    pub fn preset(name: &str) -> Option<Self> {
        match name.trim().to_ascii_lowercase().as_str() {
            "chill" => Some(Self::chill()),
            "guard" => Some(Self::guard()),
            "extreme" => Some(Self::extreme()),
            _ => None,
        }
    }

    /// True for the !manage punishment select values (mute | kick | ban).
    pub fn is_valid_punishment(value: &str) -> bool {
        matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "mute" | "kick" | "ban"
        )
    }

    /// Per-field boolean setter mirroring the !manage yes/no selects.
    /// Accepts TS ("Enabled", "ignoreBots", "removeMessages") and
    /// snake_case spellings. False for unknown keys.
    pub fn set_bool(&mut self, key: &str, value: bool) -> bool {
        match key {
            "Enabled" | "enabled" => self.enabled = value,
            "ignoreBots" | "ignore_bots" | "ignorebots" => self.ignore_bots = value,
            "removeMessages" | "remove_messages" | "removemessages" => {
                self.remove_messages = value;
            }
            _ => return false,
        }
        true
    }

    /// Per-field numeric setter mirroring the !manage modals. Threshold is
    /// clamped like the slash config path (2-20); durations must be
    /// positive. False for unknown keys or out-of-range values.
    pub fn set_number(&mut self, key: &str, value: i64) -> bool {
        match key {
            "Threshold" | "threshold" => {
                self.threshold = value.clamp(2, 20) as u32;
            }
            "maxInterval" | "max_interval_ms" | "maxinterval" => {
                if value <= 0 {
                    return false;
                }
                self.max_interval_ms = value;
            }
            "punishTime" | "punish_time_ms" | "punishtime" => {
                if value <= 0 {
                    return false;
                }
                self.punish_time_ms = value;
            }
            _ => return false,
        }
        true
    }

    /// Punishment setter mirroring the !manage punish-type select.
    /// Only mute | kick | ban; false otherwise (config unchanged).
    pub fn set_punishment(&mut self, value: &str) -> bool {
        if !Self::is_valid_punishment(value) {
            return false;
        }
        self.punishment_type = value.trim().to_ascii_lowercase();
        true
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

    #[test]
    fn defaults_match_ts_fresh_row() {
        // !manage baseData fallback: ignoreBots false, maxInterval 1900,
        // Enabled true, Threshold 3, removeMessages true, mute, 15m.
        let cfg = AntispamConfig::default();
        assert!(cfg.enabled);
        assert_eq!(cfg.threshold, 3);
        assert_eq!(cfg.max_interval_ms, 1900);
        assert!(!cfg.ignore_bots);
        assert!(cfg.remove_messages);
        assert_eq!(cfg.punishment_type, "mute");
        assert_eq!(cfg.punish_time_ms, 900_000);
    }

    #[test]
    fn serializes_with_ts_field_names() {
        let v = serde_json::to_value(AntispamConfig::default()).unwrap();
        assert_eq!(v["Enabled"], serde_json::json!(true));
        assert_eq!(v["Threshold"], serde_json::json!(3));
        assert_eq!(v["maxInterval"], serde_json::json!(1900));
        assert_eq!(v["ignoreBots"], serde_json::json!(false));
        assert_eq!(v["removeMessages"], serde_json::json!(true));
        assert_eq!(v["punishment_type"], serde_json::json!("mute"));
        assert_eq!(v["punishTime"], serde_json::json!(900_000));
    }

    #[test]
    fn legacy_rows_read_both_casings() {
        // TS-shaped row (PascalCase/camelCase keys).
        let ts: AntispamConfig = serde_json::from_value(serde_json::json!({
            "Enabled": false,
            "Threshold": 7,
            "maxInterval": 2700,
            "ignoreBots": true,
            "removeMessages": false,
            "punishment_type": "ban",
            "punishTime": 240_000,
        }))
        .unwrap();
        assert!(!ts.enabled);
        assert_eq!(ts.threshold, 7);
        assert_eq!(ts.max_interval_ms, 2700);
        assert!(ts.ignore_bots);
        assert!(!ts.remove_messages);
        assert_eq!(ts.punishment_type, "ban");
        assert_eq!(ts.punish_time_ms, 240_000);
        // Old Rust-shaped row (snake_case keys) still reads.
        let rust: AntispamConfig = serde_json::from_value(serde_json::json!({
            "enabled": true,
            "threshold": 9,
            "max_interval_ms": 1500,
            "remove_messages": false,
            "punishment": "kick",
            "punish_time_ms": 60_000,
        }))
        .unwrap();
        assert!(rust.enabled);
        assert_eq!(rust.threshold, 9);
        assert_eq!(rust.max_interval_ms, 1500);
        assert!(!rust.ignore_bots);
        assert!(!rust.remove_messages);
        assert_eq!(rust.punishment_type, "kick");
        assert_eq!(rust.punish_time_ms, 60_000);
        // Sparse rows fall back to TS fresh-row defaults per field.
        let sparse: AntispamConfig =
            serde_json::from_value(serde_json::json!({"Threshold": 4})).unwrap();
        assert_eq!(sparse.threshold, 4);
        assert_eq!(sparse.max_interval_ms, 1900);
        assert_eq!(sparse.punishment_type, "mute");
    }

    #[test]
    fn presets_match_ts() {
        let chill = AntispamConfig::preset("chill").unwrap();
        assert_eq!(chill.max_interval_ms, 1900);
        assert_eq!(chill.threshold, 7);
        assert!(chill.ignore_bots);
        assert_eq!(chill.punish_time_ms, 120_000);
        let guard = AntispamConfig::preset("guard").unwrap();
        assert_eq!(guard.max_interval_ms, 2700);
        assert_eq!(guard.threshold, 5);
        assert!(!guard.ignore_bots);
        assert_eq!(guard.punish_time_ms, 240_000);
        let extreme = AntispamConfig::preset("extreme").unwrap();
        assert_eq!(extreme.max_interval_ms, 3200);
        assert_eq!(extreme.threshold, 3);
        assert!(!extreme.ignore_bots);
        assert_eq!(extreme.punish_time_ms, 1_800_000);
        for p in [chill, guard, extreme] {
            assert!(p.enabled);
            assert!(p.remove_messages);
            assert_eq!(p.punishment_type, "mute");
        }
        assert!(AntispamConfig::preset("bogus").is_none());
    }

    #[test]
    fn per_field_setters() {
        let mut cfg = AntispamConfig::default();
        assert!(cfg.set_bool("Enabled", false));
        assert!(!cfg.enabled);
        assert!(cfg.set_bool("ignoreBots", true));
        assert!(cfg.ignore_bots);
        assert!(cfg.set_bool("remove_messages", false));
        assert!(!cfg.remove_messages);
        assert!(!cfg.set_bool("bogus", true));
        assert!(cfg.set_number("Threshold", 50));
        assert_eq!(cfg.threshold, 20);
        assert!(cfg.set_number("threshold", 0));
        assert_eq!(cfg.threshold, 2);
        assert!(cfg.set_number("maxInterval", 2700));
        assert_eq!(cfg.max_interval_ms, 2700);
        assert!(!cfg.set_number("maxInterval", -5));
        assert!(cfg.set_number("punishTime", 60_000));
        assert_eq!(cfg.punish_time_ms, 60_000);
        assert!(!cfg.set_number("punishTime", 0));
        assert!(!cfg.set_number("bogus", 1));
        assert!(cfg.set_punishment("ban"));
        assert_eq!(cfg.punishment_type, "ban");
        assert!(cfg.set_punishment("KICK"));
        assert_eq!(cfg.punishment_type, "kick");
        assert!(!cfg.set_punishment("timeout"));
        assert_eq!(cfg.punishment_type, "kick");
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
