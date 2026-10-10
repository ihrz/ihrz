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
    let active = cfg.is_some();

    let mut embed = serenity::CreateEmbed::new()
        .color(if active { 0x57F287 } else { 0xED4245 })
        .title(t("tts_info_embed_title", "TTS Module Information"))
        .description(t(
            "tts_info_embed_description",
            "The TTS module reads messages aloud in a voice channel.",
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
    if let Some(c) = cfg {
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
            "Use `/tts join` to start TTS in your voice channel.",
        ),
        false,
    );

    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
