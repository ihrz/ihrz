// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/backup/* via src/core/backup/*.
//
// TS stores full guild snapshots (roles/channels/messages/threads/emojis)
// in metasTable BACKUPS.<user>.<id> + files. The Rust port snapshots the
// bot-side kv state per guild (config backup) with the same command shape:
// create/list/load/delete. Full Discord-object restore is pending.

pub mod main;
