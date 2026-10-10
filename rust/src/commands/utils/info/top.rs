use super::*;

/// Get the link of the first message in the channel.
// Mirrors MessageCommands utils top.ts (oldest message via
// after:"0", link reply or no-message text).
// Prefix-only: TS registers top as a MessageCommand, never as slash.
#[poise::command(prefix_command, category = "utils", rename = "top")]
pub async fn top(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let first = ctx
        .channel_id()
        .messages(
            ctx.http(),
            poise::serenity_prelude::GetMessages::new()
                .after(poise::serenity_prelude::MessageId::new(1))
                .limit(1),
        )
        .await
        .unwrap_or_default()
        .into_iter()
        .next();
    match first {
        Some(m) => {
            let link =
                crate::funcs::message_url(guild_id.get(), ctx.channel_id().get(), m.id.get());
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "utils_top_command_ok",
                    "The first message in this channel is [here](${link})",
                )
                .await
                .replace("${link}", &link),
            )
            .await?;
        }
        None => {
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "utils_top_no_message",
                    "No messages found in this channel",
                )
                .await,
            )
            .await?;
        }
    }
    Ok(())
}
