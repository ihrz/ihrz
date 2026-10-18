// Split from `main.rs`: panel-wide constants. Pure move, no logic change.

pub const WELCOMER_PREFIX: &str = "welcomer-";
pub const WELCOMER_SECTION_ID: &str = "welcomer-section";

/// Fresh panels always open on the join section. Mirrors the
/// `section: "join"` state init in `openWelcomerPanel`
/// (`src/Interaction/SlashCommands/guildconfig/welcomerPanel.ts`):
/// TS keeps the section in memory only, so every new panel starts on
/// join. The persisted `welcomerPanelSection` blob is the stateless
/// stand-in for the in-memory section across component rerenders —
/// entries must reset it, rerenders must keep reading it.
pub const WELCOMER_ENTRY_SECTION: &str = "join";
pub const WELCOMER_SECTIONS: [&str; 6] = ["join", "leave", "dm", "roles", "channels", "banner"];
pub const PANEL_ACCENT: u32 = 0xffb3cc;
pub(crate) const PANEL_SECTION_FIELD: &str = "welcomerPanelSection";
pub(crate) const PENDING_ROLES_FIELD: &str = "welcomerPendingRoles";
/// Ephemeral banner picker (frame vs size target). The panel is
/// stateless per interaction (unlike the TS in-memory collector), so
/// the open picker persists here until a pick, reset, or section
/// switch clears it. Values: "frame" | "size:text" | "size:avatar".
pub(crate) const BANNER_PICKER_FIELD: &str = "welcomerBannerPicker";

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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn collector_timeout_mirrors_ts_800s() {
        assert_eq!(WELCOMER_COLLECTOR_TIMEOUT_SECS, 800);
        assert!(!welcomer_panel_expired(1_000, 1_000 + 799));
        assert!(welcomer_panel_expired(1_000, 1_000 + 800));
        assert!(welcomer_panel_expired(1_000, 1_000 + 8_000));
        // Clock skew (message newer than now) never expires.
        assert!(!welcomer_panel_expired(2_000, 1_000));
    }
}
