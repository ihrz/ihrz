// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/database/driver/horizondb.ts over the `horizondb` npm
// SDK (node_modules/horizondb/sdk) and the server protocol
// (node_modules/horizondb/src/handlers.rs, models.rs).
//
// The TS SDK is Bun-native (WebSocket global); no Rust SDK exists, so this
// file ports both layers: `HorizonClient` (connect + login handshake,
// ready gate, auto-reconnect, timeouts — mirrors sdk/src/connection.ts)
// and `HorizonDb` (table-view driver with the exact op semantics and error
// kinds of driver/horizondb.ts). Dot-nested keys are resolved server-side,
// so no client-side merge is needed.
//
// Transport: blocking tungstenite (`ws://` only, matching the dependency as
// declared) in one worker thread per client. The async API talks to it over
// an mpsc queue plus per-request oneshot replies, so requests issued while
// the link is down wait for the reconnect (like `waitUntilReady` in the TS
// SDK) instead of failing, subject to `request_timeout_ms`.

use std::collections::HashMap;
#[cfg(test)]
use std::collections::HashSet;
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tokio::sync::{oneshot, Notify};

pub const DEFAULT_URL: &str = "ws://127.0.0.1:8080";
pub const DEFAULT_TABLE: &str = "json";
pub const DEFAULT_REQUEST_TIMEOUT_MS: u64 = 10_000;

const RECONNECT_BASE_DELAY_MS: u64 = 250;
const RECONNECT_MAX_DELAY_MS: u64 = 5_000;
const READ_TICK_MS: u64 = 50;
const LOGIN_TIMEOUT_FALLBACK_MS: u64 = 10_000;

// ---------------------------------------------------------------------------
// Errors (TS `ErrorKind`: MISSING_VALUE / INVALID_TYPE plus transport kinds)
// ---------------------------------------------------------------------------

/// Mirror of `ErrorKind` in src/core/database/types.ts, extended with the
/// transport failures the TS SDK surfaces (`HorizonDBTimeoutError`,
/// `HorizonDBAuthError`, `ConnectionClosedError`, server op rejections).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorKind {
    MissingValue,
    ParseException,
    InvalidType,
    Timeout,
    Auth,
    ConnectionClosed,
    Op,
}

impl ErrorKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorKind::MissingValue => "MISSING_VALUE",
            ErrorKind::ParseException => "PARSE_EXCEPTION",
            ErrorKind::InvalidType => "INVALID_TYPE",
            ErrorKind::Timeout => "TIMEOUT",
            ErrorKind::Auth => "AUTH",
            ErrorKind::ConnectionClosed => "CONNECTION_CLOSED",
            ErrorKind::Op => "OP_ERROR",
        }
    }
}

#[derive(Debug, Clone)]
pub struct HorizonError {
    kind: ErrorKind,
    message: String,
}

impl HorizonError {
    pub fn kind(&self) -> ErrorKind {
        self.kind
    }

    pub fn kind_str(&self) -> &'static str {
        self.kind.as_str()
    }

    pub fn missing_value(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::MissingValue,
            message: message.into(),
        }
    }

    pub fn invalid_type(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::InvalidType,
            message: message.into(),
        }
    }

    pub fn timeout(operation: &str, detail: Option<&str>) -> Self {
        let message = match detail {
            Some(d) => format!("request timed out: {operation} ({d})"),
            None => format!("request timed out: {operation}"),
        };
        Self {
            kind: ErrorKind::Timeout,
            message,
        }
    }

    pub fn auth(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::Auth,
            message: message.into(),
        }
    }

    pub fn closed(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::ConnectionClosed,
            message: message.into(),
        }
    }

    pub fn op(message: impl Into<String>) -> Self {
        Self {
            kind: ErrorKind::Op,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for HorizonError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.kind.as_str(), self.message)
    }
}

impl std::error::Error for HorizonError {}

pub type Result<T> = std::result::Result<T, HorizonError>;

/// Row shape returned by `all` / `export` (`{ id, value }`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KvEntry {
    pub id: String,
    pub value: Value,
}

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct HorizonConfig {
    /// `ws://` URL (tungstenite is declared without TLS features).
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
    /// Per-request timeout. `0` disables timeouts (mirrors
    /// `requestTimeoutMs <= 0` in the TS SDK).
    pub request_timeout_ms: u64,
    pub reconnect_base_ms: u64,
    pub reconnect_max_ms: u64,
}

impl Default for HorizonConfig {
    fn default() -> Self {
        Self {
            url: DEFAULT_URL.to_owned(),
            username: None,
            password: None,
            request_timeout_ms: DEFAULT_REQUEST_TIMEOUT_MS,
            reconnect_base_ms: RECONNECT_BASE_DELAY_MS,
            reconnect_max_ms: RECONNECT_MAX_DELAY_MS,
        }
    }
}

// ---------------------------------------------------------------------------
// Worker protocol (blocking tungstenite lives on one std thread)
// ---------------------------------------------------------------------------

enum WorkerReply {
    Data(Value),
    Op(String),
    Auth(String),
    Closed(String),
}

impl WorkerReply {
    fn into_result(self) -> std::result::Result<Value, HorizonError> {
        match self {
            WorkerReply::Data(v) => Ok(v),
            WorkerReply::Op(m) => Err(HorizonError::op(m)),
            WorkerReply::Auth(m) => Err(HorizonError::auth(m)),
            WorkerReply::Closed(m) => Err(HorizonError::closed(m)),
        }
    }
}

struct QueuedReq {
    op: String,
    fields: Map<String, Value>,
    reply: oneshot::Sender<WorkerReply>,
}

enum WorkerCmd {
    Request(QueuedReq),
    /// A request just timed out call-side: run the liveness check, exactly
    /// like the TS timer callback that rejects with Timeout and then calls
    /// `checkLiveness()`. Evaluating liveness only here (never on a
    /// periodic tick) guarantees the hung request itself always reports
    /// Timeout while a stuck link still triggers a reconnect.
    ProbeLiveness,
    Shutdown,
}

struct Shared {
    config: HorizonConfig,
    tx: Mutex<Option<std::sync::mpsc::Sender<WorkerCmd>>>,
    closed: AtomicBool,
    connected: Mutex<bool>,
    notify: Notify,
    initial: Mutex<Option<Result<()>>>,
    open_count: AtomicU64,
    /// Mirrors `capabilities.deleteReportsExisted` in driver/horizondb.ts:
    /// shared by every table view of the same connection.
    delete_reports_existed: Mutex<Option<bool>>,
}

impl Shared {
    fn set_connected(&self, connected: bool) {
        if let Ok(mut flag) = self.connected.lock() {
            *flag = connected;
        }
        self.notify.notify_waiters();
    }

    fn is_connected(&self) -> bool {
        self.connected.lock().map(|flag| *flag).unwrap_or(false)
    }

    fn is_closed(&self) -> bool {
        self.closed.load(Ordering::SeqCst)
    }

    fn has_initial(&self) -> bool {
        self.initial
            .lock()
            .map(|slot| slot.is_some())
            .unwrap_or(false)
    }

    fn set_initial(&self, result: Result<()>) {
        if let Ok(mut slot) = self.initial.lock() {
            if slot.is_none() {
                *slot = Some(result);
            }
        }
        self.notify.notify_waiters();
    }

    fn timeout(&self) -> Option<Duration> {
        if self.config.request_timeout_ms > 0 {
            Some(Duration::from_millis(self.config.request_timeout_ms))
        } else {
            None
        }
    }
}

// ---------------------------------------------------------------------------
// Public connection client (mirrors the TS `HorizonDB` SDK class)
// ---------------------------------------------------------------------------

/// WebSocket connection to HorizonDB. Cloneable: clones share the single
/// underlying socket, like `sdk.table()` views share one `Connection`.
#[derive(Clone)]
pub struct HorizonClient {
    shared: Arc<Shared>,
}

impl std::fmt::Debug for HorizonClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HorizonClient").finish_non_exhaustive()
    }
}

impl HorizonClient {
    pub fn new(
        url: impl Into<String>,
        username: Option<String>,
        password: Option<String>,
        request_timeout_ms: u64,
    ) -> Self {
        Self::with_config(HorizonConfig {
            url: url.into(),
            username,
            password,
            request_timeout_ms,
            ..HorizonConfig::default()
        })
    }

