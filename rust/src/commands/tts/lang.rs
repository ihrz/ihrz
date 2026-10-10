use super::*;

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
