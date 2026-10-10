// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/tts/* via ttsManager.ts.
//
// TS keys: <guild>.GUILD.TTS {textChannelId, voiceChannelId, lang}.
// 9 locales: en-US fr-FR de-DE es-ES it-IT jp-JP pt-PT ru-RU ar-EG.
// Refusals: music playing, H247 mismatch (see voice.rs music_guard).

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

pub const TTS_LANGS: [&str; 9] = [
    "en-US", "fr-FR", "de-DE", "es-ES", "it-IT", "jp-JP", "pt-PT", "ru-RU", "ar-EG",
];

pub const TTS_KEY: &str = "GUILD.TTS";

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

/// Table-routed delete: clears the guild-table row and any legacy row.
pub async fn delete_tts(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    let backend = guild_backend(pool);
    let _ = backend.table(guild_id).delete(TTS_KEY).await;
    let _ = crate::db::kv_del(pool, guild_id, TTS_KEY).await;
    Ok(())
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct TtsConfig {
    #[serde(default)]
    pub text_channel_id: String,
    #[serde(default)]
    pub voice_channel_id: String,
    #[serde(default = "default_tts_lang")]
    pub lang: String,
}

fn default_tts_lang() -> String {
    "en-US".to_string()
}

pub fn parse_tts_lang(s: &str) -> Option<&str> {
    TTS_LANGS.iter().copied().find(|c| *c == s)
}

pub async fn load_tts(pool: &crate::db::Pool, guild_id: &str) -> Option<TtsConfig> {
    table_value_or_legacy(pool, guild_id, TTS_KEY)
        .await
        .and_then(|v| serde_json::from_value(v).ok())
}

pub async fn save_tts(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &TtsConfig,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(TTS_KEY, cfg).await
}

// Voice-state cleanup predicates. Mirror src/Events/tts/voiceState.ts
// plus the offline leg of cleanupTTS in
// src/core/modules/ttsManager.ts. The Flowery speak leg stays TS-side
// (needs the Flowery key); only leave/stop + state teardown port here.

/// True when a voice update actually left the TTS channel: the channel
/// changed and the channel left is the TTS voice channel. Mirrors the
/// `newState.channelId === oldState.channelId` early return plus the
/// `oldState.channelId !== ttsData.voiceChannelId` guard.
pub fn tts_voice_left(old_channel: Option<u64>, new_channel: Option<u64>, tts_voice: u64) -> bool {
    match old_channel {
        Some(old) if old == tts_voice => new_channel != old_channel,
        _ => false,
    }
}

/// TS getTTSData interop (`if (!data || !data.enabled) return null`):
/// TS rows carry `enabled`; Rust rows omit it (row presence = enabled).
/// A missing flag means enabled; malformed rows mean disabled.
pub fn tts_row_enabled(raw: &str) -> bool {
    let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) else {
        return false;
    };
    match v.get("enabled") {
        Some(e) => e.as_bool().unwrap_or(true),
        None => true,
    }
}

/// H247 park guard (mirrors keepVoiceConnection in cleanupTTS): when
/// H24/7 parks the bot in the TTS channel, stop playback but skip the
/// OP4 voice leave so the bot never visibly disconnects.
pub fn tts_keep_voice(
    h247: Option<&crate::commands::h247::grant::H247Config>,
    tts_voice: u64,
) -> bool {
    h247.map(|h| h.enabled && h.voice_channel_id == tts_voice)
        .unwrap_or(false)
}

/// Best-effort welcome-embed ids (text channel, message) from a
/// GUILD.TTS row for the embed delete in cleanupTTS. Rust rows lack
/// embedMessageId; TS-written rows carry it.
pub fn tts_embed_ids(raw: &str) -> Option<(u64, u64)> {
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    let text = v.get("textChannelId")?.as_str()?.parse::<u64>().ok()?;
    let msg = v.get("embedMessageId")?.as_str()?.parse::<u64>().ok()?;
    Some((text, msg))
}

// Flowery voice selection (offline leg of prefetchFloweryVoices in
// src/core/modules/ttsManager.ts). The fetch leg (GET
// api.flowery.pw/v1/tts/voices into voiceMappingCache) needs the live
// HTTP call and stays caller-side; the per-language pick
// (Microsoft Azure > Google Translate > any match) plus the
// locale->language table are pure here so the warm path is testable.

/// One entry of the Flowery `/v1/tts/voices` list.
#[derive(Debug, Clone, PartialEq)]
pub struct FloweryVoice {
    pub id: String,
    pub source: String,
    pub lang_code: String,
}

