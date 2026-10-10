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
/// KEPT LENIENT (H6): TS removes only the first `" "` while this strips
/// all whitespace — a strict superset that parses every TS-accepted input
/// identically.
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

/// Compact duration label. Mirrors to_beautiful_string short form with a
/// null lang (unit letters y/mo/w/d/h/m/s, "0s" fallback).
/// NOTE: TS call sites always pass the guild lang, so the en-US result is
/// e.g. "1hour(s)"; see [`beautiful_ms_in`] for the lang-aware form.
/// Callers that cannot resolve a guild lang (cooldown, slowmode) use this
/// null-lang shorthand intentionally.
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

/// Short-unit suffix lookup for [`beautiful_ms_in`]: `var_*` YAML value
/// with the null-lang unit letter as fallback (mirrors
/// `lang ? lang.var_x : "y"` in ms.ts).
fn var_short(lang_code: &str, key: &str, fallback: &str) -> String {
    crate::lang::get(lang_code, key).unwrap_or_else(|| fallback.to_string())
}

/// Lang-aware duration label. Mirrors to_beautiful_string exactly:
/// suffixes come from the `var_year/var_mo/var_w/var_d/var_h/var_m/var_s`
/// YAML keys, short parts are glued (`1m30s`-style), long parts are
/// space-separated English (`1 minute 30 seconds`), the `ms` unit is
/// included, and empty output falls back to `"0" + var_m`.
/// Default (en-US) quirk, kept verbatim: `beautiful_ms_in(3_600_000.0,
/// "en-US", false)` is `"1hour(s)"`, and the zero fallback is
/// `"0minute(s)"`.
/// Non-finite input is pinned to the zero fallback here; TS would render
/// `Infinityyear(s)...` via Math.floor(Infinity) — a divergence kept
/// intentionally (see test `beautiful_infinity_pinned`).
/// Negative and NaN inputs fall through to the fallback exactly like TS
/// (every `milliseconds >= factor` comparison is false).
pub fn beautiful_ms_in(ms: f64, lang_code: &str, long: bool) -> String {
    let var_m = var_short(lang_code, "var_m", "m");
    if !ms.is_finite() || ms < 0.0 {
        return format!("0{var_m}");
    }
    let shorts = [
        var_short(lang_code, "var_year", "y"),
        var_short(lang_code, "var_mo", "mo"),
        var_short(lang_code, "var_w", "w"),
        var_short(lang_code, "var_d", "d"),
        var_short(lang_code, "var_h", "h"),
        var_short(lang_code, "var_m", "m"),
        var_short(lang_code, "var_s", "s"),
    ];
    // (factor, English long name); ms handled inline like the TS tail entry.
    let factors = [
        (31_557_600_000.0, "year"),
        (2_592_000_000.0, "month"),
        (604_800_000.0, "week"),
        (86_400_000.0, "day"),
        (3_600_000.0, "hour"),
        (60_000.0, "minute"),
        (1_000.0, "second"),
    ];
    let mut rest = ms;
    let mut result = String::new();
    for ((factor, long_name), short) in factors.iter().zip(shorts.iter()) {
        if rest >= *factor {
            let value = (rest / factor).floor();
            if long {
                let plural = if value > 1.0 { "s" } else { "" };
                result.push_str(&format!("{value} {long_name}{plural}"));
            } else {
                result.push_str(&format!("{value}{short}"));
            }
            rest %= factor;
            if rest > 0.0 {
                if long {
                    result.push(' ');
                }
            } else {
                break;
            }
        }
    }
    if (1.0..1_000.0).contains(&rest) && !long {
        // Leftover below one second: the TS `ms` tail entry
        // (factor 1, short "ms", never localized).
        result.push_str(&format!("{}ms", rest.floor()));
    } else if (1.0..1_000.0).contains(&rest) {
        let value = rest.floor();
        let plural = if value > 1.0 { "s" } else { "" };
        result.push_str(&format!("{value} millisecond{plural}"));
    }
    if result.is_empty() {
        format!("0{var_m}")
    } else {
        result.trim().to_string()
    }
}

/// Long-form duration label with English unit names. Mirrors
/// to_beautiful_string with `{ long: true }` (long names are hardcoded
/// English in TS, independent of lang).
pub fn beautiful_ms_long(ms: f64) -> String {
    beautiful_ms_in(ms, "en-US", true)
}

/// String-input duration label. Mirrors the
/// `typeof timeStringOrMs === "string"` branch (runs [`time_ms`] first,
/// then formats like [`beautiful_ms_in`]).
pub fn beautiful_str(input: &str, lang_code: &str, long: bool) -> String {
    beautiful_ms_in(time_ms(input), lang_code, long)
}

/// Number beautifier. Mirrors numberBeautifuer.ts (K/M/B/T, 1 decimal).
/// Non-finite inputs mirror the TS arithmetic exactly: NaN matches no
/// threshold and renders `"NaN"` (via `NaN.toLocaleString()`), while
/// ±Infinity takes the T branch (`(Infinity).toFixed(1)` is `"Infinity"`).
pub fn format_number(num: f64) -> String {
    if num.is_nan() {
        return "NaN".to_string();
    }
    if num.is_infinite() {
        return if num > 0.0 {
            "InfinityT".to_string()
        } else {
            "-InfinityT".to_string()
        };
    }
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

/// Batch outcome. Mirrors BatchProcessorResult ({success, failed}).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct BatchProcessorResult {
    pub success: usize,
    pub failed: usize,
}

