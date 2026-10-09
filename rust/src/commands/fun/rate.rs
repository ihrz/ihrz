use super::*;

/// Rate something X/10. Mirrors fun !rate.ts (alias note).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "rate",
    aliases("note")
)]
pub async fn rate(
    ctx: Ctx<'_>,
    #[description = "Thing to rate"] the_things: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    use rand::Rng;
    let random: u32 = rand::thread_rng().gen_range(0..10);
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "fun_rate_command_ok",
            "I rate **${the_things}** ${random}/10.",
        )
        .await
        .replace("${the_things}", &the_things)
        .replace("${random}", &random.to_string()),
    )
    .await?;
    Ok(())
}
