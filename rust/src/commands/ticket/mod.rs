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
#[serde(rename_all = "camelCase")]
pub struct TicketForm {
    #[serde(default)]
    pub question_id: u32,
    #[serde(default)]
    pub question_title: String,
    #[serde(default)]
    pub question_placeholder: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct TicketPanel {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    // TS writes `category`; alias keeps TS-written V2 rows parsing.
    #[serde(default, alias = "category")]
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

/// onAddMember / onRemoveMember logs embed + footer file + timestamp.
/// Mirrors TicketAddMember:1659 and TicketRemoveMember:1577.
#[allow(clippy::too_many_arguments)]
async fn post_ticket_member_log(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    channel_id: serenity::ChannelId,
    actor_mention: &str,
    member_mention: &str,
    added: bool,
) {
    let Some(logs) = ticket_logs_channel(pool, gid).await else {
        return;
    };
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let (title_key, desc_key) = if added {
        (
            "event_ticket_logsChannel_onAddMember_embed_title",
            "event_ticket_logsChannel_onAddMember_embed_desc",
        )
    } else {
        (
            "event_ticket_logsChannel_onRemoveMember_embed_title",
            "event_ticket_logsChannel_onRemoveMember_embed_desc",
        )
    };
    let desc = t(desc_key)
        .replace("${member}", member_mention)
        .replace("${interaction.user}", actor_mention)
        .replace("${interaction.channel.id}", &channel_id.get().to_string());
    let (footer_name, footer_icon) = ticket_footer(http, pool, gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(t(title_key))
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

pub const TICKET_OPEN_CUSTOM_ID_PREFIX: &str = "ticket-open:";

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
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    // One-ticket-per-user gate with stale-row cleanup, like the
    // already-opened check in CreateTicketChannel(V2). No disable
    // gate here: TS only guards the panel subcommand, not the button.
    if let Some(open_id) = live_user_ticket(&ctx.http, pool, &gid, comp.user.id.get()).await {
        let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let msg = render_already_opened(&t("event_ticket_already_opened"), &open_id);
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(msg)
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
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
    let chid = ch.id.get().to_string();
    let mut msg = crate::lang::get(&lang_code, "msg_ticket_opened")
        .map(|s| s.replace("{chid}", &chid))
        .unwrap_or_else(|| format!("Ticket opened: <#{chid}>."));
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

/// Drop every TICKET_ALL row of one user (flat `TICKET_ALL.<user>.*`
/// rows plus the nested `TICKET_ALL.<user>` object). Mirrors the
/// `db.delete(TICKET_ALL.<user>)` in TicketDelete.
async fn delete_user_ticket_rows(pool: &crate::db::Pool, gid: &str, user_key: &str) {
    let _ = sqlx::query(
        "DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.' || ? || '.%'",
    )
    .bind(gid)
    .bind(user_key)
    .execute(pool)
    .await;
    let _ = crate::db::kv_del(pool, gid, &format!("TICKET_ALL.{user_key}")).await;
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

/// Snapshot the full history of a channel as (html, count),
/// chronological. Shared by the close/transcript/delete ticket flows
/// (mirrors discord-html-transcripts createTranscript {limit: -1} in
/// ticketsManager.ts).
pub async fn channel_transcript_html(
    http: &std::sync::Arc<serenity::Http>,
    channel_id: serenity::ChannelId,
) -> (String, usize) {
    let mut all = vec![];
    let mut before: Option<serenity::MessageId> = None;
    loop {
        let mut query = serenity::GetMessages::new().limit(100);
        if let Some(cursor) = before {
            query = query.before(cursor);
        }
        let batch = channel_id.messages(http, query).await.unwrap_or_default();
        if batch.is_empty() {
            break;
        }
        let full = batch.len() == 100;
        before = batch.last().map(|m| m.id);
        all.extend(batch);
        if !full {
            break;
        }
    }
    // Newest-first pages -> chronological transcript.
    all.reverse();
    let snap: Vec<crate::transcript::TranscriptMessage> = all
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

/// Ticket module kill-switch. Mirrors the `GUILD.TICKET.disable`
/// guard in every ticket subcommand (Rust writes "0"/"1", TS writes
/// booleans, so both shapes count as disabled).
async fn ticket_disabled(pool: &crate::db::Pool, gid: &str) -> bool {
    crate::db::kv_get(pool, gid, "GUILD.TICKET.disable")
        .await
        .is_some_and(|v| v == "1" || v.eq_ignore_ascii_case("true"))
}

/// Say a language line with a static fallback.
async fn say_lang(ctx: &Ctx<'_>, lang_code: &str, key: &str, fallback: &str) {
    let msg = crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string());
    let _ = ctx.say(msg).await;
}

/// Disable gate shared by the ticket subcommands. Replies with the
/// caller-specific disabled line (TS uses `ticket_disabled_command`
/// on most paths, `open_disabled_command` on open/panel) and returns
/// true when the caller must stop.
async fn ticket_guard_disabled(
    ctx: &Ctx<'_>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    key: &str,
) -> bool {
    if ticket_disabled(pool, gid).await {
        say_lang(
            ctx,
            lang_code,
            key,
            "You cannot use this command because an administrator has disabled it",
        )
        .await;
        return true;
    }
    false
}

/// Channel is a ticket under either store shape: flat
/// `TICKET_ALL.<uid>.<channel>` rows or nested
/// `TICKET_ALL.<uid>` objects (`{<channel>: {channel, ...}}`).
/// Mirrors isTicketChannel in method.ts.
async fn is_ticket_channel(
    pool: &crate::db::Pool,
    gid: &str,
    channel_id: serenity::ChannelId,
) -> bool {
    let want = channel_id.get().to_string();
    let entries = load_ticket_entries(pool, gid).await;
    if find_ticket_by_channel(&entries, &want).is_some() {
        return true;
    }
    for (key, raw) in &entries {
        let mut parts = key.split('.');
        if parts.next() != Some("TICKET_ALL") {
            continue;
        }
        if parts.next().unwrap_or("").is_empty() || parts.next().is_some() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) {
            if let Some(obj) = v.as_object() {
                for (ch, data) in obj {
                    if ch == &want
                        || data.get("channel").and_then(|c| c.as_str()) == Some(want.as_str())
                    {
                        return true;
                    }
                }
            }
        }
    }
    false
}

/// Not-in-ticket gate (mirrors the isTicketChannel checks, one key
/// per subcommand in TS). Returns true when the caller must stop.
async fn ticket_guard_in_ticket(
    ctx: &Ctx<'_>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    channel_id: serenity::ChannelId,
    key: &str,
) -> bool {
    if !is_ticket_channel(pool, gid, channel_id).await {
        say_lang(
            ctx,
            lang_code,
            key,
            "You cannot use this command outside of a ticket channel!",
        )
        .await;
        return true;
    }
    false
}

/// Ticket owner id for a channel across both store shapes (flat row
/// author, else nested `{<channel>: {author, ...}}`).
fn ticket_owner_id(entries: &[(String, String)], channel_id: &str) -> Option<u64> {
    if let Some((_, author)) = find_ticket_by_channel(entries, channel_id) {
        if let Ok(id) = author.parse::<u64>() {
            if id != 0 {
                return Some(id);
            }
        }
    }
    for (key, raw) in entries {
        let mut parts = key.split('.');
        if parts.next() != Some("TICKET_ALL") {
            continue;
        }
        if parts.next().unwrap_or("").is_empty() || parts.next().is_some() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) {
            if let Some(obj) = v.as_object() {
                for (ch, data) in obj {
                    if ch == channel_id
                        || data.get("channel").and_then(|c| c.as_str()) == Some(channel_id)
                    {
                        if let Some(id) = data
                            .get("author")
                            .and_then(|a| a.as_str())
                            .and_then(|a| a.parse::<u64>().ok())
                            .filter(|id| *id != 0)
                        {
                            return Some(id);
                        }
                    }
                }
            }
        }
    }
    None
}

/// Live flat-shape ticket of a user: first channel row whose channel
/// still exists; stale rows are dropped (mirrors the TS channel fetch
/// + db.delete cleanup in CreateTicketChannel).
async fn live_flat_ticket(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    user_id: u64,
) -> Option<String> {
    let prefix = format!("TICKET_ALL.{user_id}.");
    let keys: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.' || ? || '.%'",
    )
    .bind(gid)
    .bind(user_id.to_string())
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    for key in keys {
        let ch = key.strip_prefix(&prefix).unwrap_or("");
        if ch.is_empty() || ch.contains('.') {
            continue;
        }
        let alive = ch
            .parse::<u64>()
            .ok()
            .map(serenity::ChannelId::new)
            .map(|c| async move { c.to_channel(http).await.is_ok() });
        if let Some(fut) = alive {
            if fut.await {
                return Some(ch.to_string());
            }
        }
        let _ = crate::db::kv_del(pool, gid, &key).await;
    }
    None
}

/// One-ticket-per-user gate across both store shapes (stale rows are
/// cleaned up inside). Returns the live channel id, like the TS
/// already-opened check in CreateTicketChannel(V2).
async fn live_user_ticket(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    user_id: u64,
) -> Option<String> {
    let nested_key = user_tickets_key(user_id);
    if let Some(open) = live_open_ticket(http, pool, gid, &nested_key).await {
        return Some(open);
    }
    live_flat_ticket(http, pool, gid, user_id).await
}

/// Config audit post to the `ihorizon-logs` channel (mirrors
/// ihorizon_logs.ts via crate::funcs::logs_channel_id, silent when
/// absent). `desc_key` uses the `${interaction.user.id}` slot.
async fn post_ticket_config_log(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    lang_code: &str,
    title_key: &str,
    desc_key: &str,
    actor_id: u64,
) {
    let Ok(channels) = guild_id.channels(http).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let embed = serenity::CreateEmbed::default()
        .title(t(title_key))
        .description(t(desc_key).replace("${interaction.user.id}", &actor_id.to_string()));
    let _ = serenity::ChannelId::new(log_id)
        .send_message(http, serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Delete only the row(s) owning one channel (flat exact key, plus
/// the matching sub-entry of a nested `TICKET_ALL.<uid>` object).
/// Mirrors deleteTicketChannelFromDatabase in method.ts: never wipes
/// the whole guild ticket store.
async fn delete_ticket_row(pool: &crate::db::Pool, gid: &str, channel_id: serenity::ChannelId) {
    let want = channel_id.get().to_string();
    let entries = load_ticket_entries(pool, gid).await;
    if let Some((user_key, _)) = find_ticket_by_channel(&entries, &want) {
        let _ = crate::db::kv_del(pool, gid, &format!("TICKET_ALL.{user_key}.{want}")).await;
    }
    for (key, raw) in &entries {
        let mut parts = key.split('.');
        if parts.next() != Some("TICKET_ALL") {
            continue;
        }
        if parts.next().unwrap_or("").is_empty() || parts.next().is_some() {
            continue;
        }
        let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) else {
            continue;
        };
        let Some(obj) = v.as_object() else {
            continue;
        };
        if !obj.keys().any(|ch| {
            ch == &want || obj[ch].get("channel").and_then(|c| c.as_str()) == Some(want.as_str())
        }) {
            continue;
        }
        let kept: serde_json::Map<String, serde_json::Value> = obj
            .iter()
            .filter(|(ch, data)| {
                *ch != &want && data.get("channel").and_then(|c| c.as_str()) != Some(want.as_str())
            })
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        if kept.is_empty() {
            let _ = crate::db::kv_del(pool, gid, key).await;
        } else {
            let _ = crate::db::kv_set(pool, gid, key, &serde_json::Value::Object(kept).to_string())
                .await;
        }
    }
}

/// First (panel) message id of a channel with a single fetch, like
/// `messages.fetch({after: "0", limit: 1})` in !unlink.ts.
async fn first_panel_message_id(
    http: &std::sync::Arc<serenity::Http>,
    channel_id: serenity::ChannelId,
) -> Option<serenity::MessageId> {
    channel_id
        .messages(
            http,
            serenity::GetMessages::new()
                .after(serenity::MessageId::new(1))
                .limit(1),
        )
        .await
        .ok()?
        .into_iter()
        .next()
        .map(|m| m.id)
}

/// Shared close pipeline: HTML transcript + logs embed, then delete
/// the channel. Mirrors CloseTicket (onClose keys) and
/// deleteTicketOnLeave (onDelete keys) in ticketsManager.ts.
/// `replacements` maps placeholder -> value for the desc template.
pub struct TicketCloseSpec<'a> {
    pub gid: &'a str,
    pub lang_code: &'a str,
    pub channel_id: serenity::ChannelId,
    pub title_key: &'a str,
    pub desc_key: &'a str,
    pub replacements: &'a [(&'a str, &'a str)],
    pub colour: u32,
}

pub async fn close_ticket_channel(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    spec: TicketCloseSpec<'_>,
) -> anyhow::Result<()> {
    let text = |k: &str| crate::lang::get(spec.lang_code, k).unwrap_or_default();
    let (html, _count) = channel_transcript_html(http, spec.channel_id).await;
    let mut desc = text(spec.desc_key);
    for (from, to) in spec.replacements {
        desc = desc.replace(from, to);
    }
    let embed = serenity::CreateEmbed::default()
        .colour(spec.colour)
        .title(text(spec.title_key))
        .description(desc)
        .timestamp(serenity::Timestamp::now());
    if let Some(logs) = ticket_logs_channel(pool, spec.gid).await {
        let _ = logs
            .send_message(
                http,
                serenity::CreateMessage::new().embed(embed).add_file(
                    serenity::CreateAttachment::bytes(
                        html.into_bytes(),
                        format!("{}-transcript.html", spec.gid),
                    ),
                ),
            )
            .await;
    }
    let _ = spec.channel_id.delete(http).await;
    Ok(())
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
    // TS TicketDelete drops the whole `TICKET_ALL.<user>` row up front.
    delete_user_ticket_rows(pool, &gid, &user_key).await;
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
        let (footer_name, footer_icon) = ticket_footer(&ctx.http, pool, &gid).await;
        let embed = ticket_embed_footer(
            serenity::CreateEmbed::default()
                .colour(0x008000)
                .title(title)
                .description(desc)
                .timestamp(serenity::Timestamp::now()),
            &footer_name,
            footer_icon.is_some(),
        );
        // TS deletes the channel before posting the logs embed.
        let _ = channel_id.delete(&ctx.http).await;
        let mut log_msg = serenity::CreateMessage::new().embed(embed).add_file(
            serenity::CreateAttachment::bytes(html.into_bytes(), file_name),
        );
        if let Some(icon) = footer_icon {
            log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
        }
        let _ = logs.send_message(&ctx.http, log_msg).await;
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
    // TS TicketTranscript replies, or edits the reply when the
    // interaction is already deferred: try the reply first, fall back
    // to editing the deferred response.
    if comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(&ack)
                    .ephemeral(true),
            ),
        )
        .await
        .is_err()
    {
        comp.edit_response(
            &ctx.http,
            serenity::EditInteractionResponse::new().content(ack),
        )
        .await?;
    }
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
    // Only the ticket opener may use the menu (TicketAddMember_2:1922):
    // defer first and stop otherwise. The owner resolves across both
    // store shapes.
    let entries = load_ticket_entries(pool, &gid).await;
    let is_owner = ticket_owner_id(&entries, &channel_id.get().to_string())
        .is_some_and(|id| id == comp.user.id.get());
    if !is_owner {
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
            .await?;
        return Ok(());
    }
    let author = comp.user.id.get().to_string();
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
        let (footer_name, footer_icon) = ticket_footer(&ctx.http, pool, &gid).await;
        let embed = ticket_embed_footer(
            serenity::CreateEmbed::default()
                .colour(0x008000)
                .title(title)
                .description(desc)
                .timestamp(serenity::Timestamp::now()),
            &footer_name,
            footer_icon.is_some(),
        );
        let mut log_msg = serenity::CreateMessage::new().embed(embed);
        if let Some(icon) = footer_icon {
            log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
        }
        let _ = logs.send_message(&ctx.http, log_msg).await;
    }
    Ok(())
}

/// Legacy TS panel-open compat: `open-new-ticket` (button) +
/// `ticket-open-selection` (select) from CreateTicketChannel in
/// core/modules/ticketsManager.ts. TS-posted panels still live in
/// guilds, so the verbatim ids keep working: marker-row check
/// (`GUILD.TICKET.<msg>` channel + message match), already-opened
/// gate with stale-row cleanup, optional reason modal, channel
/// create with everyone-deny/user-allow overwrites, opener embeds,
/// pin, creation log.
pub const LEGACY_OPEN_BUTTON_ID: &str = "open-new-ticket";
pub const LEGACY_SELECT_ID: &str = "ticket-open-selection";
pub const TICKET_REASON_MODAL_ID: &str = "ticket_reason_modal";
pub const TICKET_REASON_FIELD_ID: &str = "ticket_reason";

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LegacySelection {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub emojis: String,
    #[serde(default)]
    pub category_id: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LegacyPanelV1 {
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub used: bool,
    #[serde(default)]
    pub panel_name: String,
    #[serde(default)]
    pub reason: bool,
    #[serde(default)]
    pub channel: String,
    #[serde(rename = "messageID", default)]
    pub message_id: String,
    #[serde(default)]
    pub category_id: String,
    #[serde(default)]
    pub selection: Vec<LegacySelection>,
}

pub fn legacy_panel_key(message_id: u64) -> String {
    format!("GUILD.TICKET.{message_id}")
}

pub fn user_tickets_key(user_id: u64) -> String {
    format!("TICKET_ALL.{user_id}")
}

/// First ticket channel id from a TS nested `TICKET_ALL.<uid>`
/// object (`{<channel>: {channel, ...}}`), like
/// `Object.values(userTickets)[0]?.channel`.
pub fn first_ticket_channel(nested: &serde_json::Value) -> Option<String> {
    nested
        .as_object()?
        .values()
        .next()?
        .get("channel")?
        .as_str()
        .map(|s| s.to_string())
}

/// Selection whose numeric id matches the select value, like
/// `result.selection?.find((item) => item.id ===
/// parseInt(interaction.values[0]))`.
pub fn match_legacy_selection<'a>(
    selections: &'a [LegacySelection],
    value: &str,
) -> Option<&'a LegacySelection> {
    let want: i64 = value.trim().parse().ok()?;
    selections.iter().find(|s| s.id == want)
}

