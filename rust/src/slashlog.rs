// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Slash-command file logger. Mirrors
// src/Events/logs/slashCommandLogger.ts (SafeJSONLogger: batched JSON
// log at src/files/slash.log.json, 10-command batches or 1s debounce,
// 10000-entry cap, atomic tmp+rename writes, write-error requeue,
// SIGINT/SIGTERM flush, bot + non-guild skip, sensitive option
// redaction) + src/core/functions/sanitizeInteractionOptionValue.ts +
// src/core/converters/slashLog.ts (legacy text-log converter, run
// once at startup by core.ts).
//
// Deltas vs TS: invalid legacy timestamps skip the line (TS writes
// NaN, which becomes null in JSON); a spaceless timestamp throws in
// TS (aborting the whole run) while the poison line is skipped here;
// attachment option values log their URL (TS String()s the object);
// unresolvable channel/guild names fall back to ids instead of
// throwing. DST-gap/ambiguous wall times also skip (chrono has no
// single instant there; TS resolves one) — same as the old mirror.

use crate::funcs::{is_js_whitespace, js_trim};
use chrono::TimeZone;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};
#[cfg(test)]
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Option names whose values must never hit the log, after the TS
/// lowercase + strip-non-alphanumeric normalization.
static SENSITIVE_OPTION_NAMES: &[&str] = &[
    "password",
    "pass",
    "token",
    "apitoken",
    "apikey",
    "secret",
    "sharedsecret",
    "credential",
    "sessionkey",
    "sessiontoken",
];

/// Mirrors sanitizeInteractionOptionValue (incl. name normalization).
pub fn sanitize_interaction_option_value(option_name: &str, option_value: &str) -> String {
    let normalized: String = option_name
        .to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();
    if SENSITIVE_OPTION_NAMES.contains(&normalized.as_str()) {
        return "[REDACTED]".to_string();
    }
    option_value.to_string()
}

/// One saved command row. Mirrors ParsedSavedCommand (camelCase keys).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedSavedCommand {
    pub guild_name: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub guild_id: Option<String>,
    pub executor_username: String,
    pub timestamp: i64,
    pub channel_name: String,
    pub channel_id: String,
    pub command: String,
}

/// Mirrors the `/${subCmd} ${options}` template (with .trim()).
pub fn format_logged_command(sub_cmd: &str, options: &[(String, String)]) -> String {
    let opts: Vec<String> = options
        .iter()
        .map(|(n, v)| format!("{n}:\"{}\"", sanitize_interaction_option_value(n, v)))
        .collect();
    format!("/{sub_cmd} {}", opts.join(" ")).trim().to_string()
}

/// Stringify one leaf option value. Mirrors String(optionValue):
/// scalars verbatim, snowflakes as id strings.
pub fn resolved_value_string(value: &serenity::ResolvedValue<'_>) -> Option<String> {
    match value {
        serenity::ResolvedValue::Autocomplete { value, .. } => Some((*value).to_string()),
        serenity::ResolvedValue::Boolean(v) => Some(v.to_string()),
        serenity::ResolvedValue::Integer(v) => Some(v.to_string()),
        serenity::ResolvedValue::Number(v) => Some(v.to_string()),
        serenity::ResolvedValue::String(v) => Some((*v).to_string()),
        // Delta: TS String()s the object; the URL is what matters.
        serenity::ResolvedValue::Attachment(a) => Some(a.url.clone()),
        serenity::ResolvedValue::Channel(c) => Some(c.id.get().to_string()),
        serenity::ResolvedValue::Role(r) => Some(r.id.get().to_string()),
        serenity::ResolvedValue::User(u, _) => Some(u.id.get().to_string()),
        serenity::ResolvedValue::Unresolved(u) => match u {
            serenity::Unresolved::Attachment(id) => Some(id.get().to_string()),
            serenity::Unresolved::Channel(id) => Some(id.get().to_string()),
            serenity::Unresolved::Mentionable(id) => Some(id.get().to_string()),
            serenity::Unresolved::RoleId(id) => Some(id.get().to_string()),
            serenity::Unresolved::User(id) => Some(id.get().to_string()),
            serenity::Unresolved::Unknown(v) => Some(v.to_string()),
            _ => None,
        },
        // Structural only; TS _hoistedOptions excludes these already.
        serenity::ResolvedValue::SubCommand(_) | serenity::ResolvedValue::SubCommandGroup(_) => {
            None
        }
        _ => None,
    }
}

