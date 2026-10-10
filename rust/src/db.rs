// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/database (+ types/database_structure.d.ts).
//
// TS uses client.db.get()/set() over horizondb (sqlite default, mysql
// optional). The Rust port uses sqlx + sqlite by default with the same
// file (src/files/db.sqlite) so both implementations can share data
// during migration. Guild-scoped helpers keep the same key layout.

use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;

use crate::config::Config;

pub type Pool = SqlitePool;

/// Create the sqlite parent directory when missing so boot never
/// fails with "unable to open database file" just because the
/// working directory differs (e.g. `cargo run` from `rust/`).
/// Run from the repo root to share `src/files/db.sqlite` with TS.
fn ensure_parent_dir(database_url: &str) {
    let path = database_url.strip_prefix("sqlite:").unwrap_or(database_url);
    let path = path.split('?').next().unwrap_or(path);
    if path == ":memory:" || path.is_empty() {
        return;
    }
    if let Some(parent) = std::path::Path::new(path).parent() {
        if !parent.as_os_str().is_empty() {
            let _ = std::fs::create_dir_all(parent);
        }
    }
}

pub async fn init(cfg: &Config) -> anyhow::Result<Pool> {
    ensure_parent_dir(&cfg.database_url);
    let opts = SqliteConnectOptions::from_str(&cfg.database_url)?.create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS kv (
            guild_id TEXT NOT NULL,
            key_name TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (guild_id, key_name)
        )",
    )
    .execute(&pool)
    .await?;

    // Dropped table (C2): per-guild language used to live in a dedicated
    // `guild_lang` table that no writer ever populated (setlang writes kv
    // `GUILD.LANG`), so every guild resolved `en-US`. The single source of
    // truth is now kv `GUILD.LANG` (see `GUILD_LANG_KEY` / `guild_lang`,
    // mirroring TS `getLanguageData`). Drop the dead table when present so
    // stale rows cannot shadow anything; `clear_guild_lang` below stays as
    // a kv-backed compat wrapper (scheduler wipe path).
    sqlx::query("DROP TABLE IF EXISTS guild_lang")
        .execute(&pool)
        .await?;

    Ok(pool)
}

pub async fn kv_get(pool: &Pool, guild_id: &str, key: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT value FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

pub async fn kv_set(pool: &Pool, guild_id: &str, key: &str, value: &str) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO kv (guild_id, key_name, value) VALUES (?, ?, ?)
         ON CONFLICT (guild_id, key_name) DO UPDATE SET value = excluded.value",
    )
    .bind(guild_id)
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn kv_del(pool: &Pool, guild_id: &str, key: &str) -> anyhow::Result<()> {
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(key)
        .execute(pool)
        .await?;
    Ok(())
}

/// All `(key, value)` rows for one guild. Driver-only scan primitive —
/// callers must use this (or `kv_scan_prefix`) instead of raw SQL.
pub async fn kv_scan(pool: &Pool, guild_id: &str) -> Vec<(String, String)> {
    sqlx::query_as::<_, (String, String)>("SELECT key_name, value FROM kv WHERE guild_id = ?")
        .bind(guild_id)
        .fetch_all(pool)
        .await
        .unwrap_or_default()
}

/// `(key, value)` rows under `prefix` for one guild (SQL LIKE, `%`/`_`
/// in the prefix are escaped).
pub async fn kv_scan_prefix(pool: &Pool, guild_id: &str, prefix: &str) -> Vec<(String, String)> {
    let pat = format!(
        "{}%",
        prefix
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_")
    );
    sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE ? ESCAPE '\\'",
    )
    .bind(guild_id)
    .bind(pat)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
}

/// Delete every row under `prefix` for one guild.
pub async fn kv_del_prefix(pool: &Pool, guild_id: &str, prefix: &str) -> anyhow::Result<()> {
    let pat = format!(
        "{}%",
        prefix
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_")
    );
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE ? ESCAPE '\\'")
        .bind(guild_id)
        .bind(pat)
        .execute(pool)
        .await?;
    Ok(())
}

