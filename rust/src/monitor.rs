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

// ---- Service checks (TS: infrastructureMonitoringManager.ts) ----
// Mirrors ResponseResult { up, latency } plus the checkAllServices keys:
// PublicBot, HorizonGateway, Lavalink, iHorizonWebsite. Lavalink was the
// only probe ported before; the HTTP checks + aggregation land here.

/// Mirrors the TS `ResponseResult`. Serde keys stay `up`/`latency`.
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct ResponseResult {
    pub up: bool,
    pub latency: u64,
}

impl ResponseResult {
    pub fn down() -> Self {
        Self::default()
    }
}

/// Probe target for iHorizonWebsite(). Mirrors the hardcoded TS URL.
pub const WEBSITE_URL: &str = "https://www.ihorizon.org";
/// Env key for the gateway base URL (TS: client.config.api.HorizonGateway).
pub const GATEWAY_ENV_KEY: &str = "HORIZON_GATEWAY_URL";
/// Mirrors `private timeout = 5000`.
pub const MONITOR_TIMEOUT: Duration = Duration::from_secs(5);

/// Gateway URL from env. Empty/missing mirrors the TS falsy-URL path
/// in HorizonGateway(), which returns down without a request.
pub fn gateway_url_from_env() -> Option<String> {
    std::env::var(GATEWAY_ENV_KEY)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Mirrors PublicBot(): up = ws READY, latency = ws ping.
/// Here `discord_ms` carries the gateway ping (0 = not ready -> down).
pub fn public_bot_result(discord_ms: u64) -> ResponseResult {
    if discord_ms > 0 {
        ResponseResult {
            up: true,
            latency: discord_ms,
        }
    } else {
        ResponseResult::down()
    }
}

/// GET probe with latency. Up only on 2xx, mirroring the TS axios calls
/// (axios rejects non-2xx, so HorizonGateway's bare `up: true` on success
/// and iHorizonWebsite's explicit range check behave the same).
pub async fn http_check(url: &str, timeout: Duration) -> ResponseResult {
    let client = match reqwest::Client::builder().timeout(timeout).build() {
        Ok(c) => c,
        Err(_) => return ResponseResult::down(),
    };
    let start = std::time::Instant::now();
    match client.get(url).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                ResponseResult {
                    up: true,
                    latency: start.elapsed().as_millis().min(u128::from(u64::MAX)) as u64,
                }
            } else {
                ResponseResult::down()
            }
        }
        Err(_) => ResponseResult::down(),
    }
}

/// Mirrors HorizonGateway(): falsy URL -> down, else GET with timeout.
pub async fn check_horizon_gateway(url: Option<&str>, timeout: Duration) -> ResponseResult {
    match url {
        Some(u) if !u.trim().is_empty() => http_check(u, timeout).await,
        _ => ResponseResult::down(),
    }
}

/// Mirrors iHorizonWebsite(): GET with timeout, up on 2xx.
pub async fn check_website(url: &str, timeout: Duration) -> ResponseResult {
    http_check(url, timeout).await
}

/// TCP probe with latency. Mirrors checkTcpConnection().
pub async fn check_tcp_result(host: &str, port: u16, timeout: Duration) -> ResponseResult {
    let start = std::time::Instant::now();
    if tcp_open(host, port, timeout).await {
        ResponseResult {
            up: true,
            latency: start.elapsed().as_millis().min(u128::from(u64::MAX)) as u64,
        }
    } else {
        ResponseResult::down()
    }
}

/// Aggregation matching the TS checkAllServices() return shape
/// (keys PublicBot/HorizonGateway/Lavalink/iHorizonWebsite).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ServiceResults {
    #[serde(rename = "PublicBot")]
    pub public_bot: ResponseResult,
    #[serde(rename = "HorizonGateway")]
    pub horizon_gateway: ResponseResult,
    #[serde(rename = "Lavalink")]
    pub lavalink: ResponseResult,
    #[serde(rename = "iHorizonWebsite")]
    pub website: ResponseResult,
}

impl Default for ServiceResults {
    fn default() -> Self {
        Self {
            public_bot: ResponseResult::down(),
            horizon_gateway: ResponseResult::down(),
            lavalink: ResponseResult::down(),
            website: ResponseResult::down(),
        }
    }
}

/// Mirrors formatStatus() minus the emoji prefix (the panel owns icons):
/// up -> `Online | Latency: Nms`, down -> `Offline`.
pub fn format_status(result: &ResponseResult) -> String {
    if result.up {
        format!("Online | Latency: {}ms", result.latency)
    } else {
        "Offline".to_string()
    }
}

