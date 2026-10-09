// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
// Copyright (c) 2020-2026 iHorizon
//
// Rust port of tidal-metadata (https://github.com/kisastractors/tidal-metadata)
// by Anais Saraiva, MIT licensed. Original MIT attribution retained.
//
// Mirrors src/index.ts: `track` / `album` / `playlist` / default `search` over the
// TIDAL embed pages (https://embed.tidal.com/{type}s/{id}), parsed with string
// scans that follow the original regexes (no regex crate in the tree).

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
        eprintln!("tidal music: {msg}");
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TidalError {
    MissingId(&'static str),
    Http(String),
}

impl fmt::Display for TidalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingId(m) => write!(f, "{m}"),
            Self::Http(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for TidalError {}

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
pub enum TidalResult {
    #[serde(rename = "song")]
    Song(Track),
    #[serde(rename = "album")]
    Album(RawAlbum),
    #[serde(rename = "playlist")]
    Playlist(RawPlaylist),
}

pub const USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36";

/// Embed URL shape: https://embed.tidal.com/{type}s/{id} (mirrors fetchEmbed).
pub fn embed_url(embed_type: &str, id: &str) -> String {
    format!("https://embed.tidal.com/{embed_type}s/{id}")
}

// ---- Pure helpers (mirror the TS functions one-to-one) ----

/// Mirrors `decodeHtmlEntities`.
pub fn decode_html_entities(text: &str) -> String {
    text.replace("&#39;", "'")
        .replace("&#x27;", "'")
        .replace("&#x2F;", "/")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
}

/// Mirrors `durationToSeconds` ("m:ss" / "h:mm:ss" -> seconds).
pub fn duration_to_seconds(text: Option<&str>) -> u64 {
    let text = match text {
        Some(t) => t.trim(),
        None => return 0,
    };
    let parts: Vec<&str> = text.split(':').collect();
    let nums: Vec<u64> = parts
        .iter()
        .map(|p| p.trim().parse().unwrap_or(0))
        .collect();
    match nums.len() {
        2 => nums[0] * 60 + nums[1],
        3 => nums[0] * 3600 + nums[1] * 60 + nums[2],
        _ => 0,
    }
}

fn digits_after(input: &str, marker: &str) -> Option<String> {
    let idx = input.find(marker)?;
    let after = &input[idx + marker.len()..];
    let id: String = after.chars().take_while(|c| c.is_ascii_digit()).collect();
    if id.is_empty() {
        None
    } else {
        Some(id)
    }
}

/// Mirrors `extractAlbumId` (bare digits or /album/{id}).
pub fn extract_album_id(input: &str) -> Result<String, TidalError> {
    if !input.is_empty() && input.chars().all(|c| c.is_ascii_digit()) {
        return Ok(input.to_string());
    }
    digits_after(input, "/album/").ok_or(TidalError::MissingId(
        "Album ID introuvable dans l'URL TIDAL",
    ))
}

/// Mirrors `extractTrackId`.
pub fn extract_track_id(input: &str) -> Result<String, TidalError> {
    if !input.is_empty() && input.chars().all(|c| c.is_ascii_digit()) {
        return Ok(input.to_string());
    }
    digits_after(input, "/track/").ok_or(TidalError::MissingId(
        "Track ID introuvable dans l'URL TIDAL",
    ))
}

fn uuid_after(input: &str, marker: &str) -> Option<String> {
    let idx = input.find(marker)?;
    let after = &input[idx + marker.len()..];
    let end = after
        .find(|c: char| c != '-' && !c.is_ascii_hexdigit())
        .unwrap_or(after.len());
    let id = &after[..end];
    if id.len() == 36 && id.chars().filter(|&c| c == '-').count() == 4 {
        Some(id.to_string())
    } else {
        None
    }
}

fn is_uuid(s: &str) -> bool {
    s.len() == 36
        && s.chars().filter(|&c| c == '-').count() == 4
        && s.chars().all(|c| c == '-' || c.is_ascii_hexdigit())
}

/// Mirrors `extractPlaylistId` (bare UUID or /playlist/{uuid}).
pub fn extract_playlist_id(input: &str) -> Result<String, TidalError> {
    if is_uuid(input) {
        return Ok(input.to_string());
    }
    uuid_after(input, "/playlist/").ok_or(TidalError::MissingId(
        "Playlist ID introuvable dans l'URL TIDAL",
    ))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TidalLinkType {
    Track,
    Album,
    Playlist,
    Unknown,
}

/// Mirrors `detectType` (bare digits default to album).
pub fn detect_type(input: &str) -> TidalLinkType {
    if input.contains("/track/") && digits_after(input, "/track/").is_some() {
        return TidalLinkType::Track;
    }
    if input.contains("/album/") && digits_after(input, "/album/").is_some() {
        return TidalLinkType::Album;
    }
    if input.contains("/playlist/") && uuid_after(input, "/playlist/").is_some() {
        return TidalLinkType::Playlist;
    }
    if !input.is_empty() && input.chars().all(|c| c.is_ascii_digit()) {
        return TidalLinkType::Album;
    }
    TidalLinkType::Unknown
}

// Case-insensitive structural search over ASCII HTML: lowercase copy keeps byte
// indices aligned, values are sliced from the original.
fn find_ci(hay_lower: &str, needle: &str, from: usize) -> Option<usize> {
    hay_lower[from..].find(needle).map(|i| from + i)
}

fn attr_value(tag: &str, name: &str) -> Option<String> {
    let lower = tag.to_ascii_lowercase();
    for quote in ['"', '\''] {
        let needle = format!("{name}={quote}");
        if let Some(i) = lower.find(&needle) {
            let rest = &tag[i + needle.len()..];
            if let Some(end) = rest.find(quote) {
                return Some(rest[..end].to_string());
            }
        }
    }
    None
}

/// Mirrors `parseArtists`: `<a href="https://tidal.com/artist/...">Name</a>` links.
pub fn parse_artists(html: &str) -> Vec<Artist> {
    let lower = html.to_ascii_lowercase();
    let mut artists = Vec::new();
    let mut pos = 0;
    while let Some(a) = find_ci(&lower, "<a", pos) {
        let tag_end = match find_ci(&lower, ">", a) {
            Some(i) => i,
            None => break,
        };
        let tag = &html[a..tag_end];
        let href = attr_value(tag, "href").unwrap_or_default();
        let close = match find_ci(&lower, "</a>", tag_end) {
            Some(i) => i,
            None => break,
        };
        let name = html[tag_end + 1..close].trim().to_string();
        pos = close + "</a>".len();
        if href.starts_with("https://tidal.com/artist/")
            && !name.is_empty()
            && !artists.iter().any(|x: &Artist| x.url == href)
        {
            artists.push(Artist { name, url: href });
        }
    }
    artists
}

fn section_between(
    html: &str,
    lower: &str,
    open_marker: &str,
    close_marker: &str,
) -> Option<String> {
    let start = lower.find(open_marker)?;
    let content_start = lower[start..].find('>')? + start + 1;
    let end = lower[content_start..].find(close_marker)? + content_start;
    Some(html[content_start..end].to_string())
}

fn h1_media_title(html: &str, lower: &str, class: &str) -> String {
    // <h1 class="{class}">...(<a>Title</a> | raw Title)...</h1>
    let marker = format!("<h1 class=\"{class}\"");
    let Some(h1) = find_ci(lower, &marker, 0) else {
        return String::new();
    };
    let Some(cs) = find_ci(lower, ">", h1) else {
        return String::new();
    };
    let cs = cs + 1;
    let Some(end) = find_ci(lower, "</h1>", cs) else {
        return String::new();
    };
    let inner = &html[cs..end];
    let inner_lower = inner.to_ascii_lowercase();
    if let Some(a) = inner_lower.find("<a") {
        if let Some(gt) = inner_lower[a..].find('>') {
            let title_start = a + gt + 1;
            if let Some(close) = inner_lower[title_start..].find("</a>") {
                return decode_html_entities(inner[title_start..title_start + close].trim());
            }
        }
    }
    decode_html_entities(inner.trim())
}

struct ListItem {
    track_id: String,
    html: String,
}

fn list_items(html: &str, lower: &str) -> Vec<ListItem> {
    let mut items = Vec::new();
    let mut pos = 0;
    while let Some(li) = find_ci(lower, "<list-item", pos) {
        let Some(tag_end) = find_ci(lower, ">", li) else {
            break;
        };
        let tag = &html[li..tag_end];
        let track_id = attr_value(tag, "product-id").unwrap_or_default();
        let Some(end) = find_ci(lower, "</list-item>", tag_end) else {
            break;
        };
        items.push(ListItem {
            track_id,
            html: html[tag_end + 1..end].to_string(),
        });
        pos = end + "</list-item>".len();
    }
    items
}

fn slot_text(item_html: &str, slot: &str) -> Option<String> {
    let lower = item_html.to_ascii_lowercase();
    let marker = format!("slot=\"{slot}\"");
    let i = lower.find(&marker)?;
    let gt = lower[i..].find('>')? + i + 1;
    let rest = &item_html[gt..];
    let end = rest.find('<')?;
    Some(decode_html_entities(rest[..end].trim()))
}

fn slot_artist(item_html: &str) -> Option<Artist> {
    let lower = item_html.to_ascii_lowercase();
    let marker = "slot=\"artist\"";
    let i = lower.find(marker)?;
    let a = lower[i..].find("<a")? + i;
    let tag_end = lower[a..].find('>')? + a;
    let href = attr_value(&item_html[a..tag_end], "href").unwrap_or_default();
    let close = lower[tag_end..].find("</a>")? + tag_end;
    Some(Artist {
        name: item_html[tag_end + 1..close].trim().to_string(),
        url: href.trim().to_string(),
    })
}

fn album_tracks_from_items(items: &[ListItem], fallback: &Artist) -> Vec<Track> {
    items
        .iter()
        .map(|item| {
            let artist = slot_artist(&item.html)
                .filter(|a| !a.name.is_empty())
                .unwrap_or_else(|| fallback.clone());
            Track {
                artist,
                duration: duration_to_seconds(slot_text(&item.html, "duration").as_deref()),
                title: slot_text(&item.html, "title").unwrap_or_default(),
                url: format!("https://tidal.com/track/{}", item.track_id),
                kind: "song".to_string(),
            }
        })
        .collect()
}

/// Mirrors `parseAlbumEmbed` (pure over embed HTML).
pub fn parse_album_embed(html: &str) -> RawAlbum {
    let lower = html.to_ascii_lowercase();
    let title = h1_media_title(html, &lower, "media-album");
    let artist_html = section_between(html, &lower, "<span class=\"media-artist\"", "</span>")
        .unwrap_or_default();
    let scope = if artist_html.is_empty() {
        html.to_string()
    } else {
        artist_html
    };
    let artist = parse_artists(&scope).into_iter().next().unwrap_or(Artist {
        name: String::new(),
        url: String::new(),
    });
    let items = list_items(html, &lower);
    let tracks = album_tracks_from_items(&items, &artist);
    RawAlbum {
        title,
        description: String::new(),
        artist,
        num_tracks: tracks.len(),
        tracks,
        kind: "album".to_string(),
    }
}

/// Mirrors `parseTrackEmbed` (pure over embed HTML).
pub fn parse_track_embed(html: &str, track_id: &str) -> Track {
    let lower = html.to_ascii_lowercase();
    let title = h1_media_title(html, &lower, "media-title");
    let artist_html = section_between(html, &lower, "<span class=\"media-artist\"", "</span>")
        .unwrap_or_default();
    let scope = if artist_html.is_empty() {
        html.to_string()
    } else {
        artist_html
    };
    let artist = parse_artists(&scope).into_iter().next().unwrap_or(Artist {
        name: String::new(),
        url: String::new(),
    });
    let duration = section_between(
        html,
        &lower,
        "<tidal-duration-time>",
        "</tidal-duration-time>",
    )
    .and_then(|s| s.trim().parse().ok())
    .unwrap_or(0);
    Track {
        artist,
        duration,
        title,
        url: format!("https://tidal.com/track/{track_id}"),
        kind: "song".to_string(),
    }
}

/// Mirrors `parsePlaylistEmbed` (pure over embed HTML).
pub fn parse_playlist_embed(html: &str) -> RawPlaylist {
    let lower = html.to_ascii_lowercase();
    let title = h1_media_title(html, &lower, "media-album");
    let creator_html = section_between(html, &lower, "<span class=\"media-artist\"", "</span>")
        .unwrap_or_default();
    let creator_text = creator_html
        .replace('<', "\n<")
        .split('\n')
        .filter(|l| !l.trim_start().starts_with('<'))
        .collect::<Vec<_>>()
        .join("")
        .trim()
        .to_string();
    let creator_text = decode_html_entities(&creator_text);
    let items = list_items(html, &lower);
    let tracks: Vec<Track> = items
        .iter()
        .map(|item| {
            let artist = slot_artist(&item.html).unwrap_or(Artist {
                name: String::new(),
                url: String::new(),
            });
            Track {
                artist,
                duration: duration_to_seconds(slot_text(&item.html, "duration").as_deref()),
                title: slot_text(&item.html, "title").unwrap_or_default(),
                url: format!("https://tidal.com/track/{}", item.track_id),
                kind: "song".to_string(),
            }
        })
        .collect();
    RawPlaylist {
        title,
        description: format!(
            "Playlist by {}",
            if creator_text.is_empty() {
                "TIDAL".to_string()
            } else {
                creator_text
            }
        ),
        num_tracks: tracks.len(),
        tracks,
        kind: "playlist".to_string(),
    }
}

// ---- Network entry points (mirror fetchEmbed + album/track/playlist/search) ----

async fn fetch_embed(embed_type: &str, id: &str) -> Result<String, TidalError> {
    let url = embed_url(embed_type, id);
    log(&format!("fetching {url}"));
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header(
            "accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        )
        .header("accept-language", "en-US,en;q=0.9")
        .header("user-agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| TidalError::Http(format!("Embed fetch {e} for {url}")))?;
    if !res.status().is_success() {
        return Err(TidalError::Http(format!(
            "Embed fetch HTTP {} for {url}",
            res.status()
        )));
    }
    res.text()
        .await
        .map_err(|e| TidalError::Http(e.to_string()))
}

/// Mirrors `album`.
pub async fn album(input: &str) -> Result<RawAlbum, TidalError> {
    let id = extract_album_id(input)?;
    log(&format!("album {id}"));
    Ok(parse_album_embed(&fetch_embed("album", &id).await?))
}

/// Mirrors `track`.
pub async fn track(input: &str) -> Result<Track, TidalError> {
    let id = extract_track_id(input)?;
    log(&format!("track {id}"));
    Ok(parse_track_embed(&fetch_embed("track", &id).await?, &id))
}

/// Mirrors `playlist`.
pub async fn playlist(input: &str) -> Result<RawPlaylist, TidalError> {
    let id = extract_playlist_id(input)?;
    log(&format!("playlist {id}"));
    Ok(parse_playlist_embed(&fetch_embed("playlist", &id).await?))
}

/// Mirrors default `search` (unknown inputs try album, then playlist).
pub async fn search(input: &str) -> Result<TidalResult, TidalError> {
    match detect_type(input) {
        TidalLinkType::Track => Ok(TidalResult::Song(track(input).await?)),
        TidalLinkType::Album => Ok(TidalResult::Album(album(input).await?)),
        TidalLinkType::Playlist => Ok(TidalResult::Playlist(playlist(input).await?)),
        TidalLinkType::Unknown => match album(input).await {
            Ok(a) => Ok(TidalResult::Album(a)),
            Err(_) => Ok(TidalResult::Playlist(playlist(input).await?)),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn album_embed() -> String {
        r#"<html><body>
<h1 class="media-album"><a href="https://tidal.com/album/539234099">CONFESSIONS II</a></h1>
<span class="media-artist"><a href="https://tidal.com/artist/15545">Madonna</a></span>
<list-item product-id="539234102"><span slot="title">I Feel So Free</span><span slot="duration">4:59</span><span slot="artist"><a href="https://tidal.com/artist/15545">Madonna</a></span></list-item>
<list-item product-id="539234105"><span slot="title">Good For The Soul &amp; More</span><span slot="duration">3:08</span></list-item>
</body></html>"#.to_string()
    }

    fn track_embed() -> String {
        r#"<html><body>
<h1 class="media-title">Serrure #667</h1>
<span class="media-artist"><a href="https://tidal.com/artist/32867429">La Rvfleuze</a></span>
<tidal-duration-time>148</tidal-duration-time>
</body></html>"#
            .to_string()
    }

    fn playlist_embed() -> String {
        r#"<html><body>
<h1 class="media-album"><a href="https://tidal.com/playlist/abc">Top Hits</a></h1>
<span class="media-artist"><a href="https://tidal.com/user/x">TIDAL</a></span>
<list-item product-id="111"><span slot="title">Song One</span><span slot="duration">3:37</span><span slot="artist"><a href="https://tidal.com/artist/1566">Beyoncé</a></span></list-item>
</body></html>"#.to_string()
    }

    #[test]
    fn entities() {
        assert_eq!(decode_html_entities("a &amp; b &#39;q&#39;"), "a & b 'q'");
        assert_eq!(duration_to_seconds(Some("4:59")), 299);
        assert_eq!(duration_to_seconds(Some("1:02:03")), 3723);
        assert_eq!(duration_to_seconds(None), 0);
        assert_eq!(duration_to_seconds(Some("x")), 0);
    }

    #[test]
    fn ids_and_types() {
        assert_eq!(extract_album_id("539234099").unwrap(), "539234099");
        assert_eq!(
            extract_album_id("https://tidal.com/album/539234099/u").unwrap(),
            "539234099"
        );
        assert!(extract_album_id("https://tidal.com/track/1").is_err());
        assert_eq!(
            extract_track_id("https://tidal.com/track/510366521/u").unwrap(),
            "510366521"
        );
        let uuid = "edf3b7d2-cb42-41d7-93c0-afa2a395521b";
        assert_eq!(extract_playlist_id(uuid).unwrap(), uuid);
        assert_eq!(
            extract_playlist_id(&format!("https://tidal.com/playlist/{uuid}")).unwrap(),
            uuid
        );
        assert!(extract_playlist_id("https://tidal.com/playlist/short").is_err());
        assert_eq!(
            detect_type("https://tidal.com/track/510366521/u"),
            TidalLinkType::Track
        );
        assert_eq!(
            detect_type("https://tidal.com/album/539234099/u"),
            TidalLinkType::Album
        );
        assert_eq!(detect_type("539234099"), TidalLinkType::Album);
        assert_eq!(detect_type("nope"), TidalLinkType::Unknown);
        assert_eq!(embed_url("album", "1"), "https://embed.tidal.com/albums/1");
    }

    #[test]
    fn album_parsing() {
        let album = parse_album_embed(&album_embed());
        assert_eq!(album.title, "CONFESSIONS II");
        assert_eq!(album.artist.name, "Madonna");
        assert_eq!(album.num_tracks, 2);
        assert_eq!(album.tracks[0].title, "I Feel So Free");
        assert_eq!(album.tracks[0].duration, 299);
        assert_eq!(album.tracks[0].url, "https://tidal.com/track/539234102");
        assert_eq!(album.tracks[1].title, "Good For The Soul & More");
        // Track without slot artist inherits the album artist.
        assert_eq!(album.tracks[1].artist.name, "Madonna");
        assert_eq!(album.description, "");
    }

    #[test]
    fn track_parsing() {
        let t = parse_track_embed(&track_embed(), "510366521");
        assert_eq!(t.title, "Serrure #667");
        assert_eq!(t.artist.name, "La Rvfleuze");
        assert_eq!(t.artist.url, "https://tidal.com/artist/32867429");
        assert_eq!(t.duration, 148);
        assert_eq!(t.url, "https://tidal.com/track/510366521");
        assert_eq!(t.kind, "song");
    }

    #[test]
    fn playlist_parsing() {
        let pl = parse_playlist_embed(&playlist_embed());
        assert_eq!(pl.title, "Top Hits");
        assert_eq!(pl.description, "Playlist by TIDAL");
        assert_eq!(pl.num_tracks, 1);
        assert_eq!(pl.tracks[0].artist.name, "Beyoncé");
        assert_eq!(pl.tracks[0].duration, 217);
    }

    #[test]
    fn artist_dedupe() {
        let html = "<a href=\"https://tidal.com/artist/1\">A</a><a href=\"https://tidal.com/artist/1\">A</a><a href=\"https://other.com/x\">B</a>";
        let artists = parse_artists(html);
        assert_eq!(artists.len(), 1);
    }
}
