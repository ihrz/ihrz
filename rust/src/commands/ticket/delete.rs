use super::*;
use poise::serenity_prelude as serenity;

/// Delete this ticket channel (TicketDelete pipeline).
#[poise::command(slash_command, prefix_command, rename = "delete", aliases("tdelete"))]
pub async fn ticket_delete(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors !delete.ts guards (disable + delete_not_in_ticket).
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &lang_code, "ticket_disabled_command").await {
        return Ok(());
    }
    let channel_id = ctx.channel_id();
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &lang_code,
        channel_id,
        "delete_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let entries = load_ticket_entries(pool, &gid).await;
    let (user_key, author) =
        find_ticket_by_channel(&entries, &channel_id.get().to_string()).unwrap_or_default();
    let owner_id: u64 = author.parse().unwrap_or(0);
    let deleter_id = ctx.author().id.get();
    // TS deletes the whole `TICKET_ALL.<user>` row up front.
    if !user_key.is_empty() {
        delete_user_ticket_rows(pool, &gid, &user_key).await;
    }
    let channel_name = channel_id
        .name(&http)
        .await
        .unwrap_or_else(|_| "ticket".to_string());
    let Some(logs) = ticket_logs_channel(pool, &gid).await else {
        let _ = channel_id.delete(&http).await;
        return Ok(());
    };
    let (html, _count) = channel_transcript_html(&http, channel_id).await;
    let file_name = format!("{gid}-transcript.html");
    if owner_id != 0 && owner_id != deleter_id {
        let owner_mention = format!("<@{owner_id}>");
        let msg = t("ticket_deleted")
            .replace("${ticketOwnerMention}", &owner_mention)
            .replace("${deletedByUserId}", &deleter_id.to_string());
        let _ = dm_user(
            &http,
            owner_id,
            serenity::CreateMessage::new().content(msg).add_file(
                serenity::CreateAttachment::bytes(html.clone().into_bytes(), file_name.clone()),
            ),
        )
        .await;
    }
    let title = t("event_ticket_logsChannel_onDelete_embed_title");
    let desc = t("event_ticket_logsChannel_onDelete_embed_desc")
        .replace("${interaction.user}", &ctx.author().to_string())
        .replace("${interaction.channel.name}", &channel_name);
    let (footer_name, footer_icon) = ticket_footer(&http, pool, &gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(title)
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &footer_name,
        footer_icon.is_some(),
    );
    let _ = channel_id.delete(&http).await;
    let mut log_msg =
        serenity::CreateMessage::new()
            .embed(embed)
            .add_file(serenity::CreateAttachment::bytes(
                html.into_bytes(),
                file_name,
            ));
    if let Some(icon) = footer_icon {
        log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let _ = logs.send_message(&http, log_msg).await;
    Ok(())
}
