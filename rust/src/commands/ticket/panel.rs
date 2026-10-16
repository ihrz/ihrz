use super::*;
use poise::serenity_prelude as serenity;
use serde_json::{json, Value};
use std::time::Duration;

// ---- V2 panel editor ids (byte-exact TS !panel.ts customIds) ----

/// Main editor menu. TS `panelSelect` (!panel.ts:246).
const EDITOR_SELECT_ID: &str = "panelSelect";
/// Editor send button. TS `send_embed` (!panel.ts:337). Reused for the
/// send-flow channel select (!panel.ts:689); the sequential next_pick
/// loop disambiguates by position like the TS per-step collectors.
const EDITOR_SEND_ID: &str = "send_embed";
/// Preview opener menu. TS `ticket-open-selection-v2-preview` (ephemeral,
/// never handled as a real open).
pub const V2_PREVIEW_ID: &str = "ticket-open-selection-v2-preview";

/// Per-option picker (selectOption menu id varies per flow).
/// TS callers: `select_option_form`, `change_category_for_option`,
/// `remove_option`, `change_channel_panel_id_for_option`,
/// `select_option_role_ping`.
const OPT_PICK_FORM_ID: &str = "select_option_form";
const OPT_PICK_CATEGORY_ID: &str = "change_category_for_option";
const OPT_PICK_REMOVE_ID: &str = "remove_option";
const OPT_PICK_CHANNEL_PANEL_ID: &str = "change_channel_panel_id_for_option";
const OPT_PICK_ROLE_PING_ID: &str = "select_option_role_ping";
/// Add/remove submenu. TS `change_option` (changeOption), `change_form`
/// (changeForm), `form_action` (per-option form).
const ADD_REMOVE_OPTION_ID: &str = "change_option";
const ADD_REMOVE_FORM_ID: &str = "change_form";
const ADD_REMOVE_FORM_OPT_ID: &str = "form_action";
/// Role picker. TS `change_role` (panel-level) / `change_role_option`
/// (per-option).
const ROLE_PICK_ID: &str = "change_role";
const ROLE_PICK_OPTION_ID: &str = "change_role_option";
/// Category picker. TS `change_category` (panel-level) /
/// `change_category_for_option_channel` (per-option).
const CATEGORY_PICK_ID: &str = "change_category";
const CATEGORY_PICK_OPTION_ID: &str = "change_category_for_option_channel";
/// Send-flow channel select. TS reuses `send_embed` (!panel.ts:689).
const CHANNEL_SEND_PICK_ID: &str = "send_embed";
/// Panel-level question remove menu / per-option question remove menu.
/// TS `remove_form` / `remove_form_opt`.
const FORM_QUESTION_PICK_ID: &str = "remove_form";
const FORM_QUESTION_OPT_PICK_ID: &str = "remove_form_opt";

/// Saved marker button. TS `saved` (disabled Success button, !panel.ts:563).
const SAVED_BUTTON_ID: &str = "saved";

/// TS modal ids (!panel.ts: modals add_option/add_form/add_form_opt/
/// change_placeholder/change_embed/change_embed2/change_panel_channel_id).
const MODAL_OPT_ADD: &str = "add_option";
const MODAL_FORM_ADD: &str = "add_form";
const MODAL_FORM_OPT_ADD: &str = "add_form_opt";
const MODAL_PLACEHOLDER: &str = "change_placeholder";
const MODAL_EMBED: &str = "change_embed";
const MODAL_CHANNEL_PANEL: &str = "change_embed2";
const MODAL_OPT_PANEL: &str = "change_panel_channel_id";

// ---- Components V2 message-render layer (raw JSON + reqwest REST) ----
// Serenity 0.12 has no Components V2 builders (no TextDisplay /
// Separator / Container; its ComponentType stops at ChannelSelect), so
// the editor message ships V2 as hand-built JSON over reqwest with
// `flags: 1 << 15`, mirroring rust/src/commands/welcomer_panel/v2.rs.
// Receiving is unaffected: clicks arrive as the same V1 interaction
// shapes, so the `next_pick` collector loop and every step/modal/DB leg
// below are untouched — only the render + transport changed.

/// `MessageFlags.IsComponentsV2`.
const FLAGS_V2: u64 = 1 << 15;
/// `PANEL_ACCENT` in !panel.ts:156.
const PANEL_ACCENT: u32 = 0x397c16;
// Component type numbers (discord-api-types v10, Components V2).
const CT_ACTION_ROW: u8 = 1;
const CT_BUTTON: u8 = 2;
const CT_STRING_SELECT: u8 = 3;
const CT_TEXT_DISPLAY: u8 = 10;
const CT_SEPARATOR: u8 = 14;
const CT_CONTAINER: u8 = 17;
const API: &str = "https://discord.com/api/v10";
const USER_AGENT: &str = "iHorizonRust/1.0 (ticket-panel-v2)";

fn text_display(content: &str) -> Value {
    json!({"type": CT_TEXT_DISPLAY, "content": content})
}

/// TS `new SeparatorBuilder()` defaults (divider on, Small spacing).
fn separator() -> Value {
    json!({"type": CT_SEPARATOR, "divider": true, "spacing": 1})
}

fn container(accent_color: u32, children: Vec<Value>) -> Value {
    json!({"type": CT_CONTAINER, "accent_color": accent_color, "components": children})
}

/// TS `buildPromptContainer(text)` (!panel.ts:234).
fn prompt_container(text: &str) -> Value {
    container(PANEL_ACCENT, vec![text_display(text)])
}

/// Convert serenity-built ActionRows to their exact V2 JSON form
/// (numeric styles/kinds). Select/button rows keep using the builders
/// so customIds/placeholders/kinds cannot drift from the collector legs.
fn rows_json(rows: Vec<serenity::CreateActionRow>) -> Result<Vec<Value>, String> {
    rows.into_iter()
        .map(|r| {
            let v = serde_json::to_value(&r).map_err(|e| e.to_string())?;
            if v.get("type").and_then(Value::as_u64) != Some(u64::from(CT_ACTION_ROW)) {
                return Err("non ActionRow payload".to_string());
            }
            Ok(v)
        })
        .collect()
}

fn bot_token() -> Result<String, String> {
    crate::config::bot_token().ok_or_else(|| "missing bot token".to_string())
}

fn rest_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

async fn check_ok(resp: reqwest::Response, what: &str) -> Result<Value, String> {
    let status = resp.status().as_u16();
    let body = resp.text().await.unwrap_or_default();
    if !(200..300).contains(&status) {
        return Err(format!(
            "{what}: HTTP {status}: {}",
            &body[..body.len().min(200)]
        ));
    }
    serde_json::from_str::<Value>(&body).map_err(|e| format!("{what}: bad JSON: {e}"))
}

/// One multipart field: (name, bytes, optional (filename, mime)).
type MultipartField<'a> = (&'a str, Vec<u8>, Option<(String, String)>);

fn multipart(fields: Vec<MultipartField<'_>>, files: &[(String, Vec<u8>)]) -> (Vec<u8>, String) {
    let boundary = format!("ihrz{:x}{:x}", rand_part(), rand_part());
    let mut body: Vec<u8> = Vec::new();
    for (name, data, file) in &fields {
        body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
        match file {
            Some((filename, mime)) => body.extend_from_slice(
                format!(
                    "Content-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\nContent-Type: {mime}\r\n\r\n"
                )
                .as_bytes(),
            ),
            None => body.extend_from_slice(
                format!("Content-Disposition: form-data; name=\"{name}\"\r\n\r\n").as_bytes(),
            ),
        }
        body.extend_from_slice(data);
        body.extend_from_slice(b"\r\n");
    }
    for (i, (filename, bytes)) in files.iter().enumerate() {
        body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
        body.extend_from_slice(
            format!(
                "Content-Disposition: form-data; name=\"files[{i}]\"; filename=\"{filename}\"\r\nContent-Type: application/octet-stream\r\n\r\n"
            )
            .as_bytes(),
        );
        body.extend_from_slice(bytes);
        body.extend_from_slice(b"\r\n");
    }
    body.extend_from_slice(format!("--{boundary}--\r\n").as_bytes());
    (body, boundary)
}

fn rand_part() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64 ^ (d.as_secs() << 32))
        .unwrap_or(0x9e3779b9);
    t.wrapping_mul(0x2545f4914f6cdd1d) ^ std::process::id() as u64
}

/// Initial editor post on the prefix leg. Mirrors `interactionSend`'s
/// message leg: a reply to the invoking message carrying the full
/// `buildPanelMessage` payload (container + select row + button row +
/// flags 32768 + optional options .txt). Returns the posted message id.
async fn post_channel_v2(
    channel_id: u64,
    reply_to: Option<u64>,
    components: &[Value],
    files: Vec<(String, Vec<u8>)>,
) -> Result<u64, String> {
    let mut payload = json!({
        "components": components,
        "flags": FLAGS_V2,
        "allowed_mentions": {"parse": []},
    });
    if let Some(mid) = reply_to {
        payload["message_reference"] = json!({"message_id": mid.to_string()});
        payload["allowed_mentions"] = json!({"parse": [], "replied_user": false});
    }
    let body = if files.is_empty() {
        check_ok(
            rest_client()
                .post(format!("{API}/channels/{channel_id}/messages"))
                .header("Authorization", format!("Bot {}", bot_token()?))
                .json(&payload)
                .send()
                .await
                .map_err(|e| format!("post panel: {e}"))?,
            "post panel",
        )
        .await?
    } else {
        let (body, boundary) = multipart(
            vec![("payload_json", payload.to_string().into_bytes(), None)],
            &files,
        );
        let resp = rest_client()
            .post(format!("{API}/channels/{channel_id}/messages"))
            .header("Authorization", format!("Bot {}", bot_token()?))
            .header(
                "Content-Type",
                format!("multipart/form-data; boundary={boundary}"),
            )
            .body(body)
            .send()
            .await
            .map_err(|e| format!("post panel: {e}"))?;
        check_ok(resp, "post panel").await?
    };
    body.get("id")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<u64>().ok())
        .ok_or_else(|| "post panel: no message id".to_string())
}

/// Slash-leg initial post: deferred followup carrying the full
/// `buildPanelMessage` payload (mirrors the interaction `reply` of
/// `interactionSend`). Returns the created message id.
async fn webhook_followup_v2(
    app_id: u64,
    interaction_token: &str,
    components: &[Value],
    files: Vec<(String, Vec<u8>)>,
) -> Result<u64, String> {
    let payload = json!({"components": components, "flags": FLAGS_V2});
    let body = if files.is_empty() {
        check_ok(
            rest_client()
                .post(format!(
                    "{API}/webhooks/{app_id}/{interaction_token}?wait=true"
                ))
                .json(&payload)
                .send()
                .await
                .map_err(|e| format!("panel followup: {e}"))?,
            "panel followup",
        )
        .await?
    } else {
        let (body, boundary) = multipart(
            vec![("payload_json", payload.to_string().into_bytes(), None)],
            &files,
        );
        let resp = rest_client()
            .post(format!(
                "{API}/webhooks/{app_id}/{interaction_token}?wait=true"
            ))
            .header(
                "Content-Type",
                format!("multipart/form-data; boundary={boundary}"),
            )
            .body(body)
            .send()
            .await
            .map_err(|e| format!("panel followup: {e}"))?;
        check_ok(resp, "panel followup").await?
    };
    body.get("id")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<u64>().ok())
        .ok_or_else(|| "panel followup: no message id".to_string())
}

/// Full re-render edit of the editor message. `clear` mirrors the TS
/// `attachments: []` legs (refresh + save); prompt/timeout-end edits
/// leave attachments untouched like their TS counterparts.
async fn patch_message_v2(
    channel_id: u64,
    message_id: u64,
    components: &[Value],
    files: Vec<(String, Vec<u8>)>,
    clear: bool,
) -> Result<(), String> {
    let mut payload = json!({"components": components, "flags": FLAGS_V2});
    if clear {
        payload["attachments"] = json!([]);
    }
    let req = rest_client().patch(format!("{API}/channels/{channel_id}/messages/{message_id}"));
    let req = req.header("Authorization", format!("Bot {}", bot_token()?));
    let resp = if files.is_empty() {
        req.json(&payload)
            .send()
            .await
            .map_err(|e| format!("patch panel: {e}"))?
    } else {
        let (body, boundary) = multipart(
            vec![("payload_json", payload.to_string().into_bytes(), None)],
            &files,
        );
        req.header(
            "Content-Type",
            format!("multipart/form-data; boundary={boundary}"),
        )
        .body(body)
        .send()
        .await
        .map_err(|e| format!("patch panel: {e}"))?
    };
    check_ok(resp, "patch panel").await.map(|_| ())
}

