#[allow(unused_imports)]
use super::entry::*;

pub fn blacklist_key(user_id: u64) -> String {
    format!("BLACKLIST.{user_id}")
}

// ---- U-D3-NAMEDTABLES: table-handle routing core ----
// Mirrors the TS `db.table(name)` handles from Events/client/ready.ts
// via `crate::backends::Backend` — the D1 pattern the sibling units
// already use (`Backend::sqlite(pool).table(scope)`, keys unchanged,
// table-first read with legacy kv fallback).
//
// Writes go to BOTH the table handle and legacy kv (dual-write). The
// siblings write table-only, but these tables still have readers in
// files this unit cannot touch (scheduler sweeps, button handlers and
// loaders in locked mod.rs files, db.rs gates, the member-join guard):
// dual-write keeps those readers correct while the table handle
// becomes the primary store. Reads prefer the table and fall back to
// legacy kv, promoting hits so rows migrate lazily. Deletes clear
// both stores.

/// Bot-global legacy scope, mirrors the kv `guild_id = "0"` rows.
pub const GLOBAL_SCOPE: &str = "0";

/// Table-handle backend over the sqlite kv store. Mirrors the
/// `guild_backend` helper in the sibling units.
pub fn table_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-handle read as plain text. Values written via `tbl_set` keep
/// their JSON shape in store, so this returns the canonical text form:
/// JSON docs/numbers/bools re-serialized, pre-encoded JSON strings
/// decoded once (`"\"PANEL\""` reads back as `PANEL`). Callers that need
/// the exact stored bytes (pre-encoded markers) must go through
/// `decode_stored_string`, which accepts both the decoded and the
/// legacy quoted form.
pub async fn tbl_get(pool: &crate::db::Pool, table: &str, key: &str) -> Option<String> {
    let backend = table_backend(pool);
    let v: serde_json::Value = backend.table(table).get(key).await.ok()??;
    match v {
        serde_json::Value::String(s) => Some(s),
        other => serde_json::to_string(&other).ok(),
    }
}

/// Decode a stored string that may be a pre-encoded JSON string
/// (`marker_value` output): the table store decodes once on write while
/// legacy kv keeps the quoted bytes, so accept both forms.
pub fn decode_stored_string(raw: &str) -> String {
    serde_json::from_str::<String>(raw).unwrap_or_else(|_| raw.to_string())
}

/// Table-handle read as a JSON doc, for walking nested dotted-key
/// roots (`SCHEDULE`, `GIVEAWAY`, `BACKUP`).
pub async fn tbl_get_value(
    pool: &crate::db::Pool,
    table: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = table_backend(pool);
    backend
        .table(table)
        .get::<serde_json::Value>(key)
        .await
        .ok()
        .flatten()
}

/// All rows of one table handle. Used for cross-scope bulk loops
/// (the authrestore secret scan over the global table).
pub async fn tbl_all(pool: &crate::db::Pool, table: &str) -> Vec<(String, serde_json::Value)> {
    let backend = table_backend(pool);
    backend
        .table(table)
        .all()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| (row.id, row.value))
        .collect()
}

/// Table-handle write of plain text (dual of `tbl_get`).
pub async fn tbl_set(
    pool: &crate::db::Pool,
    table: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    let backend = table_backend(pool);
    // Store JSON documents as values (TS object semantics); plain strings
    // that are not valid JSON stay strings (legacy kv parity).
    let v: serde_json::Value =
        serde_json::from_str(value).unwrap_or(serde_json::Value::String(value.to_string()));
    backend.table(table).set(key, v).await
}

/// Table-handle delete. Pre-checks existence first: a dotted delete on
/// a missing root would otherwise persist an empty doc. Returns true
/// when the table held the row.
pub async fn tbl_del(pool: &crate::db::Pool, table: &str, key: &str) -> anyhow::Result<bool> {
    if tbl_get_value(pool, table, key).await.is_none() {
        return Ok(false);
    }
    let backend = table_backend(pool);
    let removed = backend.table(table).delete(key).await?;
    Ok(removed > 0)
}

