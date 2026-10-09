use super::*;

/// Mirrors `!resume.ts`.
#[poise::command(slash_command, prefix_command, rename = "resume", aliases("unpause"))]
pub async fn m_resume(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let has_current = m.snapshot(gid).await.and_then(|s| s.current).is_some();
    if !has_current {
        ctx.say("Nothing playing.").await?;
        return Ok(());
    }
    m.with_player(gid, |p| p.paused = false).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_paused(&node, &session, gid, false).await;
    }
    ctx.say("Resumed.").await?;
    Ok(())
}
