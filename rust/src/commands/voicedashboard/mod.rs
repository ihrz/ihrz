// Interface group (SUBS-BATCH-2B): TS-exact `interface` SubcommandGroup
// (`voicedashboard.ts`: `interface` holding set-voice-channel,
// set-text-channel, set-staff-role, set-voice-channel-catgory,
// set-voice-channel-position, set-voice-channel-name). The Rust leaf
// slash names are the TS-exact names (including the `catgory` typo,
// kept byte-identical); the `vd_*` Rust fn names are internal only.
// DB keys (`VOICE_INTERFACE.*`) are unchanged,
// so existing guild config carries over. Mapping:
//   interface set-voice-channel          (= VOICE_INTERFACE.voice_channel)
//   interface set-text-channel           (= VOICE_INTERFACE.interface)
//   interface set-voice-channel-catgory  (= VOICE_INTERFACE.voice_channel_category)
//   interface set-voice-channel-name     (= VOICE_INTERFACE.voice_channel_name)
//   interface set-voice-channel-position (= VOICE_INTERFACE.voice_channel_position)
//   interface set-staff-role             (= VOICE_INTERFACE.staff_role)

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub fn vd_key(field: &str) -> String {
    format!("VOICE_INTERFACE.{field}")
}

/// `Yes | ...` acknowledgement prefix. Mirrors the
/// `${client.iHorizon_Emojis.Yes} | ...` replies in the
/// !set-voice-channel*.ts commands (app-emoji markup, ✅ fallback).
async fn yes_markup(http: &serenity::Http) -> String {
    crate::emojis::app_emoji_markup(http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string())
}

/// Temp-channel owner check. Entries: (key_suffix_user_id, channel_id).
pub fn is_temp_owner(entries: &[(String, String)], channel_id: &str, user_id: &str) -> bool {
    entries
        .iter()
        .any(|(uid, ch)| ch == channel_id && uid == user_id)
}

/// Presser's live voice channel from gateway state. Mirrors
/// `member.voice.channel` in the temporary_voice_* buttons: every
/// button operates on the voice channel the presser is sitting in,
/// never on the text channel hosting the interaction.
pub fn presser_voice(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
) -> Option<serenity::ChannelId> {
    ctx.cache
        .guild(guild_id)
        .and_then(|g| g.voice_states.get(&user_id).and_then(|v| v.channel_id))
}

/// Live member count of a voice channel from gateway state. Mirrors
/// the `members.size` checks in the claim/transfer buttons.
pub fn voice_occupants(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    channel: serenity::ChannelId,
) -> usize {
    ctx.cache.guild(guild_id).map_or(0, |g| {
        g.voice_states
            .values()
            .filter(|v| v.channel_id == Some(channel))
            .count()
    })
}

/// Fetch a guild voice channel from the API (not cache-only).
/// Non-voice channels map to None, mirroring the TS
/// `ownedChannel.type !== GuildVoice → null` guard.
pub async fn fetch_voice_channel(
    http: &std::sync::Arc<serenity::Http>,
    id: serenity::ChannelId,
) -> Option<serenity::GuildChannel> {
    match http.get_channel(id).await.ok()? {
        serenity::Channel::Guild(g) if g.kind == serenity::ChannelType::Voice => Some(g),
        _ => None,
    }
}

/// Parse a stored `VOICE_INTERFACE.interface` value. Current shape is
/// the `{channelId, messageId}` object posted by vd_panel; a bare
/// channel-id string is the legacy shape (read-compat).
pub fn parse_interface_channel(raw: &str) -> Option<String> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    match serde_json::from_str::<serde_json::Value>(t) {
        Ok(v) => match &v {
            serde_json::Value::Object(m) => m
                .get("channelId")
                .and_then(|c| c.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string),
            serde_json::Value::String(s) => {
                let s = s.trim();
                if s.is_empty() {
                    None
                } else {
                    Some(s.to_string())
                }
            }
            // Legacy bare id (`123`) parses as a JSON number.
            serde_json::Value::Number(n) => Some(n.to_string()),
            _ => None,
        },
        // Not JSON at all: legacy plain id string.
        Err(_) => Some(t.to_string()),
    }
}

/// Stored panel text-channel id (`VOICE_INTERFACE.interface`),
/// object shape with legacy string compat. Backs the
/// `result.interface?.channelId !== interaction.channelId` guard in
/// the temporary_voice_* buttons.
pub async fn interface_channel_id(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    let raw =
        crate::commands::owner::main::routed_get(pool, gid, gid, &vd_key("interface")).await?;
    parse_interface_channel(&raw)
}

/// Owner row for one user: the channel recorded at
/// `CUSTOM_VOICE.<gid>.<uid>`. Mirrors the TS `getChannelId` /
/// `getChannelOwner` lookups (`!== targetedChannel?.id → deferUpdate`).
pub fn owned_channel_id(temps: &[(String, String)], user_id: &str) -> Option<String> {
    temps
        .iter()
        .find(|(uid, _)| uid == user_id)
        .map(|(_, ch)| ch.clone())
}

/// Full allow set for a temp-channel owner. Mirrors the
/// permissionOverwrites.edit block applied after the move in
/// Events/voicedashboard/voiceState.ts and in the claim/transfer
/// buttons (view + voice + chat rights, no moderation rights —
/// unlike the staff set).
pub fn owner_voice_allow() -> serenity::Permissions {
    use serenity::Permissions as P;
    P::VIEW_CHANNEL
        | P::CONNECT
        | P::STREAM
        | P::SPEAK
        | P::SEND_MESSAGES
        | P::USE_APPLICATION_COMMANDS
        | P::ATTACH_FILES
        | P::ADD_REACTIONS
}