/// Parent category: select-matched `categoryId` ?? panel
/// `categoryId` ?? global `GUILD.TICKET.category`.
pub fn resolve_open_category(
    global: &str,
    panel: &str,
    selection: Option<&LegacySelection>,
) -> String {
    if let Some(sel) = selection {
        if !sel.category_id.trim().is_empty() {
            return sel.category_id.clone();
        }
    }
    if !panel.trim().is_empty() {
        return panel.to_string();
    }
    global.to_string()
}

pub fn render_already_opened(template: &str, channel_id: &str) -> String {
    template.replace("${channelId}", channel_id)
}

pub fn render_when_created(template: &str, user_mention: &str, channel_id: &str) -> String {
    template
        .replace("${interaction.user}", user_mention)
        .replace("${channel.id}", channel_id)
}

/// Select-path opener embed: `# Panel Name ```panel``` {msg}
/// ## Category ```cat````.
pub fn render_select_opener(
    template: &str,
    panel_name: &str,
    msg: &str,
    category_name: &str,
) -> String {
    template
        .replace("${result.panelName}", panel_name)
        .replace("{msg}", msg)
        .replace("{category}", category_name)
}

/// V2 form answers block: `## {placeholder}\n`{value}`\n` per answer.
pub fn render_form_answers(answers: &[(String, String)]) -> String {
    let mut desc = String::new();
    for (label, value) in answers {
        desc.push_str(&format!("## {label}\n`{value}`\n"));
    }
    desc
}

