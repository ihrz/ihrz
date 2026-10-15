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
/// iHorizonTimeCalculator.to_ms exactly: global pairs of the TS regex
/// `(-?\d*\.?\d+)([a-zA-Z]+)`; unknown units contribute 0.
/// Exactness notes: only the FIRST space is removed (TS replace); the
/// number is an optional minus plus digits with AT MOST ONE dot, ending on
/// a digit, so "1.2.3h" matches the tail pair like TS, ".5h" is half an
/// hour, "5." matches nothing, and a double space or tab between number
/// and unit ("1  h") matches nothing. Unmatched text is skipped
/// left-to-right; units are ASCII-only so to_ascii_lowercase equals the TS
/// toLowerCase.
pub fn time_ms(input: &str) -> f64 {
    let s: String = match input.find(' ') {
        Some(pos) => {
            let mut t = String::with_capacity(input.len());
            t.push_str(&input[..pos]);
            t.push_str(&input[pos + 1..]);
            t
        }
        None => input.to_string(),
    };
    let bytes = s.as_bytes();
    let mut i = 0;
    let mut total = 0.0;
    while i < bytes.len() {
        let num_start = if bytes[i] == b'-' { i + 1 } else { i };
        // Longest optional-minus digits-with-at-most-one-dot prefix ending
        // on a digit. A shorter prefix can never match where the longest
        // fails (the next char would be a digit or dot, never a unit
        // letter), so only the longest needs the unit check.
        let mut k = num_start;
        let mut dots = 0;
        let mut end: Option<usize> = None;
        while k < bytes.len() {
            let c = bytes[k];
            if c.is_ascii_digit() {
                k += 1;
                end = Some(k);
            } else if c == b'.' && dots == 0 {
                dots += 1;
                k += 1;
            } else {
                break;
            }
        }
        match end {
            Some(e) => {
                let mut u = e;
                while u < bytes.len() && bytes[u].is_ascii_alphabetic() {
                    u += 1;
                }
                if u > e {
                    let num: f64 = s[i..e].parse().unwrap_or(0.0);
                    total += num * unit_multiplier(&s[e..u].to_ascii_lowercase());
                    i = u;
                } else {
                    i += 1;
                }
            }
            None => i += 1,
        }
    }
    total
}

/// Compact duration label. Mirrors to_beautiful_string short form with a
/// null lang exactly: unit letters y/mo/w/d/h/m/s/ms glued with NO
/// separator (`1m30s`-style), the `ms` tail entry included, empty output
/// falling back to `"0m"` (the null-lang `var_m`).
/// Non-finite or negative input falls through to the `"0m"` fallback
/// exactly like TS (every `milliseconds >= factor` comparison is false,
/// except Infinity which TS renders as `Infinityy...` garbage — pinned
/// here like [`beautiful_ms_in`]).
pub fn beautiful_ms(ms: f64) -> String {
    if !ms.is_finite() || ms < 0.0 {
        return "0m".to_string();
    }
    let units = [
        ("y", 31_557_600_000.0),
        ("mo", 2_592_000_000.0),
        ("w", 604_800_000.0),
        ("d", 86_400_000.0),
        ("h", 3_600_000.0),
        ("m", 60_000.0),
        ("s", 1_000.0),
        ("ms", 1.0),
    ];
    let mut rest = ms;
    let mut result = String::new();
    for (name, factor) in units {
        if rest >= factor {
            let value = (rest / factor).floor();
            result.push_str(&format!("{value}{name}"));
            rest %= factor;
            if rest <= 0.0 {
                break;
            }
        }
    }
    if result.is_empty() {
        "0m".to_string()
    } else {
        result
    }
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
/// The K/M/B/T legs mirror `toFixed(1)` on the exact binary value with
/// ties away from zero (spec "larger n"; node ground truth: `1250 -> "1.3K"`,
/// `2250 -> "2.3K"`, `3250 -> "3.3K"` — Rust `{:.1}` half-even gave `"1.2K"`
/// etc.). The sub-1000 leg mirrors `toLocaleString()` en-US, which rounds
/// the SHORTEST round-trip decimal half-up at 3 fraction digits (node ground
/// truth: `0.0625 -> "0.063"`, `0.1235 -> "0.124"` although the exact binary
/// value sits below the tie — Rust `{:.3}` gave `"0.062"`/`"0.123"`).
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
        format!("{prefix}{}T", to_fixed_1(abs / 1_000_000_000_000.0))
    } else if abs >= 1_000_000_000.0 {
        format!("{prefix}{}B", to_fixed_1(abs / 1_000_000_000.0))
    } else if abs >= 1_000_000.0 {
        format!("{prefix}{}M", to_fixed_1(abs / 1_000_000.0))
    } else if abs >= 1_000.0 {
        format!("{prefix}{}K", to_fixed_1(abs / 1_000.0))
    } else {
        format!("{prefix}{}", to_locale_string_en_us(abs))
    }
}

/// JS `Number.prototype.toFixed(1)` for a finite non-negative input:
/// correctly-rounded 1-decimal form of the exact binary value, ties away
/// from zero. Implemented by digit surgery on the exact expansion
/// (`{:.20}`): f64 spacing near any tie (ties are `>= 0.25`, spacing
/// `>= 2^-55`) dwarfs the `1e-20` window, so a `5`-at-second-place with an
/// all-zero tail through digit 20 is provably an exact tie — and in every
/// `5`-at-second-place case (tie or above) the spec rounds up.
pub(crate) fn to_fixed_1(q: f64) -> String {
    let s = format!("{q:.20}");
    let (int, frac) = match s.find('.') {
        Some(i) => (&s[..i], &s[i + 1..]),
        None => (s.as_str(), ""),
    };
    let f: Vec<char> = frac.chars().collect();
    let d1 = f.first().copied().unwrap_or('0');
    let up = !matches!(f.get(1), Some(&c) if c < '5');
    let mut digits: Vec<char> = int.chars().collect();
    if digits.is_empty() {
        digits.push('0');
    }
    digits.push(d1);
    if up {
        let mut i = digits.len();
        loop {
            if i == 0 {
                digits.insert(0, '1');
                break;
            }
            i -= 1;
            if digits[i] == '9' {
                digits[i] = '0';
            } else {
                digits[i] = ((digits[i] as u8) + 1) as char;
                break;
            }
        }
    }
    let last = digits.pop().unwrap_or('0');
    format!("{}.{}", digits.iter().collect::<String>(), last)
}

/// Fallback leg of [`format_number`]. Mirrors `absNum.toLocaleString()`
/// under en-US: the SHORTEST round-trip decimal (like JS `String(v)`;
/// Rust `{}` is equally shortest and plain-notation here — values that
/// would stringify with an exponent are `< 1e-6` and always round to
/// `"0"`), rounded half-up at 3 fraction digits with trailing zeros
/// dropped, integer part grouped with `,`. Rounding can carry into the
/// thousands (`999.9999` -> `"1,000"`), so grouping applies even though
/// inputs are `< 1000`.
fn to_locale_string_en_us(abs: f64) -> String {
    let s = format!("{abs}");
    let (int, frac) = match s.find('.') {
        Some(i) => (&s[..i], &s[i + 1..]),
        None => (s.as_str(), ""),
    };
    let f: Vec<char> = frac.chars().collect();
    let mut kept: Vec<char> = f.iter().take(3).copied().collect();
    let up = matches!(f.get(3), Some(&c) if c >= '5');
    while kept.len() < 3 {
        // Short expansion: no 4th digit, so no rounding — padding only
        // restores the 3-digit split point (trimmed below).
        kept.push('0');
    }
    let mut digits: Vec<char> = int.chars().collect();
    if digits.is_empty() {
        digits.push('0');
    }
    digits.extend(kept.iter());
    if up {
        let mut i = digits.len();
        loop {
            if i == 0 {
                digits.insert(0, '1');
                break;
            }
            i -= 1;
            if digits[i] == '9' {
                digits[i] = '0';
            } else {
                digits[i] = ((digits[i] as u8) + 1) as char;
                break;
            }
        }
    }
    let mut frac_part: Vec<char> = digits.split_off(digits.len() - 3);
    while frac_part.last() == Some(&'0') {
        frac_part.pop();
    }
    let int_part: String = digits.iter().collect();
    let mut grouped = String::with_capacity(int_part.len() + int_part.len() / 3);
    for (i, c) in int_part.chars().enumerate() {
        if i > 0 && (int_part.len() - i).is_multiple_of(3) {
            grouped.push(',');
        }
        grouped.push(c);
    }
    if frac_part.is_empty() {
        grouped
    } else {
        format!("{grouped}.{}", frac_part.iter().collect::<String>())
    }
}

fn format_time(total_secs: u64) -> String {
    // Mirrors generateProgressBar.ts formatTime exactly: total minutes,
    // zero-padded, NO hour fold (3661s -> "61:01", not "1:01:01").
    format!("{:02}:{:02}", total_secs / 60, total_secs % 60)
}

/// Progress bar. Mirrors generateProgressBar.ts exactly: `Math.floor`
/// seconds, `{cur} ┃ {fills}{pointer}{fills} ┃ {tot}` with 15 fills, no
/// hour fold in the clock (`3661s -> "61:01"`). `u64` division is
/// `Math.floor` for all representable (non-negative) inputs; the f64 op
/// order matches TS bit-for-bit. Zero/zero hits the TS `NaN` leg
/// (`repeat(NaN)` yields `""`), so the bar is pointer-only
/// (`"00:00 ┃ ● ┃ 00:00"` — node ground truth). Deliberate graceful
/// deltas where TS throws `RangeError` via `String.repeat`: overrun
/// (past-duration, `before > 15`) clamps to a full bar, and
/// positive-position/zero-duration clamps to an empty bar, and negative
/// inputs (TS `RangeError` + garbage clocks like `"-1:-2"`, node ground
/// truth) are unrepresentable past the `u64` signature.
pub fn progress_bar(
    current_ms: u64,
    total_ms: u64,
    bar_emoji: &str,
    pointer_emoji: &str,
) -> (String, String, String) {
    let cur_s = current_ms / 1000;
    let tot_s = total_ms / 1000;
    let (before, after) = if tot_s == 0 {
        if cur_s == 0 {
            (0usize, 0usize)
        } else {
            (0usize, 15usize)
        }
    } else {
        let progress = (cur_s as f64 / tot_s as f64) * 100.0;
        let before = ((17 - 2) as f64 * (progress / 100.0)).floor() as usize;
        let before = before.min(15);
        (before, 15 - before)
    };
    let cur = format_time(cur_s);
    let tot = format_time(tot_s);
    let bar = format!(
        "{cur} ┃ {}{}{} ┃ {tot}",
        bar_emoji.repeat(before),
        pointer_emoji,
        bar_emoji.repeat(after)
    );
    (bar, cur, tot)
}

/// Text sanitizer. Mirrors sanitizer.ts exactly: the TS splits the string
/// into UTF-16 code units and keeps a unit only if
/// `decodeURIComponent(escape(unit))` round-trips. A lone surrogate half
/// always throws, so EVERY astral character (emoji, etc.) is stripped —
/// even well-formed pairs die one half at a time (node ground truth:
/// `"A😀B"` -> `"AB"`, `"😀 hi"` -> `" hi"`). Rust `&str` can never hold
/// lone surrogates, so keeping only BMP scalar values (`<= U+FFFF`) is the
/// exact equivalent for all representable inputs. Empty result (or empty
/// input, like TS `undefined`/`""`) yields `"<malformed string>"`.
pub fn sanitizing(text: &str) -> String {
    let kept: String = text.chars().filter(|c| (*c as u32) <= 0xFFFF).collect();
    if kept.is_empty() {
        return "<malformed string>".to_string();
    }
    kept
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
/// (`BANNER_URL` with `{countryCode}` replaced; the TS `|| "en-US"`
/// fallback is applied by guild_banner_url, not here).
pub fn banner_url(lang_code: &str) -> String {
    BANNER_URL_TEMPLATE.replace("{countryCode}", lang_code)
}

/// Banner image URL for a guild. Mirrors bannerGenerator(guildId)
/// (reads GUILD.LANG table-first with legacy kv fallback, en-US default).
/// Both the TS `{ lang: code }` object shape and legacy bare-string rows
/// resolve via `parse_lang_value`.
///
/// Node ground truth (`bannerGenerator.ts`: `db.get("….LANG.lang")` via
/// `get_property` + `|| "en-US"` + first-`replace`): exact on every
/// writer-reachable input (both writers store `{ lang: code }` objects;
/// missing/`{lang:""}`/`{lang:0}`/null/missing-leaf rows all fall back to
/// en-US on both sides, pinned below). Hostile-row-only deltas, no live
/// writer emits them: a whitespace-only leaf (`" "`) or truthy non-string
/// leaf (`5`, `true`) renders verbatim/coerced in TS (`ihrz_ .png`,
/// `ihrz_5.png`) while this falls back to en-US, and a legacy bare-string
/// LANG row reads en-US in TS (`get_property` needs an object) while this
/// resolves the code via the blessed `guild_lang` contract (slice 57).
pub async fn guild_banner_url(pool: &crate::db::Pool, guild_id: &str) -> String {
    let lang = crate::db::tbl_get(pool, guild_id, "GUILD.LANG")
        .await
        .and_then(|raw| crate::db::parse_lang_value(&raw))
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
/// only when the hostname parses and is unlisted). Hostname extraction
/// mirrors legacy `url.parse` quirks pinned by a node ground-truth
/// battery: backslash counts as `/`, `\t\n\r` are stripped, the
/// authority ends at the first `/`, `?` or `#` (so `#`/`?` `@`-tricks
/// stay on the evil host), userinfo is cut at the last `@`, the port at
/// `:`, the host is lowercased, and an empty authority yields hostname
/// `""` (not null) so `includes("")` is false. A bare `scheme:...`
/// value carrying userinfo (`mailto:foo@host`) parses its rest the same
/// way; anything without a hostname is allowed (true). The TS table
/// repeats its last 5 domains verbatim; the single copy here gives the
/// same `includes` outcomes. Known residual delta: `tel:+1234`-style
/// scheme values without `@` parse a garbage hostname in TS (false)
/// but stay allowed here (true) — never a music URL in practice.
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
        "tidal.com",
        "www.tidal.com",
        "listen.tidal.com",
        "store.tidal.com",
        "tidal.lnk.to",
        "tdl.lnk.to",
    ];
    // Mirrors url.parse(link).hostname: no hostname -> null -> allowed (true).
    let scrubbed: String = link
        .chars()
        .filter(|c| !matches!(c, '\t' | '\n' | '\r'))
        .collect();
    let scrubbed = scrubbed.replace('\\', "/");
    let scrubbed = scrubbed.trim();
    let authority = if let Some(idx) = scrubbed.find("://") {
        if idx == 0 {
            return true;
        }
        &scrubbed[idx + 3..]
    } else if let Some(colon) = scrubbed.find(':') {
        let rest = &scrubbed[colon + 1..];
        if rest.contains('@') {
            rest
        } else {
            return true;
        }
    } else {
        return true;
    };
    let host = authority
        .split(['/', '?', '#'])
        .next()
        .unwrap_or("")
        .split('@')
        .next_back()
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    DOMAINS.contains(&host.as_str())
}

/// Single unicode emoji check. Mirrors isSingleEmoji
/// (`/^[\p{Emoji}][\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]?$/u`): the `\p{Emoji}`
/// set is enumerated in `is_emoji_first_char` from the Node ground truth
/// (digits, `#`, `*`, `©`/`®`, `‼`, arrows, geometric shapes and the astral blocks with
/// their holes — e.g. U+1F322, U+2605 and lone U+FE0F are NOT Emoji).
/// A wholesale BMP-range approximation both over-matches (U+2605) and
/// under-matches (`"1"`, `"#"`, `"*"`, `"‼"`).
fn is_emoji_first_char(cp: u32) -> bool {
    matches!(
        cp,
        0x23 | 0x2A
            | 0xA9
            | 0xAE
            | 0x203C
            | 0x2049
            | 0x2122
            | 0x2139
            | 0x2328
            | 0x23CF
            | 0x24C2
            | 0x25B6
            | 0x25C0
            | 0x260E
            | 0x2611
            | 0x2618
            | 0x261D
            | 0x2620
            | 0x2626
            | 0x262A
            | 0x2640
            | 0x2642
            | 0x2663
            | 0x2668
            | 0x267B
            | 0x2699
            | 0x26A7
            | 0x26C8
            | 0x26D1
            | 0x26FD
            | 0x2702
            | 0x2705
            | 0x270F
            | 0x2712
            | 0x2714
            | 0x2716
            | 0x271D
            | 0x2721
            | 0x2728
            | 0x2744
            | 0x2747
            | 0x274C
            | 0x274E
            | 0x2757
            | 0x27A1
            | 0x27B0
            | 0x27BF
            | 0x2B50
            | 0x2B55
            | 0x1F004
            | 0x1F0CF
            | 0x1F18E
            | 0x1F21A
            | 0x1F22F
            | 0x1F587
            | 0x1F590
            | 0x1F5A8
            | 0x1F5BC
            | 0x1F5E1
            | 0x1F5E3
            | 0x1F5E8
            | 0x1F5EF
            | 0x1F5F3
            | 0x1F6E9
            | 0x1F6F0
            | 0x1F7F0
    ) || (0x30..=0x39).contains(&cp)
        || (0x2194..=0x2199).contains(&cp)
        || (0x21A9..=0x21AA).contains(&cp)
        || (0x231A..=0x231B).contains(&cp)
        || (0x23E9..=0x23F3).contains(&cp)
        || (0x23F8..=0x23FA).contains(&cp)
        || (0x25AA..=0x25AB).contains(&cp)
        || (0x25FB..=0x25FE).contains(&cp)
        || (0x2600..=0x2604).contains(&cp)
        || (0x2614..=0x2615).contains(&cp)
        || (0x2622..=0x2623).contains(&cp)
        || (0x262E..=0x262F).contains(&cp)
        || (0x2638..=0x263A).contains(&cp)
        || (0x2648..=0x2653).contains(&cp)
        || (0x265F..=0x2660).contains(&cp)
        || (0x2665..=0x2666).contains(&cp)
        || (0x267E..=0x267F).contains(&cp)
        || (0x2692..=0x2697).contains(&cp)
        || (0x269B..=0x269C).contains(&cp)
        || (0x26A0..=0x26A1).contains(&cp)
        || (0x26AA..=0x26AB).contains(&cp)
        || (0x26B0..=0x26B1).contains(&cp)
        || (0x26BD..=0x26BE).contains(&cp)
        || (0x26C4..=0x26C5).contains(&cp)
        || (0x26CE..=0x26CF).contains(&cp)
        || (0x26D3..=0x26D4).contains(&cp)
        || (0x26E9..=0x26EA).contains(&cp)
        || (0x26F0..=0x26F5).contains(&cp)
        || (0x26F7..=0x26FA).contains(&cp)
        || (0x2708..=0x270D).contains(&cp)
        || (0x2733..=0x2734).contains(&cp)
        || (0x2753..=0x2755).contains(&cp)
        || (0x2763..=0x2764).contains(&cp)
        || (0x2795..=0x2797).contains(&cp)
        || (0x2934..=0x2935).contains(&cp)
        || (0x2B05..=0x2B07).contains(&cp)
        || (0x2B1B..=0x2B1C).contains(&cp)
        || (0x1F170..=0x1F171).contains(&cp)
        || (0x1F17E..=0x1F17F).contains(&cp)
        || (0x1F191..=0x1F19A).contains(&cp)
        || (0x1F1E6..=0x1F1FF).contains(&cp)
        || (0x1F201..=0x1F202).contains(&cp)
        || (0x1F232..=0x1F23A).contains(&cp)
        || (0x1F250..=0x1F251).contains(&cp)
        || (0x1F300..=0x1F321).contains(&cp)
        || (0x1F324..=0x1F393).contains(&cp)
        || (0x1F396..=0x1F397).contains(&cp)
        || (0x1F399..=0x1F39B).contains(&cp)
        || (0x1F39E..=0x1F3F0).contains(&cp)
        || (0x1F3F3..=0x1F3F5).contains(&cp)
        || (0x1F3F7..=0x1F4FD).contains(&cp)
        || (0x1F4FF..=0x1F53D).contains(&cp)
        || (0x1F549..=0x1F54E).contains(&cp)
        || (0x1F550..=0x1F567).contains(&cp)
        || (0x1F56F..=0x1F570).contains(&cp)
        || (0x1F573..=0x1F57A).contains(&cp)
        || (0x1F58A..=0x1F58D).contains(&cp)
        || (0x1F595..=0x1F596).contains(&cp)
        || (0x1F5A4..=0x1F5A5).contains(&cp)
        || (0x1F5B1..=0x1F5B2).contains(&cp)
        || (0x1F5C2..=0x1F5C4).contains(&cp)
        || (0x1F5D1..=0x1F5D3).contains(&cp)
        || (0x1F5DC..=0x1F5DE).contains(&cp)
        || (0x1F5FA..=0x1F64F).contains(&cp)
        || (0x1F680..=0x1F6C5).contains(&cp)
        || (0x1F6CB..=0x1F6D2).contains(&cp)
        || (0x1F6D5..=0x1F6D8).contains(&cp)
        || (0x1F6DC..=0x1F6E5).contains(&cp)
        || (0x1F6EB..=0x1F6EC).contains(&cp)
        || (0x1F6F3..=0x1F6FC).contains(&cp)
        || (0x1F7E0..=0x1F7EB).contains(&cp)
        || (0x1F90C..=0x1F93A).contains(&cp)
        || (0x1F93C..=0x1F945).contains(&cp)
        || (0x1F947..=0x1F9FF).contains(&cp)
        || (0x1FA70..=0x1FA7C).contains(&cp)
        || (0x1FA80..=0x1FA8A).contains(&cp)
        || (0x1FA8E..=0x1FAC6).contains(&cp)
        || cp == 0x1FAC8
        || (0x1FACD..=0x1FADC).contains(&cp)
        || (0x1FADF..=0x1FAEA).contains(&cp)
        || (0x1FAEF..=0x1FAF8).contains(&cp)
}

