// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/stats/*.
//
// TS keys: <guild>.STATS (guild aggregates), <guild>.STATS.USER.<uid>
// {messages[], voices[]} histories + aggregate counters. Window
// calculators + ustats periods/top-channels ported (text form; the
// TS PNG cards stay pending); compare (pure embed) fully ported.

pub mod main;