/// Split resolved options into (command path, leaf options).
/// Mirrors the _subcommand/getSubcommandGroup/getSubcommand block,
/// plus the base command name (TS `/${subCmd}` drops it, logging a
/// bare `/` for top-level leaf commands such as /help): "help",
/// "parent sub", or "parent group sub" with the hoisted leaf options.
pub fn split_command_options<'a>(
    base: &str,
    opts: &'a [serenity::ResolvedOption<'a>],
) -> (String, Vec<(String, String)>) {
    let mut sub = base.to_string();
    let mut leaves: &[serenity::ResolvedOption<'a>] = opts;
    if let Some(first) = opts.first() {
        match &first.value {
            serenity::ResolvedValue::SubCommandGroup(inner) => {
                if let Some(sub_cmd) = inner.first() {
                    sub = format!("{base} {} {}", first.name, sub_cmd.name);
                    if let serenity::ResolvedValue::SubCommand(leaf_opts) = &sub_cmd.value {
                        leaves = leaf_opts;
                    } else {
                        leaves = inner;
                    }
                } else {
                    sub = format!("{base} {}", first.name);
                    leaves = inner;
                }
            }
            serenity::ResolvedValue::SubCommand(inner) => {
                sub = format!("{base} {}", first.name);
                leaves = inner;
            }
            _ => {}
        }
    }
    let mut out = Vec::new();
    for opt in leaves {
        if let Some(v) = resolved_value_string(&opt.value) {
            out.push((opt.name.to_string(), v));
        }
    }
    (sub, out)
}

/// JS `Number()` value for one timestamp part. Mirrors the
/// `.map(Number)` legs in parseTimestamp: JS-trimmed, empty -> 0,
/// decimal via correctly-rounded `f64` parse (== JS ToNumber on
/// decimal spellings), exact-case `Infinity` trio, hex/bin/oct radix
/// legs (a sign before a radix is NaN in JS, unlike parseInt);
/// anything else is NaN (notably the Rust-only `inf`/`infinity`
/// spellings, which TS reads as NaN).
fn ts_number_value(s: &str) -> f64 {
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

/// Days in a proleptic-Gregorian month (matches both chrono and the
/// JS Date constructor).
fn days_in_month(year: i64, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

/// Parse DD/MM/YYYY HH:MM:SS in local time to unix ms. Mirrors
/// parseTimestamp (`new Date(y, month - 1, d, H, M, S)`): missing
/// slots are NaN there (the line is then kept with a NaN stamp),
/// hence `None` here (`i64` cannot hold NaN — the long-standing
/// documented delta). Extra date/time segments are ignored like the
/// TS destructuring (never rejected), part values go through
/// [`ts_number_value`], and fractions truncate toward zero (node
/// ground truth: day 1.5 == day 1, hour 10.5 == 10:00, month 1.5 ==
/// January). In-range parts take the direct chrono construction
/// (DST-exact, as before); out-of-range parts roll over exactly like
/// the Date constructor (month 13 -> next January, day 32 -> the
/// 1st, hour 25 -> next day 01:00, day -5 -> back 6 days). Past the
/// TS timeClip range (8.64e15 ms) the Date is Invalid, so that is
/// `None` too. A spaceless timestamp throws in TS (aborting the
/// whole run); here the poison line is skipped instead.
pub fn parse_legacy_timestamp(raw: &str) -> Option<i64> {
    // `split(" ")` destructured to the first two slots: segments past
    // the second space are ignored, not rejected.
    let (date_part, after) = raw.split_once(' ')?;
    let time_part = after.split(' ').next().unwrap_or("");
    let mut date = date_part.split('/');
    let (day, month, year) = (
        ts_number_value(date.next()?),
        ts_number_value(date.next()?),
        ts_number_value(date.next()?),
    );
    let mut time = time_part.split(':');
    let (hour, min, sec) = (
        ts_number_value(time.next()?),
        ts_number_value(time.next()?),
        ts_number_value(time.next()?),
    );
    let parts = [day, month, year, hour, min, sec];
    if parts.iter().any(|v| !v.is_finite()) {
        return None;
    }
    // Keep every later cast and multiplication overflow-free; TS
    // reads these magnitudes as NaN or out-of-range (dropped) anyway.
    if parts.iter().any(|v| v.abs() > 9_999_999_999.0) {
        return None;
    }
    let (day, month, year, hour, min, sec) = (
        day.trunc() as i64,
        month.trunc() as i64,
        year.trunc() as i64,
        hour.trunc() as i64,
        min.trunc() as i64,
        sec.trunc() as i64,
    );
    let in_range = (1..=12).contains(&month)
        && (-271_821..=275_760).contains(&year)
        && (1..=days_in_month(year, month as u32) as i64).contains(&day)
        && (0..24).contains(&hour)
        && (0..60).contains(&min)
        && (0..60).contains(&sec);
    if in_range {
        // Direct construction: DST-exact, identical to the old mirror.
        // A `None` here is a DST-gap/ambiguous wall time (TS resolves
        // one; skipping is the documented delta).
        return chrono::Local
            .with_ymd_and_hms(
                year as i32,
                month as u32,
                day as u32,
                hour as u32,
                min as u32,
                sec as u32,
            )
            .single()
            .map(|d| d.timestamp_millis());
    }
    // Rollover leg: normalize the month into the year like MakeDay,
    // then walk day/time overflow forward from the 1st.
    let total_months = year * 12 + (month - 1);
    let base = chrono::Local
        .with_ymd_and_hms(
            total_months.div_euclid(12) as i32,
            (total_months.rem_euclid(12) + 1) as u32,
            1,
            0,
            0,
            0,
        )
        .single()?;
    let dt = base
        .checked_add_signed(chrono::Duration::days(day - 1))?
        .checked_add_signed(chrono::Duration::seconds(hour * 3600 + min * 60 + sec))?;
    let ms = dt.timestamp_millis();
    // timeClip: past +-8.64e15 ms the TS Date is Invalid.
    if ms.abs() > 8_640_000_000_000_000 {
        return None;
    }
    Some(ms)
}

/// Strip exactly one JS-whitespace char, requiring it (the `\s+`
/// gap legs in parseLine).
fn strip_one_js_ws(s: &str) -> Option<&str> {
    let c = s.chars().next()?;
    if is_js_whitespace(c) {
        Some(&s[c.len_utf8()..])
    } else {
        None
    }
}

/// Parse one legacy text-log line:
/// `[timestamp] "guild" #channel: user: command`.
/// Mirrors parseLine
/// (`/^\[([^\]]+)\]\s+"([^"]+)"\s+#([^:]+):\s*([^:]+):\s*(.+)$/`
/// over the JS-trimmed line): the gaps after `]` and before `#` are
/// mandatory JS-whitespace runs, the gaps after the colons are
/// optional, every capture is non-empty (`+` quantifiers — an empty
/// guild/channel/user/command rejects), and the stored fields are
/// JS-trimmed like the TS return.
pub fn parse_legacy_line(line: &str) -> Option<ParsedSavedCommand> {
    let line = js_trim(line);
    let rest = line.strip_prefix('[')?;
    let end = rest.find(']')?;
    // The timestamp is NOT trimmed first in TS (`([^\]]+)` keeps
    // padding, which then NaNs the Date and drops the line here).
    let timestamp = parse_legacy_timestamp(&rest[..end])?;
    let rest = strip_one_js_ws(&rest[end + 1..])?;
    let rest = rest.trim_start_matches(is_js_whitespace);
    let rest = rest.strip_prefix('"')?;
    let end = rest.find('"')?;
    if rest[..end].is_empty() {
        return None;
    }
    let guild_name = js_trim(&rest[..end]).to_string();
    let rest = strip_one_js_ws(&rest[end + 1..])?;
    let rest = rest.trim_start_matches(is_js_whitespace);
    let rest = rest.strip_prefix('#')?;
    let split = rest.find(':')?;
    if rest[..split].is_empty() {
        return None;
    }
    let channel_name = js_trim(&rest[..split]).to_string();
    let rest = rest[split + 1..].trim_start_matches(is_js_whitespace);
    let split = rest.find(':')?;
    if rest[..split].is_empty() {
        return None;
    }
    let executor_username = js_trim(&rest[..split]).to_string();
    let command = rest[split + 1..].trim_start_matches(is_js_whitespace);
    if command.is_empty() {
        return None;
    }
    Some(ParsedSavedCommand {
        guild_name,
        guild_id: None,
        executor_username,
        timestamp,
        channel_name,
        channel_id: "0".to_string(),
        command: js_trim(command).to_string(),
    })
}

/// Parse a whole legacy log, joining continuation lines exactly like
/// TS parse() (lines not starting with `[` are skipped or glued to
/// the previous bracket line; the trailing-space join is harmless
/// because parse_legacy_line trims).
pub fn parse_legacy_log(log_text: &str) -> Vec<ParsedSavedCommand> {
    let lines: Vec<&str> = log_text
        .split('\n')
        .map(js_trim)
        .filter(|l| !l.is_empty())
        .collect();
    let mut results = Vec::new();
    let mut i = 0usize;
    while i < lines.len() {
        let line = lines[i];
        if !line.starts_with('[') {
            i += 1;
            continue;
        }
        let mut full = line.to_string();
        let next = i + 1;
        let cont = lines[next..]
            .iter()
            .position(|l| l.starts_with('[') || l.trim().is_empty());
        let end = match cont {
            Some(c) => next + c,
            None => lines.len(),
        };
        if end > next {
            full.push(' ');
            full.push_str(&lines[next..end].join(" "));
        }
        // Mirrors TS `i = nextLineIndex - 1` plus the loop's own `i++`.
        i = end;
        if let Some(parsed) = parse_legacy_line(&full) {
            results.push(parsed);
        }
    }
    results
}

/// Statistics over parsed commands. Mirrors getStatistics exactly,
/// including strict-> ties (later key wins) and "" on empty input.
/// Test-only: no production path consumes these (kept for the TS mirror).
#[cfg(test)]
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LegacyStatistics {
    pub total_commands: usize,
    pub unique_users: usize,
    pub unique_guilds: usize,
    pub unique_channels: usize,
    pub command_types: HashMap<String, usize>,
    pub most_active_user: String,
    pub most_active_guild: String,
}

#[cfg(test)]
pub fn legacy_statistics(commands: &[ParsedSavedCommand]) -> LegacyStatistics {
    let mut users = std::collections::HashSet::new();
    let mut guilds = std::collections::HashSet::new();
    let mut channels = std::collections::HashSet::new();
    let mut command_types: HashMap<String, usize> = HashMap::new();
    let mut user_counts: HashMap<String, usize> = HashMap::new();
    let mut user_order: Vec<String> = Vec::new();
    let mut guild_counts: HashMap<String, usize> = HashMap::new();
    let mut guild_order: Vec<String> = Vec::new();
    for cmd in commands {
        users.insert(cmd.executor_username.clone());
        guilds.insert(cmd.guild_name.clone());
        channels.insert(cmd.channel_name.clone());
        let kind = cmd.command.split(' ').next().unwrap_or("").to_string();
        *command_types.entry(kind).or_insert(0) += 1;
        if !user_counts.contains_key(&cmd.executor_username) {
            user_order.push(cmd.executor_username.clone());
        }
        *user_counts
            .entry(cmd.executor_username.clone())
            .or_insert(0) += 1;
        if !guild_counts.contains_key(&cmd.guild_name) {
            guild_order.push(cmd.guild_name.clone());
        }
        *guild_counts.entry(cmd.guild_name.clone()).or_insert(0) += 1;
    }
    // TS reduce with `>` over insertion-ordered keys: strict greater
    // keeps the earlier key, ties fall through to the later one.
    let most_active_user = user_order.iter().fold(String::new(), |a, b| {
        if user_counts.get(a.as_str()).copied().unwrap_or(0)
            > user_counts.get(b.as_str()).copied().unwrap_or(0)
        {
            a
        } else {
            b.clone()
        }
    });
    let most_active_guild = guild_order.iter().fold(String::new(), |a, b| {
        if guild_counts.get(a.as_str()).copied().unwrap_or(0)
            > guild_counts.get(b.as_str()).copied().unwrap_or(0)
        {
            a
        } else {
            b.clone()
        }
    });
    LegacyStatistics {
        total_commands: commands.len(),
        unique_users: users.len(),
        unique_guilds: guilds.len(),
        unique_channels: channels.len(),
        command_types,
        most_active_user,
        most_active_guild,
    }
}

/// Batched JSON command log. Mirrors SafeJSONLogger: batches of 10
/// or a 1s debounce, 10000-entry cap, atomic tmp+rename writes,
/// failed batches requeued at the front.
pub struct SlashLog {
    path: PathBuf,
    queue: tokio::sync::Mutex<Vec<ParsedSavedCommand>>,
    writing: AtomicBool,
    timer: AtomicBool,
    batch_size: usize,
    cap: usize,
}

impl SlashLog {
    pub fn new(path: PathBuf) -> Arc<Self> {
        Arc::new(Self {
            path,
            queue: tokio::sync::Mutex::new(Vec::new()),
            writing: AtomicBool::new(false),
            timer: AtomicBool::new(false),
            batch_size: 10,
            cap: 10_000,
        })
    }

    /// TS default: `<cwd>/src/files/slash.log.json`.
    pub fn default_path() -> PathBuf {
        PathBuf::from("src/files/slash.log.json")
    }

    /// Mirrors addCommand (batch-size immediate flush, else 1s
    /// debounce; the write itself runs in the background).
    pub async fn log(self: &Arc<Self>, entry: ParsedSavedCommand) {
        let len = {
            let mut q = self.queue.lock().await;
            q.push(entry);
            q.len()
        };
        if len >= self.batch_size {
            let me = self.clone();
            tokio::spawn(async move { me.flush().await });
        } else if !self.timer.swap(true, Ordering::SeqCst) {
            let me = self.clone();
            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                me.flush().await;
                me.timer.store(false, Ordering::SeqCst);
            });
        }
    }

    /// Mirrors flushQueue (writing guard, drain-all, requeue-on-error).
    pub async fn flush(&self) {
        if self
            .writing
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }
        let batch: Vec<ParsedSavedCommand> = self.queue.lock().await.drain(..).collect();
        if batch.is_empty() {
            self.writing.store(false, Ordering::SeqCst);
            return;
        }
        if self.append_batch(&batch).await.is_err() {
            // Mirrors unshift(...commandsToWrite): front, same order.
            self.queue.lock().await.splice(..0, batch);
        }
        self.writing.store(false, Ordering::SeqCst);
    }

    async fn append_batch(&self, batch: &[ParsedSavedCommand]) -> anyhow::Result<()> {
        let mut existing: Vec<ParsedSavedCommand> = match tokio::fs::read(&self.path).await {
            Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            Err(_) => Vec::new(),
        };
        existing.extend(batch.iter().cloned());
        if existing.len() > self.cap {
            existing.drain(..existing.len() - self.cap);
        }
        if let Some(parent) = self.path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        let tmp = self.path.with_extension("json.tmp");
        tokio::fs::write(&tmp, serde_json::to_string_pretty(&existing)?).await?;
        tokio::fs::rename(&tmp, &self.path).await?;
        Ok(())
    }

    /// Mirrors forceFlush (up to 100 drain attempts, 10ms apart).
    pub async fn force_flush(&self) {
        for _ in 0..100 {
            let pending =
                !self.queue.lock().await.is_empty() || self.writing.load(Ordering::SeqCst);
            if !pending {
                break;
            }
            self.flush().await;
            let still = !self.queue.lock().await.is_empty() || self.writing.load(Ordering::SeqCst);
            if still {
                tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            }
        }
    }

    /// Read back the whole log file (for tests/admin).
    pub async fn read_all(&self) -> Vec<ParsedSavedCommand> {
        match tokio::fs::read(&self.path).await {
            Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            Err(_) => Vec::new(),
        }
    }
}