/// Temp-channel rename from the `VOICE_INTERFACE.voice_channel_name`
/// template. `{Username}` is replaced, otherwise the name is
/// appended (`template + " " + username`). Mirrors the spawn /
/// claim / transfer renames in TS. NOTE: TS `String.replace` with a
/// string pattern replaces the FIRST marker only — `replacen(..., 1)`
/// keeps multi-marker templates exact (battery slice-w7s41).
pub fn render_temp_name(template: &str, username: &str) -> String {
    if template.contains("{Username}") {
        template.replacen("{Username}", username, 1)
    } else {
        format!("{template} {username}")
    }
}

/// Hub-join default title from the `temporary_voice_channel_name`
/// lang template. Same first-only `{nickname}` shape as TS
/// `lang.temporary_voice_channel_name.replace("{nickname}", ...)`
/// (battery slice-w7s41); all shipped langs carry a single marker.
pub fn render_hub_title(template: &str, masked: &str) -> String {
    template.replacen("{nickname}", masked, 1)
}

/// Whether the temp-voice sweep runs. Mirrors the
/// `if (!baseData || !baseData.voice_channel) return;` gate in
/// voiceState.ts: every cleanup leg below it (own-row, redirect,
/// sweep, create) is skipped while the interface is unconfigured —
/// orphan CUSTOM_VOICE rows are left alone like TS (battery
/// slice-w7s41).
pub fn temp_sweep_applies(lobby_present: bool) -> bool {
    lobby_present
}

/// Parse a voice user limit. Mirrors `parseInt` + the
/// `if (!userLimit)` reject in temporary_voice_limit_button.ts: 0
/// and non-numbers are rejected, with no upper clamp (Discord
/// enforces its own cap server-side).
pub fn parse_limit(raw: &str) -> Option<u32> {
    let n: u32 = raw.trim().parse().ok()?;
    if n == 0 {
        None
    } else {
        Some(n)
    }
}

pub const TEMPVOICE_PREFIX: &str = "tempvoice:";

/// Follow-up select menus posted by the block/trust/untrust/privacy
/// buttons. Mirrors the TS collectors (custom ids kept distinct from
/// the legacy `temporary_voice_*` ones, same semantics).
pub const TEMPVOICE_BLOCK_SELECT: &str = "tempvoice:block-select";
pub const TEMPVOICE_UNBLOCK_SELECT: &str = "tempvoice:unblock-select";
pub const TEMPVOICE_TRUST_SELECT: &str = "tempvoice:trust-select";
pub const TEMPVOICE_UNTRUST_SELECT: &str = "tempvoice:untrust-select";
pub const TEMPVOICE_PRIVACY_SELECT: &str = "tempvoice:privacy-select";
pub const TEMPVOICE_REGION_SELECT: &str = "tempvoice:region-select";
/// User-select menu posted by the transfer button. Mirrors the
/// `temporary_voice_transfer_selectmenue` collector in
/// temporary_voice_transfer_button.ts (note the TS id typo, kept
/// distinct here like the other tempvoice: ids).
pub const TEMPVOICE_TRANSFER_SELECT: &str = "tempvoice:transfer-select";

/// Voice region options. Mirrors the starter menu in
/// temporary_voice_region_button.ts (label, value).
pub const VOICE_REGIONS: &[(&str, &str)] = &[
    ("Singapore", "singapore"),
    ("Australia/Sydney", "sydney"),
    ("Russia", "russia"),
    ("India", "india"),
    ("Hong Kong", "hongkong"),
    ("South Africa", "southafrica"),
    ("Netherland/Rotterdam", "rotterdam"),
    ("Japan/Tokyo", "japan"),
    ("South Korea", "south-korea"),
    ("US/East", "us-east"),
    ("US/South", "us-south"),
    ("US/West", "us-west"),
    ("US/Central", "us-central"),
    ("Brazil", "brazil"),
];

/// String-select values of the privacy menu. Mirrors the
/// `temporary_channel_*` option values in
/// temporary_voice_privacy_button.ts.
pub const PRIVACY_LOCK: &str = "temporary_channel_lock_channel_menu";
pub const PRIVACY_UNLOCK: &str = "temporary_channel_unlock_channel_menu";
pub const PRIVACY_INVISIBLE: &str = "temporary_channel_invisible_channel_menu";
pub const PRIVACY_VISIBLE: &str = "temporary_channel_visible_channel_menu";
pub const PRIVACY_CLOSECHAT: &str = "temporary_channel_closechat_channel_menu";
pub const PRIVACY_OPENCHAT: &str = "temporary_channel_openchat_channel_menu";

/// Diff a user-select submission against current member overwrites.
/// Returns (added, removed); the clicker is never removed (mirrors the
/// `i.user.id !== overwriteId` guard in the TS collectors).
pub fn sync_members(
    selected: &[String],
    current: &[String],
    self_id: &str,
) -> (Vec<String>, Vec<String>) {
    let added = selected
        .iter()
        .filter(|id| !current.contains(id))
        .cloned()
        .collect();
    let removed = current
        .iter()
        .filter(|id| !selected.contains(id) && id.as_str() != self_id)
        .cloned()
        .collect();
    (added, removed)
}

