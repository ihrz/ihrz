// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/owner/* via ownerHelper +
// blacklistTable. Bot-level owners merge config (env OWNERS) with the
// persisted owner table (kv scope "0", see crate::db::bot_owner_ids);
// guild owners live in kv (`OWNER.<uid>`, see crate::db::guild_owner_ids).
// Blacklist: bot table BLACKLIST.<uid> {reason} +
// guild table <guild>.BLACKLIST.<uid>. Eval is intentionally NOT ported
// (arbitrary code execution has no Rust equivalent).

pub mod main;
