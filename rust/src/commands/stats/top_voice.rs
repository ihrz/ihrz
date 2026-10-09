use super::*;

/// Top voice. Mirrors stats top-voice (text form; PNG pending).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "top-voice",
    aliases("tv", "topv")
)]
pub async fn stats_top_voice(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    top_by(&ctx, |s| s.voice_ms / 60_000, "m").await
}
