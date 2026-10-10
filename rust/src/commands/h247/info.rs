use super::*;
use poise::serenity_prelude as serenity;

/// Get information about the TTS module!
#[poise::command(slash_command, prefix_command, rename = "info", aliases("h247info"))]
pub async fn h247_info(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };

    let cfg = load_h247(&ctx.data().pool, &gid).await;
    let active = cfg.enabled;

    let mut embed = serenity::CreateEmbed::new()
        .color(if active { 0x57F287 } else { 0xED4245 })
        .title(t("h247_info_embed_title", "H24/7 Module Information"))
        .description(t(
            "h247_info_embed_description",
            "The H24/7 module keeps iHorizon connected to a voice channel.",
        ))
        .field(
            t("h247_info_field_status", "Status"),
            if active {
                t("var_enabled", "Enabled")
            } else {
                t("var_disabled", "Disabled")
            },
            true,
        );
    if active {
        embed = embed.field(
            t("var_voice_channel", "Voice Channel"),
            format!("<#{}>", cfg.voice_channel_id),
            true,
        );
    }
    embed = embed.field(
        t("h247_info_field_howto", "How to use"),
        t(
            "h247_info_howto_value",
            "Use `/h247 join` to park iHorizon in a voice channel.",
        ),
        false,
    );

    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
