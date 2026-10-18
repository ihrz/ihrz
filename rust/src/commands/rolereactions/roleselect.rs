// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// `roleselect` slash command + builder interaction handlers
// (pure move from rolereaction.rs; zero logic change).

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RoleSelectEntry {
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub role_id: String,
    #[serde(default)]
    pub emoji: String,
    #[serde(default)]
    pub desc: String,
}

/// In-progress builder state (the 50-min TS collector becomes a
/// kv draft until save/cancel).
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct RoleSelectDraft {
    #[serde(default)]
    pub target_channel: String,
    #[serde(default)]
    pub target_msg: String,
    #[serde(default)]
    pub data: Vec<RoleSelectEntry>,
    #[serde(default)]
    pub placeholder: String,
    #[serde(default)]
    pub invoker: String,
    #[serde(default)]
    pub pending: Option<RoleSelectPending>,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct RoleSelectPending {
    #[serde(default)]
    pub emoji: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub desc: String,
}

/// Builder main-menu id + saved-select prefix. Mirrors
/// `roleselect_main_menu` and ``roleselect_roles%${messageId}``.
pub const ROLESELECT_MAIN_ID: &str = "roleselect_main_menu";
pub const ROLESELECT_ROLES_PREFIX: &str = "roleselect_roles%";
pub const ROLESELECT_ADD_MODAL: &str = "roleselect_add_fields";
pub const ROLESELECT_PLACEHOLDER_MODAL: &str = "roleselect_placeholder";
pub const ROLESELECT_ROLE_PICK_PREFIX: &str = "roleselect_role_pick:";

pub fn roleselect_key(message_id: u64) -> String {
    format!("GUILD.ROLE_SELECT.{message_id}")
}

pub fn roleselect_draft_key(config_message_id: u64) -> String {
    format!("GUILD.ROLE_SELECT_DRAFT.{config_message_id}")
}

pub fn roleselect_preview_id(message_id: u64) -> String {
    format!("{ROLESELECT_ROLES_PREFIX}{message_id}")
}

/// Main-menu select (add/remove/placeholder/save/cancel). Labels
/// come from YAML at the call site.
pub fn build_main_menu(labels: [&str; 5], placeholder: &str) -> serenity::CreateSelectMenu {
    let values = ["add", "remove", "placeholder", "save", "cancel"];
    let emojis = ["🔹", "🔸", "🏷️", "💾", "🚫"];
    let options = labels
        .iter()
        .zip(values)
        .zip(emojis)
        .map(|((label, value), emoji)| {
            serenity::CreateSelectMenuOption::new((*label).to_string(), value)
                .emoji(serenity::ReactionType::Unicode(emoji.to_string()))
        })
        .collect();
    serenity::CreateSelectMenu::new(
        ROLESELECT_MAIN_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder.to_string())
}

/// Live preview select over the draft entries. Mirrors
/// generateSelectMenu (label, `role_<id>` value, emoji when valid,
/// desc).
pub fn build_preview_select(
    message_id: u64,
    placeholder: &str,
    data: &[RoleSelectEntry],
) -> serenity::CreateSelectMenu {
    let options = data
        .iter()
        .map(|item| {
            let mut opt = serenity::CreateSelectMenuOption::new(
                item.label.clone(),
                format!("role_{}", item.role_id),
            );
            if !item.emoji.is_empty()
                && (crate::funcs::is_single_emoji(&item.emoji)
                    || crate::funcs::is_discord_emoji(&item.emoji))
            {
                opt = opt.emoji(serenity::ReactionType::Unicode(item.emoji.clone()));
            }
            if !item.desc.is_empty() {
                opt = opt.description(item.desc.clone());
            }
            opt
        })
        .collect();
    serenity::CreateSelectMenu::new(
        roleselect_preview_id(message_id),
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(placeholder.to_string())
}

/// Config embed field for one entry:
/// `[emoji|None] ・ label` / `Roles: <mention>|Unknown\n<desc>: ...`.
/// Mirrors updateConfiguration.
pub fn config_field(
    entry: &RoleSelectEntry,
    var_none: &str,
    roles_word: &str,
    desc_label: &str,
    role_known: bool,
) -> (String, String) {
    let emoji = if entry.emoji.is_empty() {
        var_none.to_string()
    } else {
        entry.emoji.clone()
    };
    let name = format!("[{emoji}] ・ {}", entry.label);
    let role = if role_known {
        format!("<@&{}>", entry.role_id)
    } else {
        var_none.to_string()
    };
    let desc = if entry.desc.is_empty() {
        var_none.to_string()
    } else {
        entry.desc.clone()
    };
    (name, format!("{roles_word}: {role}\n{desc_label}: {desc}"))
}

/// Pure helper: parse a "role_<id>" select value into a RoleId.
pub fn parse_roleselect_value(value: &str) -> Option<serenity::RoleId> {
    value
        .strip_prefix("role_")?
        .trim()
        .parse::<u64>()
        .ok()
        .map(serenity::RoleId::new)
}

pub async fn load_roleselect(
    pool: &crate::db::Pool,
    guild_id: &str,
    message_id: u64,
) -> Vec<RoleSelectEntry> {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, &roleselect_key(message_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Configure role selection for a specific message
#[poise::command(
    slash_command,
    prefix_command,
    category = "rolereactions",
    rename = "roleselect",
    aliases("selectreact"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Configurer la sélection de rôles pour un message spécifique"),
    description_localized("ja", "特定のメッセージのロール選択を設定"),
    description_localized("ru", "Настроить выбор ролей для сообщения"),
    description_localized("es-ES", "Configurar la selección de roles para un mensaje específico")
)]
pub async fn roleselect(
    ctx: Ctx<'_>,
    // TS HybridCommands/rolereactions/roleselect.ts registers "channel".
    #[description = "Channel id with the target message"]
    #[rename = "channel"]
    channel_id: String,
    #[description = "Message id to configure"] message_id: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    // TS validates length>=9, fetches the message, requires bot authorship.
    if message_id.trim().len() < 9 {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "roleselect_invalid_message_id",
                "Invalid message ID provided. Please provide a valid message ID.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let (Ok(ch), Ok(mid)) = (
        channel_id.trim().parse::<u64>(),
        message_id.trim().parse::<u64>(),
    ) else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "roleselect_message_not_found",
                "Message not found in the specified channel.",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    let channel = serenity::ChannelId::new(ch);
    let Ok(target) = channel
        .message(ctx.http(), serenity::MessageId::new(mid))
        .await
    else {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "roleselect_message_not_found",
                "Message not found in the specified channel.",
            )
            .await,
        )
        .await?;
        return Ok(());
    };
    if target.author.id != ctx.serenity_context().cache.current_user().id {
        ctx.say(crate::commands::lang_for(
                &ctx,
                "buttonreaction_message_other_user_error",
                "I can't modify the components of another user's message. You need to choose a message sent by myself. Tip: Do `/utils embed` to create your own beautiful embed!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let base_data = load_roleselect(&ctx.data().pool, &gid, mid).await;
    let draft = RoleSelectDraft {
        target_channel: ch.to_string(),
        target_msg: mid.to_string(),
        placeholder: t("roleselect_default_placeholder"),
        invoker: ctx.author().id.get().to_string(),
        data: base_data,
        pending: None,
    };
    let known = roles_known(
        ctx.serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| g.roles.clone())
            .as_ref(),
        &draft.data,
    );
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(config_full_embed(
                    &draft,
                    &known,
                    &t("roleselect_menu1_embed_title"),
                    &t("roleselect_menu1_embed_description"),
                    &t("var_none"),
                    &t("var_roles"),
                    &t("roleselect_modal1_fields3_label"),
                ))
                .components(config_rows(
                    &draft,
                    [
                        &t("roleselect_menu1_add"),
                        &t("roleselect_menu1_remove"),
                        &t("roleselect_menu1_change_placeholder"),
                        &t("roleselect_menu1_save"),
                        &t("roleselect_menu1_cancel"),
                        &t("roleselect_menu1_placeholder"),
                    ],
                )),
        )
        .await?;
    let config_msg = handle.message().await?.id.get();
    let _ = crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &roleselect_draft_key(config_msg),
        &serde_json::to_string(&draft)?,
    )
    .await;
    Ok(())
}

/// Cache-only role knowledge flags (TS reads roles.cache only).
fn roles_known(
    roles: Option<&std::collections::HashMap<serenity::RoleId, serenity::Role>>,
    data: &[RoleSelectEntry],
) -> Vec<bool> {
    data.iter()
        .map(|e| {
            e.role_id
                .parse::<u64>()
                .ok()
                .map(|id| {
                    roles
                        .map(|m| m.contains_key(&serenity::RoleId::new(id)))
                        .unwrap_or(false)
                })
                .unwrap_or(false)
        })
        .collect()
}

/// Config embed fields from entries + knowledge flags.
fn config_fields(
    data: &[RoleSelectEntry],
    known: &[bool],
    var_none: &str,
    roles_word: &str,
    desc_label: &str,
) -> Vec<(String, String, bool)> {
    data.iter()
        .zip(known.iter())
        .map(|(entry, is_known)| {
            let (name, value) = config_field(entry, var_none, roles_word, desc_label, *is_known);
            (name, value, false)
        })
        .collect()
}

/// Builder main-menu row. Labels resolved by the caller.
fn main_menu_row(
    add: &str,
    remove: &str,
    change_placeholder: &str,
    save: &str,
    cancel: &str,
    menu_placeholder: &str,
) -> serenity::CreateActionRow {
    serenity::CreateActionRow::SelectMenu(build_main_menu(
        [add, remove, change_placeholder, save, cancel],
        menu_placeholder,
    ))
}

/// Config message rows: main menu + live preview when non-empty.
fn config_rows(draft: &RoleSelectDraft, menu: [&str; 6]) -> Vec<serenity::CreateActionRow> {
    let mut rows = vec![main_menu_row(
        menu[0], menu[1], menu[2], menu[3], menu[4], menu[5],
    )];
    if !draft.data.is_empty() {
        rows.push(serenity::CreateActionRow::SelectMenu(build_preview_select(
            draft.target_msg.parse::<u64>().unwrap_or(0),
            &draft.placeholder,
            &draft.data,
        )));
    }
    rows
}

/// Full config embed from a draft.
fn config_full_embed(
    draft: &RoleSelectDraft,
    known: &[bool],
    title: &str,
    desc: &str,
    var_none: &str,
    roles_word: &str,
    desc_label: &str,
) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(0x2f3136))
        .title(title.to_string())
        .description(desc.to_string())
        .fields(config_fields(
            &draft.data,
            known,
            var_none,
            roles_word,
            desc_label,
        ))
}

