// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/ticket/* via ticketsManager.ts.
//
// TS keys: GUILD.TICKET {disable, category, logs}, GUILD.TICKET_PANEL.<id>,
// TICKET_ALL.<user>.<channel>. Transcripts (discord-html-transcripts)
// pending; panel config + open/close/add-member fully ported.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct TicketForm {
    #[serde(default)]
    pub question_id: u32,
    #[serde(default)]
    pub question_title: String,
    #[serde(default)]
    pub question_placeholder: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct TicketOption {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub desc: String,
    #[serde(default)]
    pub value: String,
    #[serde(default)]
    pub emoji: String,
    #[serde(default)]
    pub category_id: String,
    #[serde(default)]
    pub panel_id: String,
    #[serde(default)]
    pub form: Vec<TicketForm>,
    #[serde(default)]
    pub roles_to_ping: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TicketPanelConfig {
    #[serde(default)]
    pub roles_to_ping: Vec<String>,
    #[serde(default)]
    pub option_fields: Vec<TicketOption>,
    #[serde(default = "default_true")]
    pub ping_user: bool,
    #[serde(default)]
    pub form: Vec<TicketForm>,
    #[serde(default = "default_true")]
    pub user_select_panel: bool,
    #[serde(default = "default_true")]
    pub delete_button: bool,
    #[serde(default = "default_true")]
    pub transcript_button: bool,
}

fn default_true() -> bool {
    true
}

impl Default for TicketPanelConfig {
    fn default() -> Self {
        Self {
            roles_to_ping: vec![],
            option_fields: vec![],
            ping_user: true,
            form: vec![],
            user_select_panel: true,
            delete_button: true,
            transcript_button: true,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct TicketPanel {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub category_id: String,
    // V2 extras (defaulted so legacy rows still parse).
    #[serde(default)]
    pub panel_code: String,
    #[serde(default)]
    pub related_embed_id: String,
    #[serde(default)]
    pub placeholder: String,
    #[serde(default)]
    pub ticket_channel_panel: String,
    #[serde(default)]
    pub config: TicketPanelConfig,
}

pub async fn load_panel(pool: &crate::db::Pool, guild_id: &str, panel_id: &str) -> TicketPanel {
    crate::db::kv_get(pool, guild_id, &panel_key(panel_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_panel(
    pool: &crate::db::Pool,
    guild_id: &str,
    panel_id: &str,
    panel: &TicketPanel,
) -> anyhow::Result<()> {
    crate::db::kv_set(
        pool,
        guild_id,
        &panel_key(panel_id),
        &serde_json::to_string(panel)?,
    )
    .await
}

pub fn panel_key(panel_id: &str) -> String {
    format!("GUILD.TICKET_PANEL.{panel_id}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "ticket",
    rename = "ticket",
    subcommands(
        "ticket_config",
        "ticket_panel",
        "ticket_panel_v2",
        "ticket_open",
        "ticket_close",
        "ticket_add",
        "ticket_remove",
        "ticket_log_channel",
        "ticket_set_category",
        "ticket_set_here",
        "ticket_delete",
        "ticket_remind",
        "ticket_rename",
        "ticket_transcript",
        "ticket_unlink"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn ticket_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.TICKET.disable",
        if enabled { "0" } else { "1" },
    )
    .await?;
    ctx.say(if enabled {
        "Tickets on."
    } else {
        "Tickets off."
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "panel")]
pub async fn ticket_panel(
    ctx: Ctx<'_>,
    #[description = "Panel name"] name: String,
    #[description = "Description"] description: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
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
        ..Default::default()
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &panel_key(&id),
        &serde_json::to_string(&panel)?,
    )
    .await?;
    ctx.say(format!("Ticket panel `{id}` created.")).await?;
    Ok(())
}

/// Setter for the ticket panel V2 flags.
#[poise::command(slash_command, prefix_command, rename = "panel-v2")]
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
    ctx.say(format!("Ticket panel `{}` updated.", panel_id.trim()))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "open")]
pub async fn ticket_open(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let author = ctx.author().id;
    let overwrites = vec![serenity::PermissionOverwrite {
        allow: serenity::Permissions::VIEW_CHANNEL | serenity::Permissions::SEND_MESSAGES,
        deny: serenity::Permissions::empty(),
        kind: serenity::PermissionOverwriteType::Member(author),
    }];
    let builder = serenity::CreateChannel::new(format!("ticket-{}", author.get()))
        .kind(serenity::ChannelType::Text)
        .permissions(overwrites);
    let ch = guild_id.create_channel(&ctx.http(), builder).await?;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("TICKET_ALL.{}.{}", author.get(), ch.id.get()),
        "open",
    )
    .await?;
    ctx.say(format!("Ticket opened: <#{}>.", ch.id.get()))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "close")]
pub async fn ticket_close(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors close.ts: HTML transcript to logs channel, then delete.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (html, count) =
        channel_transcript_html(&ctx.serenity_context().http.clone(), ctx.channel_id()).await;
    if let Some(logs) = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.TICKET.logs").await {
        if let Ok(ch_id) = logs.parse::<u64>() {
            let ch = serenity::ChannelId::new(ch_id);
            let _ = ch
                .send_message(
                    &ctx.http(),
                    serenity::CreateMessage::new()
                        .content(format!("Transcript ({count} messages)."))
                        .add_file(serenity::CreateAttachment::bytes(
                            html.into_bytes(),
                            "transcript.html",
                        )),
                )
                .await;
        }
    }
    ctx.channel_id().delete(&ctx.http()).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "add-member")]
pub async fn ticket_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let Some(channel) = ctx.guild_channel().await else {
        return Ok(());
    };
    channel
        .id
        .create_permission(
            &ctx.http(),
            serenity::PermissionOverwrite {
                allow: serenity::Permissions::VIEW_CHANNEL | serenity::Permissions::SEND_MESSAGES,
                deny: serenity::Permissions::empty(),
                kind: serenity::PermissionOverwriteType::Member(user.id),
            },
        )
        .await?;
    ctx.say(format!("{} added.", user.tag())).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "remove-member")]
