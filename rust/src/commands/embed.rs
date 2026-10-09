// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Interactive embed builder. Mirrors
// src/Interaction/HybridCommands/utils/!embed.ts (EmbedManager: select
// menu actions 0-13 + save/send/replace/cancel + channel pick).
//
// TS keeps the draft in a stateful EmbedManager behind collectors; the
// port is stateless (welcomer-panel precedent): the draft lives in
// EMBED_DRAFT.<builder_msg_id>, text/media inputs arrive via
// EMBED_AWAIT.<user_id> consumed by the message() hook. Collector
// timeouts (1_420_000 ms) have no stateless equivalent — drafts persist
// until saved, sent or cancelled. Button ids are namespaced
// (embed:save/...) because bare "save"/"send" are unsafe in the shared
// component router; the select + channel-select ids stay TS-verbatim.
//
// TS keys: EMBED.<id> {embedOwner, embedSource}.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// TS-verbatim select + channel-picker ids.
pub const EMBED_SELECT_ID: &str = "embed-select-menu";
pub const EMBED_SAVE_CHANNEL_ID: &str = "embed-save-channel";
/// Namespaced button ids (TS uses bare save/send/replace/cancel).
pub const EMBED_BTN_PREFIX: &str = "embed:";

pub fn draft_key(builder_msg_id: u64) -> String {
    format!("EMBED_DRAFT.{builder_msg_id}")
}

