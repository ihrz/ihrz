use super::*;

/// Fixed TTS language choice. Mirrors the `choices` list on the
/// `language` option in tts.ts (9 locales). Delta (documented):
/// Discord shows the locale codes (`en-US`, ...) as the choice labels
/// instead of the TS display names (`English`, ...); poise 0.6 inline
/// `#[choices]` only supports same-name values for strings, so the
/// enum form carries the codes. Prefix usage takes the same codes
/// (resolved via from_name); anything else is rejected by poise
/// before this runs, so the old invalid-lang branch is gone.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum TtsLangChoice {
    #[name = "en-US"]
    English,
    #[name = "fr-FR"]
    French,
    #[name = "de-DE"]
    German,
    #[name = "es-ES"]
    Spanish,
    #[name = "it-IT"]
    Italian,
    #[name = "jp-JP"]
    Japanese,
    #[name = "pt-PT"]
    Portuguese,
    #[name = "ru-RU"]
    Russian,
    #[name = "ar-EG"]
    Arabic,
}

/// Locale code for a choice (the TS choice `value`).
pub fn tts_lang_code(choice: TtsLangChoice) -> &'static str {
    match choice {
        TtsLangChoice::English => "en-US",
        TtsLangChoice::French => "fr-FR",
        TtsLangChoice::German => "de-DE",
        TtsLangChoice::Spanish => "es-ES",
        TtsLangChoice::Italian => "it-IT",
        TtsLangChoice::Japanese => "jp-JP",
        TtsLangChoice::Portuguese => "pt-PT",
        TtsLangChoice::Russian => "ru-RU",
        TtsLangChoice::Arabic => "ar-EG",
    }
}

#[poise::command(slash_command, prefix_command, rename = "lang")]
pub async fn tts_lang(
    ctx: Ctx<'_>,
    #[description = "TTS language"]
    #[rename = "language"]
    lang: TtsLangChoice,
) -> Result<(), anyhow::Error> {
    let code = tts_lang_code(lang);
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Not-active guard (mirrors TS !lang.ts): refusing before any write.
    if load_tts(&ctx.data().pool, &gid).await.is_none() {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&lang_code, "tts_lang_not_active")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "The TTS module is not currently active.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut cfg = load_tts(&ctx.data().pool, &gid).await.unwrap_or_default();
    cfg.lang = code.to_string();
    save_tts(&ctx.data().pool, &gid, &cfg).await?;
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

// Fixed slash choices mirror the `choices` list in tts.ts (9 locales);
// the runtime parse above stays as the backstop for prefix usage.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_choices_cover_all_tts_langs() {
        use poise::ChoiceParameter as _;
        assert_eq!(TTS_LANGS.len(), 9);
        let all = [
            TtsLangChoice::English,
            TtsLangChoice::French,
            TtsLangChoice::German,
            TtsLangChoice::Spanish,
            TtsLangChoice::Italian,
            TtsLangChoice::Japanese,
            TtsLangChoice::Portuguese,
            TtsLangChoice::Russian,
            TtsLangChoice::Arabic,
        ];
        // Every TS choice value is reachable and parses.
        for choice in all {
            let code = tts_lang_code(choice);
            assert!(TTS_LANGS.contains(&code));
            assert_eq!(parse_tts_lang(code), Some(code));
            assert_eq!(TtsLangChoice::from_name(code), Some(choice));
        }
        assert_eq!(TtsLangChoice::list().len(), 9);
        assert_eq!(TtsLangChoice::from_name("xx-YY"), None);
    }
}
