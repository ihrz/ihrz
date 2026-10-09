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

// ---- ICMP ping (spawned system binary) ----
// Mirrors src/core/ping/index.ts: platform-aware args, LANG=C output,
// parsed times/loss/min-avg-max. Used by the ping command's network
// section (fun::ping currently shows gateway latency only).

/// Mirrors PingConfig (defaults: timeout 2s, count 1, 56B, numeric).
#[derive(Debug, Clone)]
pub struct PingConfig {
    pub timeout_secs: u64,
    pub count: u32,
    pub packet_size: u32,
    pub source_addr: Option<String>,
    pub numeric: bool,
}

impl Default for PingConfig {
    fn default() -> Self {
        Self {
            timeout_secs: 2,
            count: 1,
            packet_size: 56,
            source_addr: None,
            numeric: true,
        }
    }
}

/// Mirrors net.isIPv6(target): literal v6 address or not.
pub fn is_ipv6_target(target: &str) -> bool {
    target
        .parse::<std::net::IpAddr>()
        .map(|a| a.is_ipv6())
        .unwrap_or(false)
}

/// Mirrors getExecutable (macOS uses /sbin paths + ping6).
pub fn ping_executable(is_v6: bool, is_mac: bool) -> &'static str {
    if is_mac {
        if is_v6 {
            "/sbin/ping6"
        } else {
            "/sbin/ping"
        }
    } else if is_v6 {
        "ping6"
    } else {
        "ping"
    }
}

/// Mirrors buildArgs (flag order + macOS quirks preserved).
pub fn ping_args(target: &str, cfg: &PingConfig, is_mac: bool, is_v6: bool) -> Vec<String> {
    let mut args = vec![];
    if cfg.numeric {
        args.push("-n".to_string());
    }
    if cfg.count != 0 {
        args.push("-c".to_string());
        args.push(cfg.count.to_string());
    }
    if cfg.packet_size != 0 {
        args.push("-s".to_string());
        args.push(cfg.packet_size.to_string());
    }
    if cfg.timeout_secs != 0 {
        if is_mac && is_v6 {
            // macOS ping6 has no timeout flag (TS logs a warning there).
            tracing::warn!("Timeout not supported on macOS ping6; flag omitted");
        } else {
            let value = if is_mac {
                (cfg.timeout_secs * 1000).to_string()
            } else {
                cfg.timeout_secs.to_string()
            };
            args.push("-W".to_string());
            args.push(value);
        }
    }
    if let Some(src) = &cfg.source_addr {
        args.push(if is_mac { "-S" } else { "-I" }.to_string());
        args.push(src.clone());
    }
    args.push(target.to_string());
    args
}

/// Parsed ping numbers without the raw output (mirrors the TS
/// parseOutput return, which the caller spreads next to `output`).
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedPing {
    pub host: String,
    pub numeric_host: String,
    pub alive: bool,
    pub time_ms: Option<f64>,
    pub times_ms: Vec<f64>,
    pub min_ms: Option<f64>,
    pub max_ms: Option<f64>,
    pub avg_ms: Option<f64>,
    pub stddev_ms: Option<f64>,
    pub packet_loss_pct: Option<f64>,
}

/// Full response with raw output. Mirrors PingResponse.
#[derive(Debug, Clone, PartialEq)]
pub struct PingResponse {
    pub parsed: ParsedPing,
    pub output: String,
}

/// Leading-float scanner for `time=12.3 ms`-style fragments.
fn scan_float(s: &str) -> Option<f64> {
    let s = s.trim_start();
    let len = s
        .find(|c: char| !(c.is_ascii_digit() || c == '.'))
        .unwrap_or(s.len());
    if len == 0 {
        return None;
    }
    s[..len].parse().ok()
}