/// One-shot legacy migration from core.ts: `<cwd>/src/files/slash.log`
/// (old text format) is converted into slash.log.json and deleted.
/// Runs synchronously at startup; missing file means nothing to do.
pub fn migrate_legacy_log() {
    migrate_legacy_log_in(Path::new("src/files"));
}

/// Testable core of the migration over an explicit directory.
pub fn migrate_legacy_log_in(dir: &Path) -> bool {
    let old = dir.join("slash.log");
    if !old.exists() {
        return false;
    }
    let text = std::fs::read_to_string(&old).unwrap_or_default();
    let parsed = parse_legacy_log(&text);
    // TS writes compact JSON here (JSON.stringify without indent).
    let out = serde_json::to_string(&parsed).unwrap_or_else(|_| "[]".to_string());
    let new_path = dir.join("slash.log.json");
    if std::fs::write(&new_path, out).is_err() {
        return false;
    }
    let _ = std::fs::remove_file(&old);
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_redacts_sensitive_names() {
        for name in [
            "password",
            "pass",
            "token",
            "apiToken",
            "API-KEY",
            "secret",
            "SharedSecret",
            "credential",
            "session_key",
            "sessionToken",
        ] {
            assert_eq!(
                sanitize_interaction_option_value(name, "hunter2"),
                "[REDACTED]",
                "name: {name}"
            );
        }
        assert_eq!(sanitize_interaction_option_value("reason", "spam"), "spam");
        // "pass" as substring of a longer name is not sensitive (TS
        // uses the full normalized name in the set).
        assert_eq!(sanitize_interaction_option_value("passage", "x"), "x");
    }

    #[test]
    fn format_logged_command_matches_ts_template() {
        assert_eq!(format_logged_command("", &[]), "/");
        assert_eq!(
            format_logged_command(
                "ban",
                &[
                    ("user".to_string(), "123".to_string()),
                    ("token".to_string(), "abc".to_string()),
                ]
            ),
            "/ban user:\"123\" token:\"[REDACTED]\""
        );
        assert_eq!(
            format_logged_command("g kick", &[("reason".to_string(), "spam".to_string())]),
            "/g kick reason:\"spam\""
        );
    }

    fn command_data_from_json(value: serde_json::Value) -> serenity::CommandData {
        serde_json::from_value(value).expect("test command data deserializes")
    }

    #[test]
    fn split_threads_base_name_top_level_leaf() {
        // /help with no options at all logs "/help", not "/".
        let data = command_data_from_json(serde_json::json!({
            "id": "1", "name": "help", "type": 1,
        }));
        let (sub, opts) = split_command_options(&data.name, &data.options());
        assert_eq!(sub, "help");
        assert!(opts.is_empty());
        assert_eq!(format_logged_command(&sub, &opts), "/help");
        // /help with leaf options keeps the base name and renders them.
        let data = command_data_from_json(serde_json::json!({
            "id": "1", "name": "help", "type": 1,
            "options": [{"name": "query", "type": 3, "value": "ping"}],
        }));
        let (sub, opts) = split_command_options(&data.name, &data.options());
        assert_eq!(sub, "help");
        assert_eq!(opts, vec![("query".to_string(), "ping".to_string())]);
        assert_eq!(format_logged_command(&sub, &opts), "/help query:\"ping\"");
    }

    #[test]
    fn split_threads_base_name_nested_subcommand() {
        // /parent sub with a leaf option logs "/parent sub ...".
        let data = command_data_from_json(serde_json::json!({
            "id": "1", "name": "parent", "type": 1,
            "options": [{
                "name": "sub", "type": 1,
                "options": [{"name": "reason", "type": 3, "value": "spam"}],
            }],
        }));
        let (sub, opts) = split_command_options(&data.name, &data.options());
        assert_eq!(sub, "parent sub");
        assert_eq!(opts, vec![("reason".to_string(), "spam".to_string())]);
        assert_eq!(
            format_logged_command(&sub, &opts),
            "/parent sub reason:\"spam\""
        );
    }

    #[test]
    fn split_threads_base_name_subcommand_group() {
        // /parent group kick keeps the full path and hoists leaf options.
        let data = command_data_from_json(serde_json::json!({
            "id": "1", "name": "parent", "type": 1,
            "options": [{
                "name": "group", "type": 2,
                "options": [{
                    "name": "kick", "type": 1,
                    "options": [{"name": "user", "type": 4, "value": 123}],
                }],
            }],
        }));
        let (sub, opts) = split_command_options(&data.name, &data.options());
        assert_eq!(sub, "parent group kick");
        assert_eq!(opts, vec![("user".to_string(), "123".to_string())]);
        assert_eq!(
            format_logged_command(&sub, &opts),
            "/parent group kick user:\"123\""
        );
    }

    #[test]
    fn legacy_line_parses_ts_shape() {
        let line = "[09/10/2026 12:34:56] \"My Guild\" #general: Bob: /ban user:\"123\"";
        let cmd = parse_legacy_line(line).expect("parses");
        assert_eq!(cmd.guild_name, "My Guild");
        assert_eq!(cmd.channel_name, "general");
        assert_eq!(cmd.executor_username, "Bob");
        assert_eq!(cmd.command, "/ban user:\"123\"");
        assert_eq!(cmd.channel_id, "0");
        assert_eq!(cmd.guild_id, None);
        let expected = chrono::Local
            .with_ymd_and_hms(2026, 10, 9, 12, 34, 56)
            .single()
            .map(|d| d.timestamp_millis())
            .unwrap();
        assert_eq!(cmd.timestamp, expected);
        assert!(parse_legacy_line("not a log line").is_none());
        assert!(parse_legacy_line("[bad] \"g\" #c: u: cmd").is_none());
    }

    #[test]
    fn legacy_line_matches_ts_regex_number_and_rollover_quirks() {
        // Node ground-truth battery (W6 slice 33): TS `\s+`/`\s*`
        // gaps accept tabs and NBSP; the gaps after `]` and before
        // `#` are mandatory.
        let base = "[01/02/2024 10:00:00] \"g\" #c: u: cmd";
        assert!(parse_legacy_line(base).is_some());
        assert!(parse_legacy_line("[01/02/2024 10:00:00]\t\"g\"\t#c:\tu:\tcmd").is_some());
        assert!(parse_legacy_line("[01/02/2024 10:00:00] \"g\" #c: u: cmd").is_some());
        assert!(parse_legacy_line("﻿[01/02/2024 10:00:00] \"g\" #c: u: cmd").is_some());
        assert!(parse_legacy_line("[01/02/2024 10:00:00]\"g\" #c: u: cmd").is_none());
        assert!(parse_legacy_line("[01/02/2024 10:00:00] \"g\"#c: u: cmd").is_none());
        // Empty captures reject (TS `+` quantifiers).
        assert!(parse_legacy_line("[01/02/2024 10:00:00] \"\" #c: u: cmd").is_none());
        assert!(parse_legacy_line("[01/02/2024 10:00:00] \"g\" #: u: cmd").is_none());
        assert!(parse_legacy_line("[01/02/2024 10:00:00] \"g\" #c:: cmd").is_none());
        assert!(parse_legacy_line("[01/02/2024 10:00:00] \"g\" #c: u:").is_none());
        // Extra date/time segments are ignored like the TS
        // destructuring (previously rejected).
        let clean = parse_legacy_timestamp("01/02/2024 10:00:00").unwrap();
        assert_eq!(
            parse_legacy_timestamp("01/02/2024 10:00:00 EXTRA"),
            Some(clean)
        );
        assert_eq!(
            parse_legacy_timestamp("01/02/2024/99 10:00:00:99"),
            Some(clean)
        );
        // `Number()` part values: hex, padded, exponent, empty -> 0.
        assert_eq!(
            parse_legacy_timestamp("0x10/02/2024 10:00:00"),
            parse_legacy_timestamp("16/02/2024 10:00:00")
        );
        assert_eq!(
            parse_legacy_timestamp("01/02/2024 1e1:00:00"),
            parse_legacy_timestamp("01/02/2024 10:00:00")
        );
        // Fractions truncate toward zero, like the Date constructor.
        assert_eq!(
            parse_legacy_timestamp("1.5/1.5/2024.5 10.5:00:00"),
            parse_legacy_timestamp("01/01/2024 10:00:00")
        );
        // Out-of-range parts roll over like `new Date`.
        assert_eq!(
            parse_legacy_timestamp("01/13/2024 10:00:00"),
            parse_legacy_timestamp("01/01/2025 10:00:00")
        );
        assert_eq!(
            parse_legacy_timestamp("32/01/2024 10:00:00"),
            parse_legacy_timestamp("01/02/2024 10:00:00")
        );
        assert_eq!(
            parse_legacy_timestamp("01/01/2024 25:00:00"),
            parse_legacy_timestamp("02/01/2024 01:00:00")
        );
        assert_eq!(
            parse_legacy_timestamp("-5/01/2024 10:00:00"),
            parse_legacy_timestamp("26/12/2023 10:00:00")
        );
        // NaN/Infinity parts drop the line (TS keeps a NaN stamp;
        // `i64` cannot — the documented delta).
        assert!(parse_legacy_timestamp("ab/02/2024 10:00:00").is_none());
        assert!(parse_legacy_timestamp("01/02/2024 Infinity:00:00").is_none());
        assert!(parse_legacy_timestamp("01/02/2024 10:00:00").is_some());
    }

    #[test]
    fn legacy_log_joins_continuations_and_skips() {
        let text = "noise line\n[09/10/2026 12:00:00] \"G\" #c: U: /a\ncontinued words\n[09/10/2026 12:01:00] \"G\" #c: U: /b\n";
        let cmds = parse_legacy_log(text);
        assert_eq!(cmds.len(), 2);
        assert_eq!(cmds[0].command, "/a continued words");
        assert_eq!(cmds[1].command, "/b");
    }

    #[test]
    fn legacy_statistics_match_ts() {
        assert_eq!(
            legacy_statistics(&[]),
            LegacyStatistics {
                total_commands: 0,
                unique_users: 0,
                unique_guilds: 0,
                unique_channels: 0,
                command_types: HashMap::new(),
                most_active_user: String::new(),
                most_active_guild: String::new(),
            }
        );
        let mk = |user: &str, guild: &str, command: &str| ParsedSavedCommand {
            guild_name: guild.to_string(),
            guild_id: None,
            executor_username: user.to_string(),
            timestamp: 0,
            channel_name: "c".to_string(),
            channel_id: "0".to_string(),
            command: command.to_string(),
        };
        // Tie a/b (1 each): later key wins, like TS reduce with `>`.
        let stats = legacy_statistics(&[mk("a", "g1", "/ban x"), mk("b", "g1", "/kick y")]);
        assert_eq!(stats.total_commands, 2);
        assert_eq!(stats.unique_users, 2);
        assert_eq!(stats.most_active_user, "b");
        assert_eq!(stats.most_active_guild, "g1");
        assert_eq!(stats.command_types.get("/ban"), Some(&1));
        let stats = legacy_statistics(&[mk("a", "g", "/x"), mk("a", "g", "/y")]);
        assert_eq!(stats.most_active_user, "a");
    }

    fn test_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("ihrz-slashlog-{}-{}", std::process::id(), name));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn test_entry(cmd: &str) -> ParsedSavedCommand {
        ParsedSavedCommand {
            guild_name: "G".to_string(),
            guild_id: Some("1".to_string()),
            executor_username: "U".to_string(),
            timestamp: 7,
            channel_name: "c".to_string(),
            channel_id: "2".to_string(),
            command: cmd.to_string(),
        }
    }

    #[tokio::test]
    async fn slash_log_flush_writes_and_caps() {
        let dir = test_dir("flush");
        let log = SlashLog::new(dir.join("slash.log.json"));
        log.log(test_entry("/a")).await;
        log.force_flush().await;
        // Give the 1s debounce spawn a chance; force_flush drains.
        tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
        log.force_flush().await;
        let all = log.read_all().await;
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].command, "/a");
        // Cap: keep only the newest entries.
        let small = Arc::new(SlashLog {
            path: dir.join("small.json"),
            queue: tokio::sync::Mutex::new(Vec::new()),
            writing: AtomicBool::new(false),
            timer: AtomicBool::new(false),
            batch_size: 10,
            cap: 3,
        });
        for i in 0..5 {
            small.queue.lock().await.push(test_entry(&format!("/{i}")));
        }
        small.flush().await;
        let all = small.read_all().await;
        assert_eq!(all.len(), 3);
        assert_eq!(all[2].command, "/4");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn migrate_converts_and_deletes_old_log() {
        let dir = test_dir("migrate");
        std::fs::write(
            dir.join("slash.log"),
            "[09/10/2026 12:00:00] \"G\" #c: U: /a\n",
        )
        .unwrap();
        assert!(migrate_legacy_log_in(&dir));
        assert!(!dir.join("slash.log").exists());
        let json: Vec<ParsedSavedCommand> =
            serde_json::from_str(&std::fs::read_to_string(dir.join("slash.log.json")).unwrap())
                .unwrap();
        assert_eq!(json.len(), 1);
        assert_eq!(json[0].command, "/a");
        assert!(!migrate_legacy_log_in(&dir));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
