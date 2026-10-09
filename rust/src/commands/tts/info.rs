use super::*;

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
