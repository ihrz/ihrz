use super::*;

/// Invite validation gate. Mirrors method.isValidDiscordInvite: JS
/// `String.trim()` (which strips U+FEFF, unlike Rust `str::trim`) then
/// full-match against the three TS patterns.
fn is_valid_discord_invite(input: &str) -> bool {
    let t = crate::funcs::js_trim(input);
    if t.is_empty() {
        return false;
    }
    let code = t
        .strip_prefix("https://discord.gg/")
        .or_else(|| t.strip_prefix("discord.gg/"))
        .unwrap_or(t);
    !code.is_empty() && !code.contains('/') && code.chars().all(|c| c.is_ascii_alphanumeric())
}

pub mod avatar;
pub mod banner;
pub mod banner_server;
pub mod banner_user;
pub mod emojis;
pub mod inviteinfo;
pub mod prevnames;
pub mod serverinfo;
pub mod serverpic;
pub mod snipe;
pub mod sticker;
pub mod top;
pub mod userinfo;
pub mod whereis;

pub use self::avatar::avatar;
pub use self::banner_server::banner_server;
pub use self::banner_user::banner_user;
pub use self::emojis::emojis;
pub use self::inviteinfo::inviteinfo;
pub use self::prevnames::prevnames;
pub use self::serverinfo::serverinfo;
pub use self::serverpic::serverpic;
pub use self::snipe::snipe;
pub use self::sticker::sticker;
pub use self::top::top;
pub use self::userinfo::userinfo;
pub use self::whereis::whereis;

#[allow(unused_imports)]
pub mod main {
    pub use super::avatar::*;
    pub use super::banner::*;
    pub use super::banner_server::*;
    pub use super::banner_user::*;
    pub use super::emojis::*;
    pub use super::inviteinfo::*;
    pub use super::prevnames::*;
    pub use super::serverinfo::*;
    pub use super::serverpic::*;
    pub use super::snipe::*;
    pub use super::sticker::*;
    pub use super::top::*;
    pub use super::userinfo::*;
    pub use super::whereis::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::is_valid_discord_invite;

    #[test]
    fn invite_gate_matches_ts_trim_and_patterns() {
        // Node ground truth: TS String.trim() strips U+FEFF/NBSP (Rust
        // str::trim keeps U+FEFF), bare code / discord.gg/ / full URL only,
        // case-sensitive scheme+host, ZWSP neither trimmed nor alnum.
        assert!(is_valid_discord_invite("abc"));
        assert!(is_valid_discord_invite("discord.gg/x"));
        assert!(is_valid_discord_invite("https://discord.gg/abc"));
        assert!(is_valid_discord_invite("  discord.gg/x  "));
        assert!(is_valid_discord_invite("\u{FEFF}abc"));
        assert!(is_valid_discord_invite("abc\u{FEFF}"));
        assert!(is_valid_discord_invite("\u{A0}abc"));
        assert!(!is_valid_discord_invite("HTTPS://discord.gg/abc"));
        assert!(!is_valid_discord_invite("https://discord.gg/abc/def"));
        assert!(!is_valid_discord_invite("discord.gg/"));
        assert!(!is_valid_discord_invite("a b"));
        assert!(!is_valid_discord_invite("\u{200B}abc"));
        assert!(!is_valid_discord_invite(""));
        assert!(!is_valid_discord_invite("   "));
    }
}
