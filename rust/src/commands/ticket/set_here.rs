use super::*;
use poise::serenity_prelude as serenity;

/// Post the ticket panel message. Mirrors !set-here.ts: button opens a
/// ticket via the panel config.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-here",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_set_here(
    ctx: Ctx<'_>,
    #[description = "Panel name"] name: String,
    #[description = "Description"] description: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Mirrors !set-here.ts: disable guard.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    // V1 button panel (CreateButtonPanel, ticketsManager.ts:72):
    // Secondary style + envelope emoji, verbatim open-new-ticket id,
    // footer + footer file, GUILD.TICKET.<msgId> marker row, then the
    // onCreation logs embed.
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let (footer_name, footer_icon) = ticket_footer(&http, pool, &gid).await;
    let panel_embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .title(name.clone())
            .colour(0x3b8f41_u32)
            .description(description.clone().unwrap_or_else(|| {
                crate::lang::get(&code, "sethereticket_description_embed").unwrap_or_default()
            })),
        &footer_name,
        footer_icon.is_some(),
    );
    let button = serenity::CreateButton::new(LEGACY_OPEN_BUTTON_ID)
        .label(
            crate::lang::get(&code, "event_ticket_button_name")
                .unwrap_or_else(|| "Open ticket".to_string()),
        )
        .emoji(serenity::ReactionType::Unicode("📩".to_string()))
        .style(serenity::ButtonStyle::Secondary);
    let mut post = serenity::CreateMessage::new()
        .embed(panel_embed)
        .button(button);
    if let Some(icon) = footer_icon {
        post = post.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let sent = ctx.channel_id().send_message(&http, post).await?;
    crate::db::kv_set(
        pool,
        &gid,
        &legacy_panel_key(sent.id.get()),
        &serde_json::json!({
            "author": ctx.author().id.get().to_string(),
            "used": true,
            "panelName": name,
            "reason": false,
            "channel": sent.channel_id.get().to_string(),
            "messageID": sent.id.get().to_string(),
            "categoryId": "",
        })
        .to_string(),
    )
    .await?;
    // onCreation logs embed + footer file (CreateButtonPanel:125).
    if let Some(logs) = ticket_logs_channel(pool, &gid).await {
        let desc = t("event_ticket_logsChannel_onCreation_embed_desc")
            .replace("${data.name}", &sent.id.get().to_string())
            .replace("${interaction}", &format!("<#{}>", ctx.channel_id().get()));
        let (log_name, log_icon) = ticket_footer(&http, pool, &gid).await;
        let embed = ticket_embed_footer(
            serenity::CreateEmbed::default()
                .colour(0x008000_u32)
                .title(t("event_ticket_logsChannel_onCreation_embed_title"))
                .description(desc)
                .timestamp(serenity::Timestamp::now()),
            &log_name,
            log_icon.is_some(),
        );
        let mut log_msg = serenity::CreateMessage::new().embed(embed);
        if let Some(icon) = log_icon {
            log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
        }
        let _ = logs.send_message(&http, log_msg).await;
    }
    ctx.say(t("sethereticket_command_work")).await?;
    Ok(())
}
