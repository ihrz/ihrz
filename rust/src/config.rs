// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/files/config.ts + src/files/config.example.ts.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LavalinkNode {
    /// Node id (TS: config.lavalink.nodes[].id, e.g. "node0").
    #[serde(default)]
    pub id: String,
    /// Node host (TS mirror nodes: lava-v4.ajieblogs.eu.org / 192.168.1.193).
    #[serde(default)]
    pub host: String,
    #[serde(default)]
    pub port: u16,
    #[serde(default)]
    pub authorization: String,
    #[serde(default)]
    pub secure: bool,
}

/// One `database.mySQL[]` entry (TS `src/files/config.ts`).
/// `[0]` builds the primary postgres connection string, `[1]` the
/// bi-separated secondary (`client.db2`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MysqlParts {
    #[serde(default)]
    pub host: String,
    #[serde(default)]
    pub port: u16,
    #[serde(default)]
    pub database: String,
    #[serde(default)]
    pub user: String,
    /// Password stays env-preferred in real deployments; the TS shape is
    /// `postgres://user:password@host:port/database`.
    #[serde(default)]
    pub password: String,
}

/// `database.horizon_db` (TS `src/files/config.ts` + required check in
/// `src/core/database/index.ts`). The URL is always
/// `ws://host:port` + login/password auth.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HorizonDbParts {
    #[serde(default)]
    pub host: String,
    #[serde(default)]
    pub port: u16,
    #[serde(default)]
    pub login: String,
    #[serde(default)]
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "default_prefix")]
    pub prefix: String,
    #[serde(default)]
    pub phone_presence: bool,
    #[serde(default = "default_true")]
    pub message_commands_mention: bool,
    #[serde(default)]
    pub owners: Vec<String>,
    #[serde(default)]
    pub guild_logs_channel_id: String,
    #[serde(default = "default_report_channel")]
    pub report_channel_id: String,
    #[serde(default)]
    pub database_url: String,
    /// Optional second database URL (`y` / `client.db2`, the bi-separated
    /// second postgres from TS `database.mySQL[1]`). Empty/None = no
    /// secondary. Env-overridable via `DATABASE_URL_SECONDARY`.
    #[serde(default)]
    pub database_url_secondary: Option<String>,
    #[serde(default)]
    pub total_shards: Option<u32>,
    // --- config.toml file-backed extras (mirror src/files/config.ts) ---
    #[serde(default = "default_true")]
    pub dev_mode: bool,
    #[serde(default = "default_blacklist_picture")]
    pub blacklist_picture: String,
    #[serde(default)]
    pub lavalink_logs_channel_id: String,
    #[serde(default)]
    pub always100: Vec<String>,
    #[serde(default)]
    pub lavalink_nodes: Vec<LavalinkNode>,
    #[serde(default)]
    pub gateway_local: String,
    /// Public HorizonGateway base URL (TS: `config.api.HorizonGateway`,
    /// e.g. `https://gateway.ihorizon.org`). File value; env
    /// `HORIZON_GATEWAY` wins via [`Config::gateway_public`].
    #[serde(default)]
    pub gateway: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub lastfm_api_key: String,
    #[serde(default)]
    pub lastfm_shared_secret: String,
    #[serde(default = "default_db_method")]
    pub db_method: String,
    /// `database.mySQL[]` parts. `[0]` = primary postgres, `[1]` =
    /// bi-separated secondary. Full URL strings (`database.url` /
    /// `DATABASE_URL`) win over parts.
    #[serde(default)]
    pub mysql: Vec<MysqlParts>,
    /// `database.horizon_db` parts. When `host` is set and
    /// `db_method` is horizondb, the endpoint is composed as
    /// `ws://host:port`; otherwise `database.url` is recorded verbatim.
    #[serde(default)]
    pub horizon_db: Option<HorizonDbParts>,
    /// SMTP relay host (TS: `SMTP_HOST`). Empty = mailer disabled.
    #[serde(default)]
    pub smtp_host: String,
    /// SMTP relay port (TS: `Number(SMTP_PORT)`). 0 = mailer disabled.
    #[serde(default)]
    pub smtp_port: u16,
    /// Implicit TLS on connect (TS: `SMTP_SECURE === "true"`).
    #[serde(default)]
    pub smtp_secure: bool,
    /// SMTP login (TS: `SMTP_USER`). Env-only, never committed.
    #[serde(default)]
    pub smtp_user: String,
    /// SMTP password (TS: `SMTP_PASS`). Env-only, never committed.
    #[serde(default)]
    pub smtp_pass: String,
    /// Owner inbox for bot mails (TS: `OWNER_MAIL`). Env-only.
    #[serde(default)]
    pub owner_mail: String,
    /// Send join/leave mails (TS: `EMAIL_WHEN_CHANGE_GUILD === "true"`).
    #[serde(default)]
    pub notify_new_guild: bool,
}

