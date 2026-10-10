use super::*;
use poise::serenity_prelude as serenity;

/// Get information about the H24/7 module!
// Deliberately ungated (U-MSV-FIX14): TS `h247.ts` leaves `info` at
// `permission: null` while `join`/`leave` require Administrator. See
// the gate-parity note on the `h247` parent: the parent
// `ADMINISTRATOR` default covers `/h247 info` server-side, while
// `!h247 info` stays open on prefix exactly like TS. Do NOT gate this
// body — only the guild-presence early return below applies.
// (Plain `//` comments: `///` doc lines become the slash description,
// which poise caps at 100 chars.)
#[poise::command(slash_command, prefix_command, rename = "info", aliases("h247info"))]
pub async fn h247_info(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // TS !info.ts returns silently without user/member/guild/channel;
    // the guild leg covers it here (DM invocations carry no guild).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
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
            "The H24/7 module keeps iHorizon connected to a voice channel around the clock, even with nothing playing. It is useful to keep a server's voice streak alive.\nWhile this module is enabled, music and TTS can only run inside the H24/7 voice channel.\nThe connection automatically recovers after restarts or player shutdowns.",
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
            "Use `/h247 join` to park iHorizon in a voice channel.\nUse `/h247 leave` to disable the module.\nUse `/h247 info` to display this panel.",
        ),
        false,
    );

    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
