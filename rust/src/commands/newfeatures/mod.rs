// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/newfeatures/* (nightmode, gitlines,
// counter). Nightmode collector UI flattened to config subs; the 60s
// scheduler tick lives in scheduler.rs.

use crate::bot::Ctx;

use poise::serenity_prelude as serenity;

use serde::{Deserialize, Serialize};

/// Nightmode blob. Mirrors DatabaseStructure.NightMode
/// (`UTILS.NIGHT_MODE`): enabled/notify/time[4]/wlBots/derankBot/utc.
/// The 60s scheduler tick (scheduler.rs sweep_nightmode) reads this
/// exact shape, so writers must keep it — the earlier
/// start_hour/end_hour struct never matched the tick reader.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NightmodeConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub notify: bool,
    /// [startHour, startMinute, endHour, endMinute]. TS default [21,0,9,0].
    #[serde(default = "default_time")]
    pub time: [u8; 4],
    #[serde(rename = "wlBots", default)]
    pub wl_bots: Vec<String>,
    #[serde(rename = "derankBot", default = "default_true")]
    pub derank_bot: bool,
    #[serde(default = "default_utc")]
    pub utc: i8,
}

fn default_true() -> bool {
    true
}

fn default_time() -> [u8; 4] {
    [21, 0, 9, 0]
}

fn default_utc() -> i8 {
    1
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

/// Last counter record. Mirrors COUNTER_DATA {amount, userId}
/// (plus the legacy bare-number shape, attributed to nobody).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CounterData {
    pub amount: i64,
    pub user_id: Option<String>,
}

pub fn parse_counter_data(raw: Option<&str>) -> CounterData {
    let fallback = CounterData {
        amount: 0,
        user_id: None,
    };
    let Some(raw) = raw else {
        return fallback;
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) else {
        return fallback;
    };
    if let Some(n) = value.as_i64() {
        return CounterData {
            amount: n,
            user_id: None,
        };
    }
    CounterData {
        amount: value.get("amount").and_then(|a| a.as_i64()).unwrap_or(0),
        user_id: value
            .get("userId")
            .and_then(|u| u.as_str())
            .map(|s| s.to_string()),
    }
}

pub fn counter_data_json(data: &CounterData) -> String {
    serde_json::json!({"amount": data.amount, "userId": data.user_id}).to_string()
}

/// TS Number() semantics for the counter: blank never counts;
/// non-finite Rust-only parses ("inf") do not count either.
pub fn counter_number(content: &str) -> Option<f64> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return None;
    }
    let n: f64 = trimmed.parse().ok()?;
    if n.is_finite() {
        Some(n)
    } else {
        None
    }
}

/// One counting-game step. Mirrors Events/counter/onNewMessage.ts:
/// exact next integer by a different user accepts; anything else
/// resets to zero (wrong number or repeat by the same user replies
/// with its own text, non-numbers get the syntax error).
#[derive(Debug, Clone, PartialEq)]
pub enum CounterOutcome {
    Accept { number: i64 },
    WrongNumber { same_user: bool, number: f64 },
    NotNumber,
}

pub fn counter_step(last: &CounterData, author_id: &str, content: &str) -> CounterOutcome {
    let Some(n) = counter_number(content) else {
        return CounterOutcome::NotNumber;
    };
    let is_next = n.fract() == 0.0 && n as i64 == last.amount + 1;
    let same_user = last.user_id.as_deref() == Some(author_id);
    if is_next && !same_user {
        CounterOutcome::Accept { number: n as i64 }
    } else {
        CounterOutcome::WrongNumber {
            same_user,
            number: n,
        }
    }
}

/// Rolesaver config (TS `GUILD.GUILD_CONFIG.rolesaver` blob
/// `{enable, timeout, admin}`; falls back to this bot's legacy
/// flat `.enable` row).
#[derive(Debug, Clone, Default)]
pub struct RolesaverCfg {
    pub enabled: bool,
    pub skip_admin: bool,
}

fn truthy(v: &serde_json::Value) -> bool {
    match v {
        serde_json::Value::Bool(b) => *b,
        serde_json::Value::Number(n) => n.as_i64().unwrap_or(0) != 0,
        serde_json::Value::String(s) => matches!(s.as_str(), "1" | "true"),
        _ => false,
    }
}

