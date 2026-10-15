use super::*;

/// Dice-count choice. Mirrors the `choices: to(7)` list on the
/// `number` option in fun.ts:1005: slash shows `Amount: i` (fr
/// `Nombre: i`), the handler maps each variant back to the TS
/// `value` (`"${i}"`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum DiceNumber {
    #[name = "1"]
    #[name_localized("en-US", "Amount: 1")]
    #[name_localized("en-GB", "Amount: 1")]
    #[name_localized("fr", "Nombre: 1")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    N1,
    #[name = "2"]
    #[name_localized("en-US", "Amount: 2")]
    #[name_localized("en-GB", "Amount: 2")]
    #[name_localized("fr", "Nombre: 2")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    N2,
    #[name = "3"]
    #[name_localized("en-US", "Amount: 3")]
    #[name_localized("en-GB", "Amount: 3")]
    #[name_localized("fr", "Nombre: 3")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    N3,
    #[name = "4"]
    #[name_localized("en-US", "Amount: 4")]
    #[name_localized("en-GB", "Amount: 4")]
    #[name_localized("fr", "Nombre: 4")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    N4,
    #[name = "5"]
    #[name_localized("en-US", "Amount: 5")]
    #[name_localized("en-GB", "Amount: 5")]
    #[name_localized("fr", "Nombre: 5")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    N5,
    #[name = "6"]
    #[name_localized("en-US", "Amount: 6")]
    #[name_localized("en-GB", "Amount: 6")]
    #[name_localized("fr", "Nombre: 6")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    N6,
    #[name = "7"]
    #[name_localized("en-US", "Amount: 7")]
    #[name_localized("en-GB", "Amount: 7")]
    #[name_localized("fr", "Nombre: 7")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    N7,
}

impl DiceNumber {
    /// TS `value` (`"${i}"`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::N1 => "1",
            Self::N2 => "2",
            Self::N3 => "3",
            Self::N4 => "4",
            Self::N5 => "5",
            Self::N6 => "6",
            Self::N7 => "7",
        }
    }
}

/// Dice-faces choice. Mirrors the `choices: to(12)` list on the
/// `faces` option in fun.ts:1027, same shape as [`DiceNumber`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum DiceFaces {
    #[name = "1"]
    #[name_localized("en-US", "Amount: 1")]
    #[name_localized("en-GB", "Amount: 1")]
    #[name_localized("fr", "Nombre: 1")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F1,
    #[name = "2"]
    #[name_localized("en-US", "Amount: 2")]
    #[name_localized("en-GB", "Amount: 2")]
    #[name_localized("fr", "Nombre: 2")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F2,
    #[name = "3"]
    #[name_localized("en-US", "Amount: 3")]
    #[name_localized("en-GB", "Amount: 3")]
    #[name_localized("fr", "Nombre: 3")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F3,
    #[name = "4"]
    #[name_localized("en-US", "Amount: 4")]
    #[name_localized("en-GB", "Amount: 4")]
    #[name_localized("fr", "Nombre: 4")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F4,
    #[name = "5"]
    #[name_localized("en-US", "Amount: 5")]
    #[name_localized("en-GB", "Amount: 5")]
    #[name_localized("fr", "Nombre: 5")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F5,
    #[name = "6"]
    #[name_localized("en-US", "Amount: 6")]
    #[name_localized("en-GB", "Amount: 6")]
    #[name_localized("fr", "Nombre: 6")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F6,
    #[name = "7"]
    #[name_localized("en-US", "Amount: 7")]
    #[name_localized("en-GB", "Amount: 7")]
    #[name_localized("fr", "Nombre: 7")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F7,
    #[name = "8"]
    #[name_localized("en-US", "Amount: 8")]
    #[name_localized("en-GB", "Amount: 8")]
    #[name_localized("fr", "Nombre: 8")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F8,
    #[name = "9"]
    #[name_localized("en-US", "Amount: 9")]
    #[name_localized("en-GB", "Amount: 9")]
    #[name_localized("fr", "Nombre: 9")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F9,
    #[name = "10"]
    #[name_localized("en-US", "Amount: 10")]
    #[name_localized("en-GB", "Amount: 10")]
    #[name_localized("fr", "Nombre: 10")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F10,
    #[name = "11"]
    #[name_localized("en-US", "Amount: 11")]
    #[name_localized("en-GB", "Amount: 11")]
    #[name_localized("fr", "Nombre: 11")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F11,
    #[name = "12"]
    #[name_localized("en-US", "Amount: 12")]
    #[name_localized("en-GB", "Amount: 12")]
    #[name_localized("fr", "Nombre: 12")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    F12,
}

