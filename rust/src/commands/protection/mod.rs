// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/protection/* (protect parent,
// actions, sanction, show, allowlist/*) via authorization.ts rules.
//
// TS keys: PROTECTION.<rule> {allow}, PROTECTION.SANCTION,
// ALLOWLIST.list.<uid> {allowed}.

pub mod backup;
pub mod protect;