fn modal_reason(submit: &serenity::ModalInteraction) -> String {
    for row in &submit.data.components {
        if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first() {
            if input.custom_id == TICKET_REASON_FIELD_ID {
                return input.value.clone().unwrap_or_default();
            }
        }
    }
    String::new()
}

/// Footer (name + optional icon bytes) for ticket embeds. Mirrors
/// displayBotName.footerBuilder/footerAttachmentBuilder (stored
/// BOT.botName/BOT.botPFP, live bot avatar fallback).
async fn ticket_footer(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
) -> (String, Option<Vec<u8>>) {
    let stored_name = crate::db::kv_get(pool, gid, crate::commands::botcat::BOT_NAME_KEY).await;
    let name = crate::commands::botcat::bot_footer_name(stored_name.as_deref());
    let stored_pfp = crate::db::kv_get(pool, gid, crate::commands::botcat::BOT_PFP_KEY).await;
    let mut icon = crate::commands::botcat::footer_icon_bytes(stored_pfp.as_deref());
    if icon.is_none() {
        if let Ok(me) = http.get_current_user().await {
            icon = crate::commands::botcat::download_bytes(&me.face()).await;
        }
    }
    (name, icon)
}

fn ticket_embed_footer(
    embed: serenity::CreateEmbed,
    name: &str,
    with_icon: bool,
) -> serenity::CreateEmbed {
    let mut foot = serenity::CreateEmbedFooter::new(name.to_string());
    if with_icon {
        foot = foot.icon_url("attachment://footer_icon.png");
    }
    embed.footer(foot)
}

