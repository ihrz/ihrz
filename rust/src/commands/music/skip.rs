use super::*;

/// Mirrors `!skip.ts`.
#[poise::command(slash_command, prefix_command, rename = "skip", aliases("next"))]
pub async fn m_skip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let voice = voice_channel_of(&ctx);
    if guard_user_voice(&ctx, &code, "skip_not_in_voice_channel", voice).await {
        return Ok(());
    }
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    let bot_voice = bot_voice_channel(&ctx, gid, snap.as_ref().and_then(|s| s.voice_channel));
    if guard_same_voice(&ctx, &code, voice, bot_voice).await {
        return Ok(());
    }
    let Some(current) = snap.as_ref().and_then(|s| s.current.clone()) else {
        say_key(
            &ctx,
            &code,
            "skip_nothing_playing",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    };
    let skipped_title = current.title.clone();
    let skipped = m.with_player(gid, |p| p.skip(now_ms())).await;
    if skipped.is_none() {
        say_key(
            &ctx,
            &code,
            "skip_nothing_playing",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    }
    // Push the next track (or destroy the node player when drained).
    // The state advance mirrors the lavalink recovery skip legs, so
    // the reply carries the outcome in recovery terms: any
    // guild-visible notice from track_error_notice rides along, and a
    // failed live push answers with the player-error shape instead of
    // a success line for playback that never started.
    let with_notice = |base: String, recovery: &crate::lavalink::ErrorRecovery| {
        match track_error_notice(recovery) {
            Some(n) => format!("{base}\n{n}"),
            None => base,
        }
    };
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let next = m.snapshot(gid).await.and_then(|s| s.current);
        match next {
            Some(t) => {
                if let Err(e) = m.rest_play(&node, &session, gid, &t.encoded, false).await {
                    ctx.say(player_error_text(&code, &e.to_string())).await?;
                    return Ok(());
                }
                let msg = crate::lang::get(&code, "skip_command_work")
                    .map(|s| s.replace("{queue}", &t.title))
                    .unwrap_or_else(|| format!("Skipped {}", t.title));
                let recovery = crate::lavalink::ErrorRecovery::Advanced;
                ctx.say(with_notice(msg, &recovery)).await?;
            }
            None => {
                if let Err(e) = m.rest_destroy(&node, &session, gid).await {
                    ctx.say(player_error_text(&code, &e.to_string())).await?;
                    return Ok(());
                }
                let msg = crate::lang::get(&code, "skip_command_work")
                    .map(|s| s.replace("{queue}", &skipped_title))
                    .unwrap_or_else(|| format!("Skipped {skipped_title}"));
                let recovery = crate::lavalink::ErrorRecovery::Idle;
                ctx.say(with_notice(msg, &recovery)).await?;
            }
        }
    } else {
        let msg = crate::lang::get(&code, "skip_command_work")
            .map(|s| s.replace("{queue}", &skipped_title))
            .unwrap_or_else(|| format!("Skipped {skipped_title}"));
        ctx.say(msg).await?;
    }
    // TS also announces the skip in the player's text channel when it
    // differs (`event_mp_playerSkip`); fire-and-forget like TS.
    if ctx.channel_id().get() != snap.as_ref().and_then(|s| s.text_channel).unwrap_or(0) {
        if let Some(text) = snap.as_ref().and_then(|s| s.text_channel) {
            let icon = emoji_markup(&ctx, "Music_Icon", "🎵").await;
            let desc = crate::lang::get(&code, "event_mp_playerSkip")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Music_Icon}", &icon)
                        .replace("${track.title}", &skipped_title)
                })
                .unwrap_or_else(|| format!("Skipping **{skipped_title}**!"));
            let embed = serenity::CreateEmbed::default()
                .colour(0x2B2D31)
                .description(desc);
            let _ = serenity::ChannelId::new(text)
                .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
                .await;
        }
    }
    Ok(())
}
