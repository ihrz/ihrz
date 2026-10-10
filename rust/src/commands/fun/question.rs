use super::*;

/// 8-ball command. Mirrors !question.ts: 3-word gate then a 2-field Q&A embed.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "question",
    aliases("8ball")
)]
pub async fn question(
    ctx: Ctx<'_>,
    #[description = "Your question"]
    #[rest]
    question: String,
) -> Result<(), anyhow::Error> {
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