/// TS `buildContainer()` (!panel.ts:185): Container(PANEL_ACCENT) with
/// the same text blocks — header, saved + related ids, separator,
/// role/ping/placeholder/category/toggles, option fields, form.
/// `header_emoji` is the `Ticket_Main` app-emoji markup (None/absent
/// renders no emoji, like the TS ternary).
fn build_container(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    panel_code: &str,
    saved: bool,
    role_name: &dyn Fn(&str) -> Option<String>,
    header_emoji: Option<&str>,
) -> Value {
    let none = t("var_no_set");
    let show = |v: &str| {
        if v.trim().is_empty() {
            none.clone()
        } else {
            v.to_string()
        }
    };
    let head = match header_emoji {
        Some(e) if !e.trim().is_empty() => format!("{e} "),
        _ => String::new(),
    };
    let header = format!(
        "## {head}{}{panel_code}\n{}",
        t("ticket_panel_embed_title"),
        t("ticket_panel_embed_desc"),
    );
    let ids = format!(
        "-# {}: {}\n**{}**\n{}\n**{}**\n{}",
        t("ticket_panel_saved_conf"),
        if saved { "🟢" } else { "🔴" },
        t("ticket_panel_related_embed"),
        show(&panel.related_embed_id),
        t("ticket_panel_channel_panel_embed_id"),
        show(&panel.ticket_channel_panel),
    );
    let roles = if panel.config.roles_to_ping.is_empty() {
        none.clone()
    } else {
        panel
            .config
            .roles_to_ping
            .iter()
            .map(|r| format!("<@&{r}>"))
            .collect::<Vec<_>>()
            .join(" ")
    };
    // TS formatCategory: the cached channel mention, else var_no_set;
    // `<#id>` is the cached shape (the only one that renders).
    let category = if panel.category_id.trim().is_empty() {
        none.clone()
    } else {
        format!("<#{}>", panel.category_id)
    };
    let flag = |on: bool| if on { "🟢" } else { "🔴" };
    let toggles = format!(
        "**{}**\n{}\n**{}** {}\n**{}**\n{}\n**{}**\n{}\n**{}** {}\n**{}** {}\n**{}** {}",
        t("ticket_panel_role_to_ping"),
        roles,
        t("ticket_panel_ping_user"),
        flag(panel.config.ping_user),
        t("ticket_panel_placeholder"),
        show(&panel.placeholder),
        t("ticket_panel_category"),
        category,
        t("ticket_panel_select_user"),
        flag(panel.config.user_select_panel),
        t("ticket_panel_button_delete"),
        flag(panel.config.delete_button),
        t("ticket_panel_button_transcript"),
        flag(panel.config.transcript_button),
    );
    let opts = summarize_options(t, &panel.config.option_fields, role_name);
    let opts_block = format!(
        "### {}\n{}",
        t("ticket_panel_option_fields"),
        if opts.is_empty() { none.clone() } else { opts },
    );
    let forms = summarize_forms(&t("ticket_panel_option_fields"), &panel.config.form);
    let form_block = format!(
        "### {}\n{}",
        t("ticket_panel_form"),
        if forms.is_empty() { none } else { forms },
    );
    container(
        PANEL_ACCENT,
        vec![
            text_display(&header),
            text_display(&ids),
            separator(),
            text_display(&toggles),
            text_display(&opts_block),
            text_display(&form_block),
        ],
    )
}

/// The 17 editor steps in TS order: (label lang key, value, emoji name).
/// Emoji names are byte-exact from !panel.ts:249-333.
const EDITOR_STEPS: [(&str, &str, &str); 17] = [
    ("ticket_panel_panel_1_label", "save", "Ticket_Save"),
    ("ticket_panel_panel_2_label", "preview", "Ticket_Preview"),
    ("ticket_panel_panel_3_label", "change_embed", "Ticket_Nitro"),
    ("ticket_panel_panel_4_label", "change_role", "Ticket_Role"),
    (
        "ticket_panel_panel_5_label",
        "change_placeholder",
        "Ticket_Paint",
    ),
    (
        "ticket_panel_panel_6_label",
        "change_category",
        "Ticket_Category",
    ),
    (
        "ticket_panel_panel_10_label",
        "change_category_2",
        "Ticket_Category",
    ),
    ("ticket_panel_panel_7_label", "change_ping", "Ticket_Bell"),
    ("ticket_panel_panel_8_label", "change_option", "Ticket_List"),
    ("ticket_panel_panel_9_label", "change_form", "Ticket_Form"),
    (
        "ticket_panel_panel_11_label",
        "change_ticket_channel_panel",
        "Ticket_Hash",
    ),
    (
        "ticket_panel_panel_12_label",
        "change_ticket_user_select_panel",
        "Ticket_User",
    ),
    (
        "ticket_panel_panel_13_label",
        "change_ticket_button_delete_panel",
        "Ticket_Trash",
    ),
    (
        "ticket_panel_panel_14_label",
        "change_ticket_button_transcript_panel",
        "Ticket_Transcript",
    ),
    (
        "ticket_panel_panel_15_label",
        "change_ticket_channel_panel_options",
        "Ticket_Settings",
    ),
    (
        "ticket_panel_panel_16_label",
        "change_ticket_forms_options",
        "Ticket_Form",
    ),
    (
        "ticket_panel_panel_17_label",
        "change_role_to_ping_options",
        "Ticket_Megaphone",
    ),
];

/// Parse an app-emoji markup (`<:Name:id>`) or single unicode glyph
/// into a ReactionType for the serenity row builders (which then
/// serialize to exact V2 JSON via `rows_json`).
fn parse_emoji(markup: &str) -> Option<serenity::ReactionType> {
    let e = markup.trim();
    if e.is_empty() {
        return None;
    }
    e.parse::<serenity::ReactionType>().ok()
}

/// TS `panelSelect` (!panel.ts:245): the 17-option string select row.
async fn editor_select_row_v2(
    sctx: &serenity::Context,
    t: &(dyn Fn(&str) -> String + Send + Sync),
) -> Value {
    let mut options = Vec::with_capacity(EDITOR_STEPS.len());
    for (label_key, value, emoji_name) in EDITOR_STEPS {
        let mut opt = serenity::CreateSelectMenuOption::new(t(label_key), value.to_string());
        if let Some(markup) = crate::emojis::app_emoji_markup(&sctx.http, emoji_name).await {
            if let Some(rt) = parse_emoji(&markup) {
                opt = opt.emoji(rt);
            }
        }
        options.push(opt);
    }
    let menu = serenity::CreateSelectMenu::new(
        EDITOR_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("ticket_panel_panel_placeholder"));
    rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])
        .ok()
        .and_then(|mut v| v.pop())
        .unwrap_or(json!({"type": CT_ACTION_ROW, "components": []}))
}

/// TS `sendButton` (!panel.ts:336): `send_embed`, Primary, the
/// `ticket_panel_button_send` label and the `Ticket_Send` emoji with the
/// `GreenTick` fallback.
async fn send_button_row_v2(
    sctx: &serenity::Context,
    t: &(dyn Fn(&str) -> String + Send + Sync),
) -> Value {
    let label = t("ticket_panel_button_send");
    let mut button = serenity::CreateButton::new(EDITOR_SEND_ID)
        .label(if label.is_empty() {
            "Send".to_string()
        } else {
            label
        })
        .style(serenity::ButtonStyle::Primary);
    let send_markup = crate::emojis::app_emoji_markup(&sctx.http, "Ticket_Send").await;
    let green_markup = if send_markup.is_none() {
        crate::emojis::app_emoji_markup(&sctx.http, "GreenTick").await
    } else {
        None
    };
    let markup = send_markup.or(green_markup);
    let rt = markup
        .as_deref()
        .and_then(parse_emoji)
        .unwrap_or(serenity::ReactionType::Unicode("✅".to_string()));
    button = button.emoji(rt);
    rows_json(vec![serenity::CreateActionRow::Buttons(vec![button])])
        .ok()
        .and_then(|mut v| v.pop())
        .unwrap_or(json!({"type": CT_ACTION_ROW, "components": []}))
}

/// TS `saved` marker row (!panel.ts:560-568): disabled Success `Saved`
/// button with the `Yes` app emoji.
async fn saved_row_v2(sctx: &serenity::Context) -> Value {
    let yes = crate::emojis::app_emoji_markup(&sctx.http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let rt = parse_emoji(&yes).unwrap_or(serenity::ReactionType::Unicode("✅".to_string()));
    let button = serenity::CreateButton::new(SAVED_BUTTON_ID)
        .label("Saved")
        .style(serenity::ButtonStyle::Success)
        .emoji(rt)
        .disabled(true);
    rows_json(vec![serenity::CreateActionRow::Buttons(vec![button])])
        .ok()
        .and_then(|mut v| v.pop())
        .unwrap_or(json!({"type": CT_ACTION_ROW, "components": []}))
}

/// TS `buildPanelMessage` (!panel.ts:531): container + select row +
/// button row, with the overflow .txt when options exceed the caps.
async fn full_panel_payload(
    sctx: &serenity::Context,
    guild_id: Option<serenity::GuildId>,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    panel_code: &str,
    is_saved: bool,
    header_emoji: Option<&str>,
) -> (Vec<Value>, Vec<(String, Vec<u8>)>) {
    let role_of = |r: &str| cached_role_name(sctx, guild_id, r);
    let components = vec![
        build_container(t, panel, panel_code, is_saved, &role_of, header_emoji),
        editor_select_row_v2(sctx, t).await,
        send_button_row_v2(sctx, t).await,
    ];
    let files = options_overflow_file(t, panel_code, &panel.config.option_fields, &role_of)
        .into_iter()
        .collect();
    (components, files)
}

/// Patch a prompt container + one picker row (the sub-flow legs), like
/// the TS `originalResponse.edit({components: [buildPromptContainer,
/// row], files: [], flags})` steps.
async fn patch_prompt_row(msg: &serenity::Message, prompt_text: &str, row: Value) {
    let _ = patch_message_v2(
        msg.channel_id.get(),
        msg.id.get(),
        &[prompt_container(prompt_text), row],
        vec![],
        false,
    )
    .await;
}

fn first_row(rows: Result<Vec<Value>, String>) -> Value {
    rows.ok()
        .and_then(|mut v| v.pop())
        .unwrap_or(json!({"type": CT_ACTION_ROW, "components": []}))
}

/// Per-step editor await. Mirrors the `time: 1_250_000 * 10` ms
/// (~3.47h) select + button collectors in !panel.ts:366,372.
const STEP_TIMEOUT_SECS: u64 = 12_500;

/// Table-first panel load with legacy kv fallback (keys unchanged). A
/// legacy hit promotes into the table so rows migrate lazily; pair with
/// `save_panel_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_panel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    panel_id: &str,
) -> TicketPanel {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, &panel_key(panel_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first panel store with legacy kv dual-write (keys unchanged).
pub async fn save_panel_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    panel_id: &str,
    panel: &TicketPanel,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        &panel_key(panel_id),
        &serde_json::to_string(panel)?,
    )
    .await
}

// ---- Pure panel-code / marker / menu assembly ----
// TS evidence: !panel.ts:128-135 (`rawData?.panelCode ||
// generatePassword({length:10, uppercase:true, numbers:true})`),
// :759-761 (`GUILD.TICKET_PANEL.${sentPanel.id}` -> panelCode),
// :733-752 (send select menu mapping), :495-515 (unique values).

/// Panel code assembly: keep the stored code, else mint a 10-char
/// uppercase-alphanumeric code like TS generatePassword.
pub fn assemble_panel_code(existing: Option<&str>) -> String {
    if let Some(raw) = existing {
        let code = raw.trim().to_string();
        if !code.is_empty() {
            return code;
        }
    }
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0x9E3779B97F4A7C15);
    crate::funcs::generate_password(
        &crate::funcs::PasswordOptions {
            length: 10,
            numbers: true,
            symbols: crate::funcs::SymbolCharset::Off,
            lowercase: true,
            uppercase: true,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        },
        seed,
    )
    .unwrap_or_else(|_| "TICKETPANEL".to_string())
}

/// Marker value stored at `GUILD.TICKET_PANEL.<sentMsgId>`: the panel
/// code, JSON-encoded like the other kv rows.
pub fn marker_value(panel_code: &str) -> String {
    serde_json::to_string(&panel_code.to_string()).unwrap_or_default()
}

/// Marker row pair for a sent opener message: key
/// `GUILD.TICKET_PANEL.<sentMsgId>`, value the encoded panel code.
pub fn marker_pair(sent_message_id: u64, panel_code: &str) -> (String, String) {
    (
        panel_key(&sent_message_id.to_string()),
        marker_value(panel_code),
    )
}

