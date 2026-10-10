// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/database/driver/memory.ts + json.ts (table API) over the
// existing sqlite kv store in db.rs. Enum dispatch (no async-trait).

use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

use crate::config::Config;
use crate::db::Pool;

/// One row of a table scan (`all` / `starts_with`).
#[derive(Debug, Clone, PartialEq)]
pub struct Row {
    pub id: String,
    pub value: Value,
}

fn as_f64(v: &Value) -> anyhow::Result<f64> {
    match v {
        Value::Number(n) => n
            .as_f64()
            .ok_or_else(|| anyhow::anyhow!("number out of f64 range")),
        Value::String(s) => s
            .parse::<f64>()
            .map_err(|_| anyhow::anyhow!("value is not a number")),
        _ => anyhow::bail!("value is not a number"),
    }
}

fn merge_object(base: Option<Value>, patch: Value) -> anyhow::Result<Value> {
    let patch_map = match patch {
        Value::Object(m) => m,
        _ => anyhow::bail!("update value must be an object"),
    };
    let mut map = match base {
        None | Some(Value::Null) => serde_json::Map::new(),
        Some(Value::Object(m)) => m,
        Some(_) => anyhow::bail!("update only works on objects"),
    };
    for (k, v) in patch_map {
        map.insert(k, v);
    }
    Ok(Value::Object(map))
}

// ---------------------------------------------------------------------------
// Dotted-path helpers mirroring `src/core/database/lodash.ts`
// (`get_property` / `set_property` / `unset_property`). The TS drivers split
// keys on `.` in `get`/`set`/`delete`, so `Table` routes dotted keys here.
// ---------------------------------------------------------------------------

/// Split a possibly-dotted key into its root row key and nested path.
fn split_path(key: &str) -> (&str, Option<&str>) {
    match key.find('.') {
        Some(i) => (&key[..i], Some(&key[i + 1..])),
        None => (key, None),
    }
}

/// Mirror `get_property`: walk `path` under `root`. Missing segments and
/// non-container nodes read as missing; a JSON `null` at the path also reads
/// as missing (TS returns its `null` default). Numeric segments index into
/// arrays, matching JS `arr["0"]` reads.
fn get_path<'v>(root: &'v Value, path: &str) -> Option<&'v Value> {
    let mut current = root;
    for part in path.split('.') {
        match current {
            Value::Object(map) => current = map.get(part)?,
            Value::Array(items) => current = items.get(part.parse::<usize>().ok()?)?,
            _ => return None,
        }
    }
    match current {
        Value::Null => None,
        v => Some(v),
    }
}

/// Mirror `set_property`: set `path` under the root value, creating
/// intermediate objects (falsy/non-object nodes become `{}`). A non-object
/// root resets to `{}` (TS replaces roots failing `instanceof Object`;
/// arrays cannot carry named props in JSON, so they reset too).
fn set_path(root: Option<Value>, path: &str, value: Value) -> Value {
    let mut base = match root {
        Some(Value::Object(map)) => Value::Object(map),
        _ => Value::Object(serde_json::Map::new()),
    };
    let mut parts: Vec<&str> = path.split('.').collect();
    let last = parts.pop().unwrap_or("");
    let mut current = &mut base;
    for part in parts {
        let child_is_object = match current {
            Value::Object(map) => map.get(part).is_some_and(|v| v.is_object()),
            _ => false,
        };
        if !child_is_object {
            if let Some(map) = current.as_object_mut() {
                map.insert(part.to_string(), Value::Object(serde_json::Map::new()));
            }
        }
        let next = match current {
            Value::Object(map) => map.get_mut(part),
            _ => None,
        };
        match next {
            Some(n) => current = n,
            None => return base,
        }
    }
    if let Some(map) = current.as_object_mut() {
        map.insert(last.to_string(), value);
    }
    base
}

/// Mirror `unset_property`: remove `path` under a root object. Returns the
/// (possibly) updated root and whether a value was removed.
fn unset_path(root: Value, path: &str) -> (Value, bool) {
    let mut base = match root {
        Value::Object(_) => root,
        other => return (other, false),
    };
    let parts: Vec<&str> = path.split('.').collect();
    let removed = unset_at(&mut base, &parts);
    (base, removed)
}

