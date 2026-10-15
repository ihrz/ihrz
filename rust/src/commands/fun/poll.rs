use super::*;

/// Embed image. Mirrors the poll_embed_image.gif URL in !poll.ts.
pub const POLL_IMAGE_URL: &str = "https://www.ihorizon.org/assets/img/poll_embed_image.gif";

/// Embed colour. Mirrors `.setColor("#ddd98b")` in !poll.ts.
pub const POLL_COLOUR: u32 = 0xddd98b;

/// Fill poll_embed_title. Mirrors the ${interaction.user.username} replace.
pub fn poll_title(template: &str, display_name: &str) -> String {
    template.replace("${interaction.user.username}", display_name)
}

/// Description shape. Mirrors `.setDescription(`**${pollMessage}**`)`.
pub fn poll_description(message: &str) -> String {
    format!("**{message}**")
}

/// App-emoji reaction. Mirrors `msg.react(Yes/No)` in `!poll.ts`, which
/// reacts with the synced `client.iHorizon_Emojis` app emojis only (no
/// unicode fallback in TS). `cached_emoji_entry` reads the same boot-warmed
/// cache as `app_emoji_markup`; a missing entry skips that react.
pub fn app_reaction(
    entry: Option<(u64, String, bool)>,
) -> Option<poise::serenity_prelude::ReactionType> {
    entry.map(
        |(id, name, animated)| poise::serenity_prelude::ReactionType::Custom {
            animated,
            id: poise::serenity_prelude::EmojiId::new(id),
            name: Some(name),
        },
    )
}

/// Create a poll!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "poll",
    default_member_permissions = "ADMINISTRATOR",
    name_localized("fr", "sondage"),
    name_localized("ja", "poll"),
    name_localized("ru", "poll"),
    name_localized("es-ES", "poll"),
    description_localized("fr", "Créer un sondage"),
    description_localized("ja", "投票を作成！"),
    description_localized("ru", "Создать опрос!"),
    description_localized("es-ES", "Crear una encuesta!")
)]
// Mirrors !poll.ts.
// ADMINISTRATOR permission comes from fun.ts; Yes/No reacts use the app
// emojis only (no unicode fallback, like TS).
pub async fn poll(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Le message affiché sur le sondage")]
    #[description_localized("ja", "アンケートに表示されるメッセージ")]
    #[description_localized("ru", "Сообщение, отображаемое в опросе")]
    #[description_localized("es-ES", "El mensaje mostrado en la encuesta")]
    #[description = "The message displayed on the survey"]
    #[rest]
    message: Option<String>,
) -> Result<(), anyhow::Error> {
    // Bare call first (TS checkCommandArgs runs before the command body,
    // so usage wins over the fun kill-switch like in TS).
    let Some(message) = message else {
        usage_reply(&ctx, "poll").await?;
        return Ok(());
    };
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let f = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let author = ctx.author();
    let display = author
        .global_name
        .clone()
        .unwrap_or_else(|| author.name.clone());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(poll_title(
            &f(
                "poll_embed_title",
                "__**Poll**__: `${interaction.user.username}`",
            ),
            &display,
        ))
        .colour(POLL_COLOUR)
        .description(poll_description(&message))
        .field(
            f("poll_embed_fields_reaction", "Tap the reactions below.⬇"),
            f(
                "poll_embed_fields_choice",
                ":white_check_mark: **Yes**\n:x: **No**",
            ),
            // TS omits `inline` here; explicit `false` renders identically.
            false,
        )
        .image(POLL_IMAGE_URL)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let handle = ctx.send(poise::CreateReply::default().embed(embed)).await?;
    if let Ok(sent) = handle.into_message().await {
        let http = ctx.serenity_context().http.clone();
        for name in ["Yes", "No"] {
            if let Some(rt) = app_reaction(crate::emojis::cached_emoji_entry(&http, name).await) {
                let _ = sent.react(&http, rt).await;
            }
        }
    }
    Ok(())
}

/// Missing-input usage embed. Mirrors checkCommandArgs/sendErrorMessage
/// for this command's single required String option (`required: true`
/// in fun.ts): an empty prefix tail parses as `None`, so the command
/// replays the same `hybridcommands_args_error_embed_desc` caret embed
/// TS sends (`!poll [string]`, caret on the missing arg). Both lang
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
mod poll_tests {
    use super::*;

    #[test]
    fn title_fills_display_name() {
        assert_eq!(
            poll_title("__**Poll**__: `${interaction.user.username}`", "bob"),
            "__**Poll**__: `bob`"
        );
    }

    #[test]
    fn description_bolds_message() {
        assert_eq!(poll_description("cats?"), "**cats?**");
    }

    #[test]
    fn gif_and_colour_match_ts() {
        assert_eq!(
            POLL_IMAGE_URL,
            "https://www.ihorizon.org/assets/img/poll_embed_image.gif"
        );
        assert_eq!(POLL_COLOUR, 0xddd98b);
    }

    #[test]
    fn reactions_are_app_emoji_only() {
        // No unicode fallback: a missing entry yields no reaction.
        assert_eq!(app_reaction(None), None);
        match app_reaction(Some((7, "iHorizon_Yes".to_string(), false))) {
            Some(poise::serenity_prelude::ReactionType::Custom { id, name, .. }) => {
                assert_eq!(id.get(), 7);
                assert_eq!(name.as_deref(), Some("iHorizon_Yes"));
            }
            other => panic!("expected custom, got {other:?}"),
        }
    }

    #[test]
    fn message_is_optional_so_bare_prefix_reaches_usage() {
        // `!poll` with no text must reach `usage_reply` (TS
        // checkCommandArgs caret embed), not a framework parse error:
        // the `message` param stays `Option` like catsay/morse/question.
        let cmds = crate::commands::all();
        let fun = cmds.iter().find(|c| c.name == "fun").expect("fun missing");
        let inter = fun
            .subcommands
            .iter()
            .find(|c| c.name == "interaction")
            .expect("interaction missing");
        let poll = inter
            .subcommands
            .iter()
            .find(|c| c.name == "poll")
            .expect("poll missing");
        let p = poll
            .parameters
            .iter()
            .find(|x| x.name == "message")
            .expect("param message");
        assert!(!p.required);
    }
}
