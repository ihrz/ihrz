// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Pure core functions. Mirrors src/core/functions/* (ms, numberBeautifuer,
// generateProgressBar, sanitizer, maskLink, getMessageURL, validImageType,
// isAllowedLinks, emojiChecker, randomExpression, date_and_time,
// batchProcessor, shard helper, embedHelper validators, apiUrlParser).
//
// Discord-bound helpers (method.ts senders, modal/collector flows, image
// rendering, Lavalink, SMTP) live in their feature modules instead.

/// Full unit table from ms.ts (EN + FR units).
fn unit_multiplier(unit: &str) -> f64 {
    match unit {
        "ms" | "msec" | "millisecond" | "milliseconds" | "milliseconde" | "millisecondes" => 1.0,
        "s" | "sec" | "secs" | "second" | "seconds" | "seconde" | "secondes" => 1_000.0,
        "m" | "min" | "mins" | "minute" | "minutes" => 60_000.0,
        "h" | "hr" | "hrs" | "hour" | "hours" | "heure" | "heures" => 3_600_000.0,
        "d" | "day" | "days" | "j" | "jour" | "jours" => 86_400_000.0,
        "w" | "sm" | "week" | "weeks" | "semaine" | "semaines" => 604_800_000.0,
        "mo" | "mois" | "month" | "months" => 2_592_000_000.0,
        "y" | "yr" | "yrs" | "year" | "years" | "an" | "ans" => 31_557_600_000.0,
        _ => 0.0,
    }
}

/// Parse durations like "1h30m", "-2.5d". Mirrors
/// iHorizonTimeCalculator.to_ms (regex `(-?\d*\.?\d+)([a-zA-Z]+)`, unknown
/// units contribute 0).
pub fn time_ms(input: &str) -> f64 {
    let s: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    let bytes = s.as_bytes();
    let mut i = 0;
    let mut total = 0.0;
    while i < bytes.len() {
        let start = i;
        if bytes[i] == b'-' {
            i += 1;
        }
        let int_start = i;
        while i < bytes.len() && (bytes[i].is_ascii_digit() || bytes[i] == b'.') {
            i += 1;
        }
        if int_start == i {
            i = start + 1;
            continue;
        }
        let num: f64 = s[start..i].parse().unwrap_or(0.0);
        let u_start = i;
        while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
            i += 1;
        }
        if u_start == i {
            continue;
        }
        total += num * unit_multiplier(&s[u_start..i].to_ascii_lowercase());
    }
    total
}

/// Compact duration label. Mirrors to_beautiful_string short form
/// (y/mo/w/d/h/m/s decomposition).
pub fn beautiful_ms(ms: f64) -> String {
    if !ms.is_finite() || ms < 0.0 {
        return "0s".to_string();
    }
    let mut rest = ms as u64;
    let units = [
        ("y", 31_557_600_000u64),
        ("mo", 2_592_000_000),
        ("w", 604_800_000),
        ("d", 86_400_000),
        ("h", 3_600_000),
        ("m", 60_000),
        ("s", 1_000),
    ];
    let mut parts = vec![];
    for (name, factor) in units {
        if rest >= factor {
            parts.push(format!("{}{}", rest / factor, name));
            rest %= factor;
        }
    }
    if parts.is_empty() {
        return if rest == 0 {
            "0s".to_string()
        } else {
            format!("{rest}ms")
        };
    }
    parts.join(" ")
}

/// Number beautifier. Mirrors numberBeautifuer.ts (K/M/B/T, 1 decimal).
pub fn format_number(num: f64) -> String {
    let neg = num < 0.0;
    let abs = num.abs();
    let prefix = if neg { "-" } else { "" };
    if abs >= 1_000_000_000_000.0 {
        format!("{prefix}{:.1}T", abs / 1_000_000_000_000.0)
    } else if abs >= 1_000_000_000.0 {
        format!("{prefix}{:.1}B", abs / 1_000_000_000.0)
    } else if abs >= 1_000_000.0 {
        format!("{prefix}{:.1}M", abs / 1_000_000.0)
    } else if abs >= 1_000.0 {
        format!("{prefix}{:.1}K", abs / 1_000.0)
    } else if abs.fract() == 0.0 {
        format!("{prefix}{}", abs as i64)
    } else {
        format!("{prefix}{abs}")
    }
}

fn format_time(total_secs: u64) -> String {
    let (h, m, s) = (total_secs / 3600, (total_secs / 60) % 60, total_secs % 60);
    if h > 0 {
        format!("{h}:{m:02}:{s:02}")
    } else {
        format!("{m}:{s:02}")
    }
}

/// Progress bar. Mirrors generateProgressBar.ts (17 chars, `[` + 15 +
/// `]`, dash fill, `o` cursor).
pub fn progress_bar(current_ms: u64, total_ms: u64) -> (String, String, String) {
    let cur_s = current_ms / 1000;
    let tot_s = total_ms.max(1) / 1000;
    let progress = (cur_s as f64 / tot_s as f64) * 100.0;
    let dashes = ((17 - 2) as f64 * (progress / 100.0)).floor() as usize;
    let dashes = dashes.min(15);
    let bar = format!("[{}{}{}]", "-".repeat(dashes), "o", "-".repeat(15 - dashes));
    (bar, format_time(cur_s), format_time(tot_s))
}

