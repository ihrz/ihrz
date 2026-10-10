use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

// Interface-path decision (U-VOICE-IFACE): ADOPT FLAT, do not restore the
// TS `interface` subgroup (`/voicedashboard interface set-voice-channel|...`).
// Rationale: no Rust module on this branch uses poise subcommand groups (all
// flat `/voice lobby|panel|category|name|position|staff`), and restoring the
// subgroup would perpetuate the TS `set-voice-channel-catgory` typo in the
// public command tree. DB keys (`VOICE_INTERFACE.*`) are unchanged, so
// existing guild config carries over. Migration mapping:
//   interface set-voice-channel          -> /voice lobby (VOICE_INTERFACE.voice_channel)
//   interface set-text-channel           -> /voice panel (VOICE_INTERFACE.interface)
//   interface set-voice-channel-catgory  -> /voice category (VOICE_INTERFACE.voice_channel_category)
//   interface set-voice-channel-name     -> /voice name (VOICE_INTERFACE.voice_channel_name)
//   interface set-voice-channel-position -> /voice position (VOICE_INTERFACE.voice_channel_position)
//   set-staff-role                       -> /voice staff (VOICE_INTERFACE.staff_role)

pub fn vd_key(field: &str) -> String {
    format!("VOICE_INTERFACE.{field}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "voicedashboard",
    rename = "voice",
    subcommands(
        "vd_lobby",
        "vd_panel",
        "vd_category",
        "vd_name",
        "vd_position",
        "vd_staff"
    )
)]
pub async fn voicedashboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "lobby",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_lobby(
    ctx: Ctx<'_>,
    #[description = "Lobby voice channel"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel"),
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_voice_lobby_set")
            .unwrap_or_else(|| "Voice lobby set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "panel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_panel(
    ctx: Ctx<'_>,
    #[description = "Text channel for the dashboard"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("interface"),
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_dashboard_panel_channel_set")
            .unwrap_or_else(|| "Dashboard panel channel set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "category",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_category(
    ctx: Ctx<'_>,
    #[description = "Category where temp channels are created"]
    #[channel_types("Category")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_category"),
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_temp_channels_category_set")
            .unwrap_or_else(|| "Temp channels category set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "name",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_name(
    ctx: Ctx<'_>,
    #[description = "Template, e.g. {user}'s room"] template: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_name"),
        template.trim(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_temp_channel_name_set")
            .unwrap_or_else(|| "Temp channel name set.".to_string()),
    )
    .await?;
    Ok(())
}

/// Temp-channel position (top/bottom). Mirrors the position_type choices
/// (`top` | `bottom`) in voicedashboard.ts; the reply mirrors the TS
/// Yes-arrow acknowledgement (`Yes | ⬆` for top, `Yes | ⬇` otherwise).
pub fn parse_position(raw: &str) -> Option<&'static str> {
    match raw.trim().to_lowercase().as_str() {
        "top" => Some("top"),
        "bottom" => Some("bottom"),
        _ => None,
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "position",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_position(
    ctx: Ctx<'_>,
    #[description = "top or bottom"] position_type: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pos = parse_position(&position_type).unwrap_or("bottom");
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("voice_channel_position"),
        pos,
    )
    .await?;
    ctx.say(format!("Yes | {}", if pos == "top" { "⬆" } else { "⬇" }))
        .await?;
    Ok(())
}

// Staff role setter. Single-write note: the TS flow collects roles via a
// select menu but performs exactly one `db.set(VOICE_INTERFACE.staff_role)`
// on save-button confirm; this flat command is that single write.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "staff",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn vd_staff(
    ctx: Ctx<'_>,
    #[description = "Staff role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &vd_key("staff_role"),
        &role.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_staff_role_set")
            .unwrap_or_else(|| "Staff role set.".to_string()),
    )
    .await?;
    Ok(())
}

/// Temp-channel owner check. Entries: (key_suffix_user_id, channel_id).
pub fn is_temp_owner(entries: &[(String, String)], channel_id: &str, user_id: &str) -> bool {
    entries
        .iter()
        .any(|(uid, ch)| ch == channel_id && uid == user_id)
}

/// Parse a voice user limit (0-99).
pub fn parse_limit(raw: &str) -> Option<u8> {
    raw.trim().parse::<u8>().ok()
}

pub const TEMPVOICE_PREFIX: &str = "tempvoice:";

/// Follow-up select menus posted by the block/trust/untrust/privacy
/// buttons. Mirrors the TS collectors (custom ids kept distinct from
/// the legacy `temporary_voice_*` ones, same semantics).
pub const TEMPVOICE_BLOCK_SELECT: &str = "tempvoice:block-select";
pub const TEMPVOICE_TRUST_SELECT: &str = "tempvoice:trust-select";
pub const TEMPVOICE_UNTRUST_SELECT: &str = "tempvoice:untrust-select";
pub const TEMPVOICE_PRIVACY_SELECT: &str = "tempvoice:privacy-select";
pub const TEMPVOICE_REGION_SELECT: &str = "tempvoice:region-select";

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

pub fn tempvoice_buttons() -> Vec<serenity::CreateActionRow> {
    use serenity::{ButtonStyle, CreateActionRow, CreateButton};
    let buttons = [
        CreateButton::new(format!("{TEMPVOICE_PREFIX}name"))
            .label("Name")
            .style(ButtonStyle::Secondary),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}limit"))
            .label("Limit")
            .style(ButtonStyle::Secondary),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}privacy"))
            .label("Privacy")
            .style(ButtonStyle::Secondary),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}block"))
            .label("Block")
            .style(ButtonStyle::Danger),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}claim"))
            .label("Claim")
            .style(ButtonStyle::Success),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}delete"))
            .label("Delete")
            .style(ButtonStyle::Danger),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}trust"))
            .label("Trust")
            .style(ButtonStyle::Primary),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}untrust"))
            .label("Untrust")
            .style(ButtonStyle::Secondary),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}transfer"))
            .label("Transfer")
            .style(ButtonStyle::Primary),
        CreateButton::new(format!("{TEMPVOICE_PREFIX}region"))
            .label("Region")
            .style(ButtonStyle::Secondary),
    ];
    buttons
        .chunks(5)
        .map(|c| CreateActionRow::Buttons(c.to_vec()))
        .collect()
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

