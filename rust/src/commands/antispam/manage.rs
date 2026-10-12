use super::*;
use poise::serenity_prelude as serenity;

// Interactive manage panel. Mirrors !manage.ts exactly: the command
// takes NO options in TS — it posts the config embed with the field
// select + save/preset buttons and drives everything through 240s
// collectors, yes/no + punish sub-selects, and per-field modals.
// (An earlier port flattened this to direct slash params; those had no
// TS basis and are removed by this rewrite.)
const SELECT_ID: &str = "antispam-select-config";
const SAVE_ID: &str = "antispam-manage-save-button";
const PRESET_BTN_ID: &str = "antispam-manage-preset-button";
const PRESET_SELECT_ID: &str = "antispam-select-preset";
const YESNO_SELECT_ID: &str = "antispam-manage-yes-or-no";
const PUNISH_SELECT_ID: &str = "antispam-manage-punish-type";
const MODAL_ID: &str = "antispam-modal-config";
const PANEL_TIMEOUT_SECS: u64 = 240;

/// Guild lang lookup with empty-string filtering (shared by the panel
/// render paths; `&str` code keeps the future Send).
fn tr(code: &str, key: &str) -> String {
    crate::lang::get(code, key)
        .filter(|s| !s.is_empty())
        .unwrap_or_default()
}