/// Recursive descent for `unset_path` (recursion, not a loop-carried
/// reborrow, so each `&mut` ends when its call returns).
fn unset_at(node: &mut Value, parts: &[&str]) -> bool {
    match parts {
        [] => false,
        [last] => match node {
            Value::Object(map) => map.remove(*last).is_some(),
            _ => false,
        },
        [head, rest @ ..] => match node {
            Value::Object(map) => match map.get_mut(*head) {
                Some(next) => unset_at(next, rest),
                None => false,
            },
            _ => false,
        },
    }
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

/// Shared in-process tables. Clones share the same store (like the TS
/// driver sharing `store` across `table()` handles).
#[derive(Debug, Clone, Default)]
pub struct MemoryBackend {
    store: Arc<RwLock<HashMap<String, HashMap<String, Value>>>>,
}

impl MemoryBackend {
    pub fn new() -> Self {
        Self::default()
    }

    async fn all(&self, table: &str) -> Vec<Row> {
        let store = self.store.read().await;
        store
            .get(table)
            .map(|t| {
                t.iter()
                    .map(|(k, v)| Row {
                        id: k.clone(),
                        value: v.clone(),
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    async fn get(&self, table: &str, key: &str) -> Option<Value> {
        let store = self.store.read().await;
        store.get(table).and_then(|t| t.get(key)).cloned()
    }

    async fn set(&self, table: &str, key: &str, value: Value) {
        let mut store = self.store.write().await;
        store
            .entry(table.to_string())
            .or_default()
            .insert(key.to_string(), value);
    }

    async fn update(&self, table: &str, key: &str, patch: Value) -> anyhow::Result<Value> {
        let current = self.get(table, key).await;
        let merged = merge_object(current, patch)?;
        self.set(table, key, merged.clone()).await;
        Ok(merged)
    }

    async fn has(&self, table: &str, key: &str) -> bool {
        self.get(table, key).await.is_some()
    }

    async fn delete(&self, table: &str, key: &str) -> u64 {
        let mut store = self.store.write().await;
        let removed = store
            .get_mut(table)
            .map(|t| t.remove(key).is_some())
            .unwrap_or(false);
        u64::from(removed)
    }

    async fn delete_all(&self, table: &str) -> u64 {
        let mut store = self.store.write().await;
        let n = store.get(table).map(|t| t.len()).unwrap_or(0);
        if let Some(t) = store.get_mut(table) {
            t.clear();
        }
        n as u64
    }

    async fn add_sub(&self, table: &str, key: &str, by: f64, sub: bool) -> anyhow::Result<f64> {
        let current = self.get(table, key).await.unwrap_or(Value::from(0.0));
        let mut n = as_f64(&current)?;
        if sub {
            n -= by;
        } else {
            n += by;
        }
        let v = serde_json::Number::from_f64(n)
            .map(Value::Number)
            .unwrap_or(Value::Null);
        self.set(table, key, v).await;
        Ok(n)
    }

    async fn get_array(&self, table: &str, key: &str) -> anyhow::Result<Vec<Value>> {
        match self.get(table, key).await {
            None | Some(Value::Null) => Ok(vec![]),
            Some(Value::Array(a)) => Ok(a),
            Some(_) => anyhow::bail!("value is not an array"),
        }
    }

    async fn push(&self, table: &str, key: &str, values: Vec<Value>) -> anyhow::Result<Vec<Value>> {
        let mut arr = self.get_array(table, key).await?;
        arr.extend(values);
        self.set(table, key, Value::Array(arr.clone())).await;
        Ok(arr)
    }

    async fn starts_with(&self, table: &str, prefix: &str) -> Vec<Row> {
        let store = self.store.read().await;
        store
            .get(table)
            .map(|t| {
                t.iter()
                    .filter(|(k, _)| k.starts_with(prefix))
                    .map(|(k, v)| Row {
                        id: k.clone(),
                        value: v.clone(),
                    })
                    .collect()
            })
            .unwrap_or_default()
    }
}

// ---------------------------------------------------------------------------
// Json (dir of per-table files, read-through / write-through)
// ---------------------------------------------------------------------------

#[derive(Debug, Default)]
struct JsonInner {
    tables: HashMap<String, HashMap<String, Value>>,
    loaded: HashSet<String>,
}

/// JSON file persistence under a dir: one `<table>.json` object file per
/// table. Tables load lazily on first access and persist on every mutation.
#[derive(Debug, Clone, Default)]
pub struct JsonBackend {
    dir: PathBuf,
    inner: Arc<RwLock<JsonInner>>,
}

impl JsonBackend {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self {
            dir: dir.into(),
            inner: Arc::new(RwLock::new(JsonInner::default())),
        }
    }

    fn file_for(&self, table: &str) -> PathBuf {
        let safe: String = table
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                    c
                } else {
                    '_'
                }
            })
            .collect();
        self.dir.join(format!("{safe}.json"))
    }

    async fn ensure_loaded(&self, table: &str) -> anyhow::Result<()> {
        if self.inner.read().await.loaded.contains(table) {
            return Ok(());
        }
        let mut inner = self.inner.write().await;
        if inner.loaded.contains(table) {
            return Ok(());
        }
        let path = self.file_for(table);
        let map: HashMap<String, Value> = match tokio::fs::read_to_string(&path).await {
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => HashMap::new(),
            Err(e) => return Err(e.into()),
            Ok(text) => serde_json::from_str(&text)?,
        };
        inner.tables.insert(table.to_string(), map);
        inner.loaded.insert(table.to_string());
        Ok(())
    }

    async fn persist(&self, table: &str) -> anyhow::Result<()> {
        let inner = self.inner.read().await;
        let map = inner.tables.get(table).cloned().unwrap_or_default();
        drop(inner);
        tokio::fs::create_dir_all(&self.dir).await?;
        let text = serde_json::to_string_pretty(&map)?;
        tokio::fs::write(self.file_for(table), text).await?;
        Ok(())
    }

    async fn all(&self, table: &str) -> anyhow::Result<Vec<Row>> {
        self.ensure_loaded(table).await?;
        let inner = self.inner.read().await;
        Ok(inner
            .tables
            .get(table)
            .map(|t| {
                t.iter()
                    .map(|(k, v)| Row {
                        id: k.clone(),
                        value: v.clone(),
                    })
                    .collect()
            })
            .unwrap_or_default())
    }

    async fn get(&self, table: &str, key: &str) -> anyhow::Result<Option<Value>> {
        self.ensure_loaded(table).await?;
        let inner = self.inner.read().await;
        Ok(inner.tables.get(table).and_then(|t| t.get(key)).cloned())
    }

    async fn set(&self, table: &str, key: &str, value: Value) -> anyhow::Result<()> {
        self.ensure_loaded(table).await?;
        {
            let mut inner = self.inner.write().await;
            inner
                .tables
                .entry(table.to_string())
                .or_default()
                .insert(key.to_string(), value);
        }
        self.persist(table).await
    }

    async fn update(&self, table: &str, key: &str, patch: Value) -> anyhow::Result<Value> {
        let current = self.get(table, key).await?;
        let merged = merge_object(current, patch)?;
        self.set(table, key, merged.clone()).await?;
        Ok(merged)
    }

    async fn has(&self, table: &str, key: &str) -> anyhow::Result<bool> {
        Ok(self.get(table, key).await?.is_some())
    }

    async fn delete(&self, table: &str, key: &str) -> anyhow::Result<u64> {
        self.ensure_loaded(table).await?;
        let removed = {
            let mut inner = self.inner.write().await;
            inner
                .tables
                .get_mut(table)
                .map(|t| t.remove(key).is_some())
                .unwrap_or(false)
        };
        self.persist(table).await?;
        Ok(u64::from(removed))
    }

    async fn delete_all(&self, table: &str) -> anyhow::Result<u64> {
        self.ensure_loaded(table).await?;
        let n = {
            let mut inner = self.inner.write().await;
            let n = inner.tables.get(table).map(|t| t.len()).unwrap_or(0);
            if let Some(t) = inner.tables.get_mut(table) {
                t.clear();
            }
            n
        };
        self.persist(table).await?;
        Ok(n as u64)
    }

    async fn add_sub(&self, table: &str, key: &str, by: f64, sub: bool) -> anyhow::Result<f64> {
        let current = self.get(table, key).await?.unwrap_or(Value::from(0.0));
        let mut n = as_f64(&current)?;
        if sub {
            n -= by;
        } else {
            n += by;
        }
        let v = serde_json::Number::from_f64(n)
            .map(Value::Number)
            .unwrap_or(Value::Null);
        self.set(table, key, v).await?;
        Ok(n)
    }

    async fn get_array(&self, table: &str, key: &str) -> anyhow::Result<Vec<Value>> {
        match self.get(table, key).await? {
            None | Some(Value::Null) => Ok(vec![]),
            Some(Value::Array(a)) => Ok(a),
            Some(_) => anyhow::bail!("value is not an array"),
        }
    }

    async fn push(&self, table: &str, key: &str, values: Vec<Value>) -> anyhow::Result<Vec<Value>> {
        let mut arr = self.get_array(table, key).await?;
        arr.extend(values);
        self.set(table, key, Value::Array(arr.clone())).await?;
        Ok(arr)
    }

    async fn starts_with(&self, table: &str, prefix: &str) -> anyhow::Result<Vec<Row>> {
        Ok(self
            .all(table)
            .await?
            .into_iter()
            .filter(|r| r.id.starts_with(prefix))
            .collect())
    }
}

// ---------------------------------------------------------------------------
// Sqlite (thin wrapper over the kv table, namespaced per table)
// ---------------------------------------------------------------------------

/// Table-scoped view over the shared `kv` table. Each table maps to a
/// distinct `guild_id` scope (`tbl:<table>`) so tables never collide with
/// each other or with real guild rows. Values are stored as JSON text.
#[derive(Debug, Clone)]
pub struct SqliteBackend {
    pool: Pool,
}

impl SqliteBackend {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    fn scope(table: &str) -> String {
        format!("tbl:{table}")
    }

    async fn all(&self, table: &str) -> anyhow::Result<Vec<Row>> {
        let rows: Vec<(String, String)> =
            sqlx::query_as("SELECT key_name, value FROM kv WHERE guild_id = ?")
                .bind(Self::scope(table))
                .fetch_all(&self.pool)
                .await?;
        rows.into_iter()
            .map(|(id, raw)| {
                let value: Value = serde_json::from_str(&raw).unwrap_or(Value::String(raw));
                Ok(Row { id, value })
            })
            .collect()
    }

    async fn get(&self, table: &str, key: &str) -> anyhow::Result<Option<Value>> {
        let raw: Option<String> =
            sqlx::query_scalar("SELECT value FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(Self::scope(table))
                .bind(key)
                .fetch_optional(&self.pool)
                .await?;
        Ok(raw.map(|s| serde_json::from_str(&s).unwrap_or(Value::String(s))))
    }

    async fn set(&self, table: &str, key: &str, value: &Value) -> anyhow::Result<()> {
        let raw = serde_json::to_string(value)?;
        crate::db::kv_set(&self.pool, &Self::scope(table), key, &raw).await
    }

    async fn update(&self, table: &str, key: &str, patch: Value) -> anyhow::Result<Value> {
        let current = self.get(table, key).await?;
        let merged = merge_object(current, patch)?;
        self.set(table, key, &merged).await?;
        Ok(merged)
    }

    async fn has(&self, table: &str, key: &str) -> anyhow::Result<bool> {
        Ok(self.get(table, key).await?.is_some())
    }

    async fn delete(&self, table: &str, key: &str) -> anyhow::Result<u64> {
        let r = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(Self::scope(table))
            .bind(key)
            .execute(&self.pool)
            .await?;
        Ok(r.rows_affected())
    }

    async fn delete_all(&self, table: &str) -> anyhow::Result<u64> {
        let r = sqlx::query("DELETE FROM kv WHERE guild_id = ?")
            .bind(Self::scope(table))
            .execute(&self.pool)
            .await?;
        Ok(r.rows_affected())
    }

    async fn add_sub(&self, table: &str, key: &str, by: f64, sub: bool) -> anyhow::Result<f64> {
        let current = self.get(table, key).await?.unwrap_or(Value::from(0.0));
        let mut n = as_f64(&current)?;
        if sub {
            n -= by;
        } else {
            n += by;
        }
        let v = serde_json::Number::from_f64(n)
            .map(Value::Number)
            .unwrap_or(Value::Null);
        self.set(table, key, &v).await?;
        Ok(n)
    }

    async fn get_array(&self, table: &str, key: &str) -> anyhow::Result<Vec<Value>> {
        match self.get(table, key).await? {
            None | Some(Value::Null) => Ok(vec![]),
            Some(Value::Array(a)) => Ok(a),
            Some(_) => anyhow::bail!("value is not an array"),
        }
    }

    async fn push(&self, table: &str, key: &str, values: Vec<Value>) -> anyhow::Result<Vec<Value>> {
        let mut arr = self.get_array(table, key).await?;
        arr.extend(values);
        self.set(table, key, &Value::Array(arr.clone())).await?;
        Ok(arr)
    }

    async fn starts_with(&self, table: &str, prefix: &str) -> anyhow::Result<Vec<Row>> {
        let escaped = prefix
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let like = format!("{escaped}%");
        let rows: Vec<(String, String)> = sqlx::query_as(
            "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE ? ESCAPE '\\'",
        )
        .bind(Self::scope(table))
        .bind(like)
        .fetch_all(&self.pool)
        .await?;
        rows.into_iter()
            .map(|(id, raw)| {
                let value: Value = serde_json::from_str(&raw).unwrap_or(Value::String(raw));
                Ok(Row { id, value })
            })
            .collect()
    }
}

// ---------------------------------------------------------------------------
// Postgres (one SQL table per logical table, like the TS driver)
// ---------------------------------------------------------------------------

/// Quote a logical table name as a SQL identifier. Mirrors the TS driver
/// lowercasing (`table.toLowerCase()`), but sanitizes anything outside
/// `[a-z0-9_]` to `_` (like `JsonBackend::file_for`) instead of the TS
/// `sql.unsafe()` interpolation, so hostile names cannot break out of the
/// quoted identifier. Empty results fall back to `"json"` (the TS default).
fn pg_table_ident(table: &str) -> String {
    let safe: String = table
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let safe = if safe.is_empty() {
        "json".to_string()
    } else {
        safe
    };
    format!("\"{}\"", safe.replace('"', "_"))
}

/// `CREATE TABLE IF NOT EXISTS` matching the TS `ensureTableExists` shape
/// (`"id" VARCHAR(255) PRIMARY KEY, "value" TEXT NOT NULL`).
fn pg_ensure_table_sql(table: &str) -> String {
    format!(
        "CREATE TABLE IF NOT EXISTS {} (\"id\" VARCHAR(255) PRIMARY KEY, \"value\" TEXT NOT NULL)",
        pg_table_ident(table)
    )
}

/// Escape a `starts_with` prefix for `LIKE ... ESCAPE '\'` and append the
/// trailing wildcard. The TS driver interpolates the raw query (`LIKE
/// 'query%'`); escaping keeps the existing Rust variants' semantics where
/// `%`/`_`/`\` in the prefix match literally.
fn pg_like_pattern(prefix: &str) -> String {
    let escaped = prefix
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    format!("{escaped}%")
}

/// Resolve the postgres connection string: a `postgres://` /
/// `postgresql://` `database_url` wins, otherwise `DATABASE_URL` from the
/// environment, otherwise the composed `database.mySQL[0]` parts (TS
/// `src/core/database/index.ts`). Anything else is an error (no live
/// server to default to).
fn postgres_url(cfg: &Config) -> anyhow::Result<String> {
    if cfg.database_url.starts_with("postgres://") || cfg.database_url.starts_with("postgresql://")
    {
        return Ok(cfg.database_url.clone());
    }
    match std::env::var("DATABASE_URL") {
        Ok(url) if !url.trim().is_empty() => Ok(url),
        _ => match cfg.mysql_connection_string(0) {
            Some(url) => Ok(url),
            None => anyhow::bail!(
                "postgres backend requires a connection string: set database_url to a postgres:// URL, export DATABASE_URL, or fill [[database.mysql]]"
            ),
        },
    }
}

/// Postgres driver over one SQL table per logical table. Values are stored
/// as JSON text in `"value"`, exactly like the TS driver (`JSON.stringify`
/// on write, `JSON.parse` with a raw-string fallback on read). Tables are
/// created lazily on first access (`ensure_table`, like TS
/// `ensureTableExists`). Math/array/merge helpers are the shared
/// `as_f64` / `merge_object` ones, so value semantics match the other
/// variants.
#[derive(Debug, Clone)]
pub struct PostgresBackend {
    pool: sqlx::PgPool,
}

impl PostgresBackend {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }

    /// Connect with a bounded wait so boot/tests fail fast instead of
    /// hanging on an unreachable host.
    pub async fn connect(url: &str) -> anyhow::Result<Self> {
        Self::connect_with_timeout(url, Duration::from_secs(5)).await
    }

    pub async fn connect_with_timeout(url: &str, timeout: Duration) -> anyhow::Result<Self> {
        let pool = tokio::time::timeout(
            timeout,
            sqlx::postgres::PgPoolOptions::new()
                .max_connections(5)
                .connect(url),
        )
        .await
        .map_err(|_| anyhow::anyhow!("timed out connecting to postgres"))??;
        Ok(Self { pool })
    }

    async fn ensure_table(&self, table: &str) -> anyhow::Result<()> {
        sqlx::query(&pg_ensure_table_sql(table))
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    fn decode(raw: String) -> Value {
        serde_json::from_str(&raw).unwrap_or(Value::String(raw))
    }

    async fn all(&self, table: &str) -> anyhow::Result<Vec<Row>> {
        self.ensure_table(table).await?;
        let rows: Vec<(String, String)> = sqlx::query_as(&format!(
            "SELECT \"id\", \"value\" FROM {}",
            pg_table_ident(table)
        ))
        .fetch_all(&self.pool)
        .await?;
        rows.into_iter()
            .map(|(id, raw)| {
                Ok(Row {
                    id,
                    value: Self::decode(raw),
                })
            })
            .collect()
    }

    async fn get(&self, table: &str, key: &str) -> anyhow::Result<Option<Value>> {
        self.ensure_table(table).await?;
        let raw: Option<String> = sqlx::query_scalar(&format!(
            "SELECT \"value\" FROM {} WHERE \"id\" = $1",
            pg_table_ident(table)
        ))
        .bind(key)
        .fetch_optional(&self.pool)
        .await?;
        Ok(raw.map(Self::decode))
    }

    async fn set(&self, table: &str, key: &str, value: &Value) -> anyhow::Result<()> {
        self.ensure_table(table).await?;
        let raw = serde_json::to_string(value)?;
        sqlx::query(&format!(
            "INSERT INTO {} (\"id\", \"value\") VALUES ($1, $2) ON CONFLICT (\"id\") DO UPDATE SET \"value\" = EXCLUDED.\"value\"",
            pg_table_ident(table)
        ))
        .bind(key)
        .bind(raw)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn update(&self, table: &str, key: &str, patch: Value) -> anyhow::Result<Value> {
        let current = self.get(table, key).await?;
        let merged = merge_object(current, patch)?;
        self.set(table, key, &merged).await?;
        Ok(merged)
    }

    async fn has(&self, table: &str, key: &str) -> anyhow::Result<bool> {
        Ok(self.get(table, key).await?.is_some())
    }

    async fn delete(&self, table: &str, key: &str) -> anyhow::Result<u64> {
        self.ensure_table(table).await?;
        let r = sqlx::query(&format!(
            "DELETE FROM {} WHERE \"id\" = $1",
            pg_table_ident(table)
        ))
        .bind(key)
        .execute(&self.pool)
        .await?;
        Ok(r.rows_affected())
    }

    async fn delete_all(&self, table: &str) -> anyhow::Result<u64> {
        self.ensure_table(table).await?;
        let r = sqlx::query(&format!("DELETE FROM {}", pg_table_ident(table)))
            .execute(&self.pool)
            .await?;
        Ok(r.rows_affected())
    }

    async fn add_sub(&self, table: &str, key: &str, by: f64, sub: bool) -> anyhow::Result<f64> {
        let current = self.get(table, key).await?.unwrap_or(Value::from(0.0));
        let mut n = as_f64(&current)?;
        if sub {
            n -= by;
        } else {
            n += by;
        }
        let v = serde_json::Number::from_f64(n)
            .map(Value::Number)
            .unwrap_or(Value::Null);
        self.set(table, key, &v).await?;
        Ok(n)
    }

    async fn get_array(&self, table: &str, key: &str) -> anyhow::Result<Vec<Value>> {
        match self.get(table, key).await? {
            None | Some(Value::Null) => Ok(vec![]),
            Some(Value::Array(a)) => Ok(a),
            Some(_) => anyhow::bail!("value is not an array"),
        }
    }

    async fn push(&self, table: &str, key: &str, values: Vec<Value>) -> anyhow::Result<Vec<Value>> {
        let mut arr = self.get_array(table, key).await?;
        arr.extend(values);
        self.set(table, key, &Value::Array(arr.clone())).await?;
        Ok(arr)
    }

    async fn starts_with(&self, table: &str, prefix: &str) -> anyhow::Result<Vec<Row>> {
        self.ensure_table(table).await?;
        let rows: Vec<(String, String)> = sqlx::query_as(&format!(
            "SELECT \"id\", \"value\" FROM {} WHERE \"id\" LIKE $1 ESCAPE '\\'",
            pg_table_ident(table)
        ))
        .bind(pg_like_pattern(prefix))
        .fetch_all(&self.pool)
        .await?;
        rows.into_iter()
            .map(|(id, raw)| {
                Ok(Row {
                    id,
                    value: Self::decode(raw),
                })
            })
            .collect()
    }
}

// ---------------------------------------------------------------------------
// HorizonDB (offline mock/stub behind the same Table API)
// ---------------------------------------------------------------------------

/// Offline stand-in for the TS `horizondb` driver (`src/core/database/driver/
/// horizondb.ts`), which speaks to iHorizon's private key-value store over a
/// WebSocket (`horizondb` SDK, default `ws://127.0.0.1:8080`). No live
/// endpoint exists in this environment, so this is an in-process mock over
/// `MemoryBackend`: identical value semantics, zero network. Anything
/// constructed here reports `is_mock()`; live verification against a real
/// endpoint is still queued.
#[derive(Debug, Clone, Default)]
pub struct HorizonDbBackend {
    inner: MemoryBackend,
    endpoint: String,
}

impl HorizonDbBackend {
    /// Build the mock. `endpoint` is recorded for diagnostics only (never
    /// dialed); an empty string falls back to the TS default
    /// `ws://127.0.0.1:8080`.
    pub fn mock(endpoint: impl Into<String>) -> Self {
        let endpoint = endpoint.into();
        Self {
            inner: MemoryBackend::new(),
            endpoint: if endpoint.trim().is_empty() {
                "ws://127.0.0.1:8080".to_string()
            } else {
                endpoint
            },
        }
    }

    /// Recorded endpoint (diagnostics only — never dialed by the mock).
    pub fn endpoint(&self) -> &str {
        &self.endpoint
    }

    /// Always true: this client never touches the network.
    pub fn is_mock(&self) -> bool {
        true
    }

    async fn all(&self, table: &str) -> Vec<Row> {
        self.inner.all(table).await
    }

    async fn get(&self, table: &str, key: &str) -> Option<Value> {
        self.inner.get(table, key).await
    }

    async fn set(&self, table: &str, key: &str, value: Value) {
        self.inner.set(table, key, value).await;
    }

    async fn update(&self, table: &str, key: &str, patch: Value) -> anyhow::Result<Value> {
        self.inner.update(table, key, patch).await
    }

    async fn has(&self, table: &str, key: &str) -> bool {
        self.inner.has(table, key).await
    }

    async fn delete(&self, table: &str, key: &str) -> u64 {
        self.inner.delete(table, key).await
    }

    async fn delete_all(&self, table: &str) -> u64 {
        self.inner.delete_all(table).await
    }

    async fn add_sub(&self, table: &str, key: &str, by: f64, sub: bool) -> anyhow::Result<f64> {
        self.inner.add_sub(table, key, by, sub).await
    }

    async fn get_array(&self, table: &str, key: &str) -> anyhow::Result<Vec<Value>> {
        self.inner.get_array(table, key).await
    }

    async fn push(&self, table: &str, key: &str, values: Vec<Value>) -> anyhow::Result<Vec<Value>> {
        self.inner.push(table, key, values).await
    }

    async fn starts_with(&self, table: &str, prefix: &str) -> Vec<Row> {
        self.inner.starts_with(table, prefix).await
    }
}

// ---------------------------------------------------------------------------
// Backend enum + table handle (enum dispatch, no async-trait)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub enum Backend {
    Memory(MemoryBackend),
    Json(JsonBackend),
    Sqlite(SqliteBackend),
    Postgres(PostgresBackend),
    HorizonDb(HorizonDbBackend),
    Cached(CachedBackend),
}

impl Backend {
    /// In-process backend for tests and ephemeral use.
    pub fn memory() -> Self {
        Self::Memory(MemoryBackend::new())
    }

    pub fn sqlite(pool: Pool) -> Self {
        Self::Sqlite(SqliteBackend::new(pool))
    }

    pub fn json(dir: impl Into<PathBuf>) -> Self {
        Self::Json(JsonBackend::new(dir))
    }

    pub fn postgres(pool: sqlx::PgPool) -> Self {
        Self::Postgres(PostgresBackend::new(pool))
    }

    /// Connect to postgres at `url` (a `postgres://` / `postgresql://`
    /// connection string) with a bounded wait.
    pub async fn postgres_connect(url: &str) -> anyhow::Result<Self> {
        Ok(Self::Postgres(PostgresBackend::connect(url).await?))
    }

    /// Offline HorizonDB mock: records `endpoint` for diagnostics, dials
    /// nothing. Live verification against a real endpoint is still queued.
    pub fn horizondb_mock(endpoint: impl Into<String>) -> Self {
        Self::HorizonDb(HorizonDbBackend::mock(endpoint))
    }

    /// Cached-postgres orchestration over `primary` (the `og` Postgres in
    /// `src/core/database/index.ts`): reads served from an in-memory cache,
    /// every write mirrored to `primary` on the spot.
    pub fn cached(primary: Backend) -> Self {
        Self::Cached(CachedBackend::new(primary))
    }

    /// Build from config: `db_method` selects the driver (`sqlite` default,
    /// `memory`, `json`, `postgres`/`postgresql`, `horizondb`/`horizon`/
    /// `ihrzdb` as an offline mock). A `json:<dir>`
    /// database_url overrides the json dir; a `postgres://` /
    /// `postgresql://` database_url (or `DATABASE_URL` from the environment)
    /// is the postgres connection string; for horizondb the database_url is
    /// recorded as the endpoint and never dialed.
    pub async fn from_config(cfg: &Config) -> anyhow::Result<Self> {
        match cfg.db_method.to_lowercase().as_str() {
            "memory" => Ok(Self::memory()),
            "json" => {
                let dir = cfg
                    .database_url
                    .strip_prefix("json:")
                    .map(str::to_string)
                    .unwrap_or_else(|| "src/files/jsondb".to_string());
                Ok(Self::json(dir))
            }
            "postgres" | "postgresql" => {
                let url = postgres_url(cfg)?;
                Ok(Self::postgres_connect(&url).await?)
            }
            "cached_postgres" | "cached-postgres" | "cachedpostgres" => {
                let url = postgres_url(cfg)?;
                let pg = PostgresBackend::connect(&url).await?;
                let cached = CachedBackend::new(Backend::Postgres(pg));
                cached.warm().await?;
                Ok(Self::Cached(cached))
            }
            "horizondb" | "horizon" | "ihrzdb" => {
                // Offline mock: endpoint recorded, never dialed, so this
                // arm cannot fail on I/O. `database.horizon_db` parts win
                // (TS `ws://host:port`); otherwise database_url verbatim.
                let endpoint = cfg
                    .horizondb_endpoint()
                    .unwrap_or_else(|| cfg.database_url.clone());
                Ok(Self::horizondb_mock(endpoint))
            }
            _ => {
                let pool = crate::db::init(cfg).await?;
                Ok(Self::sqlite(pool))
            }
        }
    }

    /// Build the optional secondary backend (`y` / `client.db2`, the
    /// bi-separated second postgres from TS `database.mySQL[1]`).
    /// Empty/unset URL = `None` (no secondary). URL schemes mirror the
    /// primary arms without dialing anything unconfigured: `postgres://`
    /// connects, `sqlite:` opens a second pool, `json:<dir>` / `memory`
    /// stay offline, anything else is recorded as a HorizonDB endpoint
    /// mock (never dialed).
    pub async fn secondary_from_config(cfg: &Config) -> anyhow::Result<Option<Self>> {
        let url = cfg.database_url_secondary.clone().unwrap_or_default();
        let url = url.trim().to_string();
        // TS `database.mySQL[1]` (bi-separated second postgres): when no
        // explicit secondary URL is set, compose it from parts.
        let url = if url.is_empty() {
            match cfg.mysql_connection_string(1) {
                Some(composed) => composed,
                None => return Ok(None),
            }
        } else {
            url
        };
        if url.starts_with("postgres://") || url.starts_with("postgresql://") {
            return Ok(Some(Self::postgres_connect(&url).await?));
        }
        if let Some(dir) = url.strip_prefix("json:") {
            let dir = dir.trim();
            return Ok(Some(Self::json(if dir.is_empty() {
                "src/files/jsondb".to_string()
            } else {
                dir.to_string()
            })));
        }
        if url == "memory" {
            return Ok(Some(Self::memory()));
        }
        if url.starts_with("sqlite:") || url.ends_with(".sqlite") || url.ends_with(".db") {
            let mut secondary_cfg = cfg.clone();
            secondary_cfg.database_url = url;
            let pool = crate::db::init(&secondary_cfg).await?;
            return Ok(Some(Self::sqlite(pool)));
        }
        Ok(Some(Self::horizondb_mock(url)))
    }

    /// Table-scoped handle, mirroring `driver.table(name)` in TS.
    pub fn table(&self, name: impl Into<String>) -> Table<'_> {
        Table {
            backend: self,
            name: name.into(),
        }
    }
}

/// Table-scoped handle exposing the TS driver surface.
pub struct Table<'a> {
    backend: &'a Backend,
    name: String,
}

impl Table<'_> {
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Reject mutations against read-only tables on cached backends. TS
    /// (`syncToPostgres` in `src/core/database/index.ts`) only consults
    /// `readOnlyTables` during the 5-minute sync (postgres wins, memory
    /// rows are clobbered); the Rust cached backend rejects such writes
    /// upfront instead of accepting-then-clobbering. Plain (non-cached)
    /// backends are unaffected, matching TS where `readOnlyTables` is
    /// inert outside `cached_postgres` mode.
    fn check_writable(&self) -> anyhow::Result<()> {
        if matches!(self.backend, Backend::Cached(_)) && is_read_only(&self.name) {
            anyhow::bail!(
                "table \"{}\" is read-only: postgres wins, cached writes are rejected",
                self.name
            );
        }
        Ok(())
    }

    /// Alias for `all`, mirroring the TS drivers' `export()` (both
    /// `Postgres.export` and `HorizonDB.export` return the full row scan).
    /// `close()` is intentionally not mapped: `sqlx` pools close on drop and
    /// the mock holds no connection.
    pub async fn export_data(&self) -> anyhow::Result<Vec<Row>> {
        self.all().await
    }

    pub async fn all(&self) -> anyhow::Result<Vec<Row>> {
        match self.backend {
            Backend::Memory(b) => Ok(b.all(&self.name).await),
            Backend::Json(b) => b.all(&self.name).await,
            Backend::Sqlite(b) => b.all(&self.name).await,
            Backend::Postgres(b) => b.all(&self.name).await,
            Backend::HorizonDb(b) => Ok(b.all(&self.name).await),
            Backend::Cached(c) => Ok(c.all(&self.name).await),
        }
    }

    /// Dot-aware raw read: plain keys hit the backend directly, dotted keys
    /// fetch the root row then walk the nested path (see `get_path`).
    async fn raw_value(&self, key: &str) -> anyhow::Result<Option<Value>> {
        let (root, rest) = split_path(key);
        let v: Option<Value> = match self.backend {
            Backend::Memory(b) => b.get(&self.name, root).await,
            Backend::Json(b) => b.get(&self.name, root).await?,
            Backend::Sqlite(b) => b.get(&self.name, root).await?,
            Backend::Postgres(b) => b.get(&self.name, root).await?,
            Backend::HorizonDb(b) => b.get(&self.name, root).await,
            Backend::Cached(c) => c.get(&self.name, root).await,
        };
        match (v, rest) {
            (Some(r), Some(path)) => Ok(get_path(&r, path).cloned()),
            (v, _) => Ok(v),
        }
    }

    /// Dot-aware raw write: plain keys hit the backend directly, dotted keys
    /// merge into the root row object (see `set_path`).
    async fn write_value(&self, key: &str, value: Value) -> anyhow::Result<()> {
        let (root, rest) = split_path(key);
        self.check_writable()?;
        match rest {
            None => match self.backend {
                Backend::Memory(b) => {
                    b.set(&self.name, key, value).await;
                    Ok(())
                }
                Backend::Json(b) => b.set(&self.name, key, value).await,
                Backend::Sqlite(b) => b.set(&self.name, key, &value).await,
                Backend::Postgres(b) => b.set(&self.name, key, &value).await,
                Backend::HorizonDb(b) => {
                    b.set(&self.name, key, value).await;
                    Ok(())
                }
                Backend::Cached(c) => c.set(&self.name, key, value).await,
            },
            Some(path) => {
                let current = match self.backend {
                    Backend::Memory(b) => b.get(&self.name, root).await,
                    Backend::Json(b) => b.get(&self.name, root).await?,
                    Backend::Sqlite(b) => b.get(&self.name, root).await?,
                    Backend::Postgres(b) => b.get(&self.name, root).await?,
                    Backend::HorizonDb(b) => b.get(&self.name, root).await,
                    Backend::Cached(c) => c.get(&self.name, root).await,
                };
                let merged = set_path(current, path, value);
                match self.backend {
                    Backend::Memory(b) => {
                        b.set(&self.name, root, merged).await;
                        Ok(())
                    }
                    Backend::Json(b) => b.set(&self.name, root, merged).await,
                    Backend::Sqlite(b) => b.set(&self.name, root, &merged).await,
                    Backend::Postgres(b) => b.set(&self.name, root, &merged).await,
                    Backend::HorizonDb(b) => {
                        b.set(&self.name, root, merged).await;
                        Ok(())
                    }
                    Backend::Cached(c) => c.set(&self.name, root, merged).await,
                }
            }
        }
    }

    /// Array at `key` (dot-aware): missing/`null` reads as `[]`, non-arrays
    /// error — mirroring TS `getArray`, which falls back to `[]` via `get`.
    async fn raw_array(&self, key: &str) -> anyhow::Result<Vec<Value>> {
        match self.raw_value(key).await? {
            None | Some(Value::Null) => Ok(vec![]),
            Some(Value::Array(a)) => Ok(a),
            Some(_) => anyhow::bail!("value is not an array"),
        }
    }

    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> anyhow::Result<Option<T>> {
        self.raw_value(key)
            .await?
            .map(|v| serde_json::from_value(v).map_err(anyhow::Error::from))
            .transpose()
    }

    pub async fn get_raw(&self, key: &str) -> anyhow::Result<Option<Value>> {
        self.raw_value(key).await
    }

    pub async fn set<T: Serialize>(&self, key: &str, value: T) -> anyhow::Result<()> {
        let v = serde_json::to_value(value)?;
        self.write_value(key, v).await
    }

    /// Shallow-merge `patch` (must be an object) into the stored object.
    /// Dotted keys merge into the nested object (TS `update` reads through
    /// dot-aware `get` and writes through dot-aware `set`).
    pub async fn update<T: Serialize, R: DeserializeOwned>(
        &self,
        key: &str,
        patch: T,
    ) -> anyhow::Result<R> {
        let patch = serde_json::to_value(patch)?;
        if split_path(key).1.is_some() {
            let current = self.raw_value(key).await?;
            let merged = merge_object(current, patch)?;
            self.write_value(key, merged.clone()).await?;
            return Ok(serde_json::from_value(merged)?);
        }
        self.check_writable()?;
        let merged = match self.backend {
            Backend::Memory(b) => b.update(&self.name, key, patch).await?,
            Backend::Json(b) => b.update(&self.name, key, patch).await?,
            Backend::Sqlite(b) => b.update(&self.name, key, patch).await?,
            Backend::Postgres(b) => b.update(&self.name, key, patch).await?,
            Backend::HorizonDb(b) => b.update(&self.name, key, patch).await?,
            Backend::Cached(c) => c.update(&self.name, key, patch).await?,
        };
        Ok(serde_json::from_value(merged)?)
    }

    /// `(await get(key)) != null`, like TS `has` — so dotted keys work too.
    pub async fn has(&self, key: &str) -> anyhow::Result<bool> {
        if split_path(key).1.is_some() {
            return Ok(self.raw_value(key).await?.is_some());
        }
        match self.backend {
            Backend::Memory(b) => Ok(b.has(&self.name, key).await),
            Backend::Json(b) => b.has(&self.name, key).await,
            Backend::Sqlite(b) => b.has(&self.name, key).await,
            Backend::Postgres(b) => b.has(&self.name, key).await,
            Backend::HorizonDb(b) => Ok(b.has(&self.name, key).await),
            Backend::Cached(c) => Ok(c.has(&self.name, key).await),
        }
    }

    /// Dotted keys unset the nested path: the root is loaded (missing reads
    /// as `{}` and is stored back, like TS), the nested value removed.
    /// Returns 1 when a value was removed, 0 otherwise (TS returns its
    /// `set()` result cast to a number, which carries no count).
    pub async fn delete(&self, key: &str) -> anyhow::Result<u64> {
        let (root, rest) = split_path(key);
        if let Some(path) = rest {
            let current = match self.backend {
                Backend::Memory(b) => b.get(&self.name, root).await,
                Backend::Json(b) => b.get(&self.name, root).await?,
                Backend::Sqlite(b) => b.get(&self.name, root).await?,
                Backend::Postgres(b) => b.get(&self.name, root).await?,
                Backend::HorizonDb(b) => b.get(&self.name, root).await,
                Backend::Cached(c) => c.get(&self.name, root).await,
            }
            .unwrap_or(Value::Object(serde_json::Map::new()));
            let (merged, removed) = unset_path(current, path);
            self.write_value(root, merged).await?;
            return Ok(u64::from(removed));
        }
        self.check_writable()?;
        match self.backend {
            Backend::Memory(b) => Ok(b.delete(&self.name, key).await),
            Backend::Json(b) => b.delete(&self.name, key).await,
            Backend::Sqlite(b) => b.delete(&self.name, key).await,
            Backend::Postgres(b) => b.delete(&self.name, key).await,
            Backend::HorizonDb(b) => Ok(b.delete(&self.name, key).await),
            Backend::Cached(c) => c.delete(&self.name, key).await,
        }
    }

    pub async fn delete_all(&self) -> anyhow::Result<u64> {
        self.check_writable()?;
        match self.backend {
            Backend::Memory(b) => Ok(b.delete_all(&self.name).await),
            Backend::Json(b) => b.delete_all(&self.name).await,
            Backend::Sqlite(b) => b.delete_all(&self.name).await,
            Backend::Postgres(b) => b.delete_all(&self.name).await,
            Backend::HorizonDb(b) => Ok(b.delete_all(&self.name).await),
            Backend::Cached(c) => c.delete_all(&self.name).await,
        }
    }

    /// Shared add/sub core for dotted keys (plain keys keep the backend
    /// fast path below, which is behavior-identical: same `as_f64` math).
    async fn add_sub_dotted(&self, key: &str, value: f64, sub: bool) -> anyhow::Result<f64> {
        let current = self.raw_value(key).await?.unwrap_or(Value::from(0.0));
        let mut n = as_f64(&current)?;
        if sub {
            n -= value;
        } else {
            n += value;
        }
        let v = serde_json::Number::from_f64(n)
            .map(Value::Number)
            .unwrap_or(Value::Null);
        self.write_value(key, v).await?;
        Ok(n)
    }

    pub async fn add(&self, key: &str, value: f64) -> anyhow::Result<f64> {
        if split_path(key).1.is_some() {
            return self.add_sub_dotted(key, value, false).await;
        }
        self.check_writable()?;
        match self.backend {
            Backend::Memory(b) => b.add_sub(&self.name, key, value, false).await,
            Backend::Json(b) => b.add_sub(&self.name, key, value, false).await,
            Backend::Sqlite(b) => b.add_sub(&self.name, key, value, false).await,
            Backend::Postgres(b) => b.add_sub(&self.name, key, value, false).await,
            Backend::HorizonDb(b) => b.add_sub(&self.name, key, value, false).await,
            Backend::Cached(c) => c.add_sub(&self.name, key, value, false).await,
        }
    }

    pub async fn sub(&self, key: &str, value: f64) -> anyhow::Result<f64> {
        if split_path(key).1.is_some() {
            return self.add_sub_dotted(key, value, true).await;
        }
        self.check_writable()?;
        match self.backend {
            Backend::Memory(b) => b.add_sub(&self.name, key, value, true).await,
            Backend::Json(b) => b.add_sub(&self.name, key, value, true).await,
            Backend::Sqlite(b) => b.add_sub(&self.name, key, value, true).await,
            Backend::Postgres(b) => b.add_sub(&self.name, key, value, true).await,
            Backend::HorizonDb(b) => b.add_sub(&self.name, key, value, true).await,
            Backend::Cached(c) => c.add_sub(&self.name, key, value, true).await,
        }
    }

    pub async fn push<T: Serialize, R: DeserializeOwned>(
        &self,
        key: &str,
        values: Vec<T>,
    ) -> anyhow::Result<R> {
        let values: Vec<Value> = values
            .into_iter()
            .map(serde_json::to_value)
            .collect::<Result<_, _>>()?;
        if split_path(key).1.is_some() {
            let mut arr = self.raw_array(key).await?;
            arr.extend(values);
            self.write_value(key, Value::Array(arr.clone())).await?;
            return Ok(serde_json::from_value(Value::Array(arr))?);
        }
        self.check_writable()?;
        let arr = match self.backend {
            Backend::Memory(b) => b.push(&self.name, key, values).await?,
            Backend::Json(b) => b.push(&self.name, key, values).await?,
            Backend::Sqlite(b) => b.push(&self.name, key, values).await?,
            Backend::Postgres(b) => b.push(&self.name, key, values).await?,
            Backend::HorizonDb(b) => b.push(&self.name, key, values).await?,
            Backend::Cached(c) => c.push(&self.name, key, values).await?,
        };
        Ok(serde_json::from_value(Value::Array(arr))?)
    }

    /// Prepend `values` (TS `unshift` takes one value or an array; both
    /// arrive here as a vec and land before the current items).
    pub async fn unshift<T: Serialize, R: DeserializeOwned>(
        &self,
        key: &str,
        values: Vec<T>,
    ) -> anyhow::Result<R> {
        let front: Vec<Value> = values
            .into_iter()
            .map(serde_json::to_value)
            .collect::<Result<_, _>>()?;
        let back = self.raw_array(key).await?;
        let mut out = Vec::with_capacity(front.len() + back.len());
        out.extend(front);
        out.extend(back);
        self.write_value(key, Value::Array(out.clone())).await?;
        Ok(serde_json::from_value(Value::Array(out))?)
    }

    /// Remove and return the last element (TS `pop`); missing/empty reads
    /// as `None` after persisting the (empty) array, like TS.
    pub async fn pop<R: DeserializeOwned>(&self, key: &str) -> anyhow::Result<Option<R>> {
        let mut arr = self.raw_array(key).await?;
        let v = arr.pop();
        self.write_value(key, Value::Array(arr)).await?;
        v.map(|v| serde_json::from_value(v).map_err(anyhow::Error::from))
            .transpose()
    }

    /// Remove and return the first element (TS `shift`).
    pub async fn shift<R: DeserializeOwned>(&self, key: &str) -> anyhow::Result<Option<R>> {
        let mut arr = self.raw_array(key).await?;
        let v = if arr.is_empty() {
            None
        } else {
            Some(arr.remove(0))
        };
        self.write_value(key, Value::Array(arr)).await?;
        v.map(|v| serde_json::from_value(v).map_err(anyhow::Error::from))
            .transpose()
    }

    /// Remove array elements deep-equal to any of `values` (TS `pull` with a
    /// value or array). `once` removes only the first match. Note: TS uses
    /// reference equality for objects; here comparison is structural.
    pub async fn pull_values<T: Serialize, R: DeserializeOwned>(
        &self,
        key: &str,
        values: Vec<T>,
        once: bool,
    ) -> anyhow::Result<R> {
        let targets: Vec<Value> = values
            .into_iter()
            .map(serde_json::to_value)
            .collect::<Result<_, _>>()?;
        self.pull_where(key, once, |v, _| targets.contains(v)).await
    }

    /// Remove array elements matching `pred(element, index)` (TS `pull` with
    /// a function). `once` removes only the first match — TS `once` instead
    /// truncates the array after the first kept element (upstream data-loss
    /// bug), so keeping every non-matching element is a deliberate delta.
    pub async fn pull_where<R: DeserializeOwned>(
        &self,
        key: &str,
        once: bool,
        mut pred: impl FnMut(&Value, usize) -> bool,
    ) -> anyhow::Result<R> {
        let arr = self.raw_array(key).await?;
        let mut kept = Vec::with_capacity(arr.len());
        let mut removed = false;
        for (i, v) in arr.into_iter().enumerate() {
            if pred(&v, i) && (!once || !removed) {
                removed = true;
                continue;
            }
            kept.push(v);
        }
        self.write_value(key, Value::Array(kept.clone())).await?;
        Ok(serde_json::from_value(Value::Array(kept))?)
    }

    pub async fn get_array<T: DeserializeOwned>(&self, key: &str) -> anyhow::Result<Vec<T>> {
        if split_path(key).1.is_some() {
            return self
                .raw_array(key)
                .await?
                .into_iter()
                .map(|v| serde_json::from_value(v).map_err(anyhow::Error::from))
                .collect();
        }
        let arr: Vec<Value> = match self.backend {
            Backend::Memory(b) => b.get_array(&self.name, key).await?,
            Backend::Json(b) => b.get_array(&self.name, key).await?,
            Backend::Sqlite(b) => b.get_array(&self.name, key).await?,
            Backend::Postgres(b) => b.get_array(&self.name, key).await?,
            Backend::HorizonDb(b) => b.get_array(&self.name, key).await?,
            Backend::Cached(c) => c.get_array(&self.name, key).await?,
        };
        arr.into_iter()
            .map(|v| serde_json::from_value(v).map_err(anyhow::Error::from))
            .collect()
    }

    pub async fn starts_with<T: DeserializeOwned>(&self, prefix: &str) -> anyhow::Result<Vec<Row>> {
        let _ = std::marker::PhantomData::<T>;
        match self.backend {
            Backend::Memory(b) => Ok(b.starts_with(&self.name, prefix).await),
            Backend::Json(b) => b.starts_with(&self.name, prefix).await,
            Backend::Sqlite(b) => b.starts_with(&self.name, prefix).await,
            Backend::Postgres(b) => b.starts_with(&self.name, prefix).await,
            Backend::HorizonDb(b) => Ok(b.starts_with(&self.name, prefix).await),
            Backend::Cached(c) => Ok(c.starts_with(&self.name, prefix).await),
        }
    }
}

