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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TtsConfig {
    #[serde(default)]
    pub text_channel_id: String,
    #[serde(default)]
    pub voice_channel_id: String,
    #[serde(default = "default_tts_lang")]
    pub lang: String,
    /// TS row flag (`setTTSData` writes `enabled: true`; getTTSData
    /// returns null when `!data || !data.enabled`). Missing on legacy
    /// Rust rows, which read as enabled (row presence = enabled).
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

impl Default for TtsConfig {
    fn default() -> Self {
        Self {
            text_channel_id: String::new(),
            voice_channel_id: String::new(),
            lang: default_tts_lang(),
            enabled: true,
        }
    }
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

// messageCreate speak arm (pure leg of src/Events/tts/messageCreate.ts).
// The live arm (guild row + voice-membership + speak) runs in the
// message handler; the text gate, script-locale detectors, URL skip
// and locale fallback are pure here so they stay unit-tested.

/// Max speakable message size. Mirrors `if (text.length > 300) return`
/// (JS counts UTF-16 code units, so astral-plane chars count double).
pub const TTS_MAX_CHARS: usize = 300;

/// True when the message text may be spoken: non-empty and within the
/// 300 UTF-16-unit cap.
pub fn tts_message_text_ok(text: &str) -> bool {
    !text.is_empty() && text.encode_utf16().count() <= TTS_MAX_CHARS
}

/// Noise predicate for the locale detectors, mirroring the
/// `[\s\p{P}]` strip in detectMessageLocale: whitespace plus the full
/// Unicode General_Category=P punctuation set (table generated from
/// the Unicode Character Database; ASCII punctuation is covered by
/// the is_ascii_punctuation fast path below, the match lists every
/// non-ASCII P code point).
fn tts_locale_noise(c: char) -> bool {
    if c.is_whitespace() || c.is_ascii_punctuation() {
        return true;
    }
    matches!(c,
        '\u{a1}' |
        '\u{a7}' |
        '\u{ab}' |
        '\u{b6}'..='\u{b7}' |
        '\u{bb}' |
        '\u{bf}' |
        '\u{37e}' |
        '\u{387}' |
        '\u{55a}'..='\u{55f}' |
        '\u{589}'..='\u{58a}' |
        '\u{5be}' |
        '\u{5c0}' |
        '\u{5c3}' |
        '\u{5c6}' |
        '\u{5f3}'..='\u{5f4}' |
        '\u{609}'..='\u{60a}' |
        '\u{60c}'..='\u{60d}' |
        '\u{61b}' |
        '\u{61d}'..='\u{61f}' |
        '\u{66a}'..='\u{66d}' |
        '\u{6d4}' |
        '\u{700}'..='\u{70d}' |
        '\u{7f7}'..='\u{7f9}' |
        '\u{830}'..='\u{83e}' |
        '\u{85e}' |
        '\u{964}'..='\u{965}' |
        '\u{970}' |
        '\u{9fd}' |
        '\u{a76}' |
        '\u{af0}' |
        '\u{c77}' |
        '\u{c84}' |
        '\u{df4}' |
        '\u{e4f}' |
        '\u{e5a}'..='\u{e5b}' |
        '\u{f04}'..='\u{f12}' |
        '\u{f14}' |
        '\u{f3a}'..='\u{f3d}' |
        '\u{f85}' |
        '\u{fd0}'..='\u{fd4}' |
        '\u{fd9}'..='\u{fda}' |
        '\u{104a}'..='\u{104f}' |
        '\u{10fb}' |
        '\u{1360}'..='\u{1368}' |
        '\u{1400}' |
        '\u{166e}' |
        '\u{169b}'..='\u{169c}' |
        '\u{16eb}'..='\u{16ed}' |
        '\u{1735}'..='\u{1736}' |
        '\u{17d4}'..='\u{17d6}' |
        '\u{17d8}'..='\u{17da}' |
        '\u{1800}'..='\u{180a}' |
        '\u{1944}'..='\u{1945}' |
        '\u{1a1e}'..='\u{1a1f}' |
        '\u{1aa0}'..='\u{1aa6}' |
        '\u{1aa8}'..='\u{1aad}' |
        '\u{1b4e}'..='\u{1b4f}' |
        '\u{1b5a}'..='\u{1b60}' |
        '\u{1b7d}'..='\u{1b7f}' |
        '\u{1bfc}'..='\u{1bff}' |
        '\u{1c3b}'..='\u{1c3f}' |
        '\u{1c7e}'..='\u{1c7f}' |
        '\u{1cc0}'..='\u{1cc7}' |
        '\u{1cd3}' |
        '\u{2010}'..='\u{2027}' |
        '\u{2030}'..='\u{2043}' |
        '\u{2045}'..='\u{2051}' |
        '\u{2053}'..='\u{205e}' |
        '\u{207d}'..='\u{207e}' |
        '\u{208d}'..='\u{208e}' |
        '\u{2308}'..='\u{230b}' |
        '\u{2329}'..='\u{232a}' |
        '\u{2768}'..='\u{2775}' |
        '\u{27c5}'..='\u{27c6}' |
        '\u{27e6}'..='\u{27ef}' |
        '\u{2983}'..='\u{2998}' |
        '\u{29d8}'..='\u{29db}' |
        '\u{29fc}'..='\u{29fd}' |
        '\u{2cf9}'..='\u{2cfc}' |
        '\u{2cfe}'..='\u{2cff}' |
        '\u{2d70}' |
        '\u{2e00}'..='\u{2e2e}' |
        '\u{2e30}'..='\u{2e4f}' |
        '\u{2e52}'..='\u{2e5d}' |
        '\u{3001}'..='\u{3003}' |
        '\u{3008}'..='\u{3011}' |
        '\u{3014}'..='\u{301f}' |
        '\u{3030}' |
        '\u{303d}' |
        '\u{30a0}' |
        '\u{30fb}' |
        '\u{a4fe}'..='\u{a4ff}' |
        '\u{a60d}'..='\u{a60f}' |
        '\u{a673}' |
        '\u{a67e}' |
        '\u{a6f2}'..='\u{a6f7}' |
        '\u{a874}'..='\u{a877}' |
        '\u{a8ce}'..='\u{a8cf}' |
        '\u{a8f8}'..='\u{a8fa}' |
        '\u{a8fc}' |
        '\u{a92e}'..='\u{a92f}' |
        '\u{a95f}' |
        '\u{a9c1}'..='\u{a9cd}' |
        '\u{a9de}'..='\u{a9df}' |
        '\u{aa5c}'..='\u{aa5f}' |
        '\u{aade}'..='\u{aadf}' |
        '\u{aaf0}'..='\u{aaf1}' |
        '\u{abeb}' |
        '\u{fd3e}'..='\u{fd3f}' |
        '\u{fe10}'..='\u{fe19}' |
        '\u{fe30}'..='\u{fe52}' |
        '\u{fe54}'..='\u{fe61}' |
        '\u{fe63}' |
        '\u{fe68}' |
        '\u{fe6a}'..='\u{fe6b}' |
        '\u{ff01}'..='\u{ff03}' |
        '\u{ff05}'..='\u{ff0a}' |
        '\u{ff0c}'..='\u{ff0f}' |
        '\u{ff1a}'..='\u{ff1b}' |
        '\u{ff1f}'..='\u{ff20}' |
        '\u{ff3b}'..='\u{ff3d}' |
        '\u{ff3f}' |
        '\u{ff5b}' |
        '\u{ff5d}' |
        '\u{ff5f}'..='\u{ff65}' |
        '\u{10100}'..='\u{10102}' |
        '\u{1039f}' |
        '\u{103d0}' |
        '\u{1056f}' |
        '\u{10857}' |
        '\u{1091f}' |
        '\u{1093f}' |
        '\u{10a50}'..='\u{10a58}' |
        '\u{10a7f}' |
        '\u{10af0}'..='\u{10af6}' |
        '\u{10b39}'..='\u{10b3f}' |
        '\u{10b99}'..='\u{10b9c}' |
        '\u{10d6e}' |
        '\u{10ead}' |
        '\u{10f55}'..='\u{10f59}' |
        '\u{10f86}'..='\u{10f89}' |
        '\u{11047}'..='\u{1104d}' |
        '\u{110bb}'..='\u{110bc}' |
        '\u{110be}'..='\u{110c1}' |
        '\u{11140}'..='\u{11143}' |
        '\u{11174}'..='\u{11175}' |
        '\u{111c5}'..='\u{111c8}' |
        '\u{111cd}' |
        '\u{111db}' |
        '\u{111dd}'..='\u{111df}' |
        '\u{11238}'..='\u{1123d}' |
        '\u{112a9}' |
        '\u{113d4}'..='\u{113d5}' |
        '\u{113d7}'..='\u{113d8}' |
        '\u{1144b}'..='\u{1144f}' |
        '\u{1145a}'..='\u{1145b}' |
        '\u{1145d}' |
        '\u{114c6}' |
        '\u{115c1}'..='\u{115d7}' |
        '\u{11641}'..='\u{11643}' |
        '\u{11660}'..='\u{1166c}' |
        '\u{116b9}' |
        '\u{1173c}'..='\u{1173e}' |
        '\u{1183b}' |
        '\u{11944}'..='\u{11946}' |
        '\u{119e2}' |
        '\u{11a3f}'..='\u{11a46}' |
        '\u{11a9a}'..='\u{11a9c}' |
        '\u{11a9e}'..='\u{11aa2}' |
        '\u{11b00}'..='\u{11b09}' |
        '\u{11be1}' |
        '\u{11c41}'..='\u{11c45}' |
        '\u{11c70}'..='\u{11c71}' |
        '\u{11ef7}'..='\u{11ef8}' |
        '\u{11f43}'..='\u{11f4f}' |
        '\u{11fff}' |
        '\u{12470}'..='\u{12474}' |
        '\u{12ff1}'..='\u{12ff2}' |
        '\u{16a6e}'..='\u{16a6f}' |
        '\u{16af5}' |
        '\u{16b37}'..='\u{16b3b}' |
        '\u{16b44}' |
        '\u{16d6d}'..='\u{16d6f}' |
        '\u{16e97}'..='\u{16e9a}' |
        '\u{16fe2}' |
        '\u{1bc9f}' |
        '\u{1da87}'..='\u{1da8b}' |
        '\u{1e5ff}' |
        '\u{1e95e}'..='\u{1e95f}')
}

/// Script detectors mirroring DETECTORS in messageCreate.ts, in order:
/// Cyrillic -> ru-RU, Hiragana/Katakana/CJK -> jp-JP, Hangul -> jp-JP
/// (TS quirk, kept: there is no ko-KR TTS locale), Arabic/Hebrew ->
/// ar-EG. A script wins at a 40% share of the noise-stripped text.
fn tts_script_hit(c: char, detector: u8) -> bool {
    match detector {
        0 => matches!(c, 'а'..='я' | 'А'..='Я' | 'ё' | 'Ё'),
        1 => {
            matches!(c, '\u{3040}'..='\u{309f}' | '\u{30a0}'..='\u{30ff}' | '\u{4e00}'..='\u{9fff}')
        }
        2 => matches!(c, '\u{ac00}'..='\u{d7af}'),
        _ => matches!(c, '\u{600}'..='\u{6ff}' | '\u{590}'..='\u{5ff}'),
    }
}

/// Locale override from the message script, mirroring
/// detectMessageLocale (40% threshold on noise-stripped text).
/// `cleaned.length` counts UTF-16 code units, so the threshold
/// denominator sums `len_utf16` (astral chars cost 2); hit counts stay
/// per-char, like the TS single-char regex matches.
pub fn detect_message_locale(text: &str) -> Option<&'static str> {
    const LOCALES: [&str; 4] = ["ru-RU", "jp-JP", "jp-JP", "ar-EG"];
    let cleaned: Vec<char> = text.chars().filter(|c| !tts_locale_noise(*c)).collect();
    if cleaned.is_empty() {
        return None;
    }
    let total_units: usize = cleaned.iter().map(|c| c.len_utf16()).sum();
    for (i, locale) in LOCALES.iter().enumerate() {
        let hits = cleaned
            .iter()
            .filter(|c| tts_script_hit(**c, i as u8))
            .count();
        // Float compare like TS (`matches.length >= cleaned.length * 0.4`).
        if hits as f64 >= total_units as f64 * 0.4 {
            return Some(locale);
        }
    }
    None
}

/// True when the whole message is one URL, mirroring isUrl
/// (`new URL(str)` only parses absolute URLs with a scheme + host).
pub fn tts_is_url(text: &str) -> bool {
    let t = text.trim();
    let Some(colon) = t.find(':') else {
        return false;
    };
    let (scheme, rest) = t.split_at(colon);
    if scheme.is_empty()
        || !scheme.starts_with(|c: char| c.is_ascii_alphabetic())
        || !scheme
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'))
    {
        return false;
    }
    let after = &rest[1..];
    let host = after
        .strip_prefix("//")
        .map(|h| h.split('/').next().unwrap_or(""))
        .unwrap_or("");
    !host.is_empty()
}

/// Locale fallback chain, mirroring
/// `detectedLocale || ttsData.lang || serverLocale || "en-US"`.
/// JS `||` treats empty strings as missing, so blank legs fall
/// through instead of pinning an empty locale.
pub fn resolve_tts_locale(
    detected: Option<&str>,
    tts_lang: Option<&str>,
    server_lang: Option<&str>,
) -> String {
    detected
        .filter(|s| !s.trim().is_empty())
        .or_else(|| tts_lang.filter(|s| !s.trim().is_empty()))
        .or_else(|| server_lang.filter(|s| !s.trim().is_empty()))
        .unwrap_or("en-US")
        .to_string()
}

/// Whitespace collapse + trim, mirroring the speakTTS sanitize
/// (`text.replace(/\s+/g, " ").trim()`).
pub fn sanitize_tts_text(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
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
        crate::db::memory_pool().await
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
                enabled: true,
            },
        )
        .await
        .unwrap();
        assert_eq!(load_tts(&pool, "g1").await.unwrap().lang, "fr-FR");
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "GUILD.TTS").await;
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
    fn message_text_gate_caps_at_300_utf16_units() {
        assert!(tts_message_text_ok("hello"));
        assert!(!tts_message_text_ok(""));
        assert!(tts_message_text_ok(&"a".repeat(300)));
        assert!(!tts_message_text_ok(&"a".repeat(301)));
        // Astral-plane chars count double, like JS string length.
        assert!(tts_message_text_ok(&"😀".repeat(150)));
        assert!(!tts_message_text_ok(&"😀".repeat(151)));
    }

    #[test]
    fn detectors_mirror_ts_scripts_and_threshold() {
        assert_eq!(detect_message_locale("Привет, как дела"), Some("ru-RU"));
        assert_eq!(detect_message_locale("こんにちは世界"), Some("jp-JP"));
        assert_eq!(detect_message_locale("你好世界朋友们"), Some("jp-JP"));
        // Hangul maps to jp-JP (TS quirk: no ko-KR TTS locale exists).
        assert_eq!(detect_message_locale("안녕하세요 여러분"), Some("jp-JP"));
        assert_eq!(detect_message_locale("مرحبا بالعالم الجديد"), Some("ar-EG"));
        // Below the 40% share: no override.
        assert_eq!(detect_message_locale("hello world"), None);
        assert_eq!(detect_message_locale("hello Привет world"), None);
        // UTF-16 threshold like TS `cleaned.length`: 2 Cyrillic hits in
        // 5 chars look like 40%, but 8 UTF-16 units (3 astral emoji
        // cost double) drop the share to 25%.
        assert_eq!(detect_message_locale("аб😀😀😀"), None);
        // Noise-only text: no override.
        assert_eq!(detect_message_locale("... !!  "), None);
        assert_eq!(detect_message_locale(""), None);
    }

    #[test]
    fn url_skip_mirrors_ts_is_url() {
        assert!(tts_is_url("https://example.com/foo?bar=baz"));
        assert!(tts_is_url("http://x.y"));
        assert!(tts_is_url("ftp://files.example.com/a"));
        assert!(!tts_is_url("notaurl"));
        assert!(!tts_is_url("example.com/path"));
        assert!(!tts_is_url("http://"));
        assert!(!tts_is_url(""));
        assert!(!tts_is_url("hello: world"));
    }

    #[test]
    fn locale_fallback_chain_and_sanitize() {
        assert_eq!(
            resolve_tts_locale(Some("ru-RU"), Some("fr-FR"), Some("de-DE")),
            "ru-RU"
        );
        assert_eq!(
            resolve_tts_locale(None, Some("fr-FR"), Some("de-DE")),
            "fr-FR"
        );
        assert_eq!(resolve_tts_locale(None, None, Some("de-DE")), "de-DE");
        assert_eq!(resolve_tts_locale(None, None, None), "en-US");
        // Empty legs fall through like JS `||` (empty lang -> None).
        assert_eq!(
            resolve_tts_locale(Some(""), Some("fr-FR"), Some("de-DE")),
            "fr-FR"
        );
        assert_eq!(resolve_tts_locale(Some(""), Some(""), Some("")), "en-US");
        assert_eq!(resolve_tts_locale(None, Some("  "), Some("de-DE")), "de-DE");
        assert_eq!(sanitize_tts_text("  hello \t\n  world  "), "hello world");
        assert_eq!(sanitize_tts_text("   "), "");
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
                    enabled: true,
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
pub mod speak;
#[allow(clippy::module_inception)]
pub mod tts;

/// Old registry path (`tts::main::tts`) kept working.
pub mod main {
    pub use super::tts::*;
}
