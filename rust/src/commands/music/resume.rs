use super::*;

/// Mirrors `!resume.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "resume",
    aliases("unpause"),
    name_localized("fr", "reprendre"),
    name_localized("ja", "resume"),
    name_localized("ru", "resume"),
    name_localized("es-ES", "resume"),
    description_localized("fr", "Reprendre la chanson en cours de lecture"),
    description_localized("ja", "現在再生中の曲を再開！"),
    description_localized("ru", "Возобновить текущую песню!"),
    description_localized("es-ES", "Reanudar la canción actual!")
)]
pub async fn m_resume(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let voice = voice_channel_of(&ctx);
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    // Mirrors `!resume.ts:57` (`!player || !voiceChannel`): no
    // current-track requirement.
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
    m.with_player(gid, |p| p.paused = false).await;
    // Scrobble clock: resuming banks the paused span (mirrors
    // lastFMScrobbler.handlePlayerUpdate).
    m.lastfm_note_paused(gid, false, now_ms()).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_paused(&node, &session, gid, false).await;
    }
    say_key(&ctx, &code, "resume_command_work", "resumed successfully").await?;
    Ok(())
}
