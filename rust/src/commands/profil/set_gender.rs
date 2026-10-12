use super::*;

/// Gender choice. Mirrors the `gender` option `choices` in
/// profil.ts:198-227: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum ProfilGender {
    #[name = "♀ Female"]
    #[name_localized("fr", "♀ Féminin")]
    #[name_localized("ja", "female")]
    #[name_localized("ru", "female")]
    #[name_localized("es-ES", "female")]
    #[name = "female"]
    Female,
    #[name = "♂ Male"]
    #[name_localized("fr", "♂ Masculin")]
    #[name_localized("ja", "male")]
    #[name_localized("ru", "male")]
    #[name_localized("es-ES", "male")]
    #[name = "male"]
    Male,
    #[name = "⚧ Non-binary"]
    #[name_localized("fr", "⚧ Non-binaire")]
    #[name_localized("ja", "non-binary")]
    #[name_localized("ru", "non-binary")]
    #[name_localized("es-ES", "non-binary")]
    #[name = "non-binary"]
    NonBinary,
}

impl ProfilGender {
    /// TS `value` validated by `validate_gender` and stored via
    /// `gender_stored_value`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Female => "female",
            Self::Male => "male",
            Self::NonBinary => "non-binary",
        }
    }
}

/// Stored display value. Mirrors the `profilTable.set(..., "♀ Female" |
/// "♂ Male" | "⚧ Non-binary")` writes in `!set-gender.ts` (slash choice
/// values are `female` | `male` | `non-binary`, display strings hit the DB).
/// The TS `switch` matches exactly (case-sensitive): anything else writes
/// nothing (see `profil_gender`).
pub fn gender_stored_value(gender: &str) -> Option<&'static str> {
    match gender {
        "female" => Some("♀ Female"),
        "male" => Some("♂ Male"),
        "non-binary" => Some("⚧ Non-binary"),
        _ => None,
    }
}

/// Set your gender. Mirrors `!set-gender.ts` (female | male | non-binary).
///
/// CONSTRAINED (deliberate divergence from `!set-gender.ts`): the TS
/// `switch` has no default arm, so an unmatched prefix-path input writes
/// nothing yet the success message is still sent (false success). Here
/// an unmatched input writes nothing AND replies with the invalid-gender
/// error instead. The exact-match quirk is kept: matching stays
/// case-sensitive with no trim, like the TS `switch`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-gender",
    aliases("gender"),
    category = "profil",
    name_localized("fr", "définir-genre"),
    name_localized("ja", "set-gender"),
    name_localized("ru", "set-gender"),
    name_localized("es-ES", "set-gender"),
    description_localized("fr", "Définissez votre genre sur le profil iHorizon"),
    description_localized("ja", "iHorizonプロフィールに性別を設定！"),
    description_localized("ru", "Установить пол в профиле iHorizon!"),
    description_localized("es-ES", "Establecer tu género en el perfil de iHorizon!")
)]
pub async fn profil_gender(
    ctx: Ctx<'_>,
    #[description = "Gender that fits you the most"]
    #[description_localized("fr", "Le genre qui vous correspond le plus")]
    #[description_localized("ja", "最も合う性別")]
    #[description_localized("ru", "Пол, который вам подходит")]
    #[description_localized("es-ES", "Género que más te queda")]
    gender: ProfilGender,
) -> Result<(), anyhow::Error> {
    let gender = gender.as_str();
    if !super::validate_gender(gender) {
        let msg = crate::commands::lang_for(
            &ctx,
            "msg_profil_gender_invalid",
            "Invalid gender: choose female, male or non-binary.",
        )
        .await;
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }
    if let Some(stored) = gender_stored_value(gender) {
        let user_id = ctx.author().id.get();
        let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
        p.gender = Some(stored.to_string());
        super::profil::save_profil_routed(&ctx.data().pool, user_id, &p).await?;
    }
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
    fn gender_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = ProfilGender::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["♀ Female", "♂ Male", "⚧ Non-binary"]);
        assert_eq!(ProfilGender::Female.as_str(), "female");
        assert_eq!(ProfilGender::Male.as_str(), "male");
        assert_eq!(ProfilGender::NonBinary.as_str(), "non-binary");
        assert_eq!(
            ProfilGender::from_name("female"),
            Some(ProfilGender::Female)
        );
        assert_eq!(ProfilGender::from_name("♂ MALE"), Some(ProfilGender::Male));
        assert_eq!(
            ProfilGender::from_name("non-binary"),
            Some(ProfilGender::NonBinary)
        );
        assert_eq!(ProfilGender::from_name("other"), None);
        assert_eq!(ProfilGender::from_index(0), Some(ProfilGender::Female));
        assert_eq!(ProfilGender::from_index(2), Some(ProfilGender::NonBinary));
        assert_eq!(ProfilGender::from_index(3), None);
        let list = ProfilGender::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("♀ Féminin")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("♂ Masculin")
        );
        assert_eq!(
            list[2].localizations.get("fr").map(String::as_str),
            Some("⚧ Non-binaire")
        );
        assert_eq!(ProfilGender::Female.localized_name("ja"), Some("female"));
    }

    #[test]
    fn gender_stores_ts_display_values() {
        assert_eq!(gender_stored_value("female"), Some("♀ Female"));
        assert_eq!(gender_stored_value("male"), Some("♂ Male"));
        assert_eq!(gender_stored_value("non-binary"), Some("⚧ Non-binary"));
    }

    #[test]
    fn gender_lookup_is_exact_like_ts_switch() {
        // `!set-gender.ts` switches on the raw string: case variants and
        // display values match nothing and write nothing.
        assert_eq!(gender_stored_value("Female"), None);
        assert_eq!(gender_stored_value("MALE"), None);
        assert_eq!(gender_stored_value("Non-Binary"), None);
    }

    #[test]
    fn gender_unmatched_maps_to_nothing_like_ts_switch() {
        // !set-gender.ts has no default arm: unmatched input writes nothing.
        // The mapper returning None is the "no write" signal; the command
        // itself now replies with the invalid-gender error (constrained,
        // see above) instead of the TS false success.
        assert_eq!(gender_stored_value("other"), None);
        assert_eq!(gender_stored_value(""), None);
        assert_eq!(gender_stored_value("♀ Female"), None);
    }
}