/// Mirrors parseOutput with the same three regexes expressed as scans:
/// `PING host (ip)`, `time[=<] N ms`, `N% packet loss`, `= a/b/c ms`.
pub fn parse_ping_output(output: &str, target: &str) -> ParsedPing {
    let mut host = target.to_string();
    let mut numeric_host = target.to_string();
    let mut times_ms: Vec<f64> = vec![];
    let mut packet_loss_pct = None;
    let (mut min_ms, mut max_ms, mut avg_ms) = (None, None, None);

    for raw_line in output.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        if line.contains("PING") {
            let after = line[line.find("PING").unwrap_or(0) + 4..].trim();
            let mut parts = after.split_whitespace();
            if let Some(h) = parts.next() {
                host = h.to_string();
                numeric_host = h.to_string();
            }
            if let Some(maybe_ip) = parts.next() {
                if let Some(ip) = maybe_ip.strip_prefix('(').and_then(|s| s.strip_suffix(')')) {
                    numeric_host = ip.to_string();
                }
            }
        }
        let lower = line.to_lowercase();
        if let Some(i) = lower.find("time=").or_else(|| lower.find("time<")) {
            let rest = &lower[i + 5..];
            if let Some(v) = scan_float(rest) {
                let after_num = rest.trim_start_matches(|c: char| {
                    c.is_ascii_digit() || c == '.' || c.is_whitespace()
                });
                if after_num.starts_with("ms") {
                    times_ms.push(v);
                }
            }
        }
        // Whitespace-normalized scan (TS `/(\d+)%\s+packet\s+loss/i`
        // tolerates odd spacing/case; LANG=C keeps our source exact).
        let norm: String = lower.split_whitespace().collect::<Vec<_>>().join(" ");
        if let Some(i) = norm.find("% packet loss") {
            let before = norm[..i].trim_end();
            let len = before
                .rfind(|c: char| !(c.is_ascii_digit() || c == '.'))
                .map(|j| j + 1)
                .unwrap_or(0);
            if let Ok(v) = before[len..].parse::<f64>() {
                packet_loss_pct = Some(v);
            }
        }
        if let Some(i) = line.find('=') {
            let rest = line[i + 1..].trim();
            let segs: Vec<&str> = rest.split('/').collect();
            if segs.len() >= 3 {
                if let (Some(a), Some(b), Some(c)) = (
                    scan_float(segs[0]),
                    scan_float(segs[1]),
                    scan_float(segs[2]),
                ) {
                    if segs[2..].join("/").contains("ms") {
                        min_ms = Some(a);
                        avg_ms = Some(b);
                        max_ms = Some(c);
                    }
                }
            }
        }
    }

    // Population stddev against the stats-line avg (mirrors the TS math,
    // including using avg rather than the sample mean).
    let mut stddev_ms = None;
    if times_ms.len() > 1 {
        if let Some(avg) = avg_ms {
            let variance =
                times_ms.iter().map(|t| (t - avg).powi(2)).sum::<f64>() / times_ms.len() as f64;
            stddev_ms = Some(variance.sqrt());
        }
    }

    ParsedPing {
        host,
        numeric_host,
        alive: !times_ms.is_empty(),
        time_ms: times_ms.first().copied(),
        times_ms,
        min_ms,
        max_ms,
        avg_ms,
        stddev_ms,
        packet_loss_pct,
    }
}

