use super::*;

/// Let me rate the followed subject
// Alias note, maskLink on the subject, stripped allowedMentions.
// `the_things` is required:true in fun.ts, and prod's prefix path
// runs checkCommandArgs counts-first: a bare `+rate` renders the
// caret usage embed (verified live 2026-10-15, prod usage embed vs
// test "nothing" content). The prefix head below mirrors that gate;
// `#[rest]` keeps multi-word prefix subjects whole.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "rate",
    aliases("note"),
    description_localized("fr", "Affiche au combien tu pue"),
    description_localized("ja", "指定された対象を評価します"),
    description_localized("ru", "Позволь оценить указанный предмет"),
    description_localized("es-ES", "Déjame calificar el tema indicado")
)]
pub async fn rate(
    ctx: Ctx<'_>,
    #[description_localized("fr", "la chose")]
    #[description_localized("ja", "もの")]
    #[description_localized("ru", "вещи")]
    #[description_localized("es-ES", "las cosas")]
    #[description = "the_things"]
    #[rest]
    the_things: Option<String>,
) -> Result<(), anyhow::Error> {
    // TS checkCommandArgs counts first (`the_things` required:true in
    // fun.ts): a bare prefix invocation renders the caret usage embed,
    // never the "nothing" fallback (rolelimit.rs precedent).
    if let poise::Context::Prefix(pctx) = ctx {
        if prefix_subject_missing(pctx.args) {
            crate::bot::prefix_usage_denial(ctx, None).await;
            return Ok(());
        }
    }
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

/// Prefix count-check predicate: a bare (or whitespace-only) prefix
/// invocation must render the caret usage embed, mirroring TS
/// checkCommandArgs for the required `the_things` option.
pub fn prefix_subject_missing(args: &str) -> bool {
    args.trim().is_empty()
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

    #[test]
    fn bare_prefix_subject_counts_as_missing() {
        // Pins the TS checkCommandArgs gate: bare or whitespace-only
        // prefix args render the caret usage embed (prod `+rate`
        // verified live), never the "nothing" content reply.
        assert!(prefix_subject_missing(""));
        assert!(prefix_subject_missing("   "));
        assert!(!prefix_subject_missing("cats"));
    }
}