// ---------------------------------------------------------------------------
// Orchestration: table registry, read-only tables, cached-postgres mirror
// sync. Ports `src/core/database/index.ts` (`tables`, `readOnlyTables`,
// `initializeDatabase`, `syncToPostgres`) over the `Backend` drivers above,
// matching how `src/core/bot.ts` (`client.db = x`, `client.db2 = y`) and
// `src/Events/client/ready.ts` (`db.table(name)` per table) consume it.
// ---------------------------------------------------------------------------

/// Logical tables in TS declaration order (`tables` in
/// `src/core/database/index.ts`). `Backend::table` / `Database::table`
/// accept any name (TS `table()` takes any string); this list drives cache
/// warming and periodic sync.
pub const TABLES: &[&str] = &[
    "json",
    "owner",
    "blacklist",
    "prevnames",
    "api",
    "temp",
    "schedule",
    "user_profil",
    "authrestore",
    "metas",
    "giveaways",
    "backups",
];

/// Tables postgres wins for (`readOnlyTables` in
/// `src/core/database/index.ts`).
pub const READ_ONLY_TABLES: &[&str] = &["authrestore", "api", "metas"];

/// `readOnlyTables.includes(table)`.
pub fn is_read_only(table: &str) -> bool {
    READ_ONLY_TABLES.contains(&table)
}

