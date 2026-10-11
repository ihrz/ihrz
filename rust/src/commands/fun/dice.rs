use super::*;

/// Dice-count choice. Mirrors the `choices: to(7)` list on the
/// `number` option in fun.ts:1005: slash shows `Amount: i` (fr
/// `Nombre: i`), the handler maps each variant back to the TS
/// `value` (`"${i}"`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum DiceNumber {
    #[name = "Amount: 1"]
    #[name_localized("fr", "Nombre: 1")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "1"]
    N1,
    #[name = "Amount: 2"]
    #[name_localized("fr", "Nombre: 2")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "2"]
    N2,
    #[name = "Amount: 3"]
    #[name_localized("fr", "Nombre: 3")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "3"]
    N3,
    #[name = "Amount: 4"]
    #[name_localized("fr", "Nombre: 4")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "4"]
    N4,
    #[name = "Amount: 5"]
    #[name_localized("fr", "Nombre: 5")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "5"]
    N5,
    #[name = "Amount: 6"]
    #[name_localized("fr", "Nombre: 6")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "6"]
    N6,
    #[name = "Amount: 7"]
    #[name_localized("fr", "Nombre: 7")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "7"]
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
    #[name = "Amount: 1"]
    #[name_localized("fr", "Nombre: 1")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "1"]
    F1,
    #[name = "Amount: 2"]
    #[name_localized("fr", "Nombre: 2")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "2"]
    F2,
    #[name = "Amount: 3"]
    #[name_localized("fr", "Nombre: 3")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "3"]
    F3,
    #[name = "Amount: 4"]
    #[name_localized("fr", "Nombre: 4")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "4"]
    F4,
    #[name = "Amount: 5"]
    #[name_localized("fr", "Nombre: 5")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "5"]
    F5,
    #[name = "Amount: 6"]
    #[name_localized("fr", "Nombre: 6")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "6"]
    F6,
    #[name = "Amount: 7"]
    #[name_localized("fr", "Nombre: 7")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "7"]
    F7,
    #[name = "Amount: 8"]
    #[name_localized("fr", "Nombre: 8")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "8"]
    F8,
    #[name = "Amount: 9"]
    #[name_localized("fr", "Nombre: 9")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "9"]
    F9,
    #[name = "Amount: 10"]
    #[name_localized("fr", "Nombre: 10")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "10"]
    F10,
    #[name = "Amount: 11"]
    #[name_localized("fr", "Nombre: 11")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "11"]
    F11,
    #[name = "Amount: 12"]
    #[name_localized("fr", "Nombre: 12")]
    #[name_localized("ja", "amount_i")]
    #[name_localized("ru", "amount_i")]
    #[name_localized("es-ES", "amount_i")]
    #[name = "12"]
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

/// Roll dice!
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
    fn dice_choice_enums_mirror_ts_to_lists() {
        use poise::ChoiceParameter as _;
        // `to(7)`: 7 variants, `Amount: i` names, `"${i}"` values.
        let names: Vec<_> = DiceNumber::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names.len(), 7);
        assert_eq!(names[0], "Amount: 1");
        assert_eq!(names[6], "Amount: 7");
        assert_eq!(DiceNumber::N3.as_str(), "3");
        assert_eq!(DiceNumber::from_name("Amount: 4"), Some(DiceNumber::N4));
        assert_eq!(DiceNumber::from_name("7"), Some(DiceNumber::N7));
        assert_eq!(DiceNumber::from_name("8"), None);
        assert_eq!(DiceNumber::from_index(0), Some(DiceNumber::N1));
        assert_eq!(DiceNumber::from_index(7), None);
        // `to(12)`: 12 variants.
        let names: Vec<_> = DiceFaces::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names.len(), 12);
        assert_eq!(names[11], "Amount: 12");
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
