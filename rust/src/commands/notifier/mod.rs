// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/notifier/* +
// src/core/StreamNotifier.ts (config surface).
//
// TS keys: NOTIFIER.users[] {id_or_username, platform}, NOTIFIER.channelId,
// NOTIFIER.message, NOTIFIER.lastMediaNotified. Live author validation +
// 120s polling pending API keys; dedup helper in notifier.rs.

pub mod main;