/// Live already-opened ticket channel for the nested
/// `TICKET_ALL.<uid>` row: a stale (deleted) channel row is dropped
/// like the TS channel fetch + db.delete, an alive channel id is
/// returned.
pub async fn live_open_ticket(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    tickets_key: &str,
) -> Option<String> {
    let nested: Option<serde_json::Value> = crate::db::kv_get(pool, gid, tickets_key)
        .await
        .and_then(|s| serde_json::from_str(&s).ok());
    let channel_id = nested.as_ref().and_then(first_ticket_channel)?;
    let alive = channel_id
        .parse::<u64>()
        .ok()
        .map(serenity::ChannelId::new)
        .map(|c| async move { c.to_channel(http).await.is_ok() });
    match alive {
        Some(fut) => {
            if fut.await {
                Some(channel_id)
            } else {
                let _ = crate::db::kv_del(pool, gid, tickets_key).await;
                None
            }
        }
        None => {
            let _ = crate::db::kv_del(pool, gid, tickets_key).await;
            None
        }
    }
}

/// Merge one ticket into the nested `TICKET_ALL.<uid>` object
/// (`{channel: {channel, author, alive}}`), like the TS db.set.
pub async fn record_open_ticket(
    pool: &crate::db::Pool,
    gid: &str,
    tickets_key: &str,
    uid: &str,
    channel_id: &str,
) {
    let mut obj = crate::db::kv_get(pool, gid, tickets_key)
        .await
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();
    obj.insert(
        channel_id.to_string(),
        serde_json::json!({"channel": channel_id, "author": uid, "alive": true}),
    );
    let _ = crate::db::kv_set(
        pool,
        gid,
        tickets_key,
        &serde_json::Value::Object(obj).to_string(),
    )
    .await;
}

/// Create a `ticket-<user>` text channel with the TS overwrite pair
/// (everyone deny view/send/history, opener full allow).
/// Delta: TS also lockPermissions() (parent sync); the explicit
/// overwrites above are the effective state.
pub async fn create_ticket_channel(
    guild_id: serenity::GuildId,
    http: &std::sync::Arc<serenity::Http>,
    username: &str,
    parent: Option<serenity::ChannelId>,
    member_id: serenity::UserId,
) -> anyhow::Result<serenity::GuildChannel> {
    let everyone = serenity::RoleId::new(guild_id.get());
    let overwrites = vec![
        serenity::PermissionOverwrite {
            allow: serenity::Permissions::empty(),
            deny: serenity::Permissions::VIEW_CHANNEL
                | serenity::Permissions::SEND_MESSAGES
                | serenity::Permissions::READ_MESSAGE_HISTORY,
            kind: serenity::PermissionOverwriteType::Role(everyone),
        },
        serenity::PermissionOverwrite {
            allow: serenity::Permissions::VIEW_CHANNEL
                | serenity::Permissions::SEND_MESSAGES
                | serenity::Permissions::READ_MESSAGE_HISTORY
                | serenity::Permissions::ATTACH_FILES
                | serenity::Permissions::USE_APPLICATION_COMMANDS
                | serenity::Permissions::SEND_VOICE_MESSAGES
                | serenity::Permissions::EMBED_LINKS,
            deny: serenity::Permissions::empty(),
            kind: serenity::PermissionOverwriteType::Member(member_id),
        },
    ];
    let mut builder = serenity::CreateChannel::new(format!("ticket-{username}"))
        .kind(serenity::ChannelType::Text)
        .permissions(overwrites);
    if let Some(cat) = parent {
        builder = builder.category(cat);
    }
    Ok(guild_id.create_channel(http, builder).await?)
}

/// Creation log to `GUILD.TICKET.logs` (#008000 + timestamp + footer
/// file). Mirrors the onCreationChannel embed.
pub async fn post_ticket_creation_log(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    user_mention: &str,
    channel_id: &str,
) {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let Some(logs) = ticket_logs_channel(pool, gid).await else {
        return;
    };
    let desc = t("event_ticket_logsChannel_onCreationChannel_embed_desc")
        .replace("${interaction.user}", user_mention)
        .replace("${channel.id}", channel_id);
    let (log_name, log_icon) = ticket_footer(http, pool, gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(0x008000))
            .title(t("event_ticket_logsChannel_onCreationChannel_embed_title"))
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &log_name,
        log_icon.is_some(),
    );
    let mut log_msg = serenity::CreateMessage::new().embed(embed);
    if let Some(icon) = log_icon {
        log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let _ = logs.send_message(http, log_msg).await;
}