pub fn is_single_emoji(text: &str) -> bool {
    let mut chars = text.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !is_emoji_first_char(first as u32) {
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
/// `startsWith` is case-sensitive (uppercase schemes rejected) and a
/// bare `"http://"` prefix alone matches (node ground truth).
pub fn is_valid_link(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://")
}

/// Embed color check. Mirrors `isValidColor` (`/^#([0-9a-f]{3}){1,2}$/i`):
/// the `#` prefix is REQUIRED — bare `"fff"`/`"ffffff"` are rejected — and
/// the `i` flag folds no non-ASCII char into `[0-9a-f]` (node ground
/// truth: KELVIN SIGN, LONG S, TURKISH I, fullwidth ABC all rejected),
/// so `is_ascii_hexdigit` is exactly equivalent.
pub fn is_valid_color(color: &str) -> bool {
    let bytes = color.as_bytes();
    (bytes.len() == 4 || bytes.len() == 7)
        && bytes[0] == b'#'
        && bytes[1..].iter().all(|b| b.is_ascii_hexdigit())
}

/// Embed id check. Mirrors `isValidEmbedId`: the 255 cap measures
/// `TextEncoder` UTF-8 bytes (== `str::len`), the 32-segment cap is
/// inclusive, and any empty dot-segment rejects (node ground truth:
/// 249 ASCII chars pass at exactly 255 bytes, 250 fail; 124 `é`
/// pass at 254 bytes, 125 fail at 256).
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
/// over `batchSize` (default 10), per-item try/catch (a resolved
/// `false` — or, in TS, a rejected processor caught to `false` —
/// counts as failed, never aborts the run), `onProgress`
/// after each batch with (completed, total), and `delay` ms between
/// batches (skipped after the last one; 0 disables the sleep so
/// offline tests stay instant).
/// Deltas (doc-noted): `batch_size == 0` runs one item per batch
/// (`max(1)`; TS `i += 0` loops forever), and a panicking processor
/// propagates (TS only ever sees rejections, which have no Rust
/// counterpart on a `bool`-returning future).
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

/// Remote asset manifest. Mirrors the repositories.json fetch in
/// assetsCalc.ts (TS `Assets`: string keys to `{ length, paths }`).
pub const ASSETS_LENGTHS_URL: &str = "https://www.ihorizon.org/cdn/repositories.json";

/// Parse the repositories.json body into per-type asset URL lists.
/// None when the body is not a JSON object (mirrors the TS JSON.parse
/// throw-leg: a bare fragment or garbage leaves the table unset on both
/// sides; a JSON array parses but is not an object, so it also yields
/// None). Entries without a `paths` string array are skipped — TS
/// `assetsFinder` returns `""` for those the same way (unknown key,
/// missing/non-array/empty `paths` all hit `!paths?.length`). Delta
/// (doc-noted): non-string items inside `paths` are filtered out here
/// while TS could return one verbatim (numeric index pick); the live
/// CDN body carries clean strings only, unreachable. Picking a valid
/// index into `paths` (instead of building `/{n}.gif` from a count)
/// fixes the historic off-by-one (`0.gif` does not exist) and covers
/// same-stem siblings (`4.jpg` next to `4.gif`).
pub fn parse_asset_paths(raw: &str) -> Option<std::collections::HashMap<String, Vec<String>>> {
    let value: serde_json::Value = serde_json::from_str(raw.trim()).ok()?;
    let table = value.as_object()?;
    let mut out = std::collections::HashMap::with_capacity(table.len());
    for (key, entry) in table {
        let paths: Vec<String> = entry
            .get("paths")
            .and_then(|p| p.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|u| u.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        if !paths.is_empty() {
            out.insert(key.clone(), paths);
        }
    }
    Some(out)
}

/// URL list for one asset type. Mirrors the `assets[type].paths` read
/// the TS callers do after assetsCalc fills `client.assets`.
pub fn asset_paths(
    table: &std::collections::HashMap<String, Vec<String>>,
    asset_type: &str,
) -> Option<Vec<String>> {
    table.get(asset_type).cloned()
}

/// Process-local assets table. Mirrors `client.assets` filled once by
/// assetsCalc at boot (core.ts calls it fire-and-forget, un-awaited).
/// INTEROP STANCE: the table lives in process memory only. It is never
/// persisted under `src/files`, and no shared-file coordination with a
/// concurrently running TS process is attempted — each process fetches
/// its own copy from the same URL, exactly like two TS shards each
/// holding their own `client.assets`.
fn assets_cache() -> &'static std::sync::Mutex<std::collections::HashMap<String, Vec<String>>> {
    static CACHE: std::sync::OnceLock<
        std::sync::Mutex<std::collections::HashMap<String, Vec<String>>>,
    > = std::sync::OnceLock::new();
    CACHE.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

/// Refresh the boot-wired assets table. Best-effort: a failed fetch or
/// an unusable body keeps the previous table (fun legs fall back to
/// their lazy first-use fetch when the table is still empty). Wired
/// once at boot from `bot::run`; re-runnable for tests/operators.
pub async fn refresh_assets_cache() {
    let body = match reqwest::Client::new().get(ASSETS_LENGTHS_URL).send().await {
        Ok(resp) => match resp.text().await {
            Ok(text) => text,
            Err(_) => return,
        },
        Err(_) => return,
    };
    if let Some(table) = parse_asset_paths(&body) {
        if !table.is_empty() {
            *assets_cache().lock().unwrap_or_else(|e| e.into_inner()) = table;
        }
    }
}

/// URL list for one asset type from the boot-wired table. None before
/// the first successful [`refresh_assets_cache`] (callers fall back to
/// their lazy fetch, mirroring `client.assets[type]` reads before
/// assetsCalc resolves).
pub fn cached_asset_paths(asset_type: &str) -> Option<Vec<String>> {
    asset_paths(
        &assets_cache().lock().unwrap_or_else(|e| e.into_inner()),
        asset_type,
    )
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
/// on unparsable ids, i.e. true — see `in_shard_str`). A zero shard
/// count also throws in TS (`% 0n` is a RangeError), so it is true too.
pub fn in_shard(guild_id: u64, shard_id: u64, total_shards: u64) -> bool {
    if total_shards == 0 {
        return true;
    }
    guild_shard(guild_id, total_shards) == shard_id
}

/// Reduced shard of a BigInt-grammar guild id: `(N >> 22) % total`,
/// or `None` when `BigInt(guild_id)` throws (TS try/catch leg).
/// Grammar replica (node ground truth): JS-whitespace trim, empty ->
/// 0n, optional sign, `0x`/`0b`/`0o` radix prefixes (>= 1 digit),
/// otherwise all-decimal-digits with full-string consume (no points,
/// exponents, underscores, or trailing garbage). Arbitrary magnitudes
/// need no bigint: only `floor(N / 2^22) mod total` is observed, which
/// Horner reduction mod `total * 2^22` yields exactly.
fn bigint_shard_reduced(
    digits: &str,
    negative: bool,
    radix: u32,
    total_shards: u64,
) -> Option<u64> {
    const SHIFT: u128 = 1 << 22;
    let modulus = (total_shards as u128).checked_mul(SHIFT)?;
    let mut acc: u128 = 0;
    for c in digits.chars() {
        acc = (acc * radix as u128 + c.to_digit(radix)? as u128) % modulus;
    }
    // acc = |N| mod (total * 2^22). Positive side: floor(|N| / 2^22)
    // mod total. Negative side: floor(-|N| / 2^22) = -(kT + ceil(acc/M))
    // (acc > 0), so the signed reduced value is 0 iff ceil(acc/M) is a
    // multiple of total (else it is nonzero-negative and never ===
    // a non-negative shard id).
    if negative {
        let ceil = if acc == 0 { 0 } else { (acc + SHIFT - 1) >> 22 };
        if ceil % total_shards as u128 == 0 {
            Some(0)
        } else {
            None
        }
    } else {
        Some(((acc >> 22) % total_shards as u128) as u64)
    }
}

/// String-guild-id variant. Mirrors client.inShard exactly: it runs the
/// TS `BigInt(guild_id) >> 22n % BigInt(totalShards)` pipeline, and any
/// throw (empty radix, bad digits, `% 0n`) falls back to the local
/// shard, i.e. true. Whitespace-padded, `+`-signed, hex/octal/binary,
/// and empty ids therefore compute like TS (node battery: `" 123 "`,
/// `"+123"`, `"0x10"`, `"0b101"`, `""` all parse; `"1_000"`,
/// `"12.5"`, `"1e3"` throw), while `str::parse::<u64>` alone agreed
/// only on the throw legs.
pub fn in_shard_str(guild_id: &str, shard_id: u64, total_shards: u64) -> bool {
    if total_shards == 0 {
        return true;
    }
    let s = js_trim(guild_id);
    if s.is_empty() {
        return guild_shard(0, total_shards) == shard_id;
    }
    let (negative, rest) = match s.strip_prefix('-') {
        Some(r) => (true, r),
        None => (false, s.strip_prefix('+').unwrap_or(s)),
    };
    let (radix, digits) =
        if let Some(h) = rest.strip_prefix("0x").or_else(|| rest.strip_prefix("0X")) {
            (16u32, h)
        } else if let Some(b) = rest.strip_prefix("0b").or_else(|| rest.strip_prefix("0B")) {
            (2u32, b)
        } else if let Some(o) = rest.strip_prefix("0o").or_else(|| rest.strip_prefix("0O")) {
            (8u32, o)
        } else {
            (10u32, rest)
        };
    if digits.is_empty() || !digits.chars().all(|c| c.is_digit(radix)) {
        return true;
    }
    match bigint_shard_reduced(digits, negative, radix, total_shards) {
        // Negative-nonzero reduced values never match (see helper).
        None => false,
        Some(reduced) => reduced == shard_id,
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
    fn time_ms_matches_ts_grammar_quirks() {
        // Node ground truth (ms.ts to_ms battery): single-dot grammar with
        // tail-pair matching, first-space-only removal.
        assert_eq!(time_ms("1.2.3h"), 2.3 * 3_600_000.0);
        assert_eq!(time_ms("1..5h"), 1_800_000.0);
        assert_eq!(time_ms("1.5.5h"), 19_800_000.0);
        assert_eq!(time_ms("12..34s"), 340.0);
        assert_eq!(time_ms("..5h"), 1_800_000.0);
        assert_eq!(time_ms("-..5h"), 1_800_000.0);
        assert_eq!(time_ms(".5h"), 1_800_000.0);
        assert_eq!(time_ms("-.5h"), -1_800_000.0);
        assert_eq!(time_ms("5."), 0.0);
        assert_eq!(time_ms("5.s"), 0.0);
        assert_eq!(time_ms("1h5.m"), 3_600_000.0);
        assert_eq!(time_ms("1e3s"), 3_000.0);
        assert_eq!(time_ms("0x10s"), 10_000.0);
        assert_eq!(time_ms("--5m"), -300_000.0);
        assert_eq!(time_ms("5-h"), 0.0);
        assert_eq!(time_ms("1,5h"), 18_000_000.0);
        // Only the first " " is removed: single space joins, double space
        // and tabs between number and unit match nothing.
        assert_eq!(time_ms("1h 30m"), 5_400_000.0);
        assert_eq!(time_ms(" 1h"), 3_600_000.0);
        assert_eq!(time_ms("1 H"), 3_600_000.0);
        assert_eq!(time_ms("1 30m"), 7_800_000.0);
        assert_eq!(time_ms("1  h"), 0.0);
        assert_eq!(time_ms("1\th"), 0.0);
        assert_eq!(time_ms("1h\t30m"), 5_400_000.0);
    }

    #[test]
    fn beautiful_decomposes() {
        // TS null-lang short form: glued, ms tail included, "0m" fallback.
        assert_eq!(beautiful_ms(3_600_000.0), "1h");
        assert_eq!(beautiful_ms(90_000.0), "1m30s");
        assert_eq!(beautiful_ms(500.0), "500ms");
        assert_eq!(beautiful_ms(0.0), "0m");
    }

    #[test]
    fn beautiful_null_lang_matches_ts() {
        // Ground truth via node (ms.ts to_beautiful_string, null lang).
        assert_eq!(beautiful_ms(1500.0), "1s500ms");
        assert_eq!(beautiful_ms(61_000.0), "1m1s");
        assert_eq!(beautiful_ms(1001.0), "1s1ms");
        assert_eq!(beautiful_ms(90_061.0), "1m30s61ms");
        assert_eq!(beautiful_ms(3_599_999.0), "59m59s999ms");
        assert_eq!(beautiful_ms(0.5), "0m");
        assert_eq!(beautiful_ms(-5.0), "0m");
        assert_eq!(beautiful_ms(f64::NAN), "0m");
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
    fn beautiful_long_plural_and_locale_shorts_match_ts() {
        // Node ground truth (ms.ts to_beautiful_string battery, slice 80):
        // long singular/plural boundary per unit, ms-tail singular,
        // fractional leftovers floor into the ms tail, non-en shorts come
        // from the var_* YAML keys verbatim.
        assert_eq!(
            beautiful_ms_in(1001.0, "en-US", true),
            "1 second 1 millisecond"
        );
        assert_eq!(beautiful_ms_in(1.0, "en-US", true), "1 millisecond");
        assert_eq!(beautiful_ms_in(2.0, "en-US", true), "2 milliseconds");
        assert_eq!(
            beautiful_ms_in(90_061.0, "en-US", true),
            "1 minute 30 seconds 61 milliseconds"
        );
        assert_eq!(
            beautiful_ms_in(90_061.0, "en-US", false),
            "1minute(s)30second(s)61ms"
        );
        assert_eq!(
            beautiful_ms_in(61_000.0, "en-US", true),
            "1 minute 1 second"
        );
        assert_eq!(beautiful_ms_long(31_557_600_000.0), "1 year");
        assert_eq!(beautiful_ms_long(63_115_200_000.0), "2 years");
        assert_eq!(beautiful_ms_long(2_592_000_000.0), "1 month");
        assert_eq!(beautiful_ms_long(1_209_600_000.0), "2 weeks");
        assert_eq!(beautiful_ms_long(86_400_000.0), "1 day");
        assert_eq!(beautiful_ms_long(120_000.0), "2 minutes");
        assert_eq!(beautiful_ms_long(1000.0), "1 second");
        // Fractional leftovers floor into the ms tail, exactly like TS.
        assert_eq!(beautiful_ms_in(1500.5, "en-US", false), "1second(s)500ms");
        assert_eq!(
            beautiful_ms_in(1500.5, "en-US", true),
            "1 second 500 milliseconds"
        );
        assert_eq!(beautiful_ms_in(999.9, "en-US", false), "999ms");
        // fr-FR shorts are the var_* values verbatim (ms tail stays "ms").
        assert_eq!(beautiful_ms_in(3_600_000.0, "fr-FR", false), "1heure(s)");
        assert_eq!(
            beautiful_ms_in(90_000.0, "fr-FR", false),
            "1minute(s)30seconde(s)"
        );
        assert_eq!(
            beautiful_ms_in(90_061.0, "fr-FR", false),
            "1minute(s)30seconde(s)61ms"
        );
        assert_eq!(
            beautiful_ms_in(61_000.0, "fr-FR", false),
            "1minute(s)1seconde(s)"
        );
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
        assert_eq!(beautiful_ms(f64::INFINITY), "0m");
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
        // Envelope shape mirrors the TS join: 16B salt / 12B iv /
        // 16B auth tag as hex (ct leg is 22 hex for 11 input bytes).
        let segs: Vec<&str> = enc.split(':').collect();
        assert_eq!((segs[0].len(), segs[1].len(), segs[3].len()), (32, 24, 32));
        assert_eq!(segs[2].len(), 22);
        // Fresh random salt+iv per call: two envelopes never agree.
        assert_ne!(enc, encrypt_text("pw", "hello guild"));
        assert_eq!(decrypt_text("pw", &enc).as_deref(), Some("hello guild"));
        assert_eq!(decrypt_text("wrong", &enc), None);
        assert_eq!(decrypt_text("pw", "not:valid"), None);
        assert_eq!(decrypt_text("pw", "a:b:c:d:e"), None);
        // Node ground truth: extra segments are ignored by the TS
        // destructure (EXTRA_SEG/EXTRA_TWO decrypt), short/empty/non-hex
        // nonces yield undefined (never a panic), and garbage ct hex
        // truncates to empty so an empty-plaintext envelope still opens.
        assert_eq!(
            decrypt_text("pw", &format!("{enc}:deadbeef")).as_deref(),
            Some("hello guild")
        );
        assert_eq!(
            decrypt_text("pw", &format!("{enc}:aa:bb")).as_deref(),
            Some("hello guild")
        );
        assert_eq!(decrypt_text("pw", "aabbcc:bb:cc:dd"), None);
        assert_eq!(decrypt_text("pw", "aabbcc:::dd"), None);
        assert_eq!(decrypt_text("pw", "aabbcc:zz:cc:dd"), None);
        let empty_ct = encrypt_text("pw", "");
        let mut seg: Vec<&str> = empty_ct.split(':').collect();
        seg[2] = "zzzz";
        assert_eq!(decrypt_text("pw", &seg.join(":")).as_deref(), Some(""));
        assert_eq!(node_hex_bytes("aazzbb"), vec![0xaa]);
        assert_eq!(node_hex_bytes("abc"), vec![0xab]);
        assert_eq!(node_hex_bytes("AABB"), vec![0xaa, 0xbb]);
        assert_eq!(node_hex_bytes(""), Vec::<u8>::new());
        // Fixed vector produced by the TS implementation (node:crypto).
        let ts = "d00a16daa41250a3a64a254f10bbdbc3:5626ea095456cc1121843a32:3b16d14a2c4ac1854e0a60:35a1c55e9161f75e235bcd40cf3c30e4";
        assert_eq!(decrypt_text("pw", ts).as_deref(), Some("hello guild"));
        // Unicode password/plaintext interop vector (node battery: salt
        // 00..0f, iv 10..1b; pbkdf2Sync takes the password as UTF-8,
        // exactly like Rust `as_bytes()`).
        let ts_uni = "000102030405060708090a0b0c0d0e0f:101112131415161718191a1b:aa4cbb45115233015c5053d5fe:6b2af82f23e26fe1199e008f672ea96b";
        assert_eq!(
            decrypt_text("pâsswörd🔑", ts_uni).as_deref(),
            Some("héllo wörld")
        );
        // DELTA (doc-noted): a valid-GCM envelope decrypting to
        // non-UTF8 bytes (key-holder-crafted only) yields the U+FFFD
        // replacement string in TS (`toString("utf8")` never throws)
        // but None in Rust (`String::from_utf8` rejects). Unreachable
        // from `encrypt` (string input is always valid UTF-8); node
        // ground truth decrypts the envelope below to `"���"`.
        let bad_utf8 = "000102030405060708090a0b0c0d0e0f:101112131415161718191a1b:8fac83:8e85dca64606b6cb2db098d42132ad17";
        assert_eq!(decrypt_text("pw", bad_utf8), None);
        // Whitespace-only segments match TS (createDecipheriv throws
        // on the short nonce -> undefined).
        assert_eq!(decrypt_text("pw", "  :  :  :  "), None);
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
        // Sub-1000 leg mirrors toLocaleString() en-US (node ground truth).
        assert_eq!(format_number(12.3456), "12.346");
        assert_eq!(format_number(0.123456789), "0.123");
        assert_eq!(format_number(0.0001), "0");
        assert_eq!(format_number(999.9999), "1,000");
        assert_eq!(format_number(-999.5), "-999.5");
    }

    #[test]
    fn bar_matches_generate_progress_bar() {
        // Node ground truth pins (generateProgressBar.ts battery).
        let (bar, cur, tot) = progress_bar(0, 200_000, "━", "●");
        assert_eq!(cur, "00:00");
        assert_eq!(tot, "03:20");
        assert_eq!(bar, "00:00 ┃ ●━━━━━━━━━━━━━━━ ┃ 03:20");
        let (half, _, _) = progress_bar(90_000, 180_000, "━", "●");
        assert_eq!(half, "01:30 ┃ ━━━━━━━●━━━━━━━━ ┃ 03:00");
        // Zero/zero NaN leg: repeat(NaN) is "", pointer-only bar.
        let (z, zc, zt) = progress_bar(0, 0, "━", "●");
        assert_eq!(zc, "00:00");
        assert_eq!(zt, "00:00");
        assert_eq!(z, "00:00 ┃ ● ┃ 00:00");
        // 100% puts the pointer at the end (after = 0).
        let (full, _, _) = progress_bar(1500, 1000, "━", "●");
        assert_eq!(full, "00:01 ┃ ━━━━━━━━━━━━━━━● ┃ 00:01");
        let (_, cur2, _) = progress_bar(3_661_000, 10_000_000, "━", "●");
        // TS formatTime has no hour fold: 3661s -> "61:01".
        assert_eq!(cur2, "61:01");
        // Overrun clamps to a full bar (TS throws RangeError; graceful delta).
        let (over, _, _) = progress_bar(300_000, 180_000, "━", "●");
        assert_eq!(over.chars().filter(|c| *c == '━').count(), 15);
        // Sub-second floor leg: 999ms -> "00:00", 59999ms -> "00:59".
        let (_, sub_cur, _) = progress_bar(999, 1000, "━", "●");
        assert_eq!(sub_cur, "00:00");
        let (sub_bar, _, _) = progress_bar(59_999, 60_000, "━", "●");
        assert_eq!(sub_bar, "00:59 ┃ ━━━━━━━━━━━━━━●━ ┃ 01:00");
        // Positive-position/zero-duration clamps to an empty bar
        // (TS: Infinity progress -> repeat(Infinity) throws RangeError).
        let (inf, inf_c, inf_t) = progress_bar(1500, 0, "━", "●");
        assert_eq!(inf_c, "00:01");
        assert_eq!(inf_t, "00:00");
        assert_eq!(inf, "00:01 ┃ ●━━━━━━━━━━━━━━━ ┃ 00:00");
        // Sub-second/zero-duration stays pointer-only (0/0 NaN leg).
        let (nano, _, _) = progress_bar(100, 0, "━", "●");
        assert_eq!(nano, "00:00 ┃ ● ┃ 00:00");
        // No hour fold on big clocks (TS verbatim, node ground truth).
        let (_, _, big_tot) = progress_bar(3_661_000, 10_000_000, "━", "●");
        assert_eq!(big_tot, "166:40");
        let (hour, _, _) = progress_bar(3_600_000, 3_600_000, "━", "●");
        assert_eq!(hour, "60:00 ┃ ━━━━━━━━━━━━━━━● ┃ 60:00");
    }

    #[test]
    fn sanitize_masks_links_urls() {
        assert_eq!(sanitizing("hello"), "hello");
        assert_eq!(sanitizing(""), "<malformed string>");
        // TS splits UTF-16 units: astral pairs die one half at a time (node pins).
        assert_eq!(sanitizing("A😀B"), "AB");
        assert_eq!(sanitizing("😀 hi"), " hi");
        assert_eq!(sanitizing("café"), "café");
        assert_eq!(sanitizing("😀"), "<malformed string>");
        assert_eq!(mask_link("see https://x.y"), "Hidden Link");
        // TS String.includes is case-sensitive: uppercase schemes/names pass through.
        assert_eq!(mask_link("see HTTP://x.y"), "see HTTP://x.y");
        assert_eq!(mask_link("Discordapp x"), "Discordapp x");
        assert_eq!(mask_link("x.COM"), "x.COM");
        // W6 slice 91 (maskLink.ts node battery, 46 cases): strictly
        // case-sensitive ASCII substring search; byte-substring equals
        // UTF-16-substring for pure-ASCII needles on every input.
        assert_eq!(mask_link(""), "");
        assert_eq!(mask_link("see HTTPS://x.y"), "see HTTPS://x.y");
        assert_eq!(mask_link("DISCORDAPP x"), "DISCORDAPP x");
        assert_eq!(mask_link("x.Com"), "x.Com");
        assert_eq!(mask_link(".GG hi"), ".GG hi");
        assert_eq!(mask_link("a.comb"), "Hidden Link");
        assert_eq!(mask_link("x discordappy"), "Hidden Link");
        assert_eq!(mask_link("HTTPS://UPPER"), "HTTPS://UPPER");
        assert_eq!(mask_link("FTP://x.com"), "Hidden Link");
        assert_eq!(mask_link("line1\n.com"), "Hidden Link");
        assert_eq!(mask_link("tab\t.gg"), "Hidden Link");
        assert_eq!(mask_link("plain text"), "plain text");
        assert_eq!(message_url(1, 2, 3), "https://discord.com/channels/1/2/3");
        // Mirrors getMessageURL.ts template literal exactly (node battery):
        // full snowflakes interpolate verbatim, zeros included.
        assert_eq!(
            message_url(123456789012345678, 987654321098765432, 111222333444555666),
            "https://discord.com/channels/123456789012345678/987654321098765432/111222333444555666"
        );
        assert_eq!(message_url(0, 0, 0), "https://discord.com/channels/0/0/0");
        assert_eq!(
            banner_url("fr-FR"),
            "https://www.ihorizon.org/assets/img/banner/ihrz_fr-FR.png"
        );
    }

    #[tokio::test]
    async fn guild_banner_url_is_table_first_with_legacy_fallback() {
        let pool = crate::db::memory_pool().await;
        // Unset guild falls back to en-US.
        assert_eq!(
            guild_banner_url(&pool, "g0").await,
            "https://www.ihorizon.org/assets/img/banner/ihrz_en-US.png"
        );
        // Legacy-only kv row (pre-migration data) still reads.
        crate::db::kv_set(&pool, "g1", "GUILD.LANG", "fr-FR")
            .await
            .unwrap();
        assert_eq!(
            guild_banner_url(&pool, "g1").await,
            "https://www.ihorizon.org/assets/img/banner/ihrz_fr-FR.png"
        );
        // Table-routed write round-trips (keys unchanged).
        crate::db::tbl_set(&pool, "g2", "GUILD.LANG", "de-DE")
            .await
            .unwrap();
        assert_eq!(
            guild_banner_url(&pool, "g2").await,
            "https://www.ihorizon.org/assets/img/banner/ihrz_de-DE.png"
        );
        // TS `{ lang: code }` object shape resolves via the leaf.
        crate::db::tbl_set_json(
            &pool,
            "g3",
            "GUILD.LANG",
            &serde_json::json!({ "lang": "fr-FR" }),
        )
        .await
        .unwrap();
        assert_eq!(
            guild_banner_url(&pool, "g3").await,
            "https://www.ihorizon.org/assets/img/banner/ihrz_fr-FR.png"
        );
        // TS falsy-leaf legs (`|| "en-US"`, node battery): empty, zero,
        // null and missing `lang` leaves all fall back on both sides.
        for (gid, raw) in [
            ("g4", "{\"lang\":\"\"}"),
            ("g5", "{\"lang\":0}"),
            ("g6", "{\"lang\":null}"),
            ("g7", "{}"),
        ] {
            crate::db::tbl_set_json(
                &pool,
                gid,
                "GUILD.LANG",
                &serde_json::from_str::<serde_json::Value>(raw).unwrap(),
            )
            .await
            .unwrap();
            assert_eq!(
                guild_banner_url(&pool, gid).await,
                "https://www.ihorizon.org/assets/img/banner/ihrz_en-US.png"
            );
        }
        // The template carries exactly one marker, so Rust replace-all ==
        // TS first-only `String.replace`.
        assert_eq!(BANNER_URL_TEMPLATE.matches("{countryCode}").count(), 1);
    }

    #[test]
    fn image_and_link_gates() {
        assert!(is_valid_image_type(Some("image/PNG")));
        assert!(is_valid_image_type(Some("image/webp")));
        assert!(!is_valid_image_type(Some("text/plain")));
        assert!(!is_valid_image_type(None));
        // Node ground truth: full-BMP sweep proves U+212A KELVIN is the
        // ONLY char where toLowerCase differs from ASCII-lower with ASCII
        // output (KELVIN -> "k"), and no allowlist entry contains "k", so
        // to_ascii_lowercase is verdict-equal on every input.
        let kelvin = char::from_u32(0x212a).unwrap().to_string();
        assert!(!is_valid_image_type(Some(&kelvin)));
        assert!(!is_valid_image_type(Some(&format!("i{}e/png", kelvin))));
        assert!(!is_valid_image_type(Some("IMAGE\u{212a}PNG")));
        assert!(!is_valid_image_type(Some("\u{130}mage/png")));
        assert!(is_valid_image_type(Some("IMAGE/PNG")));
        assert!(is_allowed_links("https://open.spotify.com/x"));
        assert!(!is_allowed_links("https://evil.example/x"));
        assert!(is_allowed_links("not a url"));
    }

    #[test]
    fn allowed_links_matches_url_parse_quirks() {
        // Node ground-truth battery against legacy url.parse(link).hostname.
        assert!(!is_allowed_links("https://evil.com#@open.spotify.com/x"));
        assert!(!is_allowed_links("https://evil.com?@open.spotify.com"));
        assert!(!is_allowed_links("https://evil.com/@open.spotify.com"));
        assert!(!is_allowed_links("https:///x"));
        assert!(!is_allowed_links("https://?x=1"));
        assert!(!is_allowed_links("https://#frag"));
        assert!(!is_allowed_links("https:// open.spotify.com/x"));
        assert!(!is_allowed_links("mailto:foo@evil.com"));
        assert!(is_allowed_links("://evil.com/x"));
        assert!(is_allowed_links("https://open.spotify.com "));
        assert!(is_allowed_links("https://open.spotify.com\t/x"));
        assert!(is_allowed_links("https://open.spotify.com\\@evil.com/x"));
        assert!(is_allowed_links("HTTPS://OPEN.SPOTIFY.COM/X"));
        assert!(is_allowed_links("https://user:pw@open.spotify.com:443/x"));
        assert!(is_allowed_links("https://open.spotify.com:abc/x"));
        assert!(is_allowed_links("mailto:foo@open.spotify.com"));
        assert!(is_allowed_links("foo@evil.com"));
        assert!(is_allowed_links("https:open.spotify.com/x"));
        // Tidal table legs (W6 slice 42): all six TS allowlist hosts
        // pass (uppercase + port included), lookalikes stay denied.
        assert!(is_allowed_links("https://tidal.com/browse/track/123"));
        assert!(is_allowed_links("https://www.tidal.com/x"));
        assert!(is_allowed_links("https://listen.tidal.com/album/1"));
        assert!(is_allowed_links("https://store.tidal.com/x"));
        assert!(is_allowed_links("https://tidal.lnk.to/abc"));
        assert!(is_allowed_links("https://tdl.lnk.to/abc"));
        assert!(is_allowed_links("https://TIDAL.COM/x"));
        assert!(is_allowed_links("https://tidal.com:443/x"));
        assert!(!is_allowed_links("https://eviltidal.com/x"));
        assert!(!is_allowed_links("https://tidal.com.evil.com/x"));
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
        // Node ground truth (W6 slice 90): full getMediaByMessage
        // battery — content link wins even with an image attachment,
        // scheme check is case-sensitive (HTTPS falls through to the
        // attachment leg), missing/upper/bare content-types miss the
        // case-sensitive `startsWith("image/")`, empty content still
        // reaches the attachment, leading-space content is no link,
        // suffixed content-type still an image, bare "http://" is a
        // link, query-suffixed a_ name still animated (slice 89).
        assert_eq!(
            media_by_message(
                "https://example.com",
                Some(("https://cdn/x/a_1.png", Some("image/png")))
            ),
            ("url".to_string(), "https://example.com".to_string())
        );
        assert_eq!(
            media_by_message(
                "HTTPS://example.com",
                Some(("https://cdn/x/a_1.png", Some("image/png")))
            ),
            ("image.gif".to_string(), "https://cdn/x/a_1.png".to_string())
        );
        assert_eq!(
            media_by_message("hi", Some(("https://cdn/x/a_1.png", None))),
            ("none".to_string(), String::new())
        );
        assert_eq!(
            media_by_message("hi", Some(("https://cdn/x/a_1.png", Some("IMAGE/PNG")))),
            ("none".to_string(), String::new())
        );
        assert_eq!(
            media_by_message("", Some(("https://cdn/x/a_1.png", Some("image/png")))),
            ("image.gif".to_string(), "https://cdn/x/a_1.png".to_string())
        );
        assert_eq!(
            media_by_message(
                " https://example.com",
                Some(("https://cdn/x/b_1.png", Some("image/png")))
            ),
            ("image.png".to_string(), "https://cdn/x/b_1.png".to_string())
        );
        assert_eq!(
            media_by_message("hi", Some(("https://cdn/x/a_1.png", Some("image/")))),
            ("image.gif".to_string(), "https://cdn/x/a_1.png".to_string())
        );
        assert_eq!(
            media_by_message("hi", Some(("https://cdn/x/a_1.png", Some("image")))),
            ("none".to_string(), String::new())
        );
        assert_eq!(
            media_by_message(
                "hi",
                Some(("https://cdn/x/b_1.png", Some("image/png; charset=x")))
            ),
            ("image.png".to_string(), "https://cdn/x/b_1.png".to_string())
        );
        assert_eq!(
            media_by_message("http://", None),
            ("url".to_string(), "http://".to_string())
        );
        assert_eq!(
            media_by_message(
                "hi",
                Some(("https://cdn/x/a_1.png?size=1024", Some("image/webp")))
            ),
            (
                "image.gif".to_string(),
                "https://cdn/x/a_1.png?size=1024".to_string()
            )
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
        // Node ground truth (W6 slice 87 battery): exact-aspect equality
        // takes the else leg (strict `>`), downscale boxes, unit
        // squares, and a Math.round half-tie (512x34 -> 1920/aspect =
        // exactly 127.5 -> 128; Rust round() is half-away == half-up on
        // non-negative inputs, so ties agree on the whole u32 domain).
        assert_eq!(fit_dimensions(16, 9, 1920, 1080), (1920, 1080));
        assert_eq!(fit_dimensions(1920, 1080, 800, 600), (800, 450));
        assert_eq!(fit_dimensions(1, 1, 1920, 1080), (1080, 1080));
        assert_eq!(fit_dimensions(512, 34, 1920, 1080), (1920, 128));
        assert_eq!(fit_dimensions(3, 2, 1920, 1080), (1620, 1080));
        // Extreme-ratio delta (doc-noted): TS Math.round yields a 0 side
        // ([100000,1] -> [1920,0], [1,100000] -> [0,1080]) and hands it
        // to Jimp.resize, while Rust clamps to 1 (Jimp images are >= 1px
        // per side, so live inputs never reach this leg).
        assert_eq!(fit_dimensions(100000, 1, 1920, 1080), (1920, 1));
        assert_eq!(fit_dimensions(1, 100000, 1920, 1080), (1, 1080));
        // resizeImage letterbox: fit + centered offsets on black canvas.
        assert_eq!(
            letterbox_layout(3840, 1080, 1920, 1080),
            (1920, 540, 0, 270)
        );
        assert_eq!(
            letterbox_layout(1080, 1080, 1920, 1080),
            (1080, 1080, 420, 0)
        );
        // Node ground truth (W6 slice 87): odd-remainder centering rounds
        // half-up ((3-2)/2 = 0.5 -> 1; non-negative so Rust agrees), and
        // the (0,0) zero-guard leg (TS resizeImage `if (width && height)`
        // falsy gate skips the fit entirely and writes the original, so
        // zero canvas/src shapes are unreachable from Jimp images).
        assert_eq!(letterbox_layout(7, 5, 3, 3), (3, 2, 0, 1));
        assert_eq!(letterbox_layout(100, 1, 1920, 1080), (1920, 19, 0, 531));
        assert_eq!(letterbox_layout(0, 0, 1920, 1080), (0, 0, 960, 540));
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

    #[tokio::test]
    async fn kdenlive_naming_and_failure_legs_match_ts() {
        // Node ground truth (W6 slice 95 battery replicating
        // kdenliveManipulator.ts verbatim with stubbed Date.now):
        // tempSave -> `<tempDir>/<ms>.kdenlive` ("0.kdenlive",
        // "1705321845000.kdenlive"); export -> `merged_video_<ms>.mp4`;
        // command `xvfb-run -a melt -audio-samplerate 44100 <proj>
        // -consumer avformat:<out>`. tempDir itself is
        // path.join(os.tmpdir(), "media-manipulation") == media_temp_dir.
        assert_eq!(
            media_temp_dir(),
            std::env::temp_dir().join("media-manipulation")
        );
        // tempSave shape + open roundtrip (mirrors KdenLive.open utf8 read).
        let saved = kdenlive_temp_save("<mlt>data</mlt>", 1705321845000).expect("save");
        assert_eq!(saved.parent(), Some(media_temp_dir().as_path()));
        assert_eq!(
            saved.file_name().and_then(|s| s.to_str()),
            Some("1705321845000.kdenlive")
        );
        assert_eq!(kdenlive_open(&saved).expect("open"), "<mlt>data</mlt>");
        let zero = kdenlive_temp_save("z", 0).expect("save0");
        assert_eq!(
            zero.file_name().and_then(|s| s.to_str()),
            Some("0.kdenlive")
        );
        // Failure leg: TS `await execAsync` throws so `rm` is skipped and
        // the error propagates; Rust returns Err before remove_file. A
        // missing project fails on every host (spawn error where xvfb-run
        // is absent, melt error where present).
        let missing = media_temp_dir().join("kdenlive-slice95-missing.kdenlive");
        let _ = std::fs::remove_file(&missing);
        assert!(kdenlive_export(&missing, 1705321845000).await.is_err());
        assert!(!missing.exists());
        let _ = std::fs::remove_file(&saved);
        let _ = std::fs::remove_file(&zero);
        // Deltas (doc-noted, unreachable live): the Rust output name adds
        // `_<pid>` (`merged_video_<ms>_<pid>.mp4`) so same-ms exports never
        // collide on the TS scheme; argv (no shell) keeps space-bearing
        // paths literal where the TS unquoted interpolation word-splits;
        // non-UTF8 project bytes resolve with U+FFFD in TS readFile but
        // Err in kdenlive_open (live projects are XML text).
    }

    #[test]
    fn emoji_checks() {
        assert!(is_single_emoji("👍"));
        assert!(is_single_emoji("⭐"));
        assert!(!is_single_emoji("ab"));
        assert!(!is_single_emoji(""));
        // Node ground truth pins: \p{Emoji} covers digits/`#`/`*`/©/`‼`,
        // but NOT U+2605, lone U+FE0F, astral holes (U+1F322) or `a`.
        assert!(is_single_emoji("1"));
        assert!(is_single_emoji("#"));
        assert!(is_single_emoji("*"));
        assert!(is_single_emoji("©"));
        assert!(is_single_emoji("‼"));
        assert!(is_single_emoji("©\u{FE0F}"));
        assert!(is_single_emoji("👍\u{1F3FD}"));
        assert!(!is_single_emoji("★"));
        assert!(!is_single_emoji("\u{FE0F}"));
        assert!(!is_single_emoji("\u{1F322}"));
        assert!(!is_single_emoji("a"));
        assert!(!is_single_emoji("1\u{FE0F}\u{20E3}"));
        assert!(!is_single_emoji("👍\u{1F3FD}x"));
        assert!(is_discord_emoji("<:pepe:123>"));
        assert!(is_discord_emoji("<a:dance:456>"));
        assert!(!is_discord_emoji("👍"));
        // Node ground truth pins (`/:(\w+):(\d+)>/`, unanchored, ASCII-only
        // \w/\d): bare shapes, later-colon backtrack restarts (`:a:b:2>`,
        // `::a:1>`), digit-run must abut `>` (`:a:12x>`), non-ASCII names /
        // digits rejected (`é`, fullwidth), sign/space/tab in the id leg
        // rejected, mid-string matches pass through.
        assert!(is_discord_emoji(":a:1>"));
        assert!(is_discord_emoji("hello :x:9> world"));
        assert!(is_discord_emoji(":a1:2>"));
        assert!(is_discord_emoji("<:a:1>"));
        assert!(is_discord_emoji("::a:1>"));
        assert!(is_discord_emoji(":a:b:2>"));
        assert!(is_discord_emoji(":ab:12>trail"));
        assert!(is_discord_emoji("a:bc:12>"));
        assert!(is_discord_emoji("_:xy:77>"));
        assert!(is_discord_emoji(":a:0>"));
        assert!(is_discord_emoji(":0:0>"));
        assert!(is_discord_emoji(":ABC_DEF:999>"));
        assert!(is_discord_emoji("x:y:3>z"));
        assert!(is_discord_emoji(":_:1>"));
        assert!(is_discord_emoji(":A_:0>"));
        assert!(is_discord_emoji(":a:1>2>"));
        assert!(!is_discord_emoji(":a:b1>"));
        assert!(!is_discord_emoji(":a::1>"));
        assert!(!is_discord_emoji("::1>"));
        assert!(!is_discord_emoji(":a:12x>"));
        assert!(!is_discord_emoji(":é:1>"));
        assert!(!is_discord_emoji(":a:1"));
        assert!(!is_discord_emoji(":a:>"));
        assert!(!is_discord_emoji("::>"));
        assert!(!is_discord_emoji(":"));
        assert!(!is_discord_emoji("<a:1>"));
        assert!(!is_discord_emoji("text:with:colons"));
        assert!(!is_discord_emoji("12:34"));
        assert!(!is_discord_emoji(":-:1>"));
        assert!(!is_discord_emoji(":.:1>"));
        assert!(!is_discord_emoji(":a: 1>"));
        assert!(!is_discord_emoji(":a:\t1>"));
        assert!(!is_discord_emoji(":a:+1>"));
        assert!(!is_discord_emoji(":a:-1>"));
        assert!(!is_discord_emoji(":a:１２>"));
        assert!(!is_discord_emoji("<: :1>"));
    }

    #[test]
    fn embed_validators() {
        assert!(is_valid_link("https://x.y"));
        assert!(!is_valid_link("ftp://x"));
        // Case-sensitive startsWith: uppercase schemes rejected, bare
        // prefixes alone accepted, leading space rejected (node battery).
        assert!(!is_valid_link("HTTPS://x"));
        assert!(!is_valid_link("HTTP://x"));
        assert!(is_valid_link("http://"));
        assert!(is_valid_link("https://"));
        assert!(!is_valid_link(""));
        assert!(!is_valid_link(" https://x"));
        // Trailing content never invalidates a matched prefix; fullwidth
        // colon and BOM prefixes never match (node battery).
        assert!(is_valid_link("https://x "));
        assert!(!is_valid_link("https：//x"));
        assert!(!is_valid_link("\u{FEFF}https://x"));
        assert!(is_valid_color("#fff"));
        assert!(is_valid_color("#123456"));
        assert!(is_valid_color("#FFF"));
        assert!(is_valid_color("#ABCDEF"));
        assert!(is_valid_color("#FfFfFf"));
        assert!(!is_valid_color("red"));
        // `#` prefix required: bare hex rejected like the TS regex.
        assert!(!is_valid_color("fff"));
        assert!(!is_valid_color("ffffff"));
        assert!(!is_valid_color("#ffff"));
        assert!(!is_valid_color("#ggg"));
        assert!(!is_valid_color(""));
        // `i` flag folds nothing non-ASCII into [0-9a-f] (node battery).
        assert!(!is_valid_color("#İİİ"));
        assert!(!is_valid_color("#ſſſ"));
        assert!(!is_valid_color("#KKK"));
        assert!(!is_valid_color("#ＡＢＣ"));
        // Ligatures/simple-folds (ﬁ/ﬀ/ß/SSS/kkk) never enter [0-9a-f];
        // lengths other than 3/6 hex digits always fail (node battery).
        assert!(!is_valid_color("#ﬁﬁﬁ"));
        assert!(!is_valid_color("#ﬀﬀﬀ"));
        assert!(!is_valid_color("#ßßß"));
        assert!(!is_valid_color("#kkk"));
        assert!(is_valid_color("#FFFFFF"));
        assert!(is_valid_color("#aBcDeF"));
        assert!(!is_valid_color("#ff"));
        assert!(!is_valid_color("#fffff"));
        assert!(!is_valid_color("#12345"));
        assert!(!is_valid_color("#1234567"));
        assert!(is_valid_embed_id("abc123"));
        assert!(!is_valid_embed_id(""));
        assert!(!is_valid_embed_id("a.b."));
        // Dotted ids allowed; any empty segment rejects.
        assert!(is_valid_embed_id("a.b"));
        assert!(!is_valid_embed_id(".a"));
        assert!(!is_valid_embed_id("a."));
        assert!(!is_valid_embed_id("a..b"));
        // 255-byte cap is inclusive and counts UTF-8 bytes, not chars.
        assert!(is_valid_embed_id(&"x".repeat(249)));
        assert!(!is_valid_embed_id(&"x".repeat(250)));
        assert!(is_valid_embed_id(&"é".repeat(124)));
        assert!(!is_valid_embed_id(&"é".repeat(125)));
        // 32-segment cap is inclusive (key adds the EMBED segment).
        assert!(is_valid_embed_id(&vec!["a"; 31].join(".")));
        assert!(!is_valid_embed_id(&vec!["a"; 32].join(".")));
        // Only dots/emptiness/length gate: spaces, glob chars, dashes,
        // bare "EMBED" and astral ids all pass (node battery).
        assert!(is_valid_embed_id("a b"));
        assert!(is_valid_embed_id(" a"));
        assert!(is_valid_embed_id("EMBED"));
        assert!(is_valid_embed_id("a*b?c"));
        assert!(is_valid_embed_id("-"));
        assert!(is_valid_embed_id("😀"));
        assert!(!is_valid_embed_id("."));
        assert!(!is_valid_embed_id(".."));
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
        // BigInt-grammar legs (node battery on bot.ts inShard): trim,
        // sign, radix, and empty all parse; points/exponents/underscores
        // throw (fallback true); negatives reduce signed (false unless
        // the reduced value is 0n); % 0n throws (true).
        assert!(in_shard_str(" 123 ", 0, 4));
        assert!(!in_shard_str(" 123 ", 1, 4));
        assert!(in_shard_str("+123", 0, 4));
        assert!(in_shard_str("0x10", 0, 4));
        assert!(in_shard_str("0b101", 0, 4));
        assert!(in_shard_str("010", 0, 4));
        assert!(in_shard_str("", 0, 4));
        assert!(!in_shard_str("", 1, 4));
        assert!(!in_shard_str("-5", 0, 4));
        assert!(!in_shard_str("-5", 3, 4));
        assert!(in_shard_str("1_000", 2, 4));
        assert!(in_shard_str("12.5", 0, 4));
        assert!(in_shard_str("1e3", 3, 4));
        assert!(in_shard_str("0x", 1, 4));
        assert!(in_shard_str("999449972615413861", 2, 4));
        assert!(in_shard_str("999999999999999999999999999999", 3, 4));
        assert!(in_shard(7, 0, 0));
        assert!(in_shard(7, 3, 0));
        assert!(in_shard_str("123", 0, 0));
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

    #[tokio::test]
    async fn batch_size_zero_runs_one_per_batch() {
        // Documented delta (W6 slice 48): TS `i += 0` loops forever;
        // Rust clamps to one item per batch via `max(1)`.
        let items = vec![1, 2, 3];
        let mut seen = vec![];
        let result = process_batch_full(
            &items,
            0,
            0,
            Some(&mut |done: usize, total: usize| {
                seen.push((done, total));
            }),
            |x| async move { x % 2 == 1 },
        )
        .await;
        assert_eq!(
            result,
            BatchProcessorResult {
                success: 2,
                failed: 1
            }
        );
        assert_eq!(seen, vec![(1, 3), (2, 3), (3, 3)]);
    }

    #[test]
    fn assets_lengths_parse_and_lookup() {
        let raw = r#"{"kiss": {"length": 1, "paths": ["https://www.ihorizon.org/cdn/kiss/1.gif"]}, "slap": {"length": 1, "paths": ["https://www.ihorizon.org/cdn/slap/1.gif"]}, "hug": {"length": 2, "paths": ["https://www.ihorizon.org/cdn/hug/1.gif", "https://www.ihorizon.org/cdn/hug/4.jpg"]}}"#;
        let table = parse_asset_paths(raw).unwrap();
        assert_eq!(asset_paths(&table, "hug").unwrap().len(), 2);
        assert_eq!(asset_paths(&table, "unknown"), None);
        // Boot-wired table starts empty offline (no network in tests).
        assert_eq!(cached_asset_paths("hug"), None);
        assert!(parse_asset_paths("not json").is_none());
        assert!(parse_asset_paths("[1,2]").is_none());
        // Bare fragment (no opening brace): TS JSON.parse throws, so the
        // table stays unset there too (node ground truth: SyntaxError).
        assert!(parse_asset_paths("\"hug\": {\"length\": 1, \"paths\": [\"u\"]}}").is_none());
        // Whitespace-padded full object parses on both sides.
        assert!(
            parse_asset_paths("  {\"hug\": {\"length\": 1, \"paths\": [\"u\"]}}  \n").is_some()
        );
        // Empty/non-array `paths` entries are skipped here; TS assetsFinder
        // returns "" for them the same way (no usable asset either side).
        let empties = parse_asset_paths(
            r#"{"a": {"length": 0, "paths": []}, "b": {"length": 1}, "c": {"length": 1, "paths": null}, "d": 30}"#,
        )
        .unwrap();
        assert!(empties.is_empty());
        // Non-string items are filtered (TS could return one verbatim;
        // doc-noted delta, live CDN carries clean strings only).
        let mixed_items =
            parse_asset_paths(r#"{"hug": {"length": 2, "paths": ["u", 7]}}"#).unwrap();
        assert_eq!(mixed_items["hug"], vec!["u".to_string()]);
        // Entries without a `paths` array are skipped, the rest kept.
        let mixed =
            parse_asset_paths(r#"{"hug": {"length": 1, "paths": ["u"]}, "bad": {"length": 1}}"#)
                .unwrap();
        assert_eq!(mixed.len(), 1);
        assert!(ASSETS_LENGTHS_URL.contains("repositories.json"));
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

/// Date formatter. Mirrors date_and_time.format exactly: the TS getters
/// (getFullYear/getMonth/getDate/getDay/getHours/...) are SERVER-LOCAL,
/// so fields come from chrono::Local, not UTC (a UTC clock renders warn/
/// blacklist/schedule/logger timestamps 1-2h off on a Europe/Paris host;
/// node ground truth: 1705321845 -> "13:30:45", 0 -> "01:00:00").
/// Token scan is single-pass left-to-right like the TS
/// /(YYYY|YY|MMM|MM|DD|ddd|HH|mm|ss)/g replace; out-of-range timestamps
/// fall back to the UTC civil computation below.
pub fn format_date(unix_secs: i64, format: &str) -> String {
    use chrono::{Datelike, Local, TimeZone, Timelike};
    let (year, month, day, weekday, hh, mm, ss) =
        if let Some(dt) = Local.timestamp_opt(unix_secs, 0).single() {
            (
                dt.year() as i64,
                dt.month(),
                dt.day(),
                DAYS[dt.weekday().num_days_from_sunday() as usize],
                dt.hour(),
                dt.minute(),
                dt.second(),
            )
        } else {
            let days = unix_secs.div_euclid(86_400);
            let secs = unix_secs.rem_euclid(86_400);
            let (year, month, day) = civil_from_days(days);
            (
                year,
                month,
                day,
                DAYS[((days + 4).rem_euclid(7)) as usize],
                (secs / 3600) as u32,
                ((secs / 60) % 60) as u32,
                (secs % 60) as u32,
            )
        };
    let year_s = year.to_string();
    let mut out = String::with_capacity(format.len() + 16);
    let bytes = format.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let rest = &format[i..];
        // Longest-first at each position, like the TS alternation
        // (YYYY|YY|MMM|MM|DD|ddd|HH|mm|ss).
        let (token, value): (&str, String) = if rest.starts_with("YYYY") {
            ("YYYY", year_s.clone())
        } else if rest.starts_with("YY") {
            ("YY", year_s[year_s.len().saturating_sub(2)..].to_string())
        } else if rest.starts_with("MMM") {
            ("MMM", MONTHS[(month - 1) as usize].to_string())
        } else if rest.starts_with("MM") {
            ("MM", format!("{month:02}"))
        } else if rest.starts_with("DD") {
            ("DD", format!("{day:02}"))
        } else if rest.starts_with("ddd") {
            ("ddd", weekday.to_string())
        } else if rest.starts_with("HH") {
            ("HH", format!("{hh:02}"))
        } else if rest.starts_with("mm") {
            ("mm", format!("{mm:02}"))
        } else if rest.starts_with("ss") {
            ("ss", format!("{ss:02}"))
        } else {
            let ch_len = rest.chars().next().map(|c| c.len_utf8()).unwrap_or(1);
            out.push_str(&rest[..ch_len]);
            i += ch_len;
            continue;
        };
        out.push_str(&value);
        i += token.len();
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
/// The empty guard mirrors JS `!base`: only `""` throws — a
/// whitespace-only base is truthy in TS and builds verbatim.
pub fn gateway_url(base: &str, method: GatewayMethod) -> Result<String, &'static str> {
    if base.is_empty() {
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
/// Mirrors HorizonGatewayInternal (`if (local) ...`): only `""`/None
/// falls through — a whitespace-only local is truthy in TS and wins.
pub fn gateway_internal_url(
    local: Option<&str>,
    public: Option<&str>,
    method: GatewayMethod,
) -> Result<String, &'static str> {
    let base = local
        .filter(|s| !s.is_empty())
        .or_else(|| public.filter(|s| !s.is_empty()))
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

/// Guild owner merge. Mirrors getGuildOwner
/// (`[...new Set([ownerId, ...Object.keys(row)])]`): Discord owner
/// first, stored keys after, first-occurrence dedup, NO sort (TS never
/// sorts; the owner-list embed renders this exact order).
pub fn guild_owner_ids(owner_id: u64, stored: &[String]) -> Vec<String> {
    let mut ids: Vec<String> = Vec::with_capacity(stored.len() + 1);
    for id in std::iter::once(owner_id.to_string()).chain(stored.iter().cloned()) {
        if !ids.contains(&id) {
            ids.push(id);
        }
    }
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
        // Token shapes hold in any host TZ (expected built from
        // chrono::Local fields independently of format_date).
        use chrono::{Local, TimeZone};
        let dt = Local.timestamp_opt(1705321845, 0).single().unwrap();
        use chrono::{Datelike, Timelike};
        let expect = format!("{:04}-{:02}-{:02}", dt.year(), dt.month(), dt.day());
        assert_eq!(format_date(1705321845, "YYYY-MM-DD"), expect);
        // W6 slice 70 (node ground truth, TZ=Europe/Paris on ts=1705321845):
        // the TS /(YYYY|YY|MMM|MM|DD|ddd|HH|mm|ss)/g replace scans
        // longest-first, non-overlapping, case-sensitive:
        // "YYYYYY"->"202424", "MMMM"->"JanM", "dddd"->"Mond",
        // "sss"->"45s", "HHH"->"13H", "mmm"->"30m", "DDD"->"15D",
        // lowercase/"" pass through, "YYMMDD"->"240115".
        // Structural pins below derive TZ-varying fields from chrono::Local
        // so they hold under any host TZ; January + second 45 are global
        // for this timestamp (max civil offset keeps Jan, seconds are
        // TZ-invariant).
        let y4 = dt.year().to_string();
        let y2 = y4[y4.len().saturating_sub(2)..].to_string();
        let wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            [dt.weekday().num_days_from_sunday() as usize];
        assert_eq!(format_date(1705321845, "YYYYYY"), format!("{y4}{y2}"));
        assert_eq!(format_date(1705321845, "MMMM"), "JanM");
        assert_eq!(format_date(1705321845, "dddd"), format!("{wd}d"));
        assert_eq!(format_date(1705321845, "sss"), "45s");
        assert_eq!(format_date(1705321845, "HHH"), format!("{:02}H", dt.hour()));
        assert_eq!(
            format_date(1705321845, "mmm"),
            format!("{:02}m", dt.minute())
        );
        assert_eq!(format_date(1705321845, "DDD"), format!("{:02}D", dt.day()));
        assert_eq!(format_date(1705321845, "yyyy"), "yyyy");
        assert_eq!(format_date(1705321845, ""), "");
        assert_eq!(format_date(1705321845, "MmSs"), "MmSs");
        assert_eq!(format_date(1705321845, "ssSS"), "45SS");
        assert_eq!(format_date(1705321845, "dMMMy"), "dJany");
        assert_eq!(format_date(1705321845, "YYYY[Q]"), format!("{y4}[Q]"));
        assert_eq!(format_date(1705321845, "éMMMü"), "éJanü");
        assert_eq!(
            format_date(1705321845, "YYMMDD"),
            format!("{y2}{:02}{:02}", dt.month(), dt.day())
        );
        assert_eq!(
            format_date(1705321845, "YY/MMM"),
            format!("{:02}/Jan", (dt.year() % 100 + 100) % 100)
        );
        // Node ground truth on Europe/Paris (TS local getters):
        // 1705321845 -> "2024-01-15 Mon 13:30:45", 0 -> "1970-01-01 Thu 01:00:00",
        // 1690848000 -> "2023-08-01 Tue 02:00:00" (DST +2), -3600 -> "1970-01-01 Thu 00:00:00".
        // Gate on the host offset so the suite stays green under any TZ.
        let jan_off = Local
            .timestamp_opt(1705321845, 0)
            .single()
            .unwrap()
            .offset()
            .local_minus_utc();
        if jan_off == 3600 {
            assert_eq!(
                format_date(1705321845, "YYYY-MM-DD ddd HH:mm:ss"),
                "2024-01-15 Mon 13:30:45"
            );
            assert_eq!(
                format_date(0, "YYYY-MM-DD ddd HH:mm:ss"),
                "1970-01-01 Thu 01:00:00"
            );
            assert_eq!(
                format_date(-3600, "YYYY-MM-DD ddd HH:mm:ss"),
                "1970-01-01 Thu 00:00:00"
            );
            assert_eq!(format_date(1705321845, "DD/MM/YYYY"), "15/01/2024");
        }
        let aug_off = Local
            .timestamp_opt(1690848000, 0)
            .single()
            .unwrap()
            .offset()
            .local_minus_utc();
        if aug_off == 7200 {
            assert_eq!(
                format_date(1690848000, "YYYY-MM-DD ddd HH:mm:ss"),
                "2023-08-01 Tue 02:00:00"
            );
        }
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
        // JS `!base`: whitespace-only is truthy, builds verbatim (node probe).
        assert_eq!(
            gateway_url("   ", GatewayMethod::UserInfo).unwrap(),
            "   /api/ihorizon/v1/userinfo"
        );
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
        // Whitespace-only local is truthy in TS: wins over public (node probe).
        assert_eq!(
            gateway_internal_url(
                Some("   "),
                Some("https://gateway.ihorizon.org"),
                GatewayMethod::UserInfo
            )
            .unwrap(),
            "   /api/ihorizon/v1/userinfo"
        );
    }

    #[test]
    fn owner_sets() {
        // Order mirrors `[...new Set([ownerId, ...keys])]`: Discord
        // owner first, stored after, first-occurrence dedup, no sort
        // (string sort would put "10" before "9").
        assert_eq!(
            guild_owner_ids(1, &["2".to_string(), "1".to_string()]),
            vec!["1".to_string(), "2".to_string()]
        );
        assert_eq!(
            guild_owner_ids(9, &["10".to_string(), "2".to_string()]),
            vec!["9".to_string(), "10".to_string(), "2".to_string()]
        );
        assert!(is_bot_owner(7, &["7".to_string()]));
        assert!(!is_bot_owner(8, &["7".to_string()]));
        // W6 slice 77 (node ground truth: Array.includes is strict
        // string equality, so non-canonical spellings miss on both
        // sides — Rust formats the u64 canonically, TS compares the
        // raw caller string; reachable inputs are canonical either
        // way). Leading-zero / whitespace / empty-list legs miss;
        // dup-list and full-snowflake legs hit.
        assert!(!is_bot_owner(7, &["007".to_string()]));
        assert!(!is_bot_owner(7, &[" 7".to_string()]));
        assert!(!is_bot_owner(7, &["7 ".to_string()]));
        assert!(!is_bot_owner(7, &[]));
        assert!(is_bot_owner(7, &["7".to_string(), "7".to_string()]));
        assert!(is_bot_owner(
            999449972615413861,
            &["999449972615413861".to_string()]
        ));
        assert_eq!(guild_owner_ids(5, &[]), vec!["5".to_string()]);
        assert_eq!(
            guild_owner_ids(1, &["1".to_string(), "1".to_string()]),
            vec!["1".to_string()]
        );
    }
}

// ---- sanitizeInteractionOptionValue ----

/// Sensitive option redactor. Mirrors sanitizeInteractionOptionValue.ts
/// ([REDACTED] for password/token/api keys/secrets, else the value).
/// Exactness note: TS lowercases with full-Unicode `toLowerCase` (not
/// ASCII-only), so e.g. KELVIN SIGN (U+212A) folds to `k` and
/// `to<k>ven` normalizes to `token` (node ground truth). The
/// `/[^a-z0-9]/g` strip then drops the rest, like the filter below.
pub fn sanitize_option(option_name: &str, option_value: &str) -> String {
    let normalized: String = option_name
        .to_lowercase()
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

/// Daily/weekly/monthly stamp partition. Mirrors the bucket legs of
/// userStatsUtils.ts calculateMessageTime/calculateVoiceActivity
/// (`>= now - timeout`, cumulative nesting, input order kept).
/// Delta: TS compares f64 timestamps, the mirror i64 (live stamps are
/// integer Date.now()/DB values; fractional-boundary truncation noted
/// in test `buckets_partition`).
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

/// OAuth2 link renderer. Mirrors `createOauth2LinkWithGuild`
/// (authRestoreHelper.ts:108-119): sequential single-occurrence
/// `.replace` in template order `{client_id}`, `{guild_id}`,
/// `{redirect_uri}`, `{scope}` — NOT the parameter order. Each leg
/// replaces the FIRST occurrence only, so an earlier-injected value
/// can capture a later leg when it sits before the template marker
/// in the string (node ground truth: client `C{scope}C` consumes the
/// scope leg, leaving the template `{scope}` literal), while a value
/// injected after its leg keeps the marker verbatim (redirect holding
/// `{guild_id}`, scope holding `{guild_id}`). Rust `str::replace`
/// never rescans replacement text, so single-occurrence template
/// markers make `replacen(.., 1)` exactly equivalent.
pub fn oauth2_link(client_id: &str, redirect_uri: &str, scope: &str, guild_id: &str) -> String {
    "https://discord.com/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&state={guild_id}"
        .replacen("{client_id}", client_id, 1)
        .replacen("{guild_id}", guild_id, 1)
        .replacen("{redirect_uri}", redirect_uri, 1)
        .replacen("{scope}", scope, 1)
}

// ---- encryptDecryptMethod AES-256-GCM ----

/// Node `Buffer.from(s, "hex")` semantics, pinned by node ground truth:
/// byte pairs are parsed until the first non-hex pair (an odd trailing
/// nibble is dropped); the result is truncated, never an error
/// (`"aazzbb"` -> `[0xaa]`, `"abc"` -> `[0xab]`, uppercase accepted).
fn node_hex_bytes(s: &str) -> Vec<u8> {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len() / 2);
    let mut i = 0;
    while i + 1 < b.len() {
        match ((b[i] as char).to_digit(16), (b[i + 1] as char).to_digit(16)) {
            (Some(hi), Some(lo)) => out.push((hi * 16 + lo) as u8),
            _ => break,
        }
        i += 2;
    }
    out
}

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
/// The TS `const [a, b, c, d] = data.split(":")` destructure ignores extra
/// segments, and `Buffer.from(x, "hex")` truncates (never throws), so only
/// a missing segment or a non-12B nonce (createDecipheriv throws, caught)
/// yields undefined.
pub fn decrypt_text(password: &str, data: &str) -> Option<String> {
    use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit};
    let mut parts = data.split(':');
    let (salt_hex, iv_hex, ct_hex, tag_hex) =
        (parts.next()?, parts.next()?, parts.next()?, parts.next()?);
    let (salt, iv, ct, tag) = (
        node_hex_bytes(salt_hex),
        node_hex_bytes(iv_hex),
        node_hex_bytes(ct_hex),
        node_hex_bytes(tag_hex),
    );
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<sha2::Sha256>(password.as_bytes(), &salt, 100_000, &mut key);
    let cipher = Aes256Gcm::new_from_slice(&key).ok()?;
    if iv.len() != 12 {
        return None;
    }
    let nonce = aes_gcm::Nonce::from_slice(&iv);
    let mut payload = ct;
    payload.extend_from_slice(&tag);
    let pt = cipher.decrypt(nonce, payload.as_slice()).ok()?;
    String::from_utf8(pt).ok()
}

// ---- os_utils.niceBytes ----

/// JS `Number.prototype.toFixed(0)` for finite non-negative `v`:
/// round-half-up (Rust `round` is half-away-from-zero, identical for
/// `v >= 0`), rendered with no decimal point. Rust `{:.0}` would use
/// banker's rounding (`10.5` -> `"10"`); TS gives `"11"`.
fn js_to_fixed_0(v: f64) -> String {
    format!("{}", v.round())
}

/// JS `toFixed(2)` for finite non-negative `v`: scale, half-up round,
/// then render two digits. Scaling first reproduces the TS quirk where
/// binary-near-halves stay down (`2.675` -> `"2.67"`, like TS).
fn js_to_fixed_2(v: f64) -> String {
    format!("{:.2}", (v * 100.0).round() / 100.0)
}

pub fn nice_bytes(kb: f64) -> String {
    // Byte formatter. Mirrors niceBytes.ts (input unit is KB, like os.freemem).
    // TS renders the degenerate path (`kb <= 0`, NaN: `units[-Inf]` /
    // `units[NaN]` is `undefined`, `bytes` is NaN) as the literal
    // `"NaN undefined"` (node ground truth: 0/-1/NaN). Infinity flows
    // through to `"Infinity YB"`.
    if kb <= 0.0 || kb.is_nan() {
        return "NaN undefined".to_string();
    }
    let units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let idx = ((kb * 1024.0).log(1024.0).floor() as usize).min(units.len() - 1);
    let bytes = (kb * 1024.0) / 1024f64.powi(idx as i32);
    if !bytes.is_finite() {
        return format!("Infinity {}", units[idx]);
    }
    if bytes < 10.0 && idx > 0 {
        format!("{} {}", js_to_fixed_2(bytes), units[idx])
    } else {
        format!("{} {}", js_to_fixed_0(bytes), units[idx])
    }
}

// ---- random.ts generatePassword ----

/// Password options. Mirrors PasswordOptions (symbols is
/// `boolean | string`: true maps to the default set, a string is a
/// verbatim custom charset, false/"" disables symbols).
#[derive(Debug, Clone, Default)]
pub enum SymbolCharset {
    #[default]
    Off,
    Default,
    Custom(String),
}

#[derive(Debug, Clone)]
pub struct PasswordOptions {
    pub length: usize,
    pub numbers: bool,
    pub symbols: SymbolCharset,
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
/// Index-domain delta (unreachable, documented): the TS pool is a
/// UTF-16 string and both the per-char draw
/// (`characters[byte % characters.length]`) and the strict patch-up
/// (`chars[randomInt(0, chars.length)]`) index UTF-16 units, so a
/// non-BMP custom symbol can emit a lone surrogate and `length` counts
/// units; the Rust pool is `Vec<char>`, so draws are always whole
/// chars and `length` counts chars. Pool assembly itself (order,
/// exclude unit-splitting, ASCII-only similar-filter) agrees exactly —
/// and no TS caller passes non-BMP custom symbols (all 7 call sites
/// use the default/boolean sets), so live passwords are identical.
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
            if !out.iter().any(|c| class.contains(c)) {
                let pos = secure_index(opts.length);
                out[pos] = class[secure_index(class.len())];
            }
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
            if !out.iter().any(|c| class.contains(c)) {
                let pos = (next() as usize) % opts.length;
                out[pos] = class[(next() as usize) % class.len()];
            }
        }
    }
    Ok(out.into_iter().collect())
}

/// Character pool + per-class alphabets for the password generators.
/// Mirrors the charSets/exclude/excludeSimilarCharacters assembly in
/// random.ts (symbols === true maps to "!@#$%^&*()_+=", a string is
/// used verbatim, "" counts as off like the TS falsy check; class
/// alphabets stay pre-exclusion like the TS strict requirements).
/// Error strings are the TS French literals verbatim.
fn password_pool(opts: &PasswordOptions) -> Result<(Vec<char>, Vec<Vec<char>>), &'static str> {
    if opts.length == 0 {
        return Err("La longueur doit être positive");
    }
    let symbols_on = !matches!(opts.symbols, SymbolCharset::Off)
        && !matches!(opts.symbols, SymbolCharset::Custom(ref s) if s.is_empty());
    if !(opts.lowercase || opts.uppercase || opts.numbers || symbols_on) {
        return Err("Au moins un type de caractère doit être activé");
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
    match &opts.symbols {
        SymbolCharset::Default => classes.push("!@#$%^&*()_+=".to_string()),
        SymbolCharset::Custom(s) if !s.is_empty() => classes.push(s.clone()),
        SymbolCharset::Off | SymbolCharset::Custom(_) => {}
    }
    let mut pool: String = classes.concat();
    if !opts.exclude.is_empty() {
        pool.retain(|c| !opts.exclude.contains(c));
    }
    if opts.exclude_similar {
        pool.retain(|c| !"il1Lo0O".contains(c));
    }
    if pool.is_empty() {
        return Err("Pas de caractères disponibles après exclusions");
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
        return Err("Le nombre de mots de passe doit être positif");
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
///
/// Node ground truth (W6 slice 79): `Date.now()` before/after one
/// `metasTable.get("LAST_WRITE")`, errors swallowed by try/catch, elapsed
/// returned verbatim (normal read -> 0, throwing read -> 0, 25ms read ->
/// 25, always an integer >= 0). The Rust port reads the missing
/// `__ping__/__ping__` key instead (no metas table exists in db.rs; both
/// are a single KV read round-trip) and `kv_get` already folds errors to
/// `None`, matching the try/catch swallow leg. `Instant` (monotonic)
/// replaces `Date.now()` (wall clock) so a mid-await NTP backstep cannot
/// yield a negative diff; `.as_millis()` truncates to integer ms like
/// `Date.now()`. TS upstream has zero callers (dead helper); the single
/// Rust caller is the legacy status shape.
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
    fn option_redaction_matches_ts_unicode_fold() {
        // Node ground truth: TS `toLowerCase` folds KELVIN SIGN (U+212A)
        // to `k`, so `to<k>ven` normalizes to `token` and is redacted;
        // ASCII-only lowering stripped it to `toen` (pass-through).
        assert_eq!(sanitize_option("to\u{212A}en", "hunter2"), "[REDACTED]");
        assert_eq!(sanitize_option("PASS", "hunter2"), "[REDACTED]");
        assert_eq!(sanitize_option("passage", "x"), "x");
    }

    #[test]
    fn buckets_partition() {
        let (d, w, m) = bucketize(&[95, 50, 5], 100, 10, 60, 1000);
        assert_eq!(d, vec![95]);
        assert_eq!(w, vec![95, 50]);
        assert_eq!(m, vec![95, 50, 5]);
        // Node ground truth for userStatsUtils.ts calculateMessageTime /
        // calculateVoiceActivity bucket legs (`>=` lower-bound inclusive,
        // cumulative nesting, input order kept, no sort): exact-boundary
        // stamps land in the bucket, just-below miss, future stamps land
        // everywhere, zero timeouts keep only exact-now, negative
        // timeouts gate above now, empty input yields three empties.
        // Delta (doc-noted): TS compares f64 timestamps, the mirror i64 —
        // fractional stamps near a boundary can differ by truncation
        // (e.g. stamp 90.5 vs gate 90.9 misses in TS, hits truncated);
        // live stamps are integer Date.now()/DB values, unreachable.
        let (d, w, m) = bucketize(&[90, 40, 0], 100, 10, 60, 100);
        assert_eq!(d, vec![90]);
        assert_eq!(w, vec![90, 40]);
        assert_eq!(m, vec![90, 40, 0]);
        let (d, w, m) = bucketize(&[150, 200], 100, 10, 60, 1000);
        assert_eq!(d, vec![150, 200]);
        assert_eq!(w, vec![150, 200]);
        assert_eq!(m, vec![150, 200]);
        let (d, w, m) = bucketize(&[100], 100, 0, 0, 0);
        assert_eq!(d, vec![100]);
        assert_eq!(w, vec![100]);
        assert_eq!(m, vec![100]);
        let (d, w, m) = bucketize(&[50], 100, 0, 0, 0);
        assert!(d.is_empty() && w.is_empty() && m.is_empty());
        let (d, w, m) = bucketize(&[50], 100, -10, -5, 1000);
        assert!(d.is_empty() && w.is_empty());
        assert_eq!(m, vec![50]);
        let (d, w, m) = bucketize(&[], 100, 10, 60, 1000);
        assert!(d.is_empty() && w.is_empty() && m.is_empty());
        let (d, w, m) = bucketize(&[5, 50, 95], 100, 10, 60, 1000);
        assert_eq!(d, vec![95]);
        assert_eq!(w, vec![50, 95]);
        assert_eq!(m, vec![5, 50, 95]);
    }

    #[test]
    fn oauth_link_renders() {
        let u = oauth2_link("1", "https://x/cb", "identify", "9");
        assert!(u.contains("client_id=1") && u.contains("state=9"));
    }

    #[test]
    fn oauth2_link_matches_ts_replace_order() {
        // Node ground truth for `createOauth2LinkWithGuild` (sequential
        // first-only `.replace`, template order client/guild/redirect/scope).
        assert_eq!(
            oauth2_link("123", "https://gw/cb", "identify+guilds+guilds.join", "456"),
            "https://discord.com/oauth2/authorize?client_id=123&redirect_uri=https://gw/cb&response_type=code&scope=identify+guilds+guilds.join&state=456"
        );
        // Redirect injected after the guild leg: its `{guild_id}` survives.
        assert_eq!(
            oauth2_link("123", "https://gw/{guild_id}/cb", "identify", "456"),
            "https://discord.com/oauth2/authorize?client_id=123&redirect_uri=https://gw/{guild_id}/cb&response_type=code&scope=identify&state=456"
        );
        // Client value sits before the template scope marker, so it
        // captures the single scope leg; the template `{scope}` stays.
        assert_eq!(
            oauth2_link("C{scope}C", "https://gw/cb", "identify", "456"),
            "https://discord.com/oauth2/authorize?client_id=CidentifyC&redirect_uri=https://gw/cb&response_type=code&scope={scope}&state=456"
        );
        // Scope injected after the guild leg: its `{guild_id}` survives.
        assert_eq!(
            oauth2_link("123", "https://gw/cb", "S{guild_id}S", "456"),
            "https://discord.com/oauth2/authorize?client_id=123&redirect_uri=https://gw/cb&response_type=code&scope=S{guild_id}S&state=456"
        );
        // Guild value holding a later marker: the scope leg hits the
        // template marker first (earlier string position), so the
        // injected copy survives — same as TS.
        assert_eq!(
            oauth2_link("123", "https://gw/cb", "identify", "G{scope}G"),
            "https://discord.com/oauth2/authorize?client_id=123&redirect_uri=https://gw/cb&response_type=code&scope=identify&state=G{scope}G"
        );
    }

    #[test]
    fn bytes_format() {
        assert_eq!(nice_bytes(0.5), "512 bytes");
        assert_eq!(nice_bytes(2048.0), "2.00 MB");
        // Node ground-truth battery for niceBytes.ts.
        assert_eq!(nice_bytes(0.0), "NaN undefined");
        assert_eq!(nice_bytes(-1.0), "NaN undefined");
        assert_eq!(nice_bytes(f64::NAN), "NaN undefined");
        assert_eq!(nice_bytes(f64::INFINITY), "Infinity YB");
        assert_eq!(nice_bytes(1.0), "1.00 KB");
        assert_eq!(nice_bytes(1023.0), "1023 KB");
        assert_eq!(nice_bytes(1024.0), "1.00 MB");
        assert_eq!(nice_bytes(1048575.0), "1024 MB");
        assert_eq!(nice_bytes(1048576.0), "1.00 GB");
        assert_eq!(nice_bytes(1073741824.0), "1.00 TB");
        assert_eq!(nice_bytes(1536.0), "1.50 MB");
        // toFixed(0) is half-up ("11"), not banker's ("10").
        assert_eq!(nice_bytes(10.5), "11 KB");
        assert_eq!(nice_bytes(9.5), "9.50 KB");
    }

    #[test]
    fn multiple_passwords_match_ts() {
        let opts = PasswordOptions {
            length: 16,
            numbers: true,
            symbols: SymbolCharset::Off,
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
            symbols: SymbolCharset::Default,
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
            symbols: SymbolCharset::Off,
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
            symbols: SymbolCharset::Default,
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
            symbols: SymbolCharset::Off,
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
    fn custom_symbols_charset_used_verbatim() {
        // symbols: "abc" (string leg) uses the string as the charset,
        // like `symbols === true ? default : symbols as string`.
        let custom = PasswordOptions {
            length: 24,
            numbers: false,
            symbols: SymbolCharset::Custom("@#".to_string()),
            lowercase: true,
            uppercase: false,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        };
        let pw = generate_password_seeded(&custom, 7).unwrap();
        assert_eq!(pw.chars().count(), 24);
        assert!(pw
            .chars()
            .all(|c| c.is_ascii_lowercase() || c == '@' || c == '#'));
        // "" counts as off (TS falsy check): pure lowercase pool.
        let empty_custom = PasswordOptions {
            symbols: SymbolCharset::Custom(String::new()),
            ..custom.clone()
        };
        let pw2 = generate_password_seeded(&empty_custom, 7).unwrap();
        assert!(pw2.chars().all(|c| c.is_ascii_lowercase()));
    }

    #[test]
    fn strict_patches_only_missing_classes() {
        // Single-class pool: the class is always present, so strict must
        // be a no-op — same seed gives the identical string with and
        // without strict (the old code always overwrote a position).
        let base = PasswordOptions {
            length: 16,
            numbers: false,
            symbols: SymbolCharset::Off,
            lowercase: true,
            uppercase: false,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        };
        let strict = PasswordOptions {
            strict: true,
            ..base.clone()
        };
        assert_eq!(
            generate_password_seeded(&base, 99).unwrap(),
            generate_password_seeded(&strict, 99).unwrap()
        );
    }

    #[test]
    fn password_errors_match_ts_french_literals() {
        let base = PasswordOptions {
            length: 8,
            numbers: true,
            symbols: SymbolCharset::Off,
            lowercase: true,
            uppercase: true,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        };
        assert_eq!(
            generate_password(
                &PasswordOptions {
                    length: 0,
                    ..base.clone()
                },
                1
            )
            .unwrap_err(),
            "La longueur doit être positive"
        );
        assert_eq!(
            generate_password(
                &PasswordOptions {
                    numbers: false,
                    symbols: SymbolCharset::Off,
                    lowercase: false,
                    uppercase: false,
                    ..base.clone()
                },
                1
            )
            .unwrap_err(),
            "Au moins un type de caractère doit être activé"
        );
        assert_eq!(
            generate_password(
                &PasswordOptions {
                    exclude: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                        .to_string(),
                    ..base.clone()
                },
                1
            )
            .unwrap_err(),
            "Pas de caractères disponibles après exclusions"
        );
        assert_eq!(
            generate_multiple_passwords(0, &base, 1).unwrap_err(),
            "Le nombre de mots de passe doit être positif"
        );
    }

    #[test]
    fn password_pool_handles_astral_custom_symbols_like_ts() {
        // Node ground truth (W6 slice 65): the TS pool is a UTF-16
        // string, so "A😀B" is 4 units while the Rust pool is 3 chars;
        // sampling indexes units there (a hit on either half emits a
        // lone surrogate — node: unit idx 2 is U+DE00) and chars here
        // (always whole). Pool assembly itself agrees exactly.
        let astral = PasswordOptions {
            length: 8,
            numbers: false,
            symbols: SymbolCharset::Custom("A😀B".to_string()),
            lowercase: false,
            uppercase: false,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        };
        let (pool, _) = password_pool(&astral).unwrap();
        assert_eq!(pool, vec!['A', '😀', 'B']);
        // exclude "😀" drops both TS halves == the one Rust char.
        let (no_emoji, _) = password_pool(&PasswordOptions {
            exclude: "😀".to_string(),
            ..astral.clone()
        })
        .unwrap();
        assert_eq!(no_emoji, vec!['A', 'B']);
        // excludeSimilarCharacters keeps astral (regex is ASCII-only).
        let (sim, _) = password_pool(&PasswordOptions {
            symbols: SymbolCharset::Custom("😀lO0".to_string()),
            exclude_similar: true,
            ..astral.clone()
        })
        .unwrap();
        assert_eq!(sim, vec!['😀']);
        // Seeded draws over an astral pool stay whole chars.
        let pw = generate_password_seeded(&astral, 7).unwrap();
        assert_eq!(pw.chars().count(), 8);
        assert!(pw.chars().all(|c| c == 'A' || c == '😀' || c == 'B'));
    }

    #[test]
    fn http_join_and_ok() {
        assert_eq!(join_url("", "/x"), "/x");
        assert_eq!(join_url("", ""), "");
        // JS `baseURL ? ... : url`: only "" is falsy; " ", "0", "\t" concat.
        assert_eq!(join_url(" ", "/x"), " /x");
        assert_eq!(join_url("0", "/x"), "0/x");
        assert_eq!(join_url("\t", "/x"), "\t/x");
        assert_eq!(join_url("base", "url"), "baseurl");
        // No slash normalization, no absolute-url override: plain concat.
        assert_eq!(join_url("http://a", "http://b/c"), "http://ahttp://b/c");
        assert_eq!(join_url("https://h//", "//p"), "https://h////p");
        assert_eq!(
            join_url("https://h\u{e9}llo.com", "/p?q=\u{e9}"),
            "https://h\u{e9}llo.com/p?q=\u{e9}"
        );
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
        // Empty pool: kv_get folds the missing key to None (== TS
        // try/catch swallow leg) and elapsed is still returned.
        let ms = database_latency(&pool).await;
        assert!(
            ms < 60_000,
            "in-memory round-trip must be instant, got {ms}ms"
        );
    }
}

// ---- intentEnabler ----

/// Privileged intent flags. Mirrors intentEnabler.ts constants exactly
/// (node ground truth: 1<<13 = 8192 GuildMembers, 1<<15 = 32768
/// MessageContent, 1<<19 = 524288 Presence; REQUIRED = 565248).
pub const INTENT_GUILD_MEMBERS: u64 = 1 << 13;
pub const INTENT_MESSAGE_CONTENT: u64 = 1 << 15;
pub const INTENT_PRESENCE: u64 = 1 << 19;
pub const REQUIRED_INTENTS: u64 = INTENT_GUILD_MEMBERS | INTENT_MESSAGE_CONTENT | INTENT_PRESENCE;

/// Missing-intent computation. Mirrors the flags diff in enableRequiredIntents.
pub fn missing_intents(current_flags: u64) -> u64 {
    REQUIRED_INTENTS & !current_flags
}

/// PATCH verdict leg. Mirrors `patched.flags === current -> warn + false`:
/// only an EXACTLY-unchanged numeric flags value means the API rejected
/// the update. A missing/non-numeric flags key (`undefined`/`null`/string/
/// NaN/object) is `!==` any number in TS, so it counts as changed -> true
/// (node ground truth: `0 vs undefined/null` -> true, `565248 vs "565248"`
/// -> true, `0 vs NaN/{}` -> true, `565248 vs 565248.0` -> false); the
/// `as_u64` fold at the call site maps exactly those shapes to None, and
/// integral floats through `Some` like `===`.
pub fn patch_verdict(current: u64, patched_flags: Option<u64>) -> bool {
    !matches!(patched_flags, Some(f) if f == current)
}

/// Enable privileged intents on the application. Mirrors enableRequiredIntents
/// (GET then PATCH /applications/@me). Returns true when all set.
/// Deltas (doc-noted): `data.flags ?? 0` keeps hostile non-null shapes
/// (TS coerces them via ToInt32 in the `&`/`|` ops) while the mirror
/// folds non-u64 to 0; `updated = current | REQUIRED` uses u64 OR while
/// TS ToInt32-wraps past 2^31 (`1<<31 | R` -> negative, `2^32 | R` -> R)
/// — unreachable, real Discord flag words are small ints; negative or
/// fractional `current` is unrepresentable past the `u64` signature.
/// Non-2xx bodies are rejected
/// before parsing like TS `!res.ok`, so an error payload carrying a
/// `flags` key can no longer trigger a PATCH.
pub async fn enable_required_intents(token: &str) -> bool {
    let client = reqwest::Client::new();
    let res = match client
        .get("https://discord.com/api/v10/applications/@me")
        .header("Authorization", format!("Bot {token}"))
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return false,
    };
    if !res.status().is_success() {
        return false;
    }
    let info: serde_json::Value = match res.json().await {
        Ok(v) => v,
        Err(_) => return false,
    };
    let current = info.get("flags").and_then(|f| f.as_u64()).unwrap_or(0);
    if missing_intents(current) == 0 {
        return true;
    }
    let updated = current | REQUIRED_INTENTS;
    let patch = match client
        .patch("https://discord.com/api/v10/applications/@me")
        .header("Authorization", format!("Bot {token}"))
        .json(&serde_json::json!({"flags": updated}))
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return false,
    };
    if !patch.status().is_success() {
        return false;
    }
    let patched: serde_json::Value = match patch.json().await {
        Ok(v) => v,
        Err(_) => return false,
    };
    patch_verdict(current, patched.get("flags").and_then(|f| f.as_u64()))
}

// ---- helper.ts ----

/// Capitalize first letter. Mirrors capitalizeFirstLetter
/// (`charAt(0).toUpperCase() + slice(1)`): `charAt(0)` sees a single
/// UTF-16 unit, so an astral leading char hits a lone surrogate whose
/// `toUpperCase()` is a no-op and the pair rejoins via `slice(1)` —
/// astral-first strings are returned unchanged. Rust `&str` cannot hold
/// lone surrogates, so "first char needs 2 UTF-16 units => identity" is
/// exactly equivalent.
pub fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) if c.len_utf16() == 2 => s.to_string(),
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
    // Faithful to the TS loop: split("\n") lines, first two ":" segments,
    // skip on empty key/value, store under the JS-trimmed key, value is
    // parseInt(value.trim().split(/\s+/)[0], 10).
    for line in body.split('\n') {
        let mut segs = line.split(':');
        let (Some(key), Some(value)) = (segs.next(), segs.next()) else {
            continue;
        };
        if key.is_empty() || value.is_empty() {
            continue;
        }
        let token = value
            .trim_matches(is_js_whitespace)
            .split(is_js_whitespace)
            .next();
        let v = meminfo_value(token);
        match key.trim_matches(is_js_whitespace) {
            "MemTotal" => info.total = v,
            "MemFree" => info.free = v,
            "MemAvailable" => info.available = v,
            _ => {}
        }
    }
    info
}

/// `parseInt(token, 10)` prefix semantics for one meminfo value: an
/// optional single `+`/`-` sign, then the longest leading ASCII-digit
/// run. An empty run (or a missing token) is TS `NaN` — reported here
/// as 0 since the struct holds `u64`. A leading `-` would be negative
/// in TS — saturates to 0 (the kernel never writes negatives).
/// Over-long runs saturate to `u64::MAX` (TS yields an `f64`
/// approximation). Hex/octal/binary prefixes parse as TS does:
/// `0x10`/`0b101` stop at the first non-digit and yield 0.
fn meminfo_value(token: Option<&str>) -> u64 {
    let Some(t) = token else { return 0 };
    let (neg, rest) = match t.strip_prefix('-') {
        Some(r) => (true, r),
        None => (false, t.strip_prefix('+').unwrap_or(t)),
    };
    let run_len = rest.bytes().take_while(|b| b.is_ascii_digit()).count();
    if run_len == 0 {
        return 0; // TS NaN
    }
    let v: u64 = rest[..run_len].parse().unwrap_or(u64::MAX);
    if neg {
        0
    } else {
        v
    }
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
        // Node ground truth (W6 slice 44): 1<<13 | 1<<15 | 1<<19.
        assert_eq!(INTENT_GUILD_MEMBERS, 8192);
        assert_eq!(INTENT_MESSAGE_CONTENT, 32768);
        assert_eq!(INTENT_PRESENCE, 524288);
        assert_eq!(REQUIRED_INTENTS, 565248);
        // Flag-diff battery: empty -> all needed; message-content-only
        // still needs GuildMembers + Presence (532480).
        assert_eq!(missing_intents(32768), 565248 & !32768);
        assert_eq!(missing_intents(32768), 532480);
        assert_eq!(32768 | REQUIRED_INTENTS, 565248);
        // PATCH verdict leg: only an exactly-unchanged numeric flags value
        // means rejection -> false; a missing/non-numeric flags key is `!==`
        // any number in TS -> true (old code returned false on None).
        assert!(!patch_verdict(565248, Some(565248)));
        assert!(patch_verdict(0, None));
        assert!(patch_verdict(0, Some(565248)));
        assert!(patch_verdict(32768, Some(565248)));
        // W6 slice 92 battery (node ground truth, `REQUIRED & ~current` is
        // low-32-bit-exact on the whole u64 domain since REQUIRED < 2^31):
        // single-bit legs, near-miss 565247, extra-bit passthrough.
        assert_eq!(missing_intents(8192), 557056);
        assert_eq!(missing_intents(524288), 40960);
        assert_eq!(missing_intents(565247), 8192);
        assert_eq!(missing_intents(1 << 20), 565248);
        assert_eq!(missing_intents(5), 565248);
        // High-bit legs: bits >= 32 never intersect REQUIRED, so the u64
        // mirror agrees with the TS ToInt32 path exactly.
        assert_eq!(missing_intents(1 << 32), 565248);
        assert_eq!(missing_intents((1 << 32) + 8192), 557056);
        assert_eq!(missing_intents((1 << 32) + 565248), 0);
        assert_eq!(missing_intents(1 << 53), 565248);
        assert_eq!(missing_intents(u64::MAX), 0);
    }

    #[test]
    fn capitalize() {
        assert_eq!(capitalize_first("hello"), "Hello");
        assert_eq!(capitalize_first(""), "");
        // node ground truth for `charAt(0).toUpperCase() + slice(1)`:
        assert_eq!(capitalize_first("ßabc"), "SSabc");
        assert_eq!(capitalize_first("éclair"), "Éclair");
        // astral-first: charAt(0) is a lone surrogate (toUpperCase no-op).
        assert_eq!(capitalize_first("😀abc"), "😀abc");
        assert_eq!(capitalize_first("𐐨bc"), "𐐨bc");
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
        // Node ground truth (os_utils.ts getMemoryInfo Linux leg):
        // parseInt prefix semantics, first-two-colon-segments, empty
        // key/value skip. NaN/negative/overflow legs saturate to 0/MAX
        // (u64 cannot hold TS NaN/negatives/f64 approximations).
        assert_eq!(parse_meminfo("MemTotal: 123abc kB\n").total, 123);
        assert_eq!(parse_meminfo("MemTotal: 12.9 kB\n").total, 12);
        assert_eq!(parse_meminfo("MemTotal: 1e5 kB\n").total, 1);
        assert_eq!(parse_meminfo("MemTotal: 0x10 kB\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal: 0b101 kB\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal: abc kB\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal:    \n").total, 0);
        assert_eq!(parse_meminfo("MemTotal:\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal: -5 kB\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal: +42 kB\n").total, 42);
        assert_eq!(parse_meminfo("MemTotal: --5 kB\n").total, 0);
        assert_eq!(
            parse_meminfo("MemTotal: 99999999999999999999999 kB\n").total,
            u64::MAX
        );
        assert_eq!(parse_meminfo("MemTotal : 100 kB\n").total, 100);
        assert_eq!(parse_meminfo("  MemTotal: 100 kB\n").total, 100);
        assert_eq!(parse_meminfo("MemTotal: 1:2\n").total, 1);
        assert_eq!(parse_meminfo(": 123\n").total, 0);
        // Later duplicate keys win, like the TS record overwrite.
        assert_eq!(parse_meminfo("MemTotal: 1 kB\nMemTotal: 2 kB\n").total, 2);
        // Node ground truth (W6 slice 94, 20-case battery replicating the
        // Linux leg verbatim): first-two-colon-segments, JS-trim/split
        // legs, case-sensitive keys.
        assert_eq!(parse_meminfo("MemTotal:: 5\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal:\t4096\tkB\n").total, 4096);
        assert_eq!(parse_meminfo("MemTotal:\u{a0}100 kB\n").total, 100);
        assert_eq!(parse_meminfo("memtotal: 100 kB\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal 100 kB\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal:\n").total, 0);
        assert_eq!(parse_meminfo(":\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal:\u{b}77 kB\n").total, 77);
        assert_eq!(parse_meminfo("MemTotal:\u{c}88 kB\n").total, 88);
        assert_eq!(parse_meminfo("\tMemTotal\t: 55 kB\n").total, 55);
        assert_eq!(parse_meminfo("MemTotal:    66    kB\n").total, 66);
        assert_eq!(parse_meminfo("MemTotal\u{c}: 123 kB\n").total, 123);
        assert_eq!(parse_meminfo("MemTotal: 0 kB\n").total, 0);
        assert_eq!(parse_meminfo("MemTotal: +42 kB\n").total, 42);
        // Documented deltas (u64 cannot hold TS NaN/negatives/f64): TS
        // yields NaN on whitespace-only/garbage values (`?? 0` keeps NaN),
        // -5 on negatives, 1e+23 on the 23-digit run; the mirror reports
        // 0/0/u64::MAX. Unreachable: the kernel always writes clean
        // non-negative integers that fit in u64.
        assert_eq!(parse_meminfo("MemTotal:   \n").total, 0);
        assert_eq!(parse_meminfo("MemTotal: abc kB\n").total, 0);
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
        // Node ground truth (W6 slice 74): plain template concat, no
        // normalization (dots/empties pass through); boundary +1ms is
        // active, future fetch is active, zero/negative windows idle.
        assert_eq!(cooldown_key("a.b", "c"), "COOLDOWN.a.b.c");
        assert_eq!(cooldown_key("", ""), "COOLDOWN..");
        assert!(cooldown_active(Some(1000), 1001, 2000));
        assert!(cooldown_active(Some(2000), 100, 1000));
        assert!(!cooldown_active(Some(1000), 0, 1000));
        assert!(!cooldown_active(Some(1000), -5, 1000));
        assert!(cooldown_active(Some(0), 100, 50));
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

/// Random asset URL from a manifest `paths` list. Mirrors
/// apiUrlParser.assetsFinder (valid index into `paths`, never a
/// constructed `/{n}.gif` — no off-by-one, no skipped siblings).
/// Empty list emits `""`, which the caller maps straight to the
/// `fun_var_down_api` reply (same leg the TS reachability catch hits
/// on a 404). One xorshift64* step picks the index; the seed stream
/// itself is unseedable, so only the in-range property is portable.
pub fn assets_url(paths: &[String], seed: u64) -> String {
    if paths.is_empty() {
        return String::new();
    }
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    state ^= state << 13;
    state ^= state >> 7;
    state ^= state << 17;
    let n = (state % paths.len() as u64) as usize;
    paths[n].clone()
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
    fn expressions_match_ts_table_order_and_urls() {
        // Node ground truth (randomExpression.ts): Object.keys insertion order
        // is Blushed..Wink and each value is baseUrl + path with
        // baseUrl = "https://www.ihorizon.org". expression_url must join
        // identically; the draw stream itself is unseedable in TS
        // (Math.random), so only table order + URL join + in-range index
        // are portable. Neither side's random pick has live callers (TS
        // default export uncalled; fixed named thumbnails only).
        let names: Vec<&str> = EXPRESSIONS.iter().map(|(n, _)| *n).collect();
        assert_eq!(
            names,
            [
                "Blushed",
                "Grimacing",
                "Grin",
                "Nerd",
                "Overhappy",
                "Pleading",
                "Sob",
                "Sunglass",
                "Thinking",
                "Wink"
            ]
        );
        for (name, path) in EXPRESSIONS {
            assert_eq!(
                expression_url(name),
                format!("https://www.ihorizon.org{path}"),
                "url join for {name}"
            );
        }
        assert_eq!(
            expression_url("Nerd"),
            "https://www.ihorizon.org/assets/img/bot/expression/ihorizon_nerd.png"
        );
        assert_eq!(
            expression_url("Sob"),
            "https://www.ihorizon.org/assets/img/bot/expression/ihorizon_sob.png"
        );
        assert_eq!(expression_url("Nope"), "");
        // Seeded draws always land in range on a known table entry.
        for seed in [0u64, 1, 7, 42, 999, u64::MAX] {
            let (name, path) = random_expression(seed);
            assert!(EXPRESSIONS.iter().any(|(n, _)| n == &name));
            assert!(path.ends_with(".png"));
        }
    }

    #[test]
    fn assets_url_shape() {
        let paths: Vec<String> = (1..=10)
            .map(|n| format!("https://www.ihorizon.org/cdn/hug/{n}.gif"))
            .collect();
        // Picked URL is always a member of the manifest list.
        let u = assets_url(&paths, 3);
        assert!(paths.contains(&u));
        // Empty list emits no usable URL: the caller maps "" straight
        // to the `fun_var_down_api` reply (same leg the TS
        // reachability catch hits on a 404).
        assert_eq!(assets_url(&[], 3), "");
        assert_eq!(assets_url(&[], 0), "");
        // Single-entry list pins the pick for any seed.
        let one = vec!["https://www.ihorizon.org/cdn/kiss/1.gif".to_string()];
        assert_eq!(assets_url(&one, 999), one[0]);
        // Index stays inside the list across seeds (never 0.gif-style
        // construction, never out of range).
        for seed in 1..=50u64 {
            let v = assets_url(&paths, seed);
            assert!(paths.contains(&v), "seed {seed} gave {v}");
        }
    }

    #[test]
    fn logs_channel_match() {
        // Node ground truth (ihorizon_logs.ts): `.find((c) =>
        // c.name.includes("ihorizon-logs"))` -- case-sensitive substring,
        // first match in cache order. Rust `str::contains` is byte-substring,
        // which equals UTF-16 `includes` for this pure-ASCII needle on every
        // input (ASCII bytes never occur inside multi-byte sequences; Rust
        // strings hold no lone surrogates).
        let chans = vec![(1, "general".to_string()), (2, "ihorizon-logs".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(2));
        assert_eq!(logs_channel_id(&[]), None);
        // Case: no folding either side.
        let chans = vec![(1, "IHORIZON-LOGS".to_string())];
        assert_eq!(logs_channel_id(&chans), None);
        let chans = vec![(1, "Ihorizon-Logs".to_string())];
        assert_eq!(logs_channel_id(&chans), None);
        // Substring anywhere.
        let chans = vec![(1, "xihorizon-logs".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(1));
        let chans = vec![(1, "ihorizon-logs-2".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(1));
        let chans = vec![(1, "pre-ihorizon-logs-post".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(1));
        let chans = vec![(1, " ihorizon-logs".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(1));
        // First match wins, in order.
        let chans = vec![
            (1, "ihorizon-log".to_string()),
            (2, "ihorizon-logs".to_string()),
        ];
        assert_eq!(logs_channel_id(&chans), Some(2));
        let chans = vec![
            (1, "ihorizon-logs".to_string()),
            (2, "ihorizon-logs-2".to_string()),
        ];
        assert_eq!(logs_channel_id(&chans), Some(1));
        // Near-misses.
        for name in ["ihorizonlogs", "ihorizon--logs", "", "logs"] {
            let chans = vec![(1, name.to_string())];
            assert_eq!(logs_channel_id(&chans), None, "near-miss {name:?}");
        }
        // Non-ASCII haystacks: needle still found / still case-sensitive.
        let chans = vec![(1, "g\u{e9}n\u{e9}ral-ihorizon-logs".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(1));
        let chans = vec![(1, "grinning-\u{1F600}-ihorizon-logs".to_string())];
        assert_eq!(logs_channel_id(&chans), Some(1));
        let chans = vec![(1, "IHORIZON-LOGS".to_lowercase())];
        assert_eq!(logs_channel_id(&chans), Some(1));
    }
}

// ---- blockSpam (PUNISHPUB) ----

/// JS `String.trim()` / non-unicode-flag `\s` whitespace set (WhiteSpace +
/// LineTerminator): TAB VT FF SP NBSP U+1680 U+2000-U+200A U+2028/2029
/// U+202F U+205F U+3000 U+FEFF. Notably trims U+FEFF (which Rust
/// `str::trim` keeps) and does NOT trim U+0085 or U+200B.
pub fn is_js_whitespace(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n'
            | '\u{000C}'
            | '\r'
            | ' '
            | '\u{000B}'
            | '\u{00A0}'
            | '\u{1680}'
            | '\u{2000}'
            | '\u{2001}'
            | '\u{2002}'
            | '\u{2003}'
            | '\u{2004}'
            | '\u{2005}'
            | '\u{2006}'
            | '\u{2007}'
            | '\u{2008}'
            | '\u{2009}'
            | '\u{200A}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202F}'
            | '\u{205F}'
            | '\u{3000}'
            | '\u{FEFF}'
    )
}

/// JS `String.trim()` equivalent over [`is_js_whitespace`].
pub fn js_trim(s: &str) -> &str {
    s.trim_matches(is_js_whitespace)
}

/// JS `String.length` equivalent: UTF-16 code units, not bytes or chars.
/// TS caret/pad math (`sendErrorMessage` errorPosition, `padStart`) counts
/// astral chars as 2, so byte/char counts over-pad (bytes) or under-pad
/// (chars) once a prefix, command name, or token holds non-BMP text
/// (node ground truth: `"😀".length === 2`, `" ".padStart(0) === " "`).
pub fn utf16_len(s: &str) -> usize {
    s.encode_utf16().count()
}

/// Link extractor. Mirrors `contentLower.match(/https?:\/\/\S+/g)` in
/// blockSpam.ts, where `contentLower = message.content.toLowerCase()`.
/// Exactness notes: Unicode `to_lowercase` (not ASCII-only — TS folds
/// e.g. U+0130 to `i` + combining dot), earliest scheme position wins
/// (TS matches leftmost, so `http://` before `https://` comes first),
/// and links terminate on the JS `\s` set ([`is_js_whitespace]).
pub fn extract_links(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut out = vec![];
    let mut i = 0;
    while i < lower.len() {
        let rest = &lower[i..];
        let https = rest.find("https://");
        let http = rest.find("http://");
        let (pos, scheme) = match (http, https) {
            (Some(a), Some(b)) => {
                if a <= b {
                    (a, 7)
                } else {
                    (b, 8)
                }
            }
            (Some(a), None) => (a, 7),
            (None, Some(b)) => (b, 8),
            (None, None) => break,
        };
        let abs = i + pos;
        let tail = &lower[abs + scheme..];
        let len = tail
            .find(is_js_whitespace)
            .map(|p| abs + scheme + p)
            .unwrap_or(lower.len());
        out.push(lower[abs..len].to_string());
        i = len;
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

/// Blacklisted substrings that always sanction. Lowercases with Unicode
/// `to_lowercase` like TS `message.content.toLowerCase()` (terms are
/// ASCII so this only matters for exotic fold-ins, kept for fidelity).
pub fn has_blacklisted_term(text: &str) -> bool {
    let lower = text.to_lowercase();
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
/// Pure content-type leg of the TS `isImageUrl` predicate
/// (src/core/functions/image64.ts): `content-type.startsWith("image/")`
/// verbatim — case-SENSITIVE (`"Image/png"` is false in TS; the old Rust
/// mirror lowercased first and wrongly accepted it) and untrimmed
/// (`"image/png "` passes, `" image/png"` fails). `None` (missing header)
/// is false: TS `null.startsWith` throws inside the try, so it also yields
/// false. Non-UTF8 header bytes surface as `None` via `to_str`, same
/// outcome. Pinned by a node ground-truth battery (W6 slice 39).
pub fn content_type_is_image(ct: Option<&str>) -> bool {
    matches!(ct, Some(v) if v.starts_with("image/"))
}

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
            .and_then(|v| v.to_str().ok().map(|s| s.to_string())),
        Err(_) => return false,
    };
    content_type_is_image(ct.as_deref())
}

/// Animated-attachment check. Mirrors method.isAnimated
/// (`attachmentUrl.split("/").pop() || ""` + `startsWith("a_")`).
/// `split` on a string always yields >= 1 element so `pop()` never
/// returns `undefined` — the `|| ""` is dead and `rsplit('/').next()`
/// yields the identical last segment on every input (W6 slice 89:
/// 19-case node battery, incl. trailing-slash `""`, double-slash,
/// query-suffixed `a_?v=1`, leading-space and non-ASCII names —
/// all verdict-equal; `startsWith("a_")` is an ASCII prefix so
/// UTF-16 units vs bytes never diverge).
pub fn is_animated(attachment_url: &str) -> bool {
    attachment_url
        .rsplit('/')
        .next()
        .unwrap_or("")
        .starts_with("a_")
}

#[cfg(test)]
mod content_type_image_tests {
    use super::*;

    #[test]
    fn content_type_gate_matches_ts_starts_with() {
        // Node ground truth (W6 slice 39): `startsWith` is
        // case-sensitive and untrimmed; null throws (caught -> false).
        assert!(content_type_is_image(Some("image/png")));
        assert!(content_type_is_image(Some("image/svg+xml")));
        assert!(content_type_is_image(Some("image/png ")));
        assert!(!content_type_is_image(Some("Image/png")));
        assert!(!content_type_is_image(Some("IMAGE/PNG")));
        assert!(!content_type_is_image(Some(" image/png")));
        assert!(!content_type_is_image(Some("application/json")));
        assert!(!content_type_is_image(Some("text/html")));
        assert!(!content_type_is_image(Some("")));
        assert!(!content_type_is_image(None));
    }

    #[test]
    fn is_animated_matches_ts_split_pop() {
        // Node ground truth (W6 slice 89): verbatim
        // `attachmentUrl.split("/").pop() || ""` + startsWith("a_").
        for url in [
            "https://cdn.discordapp.com/avatars/123/a_abc.gif",
            "a_icon.png",
            "https://x//a_b.png",
            "https://x/a_.png",
            "https://x/a_",
            "https://x/a_?v=1",
            "a_",
            "https://x/A_B/a_c.gif",
            "a__",
        ] {
            assert!(is_animated(url), "{url:?} must be animated like TS");
        }
        for url in [
            "https://cdn.discordapp.com/avatars/123/abc.gif",
            "https://cdn.discordapp.com/emojis/456.gif",
            "",
            "/",
            "https://x/a_/",
            "A_icon.png",
            "https://x/%61_icon.png",
            "https://x/é_a_b.png",
            "https://x/dir.a_b/c",
            " a_x.png",
        ] {
            assert!(!is_animated(url), "{url:?} must be static like TS");
        }
    }
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
    rgb_to_hsl_f64(f64::from(r), f64::from(g), f64::from(b))
}

/// HSL over raw channel values. TS `rgbToHsl` divides the UNCLAMPED
/// bucket by 255 (`Math.round(255/10)*10` = 260 is reachable), so the
/// s/l of a 255-channel pixel are (104, 50.98), not (100, 50).
/// The u8 wrapper above keeps the clamped entry point; the bucket
/// pipeline below must call this float version verbatim.
pub fn rgb_to_hsl_f64(r: f64, g: f64, b: f64) -> (f64, f64, f64) {
    let r = r / 255.0;
    let g = g / 255.0;
    let b = b / 255.0;
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
/// score, ties keep the first-inserted bucket like the TS stable
/// sort) vs dark (l<40, darkest, ties keep the first-inserted
/// bucket like the TS stable ascending sort — strict-less fold,
/// same first-wins `min_by` already had),
/// blurple fallback. HSL runs on the UNCLAMPED buckets (260 is
/// reachable); only the final hex step clamps, like TS.
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
            let (h, s, l) = rgb_to_hsl_f64(rgb.0 as f64, rgb.1 as f64, rgb.2 as f64);
            (*rgb, (h, s, l))
        })
        .collect();
    let fallback = kept.first().map(|(rgb, _)| *rgb).unwrap_or((88, 101, 242));
    // TS stable-sorts descending by score and takes [0]: on ties the
    // FIRST-inserted bucket wins. A strict-greater fold mirrors that;
    // Iterator::max_by would return the LAST max instead.
    let mut vibrant = fallback;
    let mut best = f64::NEG_INFINITY;
    for (rgb, (_, s, l)) in &kept {
        if *l > 20.0 && *s > 20.0 {
            let sc = vibrancy_score(*s, *l);
            if sc > best {
                best = sc;
                vibrant = *rgb;
            }
        }
    }
    let mut dark = kept.last().map(|(rgb, _)| *rgb).unwrap_or(fallback);
    let mut darkest = f64::INFINITY;
    for (rgb, (_, _, l)) in &kept {
        if *l < 40.0 && *l < darkest {
            darkest = *l;
            dark = *rgb;
        }
    }
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

/// Decode PNG/JPEG/GIF bytes (format-sniffed) to RGB pixels. Mirrors
/// Jimp.read in image_dominant_color.ts, which accepts any image
/// shape — the PNG-only path above silently dropped every JPEG
/// artwork (all YouTube thumbnails) to the `#6fa8dc` fallback.
/// Images larger than 300px are downscaled to fit 300x300 first
/// (TS `scaleToFit`), so the bucket scan runs on the same sample set.
pub fn decode_image_pixels(bytes: &[u8]) -> anyhow::Result<Vec<(u8, u8, u8)>> {
    let img = image::load_from_memory(bytes)?;
    let img = if img.width() > 300 || img.height() > 300 {
        img.resize(300, 300, image::imageops::FilterType::Triangle)
    } else {
        img
    };
    Ok(img.to_rgb8().pixels().map(|p| (p[0], p[1], p[2])).collect())
}

/// Dominant (vibrant, dark) hex pair for an image URL, base64
/// blob, or file path. Mirrors image_dominant_color.ts (Jimp.read
/// accepts any image shape; JPEG/GIF included via `decode_image_pixels`).
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
    Ok(vibrant_and_dark_colors(&decode_image_pixels(&bytes)?))
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
    fn dominant_math_matches_ts_battery() {
        // W6 slice 93 (U-ETERNAL-275): node battery replicating
        // image_dominant_color.ts rgbToHsl/rgbToHex/getVibrancyScore +
        // bucket/filter/sort/fallback legs verbatim.
        // Switch-tie: max == r == g takes the r branch -> h = 60.
        let (h, s, l) = rgb_to_hsl(255, 255, 0);
        assert!((h - 60.0).abs() < 1e-9);
        assert!((s - 100.0).abs() < 1e-9);
        assert!((l - 50.0).abs() < 1e-9);
        // Achromatic gray: h = 0, s = 0.
        let (h, s, l) = rgb_to_hsl(128, 128, 128);
        assert!((h - 0.0).abs() < 1e-9);
        assert!(s.abs() < 1e-9);
        assert!((l - 50.19607843137255).abs() < 1e-9);
        // Vibrancy spots: (100,60) -> 250, (0,0) -> 40, (50,100) -> 135.
        assert!((vibrancy_score(100.0, 60.0) - 250.0).abs() < 1e-9);
        assert!((vibrancy_score(0.0, 0.0) - 40.0).abs() < 1e-9);
        assert!((vibrancy_score(50.0, 100.0) - 135.0).abs() < 1e-9);
        // Bucket half-legs through the pipeline (Math.round half-up ==
        // round() half-away on non-negative inputs): 5 -> 10, 255 -> 260
        // (clamped to #ffffff at the hex step), 254 -> 250.
        let faint = vec![(5u8, 5u8, 5u8); 400];
        assert_eq!(
            vibrant_and_dark_colors(&faint),
            ("#0a0a0a".to_string(), "#0a0a0a".to_string())
        );
        let white = vec![(255u8, 255u8, 255u8); 400];
        assert_eq!(
            vibrant_and_dark_colors(&white),
            ("#ffffff".to_string(), "#ffffff".to_string())
        );
        let near = vec![(254u8, 0u8, 0u8); 400];
        assert_eq!(
            vibrant_and_dark_colors(&near),
            ("#fa0000".to_string(), "#fa0000".to_string())
        );
        // Strict-> filter boundary (total 200): count 2 dropped, count 3 kept.
        let mut drop_b = vec![(200u8, 50u8, 50u8); 198];
        drop_b.extend(vec![(0u8, 0u8, 200u8); 2]);
        assert_eq!(
            vibrant_and_dark_colors(&drop_b),
            ("#c83232".to_string(), "#c83232".to_string())
        );
        let mut keep_b = vec![(200u8, 50u8, 50u8); 197];
        keep_b.extend(vec![(0u8, 0u8, 200u8); 3]);
        assert_eq!(
            vibrant_and_dark_colors(&keep_b),
            ("#0000c8".to_string(), "#0000c8".to_string())
        );
        // Vibrant tie keeps the first-inserted bucket (green scores 240,
        // yellow scores 240); with no dark bucket, color2 is the LAST kept.
        let mut bright = vec![(0u8, 255u8, 0u8); 100];
        bright.extend(vec![(255u8, 255u8, 0u8); 100]);
        assert_eq!(
            vibrant_and_dark_colors(&bright),
            ("#00ff00".to_string(), "#ffff00".to_string())
        );
        // DELTAS (doc-noted, unreachable): TS rgbToHex rounds fractional
        // inputs (254.6 -> ff, 254.4 -> fe) and falls back to #000000 on
        // NaN ("NaN" fails the length-7 security check) -- both legs are
        // unrepresentable past the i32 signature (live buckets are
        // Math.round integers). The count*100 > total integer rewrite of
        // count > total/100 agreed on a 40000-case node sweep (totals
        // 1..20000, both boundary counts); only astronomical pixel counts
        // past f64 exactness could ever split them.
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
    fn hsl_unclamped_260_matches_ts() {
        // Node ground truth: rgbToHsl({r:260,g:0,b:0}) =
        // {h:0, s:103.99999999999999, l:50.98039215686274}; the clamped
        // u8 entry gives (0, 100, 50) instead. Bucket 260 is reachable
        // via Math.round(255/10)*10.
        let (h, s, l) = rgb_to_hsl_f64(260.0, 0.0, 0.0);
        assert!((h - 0.0).abs() < 1e-6);
        assert!((s - 104.0).abs() < 1e-6);
        assert!((l - 50.98039215686274).abs() < 1e-6);
    }

    #[test]
    fn dark_tie_first_inserted_wins() {
        // (200,0,0) and (0,0,200) tie bit-exactly on l (39.215686...,
        // node ground truth); the TS stable ascending sort takes the
        // first-inserted bucket — pins the strict-less fold.
        let mut pixels = vec![(200u8, 0u8, 0u8); 50];
        pixels.extend(vec![(0u8, 0u8, 200u8); 50]);
        assert_eq!(
            vibrant_and_dark_colors(&pixels),
            ("#c80000".to_string(), "#c80000".to_string())
        );
    }

    #[test]
    fn vibrant_tie_keeps_first_inserted_like_ts_stable_sort() {
        // (200,50,50) and (50,50,200) share s/l bit-exactly (node
        // ground truth: both score 179.01960784313727). TS
        // stable-sorts descending and takes [0], so the first-scanned
        // bucket wins; Iterator::max_by would return the LAST max.
        let mut pixels = vec![(200u8, 50u8, 50u8); 100];
        pixels.extend(vec![(50u8, 50u8, 200u8); 100]);
        assert_eq!(
            vibrant_and_dark_colors(&pixels),
            ("#c83232".to_string(), "#3232c8".to_string())
        );
    }

    #[test]
    fn dark_tie_keeps_first_inserted_like_ts_stable_sort() {
        // Both buckets sit at l~=19.6 (vibrant gate needs l>20, so
        // color1 falls back to the first bucket) with identical l, so
        // the TS stable ascending sort and min_by agree on the first.
        let mut pixels = vec![(100u8, 0u8, 0u8); 100];
        pixels.extend(vec![(0u8, 0u8, 100u8); 100]);
        assert_eq!(
            vibrant_and_dark_colors(&pixels),
            ("#640000".to_string(), "#640000".to_string())
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
    fn decode_downscales_like_ts_scaletofit() {
        // 600x600 red PNG: the TS scaleToFit(300,300) leg caps analysis
        // at 90k pixels; without it a 4096px icon would scan 16M+.
        let buf: image::ImageBuffer<image::Rgb<u8>, Vec<u8>> =
            image::ImageBuffer::from_pixel(600, 600, image::Rgb([200, 50, 50]));
        let mut bytes = std::io::Cursor::new(vec![]);
        image::DynamicImage::ImageRgb8(buf)
            .write_to(&mut bytes, image::ImageFormat::Png)
            .unwrap();
        let pixels = decode_image_pixels(bytes.get_ref()).unwrap();
        assert!(!pixels.is_empty());
        assert!(pixels.len() <= 300 * 300);
        assert_eq!(vibrant_and_dark_colors(&pixels).0, "#c83232".to_string());
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

    #[test]
    fn image_pixels_accepts_jpeg_artwork() {
        // YouTube thumbnails are JPEG: the old PNG-only path dropped
        // them all to the #6fa8dc fallback (live "dominant color missing").
        use image::{codecs::jpeg::JpegEncoder, ExtendedColorType, ImageEncoder};
        let mut buf = vec![];
        JpegEncoder::new(&mut buf)
            .write_image(&[255u8, 0, 0].repeat(16), 4, 4, ExtendedColorType::Rgb8)
            .unwrap();
        let pixels = decode_image_pixels(&buf).unwrap();
        assert_eq!(pixels.len(), 16);
        // JPEG is lossy (solid red comes back near-red, not exact),
        // so assert dominance instead of the exact bucket: the point
        // is the JPEG path decodes instead of falling back.
        let (c1, _) = vibrant_and_dark_colors(&pixels);
        let rgb = u32::from_str_radix(c1.trim_start_matches('#'), 16).unwrap();
        assert!(rgb >> 16 >= 0xF0 && (rgb & 0xFFFF) <= 0x1010, "{c1}");
        assert!(decode_image_pixels(b"not an image").is_err());
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
    fn links_extract_matches_blockspam_quirks() {
        // Earliest scheme wins (TS matches leftmost): old code preferred
        // https:// even when http:// came first and dropped it.
        assert_eq!(
            extract_links("go http://a.b/c then https://d.e/f"),
            vec!["http://a.b/c".to_string(), "https://d.e/f".to_string()]
        );
        // JS \S stops at NBSP / U+2028 / U+3000 / U+2003 (node-verified);
        // ASCII-only scanning swallowed them into the link.
        assert_eq!(
            extract_links("see https://evil.com more"),
            vec!["https://evil.com".to_string()]
        );
        assert_eq!(
            extract_links("see https://a.com x"),
            vec!["https://a.com".to_string()]
        );
        assert_eq!(
            extract_links("see https://a.com　x"),
            vec!["https://a.com".to_string()]
        );
        assert_eq!(
            extract_links("see https://a.com x"),
            vec!["https://a.com".to_string()]
        );
        // Vertical tab terminates (JS \s) but NEL U+0085 does not.
        assert_eq!(
            extract_links("see https://a.com\x0Bx"),
            vec!["https://a.com".to_string()]
        );
        assert_eq!(
            extract_links("see https://a.comx"),
            vec!["https://a.comx".to_string()]
        );
        // Unicode lowercase like TS toLowerCase: İ folds, scheme still found.
        assert_eq!(
            extract_links("x HTTPS://ExAmple.COM/a"),
            vec!["https://example.com/a".to_string()]
        );
    }

    #[test]
    fn utf16_len_matches_js_string_length() {
        // Node ground truth: "😀".length === 2, "é".length === 1,
        // " ".padStart(0) === " " (width max(1, n)).
        assert_eq!(utf16_len("ban"), 3);
        assert_eq!(utf16_len("é"), 1);
        assert_eq!(utf16_len("😀"), 2);
        assert_eq!(utf16_len("[😀]"), 4);
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
        // W6 slice 62: exact bit values, node ground truth on the repo
        // discord.js PermissionsBitField.Flags (last flag 1<<41).
        assert_eq!(
            DANGEROUS_PERMISSION_BITS,
            [
                1 << 3,
                1 << 5,
                1 << 28,
                1 << 17,
                1 << 2,
                1 << 1,
                1 << 29,
                1 << 4,
                1 << 30,
                1 << 41,
            ]
        );
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

/// JS `Number()` value for one numeric token. Mirrors the
/// `Number(...)` legs in getOS.ts (`Number(release.split(".")[2])`)
/// and slashlog.rs `ts_number_value`: JS-trimmed, empty -> 0,
/// decimal via correctly-rounded `f64` parse (== JS ToNumber on
/// decimal spellings), exact-case `Infinity` trio, hex/bin/oct radix
/// legs (a sign before a radix is NaN in JS, unlike parseInt);
/// anything else is NaN (notably the Rust-only `inf`/`infinity`
/// spellings, which TS reads as NaN).
pub(crate) fn js_number_value(s: &str) -> f64 {
    let t = js_trim(s);
    if t.is_empty() {
        return 0.0;
    }
    let (neg, rest) = match t.strip_prefix(['+', '-']) {
        Some(r) => (t.starts_with('-'), r),
        None => (false, t),
    };
    let radix: Option<(&str, u32)> = if neg {
        None
    } else if let Some(h) = rest.strip_prefix("0x").or_else(|| rest.strip_prefix("0X")) {
        Some((h, 16))
    } else if let Some(b) = rest.strip_prefix("0b").or_else(|| rest.strip_prefix("0B")) {
        Some((b, 2))
    } else if let Some(o) = rest.strip_prefix("0o").or_else(|| rest.strip_prefix("0O")) {
        Some((o, 8))
    } else {
        None
    };
    let val = if let Some((digits, base)) = radix {
        if digits.is_empty() || !digits.bytes().all(|b| (b as char).is_digit(base)) {
            return f64::NAN;
        }
        digits.bytes().fold(0.0, |a: f64, b| {
            a * f64::from(base) + f64::from((b as char).to_digit(base).unwrap())
        })
    } else if rest == "Infinity" {
        f64::INFINITY
    } else {
        if rest.bytes().next().is_some_and(|b| b.is_ascii_alphabetic()) {
            return f64::NAN;
        }
        match rest.parse::<f64>() {
            Ok(v) => v,
            Err(_) => return f64::NAN,
        }
    };
    if neg {
        -val
    } else {
        val
    }
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
                // TS is `Number(release.split(".")[2]) >= 22000`: full JS
                // Number grammar (JS-trim, hex/bin/oct, exponent,
                // Infinity, no u32 cap), NaN compares false -> Win10.
                let build = js_number_value(r.split('.').nth(2).unwrap_or(""));
                if build >= 22000.0 {
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
        // Node ground truth on the getOS.ts switch: case-sensitive
        // (`"Linux"`/`"Darwin"`/`"Win32"` fall to default -> null),
        // unknown platforms (`freebsd`/`aix`/`sunos`/`openbsd`/`android`/
        // `cygwin`/`""`) -> null, win32 without a `10.0.` release ->
        // generic Windows. Rust `match` is equally case-sensitive, so
        // all of these are exact.
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
        for p in [
            "Linux", "LINUX", " linux", "Darwin", "DARWIN", "Win32", "WIN32", " win32", "aix",
            "sunos", "openbsd", "android", "cygwin", "netbsd", "",
        ] {
            assert_eq!(get_os_for(p, None), None, "{p}");
        }
        // `startsWith("10.0.")` is space-sensitive: `"10.0"` (no trailing
        // dot) and `" 10.0.22000"` (leading space) take the generic leg.
        for rel in ["10.0", " 10.0.22000", "11.0.22000", "6.3.9600"] {
            assert_eq!(
                get_os_for("win32", Some(rel)),
                Some(OsInfo {
                    emoji: "Win10",
                    name: "Windows",
                }),
                "{rel}"
            );
        }
        // Documented superset delta: TS returns null for these (no such
        // Node platform names), Rust accepts them so `get_os()` resolves
        // on Rust platform names (`std::env::consts::OS`).
        assert_eq!(
            get_os_for("macos", None),
            Some(OsInfo {
                emoji: "Finder",
                name: "macOS",
            })
        );
        assert_eq!(
            get_os_for("windows", None),
            Some(OsInfo {
                emoji: "Win10",
                name: "Windows",
            })
        );
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
    fn windows_build_uses_js_number_grammar_like_ts() {
        // Node ground truth on `Number(release.split(".")[2]) >= 22000`
        // (getOS.ts): padded/hex/oct/bin/exponent/Infinity/over-u32
        // builds all reach Win11; NaN/garbage stays Win10.
        let win11 = OsInfo {
            emoji: "Win11",
            name: "Windows 11",
        };
        let win10 = OsInfo {
            emoji: "Win10",
            name: "Windows 10",
        };
        for rel in [
            "10.0. 22000",
            "10.0.22000 ",
            "10.0.0x56CE",
            "10.0.1e5",
            "10.0.0b101011000110010",
            "10.0.0o103334",
            "10.0.4294967296",
            "10.0.+22000",
            "10.0.Infinity",
            "10.0.22000.1",
        ] {
            assert_eq!(get_os_for("win32", Some(rel)), Some(win11.clone()), "{rel}");
        }
        for rel in [
            "10.0.",
            "10.0.abc",
            "10.0.-1",
            "10.0.NaN",
            "10.0.0x",
            "10.0.2_2_0_0_0",
            "10.0.21999",
            "10.0.21999.9",
        ] {
            assert_eq!(get_os_for("win32", Some(rel)), Some(win10.clone()), "{rel}");
        }
    }

    #[test]
    fn current_os_resolves() {
        assert!(get_os().is_some());
    }

    #[test]
    fn format_number_matches_ts_rounding() {
        // Node ground truth (numberBeautifuer.ts formatNumber battery):
        // K/M/B/T legs are toFixed(1) ties-away-from-zero, sub-1000 is
        // en-US toLocaleString on the shortest repr, half-up at 3dp.
        let cases: &[(f64, &str)] = &[
            (0.0, "0"),
            (-0.0, "0"),
            (5.0, "5"),
            (-5.0, "-5"),
            (999.0, "999"),
            (999.4, "999.4"),
            (999.5, "999.5"),
            (999.99, "999.99"),
            (999.9999, "1,000"),
            (999.9501, "999.95"),
            (999.9995, "1,000"),
            (1e-7, "0"),
            (0.1, "0.1"),
            (0.12345, "0.123"),
            (0.12355, "0.124"),
            (0.1235, "0.124"),
            (0.1265, "0.127"),
            (0.0625, "0.063"),
            (1.0625, "1.063"),
            (0.0005, "0.001"),
            (0.0015, "0.002"),
            (12.3456, "12.346"),
            (123.45678, "123.457"),
            (2.55, "2.55"),
            (2.65, "2.65"),
            (0.125, "0.125"),
            (1.15, "1.15"),
            (1.25, "1.25"),
            (1000.0, "1.0K"),
            (1050.0, "1.1K"),
            (1150.0, "1.1K"),
            (1250.0, "1.3K"),
            (1500.0, "1.5K"),
            (1750.0, "1.8K"),
            (2250.0, "2.3K"),
            (2500.0, "2.5K"),
            (2625.0, "2.6K"),
            (2650.0, "2.6K"),
            (2750.0, "2.8K"),
            (3250.0, "3.3K"),
            (3750.0, "3.8K"),
            (-2625.0, "-2.6K"),
            (999499.0, "999.5K"),
            (999500.0, "999.5K"),
            (999950.0, "1000.0K"),
            (1234567.0, "1.2M"),
            (2500000.0, "2.5M"),
            (2500000000.0, "2.5B"),
            (1500000000000.0, "1.5T"),
            (123456789012345680.0, "123456.8T"),
        ];
        for (v, want) in cases {
            assert_eq!(&format_number(*v), want, "format_number({v})");
        }
        assert_eq!(format_number(f64::NAN), "NaN");
        assert_eq!(format_number(f64::INFINITY), "InfinityT");
        assert_eq!(format_number(f64::NEG_INFINITY), "-InfinityT");
    }
}
