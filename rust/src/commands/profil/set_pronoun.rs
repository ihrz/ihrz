use super::*;

/// Display form. Mirrors `pronoun.replace("-","/")` in `!show.ts:136`:
/// a plain-string (non-regex) replace converts the FIRST hyphen only, so
/// `she-her` shows as `she/her` while a verbatim `she/her` is unchanged.
/// (Also upgrades legacy TS rows stored hyphenated.)
pub fn pronoun_display_value(stored: &str) -> String {
    stored.replacen('-', "/", 1)
}

/// Slash choice values. Mirrors the `!set-pronoun.ts` slash `choices`
/// in `profil.ts` (hyphenated values: `she-her`, …).
pub const VALID_PRONOUNS: &[&str] = &[
    "she-her",
    "he-him",
    "they-them",
    "xe-xem",
    "ze-zem",
    "other",
];

/// Prefix-path separator normalize: users naturally type `she/her`, the
/// slash path arrives hyphenated (`she-her`). Slashes become hyphens so
/// both spellings validate and store the canonical hyphenated form.
pub fn normalize_pronoun(raw: &str) -> String {
    raw.replace('/', "-")
}

/// True when the (already normalized) value is one of the TS slash
/// choice values. Matching stays case-sensitive with no trim, like the
/// gender switch.
pub fn validate_pronoun(normalized: &str) -> bool {
    VALID_PRONOUNS.contains(&normalized)
}

/// Set your pronoun. Mirrors `!set-pronoun.ts`.
///
/// CONSTRAINED (deliberate divergence): TS stores the value verbatim
/// with no validation on either path. Here the input is slash-normalized
/// (`she/her` -> `she-her`) and constrained to the six slash choice
/// values; anything else writes nothing and replies with the
/// invalid-pronoun error.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-pronoun",
    aliases("pronoun", "pronom"),
    category = "profil"
)]
pub async fn profil_pronoun(
    ctx: Ctx<'_>,
    #[description = "Pronoun (she/her, he/him, they/them, xe/xem, ze/zem, other)"] pronoun: String,
) -> Result<(), anyhow::Error> {
    let normalized = normalize_pronoun(&pronoun);
    if !validate_pronoun(&normalized) {
        let msg = crate::commands::lang_for(
            &ctx,
            "msg_profil_pronoun_invalid",
            "Invalid pronoun: choose she/her, he/him, they/them, xe/xem, ze/zem or other.",
        )
        .await;
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.pronoun = Some(normalized);
    super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    let msg = crate::commands::lang_for(
        &ctx,
        "setprofildescriptions_command_work",
        "**Your description has been updated successfully.**",
    )
    .await;
    ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pronoun_displays_slash_form() {
        assert_eq!(pronoun_display_value("she-her"), "she/her");
        assert_eq!(pronoun_display_value("she/her"), "she/her");
        assert_eq!(pronoun_display_value("other"), "other");
    }

    #[test]
    fn pronoun_display_replaces_first_hyphen_only_like_ts() {
        // JS `"a-b-c".replace("-", "/")` (plain string, not regex) converts
        // the first occurrence only.
        assert_eq!(pronoun_display_value("a-b-c"), "a/b-c");
        assert_eq!(pronoun_display_value("-leading"), "/leading");
    }

    #[test]
    fn pronoun_normalize_maps_slash_to_hyphen() {
        assert_eq!(normalize_pronoun("she/her"), "she-her");
        assert_eq!(normalize_pronoun("he/him"), "he-him");
        assert_eq!(normalize_pronoun("she-her"), "she-her");
        assert_eq!(normalize_pronoun("other"), "other");
    }

    #[test]
    fn pronoun_accepts_only_slash_choice_values() {
        for valid in [
            "she-her",
            "he-him",
            "they-them",
            "xe-xem",
            "ze-zem",
            "other",
        ] {
            assert!(validate_pronoun(valid), "{valid}");
        }
        // Normalized slash spellings validate too.
        assert!(validate_pronoun(&normalize_pronoun("she/her")));
        assert!(validate_pronoun(&normalize_pronoun("they/them")));
        // Anything else (including case variants) is rejected.
        assert!(!validate_pronoun("She-Her"));
        assert!(!validate_pronoun("it"));
        assert!(!validate_pronoun(""));
        assert!(!validate_pronoun("she/her"));
    }
}
