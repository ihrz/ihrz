// Split from `main.rs`: panel rows/blocks/V2 rendering. Pure move, no logic change.

use poise::serenity_prelude as serenity;

use super::banner::*;
use super::constants::*;
use super::state::PanelState;

pub(crate) fn t(lang_code: &str, key: &str) -> String {
    crate::lang::get(lang_code, key).unwrap_or_default()
}

fn code_block(value: &Option<String>, empty_label: &str) -> String {
    // TS `codeBlock`: empty string counts as empty (falsy), not as an
    // empty code fence.
    match value {
        Some(v) if !v.is_empty() => format!("```{v}```"),
        _ => empty_label.to_string(),
    }
}

pub(crate) fn button(
    id: &str,
    label: String,
    style: serenity::ButtonStyle,
    disabled: bool,
) -> serenity::CreateButton {
    serenity::CreateButton::new(id)
        .label(label)
        .style(style)
        .disabled(disabled)
}

/// Banner prop picker. Mirrors buildPropSelectRow (6 prop actions).
fn banner_prop_row(lang_code: &str) -> serenity::CreateActionRow {
    let opts: Vec<serenity::CreateSelectMenuOption> = [
        (
            "setjoinmessage_change_image_propreties_background",
            "change_background",
        ),
        (
            "setjoinmessage_change_image_propreties_frame_color",
            "change_frame",
        ),
        (
            "setjoinmessage_change_image_propreties_text_colour",
            "change_text_colour",
        ),
        (
            "setjoinmessage_change_image_propreties_text_message",
            "change_text_message",
        ),
        (
            "setjoinmessage_change_image_propreties_text_size",
            "change_text_size",
        ),
        (
            "setjoinmessage_change_image_propreties_avatar_size",
            "change_avatar_size",
        ),
    ]
    .iter()
    .map(|(key, value)| serenity::CreateSelectMenuOption::new(t(lang_code, key), *value))
    .collect();
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            BANNER_PROP_ID,
            serenity::CreateSelectMenuKind::String { options: opts },
        )
        .placeholder(t(lang_code, "setjoinmessage_change_image_button_title")),
    )
}

/// Frame picker. Mirrors buildFramePickerRow (hexProfileColor | status).
fn banner_frame_row(lang_code: &str) -> serenity::CreateActionRow {
    let opts = [
        (
            "setjoinmessage_change_image_menu_frame_color_profil",
            "hexProfileColor",
        ),
        (
            "setjoinmessage_change_image_menu_frame_status_profil",
            "status",
        ),
    ]
    .iter()
    .map(|(key, value)| serenity::CreateSelectMenuOption::new(t(lang_code, key), *value))
    .collect();
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            BANNER_FRAME_PICK_ID,
            serenity::CreateSelectMenuKind::String { options: opts },
        )
        .placeholder(t(
            lang_code,
            "setjoinmessage_change_image_propreties_frame_color",
        )),
    )
}

/// Size picker for the text or avatar target. Mirrors
/// buildSizePickerRow (mult labels, px values).
fn banner_size_row(lang_code: &str, target: &str) -> serenity::CreateActionRow {
    let opts: Vec<serenity::CreateSelectMenuOption> = if target == "text" {
        BANNER_TEXT_SIZES
            .iter()
            .zip(BANNER_TEXT_MULTS.iter())
            .map(|(value, mult)| {
                serenity::CreateSelectMenuOption::new(
                    format!("{}{mult}", t(lang_code, "setjoinmessage_var_text_size")),
                    *value,
                )
            })
            .collect()
    } else {
        BANNER_AVATAR_SIZES
            .iter()
            .zip(BANNER_AVATAR_MULTS.iter())
            .map(|(value, mult)| {
                serenity::CreateSelectMenuOption::new(
                    format!("{}{mult}", t(lang_code, "setjoinmessage_var_avatar_size")),
                    *value,
                )
            })
            .collect()
    };
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            BANNER_SIZE_PICK_ID,
            serenity::CreateSelectMenuKind::String { options: opts },
        )
        .placeholder(t(
            lang_code,
            if target == "text" {
                "setjoinmessage_change_image_propreties_text_size"
            } else {
                "setjoinmessage_change_image_propreties_avatar_size"
            },
        )),
    )
}

