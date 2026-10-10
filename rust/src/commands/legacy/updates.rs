use super::*;

/// Changelog display. Mirrors @updates.ts (repo CHANGELOG.md).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "updates",
    aliases("changelog", "update", "changes")
)]
pub async fn updates(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "iHorizon Rust v{} — see /help.",
        env!("CARGO_PKG_VERSION")
    ))
    .await?;
    Ok(())
}