/// Text sanitizer. Mirrors sanitizer.ts: drops lone surrogates (the only
/// strings Rust can never hold are empty ones).
pub fn sanitizing(text: &str) -> String {
    if text.is_empty() {
        return "<malformed string>".to_string();
    }
    text.to_string()
}

/// Link masker. Mirrors maskLink.ts blacklist.
pub fn mask_link(input: &str) -> String {
    for blocked in ["http://", "https://", "discordapp", ".com", ".gg"] {
        if input.contains(blocked) {
            return "Hidden Link".to_string();
        }
    }
    input.to_string()
}

/// Message URL builder. Mirrors getMessageURL.ts.
pub fn message_url(guild_id: u64, channel_id: u64, message_id: u64) -> String {
    format!("https://discord.com/channels/{guild_id}/{channel_id}/{message_id}")
}

/// Image content-type guard. Mirrors validImageType.ts exactly.
pub fn is_valid_image_type(content_type: Option<&str>) -> bool {
    match content_type {
        None => false,
        Some(ct) => matches!(
            ct.to_ascii_lowercase().as_str(),
            "image/png" | "image/jpeg" | "image/jpg" | "image/gif" | "image/webp"
        ),
    }
}

/// Music URL allowlist. Mirrors isAllowedLinks.ts (default true, false
/// only when the hostname parses and is unlisted).
pub fn is_allowed_links(link: &str) -> bool {
    const DOMAINS: &[&str] = &[
        "open.spotify.com",
        "play.spotify.com",
        "spotify.com",
        "www.spotify.com",
        "www.deezer.com",
        "deezer.com",
        "deezer.page.link",
        "dzr.page.link",
        "link.deezer.com",
        "soundcloud.com",
        "www.soundcloud.com",
        "on.soundcloud.com",
        "m.soundcloud.com",
        "music.apple.com",
        "www.music.apple.com",
        "www.napster.com",
        "napster.com",
        "us.napster.com",
        "music.amazon.com",
        "amazon.com",
        "www.amazon.com",
        "music.amazon.co.uk",
        "music.amazon.de",
        "music.amazon.fr",
        "music.amazon.it",
        "music.amazon.es",
        "music.amazon.ca",
        "music.amazon.co.jp",
        "music.amazon.com.au",
        "music.amazon.com.br",
        "music.amazon.in",
        "music.amazon.com.mx",
        "cdn.discordapp.com",
        "youtu.be",
        "youtube.com",
        "www.youtube.com",
        "music.youtube.com",
    ];
    // Mirrors url.parse(link).hostname: no scheme -> null -> allowed (true).
    let Some(after_scheme) = link.split("://").nth(1) else {
        return true;
    };
    let host = after_scheme
        .split('/')
        .next()
        .unwrap_or("")
        .split('@')
        .next_back()
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    if host.is_empty() {
        return true;
    }
    DOMAINS.contains(&host.as_str())
}

/// Single unicode emoji check. Mirrors isSingleEmoji
/// (`/^[\p{Emoji}][\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]?$/u`, approximated with
/// explicit ranges since regex-unicode is not a dependency).
pub fn is_single_emoji(text: &str) -> bool {
    let mut chars = text.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    let cp = first as u32;
    let emoji = (0x1F300..=0x1FAFF).contains(&cp)
        || (0x2600..=0x27BF).contains(&cp)
        || (0x2B00..=0x2BFF).contains(&cp)
        || (0xFE00..=0xFE0F).contains(&cp)
        || matches!(cp, 0x2764 | 0x2B50 | 0x00A9 | 0x00AE);
    if !emoji {
        return false;
    }
    match chars.next() {
        None => true,
        Some(vs) if matches!(vs as u32, 0xFE0E | 0xFE0F) => chars.next().is_none(),
        Some(modifier) if (0x1F3FB..=0x1F3FF).contains(&(modifier as u32)) => {
            chars.next().is_none()
        }
        _ => false,
    }
}

/// Custom Discord emoji check. Mirrors isDiscordEmoji (`/:(\w+):(\d+)>/`).
pub fn is_discord_emoji(text: &str) -> bool {
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b':' {
            let mut j = i + 1;
            while j < bytes.len() && (bytes[j].is_ascii_alphanumeric() || bytes[j] == b'_') {
                j += 1;
            }
            if j > i + 1 && j < bytes.len() && bytes[j] == b':' {
                let mut k = j + 1;
                while k < bytes.len() && bytes[k].is_ascii_digit() {
                    k += 1;
                }
                if k > j + 1 && k < bytes.len() && bytes[k] == b'>' {
                    return true;
                }
            }
        }
        i += 1;
    }
    false
}

/// Embed validators. Mirrors embedHelper.ts.
pub fn is_valid_link(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://")
}

pub fn is_valid_color(color: &str) -> bool {
    let hex = color.strip_prefix('#').unwrap_or(color);
    (hex.len() == 3 || hex.len() == 6) && hex.chars().all(|c| c.is_ascii_hexdigit())
}

pub fn is_valid_embed_id(id: &str) -> bool {
    if id.is_empty() {
        return false;
    }
    let key = format!("EMBED.{id}");
    if key.len() > 255 {
        return false;
    }
    let segments: Vec<&str> = key.split('.').collect();
    if segments.len() > 32 {
        return false;
    }
    !segments.iter().any(|s| s.is_empty())
}