/// @everyone overwrite for a privacy menu value, as
/// (allow_bits, deny_bits). Mirrors the three switch branches in
/// temporary_voice_privacy_button.ts.
pub fn privacy_rule(value: &str) -> Option<(u64, u64)> {
    use serenity::Permissions as P;
    match value {
        PRIVACY_LOCK => Some((0, (P::CONNECT | P::STREAM | P::SPEAK).bits())),
        PRIVACY_UNLOCK => Some(((P::CONNECT | P::STREAM | P::SPEAK).bits(), 0)),
        PRIVACY_INVISIBLE => Some((0, P::VIEW_CHANNEL.bits())),
        PRIVACY_VISIBLE => Some((P::VIEW_CHANNEL.bits(), 0)),
        PRIVACY_CLOSECHAT => Some((
            0,
            (P::SEND_MESSAGES | P::ADD_REACTIONS | P::USE_APPLICATION_COMMANDS).bits(),
        )),
        PRIVACY_OPENCHAT => Some((
            (P::SEND_MESSAGES | P::ADD_REACTIONS | P::USE_APPLICATION_COMMANDS).bits(),
            0,
        )),
        _ => None,
    }
}

/// App-emoji namespace for a privacy menu value, used in the summary
/// receipt (`{emoji} **Yes**`). Mirrors the per-action VC_* emoji in
/// temporary_voice_privacy_button.ts (CloseAccess/OpenAccess for
/// lock/unlock, Unseeable/Seeable for invisible/visible,
/// CloseChat/OpenChat for closechat/openchat).
pub fn privacy_receipt_emoji(value: &str) -> &'static str {
    match value {
        PRIVACY_LOCK => "VC_CloseAccess",
        PRIVACY_UNLOCK => "VC_OpenAccess",
        PRIVACY_INVISIBLE => "VC_Unseeable",
        PRIVACY_VISIBLE => "VC_Seeable",
        PRIVACY_CLOSECHAT => "VC_CloseChat",
        _ => "VC_OpenChat",
    }
}

/// Dashboard button layout: (action suffix, text label, emoji namespace).
/// Order mirrors the TS `buttonRows` in !set-text-channel.ts
/// (limit, name, claim, privacy, region / trust, block, transfer,
/// unblock, untrust / delete); chunked in fives like the TS rows.
pub const PANEL_BUTTONS: &[(&str, &str, &str)] = &[
    ("limit", "Limit", "VC_Limit"),
    ("name", "Name", "VC_Name"),
    ("claim", "Claim", "VC_Claim"),
    ("privacy", "Privacy", "VC_Privacy"),
    ("region", "Region", "VC_Region"),
    ("trust", "Trust", "VC_Trust"),
    ("block", "Block", "VC_Block"),
    ("transfer", "Transfer", "VC_Transfer"),
    ("unblock", "Unblock", "VC_Unblock"),
    ("untrust", "Untrust", "VC_Untrust"),
    ("delete", "Delete", "VC_Delete"),
];

fn panel_button_style(action: &str) -> serenity::ButtonStyle {
    use serenity::ButtonStyle;
    match action {
        "block" | "delete" => ButtonStyle::Danger,
        "claim" => ButtonStyle::Success,
        "trust" | "transfer" => ButtonStyle::Primary,
        _ => ButtonStyle::Secondary,
    }
}

fn panel_button(action: &str, label: &str) -> serenity::CreateButton {
    serenity::CreateButton::new(format!("{TEMPVOICE_PREFIX}{action}"))
        .label(label)
        .style(panel_button_style(action))
}

/// Emoji for a dashboard button: synced app emoji when warm, otherwise
/// the text label alone (the sync builder below covers the cold case).
async fn with_panel_emoji(
    http: &serenity::Http,
    button: serenity::CreateButton,
    emoji_name: &str,
) -> serenity::CreateButton {
    if let Some((id, name, animated)) = crate::emojis::cached_emoji_entry(http, emoji_name).await {
        button.emoji(serenity::ReactionType::Custom {
            animated,
            id: serenity::EmojiId::new(id),
            name: Some(name),
        })
    } else {
        button
    }
}

/// One live dashboard button (Secondary, VC_* emoji when warm).
async fn live_panel_button(
    http: &serenity::Http,
    action: &str,
    label: &str,
    emoji_name: &str,
) -> serenity::CreateButton {
    with_panel_emoji(
        http,
        serenity::CreateButton::new(format!("{TEMPVOICE_PREFIX}{action}"))
            .label(label)
            .style(serenity::ButtonStyle::Secondary),
        emoji_name,
    )
    .await
}

/// One disabled row-3 spacer (Empty emoji when warm, invisible label
/// otherwise so the button stays valid on a cold emoji cache).
async fn spacer_panel_button(http: &serenity::Http, n: u8) -> serenity::CreateButton {
    with_panel_emoji(
        http,
        serenity::CreateButton::new(format!("{TEMPVOICE_PREFIX}disable-{n}"))
            .label(" ")
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true),
        "Empty",
    )
    .await
}

/// Dashboard buttons with VC_* emoji labels. Posted by vd_panel;
/// mirrors the `buttonRows` in !set-text-channel.ts: every button is
/// Secondary, row 3 holds the delete button centered between four
/// disabled Empty-emoji spacers.
pub async fn panel_buttons(http: &serenity::Http) -> Vec<serenity::CreateActionRow> {
    vec![
        serenity::CreateActionRow::Buttons(vec![
            live_panel_button(http, "limit", "Limit", "VC_Limit").await,
            live_panel_button(http, "name", "Name", "VC_Name").await,
            live_panel_button(http, "claim", "Claim", "VC_Claim").await,
            live_panel_button(http, "privacy", "Privacy", "VC_Privacy").await,
            live_panel_button(http, "region", "Region", "VC_Region").await,
        ]),
        serenity::CreateActionRow::Buttons(vec![
            live_panel_button(http, "trust", "Trust", "VC_Trust").await,
            live_panel_button(http, "block", "Block", "VC_Block").await,
            live_panel_button(http, "transfer", "Transfer", "VC_Transfer").await,
            live_panel_button(http, "unblock", "Unblock", "VC_Unblock").await,
            live_panel_button(http, "untrust", "Untrust", "VC_Untrust").await,
        ]),
        serenity::CreateActionRow::Buttons(vec![
            spacer_panel_button(http, 1).await,
            spacer_panel_button(http, 2).await,
            live_panel_button(http, "delete", "Delete", "VC_Delete").await,
            spacer_panel_button(http, 3).await,
            spacer_panel_button(http, 4).await,
        ]),
    ]
}

