use super::*;

#[poise::command(slash_command, prefix_command, rename = "compare", aliases("cmp"))]
pub async fn stats_compare(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: poise::serenity_prelude::User,
    #[description = "Second user"] user2: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if user1.id == user2.id {
        ctx.say("Compare two different users.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let a = load_stats(&ctx.data().pool, &gid, user1.id.get()).await;
    let b = load_stats(&ctx.data().pool, &gid, user2.id.get()).await;
    let winner = if a.messages + a.voice_ms >= b.messages + b.voice_ms {
        &user1
    } else {
        &user2
    };
    ctx.say(format!(
        "{}: {}msg/{}m vs {}: {}msg/{}m — winner {}",
        user1.tag(),
        a.messages,
        a.voice_ms / 60_000,
        user2.tag(),
        b.messages,
        b.voice_ms / 60_000,
        winner.tag()
    ))
    .await?;
    Ok(())
}