/// Re-render the config message from the draft (http edit, like
/// interaction2.editReply/update in the TS collector).
async fn refresh_config(
    http: &std::sync::Arc<serenity::Http>,
    roles: Option<&std::collections::HashMap<serenity::RoleId, serenity::Role>>,
    lang_code: &str,
    config_msg: u64,
    config_channel: u64,
    draft: &RoleSelectDraft,
) {
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let known = roles_known(roles, &draft.data);
    let embed = config_full_embed(
        draft,
        &known,
        &t("roleselect_menu1_embed_title"),
        &t("roleselect_menu1_embed_description"),
        &t("var_none"),
        &t("var_roles"),
        &t("roleselect_modal1_fields3_label"),
    );
    let rows = config_rows(
        draft,
        [
            &t("roleselect_menu1_add"),
            &t("roleselect_menu1_remove"),
            &t("roleselect_menu1_change_placeholder"),
            &t("roleselect_menu1_save"),
            &t("roleselect_menu1_cancel"),
            &t("roleselect_menu1_placeholder"),
        ],
    );
    let _ = serenity::ChannelId::new(config_channel)
        .edit_message(
            http,
            serenity::MessageId::new(config_msg),
            serenity::EditMessage::new().embed(embed).components(rows),
        )
        .await;
}