/// Concurrent fan-out mirroring `Promise.all([...])` in checkAllServices().
pub async fn check_all_services(
    discord_ms: u64,
    gateway_url: Option<&str>,
    lavalink_host: &str,
    lavalink_port: u16,
    website_url: &str,
    timeout: Duration,
) -> ServiceResults {
    let (gateway, lavalink, website) = tokio::join!(
        check_horizon_gateway(gateway_url, timeout),
        check_tcp_result(lavalink_host, lavalink_port, timeout),
        check_website(website_url, timeout),
    );
    ServiceResults {
        public_bot: public_bot_result(discord_ms),
        horizon_gateway: gateway,
        lavalink,
        website,
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InfraStatus {
    pub at_ms: i64,
    pub lavalink_ok: bool,
    pub discord_ms: u64,
    /// Full aggregation; flattened keys match the TS record.
    #[serde(default)]
    pub services: ServiceResults,
}

/// 60s tick: probe Lavalink (env config) + HTTP services, record status.
/// Discord gateway latency is filled by the caller when available.
pub async fn tick(pool: &crate::db::Pool, discord_ms: u64) -> InfraStatus {
    let cfg = crate::audio::LavalinkConfig::from_env()
        .unwrap_or(crate::audio::LavalinkConfig::parse(None, None, None, None).unwrap());
    let gateway_url = gateway_url_from_env();
    let services = check_all_services(
        discord_ms,
        gateway_url.as_deref(),
        &cfg.host,
        cfg.port,
        WEBSITE_URL,
        MONITOR_TIMEOUT,
    )
    .await;
    let status = InfraStatus {
        at_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0),
        lavalink_ok: services.lavalink.up,
        discord_ms,
        services,
    };
    // Ping history (mirrors `if (this.lastResult.PublicBot?.latency)`
    // addPingToHistory): only positive samples are stored.
    record_ping(pool, status.services.public_bot.latency).await;
    let _ = crate::db::kv_set(
        pool,
        "0",
        "INFRA.status",
        &serde_json::to_string(&status).unwrap_or_default(),
    )
    .await;
    tracing::info!(
        "infra: lavalink {}:{} ok={} discord={discord_ms}ms gateway={} website={}",
        cfg.host,
        cfg.port,
        status.lavalink_ok,
        format_status(&status.services.horizon_gateway),
        format_status(&status.services.website),
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

// ---- getIP (cached public IP) ----
// Mirrors src/core/functions/getIp.ts: ipify endpoints for v4/v6 with a
// module-level cache (ipv4/ipv6 strings, empty = unfilled). The cache is
// checked before any network call and filled after a successful fetch.

/// Plain-text public-IP endpoint for IPv4. Mirrors endpoint_v4.
pub const IPV4_ENDPOINT: &str = "https://api.ipify.org";
/// Plain-text public-IP endpoint for IPv6. Mirrors endpoint_v6.
pub const IPV6_ENDPOINT: &str = "https://api6.ipify.org";

/// Endpoint selected by getIP(useIPv6). Pure and offline-testable.
pub fn ip_endpoint(use_ipv6: bool) -> &'static str {
    if use_ipv6 {
        IPV6_ENDPOINT
    } else {
        IPV4_ENDPOINT
    }
}

fn ip_cache() -> &'static std::sync::Mutex<(Option<String>, Option<String>)> {
    static CACHE: std::sync::OnceLock<std::sync::Mutex<(Option<String>, Option<String>)>> =
        std::sync::OnceLock::new();
    CACHE.get_or_init(|| std::sync::Mutex::new((None, None)))
}

/// Cached IP for the family (`None` while unfilled, mirrors `""`).
pub fn cached_ip(use_ipv6: bool) -> Option<String> {
    let guard = ip_cache().lock().ok()?;
    if use_ipv6 {
        guard.1.clone()
    } else {
        guard.0.clone()
    }
}

/// Store a fetched IP. Mirrors the CacheValue write after fetch.
pub fn set_cached_ip(use_ipv6: bool, ip: &str) {
    if let Ok(mut guard) = ip_cache().lock() {
        if use_ipv6 {
            guard.1 = Some(ip.to_string());
        } else {
            guard.0 = Some(ip.to_string());
        }
    }
}

/// Clear the cache (tests + reconnect flows).
pub fn clear_ip_cache() {
    if let Ok(mut guard) = ip_cache().lock() {
        guard.0 = None;
        guard.1 = None;
    }
}

/// Fetch the public IP, serving the cache first like getIP does.
/// Network only on a cache miss; failures reject like the TS throw.
pub async fn fetch_ip(use_ipv6: bool) -> Result<String, String> {
    if let Some(hit) = cached_ip(use_ipv6) {
        return Ok(hit);
    }
    let text = reqwest::Client::new()
        .get(ip_endpoint(use_ipv6))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch IP address: {e}"))?;
    if !text.status().is_success() {
        return Err("Failed to fetch IP address".to_string());
    }
    let ip = text
        .text()
        .await
        .map_err(|e| format!("Failed to fetch IP address: {e}"))?;
    let ip = ip.trim().to_string();
    set_cached_ip(use_ipv6, &ip);
    Ok(ip)
}

// ---- Status panel broadcast + ping history/chart ----
// Mirrors src/core/modules/infrastructureMonitoringManager.ts
// refresh(): MISC.statusEmbed channel sweep, ping history (cap 60),
// chart data/stats/SVG, status embed fields.
//
// U-CHART-PATH DECISION (offline-safe, Chromium blocked infra-wide):
// SVG-as-attachment is implemented (pure builder below, no network,
// no renderer); PNG render is DEFERRED. Rationale: the TS path embeds
// the chart inline via html2png(Chromium) as `ping-chart.png` with
// `setImage("attachment://ping-chart.png")`. There is no Chromium and
// no html2png equivalent in Rust, so PNG bytes cannot be produced
// offline and are not faked. Discord does not render SVG attachments
// as embed images either, so the SVG ships as a downloadable file
// attachment (wired in by a future send path), while the sweep stays
// embed-only by design and never re-attaches the chart image.

/// Mirrors MAX_PING_HISTORY.
pub const MAX_PING_HISTORY: usize = 60;
/// kv key (guild "0", metasTable scope) holding the ping history JSON array.
pub const PING_HISTORY_KEY: &str = "INFRA.pingHistory";
/// kv key prefix (guild "0") for panel targets. Mirrors
/// `metasTable.set('MISC.statusEmbed.<guild>', {message_id, guild_id,
/// channel_id})`, flattened like the other dotted Rust kv keys.
pub const STATUS_PANEL_PREFIX: &str = "MISC.statusEmbed.";
/// Bot-global kv scope. Mirrors db.table("metas").
pub const META_SCOPE: &str = "0";
/// Mirrors `.setColor("#ff40c4")`.
pub const STATUS_PANEL_COLOUR: u32 = 0xff40c4;

/// Mirrors calculatePingStats().
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PingStats {
    pub current: u64,
    pub avg: u64,
    pub max: u64,
    pub min: u64,
}

impl PingStats {
    pub fn zero() -> Self {
        Self {
            current: 0,
            avg: 0,
            max: 0,
            min: 0,
        }
    }
}

/// Mirrors calculatePingStats(): only pings > 0 count, avg is rounded.
pub fn calculate_ping_stats(history: &[u64]) -> PingStats {
    let valid: Vec<u64> = history.iter().copied().filter(|p| *p > 0).collect();
    if valid.is_empty() {
        return PingStats::zero();
    }
    let current = valid[valid.len() - 1];
    let sum: u64 = valid.iter().sum();
    let avg = (sum as f64 / valid.len() as f64).round() as u64;
    PingStats {
        current,
        avg,
        max: *valid.iter().max().unwrap_or(&0),
        min: *valid.iter().min().unwrap_or(&0),
    }
}

/// Mirrors addPingToHistory(): ignores non-positive pings, caps at 60.
pub fn push_ping_history(history: &mut Vec<u64>, ping: u64) {
    if ping == 0 {
        return;
    }
    history.push(ping);
    if history.len() > MAX_PING_HISTORY {
        history.remove(0);
    }
}

/// Mirrors generatePingChartData(): 60 slots (None = gap), labels
/// `"59m" .. "1m", "Now"`, history right-aligned.
pub fn ping_chart_data(history: &[u64]) -> (Vec<Option<u64>>, Vec<String>) {
    let mut data: Vec<Option<u64>> = vec![None; MAX_PING_HISTORY];
    let mut labels = Vec::with_capacity(MAX_PING_HISTORY);
    for i in (0..MAX_PING_HISTORY).rev() {
        labels.push(if i == 0 {
            "Now".to_string()
        } else {
            format!("{i}m")
        });
    }
    let start = MAX_PING_HISTORY.saturating_sub(history.len());
    for (i, ping) in history.iter().enumerate() {
        if start + i < MAX_PING_HISTORY {
            data[start + i] = Some(*ping);
        }
    }
    (data, labels)
}

/// Mirrors buildPingChartSvg(). Pure SVG string; the TS caller embeds
/// it into the botLatencyMonitoring HTML template before html2png.
pub fn build_ping_chart_svg(data: &[Option<u64>], labels: &[String]) -> String {
    const W: f64 = 904.0;
    const H: f64 = 190.0;
    const PAD_L: f64 = 8.0;
    const PAD_R: f64 = 8.0;
    const PAD_T: f64 = 12.0;
    const PAD_B: f64 = 24.0;
    let inner_w = W - PAD_L - PAD_R;
    let inner_h = H - PAD_T - PAD_B;
    let base = PAD_T + inner_h;

    let valid: Vec<f64> = data
        .iter()
        .filter_map(|v| (*v).filter(|p| *p > 0).map(|p| p as f64))
        .collect();
    let max_ping = valid.iter().cloned().fold(1.0_f64, f64::max);
    let ceiling = (max_ping * 1.2).max(10.0);

    let n = data.len();
    let x_at = |i: usize| PAD_L + (inner_w * i as f64) / (n.saturating_sub(1).max(1) as f64);
    let y_at = |ping: f64| PAD_T + inner_h - (ping.min(ceiling) / ceiling) * inner_h;

    let mut line_paths: Vec<String> = vec![];
    let mut area_paths: Vec<String> = vec![];
    let mut segment: Vec<String> = vec![];
    let mut flush = |segment: &mut Vec<String>| {
        if segment.len() == 1 {
            line_paths.push(segment[0].clone());
        } else if segment.len() > 1 {
            let d = format!("M{}", segment.join(" L"));
            line_paths.push(d);
            let first_x = segment[0].split(',').next().unwrap_or("");
            let last_x = segment[segment.len() - 1].split(',').next().unwrap_or("");
            area_paths.push(format!(
                "M{first_x},{base} L{} L{last_x},{base} Z",
                segment.join(" L")
            ));
        }
        segment.clear();
    };
    for (i, v) in data.iter().enumerate() {
        match v {
            Some(p) if *p > 0 => {
                segment.push(format!("{:.1},{:.1}", x_at(i), y_at(*p as f64)));
            }
            _ => flush(&mut segment),
        }
    }
    flush(&mut segment);

    let mut line_path = line_paths.join(" ");
    if line_path.trim().is_empty() {
        line_path = format!("M{PAD_L},{base} L{},{base}", W - PAD_R);
    }
    // TS splits the combined path on " M" so each sub-path gets its
    // own stroked <path>; mirror that shape here.
    let stroked = line_path
        .trim()
        .split(" M")
        .enumerate()
        .map(|(idx, d)| {
            let d = if idx == 0 {
                d.to_string()
            } else {
                format!("M{d}")
            };
            format!(
                "<path d=\"{d}\" fill=\"none\" stroke=\"#5865F2\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
            )
        })
        .collect::<String>();

    let mut grid = String::new();
    for g in 0..=3 {
        let gy = PAD_T + (inner_h * g as f64) / 3.0;
        grid.push_str(&format!(
            "<line x1=\"{PAD_L}\" y1=\"{gy:.1}\" x2=\"{:.1}\" y2=\"{gy:.1}\" stroke=\"rgba(255,255,255,0.06)\" stroke-width=\"1\"/>",
            W - PAD_R
        ));
    }

    let mut label_svg = String::new();
    let tick_every = 6;
    let mut i = 0;
    while i < n {
        let raw = labels.get(i).cloned().unwrap_or_default();
        let label = raw.replace('&', "&amp;").replace('<', "&lt;");
        label_svg.push_str(&format!(
            "<text x=\"{:.1}\" y=\"{:.1}\" fill=\"#8B8E98\" font-size=\"9\" font-weight=\"600\" text-anchor=\"middle\" font-family=\"Inter, system-ui, sans-serif\">{label}</text>",
            x_at(i),
            H - 8.0
        ));
        i += tick_every;
    }
    // Always label the newest slot (TS right-edge "Now"), even when it
    // falls between ticks.
    if n > 0 && !(n - 1).is_multiple_of(tick_every) {
        let raw = labels.get(n - 1).cloned().unwrap_or_default();
        let label = raw.replace('&', "&amp;").replace('<', "&lt;");
        label_svg.push_str(&format!(
            "<text x=\"{:.1}\" y=\"{:.1}\" fill=\"#8B8E98\" font-size=\"9\" font-weight=\"600\" text-anchor=\"middle\" font-family=\"Inter, system-ui, sans-serif\">{label}</text>",
            x_at(n - 1),
            H - 8.0
        ));
    }

    format!(
        "<svg width=\"{W}\" height=\"{H}\" viewBox=\"0 0 {W} {H}\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\"><defs><linearGradient id=\"pingFill\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5865F2\" stop-opacity=\"0.4\"/><stop offset=\"0.5\" stop-color=\"#5865F2\" stop-opacity=\"0.2\"/><stop offset=\"1\" stop-color=\"#5865F2\" stop-opacity=\"0\"/></linearGradient></defs>{grid}<path d=\"{}\" fill=\"url(#pingFill)\"/>{stroked}{label_svg}</svg>",
        area_paths.join(" ").trim()
    )
}

/// Offline-safe chart artifact for the U-CHART-PATH decision.
///
/// Returns `(filename, svg_bytes)` for a Discord file attachment, built
/// purely from ping history with no renderer and no network. The `.svg`
/// extension is deliberate: PNG bytes cannot be produced without
/// Chromium/html2png, and are not faked. Note Discord does not render
/// SVG attachments as embed images, so this ships as a downloadable
/// file (NOT `setImage`), unlike the TS inline `ping-chart.png`.
/// Wiring it into a send/edit path is a future unit; the sweep stays
/// embed-only.
pub const PING_CHART_FILENAME: &str = "ping-chart.svg";

pub fn ping_chart_attachment(history: &[u64]) -> (String, Vec<u8>) {
    let (data, labels) = ping_chart_data(history);
    let svg = build_ping_chart_svg(&data, &labels);
    (PING_CHART_FILENAME.to_string(), svg.into_bytes())
}

/// Field name/value pairs for the status embed. Mirrors
/// updateStatusEmbed() minus the emoji prefixes (panel owns icons
/// via format_status, like the service aggregation above).
pub fn status_panel_fields(services: &ServiceResults) -> Vec<(String, bool, String)> {
    vec![
        (
            "iHorizon (Public Bot)".to_string(),
            false,
            format_status(&services.public_bot),
        ),
        (
            "HorizonGateway (Public/Private API)".to_string(),
            false,
            format_status(&services.horizon_gateway),
        ),
        (
            "Lavalink (Music Player)".to_string(),
            false,
            format_status(&services.lavalink),
        ),
        (
            "iHorizon Website".to_string(),
            false,
            format_status(&services.website),
        ),
    ]
}

/// Status-panel message target. Mirrors the
/// `{message_id, guild_id, channel_id}` rows under MISC.statusEmbed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StatusPanelTarget {
    pub guild_id: u64,
    pub channel_id: u64,
    pub message_id: u64,
}

