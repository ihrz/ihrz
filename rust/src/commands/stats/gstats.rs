use super::*;

#[poise::command(slash_command, prefix_command, rename = "gstats", aliases("g"))]
pub async fn stats_guild(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows = load_all_user_stats(&ctx.data().pool, &gid).await;
    let mut messages = 0u64;
    let mut voice_ms = 0u64;
    for (_, s) in &rows {
        messages += s.messages;
        voice_ms += s.voice_ms;
    }
    ctx.say(format!(
        "Members tracked: {} | Messages: {} | Voice: {}m",
        rows.len(),
        messages,
        voice_ms / 60_000
    ))
    .await?;
    Ok(())
}