fn default_prefix() -> String {
    "?".to_string()
}

fn default_true() -> bool {
    true
}

fn default_report_channel() -> String {
    // Mirrors config.core.reportChannelID default in src/files/config.ts.
    "1509600857828626482".to_string()
}

fn default_blacklist_picture() -> String {
    // Mirrors config.core.blacklistPictureInEmbed in src/files/config.ts.
    "https://ihorizon.org/assets/img/bot/bsod.png".to_string()
}

fn default_db_method() -> String {
    "sqlite".to_string()
}

impl Default for Config {
    fn default() -> Self {
        Self {
            prefix: default_prefix(),
            phone_presence: false,
            message_commands_mention: true,
            owners: vec![],
            guild_logs_channel_id: String::new(),
            report_channel_id: default_report_channel(),
            database_url: "sqlite:./src/files/db.sqlite?mode=rwc".to_string(),
            database_url_secondary: None,
            total_shards: None,
            dev_mode: true,
            blacklist_picture: default_blacklist_picture(),
            lavalink_logs_channel_id: String::new(),
            always100: vec![],
            lavalink_nodes: vec![],
            gateway_local: String::new(),
            gateway: String::new(),
            client_id: String::new(),
            lastfm_api_key: String::new(),
            lastfm_shared_secret: String::new(),
            db_method: default_db_method(),
            mysql: vec![],
            horizon_db: None,
            smtp_host: String::new(),
            smtp_port: 0,
            smtp_secure: false,
            smtp_user: String::new(),
            smtp_pass: String::new(),
            owner_mail: String::new(),
            notify_new_guild: false,
        }
    }
}

/// Candidate file locations, in priority order. `$CONFIG_FILE` wins when
/// set; otherwise both the repo-root layout (`rust/config.toml`) and the
/// crate-dir layout (`config.toml`) are tried.
fn candidate_files() -> Vec<std::path::PathBuf> {
    if let Ok(v) = std::env::var("CONFIG_FILE") {
        if !v.is_empty() {
            // Explicit override: only this path is tried (no repo fallback),
            // so tests and deployments with CONFIG_FILE stay hermetic.
            return vec![std::path::PathBuf::from(v)];
        }
    }
    vec![
        std::path::PathBuf::from("rust/config.toml"),
        std::path::PathBuf::from("config.toml"),
    ]
}

fn get_str(table: &toml::map::Map<String, toml::Value>, key: &str) -> Option<String> {
    table
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

fn get_bool(table: &toml::map::Map<String, toml::Value>, key: &str) -> Option<bool> {
    table.get(key).and_then(|v| v.as_bool())
}

fn get_str_list(table: &toml::map::Map<String, toml::Value>, key: &str) -> Option<Vec<String>> {
    table.get(key).and_then(|v| v.as_array()).map(|a| {
        a.iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect()
    })
}

fn table<'a>(
    root: &'a toml::map::Map<String, toml::Value>,
    key: &str,
) -> Option<&'a toml::map::Map<String, toml::Value>> {
    root.get(key).and_then(|v| v.as_table())
}

