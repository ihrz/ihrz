use super::*;

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
    category = "profil"
)]
pub async fn profil_gender(
    ctx: Ctx<'_>,
    #[description = "Gender that fits you the most (female, male, non-binary)"] gender: String,
) -> Result<(), anyhow::Error> {
    if !super::validate_gender(&gender) {
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
    if let Some(stored) = gender_stored_value(&gender) {
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