pub fn await_key(user_id: u64) -> String {
    format!("EMBED_AWAIT.{user_id}")
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DraftFile {
    pub name: String,
    pub base64: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EmbedDraftState {
    pub owner: String,
    pub embed: serde_json::Value,
    /// footer | image | thumbnail file payloads.
    pub files: HashMap<String, DraftFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbedAwait {
    pub builder: u64,
    pub channel: u64,
    pub prompt: u64,
    /// "0".."13" select actions, or "replace".
    pub action: String,
}

/// Default draft (mirrors `new EmbedBuilder().setDescription("** **")`).
pub fn empty_embed() -> serde_json::Value {
    serde_json::json!({"description": "** **"})
}

/// Parse a Discord message URL. Mirrors extractDiscordUrlParts
/// (channels/<guild|@me>/<channel>/<message>).
pub fn extract_url_parts(url: &str) -> Option<(String, String, String)> {
    let rest = url.trim().strip_prefix("https://")?;
    let rest = rest.strip_prefix("discord.com/")?;
    let segs: Vec<&str> = rest.split('/').filter(|s| !s.is_empty()).collect();
    if segs.len() < 4 || segs[0] != "channels" {
        return None;
    }
    Some((
        segs[1].to_string(),
        segs[2].to_string(),
        segs[3].to_string(),
    ))
}

fn obj_mut(
    embed: &mut serde_json::Value,
) -> Option<&mut serde_json::Map<String, serde_json::Value>> {
    if !embed.is_object() {
        *embed = serde_json::json!({});
    }
    embed.as_object_mut()
}

fn set_str(embed: &mut serde_json::Value, key: &str, value: &str) {
    if let Some(o) = obj_mut(embed) {
        o.insert(
            key.to_string(),
            serde_json::Value::String(value.to_string()),
        );
    }
}

fn clear_key(embed: &mut serde_json::Value, key: &str) {
    if let Some(o) = obj_mut(embed) {
        o.remove(key);
    }
}

/// Hex (#rrggbb / #rgb / bare) to Discord color int.
pub fn parse_hex_color(raw: &str) -> Option<u32> {
    let hex = raw.trim().strip_prefix('#').unwrap_or(raw.trim());
    let full = match hex.len() {
        3 => hex.chars().flat_map(|c| [c, c]).collect::<String>(),
        6 => hex.to_string(),
        _ => return None,
    };
    if !full.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    u32::from_str_radix(&full, 16).ok()
}

/// Text actions from the select menu. Mirrors chooseAction cases
/// 1/3/5/7 (set) — clears and gated/media actions live in the Discord
/// layer. Returns false when the input is rejected (action 11 with a
/// non-link, mirroring the TS silent ignore).
pub fn apply_text_action(state: &mut EmbedDraftState, action: &str, input: &str) -> bool {
    match action {
        "1" => set_str(&mut state.embed, "title", input),
        "3" => set_str(&mut state.embed, "description", input),
        "5" => {
            if let Some(o) = obj_mut(&mut state.embed) {
                o.insert("author".to_string(), serde_json::json!({"name": input}));
            }
        }
        "7" => {
            let icon = state
                .embed
                .get("footer")
                .and_then(|f| f.get("icon_url"))
                .cloned();
            let mut footer = serde_json::json!({"text": input});
            if let Some(url) = icon {
                footer["icon_url"] = url;
            }
            if let Some(o) = obj_mut(&mut state.embed) {
                o.insert("footer".to_string(), footer);
            }
        }
        "11" => {
            if !crate::funcs::is_valid_link(input.trim()) {
                return false;
            }
            set_str(&mut state.embed, "url", input.trim());
        }
        "12" => {
            let Some(color) = parse_hex_color(input) else {
                return false;
            };
            if let Some(o) = obj_mut(&mut state.embed) {
                o.insert("color".to_string(), serde_json::json!(color));
            }
        }
        _ => return false,
    }
    true
}

/// Clear actions. Mirrors cases 2/4/6/8/13.
pub fn apply_clear_action(state: &mut EmbedDraftState, action: &str) -> bool {
    match action {
        // Title null. Mirrors setTitle(null).
        "2" => clear_key(&mut state.embed, "title"),
        // Description reset to blank. Mirrors setDescription("** **").
        "4" => set_str(&mut state.embed, "description", "** **"),
        // Author null.
        "6" => clear_key(&mut state.embed, "author"),
        // Footer null + drop the footer file.
        "8" => {
            clear_key(&mut state.embed, "footer");
            state.files.remove("footer");
        }
        // Color null.
        "13" => clear_key(&mut state.embed, "color"),
        _ => return false,
    }
    true
}

/// Media slot update. Mirrors updateMedia/handleUrlMedia/
/// handleFileMedia/clearMedia for footer/image/thumbnail:
/// url -> remote ref, file -> attachment:// + stored bytes,
/// none -> clear (footer keeps its text, default "Footer").
pub fn apply_media_pick(
    state: &mut EmbedDraftState,
    slot: &str,
    pick: (&str, &str, Option<Vec<u8>>),
) {
    let (name, payload, bytes) = pick;
    let file_key = match slot {
        "footer" | "image" | "thumbnail" => slot,
        _ => return,
    };
    if name == "url" {
        state.files.remove(file_key);
        set_media_url(&mut state.embed, file_key, payload, None);
    } else if name != "none" {
        let file_name = payload.to_string();
        if let Some(data) = bytes {
            state.files.insert(
                file_key.to_string(),
                DraftFile {
                    name: file_name.clone(),
                    base64: crate::emojis::base64_encode(&data),
                },
            );
        }
        set_media_url(
            &mut state.embed,
            file_key,
            &format!("attachment://{file_name}"),
            None,
        );
    } else {
        state.files.remove(file_key);
        match file_key {
            "footer" => {
                let text = state
                    .embed
                    .get("footer")
                    .and_then(|f| f.get("text"))
                    .and_then(|t| t.as_str())
                    .unwrap_or("Footer")
                    .to_string();
                if let Some(o) = obj_mut(&mut state.embed) {
                    o.insert("footer".to_string(), serde_json::json!({"text": text}));
                }
            }
            "image" => {
                if let Some(o) = obj_mut(&mut state.embed) {
                    o.remove("image");
                }
            }
            _ => {
                if let Some(o) = obj_mut(&mut state.embed) {
                    o.remove("thumbnail");
                }
            }
        }
    }
}

fn set_media_url(embed: &mut serde_json::Value, slot: &str, url: &str, _unused: Option<()>) {
    match slot {
        "footer" => {
            let text = embed
                .get("footer")
                .and_then(|f| f.get("text"))
                .and_then(|t| t.as_str())
                .unwrap_or("Footer")
                .to_string();
            if let Some(o) = obj_mut(embed) {
                o.insert(
                    "footer".to_string(),
                    serde_json::json!({"text": text, "icon_url": url}),
                );
            }
        }
        "image" => {
            if let Some(o) = obj_mut(embed) {
                o.insert("image".to_string(), serde_json::json!({"url": url}));
            }
        }
        _ => {
            if let Some(o) = obj_mut(embed) {
                o.insert("thumbnail".to_string(), serde_json::json!({"url": url}));
            }
        }
    }
}

/// Render the draft JSON as a Discord embed.
pub fn build_embed(value: &serde_json::Value) -> serenity::CreateEmbed {
    let mut e = serenity::CreateEmbed::default();
    if let Some(t) = value.get("title").and_then(|v| v.as_str()) {
        e = e.title(t);
    }
    if let Some(d) = value.get("description").and_then(|v| v.as_str()) {
        e = e.description(d);
    }
    if let Some(u) = value.get("url").and_then(|v| v.as_str()) {
        e = e.url(u);
    }
    if let Some(c) = value.get("color").and_then(|v| v.as_u64()) {
        e = e.colour(serenity::Colour::new(c as u32));
    }
    if let Some(name) = value
        .get("author")
        .and_then(|a| a.get("name"))
        .and_then(|v| v.as_str())
    {
        e = e.author(serenity::CreateEmbedAuthor::new(name));
    }
    if let Some(f) = value.get("footer").and_then(|v| v.as_object()) {
        let text = f.get("text").and_then(|v| v.as_str()).unwrap_or(" ");
        let mut footer = serenity::CreateEmbedFooter::new(text);
        if let Some(icon) = f.get("icon_url").and_then(|v| v.as_str()) {
            footer = footer.icon_url(icon);
        }
        e = e.footer(footer);
    }
    if let Some(u) = value
        .get("image")
        .and_then(|v| v.get("url"))
        .and_then(|v| v.as_str())
    {
        e = e.image(u);
    }
    if let Some(u) = value
        .get("thumbnail")
        .and_then(|v| v.get("url"))
        .and_then(|v| v.as_str())
    {
        e = e.thumbnail(u);
    }
    e
}

/// Attachment list for message edits. Re-uploads the draft files each
/// time (mirrors getFilesArray on every TS updateResponse).
pub fn edit_attachments(files: Vec<serenity::CreateAttachment>) -> serenity::EditAttachments {
    let mut edit = serenity::EditAttachments::new();
    for f in files {
        edit = edit.add(f);
    }
    edit
}

/// Attachment payloads for the builder message / final post.
pub fn draft_attachments(state: &EmbedDraftState) -> Vec<serenity::CreateAttachment> {
    state
        .files
        .values()
        .filter_map(|f| {
            crate::emojis::base64_decode(&f.base64)
                .map(|bytes| serenity::CreateAttachment::bytes(bytes, f.name.clone()))
        })
        .collect()
}

pub async fn load_draft(
    pool: &crate::db::Pool,
    gid: &str,
    builder: u64,
) -> Option<EmbedDraftState> {
    crate::db::kv_get(pool, gid, &draft_key(builder))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

pub async fn save_draft(pool: &crate::db::Pool, gid: &str, builder: u64, state: &EmbedDraftState) {
    let _ = crate::db::kv_set(
        pool,
        gid,
        &draft_key(builder),
        &serde_json::to_string(state).unwrap_or_default(),
    )
    .await;
}

pub async fn drop_draft(pool: &crate::db::Pool, gid: &str, builder: u64) {
    let _ = crate::db::kv_del(pool, gid, &draft_key(builder)).await;
}

/// Select-menu option values in TS order (labels from lang at render).
pub const SELECT_OPTIONS: &[(&str, &str)] = &[
    ("0", "📥"),
    ("1", "🖊"),
    ("2", "💥"),
    ("3", "💬"),
    ("4", "📝"),
    ("5", "🕵️"),
    ("6", "✂"),
    ("7bis", "🖼️"),
    ("7", "🔻"),
    ("8", "🔺"),
    ("9", "🔳"),
    ("10", "🖼️"),
    ("11", "🌐"),
    ("12", "🎨"),
    ("13", "🔵"),
];

/// Lang key for each select value's label (note the TS
/// `embed_placeholde_option_change_footer_image` typo, kept verbatim).
pub fn select_label_key(value: &str) -> &'static str {
    match value {
        "0" => "embed_placeholder_option_copy_embed",
        "1" => "embed_placeholder_option_edit_title",
        "2" => "embed_placeholder_option_delete_title",
        "3" => "embed_placeholder_option_edit_description",
        "4" => "embed_placeholder_option_delete_description",
        "5" => "embed_placeholder_option_edit_author",
        "6" => "embed_placeholder_option_delete_author",
        "7bis" => "embed_placeholde_option_change_footer_image",
        "7" => "embed_placeholder_option_edit_footer",
        "8" => "embed_placeholder_option_delete_footer",
        "9" => "embed_placeholder_option_edit_thumbnail",
        "10" => "embed_placeholder_option_edit_image",
        "11" => "embed_placeholder_option_edit_titleurl",
        "12" => "embed_placeholder_option_edit_color",
        _ => "embed_placeholder_option_delete_color",
    }
}

/// Prompt lang key for input actions (handleCollector replyContent).
pub fn prompt_key(action: &str) -> Option<&'static str> {
    match action {
        "0" => Some("embed_choose_0"),
        "1" => Some("embed_choose_1"),
        "3" => Some("embed_choose_3"),
        "5" => Some("embed_choose_5"),
        "7" => Some("embed_choose_7"),
        "7bis" => Some("embed_choose_7bis"),
        "9" => Some("embed_choose_9"),
        "10" => Some("embed_choose_10"),
        "11" => Some("embed_choose_11"),
        "12" => Some("embed_choose_12"),
        "replace" => Some("embed_replace_question_msg"),
        _ => None,
    }
}

/// Confirmation lang key for clear actions (ephemeral i.reply).
pub fn clear_confirm_key(action: &str) -> Option<&'static str> {
    match action {
        "2" => Some("embed_choose_2"),
        "4" => Some("embed_choose_4"),
        "6" => Some("embed_choose_6"),
        "8" => Some("embed_choose_8"),
        "13" => Some("embed_choose_13"),
        _ => None,
    }
}

fn text_of(value: &serde_json::Value) -> String {
    if let Some(arr) = value.as_array() {
        return arr
            .iter()
            .filter_map(|v| v.as_str())
            .collect::<Vec<_>>()
            .join(" ");
    }
    value.as_str().unwrap_or("").to_string()
}

async fn lang(pool: &crate::db::Pool, gid: &str, key: &str) -> String {
    let code = crate::db::guild_lang(pool, gid.parse::<u64>().ok()).await;
    crate::lang::get(&code, key).unwrap_or_default()
}

async fn ephemeral(http: &serenity::Http, comp: &serenity::ComponentInteraction, content: String) {
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Re-render the builder message (embed + select + buttons + files).
/// Mirrors updateResponse / restoreMainInterface.
pub async fn render_builder(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    channel_id: u64,
    builder_msg_id: u64,
    state: &EmbedDraftState,
) {
    let first = lang(pool, gid, "embed_first_message").await;
    let placeholder = lang(pool, gid, "embed_placeholder_string_select_menu_builder").await;
    let mut opts = Vec::new();
    for (value, emoji) in SELECT_OPTIONS {
        let label = lang(pool, gid, select_label_key(value)).await;
        opts.push(
            serenity::CreateSelectMenuOption::new(label, *value)
                .emoji(serenity::ReactionType::Unicode(emoji.to_string())),
        );
    }
    let select = serenity::CreateSelectMenu::new(
        EMBED_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options: opts },
    )
    .placeholder(placeholder);
    let save_lbl = lang(pool, gid, "embed_btn_save").await;
    let send_lbl = lang(pool, gid, "embed_btn_send").await;
    let replace_lbl = lang(pool, gid, "embed_btn_replace").await;
    let cancel_lbl = lang(pool, gid, "embed_btn_cancel").await;
    let buttons = serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}save"))
            .label(save_lbl)
            .style(serenity::ButtonStyle::Success),
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}send"))
            .label(send_lbl)
            .style(serenity::ButtonStyle::Primary),
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}replace"))
            .label(replace_lbl)
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}cancel"))
            .label(cancel_lbl)
            .style(serenity::ButtonStyle::Danger),
    ]);
    let files = draft_attachments(state);
    let edit = serenity::EditMessage::new()
        .content(first)
        .embed(build_embed(&state.embed))
        .components(vec![serenity::CreateActionRow::SelectMenu(select), buttons])
        .attachments(edit_attachments(files));
    let _ = serenity::ChannelId::new(channel_id)
        .edit_message(http, builder_msg_id, edit)
        .await;
}