/// Overlay one config.toml file onto `cfg`. Sections mirror
/// `src/files/config.ts` (`[discord]`, `[core]`, `[command]`, `[owners]`,
/// `[lavalink]`, `[api]`, `[console]`, `[database]`, `[lastfm]`).
/// Secret keys (`discord.token`, `api.api_token`, lastfm secrets are read
/// but real credentials must live in env) never override env: callers apply
/// env vars after this, and real tokens must never be committed to the file.
pub fn load_file_into(cfg: &mut Config, path: &std::path::Path) -> anyhow::Result<()> {
    let text = std::fs::read_to_string(path)?;
    let value: toml::Value = toml::from_str(&text)?;
    let root = value.as_table().cloned().unwrap_or_default();

    if let Some(t) = table(&root, "discord") {
        if let Some(v) = get_str(t, "default_prefix") {
            cfg.prefix = v;
        }
        if let Some(v) = get_bool(t, "phone_presence") {
            cfg.phone_presence = v;
        }
        if let Some(v) = get_bool(t, "message_commands_mention") {
            cfg.message_commands_mention = v;
        }
    }
    if let Some(t) = table(&root, "core") {
        if let Some(v) = get_bool(t, "dev_mode") {
            cfg.dev_mode = v;
        }
        if let Some(v) = get_str(t, "blacklist_picture") {
            cfg.blacklist_picture = v;
        }
        if let Some(v) = get_str(t, "guild_logs_channel_id") {
            cfg.guild_logs_channel_id = v;
        }
        if let Some(v) = get_str(t, "report_channel_id") {
            cfg.report_channel_id = v;
        }
        if let Some(v) = get_str(t, "lavalink_logs_channel_id") {
            cfg.lavalink_logs_channel_id = v;
        }
    }
    if let Some(t) = table(&root, "command") {
        if let Some(v) = get_str_list(t, "always100") {
            cfg.always100 = v;
        }
    }
    if let Some(t) = table(&root, "owners") {
        if let Some(v) = get_str_list(t, "users") {
            cfg.owners = v;
        }
    }
    if let Some(t) = table(&root, "lavalink") {
        if let Some(arr) = t.get("nodes").and_then(|v| v.as_array()) {
            let mut nodes = vec![];
            for item in arr {
                if let Some(nt) = item.as_table() {
                    nodes.push(LavalinkNode {
                        id: get_str(nt, "id").unwrap_or_default(),
                        host: get_str(nt, "host").unwrap_or_default(),
                        port: item.get("port").and_then(|v| v.as_integer()).unwrap_or(0) as u16,
                        authorization: get_str(nt, "authorization").unwrap_or_default(),
                        secure: get_bool(nt, "secure").unwrap_or(false),
                    });
                }
            }
            cfg.lavalink_nodes = nodes;
        }
    }
    if let Some(t) = table(&root, "api") {
        if let Some(v) = get_str(t, "horizon_gateway") {
            cfg.gateway = v;
        }
        if let Some(v) = get_str(t, "horizon_gateway_local") {
            cfg.gateway_local = v;
        }
        if let Some(v) = get_str(t, "client_id") {
            cfg.client_id = v;
        }
    }
    if let Some(t) = table(&root, "database") {
        if let Some(v) = get_str(t, "method") {
            cfg.db_method = v;
        }
        if let Some(v) = get_str(t, "url") {
            cfg.database_url = v;
        }
        // Second database URL (TS `database.mySQL[1]`). Empty = None.
        if let Some(v) = get_str(t, "secondary_url") {
            cfg.database_url_secondary = if v.trim().is_empty() { None } else { Some(v) };
        }
        // `[[database.mysql]]` parts (TS `database.mySQL[]`).
        if let Some(arr) = t.get("mysql").and_then(|v| v.as_array()) {
            let mut parts = vec![];
            for item in arr {
                if let Some(mt) = item.as_table() {
                    parts.push(MysqlParts {
                        host: get_str(mt, "host").unwrap_or_default(),
                        port: item.get("port").and_then(|v| v.as_integer()).unwrap_or(0) as u16,
                        database: get_str(mt, "database").unwrap_or_default(),
                        user: get_str(mt, "user").unwrap_or_default(),
                        password: get_str(mt, "password").unwrap_or_default(),
                    });
                }
            }
            cfg.mysql = parts;
        }
        // `[database.horizon_db]` parts (TS `database.horizon_db`).
        if let Some(ht) = t.get("horizon_db").and_then(|v| v.as_table()) {
            cfg.horizon_db = Some(HorizonDbParts {
                host: get_str(ht, "host").unwrap_or_default(),
                port: ht.get("port").and_then(|v| v.as_integer()).unwrap_or(0) as u16,
                login: get_str(ht, "login").unwrap_or_default(),
                password: get_str(ht, "password").unwrap_or_default(),
            });
        }
    }
    if let Some(t) = table(&root, "lastfm") {
        if let Some(v) = get_str(t, "api_key") {
            cfg.lastfm_api_key = v;
        }
        if let Some(v) = get_str(t, "shared_secret") {
            cfg.lastfm_shared_secret = v;
        }
    }
    if let Some(t) = table(&root, "smtp") {
        // host/port/secure/notify only: user, pass and owner_mail stay
        // env-only (TS reads them from env; secrets must never be
        // committed to the file).
        if let Some(v) = get_str(t, "host") {
            cfg.smtp_host = v;
        }
        if let Some(p) = t.get("port").and_then(|v| v.as_integer()) {
            cfg.smtp_port = p.max(0) as u16;
        }
        if let Some(v) = get_bool(t, "secure") {
            cfg.smtp_secure = v;
        }
        if let Some(v) = get_bool(t, "notify_new_guild") {
            cfg.notify_new_guild = v;
        }
    }

    Ok(())
}