    pub fn with_config(config: HorizonConfig) -> Self {
        let shared = Arc::new(Shared {
            config,
            tx: Mutex::new(None),
            closed: AtomicBool::new(false),
            connected: Mutex::new(false),
            notify: Notify::new(),
            initial: Mutex::new(None),
            open_count: AtomicU64::new(0),
            delete_reports_existed: Mutex::new(None),
        });
        let (tx, rx) = std::sync::mpsc::channel::<WorkerCmd>();
        if let Ok(mut slot) = shared.tx.lock() {
            *slot = Some(tx);
        }
        let worker_shared = Arc::clone(&shared);
        let _ = std::thread::Builder::new()
            .name("horizondb-worker".to_owned())
            .spawn(move || worker_main(worker_shared, rx));
        Self { shared }
    }

    /// Resolves once the initial handshake (connect + login) completes,
    /// rejects when it failed — mirrors `sdk.ready()`. A failure is not
    /// fatal: the worker keeps reconnecting and `send` waits for it.
    pub async fn ready(&self) -> Result<()> {
        loop {
            if let Ok(slot) = self.shared.initial.lock() {
                if let Some(result) = slot.as_ref() {
                    return result.clone();
                }
            }
            self.shared.notify.notified().await;
        }
    }

    /// Best-effort gate used before every op: a failed initial handshake is
    /// swallowed because auto-reconnect takes over (mirrors `ensureReady`).
    async fn ensure_ready(&self) {
        let _ = self.ready().await;
    }

    /// Number of sockets opened so far (diagnostics, mirrors
    /// `connectionCount`).
    pub fn connection_count(&self) -> u64 {
        self.shared.open_count.load(Ordering::SeqCst)
    }

    /// Configured server URL (backend endpoint label).
    pub fn url(&self) -> String {
        self.shared.config.url.clone()
    }

    /// Configured per-request timeout in ms (TS `requestTimeoutMs`).
    pub fn request_timeout_ms(&self) -> u64 {
        self.shared.config.request_timeout_ms
    }

    /// Table view sharing this connection (mirrors `sdk.table()`).
    pub fn table(&self, name: &str) -> Result<HorizonDb> {
        HorizonDb::new(self.clone(), name)
    }

    /// The default (`json`) table view.
    pub fn default_table(&self) -> HorizonDb {
        HorizonDb {
            client: self.clone(),
            table: DEFAULT_TABLE.to_owned(),
        }
    }

    pub fn close(&self) {
        self.shared.closed.store(true, Ordering::SeqCst);
        if let Ok(mut slot) = self.shared.tx.lock() {
            if let Some(tx) = slot.take() {
                let _ = tx.send(WorkerCmd::Shutdown);
            }
        }
        self.shared.set_connected(false);
    }

    async fn wait_connected(&self, operation: &str) -> Result<()> {
        let wait = async {
            loop {
                if self.shared.is_closed() {
                    return Err(HorizonError::closed("connection closed"));
                }
                if self.shared.is_connected() {
                    return Ok(());
                }
                self.shared.notify.notified().await;
            }
        };
        match self.shared.timeout() {
            Some(ms) => match tokio::time::timeout(ms, wait).await {
                Ok(r) => r,
                Err(_) => Err(HorizonError::timeout(
                    operation,
                    Some("connection not ready"),
                )),
            },
            None => wait.await,
        }
    }

    async fn send(&self, operation: &str, fields: Map<String, Value>) -> Result<Value> {
        self.wait_connected(operation).await?;
        let (tx, rx) = oneshot::channel::<WorkerReply>();
        let cmd = WorkerCmd::Request(QueuedReq {
            op: operation.to_owned(),
            fields,
            reply: tx,
        });
        let queued = self
            .shared
            .tx
            .lock()
            .map(|slot| slot.as_ref().map(|s| s.send(cmd).is_ok()).unwrap_or(false))
            .unwrap_or(false);
        if !queued {
            return Err(HorizonError::closed("connection closed"));
        }
        let wait = async {
            match rx.await {
                Ok(reply) => reply.into_result(),
                Err(_) => Err(HorizonError::closed("connection closed")),
            }
        };
        match self.shared.timeout() {
            Some(ms) => match tokio::time::timeout(ms, wait).await {
                Ok(r) => r,
                Err(_) => {
                    // Mirror the TS timer: report Timeout, then probe
                    // liveness so a stuck link reconnects for the next
                    // request. Late responses are dropped (see pruning).
                    if let Ok(slot) = self.shared.tx.lock() {
                        if let Some(tx) = slot.as_ref() {
                            let _ = tx.send(WorkerCmd::ProbeLiveness);
                        }
                    }
                    Err(HorizonError::timeout(operation, None))
                }
            },
            None => wait.await,
        }
    }
}

// ---------------------------------------------------------------------------
// Table-view driver (mirrors driver/horizondb.ts op semantics exactly)
// ---------------------------------------------------------------------------

/// Key-value view over one table. Views created from the same
/// `HorizonClient` share the socket and the delete-probe capability flag.
#[derive(Clone)]
pub struct HorizonDb {
    client: HorizonClient,
    table: String,
}

impl HorizonDb {
    pub fn new(client: HorizonClient, table: &str) -> Result<Self> {
        validate_table(table)?;
        Ok(Self {
            client,
            table: table.to_owned(),
        })
    }

    /// Connect + login in one step (mirrors `HorizonDB.connect`).
    pub async fn connect(
        url: impl Into<String>,
        username: Option<String>,
        password: Option<String>,
        request_timeout_ms: u64,
    ) -> Result<Self> {
        let client = HorizonClient::new(url, username, password, request_timeout_ms);
        client.ready().await?;
        Ok(client.default_table())
    }

    pub fn table_name(&self) -> &str {
        &self.table
    }

    pub fn client(&self) -> &HorizonClient {
        &self.client
    }

    pub fn close(&self) {
        self.client.close();
    }

    fn fields(&self, pairs: Vec<(String, Value)>) -> Map<String, Value> {
        let mut map = Map::with_capacity(pairs.len() + 1);
        map.insert("table".to_owned(), Value::String(self.table.clone()));
        for (k, v) in pairs {
            map.insert(k, v);
        }
        map
    }

    fn mutation_value(data: &Value) -> Option<&Value> {
        data.get("value")
    }

    fn mutation_existed(data: &Value) -> Option<bool> {
        data.get("existed").and_then(|v| v.as_bool())
    }

    pub async fn all(&self) -> Result<Vec<KvEntry>> {
        self.client.ensure_ready().await;
        let data = self.client.send("all", self.fields(vec![])).await?;
        let mut rows = Vec::new();
        if let Some(arr) = data.as_array() {
            for item in arr {
                let id = item.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let value = item.get("value").cloned().unwrap_or(Value::Null);
                rows.push(KvEntry {
                    id: id.to_owned(),
                    value,
                });
            }
        }
        Ok(rows)
    }

    pub async fn get(&self, key: &str) -> Result<Option<Value>> {
        self.client.ensure_ready().await;
        require_key(key)?;
        let data = self
            .client
            .send(
                "get",
                self.fields(vec![("key".to_owned(), Value::String(key.to_owned()))]),
            )
            .await?;
        if data.is_null() {
            Ok(None)
        } else {
            Ok(Some(data))
        }
    }

    pub async fn set(&self, key: &str, value: Value) -> Result<Value> {
        self.client.ensure_ready().await;
        require_key(key)?;
        if value.is_null() {
            return Err(HorizonError::missing_value(
                "Missing second argument (value)",
            ));
        }
        self.client
            .send(
                "set",
                self.fields(vec![
                    ("key".to_owned(), Value::String(key.to_owned())),
                    ("value".to_owned(), value.clone()),
                ]),
            )
            .await?;
        Ok(value)
    }