/// Dashboard button handler. Called from events_handler interaction_create.
pub async fn handle_tempvoice_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(action) = comp.data.custom_id.strip_prefix(TEMPVOICE_PREFIX) else {
        return Ok(());
    };
    if action.ends_with("-select") {
        return handle_tempvoice_select(ctx, comp, pool).await;
    }
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let channel_id = comp.channel_id.get().to_string();
    let user_id = comp.user.id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let temps = load_temps(pool, &gid).await;
    let owned = is_temp_owner(&temps, &channel_id, &user_id);
    let ch = serenity::ChannelId::new(comp.channel_id.get());
    match action {
        "claim" => {
            // Take ownership when the recorded owner left the channel.
            let owner_inside = temps.iter().any(|(uid, ch_id)| {
                ch_id == &channel_id
                    && uid
                        .parse::<u64>()
                        .ok()
                        .map(|n| {
                            ctx.cache
                                .guild(guild_id)
                                .map(|g| {
                                    g.voice_states
                                        .get(&poise::serenity_prelude::UserId::new(n))
                                        .and_then(|v| v.channel_id)
                                        .map(|c| c.get().to_string())
                                        == Some(ch_id.clone())
                                })
                                .unwrap_or(false)
                        })
                        .unwrap_or(false)
            });
            if owner_inside {
                return Ok(());
            }
            let _ = crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                &crate::events::temp_voice_key(guild_id.get(), comp.user.id.get()),
                &channel_id,
            )
            .await;
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content("Channel claimed.")
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "delete" => {
            if !owned {
                return Ok(());
            }
            let _ = ch.delete(&ctx.http).await;
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{user_id}"),
            )
            .await;
        }
        "privacy" => {
            // Privacy menu with the 6 TS options (lock/unlock,
            // invisible/visible, closechat/openchat). Mirrors
            // temporary_voice_privacy_button.ts.
            if !owned {
                return Ok(());
            }
            let opt = |label_key: &str, desc_key: &str, value: &str| {
                serenity::CreateSelectMenuOption::new(
                    crate::lang::get(&lang_code, label_key).unwrap_or_default(),
                    value.to_string(),
                )
                .description(crate::lang::get(&lang_code, desc_key).unwrap_or_default())
            };
            let options = vec![
                opt(
                    "temporary_voice_privacy_menu_lock_label",
                    "temporary_voice_privacy_menu_lock_desc",
                    PRIVACY_LOCK,
                ),
                opt(
                    "temporary_voice_privacy_menu_unlock_label",
                    "temporary_voice_privacy_menu_unlock_desc",
                    PRIVACY_UNLOCK,
                ),
                opt(
                    "temporary_voice_privacy_menu_invisible_label",
                    "temporary_voice_privacy_menu_invisible_desc",
                    PRIVACY_INVISIBLE,
                ),
                opt(
                    "temporary_voice_privacy_menu_visible_label",
                    "temporary_voice_privacy_menu_visible_desc",
                    PRIVACY_VISIBLE,
                ),
                opt(
                    "temporary_voice_privacy_menu_closechat_label",
                    "temporary_voice_privacy_menu_closechat_desc",
                    PRIVACY_CLOSECHAT,
                ),
                opt(
                    "temporary_voice_privacy_menu_openchat_label",
                    "temporary_voice_privacy_menu_openchat_desc",
                    PRIVACY_OPENCHAT,
                ),
            ];
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_PRIVACY_SELECT,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_privacy_menu_placeholder")
                    .unwrap_or_default(),
            );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "region" => {
            // Region menu with the 14 TS options. Mirrors
            // temporary_voice_region_button.ts (owner gate + menu).
            if !owned {
                return Ok(());
            }
            let options: Vec<serenity::CreateSelectMenuOption> = VOICE_REGIONS
                .iter()
                .map(|(label, value)| {
                    serenity::CreateSelectMenuOption::new(label.to_string(), value.to_string())
                })
                .collect();
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_REGION_SELECT,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_region_menu_placeholder")
                    .unwrap_or_default(),
            );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "block" => {
            // Block menu: selected members get deny overwrites.
            // Mirrors temporary_voice_block_button.ts.
            if !owned {
                return Ok(());
            }
            let menu = serenity::CreateSelectMenu::new(
                TEMPVOICE_BLOCK_SELECT,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_block_button_menu_placeholder")
                    .unwrap_or_default(),
            )
            .min_values(0)
            .max_values(10);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "trust" | "untrust" => {
            // Trust menu: selected members get full allow overwrites;
            // untrust removes them. Mirrors
            // temporary_voice_trust_button.ts (+ untrust variant).
            if !owned {
                return Ok(());
            }
            let custom_id = if action == "trust" {
                TEMPVOICE_TRUST_SELECT
            } else {
                TEMPVOICE_UNTRUST_SELECT
            };
            let menu = serenity::CreateSelectMenu::new(
                custom_id,
                serenity::CreateSelectMenuKind::User {
                    default_users: None,
                },
            )
            .placeholder(
                crate::lang::get(&lang_code, "temporary_voice_transfer_trust_placeholder")
                    .unwrap_or_default(),
            )
            .min_values(0)
            .max_values(10);
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .components(vec![serenity::CreateActionRow::SelectMenu(menu)])
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "transfer" => {
            // Hand ownership to a user id (mirrors transfer button).
            if !owned {
                return Ok(());
            }
            let modal =
                serenity::CreateModal::new("tempvoice-transfer", "New owner").components(vec![
                    serenity::CreateActionRow::InputText(
                        serenity::CreateInputText::new(
                            serenity::InputTextStyle::Short,
                            "User ID",
                            "value",
                        )
                        .placeholder("123456789")
                        .min_length(1)
                        .max_length(24),
                    ),
                ]);
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, "tempvoice-transfer").await
            else {
                return Ok(());
            };
            let mut value = String::new();
            for row in &submit.data.components {
                if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first()
                {
                    if input.custom_id == "value" {
                        value = input.value.clone().unwrap_or_default();
                    }
                }
            }
            let Ok(new_owner) = value.trim().parse::<u64>() else {
                return Ok(());
            };
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &format!("CUSTOM_VOICE.{gid}.{user_id}"),
            )
            .await;
            let _ = crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                &crate::events::temp_voice_key(guild_id.get(), new_owner),
                &channel_id,
            )
            .await;
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "name" | "limit" => {
            if !owned {
                return Ok(());
            }
            let (modal_id, label, placeholder) = if action == "name" {
                ("tempvoice-name", "New channel name", "My room")
            } else {
                ("tempvoice-limit", "User limit (0-99)", "0")
            };
            let modal = serenity::CreateModal::new(modal_id, label).components(vec![
                serenity::CreateActionRow::InputText(
                    serenity::CreateInputText::new(serenity::InputTextStyle::Short, label, "value")
                        .placeholder(placeholder)
                        .min_length(1)
                        .max_length(32),
                ),
            ]);
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) = crate::commands::await_modal_submit(ctx, comp, modal_id).await
            else {
                return Ok(());
            };
            let mut value = String::new();
            for row in &submit.data.components {
                if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first()
                {
                    if input.custom_id == "value" {
                        value = input.value.clone().unwrap_or_default();
                    }
                }
            }
            if action == "name" {
                let _ = ch
                    .edit(&ctx.http, serenity::EditChannel::new().name(value.trim()))
                    .await;
            } else if let Some(limit) = parse_limit(&value) {
                let _ = ch
                    .edit(
                        &ctx.http,
                        serenity::EditChannel::new().user_limit(limit as u32),
                    )
                    .await;
            }
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        _ => {}
    }
    Ok(())
}