/// Counted batch runner. Mirrors processBatch exactly: chunked loop
/// over `batchSize` (default 10), per-item try/catch (a processor
/// failure counts as failed, never aborts the run), `onProgress`
/// after each batch with (completed, total), and `delay` ms between
/// batches (skipped after the last one; 0 disables the sleep so
/// offline tests stay instant).
pub async fn process_batch_full<T, F, Fut, P>(
    items: &[T],
    batch_size: usize,
    delay_ms: u64,
    mut on_progress: Option<P>,
    mut processor: F,
) -> BatchProcessorResult
where
    T: Clone,
    F: FnMut(T) -> Fut,
    Fut: std::future::Future<Output = bool>,
    P: FnMut(usize, usize),
{
    let size = batch_size.max(1);
    let total = items.len();
    let mut result = BatchProcessorResult::default();
    let batch_count = total.div_ceil(size);
    for (index, chunk) in items.chunks(size).enumerate() {
        // Own the batch before awaiting so no slice borrow is held
        // across the processor await (keeps spawned futures Send).
        for item in chunk.iter().cloned() {
            if processor(item).await {
                result.success += 1;
            } else {
                result.failed += 1;
            }
        }
        if let Some(ref mut progress) = on_progress {
            progress(result.success + result.failed, total);
        }
        if delay_ms > 0 && index + 1 < batch_count {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        }
    }
    result
}

/// Background batch runner. Mirrors processBatchAsync (setImmediate +
/// onComplete): the work runs on a spawned task and the callback
/// fires with the final counts. Returns the join handle.
pub fn process_batch_async<T, F, Fut, C>(
    items: Vec<T>,
    batch_size: usize,
    delay_ms: u64,
    processor: F,
    on_complete: Option<C>,
) -> tokio::task::JoinHandle<BatchProcessorResult>
where
    T: Clone + Send + Sync + 'static,
    F: FnMut(T) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = bool> + Send + 'static,
    C: FnOnce(BatchProcessorResult) + Send + 'static,
{
    tokio::spawn(async move {
        let result = process_batch_full(
            &items,
            batch_size,
            delay_ms,
            None::<fn(usize, usize)>,
            processor,
        )
        .await;
        if let Some(done) = on_complete {
            done(result);
        }
        result
    })
}

/// Remote asset length table. Mirrors the length.json fetch in
/// assetsCalc.ts (TS `Assets`: string keys to counts).
pub const ASSETS_LENGTHS_URL: &str =
    "https://gitlab.com/ihrz/assets/-/raw/main/length.json?ref_type=heads";

/// Parse the length.json body into per-type gif counts. None when the
/// body is not a JSON object (mirrors the TS JSON.parse, minus the
/// throw: unusable bodies stay unusable). Non-integer values are
/// skipped like unknown keys.
pub fn parse_assets_lengths(raw: &str) -> Option<std::collections::HashMap<String, u64>> {
    // TS assetsCalc hands a bare `"kiss":30,...}` fragment (length.json
    // body without the opening brace); accept both fragment and full
    // object shapes.
    let shaped = raw.trim();
    let shaped = if shaped.starts_with('{') {
        shaped.to_string()
    } else {
        format!("{{{shaped}")
    };
    let value: serde_json::Value = serde_json::from_str(&shaped).ok()?;
    let table = value.as_object()?;
    let mut out = std::collections::HashMap::with_capacity(table.len());
    for (key, count) in table {
        if let Some(n) = count.as_u64() {
            out.insert(key.clone(), n);
        }
    }
    Some(out)
}

/// Gif count for one asset type. Mirrors the `assets[type]` read the
/// TS callers do after assetsCalc fills `client.assets`.
pub fn assets_length(
    table: &std::collections::HashMap<String, u64>,
    asset_type: &str,
) -> Option<u64> {
    table.get(asset_type).copied()
}
/// Shard id for a guild. Mirrors client.inShard
/// (`(guildId >> 22n) % totalShards`).
pub fn guild_shard(guild_id: u64, total_shards: u64) -> u64 {
    if total_shards == 0 {
        return 0;
    }
    (guild_id >> 22) % total_shards
}

/// True when `guild_id` is served by `shard_id`. Mirrors client.inShard
/// (`guildShard === shardId`; the TS try/catch falls back to `shardId`
/// on unparsable ids, i.e. true — see `in_shard_str`).
pub fn in_shard(guild_id: u64, shard_id: u64, total_shards: u64) -> bool {
    guild_shard(guild_id, total_shards) == shard_id
}

/// String-guild-id variant. Mirrors client.inShard exactly: an
/// unparsable id falls back to the local shard, so this returns true.
pub fn in_shard_str(guild_id: &str, shard_id: u64, total_shards: u64) -> bool {
    match guild_id.parse::<u64>() {
        Ok(id) => in_shard(id, shard_id, total_shards),
        Err(_) => true,
    }
}

/// True only for shard 0. Mirrors client.isMainShard
/// (`(client.shard?.ids[0] ?? 0) === 0`): gates the release-notifier
/// path (checkAndNotifyRelease) so only the main shard announces.
pub fn is_main_shard(shard_id: u64) -> bool {
    shard_id == 0
}

/// Guilds per shard used for gateway tuning. Mirrors
/// `GUILDS_PER_SHARD = 700` in src/index.ts.
pub const GUILDS_PER_SHARD: u64 = 700;

/// Discord's baseline guilds per shard. Mirrors the `1000` in
/// `Math.ceil(1000 / GUILDS_PER_SHARD)` in src/index.ts.
pub const DISCORD_BASELINE_PER_SHARD: u64 = 1000;

/// Tuning multiplier. Mirrors
/// `Math.ceil(1000 / GUILDS_PER_SHARD)` (= 2) in src/index.ts.
pub fn shard_multiplier() -> u64 {
    DISCORD_BASELINE_PER_SHARD.div_ceil(GUILDS_PER_SHARD)
}

/// Gateway-tuned shard count. Mirrors
/// `Math.max(discordRecommended, discordRecommended * shardMultiplier)`
/// in src/index.ts.
pub fn tuned_shard_count(recommended: u32) -> u32 {
    let tuned = recommended.saturating_mul(shard_multiplier() as u32);
    recommended.max(tuned)
}