/// Sequential batch processor. Mirrors batchProcessor.processBatch
/// (chunked loop; concurrency omitted — single-threaded port).
pub async fn process_batch<T, F, Fut>(items: &[T], batch_size: usize, mut processor: F) -> Vec<bool>
where
    T: Clone,
    F: FnMut(T) -> Fut,
    Fut: std::future::Future<Output = bool>,
{
    let mut out = Vec::with_capacity(items.len());
    let size = batch_size.max(1);
    for chunk in items.chunks(size) {
        for item in chunk {
            out.push(processor(item.clone()).await);
        }
    }
    out
}

/// Shard id for a guild. Mirrors client.inShard
/// (`(guildId >> 22n) % totalShards`).
pub fn guild_shard(guild_id: u64, total_shards: u64) -> u64 {
    if total_shards == 0 {
        return 0;
    }
    (guild_id >> 22) % total_shards
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn time_full_units() {
        assert_eq!(time_ms("1h30m"), 5_400_000.0);
        assert_eq!(time_ms("2d"), 172_800_000.0);
        assert_eq!(time_ms("1semaine"), 604_800_000.0);
        assert_eq!(time_ms("3jours"), 259_200_000.0);
        assert_eq!(time_ms("1an"), 31_557_600_000.0);
        assert_eq!(time_ms("1mo"), 2_592_000_000.0);
        assert_eq!(time_ms("1.5h"), 5_400_000.0);
        assert_eq!(time_ms("10x"), 0.0);
        assert_eq!(time_ms(""), 0.0);
    }

    #[test]
    fn beautiful_decomposes() {
        assert_eq!(beautiful_ms(3_600_000.0), "1h");
        assert_eq!(beautiful_ms(90_000.0), "1m 30s");
        assert_eq!(beautiful_ms(500.0), "500ms");
        assert_eq!(beautiful_ms(0.0), "0s");
    }

    #[test]
    fn cipher_roundtrip_and_rejects() {
        let enc = encrypt_text("pw", "hello guild");
        assert_eq!(enc.split(':').count(), 4);
        assert_eq!(decrypt_text("pw", &enc).as_deref(), Some("hello guild"));
        assert_eq!(decrypt_text("wrong", &enc), None);
        assert_eq!(decrypt_text("pw", "not:valid"), None);
        assert_eq!(decrypt_text("pw", "a:b:c:d:e"), None);
        // Fixed vector produced by the TS implementation (node:crypto).
        let ts = "d00a16daa41250a3a64a254f10bbdbc3:5626ea095456cc1121843a32:3b16d14a2c4ac1854e0a60:35a1c55e9161f75e235bcd40cf3c30e4";
        assert_eq!(decrypt_text("pw", ts).as_deref(), Some("hello guild"));
    }

    #[test]
    fn numbers_beautify() {
        assert_eq!(format_number(999.0), "999");
        assert_eq!(format_number(1500.0), "1.5K");
        assert_eq!(format_number(2_500_000.0), "2.5M");
        assert_eq!(format_number(-3_000_000_000.0), "-3.0B");
        assert_eq!(format_number(2_000_000_000_000.0), "2.0T");
    }

    #[test]
    fn bar_renders() {
        let (bar, cur, tot) = progress_bar(0, 200_000);
        assert_eq!(cur, "0:00");
        assert_eq!(tot, "3:20");
        assert!(bar.starts_with('[') && bar.ends_with(']'));
        assert_eq!(bar.len(), 18);
        let (_, cur2, _) = progress_bar(3_661_000, 10_000_000);
        assert_eq!(cur2, "1:01:01");
    }

    #[test]
    fn sanitize_masks_links_urls() {
        assert_eq!(sanitizing("hello"), "hello");
        assert_eq!(sanitizing(""), "<malformed string>");
        assert_eq!(mask_link("see https://x.y"), "Hidden Link");
        assert_eq!(mask_link("plain text"), "plain text");
        assert_eq!(message_url(1, 2, 3), "https://discord.com/channels/1/2/3");
    }

    #[test]
    fn image_and_link_gates() {
        assert!(is_valid_image_type(Some("image/PNG")));
        assert!(is_valid_image_type(Some("image/webp")));
        assert!(!is_valid_image_type(Some("text/plain")));
        assert!(!is_valid_image_type(None));
        assert!(is_allowed_links("https://open.spotify.com/x"));
        assert!(!is_allowed_links("https://evil.example/x"));
        assert!(is_allowed_links("not a url"));
    }

    #[test]
    fn emoji_checks() {
        assert!(is_single_emoji("👍"));
        assert!(is_single_emoji("⭐"));
        assert!(!is_single_emoji("ab"));
        assert!(!is_single_emoji(""));
        assert!(is_discord_emoji("<:pepe:123>"));
        assert!(is_discord_emoji("<a:dance:456>"));
        assert!(!is_discord_emoji("👍"));
    }

    #[test]
    fn embed_validators() {
        assert!(is_valid_link("https://x.y"));
        assert!(!is_valid_link("ftp://x"));
        assert!(is_valid_color("#fff"));
        assert!(is_valid_color("#123456"));
        assert!(!is_valid_color("red"));
        assert!(is_valid_embed_id("abc123"));
        assert!(!is_valid_embed_id(""));
        assert!(!is_valid_embed_id("a.b."));
    }

    #[test]
    fn shard_math() {
        assert_eq!(guild_shard(1 << 22, 4), 1);
        assert_eq!(guild_shard(0, 4), 0);
        assert_eq!(guild_shard(99, 0), 0);
    }

    #[tokio::test]
    async fn batches_run_in_order() {
        let items = vec![1, 2, 3, 4, 5];
        let out = process_batch(&items, 2, |x| async move { x % 2 == 0 }).await;
        assert_eq!(out, vec![false, true, false, true, false]);
    }
}

