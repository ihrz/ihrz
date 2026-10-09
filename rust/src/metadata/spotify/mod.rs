// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
// Copyright (c) 2020-2026 iHorizon
//
// Rust port of spotify-metadata (https://github.com/kisastractors/spotify-metadata)
// by Anais Saraiva, MIT licensed. Original MIT attribution retained.
//
// Mirrors src/index.ts: getData / getPreview / getTracks / getDetails over the
// Spotify embed page (https://embed.spotify.com/?uri=...), native fetch, no deps.

use serde::{Deserialize, Serialize};
use std::fmt;

pub const REPORT_LINE: &str =
    "Please report the problem at https://github.com/Kisakay/spotify-url-info/issues.";
pub const ERR_NOT_DATA: &str = "Couldn't find any data in embed page that we know how to parse.";
pub const ERR_NOT_SCRIPTS: &str = "Couldn't find scripts to get the data.";

pub const SUPPORTED_TYPES: &[&str] = &["album", "artist", "episode", "playlist", "track"];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SpotifyError {
    InvalidUrl(String),
    Parse(String),
    Http(String),
}

impl fmt::Display for SpotifyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidUrl(u) => write!(f, "Couldn't parse '{u}' as valid URL"),
            Self::Parse(m) => write!(f, "{m}\n{REPORT_LINE}"),
            Self::Http(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for SpotifyError {}

// ---- Types (mirror the TS interfaces; embed shapes are not guaranteed,
// so every nested field is Option) ----

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct SpotifyImage {
    pub url: String,
    #[serde(default)]
    pub width: Option<f64>,
    #[serde(default)]
    pub height: Option<f64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct SpotifyArtist {
    #[serde(default)]
    pub name: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct SpotifyShow {
    #[serde(default)]
    pub publisher: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct SpotifyTrackData {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub subtitle: Option<String>,
    #[serde(default)]
    pub duration: Option<f64>,
    #[serde(default, rename = "isPlayable")]
    pub is_playable: Option<bool>,
    #[serde(default, rename = "audioPreview")]
    pub audio_preview: Option<AudioPreview>,
    #[serde(default)]
    pub uri: Option<String>,
    #[serde(default)]
    pub artists: Option<Vec<SpotifyArtist>>,
    #[serde(default)]
    pub show: Option<SpotifyShow>,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct AudioPreview {
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct ReleaseDate {
    #[serde(default, rename = "isoString")]
    pub iso_string: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct CoverArt {
    #[serde(default)]
    pub sources: Vec<SpotifyImage>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct VisualIdentity {
    #[serde(default)]
    pub image: Vec<SpotifyImage>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct SpotifyEntityData {
    #[serde(default, rename = "type")]
    pub entity_type: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub uri: Option<String>,
    #[serde(default)]
    pub subtitle: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, rename = "releaseDate")]
    pub release_date: Option<ReleaseDate>,
    #[serde(default)]
    pub release_date_str: Option<String>,
    #[serde(default, rename = "coverArt")]
    pub cover_art: Option<CoverArt>,
    #[serde(default)]
    pub images: Option<Vec<SpotifyImage>>,
    #[serde(default, rename = "visualIdentity")]
    pub visual_identity: Option<VisualIdentity>,
    #[serde(default, rename = "trackList")]
    pub track_list: Option<Vec<SpotifyTrackData>>,
}

impl SpotifyEntityData {
    /// Mirrors `release_date` (TS reads both `releaseDate.isoString` and `release_date`).
    fn date_raw(&self) -> Option<&str> {
        self.release_date
            .as_ref()
            .and_then(|r| r.iso_string.as_deref())
            .or(self.release_date_str.as_deref())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Track {
    pub artist: Option<String>,
    pub duration: Option<f64>,
    pub name: String,
    #[serde(rename = "previewUrl")]
    pub preview_url: Option<String>,
    pub uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Preview {
    pub date: Option<String>,
    pub title: String,
    #[serde(rename = "type")]
    pub preview_type: String,
    pub track: String,
    pub description: Option<String>,
    pub artist: Option<String>,
    pub image: Option<String>,
    pub audio: Option<String>,
    pub link: String,
    pub embed: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Details {
    pub preview: Preview,
    pub tracks: Vec<Track>,
}

// ---- URL handling (mirrors spotify-uri parse/formatEmbedURL/formatOpenURL) ----

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedUrl {
    pub resource_type: String,
    pub id: String,
}

fn decode_component(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex_val(bytes[i + 1]), hex_val(bytes[i + 2])) {
                out.push((h * 16 + l) as char);
                i += 3;
                continue;
            }
        }
        if bytes[i] == b'+' {
            out.push(' ');
        } else {
            out.push(bytes[i] as char);
        }
        i += 1;
    }
    out
}

fn hex_val(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

fn split_host_path(input: &str) -> Option<(&str, &str)> {
    let rest = input.split("://").nth(1)?;
    let end = rest.find('/').unwrap_or(rest.len());
    Some((&rest[..end], &rest[end..]))
}

fn parse_parts(parts: &[&str]) -> Option<ParsedUrl> {
    let parts: Vec<&str> = parts
        .iter()
        .filter(|p| !p.starts_with("intl"))
        .copied()
        .collect();
    if parts.is_empty() {
        return None;
    }
    let mut spotify_type = parts[0].to_string();
    let mut rest: &[&str] = &parts[1..];
    if spotify_type == "embed" && !rest.is_empty() {
        spotify_type = rest[0].to_string();
        rest = &rest[1..];
    }
    let len = parts.len();
    // User playlists: /user/{user}/playlist/{id} (len >= 5) or /user/{user}/starred.
    if len >= 4 || spotify_type == "playlist" {
        if len >= 5 {
            return Some(ParsedUrl {
                resource_type: "playlist".to_string(),
                id: decode_component(parts[4]),
            });
        }
        if rest.first() == Some(&"starred") {
            return Some(ParsedUrl {
                resource_type: "playlist".to_string(),
                id: "starred".to_string(),
            });
        }
        if spotify_type == "playlist" && !rest.is_empty() {
            return Some(ParsedUrl {
                resource_type: "playlist".to_string(),
                id: decode_component(rest[0]),
            });
        }
        if spotify_type != "playlist" {
            return None;
        }
        return None;
    }
    match spotify_type.as_str() {
        "artist" | "album" | "track" | "episode" | "show" if rest.len() == 1 => Some(ParsedUrl {
            resource_type: spotify_type,
            id: decode_component(rest[0]),
        }),
        _ => None,
    }
}

/// Mirrors `getParsedUrl`: accepts open/embed/spotify: URLs, rejects the rest.
pub fn parse_url(url: &str) -> Result<ParsedUrl, SpotifyError> {
    if let Some(rest) = url.strip_prefix("spotify:") {
        let parts: Vec<&str> = rest.split(':').collect();
        if parts.len() >= 2 && !parts[0].is_empty() && !parts[1].is_empty() {
            return Ok(ParsedUrl {
                resource_type: parts[0].to_string(),
                id: decode_component(parts[1]),
            });
        }
        return Err(SpotifyError::InvalidUrl(url.to_string()));
    }
    let (host, path_query) =
        split_host_path(url).ok_or_else(|| SpotifyError::InvalidUrl(url.to_string()))?;
    if host != "open.spotify.com" && host != "play.spotify.com" && host != "embed.spotify.com" {
        // spotify-uri also accepts any host whose path parses, but the TS
        // getParsedUrl rejects non-Spotify hosts via parse failure; keep parity
        // by requiring a Spotify host here.
        return Err(SpotifyError::InvalidUrl(url.to_string()));
    }
    if host == "embed.spotify.com" {
        let query = path_query.split('?').nth(1).unwrap_or("");
        for pair in query.split('&') {
            if let Some(v) = pair.strip_prefix("uri=") {
                return parse_url(&decode_component(v));
            }
        }
        return Err(SpotifyError::InvalidUrl(url.to_string()));
    }
    let path = path_query.split(['?', '#']).next().unwrap_or("");
    let parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();
    parse_parts(&parts).ok_or_else(|| SpotifyError::InvalidUrl(url.to_string()))
}

pub fn embed_url(p: &ParsedUrl) -> String {
    format!(
        "https://embed.spotify.com/?uri=spotify:{}:{}",
        p.resource_type, p.id
    )
}

pub fn open_url(p: &ParsedUrl) -> String {
    format!("https://open.spotify.com/{}/{}", p.resource_type, p.id)
}

/// Mirrors `getLink`: formats an open URL from an entity `spotify:{type}:{id}` uri.
pub fn get_link(data: &SpotifyEntityData) -> Option<String> {
    let uri = data.uri.as_deref()?;
    let mut parts = uri.split(':');
    let _ = parts.next()?;
    let kind = parts.next()?;
    let id = parts.next()?;
    if kind.is_empty() || id.is_empty() {
        return None;
    }
    Some(format!("https://open.spotify.com/{kind}/{id}"))
}

// ---- HTML / script extraction (mirrors himalaya-based parseData) ----

fn base64_value(c: char) -> Option<u32> {
    match c {
        'A'..='Z' => Some(c as u32 - 'A' as u32),
        'a'..='z' => Some(c as u32 - 'a' as u32 + 26),
        '0'..='9' => Some(c as u32 - '0' as u32 + 52),
        '+' => Some(62),
        '/' => Some(63),
        _ => None,
    }
}

fn decode_base64(input: &str) -> Result<Vec<u8>, ()> {
    let clean: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    let mut out = Vec::with_capacity(clean.len() * 3 / 4);
    let chars: Vec<char> = clean.chars().collect();
    if !chars.len().is_multiple_of(4) {
        return Err(());
    }
    for chunk in chars.chunks(4) {
        let mut vals = [0u32; 4];
        let mut pad = 0;
        for (i, &c) in chunk.iter().enumerate() {
            if c == '=' {
                pad += 1;
            } else {
                vals[i] = base64_value(c).ok_or(())?;
            }
        }
        out.push(((vals[0] << 2) | (vals[1] >> 4)) as u8);
        if pad < 2 {
            out.push((((vals[1] & 0xf) << 4) | (vals[2] >> 2)) as u8);
        }
        if pad < 1 {
            out.push((((vals[2] & 0x3) << 6) | vals[3]) as u8);
        }
    }
    Ok(out)
}

struct ScriptBlock {
    open_tag: String,
    content: String,
}

fn script_blocks(html: &str) -> Vec<ScriptBlock> {
    let lower = html.to_ascii_lowercase();
    let mut blocks = Vec::new();
    let mut pos = 0;
    while let Some(start) = lower[pos..].find("<script") {
        let abs_start = pos + start;
        let tag_end = match lower[abs_start..].find('>') {
            Some(i) => abs_start + i + 1,
            None => break,
        };
        let close = match lower[tag_end..].find("</script>") {
            Some(i) => tag_end + i,
            None => break,
        };
        blocks.push(ScriptBlock {
            open_tag: html[abs_start..tag_end].to_string(),
            content: html[tag_end..close].to_string(),
        });
        pos = close + "</script>".len();
    }
    blocks
}

fn tag_has_value(open_tag: &str, value: &str) -> bool {
    // Mirrors himalaya attribute check: any attribute whose value === marker.
    let needle = format!("=\"{value}\"");
    open_tag.contains(&needle) || open_tag.contains(&format!("='{value}'"))
}

fn normalize_data(mut data: SpotifyEntityData) -> Result<SpotifyEntityData, SpotifyError> {
    let kind = data.entity_type.clone().unwrap_or_default();
    let name = data.name.clone().unwrap_or_default();
    if kind.is_empty() || name.is_empty() {
        return Err(SpotifyError::Parse(
            "Data doesn't seem to be of the right shape to parse".to_string(),
        ));
    }
    if !SUPPORTED_TYPES.contains(&kind.to_ascii_lowercase().as_str())
        && !SUPPORTED_TYPES.contains(&kind.as_str())
    {
        return Err(SpotifyError::Parse(format!(
            "Not an {}. Only these types can be parsed",
            SUPPORTED_TYPES.join(", ")
        )));
    }
    if let Some(uri) = data.uri.clone() {
        // Mirrors TS: data.type = data.uri.split(":")[1].
        if let Some(t) = uri.split(':').nth(1) {
            data.entity_type = Some(t.to_string());
        }
    }
    Ok(data)
}

/// Mirrors `parseData`: extracts the entity payload from an embed page.
pub fn parse_data(html: &str) -> Result<SpotifyEntityData, SpotifyError> {
    if !html.to_ascii_lowercase().contains("<html") {
        return Err(SpotifyError::Parse(ERR_NOT_SCRIPTS.to_string()));
    }
    let scripts = script_blocks(html);

    // TS throws NOT_SCRIPTS only when the <html> element itself is missing;
    // present-but-scriptless (or markerless) pages fall through to NOT_DATA.

    if let Some(block) = scripts
        .iter()
        .find(|s| tag_has_value(&s.open_tag, "resource"))
    {
        let decoded = decode_base64(block.content.trim())
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let text = String::from_utf8(decoded)
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let data: SpotifyEntityData = serde_json::from_str(&text)
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        return normalize_data(data);
    }

    if let Some(block) = scripts
        .iter()
        .find(|s| tag_has_value(&s.open_tag, "initial-state"))
    {
        let decoded = decode_base64(block.content.trim())
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let text = String::from_utf8(decoded)
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let parsed: serde_json::Value = serde_json::from_str(&text)
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let entity = parsed
            .pointer("/data/entity")
            .ok_or_else(|| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let data: SpotifyEntityData = serde_json::from_value(entity.clone())
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        return normalize_data(data);
    }

    if let Some(block) = scripts
        .iter()
        .find(|s| tag_has_value(&s.open_tag, "__NEXT_DATA__"))
    {
        let parsed: serde_json::Value = serde_json::from_str(block.content.trim())
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let entity = parsed
            .pointer("/props/pageProps/state/data/entity")
            .ok_or_else(|| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        let data: SpotifyEntityData = serde_json::from_value(entity.clone())
            .map_err(|_| SpotifyError::Parse(ERR_NOT_DATA.to_string()))?;
        return normalize_data(data);
    }

    Err(SpotifyError::Parse(ERR_NOT_DATA.to_string()))
}

// ---- Normalization (mirrors getImages/getDate/getArtistTrack/toTrack/getPreview) ----

fn get_images(data: &SpotifyEntityData) -> Option<&[SpotifyImage]> {
    if let Some(c) = data.cover_art.as_ref() {
        if !c.sources.is_empty() {
            return Some(&c.sources);
        }
    }
    if let Some(im) = data.images.as_ref() {
        if !im.is_empty() {
            return Some(im);
        }
    }
    if let Some(v) = data.visual_identity.as_ref() {
        if !v.image.is_empty() {
            return Some(&v.image);
        }
    }
    None
}

fn join_artist_names(track: &SpotifyTrackData) -> String {
    if let Some(show) = track.show.as_ref() {
        return show.publisher.clone();
    }
    let names: Vec<&str> = track
        .artists
        .as_ref()
        .map(|a| {
            a.iter()
                .map(|x| x.name.as_str())
                .filter(|n| !n.is_empty())
                .collect()
        })
        .unwrap_or_default();
    names
        .iter()
        .enumerate()
        .fold(String::new(), |mut acc, (i, name)| {
            if i == 0 {
                acc.push_str(name);
            } else if i == names.len() - 1 {
                acc.push_str(" & ");
                acc.push_str(name);
            } else {
                acc.push_str(", ");
                acc.push_str(name);
            }
            acc
        })
}

fn to_track(track: &SpotifyTrackData) -> Track {
    let joined = join_artist_names(track);
    let artist = if joined.is_empty() {
        track.subtitle.clone()
    } else {
        Some(joined)
    };
    let preview_url = if track.is_playable.unwrap_or(false) {
        track.audio_preview.as_ref().and_then(|a| a.url.clone())
    } else {
        None
    };
    Track {
        artist,
        duration: track.duration,
        name: track.title.clone().unwrap_or_default(),
        preview_url,
        uri: track.uri.clone().unwrap_or_default(),
    }
}

fn entity_as_track(data: &SpotifyEntityData) -> SpotifyTrackData {
    SpotifyTrackData {
        title: data.name.clone(),
        subtitle: data.subtitle.clone(),
        duration: None,
        is_playable: None,
        audio_preview: None,
        uri: data.uri.clone(),
        artists: None,
        show: None,
        description: data.description.clone(),
    }
}

/// Mirrors `getTracks`: trackList mapped, otherwise the entity itself as one track.
pub fn tracks_from_data(data: &SpotifyEntityData) -> Vec<Track> {
    match data.track_list.as_ref() {
        Some(list) => list.iter().map(to_track).collect(),
        None => vec![to_track(&entity_as_track(data))],
    }
}

fn normalize_date(raw: &str) -> String {
    // Mirrors `new Date(date).toISOString()` for ISO inputs; keeps the raw
    // string when chrono cannot parse it instead of throwing.
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
        return dt
            .with_timezone(&chrono::Utc)
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    }
    raw.to_string()
}

/// Mirrors `getPreview`.
pub fn preview_from_data(data: &SpotifyEntityData) -> Preview {
    let tracks = tracks_from_data(data);
    let first = tracks.into_iter().next().unwrap_or(Track {
        artist: None,
        duration: None,
        name: String::new(),
        preview_url: None,
        uri: String::new(),
    });
    let image = get_images(data)
        .and_then(|imgs| {
            imgs.iter().max_by(|a, b| {
                a.width
                    .unwrap_or(0.0)
                    .partial_cmp(&b.width.unwrap_or(0.0))
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
        })
        .map(|i| i.url.clone());
    let description = data
        .description
        .clone()
        .or_else(|| data.subtitle.clone())
        .or_else(|| first.name.clone().into());
    let description = match description {
        Some(d) if !d.is_empty() => Some(d),
        _ => None,
    };
    let uri = data.uri.clone().unwrap_or_default();
    Preview {
        date: data.date_raw().map(normalize_date),
        title: data.name.clone().unwrap_or_default(),
        preview_type: data.entity_type.clone().unwrap_or_default(),
        track: first.name.clone(),
        description,
        artist: first.artist.clone(),
        image,
        audio: first.preview_url.clone(),
        link: get_link(data).unwrap_or_default(),
        embed: format!("https://embed.spotify.com/?uri={uri}"),
    }
}

// ---- Network entry points (mirror getData/getPreview/getTracks/getDetails) ----

pub async fn get_data(url: &str) -> Result<SpotifyEntityData, SpotifyError> {
    let parsed = parse_url(url)?;
    let target = embed_url(&parsed);
    let text = reqwest::get(&target)
        .await
        .map_err(|e| SpotifyError::Http(e.to_string()))?
        .text()
        .await
        .map_err(|e| SpotifyError::Http(e.to_string()))?;
    parse_data(&text)
}

pub async fn get_preview(url: &str) -> Result<Preview, SpotifyError> {
    Ok(preview_from_data(&get_data(url).await?))
}

pub async fn get_tracks(url: &str) -> Result<Vec<Track>, SpotifyError> {
    Ok(tracks_from_data(&get_data(url).await?))
}

pub async fn get_details(url: &str) -> Result<Details, SpotifyError> {
    let data = get_data(url).await?;
    Ok(Details {
        preview: preview_from_data(&data),
        tracks: tracks_from_data(&data),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entity_json() -> serde_json::Value {
        serde_json::json!({
            "type": "TRACK",
            "name": "Immaterial",
            "uri": "spotify:track:5nTtCOCds6I0PHMNtqelas",
            "subtitle": "SOPHIE",
            "description": "A track",
            "releaseDate": { "isoString": "2018-06-15T00:00:00Z" },
            "coverArt": { "sources": [
                { "url": "https://i.scdn.co/image/small", "width": 64, "height": 64 },
                { "url": "https://i.scdn.co/image/big", "width": 640, "height": 640 }
            ]},
            "trackList": [
                {
                    "title": "Immaterial",
                    "duration": 197000.0,
                    "isPlayable": true,
                    "audioPreview": { "url": "https://p.scdn.co/mp3-preview/abc" },
                    "uri": "spotify:track:5nTtCOCds6I0PHMNtqelas",
                    "artists": [{ "name": "SOPHIE" }]
                },
                {
                    "title": "Locked",
                    "duration": 180000.0,
                    "isPlayable": false,
                    "audioPreview": { "url": "https://p.scdn.co/mp3-preview/nope" },
                    "uri": "spotify:track:0000000000000000000000",
                    "show": { "publisher": "Pod Publisher" }
                }
            ]
        })
    }

    fn b64(s: &str) -> String {
        const ALPH: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let bytes = s.as_bytes();
        let mut out = String::new();
        for chunk in bytes.chunks(3) {
            let b0 = chunk[0] as u32;
            let b1 = *chunk.get(1).unwrap_or(&0) as u32;
            let b2 = *chunk.get(2).unwrap_or(&0) as u32;
            let n = (b0 << 16) | (b1 << 8) | b2;
            out.push(ALPH[((n >> 18) & 63) as usize] as char);
            out.push(ALPH[((n >> 12) & 63) as usize] as char);
            out.push(if chunk.len() > 1 {
                ALPH[((n >> 6) & 63) as usize] as char
            } else {
                '='
            });
            out.push(if chunk.len() > 2 {
                ALPH[(n & 63) as usize] as char
            } else {
                '='
            });
        }
        out
    }

    fn resource_fixture() -> String {
        format!(
            "<html><head></head><body><script id=\"resource\" type=\"application/json\">{}</script></body></html>",
            b64(&entity_json().to_string())
        )
    }

    fn nextjs_fixture() -> String {
        let payload = serde_json::json!({
            "props": { "pageProps": { "state": { "data": { "entity": entity_json() } } } }
        });
        format!(
            "<html><body><script id=\"__NEXT_DATA__\" type=\"application/json\">{}</script></body></html>",
            payload
        )
    }

    #[test]
    fn parse_resource_script() {
        let data = parse_data(&resource_fixture()).unwrap();
        assert_eq!(data.name.as_deref(), Some("Immaterial"));
        assert_eq!(data.entity_type.as_deref(), Some("track"));
    }

    #[test]
    fn parse_nextjs_script() {
        let data = parse_data(&nextjs_fixture()).unwrap();
        assert_eq!(data.entity_type.as_deref(), Some("track"));
        assert_eq!(data.track_list.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn parse_initial_state_script() {
        let payload = serde_json::json!({ "data": { "entity": entity_json() } });
        let html = format!(
            "<html><body><script id=\"initial-state\">{}</script></body></html>",
            b64(&payload.to_string())
        );
        let data = parse_data(&html).unwrap();
        assert_eq!(data.name.as_deref(), Some("Immaterial"));
    }

    #[test]
    fn parse_no_scripts_errors() {
        let err = parse_data("<html><body>gone</body></html>").unwrap_err();
        assert!(matches!(err, SpotifyError::Parse(_)));
        assert!(err.to_string().contains("Couldn't find any data"));
    }

    #[test]
    fn parse_missing_html_errors() {
        let err = parse_data("just text").unwrap_err();
        assert!(err.to_string().contains("Couldn't find scripts"));
    }

    #[test]
    fn tracks_mapping() {
        let data = parse_data(&resource_fixture()).unwrap();
        let tracks = tracks_from_data(&data);
        assert_eq!(tracks.len(), 2);
        assert_eq!(tracks[0].name, "Immaterial");
        assert_eq!(tracks[0].artist.as_deref(), Some("SOPHIE"));
        assert_eq!(
            tracks[0].preview_url.as_deref(),
            Some("https://p.scdn.co/mp3-preview/abc")
        );
        // isPlayable=false hides the preview even when a URL exists.
        assert_eq!(tracks[1].preview_url, None);
        // show publisher becomes the artist.
        assert_eq!(tracks[1].artist.as_deref(), Some("Pod Publisher"));
    }

    #[test]
    fn preview_fields() {
        let data = parse_data(&resource_fixture()).unwrap();
        let p = preview_from_data(&data);
        assert_eq!(p.title, "Immaterial");
        assert_eq!(p.preview_type, "track");
        assert_eq!(p.track, "Immaterial");
        assert_eq!(p.image.as_deref(), Some("https://i.scdn.co/image/big"));
        assert_eq!(
            p.audio.as_deref(),
            Some("https://p.scdn.co/mp3-preview/abc")
        );
        assert_eq!(
            p.link,
            "https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas"
        );
        assert_eq!(
            p.embed,
            "https://embed.spotify.com/?uri=spotify:track:5nTtCOCds6I0PHMNtqelas"
        );
        assert_eq!(p.date.as_deref(), Some("2018-06-15T00:00:00.000Z"));
    }

    #[test]
    fn url_parsing() {
        let p = parse_url("https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas?si=xyz").unwrap();
        assert_eq!(p.resource_type, "track");
        assert_eq!(p.id, "5nTtCOCds6I0PHMNtqelas");
        assert_eq!(
            embed_url(&p),
            "https://embed.spotify.com/?uri=spotify:track:5nTtCOCds6I0PHMNtqelas"
        );
        assert_eq!(
            open_url(&p),
            "https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas"
        );
    }

    #[test]
    fn url_parsing_spotify_uri_and_embed() {
        let p = parse_url("spotify:album:4tDBsfbHRJ9OdcMO9bmnai").unwrap();
        assert_eq!(
            (p.resource_type.as_str(), p.id.as_str()),
            ("album", "4tDBsfbHRJ9OdcMO9bmnai")
        );
        let q = parse_url("https://embed.spotify.com/?uri=spotify:track:5nTtCOCds6I0PHMNtqelas")
            .unwrap();
        assert_eq!(q.resource_type, "track");
    }

    #[test]
    fn url_parsing_rejects() {
        for bad in [
            "",
            "arti39anptrackspotify:://https",
            "http://google.com/5a2w2tgpLwv26BYJf2qYwu",
        ] {
            let err = parse_url(bad).unwrap_err();
            assert_eq!(err, SpotifyError::InvalidUrl(bad.to_string()));
        }
    }

    #[test]
    fn normalize_rejects_shape() {
        let err = parse_data(&format!(
            "<html><body><script id=\"resource\">{}</script></body></html>",
            b64(r#"{"type":"track"}"#)
        ))
        .unwrap_err();
        assert!(err.to_string().contains("right shape"));
    }

    #[test]
    fn artist_join_format() {
        let t = SpotifyTrackData {
            artists: Some(vec![
                SpotifyArtist { name: "A".into() },
                SpotifyArtist { name: "B".into() },
                SpotifyArtist { name: "C".into() },
            ]),
            ..Default::default()
        };
        assert_eq!(join_artist_names(&t), "A, B & C");
    }
}