/// Resolve the shard count to start. TOTAL_SHARDS override wins (same
/// priority as TS); otherwise the gateway-tuned recommendation; None
/// keeps the current autoshard behavior (offline fallback).
pub fn resolve_shard_count(
    recommended: Option<u32>,
    total_shards_override: Option<u32>,
) -> Option<u32> {
    if let Some(n) = total_shards_override.filter(|n| *n > 0) {
        return Some(n);
    }
    recommended.map(tuned_shard_count)
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
    fn beautiful_lang_aware_en_us_quirk() {
        // en-US var_* values carry the "(s)" quirk verbatim (H1).
        assert_eq!(beautiful_ms_in(3_600_000.0, "en-US", false), "1hour(s)");
        assert_eq!(
            beautiful_ms_in(90_000.0, "en-US", false),
            "1minute(s)30second(s)"
        );
        assert_eq!(beautiful_ms_in(500.0, "en-US", false), "500ms");
        assert_eq!(beautiful_ms_in(0.0, "en-US", false), "0minute(s)");
        assert_eq!(beautiful_ms_in(-5.0, "en-US", false), "0minute(s)");
        assert_eq!(beautiful_ms_in(f64::NAN, "en-US", false), "0minute(s)");
        // Unknown code falls back to the en-US table (H20 forgiving path).
        assert_eq!(beautiful_ms_in(3_600_000.0, "xx-XX", false), "1hour(s)");
    }

    #[test]
    fn beautiful_long_english_names() {
        // Long names are hardcoded English, independent of lang (H2).
        assert_eq!(beautiful_ms_long(3_600_000.0), "1 hour");
        assert_eq!(beautiful_ms_long(90_000.0), "1 minute 30 seconds");
        assert_eq!(beautiful_ms_long(500.0), "500 milliseconds");
        assert_eq!(beautiful_ms_in(0.0, "fr-FR", true), "0minute(s)");
    }

    #[test]
    fn beautiful_str_parses_first() {
        // String input runs time_ms first (H5).
        assert_eq!(
            beautiful_str("1h30m", "en-US", false),
            "1hour(s)30minute(s)"
        );
        assert_eq!(beautiful_str("1h30m", "en-US", true), "1 hour 30 minutes");
    }

    #[test]
    fn beautiful_infinity_pinned() {
        // TS would print "Infinityyear(s)..."; pinned to the fallback (H4).
        assert_eq!(beautiful_ms_in(f64::INFINITY, "en-US", false), "0minute(s)");
        assert_eq!(beautiful_ms(f64::INFINITY), "0s");
    }

    #[test]
    fn gateway_tuned_shard_count() {
        // Mirrors getOptimalShardCount in src/index.ts: multiplier
        // Math.ceil(1000/700) = 2, tuned = max(rec, rec * 2).
        assert_eq!(shard_multiplier(), 2);
        assert_eq!(tuned_shard_count(1), 2);
        assert_eq!(tuned_shard_count(4), 8);
        assert_eq!(tuned_shard_count(0), 0);
        // TOTAL_SHARDS override wins; a 0 override is ignored; offline
        // (no recommendation, no override) keeps autoshard (None).
        assert_eq!(resolve_shard_count(Some(4), Some(2)), Some(2));
        assert_eq!(resolve_shard_count(Some(4), Some(0)), Some(8));
        assert_eq!(resolve_shard_count(Some(4), None), Some(8));
        assert_eq!(resolve_shard_count(None, None), None);
        assert_eq!(resolve_shard_count(None, Some(3)), Some(3));
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
        // Non-finite mirrors the TS arithmetic (H7).
        assert_eq!(format_number(f64::NAN), "NaN");
        assert_eq!(format_number(f64::INFINITY), "InfinityT");
        assert_eq!(format_number(f64::NEG_INFINITY), "-InfinityT");
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
        // in_shard mirrors client.inShard (guildShard === shardId).
        assert!(in_shard(1 << 22, 1, 4));
        assert!(!in_shard(1 << 22, 0, 4));
        assert!(in_shard_str(&(1 << 22).to_string(), 1, 4));
        // TS try/catch: unparsable id falls back to the local shard.
        assert!(in_shard_str("not-a-snowflake", 2, 4));
        // is_main_shard mirrors client.isMainShard (ids[0] === 0).
        assert!(is_main_shard(0));
        assert!(!is_main_shard(1));
    }

    #[tokio::test]
    async fn batches_run_in_order() {
        let items = vec![1, 2, 3, 4, 5];
        let out = process_batch(&items, 2, |x| async move { x % 2 == 0 }).await;
        assert_eq!(out, vec![false, true, false, true, false]);
    }

    #[tokio::test]
    async fn batch_full_counts_progress_and_async_complete() {
        // Counts mirror {success, failed}; progress fires per batch.
        let items = vec![1, 2, 3, 4, 5];
        let mut seen = vec![];
        let result = process_batch_full(
            &items,
            2,
            0,
            Some(&mut |done: usize, total: usize| {
                seen.push((done, total));
            }),
            |x| async move { x % 2 == 0 },
        )
        .await;
        assert_eq!(
            result,
            BatchProcessorResult {
                success: 2,
                failed: 3
            }
        );
        assert_eq!(seen, vec![(2, 5), (4, 5), (5, 5)]);
        // Empty input: no batches, no progress, zero counts.
        let empty: Vec<i32> = vec![];
        let result = process_batch_full(&empty, 10, 0, None::<fn(usize, usize)>, |x| async move {
            let _ = x;
            true
        })
        .await;
        assert_eq!(result, BatchProcessorResult::default());
        // Background spawn mirrors setImmediate + onComplete.
        let (tx, rx) = tokio::sync::oneshot::channel();
        let handle = process_batch_async(
            vec![2, 4, 5],
            10,
            0,
            |x| async move { x % 2 == 0 },
            Some(|r: BatchProcessorResult| {
                let _ = tx.send(r);
            }),
        );
        let joined = handle.await.unwrap();
        assert_eq!(
            joined,
            BatchProcessorResult {
                success: 2,
                failed: 1
            }
        );
        assert_eq!(rx.await.unwrap(), joined);
    }

    #[test]
    fn assets_lengths_parse_and_lookup() {
        let table = parse_assets_lengths("\"kiss\":30,\"slap\":30,\"hug\":30}").unwrap();
        assert_eq!(assets_length(&table, "hug"), Some(30));
        assert_eq!(assets_length(&table, "unknown"), None);
        assert!(parse_assets_lengths("not json").is_none());
        assert!(parse_assets_lengths("[1,2]").is_none());
        // Non-integer values are skipped, integers kept.
        let mixed = parse_assets_lengths("\"hug\":30,\"bad\":\"x\"}").unwrap();
        assert_eq!(mixed.len(), 1);
        assert!(ASSETS_LENGTHS_URL.contains("length.json"));
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

/// Internal gateway URL: local base wins, public base is the fallback.
/// Mirrors HorizonGatewayInternal (`HorizonGatewayLocal || HorizonGateway`).
/// `local`/`public` are the already-resolved base URLs (env-first via
/// [`crate::config::Config::gateway_internal`]); empty/None means unset.
pub fn gateway_internal_url(
    local: Option<&str>,
    public: Option<&str>,
    method: GatewayMethod,
) -> Result<String, &'static str> {
    let base = local
        .filter(|s| !s.trim().is_empty())
        .or_else(|| public.filter(|s| !s.trim().is_empty()))
        .unwrap_or("");
    gateway_url(base, method)
}

/// Rendered-image failure. Mirrors the three throws in the
/// HorizonGateway branch of html2png.ts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GatewayRenderError {
    Transport(String),
    /// Non-200 with the response body attached (TS includes
    /// `HTTP <status> on <endpoint>: <message>`).
    Status(u16, String),
    UnexpectedContentType(String),
    EmptyImage,
}

