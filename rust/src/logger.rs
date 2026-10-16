// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/logger.ts (global logger, no console.* in TS).

use tracing_subscriber::{fmt, EnvFilter};

pub fn init() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        if std::env::var("DEV_MODE").as_deref() == Ok("1") {
            EnvFilter::new("info,ihrz=debug")
        } else {
            EnvFilter::new("info")
        }
    });

    let _ = fmt().with_env_filter(filter).with_target(false).try_init();
}

// ---- errorManager ----
// Mirrors src/core/modules/errorManager.ts: uncaught errors are logged
// and, outside dev mode, appended to src/files/error.log one entry at a
// time (never holding a descriptor open — the old TS streaming version
// leaked one fd per error until EMFILE). The panic hook below covers the
// uncaughtException leg; report_rejection/spawn_tracked cover the
// unhandledRejection leg (TS: unconditional console.error + gated file
// append). Rust has no process-wide rejection event, so async failures
// must be routed through these explicitly. Date stamp reuses
// funcs::format_date with the same "DD/MM/YYYY HH:mm:ss" tokens.

/// Mirrors the TS `<cwd>/src/files/error.log` location. The TS cwd is
/// the repo root, so when the binary runs from `rust/` (cargo run) the
/// parent dir is used if it holds `src/files`.
pub fn error_log_path() -> std::path::PathBuf {
    let cwd = std::env::current_dir().unwrap_or_default();
    let direct = cwd.join("src").join("files");
    if direct.is_dir() {
        return direct.join("error.log");
    }
    if let Some(parent) = cwd.parent() {
        if parent.join("src").join("files").is_dir() {
            return parent.join("src").join("files").join("error.log");
        }
    }
    direct.join("error.log")
}

/// Mirrors the TS entry: `[DD/MM/YYYY HH:mm:ss]\n{detail}\r\n`.
pub fn error_log_entry(detail: &str, unix_secs: i64) -> String {
    format!(
        "[{}]\n{detail}\r\n",
        crate::funcs::format_date(unix_secs, "DD/MM/YYYY HH:mm:ss")
    )
}

fn now_unix_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Append one entry, closing the file immediately (no fd held).
pub fn append_error_log(detail: &str) {
    let path = error_log_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let entry = error_log_entry(detail, now_unix_secs());
    use std::io::Write;
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        let _ = file.write_all(entry.as_bytes());
    }
}

/// Install the panic hook. Mirrors uncaughtExceptionHandler's devMode
/// gate: dev logs to console only, otherwise the entry is also saved.
/// Call with `!is_production_env()` (BOT_ENV=production saves to file).
pub fn install_error_handlers(dev_mode: bool) {
    std::panic::set_hook(Box::new(move |info| {
        let detail = format!("{info}");
        if dev_mode {
            tracing::error!("{detail}");
        } else {
            tracing::error!("Error detected");
            tracing::error!("Save in the logs");
            append_error_log(&detail);
        }
    }));
}

/// Central async-failure handler. Mirrors the TS unhandledRejection leg
/// (errorManager.ts:65-77): the detail is ALWAYS emitted via
/// tracing::error (the unconditional `console.error(err)` equivalent),
/// and outside dev mode the marker lines are emitted and the entry is
/// also appended to error.log. Pass the same `dev_mode` flag used for
/// install_error_handlers.
pub fn report_rejection(detail: &str, dev_mode: bool) {
    tracing::error!("{detail}");
    if !dev_mode {
        tracing::error!("Error detected");
        tracing::error!("Save in the logs");
        append_error_log(detail);
    }
}

/// Await-site convention for fallible async work: routes Err through
/// report_rejection (with task-name context) and folds to Option.
/// Usage: `let Some(x) = logger::log_task_outcome("rss-poll", dev, fetch().await) else { return };`
pub fn log_task_outcome<T, E: std::fmt::Display>(
    task_name: &str,
    dev_mode: bool,
    result: Result<T, E>,
) -> Option<T> {
    match result {
        Ok(value) => Some(value),
        Err(err) => {
            report_rejection(&format!("{task_name}: {err}"), dev_mode);
            None
        }
    }
}

/// Fire-and-forget convention replacing bare `tokio::spawn`: the task's
/// Err outcome is routed through report_rejection instead of being
/// silently dropped (the closest Rust analogue to unhandledRejection).
/// Usage: `logger::spawn_tracked("presence-refresh", dev, async move { ... Ok(()) });`
pub fn spawn_tracked<T, E, F>(
    task_name: &'static str,
    dev_mode: bool,
    fut: F,
) -> tokio::task::JoinHandle<()>
where
    F: std::future::Future<Output = Result<T, E>> + Send + 'static,
    T: Send + 'static,
    E: std::fmt::Display + Send + 'static,
{
    tokio::spawn(async move {
        log_task_outcome(task_name, dev_mode, fut.await);
    })
}

