// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/database (+ types/database_structure.d.ts).
//
// TS uses client.db.get()/set() over horizondb (sqlite default, mysql
// optional). The Rust port uses sqlx + sqlite by default with the same
// file (src/files/db.sqlite) so both implementations can share data
// during migration. Guild-scoped helpers keep the same key layout.

use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;

use crate::config::Config;

pub type Pool = SqlitePool;

/// Create the sqlite parent directory when missing so boot never
/// fails with "unable to open database file" just because the
/// working directory differs (e.g. `cargo run` from `rust/`).
/// Run from the repo root to share `src/files/db.sqlite` with TS.
fn ensure_parent_dir(database_url: &str) {
    let path = database_url.strip_prefix("sqlite:").unwrap_or(database_url);
    let path = path.split('?').next().unwrap_or(path);
    if path == ":memory:" || path.is_empty() {
        return;
    }
    if let Some(parent) = std::path::Path::new(path).parent() {
        if !parent.as_os_str().is_empty() {
            let _ = std::fs::create_dir_all(parent);
        }
    }
}

pub async fn init(cfg: &Config) -> anyhow::Result<Pool> {
    ensure_parent_dir(&cfg.database_url);
    let opts = SqliteConnectOptions::from_str(&cfg.database_url)?.create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS kv (
            guild_id TEXT NOT NULL,
            key_name TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (guild_id, key_name)
        )",
    )
    .execute(&pool)
    .await?;

    // Guild language table mirrors GUILD_CONFIG.lang used by getLanguageData.
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS guild_lang (
            guild_id TEXT PRIMARY KEY,
            lang TEXT NOT NULL DEFAULT 'en-US'
        )",
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

pub async fn kv_get(pool: &Pool, guild_id: &str, key: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT value FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

pub async fn kv_set(pool: &Pool, guild_id: &str, key: &str, value: &str) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO kv (guild_id, key_name, value) VALUES (?, ?, ?)
         ON CONFLICT (guild_id, key_name) DO UPDATE SET value = excluded.value",
    )
    .bind(guild_id)
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn kv_del(pool: &Pool, guild_id: &str, key: &str) -> anyhow::Result<()> {
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(key)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn guild_prefix(pool: &Pool, guild_id: Option<u64>, default: &str) -> String {
    let Some(gid) = guild_id else {
        return default.to_string();
    };
    crate::db::kv_get(pool, &gid.to_string(), "GUILD.PREFIX")
        .await
        .filter(|p| !p.trim().is_empty())
        .unwrap_or_else(|| default.to_string())
}

/// Bot-level blacklist lookup. Mirrors blacklistTable.get (scope "0").
pub async fn is_blacklisted(pool: &Pool, user_id: u64) -> bool {
    crate::db::kv_get(
        pool,
        "0",
        &crate::commands::owner::main::blacklist_key(user_id),
    )
    .await
    .is_some()
}

/// Mirrors getLanguageData(guildId): per-guild lang, en-US fallback.
pub async fn guild_lang(pool: &Pool, guild_id: Option<u64>) -> String {
    let Some(id) = guild_id else {
        return "en-US".to_string();
    };
    let gid = id.to_string();
    let lang: Option<String> =
        sqlx::query_scalar::<_, String>("SELECT lang FROM guild_lang WHERE guild_id = ?")
            .bind(&gid)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();
    lang.unwrap_or_else(|| "en-US".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
    use std::str::FromStr;

    async fn memory_pool() -> Pool {
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
        sqlx::query(
            "CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn kv_roundtrip_and_overwrite() {
        let pool = memory_pool().await;
        assert_eq!(kv_get(&pool, "g1", "prefix").await, None);
        kv_set(&pool, "g1", "prefix", "!").await.unwrap();
        assert_eq!(kv_get(&pool, "g1", "prefix").await.as_deref(), Some("!"));
        kv_set(&pool, "g1", "prefix", "?").await.unwrap();
        assert_eq!(kv_get(&pool, "g1", "prefix").await.as_deref(), Some("?"));
    }

    #[tokio::test]
    async fn kv_is_scoped_per_guild() {
        let pool = memory_pool().await;
        kv_set(&pool, "g1", "k", "v1").await.unwrap();
        kv_set(&pool, "g2", "k", "v2").await.unwrap();
        assert_eq!(kv_get(&pool, "g1", "k").await.as_deref(), Some("v1"));
        assert_eq!(kv_get(&pool, "g2", "k").await.as_deref(), Some("v2"));
    }

    #[tokio::test]
    async fn guild_lang_defaults_to_en_us() {
        let pool = memory_pool().await;
        assert_eq!(guild_lang(&pool, None).await, "en-US");
        assert_eq!(guild_lang(&pool, Some(123)).await, "en-US");
    }

    #[tokio::test]
    async fn guild_lang_returns_stored_value() {
        let pool = memory_pool().await;
        sqlx::query("INSERT INTO guild_lang (guild_id, lang) VALUES ('456', 'fr-FR')")
            .execute(&pool)
            .await
            .unwrap();
        assert_eq!(guild_lang(&pool, Some(456)).await, "fr-FR");
    }

    #[tokio::test]
    async fn guild_prefix_defaults_and_custom() {
        let pool = memory_pool().await;
        assert_eq!(guild_prefix(&pool, None, "?").await, "?");
        assert_eq!(guild_prefix(&pool, Some(1), "?").await, "?");
        kv_set(&pool, "1", "GUILD.PREFIX", "!").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(1), "?").await, "!");
    }

    #[tokio::test]
    async fn blacklist_lookup() {
        let pool = memory_pool().await;
        assert!(!is_blacklisted(&pool, 9).await);
        kv_set(&pool, "0", "BLACKLIST.9", "spam").await.unwrap();
        assert!(is_blacklisted(&pool, 9).await);
    }

    #[tokio::test]
    async fn init_creates_tables_on_memory_db() {
        let cfg = Config {
            database_url: "sqlite::memory:".to_string(),
            ..Config::default()
        };
        let pool = init(&cfg).await.unwrap();
        kv_set(&pool, "g", "k", "v").await.unwrap();
        assert_eq!(kv_get(&pool, "g", "k").await.as_deref(), Some("v"));
    }

    #[tokio::test]
    async fn init_creates_missing_parent_dir() {
        let dir = std::env::temp_dir().join(format!("ihrz-db-test-{}", std::process::id()));
        let db = dir.join("sub").join("test.sqlite");
        let _ = std::fs::remove_dir_all(&dir);
        let cfg = Config {
            database_url: format!("sqlite:{}?mode=rwc", db.display()),
            ..Config::default()
        };
        let pool = init(&cfg).await.unwrap();
        kv_set(&pool, "g", "k", "v").await.unwrap();
        assert_eq!(kv_get(&pool, "g", "k").await.as_deref(), Some("v"));
        assert!(db.exists());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
