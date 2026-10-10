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
    default_member_permissions = "ADMINISTRATOR"
)]
// Mirrors !poll.ts.
// ADMINISTRATOR permission comes from fun.ts; Yes/No reacts use the app
// emojis only (no unicode fallback, like TS).
pub async fn poll(
    ctx: Ctx<'_>,
    #[description = "Poll message"]
    #[rest]
    message: String,
) -> Result<(), anyhow::Error> {
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
}