/// `setInterval(syncToPostgres, 60000 * 5)` in `src/core/database/index.ts`.
pub const SYNC_INTERVAL: Duration = Duration::from_secs(300);

/// Shard gate for the `"json"` table. Mirrors `client.inShard(id)` in
/// `src/core/database/index.ts` (only guild rows owned by this shard are
/// cached/synced). `None` means allow all; that is the default because
/// outside a live client there is no shard map to consult.
pub type ShardGate = dyn Fn(&str) -> bool + Send + Sync;

/// Cached-postgres backend: the `cached_postgres` method of
/// `initializeDatabase` (`x: Memory` read cache + `og: Postgres` primary).
/// Reads are served from the in-memory cache; every write lands in the
/// cache and is mirrored to the primary synchronously.
///
/// Mirror delta (the write-only-never-fires fix): each TS driver
/// (`driver/memory.ts`, `postgres.ts`, `sqlite.ts`, `json.ts`) fans writes
/// out through `setRowByKey` / `deleteRowByKey` / `deleteAllRows` to a
/// `private mirrors` list, but nothing in `src/` ever populates that list
/// (`initializeDatabase` wires `x`/`og`/`y` and never registers a mirror),
/// so TS mirrors never fire and consistency waits on the 5-minute
/// `syncToPostgres`. Here the mirror IS the write path: cache first, then
/// the primary, with the primary error propagated. `sync_table` /
/// `sync_once` remain for reconciliation (external postgres edits, crash
/// recovery) and keep the exact `syncToPostgres` direction rules.
#[derive(Clone)]
pub struct CachedBackend {
    cache: MemoryBackend,
    primary: Box<Backend>,
    secondary: Option<Box<Backend>>,
    shard_gate: Option<Arc<ShardGate>>,
}

