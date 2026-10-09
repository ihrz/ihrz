use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub const WELCOMER_PREFIX: &str = "welcomer-";
pub const WELCOMER_SECTION_ID: &str = "welcomer-section";
pub const WELCOMER_SECTIONS: [&str; 6] = ["join", "leave", "dm", "roles", "channels", "banner"];
pub const PANEL_ACCENT: u32 = 0xffb3cc;
const PANEL_SECTION_FIELD: &str = "welcomerPanelSection";
const PENDING_ROLES_FIELD: &str = "welcomerPendingRoles";

/// Validate a panel section name. Mirrors the WelcomerSection union.
pub fn welcomer_section(s: &str) -> Option<&'static str> {
    WELCOMER_SECTIONS.iter().find(|v| **v == s).copied()
}

/// Snapshot of the blob fields the panel renders.
pub struct PanelState {
    pub section: String,
    pub join_message: Option<String>,
    pub leave_message: Option<String>,
    pub join_dm: Option<String>,
    pub join_roles: Vec<String>,
    pub join_channel: Option<String>,
    pub leave_channel: Option<String>,
    pub banner_state: String,
    pub join_embed_id: Option<String>,
    pub leave_embed_id: Option<String>,
    pub join_text: bool,
    pub leave_text: bool,
    pub join_components: bool,
    pub leave_components: bool,
}

fn blob_str(cfg: &serde_json::Value, field: &str) -> Option<String> {
    cfg.get(field).and_then(|v| v.as_str()).map(String::from)
}

fn blob_bool(cfg: &serde_json::Value, field: &str) -> bool {
    cfg.get(field).and_then(|v| v.as_bool()).unwrap_or(true)
}

/// Load the panel snapshot. Mirrors the Promise.all db reads in
/// openWelcomerPanel (message truncation to 1010 chars included).
pub async fn load_panel_state(pool: &crate::db::Pool, gid: &str, section: &str) -> PanelState {
    let cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    let trunc = |v: Option<String>| v.map(|s| s.chars().take(1010).collect());
    let roles = match cfg.get("joinroles") {
        Some(serde_json::Value::Array(arr)) => arr
            .iter()
            .filter_map(|x| x.as_str().map(String::from))
            .collect(),
        Some(serde_json::Value::String(s)) => vec![s.clone()],
        _ => vec![],
    };
    PanelState {
        section: welcomer_section(section).unwrap_or("join").to_string(),
        join_message: trunc(blob_str(&cfg, "joinmessage")),
        leave_message: trunc(blob_str(&cfg, "leavemessage")),
        join_dm: trunc(blob_str(&cfg, "joindm")),
        join_roles: roles,
        join_channel: blob_str(&cfg, "join"),
        leave_channel: blob_str(&cfg, "leave"),
        banner_state: blob_str(&cfg, "joinbannerStates").unwrap_or_else(|| "on".to_string()),
        join_embed_id: blob_str(&cfg, "joinEmbedId"),
        leave_embed_id: blob_str(&cfg, "leaveEmbedId"),
        join_text: blob_bool(&cfg, "joinTextEnabled"),
        leave_text: blob_bool(&cfg, "leaveTextEnabled"),
        join_components: blob_bool(&cfg, "joinComponentsEnabled"),
        leave_components: blob_bool(&cfg, "leaveComponentsEnabled"),
    }
}

fn t(lang_code: &str, key: &str) -> String {
    crate::lang::get(lang_code, key).unwrap_or_default()
}

fn code_block(value: &Option<String>, empty_label: &str) -> String {
    match value {
        Some(v) => format!("```{v}```"),
        None => empty_label.to_string(),
    }
}

