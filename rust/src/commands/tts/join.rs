use super::*;
use poise::serenity_prelude as serenity;

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
