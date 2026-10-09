use super::*;

/// Mirrors `!clear-queue.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear-queue",
    aliases("clearqueue")
)]
pub async fn m_clear(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    let voice = voice_channel_of(&ctx);
    if snap.is_none() || voice.is_none() {
        say_key(
            &ctx,
            &code,
            "resume_nothing_playing",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    }
    if guard_same_voice(
        &ctx,
        &code,
        voice,
        bot_voice_channel(&ctx, gid, snap.as_ref().and_then(|s| s.voice_channel)),
    )
    .await
    {
        return Ok(());
    }
    m.with_player(gid, |p| p.clear_queue()).await;
    let security = emoji_markup(&ctx, "Security", "🛡️").await;
    let msg = crate::lang::get(&code, "clear_queue_command_ok")
        .map(|s| s.replace("${client.iHorizon_Emojis.Security}", &security))
        .unwrap_or_else(|| "The music queue in this discord has been cleared.".to_string());
    ctx.say(msg).await?;
    Ok(())
}