/// Section picker row. Mirrors buildSectionSelectRow (6 sections,
// current marked default).
fn section_select_row(lang_code: &str, section: &str) -> serenity::CreateActionRow {
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
        if *value == section {
            opt = opt.default_selection(true);
        }
        opt
    })
    .collect();
    serenity::CreateActionRow::SelectMenu(
        serenity::CreateSelectMenu::new(
            WELCOMER_SECTION_ID,
            serenity::CreateSelectMenuKind::String {
                options: section_opts,
            },
        )
        .placeholder(t(lang_code, "welcomer_section_placeholder")),
    )
}

/// Section picker + per-section controls. Mirrors buildSectionSelectRow
/// and the per-section button/select rows. `disabled` is the TS
/// `render(message, disabled)` form: the section select and all picker
/// rows are dropped, every remaining button carries disabled.
pub fn panel_rows(
    st: &PanelState,
    lang_code: &str,
    disabled: bool,
) -> Vec<serenity::CreateActionRow> {
    let mut rows = vec![];
    if !disabled {
        rows.push(section_select_row(lang_code, &st.section));
    }
    match st.section.as_str() {
        "join" | "leave" => {
            let kind = st.section.as_str();
            let msg_row = serenity::CreateActionRow::Buttons(vec![
                button(
                    &format!("welcomer-{kind}-set"),
                    t(lang_code, "setjoinmessage_button_set_name"),
                    serenity::ButtonStyle::Primary,
                    disabled,
                ),
                button(
                    &format!("welcomer-{kind}-reset"),
                    t(lang_code, "setjoinmessage_buttom_del_name"),
                    serenity::ButtonStyle::Danger,
                    disabled,
                ),
            ]);
            let embed_row = serenity::CreateActionRow::Buttons(vec![
                button(
                    &format!("welcomer-{kind}-embed-set"),
                    t(lang_code, "welcomer_embed_set_button"),
                    serenity::ButtonStyle::Secondary,
                    disabled,
                ),
                button(
                    &format!("welcomer-{kind}-embed-reset"),
                    t(lang_code, "welcomer_embed_remove_button"),
                    serenity::ButtonStyle::Danger,
                    disabled,
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
                    disabled,
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
                    disabled,
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
                    disabled,
                ),
                button(
                    "welcomer-dm-reset",
                    t(lang_code, "setjoindm_buttom_delete_name"),
                    serenity::ButtonStyle::Danger,
                    disabled,
                ),
            ]));
        }
        "roles" => {
            if disabled {
                return rows;
            }
            // TS only sets defaultRoles when non-empty.
            let defaults: Option<Vec<serenity::RoleId>> = {
                let ids: Vec<serenity::RoleId> = st
                    .join_roles
                    .iter()
                    .filter_map(|s| s.parse::<u64>().ok())
                    .map(serenity::RoleId::new)
                    .collect();
                if ids.is_empty() {
                    None
                } else {
                    Some(ids)
                }
            };
            rows.push(serenity::CreateActionRow::SelectMenu(
                serenity::CreateSelectMenu::new(
                    "welcomer-roles-pick",
                    serenity::CreateSelectMenuKind::Role {
                        default_roles: defaults,
                    },
                )
                .min_values(0)
                .max_values(8),
            ));
        }
        "channels" => {
            if !disabled {
                for (id, label_key) in [
                    ("welcomer-channel-join", "setchannels_button_join"),
                    ("welcomer-channel-leave", "setchannels_button_leave"),
                ] {
                    rows.push(serenity::CreateActionRow::SelectMenu(
                        serenity::CreateSelectMenu::new(
                            id,
                            serenity::CreateSelectMenuKind::Channel {
                                channel_types: Some(vec![serenity::ChannelType::Text]),
                                default_channels: None,
                            },
                        )
                        .placeholder(t(lang_code, label_key))
                        .min_values(1)
                        .max_values(1),
                    ));
                }
            }
            rows.push(serenity::CreateActionRow::Buttons(vec![button(
                "welcomer-channels-reset",
                t(lang_code, "setchannels_button_delete"),
                serenity::ButtonStyle::Danger,
                disabled,
            )]));
        }
        _ => {
            let on = st.banner_state != "off";
            rows.push(serenity::CreateActionRow::Buttons(vec![
                button(
                    "welcomer-banner-reset",
                    t(lang_code, "setjoinmessage_default_image_button_title"),
                    serenity::ButtonStyle::Secondary,
                    disabled,
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
                    disabled,
                ),
            ]));
            if disabled {
                return rows;
            }
            // Prop editor + contextual picker (frame / size). Mirrors
            // buildPropSelectRow + buildFramePickerRow +
            // buildSizePickerRow.
            rows.push(banner_prop_row(lang_code));
            match st.banner_picker {
                BannerPicker::Frame => rows.push(banner_frame_row(lang_code)),
                BannerPicker::TextSize => rows.push(banner_size_row(lang_code, "text")),
                BannerPicker::AvatarSize => rows.push(banner_size_row(lang_code, "avatar")),
                BannerPicker::None => {}
            }
        }
    }
    rows
}