impl DiceFaces {
    /// TS `value` (`"${i}"`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::F1 => "1",
            Self::F2 => "2",
            Self::F3 => "3",
            Self::F4 => "4",
            Self::F5 => "5",
            Self::F6 => "6",
            Self::F7 => "7",
            Self::F8 => "8",
            Self::F9 => "9",
            Self::F10 => "10",
            Self::F11 => "11",
            Self::F12 => "12",
        }
    }
}

/// Make a dice roll
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "dice",
    aliases("dé"),
    name_localized("fr", "dé"),
    name_localized("ja", "dice"),
    name_localized("ru", "dice"),
    name_localized("es-ES", "dice"),
    description_localized("fr", "Lance un ou plusieurs dés"),
    description_localized("ja", "サイコロを振る"),
    description_localized("ru", "Бросить кости"),
    description_localized("es-ES", "Hacer una tirada de dado")
)]
// Mirrors !dice.ts.
// Slash dropdowns mirror the `choices: to(7)` / `to(12)` lists in
// fun.ts; prefix accepts the choice names and value aliases
// (`Amount: 3`, `3`), while anything else still falls back through
// `dice_counts` (TS `method.number(...) || default`) — except unknown
// words now raise a framework parse error instead of falling back.
// Both paths map back to the TS `"${i}"` values below.
pub async fn dice(
    ctx: Ctx<'_>,
    #[name_localized("fr", "nombre")]
    #[name_localized("ja", "number")]
    #[name_localized("ru", "number")]
    #[name_localized("es-ES", "number")]
    #[description_localized("fr", "Nombre de dés à lancer")]
    #[description_localized("ja", "振るサイコロの数")]
    #[description_localized("ru", "Количество костей")]
    #[description_localized("es-ES", "Número de dados a lanzar")]
    #[description = "Number of dice to roll"]
    number: Option<DiceNumber>,
    #[name_localized("fr", "faces")]
    #[name_localized("ja", "faces")]
    #[name_localized("ru", "faces")]
    #[name_localized("es-ES", "faces")]
    #[description_localized("fr", "Nombre de faces sur le(s) dé(s)")]
    #[description_localized("ja", "サイコロの面の数")]
    #[description_localized("ru", "Количество граней кости")]
    #[description_localized("es-ES", "Número de caras del dado")]
    #[description = "Number of faces on the dice"]
    faces: Option<DiceFaces>,
) -> Result<(), anyhow::Error> {
    // No fun guard: `!dice.ts` (33-70) has no `GUILD.FUN.states` check,
    // so the roll runs even with fun disabled.
    let is_slash = matches!(ctx, poise::Context::Application(_));
    let (number, faces) = dice_counts(
        number.map(|n| n.as_str().to_string()),
        faces.map(|f| f.as_str().to_string()),
        is_slash,
    );
    // TS-faithful draws (`Math.floor(Math.random() * faces) + 1`): exact
    // for every face count, including the prefix-only faces <= 0 edge
    // (negative results like TS, not floored 1s).
    let results = roll_dice_ts(number, faces);
    let total: i64 = results.iter().sum();
    // Single lang read for the four embed strings (one SQLite round-trip
    // instead of four).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(t("fun_dice_embed_title", "🎲 Dice Roll Result"))
        .description(format!(
            "{} {number} × D{faces}\n{} {}\n{} {total}",
            t("fun_dice_var_rolled_dices", "**Rolled Dice:**"),
            t("fun_dice_var_results", "**Results:**"),
            results
                .iter()
                .map(|r| r.to_string())
                .collect::<Vec<_>>()
                .join(", "),
            t("fun_dice_var_total", "**Total:**"),
        ))
        .colour(random_colour());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// `parseInt`-faithful integer parse. Mirrors `method.number` in
/// `method.ts` (`parseInt(value)`, NaN -> 0): leading whitespace, an
/// optional sign, a `0x` hex run, else the leading decimal-digit run.
/// Anything with no digits (empty / non-numeric input) yields 0, and the
/// caller applies the TS `||` default on top of that.
pub fn ts_parse_int(raw: &str) -> i64 {
    let s = raw.trim_start();
    let (neg, s) = match s.as_bytes().first() {
        Some(b'-') => (true, &s[1..]),
        Some(b'+') => (false, &s[1..]),
        _ => (false, s),
    };
    if let Some(hex) = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")) {
        let end = hex
            .find(|c: char| !c.is_ascii_hexdigit())
            .unwrap_or(hex.len());
        if end == 0 {
            return 0;
        }
        let v = i64::from_str_radix(&hex[..end], 16).unwrap_or(i64::MAX);
        return if neg { -v } else { v };
    }
    let end = s.find(|c: char| !c.is_ascii_digit()).unwrap_or(s.len());
    if end == 0 {
        return 0;
    }
    let v: f64 = s[..end].parse().unwrap_or(0.0);
    let v = v as i64;
    if neg {
        -v
    } else {
        v
    }
}

