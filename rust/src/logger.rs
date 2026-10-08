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
