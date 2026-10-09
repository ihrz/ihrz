// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/tts/* via ttsManager.ts.
//
// TS keys: <guild>.GUILD.TTS {textChannelId, voiceChannelId, lang}.
// 9 locales: en-US fr-FR de-DE es-ES it-IT jp-JP pt-PT ru-RU ar-EG.
// Refusals: music playing, H247 mismatch (see voice.rs music_guard).

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
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

#[poise::command(
    slash_command,
    prefix_command,
    category = "tts",
    rename = "tts",
    subcommands("tts_join", "tts_leave", "tts_info", "tts_lang")
)]
pub async fn tts(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "join")]
pub async fn tts_join(
    ctx: Ctx<'_>,
    #[description = "Voice channel"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut cfg = load_tts(&ctx.data().pool, &gid).await.unwrap_or_default();
    cfg.voice_channel_id = channel.id.get().to_string();
    if let Some(ch) = ctx.guild_channel().await {
        cfg.text_channel_id = ch.id.get().to_string();
    }
    save_tts(&ctx.data().pool, &gid, &cfg).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "tts_join_enabled")
            .map(|s| {
                s.replace("${voiceChannel}", &format!("<#{}>", channel.id.get()))
                    .replace("${client.iHorizon_Emojis.Yes}", &yes)
            })
            .unwrap_or_else(|| "TTS joined.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "leave")]
pub async fn tts_leave(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(TTS_KEY)
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "tts_leave_disabled")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| "TTS left and cleaned up.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "info")]
pub async fn tts_info(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match load_tts(&ctx.data().pool, &gid).await {
        Some(cfg) => {
            ctx.say(format!(
                "TTS lang {} voice <#{}>",
                cfg.lang, cfg.voice_channel_id
            ))
            .await?
        }
        None => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "tts_lang_not_active")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "TTS disabled.".to_string()),
            )
            .await?
        }
    };
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "lang")]
pub async fn tts_lang(
    ctx: Ctx<'_>,
    #[description = "TTS language"] lang: String,
) -> Result<(), anyhow::Error> {
    let Some(code) = parse_tts_lang(lang.trim()) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(
                &code,
                "msg_invalid_lang_en_us_fr_fr_de_de_es_es_it_it_jp_jp_pt_pt_ru_ru_ar_eg",
            )
            .unwrap_or_else(|| {
                "Invalid lang (en-US fr-FR de-DE es-ES it-IT jp-JP pt-PT ru-RU ar-EG).".to_string()
            }),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut cfg = load_tts(&ctx.data().pool, &gid).await.unwrap_or_default();
    cfg.lang = code.to_string();
    save_tts(&ctx.data().pool, &gid, &cfg).await?;
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&lang_code, "tts_lang_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${language}", code)
            })
            .unwrap_or_else(|| format!("TTS lang set to {code}.")),
    )
    .await?;
    Ok(())
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
