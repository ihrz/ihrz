use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub const WELCOMER_PREFIX: &str = "welcomer-";
pub const WELCOMER_SECTION_ID: &str = "welcomer-section";
pub const WELCOMER_SECTIONS: [&str; 6] = ["join", "leave", "dm", "roles", "channels", "banner"];
pub const PANEL_ACCENT: u32 = 0xffb3cc;
const PANEL_SECTION_FIELD: &str = "welcomerPanelSection";
const PENDING_ROLES_FIELD: &str = "welcomerPendingRoles";
/// Ephemeral banner picker (frame vs size target). The panel is
/// stateless per interaction (unlike the TS in-memory collector), so
/// the open picker persists here until a pick, reset, or section
/// switch clears it. Values: "frame" | "size:text" | "size:avatar".
const BANNER_PICKER_FIELD: &str = "welcomerBannerPicker";

/// String-select ids for the banner editors. Mirror welcomerPanel.ts.
pub const BANNER_PROP_ID: &str = "welcomer-banner-prop";
pub const BANNER_FRAME_PICK_ID: &str = "welcomer-frame-pick";
pub const BANNER_SIZE_PICK_ID: &str = "welcomer-size-pick";

/// Panel collector lifetime in seconds. Mirrors COLLECTOR_TIMEOUT =
/// 800_000 in welcomerPanel.ts. The Rust panel is stateless (no
/// in-memory collector), so the sent timestamp of the panel message
/// bounds interactions instead (see welcomer_panel_expired); expired
/// panels are re-rendered with disabled components, mirroring the TS
/// collector `end` handler.
pub const WELCOMER_COLLECTOR_TIMEOUT_SECS: i64 = 800;

/// True when the panel message is older than the collector timeout.
/// `sent_secs` is the panel message timestamp (unix seconds).
pub fn welcomer_panel_expired(sent_secs: i64, now_secs: i64) -> bool {
    now_secs.saturating_sub(sent_secs) >= WELCOMER_COLLECTOR_TIMEOUT_SECS
}

/// Disable every button/select row. Mirrors the TS collector `end`
/// handler (`component.setDisabled(true)` on each row component).
pub fn disable_rows(rows: Vec<serenity::CreateActionRow>) -> Vec<serenity::CreateActionRow> {
    rows.into_iter()
        .map(|row| match row {
            serenity::CreateActionRow::Buttons(btns) => serenity::CreateActionRow::Buttons(
                btns.into_iter().map(|b| b.disabled(true)).collect(),
            ),
            serenity::CreateActionRow::SelectMenu(menu) => {
                serenity::CreateActionRow::SelectMenu(menu.disabled(true))
            }
            other => other,
        })
        .collect()
}

/// Defaults mirror DEFAULT_IMAGE_CONFIG in welcomerPanel.ts.
pub const DEFAULT_BANNER_BACKGROUND: &str =
    "https://img.freepik.com/vecteurs-libre/fond-courbe-bleue_53876-113112.jpg";
pub const DEFAULT_BANNER_FRAME: &str = "status";
pub const DEFAULT_BANNER_TEXT_COLOUR: &str = "#000000";
pub const DEFAULT_BANNER_TEXT_SIZE: &str = "40px";
pub const DEFAULT_BANNER_AVATAR_SIZE: &str = "140px";

