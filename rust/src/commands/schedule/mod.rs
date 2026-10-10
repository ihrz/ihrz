// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/schedule/schedule.ts.
// TS flow: select menu (create / delete / delete-all / list) + modal
// (name 5..30, desc 10..400) + duration via timeCalculator.to_ms +
// 16-char code via generatePassword + scheduleTable per user id.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

pub use crate::commands::shared::{now_ms, parse_duration_ms};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScheduleEntry {
    pub code: String,
    pub title: String,
    pub description: String,
    pub expires_at_ms: i64,
}

pub fn validate_title(s: &str) -> bool {
    let n = s.trim().chars().count();
    (5..=30).contains(&n)
}

pub fn validate_description(s: &str) -> bool {
    let n = s.trim().chars().count();
    (10..=400).contains(&n)
}

pub fn is_expired(entry: &ScheduleEntry, now_ms: i64) -> bool {
    now_ms >= entry.expires_at_ms
}

/// SCHED-KEY-COMPAT: the TS writer (`scheduleTable.set` in
/// schedule.ts `__0`, read by `refreshSchedule` in ready.ts) stores
/// `{title, description, expired}`, while this port writes
/// `ScheduleEntry {code, title, description, expires_at_ms}`.
/// Read both shapes, write one (`expires_at_ms`).
pub fn expiry_ms_of(v: &serde_json::Value) -> Option<i64> {
    v.get("expires_at_ms")
        .and_then(|n| n.as_i64())
        .or_else(|| v.get("expired").and_then(|n| n.as_i64()))
}

/// Parse either shape into a `ScheduleEntry`. `fallback_code` (the key
/// suffix) fills `code` for legacy `{expired}` rows that carry none.
pub fn entry_from_value(v: &serde_json::Value, fallback_code: &str) -> Option<ScheduleEntry> {
    if let Ok(e) = serde_json::from_value::<ScheduleEntry>(v.clone()) {
        return Some(e);
    }
    Some(ScheduleEntry {
        code: v
            .get("code")
            .and_then(|c| c.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| fallback_code.to_string()),
        title: v.get("title")?.as_str()?.to_string(),
        description: v.get("description")?.as_str()?.to_string(),
        expires_at_ms: expiry_ms_of(v)?,
    })
}

/// 16-char alphanumeric code. No external dependency: xorshift64 seeded
/// from SystemTime nanos (mirrors TS generatePassword({ length: 16 })).
pub fn gen_code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0x9E3779B97F4A7C15);
    let mut state = if nanos == 0 {
        0x9E3779B97F4A7C15
    } else {
        nanos
    };
    let mut out = String::with_capacity(16);
    for _ in 0..16 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHABET[(state % 62) as usize] as char);
    }
    out
}

pub fn schedule_key(user_id: u64, code: &str) -> String {
    format!("SCHEDULE.{user_id}.{code}")
}

pub fn schedule_prefix(user_id: u64) -> String {
    format!("SCHEDULE.{user_id}.")
}

pub fn scope_guild(ctx: &Ctx<'_>) -> String {
    ctx.guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_else(|| "global".to_string())
}

