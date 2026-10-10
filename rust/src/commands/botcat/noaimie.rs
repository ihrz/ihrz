use super::*;

/// Noaimie picture link. Mirrors !noaimie.ts (fixed asset URL).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "noaimie",
    aliases("noemie", "noémie")
)]
pub async fn noaimie(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Guard's Typing: !noaimie.ts returns silently outside guild
    // context (member/guild/channel checks).
    if ctx.guild_id().is_none() {
        return Ok(());
    }
    ctx.say("https://www.ihorizon.org/assets/img/noaimie.jpg")
        .await?;
    Ok(())
}