fn parse_snowflake(value: &serde_json::Value) -> Option<u64> {
    if let Some(s) = value.as_str() {
        s.parse().ok()
    } else {
        value.as_u64()
    }
}

/// Parse one panel row; ids arrive as strings from discord.js.
pub fn parse_status_panel_entry(raw: &str) -> Option<StatusPanelTarget> {
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    Some(StatusPanelTarget {
        guild_id: v.get("guild_id").and_then(parse_snowflake)?,
        channel_id: v.get("channel_id").and_then(parse_snowflake)?,
        message_id: v.get("message_id").and_then(parse_snowflake)?,
    })
}

/// Load all panel targets (guild "0", `MISC.statusEmbed.%`).
/// Malformed rows are skipped; entries are never deleted here
/// (TS keeps them on missing-message and retries next minute).
pub async fn load_status_panels(pool: &crate::db::Pool) -> Vec<StatusPanelTarget> {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = '0' AND key_name LIKE 'MISC.statusEmbed.%'",
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    rows.iter()
        .filter_map(|(_, value)| parse_status_panel_entry(value))
        .collect()
}

/// Load the persisted ping history (empty when unset/malformed).
pub async fn load_ping_history(pool: &crate::db::Pool) -> Vec<u64> {
    match crate::db::kv_get(pool, META_SCOPE, PING_HISTORY_KEY).await {
        Some(raw) => serde_json::from_str::<Vec<u64>>(&raw).unwrap_or_default(),
        None => vec![],
    }
}