/// Voice-language codes per TTS language, mirroring LANGUAGE_CODES.
pub fn flowery_codes(lang: &str) -> Option<&'static [&'static str]> {
    match lang {
        "fr" => Some(&["fr-FR", "fr-CA"]),
        "en" => Some(&["en-US", "en-GB", "en-AU"]),
        "pt" => Some(&["pt-BR", "pt-PT"]),
        "ru" => Some(&["ru-RU"]),
        "de" => Some(&["de-DE"]),
        "es" => Some(&["es-ES", "es-MX"]),
        "it" => Some(&["it-IT"]),
        "ja" => Some(&["ja-JP"]),
        "ar" => Some(&["ar-SA", "ar-XA", "ar-EG"]),
        _ => None,
    }
}

/// Guild locale -> voice language, mirroring LOCALE_TO_LANG
/// (jp-JP uses `ja`; fr-ME falls back to `fr`).
pub fn flowery_lang_for_locale(locale: &str) -> Option<&'static str> {
    match locale {
        "fr-FR" | "fr-ME" => Some("fr"),
        "en-US" => Some("en"),
        "de-DE" => Some("de"),
        "es-ES" => Some("es"),
        "it-IT" => Some("it"),
        "jp-JP" => Some("ja"),
        "pt-PT" => Some("pt"),
        "ru-RU" => Some("ru"),
        "ar-EG" => Some("ar"),
        _ => None,
    }
}

/// Pick the voice for one language: Microsoft Azure first, then Google
/// Translate, then any code match. Mirrors the mapping loop in
/// getFloweryVoiceMapping.
pub fn select_flowery_voice<'a>(
    voices: &'a [FloweryVoice],
    lang: &str,
) -> Option<&'a FloweryVoice> {
    let codes = flowery_codes(lang)?;
    voices
        .iter()
        .find(|v| codes.contains(&v.lang_code.as_str()) && v.source == "Microsoft Azure")
        .or_else(|| {
            voices
                .iter()
                .find(|v| codes.contains(&v.lang_code.as_str()) && v.source == "Google Translate")
        })
        .or_else(|| {
            voices
                .iter()
                .find(|v| codes.contains(&v.lang_code.as_str()))
        })
}

/// Voice id for a guild locale, mirroring resolveFloweryVoice.
pub fn resolve_flowery_voice_id(voices: &[FloweryVoice], locale: &str) -> Option<String> {
    let lang = flowery_lang_for_locale(locale)?;
    select_flowery_voice(voices, lang).map(|v| v.id.clone())
}

/// Orphan sweep (offline leg of cleanupOrphanedTTS in
/// src/core/modules/ttsManager.ts, called from ready.ts). Every stored
/// TTS row is stale at boot (no voice session survives a restart), so
/// each guild with a row present (= enabled, see tts_row_enabled) has
/// its row deleted and is reported. The player-destroy, welcome-embed
/// delete and voice-status legs need the live gateway and stay
/// caller-side. Returns the swept guild ids.
pub async fn sweep_orphaned_tts(pool: &crate::db::Pool, guild_ids: &[String]) -> Vec<String> {
    let mut swept = Vec::new();
    for gid in guild_ids {
        if load_tts(pool, gid).await.is_some() && delete_tts(pool, gid).await.is_ok() {
            swept.push(gid.clone());
        }
    }
    swept
}

