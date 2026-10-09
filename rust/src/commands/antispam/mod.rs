// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/antispam/* (!manage 780l,
// !bypass-roles, !ignore-channels).
//
// TS keys: GUILD.ANTISPAM {ignoreBots, maxInterval, enabled, threshold,
// removeMessages, punishment, punishTime}, GUILD.ANTISPAM.BYPASS_CHANNELS[],
// GUILD.ANTISPAM.BYPASS_ROLES[].
// The 780-line collector UI (!manage) is flattened to direct subcommands;
// runtime detection lives in Events/antispam (pending).

pub mod main;
