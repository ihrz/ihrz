use super::*;

/// Autocomplete for the TTS language: the 9 locale codes from the
/// `choices` list on the `language` option in tts.ts. Suggestions only
/// (like the volume autocomplete): both paths stay free text, like the
/// TS prefix leg (`!lang.ts`: `args?.[0] || "en-US"`, stored verbatim
/// with no validation).
async fn tts_lang_autocomplete<'a>(
    _ctx: Ctx<'a>,
    partial: &'a str,
) -> impl Iterator<Item = String> + 'a {
    TTS_LANGS
        .into_iter()
        .filter(move |v| v.starts_with(partial))
        .map(|v| v.to_string())
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
#[poise::command(slash_command, prefix_command, rename = "lang", aliases("ttslang"))]
pub async fn tts_lang(
    ctx: Ctx<'_>,
    #[description = "The TTS language to use!"]
    #[rename = "language"]
    #[autocomplete = "tts_lang_autocomplete"]
    lang: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = resolve_tts_lang(lang.as_deref());
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
    fn prefix_free_text_is_stored_verbatim() {
        // TS `!lang.ts` (`args?.[0] || "en-US"`) stores the prefix arg
        // without validation: only "" is falsy besides undefined, so
        // whitespace and unknown codes persist verbatim.
        assert_eq!(resolve_tts_lang(Some("fr-FR")), "fr-FR");
        assert_eq!(resolve_tts_lang(Some("xx-YY")), "xx-YY");
        assert_eq!(resolve_tts_lang(Some("   ")), "   ");
        assert_eq!(resolve_tts_lang(Some("  de-DE  ")), "  de-DE  ");
    }

    #[test]
    fn autocomplete_suggests_all_ts_choice_values() {
        // Every TS choice value in tts.ts is a known lang and parses.
        assert_eq!(TTS_LANGS.len(), 9);
        for code in TTS_LANGS {
            assert_eq!(parse_tts_lang(code), Some(code));
            assert_eq!(resolve_tts_lang(Some(code)), code);
        }
        assert_eq!(parse_tts_lang("xx-YY"), None);
    }
}
