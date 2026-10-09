use super::*;
use poise::serenity_prelude as serenity;

/// Logs-embed description for the close flow: actor + channel slots.
/// Mirrors CloseTicket (TS sends the transcript file only to the
/// channel notify, never to the logs message).
pub fn close_log_desc(template: &str, actor_mention: &str, channel_id: u64) -> String {
    template
        .replace("${interaction.user}", actor_mention)
        .replace("${interaction.channel.id}", &channel_id.to_string())
}
#[poise::command(
    slash_command,
    prefix_command,
    rename = "close",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_close(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors !close.ts -> CloseTicket: disable + is-ticket guards,
    // owner overwrite revoked (View/Send/History deny), in-channel
    // embed + transcript, logs embed. The channel and its TICKET_ALL
    // row stay so the ticket can be reopened; nothing is deleted.
    // (close_ticket_channel below keeps the delete semantics for the
    // member-leave cleanup path, which drops rows itself.)
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let channel_id = ctx.channel_id();
    if ticket_guard_disabled(&ctx, pool, &gid, &lang_code, "ticket_disabled_command").await {
        return Ok(());
    }
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &lang_code,
        channel_id,
        "close_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let entries = load_ticket_entries(pool, &gid).await;
    let Some(author_id) = ticket_owner_id(&entries, &channel_id.get().to_string()) else {
        ctx.say(
            crate::lang::get(&lang_code, "close_command_error")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let http = ctx.serenity_context().http.clone();
    let (html, _count) = channel_transcript_html(&http, channel_id).await;
    // Revoke the owner (TS create() with false flags = deny). A
    // missing member throws in TS -> close_command_error, same here.
    if channel_id
        .create_permission(
            &http,
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::empty(),
                deny: serenity::Permissions::VIEW_CHANNEL
                    | serenity::Permissions::SEND_MESSAGES
                    | serenity::Permissions::READ_MESSAGE_HISTORY,
                kind: serenity::PermissionOverwriteType::Member(serenity::UserId::new(author_id)),
            },
        )
        .await
        .is_err()
    {
        ctx.say(
            crate::lang::get(&lang_code, "close_command_error")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let file_name = format!("{gid}-transcript.html");
    let notify = serenity::CreateEmbed::default()
        .description(t("close_title_sourcebin"))
        .colour(0x0014A8_u32);
    let notify_content = crate::lang::get(&lang_code, "close_command_work_notify_channel")
        .unwrap_or_else(|| "The ticket was successfully closed!".to_string());
    // Single notify: TS CloseTicket answers once via interactionSend
    // (content + embed + transcript file).
    let _ = ctx
        .send(
            poise::CreateReply::default()
                .content(notify_content)
                .embed(notify)
                .attachment(serenity::CreateAttachment::bytes(
                    html.into_bytes(),
                    file_name,
                )),
        )
        .await;
    if let Some(logs) = ticket_logs_channel(pool, &gid).await {
        let actor = format!("<@{}>", ctx.author().id.get());
        let desc = close_log_desc(
            &t("event_ticket_logsChannel_onClose_embed_desc"),
            &actor,
            channel_id.get(),
        );
        let (footer_name, footer_icon) = ticket_footer(&http, pool, &gid).await;
        let mut footer = serenity::CreateEmbedFooter::new(footer_name);
        if footer_icon.is_some() {
            footer = footer.icon_url("attachment://footer_icon.png");
        }
        let embed = serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(t("event_ticket_logsChannel_onClose_embed_title"))
            .description(desc)
            .footer(footer)
            .timestamp(serenity::Timestamp::now());
        let mut log_msg = serenity::CreateMessage::new().embed(embed);
        if let Some(icon) = footer_icon {
            log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
        }
        let _ = logs.send_message(&http, log_msg).await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_desc_fills_actor_and_channel() {
        let out = close_log_desc(
            "by ${interaction.user} in ${interaction.channel.id}!",
            "<@7>",
            42,
        );
        assert_eq!(out, "by <@7> in 42!");
    }
}