pub async fn ticket_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let Some(channel) = ctx.guild_channel().await else {
        return Ok(());
    };
    channel
        .id
        .delete_permission(
            &ctx.http(),
            serenity::PermissionOverwriteType::Member(user.id),
        )
        .await?;
    ctx.say(format!("{} removed.", user.tag())).await?;
    Ok(())
}

/// Ticket logs channel. Mirrors !log-channel.ts (used by close transcript).
#[poise::command(slash_command, prefix_command, rename = "log-channel")]
pub async fn ticket_log_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.TICKET.logs",
        &channel.id.get().to_string(),
    )
    .await?;
    ctx.say("Ticket logs channel set.").await?;
    Ok(())
}

/// Default ticket category. Mirrors !set-category.ts.
#[poise::command(slash_command, prefix_command, rename = "set-category")]
pub async fn ticket_set_category(
    ctx: Ctx<'_>,
    #[description = "Category name"] name: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(&ctx.data().pool, &gid, "GUILD.TICKET.category", name.trim()).await?;
    ctx.say("Ticket category set.").await?;
    Ok(())
}

pub const TICKET_OPEN_CUSTOM_ID_PREFIX: &str = "ticket-open:";

/// Post the ticket panel message. Mirrors !set-here.ts: button opens a
/// ticket via the panel config.
#[poise::command(slash_command, prefix_command, rename = "set-here")]
pub async fn ticket_set_here(
    ctx: Ctx<'_>,
    #[description = "Panel name"] name: String,
    #[description = "Description"] description: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let id = format!(
        "{:x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(1)
            & 0xffffff
    );
    let panel = TicketPanel {
        name: name.clone(),
        description: description.clone().unwrap_or_default(),
        ..Default::default()
    };
    save_panel(&ctx.data().pool, &gid, &id, &panel).await?;
    let button = serenity::CreateButton::new(format!("{TICKET_OPEN_CUSTOM_ID_PREFIX}{id}"))
        .label("Open ticket")
        .style(serenity::ButtonStyle::Primary);
    ctx.channel_id()
        .send_message(
            &ctx.http(),
            serenity::CreateMessage::new()
                .embed(
                    serenity::CreateEmbed::default()
                        .title(name)
                        .description(description.unwrap_or_default()),
                )
                .button(button),
        )
        .await?;
    ctx.say(format!("Ticket panel `{id}` posted.")).await?;
    Ok(())
}

