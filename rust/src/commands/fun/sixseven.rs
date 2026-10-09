use super::*;

/// 67 meme. Mirrors fun !67.ts (fixed GIF URL).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "67")]
pub async fn sixseven(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    ctx.say("https://www.ihorizon.org/assets/img/fun/67_command.gif")
        .await?;
    Ok(())
}
