// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/owner/* via ownerHelper +
// blacklistTable. Bot-level owners come from config (env OWNERS); guild
// owners live in kv. Blacklist: bot table BLACKLIST.<uid> {reason} +
// guild table <guild>.BLACKLIST.<uid>. Eval is intentionally NOT ported
// (arbitrary code execution has no Rust equivalent).

pub mod main;