pub async fn load_entry(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> Option<ScheduleEntry> {
    let raw = crate::db::kv_get(pool, guild_id, &schedule_key(user_id, code)).await?;
    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
    entry_from_value(&v, code)
}

pub async fn save_entry(
    pool: &crate::db::Pool,
    guild_id: &str,
    entry: &ScheduleEntry,
    user_id: u64,
) -> anyhow::Result<()> {
    let s = serde_json::to_string(entry)?;
    crate::db::kv_set(pool, guild_id, &schedule_key(user_id, &entry.code), &s).await
}

pub async fn delete_entry(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    code: &str,
) -> anyhow::Result<bool> {
    let key = schedule_key(user_id, code);
    let existed = crate::db::kv_get(pool, guild_id, &key).await.is_some();
    crate::db::kv_del(pool, guild_id, &key).await?;
    Ok(existed)
}

pub async fn list_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> Vec<ScheduleEntry> {
    let rows: Vec<(String, String)> =
        crate::db::kv_scan_prefix(pool, guild_id, &schedule_prefix(user_id)).await;
    let mut out: Vec<ScheduleEntry> = rows
        .iter()
        .filter_map(|(key, s)| {
            let v: serde_json::Value = serde_json::from_str(s).ok()?;
            let code = key.rsplit('.').next().unwrap_or("");
            entry_from_value(&v, code)
        })
        .collect();
    out.sort_by_key(|e| e.expires_at_ms);
    out
}

pub async fn delete_all_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> anyhow::Result<u64> {
    let prefix = schedule_prefix(user_id);
    let n = crate::db::kv_scan_prefix(pool, guild_id, &prefix)
        .await
        .len() as u64;
    crate::db::kv_del_prefix(pool, guild_id, &prefix).await?;
    Ok(n)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn title_bounds_mirror_modal() {
        assert!(!validate_title("abcd"));
        assert!(validate_title("abcde"));
        assert!(validate_title(&"a".repeat(30)));
        assert!(!validate_title(&"a".repeat(31)));
    }

    #[test]
    fn description_bounds_mirror_modal() {
        assert!(!validate_description(&"a".repeat(9)));
        assert!(validate_description(&"a".repeat(10)));
        assert!(validate_description(&"a".repeat(400)));
        assert!(!validate_description(&"a".repeat(401)));
    }

    #[test]
    fn gen_code_is_16_alphanum() {
        for _ in 0..10 {
            let c = gen_code();
            assert_eq!(c.len(), 16);
            assert!(c.chars().all(|ch| ch.is_ascii_alphanumeric()));
        }
    }

    #[test]
    fn expired_compares_against_now() {
        let e = ScheduleEntry {
            code: "x".to_string(),
            title: "t".to_string(),
            description: "d".to_string(),
            expires_at_ms: 100,
        };
        assert!(is_expired(&e, 100));
        assert!(is_expired(&e, 101));
        assert!(!is_expired(&e, 99));
    }

    #[test]
    fn parse_duration_units() {
        assert_eq!(parse_duration_ms("10s"), Some(10_000));
        assert_eq!(parse_duration_ms("5m"), Some(300_000));
        assert_eq!(parse_duration_ms("2h"), Some(7_200_000));
        assert_eq!(parse_duration_ms("7d"), Some(604_800_000));
    }

    #[test]
    fn parse_duration_rejects_bad_input() {
        assert_eq!(parse_duration_ms(""), None);
        assert_eq!(parse_duration_ms("abc"), None);
        assert_eq!(parse_duration_ms("0s"), None);
        assert_eq!(parse_duration_ms("-5m"), None);
        assert_eq!(parse_duration_ms("10x"), None);
    }

    #[test]
    fn key_layout_uses_schedule_prefix() {
        assert_eq!(schedule_key(123, "ABC"), "SCHEDULE.123.ABC");
        assert_eq!(schedule_prefix(123), "SCHEDULE.123.");
    }

    #[test]
    fn entry_json_roundtrip() {
        let e = ScheduleEntry {
            code: "CODE123".to_string(),
            title: "hello".to_string(),
            description: "a description here".to_string(),
            expires_at_ms: 123456,
        };
        let s = serde_json::to_string(&e).unwrap();
        let back: ScheduleEntry = serde_json::from_str(&s).unwrap();
        assert_eq!(e, back);
    }

    #[test]
    fn compat_reads_legacy_expired_shape() {
        // TS writer shape: {title, description, expired}, no code.
        let v: serde_json::Value =
            serde_json::from_str(r#"{"title":"t","description":"a description","expired":777}"#)
                .unwrap();
        let e = entry_from_value(&v, "LEGACYCODE").unwrap();
        assert_eq!(e.code, "LEGACYCODE");
        assert_eq!(e.expires_at_ms, 777);
        assert!(is_expired(&e, 777));
        // New shape wins when both keys are present.
        let v2: serde_json::Value = serde_json::from_str(
            r#"{"code":"C","title":"t","description":"d","expires_at_ms":5,"expired":9}"#,
        )
        .unwrap();
        assert_eq!(entry_from_value(&v2, "X").unwrap().expires_at_ms, 5);
        assert_eq!(expiry_ms_of(&v), Some(777));
        assert_eq!(expiry_ms_of(&serde_json::json!({})), None);
    }
}

#[allow(clippy::module_inception)]
pub mod schedule;

/// Old registry path (`schedule::main::*`) kept working, including the
/// `shared` re-exports other categories use
/// (`schedule::main::now_ms`, `schedule::main::parse_duration_ms`).
pub mod main {
    pub use super::schedule::*;
    pub use super::{now_ms, parse_duration_ms};
}