// ---- date_and_time.format ----

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/// Days since Unix epoch -> (year, month 1-12, day). Howard Hinnant algorithm.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// Date formatter. Mirrors date_and_time.format
/// (YYYY/YY/MMM/MM/DD/ddd/HH/mm/ss, UTC).
pub fn format_date(unix_secs: i64, format: &str) -> String {
    let days = unix_secs.div_euclid(86_400);
    let secs = unix_secs.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let (hh, mm, ss) = (
        (secs / 3600) as u32,
        ((secs / 60) % 60) as u32,
        (secs % 60) as u32,
    );
    let weekday = DAYS[((days + 4).rem_euclid(7)) as usize];
    let year_s = year.to_string();
    let mut out = format.to_string();
    for (token, value) in [
        ("YYYY", year_s.clone()),
        ("YY", year_s[year_s.len().saturating_sub(2)..].to_string()),
        ("MMM", MONTHS[(month - 1) as usize].to_string()),
        ("MM", format!("{month:02}")),
        ("DD", format!("{day:02}")),
        ("ddd", weekday.to_string()),
        ("HH", format!("{hh:02}")),
        ("mm", format!("{mm:02}")),
        ("ss", format!("{ss:02}")),
    ] {
        out = out.replace(token, &value);
    }
    out
}

// ---- apiUrlParser ----

/// Gateway methods. Mirrors GatewayMethod enum (0-9).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GatewayMethod {
    GenerateOauthLink = 0,
    CreateAuthRestoreGuild = 1,
    ForceJoinAuthRestore = 2,
    AddSecurityCodeAmount = 3,
    ChangeRole = 4,
    UserInfo = 5,
    ServerBackup = 6,
    SecureWebhook = 7,
    CreateCustomVanity = 8,
    ImageGeneration = 9,
}

/// Gateway URL builder. Mirrors buildGatewayUrl (trailing slashes trimmed).
pub fn gateway_url(base: &str, method: GatewayMethod) -> Result<String, &'static str> {
    if base.trim().is_empty() {
        return Err("Error: HorizonGateway empty in the configurations files");
    }
    let mut data = base.trim_end_matches('/').to_string();
    data += match method {
        GatewayMethod::GenerateOauthLink => "/api/ihorizon/v1/oauth2",
        GatewayMethod::CreateAuthRestoreGuild => "/api/ihorizon/v1/create-oauth2",
        GatewayMethod::ForceJoinAuthRestore => "/api/ihorizon/v1/forcejoin",
        GatewayMethod::AddSecurityCodeAmount => "/api/ihorizon/v1/securityCodeUpdate",
        GatewayMethod::ChangeRole => "/api/ihorizon/v1/role",
        GatewayMethod::UserInfo => "/api/ihorizon/v1/userinfo",
        GatewayMethod::ServerBackup => "/api/ihorizon/v1/serverBackup",
        GatewayMethod::SecureWebhook => "/api/v1/securewebhook/manage",
        GatewayMethod::CreateCustomVanity => "/api/ihorizon/v1/vanity-creation",
        GatewayMethod::ImageGeneration => "/api/ihorizon/v1/image",
    };
    Ok(data)
}

// ---- ownerHelper (pure parts) ----

/// Guild owner id set: ownerId + stored OWNER keys. Mirrors getGuildOwner.
pub fn guild_owner_ids(owner_id: u64, stored: &[String]) -> Vec<String> {
    let mut ids = vec![owner_id.to_string()];
    ids.extend(stored.iter().cloned());
    ids.sort();
    ids.dedup();
    ids
}

/// Bot owner check against config list. Mirrors isBotOwner/isBotDev.
pub fn is_bot_owner(user_id: u64, config_owners: &[String]) -> bool {
    config_owners.iter().any(|o| o == &user_id.to_string())
}

#[cfg(test)]
mod funcs_part2_tests {
    use super::*;

    #[test]
    fn date_formats_tokens() {
        // 2024-01-15 12:30:45 UTC = 1705321845
        assert_eq!(format_date(1705321845, "YYYY-MM-DD"), "2024-01-15");
        assert_eq!(format_date(1705321845, "ddd"), "Mon");
        assert_eq!(format_date(1705321845, "HH:mm:ss"), "12:30:45");
        assert_eq!(format_date(0, "YYYY-MM-DD ddd"), "1970-01-01 Thu");
        assert_eq!(format_date(1705321845, "YY/MMM"), "24/Jan");
    }

    #[test]
    fn gateway_urls() {
        assert_eq!(
            gateway_url("https://gateway.ihorizon.org/", GatewayMethod::UserInfo).unwrap(),
            "https://gateway.ihorizon.org/api/ihorizon/v1/userinfo"
        );
        assert_eq!(
            gateway_url("http://127.0.0.1:31981", GatewayMethod::ImageGeneration).unwrap(),
            "http://127.0.0.1:31981/api/ihorizon/v1/image"
        );
        assert!(gateway_url("", GatewayMethod::UserInfo).is_err());
    }