/// Shard tag for log lines. Mirrors the `SHARD#${shardId}` stamp in
/// src/core/logger.ts getCurrentTime (`global.client?.shard?.ids[0]`,
/// `?? "X"` when unsharded). Pass None for the unsharded fallback.
pub fn shard_tag(shard_id: Option<&str>) -> String {
    format!("SHARD#{}", shard_id.unwrap_or("X"))
}

/// Full log-line prefix. Mirrors formatMessage's
/// `[${timestamp} ${level}]:` where timestamp already carries the
/// shard tag (`SHARD#<id> <locale timestamp>`).
pub fn log_prefix(shard_id: Option<&str>, timestamp: &str, level: &str) -> String {
    format!("[{} {timestamp} {level}]:", shard_tag(shard_id))
}

/// Current shard id from the environment. The serenity shard id is only
/// known at runtime in the event handler; SHARD_ID lets operators tag
/// logs for single-shard runs, otherwise the TS "X" fallback applies.
pub fn current_shard_id() -> Option<String> {
    std::env::var("SHARD_ID")
        .ok()
        .filter(|s| !s.trim().is_empty())
}

/// ANSI table mirroring `src/core/functions/colors.ts` (W6 slice 175,
/// U-ETERNAL-357). TS decorates dev-console output via 24
/// `String.prototype` getters, each `code + this + Reset` verbatim
/// (node battery `slice175-colors.mjs`: ALL GREEN -- empty/unicode/
/// inner-reset/chaining/multiline/padded all verbatim, descriptors
/// non-enumerable + configurable, 5 logger level legs green/yellow/
/// red/cyan/gray). Dev-console decoration only, zero Discord-visible
/// behavior: live Rust logging goes through tracing_subscriber (own
/// ANSI), so this table pins the byte contract and has zero live
/// callers (dead-helper parity).
pub mod ansi {
    pub const BLACK: &str = "\u{1b}[30m";
    pub const RED: &str = "\u{1b}[31m";
    pub const GREEN: &str = "\u{1b}[32m";
    pub const YELLOW: &str = "\u{1b}[33m";
    pub const BLUE: &str = "\u{1b}[34m";
    pub const MAGENTA: &str = "\u{1b}[35m";
    pub const CYAN: &str = "\u{1b}[36m";
    pub const WHITE: &str = "\u{1b}[37m";
    pub const BG_BLACK: &str = "\u{1b}[40m";
    pub const BG_RED: &str = "\u{1b}[41m";
    pub const BG_GREEN: &str = "\u{1b}[42m";
    pub const BG_YELLOW: &str = "\u{1b}[43m";
    pub const BG_BLUE: &str = "\u{1b}[44m";
    pub const BG_MAGENTA: &str = "\u{1b}[45m";
    pub const BG_CYAN: &str = "\u{1b}[46m";
    pub const BG_WHITE: &str = "\u{1b}[47m";
    pub const DIM: &str = "\u{1b}[2m";
    pub const ITALIC: &str = "\u{1b}[3m";
    pub const UNDERLINE: &str = "\u{1b}[4m";
    pub const INVERSE: &str = "\u{1b}[7m";
    pub const HIDDEN: &str = "\u{1b}[8m";
    pub const STRIKETHROUGH: &str = "\u{1b}[9m";
    pub const GRAY: &str = "\u{1b}[90m";
    pub const BOLD: &str = "\u{1b}[1m";
    pub const RESET: &str = "\u{1b}[0m";