/// Manage the antispam module
#[poise::command(
    slash_command,
    prefix_command,
    rename = "manage",
    aliases("mng", "antimng"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn as_config(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let pool = ctx.data().pool.clone();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&pool, ctx.guild_id().map(|g| g.get())).await;
    // baseData mirror: config blob plus the bypass lists (the TS preset
    // spread preserves them, and the save leg writes the whole blob).
    // Bypass lists are captured here and written back on save, exactly
    // like the TS open-then-save flow.
    let mut cfg = load_antispam(&pool, &gid).await;
    let bypass_channels: Vec<String> =
        load_string_list(&pool, &gid, "GUILD.ANTISPAM.BYPASS_CHANNELS").await;
    let bypass_roles: Vec<String> =
        load_string_list(&pool, &gid, "GUILD.ANTISPAM.BYPASS_ROLES").await;
    let guild_icon = ctx
        .guild_id()
        .and_then(|g| ctx.cache().guild(g))
        .and_then(|g| g.icon_url());
    let (footer_name, footer_bytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let author = ctx.author().id;
    let not_for_you = tr(&code, "help_not_for_you");
    let embed = render_panel_embed(
        &code,
        &cfg,
        guild_icon.clone(),
        &footer_name,
        footer_bytes.is_some(),
    );
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(panel_rows(&code, PanelView::Main));
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let http = ctx.http();
    // Active boolean field awaiting its yes/no answer. TS keeps the
    // choice in the collector closure; the yes/no select only ever
    // appears directly after a boolean pick, so one slot suffices.
    let mut pending_bool: Option<&'static str> = None;
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(PANEL_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.user.id != author {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let id = press.data.custom_id.clone();
        if id == SAVE_ID {
            // Mirrors the save leg: persist the whole baseData blob
            // (config + bypass lists captured at open), ack, stop.
            let blob = antispam_blob(&cfg, &bypass_channels, &bypass_roles);
            let _ = save_blob(&pool, &gid, &blob).await;
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            break;
        } else if id == PRESET_BTN_ID {
            // Mirrors the preset leg: swap to the preset select row.
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            let mention = format!("<@{}>", author.get());
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content(mention)
                        .components(preset_rows(&code)),
                )
                .await;
        } else if id == PRESET_SELECT_ID {
            let value = select_values(&press).first().cloned().unwrap_or_default();
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            // Mirrors the preset switch: preset fields win, bypass
            // lists are preserved from the open snapshot.
            if let Some(p) = AntispamConfig::preset(&value) {
                cfg = p;
            }
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content("")
                        .embeds(vec![render_panel_embed(
                            &code,
                            &cfg,
                            guild_icon.clone(),
                            &footer_name,
                            true,
                        )])
                        .components(panel_rows(&code, PanelView::Main)),
                )
                .await;
        } else if id == SELECT_ID {
            let value = select_values(&press).first().cloned().unwrap_or_default();
            let Some(choice) = panel_choice(&value) else {
                continue;
            };
            match choice.kind {
                ChoiceKind::ModalTime | ChoiceKind::ModalNumber => {
                    // Mirrors the modal leg (customId antispam-modal-config,
                    // single Short field keyed by the choice value, label
                    // truncated to 44 chars, required, minLength 1).
                    let mut label: String = tr(&code, choice.label_key).chars().take(44).collect();
                    if label.is_empty() {
                        label = choice.value.to_string();
                    }
                    let mut opts = crate::modal_helper::ModalOptions::new(
                        &tr(&code, "antispam_manage_modal_title"),
                        MODAL_ID,
                    );
                    opts.defer_update = false;
                    opts.fields = vec![crate::modal_helper::ModalField::Text(
                        crate::modal_helper::TextField {
                            custom_id: choice.value.to_string(),
                            label,
                            placeholder: Some(tr(&code, choice.desc_key)),
                            style: crate::modal_helper::TextStyle::Short,
                            required: true,
                            max_length: None,
                            min_length: Some(1),
                            value: None,
                        },
                    )];
                    let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
                        continue;
                    };
                    if press
                        .create_response(http, serenity::CreateInteractionResponse::Modal(modal))
                        .await
                        .is_err()
                    {
                        continue;
                    }
                    let Some(submit) = crate::commands::await_modal_submit(
                        ctx.serenity_context(),
                        &press,
                        MODAL_ID,
                    )
                    .await
                    else {
                        continue;
                    };
                    let raw = modal_text(&submit, choice.value).replacen(',', ".", 1);
                    if choice.kind == ChoiceKind::ModalTime {
                        match crate::commands::shared::parse_duration_ms(&raw) {
                            Some(ms) if ms > 0 => {
                                set_cfg_number(&mut cfg, choice.value, ms);
                                let _ = defer_modal(
                                    http,
                                    &submit,
                                    &ctx,
                                    &mut msg,
                                    &code,
                                    &cfg,
                                    &guild_icon,
                                    &footer_name,
                                )
                                .await;
                            }
                            _ => {
                                let _ = submit
                                    .create_response(
                                        http,
                                        serenity::CreateInteractionResponse::Message(
                                            serenity::CreateInteractionResponseMessage::new()
                                                .content(tr(
                                                    &code,
                                                    "too_new_account_invalid_time_on_enable",
                                                ))
                                                .ephemeral(true),
                                        ),
                                    )
                                    .await;
                            }
                        }
                    } else {
                        match parse_ts_int(&raw) {
                            Some(n) => {
                                // Mirrors TS: Threshold assigns parseInt
                                // directly (no clamp on the panel path).
                                if choice.value == "Threshold" {
                                    cfg.threshold = n.max(0) as u32;
                                } else {
                                    set_cfg_number(&mut cfg, choice.value, n);
                                }
                                let _ = defer_modal(
                                    http,
                                    &submit,
                                    &ctx,
                                    &mut msg,
                                    &code,
                                    &cfg,
                                    &guild_icon,
                                    &footer_name,
                                )
                                .await;
                            }
                            None => {
                                let no = crate::emojis::app_emoji_markup(http, "No")
                                    .await
                                    .unwrap_or_else(|| "❌".to_string());
                                let _ = submit
                                    .create_response(
                                        http,
                                        serenity::CreateInteractionResponse::Message(
                                            serenity::CreateInteractionResponseMessage::new()
                                                .content(
                                                    tr(
                                                        &code,
                                                        "temporary_voice_limit_button_not_integer",
                                                    )
                                                    .replace(
                                                        "${interaction.client.iHorizon_Emojis.No}",
                                                        &no,
                                                    ),
                                                )
                                                .ephemeral(true),
                                        ),
                                    )
                                    .await;
                            }
                        }
                    }
                }
                ChoiceKind::Boolean => {
                    // Mirrors the yes/no sub-select leg.
                    let _ = press
                        .create_response(
                            http,
                            serenity::CreateInteractionResponse::Defer(
                                serenity::CreateInteractionResponseMessage::new(),
                            ),
                        )
                        .await;
                    pending_bool = Some(choice.value);
                    let mention = format!("<@{}>", author.get());
                    let _ = msg
                        .edit(
                            http,
                            serenity::EditMessage::new()
                                .content(mention)
                                .components(yesno_rows(&code, choice)),
                        )
                        .await;
                }
                ChoiceKind::Punish => {
                    // Mirrors the punish-type sub-select leg.
                    let _ = press
                        .create_response(
                            http,
                            serenity::CreateInteractionResponse::Defer(
                                serenity::CreateInteractionResponseMessage::new(),
                            ),
                        )
                        .await;
                    let mention = format!("<@{}>", author.get());
                    let _ = msg
                        .edit(
                            http,
                            serenity::EditMessage::new()
                                .content(mention)
                                .components(punish_rows(&code, choice)),
                        )
                        .await;
                }
            }
        } else if id == YESNO_SELECT_ID {
            let yes = select_values(&press)
                .first()
                .map(|v| v == "antispam-manage-yes")
                .unwrap_or(false);
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            // Mirrors the yes/no legs: field flips to the blockpub
            // literal, baseData takes the boolean.
            if let Some(field) = pending_bool {
                set_cfg_bool(&mut cfg, field, yes);
                pending_bool = None;
            }
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content("")
                        .embeds(vec![render_panel_embed(
                            &code,
                            &cfg,
                            guild_icon.clone(),
                            &footer_name,
                            true,
                        )])
                        .components(panel_rows(&code, PanelView::Main)),
                )
                .await;
        } else if id == PUNISH_SELECT_ID {
            let value = select_values(&press).first().cloned().unwrap_or_default();
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            // Mirrors the punish leg: baseData takes split("-")[2].
            if let Some(kind) = value.split('-').nth(2) {
                if AntispamConfig::is_valid_punishment(kind) {
                    cfg.punishment_type = kind.to_string();
                }
            }
            let _ = msg
                .edit(
                    http,
                    serenity::EditMessage::new()
                        .content("")
                        .embeds(vec![render_panel_embed(
                            &code,
                            &cfg,
                            guild_icon.clone(),
                            &footer_name,
                            true,
                        )])
                        .components(panel_rows(&code, PanelView::Main)),
                )
                .await;
        }
    }
    // Collector `end` leg: disable the rows like TS.
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new().components(disabled_rows(&code)),
        )
        .await;
    Ok(())
}

