use super::*;

/// Mirrors `!stop.ts`.
#[poise::command(slash_command, prefix_command, rename = "stop")]
pub async fn m_stop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    m.with_player(gid, |p| p.stop(now_ms())).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_destroy(&node, &session, gid).await;
    }
    ctx.say("Stopped and cleared the queue.").await?;
    Ok(())
}
