use super::*;

/// Random number command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "number")]
pub async fn number(
    ctx: Ctx<'_>,
    #[description = "Min"] min: Option<i64>,
    #[description = "Max"] max: Option<i64>,
) -> Result<(), anyhow::Error> {
    ctx.say(roll_range(now_ms_sys(), min.unwrap_or(1), max.unwrap_or(100)).to_string())
        .await?;
    Ok(())
}