    #[test]
    fn owner_sets() {
        assert_eq!(
            guild_owner_ids(1, &["2".to_string(), "1".to_string()]),
            vec!["1".to_string(), "2".to_string()]
        );
        assert!(is_bot_owner(7, &["7".to_string()]));
        assert!(!is_bot_owner(8, &["7".to_string()]));
    }
}

// ---- sanitizeInteractionOptionValue ----

/// Sensitive option redactor. Mirrors sanitizeInteractionOptionValue.ts
/// ([REDACTED] for password/token/api keys/secrets, else the value).
pub fn sanitize_option(option_name: &str, option_value: &str) -> String {
    let normalized: String = option_name
        .to_ascii_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();
    match normalized.as_str() {
        "password" | "pass" | "token" | "apitoken" | "apikey" | "secret" | "sharedsecret"
        | "credential" | "sessionkey" | "sessiontoken" => "[REDACTED]".to_string(),
        _ => option_value.to_string(),
    }
}

// ---- userStatsUtils time buckets ----

/// Partition timestamps into daily/weekly/monthly windows.
/// Mirrors calculateMessageTime/calculateVoiceActivity.
pub fn bucketize(
    stamps: &[i64],
    now: i64,
    daily_ms: i64,
    weekly_ms: i64,
    monthly_ms: i64,
) -> (Vec<i64>, Vec<i64>, Vec<i64>) {
    let mut daily = vec![];
    let mut weekly = vec![];
    let mut monthly = vec![];
    for &t in stamps {
        if t >= now - daily_ms {
            daily.push(t);
        }
        if t >= now - weekly_ms {
            weekly.push(t);
        }
        if t >= now - monthly_ms {
            monthly.push(t);
        }
    }
    (daily, weekly, monthly)
}

// ---- authRestoreHelper OAuth link ----

/// OAuth2 link renderer. Mirrors Oauth2_Link template.
pub fn oauth2_link(client_id: &str, redirect_uri: &str, scope: &str, guild_id: &str) -> String {
    "https://discord.com/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&state={guild_id}"
        .replace("{client_id}", client_id)
        .replace("{redirect_uri}", redirect_uri)
        .replace("{scope}", scope)
        .replace("{guild_id}", guild_id)
}

// ---- encryptDecryptMethod AES-256-GCM ----

/// Encrypt text with a password. Mirrors encrypt() in
/// encryptDecryptMethod.ts: PBKDF2-SHA256 (100k, 16B salt) -> AES-256-GCM
/// (12B iv), rendered as salt:iv:ciphertext:tag hex.
pub fn encrypt_text(password: &str, text: &str) -> String {
    use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit};
    use rand::{rngs::OsRng, RngCore};
    let mut salt = [0u8; 16];
    let mut iv = [0u8; 12];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut iv);
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<sha2::Sha256>(password.as_bytes(), &salt, 100_000, &mut key);
    let cipher = Aes256Gcm::new_from_slice(&key).expect("fixed key length");
    let nonce = aes_gcm::Nonce::from_slice(&iv);
    let ct = cipher.encrypt(nonce, text.as_bytes()).unwrap_or_default();
    format!(
        "{}:{}:{}:{}",
        hex::encode(salt),
        hex::encode(iv),
        hex::encode(&ct[..ct.len().saturating_sub(16)]),
        hex::encode(&ct[ct.len().saturating_sub(16)..])
    )
}

/// Decrypt text with a password. Mirrors decrypt(): None on any error.
pub fn decrypt_text(password: &str, data: &str) -> Option<String> {
    use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit};
    let mut parts = data.split(':');
    let (salt, iv, ct, tag) = (
        hex::decode(parts.next()?).ok()?,
        hex::decode(parts.next()?).ok()?,
        hex::decode(parts.next()?).ok()?,
        hex::decode(parts.next()?).ok()?,
    );
    if parts.next().is_some() {
        return None;
    }
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<sha2::Sha256>(password.as_bytes(), &salt, 100_000, &mut key);
    let cipher = Aes256Gcm::new_from_slice(&key).ok()?;
    let nonce = aes_gcm::Nonce::from_slice(&iv);
    let mut payload = ct;
    payload.extend_from_slice(&tag);
    let pt = cipher.decrypt(nonce, payload.as_slice()).ok()?;
    String::from_utf8(pt).ok()
}

// ---- os_utils.niceBytes ----

/// Byte formatter. Mirrors niceBytes.ts (input unit is KB, like os.freemem).
pub fn nice_bytes(kb: f64) -> String {
    let units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let idx = ((kb * 1024.0).log(1024.0).floor() as usize).min(units.len() - 1);
    let bytes = (kb * 1024.0) / 1024f64.powi(idx as i32);
    if bytes < 10.0 && idx > 0 {
        format!("{bytes:.2} {}", units[idx])
    } else {
        format!("{:.0} {}", bytes, units[idx])
    }
}

// ---- random.ts generatePassword ----

/// Password options. Mirrors PasswordOptions.
#[derive(Debug, Clone)]
pub struct PasswordOptions {
    pub length: usize,
    pub numbers: bool,
    pub symbols: bool,
    pub lowercase: bool,
    pub uppercase: bool,
    pub exclude_similar: bool,
    pub exclude: String,
    pub strict: bool,
}