/// Shared legacy open flow for the verbatim button (no value) and
/// select (chosen option value) ids.
pub async fn handle_legacy_ticket_open(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    selected: Option<String>,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let mid = comp.message.id.get();
    // Marker row must exist and match this channel + message.
    let row: Option<LegacyPanelV1> = crate::db::kv_get(pool, &gid, &legacy_panel_key(mid))
        .await
        .and_then(|s| serde_json::from_str(&s).ok());
    let Some(row) = row else { return Ok(()) };
    if row.channel != comp.channel_id.get().to_string() || row.message_id != mid.to_string() {
        return Ok(());
    }
    // Already-opened gate (stale row cleanup when the channel is
    // gone), like the TS channel fetch + db.delete.
    let tickets_key = user_tickets_key(comp.user.id.get());
    if let Some(open_id) = live_open_ticket(&ctx.http, pool, &gid, &tickets_key).await {
        let msg = render_already_opened(&t("event_ticket_already_opened"), &open_id);
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(msg)
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    // Optional reason modal (result.reason), else ephemeral defer.
    let mut reason = String::new();
    let mut modal_submit: Option<serenity::ModalInteraction> = None;
    if row.reason {
        let modal = serenity::CreateModal::new(
            TICKET_REASON_MODAL_ID,
            t("event_ticket_create_reason_modal_title"),
        )
        .components(vec![serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                t("event_ticket_create_reason_modal_fields_1_label"),
                TICKET_REASON_FIELD_ID,
            )
            .required(true)
            .min_length(8)
            .max_length(350),
        )]);
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) =
            crate::commands::await_modal_submit(ctx, comp, TICKET_REASON_MODAL_ID).await
        else {
            return Ok(());
        };
        reason = modal_reason(&submit);
        modal_submit = Some(submit);
    } else {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Defer(
                serenity::CreateInteractionResponseMessage::new().ephemeral(true),
            ),
        )
        .await?;
    }
    // Parent category: select match ?? panel ?? global.
    let global_cat = crate::db::kv_get(pool, &gid, "GUILD.TICKET.category")
        .await
        .unwrap_or_default();
    let selection = selected
        .as_deref()
        .and_then(|v| match_legacy_selection(&row.selection, v));
    let category = resolve_open_category(&global_cat, &row.category_id, selection);
    let parent = category
        .trim()
        .parse::<u64>()
        .ok()
        .map(serenity::ChannelId::new);
    let channel =
        create_ticket_channel(guild_id, &ctx.http, &comp.user.name, parent, comp.user.id).await?;
    let created_msg = render_when_created(
        &t("event_ticket_whenCreated_msg"),
        &comp.user.to_string(),
        &channel.id.get().to_string(),
    );
    if let Some(submit) = modal_submit {
        submit
            .create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(created_msg)
                        .ephemeral(true),
                ),
            )
            .await?;
    } else {
        comp.edit_response(
            &ctx.http,
            serenity::EditInteractionResponse::new().content(created_msg),
        )
        .await?;
    }
    // Opener embeds.
    let (footer_name, footer_icon) = ticket_footer(&ctx.http, pool, &gid).await;
    let with_icon = footer_icon.is_some();
    let mut opener: Vec<serenity::CreateEmbed> = vec![];
    if selected.is_some() {
        let msg = t("event_ticket_embed_description").replace("${user.username}", &comp.user.name);
        let desc = render_select_opener(
            &t("sethereticket_panel_select_embed_desc"),
            &row.panel_name,
            &msg,
            selection.map(|s| s.name.as_str()).unwrap_or(""),
        );
        opener.push(ticket_embed_footer(
            serenity::CreateEmbed::default()
                .colour(serenity::Colour::new(2829617))
                .description(desc),
            &footer_name,
            with_icon,
        ));
        if !reason.is_empty() {
            let desc = t("event_ticket_reason_embed_desc").replace("${reason}", &reason);
            opener.push(ticket_embed_footer(
                serenity::CreateEmbed::default()
                    .colour(serenity::Colour::new(2829617))
                    .description(desc),
                &footer_name,
                with_icon,
            ));
        }
    } else {
        let desc = t("event_ticket_embed_description").replace("${user.username}", &comp.user.name);
        opener.push(ticket_embed_footer(
            serenity::CreateEmbed::default()
                .colour(serenity::Colour::new(0x3b8f41))
                .description(desc),
            &footer_name,
            with_icon,
        ));
    }
    // TICKET_ALL nested write ({channel: {channel, author, alive}}).
    record_open_ticket(
        pool,
        &gid,
        &tickets_key,
        &comp.user.id.get().to_string(),
        &channel.id.get().to_string(),
    )
    .await;
    // Ticket channel message: user select + transcript/delete, pin.
    let select_row = serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            "t-embed-select-user",
            serenity::CreateSelectMenuKind::User {
                default_users: None,
            },
        )
        .placeholder(format!(
            "{} / {}",
            t("ticket_module_button_addmember"),
            t("ticket_module_button_removemember")
        ))
        .min_values(0)
        .max_values(10),
    );
    let buttons_row = serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new("t-embed-transcript-ticket")
            .emoji(serenity::ReactionType::Unicode("📜".to_string()))
            .label(t("ticket_module_button_transcript"))
            .style(serenity::ButtonStyle::Primary),
        serenity::CreateButton::new("t-embed-delete-ticket")
            .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
            .label(t("ticket_module_button_delete"))
            .style(serenity::ButtonStyle::Danger),
    ]);
    let mut post = serenity::CreateMessage::new()
        .content(comp.user.to_string())
        .embeds(opener)
        .components(vec![select_row, buttons_row]);
    if let Some(icon) = footer_icon {
        post = post.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    if let Ok(msg) = channel.id.send_message(&ctx.http, post).await {
        let _ = ctx
            .http
            .pin_message(channel.id, msg.id, Some("Ticket Panel"))
            .await;
    }
    // Creation log (GUILD.TICKET.logs, #008000 + timestamp + file).
    post_ticket_creation_log(
        &ctx.http,
        pool,
        &gid,
        &lang_code,
        &comp.user.to_string(),
        &channel.id.get().to_string(),
    )
    .await;
    Ok(())
}

/// V2 panel-open compat: `ticket-open-selection-v2` from
/// CreateTicketChannelV2 in ticketsManager.ts. Marker
/// (`GUILD.TICKET_PANEL.<msg>` -> panel code -> panel row),
/// already-opened gate, option match, form modal, loading line,
/// channel create, panel-embed override via EMBED rows.
pub const V2_SELECT_ID: &str = "ticket-open-selection-v2";

/// V2 option whose `value` matches the select choice, like
/// `result.config.optionFields?.find((item) => item.value ===
/// interaction.values[0])`.
pub fn match_v2_option<'a>(options: &'a [TicketOption], value: &str) -> Option<&'a TicketOption> {
    options.iter().find(|o| o.value == value)
}

/// V2 parent category: chosen `categoryId` || panel `category`.
pub fn resolve_v2_category(panel_category: &str, chosen: Option<&TicketOption>) -> String {
    if let Some(opt) = chosen {
        if !opt.category_id.trim().is_empty() {
            return opt.category_id.clone();
        }
    }
    panel_category.to_string()
}

/// Preview input for the V2 panel-embed hack (arity struct, like
/// the other shared specs).
pub struct EmbedPreview<'a> {
    pub template: &'a str,
    pub username: &'a str,
    pub mention: &'a str,
    pub member_count: u64,
    pub guild_name: &'a str,
    pub created_relative: &'a str,
    pub created_date: &'a str,
    pub category: &'a str,
}

/// Embed-source preview for the V2 panel-embed hack. Mirrors
/// generateCustomMessagePreview (member/guild slots resolved,
/// intimate slots keep TS literal defaults) + `{category}`.
pub fn preview_embed_source(p: &EmbedPreview) -> String {
    crate::events::render_join_dm(
        p.template,
        p.username,
        p.mention,
        p.member_count,
        p.guild_name,
    )
    .replace("{memberCount}", &p.member_count.to_string())
    .replace("{createdAt}", p.created_date)
    .replace("{accountCreationTimestamp}", p.created_relative)
    .replace("{category}", p.category)
}

