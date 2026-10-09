use super::*;

/// 8-ball command.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "question",
    aliases("8ball")
)]
pub async fn question(
    ctx: Ctx<'_>,
    #[description = "Your question"] _q: String,
) -> Result<(), anyhow::Error> {
    ctx.say(eightball(now_ms_sys())).await?;
    Ok(())
}
