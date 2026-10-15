// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
//
// Player-flow view over the Tidal scraper port (`crate::metadata::tidal`,
// itself a port of https://github.com/kisastractors/tidal-metadata,
// src/index.ts: `https://embed.tidal.com/{type}s/{id}` pages).
// Fetching lives in `crate::metadata::tidal::search`; this module holds
// the pure player helpers: URL detection (TS `isTidalURL`) and the Deezer
// re-search identifiers + normalized track metadata (TS `handleTidalMusic`).

use super::{non_empty_opt, TrackMeta};

/// Mirrors `isTidalURL` (musicPlay.ts:138-144):
/// `new URL(url).host.includes("tidal")`, false when unparsable.
pub fn is_tidal_url(url: &str) -> bool {
    super::host_of(url).contains("tidal")
}

/// Single-song leg (musicPlay.ts:407): `` `${res.title} - ${res.artist.name}` ``.
pub fn song_query(title: &str, artist: &str) -> String {
    format!("{} - {}", title.trim(), artist.trim())
        .trim()
        .trim_matches('-')
        .trim()
        .to_string()
}

/// Album/playlist fan-out leg (musicPlay.ts:426):
/// `` `${track.title} ${track.artist.name}` `` (no dash).
pub fn list_query(title: &str, artist: &str) -> String {
    format!("{} {}", title.trim(), artist.trim())
        .trim()
        .to_string()
}

/// Normalized metadata for one Tidal track (tidal-metadata src/index.ts
/// `Track`): single-track `duration` is seconds (`<tidal-duration-time>`),
/// list items `M:SS`/`H:MM:SS` via `durationToSeconds` — both seconds,
/// hence `* 1000`. No artwork field in the TS shape, so `artwork_url` is
/// always None (gap vs Spotify previews).
pub fn track_meta(t: &crate::metadata::tidal::Track) -> TrackMeta {
    let author = non_empty_opt(Some(t.artist.name.as_str()));
    TrackMeta {
        title: t.title.clone(),
        identifier: song_query(&t.title, author.as_deref().unwrap_or("")),
        author,
        artwork_url: None,
        uri: t.url.clone(),
        duration_ms: Some(t.duration.saturating_mul(1000)),
        date: None,
        source: super::super::MetaSource::Tidal,
    }
}

/// One normalized entry per album/playlist track for the Deezer fan-out
/// (TS `handleTidalMusic` maps `res.tracks.slice(0, 100)`,
/// musicPlay.ts:419-437; the cap lives at the fan-out).
/// Returns the collection title alongside. Note the TS copy-paste at
/// musicPlay.ts:451 names the Tidal playlist `"Apple Music Playlist"`;
/// the player keeps the TS string verbatim.
pub fn track_metas_from_result(
    r: &crate::metadata::tidal::TidalResult,
) -> (String, Vec<TrackMeta>) {
    match r {
        crate::metadata::tidal::TidalResult::Song(t) => (t.title.clone(), vec![track_meta(t)]),
        crate::metadata::tidal::TidalResult::Album(a) => {
            (a.title.clone(), a.tracks.iter().map(track_meta).collect())
        }
        crate::metadata::tidal::TidalResult::Playlist(p) => {
            (p.title.clone(), p.tracks.iter().map(track_meta).collect())
        }
    }
}
