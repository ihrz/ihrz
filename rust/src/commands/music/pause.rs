use super::*;

/// Mirrors `!pause.ts`.
#[poise::command(slash_command, prefix_command, rename = "pause")]
pub async fn m_pause(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let voice = voice_channel_of(&ctx);
    if guard_user_voice(&ctx, &code, "pause_no_queue", voice).await {
        return Ok(());
    }
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    // Refuse exactly like `!pause.ts:67` (`!player || !player.playing
    // || !voiceChannel`): nothing current (or nobody in voice) answers
    // the nothing-playing line before the same-voice gate.
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice.is_none() {
        say_key(
            &ctx,
            &code,
            "pause_nothing_playing",
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
    m.with_player(gid, |p| p.paused = true).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_paused(&node, &session, gid, true).await;
    }
    // Reply follows the resulting local flag, mirroring `!pause.ts:91-94`
    // (`player.paused ? pause_var_paused : pause_var_err`). The local
    // write always lands, so the err arm is unreachable off-transport:
    // a failed Lavalink REST leg cannot flip the snapshot back, which
    // is why this port always acks (kept intentionally; the REST call
    // above is fire-and-forget like the TS `player.pause()`).
    let paused = m.snapshot(gid).await.map(|s| s.paused).unwrap_or(false);
    say_key(
        &ctx,
        &code,
        if paused {
            "pause_var_paused"
        } else {
            "pause_var_err"
        },
        if paused {
            "paused"
        } else {
            "something went wrong"
        },
    )
    .await?;
    Ok(())
}