/// Stored embed JSON -> builder. Covers the keys the TS
/// EmbedBuilder.from round-trips (title/desc/color/fields/footer/
/// author/image/thumbnail/url/timestamp).
pub fn create_embed_from_value(v: &serde_json::Value) -> Option<serenity::CreateEmbed> {
    if !v.is_object() {
        return None;
    }
    let mut embed = serenity::CreateEmbed::default();
    if let Some(s) = v.get("title").and_then(|x| x.as_str()) {
        embed = embed.title(s.to_string());
    }
    if let Some(s) = v.get("description").and_then(|x| x.as_str()) {
        embed = embed.description(s.to_string());
    }
    if let Some(c) = v.get("color").and_then(|x| x.as_u64()) {
        embed = embed.colour(serenity::Colour::new(c as u32));
    }
    if let Some(fields) = v.get("fields").and_then(|x| x.as_array()) {
        for f in fields {
            let name = f.get("name").and_then(|x| x.as_str()).unwrap_or("");
            let value = f.get("value").and_then(|x| x.as_str()).unwrap_or("");
            let inline = f.get("inline").and_then(|x| x.as_bool()).unwrap_or(false);
            embed = embed.field(name.to_string(), value.to_string(), inline);
        }
    }
    if let Some(footer) = v.get("footer").and_then(|x| x.as_object()) {
        let mut foot = serenity::CreateEmbedFooter::new(
            footer
                .get("text")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string(),
        );
        if let Some(icon) = footer.get("icon_url").and_then(|x| x.as_str()) {
            foot = foot.icon_url(icon.to_string());
        }
        embed = embed.footer(foot);
    }
    if let Some(author) = v.get("author").and_then(|x| x.as_object()) {
        let mut auth = serenity::CreateEmbedAuthor::new(
            author
                .get("name")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string(),
        );
        if let Some(icon) = author.get("icon_url").and_then(|x| x.as_str()) {
            auth = auth.icon_url(icon.to_string());
        }
        if let Some(url) = author.get("url").and_then(|x| x.as_str()) {
            auth = auth.url(url.to_string());
        }
        embed = embed.author(auth);
    }
    if let Some(url) = v
        .get("image")
        .and_then(|x| x.get("url"))
        .and_then(|x| x.as_str())
    {
        embed = embed.image(url.to_string());
    }
    if let Some(url) = v
        .get("thumbnail")
        .and_then(|x| x.get("url"))
        .and_then(|x| x.as_str())
    {
        embed = embed.thumbnail(url.to_string());
    }
    if let Some(url) = v.get("url").and_then(|x| x.as_str()) {
        embed = embed.url(url.to_string());
    }
    if let Some(ts) = v.get("timestamp").and_then(|x| x.as_str()) {
        if let Ok(stamp) = serenity::Timestamp::parse(ts) {
            embed = embed.timestamp(stamp);
        }
    }
    Some(embed)
}

/// V2 opener description: panel `placeholder` in the
/// `${result.panelName}` slot (TS quirk), welcome text, category.
pub fn render_v2_opener(template: &str, placeholder: &str, msg: &str, category: &str) -> String {
    template
        .replace("${result.panelName}", placeholder)
        .replace("{msg}", msg)
        .replace("{category}", category)
}

/// V2 ticket message content: opener mention when pingUser, plus
/// `<@&role>` pings from the option and the panel, each role followed
/// by a space. None when empty (TS sends undefined). Mirrors
/// CreateChannelV2:1305 (`content = mention`, then
/// `content += `<@&${role}> `` per role).
pub fn v2_content(ping_user: bool, user_mention: &str, roles: &[String]) -> Option<String> {
    let mut content = String::new();
    if ping_user {
        content.push_str(user_mention);
    }
    for role in roles {
        content.push_str(&format!("<@&{role}> "));
    }
    if content.is_empty() {
        None
    } else {
        Some(content)
    }
}

fn modal_text_value(submit: &serenity::ModalInteraction, field_id: &str) -> String {
    for row in &submit.data.components {
        if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first() {
            if input.custom_id == field_id {
                return input.value.clone().unwrap_or_default();
            }
        }
    }
    String::new()
}

