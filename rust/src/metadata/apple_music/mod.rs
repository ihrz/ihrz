// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
// Copyright (c) 2020-2026 iHorizon
//
// Rust port of apple-music-metadata (https://github.com/kisastractors/apple-music-metadata)
// by Anais Saraiva, MIT licensed. Original MIT attribution retained.
//
// Mirrors src/index.ts: default `search(url)` over Apple Music pages, reading the
// `<script type="application/ld+json">` schema.org blocks (MusicAlbum / MusicPlaylist)
// plus the `music:album` meta tag to resolve direct song pages to their album.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::sync::atomic::{AtomicBool, Ordering};

static DEBUG: AtomicBool = AtomicBool::new(false);

/// Mirrors `EnableDebug`.
pub fn enable_debug() {
    DEBUG.store(true, Ordering::Relaxed);
}

fn log(msg: &str) {
    if DEBUG.load(Ordering::Relaxed) {
        tracing::debug!("apple music: {msg}");
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AppleError {
    InvalidLink,
    Fetch(String),
    Parse(String),
}

impl fmt::Display for AppleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidLink => write!(f, "Apple Music link is invalid"),
            Self::Fetch(m) | Self::Parse(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for AppleError {}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Artist {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Track {
    pub artist: Artist,
    pub duration: u64,
    pub title: String,
    pub url: String,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RawAlbum {
    pub artist: Artist,
    pub description: String,
    #[serde(rename = "numTracks")]
    pub num_tracks: usize,
    pub title: String,
    pub tracks: Vec<Track>,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RawPlaylist {
    pub creator: Artist,
    pub description: String,
    #[serde(rename = "numTracks")]
    pub num_tracks: usize,
    pub title: String,
    pub tracks: Vec<Track>,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum AppleResult {
    #[serde(rename = "song")]
    Song(Track),
    #[serde(rename = "album")]
    Album(RawAlbum),
    #[serde(rename = "playlist")]
    Playlist(RawPlaylist),
}

pub const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ---- Pure helpers (mirror the TS functions one-to-one) ----

/// Mirrors `parseISODuration`: ISO 8601 "PT3M17S" -> seconds.
pub fn parse_iso_duration(iso: &str) -> u64 {
    let body = match iso.strip_prefix("PT") {
        Some(b) => b,
        None => return 0,
    };
    let mut hours = 0u64;
    let mut minutes = 0u64;
    let mut seconds = 0u64;
    let mut num = String::new();
    for c in body.chars() {
        if c.is_ascii_digit() || c == '.' {
            num.push(c);
        } else {
            let v: f64 = num.parse().unwrap_or(0.0);
            match c {
                'H' => hours = v as u64,
                'M' => minutes = v as u64,
                'S' => seconds = v.round() as u64,
                _ => return 0,
            }
            num.clear();
        }
    }
    if !num.is_empty() {
        return 0;
    }
    hours * 3600 + minutes * 60 + seconds
}

/// Mirrors `songUrlId`: trailing numeric id of a .../song/slug/123 URL.
pub fn song_url_id(url: &str) -> Option<String> {
    let idx = url.find("/song/")?;
    let after = &url[idx + 6..];
    let last = after.rsplit('/').next()?;
    let id: String = last
        .split('?')
        .next()?
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect();
    if id.is_empty() {
        None
    } else {
        Some(id)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LinkType {
    Song,
    Playlist,
    Album,
}

/// Mirrors `linkType`.
pub fn link_type(url: &str) -> Result<LinkType, AppleError> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(AppleError::InvalidLink);
    }
    let host_ok = url
        .split("://")
        .nth(1)
        .map(|r| r.starts_with("music.apple.com/"))
        .unwrap_or(false);
    if !host_ok {
        return Err(AppleError::InvalidLink);
    }
    if url.contains("/album/") && url.contains("?i=") {
        return Ok(LinkType::Song);
    }
    if url.contains("/song/") {
        return Ok(LinkType::Song);
    }
    if url.contains("/playlist/") {
        return Ok(LinkType::Playlist);
    }
    if url.contains("/album/") {
        return Ok(LinkType::Album);
    }
    Err(AppleError::InvalidLink)
}

/// Mirrors `extractSongId` (?i= takes precedence over /song/ URLs).
pub fn extract_song_id(url: &str) -> Option<String> {
    if let Some(q) = url.split('?').nth(1) {
        for pair in q.split('&') {
            if let Some(v) = pair.strip_prefix("i=") {
                let id: String = v.chars().take_while(|c| c.is_ascii_digit()).collect();
                if !id.is_empty() {
                    return Some(id);
                }
            }
        }
    }
    song_url_id(url)
}

pub fn is_direct_song_url(url: &str) -> bool {
    song_url_id(url).is_some() && url.contains("music.apple.com")
}

fn script_block_contents(html: &str, marker: &str) -> Vec<String> {
    let lower = html.to_ascii_lowercase();
    let mut out = Vec::new();
    let mut pos = 0;
    while let Some(start) = lower[pos..].find("<script") {
        let abs = pos + start;
        let tag_end = match lower[abs..].find('>') {
            Some(i) => abs + i + 1,
            None => break,
        };
        let close = match lower[tag_end..].find("</script>") {
            Some(i) => tag_end + i,
            None => break,
        };
        if lower[abs..tag_end].contains(marker) {
            out.push(html[tag_end..close].to_string());
        }
        pos = close + "</script>".len();
    }
    out
}

/// Mirrors `extractJsonLdBlocks` (Bun HTMLRewriter -> manual script scan).
pub fn extract_json_ld_blocks(html: &str) -> Vec<serde_json::Value> {
    let mut parsed = Vec::new();
    for block in script_block_contents(html, "application/ld+json") {
        let trimmed = block.trim();
        if trimmed.is_empty() {
            continue;
        }
        match serde_json::from_str::<serde_json::Value>(trimmed) {
            Ok(v) => {
                // TS keeps only blocks whose top-level "@type" matches; an
                // array payload would be skipped there. Flatten arrays so a
                // single-item payload still resolves.
                if let Some(arr) = v.as_array() {
                    parsed.extend(arr.iter().cloned());
                } else {
                    parsed.push(v);
                }
            }
            Err(_) => continue,
        }
    }
    parsed
}

fn str_field(v: &serde_json::Value, key: &str) -> String {
    v.get(key)
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string()
}

fn artist_of(v: &serde_json::Value) -> Artist {
    let first = v
        .get("byArtist")
        .and_then(|a| a.as_array())
        .and_then(|a| a.first());
    Artist {
        name: first.map(|a| str_field(a, "name")).unwrap_or_default(),
        url: first.map(|a| str_field(a, "url")).unwrap_or_default(),
    }
}

fn playable_recordings(v: &serde_json::Value) -> Vec<&serde_json::Value> {
    let arr = v
        .get("tracks")
        .and_then(|t| t.as_array())
        .or_else(|| v.get("track").and_then(|t| t.as_array()));
    match arr {
        Some(items) => items
            .iter()
            .filter(|t| {
                t.get("@type").and_then(|x| x.as_str()) == Some("MusicRecording")
                    && t.get("audio").is_some()
            })
            .collect(),
        None => Vec::new(),
    }
}

/// Mirrors `getRawAlbum` (pure over page HTML).
pub fn raw_album_from_html(html: &str) -> Result<RawAlbum, AppleError> {
    let blocks = extract_json_ld_blocks(html);
    let data = blocks
        .iter()
        .find(|b| b.get("@type").and_then(|t| t.as_str()) == Some("MusicAlbum"))
        .ok_or_else(|| {
            AppleError::Parse("Could not find MusicAlbum JSON-LD data on the page".to_string())
        })?;
    let artist = artist_of(data);
    let tracks: Vec<Track> = playable_recordings(data)
        .into_iter()
        .map(|t| Track {
            artist: artist.clone(),
            title: str_field(t, "name"),
            duration: parse_iso_duration(
                t.get("duration").and_then(|d| d.as_str()).unwrap_or("PT0S"),
            ),
            url: str_field(t, "url"),
            kind: "song".to_string(),
        })
        .collect();
    Ok(RawAlbum {
        title: str_field(data, "name"),
        description: str_field(data, "description"),
        artist,
        num_tracks: tracks.len(),
        tracks,
        kind: "album".to_string(),
    })
}

/// Mirrors `getRawPlaylist` (pure over page HTML).
pub fn raw_playlist_from_html(html: &str) -> Result<RawPlaylist, AppleError> {
    let blocks = extract_json_ld_blocks(html);
    let data = blocks
        .iter()
        .find(|b| b.get("@type").and_then(|t| t.as_str()) == Some("MusicPlaylist"))
        .ok_or_else(|| {
            AppleError::Parse("Could not find MusicPlaylist JSON-LD data on the page".to_string())
        })?;
    let creator = Artist {
        name: data
            .get("author")
            .and_then(|a| a.get("name"))
            .and_then(|n| n.as_str())
            .or_else(|| {
                data.get("creator")
                    .and_then(|a| a.get("name"))
                    .and_then(|n| n.as_str())
            })
            .unwrap_or("")
            .to_string(),
        url: data
            .get("author")
            .and_then(|a| a.get("url"))
            .and_then(|n| n.as_str())
            .or_else(|| {
                data.get("creator")
                    .and_then(|a| a.get("url"))
                    .and_then(|n| n.as_str())
            })
            .unwrap_or("")
            .to_string(),
    };
    let tracks: Vec<Track> = playable_recordings(data)
        .into_iter()
        .map(|t| {
            let by = t
                .get("byArtist")
                .and_then(|a| a.as_array())
                .and_then(|a| a.first());
            Track {
                artist: Artist {
                    name: by
                        .map(|a| str_field(a, "name"))
                        .filter(|s| !s.is_empty())
                        .unwrap_or_else(|| creator.name.clone()),
                    url: by
                        .map(|a| str_field(a, "url"))
                        .filter(|s| !s.is_empty())
                        .unwrap_or_else(|| creator.url.clone()),
                },
                title: str_field(t, "name"),
                duration: parse_iso_duration(
                    t.get("duration").and_then(|d| d.as_str()).unwrap_or("PT0S"),
                ),
                url: str_field(t, "url"),
                kind: "song".to_string(),
            }
        })
        .collect();
    Ok(RawPlaylist {
        title: str_field(data, "name"),
        description: str_field(data, "description"),
        creator,
        num_tracks: tracks.len(),
        tracks,
        kind: "playlist".to_string(),
    })
}

fn meta_content(html: &str, property: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let mut pos = 0;
    while let Some(start) = lower[pos..].find("<meta") {
        let abs = pos + start;
        let end = lower[abs..].find('>')? + abs;
        let tag = &lower[abs..end];
        if tag.contains(property) {
            // find content="..." in the original slice (same byte indices: ASCII-only lowering).
            let orig = &html[abs..end];
            for quote in ['"', '\''] {
                let needle = format!("content={quote}");
                if let Some(ci) = orig.to_ascii_lowercase().find(&needle) {
                    let rest = &orig[ci + needle.len()..];
                    if let Some(qe) = rest.find(quote) {
                        return Some(rest[..qe].to_string());
                    }
                }
            }
        }
        pos = end + 1;
    }
    None
}

/// Mirrors `extractAlbumUrlFromSongPage` (pure over page HTML).
pub fn album_url_from_song_page(html: &str) -> Option<String> {
    meta_content(html, "music:album")
}

// ---- Network entry points (mirror fetchApplePage + default search) ----

pub async fn fetch_apple_page(url: &str) -> Option<String> {
    let client = reqwest::Client::new();
    let res = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .header("Accept-Language", "en-US,en;q=0.9")
        .send()
        .await
        .ok()?;
    if !res.status().is_success() {
        return None;
    }
    res.text().await.ok()
}

fn find_track_by_id<'a>(tracks: &'a [Track], id: &str) -> Option<&'a Track> {
    tracks
        .iter()
        .find(|t| song_url_id(&t.url).as_deref() == Some(id))
}

/// Mirrors the default `search` export. Returns `Ok(None)` where TS returns
/// null (fetch failure / unresolvable song), `Err` for an invalid link.
pub async fn search(url: &str) -> Result<Option<AppleResult>, AppleError> {
    let url_type = link_type(url)?;
    let page = match fetch_apple_page(url).await {
        Some(p) => p,
        None => {
            log("http request failed");
            return Ok(None);
        }
    };
    if url_type == LinkType::Playlist {
        return Ok(Some(AppleResult::Playlist(
            raw_playlist_from_html(&page).map_err(|e| AppleError::Parse(e.to_string()))?,
        )));
    }
    if url_type == LinkType::Song && is_direct_song_url(url) {
        let album_url = match album_url_from_song_page(&page) {
            Some(u) => u,
            None => {
                log("failed to resolve song page to album url");
                return Ok(None);
            }
        };
        // Fetch the clean album URL (no ?i=), which proved reliable in TS.
        let clean = album_url.split('?').next().unwrap_or("").to_string();
        let album_page = match fetch_apple_page(&clean).await {
            Some(p) => p,
            None => {
                log("http request failed (album)");
                return Ok(None);
            }
        };
        let album =
            raw_album_from_html(&album_page).map_err(|e| AppleError::Parse(e.to_string()))?;
        let id = match song_url_id(url) {
            Some(i) => i,
            None => {
                log("failed to extract song id");
                return Ok(None);
            }
        };
        return Ok(find_track_by_id(&album.tracks, &id)
            .cloned()
            .map(AppleResult::Song));
    }
    let album = raw_album_from_html(&page).map_err(|e| AppleError::Parse(e.to_string()))?;
    if url_type == LinkType::Album {
        return Ok(Some(AppleResult::Album(album)));
    }
    let id = match extract_song_id(url) {
        Some(i) => i,
        None => {
            log("failed to extract song id");
            return Ok(None);
        }
    };
    Ok(find_track_by_id(&album.tracks, &id)
        .cloned()
        .map(AppleResult::Song))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn album_page() -> String {
        let ld = serde_json::json!({
            "@type": "MusicAlbum",
            "name": "Test Album",
            "description": "A test album",
            "byArtist": [{ "name": "Test Artist", "url": "https://music.apple.com/us/artist/test/1" }],
            "tracks": [
                { "@type": "MusicRecording", "name": "First", "duration": "PT3M17S",
                  "url": "https://music.apple.com/us/song/first/101", "audio": {} },
                { "@type": "MusicRecording", "name": "Second", "duration": "PT1H2M3S",
                  "url": "https://music.apple.com/us/song/second/102", "audio": {} },
                { "@type": "MusicRecording", "name": "NoAudio", "duration": "PT2M0S",
                  "url": "https://music.apple.com/us/album/noaudio/100?i=103" }
            ]
        });
        format!(
            "<html><head><script type=\"application/ld+json\">{ld}</script><script>var x=1;</script></head><body></body></html>"
        )
    }

    fn playlist_page() -> String {
        let ld = serde_json::json!({
            "@type": "MusicPlaylist",
            "name": "Office DJ",
            "description": "Work tunes",
            "author": { "name": "Apple Music Pop", "url": "https://music.apple.com/us/curator/x/1" },
            "tracks": [
                { "@type": "MusicRecording", "name": "Hit", "duration": "PT4M0S",
                  "url": "https://music.apple.com/us/song/hit/200",
                  "byArtist": [{ "name": "Singer", "url": "https://music.apple.com/us/artist/s/2" }],
                  "audio": {} }
            ]
        });
        format!("<html><body><script type=\"application/ld+json\">{ld}</script></body></html>")
    }

    #[test]
    fn iso_durations() {
        assert_eq!(parse_iso_duration("PT3M17S"), 197);
        assert_eq!(parse_iso_duration("PT1H2M3S"), 3723);
        assert_eq!(parse_iso_duration("PT0S"), 0);
        assert_eq!(parse_iso_duration("nope"), 0);
    }

    #[test]
    fn link_classification() {
        assert_eq!(
            link_type("https://music.apple.com/us/album/butterfly/1541902791?i=1541903021")
                .unwrap(),
            LinkType::Song
        );
        assert_eq!(
            link_type("https://music.apple.com/nz/song/x/1541903021").unwrap(),
            LinkType::Song
        );
        assert_eq!(
            link_type("https://music.apple.com/us/playlist/jumpstart/pl.abc").unwrap(),
            LinkType::Playlist
        );
        assert_eq!(
            link_type("https://music.apple.com/us/album/meditations/1602431360").unwrap(),
            LinkType::Album
        );
        assert!(link_type("https://example.com/x").is_err());
        assert!(link_type("not a url").is_err());
    }

    #[test]
    fn song_ids() {
        assert_eq!(
            song_url_id("https://music.apple.com/nz/song/x/1541903021"),
            Some("1541903021".into())
        );
        assert_eq!(
            extract_song_id("https://music.apple.com/us/album/butterfly/1541902791?i=1541903021"),
            Some("1541903021".into())
        );
    }

    #[test]
    fn album_parsing() {
        let album = raw_album_from_html(&album_page()).unwrap();
        assert_eq!(album.title, "Test Album");
        assert_eq!(album.artist.name, "Test Artist");
        // NoAudio has no `audio` key -> filtered like TS.
        assert_eq!(album.num_tracks, 2);
        assert_eq!(album.tracks[0].duration, 197);
        assert_eq!(album.tracks[1].duration, 3723);
        assert_eq!(album.tracks[0].kind, "song");
    }

    #[test]
    fn playlist_parsing() {
        let pl = raw_playlist_from_html(&playlist_page()).unwrap();
        assert_eq!(pl.title, "Office DJ");
        assert_eq!(pl.creator.name, "Apple Music Pop");
        assert_eq!(pl.tracks[0].artist.name, "Singer");
    }

    #[test]
    fn missing_block_errors() {
        assert!(raw_album_from_html("<html><body></body></html>").is_err());
        assert!(raw_playlist_from_html(&album_page()).is_err());
    }

    #[test]
    fn malformed_json_ld_skipped() {
        let html = "<html><body><script type=\"application/ld+json\">{{{</script></body></html>";
        assert_eq!(extract_json_ld_blocks(html).len(), 0);
    }

    #[test]
    fn meta_album_extraction() {
        let html = "<html><head><meta property=\"music:album\" content=\"https://music.apple.com/us/album/x/100\"></head></html>";
        assert_eq!(
            album_url_from_song_page(html).as_deref(),
            Some("https://music.apple.com/us/album/x/100")
        );
        assert_eq!(album_url_from_song_page("<html></html>"), None);
    }

    #[test]
    fn track_lookup() {
        let album = raw_album_from_html(&album_page()).unwrap();
        assert!(find_track_by_id(&album.tracks, "101").is_some());
        assert!(find_track_by_id(&album.tracks, "999").is_none());
    }
}
