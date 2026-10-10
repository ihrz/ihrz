use super::*;

/// Parse one bound the TS way. `method.number` in `method.ts` is
/// `parseInt`-based with NaN -> 0, and `!number.ts` applies an `||`
/// fallback on top (`min || 0`, `max || 100`), so missing, non-numeric,
/// or explicit-0 input all resolve to the default. Both slash and prefix
/// paths go through this manual parse so a non-numeric prefix arg falls
/// back instead of raising a framework error (typed `Option<i64>` params
/// reject it before the handler runs, where TS yields NaN -> default).
fn parse_bound(raw: Option<String>, default: i64) -> i64 {
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

/// Random number command. Mirrors fun !number.ts.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "number")]
pub async fn number(
    ctx: Ctx<'_>,
    #[description = "Min"] min: Option<String>,
    #[description = "Max"] max: Option<String>,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!number.ts`: no fun_guard here.
    // TS defaults are `||`-based on both paths (slash `getNumber(...)`
    // and prefix `number(args, ...)`), so an explicit 0 also falls back:
    // min `|| 0`, max `|| 100`. One `rand` draw per call; swap when
    // min > max, like the TS `[min, max] = [max, min]` guard.
    let min = parse_bound(min, 0);
    let max = parse_bound(max, 100);
    let random = roll_range(min, max);
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

#[cfg(test)]
mod number_tests {
    use super::parse_bound;

    #[test]
    fn bounds_fall_back_like_ts_or_fallbacks() {
        // Missing / non-numeric / explicit 0 all resolve to the default.
        assert_eq!(parse_bound(None, 100), 100);
        assert_eq!(parse_bound(Some("abc".to_string()), 100), 100);
        assert_eq!(parse_bound(Some("0".to_string()), 100), 100);
        assert_eq!(parse_bound(Some(String::new()), 0), 0);
        // Plain values pass through; floats truncate like parseInt.
        assert_eq!(parse_bound(Some("42".to_string()), 100), 42);
        assert_eq!(parse_bound(Some("-7".to_string()), 0), -7);
        assert_eq!(parse_bound(Some("12.9".to_string()), 100), 12);
    }
}
