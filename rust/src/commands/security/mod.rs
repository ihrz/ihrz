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

/// Audit-log reason for every security enforcement call.
/// Mirrors Events/security/onMemberJoin.ts (`"[Security] Module"` passed
/// to `roles.add` / `roles.remove`).
pub const SECURITY_AUDIT_REASON: &str = "[Security] Module";

/// Grant a role with the security audit-log reason.
///
/// DELTA: serenity 0.12 `Member::add_role` hardcodes a `None` reason, so
/// the pass leg in `events_handler.rs` (message-collector flow) still goes
/// through the reason-less path. Call this helper (raw `Http`, reason
/// threaded) when that file is next touched.
// Box-free: serenity's own Result type is large by construction.
#[allow(clippy::result_large_err)]
pub async fn grant_role(
    http: &poise::serenity_prelude::Http,
    guild_id: poise::serenity_prelude::GuildId,
    user_id: poise::serenity_prelude::UserId,
    role_id: poise::serenity_prelude::RoleId,
) -> poise::serenity_prelude::Result<()> {
    http.add_member_role(guild_id, user_id, role_id, Some(SECURITY_AUDIT_REASON))
        .await
}

/// Strip a role with the security audit-log reason (same DELTA as
/// [`grant_role`]: `Member::remove_role` also hardcodes `None`).
#[allow(clippy::result_large_err)]
pub async fn strip_role(
    http: &poise::serenity_prelude::Http,
    guild_id: poise::serenity_prelude::GuildId,
    user_id: poise::serenity_prelude::UserId,
    role_id: poise::serenity_prelude::RoleId,
) -> poise::serenity_prelude::Result<()> {
    http.remove_member_role(guild_id, user_id, role_id, Some(SECURITY_AUDIT_REASON))
        .await
}

/// Kick leg needs no helper: TS kicks with the localized
/// `event_security_kick_reason`, and the Rust paths already use
/// `kick_with_reason` with that same string.
/// Exact TS alphabet (captcha.ts, 7 chars, no J).
pub const CAPTCHA_ALPHABET: &[u8] = b"ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789";

/// Live captcha code: CSPRNG via `OsRng`, mirroring TS
/// `crypto.randomInt` in `src/core/captcha.ts`. This is the only
/// live path; the seeded helper below is `#[cfg(test)]`.
pub fn security_code() -> String {
    use rand::{rngs::OsRng, Rng};
    let mut rng = OsRng;
    (0..7)
        .map(|_| CAPTCHA_ALPHABET[rng.gen_range(0..CAPTCHA_ALPHABET.len())] as char)
        .collect()
}

/// Deterministic helper for shape tests only (xorshift, NOT a CSPRNG).
/// Never used outside `#[cfg(test)]`.
#[cfg(test)]
pub fn captcha_code(seed: u64) -> String {
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(7);
    for _ in 0..7 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(CAPTCHA_ALPHABET[(state % CAPTCHA_ALPHABET.len() as u64) as usize] as char);
    }
    out
}

/// Exact TS check: the collector compares with `===`, so only an exact
/// match passes (no trim, no case folding).
pub fn check_code(expected: &str, given: &str) -> bool {
    expected == given
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

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

/// Table-routed plain-string read with legacy fallback
/// (SECURITY.channel / SECURITY.role / SECURITY.role2 / SECURITY.disable).
pub async fn load_security_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        })
}

/// Table-routed plain-string write (keys unchanged).
pub async fn save_security_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(key, value).await
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

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_security_string(&pool, "g1", "SECURITY.channel", "8")
            .await
            .unwrap();
        assert_eq!(
            load_security_string(&pool, "g1", "SECURITY.channel")
                .await
                .as_deref(),
            Some("8")
        );
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'SECURITY.channel'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read, table wins over legacy.
        crate::db::kv_set(&pool, "g2", "SECURITY.role", "9")
            .await
            .unwrap();
        assert_eq!(
            load_security_string(&pool, "g2", "SECURITY.role")
                .await
                .as_deref(),
            Some("9")
        );
        crate::db::kv_set(&pool, "g1", "SECURITY.channel", "stale")
            .await
            .unwrap();
        assert_eq!(
            load_security_string(&pool, "g1", "SECURITY.channel")
                .await
                .as_deref(),
            Some("8")
        );
    }

    #[test]
    fn captcha_check_is_exact_like_ts_strict_equality() {
        assert!(check_code("ABC123K", "ABC123K"));
        assert!(!check_code("ABC123K", "abc123k"));
        assert!(!check_code("ABC123K", " ABC123K "));
        assert!(!check_code("ABC123K", ""));
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
    fn live_security_code_shape_and_varies() {
        for _ in 0..16 {
            let c = security_code();
            assert_eq!(c.len(), 7);
            assert!(c
                .chars()
                .all(|x| CAPTCHA_ALPHABET.iter().any(|&a| a as char == x)));
            assert!(!c.contains('J'));
        }
        // CSPRNG draws vary across batches (flaky only at 35^-112 odds).
        let batch: std::collections::HashSet<String> = (0..16).map(|_| security_code()).collect();
        assert!(batch.len() > 1);
    }

    #[test]
    fn audit_reason_matches_ts() {
        assert_eq!(SECURITY_AUDIT_REASON, "[Security] Module");
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
    #[cfg(test)]
    pub use super::captcha_code;
    pub use super::security::*;
    pub use super::{
        check_code, disable_flag, grant_role, guild_id_str, parse_on_off, security_code,
        strip_role, CAPTCHA_ALPHABET, SECURITY_AUDIT_REASON,
    };
}
