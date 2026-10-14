//! Components V2 payload builders + raw Discord REST senders for the
//! welcomer panel.
//!
//! serenity 0.12 has no V2 builders (no TextDisplay/Separator/
//! MediaGallery/Container; its `ComponentType` stops at ChannelSelect),
//! so the panel ships V2 as hand-built JSON sent over reqwest (already
//! a dependency) with `flags: 1 << 15`. Receiving is unaffected: clicks
//! on V2 buttons/selects arrive as the same V1 interaction shapes, and
//! serenity's `deserialize_components` skips the unknown Container type
//! instead of failing the whole message.
//!
//! Layout mirrors `render()` in
//! `src/Interaction/SlashCommands/guildconfig/welcomerPanel.ts` exactly:
//! Container(accent) → TextDisplay(title) → [section select] →
//! per-section TextDisplays/ActionRows → banner Separator + status +
//! MediaGallery preview + reset/toggle + pickers. Flows and custom_ids
//! are untouched (handled in `main::handle_welcomer_component`).

use serde_json::{json, Value};

use poise::serenity_prelude::Mentionable;

// Component types (discord-api-types v10, Components V2).
pub const CT_ACTION_ROW: u8 = 1;
pub const CT_BUTTON: u8 = 2;
pub const CT_STRING_SELECT: u8 = 3;
pub const CT_ROLE_SELECT: u8 = 6;
pub const CT_CHANNEL_SELECT: u8 = 8;
pub const CT_TEXT_DISPLAY: u8 = 10;
pub const CT_MEDIA_GALLERY: u8 = 12;
pub const CT_SEPARATOR: u8 = 14;
pub const CT_CONTAINER: u8 = 17;

/// `MessageFlags.IsComponentsV2`.
pub const FLAGS_V2: u64 = 1 << 15;

/// `PANEL_ACCENT_COLOR` in welcomerPanel.ts.
pub const PANEL_ACCENT_COLOR: u32 = 0xffb3cc;

/// `BANNER_ATTACHMENT_NAME` in welcomerPanel.ts.
pub const BANNER_ATTACHMENT_NAME: &str = "image.png";

/// Separator spacing: `SeparatorSpacingSize.Large`.
const SEPARATOR_SPACING_LARGE: u8 = 2;

/// `ChannelType.GuildText` for the channel picker rows.
const CHANNEL_TYPE_GUILD_TEXT: u8 = 0;

const API: &str = "https://discord.com/api/v10";
const USER_AGENT: &str = "iHorizonRust/1.0 (welcomer-panel-v2)";

pub fn text_display(content: &str) -> Value {
    json!({"type": CT_TEXT_DISPLAY, "content": content})
}

/// TS `new SeparatorBuilder().setDivider(true).setSpacing(Large)`.
pub fn divider() -> Value {
    json!({"type": CT_SEPARATOR, "divider": true, "spacing": SEPARATOR_SPACING_LARGE})
}

pub fn media_gallery(url: &str) -> Value {
    json!({"type": CT_MEDIA_GALLERY, "items": [{"media": {"url": url}}]})
}

pub fn container(accent_color: u32, children: Vec<Value>) -> Value {
    json!({"type": CT_CONTAINER, "accent_color": accent_color, "components": children})
}

