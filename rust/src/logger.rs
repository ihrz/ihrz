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
// leaked one fd per error until EMFILE). Rust has no unhandledRejection
// event; async task failures are logged at their spawn sites, while this
// panic hook covers the uncaughtException leg. Date stamp reuses
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_log_entry_matches_ts_shape() {
        // 2026-10-09 00:00:00 UTC = 1791504000.
        let entry = error_log_entry("boom", 1791504000);
        assert_eq!(entry, "[09/10/2026 00:00:00]\nboom\r\n");
    }

    #[test]
    fn error_log_path_targets_src_files() {
        assert!(error_log_path().ends_with("src/files/error.log"));
    }
}