impl std::fmt::Debug for CachedBackend {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CachedBackend")
            .field("cache", &self.cache)
            .field("primary", &self.primary)
            .field("secondary", &self.secondary)
            .field("has_shard_gate", &self.shard_gate.is_some())
            .finish()
    }
}

impl CachedBackend {
    pub fn new(primary: Backend) -> Self {
        Self {
            cache: MemoryBackend::new(),
            primary: Box::new(primary),
            secondary: None,
            shard_gate: None,
        }
    }

    /// Bi-separated second postgres (`y` in `initializeDatabase`, holding
    /// the `metas` table). Only affects which tables warm/sync: with a
    /// secondary present only `"json"` is cached and synced, like TS
    /// (`_tables = dbInstance.y ? ["json"] : tables`).
    pub fn with_secondary(mut self, secondary: Backend) -> Self {
        self.secondary = Some(Box::new(secondary));
        self
    }

    /// `client.inShard(id)` equivalent for the `"json"` table.
    pub fn with_shard_gate(mut self, gate: impl Fn(&str) -> bool + Send + Sync + 'static) -> Self {
        self.shard_gate = Some(Arc::new(gate));
        self
    }

    /// The write-through target (`og` in TS).
    pub fn primary(&self) -> &Backend {
        &self.primary
    }

    /// The read cache as a plain backend (shares the store, for tests and
    /// inspection).
    pub fn cache(&self) -> Backend {
        Backend::Memory(self.cache.clone())
    }

    fn in_shard(&self, id: &str) -> bool {
        self.shard_gate.as_ref().is_none_or(|g| g(id))
    }

    fn sync_tables(&self) -> Vec<&str> {
        if self.secondary.is_some() {
            vec!["json"]
        } else {
            TABLES.to_vec()
        }
    }

    async fn all(&self, table: &str) -> Vec<Row> {
        self.cache.all(table).await
    }

    async fn get(&self, table: &str, key: &str) -> Option<Value> {
        self.cache.get(table, key).await
    }

    async fn set(&self, table: &str, key: &str, value: Value) -> anyhow::Result<()> {
        self.cache.set(table, key, value.clone()).await;
        self.mirror_set(table, key, value).await
    }

    async fn update(&self, table: &str, key: &str, patch: Value) -> anyhow::Result<Value> {
        let merged = self.cache.update(table, key, patch).await?;
        self.mirror_set(table, key, merged.clone()).await?;
        Ok(merged)
    }

    async fn has(&self, table: &str, key: &str) -> bool {
        self.cache.has(table, key).await
    }

    async fn delete(&self, table: &str, key: &str) -> anyhow::Result<u64> {
        let n = self.cache.delete(table, key).await;
        self.mirror_delete(table, key).await?;
        Ok(n)
    }

