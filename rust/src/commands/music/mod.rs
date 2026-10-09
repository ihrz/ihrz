// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/music/* (14 subs).
//
// Live audio via crate::lavalink (LavalinkManager, queue, voice
// handshake). Ported for real:
// MUSIC_HISTORY store (buffer/embed, 30d purge), volume clamp, loop mode
// parsing, lyrics truncation + text-API lookup, duration formatting.
// Play/skip/stop/pause/resume/queue/clear/
// shuffle/nowplaying/trackinfo answer from the live player state once a
// node is configured; lyrics stays on a text API by design.

pub mod main;