pub fn tempvoice_buttons() -> Vec<serenity::CreateActionRow> {
    PANEL_BUTTONS
        .chunks(5)
        .map(|c| {
            serenity::CreateActionRow::Buttons(
                c.iter().map(|(a, l, _)| panel_button(a, l)).collect(),
            )
        })
        .collect()
}

/// Dashboard embed fields in TS addFields order: (lang key, emoji
/// namespace, exact en-US fallback); None slots are the `** **` spacer
/// fields. Mirrors !set-text-channel.ts (15 fields).
pub const PANEL_FIELDS: &[Option<(&str, &str, &str)>] = &[
    Some((
        "tempvoice_if_text_fields_value_limit",
        "VC_Limit",
        "${client.iHorizon_Emojis.VC_Limit} **Change limit**",
    )),
    Some((
        "tempvoice_if_text_fields_value_name",
        "VC_Name",
        "${client.iHorizon_Emojis.VC_Name} **Change Name**",
    )),
    Some((
        "tempvoice_if_text_fields_value_region",
        "VC_Region",
        "${client.iHorizon_Emojis.VC_Region} **Change Region**",
    )),
    Some((
        "tempvoice_if_text_fields_value_trust",
        "VC_Trust",
        "${client.iHorizon_Emojis.VC_Trust} **Trust**",
    )),
    None,
    Some((
        "tempvoice_if_text_fields_value_untrust",
        "VC_Untrust",
        "${client.iHorizon_Emojis.VC_Untrust} **Untrust**",
    )),
    Some((
        "tempvoice_if_text_fields_value_block",
        "VC_Block",
        "${client.iHorizon_Emojis.VC_Block} **Block**",
    )),
    None,
    Some((
        "tempvoice_if_text_fields_value_unblock",
        "VC_Unblock",
        "${client.iHorizon_Emojis.VC_Unblock} **Unblock**",
    )),
    Some((
        "tempvoice_if_text_fields_value_claim",
        "VC_Claim",
        "${client.iHorizon_Emojis.VC_Claim} **Claim**",
    )),
    Some((
        "tempvoice_if_text_fields_value_privacy",
        "VC_Privacy",
        "${client.iHorizon_Emojis.VC_Privacy} **Privacy**",
    )),
    Some((
        "tempvoice_if_text_fields_value_transfer",
        "VC_Transfer",
        "${client.iHorizon_Emojis.VC_Transfer} **Transfer**",
    )),
    None,
    Some((
        "tempvoice_if_text_fields_value_delete",
        "VC_Delete",
        "${client.iHorizon_Emojis.VC_Delete} **Delete**",
    )),
    None,
];

/// Fill the `${client.iHorizon_Emojis.<Name>}` slot of a panel field
/// template with the resolved emoji markup. Mirrors the TS `.replace`.
pub fn render_panel_field(template: &str, emoji_name: &str, markup: &str) -> String {
    template.replace(&format!("${{client.iHorizon_Emojis.{emoji_name}}}"), markup)
}

/// Temp-voice sweep decision. Mirrors the cleanup legs of
/// Events/voicedashboard/voiceState.ts (`typeof channelId !==
/// "string"` guard, `!channel` guard, isMemberlessChannel).
/// Pure predicate backing the voice-state sweep and the guild-create
/// recovery, unit-tested below (no Discord needed).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TempSweep {
    /// Row is malformed or the channel is already gone: drop the key.
    CleanupKey,
    /// Channel exists and is empty: delete it, then drop the key.
    DeleteChannel,
    /// Channel exists and is occupied: keep everything.
    Keep,
}

/// Parse a CUSTOM_VOICE row value. None mirrors the TS
/// `typeof channelId !== "string"` guard (malformed rows are dropped).
pub fn parse_temp_channel_id(raw: &str) -> Option<u64> {
    let id = raw.trim().parse::<u64>().ok()?;
    if id == 0 {
        None
    } else {
        Some(id)
    }
}

/// Decide a temp row's fate from channel existence + occupancy.
/// Pure, unit-tested below.
pub fn temp_sweep_action(channel_exists: bool, occupied: bool) -> TempSweep {
    match (channel_exists, occupied) {
        (false, _) => TempSweep::CleanupKey,
        (true, false) => TempSweep::DeleteChannel,
        (true, true) => TempSweep::Keep,
    }
}

