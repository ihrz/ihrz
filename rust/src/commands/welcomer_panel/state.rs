// Split from `main.rs`: section + panel state snapshot. Pure move, no logic change.

use super::banner::{banner_config, BannerConfig, BannerPicker};
use super::constants::{BANNER_PICKER_FIELD, WELCOMER_SECTIONS};

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

pub(crate) fn blob_str(cfg: &serde_json::Value, field: &str) -> Option<String> {
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn section_names_validate() {
        assert_eq!(welcomer_section("join"), Some("join"));
        assert_eq!(welcomer_section("banner"), Some("banner"));
        assert_eq!(welcomer_section("nope"), None);
    }
}
