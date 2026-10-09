// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/notifier/* +
// src/core/StreamNotifier.ts (config surface).
//
// TS keys: NOTIFIER.users[] {id_or_username, platform}, NOTIFIER.channelId,
// NOTIFIER.message, NOTIFIER.lastMediaNotified. Live author validation +
// 120s polling pending API keys; dedup helper in notifier.rs.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NotifierEntry {
    pub id_or_username: String,
    pub platform: String,
}

pub fn valid_platform(p: &str) -> bool {
    matches!(
        p.to_ascii_lowercase().as_str(),
        "twitch" | "youtube" | "kick"
    )
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

pub async fn load_entries(pool: &crate::db::Pool, guild_id: &str) -> Vec<NotifierEntry> {
    table_value_or_legacy(pool, guild_id, "NOTIFIER.users")
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub async fn save_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    entries: &[NotifierEntry],
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set("NOTIFIER.users", entries)
        .await
}

/// Table-routed plain-string read with legacy fallback
/// (NOTIFIER.channelId / NOTIFIER.message).
pub async fn load_notifier_string(
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
pub async fn save_notifier_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(key, value).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platforms() {
        assert!(valid_platform("twitch"));
        assert!(valid_platform("YouTube"));
        assert!(!valid_platform("nope"));
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
        save_entries(
            &pool,
            "g1",
            &[NotifierEntry {
                id_or_username: "auth1".into(),
                platform: "twitch".into(),
            }],
        )
        .await
        .unwrap();
        assert_eq!(load_entries(&pool, "g1").await.len(), 1);
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'NOTIFIER.users'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read.
        crate::db::kv_set(
            &pool,
            "g2",
            "NOTIFIER.users",
            r#"[{"id_or_username":"a","platform":"kick"}]"#,
        )
        .await
        .unwrap();
        assert_eq!(load_entries(&pool, "g2").await.len(), 1);
        // Plain-string keys round-trip with legacy fallback.
        save_notifier_string(&pool, "g1", "NOTIFIER.channelId", "8")
            .await
            .unwrap();
        assert_eq!(
            load_notifier_string(&pool, "g1", "NOTIFIER.channelId")
                .await
                .as_deref(),
            Some("8")
        );
        crate::db::kv_set(&pool, "g2", "NOTIFIER.message", "hello")
            .await
            .unwrap();
        assert_eq!(
            load_notifier_string(&pool, "g2", "NOTIFIER.message")
                .await
                .as_deref(),
            Some("hello")
        );
    }
}

pub mod add;
pub mod channel;
pub mod list;
pub mod message;
#[allow(clippy::module_inception)]
pub mod notifier;
pub mod remove;

/// Old registry path (`notifier::main::notifier`) kept working.
pub mod main {
    pub use super::notifier::*;
}