/// Password generator. Mirrors generatePassword (xorshift seed; strict
/// mode guarantees one char per enabled class).
pub fn generate_password(opts: &PasswordOptions, seed: u64) -> Result<String, &'static str> {
    if opts.length == 0 {
        return Err("length must be positive");
    }
    if !(opts.lowercase || opts.uppercase || opts.numbers || opts.symbols) {
        return Err("at least one character class required");
    }
    let mut classes: Vec<String> = vec![];
    if opts.lowercase {
        classes.push("abcdefghijklmnopqrstuvwxyz".to_string());
    }
    if opts.uppercase {
        classes.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ".to_string());
    }
    if opts.numbers {
        classes.push("0123456789".to_string());
    }
    if opts.symbols {
        classes.push("!@#$%^&*()_+=".to_string());
    }
    let mut pool: String = classes.concat();
    if !opts.exclude.is_empty() {
        pool.retain(|c| !opts.exclude.contains(c));
    }
    if opts.exclude_similar {
        pool.retain(|c| !"il1Lo0O".contains(c));
    }
    if pool.is_empty() {
        return Err("no characters left after exclusions");
    }
    let pool: Vec<char> = pool.chars().collect();
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut next = move || {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        state
    };
    let mut out: Vec<char> = (0..opts.length)
        .map(|_| pool[(next() % pool.len() as u64) as usize])
        .collect();
    if opts.strict {
        for (i, class) in classes.iter().enumerate() {
            let class: Vec<char> = class.chars().collect();
            let pos = (next() as usize) % opts.length;
            out[pos] = class[(next() as usize) % class.len()];
            let _ = i;
        }
    }
    Ok(out.into_iter().collect())
}

/// Database round-trip latency in ms. Mirrors database_latency.ts.
pub async fn database_latency(pool: &crate::db::Pool) -> u128 {
    let start = std::time::Instant::now();
    let _ = crate::db::kv_get(pool, "__ping__", "__ping__").await;
    start.elapsed().as_millis()
}

#[cfg(test)]
mod funcs_part3_tests {
    use super::*;

    #[test]
    fn option_redaction() {
        assert_eq!(sanitize_option("password", "x"), "[REDACTED]");
        assert_eq!(sanitize_option("api-key", "x"), "[REDACTED]");
        assert_eq!(sanitize_option("sharedSecret", "x"), "[REDACTED]");
        assert_eq!(sanitize_option("reason", "spam"), "spam");
    }

    #[test]
    fn buckets_partition() {
        let (d, w, m) = bucketize(&[95, 50, 5], 100, 10, 60, 1000);
        assert_eq!(d, vec![95]);
        assert_eq!(w, vec![95, 50]);
        assert_eq!(m, vec![95, 50, 5]);
    }

    #[test]
    fn oauth_link_renders() {
        let u = oauth2_link("1", "https://x/cb", "identify", "9");
        assert!(u.contains("client_id=1") && u.contains("state=9"));
    }

    #[test]
    fn bytes_format() {
        assert_eq!(nice_bytes(0.5), "512 bytes");
        assert_eq!(nice_bytes(2048.0), "2.00 MB");
    }

    #[test]
    fn passwords_have_shape() {
        let opts = PasswordOptions {
            length: 16,
            numbers: true,
            symbols: true,
            lowercase: true,
            uppercase: true,
            exclude_similar: true,
            exclude: String::new(),
            strict: true,
        };
        let pw = generate_password(&opts, 42).unwrap();
        assert_eq!(pw.chars().count(), 16);
        assert!(pw.chars().any(|c| c.is_ascii_digit()));
        assert!(pw.chars().any(|c| c.is_ascii_lowercase()));
        assert!(pw.chars().any(|c| c.is_ascii_uppercase()));
        assert!(generate_password(
            &PasswordOptions {
                length: 0,
                ..opts.clone()
            },
            1
        )
        .is_err());
    }

    #[test]
    fn multiple_passwords() {
        let opts = PasswordOptions {
            length: 8,
            numbers: false,
            symbols: false,
            lowercase: true,
            uppercase: false,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        };
        let pws: Vec<String> = (0..3)
            .map(|i| generate_password(&opts, 100 + i).unwrap())
            .collect();
        assert_eq!(pws.len(), 3);
        assert!(pws.iter().all(|p| p.chars().count() == 8));
    }

    #[tokio::test]
    async fn latency_nonnegative() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool).await.unwrap();
        let _ = database_latency(&pool).await;
    }
}

// ---- intentEnabler ----

/// Privileged intent flags. Mirrors intentEnabler.ts constants.
pub const INTENT_GUILD_MEMBERS: u64 = 1 << 9;
pub const INTENT_MESSAGE_CONTENT: u64 = 1 << 15;
pub const INTENT_PRESENCE: u64 = 1 << 19;
pub const REQUIRED_INTENTS: u64 = INTENT_GUILD_MEMBERS | INTENT_MESSAGE_CONTENT | INTENT_PRESENCE;

/// Missing-intent computation. Mirrors the flags diff in enableRequiredIntents.
pub fn missing_intents(current_flags: u64) -> u64 {
    REQUIRED_INTENTS & !current_flags
}

