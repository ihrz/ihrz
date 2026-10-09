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
    serde_json::from_str(&raw).ok()
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
    let res = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(schedule_key(user_id, code))
        .execute(pool)
        .await?;
    Ok(res.rows_affected() > 0)
}

pub async fn list_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> Vec<ScheduleEntry> {
    let like = format!("{}%", schedule_prefix(user_id));
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT value FROM kv WHERE guild_id = ? AND key_name LIKE ?",
    )
    .bind(guild_id)
    .bind(like)
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut out: Vec<ScheduleEntry> = rows
        .iter()
        .filter_map(|s| serde_json::from_str(s).ok())
        .collect();
    out.sort_by_key(|e| e.expires_at_ms);
    out
}

pub async fn delete_all_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
) -> anyhow::Result<u64> {
    let like = format!("{}%", schedule_prefix(user_id));
    let res = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE ?")
        .bind(guild_id)
        .bind(like)
        .execute(pool)
        .await?;
    Ok(res.rows_affected())
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