/// Cross-guild `(guild_id, key, value)` scan. Driver-only primitive for
/// sweeps (authrestore, giveaway boards) — never raw SQL at call sites.
pub async fn kv_scan_all(pool: &Pool) -> Vec<(String, String, String)> {
    sqlx::query_as::<_, (String, String, String)>("SELECT guild_id, key_name, value FROM kv")
        .fetch_all(pool)
        .await
        .unwrap_or_default()
}

/// Delete every row of one guild (leave-cleanup / wipe paths).
pub async fn kv_del_guild(pool: &Pool, guild_id: &str) -> anyhow::Result<()> {
    sqlx::query("DELETE FROM kv WHERE guild_id = ?")
        .bind(guild_id)
        .execute(pool)
        .await?;
    Ok(())
}

// ---- tbl_* routed helpers (single home, C5) ----
// The guild-table forks that lived in events.rs / events_handler.rs
// (and the same shape in commands/owner/main.rs, out of scope here)
// are unified here. Semantics: table handle first (`tbl:<gid>` scope via
// the sqlite backend), legacy flat kv row as fallback; writes dual-store
// so unmigrated kv readers stay fresh. Keys unchanged.

/// Guild-table backend for tbl_* routing (keys unchanged).
fn guild_table_backend(pool: &Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Stringify a table value like the legacy kv rows: plain strings stay
/// plain, integers render without `.0`, anything else renders compact JSON.
fn table_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                i.to_string()
            } else if let Some(u) = n.as_u64() {
                u.to_string()
            } else if let Some(f) = n.as_f64() {
                if f.fract() == 0.0 && f >= i64::MIN as f64 && f <= i64::MAX as f64 {
                    (f as i64).to_string()
                } else {
                    f.to_string()
                }
            } else {
                n.to_string()
            }
        }
        other => other.to_string(),
    }
}

/// Table-first read of one dotted key with legacy flat-row fallback.
/// Writers store under `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
pub async fn tbl_get(pool: &Pool, gid: &str, key: &str) -> Option<String> {
    let backend = guild_table_backend(pool);
    let table = backend.table(gid);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(table_string(&v));
    }
    // Blob stored as JSON text under an ancestor: decode string
    // intermediates while walking the dotted path.
    if key.contains('.') {
        let mut segs = key.split('.');
        let root = segs.next().unwrap_or("");
        if let Ok(Some(mut cur)) = table.get::<serde_json::Value>(root).await {
            let mut hit = true;
            for seg in segs {
                if let serde_json::Value::String(s) = &cur {
                    cur = serde_json::from_str(s).unwrap_or(serde_json::Value::Null);
                }
                match &cur {
                    serde_json::Value::Object(m) => {
                        cur = m.get(seg).cloned().unwrap_or(serde_json::Value::Null);
                    }
                    _ => {
                        hit = false;
                        break;
                    }
                }
            }
            if hit && !cur.is_null() {
                return Some(table_string(&cur));
            }
        }
    }
    kv_get(pool, gid, key).await
}

/// Table-routed write, dual-stored (keys unchanged): the table handle is
/// the primary store and the legacy kv row keeps unmigrated kv readers
/// fresh (the U-D3 dual-write precedent).
pub async fn tbl_set(pool: &Pool, gid: &str, key: &str, value: &str) -> anyhow::Result<()> {
    let _ = guild_table_backend(pool).table(gid).set(key, value).await;
    kv_set(pool, gid, key, value).await
}

/// Table-routed delete: clears the guild-table row and any legacy row.
pub async fn tbl_del(pool: &Pool, gid: &str, key: &str) -> anyhow::Result<()> {
    let backend = guild_table_backend(pool);
    let _ = backend.table(gid).delete(key).await;
    kv_del(pool, gid, key).await
}

/// Structured dual write for blobs co-owned with not-yet-migrated
/// modules: the table holds the real JSON value (so table-first struct
/// decoders keep working) and the legacy kv row keeps the JSON text for
/// kv readers. Keys unchanged.
pub async fn tbl_set_json<T: serde::Serialize>(
    pool: &Pool,
    gid: &str,
    key: &str,
    value: &T,
) -> anyhow::Result<()> {
    let raw = serde_json::to_string(value).unwrap_or_default();
    let _ = guild_table_backend(pool).table(gid).set(key, value).await;
    kv_set(pool, gid, key, &raw).await
}