/// Panel body for the active section. Mirrors buildMessageBlock /
/// buildChannelsBlock / buildBannerStatusLine / buildModeBlock (as
/// embed description lines instead of TextDisplay components).
pub fn panel_description(st: &PanelState, lang_code: &str) -> String {
    let title = t(lang_code, "welcomer_panel_title");
    let head = format!("## {title} — {}", st.section);
    match st.section.as_str() {
        "join" | "leave" => {
            let join = st.section == "join";
            let msg_title = t(
                lang_code,
                if join {
                    "guildprofil_embed_fields_joinmessage"
                } else {
                    "guildprofil_embed_fields_leavemessage"
                },
            );
            let msg = if join {
                &st.join_message
            } else {
                &st.leave_message
            };
            let fallback = t(
                lang_code,
                if join {
                    "event_welcomer_inviter"
                } else {
                    "event_goodbye_inviter"
                },
            );
            let embed_id = if join {
                &st.join_embed_id
            } else {
                &st.leave_embed_id
            };
            let text_on = if join { st.join_text } else { st.leave_text };
            let comp = if join {
                st.join_components
            } else {
                st.leave_components
            };
            let mode = if embed_id.is_some() {
                t(lang_code, "welcomer_render_mode_simple")
            } else if comp {
                t(lang_code, "welcomer_render_mode_components")
            } else {
                t(lang_code, "welcomer_render_mode_simple")
            };
            [
                head,
                format!("### {msg_title}"),
                format!(
                    "**{}**",
                    t(lang_code, "setjoinmessage_help_embed_fields_custom_name")
                ),
                code_block(
                    msg,
                    &t(
                        lang_code,
                        "setjoinmessage_help_embed_fields_custom_name_empy",
                    ),
                ),
                format!(
                    "**{}**",
                    t(
                        lang_code,
                        "setjoinmessage_help_embed_fields_default_name_empy"
                    )
                ),
                code_block(
                    &Some(fallback),
                    &t(
                        lang_code,
                        "setjoinmessage_help_embed_fields_custom_name_empy",
                    ),
                ),
                t(lang_code, "setjoinmessage_help_embed_desc"),
                format!("### {}", t(lang_code, "welcomer_embed_label")),
                embed_id
                    .clone()
                    .map(|e| format!("`{e}`"))
                    .unwrap_or_else(|| t(lang_code, "sticky_var_none")),
                format!("**{}**", t(lang_code, "welcomer_text_label")),
                if text_on {
                    t(lang_code, "var_enabled")
                } else {
                    t(lang_code, "var_disabled")
                },
                format!("**{}**", t(lang_code, "welcomer_render_mode_label")),
                mode,
            ]
            .join("\n")
        }
        "dm" => [
            head,
            format!(
                "### {}",
                t(lang_code, "guildprofil_embed_fields_joinDmMessage")
            ),
            code_block(
                &st.join_dm,
                &t(
                    lang_code,
                    "setjoinmessage_help_embed_fields_custom_name_empy",
                ),
            ),
            t(lang_code, "setjoindm_help_embed_desc"),
        ]
        .join("\n"),
        "roles" => {
            let list = if st.join_roles.is_empty() {
                t(lang_code, "setjoinroles_var_none")
            } else {
                st.join_roles
                    .iter()
                    .map(|id| format!("<@&{id}>"))
                    .collect::<Vec<_>>()
                    .join(", ")
            };
            [
                head,
                format!("### {}", t(lang_code, "guildprofil_embed_fields_joinroles")),
                list,
                t(lang_code, "setjoinroles_help_embed_description"),
            ]
            .join("\n")
        }
        "channels" => {
            let join = st
                .join_channel
                .clone()
                .map(|c| format!("<#{c}>"))
                .unwrap_or_else(|| t(lang_code, "var_disabled"));
            let leave = st
                .leave_channel
                .clone()
                .map(|c| format!("<#{c}>"))
                .unwrap_or_else(|| t(lang_code, "var_disabled"));
            [
                head,
                format!("### {}", t(lang_code, "welcomer_section_channels")),
                format!(
                    "**{}**",
                    t(lang_code, "setchannels_embed_fields_value_join")
                ),
                join,
                format!(
                    "**{}**",
                    t(lang_code, "setchannels_embed_fields_value_leave")
                ),
                leave,
            ]
            .join("\n")
        }
        _ => {
            let on = st.banner_state != "off";
            let status = if on {
                t(lang_code, "var_enabled")
            } else {
                t(lang_code, "var_disabled")
            };
            [
                head,
                format!("### {}", t(lang_code, "setjoinmessage_var_image_card")),
                status,
            ]
            .join("\n")
        }
    }
}

