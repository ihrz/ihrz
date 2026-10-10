use super::*;

/// Mirrors `!loop.ts` (off/track/queue via `setRepeatMode`).
///
/// Recorded option-surface superset (no behavior change): the TS slash
/// definition (`music.ts:97-118`) only offers `off`/`track` choices,
/// while the prefix path forwards any string to `setRepeatMode` — so
/// `queue` works there like it does here. Accepting
/// off/track/queue on both paths is the intentional union.
#[poise::command(slash_command, prefix_command, rename = "loop")]
pub async fn m_loop(
    ctx: Ctx<'_>,
    #[description = "off, track or queue"] mode: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let mgr = synced_mgr(&ctx).await;
    let snap = mgr.snapshot(gid).await;
    let voice = voice_channel_of(&ctx);
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice.is_none() {
        say_key(&ctx, &code, "loop_no_queue", "There is no queue!").await?;
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
    let Some(m) = parse_loop(&mode) else {
        // TS `!loop.ts` never validates: `setRepeatMode(mode)` with an
        // unknown mode just fails silently (caught + logged). Stay
        // silent too — no `msg_use_off_track` reply.
        return Ok(());
    };
    let live_mode: crate::lavalink::LoopMode = m.into();
    mgr.with_player(gid, |p| p.loop_mode = Some(live_mode))
        .await;
    let glyph = loop_glyph(&mode);
    let msg = crate::lang::get(&code, "loop_command_work")
        .map(|s| s.replace("{mode}", glyph))
        .unwrap_or_else(|| format!("{glyph} | Updated loop mode"));
    ctx.say(msg).await?;
    Ok(())
}
