// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/voicedashboard/*.
//
// TS keys: VOICE_INTERFACE.{voice_channel (lobby trigger), interface,
// voice_channel_category, voice_channel_name, voice_channel_position,
// staff_role}. Temp-channel runtime lives in the voice state handler.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub fn vd_key(field: &str) -> String {
    format!("VOICE_INTERFACE.{field}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "voicedashboard",
    rename = "voicedashboard",
    subcommands("vd_lobby", "vd_panel", "vd_category", "vd_name", "vd_staff"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn voicedashboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "lobby")]
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
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &vd_key("voice_channel"),
        &channel.id.get().to_string(),
    )
    .await?;
    ctx.say("Voice lobby set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "panel")]
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
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &vd_key("interface"),
        &channel.id.get().to_string(),
    )
    .await?;
    ctx.say("Dashboard panel channel set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "category")]
pub async fn vd_category(
    ctx: Ctx<'_>,
    #[description = "Category name"] name: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &vd_key("voice_channel_category"),
        name.trim(),
    )
    .await?;
    ctx.say("Temp channels category set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "name")]
pub async fn vd_name(
    ctx: Ctx<'_>,
    #[description = "Template, e.g. {user}'s room"] template: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &vd_key("voice_channel_name"),
        template.trim(),
    )
    .await?;
    ctx.say("Temp channel name set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "staff")]
pub async fn vd_staff(
    ctx: Ctx<'_>,
    #[description = "Staff role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &vd_key("staff_role"),
        &role.id.get().to_string(),
    )
    .await?;
    ctx.say("Staff role set.").await?;
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
    ];
    buttons
        .chunks(5)
        .map(|c| CreateActionRow::Buttons(c.to_vec()))
        .collect()
}

/// Load (user_id, channel_id) temp pairs for a guild.
pub async fn load_temps(pool: &crate::db::Pool, guild_id: &str) -> Vec<(String, String)> {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'CUSTOM_VOICE.%'",
    )
    .bind(guild_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    rows.iter()
        .filter_map(|(k, v)| {
            let uid = k.rsplit('.').next()?.to_string();
            Some((uid, v.clone()))
        })
        .collect()
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
            let _ = crate::db::kv_set(
                pool,
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
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(format!("CUSTOM_VOICE.{gid}.{user_id}"))
                .execute(pool)
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
            let Some(submit) = serenity::collector::ModalInteractionCollector::new(&ctx.shard)
                .author_id(comp.user.id)
                .custom_ids(vec!["tempvoice-transfer".to_string()])
                .timeout(std::time::Duration::from_secs(120))
                .await
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
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(format!("CUSTOM_VOICE.{gid}.{user_id}"))
                .execute(pool)
                .await;
            let _ = crate::db::kv_set(
                pool,
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
            let Some(submit) = serenity::collector::ModalInteractionCollector::new(&ctx.shard)
                .author_id(comp.user.id)
                .custom_ids(vec![modal_id.to_string()])
                .timeout(std::time::Duration::from_secs(120))
                .await
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
            let embed = serenity::CreateEmbed::default().colour(2829617).field(
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
}
