// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/h247/* via h247Manager.ts.
//
// TS keys: <guild>.GUILD.H247 {enabled, voiceChannelId}.
// 24/7 parking: join persists, watchdog rejoins, leave clears.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

pub const H247_KEY: &str = "GUILD.H247";

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct H247Config {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub voice_channel_id: String,
}

pub async fn load_h247(pool: &crate::db::Pool, guild_id: &str) -> H247Config {
    crate::db::kv_get(pool, guild_id, H247_KEY)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_h247(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &H247Config,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, guild_id, H247_KEY, &serde_json::to_string(cfg)?).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_disabled() {
        assert!(!H247Config::default().enabled);
    }

    #[tokio::test]
    async fn roundtrip_memory() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool).await.unwrap();
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

#[allow(clippy::module_inception)]
pub mod h247;
pub mod info;
pub mod join;
pub mod leave;

/// Old registry path (`h247::main::h247`) kept working.
pub mod main {
    pub use super::h247::*;
}
