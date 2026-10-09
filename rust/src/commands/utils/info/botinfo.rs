use super::*;

/// Bot info. Mirrors the TS botinfo/about command shape.
#[poise::command(slash_command, prefix_command, category = "utils")]
pub async fn botinfo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "iHorizon Rust v{} (serenity + poise)",
        env!("CARGO_PKG_VERSION")
    ))
    .await?;
    Ok(())
}
