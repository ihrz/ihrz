use super::*;

/// Mirrors `!clear-queue.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear-queue",
    aliases("clearqueue")
)]
pub async fn m_clear(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let n = m.with_player(gid, |p| p.clear_queue()).await;
    ctx.say(format!("Cleared {n} queued track(s).")).await?;
    Ok(())
}