pub async fn load_rolesaver_cfg(pool: &crate::db::Pool, guild_id: &str) -> RolesaverCfg {
    if let Some(raw) = crate::db::tbl_get(pool, guild_id, "GUILD.GUILD_CONFIG.rolesaver").await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            return RolesaverCfg {
                enabled: v.get("enable").map(truthy).unwrap_or(false),
                skip_admin: v.get("admin").and_then(|a| a.as_str()) == Some("no"),
            };
        }
    }
    RolesaverCfg {
        enabled: rolesaver_enabled(pool, guild_id).await,
        skip_admin: false,
    }
}

pub async fn rolesaver_enabled(pool: &crate::db::Pool, guild_id: &str) -> bool {
    crate::db::tbl_get(pool, guild_id, "GUILD.GUILD_CONFIG.rolesaver.enable")
        .await
        .map(|v| v == "1")
        .unwrap_or(false)
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

    #[test]
    fn counter_game_steps_mirror_ts() {
        let fresh = CounterData {
            amount: 0,
            user_id: None,
        };
        // First count by anyone accepts.
        assert_eq!(
            counter_step(&fresh, "u1", "1"),
            CounterOutcome::Accept { number: 1 }
        );
        let one = CounterData {
            amount: 1,
            user_id: Some("u1".to_string()),
        };
        // Same user twice: wrong, flagged same_user.
        assert_eq!(
            counter_step(&one, "u1", "2"),
            CounterOutcome::WrongNumber {
                same_user: true,
                number: 2.0
            }
        );
        // Wrong number by another user.
        assert_eq!(
            counter_step(&one, "u2", "3"),
            CounterOutcome::WrongNumber {
                same_user: false,
                number: 3.0
            }
        );
        // Correct continuation.
        assert_eq!(
            counter_step(&one, "u2", "2"),
            CounterOutcome::Accept { number: 2 }
        );
        // Non-numbers and blanks never count.
        assert_eq!(counter_step(&one, "u2", "hi"), CounterOutcome::NotNumber);
        assert_eq!(counter_step(&one, "u2", "   "), CounterOutcome::NotNumber);
        // Fractions never accept.
        assert!(matches!(
            counter_step(&fresh, "u1", "1.5"),
            CounterOutcome::WrongNumber { .. }
        ));
    }

    #[test]
    fn counter_data_parses_shapes() {
        assert_eq!(
            parse_counter_data(None),
            CounterData {
                amount: 0,
                user_id: None
            }
        );
        // Legacy bare-number row.
        assert_eq!(
            parse_counter_data(Some("4")),
            CounterData {
                amount: 4,
                user_id: None
            }
        );
        let row = parse_counter_data(Some(r#"{"amount":7,"userId":"u9"}"#));
        assert_eq!(row.amount, 7);
        assert_eq!(row.user_id.as_deref(), Some("u9"));
        let reset = CounterData {
            amount: 0,
            user_id: None,
        };
        let json: serde_json::Value = serde_json::from_str(&counter_data_json(&reset)).unwrap();
        assert_eq!(json["amount"], 0);
        assert!(json["userId"].is_null());
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn rolesaver_cfg_reads_legacy_blob() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            r#"{"enable":true,"timeout":"None","admin":"no"}"#,
        )
        .await
        .unwrap();
        let cfg = load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(cfg.skip_admin);
    }

    #[tokio::test]
    async fn rolesaver_cfg_prefers_table_blob() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            r#"{"enable":false,"timeout":"None","admin":"yes"}"#,
        )
        .await
        .unwrap();
        crate::db::tbl_set_json(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({"enable": true, "timeout": "None", "admin": "no"}),
        )
        .await
        .unwrap();
        let cfg = load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(cfg.skip_admin);
    }

    #[tokio::test]
    async fn rolesaver_enabled_falls_back_to_legacy_flat_row() {
        let pool = mem_pool().await;
        assert!(!rolesaver_enabled(&pool, "g").await);
        crate::db::kv_set(&pool, "g", "GUILD.GUILD_CONFIG.rolesaver.enable", "1")
            .await
            .unwrap();
        assert!(rolesaver_enabled(&pool, "g").await);
    }
}

pub mod counter;
pub mod git;
#[allow(clippy::module_inception)]
pub mod newfeatures;
pub mod nightmode;
pub mod punishpub;
pub mod report;
pub mod rolesaver;
