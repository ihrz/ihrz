// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/antispam/* (!manage 780l,
// !bypass-roles, !ignore-channels).
//
// TS keys: GUILD.ANTISPAM {ignoreBots, maxInterval, enabled, threshold,
// removeMessages, punishment, punishTime}, GUILD.ANTISPAM.BYPASS_CHANNELS[],
// GUILD.ANTISPAM.BYPASS_ROLES[].
// The 780-line collector UI (!manage) is flattened to direct subcommands;
// runtime detection lives in Events/antispam (pending).

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AntispamConfig {
    #[serde(default = "on")]
    pub enabled: bool,
    #[serde(default = "def_threshold")]
    pub threshold: u32,
    #[serde(default = "def_interval")]
    pub max_interval_ms: i64,
    #[serde(default = "on")]
    pub remove_messages: bool,
    #[serde(default)]
    pub punishment: String,
    #[serde(default)]
    pub punish_time_ms: i64,
}

fn on() -> bool {
    true
}
fn def_threshold() -> u32 {
    5
}
fn def_interval() -> i64 {
    2000
}

impl Default for AntispamConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            threshold: 5,
            max_interval_ms: 2000,
            remove_messages: true,
            punishment: "mute".into(),
            punish_time_ms: 600_000,
        }
    }
}

pub const ANTISPAM_KEY: &str = "GUILD.ANTISPAM";

/// Sliding-window check: true when `count` messages inside `interval_ms`
/// reach the threshold (pure core of the detector).
pub fn window_tripped(count: u32, threshold: u32, interval_ms: i64, max_interval_ms: i64) -> bool {
    threshold > 0 && interval_ms <= max_interval_ms && count >= threshold
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn window_logic() {
        assert!(window_tripped(5, 5, 1000, 2000));
        assert!(!window_tripped(4, 5, 1000, 2000));
        assert!(!window_tripped(9, 5, 5000, 2000));
        assert!(!window_tripped(9, 0, 100, 2000));
    }
}

#[allow(clippy::module_inception)]
pub mod antispam;
pub mod bypass_roles;
pub mod ignore_channels;
pub mod manage;

/// Old registry path (`antispam::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::antispam::*;
    pub use super::bypass_roles::*;
    pub use super::ignore_channels::*;
    pub use super::manage::*;
    pub use super::*;
}