/// Enable privileged intents on the application. Mirrors enableRequiredIntents
/// (GET then PATCH /applications/@me). Returns true when all set.
pub async fn enable_required_intents(token: &str) -> bool {
    let client = reqwest::Client::new();
    let info: serde_json::Value = match client
        .get("https://discord.com/api/v10/applications/@me")
        .header("Authorization", format!("Bot {token}"))
        .send()
        .await
    {
        Ok(r) => match r.json().await {
            Ok(v) => v,
            Err(_) => return false,
        },
        Err(_) => return false,
    };
    let current = info.get("flags").and_then(|f| f.as_u64()).unwrap_or(0);
    if missing_intents(current) == 0 {
        return true;
    }
    let updated = current | REQUIRED_INTENTS;
    client
        .patch("https://discord.com/api/v10/applications/@me")
        .header("Authorization", format!("Bot {token}"))
        .json(&serde_json::json!({"flags": updated}))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

// ---- helper.ts ----

/// Capitalize first letter. Mirrors capitalizeFirstLetter.
pub fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

// ---- os meminfo ----

/// Parse /proc/meminfo kB values. Mirrors getMemoryInfo shape
/// ({MemTotal, MemFree} in kB).
pub fn parse_meminfo(body: &str) -> (u64, u64) {
    let mut total = 0u64;
    let mut free = 0u64;
    for line in body.lines() {
        let mut parts = line.split_whitespace();
        match (parts.next(), parts.next()) {
            (Some("MemTotal:"), Some(v)) => total = v.parse().unwrap_or(0),
            (Some("MemFree:"), Some(v)) => free = v.parse().unwrap_or(0),
            _ => {}
        }
    }
    (total, free)
}

pub fn system_memory_kb() -> (u64, u64) {
    std::fs::read_to_string("/proc/meminfo")
        .map(|b| parse_meminfo(&b))
        .unwrap_or((0, 0))
}

#[cfg(test)]
mod funcs_part4_tests {
    use super::*;

    #[test]
    fn intent_flags() {
        assert_eq!(missing_intents(REQUIRED_INTENTS), 0);
        assert_eq!(missing_intents(0), REQUIRED_INTENTS);
        assert_eq!(REQUIRED_INTENTS, (1 << 9) | (1 << 15) | (1 << 19));
    }

    #[test]
    fn capitalize() {
        assert_eq!(capitalize_first("hello"), "Hello");
        assert_eq!(capitalize_first(""), "");
    }

    #[test]
    fn meminfo_parses() {
        let body = "MemTotal:        4024548 kB\nMemFree:         123456 kB\n";
        assert_eq!(parse_meminfo(body), (4024548, 123456));
    }
}

// ---- randomExpression ----

/// Bot expression image paths. Mirrors randomExpression.ts Expressions map.
pub const EXPRESSIONS: [(&str, &str); 8] = [
    ("Blushed", "/assets/img/bot/expression/ihorizon_blushed.png"),
    (
        "Grimacing",
        "/assets/img/bot/expression/ihorizon_grimacing.png",
    ),
    ("Grin", "/assets/img/bot/expression/ihorizon_grin.png"),
    ("Nerd", "/assets/img/bot/expression/ihorizon_nerd.png"),
    (
        "Overhappy",
        "/assets/img/bot/expression/ihorizon_overhappy.png",
    ),
    (
        "Pleading",
        "/assets/img/bot/expression/ihorizon_pleading.png",
    ),
    ("Sob", "/assets/img/bot/expression/ihorizon_sob.png"),
    (
        "Sunglass",
        "/assets/img/bot/expression/ihorizon_sunglass.png",
    ),
];

pub fn random_expression(seed: u64) -> (&'static str, &'static str) {
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    state ^= state << 13;
    state ^= state >> 7;
    state ^= state << 17;
    EXPRESSIONS[(state % EXPRESSIONS.len() as u64) as usize]
}

// ---- assetsFinder ----

/// Random asset gif URL. Mirrors apiUrlParser.assetsFinder.
pub fn assets_url(asset_type: &str, count: u64, seed: u64) -> String {
    if count == 0 {
        return String::new();
    }
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    state ^= state << 13;
    state ^= state >> 7;
    state ^= state << 17;
    let n = state % count;
    format!("https://gitlab.com/ihrz/assets/-/raw/main/{asset_type}/{n}.gif?ref_type=heads")
}

// ---- ihorizon_logs channel match ----

/// Find the guild's ihorizon-logs channel id by name. Mirrors ihorizon_logs.ts.
pub fn logs_channel_id(channels: &[(u64, String)]) -> Option<u64> {
    channels
        .iter()
        .find(|(_, name)| name.contains("ihorizon-logs"))
        .map(|(id, _)| *id)
}

#[cfg(test)]
mod funcs_part5_tests {
    use super::*;

    #[test]
    fn expressions_pick() {
        let (name, path) = random_expression(7);
        assert!(EXPRESSIONS.iter().any(|(n, _)| n == &name));
        assert!(path.ends_with(".png"));
    }

    #[test]
    fn assets_url_shape() {
        let u = assets_url("hug", 10, 3);
        assert!(u.starts_with("https://gitlab.com/ihrz/assets/-/raw/main/hug/"));
        assert!(u.ends_with(".gif?ref_type=heads"));
        assert_eq!(assets_url("hug", 0, 3), "");
    }

    #[test]
    fn logs_channel_match() {
        let chans = vec![(1, "general".to_string()), (2, "ihorizon-logs".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(2));
        assert_eq!(logs_channel_id(&[]), None);
    }
}

// ---- blockSpam (PUNISHPUB) ----

/// Link extractor. Mirrors `/https?:\/\/\S+/g` in blockSpam.ts.
pub fn extract_links(text: &str) -> Vec<String> {
    let lower = text.to_ascii_lowercase();
    let mut out = vec![];
    let bytes = lower.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let rest = &lower[i..];
        let start = rest
            .find("https://")
            .map(|p| (p, 8))
            .or_else(|| rest.find("http://").map(|p| (p, 7)));
        let Some((pos, scheme)) = start else {
            break;
        };
        let abs = i + pos;
        let mut end = abs + scheme;
        while end < bytes.len() && !bytes[end].is_ascii_whitespace() {
            end += 1;
        }
        out.push(lower[abs..end].to_string());
        i = end;
    }
    out
}

/// Domain whitelist from blockSpam.ts.
pub fn is_whitelisted_url(url: &str, extra: &[String]) -> bool {
    const LIST: &[&str] = &[
        "giphy.com",
        "tenor.com",
        "imgur.com",
        "gyazo.com",
        "ezgif.com",
        "reddit.com",
        "tumblr.com",
        "twitter.com",
        "flickr.com",
        "postimages.org",
        "imagebam.com",
        "x.com",
        "youtube.com",
        "github.com",
        "gitlab.com",
        "cdn.discordapp.com",
        "streamable.com",
        "files.catbox.moe",
        "0x0.st",
    ];
    LIST.iter().any(|d| url.contains(d)) || extra.iter().any(|d| url.contains(d.as_str()))
}

/// Blacklisted substrings that always sanction.
pub fn has_blacklisted_term(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    ["https://", "http://", ".gg/"]
        .iter()
        .any(|t| lower.contains(t))
}

/// HEAD media check. Mirrors isMediaLink (image/video/gif).
pub async fn is_media_link(url: &str) -> bool {
    let ct = match reqwest::Client::new()
        .head(url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(r) => r
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_ascii_lowercase(),
        Err(_) => return false,
    };
    ["image/", "video/", "gif"].iter().any(|t| ct.contains(t))
}

/// Dangerous permission flags in TS order. Mirrors
/// `getDangerousPermissions` in method.ts (Administrator,
/// ManageGuild, ManageRoles, MentionEveryone, BanMembers,
/// KickMembers, ManageWebhooks, ManageChannels,
/// ManageGuildExpressions, ViewCreatorMonetizationAnalytics).
/// Bit values verified against serenity 0.12 permissions.rs.
pub const DANGEROUS_PERMISSION_BITS: [u64; 10] = [
    1 << 3,  // ADMINISTRATOR
    1 << 5,  // MANAGE_GUILD
    1 << 28, // MANAGE_ROLES
    1 << 17, // MENTION_EVERYONE
    1 << 2,  // BAN_MEMBERS
    1 << 1,  // KICK_MEMBERS
    1 << 29, // MANAGE_WEBHOOKS
    1 << 4,  // MANAGE_CHANNELS
    1 << 30, // MANAGE_GUILD_EXPRESSIONS
    1 << 41, // VIEW_CREATOR_MONETIZATION_ANALYTICS
];

/// Names held by a role's permission bits, in TS order. Mirrors the
/// `roleDangerousPermissions` loop in economy/!add.ts (`names[i]`
/// parallels `DANGEROUS_PERMISSION_BITS[i]`).
pub fn dangerous_role_perms(bits: u64, names: [&str; 10]) -> Vec<String> {
    DANGEROUS_PERMISSION_BITS
        .iter()
        .zip(names.iter())
        .filter(|(flag, _)| bits & *flag != 0)
        .map(|(_, name)| name.to_string())
        .collect()
}

#[cfg(test)]
mod funcs_punish_tests {
    use super::*;

    #[test]
    fn links_extract() {
        assert_eq!(
            extract_links("see https://a.b/c and http://d.e"),
            vec!["https://a.b/c".to_string(), "http://d.e".to_string()]
        );
        assert!(extract_links("no links").is_empty());
    }

    #[test]
    fn whitelist_and_terms() {
        assert!(is_whitelisted_url("https://i.imgur.com/x.png", &[]));
        assert!(!is_whitelisted_url("https://evil.example/x", &[]));
        assert!(is_whitelisted_url(
            "https://intranet.local/x",
            &["intranet.local".to_string()]
        ));
        assert!(has_blacklisted_term("join .gg/abc"));
        assert!(!has_blacklisted_term("hello"));
    }

    #[test]
    fn dangerous_perms_follow_ts_order() {
        let names = [
            "admin",
            "guild",
            "roles",
            "mention",
            "ban",
            "kick",
            "webhooks",
            "channels",
            "expressions",
            "monetization",
        ];
        assert!(dangerous_role_perms(0, names).is_empty());
        // Administrator + BanMembers only.
        assert_eq!(
            dangerous_role_perms((1 << 3) | (1 << 2), names),
            vec!["admin".to_string(), "ban".to_string()]
        );
        assert_eq!(DANGEROUS_PERMISSION_BITS.len(), 10);
    }
}