/// Mint a `ticket_option_<12 alnum>` value not already used, like
/// generateUniqueOptionFieldValue.
pub fn mint_option_value(used: &[String]) -> String {
    let has: std::collections::HashSet<&str> = used.iter().map(|s| s.as_str()).collect();
    for salt in 0..64u64 {
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64 ^ salt.wrapping_mul(0x9E3779B97F4A7C15))
            .unwrap_or(salt + 1);
        let suffix = crate::funcs::generate_password(
            &crate::funcs::PasswordOptions {
                length: 12,
                numbers: true,
                symbols: crate::funcs::SymbolCharset::Off,
                lowercase: true,
                uppercase: true,
                exclude_similar: false,
                exclude: String::new(),
                strict: false,
            },
            seed,
        )
        .unwrap_or_else(|_| format!("FALLBACK{salt:04}"));
        let value = format!("ticket_option_{suffix}");
        if !has.contains(value.as_str()) {
            return value;
        }
    }
    format!(
        "ticket_option_{:x}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(1)
    )
}

/// Fill blank/duplicate option values with minted ones. Mirrors
/// ensureUniqueOptionFieldValues; returns true when changed.
pub fn ensure_unique_option_values(options: &mut [TicketOption]) -> bool {
    let mut used: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut changed = false;
    for opt in options.iter_mut() {
        let current = opt.value.trim().to_string();
        if current.is_empty() || used.contains(&current) {
            let known: Vec<String> = used.iter().cloned().collect();
            opt.value = mint_option_value(&known);
            changed = true;
        } else {
            opt.value = current;
        }
        used.insert(opt.value.clone());
    }
    changed
}

/// Send-menu option mapping: label/desc truncated to 100 chars like
/// the TS sendEmbed/preview builders.
pub fn v2_menu_options(panel: &TicketPanel) -> Vec<(String, String, Option<String>, String)> {
    panel
        .config
        .option_fields
        .iter()
        .map(|opt| {
            let label: String = opt.name.chars().take(100).collect();
            let desc = if opt.desc.trim().is_empty() {
                None
            } else {
                Some(opt.desc.chars().take(100).collect())
            };
            (label, opt.value.clone(), desc, opt.emoji.clone())
        })
        .collect()
}

/// Emoji gate for added options: keep custom `<...:...>` emoji or a
/// single glyph, drop anything else. Mirrors the
/// isSingleEmoji/isDiscordEmoji check in addOption.
pub fn sanitize_option_emoji(raw: &str) -> String {
    let emoji = raw.trim();
    if emoji.is_empty() {
        return String::new();
    }
    if emoji.starts_with('<') && emoji.ends_with('>') && emoji.contains(':') {
        return emoji.to_string();
    }
    if emoji.chars().count() == 1 {
        return emoji.to_string();
    }
    String::new()
}

/// Options summary for the editor embed. Mirrors stringifyOptions
/// (!panel.ts:576-616): code-fenced list with box-drawing `┖` detail
/// rows, the add-option modal field labels, the `📂` category mention
/// and the `📚` per-option form block. Like TS, the 1024 cap counts
/// UTF-16 units (`str.length`); overflow falls back to the
/// `ticket_panel_option_fields` key.
pub fn summarize_options(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    options: &[TicketOption],
    role_name: &dyn Fn(&str) -> Option<String>,
) -> String {
    if options.is_empty() {
        return String::new();
    }
    let unknown = t("var_unknown");
    let mut out = String::from("```\n");
    for opt in options {
        out.push_str(&format!("- {}\n", opt.name));
        if !opt.desc.is_empty() {
            out.push_str(&format!(
                "  ┖ {}: {}\n",
                t("ticket_panel_add_option_modal_field2_label"),
                opt.desc
            ));
        }
        if !opt.emoji.is_empty() {
            out.push_str(&format!(
                "  ┖ {}: {}\n",
                t("ticket_panel_add_option_modal_field3_label"),
                opt.emoji
            ));
        }
        if !opt.category_id.is_empty() {
            // TS formatCategory resolves the cached channel mention and
            // falls back to var_no_set when uncached; `<#id>` is the
            // cached shape (the only one that renders as a mention).
            out.push_str(&format!("  ┖ 📂: <#{}>\n", opt.category_id));
        }
        if !opt.panel_id.is_empty() {
            out.push_str(&format!(
                "  ┖ {}: {}\n",
                t("ticket_panel_change_embed_modal_placeholder"),
                opt.panel_id
            ));
        }
        if !opt.roles_to_ping.is_empty() {
            out.push_str(&format!("  ┖ {}:\n", t("ticket_panel_role_to_ping")));
            for role in &opt.roles_to_ping {
                let name = role_name(role).unwrap_or_else(|| unknown.clone());
                out.push_str(&format!("     ┖ 🔹 {role} (@{name})\n"));
            }
            out.push('\n');
        }
        if !opt.form.is_empty() {
            out.push_str(&format!("  ┖ 📚 {}:\n", t("var_form")));
            for f in &opt.form {
                out.push_str(&format!("     ┖ 🔹 {}\n", f.question_title));
                if !f.question_placeholder.is_empty() {
                    out.push_str(&format!("       ┖ {}\n", f.question_placeholder));
                }
            }
        }
        out.push('\n');
    }
    out.push_str("```");
    if out.encode_utf16().count() > 1024 {
        return t("ticket_panel_option_fields");
    }
    out
}

/// Panel-level form summary. Mirrors stringifyForm (!panel.ts:619):
/// code-fenced `i - title` rows with `┖` placeholders and a blank line
/// per question; overflow falls back to the same
/// `ticket_panel_option_fields` key.
pub fn summarize_forms(t_overflow: &str, forms: &[TicketForm]) -> String {
    if forms.is_empty() {
        return String::new();
    }
    let mut out = String::from("```\n");
    for (i, f) in forms.iter().enumerate() {
        out.push_str(&format!("{i} - {}\n", f.question_title));
        if !f.question_placeholder.trim().is_empty() {
            out.push_str(&format!("  ┖ {}\n", f.question_placeholder));
        }
        out.push('\n');
    }
    out.push_str("```");
    if out.len() > 1024 {
        return t_overflow.to_string();
    }
    out
}

/// Overflow gate: mirrors TS shouldAttachOptionsFile (true when the
/// capped field summary fell back to the overflow key string).
pub fn options_overflowed(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    options: &[TicketOption],
    role_name: &dyn Fn(&str) -> Option<String>,
) -> bool {
    !options.is_empty()
        && summarize_options(t, options, role_name) == t("ticket_panel_option_fields")
}

/// Overflow attachment filename: TS
/// `ticket-panel-${panelCode}-options.txt`.
pub fn options_overflow_filename(panel_code: &str) -> String {
    format!("ticket-panel-{panel_code}-options.txt")
}

/// Full per-option dump for the overflow .txt file. Mirrors TS
/// stringifyOptionsDetailed: no 1024 cap, plain labels (no code fence,
/// no box-drawing), trimEnd; empty list falls back to var_no_set.
/// `role_name` resolves a role id to its guild name (None -> the
/// var_unknown key, like TS `r?.name || lang.var_unknown`).
pub fn detailed_options_content(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    options: &[TicketOption],
    role_name: &dyn Fn(&str) -> Option<String>,
) -> String {
    if options.is_empty() {
        return t("var_no_set");
    }
    let unknown = t("var_unknown");
    let mut out = String::new();
    for opt in options {
        out.push_str(&format!("- {}\n", opt.name));
        // TS truthiness (`if (opt.desc)`): empty string skips, any other
        // content (even whitespace) renders.
        if !opt.desc.is_empty() {
            out.push_str(&format!(
                "  {}: {}\n",
                t("ticket_panel_add_option_modal_field2_label"),
                opt.desc
            ));
        }
        if !opt.emoji.is_empty() {
            out.push_str(&format!(
                "  {}: {}\n",
                t("ticket_panel_add_option_modal_field3_label"),
                opt.emoji
            ));
        }
        if !opt.category_id.is_empty() {
            out.push_str(&format!("  Category: <#{}>\n", opt.category_id));
        }
        if !opt.panel_id.is_empty() {
            out.push_str(&format!(
                "  {}: {}\n",
                t("ticket_panel_change_embed_modal_placeholder"),
                opt.panel_id
            ));
        }
        if !opt.roles_to_ping.is_empty() {
            out.push_str(&format!("  {}:\n", t("ticket_panel_role_to_ping")));
            for role in &opt.roles_to_ping {
                let name = role_name(role).unwrap_or_else(|| unknown.clone());
                out.push_str(&format!("    - {role} (@{name})\n"));
            }
        }
        if !opt.form.is_empty() {
            out.push_str(&format!("  {}:\n", t("var_form")));
            for f in &opt.form {
                out.push_str(&format!("    - {}\n", f.question_title));
                if !f.question_placeholder.is_empty() {
                    out.push_str(&format!("      {}\n", f.question_placeholder));
                }
            }
        }
        out.push('\n');
    }
    out.trim_end().to_string()
}

/// Builds the overflow attachment pair (filename, utf-8 bytes) when the
/// options exceed the field caps; None otherwise. Mirrors TS
/// buildOptionsAttachment. Call sites wrap it in
/// `serenity::CreateAttachment::bytes(bytes, filename)`.
pub fn options_overflow_file(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel_code: &str,
    options: &[TicketOption],
    role_name: &dyn Fn(&str) -> Option<String>,
) -> Option<(String, Vec<u8>)> {
    if !options_overflowed(t, options, role_name) {
        return None;
    }
    let content = detailed_options_content(t, options, role_name);
    Some((options_overflow_filename(panel_code), content.into_bytes()))
}

/// Resolve a role id to its cached guild name for the overflow file
/// (TS `guild.roles.cache.get(role)?.name`).
fn cached_role_name(
    sctx: &serenity::Context,
    guild_id: Option<serenity::GuildId>,
    role_id: &str,
) -> Option<String> {
    let gid = guild_id?;
    let rid = role_id.trim().parse::<u64>().ok()?;
    sctx.cache.guild(gid).and_then(|g| {
        g.roles
            .get(&serenity::RoleId::new(rid))
            .map(|r| r.name.clone())
    })
}

// ---- Editor command ----

