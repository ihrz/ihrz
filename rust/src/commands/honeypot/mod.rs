// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/honeypot/* (config) +
// honeypotManager lure trigger (simplified single-pass).
//
// TS keys: GUILD.HONEYPOT {enabled, channelId}. TS runs two passes
// (1500ms + 8000ms) in a 2h window; the Rust port bans on lure claim
// after a 2s grace delay. Custom_id: honeypot-claim.

pub mod main;