/// Table-routed counter add with one-time legacy seeding so counters never
/// reset at cutover. Returns the new value.
pub async fn tbl_add(pool: &Pool, gid: &str, key: &str, delta: f64) -> f64 {
    let backend = guild_table_backend(pool);
    let table = backend.table(gid);
    if table.get_raw(key).await.ok().flatten().is_none() {
        if let Some(s) = kv_get(pool, gid, key).await {
            let base: f64 = serde_json::from_str::<serde_json::Value>(&s)
                .ok()
                .and_then(|v| match &v {
                    serde_json::Value::Number(n) => n.as_f64(),
                    serde_json::Value::String(x) => x.trim().parse().ok(),
                    serde_json::Value::Bool(b) => Some(if *b { 1.0 } else { 0.0 }),
                    _ => None,
                })
                .or_else(|| s.trim().parse().ok())
                .unwrap_or(0.0);
            if base != 0.0 {
                let _ = table.set(key, base).await;
            }
            let _ = kv_del(pool, gid, key).await;
        }
    }
    table.add(key, delta).await.unwrap_or(delta)
}

/// Expand one table root object into full dotted keys.
fn expand_scan(base: String, v: &serde_json::Value, out: &mut Vec<(String, String)>) {
    match v {
        serde_json::Value::Object(m) => {
            for (k, child) in m {
                expand_scan(format!("{base}.{k}"), child, out);
            }
        }
        // JSON-text leaves stay leaves (legacy flat-row semantics).
        leaf => out.push((base, table_string(leaf))),
    }
}

