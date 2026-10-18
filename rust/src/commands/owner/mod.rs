// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/owner/* via ownerHelper +
// blacklistTable. Bot-level owners merge config (env OWNERS) with the
// persisted owner table (kv scope "0", see crate::db::bot_owner_ids);
// guild owners live in kv (`OWNER.<uid>`, see crate::db::guild_owner_ids).
// Blacklist: bot table BLACKLIST.<uid> {reason} +
// guild table <guild>.BLACKLIST.<uid>. Eval is a dev-gated stub:
// arbitrary JS execution has no Rust equivalent, so the `isBotDev`
// gate answers ephemeral `No` for non-devs and the dev leg refuses
// (see `main::eval`).
// Prefix note: TS `unowner`/`bl` were top-level commands; restored
// as thin top-level delegates (`unowner_alias`, `bl_alias`,
// registered in commands/mod.rs) plus `owner` subcommand aliases.
// FLATTEN-B2: blacklist, unblacklist, blinfo, bledit and eval are
// top-level slash commands (exact TS names, in `main.rs`).

pub mod blacklist;
pub mod bledit;
pub mod blinfo;
pub mod entry;
pub mod eval;
pub mod helpers;
pub mod main;
pub mod owner;
pub mod scope;
pub mod store;
pub mod unblacklist;
pub mod unowner;
