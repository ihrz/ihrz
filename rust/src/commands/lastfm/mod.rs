// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/lastfm/* (login/config surface).
//
// Real auth + scrobbling need LASTFM_API_KEY / shared secret
// (lastFMScrobblerManager, live-only). Stored here: per-user username
// (LASTFM.<uid>) + guild switch (GUILD.LASTFM).

use crate::bot::Ctx;

pub fn lastfm_key(user_id: u64) -> String {
    format!("LASTFM.{user_id}")
}

/// Bot-global scope for per-user rows. Mirrors the kv `guild_id = "0"`
/// convention used by login/status and the lavalink tip leg.
pub const LASTFM_SCOPE: &str = "0";

/// Guild on/off switch key (per-guild scope).
pub const GUILD_LASTFM_KEY: &str = "GUILD.LASTFM";

// ---- D7-LASTFM: table-first-on-kv routing ----
// Decision: table-first on the sqlite kv store (NOT a named table).
// These rows are scope-partitioned kv (per-user rows under the global
// "0" scope, one switch row per guild scope) with no cross-scope bulk
// scans, so the D1 invitesmanager / U-D3 `routed_*` precedent fits:
// `Backend::sqlite(pool).table(scope)` first with dotted keys
// unchanged, legacy `kv_get` fallback (never dropped) with lazy
// promotion, dual-write (kv first, then table) on save. A named table
// (backup precedent) is for cross-scope shared rows and is the wrong
// shape here.

/// Table-handle backend over the sqlite kv store.
fn table_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::db::backend_for(pool)
}

/// Table-handle read as plain text (JSON strings decoded once, other
/// JSON values re-serialized).
async fn tbl_text(pool: &crate::db::Pool, table: &str, key: &str) -> Option<String> {
    let v: serde_json::Value = table_backend(pool).table(table).get(key).await.ok()??;
    match v {
        serde_json::Value::String(s) => Some(s),
        other => serde_json::to_string(&other).ok(),
    }
}

/// Table-handle write of plain text (plain strings that are not valid
/// JSON stay strings, legacy kv parity).
async fn tbl_set_text(
    pool: &crate::db::Pool,
    table: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    let v: serde_json::Value =
        serde_json::from_str(value).unwrap_or(serde_json::Value::String(value.to_string()));
    table_backend(pool).table(table).set(key, v).await
}

/// Routed read: table handle first, legacy kv fallback with lazy
/// promotion into the table.
async fn routed_text(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
) -> Option<String> {
    if let Some(v) = tbl_text(pool, table, key).await {
        return Some(v);
    }
    let legacy = crate::db::kv_get(pool, legacy_scope, key).await?;
    let _ = tbl_set_text(pool, table, key, &legacy).await;
    Some(legacy)
}

/// Routed write: legacy kv first (unmigrated kv readers stay fresh),
/// then the table handle.
async fn routed_set_text(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, legacy_scope, key, value).await?;
    tbl_set_text(pool, table, key, value).await?;
    Ok(())
}

/// Linked Last.fm username for a user (table-first, legacy fallback).
pub async fn lastfm_username(pool: &crate::db::Pool, user_id: u64) -> Option<String> {
    routed_text(pool, LASTFM_SCOPE, LASTFM_SCOPE, &lastfm_key(user_id)).await
}

/// Save a linked Last.fm username (dual-write, keys unchanged).
pub async fn save_lastfm_username(
    pool: &crate::db::Pool,
    user_id: u64,
    username: &str,
) -> anyhow::Result<()> {
    routed_set_text(
        pool,
        LASTFM_SCOPE,
        LASTFM_SCOPE,
        &lastfm_key(user_id),
        username,
    )
    .await
}

/// Full per-user Last.fm settings row, normalized to an object.
/// Mirrors `DatabaseStructure.LastFMUserSchema` (`{enabled, username,
/// sessionKey, connectedAt}` at `<userId>.lastfm`, here under the
/// `LASTFM.<uid>` key in the global scope). Legacy rows hold a bare
/// username string (written by `save_lastfm_username`); those
/// normalize to `{"username": <s>}`.
pub async fn lastfm_settings(pool: &crate::db::Pool, user_id: u64) -> Option<serde_json::Value> {
    let key = lastfm_key(user_id);
    if let Ok(Some(v)) = table_backend(pool)
        .table(LASTFM_SCOPE)
        .get::<serde_json::Value>(&key)
        .await
    {
        if let Some(n) = normalize_lastfm_settings(&v) {
            return Some(n);
        }
    }
    let legacy = crate::db::kv_get(pool, LASTFM_SCOPE, &key).await?;
    let v: serde_json::Value =
        serde_json::from_str(&legacy).unwrap_or(serde_json::Value::String(legacy.clone()));
    let _ = tbl_set_text(pool, LASTFM_SCOPE, &key, &legacy).await;
    normalize_lastfm_settings(&v)
}