/// Panel field choices in TS order (choices_1/2/3/4/6/7/12).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ChoiceKind {
    Boolean,
    Punish,
    ModalTime,
    ModalNumber,
}

#[derive(Debug, Clone, Copy)]
struct PanelChoice {
    value: &'static str,
    label_key: &'static str,
    desc_key: &'static str,
    kind: ChoiceKind,
}

fn panel_choices() -> [PanelChoice; 7] {
    [
        PanelChoice {
            value: "Enabled",
            label_key: "antispam_manage_choices_1_label",
            desc_key: "antispam_manage_choices_1_desc",
            kind: ChoiceKind::Boolean,
        },
        PanelChoice {
            value: "ignoreBots",
            label_key: "antispam_manage_choices_2_label",
            desc_key: "antispam_manage_choices_2_desc",
            kind: ChoiceKind::Boolean,
        },
        PanelChoice {
            value: "punishment_type",
            label_key: "antispam_manage_choices_3_label",
            desc_key: "antispam_manage_choices_3_desc",
            kind: ChoiceKind::Punish,
        },
        PanelChoice {
            value: "punishTime",
            label_key: "antispam_manage_choices_4_label",
            desc_key: "antispam_manage_choices_4_desc",
            kind: ChoiceKind::ModalTime,
        },
        PanelChoice {
            value: "removeMessages",
            label_key: "antispam_manage_choices_6_label",
            desc_key: "antispam_manage_choices_6_desc",
            kind: ChoiceKind::Boolean,
        },
        PanelChoice {
            value: "maxInterval",
            label_key: "antispam_manage_choices_7_label",
            desc_key: "antispam_manage_choices_7_desc",
            kind: ChoiceKind::ModalTime,
        },
        PanelChoice {
            value: "Threshold",
            label_key: "antispam_manage_choices_12_label",
            desc_key: "antispam_manage_choices_12_desc",
            kind: ChoiceKind::ModalNumber,
        },
    ]
}