/// Load a builder draft by config message id.
async fn load_draft(pool: &crate::db::Pool, gid: &str, config_msg: u64) -> Option<RoleSelectDraft> {
    crate::commands::owner::main::routed_get(pool, gid, gid, &roleselect_draft_key(config_msg))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

async fn save_draft(pool: &crate::db::Pool, gid: &str, config_msg: u64, draft: &RoleSelectDraft) {
    let _ = crate::commands::owner::main::routed_set(
        pool,
        gid,
        gid,
        &roleselect_draft_key(config_msg),
        &serde_json::to_string(draft).unwrap_or_default(),
    )
    .await;
}

/// Builder main-menu presses (add/remove/placeholder/save/cancel
/// with the invoker gate). Mirrors the TS collector legs.
pub async fn handle_roleselect_main(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let config_msg = comp.message.id.get();
    let Some(mut draft) = load_draft(pool, &gid, config_msg).await else {
        return Ok(());
    };
    if comp.user.id.get().to_string() != draft.invoker {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(t("help_not_for_you"))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let value = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => String::new(),
    };
    let http = ctx.http.clone();
    let roles_snapshot = ctx.cache.guild(guild_id).map(|g| g.roles.clone());
    match value.as_str() {
        "add" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t("roleselect_modal1_title"),
                ROLESELECT_ADD_MODAL,
            );
            modal_opts.fields.extend([
                crate::modal_helper::ModalField::Text(crate::modal_helper::TextField {
                    custom_id: "case_emoji".to_string(),
                    label: t("roleselect_modal1_fields1_label"),
                    placeholder: Some(t("roleselect_modal1_fields1_placeholder")),
                    style: crate::modal_helper::TextStyle::Short,
                    required: false,
                    max_length: Some(120),
                    min_length: Some(1),
                    value: None,
                }),
                crate::modal_helper::ModalField::Text(crate::modal_helper::TextField {
                    custom_id: "case_title".to_string(),
                    label: t("roleselect_modal1_fields2_label"),
                    placeholder: Some(t("roleselect_modal1_fields2_placeholder")),
                    style: crate::modal_helper::TextStyle::Short,
                    required: true,
                    max_length: Some(50),
                    min_length: Some(4),
                    value: None,
                }),
                crate::modal_helper::ModalField::Text(crate::modal_helper::TextField {
                    custom_id: "case_desc".to_string(),
                    label: t("roleselect_modal1_fields3_label"),
                    placeholder: Some(t("roleselect_modal1_fields3_placeholder")),
                    style: crate::modal_helper::TextStyle::Paragraph,
                    required: false,
                    max_length: Some(120),
                    min_length: Some(0),
                    value: None,
                }),
            ]);
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, ROLESELECT_ADD_MODAL).await
            else {
                return Ok(());
            };
            let emoji = crate::modal_helper::text_value(&submit, "case_emoji")
                .trim()
                .to_string();
            let label = crate::modal_helper::text_value(&submit, "case_title")
                .trim()
                .to_string();
            let desc = crate::modal_helper::text_value(&submit, "case_desc")
                .trim()
                .to_string();
            draft.pending = Some(RoleSelectPending { emoji, label, desc });
            save_draft(pool, &gid, config_msg, &draft).await;
            // Ephemeral role picker (the 60s RoleSelect wait,
            // stateless via the pick id below).
            submit
                .create_response(
                    &http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(t("roleselect_awaiting1_msg"))
                            .components(vec![serenity::CreateActionRow::SelectMenu(
                                serenity::CreateSelectMenu::new(
                                    format!("{ROLESELECT_ROLE_PICK_PREFIX}{config_msg}"),
                                    serenity::CreateSelectMenuKind::Role {
                                        default_roles: None,
                                    },
                                )
                                .placeholder(t("roleselect_awaiting1_menu_placeholder"))
                                .min_values(1)
                                .max_values(1),
                            )])
                            .ephemeral(true),
                    ),
                )
                .await?;
        }
        "remove" => {
            if draft.data.is_empty() {
                comp.create_response(
                    &http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(t("roleselect_no_role_found"))
                            .ephemeral(true),
                    ),
                )
                .await?;
                return Ok(());
            }
            draft.data.pop();
            save_draft(pool, &gid, config_msg, &draft).await;
            if draft.data.is_empty() {
                // TS clears embeds and drops the preview row.
                comp.create_response(
                    &http,
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .embeds(vec![])
                            .components(vec![serenity::CreateActionRow::SelectMenu(
                                build_main_menu(
                                    [
                                        &t("roleselect_menu1_add"),
                                        &t("roleselect_menu1_remove"),
                                        &t("roleselect_menu1_change_placeholder"),
                                        &t("roleselect_menu1_save"),
                                        &t("roleselect_menu1_cancel"),
                                    ],
                                    &t("roleselect_menu1_placeholder"),
                                ),
                            )]),
                    ),
                )
                .await?;
                comp.create_followup(
                    &http,
                    serenity::CreateInteractionResponseFollowup::new()
                        .content(t("roleselect_all_role_removed"))
                        .ephemeral(true),
                )
                .await?;
                return Ok(());
            }
            refresh_config(
                &http,
                roles_snapshot.as_ref(),
                &code,
                config_msg,
                comp.channel_id.get(),
                &draft,
            )
            .await;
            comp.create_response(
                &http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("roleselect_last_role_removed"))
                        .ephemeral(true),
                ),
            )
            .await?;
        }
        "placeholder" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t("roleselect_modal2_title"),
                ROLESELECT_PLACEHOLDER_MODAL,
            );
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "placeholder".to_string(),
                        label: t("roleselect_modal2_label"),
                        placeholder: Some(t("roleselect_modal2_placeholder")),
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(50),
                        min_length: Some(8),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, ROLESELECT_PLACEHOLDER_MODAL).await
            else {
                return Ok(());
            };
            draft.placeholder = crate::modal_helper::text_value(&submit, "placeholder")
                .trim()
                .to_string();
            save_draft(pool, &gid, config_msg, &draft).await;
            refresh_config(
                &http,
                roles_snapshot.as_ref(),
                &code,
                config_msg,
                comp.channel_id.get(),
                &draft,
            )
            .await;
            let _ = submit
                .create_response(&http, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "save" => {
            let key = roleselect_key(draft.target_msg.parse::<u64>().unwrap_or(0));
            if crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                &key,
                &serde_json::to_string(&draft.data).unwrap_or_default(),
            )
            .await
            .is_err()
            {
                comp.create_response(
                    &http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(t("roleselect_failed_to_save_config"))
                            .ephemeral(true),
                    ),
                )
                .await?;
                return Ok(());
            }
            // Apply the preview select to the target message (or
            // clear it when empty).
            if let (Ok(ch), Ok(mid)) = (
                draft.target_channel.parse::<u64>(),
                draft.target_msg.parse::<u64>(),
            ) {
                let channel = serenity::ChannelId::new(ch);
                if let Ok(target) = channel.message(&http, serenity::MessageId::new(mid)).await {
                    let mut edit = serenity::EditMessage::new();
                    if !draft.data.is_empty() {
                        edit = edit.components(vec![serenity::CreateActionRow::SelectMenu(
                            build_preview_select(mid, &draft.placeholder, &draft.data),
                        )]);
                    } else {
                        edit = edit.components(vec![]);
                    }
                    let _ = channel.edit_message(&http, target.id, edit).await;
                }
            }
            comp.create_response(
                &http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("roleselect_save_command_ok"))
                        .ephemeral(true),
                ),
            )
            .await?;
            // Collector-end parity: strip the config message rows.
            let _ = comp
                .channel_id
                .edit_message(
                    &http,
                    comp.message.id,
                    serenity::EditMessage::new().components(vec![]),
                )
                .await;
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &roleselect_draft_key(config_msg),
            )
            .await;
        }
        _ => {
            // cancel (and anything unknown): confirm + strip rows.
            comp.create_response(
                &http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(t("roleselect_canceled_command_ok"))
                        .ephemeral(true),
                ),
            )
            .await?;
            let _ = comp
                .channel_id
                .edit_message(
                    &http,
                    comp.message.id,
                    serenity::EditMessage::new().components(vec![]),
                )
                .await;
            let _ = crate::commands::owner::main::routed_del(
                pool,
                &gid,
                &gid,
                &roleselect_draft_key(config_msg),
            )
            .await;
        }
    }
    Ok(())
}

