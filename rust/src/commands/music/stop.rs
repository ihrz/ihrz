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
    // player check in `!stop.ts:70-77`): only a stored row with the
    // enabled flag cleans up (`ttsData && ttsData.enabled`, same gate
    // as the play leg). A disabled row falls through to the music
    // legs below. The full cleanupTTS legs run here (player destroy
    // with the H247 park guard, welcome-embed delete, voice-status
    // clear, row delete), never just the row delete.
    if let Some(gid_str) = ctx.guild_id().map(|g| g.get().to_string()) {
        if let Some(tts_cfg) = crate::commands::tts::load_tts(&ctx.data().pool, &gid_str).await {
            if tts_cfg.enabled {
                let h247_grant = crate::db::kv_get(&ctx.data().pool, &gid_str, "GUILD.H247")
                    .await
                    .and_then(|raw| crate::commands::h247::grant::parse_h247(&raw));
                crate::commands::tts::leave::cleanup_tts_live(
                    ctx.http(),
                    &ctx.serenity_context().shard,
                    &ctx.data().pool,
                    gid,
                    &tts_cfg,
                    h247_grant.as_ref(),
                )
                .await;
                say_key(&ctx, &code, "stop_command_work", "Queue stopped").await?;
                return Ok(());
            }
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
