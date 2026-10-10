// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/suggestion/* +
// src/Events/suggestion/onNewMessage.ts.
//
// TS keys: SUGGEST.{channel, disable}, SUGGESTION.<code>
// {author, msgId, threadId} (+ status managed here).

use crate::bot::Ctx;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Suggestion {
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub msg_id: String,
    #[serde(default)]
    pub thread_id: String,
    #[serde(default)]
    pub status: String,
    /// TS writes `SUGGESTION.<id>.replied = true` on accept/deny/reply.
    /// Dual-written with `status` so both shapes read as answered.
    #[serde(default)]
    pub replied: bool,
}

/// Embed colors for accept/deny/reply. Mirrors !accept.ts (#21744c),
/// !deny.ts (#f13b38) and !reply.ts (#8afe46).
pub const SUGGEST_ACCEPT_COLOR: u32 = 0x21_74_4c;
pub const SUGGEST_DENY_COLOR: u32 = 0xf1_3b_38;
pub const SUGGEST_REPLY_COLOR: u32 = 0x8a_fe_46;

impl Suggestion {
    /// Already answered: TS `replied` flag or a non-open status left by
    /// earlier Rust writes ("accepted"/"denied"/"replied").
    pub fn is_answered(&self) -> bool {
        self.replied || matches!(self.status.as_str(), "accepted" | "denied" | "replied")
    }

    /// Dual-write: TS `replied` flag plus the Rust `status` string.
    pub fn mark_answered(&mut self, status: &str) {
        self.replied = true;
        self.status = status.to_string();
    }
}

pub fn suggestion_key(code: &str) -> String {
    format!("SUGGESTION.{code}")
}

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

/// Table-routed load for one suggestion (keys unchanged).
pub async fn load_suggestion(
    pool: &crate::db::Pool,
    guild_id: &str,
    code: &str,
) -> Option<Suggestion> {
    table_value_or_legacy(pool, guild_id, &suggestion_key(code.trim()))
        .await
        .and_then(|v| serde_json::from_value(v).ok())
}

/// Table-routed write for one suggestion (keys unchanged).
pub async fn save_suggestion(
    pool: &crate::db::Pool,
    guild_id: &str,
    code: &str,
    suggestion: &Suggestion,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(&suggestion_key(code.trim()), suggestion)
        .await
}

/// Table-routed delete: clears the guild-table row and any legacy row.
pub async fn delete_suggestion(
    pool: &crate::db::Pool,
    guild_id: &str,
    code: &str,
) -> anyhow::Result<()> {
    let backend = guild_backend(pool);
    let _ = backend
        .table(guild_id)
        .delete(&suggestion_key(code.trim()))
        .await;
    let _ = crate::db::kv_del(pool, guild_id, &suggestion_key(code.trim())).await;
    Ok(())
}

/// Table-routed plain-string read with legacy fallback
/// (SUGGEST.channel / SUGGEST.disable). JSON booleans normalize to
/// "1"/"0" so `== "1"` readers (events_handler) keep working after
/// the boolean write.
pub async fn load_suggest_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            serde_json::Value::Bool(b) => {
                if b {
                    "1".to_string()
                } else {
                    "0".to_string()
                }
            }
            other => other.to_string(),
        })
}

/// SUGGEST.disable read. Accepts the TS JSON boolean (`true`), the
/// legacy "1" string and the normalized "1" from `load_suggest_string`.
/// Mirrors `baseData?.disable === true` / truthy checks in
/// !accept/!deny/!reply/!delete.ts.
pub fn suggest_disabled_value(raw: Option<&str>) -> bool {
    matches!(
        raw.map(str::trim)
            .map(|s| s.to_ascii_lowercase())
            .as_deref(),
        Some("1") | Some("true")
    )
}

/// SUGGEST.disable table-routed read.
pub async fn load_suggest_disabled(pool: &crate::db::Pool, guild_id: &str) -> bool {
    suggest_disabled_value(
        load_suggest_string(pool, guild_id, "SUGGEST.disable")
            .await
            .as_deref(),
    )
}

/// Table-routed plain-string write (keys unchanged).
pub async fn save_suggest_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(key, value).await
}

/// SUGGEST.disable write as a JSON boolean. Mirrors !config.ts
/// `client.db.set(..., false/true)` (keys unchanged).
pub async fn save_suggest_disable(
    pool: &crate::db::Pool,
    guild_id: &str,
    disabled: bool,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set("SUGGEST.disable", disabled)
        .await
}

