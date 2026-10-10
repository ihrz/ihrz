use super::*;

/// Dice roll. Mirrors !dice.ts.
// Slash caps live in the `choices: to(7)` / `to(12)` lists in fun.ts;
// prefix input is unbounded like the TS `for (let i = 0; i < number; i++)`
// loop, which applies no cap. Both paths take free-text params parsed
// manually below so non-numeric prefix input falls back (TS
// `method.number(...) || default`) instead of raising a framework error.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "dice",
    aliases("dé")
)]
pub async fn dice(
    ctx: Ctx<'_>,
    #[description = "Number of dice to roll"] number: Option<String>,
    #[description = "Number of faces on the dice"] faces: Option<String>,
) -> Result<(), anyhow::Error> {
    // No fun guard: `!dice.ts` (33-70) has no `GUILD.FUN.states` check,
    // so the roll runs even with fun disabled.
    let (number, faces) = dice_counts(number, faces);
    let results = roll_dice_set(number, faces);
    let total: u32 = results.iter().sum();
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(crate::commands::lang_for(&ctx, "fun_dice_embed_title", "🎲 Dice Roll Result").await)
        .description(format!(
            "{} {number} × D{faces}\n{} {}\n{} {total}",
            crate::commands::lang_for(&ctx, "fun_dice_var_rolled_dices", "**Rolled Dice:**").await,
            crate::commands::lang_for(&ctx, "fun_dice_var_results", "**Results:**").await,
            results
                .iter()
                .map(|r| r.to_string())
                .collect::<Vec<_>>()
                .join(", "),
            crate::commands::lang_for(&ctx, "fun_dice_var_total", "**Total:**").await,
        ))
        .colour(random_colour());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Parse one count the TS way: `method.number` yields 0 for missing or
/// non-numeric input (parseInt NaN -> 0), and the `|| 1` / `|| 6`
/// fallbacks in `!dice.ts` then apply to 0 as well.
fn parse_count(raw: Option<String>, default: i64) -> i64 {
    let n = raw
        .as_deref()
        .unwrap_or("")
        .trim()
        .parse::<f64>()
        .map(|f| f as i64)
        .unwrap_or(0);
    if n == 0 {
        default
    } else {
        n
    }
}

/// Prefix counts. Mirrors the uncapped TS loop: no upper clamp here
/// (slash-only caps come from the `to(7)` / `to(12)` choice lists in
/// fun.ts). Like the TS `|| 1` / `|| 6` fallbacks, a 0 count means "not
/// provided" and falls back to the defaults. Lower bounds only keep the
/// conversion safe: negative counts roll nothing (the TS loop body never
/// runs), faces floor at 1.
pub fn dice_counts(number: Option<String>, faces: Option<String>) -> (usize, u32) {
    (
        parse_count(number, 1).max(0) as usize,
        parse_count(faces, 6).clamp(1, u32::MAX as i64) as u32,
    )
}

#[cfg(test)]
mod dice_tests {
    use super::*;

    #[test]
    fn prefix_counts_uncapped_like_ts() {
        // Slash-only caps live in the fun.ts choice lists; values pass through.
        assert_eq!(
            dice_counts(Some("99".to_string()), Some("100".to_string())),
            (99, 100)
        );
        assert_eq!(dice_counts(None, None), (1, 6));
        // Like the TS `||` fallbacks, 0 counts fall back to the defaults.
        assert_eq!(
            dice_counts(Some("0".to_string()), Some("0".to_string())),
            (1, 6)
        );
        // Non-numeric prefix input falls back instead of erroring.
        assert_eq!(
            dice_counts(Some("abc".to_string()), Some(String::new())),
            (1, 6)
        );
        // Lower bounds only: negatives degrade to no rolls / single-face.
        assert_eq!(
            dice_counts(Some("-3".to_string()), Some("-3".to_string())),
            (0, 1)
        );
    }
}
