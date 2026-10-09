use super::*;

/// Canonical stored form. Mirrors the TS slash choice values
/// (`she-her`, `he-him`, `they-them`, `xe-xem`, `ze-zem`, `other`);
/// the slash form is rendered by show, like `!show.ts`.
pub fn pronoun_stored_value(pronoun: &str) -> String {
    pronoun.to_ascii_lowercase().replace('/', "-")
}

/// Display form. Mirrors `pronoun.replace("-","/")` in `!show.ts`
/// (also upgrades legacy TS rows stored hyphenated).
pub fn pronoun_display_value(stored: &str) -> String {
    stored.replace('-', "/")
}

/// Set your pronoun. Mirrors `!set-pronoun.ts`.
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
    if !validate_pronoun(&pronoun) {
        let msg = crate::commands::lang_for(
            &ctx,
            "msg_profil_invalid_pronoun",
            "Invalid pronoun: expected she/her, he/him, they/them, xe/xem, ze/zem or other.",
        )
        .await;
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.pronoun = Some(pronoun_stored_value(&pronoun));
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
    fn pronoun_stores_ts_choice_values() {
        assert_eq!(pronoun_stored_value("she-her"), "she-her");
        assert_eq!(pronoun_stored_value("she/her"), "she-her");
        assert_eq!(pronoun_stored_value("He-Him"), "he-him");
        assert_eq!(pronoun_stored_value("other"), "other");
    }

    #[test]
    fn pronoun_displays_slash_form() {
        assert_eq!(pronoun_display_value("she-her"), "she/her");
        assert_eq!(pronoun_display_value("she/her"), "she/her");
        assert_eq!(pronoun_display_value("other"), "other");
    }
}