impl std::fmt::Display for GatewayRenderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Transport(e) => write!(f, "gateway request failed: {e}"),
            Self::Status(s, m) => {
                write!(f, "HorizonGateway image generation failed (HTTP {s}): {m}")
            }
            Self::UnexpectedContentType(ct) => write!(
                f,
                "HorizonGateway image generation returned an unexpected content type: {ct}"
            ),
            Self::EmptyImage => {
                write!(
                    f,
                    "HorizonGateway image generation returned an empty image."
                )
            }
        }
    }
}

impl std::error::Error for GatewayRenderError {}

/// Render HTML to PNG through HorizonGateway. Mirrors the
/// `client.config.api.HorizonGateway` branch of html2png.ts exactly:
/// multipart POST (adminKey, options JSON, code, assetN blobs + assets
/// meta JSON) to the ImageGeneration endpoint; non-200 throws with the
/// body, a non-image/png content-type throws, an empty body throws.
/// No Chromium/local render exists here (standing exclusion) — when no
/// gateway base is configured this returns Transport("...empty...")
/// instead of falling back to puppeteer like the TS else-branch.
pub async fn gateway_render_html(
    gateway_base: &str,
    api_token: &str,
    code: &str,
    options_json: &str,
    assets: &[(String, String, Vec<u8>)],
    timeout: Option<std::time::Duration>,
) -> Result<Vec<u8>, GatewayRenderError> {
    let endpoint = gateway_url(gateway_base, GatewayMethod::ImageGeneration)
        .map_err(|e| GatewayRenderError::Transport(e.to_string()))?;
    // Manual multipart/form-data (reqwest has no multipart feature enabled):
    // field layout mirrors the TS FormData appends 1:1.
    let boundary = format!("ihrz{:x}", rand_boundary());
    let mut body: Vec<u8> = Vec::new();
    let mut part = |name: &str, data: &[u8], filename: Option<&str>, mime: Option<&str>| {
        body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
        match (filename, mime) {
            (Some(f), Some(m)) => body.extend_from_slice(
                format!("Content-Disposition: form-data; name=\"{name}\"; filename=\"{f}\"\r\nContent-Type: {m}\r\n\r\n").as_bytes(),
            ),
            _ => body.extend_from_slice(
                format!("Content-Disposition: form-data; name=\"{name}\"\r\n\r\n").as_bytes(),
            ),
        }
        body.extend_from_slice(data);
        body.extend_from_slice(b"\r\n");
    };
    part("adminKey", api_token.as_bytes(), None, None);
    part("options", options_json.as_bytes(), None, None);
    part("code", code.as_bytes(), None, None);
    let mut meta = serde_json::Map::new();
    for (i, (token, mime, bytes)) in assets.iter().enumerate() {
        let field = format!("asset{i}");
        let mut entry = serde_json::Map::new();
        entry.insert(
            "token".to_string(),
            serde_json::Value::String(token.clone()),
        );
        entry.insert("mime".to_string(), serde_json::Value::String(mime.clone()));
        meta.insert(field.clone(), serde_json::Value::Object(entry));
        part(&field, bytes, Some(&format!("{field}.png")), Some(mime));
    }
    part(
        "assets",
        serde_json::Value::Object(meta).to_string().as_bytes(),
        None,
        None,
    );
    body.extend_from_slice(format!("--{boundary}--\r\n").as_bytes());

    let mut builder = reqwest::Client::builder();
    if let Some(t) = timeout {
        builder = builder.timeout(t);
    }
    let client = builder
        .build()
        .map_err(|e| GatewayRenderError::Transport(e.to_string()))?;
    let resp = client
        .post(&endpoint)
        .header(
            "Content-Type",
            format!("multipart/form-data; boundary={boundary}"),
        )
        .body(body)
        .send()
        .await
        .map_err(|e| GatewayRenderError::Transport(e.to_string()))?;
    let status = resp.status().as_u16();
    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| GatewayRenderError::Transport(e.to_string()))?;
    if status != 200 {
        let message = String::from_utf8_lossy(&bytes).into_owned();
        return Err(GatewayRenderError::Status(status, message));
    }
    if !content_type.is_empty() && !content_type.contains("image/png") {
        return Err(GatewayRenderError::UnexpectedContentType(content_type));
    }
    if bytes.is_empty() {
        return Err(GatewayRenderError::EmptyImage);
    }
    Ok(bytes.to_vec())
}

