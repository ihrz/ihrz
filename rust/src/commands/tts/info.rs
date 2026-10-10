use super::*;
use poise::serenity_prelude as serenity;

/// Get information about the TTS module!
#[poise::command(slash_command, prefix_command, rename = "info")]
pub async fn tts_info(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };

    let cfg = load_tts(&ctx.data().pool, &gid).await;
    // TS !info.ts: `const isActive = ttsData && ttsData.enabled`.
    let active = cfg.as_ref().map(|c| c.enabled).unwrap_or(false);

    let mut embed = serenity::CreateEmbed::new()
        .color(if active { 0x57F287 } else { 0xED4245 })
        .title(t("tts_info_embed_title", "TTS Module Information"))
        .description(t(
            "tts_info_embed_description",
            "The TTS (Text-to-Speech) module allows iHorizon to read messages aloud in a voice channel. When enabled, every message sent in the configured text channel by members who are in the voice channel will be spoken by iHorizon.",
        ))
        .field(
            t("tts_info_field_status", "Status"),
            if active {
                t("var_enabled", "Enabled")
            } else {
                t("var_disabled", "Disabled")
            },
            true,
        );
    if let Some(c) = cfg.as_ref().filter(|c| c.enabled) {
        embed = embed
            .field(
                t("var_voice_channel", "Voice Channel"),
                format!("<#{}>", c.voice_channel_id),
                true,
            )
            .field(
                t("var_text_channel", "Text Channel"),
                format!("<#{}>", c.text_channel_id),
                true,
            )
            .field(
                t("tts_info_field_lang", "TTS Language"),
                format!("`{}`", c.lang),
                true,
            );
    }
    embed = embed.field(
        t("tts_info_field_howto", "How to use"),
        t(
            "tts_info_howto_value",
            "Use `/tts join` to start TTS in your voice channel.\nUse `/tts leave` to stop TTS.\nUse `/tts lang` to change the voice language.",
        ),
        false,
    );

    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