fn button(id: &str, label: String, style: serenity::ButtonStyle) -> serenity::CreateButton {
    serenity::CreateButton::new(id).label(label).style(style)
}

/// Section picker + per-section controls. Mirrors buildSectionSelectRow
/// and the per-section button/select rows (string-select equivalents of
/// the TS channel/role selects).
pub fn panel_rows(st: &PanelState, lang_code: &str) -> Vec<serenity::CreateActionRow> {
    let mut rows = vec![];
    let section_opts: Vec<serenity::CreateSelectMenuOption> = [
        ("guildprofil_embed_fields_joinmessage", "join"),
        ("guildprofil_embed_fields_leavemessage", "leave"),
        ("guildprofil_embed_fields_joinDmMessage", "dm"),
        ("guildprofil_embed_fields_joinroles", "roles"),
        ("welcomer_section_channels", "channels"),
        ("setjoinmessage_var_image_card", "banner"),
    ]
    .iter()
    .map(|(key, value)| {
        let mut opt = serenity::CreateSelectMenuOption::new(t(lang_code, key), *value);
        if *value == st.section {
            opt = opt.default_selection(true);
        }
        opt
    })
    .collect();
    rows.push(serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            WELCOMER_SECTION_ID,
            serenity::CreateSelectMenuKind::String {
                options: section_opts,
            },
        )
        .placeholder(t(lang_code, "welcomer_section_placeholder")),
    ));
    match st.section.as_str() {
        "join" | "leave" => {
            let kind = st.section.as_str();
            let msg_row = serenity::CreateActionRow::Buttons(vec![
                button(
                    &format!("welcomer-{kind}-set"),
                    t(lang_code, "setjoinmessage_button_set_name"),
                    serenity::ButtonStyle::Primary,
                ),
                button(
                    &format!("welcomer-{kind}-reset"),
                    t(lang_code, "setjoinmessage_buttom_del_name"),
                    serenity::ButtonStyle::Danger,
                ),
            ]);
            let embed_row = serenity::CreateActionRow::Buttons(vec![
                button(
                    &format!("welcomer-{kind}-embed-set"),
                    t(lang_code, "welcomer_embed_set_button"),
                    serenity::ButtonStyle::Secondary,
                ),
                button(
                    &format!("welcomer-{kind}-embed-reset"),
                    t(lang_code, "welcomer_embed_remove_button"),
                    serenity::ButtonStyle::Danger,
                ),
            ]);
            let text_on = if kind == "join" {
                st.join_text
            } else {
                st.leave_text
            };
            let comp_on = if kind == "join" {
                st.join_components
            } else {
                st.leave_components
            };
            let mode_row = serenity::CreateActionRow::Buttons(vec![
                button(
                    &format!("welcomer-{kind}-text-toggle"),
                    t(
                        lang_code,
                        if text_on {
                            "welcomer_text_disable_button"
                        } else {
                            "welcomer_text_enable_button"
                        },
                    ),
                    serenity::ButtonStyle::Secondary,
                ),
                button(
                    &format!("welcomer-{kind}-components-toggle"),
                    t(
                        lang_code,
                        if comp_on {
                            "welcomer_components_disable_button"
                        } else {
                            "welcomer_components_enable_button"
                        },
                    ),
                    serenity::ButtonStyle::Secondary,
                ),
            ]);
            rows.extend([msg_row, embed_row, mode_row]);
        }
        "dm" => {
            rows.push(serenity::CreateActionRow::Buttons(vec![
                button(
                    "welcomer-dm-set",
                    t(lang_code, "setjoindm_buttom_set_name"),
                    serenity::ButtonStyle::Primary,
                ),
                button(
                    "welcomer-dm-reset",
                    t(lang_code, "setjoindm_buttom_delete_name"),
                    serenity::ButtonStyle::Danger,
                ),
            ]));
        }
        "roles" => {
            rows.push(serenity::CreateActionRow::SelectMenu(
                serenity::CreateSelectMenu::new(
                    "welcomer-roles-pick",
                    serenity::CreateSelectMenuKind::Role {
                        default_roles: Some(
                            st.join_roles
                                .iter()
                                .filter_map(|s| s.parse::<u64>().ok())
                                .map(serenity::RoleId::new)
                                .collect(),
                        ),
                    },
                )
                .min_values(0)
                .max_values(8),
            ));
        }
        "channels" => {
            for (id, label_key, def) in [
                (
                    "welcomer-channel-join",
                    "setchannels_button_join",
                    st.join_channel.clone(),
                ),
                (
                    "welcomer-channel-leave",
                    "setchannels_button_leave",
                    st.leave_channel.clone(),
                ),
            ] {
                rows.push(serenity::CreateActionRow::SelectMenu(
                    serenity::CreateSelectMenu::new(
                        id,
                        serenity::CreateSelectMenuKind::Channel {
                            channel_types: None,
                            default_channels: def
                                .and_then(|c| c.parse::<u64>().ok())
                                .map(|c| vec![serenity::ChannelId::new(c)]),
                        },
                    )
                    .placeholder(t(lang_code, label_key)),
                ));
            }
            rows.push(serenity::CreateActionRow::Buttons(vec![button(
                "welcomer-channels-reset",
                t(lang_code, "setchannels_button_delete"),
                serenity::ButtonStyle::Danger,
            )]));
        }
        _ => {
            let on = st.banner_state != "off";
            rows.push(serenity::CreateActionRow::Buttons(vec![
                button(
                    "welcomer-banner-reset",
                    t(lang_code, "setjoinmessage_default_image_button_title"),
                    serenity::ButtonStyle::Secondary,
                ),
                button(
                    "welcomer-banner-toggle",
                    t(
                        lang_code,
                        if on {
                            "setjoinmessage_var_disable_image"
                        } else {
                            "setjoinmessage_var_enable_image"
                        },
                    ),
                    if on {
                        serenity::ButtonStyle::Danger
                    } else {
                        serenity::ButtonStyle::Success
                    },
                ),
            ]));
        }
    }
    rows
}

