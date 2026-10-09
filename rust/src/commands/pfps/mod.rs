// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/pfps/*.
//
// TS keys: <guild>.PFPS.disable (bool), <guild>.PFPS.channel.
// YAML: pfps_config_command_action_on/off, pfps_channel_*.

use crate::bot::Ctx;

pub use crate::commands::security::main::parse_on_off;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pfps_reuses_security_on_off_parser() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
    }
}

pub mod channel;
pub mod config;
#[allow(clippy::module_inception)]
pub mod pfps;

/// Old registry path (`pfps::main::pfps`) kept working.
pub mod main {
    pub use super::pfps::*;
}