/// Component handler for panel open buttons. Creates the ticket channel
/// like ticket_open and records TICKET_ALL.
pub async fn handle_ticket_open_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(panel_id) = comp
        .data
        .custom_id
        .strip_prefix(TICKET_OPEN_CUSTOM_ID_PREFIX)
    else {
        return Ok(());
    };
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let panel = load_panel(pool, &gid, panel_id).await;
    let overwrites = vec![serenity::PermissionOverwrite {
        allow: serenity::Permissions::VIEW_CHANNEL | serenity::Permissions::SEND_MESSAGES,
        deny: serenity::Permissions::empty(),
        kind: serenity::PermissionOverwriteType::Member(comp.user.id),
    }];
    let mut builder = serenity::CreateChannel::new(format!("ticket-{}", comp.user.name))
        .kind(serenity::ChannelType::Text);
    if !panel.category_id.trim().is_empty() {
        if let Ok(cat) = panel.category_id.parse::<u64>() {
            builder = builder.category(serenity::ChannelId::new(cat));
        }
    }
    let ch = guild_id
        .create_channel(&ctx.http, builder.permissions(overwrites))
        .await?;
    crate::db::kv_set(
        pool,
        &gid,
        &format!("TICKET_ALL.{}.{}", comp.user.id.get(), ch.id.get()),
        "open",
    )
    .await?;
    let mut msg = format!("Ticket opened: <#{}>.", ch.id.get());
    if panel.config.ping_user {
        msg = format!("<@{}> {msg}", comp.user.id.get());
    }
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(msg)
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

/// Delete this ticket channel. Mirrors !delete.ts.
#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn ticket_delete(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.channel_id().delete(&ctx.http()).await?;
    Ok(())
}

/// Ping participants. Mirrors !remind.ts.
#[poise::command(slash_command, prefix_command, rename = "remind")]
pub async fn ticket_remind(
    ctx: Ctx<'_>,
    #[description = "Extra text"] text: Option<String>,
) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "@here {}",
        text.unwrap_or_else(|| "Update please.".to_string())
    ))
    .await?;
    Ok(())
}

/// Rename this ticket channel. Mirrors !rename.ts.
#[poise::command(slash_command, prefix_command, rename = "rename")]
pub async fn ticket_rename(
    ctx: Ctx<'_>,
    #[description = "New name"] name: String,
) -> Result<(), anyhow::Error> {
    ctx.channel_id()
        .edit(&ctx.http(), serenity::EditChannel::new().name(name.trim()))
        .await?;
    ctx.say("Ticket renamed.").await?;
    Ok(())
}

/// Post an HTML transcript here. Mirrors !transcript.ts.
#[poise::command(slash_command, prefix_command, rename = "transcript")]
pub async fn ticket_transcript(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let (html, count) =
        channel_transcript_html(&ctx.serenity_context().http.clone(), ctx.channel_id()).await;
    ctx.channel_id()
        .send_message(
            &ctx.http(),
            serenity::CreateMessage::new()
                .content(format!("Transcript ({count} messages)."))
                .add_file(serenity::CreateAttachment::bytes(
                    html.into_bytes(),
                    "transcript.html",
                )),
        )
        .await?;
    Ok(())
}

