// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/lastfm/* (login/config surface).
//
// Real auth + scrobbling need LASTFM_API_KEY / shared secret
// (lastFMScrobblerManager, live-only). Stored here: per-user username
// (LASTFM.<uid>) + guild switch (GUILD.LASTFM).

use crate::bot::Ctx;

pub fn lastfm_key(user_id: u64) -> String {
    format!("LASTFM.{user_id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_shape() {
        assert_eq!(lastfm_key(5), "LASTFM.5");
    }
}

pub mod config;
#[allow(clippy::module_inception)]
pub mod lastfm;
pub mod login;
pub mod status;

/// Old registry path (`lastfm::main::lastfm`) kept working.
pub mod main {
    pub use super::lastfm::*;
}