/// Banner prop actions mirror BannerPropAction in welcomerPanel.ts.
pub const BANNER_PROPS: [&str; 6] = [
    "change_background",
    "change_frame",
    "change_text_colour",
    "change_text_message",
    "change_text_size",
    "change_avatar_size",
];
/// Frame values mirror profilePictureRound ("status" | "hexProfileColor").
pub const BANNER_FRAMES: [&str; 2] = ["hexProfileColor", "status"];
/// Size values mirror buildSizePickerRow (text 0.5..4, avatar 0.5..3).
pub const BANNER_TEXT_SIZES: [&str; 6] = ["20px", "40px", "60px", "80px", "120px", "160px"];
pub const BANNER_AVATAR_SIZES: [&str; 5] = ["70px", "140px", "210px", "280px", "430px"];
/// Size labels mirror `${var_text_size}<mult>` / `${var_avatar_size}<mult>`.
pub const BANNER_TEXT_MULTS: [&str; 6] = ["0.5", "1", "1.5", "2", "3", "4"];
pub const BANNER_AVATAR_MULTS: [&str; 5] = ["0.5", "1", "1.5", "2", "3"];
/// TS modal bounds for the banner editors.
pub const BANNER_URL_MAX_CHARS: usize = 300;
pub const BANNER_MESSAGE_MIN_CHARS: usize = 15;
pub const BANNER_MESSAGE_MAX_CHARS: usize = 100;

/// Join banner options. Mirrors DatabaseStructure.JoinBannerOptions.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BannerConfig {
    pub background_url: String,
    pub frame: String,
    pub text_colour: String,
    pub message: Option<String>,
    pub text_size: String,
    pub avatar_size: String,
}

impl Default for BannerConfig {
    fn default() -> Self {
        BannerConfig {
            background_url: DEFAULT_BANNER_BACKGROUND.to_string(),
            frame: DEFAULT_BANNER_FRAME.to_string(),
            text_colour: DEFAULT_BANNER_TEXT_COLOUR.to_string(),
            message: None,
            text_size: DEFAULT_BANNER_TEXT_SIZE.to_string(),
            avatar_size: DEFAULT_BANNER_AVATAR_SIZE.to_string(),
        }
    }
}

/// Open contextual picker. Mirrors ContextualPicker in welcomerPanel.ts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum BannerPicker {
    #[default]
    None,
    Frame,
    TextSize,
    AvatarSize,
}

impl BannerPicker {
    fn stored(self) -> Option<String> {
        match self {
            BannerPicker::None => None,
            BannerPicker::Frame => Some("frame".to_string()),
            BannerPicker::TextSize => Some("size:text".to_string()),
            BannerPicker::AvatarSize => Some("size:avatar".to_string()),
        }
    }

    fn parse(s: &str) -> BannerPicker {
        match s {
            "frame" => BannerPicker::Frame,
            "size:text" => BannerPicker::TextSize,
            "size:avatar" => BannerPicker::AvatarSize,
            _ => BannerPicker::None,
        }
    }
}

/// Validate a banner prop action. Mirrors BannerPropAction.
pub fn banner_prop(s: &str) -> Option<&'static str> {
    BANNER_PROPS.iter().find(|v| **v == s).copied()
}

/// Hex colour check. Mirrors isValidColor (`/^#([0-9a-f]{3}){1,2}$/i`).
pub fn is_valid_hex_colour(s: &str) -> bool {
    let hex = s.strip_prefix('#').unwrap_or("\x00");
    (hex.len() == 3 || hex.len() == 6) && hex.bytes().all(|b| b.is_ascii_hexdigit())
}

/// Frame enum check. Mirrors profilePictureRound ("status" | "hexProfileColor").
pub fn banner_frame(s: &str) -> Option<&'static str> {
    BANNER_FRAMES.iter().find(|v| **v == s).copied()
}

/// Size enum checks. Mirror the buildSizePickerRow option values.
pub fn banner_text_size(s: &str) -> Option<&'static str> {
    BANNER_TEXT_SIZES.iter().find(|v| **v == s).copied()
}

pub fn banner_avatar_size(s: &str) -> Option<&'static str> {
    BANNER_AVATAR_SIZES.iter().find(|v| **v == s).copied()
}

/// Background URL check (no network): http(s) scheme, 7..=300 chars
/// like the TS background modal (minLength 7, maxLength 300), plus the
/// isImageUrl spirit (must look like a fetchable image URL).
pub fn is_valid_background_url(s: &str) -> bool {
    let url = s.trim();
    let len = url.chars().count();
    (7..=BANNER_URL_MAX_CHARS).contains(&len)
        && (url.starts_with("http://") || url.starts_with("https://"))
        && !url.contains(char::is_whitespace)
}

