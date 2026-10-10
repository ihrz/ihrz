use super::*;

/// Roll dice!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "dice",
    aliases("dé")
)]
// Mirrors !dice.ts.
// Slash caps mirror the `choices: to(7)` / `to(12)` lists in fun.ts;
// prefix input is unbounded like the TS `for (let i = 0; i < number; i++)`
// loop, which applies no cap. Both paths take free-text params parsed
// manually below so non-numeric prefix input falls back (TS
// `method.number(...) || default`) instead of raising a framework error.
pub async fn dice(
    ctx: Ctx<'_>,
    #[description = "Number of dice to roll"] number: Option<String>,
    #[description = "Number of faces on the dice"] faces: Option<String>,
) -> Result<(), anyhow::Error> {
    // No fun guard: `!dice.ts` (33-70) has no `GUILD.FUN.states` check,
    // so the roll runs even with fun disabled.
    let is_slash = matches!(ctx, poise::Context::Application(_));
    let (number, faces) = dice_counts(number, faces, is_slash);
    // Roll safely from the raw display values: a negative count rolls
    // nothing (the TS loop body never runs) and faces floor at 1 for the
    // draw only — the embed below still shows the raw TS-style values.
    let results = roll_dice_set(number.max(0) as usize, faces.max(1) as u32);
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

/// Display counts. Mirrors the TS embed line `${number} x D${faces}`:
/// raw values after the `|| 1` / `|| 6` fallbacks, with no lower-bound
/// normalization — negatives display as-is (`-2 x D-4`) while rolling
/// nothing with total 0. Only the slash path clamps, mirroring the
/// `to(7)` / `to(12)` choice lists in fun.ts; prefix is uncapped on
/// both sides like the TS loop.
pub fn dice_counts(number: Option<String>, faces: Option<String>, is_slash: bool) -> (i64, i64) {
    let number = parse_count(number, 1);
    let faces = parse_count(faces, 6);
    if is_slash {
        (number.min(7), faces.min(12))
    } else {
        (number, faces)
    }
}

#[cfg(test)]
mod dice_tests {
    use super::*;

    #[test]
    fn prefix_counts_uncapped_like_ts() {
        // Prefix is uncapped on both sides, like the TS loop.
        assert_eq!(
            dice_counts(Some("99".to_string()), Some("100".to_string()), false),
            (99, 100)
        );
        assert_eq!(dice_counts(None, None, false), (1, 6));
        // Like the TS `||` fallbacks, 0 counts fall back to the defaults.
        assert_eq!(
            dice_counts(Some("0".to_string()), Some("0".to_string()), false),
            (1, 6)
        );
        // Non-numeric prefix input falls back instead of erroring.
        assert_eq!(
            dice_counts(Some("abc".to_string()), Some(String::new()), false),
            (1, 6)
        );
        // Raw TS-style display: negatives stay as-is (`-2 x D-4`), the
        // caller rolls nothing from them (empty results, total 0).
        assert_eq!(
            dice_counts(Some("-2".to_string()), Some("-4".to_string()), false),
            (-2, -4)
        );
        let (number, faces) = dice_counts(Some("-2".to_string()), Some("-4".to_string()), false);
        let results = super::super::roll_dice_set(number.max(0) as usize, faces.max(1) as u32);
        assert!(results.is_empty());
        assert_eq!(results.iter().sum::<u32>(), 0);
    }

    #[test]
    fn slash_counts_clamped_to_choices() {
        // Mirrors the `choices: to(7)` / `to(12)` lists in fun.ts.
        assert_eq!(
            dice_counts(Some("99".to_string()), Some("100".to_string()), true),
            (7, 12)
        );
        assert_eq!(
            dice_counts(Some("7".to_string()), Some("12".to_string()), true),
            (7, 12)
        );
        assert_eq!(
            dice_counts(Some("5".to_string()), Some("10".to_string()), true),
            (5, 10)
        );
        assert_eq!(dice_counts(None, None, true), (1, 6));
    }
}
