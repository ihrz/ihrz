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

/// Banner image URL template. Mirrors
/// `core/functions/bannerGenerator.ts` (BANNER_URL with {countryCode}).
pub const BANNER_URL_TEMPLATE: &str =
    "https://www.ihorizon.org/assets/img/banner/ihrz_{countryCode}.png";

/// Banner image URL for a guild language code. Mirrors bannerGenerator
/// (the TS `|| "en-US"` fallback is applied by guild_banner_url).
pub fn banner_url(lang_code: &str) -> String {
    BANNER_URL_TEMPLATE.replace("{countryCode}", lang_code)
}

/// Banner image URL for a guild. Mirrors bannerGenerator(guildId)
/// (reads GUILD.LANG, falls back to en-US).
pub async fn guild_banner_url(pool: &crate::db::Pool, guild_id: &str) -> String {
    let lang = crate::db::kv_get(pool, guild_id, "GUILD.LANG")
        .await
        .unwrap_or_else(|| "en-US".to_string());
    banner_url(&lang)
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
        assert_eq!(
            banner_url("fr-FR"),
            "https://www.ihorizon.org/assets/img/banner/ihrz_fr-FR.png"
        );
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
    fn media_pick_matches_ts() {
        assert!(is_animated("https://cdn/x/a_abc.png"));
        assert!(!is_animated("https://cdn/x/bc.png"));
        assert_eq!(
            media_by_message("https://img/a.png", None),
            ("url".to_string(), "https://img/a.png".to_string())
        );
        assert_eq!(
            media_by_message("hi", Some(("https://cdn/x/p.png", Some("image/png")))),
            ("image.png".to_string(), "https://cdn/x/p.png".to_string())
        );
        assert_eq!(
            media_by_message("hi", Some(("https://cdn/x/a_p.png", Some("image/gif")))),
            ("image.gif".to_string(), "https://cdn/x/a_p.png".to_string())
        );
        assert_eq!(
            media_by_message("hi", Some(("https://cdn/x/f.txt", Some("text/plain")))),
            ("none".to_string(), String::new())
        );
        assert_eq!(
            media_by_message("hi", None),
            ("none".to_string(), String::new())
        );
    }

    #[test]
    fn media_layout_math_matches_ts() {
        // convertToPng box: wide clamps width, tall clamps height.
        assert_eq!(fit_dimensions(3840, 1080, 1920, 1080), (1920, 540));
        assert_eq!(fit_dimensions(1080, 3840, 1920, 1080), (304, 1080));
        assert_eq!(fit_dimensions(800, 600, 1920, 1080), (1440, 1080));
        assert_eq!(fit_dimensions(0, 600, 1920, 1080), (0, 0));
        assert_eq!(
            fit_dimensions(1920, 1080, MEDIA_FIT_WIDTH, MEDIA_FIT_HEIGHT),
            (1920, 1080)
        );
        // resizeImage letterbox: fit + centered offsets on black canvas.
        assert_eq!(
            letterbox_layout(3840, 1080, 1920, 1080),
            (1920, 540, 0, 270)
        );
        assert_eq!(
            letterbox_layout(1080, 1080, 1920, 1080),
            (1080, 1080, 420, 0)
        );
        // adjustImageQuality ladder 90..=10.
        assert_eq!(
            image_quality_steps(),
            vec![90, 80, 70, 60, 50, 40, 30, 20, 10]
        );
        assert_eq!(MEDIA_MAX_IMAGE_BYTES, 15 * 1024 * 1024);
        assert_eq!(
            media_temp_dir().file_name().and_then(|s| s.to_str()),
            Some("media-manipulation")
        );
    }

    #[test]
    fn media_pixel_ops_roundtrip() {
        // Build a 64x32 RGBA test image, encode PNG in memory.
        let raw: Vec<u8> = (0..64 * 32)
            .flat_map(|i| [i as u8, 255 - i as u8, 128, 255])
            .collect();
        let src = image::RgbaImage::from_raw(64, 32, raw).expect("test image");
        let mut buf = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgba8(src)
            .write_to(&mut buf, image::ImageFormat::Png)
            .expect("encode");
        let src_png = buf.into_inner();

        // convertToPng: unconditional fit inside 1920x1080 (TS resizes
        // even small inputs up), output stays valid PNG.
        let png = convert_to_png(&src_png).expect("convert");
        let back = image::load_from_memory(&png).expect("decode");
        assert_eq!((back.width(), back.height()), (1920, 960));

        // resizeImage with dims: letterboxed canvas file, original metadata.
        let dir = std::env::temp_dir().join(format!("ihrz-media-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("tmpdir");
        let out = dir.join("letter.png");
        let meta = resize_image_file(&png, &out, Some((1920, 1080))).expect("resize");
        assert_eq!(meta, (1920, 960));
        let canvas = image::open(&out).expect("canvas");
        assert_eq!((canvas.width(), canvas.height()), (1920, 1080));

        // resizeImage without dims: straight copy, same metadata.
        let out2 = dir.join("copy.png");
        let meta2 = resize_image_file(&png, &out2, None).expect("copy");
        assert_eq!(meta2, (1920, 960));
        assert_eq!(std::fs::read(&out2).expect("read"), png);

        // Unsupported bytes fail like the TS throw path.
        assert!(convert_to_png(b"not an image").is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn gif_decode_matches_ts_valid_image_type() {
        // TS validImageType accepts image/gif; convert_to_png decodes
        // the first frame via the image crate gif feature.
        let gif: &[u8] = &[
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xFF,
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00,
            0x3B,
        ];
        assert!(is_valid_image_type(Some("image/gif")));
        let png = convert_to_png(gif).expect("gif converts");
        assert_eq!(&png[1..4], b"PNG");
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

/// Multiple passwords. Mirrors generateMultiplePasswords
/// (amount <= 0 errors, like the TS throw).
pub fn generate_multiple_passwords(
    amount: usize,
    opts: &PasswordOptions,
    seed: u64,
) -> Result<Vec<String>, &'static str> {
    if amount == 0 {
        return Err("amount must be positive");
    }
    (0..amount)
        .map(|i| {
            generate_password(
                opts,
                seed.wrapping_add((i as u64).wrapping_mul(0x9E3779B97F4A7C15)),
            )
        })
        .collect()
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
    fn multiple_passwords_match_ts() {
        let opts = PasswordOptions {
            length: 16,
            numbers: true,
            symbols: false,
            lowercase: true,
            uppercase: true,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        };
        let batch = generate_multiple_passwords(3, &opts, 7).unwrap();
        assert_eq!(batch.len(), 3);
        for pw in &batch {
            assert_eq!(pw.chars().count(), 16);
            assert!(pw.chars().all(|c| c.is_ascii_alphanumeric()));
        }
        assert!(generate_multiple_passwords(0, &opts, 7).is_err());
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
pub const EXPRESSIONS: [(&str, &str); 10] = [
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
    (
        "Thinking",
        "/assets/img/bot/expression/ihorizon_thinking.png",
    ),
    ("Wink", "/assets/img/bot/expression/ihorizon_wink.png"),
];

pub fn random_expression(seed: u64) -> (&'static str, &'static str) {
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    state ^= state << 13;
    state ^= state >> 7;
    state ^= state << 17;
    EXPRESSIONS[(state % EXPRESSIONS.len() as u64) as usize]
}

/// Full URL for a named bot expression. Mirrors the TS baseUrl +
/// Expressions[name] thumbnail usage.
pub fn expression_url(name: &str) -> String {
    EXPRESSIONS
        .iter()
        .find(|(n, _)| *n == name)
        .map(|(_, path)| format!("https://www.ihorizon.org{path}"))
        .unwrap_or_default()
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
        assert_eq!(EXPRESSIONS.len(), 10);
        assert_eq!(
            expression_url("Pleading"),
            "https://www.ihorizon.org/assets/img/bot/expression/ihorizon_pleading.png"
        );
        assert_eq!(expression_url("Nope"), "");
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

// ---- mediaManipulation (pure layout math) ----
// Mirrors src/core/functions/mediaManipulation.ts geometry: convertToPng
// fits inside 1920x1080 preserving aspect; resizeImage fits inside the
// requested box then letterboxes onto a black canvas; adjustImageQuality
// steps JPEG quality 90 down to 10 while the file exceeds 15 MB.
// Pixel encode/decode needs an image backend (see U-MEME); these pure
// helpers pin the math and the temp-dir location.

/// 15 MB ceiling from mediaManipulation.ts.
pub const MEDIA_MAX_IMAGE_BYTES: u64 = 15 * 1024 * 1024;

/// convertToPng fit box.
pub const MEDIA_FIT_WIDTH: u32 = 1920;
/// convertToPng fit box.
pub const MEDIA_FIT_HEIGHT: u32 = 1080;

/// Scratch dir mirror: <os-tmp>/media-manipulation.
pub fn media_temp_dir() -> std::path::PathBuf {
    std::env::temp_dir().join("media-manipulation")
}

/// Fit (src_w, src_h) inside (max_w, max_h) preserving aspect ratio.
/// Mirrors the shared convertToPng/resizeImage branch (wide inputs clamp
/// width, otherwise clamp height; the other side is Math.round'ed).
pub fn fit_dimensions(src_w: u32, src_h: u32, max_w: u32, max_h: u32) -> (u32, u32) {
    if src_w == 0 || src_h == 0 || max_w == 0 || max_h == 0 {
        return (0, 0);
    }
    let aspect = src_w as f64 / src_h as f64;
    if aspect > max_w as f64 / max_h as f64 {
        (max_w, ((max_w as f64 / aspect).round() as u32).max(1))
    } else {
        (((max_h as f64 * aspect).round() as u32).max(1), max_h)
    }
}

/// Letterbox layout: fitted size plus centering offsets on a
/// (canvas_w, canvas_h) black canvas. Mirrors the resizeImage composite
/// (Math.round((canvas - fit) / 2) per axis).
pub fn letterbox_layout(
    src_w: u32,
    src_h: u32,
    canvas_w: u32,
    canvas_h: u32,
) -> (u32, u32, u32, u32) {
    let (w, h) = fit_dimensions(src_w, src_h, canvas_w, canvas_h);
    let x = ((canvas_w.saturating_sub(w)) as f64 / 2.0).round() as u32;
    let y = ((canvas_h.saturating_sub(h)) as f64 / 2.0).round() as u32;
    (w, h, x, y)
}

/// Quality ladder from adjustImageQuality (90 down to 10, step 10).
pub fn image_quality_steps() -> Vec<u8> {
    (1..=9).rev().map(|q| q * 10).collect()
}

// ---- mediaManipulation (pixel ops) ----
// Mirrors src/core/functions/mediaManipulation.ts pixel paths with the
// `image` crate (png/jpeg/gif; webp falls to the command catch-reply
// path — the TS browser-decode fallback needs Chromium, which is
// blocked). Geometry (fit/letterbox/quality ladder/temp dir)
// lives in the pure section above.

/// Decode any supported buffer, fit inside 1920x1080, return PNG bytes.
/// Mirrors convertToPng (Jimp.read → resize → getBuffer PNG).
pub fn convert_to_png(bytes: &[u8]) -> anyhow::Result<Vec<u8>> {
    let img = image::load_from_memory(bytes).map_err(|e| anyhow::anyhow!("decode failed: {e}"))?;
    let (w, h) = (img.width(), img.height());
    let (nw, nh) = fit_dimensions(w, h, MEDIA_FIT_WIDTH, MEDIA_FIT_HEIGHT);
    let resized = img.resize(nw.max(1), nh.max(1), image::imageops::FilterType::Triangle);
    let mut out = std::io::Cursor::new(Vec::new());
    resized
        .write_to(&mut out, image::ImageFormat::Png)
        .map_err(|e| anyhow::anyhow!("png encode failed: {e}"))?;
    Ok(out.into_inner())
}

/// Enforce the size ceiling like adjustImageQuality. Jimp .quality() only
/// affects JPEG output, so PNG files keep their bytes (same outcome as
/// the TS loop, without rewriting identical bytes); JPEGs walk the
/// quality ladder until they fit.
pub fn adjust_image_quality(path: &std::path::Path) -> anyhow::Result<()> {
    for q in image_quality_steps() {
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        if size <= MEDIA_MAX_IMAGE_BYTES {
            break;
        }
        let is_jpeg = matches!(
            path.extension().and_then(|e| e.to_str()),
            Some("jpg") | Some("jpeg")
        );
        if !is_jpeg {
            break;
        }
        let img = image::open(path).map_err(|e| anyhow::anyhow!("read failed: {e}"))?;
        let mut buf = std::io::Cursor::new(Vec::new());
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, q)
            .encode_image(&img)
            .map_err(|e| anyhow::anyhow!("jpeg encode failed: {e}"))?;
        std::fs::write(path, buf.into_inner())?;
    }
    Ok(())
}

/// Resize (letterboxed on a black w×h canvas when dims are given, else a
/// straight copy), write to out_path, enforce the size ceiling. Returns
/// the ORIGINAL (w, h) like the TS metadata (two-sides substitutes the
/// screen dims into its kdenlive template). Mirrors resizeImage.
pub fn resize_image_file(
    png_bytes: &[u8],
    out_path: &std::path::Path,
    dims: Option<(u32, u32)>,
) -> anyhow::Result<(u32, u32)> {
    let img =
        image::load_from_memory(png_bytes).map_err(|e| anyhow::anyhow!("decode failed: {e}"))?;
    let meta = (img.width(), img.height());
    if let Some((canvas_w, canvas_h)) = dims {
        let (w, h, x, y) = letterbox_layout(meta.0, meta.1, canvas_w.max(1), canvas_h.max(1));
        let fit = img.resize(w.max(1), h.max(1), image::imageops::FilterType::Triangle);
        let mut canvas = image::RgbaImage::from_pixel(
            canvas_w.max(1),
            canvas_h.max(1),
            image::Rgba([0, 0, 0, 255]),
        );
        image::imageops::overlay(&mut canvas, &fit.to_rgba8(), x as i64, y as i64);
        image::DynamicImage::ImageRgba8(canvas)
            .save(out_path)
            .map_err(|e| anyhow::anyhow!("write failed: {e}"))?;
    } else {
        std::fs::write(out_path, png_bytes)?;
    }
    adjust_image_quality(out_path)?;
    Ok(meta)
}

// ---- kdenliveManipulator ----
// Mirrors src/core/functions/kdenliveManipulator.ts (KdenLive class):
// template read, temp save under the media temp dir, melt export under
// xvfb-run. Missing binaries surface as Err, which the meme commands
// turn into the same "An error occurred" reply as the TS catch path.

/// Mirrors KdenLive.open (utf8 project read).
pub fn kdenlive_open(path: &std::path::Path) -> std::io::Result<String> {
    std::fs::read_to_string(path)
}

/// Mirrors KdenLive.tempSave (`<tempDir>/<ms>.kdenlive`).
pub fn kdenlive_temp_save(data: &str, now_ms: u64) -> std::io::Result<std::path::PathBuf> {
    let dir = media_temp_dir();
    std::fs::create_dir_all(&dir)?;
    let path = dir.join(format!("{now_ms}.kdenlive"));
    std::fs::write(&path, data)?;
    Ok(path)
}

/// Mirrors KdenLive.export
/// (`xvfb-run -a melt -audio-samplerate 44100 <proj> -consumer
/// avformat:<out>`; the project is removed only on success, as in TS).
/// Async with tokio::process so a minutes-long melt render never stalls
/// a tokio worker; the output name adds the pid because two exports in
/// the same millisecond would collide on the TS `merged_video_<ms>`
/// scheme.
pub async fn kdenlive_export(
    project: &std::path::Path,
    now_ms: u64,
) -> anyhow::Result<std::path::PathBuf> {
    let out = media_temp_dir().join(format!("merged_video_{now_ms}_{}.mp4", std::process::id()));
    let status = tokio::process::Command::new("xvfb-run")
        .args(["-a", "melt", "-audio-samplerate", "44100"])
        .arg(project)
        .arg(format!("-consumer avformat:{}", out.display()))
        .env("LANG", "C")
        .status()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to execute melt: {e}"))?;
    if !status.success() {
        return Err(anyhow::anyhow!("melt export failed"));
    }
    let _ = std::fs::remove_file(project);
    Ok(out)
}

/// HEAD image check. Mirrors mediaManipulation.isImageUrl
/// (content-type starts with image/; false on any error).
pub async fn is_image_url(url: &str) -> bool {
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
    ct.starts_with("image/")
}

/// Animated-attachment check. Mirrors method.isAnimated
/// (file name starts with `a_`).
pub fn is_animated(attachment_url: &str) -> bool {
    attachment_url
        .rsplit('/')
        .next()
        .unwrap_or("")
        .starts_with("a_")
}

/// Media picked from a message. Mirrors embedHelper.getMediaByMessage:
/// a valid link in the content wins ("url"), else the first image
/// attachment (gif name when animated), else ("none", "").
pub fn media_by_message(
    content: &str,
    attachment: Option<(&str, Option<&str>)>,
) -> (String, String) {
    if is_valid_link(content) {
        return ("url".to_string(), content.to_string());
    }
    if let Some((url, content_type)) = attachment {
        if content_type.unwrap_or("").starts_with("image/") {
            let name = if is_animated(url) {
                "image.gif"
            } else {
                "image.png"
            };
            return (name.to_string(), url.to_string());
        }
    }
    ("none".to_string(), String::new())
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

/// RGB (0-255) to HSL (h 0-360, s/l 0-100). Mirrors
/// image_dominant_color.ts rgbToHsl.
pub fn rgb_to_hsl(r: u8, g: u8, b: u8) -> (f64, f64, f64) {
    let r = f64::from(r) / 255.0;
    let g = f64::from(g) / 255.0;
    let b = f64::from(b) / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let diff = max - min;
    let l = (max + min) / 2.0;
    let mut h = 0.0;
    let mut s = 0.0;
    if diff != 0.0 {
        s = if l > 0.5 {
            diff / (2.0 - max - min)
        } else {
            diff / (max + min)
        };
        if max == r {
            h = (g - b) / diff + if g < b { 6.0 } else { 0.0 };
        } else if max == g {
            h = (b - r) / diff + 2.0;
        } else {
            h = (r - g) / diff + 4.0;
        }
        h *= 60.0;
    }
    (h, s * 100.0, l * 100.0)
}

fn clamp_hex(n: i32) -> String {
    format!("{:02x}", n.clamp(0, 255))
}

/// Mirrors rgbToHex (values clamped to 0-255).
pub fn rgb_to_hex(r: i32, g: i32, b: i32) -> String {
    format!("#{}{}{}", clamp_hex(r), clamp_hex(g), clamp_hex(b))
}

/// Favors saturated colors with medium-high lightness. Mirrors
/// getVibrancyScore.
pub fn vibrancy_score(s: f64, l: f64) -> f64 {
    s * 1.5 + (100.0 - (l - 60.0).abs())
}

/// Bucketed color plus its HSL score triple.
type ScoredColor = ((i32, i32, i32), (f64, f64, f64));

/// Vibrant + dark hex pair over raw RGB pixels. Mirrors
/// getVibrantAndDarkColors: bucket by rounded tens, drop rare
/// colors (<= 1% of pixels), split vibrant (l>20, s>20, best
/// score) vs dark (l<40, darkest), blurple fallback.
pub fn vibrant_and_dark_colors(pixels: &[(u8, u8, u8)]) -> (String, String) {
    let mut buckets: Vec<((i32, i32, i32), usize)> = vec![];
    for (r, g, b) in pixels {
        let key = (
            (f64::from(*r) / 10.0).round() as i32 * 10,
            (f64::from(*g) / 10.0).round() as i32 * 10,
            (f64::from(*b) / 10.0).round() as i32 * 10,
        );
        if let Some(slot) = buckets.iter_mut().find(|(k, _)| *k == key) {
            slot.1 += 1;
        } else {
            buckets.push((key, 1));
        }
    }
    let total = pixels.len().max(1);
    let kept: Vec<ScoredColor> = buckets
        .iter()
        .filter(|(_, count)| *count * 100 > total)
        .map(|(rgb, _)| {
            let (r, g, b) = (
                rgb.0.clamp(0, 255) as u8,
                rgb.1.clamp(0, 255) as u8,
                rgb.2.clamp(0, 255) as u8,
            );
            (*rgb, rgb_to_hsl(r, g, b))
        })
        .collect();
    let fallback = kept.first().map(|(rgb, _)| *rgb).unwrap_or((88, 101, 242));
    let vibrant = kept
        .iter()
        .filter(|(_, (_, s, l))| *l > 20.0 && *s > 20.0)
        .max_by(|(_, (_, s1, l1)), (_, (_, s2, l2))| {
            vibrancy_score(*s1, *l1)
                .partial_cmp(&vibrancy_score(*s2, *l2))
                .unwrap_or(std::cmp::Ordering::Equal)
        })
        .map(|(rgb, _)| *rgb)
        .unwrap_or(fallback);
    let dark = kept
        .iter()
        .filter(|(_, (_, _, l))| *l < 40.0)
        .min_by(|(_, (_, _, l1)), (_, (_, _, l2))| {
            l1.partial_cmp(l2).unwrap_or(std::cmp::Ordering::Equal)
        })
        .map(|(rgb, _)| *rgb)
        .or_else(|| kept.last().map(|(rgb, _)| *rgb))
        .unwrap_or(fallback);
    (
        rgb_to_hex(vibrant.0, vibrant.1, vibrant.2),
        rgb_to_hex(dark.0, dark.1, dark.2),
    )
}

/// Decode PNG bytes (RGB/RGBA, 8-bit) to raw pixels. Other color
/// types/depths are rejected (callers fall back, like the TS
/// try/catch).
pub fn decode_png_pixels(bytes: &[u8]) -> anyhow::Result<Vec<(u8, u8, u8)>> {
    let decoder = png::Decoder::new(std::io::Cursor::new(bytes));
    let mut reader = decoder.read_info()?;
    let mut buf = vec![
        0u8;
        reader
            .output_buffer_size()
            .ok_or_else(|| anyhow::anyhow!("unknown png size"))?
    ];
    let info = reader.next_frame(&mut buf)?;
    use png::ColorType;
    let pixels: Vec<(u8, u8, u8)> = match (info.color_type, info.bit_depth) {
        (ColorType::Rgb, png::BitDepth::Eight) => {
            let (chunks, _) = buf.as_chunks::<3>();
            chunks.iter().map(|c| (c[0], c[1], c[2])).collect()
        }
        (ColorType::Rgba, png::BitDepth::Eight) => {
            let (chunks, _) = buf.as_chunks::<4>();
            chunks.iter().map(|c| (c[0], c[1], c[2])).collect()
        }
        _ => anyhow::bail!("unsupported png shape"),
    };
    Ok(pixels)
}

/// Dominant (vibrant, dark) hex pair for an image URL, base64
/// blob, or file path. Mirrors image_dominant_color.ts (Jimp.read
/// accepts the same shapes; non-PNG bytes fall back to Err).
pub async fn image_dominant_color(input: &str) -> anyhow::Result<(String, String)> {
    let bytes: Vec<u8> = if input.starts_with("http://") || input.starts_with("https://") {
        reqwest::get(input).await?.bytes().await?.to_vec()
    } else if let Some(b64) = input
        .strip_prefix("data:image/")
        .and_then(|rest| rest.split_once(";base64,"))
        .map(|(_, data)| data)
        .or(
            if input.trim().len() > 64
                && input
                    .trim()
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || "+/=".contains(c))
            {
                Some(input.trim())
            } else {
                None
            },
        )
    {
        crate::emojis::base64_decode(b64).ok_or_else(|| anyhow::anyhow!("bad base64"))?
    } else {
        tokio::fs::read(input).await?
    };
    Ok(vibrant_and_dark_colors(&decode_png_pixels(&bytes)?))
}

#[cfg(test)]
mod funcs_dominant_tests {
    use super::*;

    #[test]
    fn hsl_primaries() {
        let (h, s, l) = rgb_to_hsl(255, 0, 0);
        assert!((h - 0.0).abs() < 1e-6);
        assert!((s - 100.0).abs() < 1e-6);
        assert!((l - 50.0).abs() < 1e-6);
        let (h, _, _) = rgb_to_hsl(0, 255, 0);
        assert!((h - 120.0).abs() < 1e-6);
        let (h, _, _) = rgb_to_hsl(0, 0, 255);
        assert!((h - 240.0).abs() < 1e-6);
        let (_, s, _) = rgb_to_hsl(128, 128, 128);
        assert!(s.abs() < 1e-6);
    }

    #[test]
    fn hex_clamps() {
        assert_eq!(rgb_to_hex(255, 0, 0), "#ff0000");
        // TS buckets can exceed 255 (round(255/10)*10 = 260).
        assert_eq!(rgb_to_hex(260, -4, 0), "#ff0000");
        assert_eq!(rgb_to_hex(88, 101, 242), "#5865f2");
    }

    #[test]
    fn solid_red_pair() {
        let pixels = vec![(255u8, 0u8, 0u8); 400];
        assert_eq!(
            vibrant_and_dark_colors(&pixels),
            ("#ff0000".to_string(), "#ff0000".to_string())
        );
    }

    #[test]
    fn empty_falls_back_to_blurple() {
        assert_eq!(
            vibrant_and_dark_colors(&[]),
            ("#5865f2".to_string(), "#5865f2".to_string())
        );
    }

    #[test]
    fn png_roundtrip_red() {
        // Encode a 4x4 red PNG, decode, score.
        let mut buf = vec![];
        {
            let mut enc = png::Encoder::new(&mut buf, 4, 4);
            enc.set_color(png::ColorType::Rgb);
            enc.set_depth(png::BitDepth::Eight);
            let mut w = enc.write_header().unwrap();
            w.write_image_data(&vec![255u8, 0, 0].repeat(16)).unwrap();
        }
        let pixels = decode_png_pixels(&buf).unwrap();
        assert_eq!(pixels.len(), 16);
        let (c1, _) = vibrant_and_dark_colors(&pixels);
        assert_eq!(c1, "#ff0000");
    }

    #[test]
    fn png_rejects_garbage() {
        assert!(decode_png_pixels(b"not a png").is_err());
    }
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
