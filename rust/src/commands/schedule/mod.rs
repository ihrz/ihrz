// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/schedule/schedule.ts.
// TS flow: select menu (create / delete / delete-all / list) + modal
// (name 5..30, desc 10..400) + duration via timeCalculator.to_ms +
// 16-char code via generatePassword + scheduleTable per user id.

pub mod main;