/// Normalize a stored row to a settings object. None when the row
/// carries nothing usable (empty string, non-string scalars).
/// DELTA (doc-noted, unreachable: no writer on either side stores a
/// bare string under the settings key -- all three TS manager writes
/// and `save_lastfm_settings` store objects, and Rust's only
/// bare-string writer `save_lastfm_username` has no live callers):
/// a bare-string row normalizes to `{"username": s}`, so the Rust
/// embed account field would show the name while TS
/// `settings?.username` reads `undefined` and falls back to
/// `var_none` (battery scratch `slice-w4s97-usersettings.cjs`,
/// bare-string leg). Session/enable gates still converge (both
/// deny: no `sessionKey` either way).
pub fn normalize_lastfm_settings(raw: &serde_json::Value) -> Option<serde_json::Value> {
    match raw {
        serde_json::Value::Object(_) => Some(raw.clone()),
        serde_json::Value::String(s) => {
            if let Ok(serde_json::Value::Object(_)) = serde_json::from_str::<serde_json::Value>(s) {
                serde_json::from_str(s).ok()
            } else if s.is_empty() {
                None
            } else {
                Some(serde_json::json!({ "username": s }))
            }
        }
        _ => None,
    }
}

/// Save a full settings row (dual-write, keys unchanged). The legacy
/// kv leg stores the JSON text; the table leg parses it back so the
/// object shape survives the round trip.
pub async fn save_lastfm_settings(
    pool: &crate::db::Pool,
    user_id: u64,
    settings: &serde_json::Value,
) -> anyhow::Result<()> {
    routed_set_text(
        pool,
        LASTFM_SCOPE,
        LASTFM_SCOPE,
        &lastfm_key(user_id),
        &settings.to_string(),
    )
    .await
}

/// `hasUserSession` mirror: true when both `sessionKey` and
/// `username` are present and non-empty.
pub fn lastfm_has_session(settings: &serde_json::Value) -> bool {
    let non_empty = |k: &str| {
        settings
            .get(k)
            .and_then(|v| v.as_str())
            .map(|s| !s.is_empty())
            .unwrap_or(false)
    };
    non_empty("sessionKey") && non_empty("username")
}

/// Raw guild switch value (`Some("1")` / `Some("0")` / None when unset).
pub async fn guild_lastfm(pool: &crate::db::Pool, guild_id: &str) -> Option<String> {
    routed_text(pool, guild_id, guild_id, GUILD_LASTFM_KEY).await
}

/// Save the guild switch (dual-write, keys unchanged).
pub async fn save_guild_lastfm(
    pool: &crate::db::Pool,
    guild_id: &str,
    enabled: bool,
) -> anyhow::Result<()> {
    routed_set_text(
        pool,
        guild_id,
        guild_id,
        GUILD_LASTFM_KEY,
        if enabled { "1" } else { "0" },
    )
    .await
}

