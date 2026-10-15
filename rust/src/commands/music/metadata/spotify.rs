// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
//
// Player-flow view over the Spotify scraper port (`crate::metadata::spotify`,
// itself a port of https://github.com/kisastractors/spotify-metadata,
// src/index.ts). Fetching lives in `crate::metadata::spotify` (`get_details`
// over the embed page); this module holds the small pure helpers the player
// needs: URL detection (TS `isSpotifyURL`) and the Deezer re-search
// identifiers + normalized track metadata (TS `handleSpotify`).

use super::{non_empty_opt, TrackMeta};

/// Mirrors `isSpotifyURL` (musicPlay.ts:106-112):
/// `new URL(url).host.includes("spotify")`, false when unparsable.
/// Any scheme with an authority counts (`ftp:`/`spotify:` hosts match);
/// opaque `spotify:` URIs stay hostless and do NOT match here (same as
/// `crate::lavalink::is_spotify_url`); the display-enrichment
/// `spotify:` arm lives in `detect_meta_source` and is pinned by its test.
pub fn is_spotify_url(url: &str) -> bool {
    super::host_of(url).contains("spotify")
}

/// Deezer re-search identifier for one Spotify track.
/// Mirrors `handleSpotify` (musicPlay.ts:162 single, :177 playlist):
/// `` `${track.artist} ${track.name}` `` — space-joined, no dash, source
/// `deezer` in both legs.
pub fn deezer_query(artist: &str, name: &str) -> String {
    format!("{} {}", artist.trim(), name.trim())
        .trim()
        .to_string()
}

/// Normalized metadata for a Spotify preview (`getPreview` shape,
/// spotify-metadata src/index.ts `getPreview`).
/// `duration_ms` is None: the TS `Preview` carries no duration; per-track
/// millisecond durations live on `Details.tracks[i].duration`
/// (`track_meta` below).
pub fn preview_meta(p: &crate::metadata::spotify::Preview) -> TrackMeta {
    let author = non_empty_opt(p.artist.as_deref());
    TrackMeta {
        title: p.title.clone(),
        identifier: deezer_query(author.as_deref().unwrap_or(""), &p.track),
        author,
        artwork_url: non_empty_opt(p.image.as_deref()),
        uri: p.link.clone(),
        duration_ms: None,
        date: p.date.clone(),
        source: super::super::MetaSource::Spotify,
    }
}

/// Normalized metadata for one Spotify track (`getTracks`/`Details.tracks`
/// shape, spotify-metadata src/index.ts `toTrack`): `duration` is
/// milliseconds from the embed page; `uri` is the `spotify:` URI
/// (the http link comes from `getLink(data)` on the parent entity).
pub fn track_meta(t: &crate::metadata::spotify::Track) -> TrackMeta {
    let author = non_empty_opt(t.artist.as_deref());
    TrackMeta {
        title: t.name.clone(),
        identifier: deezer_query(author.as_deref().unwrap_or(""), &t.name),
        author,
        artwork_url: None,
        uri: t.uri.clone(),
        duration_ms: t.duration.map(|ms| ms.max(0.0) as u64),
        date: None,
        source: super::super::MetaSource::Spotify,
    }
}

/// One normalized entry per `Details` track (TS `handleSpotify` fans out
/// over `spotifyRes.tracks`, musicPlay.ts:170-188; the 100-track cap lives
/// at the fan-out, like `deezer_fan_out_queries().take(100)`).
pub fn track_metas_from_details(d: &crate::metadata::spotify::Details) -> Vec<TrackMeta> {
    d.tracks.iter().map(track_meta).collect()
}
