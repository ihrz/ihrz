use super::*;

/// Mirrors `!resume.ts`.
#[poise::command(slash_command, prefix_command, rename = "resume", aliases("unpause"))]
pub async fn m_resume(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let voice = voice_channel_of(&ctx);
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice.is_none() {
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
    m.with_player(gid, |p| p.paused = false).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_paused(&node, &session, gid, false).await;
    }
    say_key(&ctx, &code, "resume_command_work", "resumed successfully").await?;
    Ok(())
}