/// Start an input wait: ephemeral prompt + EMBED_AWAIT row.
/// Mirrors handleCollector (single message, author filter; the TS
/// 1_420_000 ms timeout has no stateless equivalent).
pub async fn start_await(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    comp: &serenity::ComponentInteraction,
    builder: u64,
    channel: u64,
    action: &str,
) {
    let key = prompt_key(action).unwrap_or("embed_choose_1");
    let prompt_text = text_of(&serde_json::Value::String(lang(pool, gid, key).await));
    let msg = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(prompt_text)
                    .ephemeral(true),
            ),
        )
        .await;
    // Best-effort prompt id (ephemeral responses have no id; store 0).
    let _ = msg;
    let _ = crate::db::kv_set(
        pool,
        gid,
        &await_key(comp.user.id.get()),
        &serde_json::to_string(&EmbedAwait {
            builder,
            channel,
            prompt: 0,
            action: action.to_string(),
        })
        .unwrap_or_default(),
    )
    .await;
}

/// Copy a message's first embed into the draft. Mirrors copyEmbed
/// (same-guild check + bad guild/channel/message/embed errors).
pub async fn copy_into(
    http: &serenity::Http,
    state: &mut EmbedDraftState,
    gid: &str,
    guild_name: &str,
    pool: &crate::db::Pool,
    url: &str,
) -> Result<(), String> {
    let bad_guild = lang(pool, gid, "embed_copy_bad_guild_msg")
        .await
        .replace("${interaction.guild?.name}", guild_name);
    let Some((url_gid, channel_id, message_id)) = extract_url_parts(url) else {
        return Err(lang(pool, gid, "embed_copy_bad_url_msg").await);
    };
    if url_gid != gid {
        return Err(bad_guild);
    }
    let (Ok(ch), Ok(mid)) = (channel_id.parse::<u64>(), message_id.parse::<u64>()) else {
        return Err(lang(pool, gid, "embed_copy_bad_message_msg").await);
    };
    let bad_msg = lang(pool, gid, "embed_copy_bad_message_msg").await;
    let target = serenity::ChannelId::new(ch)
        .message(http, mid)
        .await
        .map_err(|_| bad_msg)?;
    let Some(first) = target.embeds.first() else {
        return Err(lang(pool, gid, "embed_copy_bad_embed_message_msg").await);
    };
    state.embed = serde_json::to_value(first).unwrap_or_else(|_| empty_embed());
    Ok(())
}

