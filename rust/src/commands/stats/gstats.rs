use super::*;

#[poise::command(slash_command, prefix_command, rename = "gstats", aliases("g"))]
pub async fn stats_guild(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.USER.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut messages = 0u64;
    let mut voice_ms = 0u64;
    for raw in &rows {
        if let Ok(s) = serde_json::from_str::<UserStats>(raw) {
            messages += s.messages;
            voice_ms += s.voice_ms;
        }
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