async fn save_ping_history(pool: &crate::db::Pool, history: &[u64]) {
    let _ = crate::db::kv_set(
        pool,
        META_SCOPE,
        PING_HISTORY_KEY,
        &serde_json::to_string(history).unwrap_or_else(|_| "[]".to_string()),
    )
    .await;
}

/// Record one latency sample with the TS `if (latency)` guard.
/// Returns the updated history.
pub async fn record_ping(pool: &crate::db::Pool, latency_ms: u64) -> Vec<u64> {
    let mut history = load_ping_history(pool).await;
    push_ping_history(&mut history, latency_ms);
    // Persist even on ignored (zero) samples so the key exists after
    // the first tick, mirroring the manager's always-on refresh.
    save_ping_history(pool, &history).await;
    history
}

/// Build the status-panel embed. Mirrors refresh()/updateStatusEmbed().
pub fn build_status_embed(services: &ServiceResults) -> poise::serenity_prelude::CreateEmbed {
    let fields: Vec<(String, String, bool)> = status_panel_fields(services)
        .into_iter()
        .map(|(name, inline, value)| (name, value, inline))
        .collect();
    poise::serenity_prelude::CreateEmbed::default()
        .colour(STATUS_PANEL_COLOUR)
        .title("iHorizon Status Panel")
        .description(
            "This embed refresh every 1 minutes for showing the latest informations about iHorizon infrastructure",
        )
        .fields(fields)
        .timestamp(poise::serenity_prelude::Timestamp::now())
}