/// Is this message an awaited builder input? Returns the await row.
pub async fn take_await(
    pool: &crate::db::Pool,
    gid: &str,
    user_id: u64,
    channel_id: u64,
) -> Option<EmbedAwait> {
    let raw = crate::db::kv_get(pool, gid, &await_key(user_id)).await?;
    let row: EmbedAwait = serde_json::from_str(&raw).ok()?;
    if row.channel != channel_id {
        return None;
    }
    crate::db::kv_del(pool, gid, &await_key(user_id))
        .await
        .ok()?;
    Some(row)
}

/// Consume an awaited builder input message. Called from message().
/// Mirrors the handleCollector on-collect branches + replace flow.
pub async fn handle_builder_input(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    guild_name: &str,
    msg: &serenity::Message,
) {
    let Some(row) = take_await(pool, gid, msg.author.id.get(), msg.channel_id.get()).await else {
        return;
    };
    let Some(mut state) = load_draft(pool, gid, row.builder).await else {
        return;
    };
    if state.owner != msg.author.id.get().to_string() {
        return;
    }
    let action = row.action.clone();
    if action == "replace" {
        finish_replace(http, pool, gid, guild_name, msg, &row, &state).await;
        return;
    }
    if action == "0" {
        if let Err(err) = copy_into(http, &mut state, gid, guild_name, pool, &msg.content).await {
            let _ = msg.reply(http, err).await;
        }
    } else if ["1", "3", "5", "7", "11", "12"].contains(&action.as_str()) {
        if !apply_text_action(&mut state, &action, &msg.content) && action == "12" {
            // Invalid color. Mirrors the channelSend error branch.
            let no = crate::emojis::app_emoji_markup(http, "No")
                .await
                .unwrap_or_default();
            let err = lang(pool, gid, "embed_choose_12_error")
                .await
                .replace("${client.iHorizon_Emojis.No}", &no);
            let _ = msg.channel_id.say(http, err).await;
        }
    } else if ["7bis", "9", "10"].contains(&action.as_str()) {
        let slot = match action.as_str() {
            "7bis" => "footer",
            "9" => "thumbnail",
            _ => "image",
        };
        let first = msg.attachments.first();
        let pick = crate::funcs::media_by_message(
            &msg.content,
            first.map(|a| (a.url.as_str(), a.content_type.as_deref())),
        );
        let bytes = if pick.0 != "url" && pick.0 != "none" {
            match first {
                Some(a) => crate::commands::botcat::download_bytes(&a.url).await,
                None => None,
            }
        } else {
            None
        };
        apply_media_pick(&mut state, slot, (&pick.0, &pick.1, bytes));
    }
    save_draft(pool, gid, row.builder, &state).await;
    render_builder(http, pool, gid, row.channel, row.builder, &state).await;
    let _ = msg.delete(http).await;
}