/// Convert serenity-built ActionRows to their exact V2 JSON form
/// (numeric styles/kinds). The row builders in `main::panel_rows` are
/// reused as-is so V1 and V2 can never drift on buttons/selects.
pub fn rows_json(
    rows: Vec<poise::serenity_prelude::CreateActionRow>,
) -> Result<Vec<Value>, String> {
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

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

async fn check_ok(resp: reqwest::Response, what: &str) -> Result<serde_json::Value, String> {
    let status = resp.status().as_u16();
    let body = resp.text().await.unwrap_or_default();
    if !(200..300).contains(&status) {
        return Err(format!(
            "{what}: HTTP {status}: {}",
            &body[..body.len().min(200)]
        ));
    }
    serde_json::from_str::<serde_json::Value>(&body).map_err(|e| format!("{what}: bad JSON: {e}"))
}

/// Initial panel post on the prefix leg. Mirrors `interactionSend`'s
/// message leg: a reply to the invoking message with strict
/// allowed_mentions. Returns the posted message id.
pub async fn post_channel_v2(
    channel_id: u64,
    reply_to: Option<u64>,
    components: &[Value],
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
    let body = check_ok(
        client()
            .post(format!("{API}/channels/{channel_id}/messages"))
            .header("Authorization", format!("Bot {}", bot_token()?))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("post panel: {e}"))?,
        "post panel",
    )
    .await?;
    body.get("id")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<u64>().ok())
        .ok_or_else(|| "post panel: no message id".to_string())
}

/// Full re-render edit of a panel message (the placeholder → content
/// step of `render()`). `files` carries the banner preview PNG when
/// present; without files this is a plain JSON PATCH.
pub async fn patch_message_v2(
    channel_id: u64,
    message_id: u64,
    components: &[Value],
    files: Vec<(String, Vec<u8>)>,
) -> Result<(), String> {
    let payload = json!({"components": components, "flags": FLAGS_V2});
    let req = client().patch(format!("{API}/channels/{channel_id}/messages/{message_id}"));
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

/// Interaction callback `UPDATE_MESSAGE` (type 7) with V2 components —
/// the rerender/disabled path for component clicks. `files` carries
/// the banner preview PNG (multipart `payload_json` + `files[N]`,
/// mirroring the gateway manual-multipart style).
pub async fn callback_update_v2(
    interaction_id: u64,
    interaction_token: &str,
    components: &[Value],
    files: Vec<(String, Vec<u8>)>,
) -> Result<(), String> {
    let data = json!({"components": components, "flags": FLAGS_V2});
    let req = client().post(format!(
        "{API}/interactions/{interaction_id}/{interaction_token}/callback"
    ));
    let resp = if files.is_empty() {
        req.json(&json!({"type": 7, "data": data}))
            .send()
            .await
            .map_err(|e| format!("panel update: {e}"))?
    } else {
        let (body, boundary) = multipart(
            vec![(
                "payload_json",
                json!({"type": 7, "data": data}).to_string().into_bytes(),
                None,
            )],
            &files,
        );
        req.header(
            "Content-Type",
            format!("multipart/form-data; boundary={boundary}"),
        )
        .body(body)
        .send()
        .await
        .map_err(|e| format!("panel update: {e}"))?
    };
    // Type 7 returns 204/200 depending on path; any 2xx is success.
    let status = resp.status().as_u16();
    if !(200..300).contains(&status) {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "panel update: HTTP {status}: {}",
            &body[..body.len().min(200)]
        ));
    }
    Ok(())
}

/// Slash-leg initial post: deferred followup carrying V2 components
/// (mirrors the interaction `reply` of `interactionSend`). Returns the
/// created message id for the subsequent full-render edit.
pub async fn webhook_followup_v2(
    app_id: u64,
    interaction_token: &str,
    components: &[Value],
) -> Result<u64, String> {
    let body = check_ok(
        client()
            .post(format!(
                "{API}/webhooks/{app_id}/{interaction_token}?wait=true"
            ))
            .json(&json!({"components": components, "flags": FLAGS_V2}))
            .send()
            .await
            .map_err(|e| format!("panel followup: {e}"))?,
        "panel followup",
    )
    .await?;
    body.get("id")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<u64>().ok())
        .ok_or_else(|| "panel followup: no message id".to_string())
}