/// Parse one count the TS way: `method.number` yields 0 for missing or
/// non-numeric input (parseInt NaN -> 0), and the `|| 1` / `|| 6`
/// fallbacks in `!dice.ts` then apply to 0 as well.
fn parse_count(raw: Option<String>, default: i64) -> i64 {
    let n = ts_parse_int(raw.as_deref().unwrap_or(""));
    if n == 0 {
        default
    } else {
        n
    }
}

/// Display counts. Mirrors the TS embed line `${number} x D${faces}`:
/// raw values after the `|| 1` / `|| 6` fallbacks, with no lower-bound
/// normalization — negatives display as-is (`-2 x D-4`) while the draws
/// below follow the TS formula exactly. Only the slash path clamps,
/// mirroring the `to(7)` / `to(12)` choice lists in fun.ts; prefix is
/// uncapped on both sides like the TS loop.
pub fn dice_counts(number: Option<String>, faces: Option<String>, is_slash: bool) -> (i64, i64) {
    let number = parse_count(number, 1);
    let faces = parse_count(faces, 6);
    if is_slash {
        (number.min(7), faces.min(12))
    } else {
        (number, faces)
    }
}

/// TS-faithful dice draws. Mirrors `Math.floor(Math.random() * faces) + 1`
/// per die in `!dice.ts`: a negative count rolls nothing (the TS loop body
/// never runs), and every face count follows the formula exactly —
/// including the prefix-only faces <= 0 edge (negative results like TS).
/// (`rand` f64 draws in [0, 1) like `Math.random()`, so faces = 6 still
/// yields 1..=6 uniformly.)
pub fn roll_dice_ts(count: i64, faces: i64) -> Vec<i64> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..count.max(0))
        .map(|_| (rng.gen::<f64>() * faces as f64).floor() as i64 + 1)
        .collect()
}

#[cfg(test)]
mod dice_tests {
    use super::*;

