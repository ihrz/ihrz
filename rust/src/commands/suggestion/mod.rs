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
/// (SUGGEST.channel / SUGGEST.disable).
pub async fn load_suggest_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        })
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
