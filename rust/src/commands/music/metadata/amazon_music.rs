// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
//
// Player-flow view over the Amazon Music scraper port
// (`crate::metadata::amazon_music`, itself a port of
// https://github.com/kisastractors/amazon-music-metadata, src/index.ts:
// region skill-endpoint catalog API keyed by page domain).
// Fetching lives in `crate::metadata::amazon_music::search(input, domain)`;
// this module holds the pure player helpers: URL detection
// (TS `isAmazonMusicURL`) and the Deezer re-search identifiers +
// normalized track metadata (TS `handleAmazonMusic`).

use super::{non_empty_opt, TrackMeta};

/// Mirrors `isAmazonMusicURL` (musicPlay.ts:130-136):
/// `new URL(url).host.includes("amazon")`, false when unparsable.
pub fn is_amazon_music_url(url: &str) -> bool {
    super::host_of(url).contains("amazon")
}

/// Single-song leg (musicPlay.ts:486): `` `${res.title} - ${res.artist.name}` ``.
pub fn song_query(title: &str, artist: &str) -> String {
    format!("{} - {}", title.trim(), artist.trim())
        .trim()
        .trim_matches('-')
        .trim()
        .to_string()
}

/// Album/playlist fan-out leg (musicPlay.ts:505):
/// `` `${track.title} ${track.artist.name}` `` (no dash).
pub fn list_query(title: &str, artist: &str) -> String {
    format!("{} {}", title.trim(), artist.trim())
        .trim()
        .to_string()
}

/// Normalized metadata for one Amazon Music track (amazon-metadata
// src/index.ts `Track`): `duration` is seconds (`M:SS` via
/// `durationToSeconds`), hence `* 1000`. No artwork field in the TS
/// shape, so `artwork_url` is always None (gap vs Spotify previews).
/// Playlist items without a resolved ASIN carry `url == ""` (TS
/// `toRawPlaylist`: `id ? ... : ""`); the empty uri is preserved as-is.
pub fn track_meta(t: &crate::metadata::amazon_music::Track) -> TrackMeta {
    let author = non_empty_opt(Some(t.artist.name.as_str()));
    TrackMeta {
        title: t.title.clone(),
        identifier: song_query(&t.title, author.as_deref().unwrap_or("")),
        author,
        artwork_url: None,
        uri: t.url.clone(),
        duration_ms: Some(t.duration.saturating_mul(1000)),
        date: None,
        source: super::super::MetaSource::Amazon,
    }
}

/// One normalized entry per album/playlist track for the Deezer fan-out
/// (TS `handleAmazonMusic` maps `res.tracks.slice(0, 100)`,
/// musicPlay.ts:498-516; the cap lives at the fan-out).
/// Returns the collection title alongside (TS names the resulting
/// playlist `res.title ?? "Apple Music Playlist"` — copy-paste in the
/// TS source at musicPlay.ts:530, kept verbatim by the player).
pub fn track_metas_from_result(
    r: &crate::metadata::amazon_music::AmazonResult,
) -> (String, Vec<TrackMeta>) {
    match r {
        crate::metadata::amazon_music::AmazonResult::Song(t) => {
            (t.title.clone(), vec![track_meta(t)])
        }
        crate::metadata::amazon_music::AmazonResult::Album(a) => {
            (a.title.clone(), a.tracks.iter().map(track_meta).collect())
        }
        crate::metadata::amazon_music::AmazonResult::Playlist(p) => {
            (p.title.clone(), p.tracks.iter().map(track_meta).collect())
        }
    }
}