/// Unlink this channel from the ticket store. Mirrors !unlink.ts.
#[poise::command(slash_command, prefix_command, rename = "unlink")]
pub async fn ticket_unlink(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.%'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Ticket unlinked.").await?;
    Ok(())
}

/// Fixed custom ids of the in-ticket control message. Mirrors
/// CreateTicketChannel(V2) in ticketsManager.ts.
pub const TICKET_EMBED_DELETE: &str = "t-embed-delete-ticket";
pub const TICKET_EMBED_TRANSCRIPT: &str = "t-embed-transcript-ticket";
pub const TICKET_EMBED_SELECT_USER: &str = "t-embed-select-user";

/// Find the ticket row owning a channel. The Rust store keeps one kv
/// row per ticket (`TICKET_ALL.<user>.<channel>` with an `author`
/// field); returns (user_key, author_id). Mirrors the TICKET_ALL scan
/// in TicketDelete/TicketTranscript.
pub fn find_ticket_by_channel(
    entries: &[(String, String)],
    channel_id: &str,
) -> Option<(String, String)> {
    for (key, raw) in entries {
        let mut parts = key.split('.');
        if parts.next() != Some("TICKET_ALL") {
            continue;
        }
        let user = parts.next().unwrap_or("");
        let channel = parts.next().unwrap_or("");
        if parts.next().is_some() || user.is_empty() || channel != channel_id {
            continue;
        }
        let author = serde_json::from_str::<serde_json::Value>(raw)
            .ok()
            .and_then(|v| v.get("author").and_then(|a| a.as_str()).map(str::to_string))
            .unwrap_or_else(|| user.to_string());
        return Some((user.to_string(), author));
    }
    None
}

pub async fn load_ticket_entries(pool: &crate::db::Pool, gid: &str) -> Vec<(String, String)> {
    let keys: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.%'",
    )
    .bind(gid)
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut out = vec![];
    for key in keys {
        if let Some(raw) = crate::db::kv_get(pool, gid, &key).await {
            out.push((key, raw));
        }
    }
    out
}

/// Snapshot the last 100 messages of a channel as (html, count).
/// Shared by the close/transcript/delete ticket flows (mirrors
/// discord-html-transcripts usage in ticketsManager.ts).
pub async fn channel_transcript_html(
    http: &std::sync::Arc<serenity::Http>,
    channel_id: serenity::ChannelId,
) -> (String, usize) {
    let msgs = channel_id
        .messages(http, serenity::GetMessages::new().limit(100))
        .await
        .unwrap_or_default();
    let snap: Vec<crate::transcript::TranscriptMessage> = msgs
        .iter()
        .map(|m| crate::transcript::TranscriptMessage {
            author_tag: m.author.tag(),
            author_id: m.author.id.get(),
            content: m.content.clone(),
            timestamp_ms: m.timestamp.unix_timestamp() * 1000,
            attachments: m.attachments.iter().map(|a| a.url.clone()).collect(),
        })
        .collect();
    let html = crate::transcript::build_html("ticket", &snap);
    (html, snap.len())
}

async fn ticket_logs_channel(pool: &crate::db::Pool, gid: &str) -> Option<serenity::ChannelId> {
    crate::db::kv_get(pool, gid, "GUILD.TICKET.logs")
        .await
        .and_then(|s| s.parse::<u64>().ok())
        .map(serenity::ChannelId::new)
}

async fn dm_user(
    http: &std::sync::Arc<serenity::Http>,
    user_id: u64,
    msg: serenity::CreateMessage,
) -> bool {
    let Ok(user) = serenity::UserId::new(user_id).to_user(http).await else {
        return false;
    };
    user.direct_message(http, msg).await.is_ok()
}

