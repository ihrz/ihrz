// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
//
// Per-platform player-flow views over the `crate::metadata` scraper ports:
// - spotify      -> https://github.com/kisastractors/spotify-metadata
// - apple_music  -> https://github.com/kisastractors/apple-music-metadata
// - amazon_music -> https://github.com/kisastractors/amazon-music-metadata
// - tidal        -> https://github.com/kisastractors/tidal-metadata
//
// Each submodule mirrors its TS package's fetch strategy (documented
// per file) plus the player legs in `src/core/functions/musicPlay.ts`
// (`handleSpotify` / `handleAppleMusic` / `handleAmazonMusic` /
// `handleTidalMusic`: scrape metadata, re-search each track on Deezer,
// fall back to previous behavior on failure). Network fetching itself
// lives in `crate::metadata::*`; the live resolve path
// (`LavalinkManager::resolve_on`, read-only `lavalink.rs`) consumes those
// ports directly, and `detect_meta_source` below classifies URLs through
// these submodules so detection stays defined once.

pub mod amazon_music;
pub mod apple_music;
pub mod spotify;
pub mod tidal;

/// WHATWG `new URL(url).host` (lowercased, port kept unless default),
/// or `""` when the URL carries no usable host (mirrors the TS
/// `is*URL` guards reading false on unparsable/empty hosts). Defined
/// once in `crate::lavalink`.
pub(crate) fn host_of(url: &str) -> String {
    crate::lavalink::whatwg_host(url).unwrap_or_default()
}

pub(crate) fn non_empty_opt(s: Option<&str>) -> Option<String> {
    s.and_then(|v| {
        if v.trim().is_empty() {
            None
        } else {
            Some(v.to_string())
        }
    })
}

/// Unified player-facing track metadata: the common output shape across
/// the four scrapers (title/author/artwork/url/duration/identifier).
/// `identifier` is the Deezer re-search query exactly as the TS handler
/// builds it (per-platform `song_query`/`deezer_query`); `date` is
/// Spotify-preview-only (TS `Preview.date`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrackMeta {
    pub title: String,
    pub author: Option<String>,
    pub artwork_url: Option<String>,
    pub uri: String,
    pub duration_ms: Option<u64>,
    pub date: Option<String>,
    pub identifier: String,
    pub source: super::MetaSource,
}

impl TrackMeta {
    /// Fold back into the embed preview shape (field-for-field identical
    /// to the `preview_from_*` constructors: empty artist/image stay None).
    pub fn to_normalized(&self) -> super::NormalizedPreview {
        super::NormalizedPreview {
            title: self.title.clone(),
            artist: self.author.clone(),
            image: self.artwork_url.clone(),
            link: self.uri.clone(),
            date: self.date.clone(),
            source: Some(self.source),
        }
    }
}