fn panel_choice(value: &str) -> Option<PanelChoice> {
    panel_choices().into_iter().find(|c| c.value == value)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PanelView {
    Main,
}

/// Current field value text, mirroring the TS initial-value switch
/// (boolean blockpub/none, time beautiful, punish raw) and
/// beautifyValue on updates.
fn field_text(code: &str, cfg: &AntispamConfig, value: &str) -> String {
    match value {
        "Enabled" | "ignoreBots" | "removeMessages" => {
            let on = match value {
                "Enabled" => cfg.enabled,
                "ignoreBots" => cfg.ignore_bots,
                _ => cfg.remove_messages,
            };
            if on {
                format!("`🟢 {}`", tr(code, "guildprofil_set_blockpub"))
            } else {
                format!("`🔴 {}`", tr(code, "guildprofil_not_set_blockpub"))
            }
        }
        "punishment_type" => format!("`{}`", cfg.punishment_type),
        "punishTime" => beautiful_or_none(code, cfg.punish_time_ms),
        "maxInterval" => beautiful_or_none(code, cfg.max_interval_ms),
        _ => format!("`{}`", cfg.threshold),
    }
}

fn beautiful_or_none(code: &str, ms: i64) -> String {
    let s = crate::funcs::beautiful_ms(ms as f64);
    if s.is_empty() {
        format!("`⏲️ {}`", tr(code, "setjoinroles_var_none"))
    } else {
        format!("`{s}`")
    }
}

fn render_panel_embed(
    code: &str,
    cfg: &AntispamConfig,
    thumbnail: Option<String>,
    footer_name: &str,
    with_icon: bool,
) -> serenity::CreateEmbed {
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x6666ff_u32)
        .title(tr(code, "antispam_manage_embed_title"));
    if let Some(url) = thumbnail {
        embed = embed.thumbnail(url);
    }
    for choice in panel_choices() {
        let label = tr(code, choice.label_key);
        embed = embed.field(label, field_text(code, cfg, choice.value), true);
    }
    crate::commands::shared::embed_with_footer(embed, footer_name, with_icon)
}

fn config_select(code: &str) -> serenity::CreateSelectMenu {
    let options: Vec<serenity::CreateSelectMenuOption> = panel_choices()
        .into_iter()
        .map(|c| {
            serenity::CreateSelectMenuOption::new(tr(code, c.label_key), c.value)
                .description(tr(code, c.desc_key))
        })
        .collect();
    serenity::CreateSelectMenu::new(
        SELECT_ID,
        serenity::CreateSelectMenuKind::String { options },
    )
    .placeholder(tr(code, "help_select_menu"))
}

fn panel_rows(code: &str, _view: PanelView) -> Vec<serenity::CreateActionRow> {
    vec![
        serenity::CreateActionRow::SelectMenu(config_select(code)),
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(SAVE_ID)
                .label(tr(code, "antispam_manage_button_label"))
                .style(serenity::ButtonStyle::Success),
            serenity::CreateButton::new(PRESET_BTN_ID)
                .label(tr(code, "antispam_manage_button_preset_label"))
                .style(serenity::ButtonStyle::Secondary),
        ]),
    ]
}

fn preset_rows(code: &str) -> Vec<serenity::CreateActionRow> {
    let options = vec![
        serenity::CreateSelectMenuOption::new(
            tr(code, "antispam_manage_preset_level1_name"),
            "chill",
        ),
        serenity::CreateSelectMenuOption::new(
            tr(code, "antispam_manage_preset_level2_name"),
            "guard",
        ),
        serenity::CreateSelectMenuOption::new(
            tr(code, "antispam_manage_preset_level3_name"),
            "extreme",
        ),
    ];
    vec![serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            PRESET_SELECT_ID,
            serenity::CreateSelectMenuKind::String { options },
        )
        .placeholder(tr(code, "antispam_manage_selectstring_preset_label")),
    )]
}

fn yesno_rows(code: &str, choice: PanelChoice) -> Vec<serenity::CreateActionRow> {
    let options = vec![
        serenity::CreateSelectMenuOption::new(tr(code, "var_yes"), "antispam-manage-yes"),
        serenity::CreateSelectMenuOption::new(tr(code, "var_no"), "antispam-manage-no"),
    ];
    vec![
        serenity::CreateActionRow::SelectMenu(config_select(code)),
        serenity::CreateActionRow::SelectMenu(
            serenity::CreateSelectMenu::new(
                YESNO_SELECT_ID,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(tr(code, choice.desc_key)),
        ),
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(SAVE_ID)
                .label(tr(code, "antispam_manage_button_label"))
                .style(serenity::ButtonStyle::Success),
            serenity::CreateButton::new(PRESET_BTN_ID)
                .label(tr(code, "antispam_manage_button_preset_label"))
                .style(serenity::ButtonStyle::Secondary),
        ]),
    ]
}