/// Making a panel for custom ticket configuration.
// Loads (or mints) the panel row, then runs the builder loop
// (options, forms, roles, category, related embed, preview,
// send-to-channel + marker write). Mirrors !panel.ts. Registry name,
// admin gate and disable guard are unchanged.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "panel",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Créer un panel pour customiser le système de ticket"),
    description_localized("ja", "カスタムチケット設定用パネルを作成"),
    description_localized("ru", "Создание панели для настройки тикетов"),
    description_localized("es-ES", "Crear un panel para configuración de tickets personalizada")
)]
pub async fn ticket_panel(
    ctx: Ctx<'_>,
    #[description = "ID of your panel"]
    #[description_localized("fr", "L'identifiant du panel")]
    #[description_localized("ja", "パネルのID")]
    #[description_localized("ru", "ID вашей панели")]
    #[description_localized("es-ES", "ID de tu panel")]
    panel_id: Option<String>,
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
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let key = panel_id.as_deref().map(str::trim).unwrap_or_default();
    // Intentional fresh-default leg (kept, no behavior change): TS
    // `!panel.ts:117-155` reads `GUILD.TICKET_PANEL.<panel_id>` and, when
    // the row is missing (empty panel_id -> `...TICKET_PANEL.null`),
    // falls through to `baseData` fresh defaults (minted panelCode,
    // empty optionFields, pingUser/userSelectPanel/deleteButton/
    // transcriptButton true). `TicketPanel::default()` is that leg.
    let mut panel = if key.is_empty() {
        TicketPanel::default()
    } else {
        load_panel_routed(pool, &gid, key).await
    };
    if panel.placeholder.trim().is_empty() {
        panel.placeholder = t("ticket_panel_default_placeholder");
    }
    let panel_code = assemble_panel_code(if panel.panel_code.trim().is_empty() {
        None
    } else {
        Some(&panel.panel_code)
    });
    panel.panel_code = panel_code.clone();
    let mut saved = false;

    let author = ctx.author().id;
    let sctx = ctx.serenity_context().clone();
    let guild_id_opt = ctx.guild_id();
    let channel_id = ctx.channel_id().get();
    let header_emoji = crate::emojis::app_emoji_markup(&sctx.http, "Ticket_Main").await;
    // V2 initial post per leg (raw REST, flags 32768): prefix replies to
    // the invoking message, slash defers then follows up — mirrors
    // `interactionSend` + `buildPanelMessage` in !panel.ts.
    let (components, files) = full_panel_payload(
        &sctx,
        guild_id_opt,
        &t,
        &panel,
        &panel_code,
        saved,
        header_emoji.as_deref(),
    )
    .await;
    let posted_id = match ctx {
        poise::Context::Prefix(pctx) => {
            post_channel_v2(channel_id, Some(pctx.msg.id.get()), &components, files)
                .await
                .map_err(|e| anyhow::anyhow!(e))?
        }
        poise::Context::Application(app_ctx) => {
            app_ctx.defer().await?;
            let app_id = sctx.cache.current_user().id.get();
            webhook_followup_v2(app_id, &app_ctx.interaction.token, &components, files)
                .await
                .map_err(|e| anyhow::anyhow!(e))?
        }
    };
    let mut msg = sctx
        .http
        .get_message(
            serenity::ChannelId::new(channel_id),
            serenity::MessageId::new(posted_id),
        )
        .await?;
    // Slash-only tutorial follow-up (!panel.ts:356-360): ephemeral
    // youtu.be link once the editor is up. Prefix has no follow-up leg.
    if let poise::Context::Application(app_ctx) = ctx {
        let _ = app_ctx
            .interaction
            .create_followup(
                ctx.http(),
                serenity::CreateInteractionResponseFollowup::new()
                    .content("https://youtu.be/TehLPQ_WCwQ")
                    .ephemeral(true),
            )
            .await;
    }

    loop {
        let Some(pick) = next_pick(&msg, &sctx, author, &t("help_not_for_you")).await else {
            break;
        };
        if pick.data.custom_id == EDITOR_SEND_ID {
            if run_send_flow(
                &sctx,
                &pick,
                pool,
                &gid,
                &t,
                &mut msg,
                &panel_code,
                &mut panel,
            )
            .await?
            {
                saved = true;
                break;
            }
            refresh_editor(
                &sctx,
                ctx.guild_id(),
                &mut msg,
                &t,
                &panel,
                &panel_code,
                saved,
            )
            .await;
            continue;
        }
        if pick.data.custom_id != EDITOR_SELECT_ID {
            continue;
        }
        let choice = match &pick.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => continue,
        };
        match choice.as_str() {
            "save" => {
                let _ = pick
                    .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                ensure_unique_option_values(&mut panel.config.option_fields);
                save_panel_routed(pool, &gid, &panel_code, &panel).await?;
                saved = true;
                break;
            }
            "preview" => {
                run_preview(&sctx, &pick, pool, &gid, &t, &mut panel, &panel_code).await?;
                continue;
            }
            step => {
                if run_editor_step(&sctx, &pick, pool, &gid, &t, &mut msg, &mut panel, step).await?
                {
                    saved = false;
                }
                refresh_editor(
                    &sctx,
                    ctx.guild_id(),
                    &mut msg,
                    &t,
                    &panel,
                    &panel_code,
                    saved,
                )
                .await;
            }
        }
    }

    if saved {
        // Mirrors save() (!panel.ts:550): the editor message is edited
        // in place to the container plus the disabled `saved` Success
        // button row plus the overflow .txt (replacing stale
        // attachments). No separate confirmation message — TS stays on
        // the edited message.
        let role_of = |r: &str| cached_role_name(&sctx, ctx.guild_id(), r);
        let header = crate::emojis::app_emoji_markup(&sctx.http, "Ticket_Main").await;
        let components = vec![
            build_container(&t, &panel, &panel_code, true, &role_of, header.as_deref()),
            saved_row_v2(&sctx).await,
        ];
        let files = options_overflow_file(&t, &panel_code, &panel.config.option_fields, &role_of)
            .into_iter()
            .collect();
        let _ =
            patch_message_v2(msg.channel_id.get(), msg.id.get(), &components, files, true).await;
    } else {
        // Mirrors the selectCollector `end` handler (!panel.ts:467):
        // container-only, no rows, attachments untouched.
        let role_of = |r: &str| cached_role_name(&sctx, ctx.guild_id(), r);
        let header = crate::emojis::app_emoji_markup(&sctx.http, "Ticket_Main").await;
        let components = vec![build_container(
            &t,
            &panel,
            &panel_code,
            saved,
            &role_of,
            header.as_deref(),
        )];
        let _ = patch_message_v2(
            msg.channel_id.get(),
            msg.id.get(),
            &components,
            vec![],
            false,
        )
        .await;
    }
    Ok(())
}

async fn next_pick(
    msg: &serenity::Message,
    sctx: &serenity::Context,
    author: serenity::UserId,
    not_for_you: &str,
) -> Option<serenity::ComponentInteraction> {
    // Mirrors the TS collectors' `i.user.id !== invoker` guard
    // (!panel.ts:378,390,834,909,...): stranger presses get an
    // ephemeral `help_not_for_you` reply and the wait continues for
    // the invoker instead of silently dropping the press.
    let deadline = std::time::Instant::now() + Duration::from_secs(STEP_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            return None;
        }
        let pick = msg
            .await_component_interaction(sctx.shard.clone())
            .timeout(remaining)
            .await?;
        if pick.user.id != author {
            ephemeral(sctx, &pick, not_for_you.to_string()).await;
            continue;
        }
        return Some(pick);
    }
}

/// Editor refresh: re-render the V2 container + rows and re-attach the
/// overflow .txt (replacing stale attachments). Mirrors
/// refreshPanelMessage (!panel.ts:540: `attachments: [], files: [...]`).
async fn refresh_editor(
    sctx: &serenity::Context,
    guild_id: Option<serenity::GuildId>,
    msg: &mut serenity::Message,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    panel_code: &str,
    saved: bool,
) {
    let header = crate::emojis::app_emoji_markup(&sctx.http, "Ticket_Main").await;
    let (components, files) = full_panel_payload(
        sctx,
        guild_id,
        t,
        panel,
        panel_code,
        saved,
        header.as_deref(),
    )
    .await;
    let _ = patch_message_v2(msg.channel_id.get(), msg.id.get(), &components, files, true).await;
}

async fn show_modal(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    modal_id: &str,
    title: String,
    fields: Vec<(String, String, bool, u16, u16)>,
) -> Option<serenity::ModalInteraction> {
    // (label, custom_id, required, min, max)
    let mut opts = crate::modal_helper::ModalOptions::new(&title, modal_id);
    opts.fields = fields
        .into_iter()
        .map(|(label, custom_id, required, min, max)| {
            crate::modal_helper::ModalField::Text(crate::modal_helper::TextField {
                custom_id,
                label,
                placeholder: None,
                style: crate::modal_helper::TextStyle::Short,
                required,
                max_length: Some(max),
                min_length: Some(min),
                value: None,
            })
        })
        .collect();
    let modal = crate::modal_helper::build_modal(&opts).ok()?;
    if pick
        .create_response(
            &sctx.http,
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await
        .is_err()
    {
        return None;
    }
    crate::commands::await_modal_submit(sctx, pick, modal_id).await
}

async fn ack_modal(sctx: &serenity::Context, submit: &serenity::ModalInteraction) {
    let _ = submit
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
}

async fn ephemeral(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = pick
        .create_response(
            &sctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Pick one option index via an in-place string select. Mirrors
/// selectOption (customId + prompt + single collect): with no options
/// the editor shows `ticket_panel_remove_option_empty` and the step
/// ends (!panel.ts:783-798), like the TS null return.
async fn pick_option_index(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &TicketPanel,
    menu_id: &str,
    prompt_key: &str,
) -> Option<(usize, serenity::ComponentInteraction)> {
    if panel.config.option_fields.is_empty() {
        // Mirrors selectOption's empty leg (!panel.ts:783): prompt
        // container + full editor rows + overflow file.
        let header = crate::emojis::app_emoji_markup(&sctx.http, "Ticket_Main").await;
        let code = panel.panel_code.clone();
        let (mut full, files) = full_panel_payload(
            sctx,
            msg.guild_id,
            t,
            panel,
            &code,
            false,
            header.as_deref(),
        )
        .await;
        if !full.is_empty() {
            full[0] = prompt_container(&t("ticket_panel_remove_option_empty"));
        }
        let _ = patch_message_v2(msg.channel_id.get(), msg.id.get(), &full, files, true).await;
        return None;
    }
    let options = panel
        .config
        .option_fields
        .iter()
        .enumerate()
        .map(|(idx, opt)| {
            serenity::CreateSelectMenuOption::new(
                opt.name.chars().take(100).collect::<String>(),
                idx.to_string(),
            )
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        menu_id,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("var_chose_option"));
    patch_prompt_row(
        msg,
        &t(prompt_key),
        first_row(rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])),
    )
    .await;
    let pick = next_pick(msg, sctx, author, &t("help_not_for_you")).await?;
    if pick.data.custom_id != menu_id {
        return None;
    }
    let idx: usize = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first()?.trim().parse().ok()?
        }
        _ => return None,
    };
    if idx >= panel.config.option_fields.len() {
        ephemeral(sctx, &pick, t("ticket_panel_option_invalid")).await;
        return None;
    }
    Some((idx, pick))
}

/// Add/remove submenu. Mirrors the changeOption/changeForm selects.
/// Returns (is_add, live_sub_pick): the sub-pick is unacknowledged so
/// callers can show a modal on it for the add path. The placeholder
/// differs per flow: `ticket_panel_change_option_select_placeholder`
/// for changeOption/changeForm (!panel.ts:1321,1491) but `var_action`
/// for the per-option form select (!panel.ts:874). Eight contextual params
// mirror the TS collector flow one-to-one; bundling them into a struct
// would churn every call site for no behavior gain, so the lint is
// allowed here instead.
#[allow(clippy::too_many_arguments)]
async fn pick_add_or_remove(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    menu_id: &str,
    prompt: String,
    placeholder_key: &str,
    add_label_key: &str,
    remove_label_key: &str,
) -> Option<(bool, serenity::ComponentInteraction)> {
    let options = vec![
        serenity::CreateSelectMenuOption::new(t(add_label_key), "add".to_string()),
        serenity::CreateSelectMenuOption::new(t(remove_label_key), "remove".to_string()),
    ];
    let menu = serenity::CreateSelectMenu::new(
        menu_id,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t(placeholder_key));
    patch_prompt_row(
        msg,
        &prompt,
        first_row(rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])),
    )
    .await;
    let pick = next_pick(msg, sctx, author, &t("help_not_for_you")).await?;
    if pick.data.custom_id != menu_id {
        return None;
    }
    let choice = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => return None,
    };
    match choice.as_str() {
        "add" => Some((true, pick)),
        "remove" => Some((false, pick)),
        _ => None,
    }
}

/// Role picker via a native RoleSelect menu. Mirrors the TS
/// RoleSelectMenuBuilder steps (max 10, min 0).
async fn pick_roles(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    menu_id: &str,
    current: &[String],
) -> Option<Vec<String>> {
    let defaults: Vec<serenity::RoleId> = current
        .iter()
        .filter_map(|r| r.trim().parse::<u64>().ok().map(serenity::RoleId::new))
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        menu_id,
        serenity::CreateSelectMenuKind::Role {
            default_roles: if defaults.is_empty() {
                None
            } else {
                Some(defaults)
            },
        },
    )
    .placeholder(t("ticket_panel_change_role_roleSelect_placeholder"))
    .min_values(0)
    .max_values(10);
    patch_prompt_row(
        msg,
        &t("ticket_panel_change_role_interaction_content"),
        first_row(rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])),
    )
    .await;
    let pick = next_pick(msg, sctx, author, &t("help_not_for_you")).await?;
    if pick.data.custom_id != menu_id {
        return None;
    }
    let roles = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::RoleSelect { values } => {
            values.iter().map(|r| r.get().to_string()).collect()
        }
        _ => return None,
    };
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    Some(roles)
}

/// Category picker via a native ChannelSelect (GuildCategory only).
/// Mirrors the changeCategory / changeCategoryForOption steps.
async fn pick_category(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    menu_id: &str,
) -> Option<String> {
    let menu = serenity::CreateSelectMenu::new(
        menu_id,
        serenity::CreateSelectMenuKind::Channel {
            channel_types: Some(vec![serenity::ChannelType::Category]),
            default_channels: None,
        },
    )
    .placeholder(t("ticket_panel_change_category_channelSelect_placeholder"));
    patch_prompt_row(
        msg,
        &t("ticket_panel_select_channel_to_send"),
        first_row(rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])),
    )
    .await;
    let pick = next_pick(msg, sctx, author, &t("help_not_for_you")).await?;
    if pick.data.custom_id != menu_id {
        return None;
    }
    let id = match &pick.data.kind {
        serenity::ComponentInteractionDataKind::ChannelSelect { values } => {
            values.first()?.get().to_string()
        }
        _ => return None,
    };
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    Some(id)
}

async fn embed_exists(pool: &crate::db::Pool, gid: &str, embed_id: &str) -> bool {
    // Table-first with legacy kv fallback (keys unchanged).
    embed_source_routed(pool, gid, embed_id).await.is_some()
}