/// Parse the guild switch. Unset reads as off (matches the pre-config
/// default: the tip/scrobbler paths treat a missing row as disabled).
pub fn guild_lastfm_enabled(raw: Option<&str>) -> bool {
    matches!(raw, Some("1"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_shape() {
        assert_eq!(lastfm_key(5), "LASTFM.5");
    }

    #[test]
    fn settings_normalize_covers_legacy_shapes() {
        // Full object passes through.
        let obj = serde_json::json!({ "enabled": true, "username": "dj" });
        assert_eq!(normalize_lastfm_settings(&obj), Some(obj.clone()));
        // Bare username string (save_lastfm_username shape).
        assert_eq!(
            normalize_lastfm_settings(&serde_json::Value::String("dj".to_string())),
            Some(serde_json::json!({ "username": "dj" }))
        );
        // Doubly-encoded object string.
        let enc = serde_json::Value::String(obj.to_string());
        assert_eq!(normalize_lastfm_settings(&enc), Some(obj));
        // Empty / scalar rows carry nothing.
        assert_eq!(
            normalize_lastfm_settings(&serde_json::Value::String(String::new())),
            None
        );
        assert_eq!(normalize_lastfm_settings(&serde_json::json!(42)), None);
    }

    #[test]
    fn has_session_needs_key_and_username() {
        assert!(lastfm_has_session(
            &serde_json::json!({ "username": "dj", "sessionKey": "k" })
        ));
        assert!(!lastfm_has_session(
            &serde_json::json!({ "username": "dj" })
        ));
        assert!(!lastfm_has_session(
            &serde_json::json!({ "username": "dj", "sessionKey": "" })
        ));
        assert!(!lastfm_has_session(&serde_json::json!({})));
    }

    /// W4 slice-76 battery (`hasUserSession` +
    /// `setEnabled` enable-gate, script at
    /// scratch `slice-w4s76-hassession.cjs`, 14/14 green):
    /// the gate `enabled && (!settings?.sessionKey ||
    /// !settings.username)` reduces to `!hasUserSession` on every
    /// leg (the bare `.username` read is saved by `||`
    /// short-circuit on nullish rows), so the single
    /// `lastfm_has_session` check serves both call sites.
    /// DELTA (unreachable: writers store strings): truthy
    /// non-strings (`12345`, `true`) pass the TS `Boolean`
    /// gate but fold to `false` here -- strictly safer.
    #[test]
    fn has_session_matches_ts_battery() {
        // Empty user folds like the empty key (TS `&&` falsy).
        assert!(!lastfm_has_session(
            &serde_json::json!({ "username": "", "sessionKey": "k" })
        ));
        // Whitespace is truthy on both sides.
        assert!(lastfm_has_session(
            &serde_json::json!({ "username": "dj", "sessionKey": " " })
        ));
        // Falsy scalars block on both sides.
        assert!(!lastfm_has_session(
            &serde_json::json!({ "username": "dj", "sessionKey": 0 })
        ));
        assert!(!lastfm_has_session(
            &serde_json::json!({ "username": "dj", "sessionKey": null })
        ));
        assert!(!lastfm_has_session(&serde_json::json!(null)));
    }

    #[test]
    fn guild_switch_parses() {
        assert!(guild_lastfm_enabled(Some("1")));
        assert!(!guild_lastfm_enabled(Some("0")));
        assert!(!guild_lastfm_enabled(None));
        assert!(!guild_lastfm_enabled(Some("yes")));
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn user_save_dual_writes_both_stores() {
        let pool = mem_pool().await;
        save_lastfm_username(&pool, 7, "dj-rust").await.unwrap();
        // Legacy kv reader stays fresh (keys unchanged).
        assert_eq!(
            crate::db::kv_get(&pool, LASTFM_SCOPE, &lastfm_key(7))
                .await
                .as_deref(),
            Some("dj-rust")
        );
        // Table-first read resolves the same row.
        assert_eq!(lastfm_username(&pool, 7).await.as_deref(), Some("dj-rust"));
    }

    #[tokio::test]
    async fn user_legacy_fallback_reads_and_promotes() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, LASTFM_SCOPE, &lastfm_key(9), "legacy-dj")
            .await
            .unwrap();
        assert_eq!(
            lastfm_username(&pool, 9).await.as_deref(),
            Some("legacy-dj")
        );
        // Lazy promotion: the legacy hit is now table-visible.
        assert_eq!(
            tbl_text(&pool, LASTFM_SCOPE, &lastfm_key(9))
                .await
                .as_deref(),
            Some("legacy-dj")
        );
    }

    #[tokio::test]
    async fn settings_read_path_matches_ts_get_user_settings() {
        // W4 slice-97 pin: battery scratch
        // `slice-w4s97-usersettings.cjs`, green 50/50 (10 rows x 5
        // legs: hasSession + enable-gate + embed status/account/
        // stamp). TS `getUserSettings` returns the raw
        // `${userId}.lastfm` row (null when missing, no
        // normalization); this pins the Rust read path composition.
        let pool = mem_pool().await;
        // Missing row -> None (TS null; every downstream gate falsy).
        assert_eq!(lastfm_settings(&pool, 9001).await, None);
        // Object row round-trips verbatim (TS passthrough).
        let obj = serde_json::json!({
            "connectedAt": 1700000000000i64,
            "enabled": true,
            "sessionKey": "k",
            "username": "dj",
        });
        save_lastfm_settings(&pool, 9002, &obj).await.unwrap();
        assert_eq!(lastfm_settings(&pool, 9002).await, Some(obj));
        // Bare-string row normalizes to {"username"} (no writer on
        // either side produces this under the settings key; DELTA
        // doc-noted on normalize_lastfm_settings).
        tbl_set_text(&pool, LASTFM_SCOPE, &lastfm_key(9003), "dj")
            .await
            .unwrap();
        let norm = lastfm_settings(&pool, 9003).await.unwrap();
        assert_eq!(norm, serde_json::json!({ "username": "dj" }));
        // The normalized row fails the session gate exactly like the
        // TS bare-string legs (hasSession false, enable denied).
        assert!(!lastfm_has_session(&norm));
        // Legacy kv-only row promotes through the same path.
        crate::db::kv_set(
            &pool,
            LASTFM_SCOPE,
            &lastfm_key(9004),
            "{\"username\":\"kv-dj\"}",
        )
        .await
        .unwrap();
        assert_eq!(
            lastfm_settings(&pool, 9004).await,
            Some(serde_json::json!({ "username": "kv-dj" }))
        );
    }

    #[tokio::test]
    async fn user_table_first_wins_on_conflict() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, LASTFM_SCOPE, &lastfm_key(11), "old-name")
            .await
            .unwrap();
        tbl_set_text(&pool, LASTFM_SCOPE, &lastfm_key(11), "new-name")
            .await
            .unwrap();
        assert_eq!(
            lastfm_username(&pool, 11).await.as_deref(),
            Some("new-name")
        );
    }

    #[tokio::test]
    async fn guild_save_dual_writes_both_stores() {
        let pool = mem_pool().await;
        save_guild_lastfm(&pool, "g1", true).await.unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g1", GUILD_LASTFM_KEY)
                .await
                .as_deref(),
            Some("1")
        );
        assert_eq!(guild_lastfm(&pool, "g1").await.as_deref(), Some("1"));
        assert!(guild_lastfm_enabled(
            guild_lastfm(&pool, "g1").await.as_deref()
        ));
        save_guild_lastfm(&pool, "g1", false).await.unwrap();
        assert!(!guild_lastfm_enabled(
            guild_lastfm(&pool, "g1").await.as_deref()
        ));
    }

    #[tokio::test]
    async fn guild_legacy_fallback_reads_and_promotes() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g2", GUILD_LASTFM_KEY, "1")
            .await
            .unwrap();
        assert_eq!(guild_lastfm(&pool, "g2").await.as_deref(), Some("1"));
        assert_eq!(
            tbl_text(&pool, "g2", GUILD_LASTFM_KEY).await.as_deref(),
            Some("1")
        );
        // Unset guild reads as missing (off).
        assert_eq!(guild_lastfm(&pool, "g3").await, None);
    }

    #[test]
    fn lastfm_surface_matches_ts_registration() {
        // W4 slice 99 battery (scratch `slice-w4s99-surface.cjs`, green
        // 21/21): `/lastfm` slash surface verbatim from
        // `src/Interaction/SlashCommands/lastfm/lastfm.ts` — subcommand
        // names/order, option names/order/required/choices, choice
        // values + localized labels. Ephemeral + descriptions are
        // handler/attribute-level (config.rs/login.rs `msg_for!` +
        // `.ephemeral(true)`), pinned by their own batteries.
        fn flatten<'a>(
            cmds: &'a [poise::Command<crate::commands::Data, crate::commands::Error>],
            out: &mut Vec<&'a poise::Command<crate::commands::Data, crate::commands::Error>>,
        ) {
            for c in cmds {
                out.push(c);
                flatten(&c.subcommands, out);
            }
        }
        let cmds = crate::commands::all();
        let mut flat = vec![];
        flatten(&cmds, &mut flat);
        // Parent carries exactly [config, login] in TS declaration order.
        // Leaf lookups stay scoped to this parent: bare `config` /
        // `login` names repeat elsewhere in the tree (any-carrier).
        let parent = flat
            .iter()
            .find(|c| c.name == "lastfm")
            .expect("missing /lastfm parent");
        let subs: Vec<&str> = parent.subcommands.iter().map(|c| c.name.as_str()).collect();
        assert_eq!(subs, vec!["config", "login"]);
        let by_name = |n: &str| {
            parent
                .subcommands
                .iter()
                .find(|c| c.name == n)
                .unwrap_or_else(|| panic!("missing /lastfm subcommand {n}"))
        };
        // `/lastfm login`: exactly (username, password), both required
        // strings, no choices (TS `getString(..., true)` x2).
        let login = by_name("login");
        let params: Vec<(&str, bool)> = login
            .parameters
            .iter()
            .map(|p| (p.name.as_str(), p.required))
            .collect();
        assert_eq!(params, vec![("username", true), ("password", true)]);
        assert!(login.parameters.iter().all(|p| p.choices.is_empty()));
        // `/lastfm config`: exactly (power), required, choices on/off
        // with the TS localized labels.
        let config = by_name("config");
        assert_eq!(config.parameters.len(), 1);
        let power = &config.parameters[0];
        assert_eq!(power.name, "power");
        assert!(power.required);
        let choices: Vec<(&str, Option<&str>, Option<&str>)> = power
            .choices
            .iter()
            .map(|c| {
                (
                    c.name.as_str(),
                    c.localizations.get("en-US").map(String::as_str),
                    c.localizations.get("fr").map(String::as_str),
                )
            })
            .collect();
        assert_eq!(
            choices,
            vec![
                ("on", Some("Power On"), Some("Activer")),
                ("off", Some("Power Off"), Some("Désactiver")),
            ]
        );
    }
}

pub mod config;
#[allow(clippy::module_inception)]
pub mod lastfm;
pub mod login;
pub mod scrobbler;

/// Old registry path (`lastfm::main::lastfm`) kept working.
pub mod main {
    pub use super::lastfm::*;
}