/// Banner message check: 15..=100 chars like the TS text modal
/// (minLength 15, maxLength 100).
pub fn validate_banner_message(s: &str) -> bool {
    let len = s.trim().chars().count();
    (BANNER_MESSAGE_MIN_CHARS..=BANNER_MESSAGE_MAX_CHARS).contains(&len)
}

/// Read the banner config from the blob, falling back to
/// DEFAULT_IMAGE_CONFIG per field like openWelcomerPanel.
pub fn banner_config(cfg: &serde_json::Value, default_message: &str) -> BannerConfig {
    let banner = cfg.get("joinbanner");
    let field = |name: &str| banner.and_then(|b| b.get(name)).and_then(|v| v.as_str());
    BannerConfig {
        background_url: field("backgroundURL")
            .filter(|s| !s.is_empty())
            .unwrap_or(DEFAULT_BANNER_BACKGROUND)
            .to_string(),
        frame: field("profilePictureRound")
            .and_then(banner_frame)
            .unwrap_or(DEFAULT_BANNER_FRAME)
            .to_string(),
        text_colour: field("textColour")
            .filter(|s| is_valid_hex_colour(s))
            .unwrap_or(DEFAULT_BANNER_TEXT_COLOUR)
            .to_string(),
        message: field("message")
            .filter(|s| !s.trim().is_empty())
            .map(String::from)
            .or_else(|| Some(default_message.to_string())),
        text_size: field("textSize")
            .and_then(banner_text_size)
            .unwrap_or(DEFAULT_BANNER_TEXT_SIZE)
            .to_string(),
        avatar_size: field("avatarSize")
            .and_then(banner_avatar_size)
            .unwrap_or(DEFAULT_BANNER_AVATAR_SIZE)
            .to_string(),
    }
}

/// Serialize the banner config back to the joinbanner blob shape.
pub fn banner_config_value(b: &BannerConfig) -> serde_json::Value {
    let mut map = serde_json::Map::new();
    map.insert(
        "backgroundURL".to_string(),
        serde_json::Value::String(b.background_url.clone()),
    );
    map.insert(
        "profilePictureRound".to_string(),
        serde_json::Value::String(b.frame.clone()),
    );
    map.insert(
        "textColour".to_string(),
        serde_json::Value::String(b.text_colour.clone()),
    );
    if let Some(message) = &b.message {
        map.insert(
            "message".to_string(),
            serde_json::Value::String(message.clone()),
        );
    }
    map.insert(
        "textSize".to_string(),
        serde_json::Value::String(b.text_size.clone()),
    );
    map.insert(
        "avatarSize".to_string(),
        serde_json::Value::String(b.avatar_size.clone()),
    );
    serde_json::Value::Object(map)
}

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
    pub banner: BannerConfig,
    pub banner_picker: BannerPicker,
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
/// `default_message` fills the banner message slot like
/// `lang.setjoinmessage_image_default_text` in TS (callers pass the
/// resolved lang string; no live preview image is rendered).
pub async fn load_panel_state(
    pool: &crate::db::Pool,
    gid: &str,
    section: &str,
    default_message: &str,
) -> PanelState {
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
        banner: banner_config(&cfg, default_message),
        banner_picker: cfg
            .get(BANNER_PICKER_FIELD)
            .and_then(|v| v.as_str())
            .map(BannerPicker::parse)
            .unwrap_or_default(),
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
            // No live preview (unlike the TS MediaGallery): the stored
            // prop values are listed so the panel stays dependency-free.
            let b = &st.banner;
            let message = b.message.clone().unwrap_or_default();
            [
                head,
                format!("### {}", t(lang_code, "setjoinmessage_var_image_card")),
                status,
                format!(
                    "**{}**\n```{}```",
                    t(
                        lang_code,
                        "setjoinmessage_change_image_propreties_background"
                    ),
                    b.background_url,
                ),
                format!(
                    "**{}**\n`{}`",
                    t(
                        lang_code,
                        "setjoinmessage_change_image_propreties_frame_color"
                    ),
                    b.frame,
                ),
                format!(
                    "**{}**\n`{}`",
                    t(
                        lang_code,
                        "setjoinmessage_change_image_propreties_text_colour"
                    ),
                    b.text_colour,
                ),
                format!(
                    "**{}**\n```{}```",
                    t(
                        lang_code,
                        "setjoinmessage_change_image_propreties_text_message"
                    ),
                    message,
                ),
                format!(
                    "**{}**\n`{}`",
                    t(
                        lang_code,
                        "setjoinmessage_change_image_propreties_text_size"
                    ),
                    b.text_size,
                ),
                format!(
                    "**{}**\n`{}`",
                    t(
                        lang_code,
                        "setjoinmessage_change_image_propreties_avatar_size"
                    ),
                    b.avatar_size,
                ),
            ]
            .join("\n")
        }
    }
}