    /// Shallow-merge `object` into the stored object (mirrors `update`:
    /// read + `Object.assign` + `set`). Arrays are accepted as patch sources
    /// (JS `typeof [] === "object"`, indices become keys).
    pub async fn update(&self, key: &str, object: Value) -> Result<Value> {
        require_key(key)?;
        let patch = match &object {
            Value::Object(map) => map.clone(),
            Value::Array(items) => items
                .iter()
                .enumerate()
                .map(|(i, v)| (i.to_string(), v.clone()))
                .collect::<Map<String, Value>>(),
            _ => {
                return Err(HorizonError::invalid_type(format!(
                    "Second argument (object) needs to be an object received \"{}\"",
                    json_type_name(&object)
                )));
            }
        };
        let mut data = match self.get(key).await? {
            Some(v) => v,
            None => Value::Object(Map::new()),
        };
        match data.as_object_mut() {
            Some(map) => {
                for (k, v) in patch {
                    map.insert(k, v);
                }
            }
            None => {
                return Err(HorizonError::invalid_type(
                    "The current data is not an object, update only works on objects",
                ));
            }
        }
        self.set(key, data).await
    }

    pub async fn has(&self, key: &str) -> Result<bool> {
        self.client.ensure_ready().await;
        require_key(key)?;
        let data = self
            .client
            .send(
                "has",
                self.fields(vec![("key".to_owned(), Value::String(key.to_owned()))]),
            )
            .await?;
        Ok(data.as_bool().unwrap_or(false))
    }

    /// Returns `1` when the key existed, `0` otherwise. Until the server
    /// proves it reports `existed`, `has` is asked first (old servers).
    pub async fn delete(&self, key: &str) -> Result<u64> {
        self.client.ensure_ready().await;
        require_key(key)?;
        let known = self
            .client
            .shared
            .delete_reports_existed
            .lock()
            .map(|flag| *flag)
            .unwrap_or(None);
        let probed = if known == Some(true) {
            None
        } else {
            Some(self.has(key).await?)
        };
        let data = self
            .client
            .send(
                "delete",
                self.fields(vec![("key".to_owned(), Value::String(key.to_owned()))]),
            )
            .await?;
        if let Some(existed) = Self::mutation_existed(&data) {
            if let Ok(mut flag) = self.client.shared.delete_reports_existed.lock() {
                *flag = Some(true);
            }
            return Ok(u64::from(existed));
        }
        if let Ok(mut flag) = self.client.shared.delete_reports_existed.lock() {
            *flag = Some(false);
        }
        Ok(u64::from(probed.unwrap_or(false)))
    }

    /// The protocol does not report how many rows were deleted.
    pub async fn delete_all(&self) -> Result<u64> {
        self.client.ensure_ready().await;
        self.client.send("deleteAll", self.fields(vec![])).await?;
        Ok(0)
    }

    async fn add_subtract(&self, key: &str, amount: f64, sub: bool) -> Result<f64> {
        require_key(key)?;
        if amount.is_nan() {
            return Err(HorizonError::invalid_type(format!(
                "Value to add/subtract with key: ({key}) is not a number and couldn't be parsed to a number"
            )));
        }
        self.client.ensure_ready().await;
        let op = if sub { "sub" } else { "add" };
        let data = match self
            .client
            .send(
                op,
                self.fields(vec![
                    ("key".to_owned(), Value::String(key.to_owned())),
                    ("amount".to_owned(), serde_json::json!(amount)),
                ]),
            )
            .await
        {
            Ok(data) => data,
            Err(e) => {
                if matches!(e.kind(), ErrorKind::Op) && contains_ci(&e.to_string(), "non-numeric") {
                    return Err(HorizonError::invalid_type(format!(
                        "Current value with key: ({key}) is not a number and couldn't be parsed to a number"
                    )));
                }
                return Err(e);
            }
        };
        if let Some(n) = Self::mutation_value(&data).and_then(|v| v.as_f64()) {
            return Ok(n);
        }
        Ok(self.get(key).await?.and_then(|v| v.as_f64()).unwrap_or(0.0))
    }

    pub async fn add(&self, key: &str, amount: f64) -> Result<f64> {
        self.add_subtract(key, amount, false).await
    }

    pub async fn sub(&self, key: &str, amount: f64) -> Result<f64> {
        self.add_subtract(key, amount, true).await
    }

    async fn get_array(&self, key: &str) -> Result<Vec<Value>> {
        match self.get(key).await? {
            None => Ok(Vec::new()),
            Some(Value::Array(items)) => Ok(items),
            Some(_) => Err(HorizonError::invalid_type(format!(
                "Current value with key: ({key}) is not an array"
            ))),
        }
    }

    async fn push_pull(&self, op: &str, key: &str, elements: &[Value]) -> Result<Vec<Value>> {
        require_key(key)?;
        if elements.is_empty() {
            return Err(HorizonError::missing_value(
                "Missing second argument (value)",
            ));
        }
        self.client.ensure_ready().await;
        let mut last: Option<Vec<Value>> = None;
        for element in elements {
            let data = match self
                .client
                .send(
                    op,
                    self.fields(vec![
                        ("key".to_owned(), Value::String(key.to_owned())),
                        ("element".to_owned(), element.clone()),
                    ]),
                )
                .await
            {
                Ok(data) => data,
                Err(e) => {
                    if matches!(e.kind(), ErrorKind::Op)
                        && contains_ci(&e.to_string(), "not an array")
                    {
                        return Err(HorizonError::invalid_type(format!(
                            "Current value with key: ({key}) is not an array"
                        )));
                    }
                    return Err(e);
                }
            };
            if let Some(arr) = Self::mutation_value(&data).and_then(|v| v.as_array()) {
                last = Some(arr.clone());
            }
        }
        if let Some(arr) = last {
            return Ok(arr);
        }
        self.get_array(key).await
    }

    pub async fn push(&self, key: &str, elements: Vec<Value>) -> Result<Vec<Value>> {
        self.push_pull("push", key, &elements).await
    }

    pub async fn pull(&self, key: &str, elements: Vec<Value>) -> Result<Vec<Value>> {
        self.push_pull("pull", key, &elements).await
    }

    /// Client-side predicate pull (mirrors the TS `pull` fallback used for
    /// function predicates / `once`): removes every matching element.
    pub async fn pull_where(
        &self,
        key: &str,
        matches: impl Fn(&Value) -> bool,
    ) -> Result<Vec<Value>> {
        require_key(key)?;
        self.client.ensure_ready().await;
        let current = self.get_array(key).await?;
        let kept: Vec<Value> = current.into_iter().filter(|v| !matches(v)).collect();
        self.set(key, Value::Array(kept.clone())).await?;
        Ok(kept)
    }

    pub async fn unshift(&self, key: &str, value: Value) -> Result<Vec<Value>> {
        require_key(key)?;
        if value.is_null() {
            return Err(HorizonError::invalid_type(
                "Missing second argument (value)",
            ));
        }
        let mut current = self.get_array(key).await?;
        match value {
            Value::Array(mut items) => {
                items.append(&mut current);
                current = items;
            }
            single => current.insert(0, single),
        }
        self.set(key, Value::Array(current.clone())).await?;
        Ok(current)
    }

    pub async fn pop(&self, key: &str) -> Result<Option<Value>> {
        require_key(key)?;
        let mut current = self.get_array(key).await?;
        let value = current.pop();
        self.set(key, Value::Array(current)).await?;
        Ok(value)
    }

    pub async fn shift(&self, key: &str) -> Result<Option<Value>> {
        require_key(key)?;
        let mut current = self.get_array(key).await?;
        let value = if current.is_empty() {
            None
        } else {
            Some(current.remove(0))
        };
        self.set(key, Value::Array(current)).await?;
        Ok(value)
    }

    pub async fn starts_with(&self, query: &str) -> Result<Vec<KvEntry>> {
        let rows = self.all().await?;
        Ok(rows
            .into_iter()
            .filter(|row| row.id.starts_with(query))
            .collect())
    }

    pub async fn export(&self) -> Result<Vec<KvEntry>> {
        self.all().await
    }
}

fn require_key(key: &str) -> Result<()> {
    if key.is_empty() {
        return Err(HorizonError::op("key is required"));
    }
    Ok(())
}

