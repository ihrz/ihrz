// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/h247/* via h247Manager.ts.
//
// TS keys: <guild>.GUILD.H247 {enabled, voiceChannelId}.
// 24/7 parking: join persists, watchdog rejoins, leave clears.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

pub const H247_KEY: &str = "GUILD.H247";

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

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct H247Config {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub voice_channel_id: String,
}

pub async fn load_h247(pool: &crate::db::Pool, guild_id: &str) -> H247Config {
    table_value_or_legacy(pool, guild_id, H247_KEY)
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub async fn save_h247(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &H247Config,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(H247_KEY, cfg).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_disabled() {
        assert!(!H247Config::default().enabled);
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_h247(
            &pool,
            "g1",
            &H247Config {
                enabled: true,
                voice_channel_id: "9".into(),
            },
        )
        .await
        .unwrap();
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "GUILD.H247").await;
        assert_eq!(legacy, None);
        // Legacy rows still read, table wins over legacy.
        crate::db::kv_set(&pool, "g2", H247_KEY, r#"{"enabled":true}"#)
            .await
            .unwrap();
        assert!(load_h247(&pool, "g2").await.enabled);
        crate::db::kv_set(&pool, "g1", H247_KEY, r#"{"enabled":false}"#)
            .await
            .unwrap();
        assert!(load_h247(&pool, "g1").await.enabled);
    }

    #[tokio::test]
    async fn roundtrip_memory() {
        let pool = crate::db::memory_pool().await;
        save_h247(
            &pool,
            "g",
            &H247Config {
                enabled: true,
                voice_channel_id: "123".into(),
            },
        )
        .await
        .unwrap();
        let back = load_h247(&pool, "g").await;
        assert!(back.enabled);
        assert_eq!(back.voice_channel_id, "123");
    }
}

pub mod grant;
#[allow(clippy::module_inception)]
pub mod h247;
pub mod info;
pub mod join;
pub mod leave;
pub mod session;

/// Old registry path (`h247::main::h247`) kept working.
pub mod main {
    pub use super::h247::*;
}