/// Delete-button on the in-ticket control message. Mirrors
/// TicketDelete: drop the TICKET_ALL row, DM the transcript to the
/// owner when someone else deletes, log to GUILD.TICKET.logs, then
/// delete the channel.
pub async fn handle_ticket_embed_delete(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let channel_id = comp.channel_id;
    let entries = load_ticket_entries(pool, &gid).await;
    let Some((user_key, author)) = find_ticket_by_channel(&entries, &channel_id.get().to_string())
    else {
        return Ok(());
    };
    let author_id: u64 = author.parse().unwrap_or(0);
    let deleter_id = comp.user.id.get();
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(format!("TICKET_ALL.{user_key}.{}", channel_id.get()))
        .execute(pool)
        .await;
    let channel_name = channel_id
        .name(&ctx.http)
        .await
        .unwrap_or_else(|_| "ticket".to_string());
    if let Some(logs) = ticket_logs_channel(pool, &gid).await {
        let (html, _) = channel_transcript_html(&ctx.http, channel_id).await;
        let file_name = format!("{gid}-transcript.html");
        if author_id != 0 && author_id != deleter_id {
            let msg = crate::lang::get(&lang_code, "ticket_deleted")
                .unwrap_or_default()
                .replace("${ticketOwnerMention}", &format!("<@{author_id}>"))
                .replace("${deletedByUserId}", &deleter_id.to_string());
            let _ = dm_user(
                &ctx.http,
                author_id,
                serenity::CreateMessage::new().content(msg).add_file(
                    serenity::CreateAttachment::bytes(html.clone().into_bytes(), file_name.clone()),
                ),
            )
            .await;
        }
        let title = crate::lang::get(&lang_code, "event_ticket_logsChannel_onDelete_embed_title")
            .unwrap_or_default();
        let desc = crate::lang::get(&lang_code, "event_ticket_logsChannel_onDelete_embed_desc")
            .unwrap_or_default()
            .replace("${interaction.user}", &comp.user.to_string())
            .replace("${interaction.channel.name}", &channel_name);
        let embed = serenity::CreateEmbed::default()
            .colour(0x008000)
            .title(title)
            .description(desc)
            .timestamp(serenity::Timestamp::now());
        let _ = channel_id.delete(&ctx.http).await;
        let _ = logs
            .send_message(
                &ctx.http,
                serenity::CreateMessage::new().embed(embed).add_file(
                    serenity::CreateAttachment::bytes(html.into_bytes(), file_name),
                ),
            )
            .await;
    } else {
        let _ = channel_id.delete(&ctx.http).await;
    }
    Ok(())
}

/// Transcript-button on the in-ticket control message. Mirrors
/// TicketTranscript: ephemeral ack, then DM the HTML transcript to the
/// clicker (follow-up when DMs are closed).
pub async fn handle_ticket_embed_transcript(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let entries = load_ticket_entries(pool, &gid).await;
    if find_ticket_by_channel(&entries, &comp.channel_id.get().to_string()).is_none() {
        return Ok(());
    }
    let (html, _) = channel_transcript_html(&ctx.http, comp.channel_id).await;
    let ack = crate::lang::get(&lang_code, "guildconfig_config_save_check_dm").unwrap_or_default();
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(ack)
                .ephemeral(true),
        ),
    )
    .await?;
    let desc = crate::lang::get(&lang_code, "close_title_sourcebin").unwrap_or_default();
    let body = crate::lang::get(&lang_code, "transript_command_work").unwrap_or_default();
    let embed = serenity::CreateEmbed::default()
        .description(desc)
        .colour(0x0014A8);
    let sent = dm_user(
        &ctx.http,
        comp.user.id.get(),
        serenity::CreateMessage::new()
            .embed(embed)
            .content(body)
            .add_file(serenity::CreateAttachment::bytes(
                html.into_bytes(),
                format!("{gid}-transcript.html"),
            )),
    )
    .await;
    if !sent {
        let fail =
            crate::lang::get(&lang_code, "ticket_transcript_failed_to_send").unwrap_or_default();
        let _ = comp
            .create_followup(
                &ctx.http,
                serenity::CreateInteractionResponseFollowup::new()
                    .content(fail)
                    .ephemeral(true),
            )
            .await;
    }
    Ok(())
}

