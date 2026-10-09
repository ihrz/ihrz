// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
// Copyright (c) 2020-2026 iHorizon
//
// Rust port of amazon-music-metadata (https://github.com/kisastractors/amazon-music-metadata)
// by Anais Saraiva, MIT licensed. Original MIT attribution retained.
//
// Mirrors src/index.ts: `track` / `album` / `playlist` / default `search` over the
// Amazon web-skill catalog endpoints (showCatalogAlbum / showCatalogPlaylist),
// with the config.json token fetch and x-amzn-* header envelope.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static DEBUG: AtomicBool = AtomicBool::new(false);

/// Mirrors `EnableDebug`.
pub fn enable_debug() {
    DEBUG.store(true, Ordering::Relaxed);
}

fn log(msg: &str) {
    if DEBUG.load(Ordering::Relaxed) {
        eprintln!("amazon music: {msg}");
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AmazonError {
    UnsupportedDomain(String),
    MissingId(&'static str),
    NotFound(String),
    Http(String),
    Parse(String),
}

impl fmt::Display for AmazonError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedDomain(d) => write!(f, "Unsupported domain: {d}"),
            Self::MissingId(what) => write!(f, "{what}"),
            Self::NotFound(m) | Self::Http(m) | Self::Parse(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for AmazonError {}

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
    pub title: String,
    pub description: String,
    #[serde(rename = "numTracks")]
    pub num_tracks: usize,
    pub tracks: Vec<Track>,
    #[serde(rename = "type")]
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum AmazonResult {
    #[serde(rename = "song")]
    Song(Track),
    #[serde(rename = "album")]
    Album(RawAlbum),
    #[serde(rename = "playlist")]
    Playlist(RawPlaylist),
}

pub struct RegionConfig {
    pub skill_endpoint: &'static str,
    pub language: &'static str,
    pub currency: &'static str,
}

pub const SKILL_NA: &str = "https://na.web.skill.music.a2z.com";
pub const SKILL_EU: &str = "https://eu.web.skill.music.a2z.com";
pub const SKILL_FE: &str = "https://fe.web.skill.music.a2z.com";

/// Mirrors REGION_CONFIG_MAP.
pub fn region_config(domain: &str) -> Option<RegionConfig> {
    match domain {
        "music.amazon.com" => Some(RegionConfig {
            skill_endpoint: SKILL_NA,
            language: "en_US",
            currency: "USD",
        }),
        "music.amazon.fr" => Some(RegionConfig {
            skill_endpoint: SKILL_EU,
            language: "fr_FR",
            currency: "EUR",
        }),
        "music.amazon.de" => Some(RegionConfig {
            skill_endpoint: SKILL_EU,
            language: "de_DE",
            currency: "EUR",
        }),
        "music.amazon.co.uk" => Some(RegionConfig {
            skill_endpoint: SKILL_EU,
            language: "en_GB",
            currency: "GBP",
        }),
        "music.amazon.co.jp" => Some(RegionConfig {
            skill_endpoint: SKILL_FE,
            language: "ja_JP",
            currency: "JPY",
        }),
        _ => None,
    }
}

pub const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36";

pub const DEFAULT_DOMAIN: &str = "music.amazon.fr";

// ---- Pure helpers (mirror the TS functions one-to-one) ----

/// Mirrors `durationToSeconds` ("m:ss" -> seconds).
pub fn duration_to_seconds(text: Option<&str>) -> u64 {
    let text = text.unwrap_or("");
    let mut parts = text.split(':');
    let (Some(m), Some(s)) = (parts.next(), parts.next()) else {
        return 0;
    };
    m.trim().parse::<u64>().unwrap_or(0) * 60 + s.trim().parse::<u64>().unwrap_or(0)
}

fn is_asin(s: &str) -> bool {
    s.len() == 10 && s.chars().all(|c| c.is_ascii_alphanumeric())
}

/// Mirrors `extractAlbumId` (bare ASIN or /albums/{ASIN}).
pub fn extract_album_id(input: &str) -> Result<String, AmazonError> {
    if is_asin(input) {
        return Ok(input.to_string());
    }
    match segment_after(input, "/albums/") {
        Some(id) if is_asin(&id) => Ok(id),
        _ => Err(AmazonError::MissingId("ASIN album introuvable")),
    }
}

/// Mirrors `extractPlaylistId`.
pub fn extract_playlist_id(input: &str) -> Result<String, AmazonError> {
    if is_asin(input) {
        return Ok(input.to_string());
    }
    match segment_after(input, "/playlists/") {
        Some(id) if is_asin(&id) => Ok(id),
        _ => Err(AmazonError::MissingId("ASIN playlist introuvable")),
    }
}

/// Mirrors `extractTrackId` (bare ASIN, ?trackAsin=, or /tracks/{ASIN}).
pub fn extract_track_id(input: &str) -> Result<String, AmazonError> {
    if is_asin(input) {
        return Ok(input.to_string());
    }
    if let Some(q) = input.split('?').nth(1) {
        for pair in q.split('&') {
            if let Some(v) = pair.strip_prefix("trackAsin=") {
                if is_asin(v) {
                    return Ok(v.to_string());
                }
            }
        }
        // TS: new URL() succeeds but no trackAsin, falls through to /tracks/ match.
    } else if !input.contains("://") {
        // TS `new URL(input)` throws for non-URLs, then still tries /tracks/.
    }
    match segment_after(input, "/tracks/") {
        Some(id) if is_asin(&id) => Ok(id),
        _ => Err(AmazonError::MissingId("ASIN track introuvable")),
    }
}

fn segment_after(input: &str, marker: &str) -> Option<String> {
    let idx = input.find(marker)?;
    let after = &input[idx + marker.len()..];
    let end = after.find(['/', '?', '#', '&']).unwrap_or(after.len());
    Some(after[..end].to_string())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AmazonLinkType {
    Track,
    Album,
    Playlist,
    Unknown,
}

/// Mirrors `detectType`.
pub fn detect_type(input: &str) -> AmazonLinkType {
    if input.contains("/tracks/")
        && segment_after(input, "/tracks/")
            .map(|s| is_asin(&s))
            .unwrap_or(false)
    {
        return AmazonLinkType::Track;
    }
    if let Some(q) = input.split('?').nth(1) {
        if q.split('&').any(|p| p.starts_with("trackAsin")) {
            return AmazonLinkType::Track;
        }
    }
    if input.contains("/albums/") {
        return AmazonLinkType::Album;
    }
    if input.contains("/playlists/") {
        return AmazonLinkType::Playlist;
    }
    AmazonLinkType::Unknown
}

fn str_field(v: &serde_json::Value, key: &str) -> String {
    v.get(key)
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string()
}

fn header_text(template: &serde_json::Value) -> String {
    template
        .get("headerText")
        .and_then(|h| h.get("text"))
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string()
}

fn template_of(data: &serde_json::Value) -> Result<&serde_json::Value, AmazonError> {
    data.pointer("/methods/0/template").ok_or_else(|| {
        AmazonError::Parse("Missing methods[0].template in catalog response".to_string())
    })
}

fn widget_items(template: &serde_json::Value) -> Vec<&serde_json::Value> {
    match template.get("widgets").and_then(|w| w.as_array()) {
        Some(widgets) => widgets
            .iter()
            .flat_map(|w| {
                w.get("items")
                    .and_then(|i| i.as_array())
                    .map(|a| a.iter().collect::<Vec<_>>())
                    .unwrap_or_default()
            })
            .collect(),
        None => Vec::new(),
    }
}

fn deeplink_track_id(item: &serde_json::Value) -> String {
    item.get("primaryTextLink")
        .and_then(|l| l.get("deeplink"))
        .and_then(|d| d.as_str())
        .and_then(|d| segment_after(d, "/tracks/"))
        .unwrap_or_default()
}

fn amazon_track_url(id: &str) -> String {
    if id.is_empty() {
        String::new()
    } else {
        format!("https://music.amazon.com/tracks/{id}")
    }
}

fn deeplink_url(deeplink: Option<&str>) -> String {
    match deeplink {
        Some(d) if !d.is_empty() => format!("https://music.amazon.com{d}"),
        _ => String::new(),
    }
}

/// Mirrors `toRawPlaylist` (pure over catalog JSON).
pub fn raw_playlist_from_catalog(data: &serde_json::Value) -> Result<RawPlaylist, AmazonError> {
    let template = template_of(data)?;
    let tracks: Vec<Track> = widget_items(template)
        .into_iter()
        .map(|item| {
            let id = deeplink_track_id(item);
            let artist_name = str_field(item, "secondaryText2");
            let artist_name = if artist_name.is_empty() {
                str_field(item, "secondaryText")
            } else {
                artist_name
            };
            let artist_url = item
                .get("secondaryText2Link")
                .and_then(|l| l.get("deeplink"))
                .and_then(|d| d.as_str());
            Track {
                artist: Artist {
                    name: artist_name,
                    url: deeplink_url(artist_url),
                },
                title: str_field(item, "primaryText"),
                duration: duration_to_seconds(item.get("secondaryText3").and_then(|v| v.as_str())),
                url: amazon_track_url(&id),
                kind: "song".to_string(),
            }
        })
        .collect();
    Ok(RawPlaylist {
        title: header_text(template),
        description: template
            .get("headerTertiaryText")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        num_tracks: tracks.len(),
        tracks,
        kind: "playlist".to_string(),
    })
}

/// Mirrors `toRawAlbum` (pure over catalog JSON).
pub fn raw_album_from_catalog(data: &serde_json::Value) -> Result<RawAlbum, AmazonError> {
    let template = template_of(data)?;
    let artist = Artist {
        name: str_field(template, "headerPrimaryText"),
        url: deeplink_url(
            template
                .get("headerPrimaryTextLink")
                .and_then(|l| l.get("deeplink"))
                .and_then(|d| d.as_str()),
        ),
    };
    let tracks: Vec<Track> = widget_items(template)
        .into_iter()
        .map(|item| {
            let id = deeplink_track_id(item);
            let name = str_field(item, "secondaryText2");
            let (name, url) = if name.is_empty() {
                (artist.name.clone(), artist.url.clone())
            } else {
                let u = item
                    .get("secondaryText2Link")
                    .and_then(|l| l.get("deeplink"))
                    .and_then(|d| d.as_str());
                (
                    name,
                    if deeplink_url(u).is_empty() {
                        artist.url.clone()
                    } else {
                        deeplink_url(u)
                    },
                )
            };
            Track {
                artist: Artist { name, url },
                title: str_field(item, "primaryText"),
                duration: duration_to_seconds(item.get("secondaryText3").and_then(|v| v.as_str())),
                url: amazon_track_url(&id),
                kind: "song".to_string(),
            }
        })
        .collect();
    Ok(RawAlbum {
        title: header_text(template),
        description: template
            .get("headerTertiaryText")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        artist,
        num_tracks: tracks.len(),
        tracks,
        kind: "album".to_string(),
    })
}

/// Mirrors `toRawTrack` (pure over catalog JSON + resolved track id).
pub fn raw_track_from_catalog(data: &serde_json::Value, id: &str) -> Result<Track, AmazonError> {
    let template = template_of(data)?;
    Ok(Track {
        artist: Artist {
            name: str_field(template, "headerPrimaryText"),
            url: deeplink_url(
                template
                    .get("headerPrimaryTextLink")
                    .and_then(|l| l.get("deeplink"))
                    .and_then(|d| d.as_str()),
            ),
        },
        title: header_text(template),
        duration: duration_to_seconds(template.get("headerTertiaryText").and_then(|v| v.as_str())),
        url: format!("https://music.amazon.com/tracks/{id}"),
        kind: "song".to_string(),
    })
}

// ---- Network entry points (mirror config fetch + catalog POSTs) ----

fn request_id() -> String {
    // Mirrors crypto.randomUUID(); uniqueness only needs to hold per request.
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let pid = std::process::id() as u128;
    let mixed = nanos ^ ((pid) << 64 | (nanos >> 64));
    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        (mixed & 0xffff_ffff) as u32,
        ((mixed >> 32) & 0xffff) as u16,
        ((mixed >> 48) & 0x0fff) as u16,
        (((mixed >> 60) & 0x3fff) | 0x8000) as u16,
        (mixed >> 76) & 0xffff_ffff_ffff
    )
}

fn amazon_headers(
    config: &serde_json::Value,
    region: &RegionConfig,
    domain: &str,
    page_url: &str,
) -> serde_json::Value {
    let s = |v: Option<&serde_json::Value>| v.and_then(|x| x.as_str()).unwrap_or("").to_string();
    serde_json::json!({
        "x-amzn-authentication": serde_json::json!({
            "interface": "ClientAuthenticationInterface.v1_0.ClientTokenElement",
            "accessToken": s(config.get("accessToken")),
        }).to_string(),
        "x-amzn-device-model": "WEBPLAYER",
        "x-amzn-device-family": "WebPlayer",
        "x-amzn-device-id": s(config.get("deviceId")),
        "x-amzn-session-id": s(config.get("sessionId")),
        "x-amzn-device-width": "1920",
        "x-amzn-device-height": "1080",
        "x-amzn-request-id": request_id(),
        "x-amzn-device-language": region.language,
        "x-amzn-currency-of-preference": region.currency,
        "x-amzn-os-version": "1.0",
        "x-amzn-application-version": s(config.get("version")),
        "x-amzn-device-time-zone": "Europe/Paris",
        "x-amzn-timestamp": SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0).to_string(),
        "x-amzn-csrf": serde_json::json!({
            "interface": "CSRFInterface.v1_0.CSRFHeaderElement",
            "token": s(config.get("csrf").and_then(|c| c.get("token"))),
            "timestamp": config.get("csrf").and_then(|c| c.get("ts")).map(|v| v.to_string()).unwrap_or_default(),
            "rndNonce": config.get("csrf").and_then(|c| c.get("rnd")).map(|v| v.to_string()).unwrap_or_default(),
        }).to_string(),
        "x-amzn-music-domain": domain,
        "x-amzn-referer": domain,
        "x-amzn-page-url": page_url,
        "x-amzn-feature-flags": "hd-supported,uhd-supported",
    })
}

async fn fetch_domain_config(domain: &str) -> Result<serde_json::Value, AmazonError> {
    let client = reqwest::Client::new();
    let res = client
        .get(format!("https://{domain}/config.json"))
        .header("accept", "*/*")
        .header("referer", format!("https://{domain}/"))
        .header("user-agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| AmazonError::Http(format!("config.json {e}")))?;
    if !res.status().is_success() {
        return Err(AmazonError::Http(format!(
            "config.json HTTP {}",
            res.status()
        )));
    }
    res.json()
        .await
        .map_err(|e| AmazonError::Parse(e.to_string()))
}

async fn fetch_catalog(
    endpoint: &str,
    id: &str,
    domain: &str,
    page_url: &str,
) -> Result<serde_json::Value, AmazonError> {
    let region =
        region_config(domain).ok_or_else(|| AmazonError::UnsupportedDomain(domain.to_string()))?;
    let config = fetch_domain_config(domain).await?;
    let headers = amazon_headers(&config, &region, domain, page_url);
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}{endpoint}", region.skill_endpoint))
        .header("accept", "*/*")
        .header("accept-language", "en-US,en;q=0.9")
        .header("content-type", "text/plain;charset=UTF-8")
        .header("origin", format!("https://{domain}"))
        .header("referer", format!("https://{domain}/"))
        .header("user-agent", USER_AGENT)
        .body(
            serde_json::json!({
                "id": id,
                "userHash": serde_json::json!({ "level": "LIBRARY_MEMBER" }).to_string(),
                "headers": headers.to_string(),
            })
            .to_string(),
        )
        .send()
        .await
        .map_err(|e| AmazonError::Http(format!("{endpoint} {e}")))?;
    if !res.status().is_success() {
        return Err(AmazonError::Http(format!(
            "{endpoint} HTTP {}",
            res.status()
        )));
    }
    res.json()
        .await
        .map_err(|e| AmazonError::Parse(e.to_string()))
}

/// Mirrors `playlist`.
pub async fn playlist(input: &str, domain: &str) -> Result<RawPlaylist, AmazonError> {
    let id = extract_playlist_id(input)?;
    log(&format!("playlist {id}"));
    let data = fetch_catalog(
        "/api/showCatalogPlaylist",
        &id,
        domain,
        &format!("https://{domain}/playlists/{id}"),
    )
    .await?;
    raw_playlist_from_catalog(&data)
}

/// Mirrors `track`: resolves the parent album, then picks the track out of it.
pub async fn track(input: &str, domain: &str) -> Result<Track, AmazonError> {
    if !input.contains("://") && !is_asin(input) {
        return Err(AmazonError::MissingId("ASIN track introuvable"));
    }
    let track_id = extract_track_id(input)?;
    let album_id = extract_album_id(input)?;
    let data = fetch_catalog(
        "/api/showCatalogAlbum",
        &album_id,
        domain,
        &format!("https://{domain}/albums/{album_id}"),
    )
    .await?;
    let album = raw_album_from_catalog(&data)?;
    album
        .tracks
        .into_iter()
        .find(|t| t.url.ends_with(&track_id))
        .ok_or_else(|| {
            AmazonError::NotFound(format!(
                "Track {track_id} introuvable dans l'album {album_id}"
            ))
        })
}

/// Mirrors `album`.
pub async fn album(input: &str, domain: &str) -> Result<RawAlbum, AmazonError> {
    let id = extract_album_id(input)?;
    log(&format!("album {id}"));
    let data = fetch_catalog(
        "/api/showCatalogAlbum",
        &id,
        domain,
        &format!("https://{domain}/albums/{id}"),
    )
    .await?;
    raw_album_from_catalog(&data)
}

/// Mirrors default `search`. Bare ASINs try track first, then album.
pub async fn search(input: &str, domain: &str) -> Result<AmazonResult, AmazonError> {
    match detect_type(input) {
        AmazonLinkType::Track => Ok(AmazonResult::Song(track(input, domain).await?)),
        AmazonLinkType::Album => Ok(AmazonResult::Album(album(input, domain).await?)),
        AmazonLinkType::Playlist => Ok(AmazonResult::Playlist(playlist(input, domain).await?)),
        AmazonLinkType::Unknown => match track(input, domain).await {
            Ok(t) => Ok(AmazonResult::Song(t)),
            Err(_) => Ok(AmazonResult::Album(album(input, domain).await?)),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn album_catalog() -> serde_json::Value {
        serde_json::json!({
            "methods": [{ "template": {
                "headerText": { "text": "AAA" },
                "headerTertiaryText": "9 TITRES",
                "headerPrimaryText": "Dinos",
                "headerPrimaryTextLink": { "deeplink": "/artists/B002NZQRI4/dinos" },
                "widgets": [{ "items": [
                    { "primaryText": "DMX", "primaryTextLink": { "deeplink": "/albums/X/tracks/B0G2F4DGPR" },
                      "secondaryText2": "Dinos & Hamza",
                      "secondaryText2Link": { "deeplink": "/artists/B002NZQRI4/dinos" },
                      "secondaryText3": "2:17" },
                    { "primaryText": "Solo", "primaryTextLink": { "deeplink": "/albums/X/tracks/B0G2F8XW2G" },
                      "secondaryText3": "3:02" }
                ]}]
            }}]
        })
    }

    fn playlist_catalog() -> serde_json::Value {
        serde_json::json!({
            "methods": [{ "template": {
                "headerText": { "text": "Pop Deluxe" },
                "headerTertiaryText": "55 TITRES",
                "widgets": [{ "items": [
                    { "primaryText": "Sur la piste",
                      "primaryTextLink": { "deeplink": "/playlists/Y/tracks/B0H1MW8KG3" },
                      "secondaryText": "Sur la piste", "secondaryText3": "2:53" }
                ]}]
            }}]
        })
    }

    #[test]
    fn durations() {
        assert_eq!(duration_to_seconds(Some("2:17")), 137);
        assert_eq!(duration_to_seconds(Some("10:00")), 600);
        assert_eq!(duration_to_seconds(None), 0);
        assert_eq!(duration_to_seconds(Some("nope")), 0);
    }

    #[test]
    fn id_extractors() {
        assert_eq!(extract_album_id("B09M98Q74J").unwrap(), "B09M98Q74J");
        assert_eq!(
            extract_album_id("https://music.amazon.fr/albums/B09M98Q74J?x=1").unwrap(),
            "B09M98Q74J"
        );
        assert!(extract_album_id("https://music.amazon.fr/albums/short").is_err());
        assert_eq!(
            extract_playlist_id("https://music.amazon.fr/playlists/B07NZVFYWY").unwrap(),
            "B07NZVFYWY"
        );
        assert_eq!(
            extract_track_id("https://music.amazon.fr/albums/B09M98Q74J?trackAsin=B09M996KL3")
                .unwrap(),
            "B09M996KL3"
        );
        assert_eq!(
            extract_track_id("https://music.amazon.com/tracks/B09M996KL3").unwrap(),
            "B09M996KL3"
        );
        assert!(extract_track_id("https://music.amazon.fr/albums/B09M98Q74J").is_err());
    }

    #[test]
    fn type_detection() {
        assert_eq!(
            detect_type("https://music.amazon.fr/albums/B09M98Q74J?trackAsin=B09M996KL3"),
            AmazonLinkType::Track
        );
        assert_eq!(
            detect_type("https://music.amazon.com/tracks/B09M996KL3"),
            AmazonLinkType::Track
        );
        assert_eq!(
            detect_type("https://music.amazon.fr/albums/B09M98Q74J"),
            AmazonLinkType::Album
        );
        assert_eq!(
            detect_type("https://music.amazon.fr/playlists/B07NZVFYWY"),
            AmazonLinkType::Playlist
        );
        assert_eq!(detect_type("B09M98Q74J"), AmazonLinkType::Unknown);
    }

    #[test]
    fn album_parsing() {
        let album = raw_album_from_catalog(&album_catalog()).unwrap();
        assert_eq!(album.title, "AAA");
        assert_eq!(album.artist.name, "Dinos");
        assert_eq!(
            album.artist.url,
            "https://music.amazon.com/artists/B002NZQRI4/dinos"
        );
        assert_eq!(album.num_tracks, 2);
        assert_eq!(album.tracks[0].duration, 137);
        assert_eq!(
            album.tracks[0].url,
            "https://music.amazon.com/tracks/B0G2F4DGPR"
        );
        // Missing secondaryText2 falls back to the album artist.
        assert_eq!(album.tracks[1].artist.name, "Dinos");
        assert_eq!(album.kind, "album");
    }

    #[test]
    fn playlist_parsing() {
        let pl = raw_playlist_from_catalog(&playlist_catalog()).unwrap();
        assert_eq!(pl.title, "Pop Deluxe");
        assert_eq!(pl.num_tracks, 1);
        assert_eq!(pl.tracks[0].artist.name, "Sur la piste");
        assert_eq!(pl.tracks[0].duration, 173);
        assert_eq!(pl.kind, "playlist");
    }

    #[test]
    fn missing_template_errors() {
        assert!(raw_album_from_catalog(&serde_json::json!({})).is_err());
        assert!(raw_playlist_from_catalog(&serde_json::json!({"methods": []})).is_err());
    }

    #[test]
    fn regions() {
        assert_eq!(region_config("music.amazon.fr").unwrap().language, "fr_FR");
        assert_eq!(
            region_config("music.amazon.co.jp").unwrap().skill_endpoint,
            SKILL_FE
        );
        assert!(region_config("music.amazon.unknown").is_none());
    }

    #[test]
    fn header_envelope_shape() {
        let region = region_config("music.amazon.fr").unwrap();
        let h = amazon_headers(
            &serde_json::json!({}),
            &region,
            "music.amazon.fr",
            "https://music.amazon.fr/albums/X",
        );
        assert_eq!(
            h.get("x-amzn-device-language").and_then(|v| v.as_str()),
            Some("fr_FR")
        );
        assert_eq!(
            h.get("x-amzn-currency-of-preference")
                .and_then(|v| v.as_str()),
            Some("EUR")
        );
        assert_eq!(
            h.get("x-amzn-device-model").and_then(|v| v.as_str()),
            Some("WEBPLAYER")
        );
    }
}
