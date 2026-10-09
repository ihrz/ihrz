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
    crate::db::kv_get(pool, guild_id, TTS_KEY)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

pub async fn save_tts(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &TtsConfig,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, guild_id, TTS_KEY, &serde_json::to_string(cfg)?).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn langs_accept_9_codes() {
        for c in TTS_LANGS {
            assert_eq!(parse_tts_lang(c), Some(c));
        }
        assert_eq!(parse_tts_lang("xx-XX"), None);
        assert_eq!(parse_tts_lang("fr-ME"), None);
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