/// Follow-up select menus posted by the block/trust/untrust/privacy
/// buttons. Mirrors the TS message collectors in
/// temporary_voice_{block,trust,privacy}_button.ts (owner gate +
/// overwrite sync + summary embed).
pub async fn handle_tempvoice_select(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let self_id = comp.user.id.get().to_string();
    let voice_id = comp.channel_id;
    let temps = load_temps(pool, &gid).await;
    if !is_temp_owner(&temps, &voice_id.get().to_string(), &self_id) {
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
            .await?;
        return Ok(());
    }
    let current: Vec<String> = match voice_id.to_channel(&ctx.http).await {
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
    let no_one = crate::lang::get(&lang_code, "temporary_voice_no_one").unwrap_or_default();
    let list = |ids: &[String]| {
        if ids.is_empty() {
            no_one.clone()
        } else {
            ids.iter()
                .map(|id| format!("<@{id}>"))
                .collect::<Vec<_>>()
                .join(" ")
        }
    };
    match comp.data.custom_id.as_str() {
        TEMPVOICE_TRUST_SELECT | TEMPVOICE_UNTRUST_SELECT | TEMPVOICE_BLOCK_SELECT => {
            let selected: Vec<String> = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::UserSelect { values } => {
                    values.iter().map(|u| u.get().to_string()).collect()
                }
                _ => vec![],
            };
            let (added, removed) = sync_members(&selected, &current, &self_id);
            for id in &removed {
                if let Ok(uid) = id.parse::<u64>() {
                    let _ = voice_id
                        .delete_permission(
                            &ctx.http,
                            serenity::PermissionOverwriteType::Member(serenity::UserId::new(uid)),
                        )
                        .await;
                }
            }
            let is_block = comp.data.custom_id.as_str() == TEMPVOICE_BLOCK_SELECT;
            for id in &added {
                if let Ok(uid) = id.parse::<u64>() {
                    let (allow, deny) = if is_block {
                        (
                            serenity::Permissions::VIEW_CHANNEL,
                            serenity::Permissions::SEND_MESSAGES
                                | serenity::Permissions::ADD_REACTIONS
                                | serenity::Permissions::CONNECT
                                | serenity::Permissions::SPEAK,
                        )
                    } else {
                        (
                            serenity::Permissions::VIEW_CHANNEL
                                | serenity::Permissions::CONNECT
                                | serenity::Permissions::SPEAK
                                | serenity::Permissions::STREAM
                                | serenity::Permissions::SEND_MESSAGES
                                | serenity::Permissions::READ_MESSAGE_HISTORY
                                | serenity::Permissions::ATTACH_FILES
                                | serenity::Permissions::USE_APPLICATION_COMMANDS,
                            serenity::Permissions::empty(),
                        )
                    };
                    let _ = voice_id
                        .create_permission(
                            &ctx.http,
                            serenity::PermissionOverwrite {
                                allow,
                                deny,
                                kind: serenity::PermissionOverwriteType::Member(
                                    serenity::UserId::new(uid),
                                ),
                            },
                        )
                        .await;
                }
            }
            // Field mapping mirrors the TS summary embeds verbatim
            // (block: added -> unblocked field, removed -> blocked field).
            let title =
                crate::lang::get(&lang_code, "temporary_voice_title_embec").unwrap_or_default();
            let (first_key, second_key) = if is_block {
                (
                    "temporary_voice_unblocked_member",
                    "temporary_voice_blocked_mmeber",
                )
            } else {
                (
                    "temporary_voice_untrusted_member",
                    "temporary_voice_trusted_member",
                )
            };
            let (first_val, second_val) = if is_block {
                (list(&added), list(&removed))
            } else {
                (list(&removed), list(&added))
            };
            let embed = serenity::CreateEmbed::default()
                .description(title)
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, first_key).unwrap_or_default(),
                    first_val,
                    false,
                )
                .field(
                    crate::lang::get(&lang_code, second_key).unwrap_or_default(),
                    second_val,
                    false,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_PRIVACY_SELECT => {
            let value = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => String::new(),
            };
            let Some((allow_bits, deny_bits)) = privacy_rule(&value) else {
                return Ok(());
            };
            let allow = serenity::Permissions::from_bits_truncate(allow_bits);
            let deny = serenity::Permissions::from_bits_truncate(deny_bits);
            let _ = voice_id
                .create_permission(
                    &ctx.http,
                    serenity::PermissionOverwrite {
                        allow,
                        deny,
                        kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(
                            guild_id.get(),
                        )),
                    },
                )
                .await;
            let label_key = match value.as_str() {
                PRIVACY_LOCK => "temporary_voice_privacy_menu_lock_label",
                PRIVACY_UNLOCK => "temporary_voice_privacy_menu_unlock_label",
                PRIVACY_INVISIBLE => "temporary_voice_privacy_menu_invisible_label",
                PRIVACY_VISIBLE => "temporary_voice_privacy_menu_visible_label",
                PRIVACY_CLOSECHAT => "temporary_voice_privacy_menu_closechat_label",
                _ => "temporary_voice_privacy_menu_openchat_label",
            };
            let embed = serenity::CreateEmbed::default()
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, label_key).unwrap_or_default(),
                    "Yes",
                    true,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        TEMPVOICE_REGION_SELECT => {
            // Apply the picked RTC region to the owner's temp channel.
            // Mirrors the starter-menu collector (setRTCRegion + summary).
            let value = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned().unwrap_or_default()
                }
                _ => String::new(),
            };
            if !VOICE_REGIONS.iter().any(|(_, v)| *v == value) {
                return Ok(());
            }
            let target = temps
                .iter()
                .find(|(uid, _)| *uid == self_id)
                .map(|(_, ch)| ch.clone())
                .and_then(|c| c.parse::<u64>().ok())
                .map(serenity::ChannelId::new)
                .unwrap_or(voice_id);
            let _ = target
                .edit(
                    &ctx.http,
                    serenity::EditChannel::new().voice_region(Some(value.clone())),
                )
                .await;
            let region_emoji = crate::emojis::app_emoji_markup(&ctx.http, "VC_Region")
                .await
                .unwrap_or_default();
            let embed = serenity::CreateEmbed::default()
                .description(
                    crate::lang::get(&lang_code, "temporary_voice_title_embec").unwrap_or_default(),
                )
                .colour(2829617)
                .image(crate::funcs::guild_banner_url(pool, &gid).await)
                .field(
                    crate::lang::get(&lang_code, "temporary_voice_new_region").unwrap_or_default(),
                    format!("{region_emoji} **{value}**"),
                    true,
                );
            comp.create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        _ => {}
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn temp_owner_and_limit() {
        let entries = vec![("1".to_string(), "9".to_string())];
        assert!(is_temp_owner(&entries, "9", "1"));
        assert!(!is_temp_owner(&entries, "9", "2"));
        assert_eq!(parse_limit("5"), Some(5));
        assert_eq!(parse_limit("500"), None);
        assert_eq!(parse_limit("x"), None);
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
    fn position_parses_ts_choices_only() {
        assert_eq!(parse_position("top"), Some("top"));
        assert_eq!(parse_position("bottom"), Some("bottom"));
        assert_eq!(parse_position(" Top "), Some("top"));
        assert_eq!(parse_position("BOTTOM"), Some("bottom"));
        assert_eq!(parse_position("up"), None);
        assert_eq!(parse_position("down"), None);
        assert_eq!(parse_position(""), None);
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
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
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
}