/// Walk a nested table doc by path segments. Backend tables store
/// dotted keys (`SCHEDULE.1.A`) as nested objects under the root
/// (`SCHEDULE`), so bulk loops walk instead of prefix-scanning.
pub fn walk_path<'v>(v: &'v serde_json::Value, path: &[&str]) -> Option<&'v serde_json::Value> {
    let mut cur = v;
    for part in path {
        cur = cur.get(*part)?;
    }
    Some(cur)
}

/// Routed read: table handle first, legacy kv fallback with lazy
/// promotion into the table.
pub async fn routed_get(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
) -> Option<String> {
    if let Some(v) = tbl_get(pool, table, key).await {
        return Some(v);
    }
    let legacy = crate::db::kv_get(pool, legacy_scope, key).await?;
    let _ = tbl_set(pool, table, key, &legacy).await;
    Some(legacy)
}

/// Routed write: legacy kv first (unmigrated kv readers stay fresh),
/// then the table handle.
pub async fn routed_set(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, legacy_scope, key, value).await?;
    tbl_set(pool, table, key, value).await?;
    Ok(())
}

/// Routed delete: clears both stores. Returns true when a row existed
/// in either store.
pub async fn routed_del(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
) -> anyhow::Result<bool> {
    let had_legacy = crate::db::kv_get(pool, legacy_scope, key).await.is_some();
    crate::db::kv_del(pool, legacy_scope, key).await?;
    let had_table = tbl_del(pool, table, key).await.unwrap_or(false);
    Ok(had_legacy || had_table)
}

/// Legacy kv prefix rows for one scope (the fallback half of table
/// bulk loops; the Backend surface has no prefix scan).
pub async fn legacy_scan(
    pool: &crate::db::Pool,
    scope: &str,
    prefix: &str,
) -> Vec<(String, String)> {
    crate::db::kv_scan_prefix(pool, scope, prefix).await
}

/// Legacy kv prefix delete for one scope.
pub async fn legacy_del_prefix(
    pool: &crate::db::Pool,
    scope: &str,
    prefix: &str,
) -> anyhow::Result<()> {
    crate::db::kv_del_prefix(pool, scope, prefix).await
}

/// Named `blacklist` table handle. Legacy scope "0" and
/// `BLACKLIST.<uid>` keys are unchanged.
pub const BLACKLIST_TABLE: &str = "blacklist";

/// Routed blacklist reason lookup. Returns the `reason` leaf of the
/// `{blacklisted,reason,owner,createdAt}` entry, falling back to the raw
/// value for legacy plain-string rows. Mirrors `blacklistTable.get()`.
pub async fn bl_get(pool: &crate::db::Pool, user_id: u64) -> Option<String> {
    bl_raw(pool, user_id)
        .await
        .map(|raw| parse_bl_entry(&raw).reason.unwrap_or(raw))
}

/// Raw blacklist row (entry JSON or legacy string).
pub async fn bl_raw(pool: &crate::db::Pool, user_id: u64) -> Option<String> {
    routed_get(pool, BLACKLIST_TABLE, GLOBAL_SCOPE, &blacklist_key(user_id)).await
}

/// Routed blacklist write (dual-write, mirrors `blacklistTable.set`).
pub async fn bl_set(pool: &crate::db::Pool, user_id: u64, value: &str) -> anyhow::Result<()> {
    routed_set(
        pool,
        BLACKLIST_TABLE,
        GLOBAL_SCOPE,
        &blacklist_key(user_id),
        value,
    )
    .await
}

/// Routed blacklist delete (both stores).
pub async fn bl_del(pool: &crate::db::Pool, user_id: u64) -> anyhow::Result<()> {
    let _ = routed_del(pool, BLACKLIST_TABLE, GLOBAL_SCOPE, &blacklist_key(user_id)).await;
    Ok(())
}
