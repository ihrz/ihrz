// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/database (+ types/database_structure.d.ts).
//
// TS uses client.db.get()/set() over horizondb (sqlite default, mysql
// optional). The Rust port uses sqlx + sqlite by default with the same
// file (src/files/db.sqlite) so both implementations can share data
// during migration. Guild-scoped helpers keep the same key layout.

pub use sqlx::sqlite::SqlitePool;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;
use std::sync::Arc;

use crate::config::Config;

/// Bot-wide store handle. `Sqlite` is the local backend (default);
/// `Horizon` is the live HorizonDB backend selected by
/// `db_method = "horizondb"` (mirrors TS `database.method`, which
/// defaults to `"horizondb"`). Callers keep passing `&Pool` — every
/// helper below branches internally, so no call site changes.
#[derive(Clone)]
pub enum Pool {
    Sqlite(SqlitePool),
    Horizon(Arc<crate::horizon::HorizonClient>),
}

impl std::fmt::Debug for Pool {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Sqlite(_) => f.write_str("Pool::Sqlite(..)"),
            Self::Horizon(_) => f.write_str("Pool::Horizon(..)"),
        }
    }
}

/// Backend for `Backend::table()` routing: sqlite pool or shared live
/// HorizonDB client. Thin alias over `Backend::sqlite`, which branches on
/// the [`Pool`] leg internally (so horizon mode reads/writes through the
/// WS client).
pub fn backend_for(pool: &Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Require the sqlite leg (backends-table internals that only the
/// sqlite store serves: raw `kv` SQL in `backends.rs`).
fn sqlite_pool(pool: &Pool) -> Option<SqlitePool> {
    match pool {
        Pool::Sqlite(p) => Some(p.clone()),
        Pool::Horizon(_) => None,
    }
}

/// HorizonDB `json`-table view for one composed dotted key
/// (`"{scope}.{key}"`, the TS driver shape on `tables[0]`).
fn horizon_view(pool: &Pool) -> Option<crate::horizon::HorizonDb> {
    match pool {
        Pool::Horizon(c) => c.table("json").ok(),
        Pool::Sqlite(_) => None,
    }
}

/// HorizonDB view over a named horizon table (`backups`, `schedule` —
/// the TS `tables` entries the sqlite port keeps as separate tables).
fn horizon_table(pool: &Pool, name: &str) -> Option<crate::horizon::HorizonDb> {
    match pool {
        Pool::Horizon(c) => c.table(name).ok(),
        Pool::Sqlite(_) => None,
    }
}

/// Encode sqlite TEXT into a HorizonDB value: JSON text parses to its
/// value, anything else stays a plain string (mirrors the
/// `serde_json::from_str(..).unwrap_or(Value::String)` codec in
/// `SqliteBackend::get`).
fn horizon_encode(text: &str) -> serde_json::Value {
    serde_json::from_str(text).unwrap_or(serde_json::Value::String(text.to_string()))
}

/// Decode a HorizonDB value back to sqlite TEXT (same shape as
/// `table_string`: plain strings stay plain, numbers render bare,
/// anything else renders compact JSON).
fn horizon_decode(v: &serde_json::Value) -> String {
    table_string(v)
}

/// Composed wire key for the shared horizon tables.
fn horizon_key(scope: &str, key: &str) -> String {
    format!("{scope}.{key}")
}

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
    if matches!(
        cfg.db_method.to_lowercase().as_str(),
        "horizondb" | "horizon" | "ihrzdb"
    ) {
        // Live HorizonDB (mirrors the `horizondb` arm of
        // `initializeDatabase` in `src/core/database/index.ts`,
        // including the throw when `horizon_db` is unconfigured).
        let parts = cfg
            .horizon_db
            .as_ref()
            .filter(|h| !h.host.trim().is_empty())
            .ok_or_else(|| {
                anyhow::anyhow!(
                "horizon_db configuration is required when using the 'horizondb' database method"
            )
            })?;
        let url = cfg
            .horizondb_endpoint()
            .unwrap_or_else(|| "ws://127.0.0.1:8080".to_string());
        let client = crate::horizon::HorizonClient::new(
            url.clone(),
            Some(parts.login.clone()).filter(|s| !s.is_empty()),
            Some(parts.password.clone()).filter(|s| !s.is_empty()),
            parts.request_timeout_ms,
        );
        // Construction dials nothing (first op connects, like the TS
        // SDK), so boot never fails on a down server at startup.
        tracing::info!("db: connected (horizondb) {url}");
        return Ok(Pool::Horizon(Arc::new(client)));
    }
    if cfg.db_method.to_lowercase() != "sqlite" {
        tracing::warn!(
            "db: method `{}` is not ported, using local sqlite {}",
            cfg.db_method,
            cfg.database_url
        );
    }
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

    // Boot visibility, mirrors TS `Connected to the database (method)!`
    // (`src/core/database/index.ts`). Only the sqlite backend is ported
    // (KEPT DIVERGENT H19 in config.rs): a non-sqlite `db_method` is
    // recorded but sqlite still serves — warn so a `horizondb` setting
    // is never mistaken for a live HorizonDB connection.
    if cfg.db_method != "sqlite" {
        tracing::warn!(
            "db: method `{}` is not ported, using local sqlite {}",
            cfg.db_method,
            cfg.database_url
        );
    } else {
        tracing::info!("db: connected (sqlite) {}", cfg.database_url);
    }

    Ok(Pool::Sqlite(pool))
}

pub async fn kv_get(pool: &Pool, guild_id: &str, key: &str) -> Option<String> {
    if let Some(view) = horizon_view(pool) {
        return view
            .get(&horizon_key(guild_id, key))
            .await
            .ok()
            .flatten()
            .map(|v| horizon_decode(&v));
    }
    let pool = sqlite_pool(pool)?;
    sqlx::query_scalar::<_, String>("SELECT value FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(key)
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
}

pub async fn kv_set(pool: &Pool, guild_id: &str, key: &str, value: &str) -> anyhow::Result<()> {
    if let Some(view) = horizon_view(pool) {
        view.set(&horizon_key(guild_id, key), horizon_encode(value))
            .await
            .map_err(|e| anyhow::anyhow!("horizondb set failed: {e}"))?;
        return Ok(());
    }
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query(
        "INSERT INTO kv (guild_id, key_name, value) VALUES (?, ?, ?)
         ON CONFLICT (guild_id, key_name) DO UPDATE SET value = excluded.value",
    )
    .bind(guild_id)
    .bind(key)
    .bind(value)
    .execute(&pool)
    .await?;
    Ok(())
}

pub async fn kv_del(pool: &Pool, guild_id: &str, key: &str) -> anyhow::Result<()> {
    if let Some(view) = horizon_view(pool) {
        view.delete(&horizon_key(guild_id, key))
            .await
            .map_err(|e| anyhow::anyhow!("horizondb delete failed: {e}"))?;
        return Ok(());
    }
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(key)
        .execute(&pool)
        .await?;
    Ok(())
}

/// All `(key, value)` rows for one guild. Driver-only scan primitive —
/// callers must use this (or `kv_scan_prefix`) instead of raw SQL.
pub async fn kv_scan(pool: &Pool, guild_id: &str) -> Vec<(String, String)> {
    if let Some(view) = horizon_view(pool) {
        let prefix = format!("{guild_id}.");
        return view
            .all()
            .await
            .unwrap_or_default()
            .into_iter()
            .filter_map(|e| {
                e.id.strip_prefix(&prefix)
                    .map(|k| (k.to_string(), horizon_decode(&e.value)))
            })
            .collect();
    }
    let Some(pool) = sqlite_pool(pool) else {
        return Vec::new();
    };
    sqlx::query_as::<_, (String, String)>("SELECT key_name, value FROM kv WHERE guild_id = ?")
        .bind(guild_id)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
}

/// `(key, value)` rows under `prefix` for one guild (SQL LIKE, `%`/`_`
/// in the prefix are escaped).
pub async fn kv_scan_prefix(pool: &Pool, guild_id: &str, prefix: &str) -> Vec<(String, String)> {
    if let Some(view) = horizon_view(pool) {
        let full = format!("{guild_id}.{prefix}");
        return view
            .all()
            .await
            .unwrap_or_default()
            .into_iter()
            .filter_map(|e| {
                e.id.strip_prefix(&full)
                    .map(|k| (format!("{prefix}{k}"), horizon_decode(&e.value)))
            })
            .collect();
    }
    let Some(pool) = sqlite_pool(pool) else {
        return Vec::new();
    };
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
    .fetch_all(&pool)
    .await
    .unwrap_or_default()
}

/// Delete every row under `prefix` for one guild.
pub async fn kv_del_prefix(pool: &Pool, guild_id: &str, prefix: &str) -> anyhow::Result<()> {
    if horizon_view(pool).is_some() {
        for (k, _) in kv_scan_prefix(pool, guild_id, prefix).await {
            kv_del(pool, guild_id, &k).await?;
        }
        return Ok(());
    }
    let Some(pool) = sqlite_pool(pool) else {
        return Ok(());
    };
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
        .execute(&pool)
        .await?;
    Ok(())
}

/// Cross-guild `(guild_id, key, value)` scan. Driver-only primitive for
/// sweeps (authrestore, giveaway boards) — never raw SQL at call sites.
pub async fn kv_scan_all(pool: &Pool) -> Vec<(String, String, String)> {
    if let Some(view) = horizon_view(pool) {
        return view
            .all()
            .await
            .unwrap_or_default()
            .into_iter()
            .filter_map(|e| {
                e.id.split_once('.')
                    .map(|(g, k)| (g.to_string(), k.to_string(), horizon_decode(&e.value)))
            })
            .collect();
    }
    let Some(pool) = sqlite_pool(pool) else {
        return Vec::new();
    };
    sqlx::query_as::<_, (String, String, String)>("SELECT guild_id, key_name, value FROM kv")
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
}

/// Delete every row of one guild (leave-cleanup / wipe paths).
pub async fn kv_del_guild(pool: &Pool, guild_id: &str) -> anyhow::Result<()> {
    if horizon_view(pool).is_some() {
        let prefix = format!("{guild_id}.");
        let ids: Vec<String> = horizon_view(pool)
            .expect("checked")
            .all()
            .await
            .unwrap_or_default()
            .into_iter()
            .filter_map(|e| e.id.strip_prefix(&prefix).map(str::to_string))
            .collect();
        for k in ids {
            kv_del(pool, guild_id, &k).await?;
        }
        return Ok(());
    }
    let Some(pool) = sqlite_pool(pool) else {
        return Ok(());
    };
    sqlx::query("DELETE FROM kv WHERE guild_id = ?")
        .bind(guild_id)
        .execute(&pool)
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
    backend_for(pool)
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
    if let Some(view) = horizon_table(pool, "backups") {
        return view
            .get(backup_id)
            .await
            .ok()
            .flatten()
            .map(|v| horizon_decode(&v));
    }
    let pool = sqlite_pool(pool)?;
    sqlx::query_scalar::<_, String>("SELECT json FROM backups WHERE ID = ?")
        .bind(backup_id)
        .fetch_optional(&pool)
        .await
        .ok()
        .flatten()
}

/// Delete a TS `backups`-table row by global backup ID. Auto-creates the
/// table first (C18: delete paths must not fail on a fresh database where
/// no backup was ever written); missing row stays a no-op.
pub async fn backup_del(pool: &Pool, backup_id: &str) -> anyhow::Result<()> {
    if let Some(view) = horizon_table(pool, "backups") {
        view.delete(backup_id)
            .await
            .map_err(|e| anyhow::anyhow!("horizondb backup delete failed: {e}"))?;
        return Ok(());
    }
    ensure_backups_table(pool).await?;
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query("DELETE FROM backups WHERE ID = ?")
        .bind(backup_id)
        .execute(&pool)
        .await?;
    Ok(())
}

/// Write a TS `backups`-table row (ID = backupID, `json` = bare
/// BackupData). Missing table -> error (callers/tests create it via
/// `ensure_backups_table`).
pub async fn backup_set(pool: &Pool, backup_id: &str, json: &str) -> anyhow::Result<()> {
    if let Some(view) = horizon_table(pool, "backups") {
        view.set(backup_id, horizon_encode(json))
            .await
            .map_err(|e| anyhow::anyhow!("horizondb backup set failed: {e}"))?;
        return Ok(());
    }
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query(
        "INSERT INTO backups (ID, json) VALUES (?, ?)
         ON CONFLICT (ID) DO UPDATE SET json = excluded.json",
    )
    .bind(backup_id)
    .bind(json)
    .execute(&pool)
    .await?;
    Ok(())
}

/// Create the TS `backups` table when missing (tests + first use).
/// No-op on HorizonDB (schemaless).
pub async fn ensure_backups_table(pool: &Pool) -> anyhow::Result<()> {
    if horizon_table(pool, "backups").is_some() {
        return Ok(());
    }
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query("CREATE TABLE IF NOT EXISTS backups (ID TEXT PRIMARY KEY, json TEXT)")
        .execute(&pool)
        .await?;
    Ok(())
}

/// TS `schedule`-table scan (global, keyed by user ID). Rows hold
/// `{code: {title, description, expired}}` via `scheduleTable.set(`
/// `` `${user.id}.${scheduleCode}` `` `, ...)` in schedule.ts.
/// Missing table -> empty (never an error). Precedent: the
/// `ts_backups_table_get` compat read over the TS `backups` table.
pub async fn schedule_all(pool: &Pool) -> Vec<(String, String)> {
    if let Some(view) = horizon_table(pool, "schedule") {
        return view
            .all()
            .await
            .unwrap_or_default()
            .into_iter()
            .map(|e| (e.id, horizon_decode(&e.value)))
            .collect();
    }
    let Some(pool) = sqlite_pool(pool) else {
        return Vec::new();
    };
    sqlx::query_as::<_, (String, String)>("SELECT ID, json FROM schedule")
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
}

/// Write one TS `schedule`-table row (sweep expiry cleanup only;
/// schedule writes stay per-guild). Missing table -> error
/// (callers/tests create it via `ensure_schedule_table`).
pub async fn schedule_set(pool: &Pool, user_id: &str, json: &str) -> anyhow::Result<()> {
    if let Some(view) = horizon_table(pool, "schedule") {
        view.set(user_id, horizon_encode(json))
            .await
            .map_err(|e| anyhow::anyhow!("horizondb schedule set failed: {e}"))?;
        return Ok(());
    }
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query(
        "INSERT INTO schedule (ID, json) VALUES (?, ?)
         ON CONFLICT (ID) DO UPDATE SET json = excluded.json",
    )
    .bind(user_id)
    .bind(json)
    .execute(&pool)
    .await?;
    Ok(())
}

/// Delete one TS `schedule`-table row by user ID. Auto-creates the table
/// first (C18: sweep deletes must not fail when the table was never
/// written, e.g. first boot with no schedules).
pub async fn schedule_del(pool: &Pool, user_id: &str) -> anyhow::Result<()> {
    if let Some(view) = horizon_table(pool, "schedule") {
        view.delete(user_id)
            .await
            .map_err(|e| anyhow::anyhow!("horizondb schedule delete failed: {e}"))?;
        return Ok(());
    }
    ensure_schedule_table(pool).await?;
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query("DELETE FROM schedule WHERE ID = ?")
        .bind(user_id)
        .execute(&pool)
        .await?;
    Ok(())
}

/// Create the TS `schedule` table when missing (tests + first sweep).
/// No-op on HorizonDB (schemaless).
pub async fn ensure_schedule_table(pool: &Pool) -> anyhow::Result<()> {
    if horizon_table(pool, "schedule").is_some() {
        return Ok(());
    }
    let pool = sqlite_pool(pool).ok_or_else(|| anyhow::anyhow!("sqlite pool required"))?;
    sqlx::query("CREATE TABLE IF NOT EXISTS schedule (ID TEXT PRIMARY KEY, json TEXT)")
        .execute(&pool)
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
    Pool::Sqlite(pool)
}

pub async fn guild_prefix(pool: &Pool, guild_id: Option<u64>, default: &str) -> String {
    let Some(gid) = guild_id else {
        return default.to_string();
    };
    migrate_prefix_key(pool, &gid.to_string()).await;
    crate::db::kv_get(pool, &gid.to_string(), PREFIX_KEY)
        .await
        // JS-falsy check (`!custom_prefix` in prefix.ts): only the empty
        // string falls back. Whitespace-only rows (" ", "\t") are truthy
        // and stay verbatim (node ground truth), so no trim() here.
        .filter(|p| !p.is_empty())
        .unwrap_or_else(|| default.to_string())
}

/// Pure `guildPrefix` decision (src/core/functions/prefix.ts:24-40).
/// Returns the prefix string plus the mention flag (`type === "mention"`).
/// Legs, in TS order: a non-empty custom row wins verbatim (even
/// whitespace-only — truthy in JS); otherwise the mention fallback
/// `<@{bot_id}>` when enabled, else the configured default; a falsy
/// outcome (empty default, flag off) falls back to `<@{bot_id}>` via
/// the trailing `||`. `is_mention` is the substring test
/// (`prefix_string.includes(client.user.id)`), so a custom prefix that
/// merely contains the bot id also counts as mention.
pub fn resolve_guild_prefix(
    custom: Option<&str>,
    mention_enabled: bool,
    default_prefix: &str,
    bot_id: u64,
) -> (String, bool) {
    let mention = format!("<@{bot_id}>");
    let candidate = match custom.filter(|c| !c.is_empty()) {
        Some(c) => c.to_string(),
        None if mention_enabled => mention.clone(),
        None => default_prefix.to_string(),
    };
    let resolved = if candidate.is_empty() {
        mention.clone()
    } else {
        candidate
    };
    let is_mention = resolved.contains(&bot_id.to_string());
    (resolved, is_mention)
}

/// Display resolution for error/help embeds: migration + raw custom row
/// through [`resolve_guild_prefix`]. Dispatch (`dynamic_prefix`) keeps
/// using [`guild_prefix`] unchanged.
pub async fn guild_prefix_display(
    pool: &Pool,
    guild_id: Option<u64>,
    default: &str,
    mention_enabled: bool,
    bot_id: u64,
) -> (String, bool) {
    let Some(gid) = guild_id else {
        return resolve_guild_prefix(None, mention_enabled, default, bot_id);
    };
    migrate_prefix_key(pool, &gid.to_string()).await;
    let custom = crate::db::kv_get(pool, &gid.to_string(), PREFIX_KEY).await;
    resolve_guild_prefix(custom.as_deref(), mention_enabled, default, bot_id)
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
/// !prefix.ts: JS `.length` counts UTF-16 code units, so astral
/// characters (surrogate pairs) count 2 here too. 4 units max.
pub fn prefix_too_long(prefix: &str) -> bool {
    prefix.encode_utf16().count() >= 5
}

// ---- ownerHelper (kv-backed tables) ----
// Mirrors src/core/functions/ownerHelper.ts. Guild owners live under
// `${guildId}.OWNER.${userId}` (kv: guild_id + `OWNER.<uid>`); bot owners
// merge the config list (`client.owners`) with the persisted owner table
// (TS `owner` table, bare-uid rows; legacy kv mirror at scope "0",
// `OWNER.<uid>`).

/// TS `owner`-table handle. Bare-uid rows (`ownerTable.set(userId,
/// { owner: true })`), TS-exact layout.
pub const OWNER_TABLE: &str = "owner";

/// `owner`-table backend over the sqlite kv store (same `tbl:<table>`
/// emulation as `guild_table_backend`). Returns the owned backend like
/// `guild_table_backend` (callers bind it before `.table()`).
fn owner_backend(pool: &Pool) -> crate::backends::Backend {
    backend_for(pool)
}

/// kv key for one owner row, guild- or bot-scoped by `guild_id`.
pub fn owner_key(user_id: u64) -> String {
    format!("OWNER.{user_id}")
}

/// Persisted bot-owner ids: the `owner` table (bare-uid rows, TS-exact)
/// merged with the legacy kv mirror (scope "0", `OWNER.<uid>`).
/// Table wins on conflict by construction (same id set, deduped).
/// Scans through `kv_scan_prefix` (C4: escaped LIKE, no raw SQL).
pub async fn stored_bot_owners(pool: &Pool) -> Vec<String> {
    let backend = owner_backend(pool);
    let mut ids: Vec<String> = backend
        .table(OWNER_TABLE)
        .all()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| row.id)
        .filter(|s| !s.is_empty())
        .collect();
    ids.extend(
        kv_scan_prefix(pool, "0", "OWNER.")
            .await
            .into_iter()
            .map(|(k, _)| k)
            .filter_map(|k| k.strip_prefix("OWNER.").map(|s| s.to_string()))
            .filter(|s| !s.is_empty()),
    );
    ids.sort();
    ids.dedup();
    ids
}

/// Merged bot owners: config (`client.owners`) + persisted table.
/// Mirrors getBotOwner (`[...new Set([...client.owners, ...tableIds])]`):
/// config first, stored after, first-occurrence dedup, no sort.
pub async fn bot_owner_ids(pool: &Pool, config_owners: &[String]) -> Vec<String> {
    let mut ids: Vec<String> = Vec::with_capacity(config_owners.len());
    for id in config_owners
        .iter()
        .cloned()
        .chain(stored_bot_owners(pool).await)
    {
        if !ids.contains(&id) {
            ids.push(id);
        }
    }
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
/// Mirrors getGuildOwner (`[...new Set([ownerId, ...Object.keys(row)])]`):
/// Discord owner first, stored rows (insertion order — the scan has no
/// ORDER BY, so SQLite walks rowid order like TS `Object.keys`) after,
/// first-occurrence dedup, no sort (TS never sorts; the owner-list
/// embed renders this exact order).
pub async fn guild_owner_ids(
    pool: &Pool,
    guild_id: &str,
    discord_owner_id: Option<u64>,
) -> Vec<String> {
    let mut ids: Vec<String> = Vec::new();
    if let Some(owner) = discord_owner_id {
        ids.push(owner.to_string());
    }
    for id in stored_guild_owners(pool, guild_id).await {
        if !ids.contains(&id) {
            ids.push(id);
        }
    }
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
/// Dual-write (keys unchanged): the `owner`-table row (bare uid, TS-exact
/// layout) is primary and the legacy kv row (`OWNER.<uid>` @ scope "0")
/// keeps kv readers fresh.
pub async fn add_bot_owner(pool: &Pool, user_id: u64) -> anyhow::Result<()> {
    kv_set(pool, "0", &owner_key(user_id), "{\"owner\":true}").await?;
    let backend = owner_backend(pool);
    let _ = backend
        .table(OWNER_TABLE)
        .set(&user_id.to_string(), serde_json::json!({ "owner": true }))
        .await;
    Ok(())
}

/// Mirrors removeBotOwner (`ownerTable.delete(userId)`). Clears both
/// stores (keys unchanged).
pub async fn remove_bot_owner(pool: &Pool, user_id: u64) -> anyhow::Result<()> {
    let backend = owner_backend(pool);
    let _ = backend
        .table(OWNER_TABLE)
        .delete(&user_id.to_string())
        .await;
    kv_del(pool, "0", &owner_key(user_id)).await
}

/// Bot-level blacklist lookup. Routed read (table-first with legacy kv
/// fallback, like `blacklistTable.get`): table-only rows stay visible to
/// the join/message guards, matching `bl_get`/`bl_list`.
pub async fn is_blacklisted(pool: &Pool, user_id: u64) -> bool {
    crate::commands::owner::main::bl_raw(pool, user_id)
        .await
        .is_some()
}

/// Canonical per-guild language key. Mirrors the TS source of truth:
/// `${guildId}.GUILD.LANG` holds the `{ lang: code }` object
/// (setserverlang.ts writes `{ lang: selectedLang }`; `getLanguageData`
/// reads the `.lang` leaf with an `en-US` fallback). Legacy bare-string
/// rows (`fr-FR`, written by earlier Rust builds) stay readable via
/// `parse_lang_value`.
pub const GUILD_LANG_KEY: &str = "GUILD.LANG";

/// Normalize a stored `GUILD.LANG` value to a language code. Accepts the
/// TS `{ lang: code }` object shape (stored as JSON text) and legacy
/// bare-string rows; blank/empty-`lang` values read as `None` so callers
/// fall back to `en-US` (mirrors the TS `if (!lang)` guard).
pub fn parse_lang_value(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
        match &v {
            serde_json::Value::Object(map) => {
                return map
                    .get("lang")
                    .and_then(|l| l.as_str())
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());
            }
            serde_json::Value::String(s) => {
                let s = s.trim();
                if !s.is_empty() {
                    return Some(s.to_string());
                }
                return None;
            }
            _ => {}
        }
    }
    Some(trimmed.to_string())
}

/// Mirrors getLanguageData(guildId): per-guild lang from the single kv
/// source of truth (`GUILD.LANG`), `en-US` fallback (C1/C2). Both the TS
/// `{ lang: code }` object shape and legacy bare-string rows resolve;
/// blank rows fall back too, matching the TS `if (!lang)` guard.
pub async fn guild_lang(pool: &Pool, guild_id: Option<u64>) -> String {
    let Some(id) = guild_id else {
        return "en-US".to_string();
    };
    kv_get(pool, &id.to_string(), GUILD_LANG_KEY)
        .await
        .and_then(|s| parse_lang_value(&s))
        .unwrap_or_else(|| "en-US".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn horizon_value_codec_roundtrips_ts_shapes() {
        // `horizon_encode`: valid JSON parses, anything else becomes a
        // JSON string. `horizon_decode` inverts via `table_string`
        // (plain strings stay plain, numbers render bare).
        use serde_json::{json, Value};
        assert_eq!(horizon_encode("!"), Value::String("!".to_string()));
        assert_eq!(horizon_encode("{\"a\":1}"), json!({"a": 1}));
        assert_eq!(horizon_encode("42"), json!(42));
        assert_eq!(horizon_decode(&Value::String("!".to_string())), "!");
        assert_eq!(horizon_decode(&json!({"a": 1})), "{\"a\":1}");
        assert_eq!(horizon_decode(&json!(42)), "42");
        for raw in ["!", "{\"a\":1}", "42", "true", "plain-not-json", ""] {
            let wire = horizon_encode(raw);
            assert_eq!(horizon_decode(&wire), raw, "roundtrip of {raw:?}");
        }
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
    async fn guild_lang_reads_ts_object_shape() {
        // TS interop: setserverlang.ts writes `{ lang: code }`, read via
        // the `.lang` leaf (getLanguageData.ts). The object shape resolves
        // to the leaf code.
        let pool = memory_pool().await;
        kv_set(&pool, "456", GUILD_LANG_KEY, "{\"lang\":\"fr-FR\"}")
            .await
            .unwrap();
        assert_eq!(guild_lang(&pool, Some(456)).await, "fr-FR");
    }

    #[test]
    fn parse_lang_value_covers_both_shapes() {
        // Bare-string rows (legacy Rust writes) pass through.
        assert_eq!(parse_lang_value("fr-FR").as_deref(), Some("fr-FR"));
        assert_eq!(parse_lang_value("  de-DE  ").as_deref(), Some("de-DE"));
        // TS `{ lang: code }` object shape resolves via the leaf.
        assert_eq!(
            parse_lang_value("{\"lang\":\"fr-FR\"}").as_deref(),
            Some("fr-FR")
        );
        assert_eq!(
            parse_lang_value(" { \"lang\" : \"jp-JP\" } ").as_deref(),
            Some("jp-JP")
        );
        // Blank / empty-leaf values read as missing (en-US fallback).
        assert_eq!(parse_lang_value(""), None);
        assert_eq!(parse_lang_value("   "), None);
        assert_eq!(parse_lang_value("{\"lang\":\"\"}"), None);
        assert_eq!(parse_lang_value("{\"lang\":\"   \"}"), None);
        assert_eq!(parse_lang_value("{}"), None);
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
    async fn guild_prefix_keeps_whitespace_custom_like_js_falsy() {
        // `!custom_prefix`: only "" falls back; " " and "\t" are truthy
        // and stay verbatim (node ground truth on prefix.ts).
        let pool = memory_pool().await;
        kv_set(&pool, "1", PREFIX_KEY, " ").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(1), "?").await, " ");
        kv_set(&pool, "2", PREFIX_KEY, "\t").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(2), "?").await, "\t");
        kv_set(&pool, "3", PREFIX_KEY, "").await.unwrap();
        assert_eq!(guild_prefix(&pool, Some(3), "?").await, "?");
    }

    #[test]
    fn resolve_guild_prefix_matches_ts_guild_prefix() {
        // Node ground-truth battery on prefix.ts (bot id 123456789).
        const ID: u64 = 123456789;
        const M: &str = "<@123456789>";
        // No custom, flag off -> default.
        assert_eq!(
            resolve_guild_prefix(None, false, "!", ID),
            ("!".to_string(), false)
        );
        // No custom, flag on -> mention string + mention type.
        assert_eq!(
            resolve_guild_prefix(None, true, "!", ID),
            (M.to_string(), true)
        );
        // Empty custom behaves like missing (config branch).
        assert_eq!(
            resolve_guild_prefix(Some(""), false, "!", ID),
            ("!".to_string(), false)
        );
        assert_eq!(
            resolve_guild_prefix(Some(""), true, "!", ID),
            (M.to_string(), true)
        );
        // Whitespace-only customs stay verbatim, prefix type.
        assert_eq!(
            resolve_guild_prefix(Some(" "), false, "!", ID),
            (" ".to_string(), false)
        );
        assert_eq!(
            resolve_guild_prefix(Some("\t"), false, "!", ID),
            ("\t".to_string(), false)
        );
        // Normal custom wins verbatim.
        assert_eq!(
            resolve_guild_prefix(Some("?"), false, "!", ID),
            ("?".to_string(), false)
        );
        // Custom containing the id counts as mention (substring includes).
        assert_eq!(
            resolve_guild_prefix(Some("!bot123456789"), false, "!", ID),
            ("!bot123456789".to_string(), true)
        );
        // Falsy outcome (empty default, flag off) falls back to mention.
        assert_eq!(
            resolve_guild_prefix(None, false, "", ID),
            (M.to_string(), true)
        );
        // "0" is a truthy string, kept verbatim.
        assert_eq!(
            resolve_guild_prefix(Some("0"), false, "!", ID),
            ("0".to_string(), false)
        );
    }

    #[tokio::test]
    async fn guild_prefix_display_resolves_mention_string() {
        let pool = memory_pool().await;
        // Mention guild: no row + flag on -> mention string, mention type.
        assert_eq!(
            guild_prefix_display(&pool, Some(1), "!", true, 7).await,
            ("<@7>".to_string(), true)
        );
        // Same guild with a custom row -> verbatim, prefix type.
        kv_set(&pool, "1", PREFIX_KEY, "?").await.unwrap();
        assert_eq!(
            guild_prefix_display(&pool, Some(1), "!", true, 7).await,
            ("?".to_string(), false)
        );
        // DM (no guild): config branch like the TS "undefined" lookup.
        assert_eq!(
            guild_prefix_display(&pool, None, "!", false, 7).await,
            ("!".to_string(), false)
        );
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
        // JS `.length` counts UTF-16 units: an astral char is 2 units.
        assert!(!prefix_too_long("😀😀"));
        assert!(prefix_too_long("😀😀😀"));
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
        // TS `[...new Set([ownerId, ...keys])]`: Discord owner first,
        // stored rows in insertion order, no sort.
        assert_eq!(
            guild_owner_ids(&pool, "g", Some(8)).await,
            vec!["8".to_string(), "7".to_string()]
        );
        assert_eq!(
            guild_owner_ids(&pool, "g", Some(9)).await,
            vec!["9".to_string(), "7".to_string(), "8".to_string()]
        );
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
    async fn bot_owner_table_leg_matches_ts_layout() {
        // TS `ownerTable.set(userId, { owner: true })`: bare-uid row in the
        // `owner` table. A TS-shaped row must surface in stored/bot ids,
        // and remove must clear both legs.
        let pool = memory_pool().await;
        assert_eq!(OWNER_TABLE, "owner");
        crate::db::backend_for(&pool)
            .table(OWNER_TABLE)
            .set("77", serde_json::json!({ "owner": true }))
            .await
            .unwrap();
        assert_eq!(stored_bot_owners(&pool).await, vec!["77".to_string()]);
        assert_eq!(
            bot_owner_ids(&pool, &["1".to_string()]).await,
            vec!["1".to_string(), "77".to_string()]
        );
        remove_bot_owner(&pool, 77).await.unwrap();
        assert!(stored_bot_owners(&pool).await.is_empty());
        assert_eq!(kv_get(&pool, "0", &owner_key(77)).await, None);
    }

    #[tokio::test]
    async fn bot_owner_dual_write_keeps_kv_mirror() {
        // Rust writes populate the TS-exact table row AND the legacy kv
        // mirror, so kv readers and table readers agree either way.
        let pool = memory_pool().await;
        add_bot_owner(&pool, 42).await.unwrap();
        assert_eq!(
            kv_get(&pool, "0", &owner_key(42)).await.as_deref(),
            Some("{\"owner\":true}")
        );
        let v: Option<serde_json::Value> = owner_backend(&pool)
            .table(OWNER_TABLE)
            .get("42")
            .await
            .unwrap();
        assert_eq!(v, Some(serde_json::json!({ "owner": true })));
        assert_eq!(stored_bot_owners(&pool).await, vec!["42".to_string()]);
        remove_bot_owner(&pool, 42).await.unwrap();
        assert!(stored_bot_owners(&pool).await.is_empty());
    }

    #[tokio::test]
    async fn blacklist_lookup() {
        let pool = memory_pool().await;
        assert!(!is_blacklisted(&pool, 9).await);
        kv_set(&pool, "0", "BLACKLIST.9", "spam").await.unwrap();
        assert!(is_blacklisted(&pool, 9).await);
    }

    #[tokio::test]
    async fn blacklist_lookup_sees_table_only_rows() {
        // Routed read: a row planted table-only (no legacy kv mirror)
        // stays visible to the join/message guard, matching bl_get.
        let pool = memory_pool().await;
        assert!(!is_blacklisted(&pool, 11).await);
        crate::commands::owner::main::tbl_set(
            &pool,
            crate::commands::owner::main::BLACKLIST_TABLE,
            "BLACKLIST.11",
            "spam",
        )
        .await
        .unwrap();
        assert!(is_blacklisted(&pool, 11).await);
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

    #[tokio::test]
    async fn init_horizondb_returns_horizon_without_dialing() {
        // Offline: nothing listens on 127.0.0.1:1, so a successful
        // `init` proves construction dials nothing (first op connects,
        // like the TS SDK).
        let cfg = Config {
            db_method: "horizondb".to_string(),
            horizon_db: Some(crate::config::HorizonDbParts {
                host: "127.0.0.1".to_string(),
                port: 1,
                ..Default::default()
            }),
            ..Config::default()
        };
        let pool = init(&cfg).await.unwrap();
        assert!(matches!(pool, Pool::Horizon(_)));
    }
}
