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
