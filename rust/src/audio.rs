// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Wiring-ready audio backend: Lavalink config (env) + AudioBackend trait.
// TS mirror: lavalink-client LavalinkManager/nodes/queue. Real lavalink-rs
// node wiring comes later; InMemoryBackend keeps commands testable offline.

use std::collections::HashMap;
use std::fmt;
use tokio::sync::Mutex;

use crate::voice::{clamp_volume, TrackQueue};

/// Env keys: LAVALINK_HOST / LAVALINK_PORT / LAVALINK_PASSWORD / LAVALINK_SECURE.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LavalinkConfig {
    pub host: String,
    pub port: u16,
    pub password: String,
    pub secure: bool,
}

impl LavalinkConfig {
    pub fn parse(
        host: Option<String>,
        port: Option<String>,
        password: Option<String>,
        secure: Option<String>,
    ) -> Result<Self, AudioError> {
        let host = host
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "127.0.0.1".to_string());
        let port = match port {
            None => 2333,
            Some(raw) => raw
                .trim()
                .parse::<u16>()
                .map_err(|_| AudioError::ConfigInvalid(format!("bad LAVALINK_PORT: {raw}")))?,
        };
        let password = password.unwrap_or_else(|| "youshallnotpass".to_string());
        let secure = match secure.map(|s| s.trim().to_ascii_lowercase()) {
            None => false,
            Some(s) => matches!(s.as_str(), "1" | "true" | "yes" | "on"),
        };
        Ok(Self {
            host,
            port,
            password,
            secure,
        })
    }

    pub fn from_env() -> Result<Self, AudioError> {
        Self::parse(
            std::env::var("LAVALINK_HOST").ok(),
            std::env::var("LAVALINK_PORT").ok(),
            std::env::var("LAVALINK_PASSWORD").ok(),
            std::env::var("LAVALINK_SECURE").ok(),
        )
    }

    pub fn ws_url(&self) -> String {
        let scheme = if self.secure { "wss" } else { "ws" };
        format!("{}://{}:{}/v4/websocket", scheme, self.host, self.port)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AudioError {
    ConfigInvalid(String),
    NotConnected,
    ConnectionFailed(String),
    Backend(String),
}

impl fmt::Display for AudioError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ConfigInvalid(s) | Self::ConnectionFailed(s) | Self::Backend(s) => {
                write!(f, "{s}")
            }
            Self::NotConnected => write!(f, "audio backend not connected"),
        }
    }
}

impl std::error::Error for AudioError {}

/// Backend surface used by commands/music.rs. Real Lavalink impl swaps in
/// later without touching command code.
pub trait AudioBackend: Send + Sync {
    async fn connect(&self) -> Result<(), AudioError>;
    async fn guild_play(&self, guild_id: u64, query: String) -> Result<(), AudioError>;
    async fn guild_stop(&self, guild_id: u64) -> Result<(), AudioError>;
    async fn set_volume(&self, guild_id: u64, volume: i64) -> Result<i64, AudioError>;
}

/// Offline mock: per-guild TrackQueue + volume, guarded by connect().
#[derive(Debug, Default)]
pub struct InMemoryBackend {
    connected: Mutex<bool>,
    queues: Mutex<HashMap<u64, TrackQueue>>,
    volumes: Mutex<HashMap<u64, i64>>,
}

impl InMemoryBackend {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn queue_len(&self, guild_id: u64) -> usize {
        self.queues
            .lock()
            .await
            .get(&guild_id)
            .map_or(0, |q| q.tracks.len())
    }

    pub async fn volume_of(&self, guild_id: u64) -> Option<i64> {
        self.volumes.lock().await.get(&guild_id).copied()
    }
}

impl AudioBackend for InMemoryBackend {
    async fn connect(&self) -> Result<(), AudioError> {
        *self.connected.lock().await = true;
        Ok(())
    }

    async fn guild_play(&self, guild_id: u64, query: String) -> Result<(), AudioError> {
        if !*self.connected.lock().await {
            return Err(AudioError::NotConnected);
        }
        self.queues
            .lock()
            .await
            .entry(guild_id)
            .or_default()
            .push(query);
        Ok(())
    }

    async fn guild_stop(&self, guild_id: u64) -> Result<(), AudioError> {
        if !*self.connected.lock().await {
            return Err(AudioError::NotConnected);
        }
        self.queues.lock().await.remove(&guild_id);
        Ok(())
    }

    async fn set_volume(&self, guild_id: u64, volume: i64) -> Result<i64, AudioError> {
        if !*self.connected.lock().await {
            return Err(AudioError::NotConnected);
        }
        let v = clamp_volume(volume);
        self.volumes.lock().await.insert(guild_id, v);
        Ok(v)
    }
}

/// Decision helper: use real Lavalink only when explicitly configured.
pub fn should_use_lavalink_with(get: impl Fn(&str) -> Option<String>) -> bool {
    if let Some(flag) = get("LAVALINK_ENABLED") {
        if matches!(
            flag.trim().to_ascii_lowercase().as_str(),
            "1" | "true" | "yes" | "on"
        ) {
            return true;
        }
    }
    get("LAVALINK_HOST")
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
}

pub fn should_use_lavalink() -> bool {
    should_use_lavalink_with(|k| std::env::var(k).ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_defaults() {
        let c = LavalinkConfig::parse(None, None, None, None).unwrap();
        assert_eq!(c.host, "127.0.0.1");
        assert_eq!(c.port, 2333);
        assert!(!c.secure);
        assert!(c.ws_url().starts_with("ws://"));
    }

    #[test]
    fn config_full_and_secure() {
        let c = LavalinkConfig::parse(
            Some("lava.local".into()),
            Some("443".into()),
            Some("secret".into()),
            Some("true".into()),
        )
        .unwrap();
        assert_eq!(c.ws_url(), "wss://lava.local:443/v4/websocket");
    }

    #[test]
    fn config_bad_port() {
        assert!(matches!(
            LavalinkConfig::parse(None, Some("nope".into()), None, None),
            Err(AudioError::ConfigInvalid(_))
        ));
    }

    #[test]
    fn decision_pure() {
        assert!(!should_use_lavalink_with(|_| None));
        assert!(should_use_lavalink_with(
            |k| (k == "LAVALINK_HOST").then(|| "lava".into())
        ));
        assert!(should_use_lavalink_with(
            |k| (k == "LAVALINK_ENABLED").then(|| "1".into())
        ));
    }

    #[tokio::test]
    async fn memory_backend_guards_and_queues() {
        let b = InMemoryBackend::new();
        assert_eq!(
            b.guild_play(1, "x".into()).await,
            Err(AudioError::NotConnected)
        );
        b.connect().await.unwrap();
        b.guild_play(1, "a".into()).await.unwrap();
        b.guild_play(1, "b".into()).await.unwrap();
        assert_eq!(b.queue_len(1).await, 2);
        assert_eq!(b.set_volume(1, 500).await.unwrap(), 100);
        assert_eq!(b.volume_of(1).await, Some(100));
        b.guild_stop(1).await.unwrap();
        assert_eq!(b.queue_len(1).await, 0);
    }
}
