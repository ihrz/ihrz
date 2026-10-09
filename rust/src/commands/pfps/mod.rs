// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/pfps/*.
//
// TS keys: <guild>.PFPS.disable (bool), <guild>.PFPS.channel.
// YAML: pfps_config_command_action_on/off, pfps_channel_*.

use crate::bot::Ctx;

pub use crate::commands::security::main::parse_on_off;

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

/// Table-routed plain-string read with legacy fallback
/// (PFPS.channel / PFPS.disable).
pub async fn load_pfps_string(pool: &crate::db::Pool, guild_id: &str, key: &str) -> Option<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        })
}

/// Table-routed plain-string write (keys unchanged).
pub async fn save_pfps_string(
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
    fn pfps_reuses_security_on_off_parser() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
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
        save_pfps_string(&pool, "g1", "PFPS.channel", "8")
            .await
            .unwrap();
        assert_eq!(
            load_pfps_string(&pool, "g1", "PFPS.channel")
                .await
                .as_deref(),
            Some("8")
        );
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'PFPS.channel'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read, table wins over legacy.
        crate::db::kv_set(&pool, "g2", "PFPS.disable", "1")
            .await
            .unwrap();
        assert_eq!(
            load_pfps_string(&pool, "g2", "PFPS.disable")
                .await
                .as_deref(),
            Some("1")
        );
        crate::db::kv_set(&pool, "g1", "PFPS.channel", "stale")
            .await
            .unwrap();
        assert_eq!(
            load_pfps_string(&pool, "g1", "PFPS.channel")
                .await
                .as_deref(),
            Some("8")
        );
    }
}

pub mod channel;
pub mod config;
#[allow(clippy::module_inception)]
pub mod pfps;

/// Old registry path (`pfps::main::pfps`) kept working.
pub mod main {
    pub use super::pfps::*;
}
