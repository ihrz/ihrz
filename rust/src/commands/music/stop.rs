use super::*;

/// Mirrors `!stop.ts`.
#[poise::command(slash_command, prefix_command, rename = "stop")]
pub async fn m_stop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let voice = voice_channel_of(&ctx);
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
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
    // TTS-manager early exit (TS `getTTSData`/`cleanupTTS` before the
    // player check): row presence = enabled (see `tts_row_enabled`).
    if let Some(gid_str) = ctx.guild_id().map(|g| g.get().to_string()) {
        if crate::commands::tts::load_tts(&ctx.data().pool, &gid_str)
            .await
            .is_some()
        {
            let _ = crate::commands::tts::delete_tts(&ctx.data().pool, &gid_str).await;
            m.with_player(gid, |p| p.stop(now_ms())).await;
            if let Ok((node, session)) = m.live_node_and_session(gid).await {
                let _ = m.rest_destroy(&node, &session, gid).await;
            }
            say_key(&ctx, &code, "stop_command_work", "Queue stopped").await?;
            return Ok(());
        }
    }
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice.is_none() {
        say_key(&ctx, &code, "stop_nothing_playing", "nothing playing").await?;
        return Ok(());
    }
    m.with_player(gid, |p| p.stop(now_ms())).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_destroy(&node, &session, gid).await;
    }
    say_key(&ctx, &code, "stop_command_work", "Queue stopped").await?;
    Ok(())
}