/// Broadcast the status embed to every MISC.statusEmbed panel.
/// Mirrors the refresh() channel loop: fetch message, edit content +
/// embed; missing/failed messages keep their entry for next minute.
/// With `http: None` (tests) no network happens and the return is the
/// number of loadable panels (dry-run). Returns panels edited
/// (or loadable when dry-run).
pub async fn sweep_status_panel(
    pool: &crate::db::Pool,
    http: Option<&std::sync::Arc<poise::serenity_prelude::Http>>,
    services: &ServiceResults,
    now_secs: i64,
) -> u64 {
    use poise::serenity_prelude::{ChannelId, EditMessage, MessageId};
    let targets = load_status_panels(pool).await;
    let Some(http) = http else {
        return targets.len() as u64;
    };
    let embed = build_status_embed(services);
    let content = format!("**Last update:** <t:{now_secs}:R>");
    let mut done = 0u64;
    for target in targets {
        let res = ChannelId::new(target.channel_id)
            .edit_message(
                http,
                MessageId::new(target.message_id),
                EditMessage::new().content(&content).embed(embed.clone()),
            )
            .await;
        match res {
            Ok(_) => done += 1,
            Err(e) => {
                // Entry kept at all costs: retry on the next minute.
                tracing::warn!(
                    "infra: status panel update failed for guild {} channel {} message {}: {e} (entry kept)",
                    target.guild_id,
                    target.channel_id,
                    target.message_id,
                );
            }
        }
    }
    done
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

    #[test]
    fn ip_endpoints_match_getip_ts() {
        assert_eq!(ip_endpoint(false), "https://api.ipify.org");
        assert_eq!(ip_endpoint(true), "https://api6.ipify.org");
    }

    #[test]
    fn ip_cache_roundtrip_per_family() {
        clear_ip_cache();
        assert_eq!(cached_ip(false), None);
        assert_eq!(cached_ip(true), None);
        set_cached_ip(false, "1.2.3.4");
        assert_eq!(cached_ip(false).as_deref(), Some("1.2.3.4"));
        assert_eq!(cached_ip(true), None);
        set_cached_ip(true, "2001:db8::1");
        assert_eq!(cached_ip(true).as_deref(), Some("2001:db8::1"));
        set_cached_ip(false, "5.6.7.8");
        assert_eq!(cached_ip(false).as_deref(), Some("5.6.7.8"));
        clear_ip_cache();
        assert_eq!(cached_ip(false), None);
    }

    // ---- Service checks (mocked endpoints) ----

    #[test]
    fn public_bot_maps_ping_to_ready() {
        assert_eq!(
            public_bot_result(120),
            ResponseResult {
                up: true,
                latency: 120
            }
        );
        assert_eq!(public_bot_result(0), ResponseResult::down());
    }

    #[test]
    fn format_status_matches_ts_shapes() {
        assert_eq!(
            format_status(&ResponseResult {
                up: true,
                latency: 42
            }),
            "Online | Latency: 42ms"
        );
        assert_eq!(format_status(&ResponseResult::down()), "Offline");
    }

    #[test]
    fn service_keys_match_ts_record() {
        let services = ServiceResults::default();
        let value = serde_json::to_value(&services).unwrap();
        let obj = value.as_object().unwrap();
        for key in ["PublicBot", "HorizonGateway", "Lavalink", "iHorizonWebsite"] {
            let entry = obj.get(key).unwrap();
            assert_eq!(entry.get("up").unwrap(), &serde_json::Value::Bool(false));
            assert_eq!(entry.get("latency").unwrap(), &serde_json::Value::from(0));
        }
    }

    #[tokio::test]
    async fn gateway_empty_url_is_down_without_request() {
        let timeout = Duration::from_millis(200);
        assert_eq!(
            check_horizon_gateway(None, timeout).await,
            ResponseResult::down()
        );
        assert_eq!(
            check_horizon_gateway(Some("   "), timeout).await,
            ResponseResult::down()
        );
    }

    /// Minimal single-shot HTTP origin for offline tests.
    async fn spawn_http(status: u16, body: &'static str) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            if let Ok((mut sock, _)) = listener.accept().await {
                use tokio::io::{AsyncReadExt, AsyncWriteExt};
                let mut buf = vec![0u8; 4096];
                let _ = sock.read(&mut buf).await;
                let reason = if status == 200 {
                    "OK"
                } else {
                    "Internal Server Error"
                };
                let resp = format!(
                    "HTTP/1.1 {status} {reason}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = sock.write_all(resp.as_bytes()).await;
            }
        });
        format!("http://{addr}/")
    }

    #[tokio::test]
    async fn http_check_up_on_2xx_down_on_500() {
        let timeout = Duration::from_secs(2);
        let ok_url = spawn_http(200, "ok").await;
        let ok = http_check(&ok_url, timeout).await;
        assert!(ok.up);

        let bad_url = spawn_http(500, "boom").await;
        assert_eq!(http_check(&bad_url, timeout).await, ResponseResult::down());
    }

    #[tokio::test]
    async fn http_check_closed_port_is_down() {
        let r = http_check("http://127.0.0.1:1/", Duration::from_millis(300)).await;
        assert_eq!(r, ResponseResult::down());
    }

    #[tokio::test]
    async fn check_all_services_fans_out_like_ts() {
        let timeout = Duration::from_secs(2);
        let gateway_url = spawn_http(200, "gateway").await;
        let website_url = spawn_http(200, "site").await;
        let services = check_all_services(
            77,
            Some(&gateway_url),
            "127.0.0.1",
            1,
            &website_url,
            timeout,
        )
        .await;
        assert_eq!(
            services.public_bot,
            ResponseResult {
                up: true,
                latency: 77
            }
        );
        assert!(services.horizon_gateway.up);
        assert!(!services.lavalink.up);
        assert_eq!(services.lavalink.latency, 0);
        assert!(services.website.up);
    }

    // ---- Status panel broadcast + ping history/chart ----

    #[test]
    fn ping_history_ignores_zero_and_caps_at_60() {
        let mut history = vec![];
        push_ping_history(&mut history, 0);
        assert!(history.is_empty());
        for i in 1..=65u64 {
            push_ping_history(&mut history, i);
        }
        assert_eq!(history.len(), MAX_PING_HISTORY);
        assert_eq!(history[0], 6);
        assert_eq!(history[MAX_PING_HISTORY - 1], 65);
    }

    #[test]
    fn ping_stats_match_ts() {
        assert_eq!(calculate_ping_stats(&[]), PingStats::zero());
        assert_eq!(calculate_ping_stats(&[0, 0]), PingStats::zero());
        // current = last valid, avg rounded, max/min over valid.
        assert_eq!(
            calculate_ping_stats(&[10, 20, 30]),
            PingStats {
                current: 30,
                avg: 20,
                max: 30,
                min: 10,
            }
        );
        assert_eq!(calculate_ping_stats(&[10, 11]).avg, 11);
    }

    #[test]
    fn ping_chart_data_right_aligns_and_labels() {
        let (data, labels) = ping_chart_data(&[50, 60]);
        assert_eq!(data.len(), MAX_PING_HISTORY);
        assert_eq!(labels.len(), MAX_PING_HISTORY);
        assert_eq!(labels[0], "59m");
        assert_eq!(labels[MAX_PING_HISTORY - 1], "Now");
        assert_eq!(data[MAX_PING_HISTORY - 2], Some(50));
        assert_eq!(data[MAX_PING_HISTORY - 1], Some(60));
        assert_eq!(data[0], None);
    }

    #[test]
    fn ping_chart_svg_shapes() {
        let (data, labels) = ping_chart_data(&[40, 80]);
        let svg = build_ping_chart_svg(&data, &labels);
        assert!(svg.starts_with("<svg"));
        assert!(svg.contains("pingFill"));
        assert!(svg.contains("stroke=\"#5865F2\""));
        assert!(svg.contains(">Now</text>"));
        // Empty history falls back to the flat baseline, no crash.
        let (empty, empty_labels) = ping_chart_data(&[]);
        let flat = build_ping_chart_svg(&empty, &empty_labels);
        assert!(flat.contains("<svg"));
        assert!(flat.contains("stroke=\"#5865F2\""));
    }

    #[test]
    fn ping_chart_attachment_is_offline_svg_file() {
        // SVG-as-attachment (U-CHART-PATH): filename keeps the chart
        // identity with an honest .svg extension, never .png.
        let (name, bytes) = ping_chart_attachment(&[40, 80]);
        assert_eq!(name, "ping-chart.svg");
        assert_eq!(name, PING_CHART_FILENAME);
        let svg = String::from_utf8(bytes).unwrap();
        assert!(svg.starts_with("<svg"));
        assert!(svg.contains("pingFill"));
        assert!(svg.contains(">Now</text>"));
        // Empty history still yields a valid file (flat baseline).
        let (empty_name, empty_bytes) = ping_chart_attachment(&[]);
        assert_eq!(empty_name, "ping-chart.svg");
        let empty_svg = String::from_utf8(empty_bytes).unwrap();
        assert!(empty_svg.starts_with("<svg"));
    }

    #[test]
    fn status_panel_fields_match_ts_names() {
        let services = ServiceResults {
            public_bot: ResponseResult {
                up: true,
                latency: 42,
            },
            ..Default::default()
        };
        let fields = status_panel_fields(&services);
        let names: Vec<&str> = fields.iter().map(|(n, _, _)| n.as_str()).collect();
        assert_eq!(
            names,
            [
                "iHorizon (Public Bot)",
                "HorizonGateway (Public/Private API)",
                "Lavalink (Music Player)",
                "iHorizon Website"
            ]
        );
        assert_eq!(fields[0].2, "Online | Latency: 42ms");
        assert_eq!(fields[1].2, "Offline");
    }

    #[test]
    fn status_panel_entry_parses_string_and_number_ids() {
        let parsed =
            parse_status_panel_entry(r#"{"message_id":"111","guild_id":"222","channel_id":"333"}"#)
                .unwrap();
        assert_eq!(
            parsed,
            StatusPanelTarget {
                guild_id: 222,
                channel_id: 333,
                message_id: 111,
            }
        );
        let numeric =
            parse_status_panel_entry(r#"{"message_id":1,"guild_id":2,"channel_id":3}"#).unwrap();
        assert_eq!(numeric.message_id, 1);
        assert!(parse_status_panel_entry(r#"{"message_id":"1"}"#).is_none());
        assert!(parse_status_panel_entry("not-json").is_none());
    }

    async fn panel_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn ping_history_roundtrips_through_kv() {
        let pool = panel_pool().await;
        assert_eq!(load_ping_history(&pool).await, Vec::<u64>::new());
        assert_eq!(record_ping(&pool, 0).await, Vec::<u64>::new());
        assert_eq!(record_ping(&pool, 25).await, vec![25]);
        assert_eq!(load_ping_history(&pool).await, vec![25]);
        assert_eq!(record_ping(&pool, 35).await, vec![25, 35]);
    }

    #[tokio::test]
    async fn status_panel_sweep_dry_run_counts_loadable_panels() {
        let pool = panel_pool().await;
        crate::db::kv_set(
            &pool,
            "0",
            "MISC.statusEmbed.100",
            r#"{"message_id":"1","guild_id":"100","channel_id":"200"}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(
            &pool,
            "0",
            "MISC.statusEmbed.101",
            r#"{"message_id":2,"guild_id":101,"channel_id":201}"#,
        )
        .await
        .unwrap();
        // Malformed rows are skipped, other scopes ignored.
        crate::db::kv_set(&pool, "0", "MISC.statusEmbed.102", "nope")
            .await
            .unwrap();
        crate::db::kv_set(
            &pool,
            "999",
            "MISC.statusEmbed.999",
            r#"{"message_id":"9","guild_id":"999","channel_id":"999"}"#,
        )
        .await
        .unwrap();
        let targets = load_status_panels(&pool).await;
        assert_eq!(targets.len(), 2);
        let services = ServiceResults::default();
        // Offline: http None performs no network, returns loadable count.
        assert_eq!(sweep_status_panel(&pool, None, &services, 0).await, 2);
    }
}