/// One editor step. Returns true when the panel mutated (saved flag
/// must flip, like `isSaved = false` in TS).
#[allow(clippy::too_many_arguments)]
async fn run_editor_step(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    msg: &mut serenity::Message,
    panel: &mut TicketPanel,
    step: &str,
) -> Result<bool, anyhow::Error> {
    let author = pick.user.id;
    match step {
        "change_embed" => {
            // Mirrors changeEmbed (!panel.ts:1230): modal only, no tip
            // follow-up (the tip is exclusive to the change_embed2 /
            // channel-panel leg below).
            let Some(submit) = show_modal(
                sctx,
                pick,
                MODAL_EMBED,
                t("ticket_panel_change_embed_modal_placeholder"),
                vec![(
                    t("ticket_panel_change_embed_modal_placeholder"),
                    "embed_id".to_string(),
                    true,
                    0,
                    20,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            let id = crate::modal_helper::text_value(&submit, "embed_id")
                .trim()
                .to_string();
            if !embed_exists(pool, gid, &id).await {
                ack_modal(sctx, &submit).await;
                ephemeral(sctx, pick, t("ticket_panel_change_embed_dont_exist")).await;
                return Ok(false);
            }
            panel.related_embed_id = id;
            ack_modal(sctx, &submit).await;
            Ok(true)
        }
        "change_role" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let current = panel.config.roles_to_ping.clone();
            let Some(roles) = pick_roles(sctx, msg, author, t, ROLE_PICK_ID, &current).await else {
                return Ok(false);
            };
            panel.config.roles_to_ping = roles;
            Ok(true)
        }
        "change_placeholder" => {
            let Some(submit) = show_modal(
                sctx,
                pick,
                MODAL_PLACEHOLDER,
                t("ticket_panel_change_placeholder_modal_title"),
                vec![(
                    t("ticket_panel_change_placeholder_modal_placeholder"),
                    "placeholder".to_string(),
                    true,
                    4,
                    100,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            panel.placeholder = crate::modal_helper::text_value(&submit, "placeholder")
                .trim()
                .to_string();
            ack_modal(sctx, &submit).await;
            Ok(true)
        }
        "change_category" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some(id) = pick_category(sctx, msg, author, t, CATEGORY_PICK_ID).await else {
                return Ok(false);
            };
            panel.category_id = id;
            Ok(true)
        }
        "change_category_2" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                OPT_PICK_CATEGORY_ID,
                "ticket_panel_option_change_category",
            )
            .await
            else {
                return Ok(false);
            };
            let _ = opt_pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some(id) = pick_category(sctx, msg, author, t, CATEGORY_PICK_OPTION_ID).await
            else {
                return Ok(false);
            };
            if let Some(opt) = panel.config.option_fields.get_mut(idx) {
                opt.category_id = id;
            }
            Ok(true)
        }
        "change_ping" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.ping_user = !panel.config.ping_user;
            Ok(true)
        }
        "change_option" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((add, sub)) = pick_add_or_remove(
                sctx,
                msg,
                author,
                t,
                ADD_REMOVE_OPTION_ID,
                t("ticket_panel_change_option_interaction_content"),
                "ticket_panel_change_option_select_placeholder",
                "ticket_panel_change_option_select_1_label",
                "ticket_panel_change_option_select_2_label",
            )
            .await
            else {
                return Ok(false);
            };
            if add {
                if panel.config.option_fields.len() >= 10 {
                    ephemeral(sctx, &sub, t("ticket_panel_add_option_max_10")).await;
                    return Ok(false);
                }
                return Ok(run_option_add_modal(sctx, &sub, t, panel).await);
            }
            let _ = sub
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                OPT_PICK_REMOVE_ID,
                "ticket_panel_rempve_option_interaction_content",
            )
            .await
            else {
                return Ok(false);
            };
            let _ = opt_pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            if idx < panel.config.option_fields.len() {
                panel.config.option_fields.remove(idx);
                return Ok(true);
            }
            Ok(false)
        }
        "change_form" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            return run_panel_form_step(sctx, msg, author, t, panel).await;
        }
        "change_ticket_channel_panel" => {
            // Mirrors changeTicketChannelPanel (!panel.ts:1268): the
            // variables tip follows the step interaction up front
            // (TS `i.followUp` before the embed check), a missing embed
            // is answered on the modal and clears the stored panel id
            // (`embedId = undefined`), then the modal is acked.
            let tip = t("ticket_panel_tip_about_variable1").replace(
                "${client.iHorizon_Emojis.VC_OpenChat}",
                &crate::emojis::app_emoji_markup(&sctx.http, "VC_OpenChat")
                    .await
                    .unwrap_or_default(),
            );
            if !tip.trim().is_empty() {
                let _ = pick
                    .create_followup(
                        &sctx.http,
                        serenity::CreateInteractionResponseFollowup::new()
                            .content(tip)
                            .ephemeral(true),
                    )
                    .await;
            }
            let Some(submit) = show_modal(
                sctx,
                pick,
                MODAL_CHANNEL_PANEL,
                t("ticket_panel_change_embed_modal_placeholder"),
                vec![(
                    t("ticket_panel_change_embed_modal_placeholder"),
                    "embed_id".to_string(),
                    true,
                    0,
                    20,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            let id = crate::modal_helper::text_value(&submit, "embed_id")
                .trim()
                .to_string();
            if !embed_exists(pool, gid, &id).await {
                panel.ticket_channel_panel = String::new();
                let _ = submit
                    .create_response(
                        &sctx.http,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t("ticket_panel_change_embed_dont_exist"))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                return Ok(true);
            }
            panel.ticket_channel_panel = id;
            ack_modal(sctx, &submit).await;
            Ok(true)
        }
        "change_ticket_user_select_panel" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.user_select_panel = !panel.config.user_select_panel;
            Ok(true)
        }
        "change_ticket_button_delete_panel" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.delete_button = !panel.config.delete_button;
            Ok(true)
        }
        "change_ticket_button_transcript_panel" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            panel.config.transcript_button = !panel.config.transcript_button;
            Ok(true)
        }
        "change_ticket_channel_panel_options" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                OPT_PICK_CHANNEL_PANEL_ID,
                "ticket_panel_change_embed_options",
            )
            .await
            else {
                return Ok(false);
            };
            let Some(submit) = show_modal(
                sctx,
                &opt_pick,
                MODAL_OPT_PANEL,
                t("ticket_panel_change_embed_modal_placeholder"),
                vec![(
                    t("ticket_panel_channel_panel_embed_id"),
                    "embed_id".to_string(),
                    true,
                    8,
                    32,
                )],
            )
            .await
            else {
                return Ok(false);
            };
            let id = crate::modal_helper::text_value(&submit, "embed_id")
                .trim()
                .to_string();
            if !embed_exists(pool, gid, &id).await {
                ack_modal(sctx, &submit).await;
                ephemeral(sctx, &opt_pick, t("ticket_panel_change_embed_dont_exist")).await;
                return Ok(false);
            }
            if let Some(opt) = panel.config.option_fields.get_mut(idx) {
                opt.panel_id = id;
            }
            ack_modal(sctx, &submit).await;
            Ok(true)
        }
        "change_ticket_forms_options" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            return run_option_form_step(sctx, msg, author, t, panel).await;
        }
        "change_role_to_ping_options" => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let Some((idx, opt_pick)) = pick_option_index(
                sctx,
                msg,
                author,
                t,
                panel,
                OPT_PICK_ROLE_PING_ID,
                "ticket_panel_chose_option_to_form",
            )
            .await
            else {
                return Ok(false);
            };
            let _ = opt_pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            let current = panel
                .config
                .option_fields
                .get(idx)
                .map(|o| o.roles_to_ping.clone())
                .unwrap_or_default();
            let Some(roles) = pick_roles(sctx, msg, author, t, ROLE_PICK_OPTION_ID, &current).await
            else {
                return Ok(false);
            };
            if let Some(opt) = panel.config.option_fields.get_mut(idx) {
                opt.roles_to_ping = roles;
            }
            Ok(true)
        }
        _ => {
            let _ = pick
                .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
            Ok(false)
        }
    }
}

/// Panel-level form add/remove (change_form). The add modal runs on
/// the live add/remove sub-pick; the remove path picks a question.
async fn run_panel_form_step(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &mut TicketPanel,
) -> Result<bool, anyhow::Error> {
    let Some((add, sub)) = pick_add_or_remove(
        sctx,
        msg,
        author,
        t,
        ADD_REMOVE_FORM_ID,
        t("ticket_panel_change_form_interaction_content"),
        "ticket_panel_change_option_select_placeholder",
        "ticket_panel_change_form_select_placeholder_1",
        "ticket_panel_change_form_select_placeholder_2",
    )
    .await
    else {
        return Ok(false);
    };
    if add {
        if panel.config.form.len() >= 3 {
            ephemeral(sctx, &sub, t("ticket_panel_add_form_max_3")).await;
            return Ok(false);
        }
        let mut target = std::mem::take(&mut panel.config.form);
        let added = run_form_add_modal(
            sctx,
            &sub,
            t,
            MODAL_FORM_ADD,
            "ticket_panel_add_form_modal_field1_label",
            &mut target,
        )
        .await;
        panel.config.form = target;
        return Ok(added);
    }
    let _ = sub
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    if panel.config.form.is_empty() {
        // Mirrors removeForm's empty leg (!panel.ts:1597-1611): prompt
        // container + full editor rows + overflow file.
        let header = crate::emojis::app_emoji_markup(&sctx.http, "Ticket_Main").await;
        let code = panel.panel_code.clone();
        let (mut full, files) = full_panel_payload(
            sctx,
            msg.guild_id,
            t,
            panel,
            &code,
            false,
            header.as_deref(),
        )
        .await;
        if !full.is_empty() {
            full[0] = prompt_container(&t("ticket_panel_remove_option_empty"));
        }
        let _ = patch_message_v2(msg.channel_id.get(), msg.id.get(), &full, files, true).await;
        return Ok(false);
    }
    let options = panel
        .config
        .form
        .iter()
        .enumerate()
        .map(|(i, f)| {
            serenity::CreateSelectMenuOption::new(
                f.question_title.chars().take(100).collect::<String>(),
                i.to_string(),
            )
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        FORM_QUESTION_PICK_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("ticket_panel_remove_option_select_placeholder"));
    patch_prompt_row(
        msg,
        &t("ticket_panel_rempve_option_interaction_content"),
        first_row(rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])),
    )
    .await;
    let Some(rm) = next_pick(msg, sctx, author, &t("help_not_for_you")).await else {
        return Ok(false);
    };
    let idx: Option<usize> = match &rm.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().and_then(|v| v.trim().parse().ok())
        }
        _ => None,
    };
    let _ = rm
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    if let Some(i) = idx {
        if i < panel.config.form.len() {
            panel.config.form.remove(i);
            return Ok(true);
        }
    }
    Ok(false)
}

/// Per-option form add/remove (change_ticket_forms_options, max 3
/// questions per option). Mirrors changeTicketFormsOptions.
async fn run_option_form_step(
    sctx: &serenity::Context,
    msg: &mut serenity::Message,
    author: serenity::UserId,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &mut TicketPanel,
) -> Result<bool, anyhow::Error> {
    let Some((idx, opt_pick)) = pick_option_index(
        sctx,
        msg,
        author,
        t,
        panel,
        OPT_PICK_FORM_ID,
        "ticket_panel_chose_option_to_form",
    )
    .await
    else {
        return Ok(false);
    };
    let _ = opt_pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let Some((add, sub)) = pick_add_or_remove(
        sctx,
        msg,
        author,
        t,
        ADD_REMOVE_FORM_OPT_ID,
        t("ticket_panel_manage_form_title")
            .replace("${option.name}", &panel.config.option_fields[idx].name),
        "var_action",
        "ticket_panel_add_a_question",
        "ticket_panel_remove_a_question",
    )
    .await
    else {
        return Ok(false);
    };
    if add {
        if panel.config.option_fields[idx].form.len() >= 3 {
            ephemeral(sctx, &sub, t("ticket_panel_add_form_max_3")).await;
            return Ok(false);
        }
        let mut target = std::mem::take(&mut panel.config.option_fields[idx].form);
        let added = run_form_add_modal(
            sctx,
            &sub,
            t,
            MODAL_FORM_OPT_ADD,
            "ticket_panel_add_form_modal_field1_label",
            &mut target,
        )
        .await;
        panel.config.option_fields[idx].form = target;
        return Ok(added);
    }
    if panel.config.option_fields[idx].form.is_empty() {
        // Mirrors changeTicketFormsOptions' remove leg (!panel.ts:963-971):
        // nothing to delete answers `ticket_panel_no_question_to_delete`
        // ephemeral instead of ending silently. Replies before any ack so
        // the token is still live, like the TS reply-before-deferUpdate.
        ephemeral(sctx, &sub, t("ticket_panel_no_question_to_delete")).await;
        return Ok(false);
    }
    let _ = sub
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let options = panel.config.option_fields[idx]
        .form
        .iter()
        .enumerate()
        .map(|(i, f)| {
            serenity::CreateSelectMenuOption::new(
                f.question_title.chars().take(100).collect::<String>(),
                i.to_string(),
            )
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        FORM_QUESTION_OPT_PICK_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(t("ticket_panel_chose_a_question"));
    patch_prompt_row(
        msg,
        &t("ticket_panel_select_question_to_delete"),
        first_row(rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])),
    )
    .await;
    let Some(rm) = next_pick(msg, sctx, author, &t("help_not_for_you")).await else {
        return Ok(false);
    };
    let rm_idx: Option<usize> = match &rm.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().and_then(|v| v.trim().parse().ok())
        }
        _ => None,
    };
    let _ = rm
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    if let Some(i) = rm_idx {
        if i < panel.config.option_fields[idx].form.len() {
            panel.config.option_fields[idx].form.remove(i);
            return Ok(true);
        }
    }
    Ok(false)
}

