// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
// Copyright (c) 2020-2026 iHorizon
//
// Music-provider metadata providers, ported from the kisastractors
// TypeScript packages (MIT, by Anais Saraiva):
// - spotify  -> https://github.com/kisastractors/spotify-metadata
// - apple    -> https://github.com/kisastractors/apple-music-metadata
// - amazon   -> https://github.com/kisastractors/amazon-music-metadata
// - tidal    -> https://github.com/kisastractors/tidal-metadata
//
// Each submodule keeps the original function surface and scrape targets;
// parsing is defensive (embed-page shapes are not guaranteed).

pub mod amazon_music;
pub mod apple_music;
pub mod spotify;
pub mod tidal;
