// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/security/*.
//
// TS keys: <guild>.SECURITY.disable (bool, false = on), .channel,
// .role (role-to-give), .role2 (role-to-remove).
// YAML: security_disable_pw_on/off, security_channel_command_work,
// security_role_to_give_command_work.

use crate::bot::Ctx;

/// "on" => enabled=true, "off" => enabled=false.
pub fn parse_on_off(action: &str) -> Option<bool> {
    match action.to_ascii_lowercase().as_str() {
        "on" | "power on" | "enable" => Some(true),
        "off" | "power off" | "disable" => Some(false),
        _ => None,
    }
}

/// Captcha code: 5 chars from unambiguous alphabet (no 0/O/1/l).
/// Mirrors Events/security/onMemberJoin.ts image captcha.
pub fn gen_captcha(seed: u64) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(5);
    for _ in 0..5 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHA[(state % ALPHA.len() as u64) as usize] as char);
    }
    out
}

/// Exact TS alphabet (captcha.ts, 7 chars, no J).
pub fn captcha_code(seed: u64) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789";
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(7);
    for _ in 0..7 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHA[(state % ALPHA.len() as u64) as usize] as char);
    }
    out
}

pub fn verify_captcha(expected: &str, given: &str) -> bool {
    expected.eq_ignore_ascii_case(given.trim())
}

/// TS stores `disable` (inverse of enabled).
pub fn disable_flag(enabled: bool) -> &'static str {
    if enabled {
        "0"
    } else {
        "1"
    }
}

pub async fn guild_id_str(ctx: &Ctx<'_>) -> Option<String> {
    ctx.guild_id().map(|g| g.get().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn on_off_parses_ts_choices() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
        assert_eq!(parse_on_off("Power On"), Some(true));
        assert_eq!(parse_on_off("Power Off"), Some(false));
        assert_eq!(parse_on_off("bogus"), None);
    }

    #[test]
    fn disable_flag_is_inverse_of_enabled() {
        assert_eq!(disable_flag(true), "0");
        assert_eq!(disable_flag(false), "1");
    }

    #[test]
    fn captcha_exact_shape() {
        let c = captcha_code(99);
        assert_eq!(c.len(), 7);
        assert!(c
            .chars()
            .all(|x| "ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789".contains(x)));
        assert!(!c.contains('J'));
    }

    #[test]
    fn captcha_roundtrip_case_insensitive() {
        let code = gen_captcha(12345);
        assert_eq!(code.len(), 5);
        assert!(verify_captcha(&code, &code.to_ascii_lowercase()));
        assert!(!verify_captcha(&code, "zzzzz"));
        assert!(!verify_captcha(&code, ""));
    }
}

pub mod channel;
pub mod config;
pub mod role_to_give;
pub mod role_to_remove;
#[allow(clippy::module_inception)]
pub mod security;

/// Old registry path (`security::main::*`) kept working, including the
/// helpers other categories reuse (`security::main::parse_on_off`,
/// used by pfps + guildconfig).
#[allow(unused_imports)]
pub mod main {
    pub use super::security::*;
    pub use super::{
        captcha_code, disable_flag, gen_captcha, guild_id_str, parse_on_off, verify_captcha,
    };
}