/// Mirrors execute(): spawn with LANG=C, collect stdout+stderr, parse.
/// Spawn failure rejects like the TS `Failed to execute ping` path.
pub async fn ping_execute(target: &str, cfg: &PingConfig) -> Result<PingResponse, String> {
    let is_v6 = is_ipv6_target(target);
    let is_mac = std::env::consts::OS == "macos";
    let output = tokio::process::Command::new(ping_executable(is_v6, is_mac))
        .args(ping_args(target, cfg, is_mac, is_v6))
        .env("LANG", "C")
        .output()
        .await
        .map_err(|e| format!("Failed to execute ping: {e}"))?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    Ok(PingResponse {
        parsed: parse_ping_output(&text, target),
        output: text,
    })
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
        assert!(!tcp_open("127.0.0.1", 1, Duration::from_secs(2)).await);
    }

    #[test]
    fn ping_targets_and_executables_match_ts() {
        assert!(is_ipv6_target("::1"));
        assert!(is_ipv6_target("2001:db8::1"));
        assert!(!is_ipv6_target("google.com"));
        assert!(!is_ipv6_target("8.8.8.8"));
        assert_eq!(ping_executable(false, false), "ping");
        assert_eq!(ping_executable(true, false), "ping6");
        assert_eq!(ping_executable(false, true), "/sbin/ping");
        assert_eq!(ping_executable(true, true), "/sbin/ping6");
    }

    #[test]
    fn ping_args_match_ts() {
        let cfg = PingConfig::default();
        assert_eq!(
            ping_args("google.com", &cfg, false, false),
            vec!["-n", "-c", "1", "-s", "56", "-W", "2", "google.com"]
        );
        // macOS millisecond timeout + -S source flag.
        let src = PingConfig {
            source_addr: Some("10.0.0.2".to_string()),
            ..PingConfig::default()
        };
        assert_eq!(
            ping_args("example.com", &src, true, false),
            vec![
                "-n",
                "-c",
                "1",
                "-s",
                "56",
                "-W",
                "2000",
                "-S",
                "10.0.0.2",
                "example.com"
            ]
        );
        // macOS ping6 drops the timeout flag like the TS quirk.
        assert_eq!(
            ping_args("::1", &cfg, true, true),
            vec!["-n", "-c", "1", "-s", "56", "::1"]
        );
    }

    #[test]
    fn ping_output_parses_like_ts() {
        let out = "PING google.com (142.250.72.14) 56(84) bytes of data.\n\
             64 bytes from fra16s52-in-f14.1e100.net (142.250.72.14): icmp_seq=1 ttl=117 time=12.3 ms\n\
             \n\
             --- google.com ping statistics ---\n\
             1 packets transmitted, 1 received, 0% packet loss, time 0ms\n\
             rtt min/avg/max/mdev = 12.300/12.300/12.300/0.000 ms\n";
        let p = parse_ping_output(out, "google.com");
        assert_eq!(p.host, "google.com");
        assert_eq!(p.numeric_host, "142.250.72.14");
        assert!(p.alive);
        assert_eq!(p.time_ms, Some(12.3));
        assert_eq!(p.times_ms, vec![12.3]);
        assert_eq!(p.packet_loss_pct, Some(0.0));
        assert_eq!(
            (p.min_ms, p.avg_ms, p.max_ms),
            (Some(12.3), Some(12.3), Some(12.3))
        );
        // Single sample: no stddev, mirrors the TS length>1 gate.
        assert_eq!(p.stddev_ms, None);
    }

    #[test]
    fn ping_dead_host_reports_not_alive() {
        let out = "PING down.invalid (0.0.0.0) 56(84) bytes of data.\n\
             \n\
             --- down.invalid ping statistics ---\n\
             1 packets transmitted, 0 received, 100% packet loss, time 0ms\n";
        let p = parse_ping_output(out, "down.invalid");
        assert!(!p.alive);
        assert_eq!(p.time_ms, None);
        assert!(p.times_ms.is_empty());
        assert_eq!(p.packet_loss_pct, Some(100.0));
    }

    #[test]
    fn ping_stddev_uses_stats_avg_like_ts() {
        let out = "PING h (1.2.3.4) 56(84) bytes of data.\n\
             64 bytes from h: icmp_seq=1 ttl=64 time=10.0 ms\n\
             64 bytes from h: icmp_seq=2 ttl=64 time=14.0 ms\n\
             \n\
             --- h ping statistics ---\n\
             2 packets transmitted, 2 received, 0% packet loss, time 1000ms\n\
             rtt min/avg/max/mdev = 10.000/12.000/14.000/0.000 ms\n";
        let p = parse_ping_output(out, "h");
        assert!(p.alive);
        // Population stddev of [10,14] against the stats avg 12 = 2.
        assert_eq!(p.stddev_ms, Some(2.0));
    }
}
