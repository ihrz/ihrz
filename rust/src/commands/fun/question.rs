use super::*;

/// Ask the magic 8-ball a question!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "question",
    aliases("8ball")
)]
// Mirrors !question.ts: 3-word gate then a 2-field Q&A embed.
pub async fn question(
    ctx: Ctx<'_>,
    // `Option` mirrors `longString(args, 0)` returning null on an empty
    // prefix tail (slash stays effectively required: TS `required: true`
    // in fun.ts). A missing input replays the TS checkCommandArgs
    // usage embed below instead of the question gate.
    #[description = "Your question"]
    #[rest]
    question: Option<String>,
) -> Result<(), anyhow::Error> {
    // Bare call first (TS checkCommandArgs runs before the command
    // body, so usage wins over the fun kill-switch like in TS).
    let Some(question) = question else {
        usage_reply(&ctx, "question").await?;
        return Ok(());
    };
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !question_is_full(&question) {
        ctx.say(
            crate::lang::get(&code, "question_not_full")
                .unwrap_or_else(|| "Enter a full question with 3 or more words!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let answers = crate::lang::get_list(&code, "question_s");
    let answer = if answers.is_empty() {
        eightball(now_ms_sys()).to_string()
    } else {
        use rand::Rng;
        let i = rand::thread_rng().gen_range(0..answers.len());
        answers[i].clone()
    };
    let author = ctx.author();
    let display = author
        .global_name
        .clone()
        .unwrap_or_else(|| author.name.clone());
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(
            f(
                "question_embed_title",
                "__**Question**__: `${interaction.user.username}`",
            )
            .replace("${interaction.user.username}", &display),
        )
        .colour(0xddd98bu32)
        .field(
            f("question_fields_input_embed", ":question:__**Question**__"),
            question,
            true,
        )
        .field(
            f(
                "question_fields_output_embed",
                ":grey_exclamation:__**Answer:**__",
            ),
            answer,
            // TS omits `inline` here; explicit `false` renders identically.
            false,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Full-question gate. Mirrors `question?.split(" ")` + `if (!text[2])`:
/// the third space-separated part must exist and be non-empty.
pub fn question_is_full(question: &str) -> bool {
    question.split(' ').nth(2).is_some_and(|s| !s.is_empty())
}

/// Missing-input usage embed. Mirrors checkCommandArgs/sendErrorMessage
/// for this command's single required String option (`required: true`
/// in fun.ts): an empty prefix tail parses as `None`, so the command
/// replays the same `hybridcommands_args_error_embed_desc` caret embed
/// TS sends (`!question [string]`, caret on the missing arg). Both lang
/// keys already exist in YAML, so no new key is needed.
async fn usage_reply(ctx: &Ctx<'_>, cmd: &str) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let code = crate::db::guild_lang(pool, gid).await;
    let prefix = crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await;
    let token = "[string]".to_string();
    let desc = crate::funcs_send::args_error_description(
        &code,
        cmd,
        &prefix,
        cmd,
        &crate::funcs_send::args_error_line(&[("string".to_string(), true)]),
        &crate::funcs_send::error_position(&prefix, cmd, &[token], 0),
        "string",
    );
    let footer = crate::lang::get(&code, "hybridcommands_embed_footer_text")
        .unwrap_or_else(|| {
            "Options within [...] are required, while those within <...> are optional.\nUse the command: ${botPrefix}help [command] for more information."
                .to_string()
        })
        .replace("${botPrefix}", &prefix);
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let (_, fbytes) = crate::commands::shared::footer_parts(ctx, &gid_str).await;
    let embed = crate::commands::shared::embed_with_footer(
        poise::serenity_prelude::CreateEmbed::default()
            .description(desc)
            .colour(0xED_4245_u32),
        &footer,
        fbytes.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = fbytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod question_tests {
    use super::*;

    #[test]
    fn gate_needs_three_words_like_ts() {
        assert!(!question_is_full(""));
        assert!(!question_is_full("hello"));
        assert!(!question_is_full("hello world"));
        assert!(!question_is_full("a b "));
        assert!(question_is_full("a b c"));
        assert!(question_is_full("will it rain today?"));
        // TS splits on ' ', so leading spaces still count as parts.
        assert!(question_is_full("  x"));
    }
}