/// Cheap non-crypto boundary nonce (uniqueness only, not secrecy).
fn rand_boundary() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0);
    nanos ^ (std::process::id() as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15)
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
    fn gateway_internal_prefers_local() {
        // Mirrors HorizonGatewayInternal (local wins, public fallback).
        assert_eq!(
            gateway_internal_url(
                Some("http://127.0.0.1:31981"),
                Some("https://gateway.ihorizon.org"),
                GatewayMethod::ImageGeneration
            )
            .unwrap(),
            "http://127.0.0.1:31981/api/ihorizon/v1/image"
        );
        assert_eq!(
            gateway_internal_url(
                None,
                Some("https://gateway.ihorizon.org"),
                GatewayMethod::UserInfo
            )
            .unwrap(),
            "https://gateway.ihorizon.org/api/ihorizon/v1/userinfo"
        );
        assert_eq!(
            gateway_internal_url(
                Some(""),
                Some("https://gateway.ihorizon.org"),
                GatewayMethod::UserInfo
            )
            .unwrap(),
            "https://gateway.ihorizon.org/api/ihorizon/v1/userinfo"
        );
        assert!(gateway_internal_url(None, None, GatewayMethod::UserInfo).is_err());
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

/// Password generator. Mirrors generatePassword: crypto-secure sampling
/// with rejection (like the TS getSecureRandomChar limit-bucket loop
/// over crypto.randomFillSync), strict mode guaranteeing one char per
/// enabled class (like the TS crypto.randomInt patch-up).
/// `seed` is kept only so the existing call sites compile; it is
/// ignored — every call draws from OsRng, so distinct seeds do NOT
/// yield distinct passwords. Use generate_password_seeded for
/// deterministic tests.
pub fn generate_password(opts: &PasswordOptions, _seed: u64) -> Result<String, &'static str> {
    let (pool, classes) = password_pool(opts)?;
    let mut out: Vec<char> = (0..opts.length)
        .map(|_| pool[secure_index(pool.len())])
        .collect();
    if opts.strict {
        for class in &classes {
            let pos = secure_index(opts.length);
            out[pos] = class[secure_index(class.len())];
        }
    }
    Ok(out.into_iter().collect())
}

/// Deterministic password generator for tests only. Same pool/strict
/// semantics as generate_password but driven by an xorshift64 stream
/// so fixtures are reproducible. Never use for real secrets.
pub fn generate_password_seeded(opts: &PasswordOptions, seed: u64) -> Result<String, &'static str> {
    let (pool, classes) = password_pool(opts)?;
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
        for class in &classes {
            let pos = (next() as usize) % opts.length;
            out[pos] = class[(next() as usize) % class.len()];
        }
    }
    Ok(out.into_iter().collect())
}

/// Character pool + per-class alphabets for the password generators.
/// Mirrors the charSets/exclude/excludeSimilarCharacters assembly in
/// random.ts (symbols === true maps to "!@#$%^&*()_+=").
fn password_pool(opts: &PasswordOptions) -> Result<(Vec<char>, Vec<Vec<char>>), &'static str> {
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
    Ok((
        pool.chars().collect(),
        classes.iter().map(|c| c.chars().collect()).collect(),
    ))
}

/// Uniform index in [0, limit) from OsRng with rejection sampling.
/// Mirrors the TS limit-bucket loop (256 - (256 % len)) generalized to
/// u64 draws so any pool/length stays unbiased.
fn secure_index(limit: usize) -> usize {
    use rand::{rngs::OsRng, RngCore};
    if limit <= 1 {
        return 0;
    }
    let limit64 = limit as u64;
    let bound = u64::MAX - (u64::MAX % limit64);
    let mut buf = [0u8; 8];
    loop {
        OsRng.fill_bytes(&mut buf);
        let v = u64::from_le_bytes(buf);
        if v < bound {
            return (v % limit64) as usize;
        }
    }
}

/// Multiple passwords. Mirrors generateMultiplePasswords
/// (amount <= 0 errors, like the TS throw). Each password draws from
/// OsRng; `seed` is ignored (kept for call-site compatibility).
pub fn generate_multiple_passwords(
    amount: usize,
    opts: &PasswordOptions,
    _seed: u64,
) -> Result<Vec<String>, &'static str> {
    if amount == 0 {
        return Err("amount must be positive");
    }
    (0..amount).map(|_| generate_password(opts, 0)).collect()
}

// ---- axios.ts shared HTTP helper ----

/// HTTP method vocabulary. Mirrors the AxiosRequestConfig method field
/// (default GET; the class exposes request/head/get/post/put).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum HttpMethod {
    #[default]
    Get,
    Post,
    Put,
    Head,
}

/// Typed HTTP failure. Mirrors handleRequestError: only transport-level
/// failures are errors — HTTP error statuses are returned as responses
/// (fetch/axios-wrapper never rejects on status), so callers check
/// HttpResponse::ok() like the TS status/data shapes do.
/// NOTE (H14, docs-only): the TS AxiosError envelope ({config, code,
/// request, response}) is intentionally not mirrored — handleRequestError
/// is the identity function, so the envelope carries no information the
/// HttpResponse + HttpError pair does not already provide.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HttpError {
    Timeout,
    Transport(String),
    InvalidUrl(String),
}

impl std::fmt::Display for HttpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Timeout => write!(f, "request timed out"),
            Self::Transport(e) => write!(f, "request failed: {e}"),
            Self::InvalidUrl(u) => write!(f, "invalid URL: {u}"),
        }
    }
}

impl std::error::Error for HttpError {}

/// Request shape. Mirrors AxiosRequestConfig: baseURL join, JSON
/// content-type default, binary Accept, timeout, responseType.
/// NOTE (H8): the TS `params` field is declared but never used — `request()`
/// destructures it and never appends it to the URL, and no call site in
/// `src/` passes `params`. It is omitted here intentionally rather than
/// mirrored as dead surface.
#[derive(Debug, Clone, Default)]
pub struct HttpRequest {
    pub url: String,
    pub method: HttpMethod,
    pub base_url: String,
    pub headers: Vec<(String, String)>,
    pub json_body: Option<String>,
    pub timeout: Option<std::time::Duration>,
    /// When true, mirrors responseType arrayBuffer (Accept binary +
    /// raw bytes instead of the JSON/text sniff).
    pub binary: bool,
}

