use super::*;

/// Rate something X/10. Mirrors !rate.ts.
// Alias note, maskLink on the subject, stripped allowedMentions.
// Optional, defaulting to "nothing" like `string || "nothing"` in
// !rate.ts: the TS slash option is required:true in fun.ts, but the
// prefix path (`longString(args, 0)`) can be empty, so `Option` keeps
// a bare `!rate` working instead of raising a framework error.
// `#[rest]` keeps multi-word prefix subjects whole.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "rate",
    aliases("note")
)]
pub async fn rate(
    ctx: Ctx<'_>,
    #[description = "Thing to rate"]
    #[rest]
    the_things: Option<String>,
) -> Result<(), anyhow::Error> {
    // No fun guard: `!rate.ts` has no `GUILD.FUN.states` check,
    // so rating runs even with fun disabled.
    use rand::Rng;
    let random: u32 = rand::thread_rng().gen_range(0..10);
    let masked = crate::funcs::mask_link(&rate_subject(the_things.as_deref().unwrap_or("")));
    let content = crate::commands::lang_for(
        &ctx,
        "fun_rate_command_ok",
        "I rate **${the_things}** ${random}/10.",
    )
    .await
    .replace("${the_things}", &masked)
    .replace("${random}", &random.to_string());
    ctx.send(
        poise::CreateReply::default()
            .content(content)
            .allowed_mentions(
                poise::serenity_prelude::CreateAllowedMentions::new()
                    .all_users(false)
                    .all_roles(false)
                    .everyone(false)
                    .replied_user(false),
            ),
    )
    .await?;
    Ok(())
}

/// Empty subject falls back to "nothing" before masking, like
/// `maskLink(string || "nothing")`.
pub fn rate_subject(raw: &str) -> String {
    if raw.is_empty() {
        "nothing".to_string()
    } else {
        raw.to_string()
    }
}

#[cfg(test)]
mod rate_tests {
    use super::*;

    #[test]
    fn empty_subject_falls_back() {
        assert_eq!(rate_subject(""), "nothing");
        assert_eq!(rate_subject("cats"), "cats");
        assert_eq!(
            crate::funcs::mask_link(&rate_subject("https://evil.gg/x")),
            "Hidden Link"
        );
    }
}
