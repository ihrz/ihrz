// Split from `main.rs`: banner config types + validation. Pure move, no logic change.

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
    pub(crate) fn stored(self) -> Option<String> {
        match self {
            BannerPicker::None => None,
            BannerPicker::Frame => Some("frame".to_string()),
            BannerPicker::TextSize => Some("size:text".to_string()),
            BannerPicker::AvatarSize => Some("size:avatar".to_string()),
        }
    }

    pub(crate) fn parse(s: &str) -> BannerPicker {
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

#[cfg(test)]
mod tests {
    use super::*;
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
}