    /// Mirrors one TS getter: `colorCode + this + Color.Reset`.
    pub fn wrap(code: &str, s: &str) -> String {
        format!("{code}{s}{RESET}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_log_entry_matches_ts_shape() {
        // TS renders `format(new Date(), "DD/MM/YYYY HH:mm:ss")` with
        // server-local getters, so the pin follows chrono::Local
        // (1791504000 = 2026-10-09 00:00:00 UTC = 02:00:00 CEST).
        use chrono::{Datelike, Local, TimeZone, Timelike};
        let dt = Local.timestamp_opt(1791504000, 0).single().unwrap();
        let expect = format!(
            "[{:02}/{:02}/{:04} {:02}:{:02}:{:02}]",
            dt.day(),
            dt.month(),
            dt.year(),
            dt.hour(),
            dt.minute(),
            dt.second()
        );
        let entry = error_log_entry("boom", 1791504000);
        assert!(entry.starts_with(&expect));
        // Full TS shape `[ts] LF detail CR LF` (escapes avoided via char codes).
        let nl = char::from(10u8);
        let cr = char::from(13u8);
        assert_eq!(entry, format!("{expect}{nl}boom{cr}{nl}"));
    }

    #[test]
    fn error_log_path_targets_src_files() {
        assert!(error_log_path().ends_with("src/files/error.log"));
    }

    #[test]
    fn log_task_outcome_passes_ok_through() {
        let out: Option<u32> = log_task_outcome("probe", true, Ok::<u32, &str>(7));
        assert_eq!(out, Some(7));
    }

    #[test]
    fn log_task_outcome_folds_err_to_none() {
        // dev_mode=true so no error.log write; only the unconditional log fires.
        let out: Option<u32> = log_task_outcome("probe", true, Err("boom"));
        assert_eq!(out, None);
    }

    #[test]
    fn shard_prefix_matches_ts_shape() {
        // TS getCurrentTime: `SHARD#${ids[0] ?? "X"} ${timestamp}`,
        // formatMessage wraps as `[${timestamp} ${level}]:`.
        assert_eq!(shard_tag(Some("0")), "SHARD#0");
        assert_eq!(shard_tag(None), "SHARD#X");
        assert_eq!(
            log_prefix(Some("2"), "10/10/2026, 12:00:00", "LOG"),
            "[SHARD#2 10/10/2026, 12:00:00 LOG]:"
        );
        assert_eq!(
            log_prefix(None, "10/10/2026, 12:00:00", "ERR"),
            "[SHARD#X 10/10/2026, 12:00:00 ERR]:"
        );
    }

    #[tokio::test]
    async fn spawn_tracked_completes_ok_task() {
        let handle = spawn_tracked("probe-ok", true, async { Ok::<u32, &str>(7) });
        assert!(handle.await.is_ok());
    }

    #[tokio::test]
    async fn spawn_tracked_swallows_err_without_panic() {
        let handle = spawn_tracked("probe-err", true, async { Err::<u32, &str>("boom") });
        assert!(handle.await.is_ok());
    }

    #[test]
    fn ansi_table_matches_ts_colors_getters() {
        // Battery slice175-colors.mjs (node, ALL GREEN): every getter is
        // `code + s + Reset` verbatim. Escapes via char codes, no raw ESC.
        use super::ansi::*;
        let e = |n: u8| char::from(n);
        let esc = e(27);
        // All 24 codes byte-exact.
        for (code, tail) in [
            (BLACK, "30m"),
            (RED, "31m"),
            (GREEN, "32m"),
            (YELLOW, "33m"),
            (BLUE, "34m"),
            (MAGENTA, "35m"),
            (CYAN, "36m"),
            (WHITE, "37m"),
            (BG_BLACK, "40m"),
            (BG_RED, "41m"),
            (BG_GREEN, "42m"),
            (BG_YELLOW, "43m"),
            (BG_BLUE, "44m"),
            (BG_MAGENTA, "45m"),
            (BG_CYAN, "46m"),
            (BG_WHITE, "47m"),
            (DIM, "2m"),
            (ITALIC, "3m"),
            (UNDERLINE, "4m"),
            (INVERSE, "7m"),
            (HIDDEN, "8m"),
            (STRIKETHROUGH, "9m"),
            (GRAY, "90m"),
            (BOLD, "1m"),
        ] {
            assert_eq!(code, format!("{esc}[{tail}"));
        }
        assert_eq!(RESET, format!("{esc}[0m"));
        // Wrap legs: plain, empty, unicode, inner-reset, chain, multiline.
        assert_eq!(wrap(RED, "hi"), "\u{1b}[31mhi\u{1b}[0m");
        assert_eq!(wrap(GREEN, ""), "\u{1b}[32m\u{1b}[0m");
        assert_eq!(wrap(CYAN, "日本語"), "\u{1b}[36m日本語\u{1b}[0m");
        assert_eq!(
            wrap(GREEN, &format!("a{esc}[0mb")),
            format!("\u{1b}[32ma{esc}[0mb\u{1b}[0m")
        );
        assert_eq!(
            wrap(BOLD, &wrap(RED, "x")),
            "\u{1b}[1m\u{1b}[31mx\u{1b}[0m\u{1b}[0m"
        );
        assert_eq!(wrap(YELLOW, "a\nb"), "\u{1b}[33ma\nb\u{1b}[0m");
        // Logger level legs (logger.ts:79-94): LOG/WARN/ERROR/LEGACY/DEBUG.
        assert_eq!(wrap(GREEN, "P"), "\u{1b}[32mP\u{1b}[0m");
        assert_eq!(wrap(YELLOW, "P"), "\u{1b}[33mP\u{1b}[0m");
        assert_eq!(wrap(RED, "P"), "\u{1b}[31mP\u{1b}[0m");
        assert_eq!(wrap(CYAN, "P"), "\u{1b}[36mP\u{1b}[0m");
        assert_eq!(wrap(GRAY, "P"), "\u{1b}[90mP\u{1b}[0m");
    }
}