/// Mirrors `resolveTable` in sdk/src/utils.ts:
/// `[A-Za-z_][A-Za-z0-9_]{0,62}`.
fn validate_table(table: &str) -> Result<()> {
    let mut chars = table.chars();
    let first_ok = chars
        .next()
        .map(|c| c == '_' || c.is_ascii_alphabetic())
        .unwrap_or(false);
    let valid = first_ok
        && table.len() <= 63
        && table.chars().all(|c| c == '_' || c.is_ascii_alphanumeric());
    if valid {
        Ok(())
    } else {
        Err(HorizonError::invalid_type(format!(
            "invalid table name '{table}': expected [A-Za-z_][A-Za-z0-9_]{{0,62}}"
        )))
    }
}

fn json_type_name(value: &Value) -> &'static str {
    match value {
        Value::Null => "object",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "object",
        Value::Object(_) => "object",
    }
}

fn contains_ci(haystack: &str, needle: &str) -> bool {
    haystack.to_lowercase().contains(needle)
}

// ---------------------------------------------------------------------------
// Worker thread (blocking tungstenite + reconnect loop)
// ---------------------------------------------------------------------------

type WsStream = tungstenite::stream::MaybeTlsStream<std::net::TcpStream>;
type Socket = tungstenite::WebSocket<WsStream>;

struct PendingReq {
    op: String,
    fields: Map<String, Value>,
    reply: Option<oneshot::Sender<WorkerReply>>,
}

fn answer(req: &mut PendingReq, response: WorkerReply) {
    if let Some(tx) = req.reply.take() {
        let _ = tx.send(response);
    }
}

fn apply_read_timeout(sock: &Socket, timeout: Option<Duration>) {
    if let tungstenite::stream::MaybeTlsStream::Plain(inner) = sock.get_ref() {
        let _ = inner.set_read_timeout(timeout);
    }
}

fn is_read_timeout(err: &tungstenite::Error) -> bool {
    match err {
        tungstenite::Error::Io(io) => {
            io.kind() == std::io::ErrorKind::TimedOut || io.kind() == std::io::ErrorKind::WouldBlock
        }
        _ => false,
    }
}

fn worker_main(shared: Arc<Shared>, rx: std::sync::mpsc::Receiver<WorkerCmd>) {
    // Requests that arrive while disconnected wait here (mpsc has no
    // re-queue); they are transmitted once the socket is back, so `send`
    // never fails just because a reconnect is in flight.
    let mut stash: Vec<QueuedReq> = Vec::new();
    let mut delay_ms = 0u64;

    loop {
        if shared.is_closed() {
            if !shared.has_initial() {
                shared.set_initial(Err(HorizonError::closed("connection closed")));
            }
            shutdown(&rx, &mut stash);
            return;
        }
        if delay_ms > 0 {
            // Consumed below: fall through to the connection attempt so a
            // woken worker always retries instead of sleeping again.
            backoff_sleep(&shared, &rx, &mut stash, delay_ms);
            if shared.is_closed() {
                continue;
            }
        }
        match try_connect(&shared) {
            None => {
                if !shared.has_initial() {
                    shared.set_initial(Err(HorizonError::op(format!(
                        "unable to connect to {}",
                        shared.config.url
                    ))));
                }
                delay_ms = next_backoff(&shared, delay_ms);
            }
            Some(sock) => {
                delay_ms = 0;
                if serve_connection(&shared, &rx, &mut stash, sock) {
                    shutdown(&rx, &mut stash);
                    return;
                }
                delay_ms = next_backoff(&shared, delay_ms);
            }
        }
    }
}

/// Returns true when the client was closed and the worker must exit.
fn serve_connection(
    shared: &Arc<Shared>,
    rx: &std::sync::mpsc::Receiver<WorkerCmd>,
    stash: &mut Vec<QueuedReq>,
    mut sock: Socket,
) -> bool {
    let report_initial = !shared.has_initial();
    let login_deadline = shared
        .timeout()
        .unwrap_or(Duration::from_millis(LOGIN_TIMEOUT_FALLBACK_MS));
    let mut session: Option<String> = None;

    // Both credentials are required before any (re-)login, mirroring
    // `username !== undefined && password !== undefined` in
    // sdk/src/connection.ts: half credentials mean anonymous access.
    if shared.config.username.is_some() && shared.config.password.is_some() {
        let username = shared.config.username.clone().unwrap_or_default();
        let password = shared.config.password.clone().unwrap_or_default();
        match login_sync(&mut sock, &username, &password, login_deadline) {
            Ok(id) => {
                session = Some(id);
                if report_initial {
                    shared.set_initial(Ok(()));
                }
            }
            Err(LoginError::Auth(msg)) => {
                // Like the TS SDK after a rejected initial login: surface it
                // via `ready()` but keep the (sessionless) socket, so later
                // ops fail fast with Auth instead of hanging. Reconnects
                // after a socket drop keep retrying the login instead.
                if report_initial {
                    shared.set_initial(Err(HorizonError::auth(msg)));
                } else {
                    let _ = sock.close(None);
                    return false;
                }
            }
            Err(LoginError::Conn(msg)) => {
                if report_initial {
                    shared.set_initial(Err(HorizonError::op(msg)));
                }
                let _ = sock.close(None);
                return false;
            }
            Err(LoginError::Closed) => {
                if shared.is_closed() {
                    return true;
                }
                if report_initial {
                    shared.set_initial(Err(HorizonError::closed("connection closed during login")));
                }
                return false;
            }
        }
    } else if report_initial {
        shared.set_initial(Ok(()));
    }

    shared.set_connected(true);
    let closed = serve_loop(shared, rx, stash, &mut sock, session, login_deadline);
    shared.set_connected(false);
    let _ = sock.close(None);
    closed
}

fn next_backoff(shared: &Shared, current: u64) -> u64 {
    let base = shared.config.reconnect_base_ms.max(1);
    let max = shared.config.reconnect_max_ms.max(base);
    if current == 0 {
        base.min(max)
    } else {
        current.saturating_mul(2).min(max)
    }
}

/// Backoff sleep that still collects incoming commands into the stash, so
/// `close()` stays prompt and nothing is lost across the reconnect.
fn backoff_sleep(
    shared: &Shared,
    rx: &std::sync::mpsc::Receiver<WorkerCmd>,
    stash: &mut Vec<QueuedReq>,
    ms: u64,
) {
    let deadline = Instant::now() + Duration::from_millis(ms);
    while Instant::now() < deadline {
        if shared.is_closed() {
            return;
        }
        match rx.recv_timeout(Duration::from_millis(READ_TICK_MS)) {
            Ok(WorkerCmd::Request(req)) => stash.push(req),
            Ok(WorkerCmd::ProbeLiveness) => {
                // Already reconnecting (mirrors the `reconnectGate` guard).
            }
            Ok(WorkerCmd::Shutdown) => {
                shared.closed.store(true, Ordering::SeqCst);
                return;
            }
            Err(_) => {}
        }
    }
}

/// Answer everything still queued with Closed and exit.
fn shutdown(rx: &std::sync::mpsc::Receiver<WorkerCmd>, stash: &mut Vec<QueuedReq>) {
    for req in stash.drain(..) {
        answer_req(req, WorkerReply::Closed("connection closed".to_owned()));
    }
    for cmd in rx.try_iter() {
        if let WorkerCmd::Request(req) = cmd {
            answer_req(req, WorkerReply::Closed("connection closed".to_owned()));
        }
    }
}

fn answer_req(req: QueuedReq, response: WorkerReply) {
    let _ = req.reply.send(response);
}

fn try_connect(shared: &Shared) -> Option<Socket> {
    let (sock, _) = tungstenite::connect(&shared.config.url).ok()?;
    apply_read_timeout(&sock, Some(Duration::from_millis(READ_TICK_MS)));
    shared.open_count.fetch_add(1, Ordering::SeqCst);
    Some(sock)
}

enum LoginError {
    Auth(String),
    Conn(String),
    Closed,
}