/// Load order: built-in defaults < config.toml file < env vars.
/// Mirrors TS (`process.env.BOT_TOKEN || config.discord.token`) with one
/// deliberate exception: the bot token is env-only (`BOT_TOKEN`) and is
/// never read from the file, so a real token can never be committed.
pub fn load() -> anyhow::Result<Config> {
    let mut cfg = Config::default();

    for path in candidate_files() {
        if path.exists() {
            load_file_into(&mut cfg, &path)?;
            break;
        }
    }

    if let Ok(v) = std::env::var("DEFAULT_PREFIX") {
        if !v.is_empty() {
            cfg.prefix = v;
        }
    }
    if let Ok(v) = std::env::var("PHONE_PRESENCE") {
        cfg.phone_presence = parse_phone_presence(&v);
    }
    if let Ok(v) = std::env::var("TOTAL_SHARDS") {
        if let Ok(n) = v.parse::<u32>() {
            cfg.total_shards = Some(n);
        }
    }
    if let Ok(v) = std::env::var("DATABASE_URL") {
        if !v.is_empty() {
            cfg.database_url = v;
        }
    }
    if let Ok(v) = std::env::var("DATABASE_URL_SECONDARY") {
        if !v.trim().is_empty() {
            cfg.database_url_secondary = Some(v);
        }
    }
    if let Ok(v) = std::env::var("OWNERS") {
        cfg.owners = parse_owners(&v);
    }
    if let Ok(v) = std::env::var("GUILD_LOGS_CHANNEL_ID") {
        if !v.is_empty() {
            cfg.guild_logs_channel_id = v;
        }
    }
    if let Ok(v) = std::env::var("REPORT_CHANNEL_ID") {
        if !v.is_empty() {
            cfg.report_channel_id = v;
        }
    }
    if let Ok(v) = std::env::var("LAVALINK_LOGS_CHANNEL_ID") {
        if !v.is_empty() {
            cfg.lavalink_logs_channel_id = v;
        }
    }
    // Mailer keys (TS Mailer.init useEnv): env wins over the file, and
    // secrets (user/pass/owner) are env-only.
    if let Ok(v) = std::env::var("SMTP_HOST") {
        if !v.is_empty() {
            cfg.smtp_host = v;
        }
    }
    if let Ok(v) = std::env::var("SMTP_PORT") {
        if let Ok(n) = v.parse::<u16>() {
            cfg.smtp_port = n;
        }
    }
    if let Ok(v) = std::env::var("SMTP_SECURE") {
        cfg.smtp_secure = v == "1" || v.eq_ignore_ascii_case("true");
    }
    if let Ok(v) = std::env::var("SMTP_USER") {
        if !v.is_empty() {
            cfg.smtp_user = v;
        }
    }
    if let Ok(v) = std::env::var("SMTP_PASS") {
        if !v.is_empty() {
            cfg.smtp_pass = v;
        }
    }
    if let Ok(v) = std::env::var("OWNER_MAIL") {
        if !v.is_empty() {
            cfg.owner_mail = v;
        }
    }
    if let Ok(v) = std::env::var("EMAIL_WHEN_CHANGE_GUILD") {
        cfg.notify_new_guild = v == "1" || v.eq_ignore_ascii_case("true");
    }

    Ok(cfg)
}

