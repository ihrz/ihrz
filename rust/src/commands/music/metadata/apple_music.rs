// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
//
// Player-flow view over the Apple Music scraper port
// (`crate::metadata::apple_music`, itself a port of
// https://github.com/kisastractors/apple-music-metadata, src/index.ts:
// page fetch + `application/ld+json` MusicAlbum/MusicPlaylist blocks).
// Fetching lives in `crate::metadata::apple_music::search`; this module
// holds the pure player helpers: URL detection (TS `isAppleMusicURL`) and
// the Deezer re-search identifiers + normalized track metadata
// (TS `handleAppleMusic`).

use super::{non_empty_opt, TrackMeta};

/// Mirrors `isAppleMusicURL` (musicPlay.ts:122-128):
/// `new URL(url).host.includes("apple.com")`, false when unparsable.
/// Bug-for-bug: any host containing `apple.com` matches (e.g.
/// `pineapple.com`); enrichment falls back to Lavalink info on fetch
/// failure, so a false positive never breaks playback.
pub fn is_apple_music_url(url: &str) -> bool {
    super::host_of(url).contains("apple.com")
}

/// Single-song leg (musicPlay.ts:328): `` `${res.title} - ${res.artist.name}` ``.
pub fn song_query(title: &str, artist: &str) -> String {
    format!("{} - {}", title.trim(), artist.trim())
        .trim()
        .trim_matches('-')
        .trim()
        .to_string()
}

/// Album/playlist fan-out leg (musicPlay.ts:347):
/// `` `${track.title} ${track.artist.name}` `` (no dash, unlike the
/// single-song leg above).
pub fn list_query(title: &str, artist: &str) -> String {
    format!("{} {}", title.trim(), artist.trim())
        .trim()
        .to_string()
}

/// Normalized metadata for one Apple Music track (apple-metadata
// src/index.ts `Track`): `duration` is seconds (ISO-8601 `PTnMnS` via
/// `parseISODuration`), hence `* 1000`. The TS shape carries no artwork
/// field, so `artwork_url` is always None (gap vs Spotify previews).
pub fn track_meta(t: &crate::metadata::apple_music::Track) -> TrackMeta {
    let author = non_empty_opt(Some(t.artist.name.as_str()));
    TrackMeta {
        title: t.title.clone(),
        identifier: song_query(&t.title, author.as_deref().unwrap_or("")),
        author,
        artwork_url: None,
        uri: t.url.clone(),
        duration_ms: Some(t.duration.saturating_mul(1000)),
        date: None,
        source: super::super::MetaSource::Apple,
    }
}

/// One normalized entry per album/playlist track for the Deezer fan-out
/// (TS `handleAppleMusic` maps `res.tracks.slice(0, 100)`,
/// musicPlay.ts:340-358; the cap lives at the fan-out).
/// Returns the collection title alongside (TS names the resulting
/// playlist `res.title ?? "Apple Music Playlist"`, musicPlay.ts:372).
pub fn track_metas_from_result(
    r: &crate::metadata::apple_music::AppleResult,
) -> (String, Vec<TrackMeta>) {
    match r {
        crate::metadata::apple_music::AppleResult::Song(t) => {
            (t.title.clone(), vec![track_meta(t)])
        }
        crate::metadata::apple_music::AppleResult::Album(a) => {
            (a.title.clone(), a.tracks.iter().map(track_meta).collect())
        }
        crate::metadata::apple_music::AppleResult::Playlist(p) => {
            (p.title.clone(), p.tracks.iter().map(track_meta).collect())
        }
    }
}
