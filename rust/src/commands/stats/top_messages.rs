use super::*;

/// Top messages. Mirrors stats top-messages (text form; PNG pending).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "top-messages",
    aliases("tm", "topm")
)]
pub async fn stats_top_messages(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    top_by(&ctx, |s| s.messages, "msg").await
}
