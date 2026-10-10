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
// NaN, which becomes null in JSON); attachment option values log
// their URL (TS String()s the object); unresolvable channel/guild
// names fall back to ids instead of throwing.

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

/// Split resolved options into (subcommand path, leaf options).
/// Mirrors the _subcommand/getSubcommandGroup/getSubcommand block:
/// "group sub", "sub", or "" with the hoisted leaf options.
pub fn split_command_options<'a>(
    opts: &'a [serenity::ResolvedOption<'a>],
) -> (String, Vec<(String, String)>) {
    let mut sub = String::new();
    let mut leaves: &[serenity::ResolvedOption<'a>] = opts;
    if let Some(first) = opts.first() {
        match &first.value {
            serenity::ResolvedValue::SubCommandGroup(inner) => {
                if let Some(sub_cmd) = inner.first() {
                    sub = format!("{} {}", first.name, sub_cmd.name);
                    if let serenity::ResolvedValue::SubCommand(leaf_opts) = &sub_cmd.value {
                        leaves = leaf_opts;
                    } else {
                        leaves = inner;
                    }
                }
            }
            serenity::ResolvedValue::SubCommand(inner) => {
                sub = first.name.to_string();
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

/// Parse DD/MM/YYYY HH:MM:SS in local time to unix ms. Mirrors
/// parseTimestamp (new Date(y, m-1, d, H, M, S)); invalid input is
/// None (TS yields NaN there).
pub fn parse_legacy_timestamp(raw: &str) -> Option<i64> {
    let (date_part, time_part) = raw.split_once(' ')?;
    let mut date = date_part.split('/');
    let (day, month, year) = (
        date.next()?.parse::<u32>().ok()?,
        date.next()?.parse::<u32>().ok()?,
        date.next()?.parse::<i32>().ok()?,
    );
    if date.next().is_some() {
        return None;
    }
    let mut time = time_part.split(':');
    let (hour, min, sec) = (
        time.next()?.parse::<u32>().ok()?,
        time.next()?.parse::<u32>().ok()?,
        time.next()?.parse::<u32>().ok()?,
    );
    if time.next().is_some() {
        return None;
    }
    chrono::Local
        .with_ymd_and_hms(year, month, day, hour, min, sec)
        .single()
        .map(|d| d.timestamp_millis())
}

/// Parse one legacy text-log line:
/// `[timestamp] "guild" #channel: user: command`.
/// Mirrors parseLine (channelId is always "0" there).
pub fn parse_legacy_line(line: &str) -> Option<ParsedSavedCommand> {
    let line = line.trim();
    let rest = line.strip_prefix('[')?;
    let end = rest.find(']')?;
    let timestamp = parse_legacy_timestamp(rest[..end].trim())?;
    let rest = rest[end + 1..].trim_start_matches(' ');
    let rest = rest.strip_prefix('"')?;
    let end = rest.find('"')?;
    let guild_name = rest[..end].trim().to_string();
    let rest = rest[end + 1..].trim_start_matches(' ');
    let rest = rest.strip_prefix('#')?;
    let split = rest.find(':')?;
    let channel_name = rest[..split].trim().to_string();
    let rest = rest[split + 1..].trim_start_matches(' ');
    let split = rest.find(':')?;
    let executor_username = rest[..split].trim().to_string();
    let command = rest[split + 1..].trim().to_string();
    Some(ParsedSavedCommand {
        guild_name,
        guild_id: None,
        executor_username,
        timestamp,
        channel_name,
        channel_id: "0".to_string(),
        command,
    })
}

/// Parse a whole legacy log, joining continuation lines exactly like
/// TS parse() (lines not starting with `[` are skipped or glued to
/// the previous bracket line; the trailing-space join is harmless
/// because parse_legacy_line trims).
pub fn parse_legacy_log(log_text: &str) -> Vec<ParsedSavedCommand> {
    let lines: Vec<&str> = log_text
        .split('\n')
        .map(str::trim)
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