/// Table-first prefix scan with legacy flat-row fallback (table wins on
/// key conflicts). The kv leg routes through `kv_scan_prefix` (C4:
/// escaped LIKE, no raw SQL at call sites). Keys unchanged.
pub async fn tbl_scan_prefix(pool: &Pool, gid: &str, prefix: &str) -> Vec<(String, String)> {
    let mut merged = std::collections::HashMap::new();
    for (k, v) in kv_scan_prefix(pool, gid, prefix).await {
        merged.insert(k, v);
    }
    let root = prefix.split('.').next().unwrap_or("");
    if !root.is_empty() {
        let backend = guild_table_backend(pool);
        let table = backend.table(gid);
        if let Ok(Some(rv)) = table.get::<serde_json::Value>(root).await {
            let mut expanded = Vec::new();
            expand_scan(root.to_string(), &rv, &mut expanded);
            for (k, v) in expanded {
                if k.starts_with(prefix) {
                    merged.insert(k, v);
                }
            }
        }
    }
    let mut out: Vec<(String, String)> = merged.into_iter().collect();
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

/// Table-routed prefix delete: clears matching guild-table rows and any
/// legacy rows.
pub async fn tbl_del_prefix(pool: &Pool, gid: &str, prefix: &str) -> anyhow::Result<()> {
    for (k, _) in tbl_scan_prefix(pool, gid, prefix).await {
        let _ = tbl_del(pool, gid, &k).await;
    }
    Ok(())
}

/// TS `backups`-table read by global backup ID. Missing table/row -> None.
pub async fn backup_get(pool: &Pool, backup_id: &str) -> Option<String> {
    sqlx::query_scalar::<_, String>("SELECT json FROM backups WHERE ID = ?")
        .bind(backup_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
}

/// Delete a TS `backups`-table row by global backup ID. Auto-creates the
/// table first (C18: delete paths must not fail on a fresh database where
/// no backup was ever written); missing row stays a no-op.
pub async fn backup_del(pool: &Pool, backup_id: &str) -> anyhow::Result<()> {
    ensure_backups_table(pool).await?;
    sqlx::query("DELETE FROM backups WHERE ID = ?")
        .bind(backup_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Write a TS `backups`-table row (ID = backupID, `json` = bare
/// BackupData). Missing table -> error (callers/tests create it via
/// `ensure_backups_table`).
pub async fn backup_set(pool: &Pool, backup_id: &str, json: &str) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO backups (ID, json) VALUES (?, ?)
         ON CONFLICT (ID) DO UPDATE SET json = excluded.json",
    )
    .bind(backup_id)
    .bind(json)
    .execute(pool)
    .await?;
    Ok(())
}

/// Create the TS `backups` table when missing (tests + first use).
pub async fn ensure_backups_table(pool: &Pool) -> anyhow::Result<()> {
    sqlx::query("CREATE TABLE IF NOT EXISTS backups (ID TEXT PRIMARY KEY, json TEXT)")
        .execute(pool)
        .await?;
    Ok(())
}

/// TS `schedule`-table scan (global, keyed by user ID). Rows hold
/// `{code: {title, description, expired}}` via `scheduleTable.set(`
/// `` `${user.id}.${scheduleCode}` `` `, ...)` in schedule.ts.
/// Missing table -> empty (never an error). Precedent: the
/// `ts_backups_table_get` compat read over the TS `backups` table.
pub async fn schedule_all(pool: &Pool) -> Vec<(String, String)> {
    sqlx::query_as::<_, (String, String)>("SELECT ID, json FROM schedule")
        .fetch_all(pool)
        .await
        .unwrap_or_default()
}

/// Write one TS `schedule`-table row (sweep expiry cleanup only;
/// schedule writes stay per-guild). Missing table -> error
/// (callers/tests create it via `ensure_schedule_table`).
pub async fn schedule_set(pool: &Pool, user_id: &str, json: &str) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO schedule (ID, json) VALUES (?, ?)
         ON CONFLICT (ID) DO UPDATE SET json = excluded.json",
    )
    .bind(user_id)
    .bind(json)
    .execute(pool)
    .await?;
    Ok(())
}

/// Delete one TS `schedule`-table row by user ID. Auto-creates the table
/// first (C18: sweep deletes must not fail when the table was never
/// written, e.g. first boot with no schedules).
pub async fn schedule_del(pool: &Pool, user_id: &str) -> anyhow::Result<()> {
    ensure_schedule_table(pool).await?;
    sqlx::query("DELETE FROM schedule WHERE ID = ?")
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Create the TS `schedule` table when missing (tests + first sweep).
pub async fn ensure_schedule_table(pool: &Pool) -> anyhow::Result<()> {
    sqlx::query("CREATE TABLE IF NOT EXISTS schedule (ID TEXT PRIMARY KEY, json TEXT)")
        .execute(pool)
        .await?;
    Ok(())
}

/// Drop a guild's language row. Compat wrapper kept for the scheduler wipe
/// path: the dedicated `guild_lang` table is dropped (C2, see `init`), so
/// this clears the kv `GUILD.LANG` row. `kv_del_guild` already covers it;
/// this stays for targeted clears.
pub async fn clear_guild_lang(pool: &Pool, guild_id: &str) -> anyhow::Result<()> {
    kv_del(pool, guild_id, GUILD_LANG_KEY).await
}

/// In-memory pool with driver tables created. Test-only shared helper —
/// test modules must use this instead of hand-rolled `CREATE TABLE` SQL.
#[cfg(test)]
pub async fn memory_pool() -> Pool {
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
    use std::str::FromStr;
    let opts = SqliteConnectOptions::from_str("sqlite::memory:")
        .unwrap()
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(opts)
        .await
        .unwrap();
    sqlx::query(
        "CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))",
    )
    .execute(&pool)
    .await
    .unwrap();
    pool
}

pub async fn guild_prefix(pool: &Pool, guild_id: Option<u64>, default: &str) -> String {
    let Some(gid) = guild_id else {
        return default.to_string();
    };
    migrate_prefix_key(pool, &gid.to_string()).await;
    crate::db::kv_get(pool, &gid.to_string(), PREFIX_KEY)
        .await
        .filter(|p| !p.trim().is_empty())
        .unwrap_or_else(|| default.to_string())
}

/// Canonical per-guild prefix key. Mirrors the TS source of truth
/// (`${guildId}.BOT.prefix` in prefix.ts + !prefix.ts).
pub const PREFIX_KEY: &str = "BOT.prefix";

/// Legacy key written by the early Rust port (`GUILD.PREFIX`, never used
/// by TS). Kept only so existing guilds can be migrated; removed by
/// `migrate_prefix_key` once copied to the canonical key.
pub const LEGACY_PREFIX_KEY: &str = "GUILD.PREFIX";

/// Store a guild prefix under the canonical key.
pub async fn set_guild_prefix(pool: &Pool, guild_id: &str, prefix: &str) -> anyhow::Result<()> {
    kv_set(pool, guild_id, PREFIX_KEY, prefix).await
}

/// Mention-revert: delete the custom prefix so the guild falls back to
/// the mention/default prefix. Mirrors the `action === "mention"` branch
/// of !prefix.ts (`client.db.delete(`${guildId}.BOT.prefix`)`).
pub async fn clear_guild_prefix(pool: &Pool, guild_id: &str) -> anyhow::Result<()> {
    kv_del(pool, guild_id, PREFIX_KEY).await
}

/// One-way migration for guilds stored under the legacy key:
/// copy `GUILD.PREFIX` to `BOT.prefix` when the canonical key is absent,
/// then drop the legacy row.
pub async fn migrate_prefix_key(pool: &Pool, guild_id: &str) {
    if kv_get(pool, guild_id, PREFIX_KEY).await.is_some() {
        return;
    }
    if let Some(legacy) = kv_get(pool, guild_id, LEGACY_PREFIX_KEY).await {
        if !legacy.trim().is_empty() {
            let _ = kv_set(pool, guild_id, PREFIX_KEY, &legacy).await;
        }
        let _ = kv_del(pool, guild_id, LEGACY_PREFIX_KEY).await;
    }
}

/// Truncate a raw prefix argument to its first token. Mirrors
/// `prefix.split(" ")[0]` in !prefix.ts.
pub fn truncate_prefix(raw: &str) -> String {
    raw.split(' ').next().unwrap_or("").to_string()
}

/// Cap check for a new prefix. Mirrors `if (prefix.length >= 5)` in
/// !prefix.ts (char count is the closest offline equivalent of the
/// UTF-16 `.length`; 4 chars max).
pub fn prefix_too_long(prefix: &str) -> bool {
    prefix.chars().count() >= 5
}

// ---- ownerHelper (kv-backed tables) ----
// Mirrors src/core/functions/ownerHelper.ts. Guild owners live under
// `${guildId}.OWNER.${userId}` (kv: guild_id + `OWNER.<uid>`); bot owners
// merge the config list (`client.owners`) with the persisted owner table
// (kv scope "0", `OWNER.<uid>`, mirrors the horizondb `owner` table).

/// kv key for one owner row, guild- or bot-scoped by `guild_id`.
pub fn owner_key(user_id: u64) -> String {
    format!("OWNER.{user_id}")
}

/// Persisted bot-owner ids (scope "0"). Mirrors `ownerTable.all()`.
/// Scans through `kv_scan_prefix` (C4: escaped LIKE, no raw SQL).
pub async fn stored_bot_owners(pool: &Pool) -> Vec<String> {
    kv_scan_prefix(pool, "0", "OWNER.")
        .await
        .into_iter()
        .map(|(k, _)| k)
        .filter_map(|k| k.strip_prefix("OWNER.").map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .collect()
}

/// Merged bot owners: config (`client.owners`) + persisted table.
/// Mirrors getBotOwner().
pub async fn bot_owner_ids(pool: &Pool, config_owners: &[String]) -> Vec<String> {
    let mut ids: Vec<String> = config_owners.to_vec();
    ids.extend(stored_bot_owners(pool).await);
    ids.sort();
    ids.dedup();
    ids
}

/// Stored guild-owner ids for one guild. Mirrors the `Object.keys(...`
/// `${guild.id}.OWNER`)` half of getGuildOwner(). Scans through
/// `kv_scan_prefix` (C4: escaped LIKE, no raw SQL).
pub async fn stored_guild_owners(pool: &Pool, guild_id: &str) -> Vec<String> {
    kv_scan_prefix(pool, guild_id, "OWNER.")
        .await
        .into_iter()
        .map(|(k, _)| k)
        .filter_map(|k| k.strip_prefix("OWNER.").map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .collect()
}

/// Merged guild owners: Discord `ownerId` + stored rows, deduped.
/// Mirrors getGuildOwner().
pub async fn guild_owner_ids(
    pool: &Pool,
    guild_id: &str,
    discord_owner_id: Option<u64>,
) -> Vec<String> {
    let mut ids = stored_guild_owners(pool, guild_id).await;
    if let Some(owner) = discord_owner_id {
        ids.push(owner.to_string());
    }
    ids.sort();
    ids.dedup();
    ids
}

/// Mirrors addGuildOwner (`set(`${guildId}.OWNER.${userId}`)`).
pub async fn add_guild_owner(pool: &Pool, guild_id: &str, user_id: u64) -> anyhow::Result<()> {
    kv_set(pool, guild_id, &owner_key(user_id), "{\"owner\":true}").await
}

/// Mirrors removeGuildOwner (`delete(`${guildId}.OWNER.${userId}`)`).
pub async fn remove_guild_owner(pool: &Pool, guild_id: &str, user_id: u64) -> anyhow::Result<()> {
    kv_del(pool, guild_id, &owner_key(user_id)).await
}

/// Mirrors addBotOwner (`ownerTable.set(userId, { owner: true })`).
pub async fn add_bot_owner(pool: &Pool, user_id: u64) -> anyhow::Result<()> {
    kv_set(pool, "0", &owner_key(user_id), "{\"owner\":true}").await
}

/// Mirrors removeBotOwner (`ownerTable.delete(userId)`).
pub async fn remove_bot_owner(pool: &Pool, user_id: u64) -> anyhow::Result<()> {
    kv_del(pool, "0", &owner_key(user_id)).await
}

/// Bot-level blacklist lookup. Mirrors blacklistTable.get (scope "0").
pub async fn is_blacklisted(pool: &Pool, user_id: u64) -> bool {
    crate::db::kv_get(
        pool,
        "0",
        &crate::commands::owner::main::blacklist_key(user_id),
    )
    .await
    .is_some()
}

/// Canonical per-guild language key. Mirrors the TS source of truth: the
/// flat-kv projection of `${guildId}.GUILD.LANG` (setserverlang.ts writes
/// the code here as a plain string; `getLanguageData` reads the same leaf
/// with an `en-US` fallback).
pub const GUILD_LANG_KEY: &str = "GUILD.LANG";

/// Mirrors getLanguageData(guildId): per-guild lang from the single kv
/// source of truth (`GUILD.LANG`), `en-US` fallback (C1/C2). Blank rows
/// fall back too, matching the TS `if (!lang)` guard.
pub async fn guild_lang(pool: &Pool, guild_id: Option<u64>) -> String {
    let Some(id) = guild_id else {
        return "en-US".to_string();
    };
    kv_get(pool, &id.to_string(), GUILD_LANG_KEY)
        .await
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "en-US".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn kv_roundtrip_and_overwrite() {
        let pool = memory_pool().await;
        assert_eq!(kv_get(&pool, "g1", "prefix").await, None);
        kv_set(&pool, "g1", "prefix", "!").await.unwrap();
        assert_eq!(kv_get(&pool, "g1", "prefix").await.as_deref(), Some("!"));
        kv_set(&pool, "g1", "prefix", "?").await.unwrap();
        assert_eq!(kv_get(&pool, "g1", "prefix").await.as_deref(), Some("?"));
    }

    #[tokio::test]
    async fn kv_is_scoped_per_guild() {
        let pool = memory_pool().await;
        kv_set(&pool, "g1", "k", "v1").await.unwrap();
        kv_set(&pool, "g2", "k", "v2").await.unwrap();
        assert_eq!(kv_get(&pool, "g1", "k").await.as_deref(), Some("v1"));
        assert_eq!(kv_get(&pool, "g2", "k").await.as_deref(), Some("v2"));
    }

    #[tokio::test]
    async fn backups_table_roundtrip_upsert_and_del() {
        let pool = memory_pool().await;
        ensure_backups_table(&pool).await.unwrap();
        assert_eq!(backup_get(&pool, "b1").await, None);
        backup_set(&pool, "b1", "{\"v\":1}").await.unwrap();
        assert_eq!(backup_get(&pool, "b1").await.as_deref(), Some("{\"v\":1}"));
        backup_set(&pool, "b1", "{\"v\":2}").await.unwrap();
        assert_eq!(backup_get(&pool, "b1").await.as_deref(), Some("{\"v\":2}"));
        backup_del(&pool, "b1").await.unwrap();
        assert_eq!(backup_get(&pool, "b1").await, None);
    }

    #[tokio::test]
    async fn schedule_table_scan_empty_without_table() {
        // Missing TS `schedule` table reads as empty, never an error.
        let pool = memory_pool().await;
        assert!(schedule_all(&pool).await.is_empty());
    }

    #[tokio::test]
    async fn schedule_table_roundtrip_upsert_and_del() {
        let pool = memory_pool().await;
        ensure_schedule_table(&pool).await.unwrap();
        assert!(schedule_all(&pool).await.is_empty());
        schedule_set(&pool, "9", "{\"A\":{\"title\":\"t\"}}")
            .await
            .unwrap();
        let rows = schedule_all(&pool).await;
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0.as_str(), "9");
        schedule_set(&pool, "9", "{\"A\":{\"title\":\"t2\"}}")
            .await
            .unwrap();
        assert_eq!(schedule_all(&pool).await.len(), 1);
        schedule_del(&pool, "9").await.unwrap();
        assert!(schedule_all(&pool).await.is_empty());
    }

    #[tokio::test]
    async fn guild_lang_defaults_to_en_us() {
        let pool = memory_pool().await;
        assert_eq!(guild_lang(&pool, None).await, "en-US");
        assert_eq!(guild_lang(&pool, Some(123)).await, "en-US");
    }

    #[tokio::test]
    async fn guild_lang_returns_stored_value() {
        // Single source (C1/C2): setlang persists kv GUILD.LANG, and
        // guild_lang reads that same row (no side table).
        let pool = memory_pool().await;
        assert_eq!(GUILD_LANG_KEY, "GUILD.LANG");
        kv_set(&pool, "456", GUILD_LANG_KEY, "fr-FR").await.unwrap();
        assert_eq!(guild_lang(&pool, Some(456)).await, "fr-FR");
    }

    #[tokio::test]
    async fn guild_lang_blank_row_falls_back() {
        // Mirrors the TS `if (!lang)` guard in getLanguageData.
        let pool = memory_pool().await;
        kv_set(&pool, "456", GUILD_LANG_KEY, "   ").await.unwrap();
        assert_eq!(guild_lang(&pool, Some(456)).await, "en-US");
    }

    #[tokio::test]
    async fn guild_lang_wipe_clears_row() {
        // Wipe path (C2): guild leave cleanup removes the lang row with
        // everything else; the compat clear does the targeted variant.
        let pool = memory_pool().await;
        kv_set(&pool, "456", GUILD_LANG_KEY, "fr-FR").await.unwrap();
        clear_guild_lang(&pool, "456").await.unwrap();
        assert_eq!(guild_lang(&pool, Some(456)).await, "en-US");
        kv_set(&pool, "456", GUILD_LANG_KEY, "fr-FR").await.unwrap();
        kv_del_guild(&pool, "456").await.unwrap();
        assert_eq!(guild_lang(&pool, Some(456)).await, "en-US");
    }

    #[tokio::test]
    async fn tbl_home_roundtrip_dual_store() {
        // Single home (C5): table-first reads see dual writes, and the
        // legacy kv row stays fresh for unmigrated readers.
        let pool = memory_pool().await;
        tbl_set(&pool, "g", "A.b", "1").await.unwrap();
        assert_eq!(tbl_get(&pool, "g", "A.b").await.as_deref(), Some("1"));
        assert_eq!(kv_get(&pool, "g", "A.b").await.as_deref(), Some("1"));
        tbl_del(&pool, "g", "A.b").await.unwrap();
        assert!(tbl_get(&pool, "g", "A.b").await.is_none());
        assert!(kv_get(&pool, "g", "A.b").await.is_none());
    }

    #[tokio::test]
    async fn guild_prefix_defaults_and_custom() {
        let pool = memory_pool().await;
        assert_eq!(guild_prefix(&pool, None, "?").await, "?");
        assert_eq!(guild_prefix(&pool, Some(1), "?").await, "?");
        kv_set(&pool, "1", PREFIX_KEY, "!").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(1), "?").await, "!");
    }

    #[tokio::test]
    async fn guild_prefix_migrates_legacy_key() {
        let pool = memory_pool().await;
        kv_set(&pool, "9", LEGACY_PREFIX_KEY, "!").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(9), "?").await, "!");
        assert_eq!(kv_get(&pool, "9", PREFIX_KEY).await.as_deref(), Some("!"));
        assert_eq!(kv_get(&pool, "9", LEGACY_PREFIX_KEY).await, None);
    }

    #[tokio::test]
    async fn guild_prefix_canonical_wins_over_legacy() {
        let pool = memory_pool().await;
        kv_set(&pool, "9", PREFIX_KEY, "?").await.unwrap();
        kv_set(&pool, "9", LEGACY_PREFIX_KEY, "!").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(9), "*").await, "?");
        assert_eq!(
            kv_get(&pool, "9", LEGACY_PREFIX_KEY).await.as_deref(),
            Some("!")
        );
    }

    #[test]
    fn prefix_cap_and_truncation_match_ts() {
        assert_eq!(PREFIX_KEY, "BOT.prefix");
        assert!(prefix_too_long("12345"));
        assert!(!prefix_too_long("1234"));
        assert!(!prefix_too_long("!"));
        assert_eq!(truncate_prefix("! extra words"), "!");
        assert_eq!(truncate_prefix("!"), "!");
        assert_eq!(truncate_prefix(""), "");
    }

    #[tokio::test]
    async fn mention_revert_clears_prefix() {
        let pool = memory_pool().await;
        set_guild_prefix(&pool, "5", "!").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(5), "?").await, "!");
        clear_guild_prefix(&pool, "5").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(5), "?").await, "?");
    }

    #[tokio::test]
    async fn owner_tables_merge_like_owner_helper() {
        let pool = memory_pool().await;
        assert_eq!(owner_key(7), "OWNER.7");
        add_guild_owner(&pool, "g", 7).await.unwrap();
        add_guild_owner(&pool, "g", 8).await.unwrap();
        let mut owners = guild_owner_ids(&pool, "g", Some(8)).await;
        owners.sort();
        assert_eq!(owners, vec!["7".to_string(), "8".to_string()]);
        remove_guild_owner(&pool, "g", 7).await.unwrap();
        assert_eq!(stored_guild_owners(&pool, "g").await, vec!["8".to_string()]);
        add_bot_owner(&pool, 42).await.unwrap();
        assert_eq!(
            bot_owner_ids(&pool, &["1".to_string()]).await,
            vec!["1".to_string(), "42".to_string()]
        );
        remove_bot_owner(&pool, 42).await.unwrap();
        assert_eq!(
            bot_owner_ids(&pool, &["1".to_string()]).await,
            vec!["1".to_string()]
        );
    }

    #[tokio::test]
    async fn blacklist_lookup() {
        let pool = memory_pool().await;
        assert!(!is_blacklisted(&pool, 9).await);
        kv_set(&pool, "0", "BLACKLIST.9", "spam").await.unwrap();
        assert!(is_blacklisted(&pool, 9).await);
    }

    #[tokio::test]
    async fn init_creates_tables_on_memory_db() {
        let cfg = Config {
            database_url: "sqlite::memory:".to_string(),
            ..Config::default()
        };
        let pool = init(&cfg).await.unwrap();
        kv_set(&pool, "g", "k", "v").await.unwrap();
        assert_eq!(kv_get(&pool, "g", "k").await.as_deref(), Some("v"));
    }

    #[tokio::test]
    async fn init_creates_missing_parent_dir() {
        let dir = std::env::temp_dir().join(format!("ihrz-db-test-{}", std::process::id()));
        let db = dir.join("sub").join("test.sqlite");
        let _ = std::fs::remove_dir_all(&dir);
        let cfg = Config {
            database_url: format!("sqlite:{}?mode=rwc", db.display()),
            ..Config::default()
        };
        let pool = init(&cfg).await.unwrap();
        kv_set(&pool, "g", "k", "v").await.unwrap();
        assert_eq!(kv_get(&pool, "g", "k").await.as_deref(), Some("v"));
        assert!(db.exists());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