/// Panel entry. Mirrors !welcomer.ts (opens the panel on join section).
#[poise::command(slash_command, prefix_command, rename = "welcomer-panel")]
pub async fn welcomer_panel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let st = load_panel_state(pool, &gid, "join").await;
    let embed = serenity::CreateEmbed::default()
        .colour(PANEL_ACCENT)
        .description(panel_description(&st, &lang_code));
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .components(panel_rows(&st, &lang_code)),
    )
    .await?;
    Ok(())
}

/// Audit post to the ihorizon-logs channel. Mirrors the
/// client.func.ihorizon_logs calls in the panel setters.
async fn post_panel_log(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    title: String,
    description: String,
) {
    let Ok(channels) = guild_id.channels(http).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    if let Some(log_id) = crate::funcs::logs_channel_id(&list) {
        let _ = serenity::ChannelId::new(log_id)
            .send_message(
                http,
                serenity::CreateMessage::new().embed(
                    serenity::CreateEmbed::default()
                        .title(title)
                        .description(description)
                        .colour(PANEL_ACCENT),
                ),
            )
            .await;
    }
}

/// Re-render the panel message after a state change. Mirrors render().
async fn rerender(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
) {
    let section = crate::commands::guildconfig::load_guild_config(pool, gid)
        .await
        .get(PANEL_SECTION_FIELD)
        .and_then(|v| v.as_str())
        .unwrap_or("join")
        .to_string();
    let st = load_panel_state(pool, gid, &section).await;
    let embed = serenity::CreateEmbed::default()
        .colour(PANEL_ACCENT)
        .description(panel_description(&st, lang_code));
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(panel_rows(&st, lang_code)),
            ),
        )
        .await;
}

async fn set_section(pool: &crate::db::Pool, gid: &str, section: &str) {
    let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        PANEL_SECTION_FIELD,
        Some(serde_json::Value::String(section.to_string())),
    );
    let _ = crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await;
}

fn modal_input(submit: &serenity::ModalInteraction, input_id: &str) -> String {
    for row in &submit.data.components {
        if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first() {
            if input.custom_id == input_id {
                return input.value.clone().unwrap_or_default();
            }
        }
    }
    String::new()
}