/// Replace target: parse URL, fetch, edit its embed. Mirrors
/// replaceEmbed (errors followUp + restoreMainInterface).
async fn finish_replace(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    guild_name: &str,
    msg: &serenity::Message,
    row: &EmbedAwait,
    state: &EmbedDraftState,
) {
    // Resolve the outcome first, then act (no async closures).
    enum Outcome {
        Done { target_msg: u64, target_ch: u64 },
        Fail(String),
    }
    let bad_guild = lang(pool, gid, "embed_copy_bad_guild_msg")
        .await
        .replace("${interaction.guild?.name}", guild_name);
    let outcome = match extract_url_parts(&msg.content) {
        None => Outcome::Fail(lang(pool, gid, "embed_copy_bad_url_msg").await),
        Some((url_gid, _channel_id, _message_id)) if url_gid != gid => Outcome::Fail(bad_guild),
        Some((_, channel_id, message_id)) => {
            match (channel_id.parse::<u64>(), message_id.parse::<u64>()) {
                (Ok(ch), Ok(mid)) => match serenity::ChannelId::new(ch).message(http, mid).await {
                    Ok(target) if !target.embeds.is_empty() => Outcome::Done {
                        target_msg: target.id.get(),
                        target_ch: ch,
                    },
                    Ok(_) => {
                        Outcome::Fail(lang(pool, gid, "embed_copy_bad_embed_message_msg").await)
                    }
                    Err(_) => Outcome::Fail(lang(pool, gid, "embed_copy_bad_message_msg").await),
                },
                _ => Outcome::Fail(lang(pool, gid, "embed_copy_bad_message_msg").await),
            }
        }
    };
    match outcome {
        Outcome::Done {
            target_msg,
            target_ch,
        } => {
            let edit = serenity::EditMessage::new()
                .embed(build_embed(&state.embed))
                .attachments(edit_attachments(draft_attachments(state)));
            let _ = serenity::ChannelId::new(target_ch)
                .edit_message(http, target_msg, edit)
                .await;
            let done_text = lang(pool, gid, "embed_replace_message")
                .await
                .replace("{user}", &msg.author.to_string())
                .replace("{messageUrl}", &msg.content);
            let clear = serenity::EditMessage::new()
                .content(done_text)
                .embeds(Vec::<serenity::CreateEmbed>::new())
                .components(Vec::<serenity::CreateActionRow>::new());
            let _ = serenity::ChannelId::new(row.channel)
                .edit_message(http, row.builder, clear)
                .await;
            drop_draft(pool, gid, row.builder).await;
            let _ = msg.delete(http).await;
        }
        Outcome::Fail(err) => {
            let _ = msg.reply(http, err).await;
            let _ = msg.delete(http).await;
            if let Some(st) = load_draft(pool, gid, row.builder).await {
                render_builder(http, pool, gid, row.channel, row.builder, &st).await;
            }
        }
    }
}

