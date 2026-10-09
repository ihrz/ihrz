use super::*;

/// Random number command. Mirrors fun !number.ts.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "number")]
pub async fn number(
    ctx: Ctx<'_>,
    #[description = "Min"] min: Option<i64>,
    #[description = "Max"] max: Option<i64>,
) -> Result<(), anyhow::Error> {
    // TS defaults (0/100); roll_range swaps when min > max, like the
    // TS `[min, max] = [max, min]` guard.
    let (min, max) = (min.unwrap_or(0), max.unwrap_or(100));
    let random = roll_range(now_ms_sys(), min, max);
    let (lo, hi) = if min <= max { (min, max) } else { (max, min) };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(f("fun_random_embed_title", "🔢 Random Number"))
        .description(format!(
            "{} **{random}**\n({} {lo} ↔ {hi})",
            f("fun_random_result_text", "The generated number is:"),
            f("fun_random_between", "between"),
        ))
        .colour(random_colour());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
