use super::*;

/// Top messages (text ranking; PNG blocked, see mod.rs).
// Mirrors stats top-messages: period + limit options, window counts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "top-messages",
    aliases("tm", "topm")
)]
pub async fn stats_top_messages(
    ctx: Ctx<'_>,
    #[description = "Period: daily, weekly or monthly"] period: Option<String>,
    #[description = "Rows shown (5-25)"] limit: Option<i64>,
) -> Result<(), anyhow::Error> {
    // The 5..=25 clamp is prefix-only (TS clamps just the message-arg
    // leg); the slash option passes through with a default of 10.
    let limit = if matches!(ctx, poise::Context::Prefix(_)) {
        clamp_top_limit(limit)
    } else {
        slash_top_limit(limit)
    };
    top_by(&ctx, "messages", parse_top_period(period.as_deref()), limit).await
}