/// 6-char uppercase code. Mirrors TS suggestCode generation.
pub fn gen_suggest_code(seed: u64) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(6);
    for _ in 0..6 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHA[(state % ALPHA.len() as u64) as usize] as char);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disabled_read_accepts_1_and_true() {
        assert!(suggest_disabled_value(Some("1")));
        assert!(suggest_disabled_value(Some("true")));
        assert!(suggest_disabled_value(Some("True")));
        assert!(suggest_disabled_value(Some(" 1 ")));
        assert!(!suggest_disabled_value(Some("0")));
        assert!(!suggest_disabled_value(Some("false")));
        assert!(!suggest_disabled_value(None));
    }

    #[test]
    fn answered_covers_replied_flag_and_legacy_status() {
        let mut s = Suggestion::default();
        assert!(!s.is_answered());
        s.mark_answered("accepted");
        assert!(s.is_answered());
        assert!(s.replied);
        assert_eq!(s.status, "accepted");
        // Legacy Rust rows (status only) and TS rows (replied only).
        let legacy = Suggestion {
            status: "denied".into(),
            ..Default::default()
        };
        assert!(legacy.is_answered());
        let ts = Suggestion {
            replied: true,
            ..Default::default()
        };
        assert!(ts.is_answered());
        // Missing keys default to unanswered (serde default).
        let open: Suggestion = serde_json::from_value(serde_json::json!({"author": "u1"})).unwrap();
        assert!(!open.is_answered());
    }

    #[tokio::test]
    async fn disable_boolean_round_trip() {
        let pool = memory_pool().await;
        save_suggest_disable(&pool, "g1", true).await.unwrap();
        assert!(load_suggest_disabled(&pool, "g1").await);
        // Normalized for `== "1"` readers.
        assert_eq!(
            load_suggest_string(&pool, "g1", "SUGGEST.disable")
                .await
                .as_deref(),
            Some("1")
        );
        save_suggest_disable(&pool, "g1", false).await.unwrap();
        assert!(!load_suggest_disabled(&pool, "g1").await);
        // Legacy "1" rows still read as disabled.
        crate::db::kv_set(&pool, "g2", "SUGGEST.disable", "1")
            .await
            .unwrap();
        assert!(load_suggest_disabled(&pool, "g2").await);
        assert!(!load_suggest_disabled(&pool, "g9").await);
    }
    #[test]
    fn code_is_6_upper_alnum() {
        let c = gen_suggest_code(42);
        assert_eq!(c.len(), 6);
        assert!(c
            .chars()
            .all(|x| x.is_ascii_uppercase() || x.is_ascii_digit()));
        assert_eq!(suggestion_key("ABC"), "SUGGESTION.ABC");
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
        let s = Suggestion {
            author: "u1".into(),
            status: "open".into(),
            ..Default::default()
        };
        save_suggestion(&pool, "g1", "ABC123", &s).await.unwrap();
        assert_eq!(
            load_suggestion(&pool, "g1", "ABC123").await.unwrap().author,
            "u1"
        );
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'SUGGESTION.ABC123'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read.
        crate::db::kv_set(&pool, "g2", &suggestion_key("ZZZ999"), r#"{"author":"u9"}"#)
            .await
            .unwrap();
        assert_eq!(
            load_suggestion(&pool, "g2", "ZZZ999").await.unwrap().author,
            "u9"
        );
        // Delete clears both stores.
        crate::db::kv_set(
            &pool,
            "g1",
            &suggestion_key("ABC123"),
            r#"{"author":"stale"}"#,
        )
        .await
        .unwrap();
        delete_suggestion(&pool, "g1", "ABC123").await.unwrap();
        assert!(load_suggestion(&pool, "g1", "ABC123").await.is_none());
        // Plain-string keys round-trip with legacy fallback.
        save_suggest_string(&pool, "g1", "SUGGEST.channel", "5")
            .await
            .unwrap();
        assert_eq!(
            load_suggest_string(&pool, "g1", "SUGGEST.channel")
                .await
                .as_deref(),
            Some("5")
        );
        crate::db::kv_set(&pool, "g2", "SUGGEST.disable", "1")
            .await
            .unwrap();
        assert_eq!(
            load_suggest_string(&pool, "g2", "SUGGEST.disable")
                .await
                .as_deref(),
            Some("1")
        );
    }
}

pub mod setsuggest;
pub mod suggest;