    async fn delete_all(&self, table: &str) -> anyhow::Result<u64> {
        let n = self.cache.delete_all(table).await;
        self.mirror_delete_all(table).await?;
        Ok(n)
    }

    async fn add_sub(&self, table: &str, key: &str, by: f64, sub: bool) -> anyhow::Result<f64> {
        let n = self.cache.add_sub(table, key, by, sub).await?;
        self.mirror_set(table, key, Value::from(n)).await?;
        Ok(n)
    }

    async fn get_array(&self, table: &str, key: &str) -> anyhow::Result<Vec<Value>> {
        self.cache.get_array(table, key).await
    }

    async fn push(&self, table: &str, key: &str, values: Vec<Value>) -> anyhow::Result<Vec<Value>> {
        let arr = self.cache.push(table, key, values).await?;
        self.mirror_set(table, key, Value::Array(arr.clone()))
            .await?;
        Ok(arr)
    }

    async fn starts_with(&self, table: &str, prefix: &str) -> Vec<Row> {
        self.cache.starts_with(table, prefix).await
    }

    /// Write-through leg of the mirror: the same row into the primary
    /// without routing back through `Table` (that round-trip is an `async
    /// fn` future cycle: `Table::delete_all` -> `CachedBackend::delete_all`
    /// -> `Table::delete_all`, E0733). Leaf primaries are written directly;
    /// a nested cached primary recurses behind a boxed `dyn Future` so the
    /// future stays finite.
    async fn mirror_set(&self, table: &str, key: &str, value: Value) -> anyhow::Result<()> {
        match self.primary.as_ref() {
            Backend::Memory(b) => {
                b.set(table, key, value).await;
                Ok(())
            }
            Backend::Json(b) => b.set(table, key, value).await,
            Backend::Sqlite(b) => b.set(table, key, &value).await,
            Backend::Postgres(b) => b.set(table, key, &value).await,
            Backend::HorizonDb(b) => {
                b.set(table, key, value).await;
                Ok(())
            }
            // No TS equivalent exists (`og` is always a real Postgres, and
            // TS mirrors never fire at all); fail fast instead of
            // recursing the write path.
            Backend::Cached(_) => {
                anyhow::bail!("cached backend cannot mirror into another cached backend")
            }
        }
    }

    async fn mirror_delete(&self, table: &str, key: &str) -> anyhow::Result<u64> {
        match self.primary.as_ref() {
            Backend::Memory(b) => Ok(b.delete(table, key).await),
            Backend::Json(b) => b.delete(table, key).await,
            Backend::Sqlite(b) => b.delete(table, key).await,
            Backend::Postgres(b) => b.delete(table, key).await,
            Backend::HorizonDb(b) => Ok(b.delete(table, key).await),
            Backend::Cached(_) => {
                anyhow::bail!("cached backend cannot mirror into another cached backend")
            }
        }
    }

    async fn mirror_delete_all(&self, table: &str) -> anyhow::Result<u64> {
        match self.primary.as_ref() {
            Backend::Memory(b) => Ok(b.delete_all(table).await),
            Backend::Json(b) => b.delete_all(table).await,
            Backend::Sqlite(b) => b.delete_all(table).await,
            Backend::Postgres(b) => b.delete_all(table).await,
            Backend::HorizonDb(b) => Ok(b.delete_all(table).await),
            Backend::Cached(_) => {
                anyhow::bail!("cached backend cannot mirror into another cached backend")
            }
        }
    }

    /// Boot warming (`initializeDatabase` cached_postgres branch): copy
    /// primary rows into the cache (`"json"`-only when bi-separated,
    /// shard-gated like `client.inShard(id)`).
    pub async fn warm(&self) -> anyhow::Result<()> {
        for table in self.sync_tables() {
            for row in self.primary.table(table).all().await? {
                if table == "json" && !self.in_shard(&row.id) {
                    continue;
                }
                self.cache.set(table, &row.id, row.value).await;
            }
        }
        Ok(())
    }

    /// One `syncToPostgres` pass over a single table. Direction rules match
    /// TS exactly: differing rows flow memory -> primary, except read-only
    /// tables flow primary -> memory; primary rows missing from memory are
    /// deleted from the primary (non-read-only only); memory rows missing
    /// from the primary are deleted from memory (read-only only).
    /// `"json"` writes/deletes toward the primary honor the shard gate.
    /// Deliberate cleanup: TS re-copies the whole postgres table per
    /// differing id; only the differing row is copied here (same end
    /// state). Value comparison is structural (`==`); TS compares
    /// `JSON.stringify` output, which agrees on parsed JSON values.
    pub async fn sync_table(&self, table: &str) -> anyhow::Result<()> {
        let readonly = is_read_only(table);
        let primary_rows = self.primary.table(table).all().await?;
        let cache_rows = self.cache.all(table).await;
        let primary_map: HashMap<&str, &Value> = primary_rows
            .iter()
            .map(|r| (r.id.as_str(), &r.value))
            .collect();
        let cache_map: HashMap<&str, &Value> = cache_rows
            .iter()
            .map(|r| (r.id.as_str(), &r.value))
            .collect();

        for row in &cache_rows {
            if primary_map.get(row.id.as_str()) == Some(&&row.value) {
                continue;
            }
            if readonly {
                if let Some(pv) = primary_map.get(row.id.as_str()) {
                    self.cache.set(table, &row.id, (*pv).clone()).await;
                }
            } else {
                if table == "json" && !self.in_shard(&row.id) {
                    continue;
                }
                self.primary
                    .table(table)
                    .set(row.id.as_str(), row.value.clone())
                    .await?;
            }
        }

        if readonly {
            for row in &cache_rows {
                if !primary_map.contains_key(row.id.as_str()) {
                    self.cache.delete(table, &row.id).await;
                }
            }
        } else {
            for row in &primary_rows {
                if !cache_map.contains_key(row.id.as_str()) {
                    if table == "json" && !self.in_shard(&row.id) {
                        continue;
                    }
                    self.primary.table(table).delete(row.id.as_str()).await?;
                }
            }
        }
        Ok(())
    }

    /// Full `syncToPostgres` pass over every synced table.
    pub async fn sync_once(&self) -> anyhow::Result<()> {
        for table in self.sync_tables() {
            self.sync_table(table).await?;
        }
        Ok(())
    }

    /// `setInterval(syncToPostgres, 60000 * 5)`: background reconciliation
    /// loop; failures are logged and the loop continues.
    pub fn spawn_sync_loop(self: &Arc<Self>) -> tokio::task::JoinHandle<()> {
        let me = Arc::clone(self);
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(SYNC_INTERVAL).await;
                if let Err(e) = me.sync_once().await {
                    tracing::warn!("cached-postgres sync failed: {e:#}");
                }
            }
        })
    }
}

// ---------------------------------------------------------------------------
// Database: `MultiDB` (`{ og?, x, y? }`) + `initializeDatabase` routing.
// ---------------------------------------------------------------------------

/// Table registry over a primary backend (`x`, what `client.db` holds) with
/// an optional secondary (`y` / `client.db2`, the bi-separated second
/// postgres). `table()` mirrors `db.table(name)` in
/// `src/Events/client/ready.ts`, including the `client.db2 ? client.db2 :
/// client.db` preference. kv shapes and the shared `db.sqlite` pool are
/// untouched: the sqlite path still goes through `crate::db::init`.
#[derive(Debug, Clone)]
pub struct Database {
    x: Backend,
    y: Option<Backend>,
}

impl Database {
    pub fn new(primary: Backend) -> Self {
        Self {
            x: primary,
            y: None,
        }
    }

    pub fn with_secondary(mut self, secondary: Backend) -> Self {
        self.y = Some(secondary);
        self
    }

    /// `initializeDatabase` routing by `db_method`. The secondary (`y` /
    /// `client.db2`, TS `mySQL[1]`) attaches when
    /// `database.secondary_url` (or `DATABASE_URL_SECONDARY`) is set,
    /// otherwise it stays `None` and routing falls back to `x`.
    pub async fn from_config(cfg: &Config) -> anyhow::Result<Self> {
        let mut db = Self::new(Backend::from_config(cfg).await?);
        if let Some(secondary) = Backend::secondary_from_config(cfg).await? {
            db = db.with_secondary(secondary);
        }
        Ok(db)
    }

    /// `client.db` side.
    pub fn primary(&self) -> &Backend {
        &self.x
    }

    /// `client.db2` side, when configured.
    pub fn secondary(&self) -> Option<&Backend> {
        self.y.as_ref()
    }

    /// `let db = client.db2 ? client.db2 : client.db` (`ready.ts`).
    pub fn routing_backend(&self) -> &Backend {
        self.y.as_ref().unwrap_or(&self.x)
    }

    /// Per-table handle over the routing backend.
    pub fn table(&self, name: impl Into<String>) -> Table<'_> {
        self.routing_backend().table(name)
    }
}

#[cfg(test)]
#[allow(clippy::field_reassign_with_default)]
mod tests {
    use super::*;
    use serde_json::json;

    async fn roundtrip(backend: &Backend) {
        let t = backend.table("t1");
        assert_eq!(t.get::<Value>("k").await.unwrap(), None);
        assert!(!t.has("k").await.unwrap());

        t.set("k", json!({"a": 1})).await.unwrap();
        assert!(t.has("k").await.unwrap());
        assert_eq!(t.get::<Value>("k").await.unwrap(), Some(json!({"a": 1})));

        let merged: Value = t.update("k", json!({"b": 2})).await.unwrap();
        assert_eq!(merged, json!({"a": 1, "b": 2}));
        assert_eq!(
            t.get::<Value>("k").await.unwrap(),
            Some(json!({"a": 1, "b": 2}))
        );

        assert_eq!(t.delete("k").await.unwrap(), 1);
        assert_eq!(t.delete("k").await.unwrap(), 0);
        assert!(!t.has("k").await.unwrap());
    }

    async fn numbers_and_arrays(backend: &Backend) {
        let t = backend.table("nums");
        assert_eq!(t.add("n", 5.0).await.unwrap(), 5.0);
        assert_eq!(t.add("n", 2.5).await.unwrap(), 7.5);
        assert_eq!(t.sub("n", 2.5).await.unwrap(), 5.0);

        let arr: Vec<String> = t.push("list", vec!["a".to_string()]).await.unwrap();
        assert_eq!(arr, vec!["a".to_string()]);
        let arr: Vec<String> = t
            .push("list", vec!["b".to_string(), "c".to_string()])
            .await
            .unwrap();
        assert_eq!(arr, vec!["a".to_string(), "b".to_string(), "c".to_string()]);
        let got: Vec<String> = t.get_array("list").await.unwrap();
        assert_eq!(got, vec!["a".to_string(), "b".to_string(), "c".to_string()]);
        let empty: Vec<String> = t.get_array("missing").await.unwrap();
        assert!(empty.is_empty());
    }

    async fn starts_with_and_isolation(backend: &Backend) {
        let a = backend.table("iso_a");
        let b = backend.table("iso_b");
        a.set("user:1", json!(1)).await.unwrap();
        a.set("user:2", json!(2)).await.unwrap();
        a.set("guild:1", json!(3)).await.unwrap();
        b.set("user:1", json!("other")).await.unwrap();

        let hits: Vec<Row> = a.starts_with::<Value>("user:").await.unwrap();
        assert_eq!(hits.len(), 2);
        assert!(hits.iter().all(|r| r.id.starts_with("user:")));

        // Same key in another table is isolated.
        assert_eq!(
            b.get::<Value>("user:1").await.unwrap(),
            Some(json!("other"))
        );
        assert_eq!(b.all().await.unwrap().len(), 1);

        assert_eq!(a.delete_all().await.unwrap(), 3);
        assert!(a.all().await.unwrap().is_empty());
        // Clearing one table leaves the other untouched.
        assert_eq!(b.all().await.unwrap().len(), 1);
    }

