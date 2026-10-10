use super::*;

/// Get the bot status!
#[poise::command(slash_command, prefix_command, rename = "status")]
pub async fn lastfm_status(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let saved =
        crate::commands::lastfm::lastfm_username(&ctx.data().pool, ctx.author().id.get()).await;
    ctx.say(match saved {
        Some(u) => format!("Linked as {u} (scrobble pending keys)."),
        None => "Not linked.".to_string(),
    })
    .await?;
    Ok(())
}