/// Add-option modal shown on a live add/remove sub-pick. Separated
/// so the modal always has a valid interaction token.
async fn run_option_add_modal(
    sctx: &serenity::Context,
    sub_pick: &serenity::ComponentInteraction,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &mut TicketPanel,
) -> bool {
    if panel.config.option_fields.len() >= 10 {
        return false;
    }
    let Some(submit) = show_modal(
        sctx,
        sub_pick,
        MODAL_OPT_ADD,
        t("ticket_panel_add_option_modal_title"),
        vec![
            (
                t("ticket_panel_add_option_modal_field1_label"),
                "name".to_string(),
                true,
                4,
                128,
            ),
            // TS add_option desc: optional, min 4, max 130
            // (!panel.ts:1409-1416).
            (
                t("ticket_panel_add_option_modal_field2_label"),
                "desc".to_string(),
                false,
                4,
                130,
            ),
            // TS add_option emoji: optional, min 1, max 1000
            // (!panel.ts:1417-1424).
            (
                t("ticket_panel_add_option_modal_field3_label"),
                "emoji".to_string(),
                false,
                1,
                1000,
            ),
        ],
    )
    .await
    else {
        return false;
    };
    let name = crate::modal_helper::text_value(&submit, "name")
        .trim()
        .to_string();
    if name.is_empty() {
        ack_modal(sctx, &submit).await;
        return false;
    }
    let desc = crate::modal_helper::text_value(&submit, "desc")
        .trim()
        .to_string();
    let emoji = sanitize_option_emoji(&crate::modal_helper::text_value(&submit, "emoji"));
    let known: Vec<String> = panel
        .config
        .option_fields
        .iter()
        .map(|o| o.value.clone())
        .collect();
    panel.config.option_fields.push(TicketOption {
        name,
        desc,
        value: mint_option_value(&known),
        emoji,
        ..Default::default()
    });
    ack_modal(sctx, &submit).await;
    true
}

/// Add-form modal shown on a live sub-pick (panel-level or
/// per-option). Shared by the form add paths.
async fn run_form_add_modal(
    sctx: &serenity::Context,
    sub_pick: &serenity::ComponentInteraction,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    modal_id: &str,
    title_key: &str,
    target: &mut Vec<TicketForm>,
) -> bool {
    if target.len() >= 3 {
        return false;
    }
    // TS field shapes per modal:
    // - panel-level `add_form` (!panel.ts:1551): `questionTitle`
    //   (required, min 4, max 128, label
    //   ticket_panel_add_form_modal_field1_label) + `questionPlaceholder`
    //   (optional, min 4, max 130, label field2), title
    //   ticket_panel_add_form_modal_title.
    // - per-option `add_form_opt` (!panel.ts:924): `title` (required, max
    //   128, no min, label var_title) + `placeholder` (optional, max 100,
    //   no min, label roleselect_modal2_label), title
    //   ticket_panel_add_a_question.
    let is_opt = modal_id == MODAL_FORM_OPT_ADD;
    let (title_id, placeholder_id) = if is_opt {
        ("title", "placeholder")
    } else {
        ("questionTitle", "questionPlaceholder")
    };
    let title_label = if is_opt { t("var_title") } else { t(title_key) };
    let modal_title = if is_opt {
        t("ticket_panel_add_a_question")
    } else {
        t("ticket_panel_add_form_modal_title")
    };
    let placeholder_label = if is_opt {
        t("roleselect_modal2_label")
    } else {
        t("ticket_panel_add_form_modal_field2_label")
    };
    let (title_min, title_max, placeholder_min, placeholder_max) = if is_opt {
        (0, 128, 0, 100)
    } else {
        (4, 128, 4, 130)
    };
    let Some(submit) = show_modal(
        sctx,
        sub_pick,
        modal_id,
        modal_title,
        vec![
            (
                title_label,
                title_id.to_string(),
                true,
                title_min,
                title_max,
            ),
            (
                placeholder_label,
                placeholder_id.to_string(),
                false,
                placeholder_min,
                placeholder_max,
            ),
        ],
    )
    .await
    else {
        return false;
    };
    let qtitle = crate::modal_helper::text_value(&submit, title_id)
        .trim()
        .to_string();
    if qtitle.is_empty() {
        ack_modal(sctx, &submit).await;
        return false;
    }
    let qplaceholder = crate::modal_helper::text_value(&submit, placeholder_id)
        .trim()
        .to_string();
    let id = target.len() as u32;
    target.push(TicketForm {
        question_id: id,
        question_title: qtitle,
        question_placeholder: qplaceholder,
    });
    ack_modal(sctx, &submit).await;
    true
}

