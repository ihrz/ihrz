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
    // H247-parked stops keep the player + voice (`rest_stop_playing`,
    // like the main leg below); otherwise the TTS cleanup destroys the
    // node player like TS `cleanupTTS`.
    if let Some(gid_str) = ctx.guild_id().map(|g| g.get().to_string()) {
        if crate::commands::tts::load_tts(&ctx.data().pool, &gid_str)
            .await
            .is_some()
        {
            let _ = crate::commands::tts::delete_tts(&ctx.data().pool, &gid_str).await;
            let h247 = crate::commands::h247::load_h247(&ctx.data().pool, &gid_str).await;
            let h247_voice = if h247.enabled {
                h247.voice_channel_id.parse::<u64>().ok()
            } else {
                None
            };
            let parked = h247_parked_voice(
                h247.enabled,
                h247_voice,
                snap.as_ref().and_then(|s| s.voice_channel),
            );
            m.with_player(gid, |p| p.stop(now_ms())).await;
            if let Ok((node, session)) = m.live_node_and_session(gid).await {
                if parked {
                    let _ = m.rest_stop_playing(&node, &session, gid).await;
                } else {
                    let _ = m.rest_destroy(&node, &session, gid).await;
                }
            }
            say_key(&ctx, &code, "stop_command_work", "Queue stopped").await?;
            return Ok(());
        }
    }
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice.is_none() {
        // Mirrors `!stop.ts:79` (`!player || !player.playing ||
        // !voiceChannel`): no snapshot means no player, no current track
        // means nothing playing. Answered ephemeral like the TS
        // interaction path.
        let text = crate::lang::get(&code, "stop_nothing_playing")
            .unwrap_or_else(|| "nothing playing".to_string());
        ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
            .await?;
        return Ok(());
    }
    m.with_player(gid, |p| p.stop(now_ms())).await;
    // `player.stopPlaying()`: clears the queue and stops playback
    // without destroying the player or leaving the channel
    // (lavalink-client: "Does not destroy the Player and not leave the
    // channel"), so voice (H247-parked or not) is kept.
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_stop_playing(&node, &session, gid).await;
    }
    say_key(&ctx, &code, "stop_command_work", "Queue stopped").await?;
    Ok(())
}
