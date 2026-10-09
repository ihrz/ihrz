// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/moderation/* (mod.ts + 23 subs).
//
// TS keys: <guild>.USER.<uid>.WARNS [{id, reason, at}]. The rest (ban, kick,
// timeout, channel lock) is native Discord API. rolepanel (collectors) stays
// pending; see PORT_INVENTORY.md.

pub mod main;