/// Preview step: ephemeral related embed + opener select (preview-only
/// id) + the overflow .txt when options exceed the field caps.
/// Mirrors preview() (!panel.ts:1613).
async fn run_preview(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    panel: &mut TicketPanel,
    panel_code: &str,
) -> Result<(), anyhow::Error> {
    let related: Option<serde_json::Value> = if panel.related_embed_id.trim().is_empty() {
        None
    } else {
        // Table-first with legacy kv fallback (keys unchanged).
        embed_source_routed(pool, gid, &panel.related_embed_id).await
    };
    let Some(source) = related else {
        ephemeral(sctx, pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(());
    };
    if panel.config.option_fields.is_empty() {
        ephemeral(sctx, pick, t("ticket_panel_need_1_option")).await;
        return Ok(());
    }
    // TS preview() mints blank/duplicate option values before mapping
    // (!panel.ts:1693); in-memory only, like the send flow.
    ensure_unique_option_values(&mut panel.config.option_fields);
    let Some(embed) = create_embed_from_value(&source) else {
        ephemeral(sctx, pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(());
    };
    let options = v2_menu_options(panel)
        .into_iter()
        .map(|(label, value, desc, emoji)| {
            let mut b = serenity::CreateSelectMenuOption::new(label, value);
            if let Some(d) = desc {
                b = b.description(d);
            }
            if !emoji.trim().is_empty() {
                let rt = emoji
                    .parse::<serenity::ReactionType>()
                    .unwrap_or(serenity::ReactionType::Unicode(emoji));
                b = b.emoji(rt);
            }
            b
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        V2_PREVIEW_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(panel.placeholder.clone());
    let guild_id = pick.guild_id;
    let overflow = options_overflow_file(t, panel_code, &panel.config.option_fields, &|r| {
        cached_role_name(sctx, guild_id, r)
    });
    let mut reply = serenity::CreateInteractionResponseMessage::new()
        .content(t("ticket_panel_preview_message"))
        .embed(embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
        .ephemeral(true);
    if let Some((filename, bytes)) = overflow {
        reply = reply.add_file(serenity::CreateAttachment::bytes(bytes, filename));
    }
    let _ = pick
        .create_response(
            &sctx.http,
            serenity::CreateInteractionResponse::Message(reply),
        )
        .await;
    Ok(())
}

/// Send flow: save + target-channel pick + post the opener with the
/// verbatim `ticket-open-selection-v2` menu + marker write. Mirrors
/// sendEmbed (!panel.ts:671). Returns true when sent (loop ends).
#[allow(clippy::too_many_arguments)]
async fn run_send_flow(
    sctx: &serenity::Context,
    pick: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    msg: &mut serenity::Message,
    panel_code: &str,
    panel: &mut TicketPanel,
) -> Result<bool, anyhow::Error> {
    if panel.config.option_fields.is_empty() {
        // Mirrors sendEmbed's empty leg (!panel.ts:672): prompt container
        // + full editor rows instead of an ephemeral reply.
        let select_row = editor_select_row_v2(sctx, t).await;
        let button_row = send_button_row_v2(sctx, t).await;
        let _ = patch_message_v2(
            msg.channel_id.get(),
            msg.id.get(),
            &[
                prompt_container(&t("ticket_panel_need_1_option")),
                select_row,
                button_row,
            ],
            vec![],
            false,
        )
        .await;
        return Ok(false);
    }
    ensure_unique_option_values(&mut panel.config.option_fields);
    save_panel_routed(pool, gid, panel_code, panel).await?;
    let _ = pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let menu = serenity::CreateSelectMenu::new(
        CHANNEL_SEND_PICK_ID,
        serenity::CreateSelectMenuKind::Channel {
            channel_types: Some(vec![serenity::ChannelType::Text]),
            default_channels: None,
        },
    )
    .placeholder(t("ticket_panel_select_channel_to_send"));
    // Mirrors sendEmbed's channel-select step (!panel.ts:693): prompt
    // container + channel select row.
    patch_prompt_row(
        msg,
        &t("ticket_panel_select_channel_to_send"),
        first_row(rows_json(vec![serenity::CreateActionRow::SelectMenu(menu)])),
    )
    .await;
    let Some(chan_pick) = next_pick(msg, sctx, pick.user.id, &t("help_not_for_you")).await else {
        return Ok(false);
    };
    if chan_pick.data.custom_id != CHANNEL_SEND_PICK_ID {
        return Ok(false);
    }
    let target = match &chan_pick.data.kind {
        serenity::ComponentInteractionDataKind::ChannelSelect { values } => values.first().copied(),
        _ => None,
    };
    let Some(target) = target else {
        return Ok(false);
    };
    if target.to_channel(&sctx.http).await.is_err() {
        ephemeral(sctx, &chan_pick, t("ticket_panel_channel_error")).await;
        return Ok(false);
    }
    // Table-first with legacy kv fallback (keys unchanged).
    let related: Option<serde_json::Value> =
        embed_source_routed(pool, gid, &panel.related_embed_id).await;
    let Some(source) = related else {
        ephemeral(sctx, &chan_pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(false);
    };
    let Some(embed) = create_embed_from_value(&source) else {
        ephemeral(sctx, &chan_pick, t("ticket_panel_related_embed_dont_exist")).await;
        return Ok(false);
    };
    let options = v2_menu_options(panel)
        .into_iter()
        .map(|(label, value, desc, emoji)| {
            let mut b = serenity::CreateSelectMenuOption::new(label, value);
            if let Some(d) = desc {
                b = b.description(d);
            }
            if !emoji.trim().is_empty() {
                let rt = emoji
                    .parse::<serenity::ReactionType>()
                    .unwrap_or(serenity::ReactionType::Unicode(emoji));
                b = b.emoji(rt);
            }
            b
        })
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        V2_SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(panel.placeholder.clone());
    let guild_id = chan_pick.guild_id;
    let mut opener = serenity::CreateMessage::new()
        .embed(embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(menu)]);
    if let Some((filename, bytes)) =
        options_overflow_file(t, panel_code, &panel.config.option_fields, &|r| {
            cached_role_name(sctx, guild_id, r)
        })
    {
        opener = opener.add_file(serenity::CreateAttachment::bytes(bytes, filename));
    }
    let sent = target.send_message(&sctx.http, opener).await?;
    let (marker_key, marker_val) = marker_pair(sent.id.get(), panel_code);
    let _ =
        crate::commands::owner::main::routed_set(pool, gid, gid, &marker_key, &marker_val).await;
    let _ = chan_pick
        .create_response(&sctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let done = t("ticket_panel_saved_and_sended_panel")
        .replace("${panelCode}", panel_code)
        .replace("${channel.toString()}", &format!("<#{target}>"));
    // Mirrors sendEmbed's end state (!panel.ts:765): prompt container
    // only, attachments untouched.
    let _ = patch_message_v2(
        msg.channel_id.get(),
        msg.id.get(),
        &[prompt_container(&done)],
        vec![],
        false,
    )
    .await;
    Ok(true)
}

/// Post a V2 opener message for a saved panel and record the
/// `GUILD.TICKET_PANEL.<sentMsgId>` marker. Mirrors sendEmbed
/// (!panel.ts:750): related-embed attach, select menu, marker write.
/// Classic embed + select menu on purpose: serenity 0.12 has no Container
/// / Components-V2 builders, and the posted opener TS builds is itself a
/// plain embed with a string-select row, so the save/preview/send flow
/// keeps that shape instead of the in-editor V2 chrome.
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
        // Table-first with legacy kv fallback (keys unchanged).
        let stored: Option<serde_json::Value> =
            embed_source_routed(pool, gid, &panel.related_embed_id).await;
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
    let options = v2_menu_options(panel)
        .into_iter()
        .map(|(label, value, desc, emoji)| {
            let mut builder = serenity::CreateSelectMenuOption::new(label, value);
            if let Some(d) = desc {
                builder = builder.description(d);
            }
            if !emoji.trim().is_empty() {
                let rt = emoji
                    .parse::<serenity::ReactionType>()
                    .unwrap_or(serenity::ReactionType::Unicode(emoji));
                builder = builder.emoji(rt);
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
    // Mirrors buildPanelMessage (!panel.ts): the overflow .txt rides with
    // the posted opener when options exceed the field caps.
    let mut msg = serenity::CreateMessage::new()
        .embed(embed)
        .components(vec![serenity::CreateActionRow::SelectMenu(menu)]);
    let sctx = ctx.serenity_context();
    if let Some((filename, bytes)) =
        options_overflow_file(&t, panel_code, &panel.config.option_fields, &|r| {
            cached_role_name(sctx, ctx.guild_id(), r)
        })
    {
        msg = msg.add_file(serenity::CreateAttachment::bytes(bytes, filename));
    }
    if let Ok(sent) = ctx.channel_id().send_message(&http, msg).await {
        let (marker_key, marker_val) = marker_pair(sent.id.get(), panel_code);
        let _ = crate::commands::owner::main::routed_set(pool, gid, gid, &marker_key, &marker_val)
            .await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panel_code_keeps_stored() {
        assert_eq!(assemble_panel_code(Some("ABC123")), "ABC123");
        assert_eq!(assemble_panel_code(Some("  X9  ")), "X9");
    }

    #[test]
    fn panel_code_mints_ts_shape() {
        for seed in [None, Some(""), Some("   ")] {
            let code = assemble_panel_code(seed);
            assert_eq!(code.len(), 10, "code: {code}");
            // TS charset: generatePassword defaults lowercase:true, so
            // codes are mixed-case alphanumerics (upper+lower+digits).
            assert!(code.chars().all(|c| c.is_ascii_alphanumeric()));
        }
        let a = assemble_panel_code(None);
        assert_eq!(a.len(), 10);
    }

    #[test]
    fn marker_pair_shape_matches_ts() {
        let (key, val) = marker_pair(123456789, "PANELCODE1");
        assert_eq!(key, "GUILD.TICKET_PANEL.123456789");
        let back: String = serde_json::from_str(&val).unwrap();
        assert_eq!(back, "PANELCODE1");
    }

    #[test]
    fn unique_values_fill_blanks_and_dupes() {
        let mut opts = vec![
            TicketOption {
                name: "a".into(),
                value: String::new(),
                ..Default::default()
            },
            TicketOption {
                name: "b".into(),
                value: "v".into(),
                ..Default::default()
            },
            TicketOption {
                name: "c".into(),
                value: "v".into(),
                ..Default::default()
            },
        ];
        assert!(ensure_unique_option_values(&mut opts));
        assert!(opts[0].value.starts_with("ticket_option_"));
        assert_eq!(opts[1].value, "v");
        assert!(opts[2].value.starts_with("ticket_option_"));
        assert_ne!(opts[0].value, opts[2].value);
        assert!(!ensure_unique_option_values(&mut opts));
    }

    #[test]
    fn menu_options_truncate_to_100() {
        let panel = TicketPanel {
            config: TicketPanelConfig {
                option_fields: vec![TicketOption {
                    name: "n".repeat(150),
                    desc: "d".repeat(150),
                    value: "vv".into(),
                    emoji: "🔥".into(),
                    ..Default::default()
                }],
                ..Default::default()
            },
            ..Default::default()
        };
        let mapped = v2_menu_options(&panel);
        assert_eq!(mapped.len(), 1);
        assert_eq!(mapped[0].0.chars().count(), 100);
        assert_eq!(mapped[0].2.as_ref().unwrap().chars().count(), 100);
        assert_eq!(mapped[0].1, "vv");
        let blank = TicketOption {
            name: "x".into(),
            value: "y".into(),
            ..Default::default()
        };
        let p2 = TicketPanel {
            config: TicketPanelConfig {
                option_fields: vec![blank],
                ..Default::default()
            },
            ..Default::default()
        };
        assert!(v2_menu_options(&p2)[0].2.is_none());
    }

    #[test]
    fn emoji_gate_matches_ts() {
        assert_eq!(sanitize_option_emoji("🔥"), "🔥");
        assert_eq!(sanitize_option_emoji("<:pepe:123>"), "<:pepe:123>");
        assert_eq!(sanitize_option_emoji("<a:wave:456>"), "<a:wave:456>");
        assert_eq!(sanitize_option_emoji("hello"), "");
        assert_eq!(sanitize_option_emoji(""), "");
        assert_eq!(sanitize_option_emoji("🔥🔥"), "");
    }

    #[test]
    fn summaries_cap_at_1024_with_overflow_key() {
        let big = TicketOption {
            name: "n".repeat(200),
            desc: "d".repeat(200),
            value: "v".into(),
            ..Default::default()
        };
        let opts: Vec<TicketOption> = (0..10).map(|_| big.clone()).collect();
        assert_eq!(summarize_options(&overflow_t, &opts, &|_| None), "OVERFLOW");
        let small = vec![TicketOption {
            name: "Support".into(),
            value: "s".into(),
            ..Default::default()
        }];
        let s = summarize_options(&overflow_t, &small, &|_| None);
        assert!(s.contains("Support"));
        assert!(summarize_options(&overflow_t, &[], &|_| None).is_empty());
        assert!(summarize_forms("OVERFLOW", &[]).is_empty());
    }

    #[test]
    fn summary_matches_ts_stringify_options_shape() {
        // Exact stringifyOptions (!panel.ts:576) shape: code fence,
        // box-drawing detail rows, modal field labels, category mention,
        // role and form blocks with trailing blank lines.
        let opts = vec![full_option()];
        let s = summarize_options(&overflow_t, &opts, &|_| None);
        assert!(s.starts_with("```\n- Support\n"));
        assert!(s.contains("  ┖ Description: help\n"));
        assert!(s.contains("  ┖ Emoji: 🔥\n"));
        assert!(s.contains("  ┖ 📂: <#77>\n"));
        assert!(s.contains("  ┖ Embed ID: 99\n"));
        assert!(s.contains("  ┖ Role to ping:\n     ┖ 🔹 123 (@Unknown)\n\n"));
        assert!(s.contains("  ┖ 📚 Form:\n     ┖ 🔹 Q1\n       ┖ P1\n"));
        assert!(s.ends_with("\n```"));
        // Role names resolve like `r?.name || lang.var_unknown`.
        let named = summarize_options(&overflow_t, &opts, &|_| Some("Mods".to_string()));
        assert!(named.contains("     ┖ 🔹 123 (@Mods)\n"));
    }

    #[test]
    fn forms_summary_matches_ts_stringify_form_shape() {
        let forms = vec![TicketForm {
            question_id: 0,
            question_title: "Q1".into(),
            question_placeholder: "P1".into(),
        }];
        assert_eq!(
            summarize_forms("OVERFLOW", &forms),
            "```\n0 - Q1\n  ┖ P1\n\n```"
        );
    }

    #[test]
    fn ts_panel_row_parses() {
        let raw = r#"{"panelCode":"CODE1","relatedEmbedId":"99","placeholder":"pick","category":"77","config":{"rolesToPing":[],"optionFields":[],"pingUser":true,"form":[],"userSelectPanel":true,"deleteButton":true,"transcriptButton":true}}"#;
        let p: TicketPanel = serde_json::from_str(raw).unwrap();
        assert_eq!(p.panel_code, "CODE1");
        assert_eq!(p.related_embed_id, "99");
        assert_eq!(p.category_id, "77");
        assert_eq!(marker_value(&p.panel_code), "\"CODE1\"");
    }

    #[test]
    fn mint_option_value_is_unique() {
        let used = vec!["ticket_option_AAA".to_string()];
        let v = mint_option_value(&used);
        assert!(v.starts_with("ticket_option_"));
        assert!(!used.contains(&v));
    }

    #[test]
    fn v2_component_numbers_and_flags() {
        assert_eq!(FLAGS_V2, 32_768);
        assert_eq!(PANEL_ACCENT, 0x397c16);
        assert_eq!(CT_ACTION_ROW, 1);
        assert_eq!(CT_BUTTON, 2);
        assert_eq!(CT_STRING_SELECT, 3);
        assert_eq!(CT_TEXT_DISPLAY, 10);
        assert_eq!(CT_SEPARATOR, 14);
        assert_eq!(CT_CONTAINER, 17);
        assert_eq!(
            text_display("x"),
            serde_json::json!({"type": 10, "content": "x"})
        );
        assert_eq!(
            separator(),
            serde_json::json!({"type": 14, "divider": true, "spacing": 1})
        );
        assert_eq!(
            prompt_container("hi"),
            serde_json::json!({"type": 17, "accent_color": 0x397c16, "components": [{"type": 10, "content": "hi"}]})
        );
    }

    #[test]
    fn editor_steps_match_ts_values_and_emojis() {
        let values: Vec<&str> = EDITOR_STEPS.iter().map(|(_, v, _)| *v).collect();
        assert_eq!(
            values,
            vec![
                "save",
                "preview",
                "change_embed",
                "change_role",
                "change_placeholder",
                "change_category",
                "change_category_2",
                "change_ping",
                "change_option",
                "change_form",
                "change_ticket_channel_panel",
                "change_ticket_user_select_panel",
                "change_ticket_button_delete_panel",
                "change_ticket_button_transcript_panel",
                "change_ticket_channel_panel_options",
                "change_ticket_forms_options",
                "change_role_to_ping_options",
            ]
        );
        let emojis: Vec<&str> = EDITOR_STEPS.iter().map(|(_, _, e)| *e).collect();
        assert_eq!(
            emojis,
            vec![
                "Ticket_Save",
                "Ticket_Preview",
                "Ticket_Nitro",
                "Ticket_Role",
                "Ticket_Paint",
                "Ticket_Category",
                "Ticket_Category",
                "Ticket_Bell",
                "Ticket_List",
                "Ticket_Form",
                "Ticket_Hash",
                "Ticket_User",
                "Ticket_Trash",
                "Ticket_Transcript",
                "Ticket_Settings",
                "Ticket_Form",
                "Ticket_Megaphone",
            ]
        );
        // Label keys track the same 1..17 numbering as TS (10 = per-option).
        let labels: Vec<&str> = EDITOR_STEPS.iter().map(|(l, _, _)| *l).collect();
        assert_eq!(
            labels,
            vec![
                "ticket_panel_panel_1_label",
                "ticket_panel_panel_2_label",
                "ticket_panel_panel_3_label",
                "ticket_panel_panel_4_label",
                "ticket_panel_panel_5_label",
                "ticket_panel_panel_6_label",
                "ticket_panel_panel_10_label",
                "ticket_panel_panel_7_label",
                "ticket_panel_panel_8_label",
                "ticket_panel_panel_9_label",
                "ticket_panel_panel_11_label",
                "ticket_panel_panel_12_label",
                "ticket_panel_panel_13_label",
                "ticket_panel_panel_14_label",
                "ticket_panel_panel_15_label",
                "ticket_panel_panel_16_label",
                "ticket_panel_panel_17_label",
            ]
        );
    }

    #[test]
    fn build_container_matches_ts_build_container() {
        // Identity lang map: every visible string must come from a lang
        // key (asserted literally), never a hardcoded sentence.
        let id_t = |k: &str| k.to_string();
        let panel = TicketPanel {
            panel_code: "CODE1".into(),
            related_embed_id: "99".into(),
            placeholder: "pick".into(),
            category_id: "77".into(),
            ticket_channel_panel: String::new(),
            config: TicketPanelConfig {
                roles_to_ping: vec!["5".into()],
                option_fields: vec![full_option()],
                ping_user: true,
                form: vec![TicketForm {
                    question_id: 0,
                    question_title: "Q1".into(),
                    question_placeholder: "P1".into(),
                }],
                user_select_panel: false,
                delete_button: true,
                transcript_button: false,
            },
            ..Default::default()
        };
        let c = build_container(
            &id_t,
            &panel,
            "CODE1",
            false,
            &|_| None,
            Some("<:Ticket_Main:123>"),
        );
        assert_eq!(c["type"], serde_json::json!(17));
        assert_eq!(c["accent_color"], serde_json::json!(0x397c16));
        let kids = c["components"].as_array().unwrap();
        assert_eq!(kids.len(), 6);
        // Header: `## <emoji> <title><code>\n<desc>`.
        let head = kids[0]["content"].as_str().unwrap();
        assert!(head.starts_with("## <:Ticket_Main:123> ticket_panel_embed_titleCODE1\n"));
        // Saved + related ids block.
        let ids = kids[1]["content"].as_str().unwrap();
        assert!(ids.contains("-# ticket_panel_saved_conf: 🔴"));
        assert!(ids.contains("**ticket_panel_related_embed**\n99"));
        assert!(ids.contains("**ticket_panel_channel_panel_embed_id**\nvar_no_set"));
        // Separator, then the toggles block.
        assert_eq!(kids[2]["type"], serde_json::json!(14));
        let tog = kids[3]["content"].as_str().unwrap();
        assert!(tog.contains("**ticket_panel_role_to_ping**\n<@&5>"));
        assert!(tog.contains("**ticket_panel_ping_user** 🟢"));
        assert!(tog.contains("**ticket_panel_placeholder**\npick"));
        assert!(tog.contains("**ticket_panel_category**\n<#77>"));
        assert!(tog.contains("**ticket_panel_select_user** 🔴"));
        assert!(tog.contains("**ticket_panel_button_delete** 🟢"));
        assert!(tog.contains("**ticket_panel_button_transcript** 🔴"));
        // Option fields + form sections.
        let opts = kids[4]["content"].as_str().unwrap();
        assert!(opts.starts_with("### ticket_panel_option_fields\n"));
        assert!(opts.contains("- Support"));
        let forms = kids[5]["content"].as_str().unwrap();
        assert!(forms.starts_with("### ticket_panel_form\n"));
        assert!(forms.contains("0 - Q1"));
        // Saved flag flips, missing header emoji renders bare.
        let saved = build_container(&id_t, &panel, "CODE1", true, &|_| None, None);
        assert!(saved["components"][0]["content"]
            .as_str()
            .unwrap()
            .starts_with("## ticket_panel_embed_titleCODE1\n"));
        assert!(saved["components"][1]["content"]
            .as_str()
            .unwrap()
            .contains("ticket_panel_saved_conf: 🟢"));
        // Empty option/form lists fall back to var_no_set like TS `||`.
        let bare = TicketPanel {
            panel_code: "C".into(),
            ..Default::default()
        };
        let c0 = build_container(&id_t, &bare, "C", false, &|_| None, None);
        assert!(c0["components"][3]["content"]
            .as_str()
            .unwrap()
            .contains("**ticket_panel_role_to_ping**\nvar_no_set"));
        assert!(c0["components"][4]["content"]
            .as_str()
            .unwrap()
            .ends_with("ticket_panel_option_fields\nvar_no_set"));
        assert!(c0["components"][5]["content"]
            .as_str()
            .unwrap()
            .ends_with("ticket_panel_form\nvar_no_set"));
    }

    #[test]
    fn rows_json_keeps_select_and_button_wire_shapes() {
        let row = poise::serenity_prelude::CreateActionRow::SelectMenu(
            poise::serenity_prelude::CreateSelectMenu::new(
                "panelSelect",
                poise::serenity_prelude::CreateSelectMenuKind::String {
                    options: vec![poise::serenity_prelude::CreateSelectMenuOption::new(
                        "Save", "save",
                    )],
                },
            )
            .placeholder("Pick"),
        );
        let out = first_row(rows_json(vec![row]));
        assert_eq!(out["type"], serde_json::json!(1));
        let menu = &out["components"][0];
        assert_eq!(menu["type"], serde_json::json!(3));
        assert_eq!(menu["custom_id"], serde_json::json!("panelSelect"));
        assert_eq!(menu["options"][0]["value"], serde_json::json!("save"));
        let btn = poise::serenity_prelude::CreateActionRow::Buttons(vec![
            poise::serenity_prelude::CreateButton::new("send_embed")
                .label("Send")
                .style(poise::serenity_prelude::ButtonStyle::Primary),
        ]);
        let brow = first_row(rows_json(vec![btn]));
        let b = &brow["components"][0];
        assert_eq!(b["type"], serde_json::json!(2));
        assert_eq!(b["style"], serde_json::json!(1));
        assert_eq!(b["custom_id"], serde_json::json!("send_embed"));
    }

    #[test]
    fn parse_emoji_shapes() {
        assert!(parse_emoji("").is_none());
        assert!(parse_emoji("   ").is_none());
        assert_eq!(
            parse_emoji("🔥"),
            Some(poise::serenity_prelude::ReactionType::Unicode(
                "🔥".to_string()
            ))
        );
        let custom = parse_emoji("<:Ticket_Save:123>").unwrap();
        match custom {
            poise::serenity_prelude::ReactionType::Custom { id, .. } => {
                assert_eq!(id.get(), 123);
            }
            other => panic!("expected custom, got {other:?}"),
        }
    }

    fn overflow_t(key: &str) -> String {
        match key {
            "ticket_panel_add_option_modal_field2_label" => "Description".to_string(),
            "ticket_panel_add_option_modal_field3_label" => "Emoji".to_string(),
            "ticket_panel_change_embed_modal_placeholder" => "Embed ID".to_string(),
            "ticket_panel_role_to_ping" => "Role to ping".to_string(),
            "ticket_panel_option_fields" => "OVERFLOW".to_string(),
            "var_form" => "Form".to_string(),
            "var_unknown" => "Unknown".to_string(),
            "var_no_set" => "Not Set".to_string(),
            _ => key.to_string(),
        }
    }

    fn full_option() -> TicketOption {
        TicketOption {
            name: "Support".into(),
            desc: "help".into(),
            value: "s".into(),
            emoji: "🔥".into(),
            category_id: "77".into(),
            panel_id: "99".into(),
            roles_to_ping: vec!["123".into()],
            form: vec![TicketForm {
                question_id: 0,
                question_title: "Q1".into(),
                question_placeholder: "P1".into(),
            }],
        }
    }

    #[test]
    fn overflow_filename_matches_ts() {
        assert_eq!(
            options_overflow_filename("ABC123XYZ9"),
            "ticket-panel-ABC123XYZ9-options.txt"
        );
    }

    #[test]
    fn overflow_gate_tracks_field_cap() {
        let small = vec![TicketOption {
            name: "Support".into(),
            value: "s".into(),
            ..Default::default()
        }];
        assert!(!options_overflowed(&overflow_t, &small, &|_| None));
        assert!(!options_overflowed(&overflow_t, &[], &|_| None));
        let big = TicketOption {
            name: "n".repeat(200),
            desc: "d".repeat(200),
            value: "v".into(),
            ..Default::default()
        };
        let opts: Vec<TicketOption> = (0..10).map(|_| big.clone()).collect();
        assert!(options_overflowed(&overflow_t, &opts, &|_| None));
        assert_eq!(summarize_options(&overflow_t, &opts, &|_| None), "OVERFLOW");
    }

    #[test]
    fn detailed_content_matches_ts_shape() {
        let opts = vec![full_option()];
        let content = detailed_options_content(&overflow_t, &opts, &|_| None);
        assert!(content.starts_with("- Support\n"));
        assert!(content.contains("  Description: help\n"));
        assert!(content.contains("  Emoji: 🔥\n"));
        assert!(content.contains("  Category: <#77>\n"));
        assert!(content.contains("  Embed ID: 99\n"));
        assert!(content.contains("  Role to ping:\n"));
        assert!(content.contains("    - 123 (@Unknown)\n"));
        assert!(content.contains("  Form:\n"));
        assert!(content.contains("    - Q1\n"));
        assert!(content.ends_with("      P1"));
        assert!(!content.contains("```"));
        assert!(!content.contains('┖'));
        assert!(!content.ends_with('\n'));
        let named = detailed_options_content(&overflow_t, &opts, &|_| Some("Mods".to_string()));
        assert!(named.contains("    - 123 (@Mods)\n"));
    }

    #[test]
    fn detailed_content_empty_and_multi() {
        assert_eq!(
            detailed_options_content(&overflow_t, &[], &|_| None),
            "Not Set"
        );
        let opts = vec![
            TicketOption {
                name: "A".into(),
                value: "a".into(),
                ..Default::default()
            },
            TicketOption {
                name: "B".into(),
                value: "b".into(),
                ..Default::default()
            },
        ];
        let content = detailed_options_content(&overflow_t, &opts, &|_| None);
        assert_eq!(content, "- A\n\n- B");
    }

    #[test]
    fn overflow_file_none_when_small_some_when_big() {
        let small = vec![TicketOption {
            name: "Support".into(),
            value: "s".into(),
            ..Default::default()
        }];
        assert!(options_overflow_file(&overflow_t, "CODE1", &small, &|_| None).is_none());
        let big = TicketOption {
            name: "n".repeat(200),
            desc: "d".repeat(200),
            value: "v".into(),
            ..Default::default()
        };
        let opts: Vec<TicketOption> = (0..10).map(|_| big.clone()).collect();
        let (name, bytes) =
            options_overflow_file(&overflow_t, "CODE1", &opts, &|_| None).expect("overflow file");
        assert_eq!(name, "ticket-panel-CODE1-options.txt");
        let text = String::from_utf8(bytes).unwrap();
        assert!(text.len() > 1024);
        assert!(text.contains("- nnn"));
        assert!(!text.contains("```"));
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn legacy_panel_row_reads_and_promotes_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            &panel_key("p1"),
            r#"{"name":"Support","description":"d"}"#,
        )
        .await
        .unwrap();
        let panel = load_panel_routed(&pool, "g", "p1").await;
        assert_eq!(panel.name, "Support");
        assert!(tbl_get_value(&pool, "g", &panel_key("p1")).await.is_some());
        assert_eq!(load_panel_routed(&pool, "g", "missing").await.name, "");
    }

    #[tokio::test]
    async fn save_panel_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        let panel = TicketPanel {
            name: "Support".to_string(),
            ..Default::default()
        };
        save_panel_routed(&pool, "g", "p1", &panel).await.unwrap();
        let raw = crate::db::kv_get(&pool, "g", &panel_key("p1"))
            .await
            .expect("legacy row");
        assert_eq!(
            serde_json::from_str::<TicketPanel>(&raw).unwrap().name,
            "Support"
        );
        assert!(tbl_get_value(&pool, "g", &panel_key("p1")).await.is_some());
        // Round-trip through the routed load.
        assert_eq!(load_panel_routed(&pool, "g", "p1").await.name, "Support");
    }

    #[tokio::test]
    async fn v2_marker_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::{routed_get, tbl_get_value};
        let pool = mem_pool().await;
        let (key, val) = marker_pair(424242, "PANELCODE1");
        crate::commands::owner::main::routed_set(&pool, "g", "g", &key, &val)
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", &key).await.as_deref(),
            Some(val.as_str())
        );
        assert!(tbl_get_value(&pool, "g", &key).await.is_some());
        // Functional parity: both stores decode to the same panel code
        // (kv keeps the quoted bytes, the table decodes once on write).
        assert_eq!(
            crate::commands::owner::main::decode_stored_string(
                &routed_get(&pool, "g", "g", &key).await.unwrap()
            ),
            "PANELCODE1"
        );
    }

    #[tokio::test]
    async fn embed_source_routed_legacy_fallback_and_table_wins() {
        // D5-TICKET panel.rs:972,1661,1780,1868 — every `EMBED.<id>`
        // read goes through `embed_source_routed` (table-first, legacy
        // kv fallback, keys unchanged).
        use crate::commands::owner::main::routed_set;
        let pool = mem_pool().await;
        assert!(!embed_exists(&pool, "g", "e9").await);
        let legacy = serde_json::json!({"embedSource": {"title": "legacy"}}).to_string();
        crate::db::kv_set(&pool, "g", "EMBED.e9", &legacy)
            .await
            .unwrap();
        assert!(embed_exists(&pool, "g", "e9").await);
        assert_eq!(
            super::embed_source_routed(&pool, "g", "e9").await,
            Some(serde_json::json!({"title": "legacy"}))
        );
        let table = serde_json::json!({"embedSource": {"title": "table"}}).to_string();
        routed_set(&pool, "g", "g", "EMBED.e9", &table)
            .await
            .unwrap();
        assert_eq!(
            super::embed_source_routed(&pool, "g", "e9").await,
            Some(serde_json::json!({"title": "table"}))
        );
        // Row without an embedSource leaf reads as missing.
        crate::db::kv_set(&pool, "g", "EMBED.e0", r#"{"other":1}"#)
            .await
            .unwrap();
        assert!(!embed_exists(&pool, "g", "e0").await);
    }
}
