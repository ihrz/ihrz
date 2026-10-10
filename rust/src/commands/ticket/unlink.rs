use super::*;
use poise::serenity_prelude as serenity;

/// Unlink this channel from the ticket store (single row).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlink",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_unlink(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    let channel_id = ctx.channel_id();
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &code,
        channel_id,
        "transript_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    let http = ctx.serenity_context().http.clone();
    // Change name of the ticket, like ticketChannel.setName(...). TS
    // awaits it (!unlink.ts:74-76): a rename failure throws and aborts
    // the handler (no panel edit, no DB delete, no success reply), so a
    // failed edit returns here the same way instead of continuing.
    if let Some(gc) = ctx.guild_channel().await {
        let renamed = gc.name.replacen("ticket", "channel", 1);
        if renamed != gc.name
            && channel_id
                .edit(&http, serenity::EditChannel::new().name(renamed))
                .await
                .is_err()
        {
            return Ok(());
        }
    }
    // Edit the panel (first) message: unlink line, embeds,
    // components and files cleared.
    if let Some(first) = first_panel_message_id(&http, channel_id).await {
        let content = crate::lang::get(&code, "ticket_unlink_panel_edited_content")
            .map(|s| s.replace("{user}", &ctx.author().to_string()))
            .unwrap_or_else(|| "Channel unlinked.".to_string());
        let _ = channel_id
            .edit_message(
                &http,
                first,
                serenity::EditMessage::new()
                    .content(content)
                    .embeds(vec![])
                    .components(vec![])
                    .remove_all_attachments(),
            )
            .await;
    }
    delete_ticket_row(pool, &gid, channel_id).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "ticket_unlink_command_ok")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| "Ticket unlinked.".to_string()),
    )
    .await?;
    Ok(())
}
