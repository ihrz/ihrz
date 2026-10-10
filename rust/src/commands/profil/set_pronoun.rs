use super::*;

/// Display form. Mirrors `pronoun.replace("-","/")` in `!show.ts:136`:
/// a plain-string (non-regex) replace converts the FIRST hyphen only, so
/// `she-her` shows as `she/her` while a verbatim `she/her` is unchanged.
/// (Also upgrades legacy TS rows stored hyphenated.)
pub fn pronoun_display_value(stored: &str) -> String {
    stored.replacen('-', "/", 1)
}

/// Set your pronoun. Mirrors `!set-pronoun.ts`.
///
/// The value is stored verbatim with no validation and no slash-to-hyphen
/// slash choice values (`she-her`, …) already arrive hyphenated, and the
/// prefix path stores the first arg as-is.
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
    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(&ctx.data().pool, user_id).await;
    p.pronoun = Some(pronoun);
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
        // JS `"a-b-c".replace("-","/")` (plain string, not regex) converts
        // the first occurrence only.
        assert_eq!(pronoun_display_value("a-b-c"), "a/b-c");
        assert_eq!(pronoun_display_value("-leading"), "/leading");
    }
}