/// Blocking login round trip on an already-open socket.
fn login_sync(
    sock: &mut Socket,
    username: &str,
    password: &str,
    deadline: Duration,
) -> std::result::Result<String, LoginError> {
    let id = format!("login-{}", unique_id());
    let mut packet = Map::new();
    packet.insert("id".to_owned(), Value::String(id.clone()));
    packet.insert("operation".to_owned(), Value::String("login".to_owned()));
    packet.insert("login".to_owned(), Value::String(username.to_owned()));
    packet.insert("password".to_owned(), Value::String(password.to_owned()));
    if sock
        .send(tungstenite::Message::Text(
            Value::Object(packet).to_string(),
        ))
        .is_err()
    {
        return Err(LoginError::Closed);
    }
    let until = Instant::now() + deadline;
    loop {
        if Instant::now() >= until {
            return Err(LoginError::Conn("request timed out: login".to_owned()));
        }
        match sock.read() {
            Ok(tungstenite::Message::Text(text)) => {
                if let Some((pid, is_err, data, err)) = parse_response(&text) {
                    if pid != id {
                        continue;
                    }
                    if is_err {
                        let msg = err.unwrap_or_else(|| "unknown server error".to_owned());
                        if contains_ci(&msg, "credential") {
                            return Err(LoginError::Auth("invalid credentials".to_owned()));
                        }
                        return Err(LoginError::Conn(msg));
                    }
                    match data.and_then(|d| {
                        d.get("sessionId")
                            .and_then(|v| v.as_str())
                            .map(str::to_owned)
                    }) {
                        Some(sid) => return Ok(sid),
                        None => return Err(LoginError::Auth("invalid credentials".to_owned())),
                    }
                }
            }
            Ok(_) => {}
            Err(e) if is_read_timeout(&e) => {}
            Err(_) => return Err(LoginError::Closed),
        }
    }
}

/// Request loop on one socket. Returns true when the client was closed.
/// Stale responses (answered after the caller's timeout) are dropped.
fn serve_loop(
    shared: &Arc<Shared>,
    rx: &std::sync::mpsc::Receiver<WorkerCmd>,
    stash: &mut Vec<QueuedReq>,
    sock: &mut Socket,
    mut session: Option<String>,
    login_deadline: Duration,
) -> bool {
    let mut pending: HashMap<String, PendingReq> = HashMap::new();
    let mut last_rx = Instant::now();
    let mut seq = 0u64;

    // Requests collected during the outage go first, in arrival order.
    for req in stash.drain(..) {
        seq += 1;
        if !transmit(shared, sock, &mut pending, seq, req, session.as_deref()) {
            fail_all(&mut pending, "connection closed");
            return false;
        }
    }

    loop {
        if shared.is_closed() {
            fail_all(&mut pending, "connection closed");
            for cmd in rx.try_iter() {
                if let WorkerCmd::Request(req) = cmd {
                    answer_req(req, WorkerReply::Closed("connection closed".to_owned()));
                }
            }
            return true;
        }

        // Inbound.
        match sock.read() {
            Ok(tungstenite::Message::Text(text)) => {
                last_rx = Instant::now();
                if let Some((pid, is_err, data, err)) = parse_response(&text) {
                    if let Some(mut req) = pending.remove(&pid) {
                        if is_err {
                            let msg = err.unwrap_or_else(|| "unknown server error".to_owned());
                            if contains_ci(&msg, "session")
                                && shared.config.username.is_some()
                                && shared.config.password.is_some()
                            {
                                // Mirrors `request()` re-auth: one re-login,
                                // then the operation is retried once.
                                let username = shared.config.username.clone().unwrap_or_default();
                                let password = shared.config.password.clone().unwrap_or_default();
                                match login_sync(sock, &username, &password, login_deadline) {
                                    Ok(sid) => {
                                        session = Some(sid);
                                        shared.set_connected(true);
                                        let text = build_packet(
                                            &pid,
                                            &req.op,
                                            &req.fields,
                                            session.as_deref(),
                                            shared.timeout(),
                                        );
                                        if sock.send(tungstenite::Message::Text(text)).is_ok() {
                                            pending.insert(pid, req);
                                        } else {
                                            answer(
                                                &mut req,
                                                WorkerReply::Closed("connection closed".to_owned()),
                                            );
                                            fail_all(&mut pending, "connection closed");
                                            return false;
                                        }
                                    }
                                    Err(LoginError::Auth(m)) => {
                                        answer(&mut req, WorkerReply::Auth(m));
                                    }
                                    Err(LoginError::Conn(m)) => {
                                        answer(&mut req, WorkerReply::Op(m));
                                    }
                                    Err(LoginError::Closed) => {
                                        answer(
                                            &mut req,
                                            WorkerReply::Closed("connection closed".to_owned()),
                                        );
                                        fail_all(&mut pending, "connection closed");
                                        return false;
                                    }
                                }
                            } else {
                                answer(&mut req, WorkerReply::Op(msg));
                            }
                        } else {
                            answer(&mut req, WorkerReply::Data(data.unwrap_or(Value::Null)));
                        }
                    }
                }
            }
            Ok(tungstenite::Message::Close(_)) => {
                // Peer-initiated close: reconnect like the TS `close` event.
                fail_all(&mut pending, "connection closed");
                return false;
            }
            Ok(_) => {
                last_rx = Instant::now();
            }
            Err(e) if is_read_timeout(&e) => {
                // Tick: drain queue, check liveness below.
            }
            Err(_) => {
                fail_all(&mut pending, "connection closed");
                return false;
            }
        }

        // Outbound: drain queued commands.
        for cmd in rx.try_iter() {
            match cmd {
                WorkerCmd::Shutdown => {
                    shared.closed.store(true, Ordering::SeqCst);
                    fail_all(&mut pending, "connection closed");
                    for queued in stash.drain(..) {
                        answer_req(queued, WorkerReply::Closed("connection closed".to_owned()));
                    }
                    return true;
                }
                WorkerCmd::Request(req) => {
                    seq += 1;
                    if !transmit(shared, sock, &mut pending, seq, req, session.as_deref()) {
                        fail_all(&mut pending, "connection closed");
                        return false;
                    }
                }
                WorkerCmd::ProbeLiveness => {
                    // Drop entries whose caller already gave up (mirrors
                    // `pending.delete` in the TS timer), then reset a link
                    // that delivered nothing for a whole request window
                    // (mirrors `checkLiveness`, which also ignores whether
                    // anything is still pending).
                    pending.retain(|_, req| {
                        req.reply.as_ref().map(|tx| !tx.is_closed()).unwrap_or(true)
                    });
                    if let Some(timeout) = shared.timeout() {
                        if last_rx.elapsed() >= timeout {
                            fail_all(&mut pending, "connection reset: no response from server");
                            return false;
                        }
                    }
                }
            }
        }

        // Drop responses for callers that already timed out (their receivers
        // are gone), mirroring `pending.delete` in the TS timer callback.
        pending.retain(|_, req| req.reply.as_ref().map(|tx| !tx.is_closed()).unwrap_or(true));
    }
}

fn transmit(
    shared: &Shared,
    sock: &mut Socket,
    pending: &mut HashMap<String, PendingReq>,
    seq: u64,
    req: QueuedReq,
    session: Option<&str>,
) -> bool {
    let pid = format!("r{}-{seq}", unique_id());
    let text = build_packet(&pid, &req.op, &req.fields, session, shared.timeout());
    match sock.send(tungstenite::Message::Text(text)) {
        Ok(()) => {
            pending.insert(
                pid,
                PendingReq {
                    op: req.op,
                    fields: req.fields,
                    reply: Some(req.reply),
                },
            );
            true
        }
        Err(_) => {
            let _ = req
                .reply
                .send(WorkerReply::Closed("connection closed".to_owned()));
            false
        }
    }
}

fn build_packet(
    id: &str,
    operation: &str,
    fields: &Map<String, Value>,
    session: Option<&str>,
    timeout: Option<Duration>,
) -> String {
    let mut packet = Map::with_capacity(fields.len() + 4);
    packet.insert("id".to_owned(), Value::String(id.to_owned()));
    packet.insert("operation".to_owned(), Value::String(operation.to_owned()));
    for (k, v) in fields {
        packet.insert(k.clone(), v.clone());
    }
    if let Some(sid) = session {
        packet.insert("sessionId".to_owned(), Value::String(sid.to_owned()));
    }
    if let Some(ms) = timeout {
        packet.insert(
            "timeoutMs".to_owned(),
            Value::Number((ms.as_millis() as u64).into()),
        );
    }
    Value::Object(packet).to_string()
}