fn punish_rows(code: &str, choice: PanelChoice) -> Vec<serenity::CreateActionRow> {
    let options = vec![
        serenity::CreateSelectMenuOption::new(
            tr(code, "setjoinroles_var_perm_ban_members"),
            "antispam-manage-ban",
        ),
        serenity::CreateSelectMenuOption::new(
            tr(code, "setjoinroles_var_perm_kick_members"),
            "antispam-manage-kick",
        ),
        serenity::CreateSelectMenuOption::new(
            tr(code, "antispam_manage_select_menu_punish_mute_label"),
            "antispam-manage-mute",
        ),
    ];
    vec![
        serenity::CreateActionRow::SelectMenu(config_select(code)),
        serenity::CreateActionRow::SelectMenu(
            serenity::CreateSelectMenu::new(
                PUNISH_SELECT_ID,
                serenity::CreateSelectMenuKind::String { options },
            )
            .placeholder(tr(code, choice.desc_key)),
        ),
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(SAVE_ID)
                .label(tr(code, "antispam_manage_button_label"))
                .style(serenity::ButtonStyle::Success),
            serenity::CreateButton::new(PRESET_BTN_ID)
                .label(tr(code, "antispam_manage_button_preset_label"))
                .style(serenity::ButtonStyle::Secondary),
        ]),
    ]
}

fn disabled_rows(code: &str) -> Vec<serenity::CreateActionRow> {
    vec![
        serenity::CreateActionRow::SelectMenu(config_select_disabled(code)),
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(SAVE_ID)
                .label(tr(code, "antispam_manage_button_label"))
                .style(serenity::ButtonStyle::Success)
                .disabled(true),
            serenity::CreateButton::new(PRESET_BTN_ID)
                .label(tr(code, "antispam_manage_button_preset_label"))
                .style(serenity::ButtonStyle::Secondary)
                .disabled(true),
        ]),
    ]
}

fn config_select_disabled(code: &str) -> serenity::CreateSelectMenu {
    config_select(code).disabled(true)
}

/// Selected values of a string-select press.
fn select_values(press: &serenity::ComponentInteraction) -> Vec<String> {
    match &press.data.kind {
        serenity::ComponentInteractionDataKind::StringSelect { values } => values.clone(),
        _ => vec![],
    }
}

/// First text value of a modal submit field.
fn modal_text(submit: &serenity::ModalInteraction, field_id: &str) -> String {
    for row in &submit.data.components {
        for comp in &row.components {
            if let serenity::ActionRowComponent::InputText(input) = comp {
                if input.custom_id == field_id {
                    return input.value.clone().unwrap_or_default();
                }
            }
        }
    }
    String::new()
}

/// TS parseInt semantics (leading optional sign + digits, else NaN).
/// Mirrors the Threshold modal leg, which accepts "12abc" as 12.
fn parse_ts_int(raw: &str) -> Option<i64> {
    let s = raw.trim_start();
    let s = s.strip_prefix('+').unwrap_or(s);
    let neg = s.starts_with('-');
    let digits: String = s
        .trim_start_matches('-')
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect();
    if digits.is_empty() {
        return None;
    }
    let n: i64 = digits.parse().ok()?;
    Some(if neg { -n } else { n })
}

fn set_cfg_number(cfg: &mut AntispamConfig, key: &str, value: i64) {
    match key {
        "punishTime" => {
            cfg.punish_time_ms = value;
        }
        "maxInterval" => {
            cfg.max_interval_ms = value;
        }
        "Threshold" => {
            cfg.threshold = value.max(0) as u32;
        }
        _ => {}
    }
}

fn set_cfg_bool(cfg: &mut AntispamConfig, key: &str, value: bool) {
    match key {
        "Enabled" => {
            cfg.enabled = value;
        }
        "ignoreBots" => {
            cfg.ignore_bots = value;
        }
        "removeMessages" => {
            cfg.remove_messages = value;
        }
        _ => {}
    }
}

/// Full config blob as the TS save leg writes it: config fields plus
/// the bypass lists captured at panel open.
fn antispam_blob(
    cfg: &AntispamConfig,
    bypass_channels: &[String],
    bypass_roles: &[String],
) -> serde_json::Value {
    let mut v = serde_json::to_value(cfg).unwrap_or(serde_json::Value::Null);
    if let serde_json::Value::Object(ref mut map) = v {
        map.insert(
            "BYPASS_CHANNELS".to_string(),
            serde_json::to_value(bypass_channels).unwrap_or_default(),
        );
        map.insert(
            "BYPASS_ROLES".to_string(),
            serde_json::to_value(bypass_roles).unwrap_or_default(),
        );
    }
    v
}

