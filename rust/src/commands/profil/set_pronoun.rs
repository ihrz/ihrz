use super::*;

/// Pronoun choice. Mirrors the `pronoun` option `choices` in
/// profil.ts:271-330: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`. Hyphenated values
/// double as prefix aliases (the display form uses slashes).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum ProfilPronoun {
    #[name = "she/her"]
    #[name_localized("fr", "elle/elle")]
    #[name_localized("ja", "she_her")]
    #[name_localized("ru", "she_her")]
    #[name_localized("es-ES", "she_her")]
    #[name = "she-her"]
    SheHer,
    #[name = "he/him"]
    #[name_localized("fr", "il/il")]
    #[name_localized("ja", "he_him")]
    #[name_localized("ru", "he_him")]
    #[name_localized("es-ES", "he_him")]
    #[name = "he-him"]
    HeHim,
    #[name = "they/them"]
    #[name_localized("fr", "ils/ils")]
    #[name_localized("ja", "they_them")]
    #[name_localized("ru", "they_them")]
    #[name_localized("es-ES", "they_them")]
    #[name = "they-them"]
    TheyThem,
    #[name = "xe/xem"]
    #[name_localized("fr", "xe/xe")]
    #[name_localized("ja", "xe_xem")]
    #[name_localized("ru", "xe_xem")]
    #[name_localized("es-ES", "xe_xem")]
    #[name = "xe-xem"]
    XeXem,
    #[name = "ze/zem"]
    #[name_localized("fr", "ze/ze")]
    #[name_localized("ja", "ze_zem")]
    #[name_localized("ru", "ze_zem")]
    #[name_localized("es-ES", "ze_zem")]
    #[name = "ze-zem"]
    ZeZem,
    #[name = "other (say my name)"]
    #[name_localized("fr", "autre (dire mon nom)")]
    #[name_localized("ja", "other_say_my_name")]
    #[name_localized("ru", "other_say_my_name")]
    #[name_localized("es-ES", "other_say_my_name")]
    #[name = "other"]
    Other,
}

impl ProfilPronoun {
    /// TS `value` (canonical hyphenated form).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::SheHer => "she-her",
            Self::HeHim => "he-him",
            Self::TheyThem => "they-them",
            Self::XeXem => "xe-xem",
            Self::ZeZem => "ze-zem",
            Self::Other => "other",
        }
    }
}

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
    category = "profil",
    name_localized("fr", "définir-pronom"),
    name_localized("ja", "set-pronoun"),
    name_localized("ru", "set-pronoun"),
    name_localized("es-ES", "set-pronoun"),
    description_localized("fr", "Définissez votre pronom sur le profil iHorizon"),
    description_localized("ja", "iHorizonプロフィールに代名詞を設定！"),
    description_localized("ru", "Установить местоимение в профиле iHorizon!"),
    description_localized("es-ES", "Establecer tu pronombre en el perfil de iHorizon!")
)]
pub async fn profil_pronoun(
    ctx: Ctx<'_>,
    #[description = "Pronoun (she/her, he/him, they/them, xe/xem, ze/zem, other)"]
    #[description_localized("fr", "Le pronom qui vous correspond le plus")]
    #[description_localized("ja", "最も合う代名詞")]
    #[description_localized("ru", "Местоимение, которое вам подходит")]
    #[description_localized("es-ES", "Pronombre que más te queda")]
    pronoun: ProfilPronoun,
) -> Result<(), anyhow::Error> {
    let normalized = normalize_pronoun(pronoun.as_str());
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
    fn pronoun_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = ProfilPronoun::list().into_iter().map(|c| c.name).collect();
        assert_eq!(
            names,
            vec![
                "she/her",
                "he/him",
                "they/them",
                "xe/xem",
                "ze/zem",
                "other (say my name)"
            ]
        );
        assert_eq!(ProfilPronoun::SheHer.as_str(), "she-her");
        assert_eq!(ProfilPronoun::Other.as_str(), "other");
        assert_eq!(
            ProfilPronoun::from_name("she/her"),
            Some(ProfilPronoun::SheHer)
        );
        assert_eq!(
            ProfilPronoun::from_name("she-her"),
            Some(ProfilPronoun::SheHer)
        );
        assert_eq!(
            ProfilPronoun::from_name("THEY/THEM"),
            Some(ProfilPronoun::TheyThem)
        );
        assert_eq!(
            ProfilPronoun::from_name("other"),
            Some(ProfilPronoun::Other)
        );
        assert_eq!(ProfilPronoun::from_name("it"), None);
        assert_eq!(ProfilPronoun::from_index(0), Some(ProfilPronoun::SheHer));
        assert_eq!(ProfilPronoun::from_index(5), Some(ProfilPronoun::Other));
        assert_eq!(ProfilPronoun::from_index(6), None);
        let list = ProfilPronoun::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("elle/elle")
        );
        assert_eq!(
            list[5].localizations.get("fr").map(String::as_str),
            Some("autre (dire mon nom)")
        );
        assert_eq!(
            list[2].localizations.get("ja").map(String::as_str),
            Some("they_them")
        );
        assert_eq!(ProfilPronoun::XeXem.localized_name("fr"), Some("xe/xe"));
    }

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
