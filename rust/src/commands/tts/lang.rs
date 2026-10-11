use super::*;

/// TTS language choice. Mirrors the `language` option `choices` in
/// tts.ts:138-147 (+Arabic): slash shows the localized display names,
/// the handler maps each variant back to the TS `value` code. The
/// value codes double as prefix aliases so `!lang en-US` keeps working.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum TtsLang {
    #[name = "English"]
    #[name_localized("fr", "Anglais")]
    #[name_localized("ja", "english")]
    #[name_localized("ru", "english")]
    #[name_localized("es-ES", "english")]
    #[name = "en-US"]
    English,
    #[name = "French"]
    #[name_localized("fr", "Francais")]
    #[name_localized("ja", "french")]
    #[name_localized("ru", "french")]
    #[name_localized("es-ES", "french")]
    #[name = "fr-FR"]
    French,
    #[name = "German"]
    #[name_localized("fr", "Allemand")]
    #[name_localized("ja", "german")]
    #[name_localized("ru", "german")]
    #[name_localized("es-ES", "german")]
    #[name = "de-DE"]
    German,
    #[name = "Spanish"]
    #[name_localized("fr", "Espagnol")]
    #[name_localized("ja", "spanish")]
    #[name_localized("ru", "spanish")]
    #[name_localized("es-ES", "spanish")]
    #[name = "es-ES"]
    Spanish,
    #[name = "Italian"]
    #[name_localized("fr", "Italien")]
    #[name_localized("ja", "italian")]
    #[name_localized("ru", "italian")]
    #[name_localized("es-ES", "italian")]
    #[name = "it-IT"]
    Italian,
    #[name = "Japanese"]
    #[name_localized("fr", "Japonais")]
    #[name_localized("ja", "japanese")]
    #[name_localized("ru", "japanese")]
    #[name_localized("es-ES", "japanese")]
    #[name = "jp-JP"]
    Japanese,
    #[name = "Portuguese"]
    #[name_localized("fr", "Portugais")]
    #[name_localized("ja", "portuguese")]
    #[name_localized("ru", "portuguese")]
    #[name_localized("es-ES", "portuguese")]
    #[name = "pt-PT"]
    Portuguese,
    #[name = "Russian"]
    #[name_localized("fr", "Russe")]
    #[name_localized("ja", "russian")]
    #[name_localized("ru", "russian")]
    #[name_localized("es-ES", "russian")]
    #[name = "ru-RU"]
    Russian,
    #[name = "Arabic"]
    #[name_localized("fr", "Arabe")]
    #[name_localized("ja", "arabic")]
    #[name_localized("ru", "arabic")]
    #[name_localized("es-ES", "arabic")]
    #[name = "ar-EG"]
    Arabic,
}

impl TtsLang {
    /// TS `value` code stored in `GUILD.TTS.lang`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::English => "en-US",
            Self::French => "fr-FR",
            Self::German => "de-DE",
            Self::Spanish => "es-ES",
            Self::Italian => "it-IT",
            Self::Japanese => "jp-JP",
            Self::Portuguese => "pt-PT",
            Self::Russian => "ru-RU",
            Self::Arabic => "ar-EG",
        }
    }
}

/// Default TTS language, mirroring `!lang.ts` (`args?.[0] || "en-US"`).
pub const DEFAULT_TTS_LANG: &str = "en-US";

/// Resolve the raw language argument like `!lang.ts`: only a missing
/// argument (`None`, slash omitted) or an empty string (`""`, the other
/// JS-falsy case of `||`) reads as `en-US`. Anything else — including
/// whitespace or an unknown code — is stored verbatim with no
/// validation, exactly like the TS prefix leg.
pub fn resolve_tts_lang(raw: Option<&str>) -> String {
    match raw {
        None => DEFAULT_TTS_LANG.to_string(),
        Some("") => DEFAULT_TTS_LANG.to_string(),
        Some(s) => s.to_string(),
    }
}