/// Role picker for the builder add flow
/// (`roleselect_role_pick:<config>`). Dup roles are rejected,
// otherwise the pending entry joins the draft.
pub async fn handle_roleselect_role_pick(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    config_msg: u64,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let Some(mut draft) = load_draft(pool, &gid, config_msg).await else {
        return Ok(());
    };
    let role_id = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::RoleSelect { values } => values
            .first()
            .map(|r| r.get().to_string())
            .unwrap_or_default(),
        _ => String::new(),
    };
    let Some(pending) = draft.pending.clone() else {
        let _ = comp
            .create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
            .await;
        return Ok(());
    };
    if role_id.is_empty() || draft.data.iter().any(|x| x.role_id == role_id) {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(t("roleselect_role_already_exist"))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let mut entry = RoleSelectEntry {
        label: pending.label,
        role_id,
        ..Default::default()
    };
    if !pending.emoji.is_empty()
        && (crate::funcs::is_single_emoji(&pending.emoji)
            || crate::funcs::is_discord_emoji(&pending.emoji))
    {
        entry.emoji = pending.emoji;
    }
    if !pending.desc.is_empty() {
        entry.desc = pending.desc;
    }
    draft.data.push(entry);
    draft.pending = None;
    save_draft(pool, &gid, config_msg, &draft).await;
    let http = ctx.http.clone();
    let roles_snapshot = ctx.cache.guild(guild_id).map(|g| g.roles.clone());
    refresh_config(
        &http,
        roles_snapshot.as_ref(),
        &code,
        config_msg,
        comp.channel_id.get(),
        &draft,
    )
    .await;
    // Delta: the ephemeral role prompt is left in place (TS deletes
    // the prompt message, whose id stateless Rust does not track).
    let _ = comp
        .create_response(&ctx.http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    Ok(())
}

/// Saved-select presses (`roleselect_roles%<msg>`). Mirrors
/// SelectMenu/roleselect_roles.ts: saved-data lookup, role fetch,
/// bot hierarchy check, add/remove toggle.
pub async fn handle_roleselect_grant(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let mid = comp.message.id.get();
    let data = load_roleselect(pool, &gid, mid).await;
    if data.is_empty() {
        return Ok(());
    }
    let value = match &comp.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => {
            values.first().cloned().unwrap_or_default()
        }
        _ => String::new(),
    };
    let Some(role_id) = parse_roleselect_value(&value) else {
        return Ok(());
    };
    let ephemeral = |content: String| {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
    };
    let roles = guild_id.roles(&ctx.http).await.unwrap_or_default();
    let Some(target) = roles.get(&role_id) else {
        ephemeral(t("buttonreaction_role_doesnt_exit")).await?;
        return Ok(());
    };
    let bot_id = ctx.cache.current_user().id;
    let bot_top = guild_id
        .member(&ctx.http, bot_id)
        .await
        .ok()
        .map(|m| {
            m.roles
                .iter()
                .filter_map(|r| roles.get(r))
                .map(|r| r.position)
                .max()
                .unwrap_or(0)
        })
        .unwrap_or(0);
    if target.position >= bot_top {
        ephemeral(t("buttonreaction_role_too_high")).await?;
        return Ok(());
    }
    // Delta: "[RoleSelect] Module" audit reason unavailable in 0.12.
    let mention = format!("<@&{}>", role_id.get());
    let member = guild_id.member(&ctx.http, comp.user.id).await?;
    if member.roles.contains(&role_id) {
        member.remove_role(&ctx.http, role_id).await?;
        ephemeral(t("buttonreaction_role_remove").replace("${fetched_role.toString()}", &mention))
            .await?;
    } else {
        member.add_role(&ctx.http, role_id).await?;
        ephemeral(t("buttonreaction_role_add").replace("${fetched_role.toString()}", &mention))
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_role_values() {
        assert_eq!(
            parse_roleselect_value("role_123"),
            Some(serenity::RoleId::new(123))
        );
        assert_eq!(parse_roleselect_value("role_abc"), None);
        assert_eq!(parse_roleselect_value("pick_123"), None);
        assert_eq!(parse_roleselect_value(""), None);
    }

    #[test]
    fn roleselect_key_shape() {
        assert_eq!(roleselect_key(42), "GUILD.ROLE_SELECT.42");
    }

    #[test]
    fn ts_row_shape_parses() {
        // TS writes {label, roleId, emoji?, desc?} (camelCase).
        let entry: RoleSelectEntry =
            serde_json::from_str(r#"{"label":"Mods","roleId":"7","emoji":"⭐","desc":"team"}"#)
                .unwrap();
        assert_eq!(entry.label, "Mods");
        assert_eq!(entry.role_id, "7");
        assert_eq!(entry.emoji, "⭐");
        assert_eq!(entry.desc, "team");
    }

    #[test]
    fn config_field_shape() {
        let entry = RoleSelectEntry {
            label: "Mods".to_string(),
            role_id: "7".to_string(),
            emoji: String::new(),
            desc: String::new(),
        };
        let (name, value) = config_field(&entry, "None", "Roles", "Description", true);
        assert_eq!(name, "[None] ・ Mods");
        assert_eq!(value, "Roles: <@&7>\nDescription: None");
        let (_, missing) = config_field(&entry, "None", "Roles", "Description", false);
        assert_eq!(missing, "Roles: None\nDescription: None");
    }

    #[test]
    fn preview_id_and_select_shape() {
        assert_eq!(roleselect_preview_id(9), "roleselect_roles%9");
        let data = vec![RoleSelectEntry {
            label: "Mods".to_string(),
            role_id: "7".to_string(),
            emoji: "⭐".to_string(),
            desc: "team".to_string(),
        }];
        let menu = build_preview_select(9, "Pick", &data);
        let v = serde_json::to_value(&menu).unwrap();
        assert_eq!(v["custom_id"], "roleselect_roles%9");
        assert_eq!(v["placeholder"], "Pick");
        assert_eq!(v["options"][0]["label"], "Mods");
        assert_eq!(v["options"][0]["value"], "role_7");
        assert_eq!(v["options"][0]["description"], "team");
    }

    #[test]
    fn main_menu_shape() {
        let menu = build_main_menu(["a", "r", "p", "s", "c"], "Choose");
        let v = serde_json::to_value(&menu).unwrap();
        assert_eq!(v["custom_id"], ROLESELECT_MAIN_ID);
        assert_eq!(v["placeholder"], "Choose");
        assert_eq!(v["options"].as_array().unwrap().len(), 5);
        assert_eq!(v["options"][0]["value"], "add");
        assert_eq!(v["options"][4]["value"], "cancel");
    }
}
