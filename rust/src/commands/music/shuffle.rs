use super::*;

/// Mirrors `!shuffle.ts`.
#[poise::command(slash_command, prefix_command, rename = "shuffle")]
pub async fn m_shuffle(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let seed = now_ms() as u64;
    let n = m
        .with_player(gid, |p| {
            p.shuffle(seed);
            p.queue.len()
        })
        .await;
    if n == 0 {
        ctx.say("Queue is empty.").await?;
    } else {
        ctx.say(format!("Shuffled {n} queued track(s).")).await?;
    }
    Ok(())
}
