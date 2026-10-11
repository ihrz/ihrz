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

#[cfg(test)]
mod localization_tests {

    type LocCmd = poise::Command<crate::commands::Data, crate::commands::Error>;

    fn find_path<'a>(cmds: &'a [LocCmd], path: &[&str]) -> &'a LocCmd {
        let cmd = cmds
            .iter()
            .find(|c| c.name == path[0])
            .unwrap_or_else(|| panic!("command {} missing", path.join(" ")));
        if path.len() == 1 {
            cmd
        } else {
            find_path(&cmd.subcommands, &path[1..])
        }
    }

    #[test]
    fn loc_h247() {
        // TS h247/h247.ts (`h247`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["h247"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Garder iHorizon connecté 24/7 dans un salon vocal!")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("iHorizonをボイスチャンネルに24時間365日接続させ続けます！")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("h247")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("h247")
        );
        assert_eq!(cmd.name_localizations.len(), 4);
    }

    #[test]
    fn loc_join() {
        // TS h247/h247.ts (`join`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["h247", "join"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Garer iHorizon 24/7 dans un salon vocal!")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("iHorizonをボイスチャンネルに常駐させます！")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("rejoindre")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("join")
        );
        assert_eq!(cmd.name_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "channel")
            .expect("param channel");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Le salon vocal où iHorizon restera!")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("iHorizonが常駐するボイスチャンネル！")
        );
        assert_eq!(
            prm.name_localizations.get("fr").map(String::as_str),
            Some("salon")
        );
        assert_eq!(
            prm.name_localizations.get("ja").map(String::as_str),
            Some("channel")
        );
    }

    #[test]
    fn loc_leave() {
        // TS h247/h247.ts (`leave`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["h247", "leave"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Désactiver la connexion 24/7 sur ce serveur!")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("このサーバーの24時間接続を無効化します！")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("quitter")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("leave")
        );
        assert_eq!(cmd.name_localizations.len(), 4);
    }
}