/// Response shape. Mirrors AxiosResponse {data, status, statusText,
/// headers} with data split by the content sniff.
#[derive(Debug, Clone)]
pub struct HttpResponse {
    pub status: u16,
    /// Mirrors `statusText` (reason phrase; empty on HTTP/2 where the
    /// wire carries none).
    pub status_text: String,
    /// Mirrors `headers` (the fetch Headers object): all response
    /// headers, lowercased names, in wire order.
    pub headers: Vec<(String, String)>,
    pub body_text: String,
    pub body_json: Option<serde_json::Value>,
    pub body_bytes: Option<Vec<u8>>,
}

impl HttpResponse {
    /// Mirrors the axios 2xx contract (non-2xx is data, not a throw).
    pub fn ok(&self) -> bool {
        (200..300).contains(&self.status)
    }
}

/// Join baseURL + url exactly like the TS `baseURL ? baseURL + url : url`.
pub fn join_url(base_url: &str, url: &str) -> String {
    if base_url.is_empty() {
        return url.to_string();
    }
    format!("{base_url}{url}")
}

/// Execute one request with the axios.ts defaults: Content-Type
/// application/json unless overridden, Accept application/octet-stream
/// for binary, reqwest timeout standing in for AbortSignal.timeout.
/// Content sniff mirrors `if (responseType === "json" || isJSON)`: a JSON
/// content-type always takes the text/JSON path — even for binary
/// requests — and only a non-JSON binary response comes back as bytes.
pub async fn http_request(req: &HttpRequest) -> Result<HttpResponse, HttpError> {
    let full = join_url(&req.base_url, &req.url);
    if full.is_empty() {
        return Err(HttpError::InvalidUrl(full));
    }
    let mut builder = reqwest::Client::builder();
    if let Some(t) = req.timeout {
        builder = builder.timeout(t);
    }
    let client = builder
        .build()
        .map_err(|e| HttpError::Transport(e.to_string()))?;
    let mut rb = match req.method {
        HttpMethod::Get => client.get(&full),
        HttpMethod::Post => client.post(&full),
        HttpMethod::Put => client.put(&full),
        HttpMethod::Head => client.head(&full),
    };
    rb = rb.header("Content-Type", "application/json");
    if req.binary {
        rb = rb.header("Accept", "application/octet-stream");
    }
    for (k, v) in &req.headers {
        rb = rb.header(k.as_str(), v.as_str());
    }
    if let Some(body) = &req.json_body {
        rb = rb.body(body.clone());
    }
    let resp = rb.send().await.map_err(|e| {
        if e.is_timeout() {
            HttpError::Timeout
        } else {
            HttpError::Transport(e.to_string())
        }
    })?;
    let status = resp.status().as_u16();
    let status_text = resp
        .status()
        .canonical_reason()
        .unwrap_or_default()
        .to_string();
    let headers: Vec<(String, String)> = resp
        .headers()
        .iter()
        .map(|(k, v)| {
            (
                k.as_str().to_ascii_lowercase(),
                v.to_str().unwrap_or_default().to_string(),
            )
        })
        .collect();
    let content_type = headers
        .iter()
        .find(|(k, _)| k == "content-type")
        .map(|(_, v)| v.clone())
        .unwrap_or_default();
    let is_json = content_type.contains("application/json");
    if req.method == HttpMethod::Head {
        return Ok(HttpResponse {
            status,
            status_text,
            headers,
            body_text: String::new(),
            body_json: None,
            body_bytes: None,
        });
    }
    if req.binary && !is_json {
        let bytes = resp
            .bytes()
            .await
            .map_err(|e| HttpError::Transport(e.to_string()))?;
        return Ok(HttpResponse {
            status,
            status_text,
            headers,
            body_text: String::new(),
            body_json: None,
            body_bytes: Some(bytes.to_vec()),
        });
    }
    let text = resp
        .text()
        .await
        .map_err(|e| HttpError::Transport(e.to_string()))?;
    let body_json = if is_json {
        serde_json::from_str(&text).ok()
    } else {
        None
    };
    Ok(HttpResponse {
        status,
        status_text,
        headers,
        body_text: text,
        body_json,
        body_bytes: None,
    })
}

/// GET shorthand. Mirrors axios.get(url, config).
pub async fn http_get(
    url: &str,
    base_url: &str,
    timeout: Option<std::time::Duration>,
) -> Result<HttpResponse, HttpError> {
    http_request(&HttpRequest {
        url: url.to_string(),
        base_url: base_url.to_string(),
        timeout,
        ..Default::default()
    })
    .await
}

/// POST shorthand with a pre-serialized JSON body. Mirrors
/// axios.post(url, data, config).
pub async fn http_post_json(
    url: &str,
    base_url: &str,
    json_body: &str,
    timeout: Option<std::time::Duration>,
) -> Result<HttpResponse, HttpError> {
    http_request(&HttpRequest {
        url: url.to_string(),
        method: HttpMethod::Post,
        base_url: base_url.to_string(),
        json_body: Some(json_body.to_string()),
        timeout,
        ..Default::default()
    })
    .await
}

/// PUT shorthand with a pre-serialized JSON body. Mirrors
/// axios.put(url, data, config).
pub async fn http_put(
    url: &str,
    base_url: &str,
    json_body: &str,
    timeout: Option<std::time::Duration>,
) -> Result<HttpResponse, HttpError> {
    http_request(&HttpRequest {
        url: url.to_string(),
        method: HttpMethod::Put,
        base_url: base_url.to_string(),
        json_body: Some(json_body.to_string()),
        timeout,
        ..Default::default()
    })
    .await
}

