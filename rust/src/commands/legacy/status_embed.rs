use super::*;

/// Status embed. Mirrors status-embed.ts (local process status).
///
/// TS gates the run on `isBotOwner` (`else return`) — mirrored here
/// before any status read.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "status-embed"
)]
pub async fn status_embed(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let owners = crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
    if !owners
        .iter()
        .any(|o| o == &ctx.author().id.get().to_string())
    {
        return Ok(());
    }
    let latency = ctx.ping().await.as_millis();
    let db_ms = crate::funcs::database_latency(&ctx.data().pool).await;
    let mem = crate::funcs::system_memory_kb();
    // TS status.ts reports used as MemTotal - MemAvailable; fall back
    // to MemFree on kernels without MemAvailable (pre-3.14).
    let avail = if mem.available > 0 {
        mem.available
    } else {
        mem.free
    };
    let embed = serenity::CreateEmbed::default()
        .title("iHorizon status")
        .field("Latency", format!("{latency}ms"), true)
        .field("DB", format!("{db_ms}ms"), true)
        .field(
            "Memory",
            crate::funcs::nice_bytes((mem.total - avail.min(mem.total)) as f64),
            true,
        )
        .field("Version", env!("CARGO_PKG_VERSION"), true);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
