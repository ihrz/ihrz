use super::*;

/// Mirrors `!volume.ts`.
#[poise::command(slash_command, prefix_command, rename = "volume")]
pub async fn m_volume(
    ctx: Ctx<'_>,
    #[description = "10-100"] level: i64,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let v = m.with_player(gid, |p| p.set_volume(level)).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        if let Err(e) = m.rest_set_volume(&node, &session, gid, v).await {
            ctx.say(format!("Volume: {v} (node sync failed: {e})."))
                .await?;
            return Ok(());
        }
    }
    ctx.say(format!("Volume: {v}.")).await?;
    Ok(())
}
