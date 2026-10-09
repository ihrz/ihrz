use super::*;

/// Show all links about iHorizon. Mirrors link.ts.
#[poise::command(slash_command, prefix_command, category = "bot", aliases("link"))]
pub async fn links(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Website: https://ihorizon.org | GitLab: https://gitlab.com/ihrz/ihrz")
        .await?;
    Ok(())
}
