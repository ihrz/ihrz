// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/files/config.ts + src/files/config.example.ts.

use serde::{Deserialize, Serialize};

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
    #[serde(default)]
    pub database_url: String,
    #[serde(default)]
    pub total_shards: Option<u32>,
}

fn default_prefix() -> String {
    "?".to_string()
}

fn default_true() -> bool {
    true
}

impl Default for Config {
    fn default() -> Self {
        Self {
            prefix: default_prefix(),
            phone_presence: false,
            message_commands_mention: true,
            owners: vec![],
            guild_logs_channel_id: String::new(),
            database_url: "sqlite:./src/files/db.sqlite?mode=rwc".to_string(),
            total_shards: None,
        }
    }
}

/// Load order (mirrors TS: process.env.BOT_TOKEN || config.discord.token):
/// env vars override file/defaults. Only token-adjacent + operational knobs
/// are read here; full TS ConfigData parity is tracked in README.
pub fn load() -> anyhow::Result<Config> {
    let mut cfg = Config::default();

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
    if let Ok(v) = std::env::var("OWNERS") {
        cfg.owners = parse_owners(&v);
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

/// True on production/dev deployments. Mirrors the
/// `client.version.env === "production" || === "dev"` branch (which
/// reads the git branch); overridable via BOT_ENV.
pub fn is_gateway_env() -> bool {
    if let Ok(v) = std::env::var("BOT_ENV") {
        return v == "production" || v == "dev";
    }
    false
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
}