/// Route a builder component interaction. Mirrors the select + button
/// collectors in run().
pub async fn handle_embed_component(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(gid) = comp.guild_id.map(|g| g.get().to_string()) else {
        return;
    };
    let builder = comp.message.id.get();
    let channel = comp.channel_id.get();
    let Some(state) = load_draft(pool, &gid, builder).await else {
        return;
    };
    if state.owner != comp.user.id.get().to_string() {
        ephemeral(
            http,
            comp,
            lang(pool, &gid, "embed_interaction_not_for_you").await,
        )
        .await;
        return;
    }
    let id = comp.data.custom_id.as_str();
    if id == EMBED_SELECT_ID {
        let value = match &comp.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => return,
        };
        handle_select(&SelectCtx {
            http,
            pool,
            gid: &gid,
            comp,
            builder,
            channel,
            state,
            value: &value,
        })
        .await;
        return;
    }
    if id == EMBED_SAVE_CHANNEL_ID {
        handle_channel_pick(http, pool, &gid, comp, builder, channel, &state).await;
        return;
    }
    let Some(btn) = id.strip_prefix(EMBED_BTN_PREFIX) else {
        return;
    };
    match btn {
        "save" => handle_save(http, pool, &gid, comp, builder, &state).await,
        "send" => handle_send_prompt(http, pool, &gid, comp, &state).await,
        "replace" => {
            start_await(http, pool, &gid, comp, builder, channel, "replace").await;
        }
        _ => {
            // Cancel. Mirrors the cancel case.
            let text = lang(pool, &gid, "embed_cancel_message")
                .await
                .replace("${interaction.user.id}", &comp.user.id.get().to_string());
            drop_draft(pool, &gid, builder).await;
            let _ = comp
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(text)
                            .embeds(Vec::<serenity::CreateEmbed>::new())
                            .components(Vec::<serenity::CreateActionRow>::new()),
                    ),
                )
                .await;
        }
    }
}

/// Inputs for [`handle_select`]. Struct keeps clippy arg-count clean.
pub struct SelectCtx<'a> {
    pub http: &'a serenity::Http,
    pub pool: &'a crate::db::Pool,
    pub gid: &'a str,
    pub comp: &'a serenity::ComponentInteraction,
    pub builder: u64,
    pub channel: u64,
    pub state: EmbedDraftState,
    pub value: &'a str,
}

async fn handle_select(s: &SelectCtx<'_>) {
    let http = s.http;
    let pool = s.pool;
    let gid = s.gid;
    let comp = s.comp;
    // Input actions wait for the next author message.
    if prompt_key(s.value).is_some() {
        // Ack the select so it stops spinning, then prompt.
        let _ = comp
            .create_response(http, serenity::CreateInteractionResponse::Acknowledge)
            .await;
        start_await(http, pool, gid, comp, s.builder, s.channel, s.value).await;
        return;
    }
    if let Some(key) = clear_confirm_key(s.value) {
        let mut state = s.state.clone();
        apply_clear_action(&mut state, s.value);
        save_draft(pool, gid, s.builder, &state).await;
        render_builder(http, pool, gid, s.channel, s.builder, &state).await;
        ephemeral(http, comp, lang(pool, gid, key).await).await;
    }
}

