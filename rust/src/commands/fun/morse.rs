use super::*;

/// Morse command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "morse")]
pub async fn morse(
    ctx: Ctx<'_>,
    #[description = "Text"] text: String,
) -> Result<(), anyhow::Error> {
    ctx.say(morse_encode(&text)).await?;
    Ok(())
}
