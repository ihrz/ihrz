use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(slash_command, prefix_command, rename = "open")]
pub async fn ticket_open(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors !open.ts -> TicketReOpen (ticketsManager.ts:1709): the
    // command only runs inside a ticket channel, where it re-grants
    // the owner (View/Send/Attach/History), replies open_command_work
    // and posts the onReopen logs embed. It never creates a channel.
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "open_disabled_command").await {
        return Ok(());
    }
    let channel_id = ctx.channel_id();
    if ticket_guard_in_ticket(&ctx, pool, &gid, &code, channel_id, "open_not_in_ticket").await {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let entries = delete::ticket_entries_routed(pool, &gid).await;
    let Some(author_id) = ticket_owner_id(&entries, &channel_id.get().to_string()) else {
        ctx.say(
            crate::lang::get(&code, "open_command_error")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let http = ctx.serenity_context().http.clone();
    if channel_id
        .create_permission(
            &http,
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::VIEW_CHANNEL
                    | serenity::Permissions::SEND_MESSAGES
                    | serenity::Permissions::ATTACH_FILES
                    | serenity::Permissions::READ_MESSAGE_HISTORY,
                deny: serenity::Permissions::empty(),
                kind: serenity::PermissionOverwriteType::Member(serenity::UserId::new(author_id)),
            },
        )
        .await
        .is_err()
    {
        ctx.say(
            crate::lang::get(&code, "open_command_error")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    }
    ctx.say(t("open_command_work").replace(
        "${interaction.channel}",
        &format!("<#{}>", channel_id.get()),
    ))
    .await?;
    post_ticket_reopen_log(&http, pool, &gid, &code, channel_id, ctx.author().id.get()).await;
    Ok(())
}

/// onReopen logs embed for the reopen flow above (title + desc with
/// the `${interaction.user}` / `${interaction.channel.id}` slots,
/// footer file, timestamp). Mirrors TicketReOpen:1744.
async fn post_ticket_reopen_log(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    channel_id: serenity::ChannelId,
    actor_id: u64,
) {
    let Some(logs) = ticket_logs_channel(pool, gid).await else {
        return;
    };
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let desc = t("event_ticket_logsChannel_onReopen_embed_desc")
        .replace("${interaction.user}", &format!("<@{actor_id}>"))
        .replace("${interaction.channel.id}", &channel_id.get().to_string());
    let (footer_name, footer_icon) = ticket_footer(http, pool, gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(t("event_ticket_logsChannel_onReopen_embed_title"))
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &footer_name,
        footer_icon.is_some(),
    );
    let mut log_msg = serenity::CreateMessage::new().embed(embed);
    if let Some(icon) = footer_icon {
        log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let _ = logs.send_message(http, log_msg).await;
}