async fn ephemeral(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Component dispatch. Mirrors the panel collector (section switch,
/// message/embed/dm modals + resets, toggles, channel + role picks,
/// dangerous-role confirm, banner reset/toggle).
pub async fn handle_welcomer_component(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let id = comp.data.custom_id.as_str();

    if id == WELCOMER_SECTION_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            if let Some(section) = values.first().and_then(|s| welcomer_section(s)) {
                set_section(pool, &gid, section).await;
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Message set/reset (modal with 2..1010 chars, like askForMessage).
    if let Some(kind) = ["welcomer-join-set", "welcomer-leave-set"]
        .iter()
        .find(|k| **k == id)
        .map(|_| if id.contains("join") { "join" } else { "leave" })
    {
        let join = kind == "join";
        let modal_id = format!("welcomer-{kind}-modal");
        let input_id = format!("welcomer-{kind}-input");
        let modal = serenity::CreateModal::new(
            modal_id.clone(),
            t(
                &lang_code,
                if join {
                    "setjoinmessage_awaiting_response"
                } else {
                    "setleavemessage_awaiting_response"
                },
            ),
        )
        .components(vec![serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Paragraph,
                t(
                    &lang_code,
                    if join {
                        "guildprofil_embed_fields_joinmessage"
                    } else {
                        "guildprofil_embed_fields_leavemessage"
                    },
                ),
                input_id.clone(),
            )
            .min_length(2)
            .max_length(1010)
            .required(true),
        )]);
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) = crate::commands::await_modal_submit(ctx, comp, &modal_id).await else {
            return Ok(());
        };
        let text = modal_input(&submit, &input_id);
        if text.len() < 2 {
            return Ok(());
        }
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinmessage" } else { "leavemessage" },
            Some(serde_json::Value::String(text)),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        let _ = submit
            .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
            .await;
        let _ = comp
            .channel_id
            .send_message(
                &ctx.http,
                serenity::CreateMessage::new()
                    .content(t(
                        &lang_code,
                        if join {
                            "setjoinmessage_command_work_on_enable"
                        } else {
                            "setleavemessage_command_work_on_enable"
                        },
                    ))
                    .reference_message((comp.channel_id, comp.message.id)),
            )
            .await;
        post_panel_log(
            &ctx.http,
            guild_id,
            t(
                &lang_code,
                if join {
                    "setjoinmessage_logs_embed_title_on_enable"
                } else {
                    "setleavemessage_logs_embed_title_on_enable"
                },
            ),
            t(
                &lang_code,
                if join {
                    "setjoinmessage_logs_embed_description_on_enable"
                } else {
                    "setleavemessage_logs_embed_description_on_enable"
                },
            )
            .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
        )
        .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Message reset.
    if id == "welcomer-join-reset" || id == "welcomer-leave-reset" {
        let join = id.contains("join");
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinmessage" } else { "leavemessage" },
            None,
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        ephemeral(
            ctx,
            comp,
            t(
                &lang_code,
                if join {
                    "setjoinmessage_command_work_on_disable"
                } else {
                    "setleavemessage_command_work_on_disable"
                },
            ),
        )
        .await;
        return Ok(());
    }

    // Embed-id set/reset (validates the EMBED row, like askForEmbed).
    if id == "welcomer-join-embed-set" || id == "welcomer-leave-embed-set" {
        let join = id.contains("-join-");
        let kind = if join { "join" } else { "leave" };
        let modal_id = format!("welcomer-{kind}-embed-modal");
        let input_id = format!("welcomer-{kind}-embed-input");
        let modal = serenity::CreateModal::new(
            modal_id.clone(),
            t(&lang_code, "welcomer_embed_modal_title"),
        )
        .components(vec![serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                t(&lang_code, "welcomer_embed_modal_label"),
                input_id.clone(),
            )
            .min_length(1)
            .max_length(64)
            .required(true),
        )]);
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) = crate::commands::await_modal_submit(ctx, comp, &modal_id).await else {
            return Ok(());
        };
        let embed_id = modal_input(&submit, &input_id).trim().to_string();
        if crate::db::kv_get(pool, &gid, &format!("EMBED.{embed_id}"))
            .await
            .is_none()
        {
            let _ = submit
                .create_response(
                    ctx,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(
                                t(&lang_code, "welcomer_embed_not_found")
                                    .replace("${embed_id}", &embed_id),
                            )
                            .ephemeral(true),
                    ),
                )
                .await;
            return Ok(());
        }
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinEmbedId" } else { "leaveEmbedId" },
            Some(serde_json::Value::String(embed_id.clone())),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        let _ = submit
            .create_response(
                ctx,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(
                            t(&lang_code, "welcomer_embed_set_ok")
                                .replace("${embed_id}", &embed_id),
                        )
                        .ephemeral(true),
                ),
            )
            .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-join-embed-reset" || id == "welcomer-leave-embed-reset" {
        let join = id.contains("-join-");
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            if join { "joinEmbedId" } else { "leaveEmbedId" },
            None,
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        ephemeral(ctx, comp, t(&lang_code, "welcomer_embed_removed_ok")).await;
        return Ok(());
    }

    // Text / components toggles.
    for (button_id, field) in [
        ("welcomer-join-text-toggle", "joinTextEnabled"),
        ("welcomer-leave-text-toggle", "leaveTextEnabled"),
        ("welcomer-join-components-toggle", "joinComponentsEnabled"),
        ("welcomer-leave-components-toggle", "leaveComponentsEnabled"),
    ] {
        if id == button_id {
            let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            let cur = cfg.get(field).and_then(|v| v.as_bool()).unwrap_or(true);
            crate::commands::guildconfig::welcomer_set(
                &mut cfg,
                field,
                Some(serde_json::Value::Bool(!cur)),
            );
            crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
            rerender(ctx, comp, pool, &gid, &lang_code).await;
            return Ok(());
        }
    }

    // Join-DM set/reset (modal 2..1010, like askForDm/resetDm).
    if id == "welcomer-dm-set" {
        let modal = serenity::CreateModal::new(
            "welcomer-dm-modal",
            t(&lang_code, "setjoindm_awaiting_response"),
        )
        .components(vec![serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Paragraph,
                t(&lang_code, "guildprofil_embed_fields_joinDmMessage"),
                "welcomer-dm-input",
            )
            .min_length(2)
            .max_length(1010)
            .required(true),
        )]);
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) =
            crate::commands::await_modal_submit(ctx, comp, "welcomer-dm-modal").await
        else {
            return Ok(());
        };
        let text = modal_input(&submit, "welcomer-dm-input");
        if text.len() < 2 {
            return Ok(());
        }
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            "joindm",
            Some(serde_json::Value::String(text.clone())),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        let _ = submit
            .create_response(
                ctx,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(
                            t(&lang_code, "setjoindm_confirmation_message_on_enable")
                                .replace("${dm_msg}", &text),
                        )
                        .ephemeral(true),
                ),
            )
            .await;
        post_panel_log(
            &ctx.http,
            guild_id,
            t(&lang_code, "setjoindm_logs_embed_title_on_enable"),
            t(&lang_code, "setjoindm_logs_embed_description_on_enable")
                .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
        )
        .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-dm-reset" {
        let cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        if cfg.get("joindm").and_then(|v| v.as_str()).is_none() {
            ephemeral(ctx, comp, t(&lang_code, "setjoindm_already_disable")).await;
            return Ok(());
        }
        let mut cfg = cfg;
        crate::commands::guildconfig::welcomer_set(&mut cfg, "joindm", None);
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        ephemeral(
            ctx,
            comp,
            t(&lang_code, "setjoindm_confirmation_message_on_disable"),
        )
        .await;
        post_panel_log(
            &ctx.http,
            guild_id,
            t(&lang_code, "setjoindm_logs_embed_title_on_disable"),
            t(&lang_code, "setjoindm_logs_embed_description_on_disable")
                .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
        )
        .await;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Channel picks + reset.
    if id == "welcomer-channel-join" || id == "welcomer-channel-leave" {
        let join = id.ends_with("-join");
        if let serenity::ComponentInteractionDataKind::ChannelSelect { values } = &comp.data.kind {
            let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            crate::commands::guildconfig::welcomer_set(
                &mut cfg,
                if join { "join" } else { "leave" },
                values
                    .first()
                    .map(|c| serde_json::Value::String(c.get().to_string())),
            );
            crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-channels-reset" {
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(&mut cfg, "join", None);
        crate::commands::guildconfig::welcomer_set(&mut cfg, "leave", None);
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Role pick (dangerous-perm confirm + too-high warn, like
    // handleRolesPick/saveRoles/askDangerousConfirm).
    if id == "welcomer-roles-pick" {
        handle_roles_pick(ctx, comp, pool, &gid, &lang_code).await?;
        return Ok(());
    }
    if id == "welcomer-dangerous-yes" || id == "welcomer-dangerous-no" {
        if id.ends_with("-yes") {
            let cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            let pending: Vec<String> = cfg
                .get(PENDING_ROLES_FIELD)
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            save_roles(ctx, comp, pool, &gid, &lang_code, &pending).await?;
        } else {
            ephemeral(ctx, comp, t(&lang_code, "setjoinroles_action_canceled")).await;
        }
        return Ok(());
    }

    // Banner reset + on/off toggle (image editing stays blocked).
    if id == "welcomer-banner-reset" {
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        crate::commands::guildconfig::welcomer_set(&mut cfg, "joinbanner", None);
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    if id == "welcomer-banner-toggle" {
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
        let cur = blob_str(&cfg, "joinbannerStates").unwrap_or_else(|| "on".to_string());
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            "joinbannerStates",
            Some(serde_json::Value::String(if cur == "off" {
                "on".to_string()
            } else {
                "off".to_string()
            })),
        );
        crate::commands::guildconfig::save_guild_config(pool, &gid, &cfg).await?;
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    Ok(())
}

/// Role picker: ManageRoles gate, dangerous-perm confirm, too-high warn.
/// Mirrors handleRolesPick + askDangerousConfirm + saveRoles.
async fn handle_roles_pick(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let picked: Vec<String> =
        if let serenity::ComponentInteractionDataKind::RoleSelect { values } = &comp.data.kind {
            values.iter().map(|r| r.get().to_string()).collect()
        } else {
            vec![]
        };
    let guild = guild_id.to_partial_guild(&ctx.http).await?;
    let bot_id = ctx.cache.current_user().id;
    let bot = guild_id.member(&ctx.http, bot_id).await?;
    let manage = ctx
        .cache
        .guild(guild_id)
        .map(|g| g.member_permissions(&bot).manage_roles())
        .unwrap_or(false);
    if !manage {
        ephemeral(ctx, comp, t(lang_code, "setjoinroles_var_perm_issue")).await;
        return Ok(());
    }
    let perm_names = [
        "setjoinroles_var_perm_administrator",
        "setjoinroles_var_perm_manage_guild",
        "setjoinroles_var_perm_manage_roles",
        "setjoinroles_var_perm_mention_everyone",
        "setjoinroles_var_perm_ban_members",
        "setjoinroles_var_perm_kick_members",
        "setjoinroles_var_perm_manage_webhooks",
        "setjoinroles_var_perm_manage_channels",
        "setjoinroles_var_perm_manage_expression",
        "setjoinroles_var_perm_view_monetization_analytics",
    ];
    let mut dangerous: Vec<String> = vec![];
    for rid in &picked {
        let Ok(id) = rid.parse::<u64>() else {
            continue;
        };
        let Some(role) = guild.roles.get(&serenity::RoleId::new(id)) else {
            continue;
        };
        let owned: Vec<String> = perm_names.iter().map(|k| t(lang_code, k)).collect();
        let arr: [&str; 10] = [
            owned[0].as_str(),
            owned[1].as_str(),
            owned[2].as_str(),
            owned[3].as_str(),
            owned[4].as_str(),
            owned[5].as_str(),
            owned[6].as_str(),
            owned[7].as_str(),
            owned[8].as_str(),
            owned[9].as_str(),
        ];
        if !crate::funcs::dangerous_role_perms(role.permissions.bits(), arr).is_empty() {
            dangerous.push(format!("@{} ({})", role.name, role.id.get()));
        }
    }
    if !dangerous.is_empty() {
        let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
        crate::commands::guildconfig::welcomer_set(
            &mut cfg,
            PENDING_ROLES_FIELD,
            Some(serde_json::json!(picked)),
        );
        crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await?;
        let embed = serenity::CreateEmbed::default()
            .title(t(lang_code, "setjoinroles_warn_title"))
            .description(t(lang_code, "setjoinroles_warn_dangerous_perm"))
            .field("roles", dangerous.join("\n"), false)
            .colour(PANEL_ACCENT);
        let row = serenity::CreateActionRow::Buttons(vec![
            button(
                "welcomer-dangerous-yes",
                t(lang_code, "var_yes"),
                serenity::ButtonStyle::Danger,
            ),
            button(
                "welcomer-dangerous-no",
                t(lang_code, "var_no"),
                serenity::ButtonStyle::Secondary,
            ),
        ]);
        let _ = comp
            .create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(embed)
                        .components(vec![row])
                        .ephemeral(true),
                ),
            )
            .await;
        return Ok(());
    }
    save_roles(ctx, comp, pool, gid, lang_code, &picked).await
}

/// Persist the picked roles + too-high warn. Mirrors saveRoles.
async fn save_roles(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    picked: &[String],
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        "joinroles",
        Some(serde_json::json!(picked)),
    );
    crate::commands::guildconfig::welcomer_set(&mut cfg, PENDING_ROLES_FIELD, None);
    crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await?;
    post_panel_log(
        &ctx.http,
        guild_id,
        t(lang_code, "setjoinroles_logs_embed_title_on_enable"),
        t(lang_code, "setjoinroles_logs_embed_description_on_enable")
            .replace("${interaction.user.id}", &comp.user.id.get().to_string()),
    )
    .await;
    // Too-high warn (roles above the bot's top role).
    let mut too_high: Vec<String> = vec![];
    if let Ok(guild) = guild_id.to_partial_guild(&ctx.http).await {
        let bot_id = ctx.cache.current_user().id;
        if let Ok(bot) = guild_id.member(&ctx.http, bot_id).await {
            let bot_top = bot
                .roles
                .iter()
                .filter_map(|r| guild.roles.get(r))
                .map(|r| r.position)
                .max()
                .unwrap_or(0);
            for rid in picked {
                if let Ok(id) = rid.parse::<u64>() {
                    if let Some(role) = guild.roles.get(&serenity::RoleId::new(id)) {
                        if bot_top <= role.position {
                            too_high.push(format!("<@&{}>", role.id.get()));
                        }
                    }
                }
            }
        }
    }
    if !too_high.is_empty() {
        let embed = serenity::CreateEmbed::default()
            .title(t(lang_code, "setjoinroles_warn_title"))
            .description(t(lang_code, "setjoinroles_too_highter_roles"))
            .field("roles", too_high.join(", "), false)
            .colour(PANEL_ACCENT);
        let _ = comp
            .channel_id
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }
    rerender(ctx, comp, pool, gid, lang_code).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn section_names_validate() {
        assert_eq!(welcomer_section("join"), Some("join"));
        assert_eq!(welcomer_section("banner"), Some("banner"));
        assert_eq!(welcomer_section("nope"), None);
    }

    #[test]
    fn panel_rows_cover_all_sections() {
        let lang = "en-US";
        for section in WELCOMER_SECTIONS {
            let st = PanelState {
                section: section.to_string(),
                join_message: None,
                leave_message: None,
                join_dm: None,
                join_roles: vec![],
                join_channel: None,
                leave_channel: None,
                banner_state: "on".to_string(),
                join_embed_id: None,
                leave_embed_id: None,
                join_text: true,
                leave_text: true,
                join_components: true,
                leave_components: true,
            };
            let desc = panel_description(&st, lang);
            assert!(desc.starts_with("## "), "{section}");
            assert!(!panel_rows(&st, lang).is_empty(), "{section}");
        }
    }
}