fn button(id: &str, label: String, style: serenity::ButtonStyle) -> serenity::CreateButton {
    serenity::CreateButton::new(id).label(label).style(style)
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
            // Prop editor + contextual picker (frame / size). Mirrors
            // buildPropSelectRow + buildFramePickerRow +
            // buildSizePickerRow. No live preview is attached.
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

/// Panel entry. Mirrors !welcomer.ts (opens the panel on join section).
#[poise::command(slash_command, prefix_command, rename = "welcomer-panel")]
pub async fn welcomer_panel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let default_message = t(&lang_code, "setjoinmessage_image_default_text");
    let st = load_panel_state(pool, &gid, "join", &default_message).await;
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
    let st = load_panel_state(
        pool,
        gid,
        &section,
        &t(lang_code, "setjoinmessage_image_default_text"),
    )
    .await;
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

/// Re-render the panel with every row disabled. End-of-collector form
/// of rerender (mirrors the TS collector `end` handler).
async fn render_disabled(
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
    let st = load_panel_state(
        pool,
        gid,
        &section,
        &t(lang_code, "setjoinmessage_image_default_text"),
    )
    .await;
    let embed = serenity::CreateEmbed::default()
        .colour(PANEL_ACCENT)
        .description(panel_description(&st, lang_code));
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(disable_rows(panel_rows(&st, lang_code))),
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
    // Section switch closes the contextual banner picker (like TS
    // `state.picker = null`).
    crate::commands::guildconfig::welcomer_set(&mut cfg, BANNER_PICKER_FIELD, None);
    let _ = crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await;
}

/// Persist the banner config + picker state. Mirrors saveBanner plus
/// the picker transitions in handlePropAction.
async fn save_banner(
    pool: &crate::db::Pool,
    gid: &str,
    banner: &BannerConfig,
    picker: BannerPicker,
) -> anyhow::Result<()> {
    let mut cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        "joinbanner",
        Some(banner_config_value(banner)),
    );
    crate::commands::guildconfig::welcomer_set(
        &mut cfg,
        BANNER_PICKER_FIELD,
        picker.stored().map(serde_json::Value::String),
    );
    crate::commands::guildconfig::save_guild_config(pool, gid, &cfg).await
}