/// Set the default TTS language for the guild!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lang",
    aliases("ttslang"),
    name_localized("fr", "langue"),
    name_localized("ja", "lang"),
    name_localized("ru", "lang"),
    name_localized("es-ES", "lang"),
    description_localized("fr", "Définir la langue TTS par défaut du serveur"),
    description_localized("ja", "サーバーのデフォルトTTS言語を設定！"),
    description_localized("ru", "Установить язык TTS по умолчанию!"),
    description_localized("es-ES", "Establecer el idioma TTS predeterminado para el servidor!")
)]
pub async fn tts_lang(
    ctx: Ctx<'_>,
    #[name_localized("fr", "langue")]
    #[name_localized("ja", "language")]
    #[name_localized("ru", "language")]
    #[name_localized("es-ES", "language")]
    #[description_localized("fr", "La langue TTS à utiliser")]
    #[description_localized("ja", "使用するTTS言語！")]
    #[description_localized("ru", "Язык TTS для использования!")]
    #[description_localized("es-ES", "El idioma TTS a usar!")]
    #[description = "The TTS language to use!"]
    #[rename = "language"]
    lang: Option<TtsLang>,
) -> Result<(), anyhow::Error> {
    let code = resolve_tts_lang(lang.map(|l| l.as_str()));
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let lang_code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Not-active guard (mirrors TS !lang.ts `!ttsData || !ttsData.enabled`):
    // refusing before any write. A stored row with `enabled: false`
    // refuses like a missing row.
    if !load_tts(&ctx.data().pool, &gid)
        .await
        .map(|c| c.enabled)
        .unwrap_or(false)
    {
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
    cfg.lang = code.clone();
    save_tts(&ctx.data().pool, &gid, &cfg).await?;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&lang_code, "tts_lang_set")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${language}", &code)
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
    fn missing_or_empty_lang_defaults_to_en_us() {
        assert_eq!(resolve_tts_lang(None), "en-US");
        assert_eq!(resolve_tts_lang(Some("")), "en-US");
    }

    #[test]
    fn prefix_codes_resolve_verbatim() {
        // The TS `value` codes double as prefix aliases, so every valid
        // code keeps working on the prefix leg.
        assert_eq!(resolve_tts_lang(Some("fr-FR")), "fr-FR");
        assert_eq!(resolve_tts_lang(Some("  de-DE  ")), "  de-DE  ");
    }

    #[test]
    fn lang_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        // Display names, byte-exact from tts.ts:138+.
        let names: Vec<_> = TtsLang::list().into_iter().map(|c| c.name).collect();
        assert_eq!(
            names,
            vec![
                "English",
                "French",
                "German",
                "Spanish",
                "Italian",
                "Japanese",
                "Portuguese",
                "Russian",
                "Arabic",
            ]
        );
        for (variant, code) in [
            (TtsLang::English, "en-US"),
            (TtsLang::French, "fr-FR"),
            (TtsLang::German, "de-DE"),
            (TtsLang::Spanish, "es-ES"),
            (TtsLang::Italian, "it-IT"),
            (TtsLang::Japanese, "jp-JP"),
            (TtsLang::Portuguese, "pt-PT"),
            (TtsLang::Russian, "ru-RU"),
            (TtsLang::Arabic, "ar-EG"),
        ] {
            // Stored value, prefix alias, and slash index round-trip.
            assert_eq!(variant.as_str(), code);
            assert_eq!(TtsLang::from_name(code), Some(variant));
            let idx = TTS_LANGS.iter().position(|c| *c == code).unwrap();
            assert_eq!(TtsLang::from_index(idx), Some(variant), "index of {code}");
            assert_eq!(resolve_tts_lang(Some(code)), code);
        }
        assert_eq!(TtsLang::from_name("ENGLISH"), Some(TtsLang::English));
        assert_eq!(TtsLang::from_name("xx-YY"), None);
        // Localized display names, byte-exact from tts.ts.
        let list = TtsLang::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Anglais")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Francais")
        );
        assert_eq!(
            list[7].localizations.get("fr").map(String::as_str),
            Some("Russe")
        );
        assert_eq!(
            list[8].localizations.get("fr").map(String::as_str),
            Some("Arabe")
        );
        assert_eq!(
            list[0].localizations.get("ja").map(String::as_str),
            Some("english")
        );
        assert_eq!(
            list[5].localizations.get("es-ES").map(String::as_str),
            Some("japanese")
        );
        assert_eq!(TtsLang::English.localized_name("fr"), Some("Anglais"));
        assert_eq!(TtsLang::French.localized_name("fr"), Some("Francais"));
        assert_eq!(TtsLang::French.localized_name("xx"), None);
    }
}
