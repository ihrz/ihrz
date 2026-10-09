use super::*;

/// Mirrors `!loop.ts`.
#[poise::command(slash_command, prefix_command, rename = "loop")]
pub async fn m_loop(
    ctx: Ctx<'_>,
    #[description = "off or track"] mode: String,
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
        say_key(&ctx, &code, "msg_use_off_track", "Use off/track.").await?;
        return Ok(());
    };
    let live_mode: crate::lavalink::LoopMode = m.into();
    mgr.with_player(gid, |p| p.loop_mode = Some(live_mode))
        .await;
    let glyph = if mode.eq_ignore_ascii_case("track") {
        "🔂"
    } else {
        "▶"
    };
    let msg = crate::lang::get(&code, "loop_command_work")
        .map(|s| s.replace("{mode}", glyph))
        .unwrap_or_else(|| format!("{glyph} | Updated loop mode"));
    ctx.say(msg).await?;
    Ok(())
}