/// Returns `(id, is_error, data, error_message)` for a server frame.
fn parse_response(text: &str) -> Option<(String, bool, Option<Value>, Option<String>)> {
    let v: Value = serde_json::from_str(text).ok()?;
    let id = v.get("id")?.as_str()?.to_owned();
    let kind = v.get("type").and_then(|t| t.as_str()).unwrap_or("response");
    if kind == "error" {
        let msg = v.get("error").and_then(|e| e.as_str()).map(str::to_owned);
        Some((id, true, None, msg))
    } else {
        let data = v.get("data").cloned();
        Some((id, false, data, None))
    }
}

fn fail_all(pending: &mut HashMap<String, PendingReq>, message: &str) {
    for (_, mut req) in pending.drain() {
        answer(&mut req, WorkerReply::Closed(message.to_owned()));
    }
}

fn unique_id() -> u64 {
    static CTR: AtomicU64 = AtomicU64::new(1);
    CTR.fetch_add(1, Ordering::Relaxed)
}

// ---------------------------------------------------------------------------
// Tests (in-process mock WS server over tokio, tungstenite protocol)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    struct MockState {
        tables: Mutex<HashMap<String, HashMap<String, Value>>>,
        sessions: Mutex<HashSet<String>>,
        username: Option<String>,
        password: Option<String>,
        report_existed: bool,
        drop_after_login: AtomicBool,
        packets: Mutex<Vec<Value>>,
        has_calls: AtomicU64,
        kill: Mutex<Vec<std::net::TcpStream>>,
    }

    fn split_key(key: &str) -> Option<(String, Vec<String>)> {
        if key.is_empty() {
            return None;
        }
        let mut parts = key.split('.').map(str::to_owned).collect::<Vec<_>>();
        if parts.iter().any(|p| p.is_empty()) {
            return None;
        }
        let base = parts.remove(0);
        Some((base, parts))
    }

    fn walk<'a>(doc: &'a Value, path: &[String]) -> Option<&'a Value> {
        let mut cur = doc;
        for seg in path {
            match cur {
                Value::Object(map) => cur = map.get(seg)?,
                _ => return None,
            }
        }
        Some(cur)
    }

    fn walk_mut<'a>(doc: &'a mut Value, path: &[String]) -> Option<&'a mut Value> {
        let mut cur = doc;
        for seg in path {
            match cur {
                Value::Object(map) => cur = map.get_mut(seg)?,
                _ => return None,
            }
        }
        Some(cur)
    }

    fn ensure_path(doc: &mut Value, path: &[String]) -> std::result::Result<(), String> {
        let mut cur = doc;
        for seg in path {
            if cur.is_null() {
                *cur = Value::Object(Map::new());
            }
            match cur {
                Value::Object(map) => {
                    cur = map.entry(seg.clone()).or_insert(Value::Null);
                }
                _ => return Err("cannot set nested value on non-object".to_owned()),
            }
        }
        Ok(())
    }

    fn lock<T>(m: &Mutex<T>) -> std::result::Result<std::sync::MutexGuard<'_, T>, String> {
        m.lock().map_err(|_| "lock poisoned".to_owned())
    }

    fn handle(state: &Arc<MockState>, pkt: &Value) -> std::result::Result<Value, String> {
        let op = pkt.get("operation").and_then(|v| v.as_str()).unwrap_or("");
        if op == "login" {
            let login = pkt.get("login").and_then(|v| v.as_str()).unwrap_or("");
            let password = pkt.get("password").and_then(|v| v.as_str()).unwrap_or("");
            let ok = match (&state.username, &state.password) {
                (Some(u), Some(p)) => login == u && password == p,
                _ => true,
            };
            if !ok {
                return Err("invalid credentials".to_owned());
            }
            let sid = format!("sess-{}", unique_id());
            lock(&state.sessions)?.insert(sid.clone());
            return Ok(serde_json::json!({ "success": true, "sessionId": sid }));
        }
        if state.username.is_some() {
            let sid = pkt.get("sessionId").and_then(|v| v.as_str()).unwrap_or("");
            if !lock(&state.sessions)?.contains(sid) {
                return Err("invalid or expired session".to_owned());
            }
        }
        if op == "logout" {
            if let Some(sid) = pkt.get("sessionId").and_then(|v| v.as_str()) {
                lock(&state.sessions)?.remove(sid);
            }
            return Ok(serde_json::json!({ "success": true }));
        }
        let table = pkt
            .get("table")
            .and_then(|v| v.as_str())
            .unwrap_or("json")
            .to_owned();
        if op == "all" {
            let tables = lock(&state.tables)?;
            let entries = tables
                .get(&table)
                .map(|t| {
                    t.iter()
                        .map(|(id, value)| serde_json::json!({ "id": id, "value": value }))
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            return Ok(Value::Array(entries));
        }
        if op == "deleteAll" {
            lock(&state.tables)?.insert(table, HashMap::new());
            return Ok(serde_json::json!({ "success": true }));
        }
        let key = pkt.get("key").and_then(|v| v.as_str()).unwrap_or("");
        let (base, path) = split_key(key).ok_or_else(|| "key is required".to_owned())?;
        let mut tables = lock(&state.tables)?;
        let bucket = tables.entry(table).or_default();
        match op {
            "get" => {
                let default = pkt.get("defaultValue").cloned();
                let out = match bucket.get(&base) {
                    None => default.unwrap_or(Value::Null),
                    Some(doc) if path.is_empty() => doc.clone(),
                    Some(doc) => walk(doc, &path).cloned().or(default).unwrap_or(Value::Null),
                };
                Ok(out)
            }
            "set" => {
                let value = pkt.get("value").cloned().unwrap_or(Value::Null);
                if path.is_empty() {
                    bucket.insert(base, value);
                } else {
                    let doc = bucket.entry(base).or_insert(serde_json::json!({}));
                    ensure_path(doc, &path[..path.len() - 1])?;
                    let leaf = path[path.len() - 1].clone();
                    match walk_mut(doc, &path[..path.len() - 1]) {
                        Some(Value::Object(map)) => {
                            map.insert(leaf, value);
                        }
                        _ => return Err("cannot set nested value on non-object".to_owned()),
                    }
                }
                Ok(serde_json::json!({ "success": true }))
            }
            "has" => {
                state.has_calls.fetch_add(1, Ordering::SeqCst);
                let exists = match bucket.get(&base) {
                    None => false,
                    Some(doc) if path.is_empty() => !doc.is_null(),
                    Some(doc) => walk(doc, &path).map(|v| !v.is_null()).unwrap_or(false),
                };
                Ok(Value::Bool(exists))
            }
            "delete" => {
                let existed = if path.is_empty() {
                    bucket.remove(&base).is_some()
                } else {
                    match bucket.get_mut(&base) {
                        None => false,
                        Some(doc) => {
                            let parent = &path[..path.len() - 1];
                            let leaf = &path[path.len() - 1];
                            match walk_mut(doc, parent) {
                                Some(Value::Object(map)) => map.remove(leaf).is_some(),
                                _ => false,
                            }
                        }
                    }
                };
                Ok(delete_resp(state.report_existed, existed))
            }
            "add" | "sub" => {
                let requested = pkt.get("amount").and_then(|v| v.as_f64()).unwrap_or(1.0);
                if !requested.is_finite() {
                    return Err("amount must be finite".to_owned());
                }
                let delta = if op == "add" { requested } else { -requested };
                let doc = bucket.entry(base).or_insert(if path.is_empty() {
                    Value::from(0.0)
                } else {
                    serde_json::json!({})
                });
                ensure_path(doc, &path)?;
                let slot = if path.is_empty() {
                    &mut *doc
                } else {
                    walk_mut(doc, &path).ok_or_else(|| "key is required".to_owned())?
                };
                let cur = if slot.is_null() {
                    0.0
                } else {
                    slot.as_f64()
                        .ok_or_else(|| "cannot add to non-numeric value".to_owned())?
                };
                let next = cur + delta;
                *slot = Value::from(next);
                Ok(serde_json::json!({ "success": true, "value": next }))
            }
            "push" | "pull" => {
                let element = pkt.get("element").cloned().unwrap_or(Value::Null);
                let doc = bucket.entry(base).or_insert(if path.is_empty() {
                    Value::Array(vec![])
                } else {
                    serde_json::json!({})
                });
                ensure_path(doc, &path)?;
                let slot = if path.is_empty() {
                    &mut *doc
                } else {
                    walk_mut(doc, &path).ok_or_else(|| "key is required".to_owned())?
                };
                if slot.is_null() {
                    *slot = Value::Array(vec![]);
                }
                match slot {
                    Value::Array(arr) => {
                        if op == "push" {
                            arr.push(element);
                        } else {
                            arr.retain(|v| v != &element);
                        }
                        if pkt
                            .get("returnValue")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false)
                        {
                            Ok(serde_json::json!({ "success": true, "value": arr.clone() }))
                        } else {
                            Ok(serde_json::json!({ "success": true }))
                        }
                    }
                    _ => Err("target value is not an array".to_owned()),
                }
            }
            _ => Err(format!("Unknown operation: {op}")),
        }
    }

    fn delete_resp(report: bool, existed: bool) -> Value {
        if report {
            serde_json::json!({ "success": true, "existed": existed })
        } else {
            serde_json::json!({ "success": true })
        }
    }

    struct MockServer {
        addr: std::net::SocketAddr,
        state: Arc<MockState>,
    }

    impl MockServer {
        async fn spawn(report_existed: bool, auth: bool, drop_after_login: bool) -> Self {
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let addr = listener.local_addr().unwrap();
            let state = Arc::new(MockState {
                tables: Mutex::new(HashMap::new()),
                sessions: Mutex::new(HashSet::new()),
                username: if auth { Some("user".to_owned()) } else { None },
                password: if auth { Some("pass".to_owned()) } else { None },
                report_existed,
                drop_after_login: AtomicBool::new(drop_after_login),
                packets: Mutex::new(Vec::new()),
                has_calls: AtomicU64::new(0),
                kill: Mutex::new(Vec::new()),
            });
            let accept_state = Arc::clone(&state);
            tokio::spawn(async move {
                loop {
                    let Ok((sock, _)) = listener.accept().await else {
                        break;
                    };
                    let Ok(std_sock) = sock.into_std() else {
                        continue;
                    };
                    // `into_std` preserves tokio's nonblocking mode; the
                    // blocking tungstenite server needs it cleared.
                    let _ = std_sock.set_nonblocking(false);
                    if let Ok(clone) = std_sock.try_clone() {
                        if let Ok(mut k) = accept_state.kill.lock() {
                            k.push(clone);
                        }
                    }
                    let conn_state = Arc::clone(&accept_state);
                    tokio::task::spawn_blocking(move || serve(conn_state, std_sock));
                }
            });
            Self { addr, state }
        }

        fn url(&self) -> String {
            format!("ws://{addr}", addr = self.addr)
        }

        fn kill_active(&self) {
            if let Ok(k) = self.state.kill.lock() {
                for s in k.iter() {
                    let _ = s.shutdown(std::net::Shutdown::Both);
                }
            }
        }
    }

    fn serve(state: Arc<MockState>, stream: std::net::TcpStream) {
        let mut ws = match tungstenite::accept(stream) {
            Ok(ws) => ws,
            Err(_) => return,
        };
        loop {
            let text = match ws.read() {
                Ok(tungstenite::Message::Text(t)) => t,
                Ok(_) => continue,
                Err(_) => return,
            };
            let pkt: Value = match serde_json::from_str(&text) {
                Ok(p) => p,
                Err(_) => continue,
            };
            if text.contains("__hang__") {
                // Never answer: exercises the client-side timeout.
                continue;
            }
            if let Ok(mut log) = state.packets.lock() {
                log.push(pkt.clone());
            }
            let id = pkt
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_owned();
            if state.drop_after_login.load(Ordering::SeqCst)
                && pkt.get("operation").and_then(|v| v.as_str()) == Some("login")
            {
                lock(&state.sessions)
                    .map(|mut s| s.insert("sess-drop".to_owned()))
                    .ok();
                let resp = serde_json::json!({
                    "id": id, "type": "response",
                    "data": { "success": true, "sessionId": "sess-drop" },
                    "error": Value::Null,
                });
                let _ = ws.send(tungstenite::Message::Text(resp.to_string()));
                let _ = ws.close(None);
                // The `kill` clone below would otherwise keep the connection
                // half-open (no FIN): shut the transport down so the client
                // observes the drop.
                ws.get_ref().shutdown(std::net::Shutdown::Both).ok();
                return;
            }
            let resp = match handle(&state, &pkt) {
                Ok(data) => {
                    serde_json::json!({ "id": id, "type": "response", "data": data, "error": Value::Null })
                }
                Err(e) => {
                    serde_json::json!({ "id": id, "type": "error", "data": Value::Null, "error": e })
                }
            };
            if ws
                .send(tungstenite::Message::Text(resp.to_string()))
                .is_err()
            {
                return;
            }
        }
    }

    fn test_client(server: &MockServer, timeout_ms: u64) -> HorizonClient {
        HorizonClient::with_config(HorizonConfig {
            url: server.url(),
            username: Some("user".to_owned()),
            password: Some("pass".to_owned()),
            request_timeout_ms: timeout_ms,
            reconnect_base_ms: 10,
            reconnect_max_ms: 50,
        })
    }

    #[tokio::test]
    async fn handshake_ok_and_login_packet_shape() {
        let server = MockServer::spawn(true, true, false).await;
        let client = test_client(&server, 2_000);
        client.ready().await.expect("ready");
        assert!(client.connection_count() >= 1);
        let packets = server.state.packets.lock().unwrap();
        let login = packets
            .iter()
            .find(|p| p.get("operation").and_then(|v| v.as_str()) == Some("login"))
            .expect("login packet");
        assert_eq!(login.get("login").and_then(|v| v.as_str()), Some("user"));
        assert_eq!(login.get("password").and_then(|v| v.as_str()), Some("pass"));
        client.close();
    }

    #[tokio::test]
    async fn handshake_bad_password_is_auth_error() {
        let server = MockServer::spawn(true, true, false).await;
        let client = HorizonClient::with_config(HorizonConfig {
            url: server.url(),
            username: Some("user".to_owned()),
            password: Some("wrong".to_owned()),
            request_timeout_ms: 2_000,
            reconnect_base_ms: 10,
            reconnect_max_ms: 50,
        });
        let err = client.ready().await.expect_err("must fail");
        assert_eq!(err.kind(), ErrorKind::Auth);
        client.close();
    }

    #[tokio::test]
    async fn set_get_roundtrip_and_missing_is_none() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        assert_eq!(db.get("missing").await.unwrap(), None);
        db.set("k", serde_json::json!({"a": 1})).await.unwrap();
        assert_eq!(
            db.get("k").await.unwrap(),
            Some(serde_json::json!({"a": 1}))
        );
        assert!(db.has("k").await.unwrap());
        assert!(!db.has("missing").await.unwrap());
        db.close();
    }

    #[tokio::test]
    async fn set_null_is_missing_value() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        let _ = db.client.ready().await;
        let err = db.set("k", Value::Null).await.expect_err("null rejected");
        assert_eq!(err.kind(), ErrorKind::MissingValue);
        db.close();
    }

    #[tokio::test]
    async fn add_sub_math_and_invalid_type() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        assert_eq!(db.add("n", 2.0).await.unwrap(), 2.0);
        assert_eq!(db.add("n", 3.0).await.unwrap(), 5.0);
        assert_eq!(db.sub("n", 1.0).await.unwrap(), 4.0);
        assert_eq!(db.sub("fresh", 3.0).await.unwrap(), -3.0);
        db.set("s", Value::String("x".to_owned())).await.unwrap();
        let err = db.add("s", 1.0).await.expect_err("non-numeric");
        assert_eq!(err.kind(), ErrorKind::InvalidType);
        let err = db.add("n", f64::NAN).await.expect_err("nan");
        assert_eq!(err.kind(), ErrorKind::InvalidType);
        db.close();
    }

    #[tokio::test]
    async fn push_pull_arrays_and_guards() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        assert_eq!(
            db.push("arr", vec![Value::from(1), Value::from(2)])
                .await
                .unwrap(),
            vec![Value::from(1), Value::from(2)]
        );
        assert_eq!(
            db.pull("arr", vec![Value::from(1)]).await.unwrap(),
            vec![Value::from(2)]
        );
        db.set("nope", Value::from(1)).await.unwrap();
        let err = db
            .push("nope", vec![Value::from(1)])
            .await
            .expect_err("not array");
        assert_eq!(err.kind(), ErrorKind::InvalidType);
        let err = db.push("arr", vec![]).await.expect_err("empty");
        assert_eq!(err.kind(), ErrorKind::MissingValue);
        db.close();
    }

    #[tokio::test]
    async fn update_merges_and_rejects_non_objects() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        db.set("u", serde_json::json!({"a": 1})).await.unwrap();
        let out = db.update("u", serde_json::json!({"b": 2})).await.unwrap();
        assert_eq!(out, serde_json::json!({"a": 1, "b": 2}));
        db.set("arr", serde_json::json!([1])).await.unwrap();
        let err = db
            .update("arr", serde_json::json!({"b": 2}))
            .await
            .expect_err("array");
        assert_eq!(err.kind(), ErrorKind::InvalidType);
        let err = db
            .update("u", Value::from(1))
            .await
            .expect_err("patch type");
        assert_eq!(err.kind(), ErrorKind::InvalidType);
        db.close();
    }

    #[tokio::test]
    async fn unshift_pop_shift() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        assert_eq!(
            db.unshift("q", Value::from(1)).await.unwrap(),
            vec![Value::from(1)]
        );
        assert_eq!(
            db.unshift("q", Value::from(0)).await.unwrap(),
            vec![Value::from(0), Value::from(1)]
        );
        assert_eq!(db.pop("q").await.unwrap(), Some(Value::from(1)));
        assert_eq!(db.shift("q").await.unwrap(), Some(Value::from(0)));
        assert_eq!(db.pop("q").await.unwrap(), None);
        db.close();
    }

    #[tokio::test]
    async fn delete_probe_new_server_reports_existed() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        db.set("d", Value::from(1)).await.unwrap();
        server.state.has_calls.store(0, Ordering::SeqCst);
        assert_eq!(db.delete("d").await.unwrap(), 1);
        assert_eq!(db.delete("d").await.unwrap(), 0);
        // First delete probed; the second reused the capability flag.
        assert_eq!(server.state.has_calls.load(Ordering::SeqCst), 1);
        db.close();
    }

    #[tokio::test]
    async fn delete_probe_old_server_falls_back_to_has() {
        let server = MockServer::spawn(false, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        db.set("d", Value::from(1)).await.unwrap();
        server.state.has_calls.store(0, Ordering::SeqCst);
        assert_eq!(db.delete("d").await.unwrap(), 1);
        assert_eq!(db.delete("d").await.unwrap(), 0);
        // No `existed` report: every delete probes first.
        assert_eq!(server.state.has_calls.load(Ordering::SeqCst), 2);
        db.close();
    }

    #[tokio::test]
    async fn delete_all_returns_zero_and_clears() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        db.set("a", Value::from(1)).await.unwrap();
        assert_eq!(db.delete_all().await.unwrap(), 0);
        assert!(!db.has("a").await.unwrap());
        db.close();
    }

    #[tokio::test]
    async fn all_starts_with_export_and_tables() {
        let server = MockServer::spawn(true, true, false).await;
        let client = test_client(&server, 2_000);
        let t1 = client.table("t1").unwrap();
        let t2 = client.table("t2").unwrap();
        t1.set("guild_1", Value::from(1)).await.unwrap();
        t1.set("guild_2", Value::from(2)).await.unwrap();
        t2.set("guild_1", Value::from(9)).await.unwrap();
        assert_eq!(t1.all().await.unwrap().len(), 2);
        assert_eq!(t1.starts_with("guild").await.unwrap().len(), 2);
        assert_eq!(t1.starts_with("guild_1").await.unwrap().len(), 1);
        assert_eq!(t1.export().await.unwrap().len(), 2);
        assert_eq!(t2.get("guild_1").await.unwrap(), Some(Value::from(9)));
        assert!(client.table("bad-name!").is_err());
        client.close();
    }

    #[tokio::test]
    async fn dot_nested_keys_resolve() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 2_000).default_table();
        db.set("a.b", Value::from(1)).await.unwrap();
        assert_eq!(
            db.get("a").await.unwrap(),
            Some(serde_json::json!({"b": 1}))
        );
        assert_eq!(db.get("a.b").await.unwrap(), Some(Value::from(1)));
        assert_eq!(db.add("a.b", 2.0).await.unwrap(), 3.0);
        assert!(db.has("a.b").await.unwrap());
        assert_eq!(db.delete("a.b").await.unwrap(), 1);
        assert!(!db.has("a.b").await.unwrap());
        db.close();
    }

    #[tokio::test]
    async fn request_timeout_errors() {
        let server = MockServer::spawn(true, true, false).await;
        let db = test_client(&server, 200).default_table();
        let err = db.get("__hang__").await.expect_err("must time out");
        assert_eq!(err.kind(), ErrorKind::Timeout);
        db.close();
    }

    #[tokio::test]
    async fn reconnect_after_kill_serves_again() {
        let server = MockServer::spawn(true, true, false).await;
        let client = test_client(&server, 3_000);
        client.ready().await.expect("ready");
        server.kill_active();
        // Wait for the worker to notice the drop and reconnect on its own.
        let deadline = Instant::now() + Duration::from_secs(5);
        while client.connection_count() < 2 && Instant::now() < deadline {
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
        assert!(client.connection_count() >= 2, "worker reconnected");
        let db = client.default_table();
        db.set("rk", Value::from(7))
            .await
            .expect("write after reconnect");
        assert_eq!(db.get("rk").await.unwrap(), Some(Value::from(7)));
        client.close();
    }

    #[tokio::test]
    async fn reconnect_after_login_drop() {
        let server = MockServer::spawn(true, true, true).await;
        let client = test_client(&server, 5_000);
        // First socket is dropped right after login; the initial handshake
        // therefore fails, but the worker keeps cycling until it holds a
        // live session.
        let _ = client.ready().await;
        server.state.drop_after_login.store(false, Ordering::SeqCst);
        let db = client.default_table();
        db.set("k", Value::from(1)).await.expect("recovered");
        assert_eq!(db.get("k").await.unwrap(), Some(Value::from(1)));
        client.close();
    }

    #[tokio::test]
    async fn half_credentials_send_no_login_like_ts() {
        // TS `Connection` only logs in when BOTH username and password are
        // defined; half credentials mean anonymous access, never an
        // empty-password login attempt.
        let server = MockServer::spawn(true, false, false).await;
        let client = HorizonClient::with_config(HorizonConfig {
            url: server.url(),
            username: Some("user".to_owned()),
            password: None,
            request_timeout_ms: 2_000,
            reconnect_base_ms: 10,
            reconnect_max_ms: 50,
        });
        client.ready().await.expect("ready without login");
        let db = client.default_table();
        db.set("k", Value::from(1)).await.expect("op works");
        assert_eq!(db.get("k").await.unwrap(), Some(Value::from(1)));
        let packets = server.state.packets.lock().unwrap();
        assert!(
            packets
                .iter()
                .all(|p| p.get("operation").and_then(|v| v.as_str()) != Some("login")),
            "no login packet with half credentials"
        );
        client.close();
    }

    #[tokio::test]
    async fn half_credentials_do_not_reauth_on_session_error() {
        // Same `&&` gate as `request()` in the TS SDK: without both
        // credentials a session rejection surfaces as-is (Op) instead of
        // triggering a doomed re-login with an empty password.
        let server = MockServer::spawn(true, true, false).await;
        let client = HorizonClient::with_config(HorizonConfig {
            url: server.url(),
            username: Some("user".to_owned()),
            password: None,
            request_timeout_ms: 2_000,
            reconnect_base_ms: 10,
            reconnect_max_ms: 50,
        });
        client.ready().await.expect("ready without login");
        let db = client.default_table();
        let err = db.get("k").await.expect_err("session rejected");
        assert_eq!(err.kind(), ErrorKind::Op);
        let packets = server.state.packets.lock().unwrap();
        assert!(
            packets
                .iter()
                .all(|p| p.get("operation").and_then(|v| v.as_str()) != Some("login")),
            "no re-login attempt with half credentials"
        );
        client.close();
    }
}