/// Load (user_id, channel_id) temp pairs for a guild: guild-table
/// subtree first, legacy kv rows filling gaps (table wins).
/// Mirrors the ticket TICKET_ALL prefix scan; keys unchanged.
pub async fn load_temps(pool: &crate::db::Pool, guild_id: &str) -> Vec<(String, String)> {
    use crate::commands::owner::main as routed;
    let mut by_uid: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for (k, v) in routed::legacy_scan(pool, guild_id, "CUSTOM_VOICE.").await {
        if let Some(uid) = k.rsplit('.').next() {
            by_uid.insert(uid.to_string(), v);
        }
    }
    // Table nests CUSTOM_VOICE.<gid>.<uid>; walk the guild layer.
    if let Some(root) = routed::tbl_get_value(pool, guild_id, "CUSTOM_VOICE").await {
        if let Some(obj) = routed::walk_path(&root, &[guild_id]).and_then(|v| v.as_object()) {
            for (uid, v) in obj {
                let ch = match v {
                    serde_json::Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                by_uid.insert(uid.clone(), ch);
            }
        }
    }
    let mut rows: Vec<(String, String)> = by_uid.into_iter().collect();
    rows.sort();
    rows
}

/// `deferUpdate` equivalent for ignored temp-voice presses (wrong
/// channel, not in voice, not the owner). Best-effort, never fails.
async fn ack_press(ctx: &serenity::Context, comp: &serenity::ComponentInteraction) {
    let _ = comp
        .create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
}

/// Rename a temp channel for a new owner: the configured
/// `VOICE_INTERFACE.voice_channel_name` template (`{Username}` slot
/// or append fallback), else the lang `temporary_voice_channel_name`
/// default (`{nickname}` slot). Mirrors the claim/transfer renames.
async fn rename_for(
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    http: &std::sync::Arc<serenity::Http>,
    target: serenity::ChannelId,
    username: &str,
) {
    let tpl =
        crate::commands::owner::main::routed_get(pool, gid, gid, &vd_key("voice_channel_name"))
            .await
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
    let name = match tpl {
        Some(t) => render_temp_name(&t, username),
        None => {
            let def = crate::lang::get(lang_code, "temporary_voice_channel_name");
            crate::events::temp_channel_name_in(username, def.as_deref())
        }
    };
    let _ = target
        .edit(http, serenity::EditChannel::new().name(name))
        .await;
}

/// New/old-owner receipt embed. Mirrors the claim/transfer replies
/// (`temporary_voice_title_embec` + new/old member fields + banner).
async fn claim_transfer_embed(
    lang_code: &str,
    pool: &crate::db::Pool,
    gid: &str,
    new_mention: &str,
    old_mention: &str,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .description(crate::lang::get(lang_code, "temporary_voice_title_embec").unwrap_or_default())
        .colour(2829617)
        .image(crate::funcs::guild_banner_url(pool, gid).await)
        .field(
            crate::lang::get(lang_code, "temporary_voice_new_member").unwrap_or_default(),
            new_mention.to_string(),
            false,
        )
        .field(
            crate::lang::get(lang_code, "temporary_voice_old_member").unwrap_or_default(),
            old_mention.to_string(),
            false,
        )
}

/// Single-field receipt embed for the name/limit renames. Mirrors
/// the TS replies (`temporary_voice_title_embec` + new-name /
/// new-userlimit field with the VC_* emoji + banner).
async fn receipt_embed(
    lang_code: &str,
    pool: &crate::db::Pool,
    gid: &str,
    field_key: &str,
    field_value: String,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .description(crate::lang::get(lang_code, "temporary_voice_title_embec").unwrap_or_default())
        .colour(2829617)
        .image(crate::funcs::guild_banner_url(pool, gid).await)
        .field(
            crate::lang::get(lang_code, field_key).unwrap_or_default(),
            field_value,
            true,
        )
}

/// Leaf items moved to one-per-command files, re-imported so the
/// unit tests below (`use super::*` / `super::...`) keep resolving unchanged.
pub use self::category::vd_category;
pub use self::interface::vd_interface;
pub use self::lobby::vd_lobby;
pub use self::name::vd_name;
pub use self::panel::vd_panel;
pub use self::position::{vd_position, PositionChoice};
pub use self::staff::{parse_staff_roles, staff_roles_value, vd_staff};
pub use self::tempvoice_button::handle_tempvoice_button;
pub use self::tempvoice_select::handle_tempvoice_select;
pub use self::voicedashboard::voicedashboard;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn temp_owner_and_limit() {
        let entries = vec![("1".to_string(), "9".to_string())];
        assert!(is_temp_owner(&entries, "9", "1"));
        assert!(!is_temp_owner(&entries, "9", "2"));
        assert_eq!(owned_channel_id(&entries, "1").as_deref(), Some("9"));
        assert_eq!(owned_channel_id(&entries, "2"), None);
        assert_eq!(parse_limit("5"), Some(5));
        // No upper clamp (TS parseInt); 0 and non-numbers reject.
        assert_eq!(parse_limit("500"), Some(500));
        assert_eq!(parse_limit("0"), None);
        assert_eq!(parse_limit("x"), None);
    }

    #[test]
    fn temp_name_renders_username_slot_or_appends() {
        assert_eq!(render_temp_name("{Username}'s room", "Ada"), "Ada's room");
        assert_eq!(render_temp_name("Lounge", "Ada"), "Lounge Ada");
        assert_eq!(render_temp_name("{user}", "Ada"), "{user} Ada");
        // TS string-pattern replace is first-only (battery slice-w7s41).
        assert_eq!(
            render_temp_name("{Username} & {Username}", "Ada"),
            "Ada & {Username}"
        );
        assert_eq!(
            render_temp_name("{Username}{Username}", "Bo"),
            "Bo{Username}"
        );
    }

    #[test]
    fn hub_title_and_sweep_gate_match_ts_voicedashboard_battery() {
        // temporary_voice_channel_name.replace("{nickname}", ...) is
        // first-only; maskLink output is passed through verbatim.
        assert_eq!(
            render_hub_title("{nickname}'s Channel", "Ada"),
            "Ada's Channel"
        );
        assert_eq!(
            render_hub_title("{nickname} {nickname}", "Ada"),
            "Ada {nickname}"
        );
        assert_eq!(
            render_hub_title("{nickname}'s Channel", "Hidden Link"),
            "Hidden Link's Channel"
        );
        // `!baseData || !baseData.voice_channel → return` skips the sweep.
        assert!(temp_sweep_applies(true));
        assert!(!temp_sweep_applies(false));
    }

    #[test]
    fn interface_channel_parses_object_and_legacy_string() {
        assert_eq!(
            parse_interface_channel(r#"{"channelId":"12","messageId":"34"}"#).as_deref(),
            Some("12")
        );
        assert_eq!(parse_interface_channel("  12  ").as_deref(), Some("12"));
        assert_eq!(parse_interface_channel(r#""12""#).as_deref(), Some("12"));
        assert_eq!(parse_interface_channel(""), None);
        assert_eq!(parse_interface_channel("{}"), None);
        assert_eq!(parse_interface_channel(r#"{"channelId":""}"#), None);
    }

    #[test]
    fn owner_allow_covers_ts_owner_set() {
        type P = super::serenity::Permissions;
        let allow = owner_voice_allow();
        for flag in [
            P::VIEW_CHANNEL,
            P::CONNECT,
            P::STREAM,
            P::SPEAK,
            P::SEND_MESSAGES,
            P::USE_APPLICATION_COMMANDS,
            P::ATTACH_FILES,
            P::ADD_REACTIONS,
        ] {
            assert!(allow.contains(flag));
        }
        // No moderation rights (unlike the staff set).
        assert!(!allow.contains(P::MUTE_MEMBERS));
        assert!(!allow.contains(P::KICK_MEMBERS));
    }

    #[test]
    fn key_shapes() {
        assert_eq!(vd_key("voice_channel"), "VOICE_INTERFACE.voice_channel");
        assert_eq!(vd_key("interface"), "VOICE_INTERFACE.interface");
        assert_eq!(
            vd_key("voice_channel_category"),
            "VOICE_INTERFACE.voice_channel_category"
        );
        assert_eq!(
            vd_key("voice_channel_name"),
            "VOICE_INTERFACE.voice_channel_name"
        );
        assert_eq!(
            vd_key("voice_channel_position"),
            "VOICE_INTERFACE.voice_channel_position"
        );
        assert_eq!(vd_key("staff_role"), "VOICE_INTERFACE.staff_role");
    }

    #[test]
    fn position_choice_covers_ts_choices_only() {
        use poise::ChoiceParameter as _;
        assert_eq!(PositionChoice::from_name("top"), Some(PositionChoice::Top));
        assert_eq!(
            PositionChoice::from_name("BOTTOM"),
            Some(PositionChoice::Bottom)
        );
        assert_eq!(PositionChoice::from_name("up"), None);
        assert_eq!(PositionChoice::from_name(""), None);
        assert_eq!(PositionChoice::Top.as_str(), "top");
        assert_eq!(PositionChoice::Bottom.as_str(), "bottom");
        let names: Vec<_> = PositionChoice::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["top".to_string(), "bottom".to_string()]);
        // Localized display names, byte-exact from voicedashboard.ts:198+.
        let list = PositionChoice::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("En haut")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("En bas")
        );
        assert_eq!(
            list[0].localizations.get("ja").map(String::as_str),
            Some("up_top")
        );
        assert_eq!(
            list[1].localizations.get("es-ES").map(String::as_str),
            Some("down_bottom")
        );
        assert_eq!(PositionChoice::Top.localized_name("fr"), Some("En haut"));
    }

    #[test]
    fn sync_members_diffs_and_keeps_self() {
        let sel = vec!["1".to_string(), "2".to_string()];
        let cur = vec!["2".to_string(), "3".to_string(), "9".to_string()];
        let (added, removed) = sync_members(&sel, &cur, "9");
        assert_eq!(added, vec!["1".to_string()]);
        assert_eq!(removed, vec!["3".to_string()]);
    }

    #[test]
    fn privacy_rules_cover_all_six_options() {
        type P = super::serenity::Permissions;
        let voice = (P::CONNECT | P::STREAM | P::SPEAK).bits();
        let chat = (P::SEND_MESSAGES | P::ADD_REACTIONS | P::USE_APPLICATION_COMMANDS).bits();
        assert_eq!(privacy_rule(PRIVACY_LOCK), Some((0, voice)));
        assert_eq!(privacy_rule(PRIVACY_UNLOCK), Some((voice, 0)));
        assert_eq!(
            privacy_rule(PRIVACY_INVISIBLE),
            Some((0, P::VIEW_CHANNEL.bits()))
        );
        assert_eq!(
            privacy_rule(PRIVACY_VISIBLE),
            Some((P::VIEW_CHANNEL.bits(), 0))
        );
        assert_eq!(privacy_rule(PRIVACY_CLOSECHAT), Some((0, chat)));
        assert_eq!(privacy_rule(PRIVACY_OPENCHAT), Some((chat, 0)));
        assert_eq!(privacy_rule("bogus"), None);
    }

    #[test]
    fn privacy_receipt_emoji_matches_ts_option_emoji() {
        // Per-action VC_* emoji in temporary_voice_privacy_button.ts.
        assert_eq!(privacy_receipt_emoji(PRIVACY_LOCK), "VC_CloseAccess");
        assert_eq!(privacy_receipt_emoji(PRIVACY_UNLOCK), "VC_OpenAccess");
        assert_eq!(privacy_receipt_emoji(PRIVACY_INVISIBLE), "VC_Unseeable");
        assert_eq!(privacy_receipt_emoji(PRIVACY_VISIBLE), "VC_Seeable");
        assert_eq!(privacy_receipt_emoji(PRIVACY_CLOSECHAT), "VC_CloseChat");
        assert_eq!(privacy_receipt_emoji(PRIVACY_OPENCHAT), "VC_OpenChat");
    }

    #[test]
    fn region_options_match_ts_starter_menu() {
        assert_eq!(VOICE_REGIONS.len(), 14);
        let mut values: Vec<&str> = VOICE_REGIONS.iter().map(|(_, v)| *v).collect();
        values.sort_unstable();
        values.dedup();
        assert_eq!(values.len(), 14);
        assert!(VOICE_REGIONS.contains(&("Japan/Tokyo", "japan")));
        assert!(VOICE_REGIONS.contains(&("Brazil", "brazil")));
    }

    #[test]
    fn staff_roles_parse_json_array_and_legacy_string() {
        assert!(parse_staff_roles(None).is_empty());
        assert!(parse_staff_roles(Some("")).is_empty());
        assert!(parse_staff_roles(Some("   ")).is_empty());
        assert_eq!(parse_staff_roles(Some("[]")), Vec::<String>::new());
        assert_eq!(
            parse_staff_roles(Some("[\"1\",\"2\"]")),
            vec!["1".to_string(), "2".to_string()]
        );
        // Legacy TS shape: bare role-id string wraps to one element.
        assert_eq!(parse_staff_roles(Some("123")), vec!["123".to_string()]);
        assert_eq!(parse_staff_roles(Some("  123  ")), vec!["123".to_string()]);
        // Round-trip of what the save button persists.
        let saved = serde_json::to_string(&vec!["7".to_string()]).unwrap();
        assert_eq!(parse_staff_roles(Some(&saved)), vec!["7".to_string()]);
    }

    #[test]
    fn staff_roles_value_mentions_like_ts() {
        assert_eq!(staff_roles_value(&[]), "");
        assert_eq!(
            staff_roles_value(&["1".to_string(), "2".to_string()]),
            "<@&1>, <@&2>"
        );
    }

    #[test]
    fn panel_fields_match_ts_embed() {
        // 15 fields: 11 emoji values + 4 spacers, TS addFields order.
        assert_eq!(PANEL_FIELDS.len(), 15);
        let spacers: Vec<usize> = PANEL_FIELDS
            .iter()
            .enumerate()
            .filter_map(|(i, f)| f.is_none().then_some(i))
            .collect();
        assert_eq!(spacers, vec![4, 7, 12, 14]);
        let keys: Vec<&str> = PANEL_FIELDS
            .iter()
            .filter_map(|f| f.as_ref().map(|slot| slot.0))
            .collect();
        assert_eq!(
            keys,
            vec![
                "tempvoice_if_text_fields_value_limit",
                "tempvoice_if_text_fields_value_name",
                "tempvoice_if_text_fields_value_region",
                "tempvoice_if_text_fields_value_trust",
                "tempvoice_if_text_fields_value_untrust",
                "tempvoice_if_text_fields_value_block",
                "tempvoice_if_text_fields_value_unblock",
                "tempvoice_if_text_fields_value_claim",
                "tempvoice_if_text_fields_value_privacy",
                "tempvoice_if_text_fields_value_transfer",
                "tempvoice_if_text_fields_value_delete",
            ]
        );
    }

    #[test]
    fn panel_field_renders_emoji_slot_like_ts() {
        let out = render_panel_field(
            "${client.iHorizon_Emojis.VC_Limit} **Change limit**",
            "VC_Limit",
            "<:VC_Limit:9>",
        );
        assert_eq!(out, "<:VC_Limit:9> **Change limit**");
        // Cold emoji cache leaves the template text (region handler
        // already tolerates empty markup the same way).
        let out = render_panel_field(
            "${client.iHorizon_Emojis.VC_Limit} **Change limit**",
            "VC_Limit",
            "",
        );
        assert_eq!(out, " **Change limit**");
    }

    #[test]
    fn panel_buttons_cover_all_ts_actions() {
        // 11 actions incl. unblock, unique, chunked 5/5/1 like TS rows.
        assert_eq!(PANEL_BUTTONS.len(), 11);
        // Declaration order mirrors the TS buttonRows (row1 limit →
        // region, row2 trust → untrust, row3 delete).
        let order: Vec<&str> = PANEL_BUTTONS.iter().map(|(a, _, _)| *a).collect();
        assert_eq!(
            order,
            vec![
                "limit", "name", "claim", "privacy", "region", "trust", "block", "transfer",
                "unblock", "untrust", "delete"
            ]
        );
        let mut actions: Vec<&str> = PANEL_BUTTONS.iter().map(|(a, _, _)| *a).collect();
        actions.sort_unstable();
        let mut deduped = actions.clone();
        deduped.dedup();
        assert_eq!(actions, deduped);
        assert!(PANEL_BUTTONS.contains(&("unblock", "Unblock", "VC_Unblock")));
        assert_eq!(PANEL_BUTTONS.chunks(5).count(), 3);
        // Sync builder (in-channel controls) exposes the same 11.
        let rows = tempvoice_buttons();
        assert_eq!(rows.len(), 3);
        assert_eq!(panel_button_style("block"), serenity::ButtonStyle::Danger);
        assert_eq!(panel_button_style("claim"), serenity::ButtonStyle::Success);
        assert_eq!(panel_button_style("trust"), serenity::ButtonStyle::Primary);
        assert_eq!(
            panel_button_style("unblock"),
            serenity::ButtonStyle::Secondary
        );
    }
    #[test]
    fn temp_sweep_parses_and_decides_like_ts() {
        // Malformed rows (TS `typeof !== "string"` guard) -> drop key.
        assert_eq!(parse_temp_channel_id("123"), Some(123));
        assert_eq!(parse_temp_channel_id("  123 "), Some(123));
        assert_eq!(parse_temp_channel_id(""), None);
        assert_eq!(parse_temp_channel_id("abc"), None);
        assert_eq!(parse_temp_channel_id("0"), None);
        // Gone channel -> drop key without delete call.
        assert_eq!(temp_sweep_action(false, false), TempSweep::CleanupKey);
        assert_eq!(temp_sweep_action(false, true), TempSweep::CleanupKey);
        // Existing but memberless -> delete + drop.
        assert_eq!(temp_sweep_action(true, false), TempSweep::DeleteChannel);
        // Occupied -> keep.
        assert_eq!(temp_sweep_action(true, true), TempSweep::Keep);
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn temps_table_routing_with_legacy_fallback() {
        use crate::commands::owner::main as routed;
        let pool = memory_pool().await;
        // Routed write dual-writes; the union scan sees it.
        routed::routed_set(&pool, "g", "g", "CUSTOM_VOICE.g.5", "111")
            .await
            .unwrap();
        assert_eq!(
            load_temps(&pool, "g").await,
            vec![("5".to_string(), "111".to_string())]
        );
        // Legacy-only row merges in.
        crate::db::kv_set(&pool, "g", "CUSTOM_VOICE.g.7", "222")
            .await
            .unwrap();
        assert_eq!(load_temps(&pool, "g").await.len(), 2);
        // Table wins over a stale legacy row for the same user.
        crate::db::kv_set(&pool, "g", "CUSTOM_VOICE.g.5", "999")
            .await
            .unwrap();
        assert_eq!(
            load_temps(&pool, "g").await,
            vec![
                ("5".to_string(), "111".to_string()),
                ("7".to_string(), "222".to_string()),
            ]
        );
        // Delete clears both stores.
        assert!(routed::routed_del(&pool, "g", "g", "CUSTOM_VOICE.g.5")
            .await
            .unwrap());
        assert_eq!(
            load_temps(&pool, "g").await,
            vec![("7".to_string(), "222".to_string())]
        );
    }
    #[test]
    fn voice_registers_description_localizations() {
        let cmd = super::voicedashboard();
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous-groupé pour la gestion de canaux vocaux")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("ボイス管理のサブコマンドグループ")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Группа подкоманд для управления голосом")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Grupo de subcomando para el gestor de voz")
        );
    }
    #[test]
    fn leaf_descriptions_match_ts_voicedashboard() {
        // Base descriptions, byte-exact from voicedashboard.ts.
        assert_eq!(
            super::voicedashboard().description.as_deref(),
            Some("Subcommand group for voice's manager")
        );
        assert_eq!(
            super::vd_interface().description.as_deref(),
            Some("Manage voice's interface")
        );
        assert_eq!(
            super::vd_lobby().description.as_deref(),
            Some("Set the channel for Join4Create!")
        );
        assert_eq!(
            super::vd_panel().description.as_deref(),
            Some("Send an interface to the channel to manage their own voice channel")
        );
        assert_eq!(
            super::vd_staff().description.as_deref(),
            Some("Set an role for bypassing TempChannel's permission")
        );
        assert_eq!(
            super::vd_category().description.as_deref(),
            Some("Set the channel where the voice channel will be created!")
        );
        assert_eq!(
            super::vd_position().description.as_deref(),
            Some("Set the voice channel position in the category when it will be created!")
        );
        assert_eq!(
            super::vd_name().description.as_deref(),
            Some("Set the voice channel name when it will be created!")
        );
        // Leaf fr localizations, byte-exact from voicedashboard.ts.
        assert_eq!(
            super::vd_lobby()
                .description_localizations
                .get("fr")
                .map(String::as_str),
            Some("Définit le salon où le membre se connecte pour créer son propre canal")
        );
        assert_eq!(
            super::vd_staff()
                .description_localizations
                .get("fr")
                .map(String::as_str),
            Some("Définir un rôle pour contourner l'autorisation des canaux temporaires")
        );
        // Option descriptions, byte-exact from voicedashboard.ts.
        let lobby_opt = &super::vd_lobby().parameters[0];
        assert_eq!(lobby_opt.name.as_str(), "channel");
        assert_eq!(
            lobby_opt.description.as_deref(),
            Some("The channel you want")
        );
        let panel_opt = &super::vd_panel().parameters[0];
        assert_eq!(panel_opt.name.as_str(), "channel");
        assert_eq!(
            panel_opt.description.as_deref(),
            Some("The channel you want the dashboard interface are sent")
        );
        let cat_opt = &super::vd_category().parameters[0];
        assert_eq!(cat_opt.name.as_str(), "category");
        assert_eq!(
            cat_opt.description.as_deref(),
            Some("The category you want")
        );
        let name_opt = &super::vd_name().parameters[0];
        assert_eq!(name_opt.name.as_str(), "channel_name");
        assert_eq!(
            name_opt.description.as_deref(),
            Some("The name you want | Variable: {Username}")
        );
        let pos_opt = &super::vd_position().parameters[0];
        assert_eq!(pos_opt.name.as_str(), "position_type");
        assert_eq!(
            pos_opt.description.as_deref(),
            Some("The position type you want")
        );
        assert!(super::vd_staff().parameters.is_empty());
    }
}

pub mod category;
pub mod interface;
pub mod lobby;
pub mod name;
pub mod panel;
pub mod position;
pub mod staff;
pub mod tempvoice_button;
pub mod tempvoice_select;
#[allow(clippy::module_inception)]
pub mod voicedashboard;

/// Old registry path (`voicedashboard::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::category::*;
    pub use super::interface::*;
    pub use super::lobby::*;
    pub use super::name::*;
    pub use super::panel::*;
    pub use super::position::*;
    pub use super::staff::*;
    pub use super::tempvoice_button::*;
    pub use super::tempvoice_select::*;
    pub use super::voicedashboard::*;
    pub use super::*;
}
