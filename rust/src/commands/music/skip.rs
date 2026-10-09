use super::*;

/// Mirrors `!skip.ts`.
#[poise::command(slash_command, prefix_command, rename = "skip", aliases("next"))]
pub async fn m_skip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let skipped = m.with_player(gid, |p| p.skip(now_ms())).await;
    let Some(skipped) = skipped else {
        ctx.say("Nothing to skip.").await?;
        return Ok(());
    };
    // Push the next track (or destroy the node player when drained).
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let next = m.snapshot(gid).await.and_then(|s| s.current);
        match next {
            Some(t) => {
                let _ = m.rest_play(&node, &session, gid, &t.encoded, false).await;
                ctx.say(format!("Skipped. Now playing: {} - {}", t.author, t.title))
                    .await?;
            }
            None => {
                let _ = m.rest_destroy(&node, &session, gid).await;
                ctx.say(format!("Skipped {} (queue drained).", skipped.title))
                    .await?;
            }
        }
    } else {
        ctx.say(format!("Skipped {}.", skipped.title)).await?;
    }
    Ok(())
}
