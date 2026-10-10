use super::*;

/// Build the public `"> " + content + footer` text. Pure part of [`say`].
pub fn say_text(content: &str, footer: &str) -> String {
    format!("> {content}{footer}")
}

/// Mentions stripped exactly like TS
/// (`allowedMentions: { roles: [], users: [], repliedUser: false }`).
pub fn stripped_mentions() -> serenity::CreateAllowedMentions {
    serenity::CreateAllowedMentions::new()
        .all_users(false)
        .all_roles(false)
        .everyone(false)
        .replied_user(false)
}

/// Send a message through the bot. Mirrors say.ts (`"> " + content`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn say(
    ctx: Ctx<'_>,
    #[description = "What you want the bot to say"] content: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let footer = crate::lang::get(&code, "say_footer_msg")
        .map(|s| {
            s.replace(
                "${interaction.user}",
                &format!("<@{}>", ctx.author().id.get()),
            )
        })
        .unwrap_or_default();
    let message = serenity::CreateMessage::new()
        .content(say_text(&content, &footer))
        .allowed_mentions(stripped_mentions());
    // TS hides a slash invocation (deferReply + deleteReply) then posts
    // with channelSend; prefix just posts. Either way the post is a plain
    // channel message with mentions stripped, never a reply.
    if let poise::Context::Application(app) = ctx {
        // Ephemeral thinking: only the invoker ever sees it.
        let _ = app.defer_response(true).await;
        ctx.channel_id().send_message(ctx.http(), message).await?;
        // Remove the thinking reply like the TS deleteReply (best effort).
        let _ = ctx
            .http()
            .delete_original_interaction_response(&app.interaction.token)
            .await;
    } else {
        ctx.channel_id().send_message(ctx.http(), message).await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_prefixes_quote_and_appends_footer() {
        assert_eq!(say_text("hi", ""), "> hi");
        assert_eq!(say_text("hi", " — <@1>"), "> hi — <@1>");
    }
}