/// Save button. Mirrors saveEmbed (owner overwrite else fresh 16-char
/// id) + the save update.
async fn handle_save(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    comp: &serenity::ComponentInteraction,
    builder: u64,
    state: &EmbedDraftState,
) {
    let uid = comp.user.id.get().to_string();
    // Optional id override arrives via the entry arg only; without it
    // always mint (TS saveEmbed(arg) with arg None).
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    let opts = crate::funcs::PasswordOptions {
        length: 16,
        numbers: false,
        symbols: false,
        lowercase: true,
        uppercase: true,
        exclude_similar: false,
        exclude: String::new(),
        strict: false,
    };
    let embed_id =
        crate::funcs::generate_password(&opts, seed).unwrap_or_else(|_| format!("{seed:016}"));
    let _ = crate::db::kv_set(
        pool,
        gid,
        &format!("EMBED.{embed_id}"),
        &serde_json::json!({
            "embedOwner": uid,
            "embedSource": state.embed,
        })
        .to_string(),
    )
    .await;
    drop_draft(pool, gid, builder).await;
    let text = lang(pool, gid, "embed_save_message")
        .await
        .replace("${interaction.user.id}", &uid)
        .replace("${await saveEmbed()}", &embed_id);
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .content(text)
                    .embeds(Vec::<serenity::CreateEmbed>::new())
                    .components(Vec::<serenity::CreateActionRow>::new()),
            ),
        )
        .await;
}

/// Send button: channel picker. Mirrors sendEmbed's prompt.
async fn handle_send_prompt(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    comp: &serenity::ComponentInteraction,
    state: &EmbedDraftState,
) {
    let text = lang(pool, gid, "embed_send_message")
        .await
        .replace("${interaction.user.id}", &comp.user.id.get().to_string());
    let picker = serenity::CreateActionRow::SelectMenu(serenity::CreateSelectMenu::new(
        EMBED_SAVE_CHANNEL_ID,
        serenity::CreateSelectMenuKind::Channel {
            default_channels: None,
            channel_types: Some(vec![serenity::ChannelType::Text]),
        },
    ));
    let files = draft_attachments(state);
    let msg = serenity::CreateInteractionResponseMessage::new()
        .content(text)
        .components(vec![picker]);
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(msg),
        )
        .await;
    let _ = files;
}

/// Channel pick: post the embed + files, close the builder.
/// Mirrors the embed-save-channel collect branch.
async fn handle_channel_pick(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    comp: &serenity::ComponentInteraction,
    builder: u64,
    _channel: u64,
    state: &EmbedDraftState,
) {
    let target = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::ChannelSelect { values } => values.first().copied(),
        _ => None,
    };
    let Some(target) = target else { return };
    let files = draft_attachments(state);
    let _ = target
        .send_message(
            http,
            serenity::CreateMessage::new()
                .embed(build_embed(&state.embed))
                .files(files),
        )
        .await;
    drop_draft(pool, gid, builder).await;
    let text = lang(pool, gid, "embed_send_embed_work")
        .await
        .replace("${interaction.user.id}", &comp.user.id.get().to_string())
        .replace("${message.content}", &target.get().to_string());
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .content(text)
                    .embeds(Vec::<serenity::CreateEmbed>::new())
                    .components(Vec::<serenity::CreateActionRow>::new()),
            ),
        )
        .await;
}