async fn save_blob(
    pool: &crate::db::Pool,
    gid: &str,
    blob: &serde_json::Value,
) -> anyhow::Result<()> {
    guild_backend(pool).table(gid).set(ANTISPAM_KEY, blob).await
}

/// Acknowledge a modal submit (TS deferUpdate) and re-render the panel
/// embed with the new config.
#[allow(clippy::too_many_arguments)]
async fn defer_modal(
    http: &serenity::Http,
    submit: &serenity::ModalInteraction,
    ctx: &Ctx<'_>,
    msg: &mut serenity::Message,
    code: &str,
    cfg: &AntispamConfig,
    guild_icon: &Option<String>,
    footer_name: &str,
) -> anyhow::Result<()> {
    let _ = submit
        .create_response(
            http,
            serenity::CreateInteractionResponse::Defer(
                serenity::CreateInteractionResponseMessage::new(),
            ),
        )
        .await;
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().embeds(vec![render_panel_embed(
                code,
                cfg,
                guild_icon.clone(),
                footer_name,
                true,
            )]),
        )
        .await;
    Ok(())
}

/// Rejection line for an unknown preset/punishment choice.
fn invalid_choice(lang_code: &str, got: &str, want: &str) -> String {
    crate::lang::get(lang_code, "msg_antispam_invalid_choice")
        .map(|code| {
            code.replace("${choice}", got)
                .replace("${want}", want)
                .replace("{choice}", got)
                .replace("{want}", want)
        })
        .unwrap_or_else(|| format!("Unknown choice \"{got}\" ({want})."))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_choice_echoes_input() {
        let msg = invalid_choice("en-US", "bogus", "mute, kick or ban");
        assert!(msg.contains("bogus"));
        assert!(msg.contains("mute, kick or ban"));
    }

    #[test]
    fn ts_parse_int_matches_js_parseint() {
        // Leading digits win ("12abc" -> 12); no digits -> NaN.
        assert_eq!(parse_ts_int("42"), Some(42));
        assert_eq!(parse_ts_int("12abc"), Some(12));
        assert_eq!(parse_ts_int("  -7x"), Some(-7));
        assert_eq!(parse_ts_int("abc"), None);
        assert_eq!(parse_ts_int(""), None);
    }

    #[test]
    fn panel_field_rendering_matches_ts_legs() {
        // Threshold assigns parseInt directly (no clamp on the panel path).
        let mut cfg = AntispamConfig::default();
        set_cfg_number(&mut cfg, "Threshold", 0);
        assert_eq!(cfg.threshold, 0);
        set_cfg_number(&mut cfg, "Threshold", 50);
        assert_eq!(cfg.threshold, 50);
        set_cfg_number(&mut cfg, "punishTime", 900_000);
        assert_eq!(cfg.punish_time_ms, 900_000);
        set_cfg_bool(&mut cfg, "Enabled", false);
        assert!(!cfg.enabled);
        // Boolean field rendering mirrors the blockpub literals.
        assert!(field_text("en-US", &cfg, "Enabled").contains("`🔴"));
        cfg.enabled = true;
        assert!(field_text("en-US", &cfg, "Enabled").contains("`🟢"));
        assert!(field_text("en-US", &cfg, "punishment_type").contains("mute"));
    }

    #[test]
    fn save_blob_carries_bypass_lists() {
        let cfg = AntispamConfig::default();
        let blob = antispam_blob(&cfg, &["c1".to_string()], &["r1".to_string()]);
        assert_eq!(blob["BYPASS_CHANNELS"], serde_json::json!(["c1"]));
        assert_eq!(blob["BYPASS_ROLES"], serde_json::json!(["r1"]));
        assert_eq!(blob["Threshold"], serde_json::json!(3));
    }

    #[test]
    fn panel_choices_cover_ts_choice_values() {
        let values: Vec<&str> = panel_choices().iter().map(|c| c.value).collect();
        assert_eq!(
            values,
            vec![
                "Enabled",
                "ignoreBots",
                "punishment_type",
                "punishTime",
                "removeMessages",
                "maxInterval",
                "Threshold"
            ]
        );
    }
}
