use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "panel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_panel(
    ctx: Ctx<'_>,
    #[description = "Panel name"] name: String,
    #[description = "Description"] description: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Mirrors !panel.ts: the open_disabled_command guard.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "open_disabled_command").await {
        return Ok(());
    }
    let id = format!(
        "{:x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(1)
            & 0xffffff
    );
    let panel = TicketPanel {
        name,
        description: description.unwrap_or_default(),
        category_id: String::new(),
        panel_code: id.clone(),
        ..Default::default()
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &panel_key(&id),
        &serde_json::to_string(&panel)?,
    )
    .await?;
    // Post the opener to this channel when the panel already carries a
    // related embed or options (sendEmbed, !panel.ts:671): related
    // EMBED row first, default panel embed otherwise, select menu with
    // the verbatim ticket-open-selection-v2 id, then the
    // GUILD.TICKET_PANEL.<sentMsgId> -> panelCode marker row. The full
    // V2 builder UI stays deferred.
    if !panel.related_embed_id.trim().is_empty() || !panel.config.option_fields.is_empty() {
        post_ticket_panel_message(&ctx, pool, &gid, &code, &id, &panel).await;
    }
    ctx.say(
        crate::lang::get(&code, "msg_ticket_panel_id_created")
            .map(|s| s.replace("{id}", &id))
            .unwrap_or_else(|| format!("Ticket panel `{id}` created.")),
    )
    .await?;
    Ok(())
}

/// Post a V2 opener message for a saved panel and record the
/// `GUILD.TICKET_PANEL.<sentMsgId>` marker. Mirrors sendEmbed
/// (!panel.ts:750): related-embed attach, select menu, marker write.
async fn post_ticket_panel_message(
    ctx: &Ctx<'_>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    panel_code: &str,
    panel: &TicketPanel,
) {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let mut embed: Option<serenity::CreateEmbed> = None;
    if !panel.related_embed_id.trim().is_empty() {
        let stored: Option<serde_json::Value> = crate::db::kv_get(
            pool,
            gid,
            &format!("EMBED.{}", panel.related_embed_id.trim()),
        )
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .and_then(|v: serde_json::Value| v.get("embedSource").cloned());
        embed = stored.as_ref().and_then(create_embed_from_value);
    }
    let embed = embed.unwrap_or_else(|| {
        serenity::CreateEmbed::default()
            .title(panel.name.clone())
            .description(if panel.description.is_empty() {
                t("sethereticket_description_embed")
            } else {
                panel.description.clone()
            })
    });
    let options = panel
        .config
        .option_fields
        .iter()
        .map(|opt| {
            let mut builder = serenity::CreateSelectMenuOption::new(
                opt.name.chars().take(100).collect::<String>(),
                opt.value.clone(),
            );
            if !opt.desc.trim().is_empty() {
                builder = builder.description(opt.desc.chars().take(100).collect::<String>());
            }
            if !opt.emoji.trim().is_empty() {
                let emoji = opt
                    .emoji
                    .parse::<serenity::ReactionType>()
                    .unwrap_or_else(|_| serenity::ReactionType::Unicode(opt.emoji.clone()));
                builder = builder.emoji(emoji);
            }
            builder
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        V2_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(if panel.placeholder.is_empty() {
        t("ticket_panel_default_placeholder")
    } else {
        panel.placeholder.clone()
    });
    let msg = serenity::CreateMessage::new()
        .embed(embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(menu)]);
    if let Ok(sent) = ctx.channel_id().send_message(&http, msg).await {
        let marker = serde_json::to_string(&panel_code.to_string()).unwrap_or_default();
        let _ = crate::db::kv_set(pool, gid, &panel_key(&sent.id.get().to_string()), &marker).await;
    }
}

/// Setter for the ticket panel V2 flags.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "panel-v2",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_panel_v2(
    ctx: Ctx<'_>,
    #[description = "Panel id"] panel_id: String,
    #[description = "Role ids to ping (comma separated)"] roles_to_ping: Option<String>,
    #[description = "Ping ticket opener"] ping_user: Option<bool>,
    #[description = "Show delete button"] delete_button: Option<bool>,
    #[description = "Show transcript button"] transcript_button: Option<bool>,
    #[description = "Show user select panel"] user_select_panel: Option<bool>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut panel = load_panel(&ctx.data().pool, &gid, panel_id.trim()).await;
    if let Some(csv) = roles_to_ping {
        panel.config.roles_to_ping = csv
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
    }
    if let Some(v) = ping_user {
        panel.config.ping_user = v;
    }
    if let Some(v) = delete_button {
        panel.config.delete_button = v;
    }
    if let Some(v) = transcript_button {
        panel.config.transcript_button = v;
    }
    if let Some(v) = user_select_panel {
        panel.config.user_select_panel = v;
    }
    save_panel(&ctx.data().pool, &gid, panel_id.trim(), &panel).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let pid = panel_id.trim().to_string();
    ctx.say(
        crate::lang::get(&code, "msg_ticket_panel_updated")
            .map(|s| s.replace("{id}", &pid))
            .unwrap_or_else(|| format!("Ticket panel `{pid}` updated.")),
    )
    .await?;
    Ok(())
}
