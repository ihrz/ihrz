// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Infrastructure monitoring. Mirrors
// src/core/modules/infrastructureMonitoringManager.ts: TCP checks
// (Lavalink), Discord latency snapshot, 60s tick with last status in kv.

use std::time::Duration;

/// Parse "host:port". Mirrors the manager's host/port splitting.
pub fn parse_target(raw: &str) -> Option<(String, u16)> {
    let (host, port) = raw.rsplit_once(':')?;
    if host.trim().is_empty() {
        return None;
    }
    Some((host.trim().to_string(), port.trim().parse().ok()?))
}

pub async fn tcp_open(host: &str, port: u16, timeout: Duration) -> bool {
    tokio::time::timeout(timeout, tokio::net::TcpStream::connect((host, port)))
        .await
        .ok()
        .and_then(|r| r.ok())
        .is_some()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InfraStatus {
    pub at_ms: i64,
    pub lavalink_ok: bool,
    pub discord_ms: u64,
}

/// 60s tick: probe Lavalink (env config) + record status.
/// Discord gateway latency is filled by the caller when available.
pub async fn tick(pool: &crate::db::Pool, discord_ms: u64) -> InfraStatus {
    let cfg = crate::audio::LavalinkConfig::from_env()
        .unwrap_or(crate::audio::LavalinkConfig::parse(None, None, None, None).unwrap());
    let lavalink_ok = tcp_open(&cfg.host, cfg.port, Duration::from_secs(5)).await;
    let status = InfraStatus {
        at_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0),
        lavalink_ok,
        discord_ms,
    };
    let _ = crate::db::kv_set(
        pool,
        "0",
        "INFRA.status",
        &serde_json::to_string(&status).unwrap_or_default(),
    )
    .await;
    tracing::info!(
        "infra: lavalink {}:{} ok={lavalink_ok} discord={discord_ms}ms",
        cfg.host,
        cfg.port
    );
    status
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn target_parses() {
        assert_eq!(
            parse_target("lava.local:2333"),
            Some(("lava.local".to_string(), 2333))
        );
        assert_eq!(parse_target("nope"), None);
        assert_eq!(parse_target(":1"), None);
        assert_eq!(parse_target("h:notaport"), None);
    }

    #[tokio::test]
    async fn tcp_closed_port_fails_fast() {
        assert!(!tcp_open("127.0.0.1", 1, Duration::from_millis(300)).await);
    }
}
