use super::*;

/// Shard info. Mirrors shardinfo.ts (cache-visible part).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "shardinfo"
)]
pub async fn shardinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let guilds = ctx.cache().guild_count();
    ctx.say(format!("Guilds in cache: {guilds}.")).await?;
    Ok(())
}
