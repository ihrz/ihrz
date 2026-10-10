use super::*;

/// Dice roll. Mirrors !dice.ts.
// Slash caps live in the `#[min]`/`#[max]` attributes (and the `to(7)` /
// `to(12)` choices in fun.ts); prefix input is unbounded like the TS
// `for (let i = 0; i < number; i++)` loop, which applies no cap.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "dice",
    aliases("dé")
)]
pub async fn dice(
    ctx: Ctx<'_>,
    #[description = "Number of dice (1-7)"]
    #[min = 1]
    #[max = 7]
    number: Option<i64>,
    #[description = "Faces per die (1-12)"]
    #[min = 1]
    #[max = 12]
    faces: Option<i64>,
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

/// Prefix counts. Mirrors the uncapped TS loop: no upper clamp here
/// (slash-only caps come from the command attributes). Like the TS
/// `|| 1` / `|| 6` fallbacks, a 0 count means "not provided" and falls
/// back to the defaults. Lower bounds only keep the conversion safe:
/// negative counts roll nothing (the TS loop body never runs), faces
/// floor at 1.
pub fn dice_counts(number: Option<i64>, faces: Option<i64>) -> (usize, u32) {
    (
        number.filter(|&n| n != 0).unwrap_or(1).max(0) as usize,
        faces
            .filter(|&f| f != 0)
            .unwrap_or(6)
            .clamp(1, u32::MAX as i64) as u32,
    )
}

#[cfg(test)]
mod dice_tests {
    use super::*;

    #[test]
    fn prefix_counts_uncapped_like_ts() {
        // Slash-only caps live in the attributes; prefix values pass through.
        assert_eq!(dice_counts(Some(99), Some(100)), (99, 100));
        assert_eq!(dice_counts(None, None), (1, 6));
        // Like the TS `||` fallbacks, 0 counts fall back to the defaults.
        assert_eq!(dice_counts(Some(0), Some(0)), (1, 6));
        // Lower bounds only: negatives degrade to no rolls / single-face.
        assert_eq!(dice_counts(Some(-3), Some(-3)), (0, 1));
    }
}