/// Shared V2 open flow for the verbatim `ticket-open-selection-v2`
/// select.
pub async fn handle_v2_ticket_open(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    selected: &str,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    // Marker: GUILD.TICKET_PANEL.<msg> -> code -> panel row.
    let mid = comp.message.id.get();
    let code_raw = crate::db::kv_get(pool, &gid, &panel_key(&mid.to_string())).await;
    let Some(code_raw) = code_raw else {
        return Ok(());
    };
    let code: String = serde_json::from_str::<String>(&code_raw)
        .unwrap_or_else(|_| code_raw.trim().trim_matches('"').to_string());
    if code.is_empty() {
        return Ok(());
    }
    let panel = load_panel(pool, &gid, &code).await;
    if panel.panel_code.is_empty() && panel.placeholder.is_empty() {
        return Ok(());
    }
    // Already-opened gate with stale-row cleanup.
    let tickets_key = user_tickets_key(comp.user.id.get());
    if let Some(open_id) = live_open_ticket(&ctx.http, pool, &gid, &tickets_key).await {
        let msg = render_already_opened(&t("event_ticket_already_opened"), &open_id);
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(msg)
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let chosen = match_v2_option(&panel.config.option_fields, selected);
    let category = resolve_v2_category(&panel.category_id, chosen);
    let chosen_name = chosen.map(|o| o.name.as_str()).unwrap_or("");
    // Form modal: chosen form ?? panel form (title uses the reason
    // label like TS, fields Short/required/1..240, label 45 chars,
    // placeholder 60 chars).
    let forms: &[TicketForm] = match chosen {
        Some(o) if !o.form.is_empty() => &o.form,
        _ => &panel.config.form,
    };
    let mut answers: Vec<(String, String)> = vec![];
    let mut modal_submit: Option<serenity::ModalInteraction> = None;
    if !forms.is_empty() {
        let fields = forms
            .iter()
            .map(|f| {
                serenity::CreateActionRow::InputText(
                    serenity::CreateInputText::new(
                        serenity::InputTextStyle::Short,
                        f.question_title.chars().take(45).collect::<String>(),
                        f.question_id.to_string(),
                    )
                    .placeholder(f.question_placeholder.chars().take(60).collect::<String>())
                    .required(true)
                    .min_length(1)
                    .max_length(240),
                )
            })
            .collect::<Vec<_>>();
        let modal = serenity::CreateModal::new(
            TICKET_REASON_MODAL_ID,
            t("event_ticket_create_reason_modal_fields_1_label"),
        )
        .components(fields);
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) =
            crate::commands::await_modal_submit(ctx, comp, TICKET_REASON_MODAL_ID).await
        else {
            return Ok(());
        };
        for f in forms {
            let value = modal_text_value(&submit, &f.question_id.to_string());
            answers.push((f.question_title.clone(), value));
        }
        modal_submit = Some(submit);
    }
    // Loading line on the modal submit or the component.
    let loading = crate::emojis::app_emoji_markup(&ctx.http, "Discord_Loading").await;
    if let Some(submit) = &modal_submit {
        match loading.clone() {
            Some(markup) => {
                submit
                    .create_response(
                        &ctx.http,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(markup)
                                .ephemeral(true),
                        ),
                    )
                    .await?;
            }
            None => {
                submit.defer_ephemeral(&ctx.http).await?;
            }
        }
    } else {
        match loading {
            Some(markup) => {
                comp.create_response(
                    &ctx.http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(markup)
                            .ephemeral(true),
                    ),
                )
                .await?;
            }
            None => {
                comp.create_response(
                    &ctx.http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new().ephemeral(true),
                    ),
                )
                .await?;
            }
        }
    }
    let parent = category
        .trim()
        .parse::<u64>()
        .ok()
        .map(serenity::ChannelId::new);
    let channel =
        create_ticket_channel(guild_id, &ctx.http, &comp.user.name, parent, comp.user.id).await?;
    let created_msg = render_when_created(
        &t("event_ticket_whenCreated_msg"),
        &comp.user.to_string(),
        &channel.id.get().to_string(),
    );
    match modal_submit {
        Some(submit) => {
            submit
                .edit_response(
                    &ctx.http,
                    serenity::EditInteractionResponse::new().content(created_msg),
                )
                .await?;
        }
        None => {
            comp.edit_response(
                &ctx.http,
                serenity::EditInteractionResponse::new().content(created_msg),
            )
            .await?;
        }
    }
    // Opener embeds: panel-embed override (chosen panelId ??
    // ticketChannelPanel) else the default select-desc embed.
    let (footer_name, footer_icon) = ticket_footer(&ctx.http, pool, &gid).await;
    let msg = t("event_ticket_embed_description").replace("${user.username}", &comp.user.name);
    let og_desc = render_v2_opener(
        &t("sethereticket_panel_select_embed_desc"),
        &panel.placeholder,
        &msg,
        chosen_name,
    );
    let panel_embed_id = chosen
        .and_then(|o| {
            if o.panel_id.trim().is_empty() {
                None
            } else {
                Some(o.panel_id.clone())
            }
        })
        .or_else(|| {
            if panel.ticket_channel_panel.trim().is_empty() {
                None
            } else {
                Some(panel.ticket_channel_panel.clone())
            }
        });
    // Live guild facts for the preview hack (best-effort).
    let (guild_name, member_count) = guild_id
        .to_guild_cached(&ctx.cache)
        .map(|g| (g.name.clone(), g.member_count))
        .unwrap_or_default();
    let created_at = comp.user.created_at().unix_timestamp();
    // Real account-creation date for the {createdAt} slot (TS:
    // user.createdAt.toLocaleDateString(guildLocale), en-US shape
    // M/D/YYYY).
    let created_date = chrono::DateTime::from_timestamp(created_at, 0)
        .map(|dt| {
            use chrono::Datelike;
            let d = dt.naive_utc().date();
            format!("{}/{}/{}", d.month(), d.day(), d.year())
        })
        .unwrap_or_default();
    let mut opener: Vec<serenity::CreateEmbed> = vec![];
    let mut with_file = false;
    if let Some(embed_id) = panel_embed_id {
        let stored: Option<serde_json::Value> =
            crate::db::kv_get(pool, &gid, &format!("EMBED.{embed_id}"))
                .await
                .and_then(|s| serde_json::from_str(&s).ok())
                .and_then(|v: serde_json::Value| v.get("embedSource").cloned());
        let previewed = stored.map(|src| {
            preview_embed_source(&EmbedPreview {
                template: &src.to_string(),
                username: &comp.user.name,
                mention: &comp.user.to_string(),
                member_count,
                guild_name: &guild_name,
                created_relative: &format!("<t:{created_at}:R>"),
                created_date: &created_date,
                category: chosen_name,
            })
        });
        let parsed = previewed.and_then(|s| {
            serde_json::from_str::<serde_json::Value>(&s)
                .ok()
                .and_then(|v| create_embed_from_value(&v))
        });
        match parsed {
            Some(embed) => opener.push(embed),
            None => {
                opener.push(ticket_embed_footer(
                    serenity::CreateEmbed::default()
                        .colour(serenity::Colour::new(2829617))
                        .description(og_desc),
                    &footer_name,
                    footer_icon.is_some(),
                ));
                with_file = footer_icon.is_some();
            }
        }
    } else {
        opener.push(ticket_embed_footer(
            serenity::CreateEmbed::default()
                .colour(serenity::Colour::new(2829617))
                .description(og_desc),
            &footer_name,
            footer_icon.is_some(),
        ));
        with_file = footer_icon.is_some();
    }
    if !answers.is_empty() {
        opener.push(ticket_embed_footer(
            serenity::CreateEmbed::default()
                .colour(serenity::Colour::new(2829617))
                .description(render_form_answers(&answers)),
            &footer_name,
            footer_icon.is_some(),
        ));
    }
    record_open_ticket(
        pool,
        &gid,
        &tickets_key,
        &comp.user.id.get().to_string(),
        &channel.id.get().to_string(),
    )
    .await;
    // Components: user select unless disabled, delete/transcript
    // per config; content: pingUser + rolesToPing (option + panel).
    let mut components: Vec<serenity::CreateActionRow> = vec![];
    if panel.config.user_select_panel {
        components.push(serenity::CreateActionRow::SelectMenu(
            serenity::CreateSelectMenu::new(
                "t-embed-select-user",
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(format!(
                "{} / {}",
                t("ticket_module_button_addmember"),
                t("ticket_module_button_removemember")
            ))
            .min_values(0)
            .max_values(10),
        ));
    }
    let mut buttons: Vec<serenity::CreateButton> = vec![];
    if panel.config.delete_button {
        buttons.push(
            serenity::CreateButton::new("t-embed-delete-ticket")
                .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
                .label(t("ticket_module_button_delete"))
                .style(serenity::ButtonStyle::Danger),
        );
    }
    if panel.config.transcript_button {
        buttons.push(
            serenity::CreateButton::new("t-embed-transcript-ticket")
                .emoji(serenity::ReactionType::Unicode("📜".to_string()))
                .label(t("ticket_module_button_transcript"))
                .style(serenity::ButtonStyle::Primary),
        );
    }
    if !buttons.is_empty() {
        components.push(serenity::CreateActionRow::Buttons(buttons));
    }
    let mut roles: Vec<String> = chosen.map(|o| o.roles_to_ping.clone()).unwrap_or_default();
    roles.extend(panel.config.roles_to_ping.clone());
    let mut post = serenity::CreateMessage::new()
        .embeds(opener)
        .components(components);
    if let Some(content) = v2_content(panel.config.ping_user, &comp.user.to_string(), &roles) {
        post = post.content(content);
    }
    if with_file {
        if let Some(icon) = footer_icon {
            post = post.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
        }
    }
    if let Ok(msg) = channel.id.send_message(&ctx.http, post).await {
        let _ = ctx
            .http
            .pin_message(channel.id, msg.id, Some("Ticket Panel"))
            .await;
    }
    post_ticket_creation_log(
        &ctx.http,
        pool,
        &gid,
        &lang_code,
        &comp.user.to_string(),
        &channel.id.get().to_string(),
    )
    .await;
    Ok(())
}