/// Localized section title. Mirrors `sectionTitle` in welcomerPanel.ts
/// (the panel head shows the title, not the raw section key).
pub fn section_title(lang_code: &str, section: &str) -> String {
    t(
        lang_code,
        match section {
            "leave" => "guildprofil_embed_fields_leavemessage",
            "dm" => "guildprofil_embed_fields_joinDmMessage",
            "roles" => "guildprofil_embed_fields_joinroles",
            "channels" => "welcomer_section_channels",
            "banner" => "setjoinmessage_var_image_card",
            _ => "guildprofil_embed_fields_joinmessage",
        },
    )
}

/// TextDisplay contents for the panel, in TS `render()` order (title
/// first, then the per-section blocks). `green_tick`/`no` are the
/// per-app emoji markups (`app_emoji_markup`, empty on miss) standing
/// in for `client.iHorizon_Emojis`.
pub fn panel_blocks(st: &PanelState, lang_code: &str, green_tick: &str, no: &str) -> Vec<String> {
    let title = format!(
        "## {} — {}",
        t(lang_code, "welcomer_panel_title"),
        section_title(lang_code, &st.section)
    );
    match st.section.as_str() {
        "join" | "leave" => {
            let join = st.section == "join";
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
            let message_block = [
                format!(
                    "### {}",
                    t(
                        lang_code,
                        if join {
                            "guildprofil_embed_fields_joinmessage"
                        } else {
                            "guildprofil_embed_fields_leavemessage"
                        },
                    )
                ),
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
            ]
            .join("\n");
            let mode = if embed_id.is_some() {
                t(lang_code, "welcomer_render_mode_simple")
            } else if comp {
                t(lang_code, "welcomer_render_mode_components")
            } else {
                t(lang_code, "welcomer_render_mode_simple")
            };
            let mode_block = [
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
            .join("\n");
            vec![
                title,
                message_block,
                t(lang_code, "setjoinmessage_help_embed_desc"),
                mode_block,
            ]
        }
        "dm" => {
            let message_block = [
                format!(
                    "### {}",
                    t(lang_code, "guildprofil_embed_fields_joinDmMessage")
                ),
                format!(
                    "**{}**",
                    t(lang_code, "setjoinmessage_help_embed_fields_custom_name")
                ),
                code_block(
                    &st.join_dm,
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
                    &Some(t(
                        lang_code,
                        "setjoinmessage_help_embed_fields_custom_name_empy",
                    )),
                    &t(
                        lang_code,
                        "setjoinmessage_help_embed_fields_custom_name_empy",
                    ),
                ),
            ]
            .join("\n");
            vec![
                title,
                message_block,
                t(lang_code, "setjoindm_help_embed_desc"),
            ]
        }
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
            vec![
                title,
                format!(
                    "### {}\n{list}",
                    t(lang_code, "guildprofil_embed_fields_joinroles")
                ),
                t(lang_code, "setjoinroles_help_embed_description"),
            ]
        }
        "channels" => {
            let join = st
                .join_channel
                .clone()
                .map(|c| format!("<#{c}>"))
                .unwrap_or_else(|| no.to_string());
            let leave = st
                .leave_channel
                .clone()
                .map(|c| format!("<#{c}>"))
                .unwrap_or_else(|| no.to_string());
            vec![
                title,
                [
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
                .join("\n"),
            ]
        }
        _ => {
            let on = st.banner_state != "off";
            let status = if on {
                format!("{green_tick} {}", t(lang_code, "var_enabled"))
            } else {
                format!("{no} {}", t(lang_code, "var_disabled"))
            };
            vec![
                title,
                format!(
                    "### {}\n{status}",
                    t(lang_code, "setjoinmessage_var_image_card")
                ),
            ]
        }
    }
}

/// Full Components V2 container payload for the panel. Mirrors TS
/// `render()`: title → [section select] → per-section TextDisplays
/// interleaved with their ActionRows → banner Separator + status +
/// optional MediaGallery preview + controls. `preview` attaches
/// `attachment://image.png` (the caller sends the PNG bytes alongside).
pub fn panel_v2(
    st: &PanelState,
    lang_code: &str,
    green_tick: &str,
    no: &str,
    disabled: bool,
    preview: bool,
) -> serde_json::Value {
    use crate::commands::welcomer_panel::v2 as v2mod;
    let blocks = panel_blocks(st, lang_code, green_tick, no);
    let rows = v2mod::rows_json(panel_rows(st, lang_code, disabled)).unwrap_or_default();
    let mut rest: &[serde_json::Value] = &rows;
    // Section-select row is present only when enabled.
    let (section_row, rest_after): (Option<serde_json::Value>, &[serde_json::Value]) = if disabled {
        (None, rest)
    } else if let Some((head, tail)) = rest.split_first() {
        (Some(head.clone()), tail)
    } else {
        (None, &[])
    };
    rest = rest_after;
    let mut take = |n: usize| {
        let (head, tail) = rest.split_at(n.min(rest.len()));
        rest = tail;
        head.to_vec()
    };
    let mut children: Vec<serde_json::Value> = vec![v2mod::text_display(&blocks[0])];
    if let Some(row) = section_row {
        if !row.is_null() {
            children.push(row);
        }
    }
    match st.section.as_str() {
        "join" | "leave" => {
            let segs = take(3);
            children.push(v2mod::text_display(&blocks[1]));
            if let Some(r) = segs.first() {
                children.push(r.clone());
            }
            children.push(v2mod::text_display(&blocks[2]));
            children.push(v2mod::text_display(&blocks[3]));
            for r in segs.iter().skip(1) {
                children.push(r.clone());
            }
        }
        "dm" => {
            let segs = take(1);
            children.push(v2mod::text_display(&blocks[1]));
            children.push(v2mod::text_display(&blocks[2]));
            for r in &segs {
                children.push(r.clone());
            }
        }
        "roles" => {
            let segs = take(1);
            children.push(v2mod::text_display(&blocks[1]));
            children.push(v2mod::text_display(&blocks[2]));
            for r in &segs {
                children.push(r.clone());
            }
        }
        "channels" => {
            let segs = take(3);
            children.push(v2mod::text_display(&blocks[1]));
            for r in &segs {
                children.push(r.clone());
            }
        }
        _ => {
            let segs = take(3);
            children.push(v2mod::divider());
            children.push(v2mod::text_display(&blocks[1]));
            if preview {
                children.push(v2mod::media_gallery(&format!(
                    "attachment://{}",
                    v2mod::BANNER_ATTACHMENT_NAME
                )));
            }
            for r in &segs {
                children.push(r.clone());
            }
        }
    }
    v2mod::container(v2mod::PANEL_ACCENT_COLOR, children)
}

/// Placeholder container for the initial post (title + section
/// select only); the full `render()` edit follows, like TS.
pub fn panel_placeholder_v2(lang_code: &str, section: &str) -> serde_json::Value {
    use crate::commands::welcomer_panel::v2 as v2mod;
    let title = format!(
        "## {} — {}",
        t(lang_code, "welcomer_panel_title"),
        section_title(lang_code, section)
    );
    let row = v2mod::rows_json(vec![section_select_row(lang_code, section)]).unwrap_or_default();
    let mut children = vec![v2mod::text_display(&title)];
    if let Some(first) = row.first() {
        children.push(first.clone());
    }
    v2mod::container(v2mod::PANEL_ACCENT_COLOR, children)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::welcomer_panel::{
        banner::{BannerConfig, BannerPicker},
        constants::WELCOMER_SECTIONS,
        state::PanelState,
    };
    #[test]
    fn disabled_form_drops_section_select_and_disables_buttons() {
        let st = PanelState {
            section: "join".to_string(),
            join_message: None,
            leave_message: None,
            join_dm: None,
            join_roles: vec![],
            join_channel: None,
            leave_channel: None,
            banner_state: "on".to_string(),
            banner: BannerConfig::default(),
            banner_picker: BannerPicker::None,
            join_embed_id: None,
            leave_embed_id: None,
            join_text: true,
            leave_text: true,
            join_components: true,
            leave_components: true,
        };
        // Enabled: section select first, then the 3 join/leave rows.
        let enabled =
            crate::commands::welcomer_panel::v2::rows_json(panel_rows(&st, "en-US", false))
                .unwrap();
        assert_eq!(enabled.len(), 4);
        assert_eq!(enabled[0]["components"][0]["type"], serde_json::json!(3));
        // Disabled (TS collector end form): no section select, 3 rows
        // left, every button carries disabled:true.
        let rows = panel_rows(&st, "en-US", true);
        assert_eq!(rows.len(), 3);
        let json = serde_json::to_value(&rows).unwrap();
        let arr = json.as_array().unwrap();
        assert_eq!(
            arr[0]["components"][0]["custom_id"],
            serde_json::json!("welcomer-join-set")
        );
        for row in arr {
            for comp in row.get("components").and_then(|c| c.as_array()).unwrap() {
                assert_eq!(comp.get("disabled"), Some(&serde_json::Value::Bool(true)));
            }
        }
    }
    #[test]
    fn panel_v2_covers_all_sections() {
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
                banner: BannerConfig::default(),
                banner_picker: BannerPicker::None,
                join_embed_id: None,
                leave_embed_id: None,
                join_text: true,
                leave_text: true,
                join_components: true,
                leave_components: true,
            };
            let blocks = panel_blocks(&st, lang, "<a:G:1>", "<:N:2>");
            assert!(blocks[0].starts_with("## "), "{section}");
            let v = panel_v2(&st, lang, "<a:G:1>", "<:N:2>", false, false);
            assert_eq!(v["type"], serde_json::json!(17));
            assert_eq!(v["accent_color"], serde_json::json!(0xffb3cc));
            let kids = v["components"].as_array().unwrap();
            // Title + section select + at least one block.
            assert!(kids.len() >= 3, "{section}");
            assert_eq!(kids[0]["type"], serde_json::json!(10));
            assert_eq!(kids[1]["components"][0]["type"], serde_json::json!(3));
            // Disabled form: no select of any kind survives.
            let d = panel_v2(&st, lang, "", "", true, false);
            let flat = serde_json::to_string(&d).unwrap();
            assert!(
                !flat.contains("\"custom_id\":\"welcomer-section\""),
                "{section}"
            );
            assert!(!flat.contains("\"type\":3"), "{section}");
            assert!(!flat.contains("\"type\":6"), "{section}");
            assert!(!flat.contains("\"type\":8"), "{section}");
        }
    }
    #[test]
    fn banner_v2_has_separator_status_and_picker_rows() {
        let lang = "en-US";
        let st = PanelState {
            section: "banner".to_string(),
            join_message: None,
            leave_message: None,
            join_dm: None,
            join_roles: vec![],
            join_channel: None,
            leave_channel: None,
            banner_state: "on".to_string(),
            banner: BannerConfig::default(),
            banner_picker: BannerPicker::None,
            join_embed_id: None,
            leave_embed_id: None,
            join_text: true,
            leave_text: true,
            join_components: true,
            leave_components: true,
        };
        // Status block carries the per-app GreenTick markup + enabled.
        let blocks = panel_blocks(&st, lang, "<a:G:1>", "<:N:2>");
        assert_eq!(blocks.len(), 2);
        assert!(blocks[1].contains("<a:G:1>"), "{}", blocks[1]);
        assert!(blocks[1].contains(&t(lang, "var_enabled")), "{}", blocks[1]);
        // Without preview: title, section select, separator, status, rows.
        let v = panel_v2(&st, lang, "<a:G:1>", "<:N:2>", false, false);
        let kids = v["components"].as_array().unwrap();
        assert_eq!(kids[0]["type"], serde_json::json!(10));
        assert_eq!(kids[1]["type"], serde_json::json!(1));
        assert_eq!(kids[2]["type"], serde_json::json!(14));
        assert_eq!(kids[3]["type"], serde_json::json!(10));
        assert!(kids.iter().all(|k| k["type"] != serde_json::json!(12)));
        // With preview: MediaGallery on the attachment URL.
        let g = panel_v2(&st, lang, "<a:G:1>", "<:N:2>", false, true);
        let gallery = g["components"]
            .as_array()
            .unwrap()
            .iter()
            .find(|k| k["type"] == serde_json::json!(12))
            .expect("media gallery");
        assert_eq!(
            gallery["items"][0]["media"]["url"],
            serde_json::json!("attachment://image.png")
        );
        // Prop row present; no picker row until one opens.
        assert_eq!(panel_rows(&st, lang, false).len(), 3);
        let frame = PanelState {
            banner_picker: BannerPicker::Frame,
            ..st_clone(&st)
        };
        assert_eq!(panel_rows(&frame, lang, false).len(), 4);
        let size = PanelState {
            banner_picker: BannerPicker::TextSize,
            ..st_clone(&st)
        };
        assert_eq!(panel_rows(&size, lang, false).len(), 4);
    }

    fn st_clone(st: &PanelState) -> PanelState {
        PanelState {
            section: st.section.clone(),
            join_message: st.join_message.clone(),
            leave_message: st.leave_message.clone(),
            join_dm: st.join_dm.clone(),
            join_roles: st.join_roles.clone(),
            join_channel: st.join_channel.clone(),
            leave_channel: st.leave_channel.clone(),
            banner_state: st.banner_state.clone(),
            banner: st.banner.clone(),
            banner_picker: BannerPicker::None,
            join_embed_id: st.join_embed_id.clone(),
            leave_embed_id: st.leave_embed_id.clone(),
            join_text: st.join_text,
            leave_text: st.leave_text,
            join_components: st.join_components,
            leave_components: st.leave_components,
        }
    }
}
