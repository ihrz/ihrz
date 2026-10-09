// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/music/* (14 subs).
//
// Full audio (LavalinkManager, queue, voice connect) pending lavalink-rs
// wiring; see voice.rs guards + PORT_INVENTORY.md. Ported for real:
// MUSIC_HISTORY store (buffer/embed, 30d purge), volume clamp, loop mode
// parsing, lyrics truncation. Play/skip/stop/pause/resume/queue/clear/
// shuffle/nowplaying/trackinfo answer with the node state once wired.

pub mod main;
