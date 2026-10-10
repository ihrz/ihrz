use super::*;

/// Rate something X/10. Mirrors !rate.ts.
// Alias note, maskLink on the subject, stripped allowedMentions.
// Required like the TS slash option (`the_things`, required: true in
// fun.ts); `#[rest]` keeps multi-word prefix subjects whole. An empty
// subject still falls back to "nothing" like `string || "nothing"`.
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
    the_things: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    use rand::Rng;
    let random: u32 = rand::thread_rng().gen_range(0..10);
    let masked = crate::funcs::mask_link(&rate_subject(&the_things));
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