pub mod add_member;
pub mod close;
pub mod config;
pub mod delete;
pub mod log_channel;
pub mod open;
pub mod panel;
pub mod remind;
pub mod remove_member;
pub mod rename;
pub mod set_category;
pub mod set_here;
#[allow(clippy::module_inception)]
pub mod ticket;
pub mod transcript;
pub mod unlink;

/// Old registry path (`ticket::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::add_member::*;
    pub use super::close::*;
    pub use super::config::*;
    pub use super::delete::*;
    pub use super::log_channel::*;
    pub use super::open::*;
    pub use super::panel::*;
    pub use super::remind::*;
    pub use super::remove_member::*;
    pub use super::rename::*;
    pub use super::set_category::*;
    pub use super::set_here::*;
    pub use super::ticket::*;
    pub use super::transcript::*;
    pub use super::unlink::*;
    pub use super::*;
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

    #[test]
    fn legacy_panel_parses_ts_shape() {
        let raw = r#"{"author":"1","used":true,"panelName":"Help","reason":true,"channel":"10","messageID":"20","categoryId":"30","selection":[{"id":0,"name":"General","emojis":"🎫","categoryId":"40"}]}"#;
        let p: LegacyPanelV1 = serde_json::from_str(raw).unwrap();
        assert_eq!(p.panel_name, "Help");
        assert!(p.reason);
        assert_eq!(p.message_id, "20");
        assert_eq!(p.selection[0].category_id, "40");
        assert_eq!(legacy_panel_key(20), "GUILD.TICKET.20");
        assert_eq!(user_tickets_key(7), "TICKET_ALL.7");
    }

    #[test]
    fn legacy_open_helpers_match_ts() {
        let v: serde_json::Value =
            serde_json::from_str(r#"{"99":{"channel":"99","author":"7","alive":true}}"#).unwrap();
        assert_eq!(first_ticket_channel(&v), Some("99".to_string()));
        assert_eq!(first_ticket_channel(&serde_json::json!({})), None);
        assert_eq!(first_ticket_channel(&serde_json::json!([])), None);
        let sels = vec![
            LegacySelection {
                id: 0,
                name: "A".into(),
                ..Default::default()
            },
            LegacySelection {
                id: 2,
                name: "B".into(),
                category_id: "c".into(),
                ..Default::default()
            },
        ];
        assert_eq!(match_legacy_selection(&sels, "2").unwrap().name, "B");
        assert!(match_legacy_selection(&sels, "1").is_none());
        assert!(match_legacy_selection(&sels, "x").is_none());
        assert_eq!(resolve_open_category("g", "p", Some(&sels[1])), "c");
        assert_eq!(resolve_open_category("g", "p", Some(&sels[0])), "p");
        assert_eq!(resolve_open_category("g", "p", None), "p");
        assert_eq!(resolve_open_category("g", "", None), "g");
        assert_eq!(
            render_already_opened("open <#${channelId}>!", "5"),
            "open <#5>!"
        );
        assert_eq!(
            render_when_created("<@u> see <#${channel.id}>!", "<@u>", "9"),
            "<@u> see <#9>!"
        );
        let desc = render_select_opener(
            "# Panel Name\n```${result.panelName}```\n{msg}\n\n## Category\n```{category}```\n",
            "P",
            "M",
            "C",
        );
        assert!(desc.contains("```P```") && desc.contains('M') && desc.contains("```C```"));
        let answers = vec![("Q".to_string(), "A".to_string())];
        assert_eq!(render_form_answers(&answers), "## Q\n`A`\n");
        // TS-written V2 panel parses (camelCase + category alias).
        let raw = r#"{"panelCode":"X","placeholder":"pick","category":"77","config":{"rolesToPing":[],"optionFields":[],"pingUser":true,"form":[],"userSelectPanel":true,"deleteButton":true,"transcriptButton":true}}"#;
        let p: TicketPanel = serde_json::from_str(raw).unwrap();
        assert_eq!(p.panel_code, "X");
        assert_eq!(p.category_id, "77");
    }

    #[test]
    fn v2_open_helpers_match_ts() {
        let opts = vec![
            TicketOption {
                name: "Support".into(),
                value: "support".into(),
                category_id: "c1".into(),
                ..Default::default()
            },
            TicketOption {
                name: "Other".into(),
                value: "other".into(),
                ..Default::default()
            },
        ];
        assert_eq!(match_v2_option(&opts, "support").unwrap().name, "Support");
        assert!(match_v2_option(&opts, "nope").is_none());
        assert_eq!(resolve_v2_category("pc", Some(&opts[0])), "c1");
        assert_eq!(resolve_v2_category("pc", Some(&opts[1])), "pc");
        assert_eq!(resolve_v2_category("pc", None), "pc");
        // Opener uses the placeholder in the panelName slot.
        let desc = render_v2_opener("```${result.panelName}``` {msg} {category}", "PH", "M", "C");
        assert!(desc.contains("```PH```") && desc.contains('M') && desc.contains('C'));
        // Content mirrors CreateChannelV2: mention then `<@&r> ` per
        // role (trailing space), None when empty.
        assert_eq!(
            v2_content(true, "<@1>", &["2".to_string()]),
            Some("<@1><@&2> ".to_string())
        );
        assert_eq!(v2_content(false, "<@1>", &[]), None);
        assert_eq!(
            v2_content(false, "<@1>", &["2".to_string(), "3".to_string()]),
            Some("<@&2> <@&3> ".to_string())
        );
        // Preview resolves member/guild slots + category, keeps
        // intimate literals like render_join_dm.
        let out = preview_embed_source(&EmbedPreview {
            template: "{memberUsername} {guildName} {category} {inviterUsername}",
            username: "U",
            mention: "<@U>",
            member_count: 42,
            guild_name: "G",
            created_relative: "<t:1:R>",
            created_date: "d",
            category: "Cat",
        });
        assert!(out.contains("U") && out.contains('G') && out.contains("Cat"));
        assert!(out.contains("unknow_user"));
        // Stored embed JSON round-trips the common keys (incl. timestamp).
        let v: serde_json::Value = serde_json::from_str(
            r#"{"title":"T","description":"D","color":2829617,"fields":[{"name":"N","value":"V","inline":true}],"footer":{"text":"F"},"author":{"name":"A"},"image":{"url":"i"},"thumbnail":{"url":"t"},"url":"u","timestamp":"2024-01-02T03:04:05.000Z"}"#,
        )
        .unwrap();
        assert!(create_embed_from_value(&v).is_some());
        assert!(create_embed_from_value(&serde_json::json!([1, 2])).is_none());
    }
}