/// User-select menu on the in-ticket control message. Mirrors
/// TicketAddMember_2: only the ticket opener may use it; selected
/// users gain access, deselected members (other than the author) lose
/// it; changes are announced and logged.
pub async fn handle_ticket_select_user(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let channel_id = comp.channel_id;
    let owner_key = format!("TICKET_ALL.{}.{}", comp.user.id.get(), channel_id.get());
    let Some(owner_raw) = crate::db::kv_get(pool, &gid, &owner_key).await else {
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
            .await?;
        return Ok(());
    };
    let author = serde_json::from_str::<serde_json::Value>(&owner_raw)
        .ok()
        .and_then(|v| v.get("author").and_then(|a| a.as_str()).map(str::to_string))
        .unwrap_or_else(|| comp.user.id.get().to_string());
    let selected: Vec<String> = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::UserSelect { values } => {
            values.iter().map(|u| u.get().to_string()).collect()
        }
        _ => vec![],
    };
    let current: Vec<String> = match channel_id.to_channel(&ctx.http).await {
        Ok(serenity::Channel::Guild(gc)) => gc
            .permission_overwrites
            .iter()
            .filter_map(|o| match o.kind {
                serenity::PermissionOverwriteType::Member(uid) => Some(uid.get().to_string()),
                _ => None,
            })
            .collect(),
        _ => vec![],
    };
    let mut added: Vec<String> = vec![];
    let mut removed: Vec<String> = vec![];
    for id in &current {
        if !selected.contains(id) && *id != author {
            removed.push(id.clone());
            if let Ok(uid) = id.parse::<u64>() {
                let _ = channel_id
                    .delete_permission(
                        &ctx.http,
                        serenity::PermissionOverwriteType::Member(serenity::UserId::new(uid)),
                    )
                    .await;
            }
        }
    }
    for id in &selected {
        if !current.contains(id) {
            added.push(id.clone());
            if let Ok(uid) = id.parse::<u64>() {
                let _ = channel_id
                    .create_permission(
                        &ctx.http,
                        serenity::PermissionOverwrite {
                            allow: serenity::Permissions::VIEW_CHANNEL
                                | serenity::Permissions::SEND_MESSAGES
                                | serenity::Permissions::READ_MESSAGE_HISTORY
                                | serenity::Permissions::ATTACH_FILES,
                            deny: serenity::Permissions::empty(),
                            kind: serenity::PermissionOverwriteType::Member(serenity::UserId::new(
                                uid,
                            )),
                        },
                    )
                    .await;
            }
        }
    }
    let mentions = |ids: &[String]| {
        if ids.is_empty() {
            "None".to_string()
        } else {
            ids.iter()
                .map(|id| format!("<@{id}>"))
                .collect::<Vec<_>>()
                .join(" ")
        }
    };
    if !added.is_empty() {
        let msg = crate::lang::get(&lang_code, "event_ticket_add_member")
            .unwrap_or_default()
            .replace("${interaction.user}", &comp.user.to_string())
            .replace(
                "${addedMembers.map((memberId) => `<@${memberId}>`).join(' ')}",
                &mentions(&added),
            )
            .replace("${interaction.channel}", &format!("<#{channel_id}>"));
        let _ = channel_id.say(&ctx.http, msg).await;
    }
    if !removed.is_empty() {
        let msg = crate::lang::get(&lang_code, "event_ticket_del_member")
            .unwrap_or_default()
            .replace("${interaction.user}", &comp.user.to_string())
            .replace(
                "${removedMembers.map((memberId) => `<@${memberId}>`).join(' ')}",
                &mentions(&removed),
            )
            .replace("${interaction.channel}", &format!("<#{channel_id}>"));
        let _ = channel_id.say(&ctx.http, msg).await;
    }
    comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await?;
    if let Some(logs) = ticket_logs_channel(pool, &gid).await {
        let title = crate::lang::get(
            &lang_code,
            "event_ticket_logsChannel_onAddMember2_embed_title",
        )
        .unwrap_or_default();
        let desc = crate::lang::get(
            &lang_code,
            "event_ticket_logsChannel_onAddMember2_embed_desc",
        )
        .unwrap_or_default()
        .replace("${interaction.user}", &comp.user.to_string())
        .replace("${removedMembers}", &mentions(&removed))
        .replace("${addedMembers}", &mentions(&added))
        .replace("${interaction.channel}", &format!("<#{channel_id}>"));
        let embed = serenity::CreateEmbed::default()
            .colour(0x008000)
            .title(title)
            .description(desc)
            .timestamp(serenity::Timestamp::now());
        let _ = logs
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_panel_still_parses_with_v2_defaults() {
        let raw = r#"{"name":"help","description":"d","category_id":"123"}"#;
        let p: TicketPanel = serde_json::from_str(raw).unwrap();
        assert_eq!(p.name, "help");
        assert!(p.config.ping_user);
        assert!(p.config.delete_button);
        assert!(p.config.transcript_button);
        assert!(p.config.user_select_panel);
        assert!(p.config.roles_to_ping.is_empty());
        assert!(p.config.option_fields.is_empty());
        assert!(p.config.form.is_empty());
    }

    #[test]
    fn v2_panel_roundtrips() {
        let p = TicketPanel {
            panel_code: "ABC123".into(),
            placeholder: "pick".into(),
            config: TicketPanelConfig {
                roles_to_ping: vec!["11".into(), "22".into()],
                option_fields: vec![TicketOption {
                    name: "Support".into(),
                    value: "support".into(),
                    roles_to_ping: vec!["11".into()],
                    ..Default::default()
                }],
                ping_user: false,
                form: vec![TicketForm {
                    question_id: 1,
                    question_title: "Why?".into(),
                    question_placeholder: "tell us".into(),
                }],
                user_select_panel: true,
                delete_button: false,
                transcript_button: true,
            },
            ..Default::default()
        };
        let s = serde_json::to_string(&p).unwrap();
        let back: TicketPanel = serde_json::from_str(&s).unwrap();
        assert_eq!(p, back);
        assert_eq!(back.config.option_fields[0].roles_to_ping, vec!["11"]);
    }

    #[test]
    fn panel_key_shape() {
        assert_eq!(panel_key("XYZ"), "GUILD.TICKET_PANEL.XYZ");
    }

    #[test]
    fn find_ticket_by_channel_matches() {
        let entries = vec![
            (
                "TICKET_ALL.111.222".to_string(),
                r#"{"author":"111","alive":true}"#.to_string(),
            ),
            (
                "TICKET_ALL.333.444".to_string(),
                r#"{"author":"333"}"#.to_string(),
            ),
        ];
        assert_eq!(
            find_ticket_by_channel(&entries, "222"),
            Some(("111".to_string(), "111".to_string()))
        );
        assert_eq!(find_ticket_by_channel(&entries, "999"), None);
        assert_eq!(find_ticket_by_channel(&[], "222"), None);
    }

    #[test]
    fn find_ticket_by_channel_ignores_bad_rows() {
        let entries = vec![
            ("GUILD.TICKET.logs".to_string(), "123".to_string()),
            ("TICKET_ALL.111".to_string(), "{}".to_string()),
            ("TICKET_ALL.111.222.extra".to_string(), "{}".to_string()),
        ];
        assert_eq!(find_ticket_by_channel(&entries, "222"), None);
    }
}