    async fn dotted_paths(backend: &Backend) {
        let t = backend.table("dots");
        // Missing root and missing nested path read as None.
        assert_eq!(t.get::<Value>("ghost.deep").await.unwrap(), None);
        assert!(!t.has("ghost.deep").await.unwrap());

        // Nested set creates intermediate objects.
        t.set("u.name", json!("ada")).await.unwrap();
        assert_eq!(t.get::<Value>("u.name").await.unwrap(), Some(json!("ada")));
        assert_eq!(
            t.get::<Value>("u").await.unwrap(),
            Some(json!({"name": "ada"}))
        );
        assert_eq!(t.get::<Value>("u.missing").await.unwrap(), None);

        t.set("a.b.c", json!(1)).await.unwrap();
        assert_eq!(t.get::<Value>("a.b.c").await.unwrap(), Some(json!(1)));
        assert_eq!(
            t.get::<Value>("a").await.unwrap(),
            Some(json!({"b": {"c": 1}}))
        );

        // Non-object roots reset to `{}` (TS `instanceof Object` check).
        t.set("n", json!(5)).await.unwrap();
        t.set("n.x", json!(1)).await.unwrap();
        assert_eq!(t.get::<Value>("n").await.unwrap(), Some(json!({"x": 1})));

        // Numeric segments index into arrays.
        t.set("arr", json!([10, 20])).await.unwrap();
        assert_eq!(t.get::<Value>("arr.0").await.unwrap(), Some(json!(10)));

        assert!(t.has("u.name").await.unwrap());
        assert!(!t.has("u.nope").await.unwrap());

        // Dotted delete removes the nested key and reports 1/0.
        assert_eq!(t.delete("u.name").await.unwrap(), 1);
        assert_eq!(t.get::<Value>("u").await.unwrap(), Some(json!({})));
        assert_eq!(t.delete("u.name").await.unwrap(), 0);

        // Deleting under a missing root stores the empty root back (TS does
        // `set(root, {})` unconditionally).
        assert_eq!(t.delete("fresh.path").await.unwrap(), 0);
        assert_eq!(t.get::<Value>("fresh").await.unwrap(), Some(json!({})));

        // Dotted add/sub/push/update flow through the nested path.
        t.set("stats", json!({"wins": 2})).await.unwrap();
        assert_eq!(t.add("stats.wins", 3.0).await.unwrap(), 5.0);
        assert_eq!(t.sub("stats.wins", 1.0).await.unwrap(), 4.0);
        let tags: Vec<String> = t.push("meta.tags", vec!["x".to_string()]).await.unwrap();
        assert_eq!(tags, vec!["x".to_string()]);
        assert_eq!(
            t.get::<Value>("meta.tags.0").await.unwrap(),
            Some(json!("x"))
        );
        let m: Value = t.update("stats", json!({"rank": "gold"})).await.unwrap();
        assert_eq!(m, json!({"wins": 4.0, "rank": "gold"}));
        let d: Value = t.update("deep.obj", json!({"k": true})).await.unwrap();
        assert_eq!(d, json!({"k": true}));
        assert_eq!(
            t.get::<Value>("deep").await.unwrap(),
            Some(json!({"obj": {"k": true}}))
        );
    }

    async fn array_ops(backend: &Backend) {
        let t = backend.table("arrops");

        let arr: Vec<String> = t
            .push("l", vec!["b".to_string(), "c".to_string()])
            .await
            .unwrap();
        assert_eq!(arr, vec!["b".to_string(), "c".to_string()]);
        let arr: Vec<String> = t.unshift("l", vec!["a".to_string()]).await.unwrap();
        assert_eq!(arr, vec!["a".to_string(), "b".to_string(), "c".to_string()]);

        assert_eq!(t.pop::<String>("l").await.unwrap(), Some("c".to_string()));
        assert_eq!(t.shift::<String>("l").await.unwrap(), Some("a".to_string()));
        let rest: Vec<String> = t.get_array("l").await.unwrap();
        assert_eq!(rest, vec!["b".to_string()]);
        assert_eq!(t.pop::<String>("missing").await.unwrap(), None);
        assert_eq!(t.shift::<String>("missing").await.unwrap(), None);

        // pull_values removes every match; once=true only the first.
        t.set("p", json!([1, 2, 3, 2])).await.unwrap();
        let r: Vec<i64> = t.pull_values("p", vec![2], false).await.unwrap();
        assert_eq!(r, vec![1, 3]);
        t.set("p", json!([1, 2, 3, 2])).await.unwrap();
        let r: Vec<i64> = t.pull_values("p", vec![2], true).await.unwrap();
        assert_eq!(r, vec![1, 3, 2]);

        // pull_where with an index + value predicate.
        t.set("q", json!(["a", "b", "c"])).await.unwrap();
        let r: Vec<String> = t
            .pull_where("q", false, |v, i| i == 0 || v.as_str() == Some("c"))
            .await
            .unwrap();
        assert_eq!(r, vec!["b".to_string()]);

        // Non-array values error like TS `getArray`.
        t.set("s", json!("nope")).await.unwrap();
        assert!(t.pop::<Value>("s").await.is_err());
        assert!(t
            .unshift::<String, Vec<String>>("s", vec!["x".to_string()])
            .await
            .is_err());
    }

    #[tokio::test]
    async fn memory_backend_roundtrip() {
        let b = Backend::memory();
        roundtrip(&b).await;
        numbers_and_arrays(&b).await;
        starts_with_and_isolation(&b).await;
        dotted_paths(&b).await;
        array_ops(&b).await;
    }

