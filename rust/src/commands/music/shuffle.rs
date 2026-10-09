use super::*;

/// Mirrors `!shuffle.ts`.
#[poise::command(slash_command, prefix_command, rename = "shuffle")]
pub async fn m_shuffle(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    let voice = voice_channel_of(&ctx);
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice.is_none() {
        say_key(
            &ctx,
            &code,
            "shuffle_no_queue",
            "I am not in a voice channel",
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
    let n_tracks = snap.as_ref().map(|s| s.queue.len()).unwrap_or(0);
    if n_tracks < 2 {
        say_key(
            &ctx,
            &code,
            "shuffle_no_enought",
            "There aren't **enough tracks** in queue to **shuffle**",
        )
        .await?;
        return Ok(());
    }
    let seed = now_ms() as u64;
    m.with_player(gid, |p| {
        p.shuffle(seed);
    })
    .await;
    say_key(
        &ctx,
        &code,
        "shuffle_command_work",
        "I have **shuffled** the queue",
    )
    .await?;
    Ok(())
}