#[cfg(test)]
mod tests {
    use super::*;

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
        save_tts(
            &pool,
            "g1",
            &TtsConfig {
                text_channel_id: "1".into(),
                voice_channel_id: "2".into(),
                lang: "fr-FR".into(),
            },
        )
        .await
        .unwrap();
        assert_eq!(load_tts(&pool, "g1").await.unwrap().lang, "fr-FR");
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.TTS'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read.
        crate::db::kv_set(
            &pool,
            "g2",
            TTS_KEY,
            r#"{"text_channel_id":"1","voice_channel_id":"2","lang":"de-DE"}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_tts(&pool, "g2").await.unwrap().lang, "de-DE");
        // Delete clears both stores.
        crate::db::kv_set(&pool, "g1", TTS_KEY, r#"{"lang":"stale"}"#)
            .await
            .unwrap();
        delete_tts(&pool, "g1").await.unwrap();
        assert!(load_tts(&pool, "g1").await.is_none());
    }

    #[test]
    fn langs_accept_9_codes() {
        for c in TTS_LANGS {
            assert_eq!(parse_tts_lang(c), Some(c));
        }
        assert_eq!(parse_tts_lang("xx-XX"), None);
        assert_eq!(parse_tts_lang("fr-ME"), None);
    }

    #[test]
    fn voice_left_guards() {
        // Left the TTS channel entirely or moved away: armed.
        assert!(tts_voice_left(Some(10), None, 10));
        assert!(tts_voice_left(Some(10), Some(20), 10));
        // Mute/deafen-only update (same channel): silent.
        assert!(!tts_voice_left(Some(10), Some(10), 10));
        // Left a different channel: not ours.
        assert!(!tts_voice_left(Some(20), None, 10));
        assert!(!tts_voice_left(Some(20), Some(30), 10));
        // Join from nowhere: nothing left.
        assert!(!tts_voice_left(None, Some(10), 10));
        assert!(!tts_voice_left(None, None, 10));
    }

    #[test]
    fn row_enabled_interop() {
        // Rust-written rows carry no flag: presence = enabled.
        assert!(tts_row_enabled(
            r#"{"text_channel_id":"1","voice_channel_id":"2","lang":"en-US"}"#
        ));
        assert!(tts_row_enabled(r#"{"enabled":true,"voiceChannelId":"2"}"#));
        assert!(!tts_row_enabled(
            r#"{"enabled":false,"voiceChannelId":"2"}"#
        ));
        assert!(!tts_row_enabled("not json"));
    }

    #[test]
    fn keep_voice_parks_h247() {
        use crate::commands::h247::grant::H247Config;
        let parked = H247Config {
            enabled: true,
            voice_channel_id: 10,
        };
        assert!(tts_keep_voice(Some(&parked), 10));
        assert!(!tts_keep_voice(Some(&parked), 20));
        assert!(!tts_keep_voice(None, 10));
        let off = H247Config {
            enabled: false,
            voice_channel_id: 10,
        };
        assert!(!tts_keep_voice(Some(&off), 10));
    }

    #[test]
    fn embed_ids_ts_rows_only() {
        assert_eq!(
            tts_embed_ids(
                r#"{"enabled":true,"voiceChannelId":"2","textChannelId":"3","embedMessageId":"4"}"#
            ),
            Some((3, 4))
        );
        // Rust rows carry no embedMessageId: no embed to delete.
        assert_eq!(
            tts_embed_ids(r#"{"text_channel_id":"3","voice_channel_id":"2","lang":"en-US"}"#),
            None
        );
        assert_eq!(tts_embed_ids("not json"), None);
    }

    fn sample_voices() -> Vec<FloweryVoice> {
        vec![
            FloweryVoice {
                id: "google-fr".into(),
                source: "Google Translate".into(),
                lang_code: "fr-FR".into(),
            },
            FloweryVoice {
                id: "azure-fr".into(),
                source: "Microsoft Azure".into(),
                lang_code: "fr-FR".into(),
            },
            FloweryVoice {
                id: "other-en".into(),
                source: "Other".into(),
                lang_code: "en-US".into(),
            },
        ]
    }

    #[test]
    fn flowery_pick_prefers_azure_then_google_then_any() {
        let voices = sample_voices();
        // Azure wins over Google for fr.
        assert_eq!(select_flowery_voice(&voices, "fr").unwrap().id, "azure-fr");
        // No Azure/Google for en: any code match.
        assert_eq!(select_flowery_voice(&voices, "en").unwrap().id, "other-en");
        // No voice at all for de.
        assert_eq!(select_flowery_voice(&voices, "de"), None);
        assert_eq!(select_flowery_voice(&voices, "xx"), None);
    }

    #[test]
    fn flowery_locale_mapping_covers_guild_locales() {
        let voices = sample_voices();
        assert_eq!(
            resolve_flowery_voice_id(&voices, "fr-FR"),
            Some("azure-fr".into())
        );
        // fr-ME falls back to fr, jp-JP resolves to ja.
        assert_eq!(
            resolve_flowery_voice_id(&voices, "fr-ME"),
            Some("azure-fr".into())
        );
        assert_eq!(
            resolve_flowery_voice_id(&voices, "en-US"),
            Some("other-en".into())
        );
        assert_eq!(resolve_flowery_voice_id(&voices, "jp-JP"), None);
        assert_eq!(resolve_flowery_voice_id(&voices, "xx-XX"), None);
    }

    #[tokio::test]
    async fn orphan_sweep_clears_stored_rows_only() {
        let pool = memory_pool().await;
        for (gid, lang) in [("g1", "en-US"), ("g2", "fr-FR")] {
            save_tts(
                &pool,
                gid,
                &TtsConfig {
                    text_channel_id: "1".into(),
                    voice_channel_id: "2".into(),
                    lang: lang.into(),
                },
            )
            .await
            .unwrap();
        }
        let swept = sweep_orphaned_tts(
            &pool,
            &["g1".to_string(), "g2".to_string(), "g9".to_string()],
        )
        .await;
        assert_eq!(swept, vec!["g1".to_string(), "g2".to_string()]);
        assert!(load_tts(&pool, "g1").await.is_none());
        assert!(load_tts(&pool, "g2").await.is_none());
    }
}

pub mod info;
pub mod join;
pub mod lang;
pub mod leave;
#[allow(clippy::module_inception)]
pub mod tts;

/// Old registry path (`tts::main::tts`) kept working.
pub mod main {
    pub use super::tts::*;
}