/// Ephemeral V1 text reply to a component interaction (modal
/// confirmations, validation errors). Raw equivalent of
/// `source.reply({content, flags: [1 << 6]})` — callback type 4.
pub async fn callback_ephemeral(
    interaction_id: u64,
    interaction_token: &str,
    content: &str,
) -> Result<(), String> {
    let resp = client()
        .post(format!(
            "{API}/interactions/{interaction_id}/{interaction_token}/callback"
        ))
        .json(&json!({
            "type": 4,
            "data": {"content": content, "flags": 1 << 6}
        }))
        .send()
        .await
        .map_err(|e| format!("panel reply: {e}"))?;
    let status = resp.status().as_u16();
    if !(200..300).contains(&status) {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "panel reply: HTTP {status}: {}",
            &body[..body.len().min(200)]
        ));
    }
    Ok(())
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

/// Render the banner-section live preview PNG. Mirrors the
/// `generateJoinImage(interaction.member, state.banner)` leg of
/// `render()`: any miss (banner off, no gateway, fetch/render
/// failure) yields `None` and the panel renders without MediaGallery,
/// like the TS try/catch.
pub async fn banner_preview_png(
    ctx: &poise::serenity_prelude::Context,
    guild_id: poise::serenity_prelude::GuildId,
    user: &poise::serenity_prelude::User,
    member_roles: &[poise::serenity_prelude::RoleId],
    banner: &super::main::BannerConfig,
    lang_code: &str,
) -> Option<Vec<u8>> {
    let base = crate::config::gateway_base()?;
    let token = crate::config::api_token().unwrap_or_default();
    // Cached full guild: member count, banner, roles for the frame.
    // Snapshot owned data out of the cache guard (GuildRef is not Clone).
    let snapshot = ctx.cache.guild(guild_id).map(|g| {
        (
            g.name.clone(),
            g.member_count,
            g.banner_url(),
            g.roles.clone(),
            g.presences.get(&user.id).map(|p| p.status),
        )
    })?;
    let (guild_name, member_count, guild_banner, guild_roles, presence_status) = snapshot;
    // Highest coloured role as `#rrggbb` (mirrors `member.displayHexColor`
    // via events_handler::display_hex_color, but over the snapshotted
    // role map since the cache guard cannot be held).
    let display_color = guild_roles
        .iter()
        .filter(|(id, _)| member_roles.contains(id))
        .filter(|(_, r)| r.colour.0 != 0)
        .max_by_key(|(_, r)| r.position)
        .map(|(_, r)| format!("#{:06x}", r.colour.0))
        .unwrap_or_else(|| "#000000".to_string());
    let frame = if banner.frame == "status" {
        crate::events_handler::status_ring_color(presence_status.as_ref(), &display_color)
    } else {
        banner.frame.clone()
    };
    let background = if !banner.background_url.is_empty() {
        banner.background_url.clone()
    } else {
        guild_banner
            .or_else(|| user.banner_url())
            .unwrap_or_default()
    };
    let created = user.created_at().unix_timestamp();
    let message_html = crate::events_handler::render_join_leave_text(
        banner.message.as_deref().unwrap_or(""),
        &user
            .global_name
            .clone()
            .unwrap_or_else(|| user.name.clone()),
        &user.mention().to_string(),
        member_count,
        &guild_name,
        &crate::events::locale_date_string(created, lang_code),
        created,
        "unknow_user",
        "@unknow_user",
        Some(1337),
    );
    let avatar_url = crate::events_handler::join_avatar_url(user);
    let avatar_bytes = crate::commands::botcat::download_bytes(&avatar_url).await;
    let fields = crate::join_image::JoinImageFields {
        username: user
            .global_name
            .clone()
            .unwrap_or_else(|| user.name.clone()),
        guild_name,
        member_count,
        frame_color: frame,
        background_url: background,
        text_colour: banner.text_colour.clone(),
        message_html,
        text_size: banner.text_size.clone(),
        avatar_size: banner.avatar_size.clone(),
        avatar_url,
    };
    crate::join_image::render_join_banner(&base, &token, &fields, avatar_bytes).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn component_type_numbers_match_discord() {
        assert_eq!(FLAGS_V2, 32_768);
        assert_eq!(PANEL_ACCENT_COLOR, 0xffb3cc);
        assert_eq!(BANNER_ATTACHMENT_NAME, "image.png");
        assert_eq!(text_display("x")["type"], json!(CT_TEXT_DISPLAY));
        assert_eq!(
            divider(),
            json!({"type": 14, "divider": true, "spacing": 2})
        );
        assert_eq!(
            media_gallery("attachment://image.png"),
            json!({"type": 12, "items": [{"media": {"url": "attachment://image.png"}}]})
        );
        assert_eq!(
            container(1, vec![text_display("a")]),
            json!({"type": 17, "accent_color": 1, "components": [{"type": 10, "content": "a"}]})
        );
    }

    #[test]
    fn serenity_rows_serialize_to_v2_action_rows() {
        let row = poise::serenity_prelude::CreateActionRow::Buttons(vec![
            poise::serenity_prelude::CreateButton::new("id-a")
                .label("A")
                .style(poise::serenity_prelude::ButtonStyle::Primary),
        ]);
        let out = rows_json(vec![row]).unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0]["type"], json!(1));
        let btn = &out[0]["components"][0];
        assert_eq!(btn["type"], json!(2));
        assert_eq!(btn["style"], json!(1));
        assert_eq!(btn["custom_id"], json!("id-a"));
        assert_eq!(btn["label"], json!("A"));
    }

    #[test]
    fn serenity_string_select_serializes_v2_shape() {
        let row = poise::serenity_prelude::CreateActionRow::SelectMenu(
            poise::serenity_prelude::CreateSelectMenu::new(
                "welcomer-section",
                poise::serenity_prelude::CreateSelectMenuKind::String {
                    options: vec![
                        poise::serenity_prelude::CreateSelectMenuOption::new("Join", "join")
                            .default_selection(true),
                        poise::serenity_prelude::CreateSelectMenuOption::new("Leave", "leave"),
                    ],
                },
            )
            .placeholder("Pick"),
        );
        let out = rows_json(vec![row]).unwrap();
        let menu = &out[0]["components"][0];
        assert_eq!(menu["type"], json!(3));
        assert_eq!(menu["custom_id"], json!("welcomer-section"));
        assert_eq!(menu["placeholder"], json!("Pick"));
        assert_eq!(menu["options"][0]["default"], json!(true));
        // serenity skips serializing default:false (absent == false for
        // Discord; TS sends an explicit false — same effect).
        assert!(menu["options"][1]
            .get("default")
            .is_none_or(|v| v == &json!(false)));
    }

    #[test]
    fn serenity_channel_select_serializes_guild_text() {
        let row = poise::serenity_prelude::CreateActionRow::SelectMenu(
            poise::serenity_prelude::CreateSelectMenu::new(
                "welcomer-channel-join",
                poise::serenity_prelude::CreateSelectMenuKind::Channel {
                    channel_types: Some(vec![poise::serenity_prelude::ChannelType::Text]),
                    default_channels: None,
                },
            )
            .placeholder("Join channel")
            .min_values(1)
            .max_values(1),
        );
        let out = rows_json(vec![row]).unwrap();
        let menu = &out[0]["components"][0];
        assert_eq!(menu["type"], json!(8));
        assert_eq!(menu["channel_types"], json!([0]));
        assert_eq!(menu["min_values"], json!(1));
        assert_eq!(menu["max_values"], json!(1));
    }

    #[test]
    fn multipart_layout_has_payload_and_files() {
        let (body, boundary) = multipart(
            vec![("payload_json", b"{}".to_vec(), None)],
            &[("image.png".to_string(), vec![1, 2, 3])],
        );
        let s = String::from_utf8_lossy(&body);
        assert!(s.contains(&format!("--{boundary}")));
        assert!(s.contains("name=\"payload_json\""));
        assert!(s.contains("name=\"files[0]\"; filename=\"image.png\""));
        assert!(s.ends_with("--\r\n"));
    }
}