/// Platform routing for a query URL, mirroring the `searchQueryOnNode`
/// branch order (musicPlay.ts:567-576): Spotify, then Apple, Amazon,
/// Tidal. YouTube / bare text / other URLs yield None (their legs live
/// in `resolve_on`, not here). Detection is host-`contains`, exactly like
/// the TS `is*URL` guards, so behavior matches
/// `crate::lavalink::is_*_url`.
pub fn classify(url: &str) -> Option<super::MetaSource> {
    if spotify::is_spotify_url(url) {
        return Some(super::MetaSource::Spotify);
    }
    if apple_music::is_apple_music_url(url) {
        return Some(super::MetaSource::Apple);
    }
    if amazon_music::is_amazon_music_url(url) {
        return Some(super::MetaSource::Amazon);
    }
    if tidal::is_tidal_url(url) {
        return Some(super::MetaSource::Tidal);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_routes_each_platform() {
        assert_eq!(
            classify("https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas"),
            Some(super::super::MetaSource::Spotify)
        );
        assert_eq!(
            classify("https://music.apple.com/us/album/butterfly/1541902791?i=1541903021"),
            Some(super::super::MetaSource::Apple)
        );
        assert_eq!(
            classify("https://music.amazon.fr/albums/B09M98Q74J?trackAsin=B09M996KL3"),
            Some(super::super::MetaSource::Amazon)
        );
        assert_eq!(
            classify("https://tidal.com/track/510366521/u"),
            Some(super::super::MetaSource::Tidal)
        );
        assert_eq!(
            classify("https://embed.tidal.com/tracks/510366521"),
            Some(super::super::MetaSource::Tidal)
        );
    }

    #[test]
    fn classify_leaves_non_provider_urls_alone() {
        assert_eq!(classify("https://www.youtube.com/watch?v=abc"), None);
        assert_eq!(classify("https://www.deezer.com/track/123"), None);
        assert_eq!(classify("just a query"), None);
        assert_eq!(classify("spotify:track:abc"), None);
        assert_eq!(classify(""), None);
    }

    #[test]
    fn deezer_identifiers_match_ts_shapes() {
        // Spotify: space-joined both legs (musicPlay.ts:162,177).
        assert_eq!(spotify::deezer_query("Artist", "Name"), "Artist Name");
        assert_eq!(spotify::deezer_query("", "Name"), "Name");
        // Apple/Amazon/Tidal single: "Title - Artist" (musicPlay.ts:328,486,407).
        assert_eq!(
            apple_music::song_query("butterfly", "Sody"),
            "butterfly - Sody"
        );
        assert_eq!(
            amazon_music::song_query("Vengeance !", "menace Santana"),
            "Vengeance ! - menace Santana"
        );
        assert_eq!(
            tidal::song_query("Serrure #667", "La Rvfleuze"),
            "Serrure #667 - La Rvfleuze"
        );
        // Album/playlist fan-out: space-joined (musicPlay.ts:347,505,426).
        assert_eq!(
            apple_music::list_query("butterfly", "Sody"),
            "butterfly Sody"
        );
        assert_eq!(
            amazon_music::list_query("Sur la piste", "X"),
            "Sur la piste X"
        );
        assert_eq!(tidal::list_query("T", "A"), "T A");
    }

    fn mock_track(
        name: &str,
        url: &str,
    ) -> (
        crate::metadata::apple_music::Track,
        crate::metadata::amazon_music::Track,
        crate::metadata::tidal::Track,
    ) {
        (
            crate::metadata::apple_music::Track {
                artist: crate::metadata::apple_music::Artist {
                    name: name.to_string(),
                    url: "https://music.apple.com/artist".to_string(),
                },
                duration: 189,
                title: "butterfly".to_string(),
                url: url.to_string(),
                kind: "song".to_string(),
            },
            crate::metadata::amazon_music::Track {
                artist: crate::metadata::amazon_music::Artist {
                    name: name.to_string(),
                    url: String::new(),
                },
                duration: 115,
                title: "Vengeance !".to_string(),
                url: url.to_string(),
                kind: "song".to_string(),
            },
            crate::metadata::tidal::Track {
                artist: crate::metadata::tidal::Artist {
                    name: name.to_string(),
                    url: String::new(),
                },
                duration: 148,
                title: "Serrure #667".to_string(),
                url: url.to_string(),
                kind: "song".to_string(),
            },
        )
    }

    #[test]
    fn track_metas_map_fields_seconds_to_ms() {
        let (apple, amazon, tidal) = mock_track("Sody", "https://example.com/t/1");
        let a = apple_music::track_meta(&apple);
        assert_eq!(a.title, "butterfly");
        assert_eq!(a.author.as_deref(), Some("Sody"));
        assert_eq!(a.duration_ms, Some(189_000));
        assert_eq!(a.identifier, "butterfly - Sody");
        assert_eq!(a.source, super::super::MetaSource::Apple);
        assert!(a.artwork_url.is_none());

        let b = amazon_music::track_meta(&amazon);
        assert_eq!(b.duration_ms, Some(115_000));
        assert_eq!(b.identifier, "Vengeance ! - Sody");
        assert_eq!(b.source, super::super::MetaSource::Amazon);

        let c = tidal::track_meta(&tidal);
        assert_eq!(c.duration_ms, Some(148_000));
        assert_eq!(c.identifier, "Serrure #667 - Sody");
        assert_eq!(c.source, super::super::MetaSource::Tidal);
    }

    #[test]
    fn empty_artist_collapses_and_round_trips_to_preview() {
        let (_, _, tidal) = mock_track("", "https://example.com/t/1");
        let m = tidal::track_meta(&tidal);
        assert!(m.author.is_none());
        assert_eq!(m.identifier, "Serrure #667");
        let p = m.to_normalized();
        assert_eq!(p.title, "Serrure #667");
        assert!(p.artist.is_none());
        assert_eq!(p.link, "https://example.com/t/1");
        assert_eq!(p.source, Some(super::super::MetaSource::Tidal));
    }

    #[test]
    fn spotify_preview_meta_maps_fields() {
        let p = crate::metadata::spotify::Preview {
            date: Some("2020-01-01T00:00:00.000Z".to_string()),
            title: "Immaterial".to_string(),
            preview_type: "track".to_string(),
            track: "Immaterial".to_string(),
            description: None,
            artist: Some("SOPHIE".to_string()),
            image: Some("https://i.scdn.co/image/abc".to_string()),
            audio: None,
            link: "https://open.spotify.com/track/abc".to_string(),
            embed: "https://embed.spotify.com/?uri=spotify:track:abc".to_string(),
        };
        let m = spotify::preview_meta(&p);
        assert_eq!(m.title, "Immaterial");
        assert_eq!(m.author.as_deref(), Some("SOPHIE"));
        assert_eq!(
            m.artwork_url.as_deref(),
            Some("https://i.scdn.co/image/abc")
        );
        assert_eq!(m.uri, "https://open.spotify.com/track/abc");
        assert!(m.duration_ms.is_none());
        assert_eq!(m.date.as_deref(), Some("2020-01-01T00:00:00.000Z"));
        assert_eq!(m.identifier, "SOPHIE Immaterial");
        let n = m.to_normalized();
        assert_eq!(n.title, "Immaterial");
        assert_eq!(n.image.as_deref(), Some("https://i.scdn.co/image/abc"));
    }

    #[test]
    fn spotify_track_meta_carries_ms_duration() {
        let t = crate::metadata::spotify::Track {
            artist: Some("A & B".to_string()),
            duration: Some(200_000.0),
            name: "Song".to_string(),
            preview_url: None,
            uri: "spotify:track:abc".to_string(),
        };
        let m = spotify::track_meta(&t);
        assert_eq!(m.duration_ms, Some(200_000));
        assert_eq!(m.identifier, "A & B Song");
        assert_eq!(m.uri, "spotify:track:abc");
    }

    #[test]
    fn result_helpers_return_collection_title_and_tracks() {
        let (apple, _, _) = mock_track("Sody", "https://example.com/t/1");
        let r = crate::metadata::apple_music::AppleResult::Song(apple);
        let (title, metas) = apple_music::track_metas_from_result(&r);
        assert_eq!(title, "butterfly");
        assert_eq!(metas.len(), 1);
    }
}