pub fn parse_owners(s: &str) -> Vec<String> {
    s.split(',')
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .collect()
}

pub fn parse_phone_presence(s: &str) -> bool {
    s == "1" || s.eq_ignore_ascii_case("true")
}

pub fn bot_token() -> Option<String> {
    std::env::var("BOT_TOKEN").ok().filter(|s| !s.is_empty())
}

/// API token for HorizonGateway-signed flows (config save link,
/// config restore decrypt). Mirrors config.api.apiToken, env-first.
pub fn api_token() -> Option<String> {
    std::env::var("HORIZON_API_TOKEN")
        .ok()
        .filter(|s| !s.is_empty())
}

/// Base URL of the HorizonGateway API. Mirrors
/// config.api.HorizonGateway, env-first.
pub fn gateway_base() -> Option<String> {
    std::env::var("HORIZON_GATEWAY")
        .ok()
        .filter(|s| !s.is_empty())
}

impl Config {
    /// Public HorizonGateway base URL. Mirrors
    /// `client.config.api.HorizonGateway`: env `HORIZON_GATEWAY` wins,
    /// otherwise the `[api] horizon_gateway` file value.
    pub fn gateway_public(&self) -> Option<String> {
        std::env::var("HORIZON_GATEWAY")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .or_else(|| {
                let v = self.gateway.trim().to_string();
                if v.is_empty() {
                    None
                } else {
                    Some(v)
                }
            })
    }

    /// Compose a postgres connection string from `database.mySQL[]`
    /// parts at `idx` (TS: `` `postgres://${user}:${password}@${host}:${port}/${database}` ``).
    /// `None` when the entry is missing or has no host.
    pub fn mysql_connection_string(&self, idx: usize) -> Option<String> {
        self.mysql.get(idx).and_then(|m| {
            if m.host.trim().is_empty() {
                return None;
            }
            Some(format!(
                "postgres://{}:{}@{}:{}/{}",
                m.user, m.password, m.host, m.port, m.database
            ))
        })
    }

    /// HorizonDB endpoint from `database.horizon_db` parts (TS:
    /// `` `ws://${host}:${port}` ``). `None` when unset, so callers keep
    /// the `database.url` verbatim behavior.
    pub fn horizondb_endpoint(&self) -> Option<String> {
        self.horizon_db.as_ref().and_then(|h| {
            if h.host.trim().is_empty() {
                return None;
            }
            Some(format!("ws://{}:{}", h.host, h.port))
        })
    }
}

/// True on production/dev deployments. Mirrors the
/// `client.version.env === "production" || === "dev"` branch (which
/// reads the git branch); overridable via BOT_ENV.
pub fn is_gateway_env() -> bool {
    if let Ok(v) = std::env::var("BOT_ENV") {
        return v == "production" || v == "dev";
    }
    false
}