/// Load the banner config with the lang default message.
async fn load_banner(pool: &crate::db::Pool, gid: &str, lang_code: &str) -> BannerConfig {
    let cfg = crate::commands::guildconfig::load_guild_config(pool, gid).await;
    banner_config(&cfg, &t(lang_code, "setjoinmessage_image_default_text"))
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
/// dangerous-role confirm, banner reset/toggle + 6 banner prop editors
/// with hex/enum validation and prop/size picker rows; no live preview).
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
    // Collector timeout (stateless form): the panel message timestamp
    // bounds interactions; expired panels re-render disabled, like the
    // TS collector `end` handler.
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    if welcomer_panel_expired(comp.message.timestamp.timestamp(), now_secs) {
        render_disabled(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
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
        let mut modal_opts = crate::modal_helper::ModalOptions::new(
            &t(
                &lang_code,
                if join {
                    "setjoinmessage_awaiting_response"
                } else {
                    "setleavemessage_awaiting_response"
                },
            ),
            &modal_id,
        );
        modal_opts
            .fields
            .push(crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: input_id.clone(),
                    label: t(
                        &lang_code,
                        if join {
                            "guildprofil_embed_fields_joinmessage"
                        } else {
                            "guildprofil_embed_fields_leavemessage"
                        },
                    ),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Paragraph,
                    required: true,
                    max_length: Some(1010),
                    min_length: Some(2),
                    value: None,
                },
            ));
        let modal = crate::modal_helper::build_modal(&modal_opts)
            .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) = crate::commands::await_modal_submit(ctx, comp, &modal_id).await else {
            return Ok(());
        };
        let text = crate::modal_helper::text_value(&submit, &input_id);
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
        let mut modal_opts = crate::modal_helper::ModalOptions::new(
            &t(&lang_code, "welcomer_embed_modal_title"),
            &modal_id,
        );
        modal_opts
            .fields
            .push(crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: input_id.clone(),
                    label: t(&lang_code, "welcomer_embed_modal_label"),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Short,
                    required: true,
                    max_length: Some(64),
                    min_length: Some(1),
                    value: None,
                },
            ));
        let modal = crate::modal_helper::build_modal(&modal_opts)
            .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) = crate::commands::await_modal_submit(ctx, comp, &modal_id).await else {
            return Ok(());
        };
        let embed_id = crate::modal_helper::text_value(&submit, &input_id)
            .trim()
            .to_string();
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
        let mut modal_opts = crate::modal_helper::ModalOptions::new(
            &t(&lang_code, "setjoindm_awaiting_response"),
            "welcomer-dm-modal",
        );
        modal_opts
            .fields
            .push(crate::modal_helper::ModalField::Text(
                crate::modal_helper::TextField {
                    custom_id: "welcomer-dm-input".to_string(),
                    label: t(&lang_code, "guildprofil_embed_fields_joinDmMessage"),
                    placeholder: None,
                    style: crate::modal_helper::TextStyle::Paragraph,
                    required: true,
                    max_length: Some(1010),
                    min_length: Some(2),
                    value: None,
                },
            ));
        let modal = crate::modal_helper::build_modal(&modal_opts)
            .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
        comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
            .await?;
        let Some(submit) =
            crate::commands::await_modal_submit(ctx, comp, "welcomer-dm-modal").await
        else {
            return Ok(());
        };
        let text = crate::modal_helper::text_value(&submit, "welcomer-dm-input");
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

    // Banner reset (defaults like TS) + on/off toggle.
    if id == "welcomer-banner-reset" {
        let banner = BannerConfig {
            message: Some(t(&lang_code, "setjoinmessage_image_default_text")),
            ..BannerConfig::default()
        };
        save_banner(pool, &gid, &banner, BannerPicker::None).await?;
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

    // Banner prop picker (opens modals or the frame/size pickers).
    // Mirrors handlePropAction.
    if id == BANNER_PROP_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            if let Some(prop) = values.first().and_then(|s| banner_prop(s)) {
                handle_banner_prop(ctx, comp, pool, &gid, &lang_code, prop).await?;
                return Ok(());
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Frame pick (hexProfileColor | status). Mirrors welcomer-frame-pick.
    if id == BANNER_FRAME_PICK_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            if let Some(frame) = values.first().and_then(|s| banner_frame(s)) {
                let mut banner = load_banner(pool, &gid, &lang_code).await;
                banner.frame = frame.to_string();
                save_banner(pool, &gid, &banner, BannerPicker::None).await?;
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }

    // Size pick (text vs avatar targets). Mirrors welcomer-size-pick.
    if id == BANNER_SIZE_PICK_ID {
        if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind {
            let cfg = crate::commands::guildconfig::load_guild_config(pool, &gid).await;
            let picker = cfg
                .get(BANNER_PICKER_FIELD)
                .and_then(|v| v.as_str())
                .map(BannerPicker::parse)
                .unwrap_or_default();
            if let Some(value) = values.first().map(String::as_str) {
                let mut banner =
                    banner_config(&cfg, &t(&lang_code, "setjoinmessage_image_default_text"));
                let valid = match picker {
                    BannerPicker::TextSize => banner_text_size(value).map(|_| {
                        banner.text_size = value.to_string();
                    }),
                    BannerPicker::AvatarSize => banner_avatar_size(value).map(|_| {
                        banner.avatar_size = value.to_string();
                    }),
                    _ => None,
                };
                if valid.is_some() {
                    save_banner(pool, &gid, &banner, BannerPicker::None).await?;
                }
            }
        }
        rerender(ctx, comp, pool, &gid, &lang_code).await;
        return Ok(());
    }
    Ok(())
}

/// Banner prop dispatch. Mirrors handlePropAction: background/colour/
/// message open modals with validation, frame/size open the contextual
/// picker rows. No live preview is rendered (unlike the TS
/// generateJoinImage MediaGallery).
async fn handle_banner_prop(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    prop: &str,
) -> anyhow::Result<()> {
    match prop {
        "change_background" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t(
                    lang_code,
                    "setjoinmessage_change_image_propreties_background",
                ),
                "welcomer-background-modal",
            );
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "url".to_string(),
                        label: t(lang_code, "setjoinmessage_modal_fields_background_url"),
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(300),
                        min_length: Some(7),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, "welcomer-background-modal").await
            else {
                return Ok(());
            };
            let url = crate::modal_helper::text_value(&submit, "url")
                .trim()
                .to_string();
            if !is_valid_background_url(&url) {
                let _ = submit
                    .create_response(
                        ctx,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t(lang_code, "setjoinmessage_change_image_invalid_url"))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                return Ok(());
            }
            let mut banner = load_banner(pool, gid, lang_code).await;
            banner.background_url = url;
            save_banner(pool, gid, &banner, BannerPicker::None).await?;
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "change_frame" => {
            let banner = load_banner(pool, gid, lang_code).await;
            save_banner(pool, gid, &banner, BannerPicker::Frame).await?;
        }
        "change_text_colour" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t(
                    lang_code,
                    "setjoinmessage_change_image_propreties_text_colour",
                ),
                "welcomer-colour-modal",
            );
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "colour".to_string(),
                        label: t(lang_code, "setjoinmessage_modal_fields_hex_color"),
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(9),
                        min_length: Some(3),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, "welcomer-colour-modal").await
            else {
                return Ok(());
            };
            let colour = crate::modal_helper::text_value(&submit, "colour")
                .trim()
                .to_string();
            if !is_valid_hex_colour(&colour) {
                let no = crate::emojis::app_emoji_markup(&ctx.http, "No")
                    .await
                    .unwrap_or_else(|| "❌".to_string());
                let _ = submit
                    .create_response(
                        ctx,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(
                                    t(lang_code, "embed_choose_12_error")
                                        .replace("${client.iHorizon_Emojis.No}", &no),
                                )
                                .ephemeral(true),
                        ),
                    )
                    .await;
                return Ok(());
            }
            let mut banner = load_banner(pool, gid, lang_code).await;
            banner.text_colour = colour;
            save_banner(pool, gid, &banner, BannerPicker::None).await?;
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "change_text_message" => {
            let mut modal_opts = crate::modal_helper::ModalOptions::new(
                &t(
                    lang_code,
                    "setjoinmessage_change_image_propreties_text_message",
                ),
                "welcomer-text-modal",
            );
            modal_opts
                .fields
                .push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: "msg".to_string(),
                        label: t(lang_code, "setjoinmessage_modal_fields_message"),
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(100),
                        min_length: Some(15),
                        value: None,
                    },
                ));
            let modal = crate::modal_helper::build_modal(&modal_opts)
                .map_err(|_| anyhow::anyhow!("unsupported modal field"))?;
            comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
                .await?;
            let Some(submit) =
                crate::commands::await_modal_submit(ctx, comp, "welcomer-text-modal").await
            else {
                return Ok(());
            };
            let message = crate::modal_helper::text_value(&submit, "msg")
                .trim()
                .to_string();
            if !validate_banner_message(&message) {
                let _ = submit
                    .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                return Ok(());
            }
            let mut banner = load_banner(pool, gid, lang_code).await;
            banner.message = Some(message);
            save_banner(pool, gid, &banner, BannerPicker::None).await?;
            let _ = submit
                .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
                .await;
        }
        "change_text_size" => {
            let banner = load_banner(pool, gid, lang_code).await;
            save_banner(pool, gid, &banner, BannerPicker::TextSize).await?;
        }
        "change_avatar_size" => {
            let banner = load_banner(pool, gid, lang_code).await;
            save_banner(pool, gid, &banner, BannerPicker::AvatarSize).await?;
        }
        _ => {}
    }
    rerender(ctx, comp, pool, gid, lang_code).await;
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
    fn collector_timeout_mirrors_ts_800s() {
        assert_eq!(WELCOMER_COLLECTOR_TIMEOUT_SECS, 800);
        assert!(!welcomer_panel_expired(1_000, 1_000 + 799));
        assert!(welcomer_panel_expired(1_000, 1_000 + 800));
        assert!(welcomer_panel_expired(1_000, 1_000 + 8_000));
        // Clock skew (message newer than now) never expires.
        assert!(!welcomer_panel_expired(2_000, 1_000));
    }

    #[test]
    fn disable_rows_keeps_row_count() {
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
        let rows = panel_rows(&st, "en-US");
        let n = rows.len();
        assert!(n > 0);
        let disabled = disable_rows(rows);
        assert_eq!(disabled.len(), n);
        // Serialized rows must carry the disabled flag on every
        // button and select (mirrors setDisabled(true) on end).
        let json = serde_json::to_value(&disabled).unwrap();
        let arr = json.as_array().unwrap();
        assert_eq!(arr.len(), n);
        for row in arr {
            for comp in row.get("components").and_then(|c| c.as_array()).unwrap() {
                assert_eq!(comp.get("disabled"), Some(&serde_json::Value::Bool(true)));
            }
        }
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
                banner: BannerConfig::default(),
                banner_picker: BannerPicker::None,
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

    #[test]
    fn banner_validators_mirror_ts() {
        assert!(is_valid_hex_colour("#000000"));
        assert!(is_valid_hex_colour("#fff"));
        assert!(is_valid_hex_colour("#AbC123"));
        assert!(!is_valid_hex_colour("000000"));
        assert!(!is_valid_hex_colour("#ff"));
        assert!(!is_valid_hex_colour("#gggggg"));
        assert!(!is_valid_hex_colour(""));
        assert_eq!(banner_frame("status"), Some("status"));
        assert_eq!(banner_frame("hexProfileColor"), Some("hexProfileColor"));
        assert_eq!(banner_frame("round"), None);
        assert_eq!(banner_text_size("40px"), Some("40px"));
        assert_eq!(banner_text_size("120px"), Some("120px"));
        assert_eq!(banner_text_size("50px"), None);
        assert_eq!(banner_avatar_size("140px"), Some("140px"));
        assert_eq!(banner_avatar_size("430px"), Some("430px"));
        assert_eq!(banner_avatar_size("160px"), None);
        assert_eq!(banner_prop("change_background"), Some("change_background"));
        assert_eq!(
            banner_prop("change_avatar_size"),
            Some("change_avatar_size")
        );
        assert_eq!(banner_prop("change_preview"), None);
        assert_eq!(BannerPicker::parse("frame"), BannerPicker::Frame);
        assert_eq!(BannerPicker::parse("size:text"), BannerPicker::TextSize);
        assert_eq!(BannerPicker::parse("size:avatar"), BannerPicker::AvatarSize);
        assert_eq!(BannerPicker::parse("nope"), BannerPicker::None);
        assert_eq!(BannerPicker::Frame.stored(), Some("frame".to_string()));
        assert_eq!(BannerPicker::None.stored(), None);
    }

    #[test]
    fn banner_url_and_message_bounds_mirror_modals() {
        assert!(is_valid_background_url("https://example.com/bg.png"));
        assert!(is_valid_background_url("http://a.co/x"));
        assert!(!is_valid_background_url("ftp://example.com/bg.png"));
        assert!(!is_valid_background_url("notaurl"));
        assert!(!is_valid_background_url("https://a b.com/x"));
        assert!(!is_valid_background_url(&format!(
            "https://x.co/{}",
            "a".repeat(300)
        )));
        assert!(validate_banner_message("Welcome to the server, friend!"));
        assert!(validate_banner_message(&"a".repeat(15)));
        assert!(validate_banner_message(&"a".repeat(100)));
        assert!(!validate_banner_message("too short"));
        assert!(!validate_banner_message(&"a".repeat(101)));
    }

    #[test]
    fn banner_config_defaults_and_roundtrip() {
        let cfg = serde_json::json!({});
        let b = banner_config(&cfg, "hello");
        assert_eq!(b.background_url, DEFAULT_BANNER_BACKGROUND);
        assert_eq!(b.frame, "status");
        assert_eq!(b.text_colour, "#000000");
        assert_eq!(b.message, Some("hello".to_string()));
        assert_eq!(b.text_size, "40px");
        assert_eq!(b.avatar_size, "140px");
        // Stored blob wins; invalid values fall back to defaults.
        let cfg = serde_json::json!({
            "joinbanner": {
                "backgroundURL": "https://cdn.example/a.png",
                "profilePictureRound": "hexProfileColor",
                "textColour": "not-a-colour",
                "message": "custom welcome message here!",
                "textSize": "80px",
                "avatarSize": "999px",
            }
        });
        let b = banner_config(&cfg, "hello");
        assert_eq!(b.background_url, "https://cdn.example/a.png");
        assert_eq!(b.frame, "hexProfileColor");
        assert_eq!(b.text_colour, "#000000");
        assert_eq!(b.message, Some("custom welcome message here!".to_string()));
        assert_eq!(b.text_size, "80px");
        assert_eq!(b.avatar_size, "140px");
        // Roundtrip keeps the TS blob shape.
        let v = banner_config_value(&b);
        assert_eq!(v["backgroundURL"], "https://cdn.example/a.png");
        assert_eq!(v["profilePictureRound"], "hexProfileColor");
        assert_eq!(v["textSize"], "80px");
        let back = banner_config(&serde_json::json!({ "joinbanner": v }), "hello");
        assert_eq!(back, b);
    }

    #[test]
    fn banner_section_lists_props_without_preview() {
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
        let desc = panel_description(&st, lang);
        assert!(desc.contains(DEFAULT_BANNER_BACKGROUND));
        assert!(desc.contains("status"));
        assert!(desc.contains("#000000"));
        assert!(desc.contains("40px"));
        assert!(desc.contains("140px"));
        // No preview attachment marker.
        assert!(!desc.contains("attachment://"));
        // Prop row present; no picker row until one opens.
        assert_eq!(panel_rows(&st, lang).len(), 3);
        let frame = PanelState {
            banner_picker: BannerPicker::Frame,
            ..st_clone(&st)
        };
        assert_eq!(panel_rows(&frame, lang).len(), 4);
        let size = PanelState {
            banner_picker: BannerPicker::TextSize,
            ..st_clone(&st)
        };
        assert_eq!(panel_rows(&size, lang).len(), 4);
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