/// HEAD shorthand. Mirrors axios.head(url, config): status + headers only,
/// empty body (see [`http_request`]).
pub async fn http_head(
    url: &str,
    base_url: &str,
    timeout: Option<std::time::Duration>,
) -> Result<HttpResponse, HttpError> {
    http_request(&HttpRequest {
        url: url.to_string(),
        method: HttpMethod::Head,
        base_url: base_url.to_string(),
        timeout,
        ..Default::default()
    })
    .await
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

    #[test]
    fn seeded_passwords_are_deterministic() {
        let opts = PasswordOptions {
            length: 16,
            numbers: true,
            symbols: true,
            lowercase: true,
            uppercase: true,
            exclude_similar: false,
            exclude: String::new(),
            strict: true,
        };
        let a = generate_password_seeded(&opts, 42).unwrap();
        let b = generate_password_seeded(&opts, 42).unwrap();
        assert_eq!(a, b);
        assert_eq!(a.chars().count(), 16);
        assert!(generate_password_seeded(&opts, 0).is_ok());
        assert!(generate_password_seeded(
            &PasswordOptions {
                length: 0,
                ..opts.clone()
            },
            42
        )
        .is_err());
    }

    #[test]
    fn csprng_passwords_have_shape_and_vary() {
        let strict_opts = PasswordOptions {
            length: 24,
            numbers: true,
            symbols: false,
            lowercase: true,
            uppercase: true,
            exclude_similar: true,
            exclude: String::new(),
            strict: true,
        };
        let a = generate_password(&strict_opts, 0).unwrap();
        let b = generate_password(&strict_opts, 0).unwrap();
        for pw in [&a, &b] {
            assert_eq!(pw.chars().count(), 24);
            assert!(pw.chars().any(|c| c.is_ascii_digit()));
            assert!(pw.chars().any(|c| c.is_ascii_lowercase()));
            assert!(pw.chars().any(|c| c.is_ascii_uppercase()));
        }
        // Two 24-char draws from ~60 symbols colliding is ~2^-140.
        assert_ne!(a, b);
        // excludeSimilarCharacters holds for the pool draws (strict is
        // off: like the TS, strict patches from the unfiltered classes).
        let filtered_opts = PasswordOptions {
            strict: false,
            ..strict_opts.clone()
        };
        for _ in 0..8 {
            let pw = generate_password(&filtered_opts, 0).unwrap();
            assert!(!pw.chars().any(|c| "il1Lo0O".contains(c)));
        }
    }

    #[test]
    fn http_join_and_ok() {
        assert_eq!(join_url("", "/x"), "/x");
        assert_eq!(
            join_url("https://api.twitch.tv/helix", "/streams?user_login=a"),
            "https://api.twitch.tv/helix/streams?user_login=a"
        );
        let ok = HttpResponse {
            status: 200,
            status_text: "OK".to_string(),
            headers: vec![],
            body_text: String::new(),
            body_json: None,
            body_bytes: None,
        };
        assert!(ok.ok());
        let redirect = HttpResponse {
            status: 301,
            ..ok.clone()
        };
        assert!(!redirect.ok());
        let err = HttpResponse {
            status: 404,
            ..ok.clone()
        };
        assert!(!err.ok());
        assert_eq!(HttpError::Timeout.to_string(), "request timed out");
        assert!(HttpRequest::default().timeout.is_none());
    }

    #[tokio::test]
    async fn latency_nonnegative() {
        let pool = crate::db::memory_pool().await;
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

/// Parsed /proc/meminfo kB triple. Mirrors the getMemoryInfo shape
/// ({MemTotal, MemFree, MemAvailable} in kB).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct MemoryInfo {
    pub total: u64,
    pub free: u64,
    pub available: u64,
}

/// Parse /proc/meminfo kB values. Mirrors the Linux branch of
/// getMemoryInfo (generic `key: value` split, first whitespace token
/// parsed as the kB count, missing keys stay 0 like the TS `?? 0`).
pub fn parse_meminfo(body: &str) -> MemoryInfo {
    let mut info = MemoryInfo::default();
    for line in body.lines() {
        let mut parts = line.split_whitespace();
        match (parts.next(), parts.next()) {
            (Some("MemTotal:"), Some(v)) => info.total = v.parse().unwrap_or(0),
            (Some("MemFree:"), Some(v)) => info.free = v.parse().unwrap_or(0),
            (Some("MemAvailable:"), Some(v)) => info.available = v.parse().unwrap_or(0),
            _ => {}
        }
    }
    info
}

/// Host memory in kB. Linux-only: reads /proc/meminfo like the TS
/// Linux branch. The TS win32 branch (powershell Win32_OperatingSystem)
/// and the darwin branch (sysctl hw.memsize + vm_stat pages) are
/// deliberately not ported — the bot runs on Linux — so non-Linux
/// hosts (or unreadable meminfo) yield zeros instead of throwing
/// like the TS darwin catch path.
pub fn system_memory_kb() -> MemoryInfo {
    std::fs::read_to_string("/proc/meminfo")
        .map(|b| parse_meminfo(&b))
        .unwrap_or_default()
}

// ---- helper.ts cooldown ----

/// Cooldown store key. Mirrors the tempTable key in helper.ts
/// (`COOLDOWN.<method>.<authorId>`).
pub fn cooldown_key(method: &str, author_id: &str) -> String {
    format!("COOLDOWN.{method}.{author_id}")
}

/// Stored cooldown timestamp for an author+method. Mirrors
/// getCooldownTimestamp (`tempTable.get(...) || null`): a missing
/// entry — or a falsy stored 0 — yields None.
pub fn get_cooldown_timestamp(
    store: &std::collections::HashMap<String, i64>,
    author_id: &str,
    method: &str,
) -> Option<i64> {
    store
        .get(&cooldown_key(method, author_id))
        .copied()
        .filter(|v| *v != 0)
}

/// True while a stored cooldown is still active. Mirrors the
/// `fetch !== null && ms - (tn - fetch) > 0` gate in cooldown().
pub fn cooldown_active(stored: Option<i64>, cooldown_ms: i64, now_ms: i64) -> bool {
    match stored {
        None => false,
        Some(fetch) => cooldown_ms - (now_ms - fetch) > 0,
    }
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
        let body = "MemTotal:        4024548 kB\nMemFree:         123456 kB\nMemAvailable:    2345678 kB\n";
        assert_eq!(
            parse_meminfo(body),
            MemoryInfo {
                total: 4024548,
                free: 123456,
                available: 2345678,
            }
        );
        // Missing keys stay 0, like the TS `?? 0` fallbacks.
        assert_eq!(parse_meminfo("MemTotal:        100 kB\n").total, 100);
        assert_eq!(parse_meminfo("MemTotal:        100 kB\n").available, 0);
        assert_eq!(parse_meminfo(""), MemoryInfo::default());
    }

    #[test]
    fn cooldown_timestamp_mirrors_helper_ts() {
        use std::collections::HashMap;
        let mut store = HashMap::new();
        assert_eq!(cooldown_key("daily", "7"), "COOLDOWN.daily.7");
        // Missing entry -> None (TS null).
        assert_eq!(get_cooldown_timestamp(&store, "7", "daily"), None);
        store.insert(cooldown_key("daily", "7"), 1000);
        assert_eq!(get_cooldown_timestamp(&store, "7", "daily"), Some(1000));
        // Other method / author unaffected.
        assert_eq!(get_cooldown_timestamp(&store, "7", "work"), None);
        assert_eq!(get_cooldown_timestamp(&store, "8", "daily"), None);
        // Falsy stored 0 -> None (TS `fetch || null`).
        store.insert(cooldown_key("work", "7"), 0);
        assert_eq!(get_cooldown_timestamp(&store, "7", "work"), None);
        // Active gate: ms - (tn - fetch) > 0.
        assert!(cooldown_active(Some(1000), 86_400_000, 2000));
        assert!(!cooldown_active(Some(1000), 1000, 2000));
        // At the exact stamp the full window is still ahead (1000 > 0).
        assert!(cooldown_active(Some(1000), 1000, 1000));
        assert!(!cooldown_active(Some(1000), 1000, 2001));
        assert!(!cooldown_active(None, 86_400_000, 2000));
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

/// HEAD image check. Canonical home of the TS `isImageUrl` predicate
/// (src/core/functions/image64.ts: HEAD + `content-type starts with
/// image/`; false on any error, including a missing content-type header —
/// the TS `startsWith` on null throws inside the try, so it also yields
/// false).
/// SPLIT, INTENTIONAL (H16): this network predicate lives here, not in
/// image64.rs (which only fetches bytes); `transcript::is_image_url` is a
/// different, offline extension-guess helper over attachment URLs and must
/// not be merged with this one. New call sites needing a HEAD image gate
/// should use this function (or [`http_head`]).
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
            w.write_image_data(&[255u8, 0, 0].repeat(16)).unwrap();
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

// ---- getOS ----

/// OS display info. Mirrors getOS.ts (`{emojis, name} | null`).
/// `emoji` is the `iHorizon_Emojis` key (Tux/Finder/Win11/Win10);
/// callers resolve it against the runtime emoji map.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OsInfo {
    pub emoji: &'static str,
    pub name: &'static str,
}

/// Current-OS info. Mirrors getOS() (None on unknown platforms).
/// Note: std has no kernel-release API, so on Windows the build
/// split (Win11 vs Win10) is unavailable and the generic
/// Windows/Win10 leg is returned.
pub fn get_os() -> Option<OsInfo> {
    get_os_for(std::env::consts::OS, None)
}

/// Testable core. `platform` uses the Node names ("linux"/"darwin"/
/// "win32", Rust "macos"/"windows" accepted); `release` is the
/// Windows kernel release ("10.0.22000") for the Win11 split.
pub fn get_os_for(platform: &str, release: Option<&str>) -> Option<OsInfo> {
    match platform {
        "linux" => Some(OsInfo {
            emoji: "Tux",
            name: "Linux",
        }),
        "darwin" | "macos" => Some(OsInfo {
            emoji: "Finder",
            name: "macOS",
        }),
        "win32" | "windows" => {
            if let Some(r) = release.filter(|r| r.starts_with("10.0.")) {
                let build = r
                    .split('.')
                    .nth(2)
                    .and_then(|b| b.parse::<u32>().ok())
                    .unwrap_or(0);
                if build >= 22000 {
                    return Some(OsInfo {
                        emoji: "Win11",
                        name: "Windows 11",
                    });
                }
                return Some(OsInfo {
                    emoji: "Win10",
                    name: "Windows 10",
                });
            }
            Some(OsInfo {
                emoji: "Win10",
                name: "Windows",
            })
        }
        _ => None,
    }
}

#[cfg(test)]
mod get_os_tests {
    use super::*;

    #[test]
    fn platforms_map_like_ts() {
        assert_eq!(
            get_os_for("linux", None),
            Some(OsInfo {
                emoji: "Tux",
                name: "Linux",
            })
        );
        assert_eq!(
            get_os_for("darwin", None),
            Some(OsInfo {
                emoji: "Finder",
                name: "macOS",
            })
        );
        assert_eq!(get_os_for("freebsd", None), None);
    }

    #[test]
    fn windows_build_split_matches_ts() {
        assert_eq!(
            get_os_for("win32", Some("10.0.26100")),
            Some(OsInfo {
                emoji: "Win11",
                name: "Windows 11",
            })
        );
        assert_eq!(
            get_os_for("win32", Some("10.0.19045")),
            Some(OsInfo {
                emoji: "Win10",
                name: "Windows 10",
            })
        );
        // Non-10.0 releases and unknown releases fall back to Windows.
        assert_eq!(
            get_os_for("win32", Some("6.3.9600")),
            Some(OsInfo {
                emoji: "Win10",
                name: "Windows",
            })
        );
        assert_eq!(
            get_os_for("win32", None),
            Some(OsInfo {
                emoji: "Win10",
                name: "Windows",
            })
        );
    }

    #[test]
    fn current_os_resolves() {
        assert!(get_os().is_some());
    }
}