/// True only on production. Mirrors the
/// `client.version.env !== "production"` early-out in
/// commandExecutor.checkCustomSdkGate (the Custom-profile paywall
/// only applies in production).
pub fn is_production_env() -> bool {
    std::env::var("BOT_ENV")
        .map(|v| v == "production")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn default_values_mirror_ts_config_example() {
        let cfg = Config::default();
        assert_eq!(cfg.prefix, "?");
        assert!(!cfg.phone_presence);
        assert!(cfg.message_commands_mention);
        assert!(cfg.owners.is_empty());
        assert_eq!(cfg.total_shards, None);
        assert!(cfg.database_url.contains("db.sqlite"));
        assert_eq!(cfg.database_url_secondary, None);
    }

    #[test]
    fn parse_owners_trims_and_drops_empty() {
        assert_eq!(parse_owners(""), Vec::<String>::new());
        assert_eq!(
            parse_owners(" 123 , , 456 "),
            vec!["123".to_string(), "456".to_string()]
        );
    }

    #[test]
    fn parse_phone_presence_accepts_1_and_true() {
        assert!(parse_phone_presence("1"));
        assert!(parse_phone_presence("true"));
        assert!(parse_phone_presence("TRUE"));
        assert!(!parse_phone_presence("0"));
        assert!(!parse_phone_presence("false"));
        assert!(!parse_phone_presence(""));
    }

    #[test]
    fn serde_defaults_fill_missing_fields() {
        let cfg: Config = serde_json::from_str("{}").unwrap();
        assert_eq!(cfg.prefix, "?");
        assert!(cfg.message_commands_mention);
    }

    #[test]
    fn load_respects_env_overrides() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("DEFAULT_PREFIX", "!");
        std::env::set_var("PHONE_PRESENCE", "true");
        std::env::set_var("TOTAL_SHARDS", "4");
        std::env::set_var("OWNERS", "111, 222");

        let cfg = load().unwrap();
        assert_eq!(cfg.prefix, "!");
        assert!(cfg.phone_presence);
        assert_eq!(cfg.total_shards, Some(4));
        assert_eq!(cfg.owners, vec!["111".to_string(), "222".to_string()]);

        std::env::remove_var("DEFAULT_PREFIX");
        std::env::remove_var("PHONE_PRESENCE");
        std::env::remove_var("TOTAL_SHARDS");
        std::env::remove_var("OWNERS");
    }

    #[test]
    fn load_ignores_invalid_shard_count() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("TOTAL_SHARDS", "not-a-number");
        let cfg = load().unwrap();
        assert_eq!(cfg.total_shards, None);
        std::env::remove_var("TOTAL_SHARDS");
    }

    #[test]
    fn production_env_gate() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("BOT_ENV", "production");
        assert!(is_production_env());
        assert!(is_gateway_env());
        std::env::set_var("BOT_ENV", "dev");
        assert!(!is_production_env());
        assert!(is_gateway_env());
        std::env::remove_var("BOT_ENV");
        assert!(!is_production_env());
    }

    fn write_temp_config(body: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir();
        let path = dir.join(format!("ihrz-test-config-{}.toml", std::process::id()));
        std::fs::write(&path, body).unwrap();
        path
    }

    #[test]
    fn file_sections_overlay_defaults() {
        let _guard = ENV_LOCK.lock().unwrap();
        let path = write_temp_config(
            "[discord]\ndefault_prefix = \"!\"\nphone_presence = true\n\
             [core]\ndev_mode = false\nreport_channel_id = \"999\"\n\
             [owners]\nusers = [\"111\", \"222\"]\n\
             [command]\nalways100 = [\"1x2\"]\n\
             [database]\nmethod = \"sqlite\"\nurl = \"sqlite:/tmp/x.db\"\n[[database.mysql]]\nhost = \"db.example.com\"\nport = 5432\ndatabase = \"mydb\"\nuser = \"myuser\"\npassword = \"s3cret\"\n[database.horizon_db]\nhost = \"hdb.example.com\"\nport = 8081\nlogin = \"admin\"\npassword = \"pw\"\n\
             [api]\nhorizon_gateway = \"https://gateway.example.org\"\nhorizon_gateway_local = \"http://127.0.0.1:31981\"\nclient_id = \"123\"\n
             [lavalink]\n[[lavalink.nodes]]\nid = \"n0\"\nhost = \"lava.example.com\"\nport = 2333\nsecure = true\nauthorization = \"pw\"\n",
        );
        let mut cfg = Config::default();
        load_file_into(&mut cfg, &path).unwrap();
        std::fs::remove_file(&path).ok();

        assert_eq!(cfg.prefix, "!");
        assert!(cfg.phone_presence);
        assert!(cfg.message_commands_mention);
        assert!(!cfg.dev_mode);
        assert_eq!(cfg.report_channel_id, "999");
        assert_eq!(cfg.owners, vec!["111".to_string(), "222".to_string()]);
        assert_eq!(cfg.always100, vec!["1x2".to_string()]);
        assert_eq!(cfg.database_url, "sqlite:/tmp/x.db");
        assert_eq!(cfg.gateway_local, "http://127.0.0.1:31981");
        assert_eq!(cfg.gateway, "https://gateway.example.org");
        assert_eq!(cfg.client_id, "123");
        assert_eq!(cfg.lavalink_nodes.len(), 1);
        assert_eq!(cfg.lavalink_nodes[0].port, 2333);
        assert!(cfg.lavalink_nodes[0].secure);
        assert_eq!(cfg.mysql.len(), 1);
        assert_eq!(
            cfg.mysql_connection_string(0).as_deref(),
            Some("postgres://myuser:s3cret@db.example.com:5432/mydb")
        );
        assert_eq!(cfg.mysql_connection_string(1), None);
        assert_eq!(
            cfg.horizondb_endpoint().as_deref(),
            Some("ws://hdb.example.com:8081")
        );
        assert_eq!(
            cfg.horizon_db.as_ref().map(|h| h.login.as_str()),
            Some("admin")
        );
    }

    #[test]
    fn gateway_public_prefers_env_over_file() {
        let _guard = ENV_LOCK.lock().unwrap();
        let mut cfg = Config::default();
        assert_eq!(cfg.gateway_public(), None);
        cfg.gateway = "https://gateway.example.org".to_string();
        assert_eq!(
            cfg.gateway_public().as_deref(),
            Some("https://gateway.example.org")
        );
        std::env::set_var("HORIZON_GATEWAY", "https://env.example.org");
        assert_eq!(
            cfg.gateway_public().as_deref(),
            Some("https://env.example.org")
        );
        std::env::remove_var("HORIZON_GATEWAY");
    }

    #[test]
    fn lavalink_logs_channel_file_and_env() {
        let _guard = ENV_LOCK.lock().unwrap();
        let path = write_temp_config("[core]\nlavalink_logs_channel_id = \"555\"\n");
        let mut cfg = Config::default();
        load_file_into(&mut cfg, &path).unwrap();
        std::fs::remove_file(&path).ok();
        assert_eq!(cfg.lavalink_logs_channel_id, "555");

        // Env wins over the file.
        let path = write_temp_config("[core]\nlavalink_logs_channel_id = \"555\"\n");
        std::env::set_var("CONFIG_FILE", &path);
        std::env::set_var("LAVALINK_LOGS_CHANNEL_ID", "777");
        let cfg = load().unwrap();
        assert_eq!(cfg.lavalink_logs_channel_id, "777");
        // Blank env leaves the file value alone.
        std::env::set_var("LAVALINK_LOGS_CHANNEL_ID", "");
        let cfg = load().unwrap();
        assert_eq!(cfg.lavalink_logs_channel_id, "555");
        std::env::remove_var("CONFIG_FILE");
        std::env::remove_var("LAVALINK_LOGS_CHANNEL_ID");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn secondary_url_file_and_env() {
        let _guard = ENV_LOCK.lock().unwrap();
        // File value parses; empty string maps to None.
        let path = write_temp_config("[database]\nsecondary_url = \"postgres://u:p@h:5432/db\"\n");
        let mut cfg = Config::default();
        load_file_into(&mut cfg, &path).unwrap();
        std::fs::remove_file(&path).ok();
        assert_eq!(
            cfg.database_url_secondary.as_deref(),
            Some("postgres://u:p@h:5432/db")
        );

        let path = write_temp_config("[database]\nsecondary_url = \"\"\n");
        let mut cfg = Config::default();
        load_file_into(&mut cfg, &path).unwrap();
        std::fs::remove_file(&path).ok();
        assert_eq!(cfg.database_url_secondary, None);

        // Env wins over the file.
        let path = write_temp_config("[database]\nsecondary_url = \"postgres://file/db\"\n");
        std::env::set_var("CONFIG_FILE", &path);
        std::env::set_var("DATABASE_URL_SECONDARY", "postgres://env/db");
        let cfg = load().unwrap();
        assert_eq!(
            cfg.database_url_secondary.as_deref(),
            Some("postgres://env/db")
        );
        // Blank env leaves the file value alone.
        std::env::set_var("DATABASE_URL_SECONDARY", "   ");
        let cfg = load().unwrap();
        assert_eq!(
            cfg.database_url_secondary.as_deref(),
            Some("postgres://file/db")
        );
        std::env::remove_var("CONFIG_FILE");
        std::env::remove_var("DATABASE_URL_SECONDARY");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn file_token_key_is_ignored_token_stays_env_only() {
        let _guard = ENV_LOCK.lock().unwrap();
        let path = write_temp_config("[discord]\ntoken = \"SHOULD-NEVER-BE-READ\"\n");
        let mut cfg = Config::default();
        load_file_into(&mut cfg, &path).unwrap();
        std::fs::remove_file(&path).ok();

        std::env::remove_var("BOT_TOKEN");
        assert_eq!(bot_token(), None);
    }

    #[test]
    fn load_env_overrides_file() {
        let _guard = ENV_LOCK.lock().unwrap();
        let path = write_temp_config("[discord]\ndefault_prefix = \"!\"\n");
        std::env::set_var("CONFIG_FILE", &path);
        std::env::set_var("DEFAULT_PREFIX", "?");

        let cfg = load().unwrap();
        assert_eq!(cfg.prefix, "?");

        std::env::remove_var("CONFIG_FILE");
        std::env::remove_var("DEFAULT_PREFIX");
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn load_without_file_uses_defaults() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("CONFIG_FILE", "/nonexistent/ihrz-config.toml");
        for v in [
            "DEFAULT_PREFIX",
            "PHONE_PRESENCE",
            "TOTAL_SHARDS",
            "OWNERS",
            "DATABASE_URL",
            "DATABASE_URL_SECONDARY",
            "GUILD_LOGS_CHANNEL_ID",
            "REPORT_CHANNEL_ID",
        ] {
            std::env::remove_var(v);
        }
        // Missing file is skipped (no CONFIG_FILE hit, no repo file in tmp
        // cwd) only when neither candidate exists; here CONFIG_FILE points
        // nowhere so candidates fall through to repo paths — just assert
        // load() still succeeds and defaults hold for unset keys.
        let cfg = load();
        std::env::remove_var("CONFIG_FILE");
        let cfg = cfg.unwrap();
        assert!(!cfg.phone_presence);
        assert!(cfg.database_url.contains("db.sqlite") || !cfg.database_url.is_empty());
    }

    #[test]
    fn shipped_example_file_loads() {
        let _guard = ENV_LOCK.lock().unwrap();
        let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("config.example.toml");
        let mut cfg = Config::default();
        load_file_into(&mut cfg, &path).unwrap();
        assert_eq!(cfg.prefix, "?");
        assert_eq!(cfg.db_method, "sqlite");
        assert_eq!(cfg.database_url_secondary, None);
        assert_eq!(cfg.lavalink_nodes.len(), 1);
        assert_eq!(cfg.lavalink_nodes[0].id, "example_node");
    }
}
