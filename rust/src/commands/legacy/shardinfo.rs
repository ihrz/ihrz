use super::*;

/// Shard info. Mirrors shardinfo.ts (cache-visible part).
///
/// TS gates the whole run on `isBotOwner` (merged config + persisted
/// owners) and stays silent otherwise — mirrored here before the
/// cache read.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "shardinfo"
)]
pub async fn shardinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let owners = crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
    if !owners
        .iter()
        .any(|o| o == &ctx.author().id.get().to_string())
    {
        return Ok(());
    }
    let guilds = ctx.cache().guild_count();
    ctx.say(format!("Guilds in cache: {guilds}.")).await?;
    Ok(())
}
