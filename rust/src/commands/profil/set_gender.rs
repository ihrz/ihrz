use super::*;

/// Stored display value. Mirrors the `profilTable.set(..., "♀ Female" |
/// "♂ Male" | "⚧ Non-binary")` writes in `!set-gender.ts` (slash choice
/// values are `female` | `male` | `non-binary`, display strings hit the DB).
pub fn gender_stored_value(gender: &str) -> Option<&'static str> {
    match gender.to_ascii_lowercase().as_str() {
        "female" => Some("♀ Female"),
        "male" => Some("♂ Male"),
        "non-binary" => Some("⚧ Non-binary"),
        _ => None,
    }
}

/// Set your gender. Mirrors `!set-gender.ts` (female | male | non-binary).
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
    let Some(stored) = gender_stored_value(&gender) else {
        let msg = crate::commands::lang_for(
            &ctx,
            "msg_profil_invalid_gender",
            "Invalid gender: expected female, male or non-binary.",
        )
        .await;
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    };
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.gender = Some(stored.to_string());
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
    fn gender_stores_ts_display_values() {
        assert_eq!(gender_stored_value("female"), Some("♀ Female"));
        assert_eq!(gender_stored_value("male"), Some("♂ Male"));
        assert_eq!(gender_stored_value("non-binary"), Some("⚧ Non-binary"));
    }

    #[test]
    fn gender_lookup_is_case_insensitive() {
        assert_eq!(gender_stored_value("Female"), Some("♀ Female"));
        assert_eq!(gender_stored_value("MALE"), Some("♂ Male"));
        assert_eq!(gender_stored_value("Non-Binary"), Some("⚧ Non-binary"));
    }

    #[test]
    fn gender_rejects_unknown() {
        assert_eq!(gender_stored_value("other"), None);
        assert_eq!(gender_stored_value(""), None);
        assert_eq!(gender_stored_value("♀ Female"), None);
    }
}
