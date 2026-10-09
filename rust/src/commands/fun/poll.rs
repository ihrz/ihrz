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

/// Poll command. Mirrors !poll.ts (message + embed + gif + Yes/No reacts).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "poll")]
pub async fn poll(
    ctx: Ctx<'_>,
    #[description = "Poll message"] message: String,
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
            false,
        )
        .image(POLL_IMAGE_URL)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let handle = ctx.send(poise::CreateReply::default().embed(embed)).await?;
    if let Ok(sent) = handle.into_message().await {
        let http = ctx.serenity_context().http.clone();
        let _ = sent.react(&http, '✅').await;
        let _ = sent.react(&http, '❌').await;
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
}