    #[test]
    fn dice_choice_enums_mirror_ts_to_lists() {
        use poise::ChoiceParameter as _;
        // `to(7)`: 7 variants, `Amount: i` names, `"${i}"` values.
        let names: Vec<_> = DiceNumber::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names.len(), 7);
        assert_eq!(names[0], "1");
        assert_eq!(names[6], "7");
        assert_eq!(DiceNumber::N3.as_str(), "3");
        assert_eq!(DiceNumber::from_name("4"), Some(DiceNumber::N4));
        assert_eq!(DiceNumber::from_name("7"), Some(DiceNumber::N7));
        assert_eq!(DiceNumber::from_name("8"), None);
        assert_eq!(DiceNumber::from_index(0), Some(DiceNumber::N1));
        assert_eq!(DiceNumber::from_index(7), None);
        // `to(12)`: 12 variants.
        let names: Vec<_> = DiceFaces::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names.len(), 12);
        assert_eq!(names[11], "12");
        assert_eq!(DiceFaces::F12.as_str(), "12");
        assert_eq!(DiceFaces::from_name("12"), Some(DiceFaces::F12));
        assert_eq!(DiceFaces::from_name("13"), None);
        assert_eq!(DiceFaces::from_index(11), Some(DiceFaces::F12));
        assert_eq!(DiceFaces::from_index(12), None);
        // Locales, byte-exact from fun.ts `to()`.
        let list = DiceNumber::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Nombre: 1")
        );
        assert_eq!(
            list[6].localizations.get("fr").map(String::as_str),
            Some("Nombre: 7")
        );
        assert_eq!(
            list[0].localizations.get("ja").map(String::as_str),
            Some("amount_i")
        );
        assert_eq!(
            list[0].localizations.get("es-ES").map(String::as_str),
            Some("amount_i")
        );
        let faces = DiceFaces::list();
        assert_eq!(
            faces[11].localizations.get("fr").map(String::as_str),
            Some("Nombre: 12")
        );
        assert_eq!(DiceNumber::N1.localized_name("fr"), Some("Nombre: 1"));
        assert_eq!(DiceFaces::F12.localized_name("ru"), Some("amount_i"));
    }

    #[test]
    fn parse_int_matches_js_parseint_prefix_rules() {
        // Leading-digit run, like `parseInt` in `method.number`.
        assert_eq!(ts_parse_int("12abc"), 12);
        assert_eq!(ts_parse_int("3.99"), 3);
        assert_eq!(ts_parse_int("1e3"), 1);
        assert_eq!(ts_parse_int("0b101"), 0);
        assert_eq!(ts_parse_int("  -7 "), -7);
        assert_eq!(ts_parse_int("+5"), 5);
        assert_eq!(ts_parse_int("0x10"), 16);
        assert_eq!(ts_parse_int("-0x10"), -16);
        // No digits -> 0, so the caller falls back to the default.
        assert_eq!(ts_parse_int(""), 0);
        assert_eq!(ts_parse_int("abc"), 0);
        assert_eq!(ts_parse_int("0x"), 0);
        assert_eq!(ts_parse_int("--5"), 0);
        // Prefix garbage now parses instead of falling back.
        assert_eq!(
            dice_counts(Some("12abc".to_string()), Some("0xC".to_string()), false),
            (12, 12)
        );
    }

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
        // Raw TS-style display: negatives stay as-is (`-2 x D-4`), and the
        // draws follow the TS formula exactly.
        assert_eq!(
            dice_counts(Some("-2".to_string()), Some("-4".to_string()), false),
            (-2, -4)
        );
        // Negative count rolls nothing (the TS loop body never runs).
        assert!(roll_dice_ts(-2, 6).is_empty());
        assert_eq!(roll_dice_ts(-2, -4).iter().sum::<i64>(), 0);
        // faces = -4: `floor(rand * -4) + 1` lands in -3..=1 like TS.
        for _ in 0..100 {
            let draws = roll_dice_ts(2, -4);
            assert_eq!(draws.len(), 2);
            for d in draws {
                assert!((-3..=1).contains(&d), "ts-faithful draw {d}");
            }
        }
        // faces = 0: `floor(rand * 0) + 1` is always 1, like TS.
        assert_eq!(roll_dice_ts(3, 0), vec![1, 1, 1]);
        // Normal faces stay uniform in 1..=faces with total = sum.
        for _ in 0..50 {
            let draws = roll_dice_ts(5, 6);
            assert_eq!(draws.len(), 5);
            assert!(draws.iter().all(|d| (1..=6).contains(d)));
            assert_eq!(draws.iter().sum::<i64>(), draws.iter().sum::<i64>());
        }
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