/// Builder entry. Mirrors subCommand.run (optional saved id preload).
#[poise::command(slash_command, prefix_command, category = "utils", rename = "embed")]
pub async fn embed_builder(
    ctx: Ctx<'_>,
    #[description = "Saved embed id"] id: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let uid = ctx.author().id.get().to_string();
    let mut embed = empty_embed();
    if let Some(arg) = id.as_deref() {
        if crate::funcs::is_valid_embed_id(arg) {
            if let Some(raw) = crate::db::kv_get(pool, &gid, &format!("EMBED.{arg}")).await {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                    if let Some(src) = v.get("embedSource").cloned() {
                        embed = src;
                    }
                }
            }
        }
    }
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mut select_opts = Vec::new();
    for (value, emoji) in SELECT_OPTIONS {
        select_opts.push(
            serenity::CreateSelectMenuOption::new(t(select_label_key(value)), *value)
                .emoji(serenity::ReactionType::Unicode(emoji.to_string())),
        );
    }
    let select = serenity::CreateSelectMenu::new(
        EMBED_SELECT_ID,
        serenity::CreateSelectMenuKind::String {
            options: select_opts,
        },
    )
    .placeholder(t("embed_placeholder_string_select_menu_builder"));
    let buttons = serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}save"))
            .label(t("embed_btn_save"))
            .style(serenity::ButtonStyle::Success),
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}send"))
            .label(t("embed_btn_send"))
            .style(serenity::ButtonStyle::Primary),
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}replace"))
            .label(t("embed_btn_replace"))
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{EMBED_BTN_PREFIX}cancel"))
            .label(t("embed_btn_cancel"))
            .style(serenity::ButtonStyle::Danger),
    ]);
    let reply = ctx
        .send(
            poise::CreateReply::default()
                .content(t("embed_first_message"))
                .embed(build_embed(&embed))
                .components(vec![serenity::CreateActionRow::SelectMenu(select), buttons]),
        )
        .await?;
    save_draft(
        pool,
        &gid,
        reply.message().await?.id.get(),
        &EmbedDraftState {
            owner: uid,
            embed,
            files: HashMap::new(),
        },
    )
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_parts_match_ts() {
        let parts = extract_url_parts("https://discord.com/channels/123/456/789").unwrap();
        assert_eq!(
            parts,
            ("123".to_string(), "456".to_string(), "789".to_string())
        );
        assert!(extract_url_parts("https://discord.com/channels/123/456").is_none());
        assert!(extract_url_parts("https://example.com/channels/1/2/3").is_none());
        assert!(extract_url_parts("not a url").is_none());
    }

    #[test]
    fn text_actions_match_ts_cases() {
        let mut s = EmbedDraftState {
            owner: "1".to_string(),
            embed: empty_embed(),
            files: HashMap::new(),
        };
        assert!(apply_text_action(&mut s, "1", "Hello"));
        assert_eq!(s.embed["title"], "Hello");
        assert!(apply_text_action(&mut s, "3", "World"));
        assert_eq!(s.embed["description"], "World");
        assert!(apply_text_action(&mut s, "5", "Auth"));
        assert_eq!(s.embed["author"]["name"], "Auth");
        assert!(apply_text_action(&mut s, "7", "Foot"));
        assert_eq!(s.embed["footer"]["text"], "Foot");
        assert!(apply_text_action(&mut s, "11", "https://x.y"));
        assert_eq!(s.embed["url"], "https://x.y");
        assert!(!apply_text_action(&mut s, "11", "nope"));
        assert!(apply_text_action(&mut s, "12", "#ff0000"));
        assert_eq!(s.embed["color"], 0xff0000);
        assert!(!apply_text_action(&mut s, "12", "nope"));
        assert!(apply_clear_action(&mut s, "2"));
        assert!(s.embed.get("title").is_none());
        assert!(apply_clear_action(&mut s, "4"));
        assert_eq!(s.embed["description"], "** **");
        assert!(apply_clear_action(&mut s, "13"));
        assert!(s.embed.get("color").is_none());
    }

    #[test]
    fn media_branches_match_ts() {
        let mut s = EmbedDraftState {
            owner: "1".to_string(),
            embed: empty_embed(),
            files: HashMap::new(),
        };
        apply_media_pick(&mut s, "image", ("url", "https://img/x.png", None));
        assert_eq!(s.embed["image"]["url"], "https://img/x.png");
        assert!(s.files.is_empty());
        apply_media_pick(
            &mut s,
            "image",
            ("image.png", "image.png", Some(vec![1, 2, 3])),
        );
        assert_eq!(s.embed["image"]["url"], "attachment://image.png");
        assert!(s.files.contains_key("image"));
        apply_media_pick(&mut s, "image", ("none", "", None));
        assert!(s.embed.get("image").is_none());
        assert_parse_colors();
    }

    fn assert_parse_colors() {
        assert_eq!(parse_hex_color("#ff0000"), Some(0xff0000));
        assert_eq!(parse_hex_color("f00"), Some(0xff0000));
        assert_eq!(parse_hex_color("nope"), None);
        assert_eq!(parse_hex_color("#12345"), None);
    }

    #[test]
    fn keys_shape() {
        assert_eq!(draft_key(5), "EMBED_DRAFT.5");
        assert_eq!(await_key(6), "EMBED_AWAIT.6");
        assert_eq!(prompt_key("0"), Some("embed_choose_0"));
        assert_eq!(prompt_key("2"), None);
        assert_eq!(clear_confirm_key("13"), Some("embed_choose_13"));
        assert_eq!(
            select_label_key("7bis"),
            "embed_placeholde_option_change_footer_image"
        );
    }
}