    #[tokio::test]
    async fn json_backend_roundtrip_and_persistence() {
        let dir = std::env::temp_dir().join(format!("ihrz-backends-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let b = Backend::json(&dir);
        roundtrip(&b).await;
        numbers_and_arrays(&b).await;
        starts_with_and_isolation(&b).await;
        dotted_paths(&b).await;
        array_ops(&b).await;

        // Write-through: table files exist on disk.
        assert!(dir.join("t1.json").exists());
        // Read-through: a fresh handle over the same dir sees prior data.
        let b2 = Backend::json(&dir);
        assert_eq!(
            b2.table("nums").get::<Value>("n").await.unwrap(),
            Some(json!(5.0))
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    async fn sqlite_memory_pool() -> Pool {
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

    #[tokio::test]
    async fn sqlite_backend_roundtrip() {
        let pool = sqlite_memory_pool().await;
        let b = Backend::sqlite(pool);
        roundtrip(&b).await;
        numbers_and_arrays(&b).await;
        starts_with_and_isolation(&b).await;
        dotted_paths(&b).await;
        array_ops(&b).await;
    }

    #[tokio::test]
    async fn from_config_defaults_to_sqlite() {
        let mut cfg = Config::default();
        cfg.database_url = "sqlite::memory:".to_string();
        cfg.db_method = String::new();
        let b = Backend::from_config(&cfg).await.unwrap();
        assert!(matches!(b, Backend::Sqlite(_)));
    }

    #[tokio::test]
    async fn from_config_memory_and_json() {
        let mut cfg = Config::default();
        cfg.db_method = "memory".to_string();
        assert!(matches!(
            Backend::from_config(&cfg).await.unwrap(),
            Backend::Memory(_)
        ));

        let dir = std::env::temp_dir().join(format!("ihrz-backends-cfg-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        cfg.db_method = "json".to_string();
        cfg.database_url = format!("json:{}", dir.display());
        assert!(matches!(
            Backend::from_config(&cfg).await.unwrap(),
            Backend::Json(_)
        ));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn pg_ident_sanitizes_lowercase_and_quotes() {
        assert_eq!(pg_table_ident("MyTable"), "\"mytable\"");
        assert_eq!(pg_table_ident("guild-data"), "\"guild_data\"");
        assert_eq!(pg_table_ident(""), "\"json\"");
        // Hostile names cannot break out of the quoted identifier.
        let ident = pg_table_ident("A\"; DROP TABLE x; --");
        assert!(ident.starts_with('"') && ident.ends_with('"'));
        assert!(!ident[1..ident.len() - 1].contains('"'));
        assert_eq!(ident, ident.to_lowercase());
    }

    #[test]
    fn pg_ddl_matches_ts_table_shape() {
        assert_eq!(
            pg_ensure_table_sql("MyTable"),
            "CREATE TABLE IF NOT EXISTS \"mytable\" (\"id\" VARCHAR(255) PRIMARY KEY, \"value\" TEXT NOT NULL)"
        );
    }

    #[test]
    fn pg_like_pattern_escapes_wildcards() {
        assert_eq!(pg_like_pattern("user:"), "user:%");
        assert_eq!(pg_like_pattern("100%_\\"), "100\\%\\_\\\\%");
    }

    #[tokio::test]
    async fn postgres_config_and_connect_errors_offline() {
        // Single test owns DATABASE_URL (save/remove/restore) so parallel
        // tests never race on the environment.
        let saved = std::env::var("DATABASE_URL").ok();
        std::env::remove_var("DATABASE_URL");

        // Missing connection string errors without touching the network.
        let mut cfg = Config::default();
        cfg.db_method = "postgres".to_string();
        cfg.database_url = String::new();
        assert!(postgres_url(&cfg).is_err());
        assert!(Backend::from_config(&cfg).await.is_err());

        // A postgres database_url wins (both schemes resolve verbatim).
        cfg.database_url = "postgresql://127.0.0.1:1/ihrz_test".to_string();
        assert_eq!(
            postgres_url(&cfg).unwrap(),
            "postgresql://127.0.0.1:1/ihrz_test"
        );
        cfg.database_url = "postgres://user:pw@db.example:5432/ihrz".to_string();
        assert_eq!(
            postgres_url(&cfg).unwrap(),
            "postgres://user:pw@db.example:5432/ihrz"
        );

        // A non-postgres database_url falls back to the environment.
        cfg.database_url = "sqlite::memory:".to_string();
        assert!(postgres_url(&cfg).is_err());
        std::env::set_var("DATABASE_URL", "postgres://127.0.0.1:1/ihrz_test");
        assert_eq!(
            postgres_url(&cfg).unwrap(),
            "postgres://127.0.0.1:1/ihrz_test"
        );

        // Malformed URL and unreachable host fail fast on a short timeout.
        assert!(
            PostgresBackend::connect_with_timeout("not-a-url", Duration::from_millis(500))
                .await
                .is_err()
        );
        assert!(PostgresBackend::connect_with_timeout(
            "postgres://127.0.0.1:1/ihrz_test",
            Duration::from_secs(3)
        )
        .await
        .is_err());

        // The postgresql alias resolves the env URL, then errors offline
        // (connection refused on the closed port).
        cfg.db_method = "postgresql".to_string();
        assert!(Backend::from_config(&cfg).await.is_err());

        match saved {
            Some(v) => std::env::set_var("DATABASE_URL", v),
            None => std::env::remove_var("DATABASE_URL"),
        }
    }

    #[tokio::test]
    async fn horizondb_mock_roundtrip_offline() {
        let b = Backend::horizondb_mock("ws://127.0.0.1:9");
        // Never dials: the mock behind a closed port behaves like memory.
        match &b {
            Backend::HorizonDb(h) => {
                assert!(h.is_mock());
                assert_eq!(h.endpoint(), "ws://127.0.0.1:9");
            }
            _ => panic!("expected HorizonDb backend"),
        }
        roundtrip(&b).await;
        numbers_and_arrays(&b).await;
        starts_with_and_isolation(&b).await;
        dotted_paths(&b).await;
        array_ops(&b).await;

        // Empty endpoint falls back to the TS default.
        let b2 = Backend::horizondb_mock("");
        match &b2 {
            Backend::HorizonDb(h) => assert_eq!(h.endpoint(), "ws://127.0.0.1:8080"),
            _ => panic!("expected HorizonDb backend"),
        }

        // export_data mirrors all().
        let t = b.table("t1");
        t.set("k", json!({"a": 1})).await.unwrap();
        let mut via_all = t.all().await.unwrap();
        let mut via_export = t.export_data().await.unwrap();
        via_all.sort_by(|a, b| a.id.cmp(&b.id));
        via_export.sort_by(|a, b| a.id.cmp(&b.id));
        assert_eq!(via_all, via_export);
    }

    #[tokio::test]
    async fn from_config_horizondb_needs_no_network() {
        let mut cfg = Config::default();
        cfg.db_method = "horizondb".to_string();
        cfg.database_url = String::new();
        match Backend::from_config(&cfg).await.unwrap() {
            Backend::HorizonDb(h) => {
                assert!(h.is_mock());
                assert_eq!(h.endpoint(), "ws://127.0.0.1:8080");
            }
            _ => panic!("expected HorizonDb backend"),
        }

        // Aliases map the same way and record the endpoint verbatim.
        for alias in ["horizon", "ihrzdb", "HorizonDB"] {
            cfg.db_method = alias.to_string();
            cfg.database_url = "ws://db.internal:8080".to_string();
            match Backend::from_config(&cfg).await.unwrap() {
                Backend::HorizonDb(h) => assert_eq!(h.endpoint(), "ws://db.internal:8080"),
                _ => panic!("expected HorizonDb backend for {alias}"),
            }
        }
    }
    #[test]
    fn orchestration_tables_and_readonly() {
        assert_eq!(TABLES.len(), 12);
        for t in [
            "json",
            "owner",
            "blacklist",
            "prevnames",
            "api",
            "temp",
            "schedule",
            "user_profil",
            "authrestore",
            "metas",
            "giveaways",
            "backups",
        ] {
            assert!(TABLES.contains(&t), "missing table {t}");
        }
        assert_eq!(READ_ONLY_TABLES.len(), 3);
        for t in ["authrestore", "api", "metas"] {
            assert!(is_read_only(t), "{t} should be read-only");
        }
        assert!(!is_read_only("json"));
        assert!(!is_read_only("owner"));
    }

    #[tokio::test]
    async fn database_routes_tables_and_prefers_secondary() {
        let db = Database::new(Backend::memory());
        db.table("owner").set("k", json!(1)).await.unwrap();
        assert_eq!(
            db.table("owner").get::<Value>("k").await.unwrap(),
            Some(json!(1))
        );

        // ready.ts `client.db2 ? client.db2 : client.db`: y wins.
        let db2 = Database::new(Backend::memory()).with_secondary(Backend::memory());
        assert!(db2.secondary().is_some());
        db2.table("owner").set("k", json!("via-y")).await.unwrap();
        assert_eq!(
            db2.primary()
                .table("owner")
                .get::<Value>("k")
                .await
                .unwrap(),
            None
        );
        assert_eq!(
            db2.secondary()
                .unwrap()
                .table("owner")
                .get::<Value>("k")
                .await
                .unwrap(),
            Some(json!("via-y"))
        );

        // from_config routing still works through Database.
        let mut cfg = Config::default();
        cfg.db_method = "memory".to_string();
        let db3 = Database::from_config(&cfg).await.unwrap();
        assert!(db3.secondary().is_none());
        db3.table("temp").set("k", json!(true)).await.unwrap();
        assert!(db3.table("temp").has("k").await.unwrap());
    }

    #[tokio::test]
    async fn secondary_from_config_offline_arms() {
        // Unset / blank URL = no secondary, no I/O.
        let cfg = Config::default();
        assert!(Backend::secondary_from_config(&cfg)
            .await
            .unwrap()
            .is_none());
        let mut blank = Config::default();
        blank.database_url_secondary = Some("   ".to_string());
        assert!(Backend::secondary_from_config(&blank)
            .await
            .unwrap()
            .is_none());

        // Offline arms never dial.
        for url in ["memory", "json:", "https://horizon.example.com/db"] {
            let mut cfg = Config::default();
            cfg.db_method = "memory".to_string();
            cfg.database_url_secondary = Some(url.to_string());
            let secondary = Backend::secondary_from_config(&cfg).await.unwrap();
            assert!(secondary.is_some(), "{url} should build a secondary");
        }
    }

    #[tokio::test]
    async fn database_from_config_wires_memory_secondary() {
        // memory primary + memory secondary: routing prefers y, no I/O.
        let mut cfg = Config::default();
        cfg.db_method = "memory".to_string();
        cfg.database_url_secondary = Some("memory".to_string());
        let db = Database::from_config(&cfg).await.unwrap();
        assert!(db.secondary().is_some());
        db.table("owner").set("k", json!("via-y")).await.unwrap();
        assert_eq!(
            db.primary().table("owner").get::<Value>("k").await.unwrap(),
            None
        );
        assert_eq!(
            db.secondary()
                .unwrap()
                .table("owner")
                .get::<Value>("k")
                .await
                .unwrap(),
            Some(json!("via-y"))
        );
    }

    #[tokio::test]
    async fn cached_mirror_fires_on_write() {
        let b = Backend::cached(Backend::memory());
        let t = b.table("owner");
        t.set("k", json!({"a": 1})).await.unwrap();
        let primary = match &b {
            Backend::Cached(c) => c.primary().clone(),
            _ => unreachable!(),
        };
        // Mirror fired synchronously: primary has the row with no sync pass.
        assert_eq!(
            primary.table("owner").get::<Value>("k").await.unwrap(),
            Some(json!({"a": 1}))
        );

        assert_eq!(t.add("n", 2.0).await.unwrap(), 2.0);
        assert_eq!(
            primary.table("owner").get::<Value>("n").await.unwrap(),
            Some(json!(2.0))
        );

        let arr: Vec<String> = t.push("l", vec!["x".to_string()]).await.unwrap();
        assert_eq!(arr, vec!["x".to_string()]);
        assert_eq!(
            primary.table("owner").get::<Value>("l").await.unwrap(),
            Some(json!(["x"]))
        );

        assert_eq!(t.delete("k").await.unwrap(), 1);
        assert_eq!(
            primary.table("owner").get::<Value>("k").await.unwrap(),
            None
        );

        // Reads are served from the cache even when the primary diverges.
        t.set("c", json!(7)).await.unwrap();
        primary.table("owner").delete("c").await.unwrap();
        assert_eq!(t.get::<Value>("c").await.unwrap(), Some(json!(7)));
    }

    #[tokio::test]
    async fn cached_readonly_tables_reject_writes() {
        let b = Backend::cached(Backend::memory());
        for table in ["authrestore", "api", "metas"] {
            let t = b.table(table);
            assert!(t.set("k", json!(1)).await.is_err(), "{table} set");
            assert!(t
                .update::<Value, Value>("k", json!({"a": 1}))
                .await
                .is_err());
            assert!(t.delete("k").await.is_err());
            assert!(t.delete_all().await.is_err());
            assert!(t.add("n", 1.0).await.is_err());
            assert!(t.sub("n", 1.0).await.is_err());
            assert!(t
                .push::<String, Vec<String>>("l", vec!["x".into()])
                .await
                .is_err());
            assert!(t
                .unshift::<String, Vec<String>>("l", vec!["x".into()])
                .await
                .is_err());
            assert!(t.pop::<Value>("l").await.is_err());
            assert!(t.shift::<Value>("l").await.is_err());
            assert!(t
                .pull_values::<String, Vec<String>>("l", vec!["x".into()], false)
                .await
                .is_err());
            assert!(t
                .pull_where::<Vec<Value>>("l", false, |_, _| true)
                .await
                .is_err());
            assert!(t.set("u.name", json!("ada")).await.is_err());
            assert_eq!(t.get::<Value>("k").await.unwrap(), None);
        }
        // Writable table on the same backend is fine.
        b.table("json").set("k", json!(1)).await.unwrap();
        // Same table on a plain backend stays writable: readOnlyTables is
        // inert outside cached_postgres mode, like TS.
        Backend::memory()
            .table("api")
            .set("k", json!(1))
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn cached_sync_reconciles_both_directions() {
        let b = Backend::cached(Backend::memory());
        let c = match &b {
            Backend::Cached(c) => c.clone(),
            _ => unreachable!(),
        };

        // Writable table: cache wins, primary converges.
        c.cache()
            .table("owner")
            .set("keep", json!(1))
            .await
            .unwrap();
        c.primary()
            .table("owner")
            .set("keep", json!(2))
            .await
            .unwrap();
        c.primary()
            .table("owner")
            .set("stale", json!(9))
            .await
            .unwrap();
        c.sync_table("owner").await.unwrap();
        assert_eq!(
            c.primary()
                .table("owner")
                .get::<Value>("keep")
                .await
                .unwrap(),
            Some(json!(1))
        );
        assert_eq!(
            c.primary()
                .table("owner")
                .get::<Value>("stale")
                .await
                .unwrap(),
            None
        );

        // Read-only table: postgres wins, cache converges, primary untouched.
        c.primary()
            .table("api")
            .set("k", json!("pg"))
            .await
            .unwrap();
        c.cache().table("api").set("k", json!("mem")).await.unwrap();
        c.cache()
            .table("api")
            .set("ghost", json!(true))
            .await
            .unwrap();
        c.sync_table("api").await.unwrap();
        assert_eq!(
            c.cache().table("api").get::<Value>("k").await.unwrap(),
            Some(json!("pg"))
        );
        assert_eq!(
            c.cache().table("api").get::<Value>("ghost").await.unwrap(),
            None
        );
        assert_eq!(
            c.primary()
                .table("api")
                .get::<Value>("ghost")
                .await
                .unwrap(),
            None
        );
    }

    #[tokio::test]
    async fn cached_warm_and_shard_gate() {
        let inner = CachedBackend::new(Backend::memory()).with_shard_gate(|_| false);
        inner
            .primary()
            .table("json")
            .set("g1", json!({"x": 1}))
            .await
            .unwrap();
        inner
            .primary()
            .table("owner")
            .set("k", json!(1))
            .await
            .unwrap();
        inner.warm().await.unwrap();
        // json gated out, other tables warm regardless.
        assert_eq!(
            inner
                .cache()
                .table("json")
                .get::<Value>("g1")
                .await
                .unwrap(),
            None
        );
        assert_eq!(
            inner
                .cache()
                .table("owner")
                .get::<Value>("k")
                .await
                .unwrap(),
            Some(json!(1))
        );

        // Gated sync skips json rows toward the primary.
        inner
            .cache()
            .table("json")
            .set("g2", json!(2))
            .await
            .unwrap();
        inner.sync_table("json").await.unwrap();
        assert_eq!(
            inner
                .primary()
                .table("json")
                .get::<Value>("g2")
                .await
                .unwrap(),
            None
        );

        // Ungated sync pushes them.
        let open = CachedBackend::new(Backend::memory());
        open.cache()
            .table("json")
            .set("g2", json!(2))
            .await
            .unwrap();
        open.sync_table("json").await.unwrap();
        assert_eq!(
            open.primary()
                .table("json")
                .get::<Value>("g2")
                .await
                .unwrap(),
            Some(json!(2))
        );
    }

    #[tokio::test]
    async fn from_config_cached_postgres_errors_offline() {
        let mut cfg = Config::default();
        cfg.db_method = "cached_postgres".to_string();
        cfg.database_url = "postgres://127.0.0.1:1/ihrz_test".to_string();
        assert!(Backend::from_config(&cfg).await.is_err());
    }
}
