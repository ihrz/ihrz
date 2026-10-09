// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/music/* (14 subs).
//
// Live audio via crate::lavalink (LavalinkManager, queue, voice
// handshake). Ported for real:
// MUSIC_HISTORY store (buffer/embed, 30d purge), volume clamp, loop mode
// parsing, lyrics truncation + text-API lookup, duration formatting.
// Play/skip/stop/pause/resume/queue/clear/
// shuffle/nowplaying/trackinfo answer from the live player state once a
// node is configured; lyrics stays on a text API by design.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub title: String,
    pub at_ms: i64,
}

pub const HISTORY_KEY: &str = "MUSIC_HISTORY";
pub const HISTORY_TTL_MS: i64 = 30 * 86_400_000;

pub fn push_history(mut h: Vec<HistoryEntry>, e: HistoryEntry, now_ms: i64) -> Vec<HistoryEntry> {
    h.push(e);
    h.retain(|x| now_ms - x.at_ms <= HISTORY_TTL_MS);
    h
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LoopMode {
    Off,
    Track,
}

pub fn parse_loop(s: &str) -> Option<LoopMode> {
    match s.to_ascii_lowercase().as_str() {
        "off" => Some(LoopMode::Off),
        "track" => Some(LoopMode::Track),
        _ => None,
    }
}

impl From<LoopMode> for crate::lavalink::LoopMode {
    fn from(m: LoopMode) -> Self {
        match m {
            LoopMode::Off => crate::lavalink::LoopMode::Off,
            LoopMode::Track => crate::lavalink::LoopMode::Track,
        }
    }
}

/// Discord embed description limit guard (lyrics truncate at 1997 + …).
pub fn truncate_lyrics(s: &str) -> String {
    if s.len() <= 1997 {
        s.to_string()
    } else {
        format!("{}…", &s[..1997])
    }
}

pub fn fmt_duration(ms: u64) -> String {
    let s = ms / 1000;
    format!("{}:{:02}", s / 60, s % 60)
}

fn now_ms() -> i64 {
    crate::commands::schedule::main::now_ms()
}

fn guild_id_of(ctx: &Ctx<'_>) -> Option<u64> {
    ctx.guild_id().map(|g| g.get())
}

fn voice_channel_of(ctx: &Ctx<'_>) -> Option<u64> {
    let gid = ctx.guild_id()?;
    let guild = ctx.serenity_context().cache.guild(gid)?;
    guild
        .voice_states
        .get(&ctx.author().id)?
        .channel_id
        .map(|c| c.get())
}

/// Sync manager nodes from config on every call (idempotent; sessions
/// preserved) and hand back the process-wide manager.
async fn synced_mgr(ctx: &Ctx<'_>) -> &'static crate::lavalink::LavalinkManager {
    let m = crate::lavalink::manager();
    let cfgs: Vec<crate::lavalink::NodeCfg> = ctx
        .data()
        .config
        .lavalink_nodes
        .iter()
        .map(crate::lavalink::NodeCfg::from)
        .collect();
    let user_id = ctx.serenity_context().cache.current_user().id.get();
    m.sync_nodes(&cfgs, user_id).await;
    m
}

async fn record_history(pool: &crate::db::Pool, gid: u64, title: &str) {
    let key = gid.to_string();
    let raw = crate::db::kv_get(pool, &key, HISTORY_KEY).await;
    let mut hist: Vec<HistoryEntry> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let now = now_ms();
    hist = push_history(
        hist,
        HistoryEntry {
            title: title.to_string(),
            at_ms: now,
        },
        now,
    );
    if let Ok(json) = serde_json::to_string(&hist) {
        let _ = crate::db::kv_set(pool, &key, HISTORY_KEY, &json).await;
    }
}

async fn lang_code(ctx: &Ctx<'_>) -> String {
    crate::db::guild_lang(&ctx.data().pool, guild_id_of(ctx)).await
}

// ---- Metadata enrichment (source-detected normalized previews) ----
// nowplaying / trackinfo / queue consume the rust/src/metadata ports.
// Detection is per track URL; any fetch failure (or unmatched URL) falls
// back to the live Lavalink track info. No html2png: the Spotify banner
// is a pure SVG attachment.

/// Metadata provider detected from a track URL.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MetaSource {
    Spotify,
    Apple,
    Amazon,
    Tidal,
}

pub fn meta_source_tag(s: MetaSource) -> &'static str {
    match s {
        MetaSource::Spotify => "Spotify",
        MetaSource::Apple => "Apple Music",
        MetaSource::Amazon => "Amazon Music",
        MetaSource::Tidal => "Tidal",
    }
}

fn url_host(url: &str) -> String {
    let lower = url.to_ascii_lowercase();
    lower
        .split("://")
        .nth(1)
        .unwrap_or("")
        .split('/')
        .next()
        .unwrap_or("")
        .to_string()
}

/// Source-detect a track URL. Returns None when no metadata provider
/// matches (Lavalink fallback path).
pub fn detect_meta_source(url: &str) -> Option<MetaSource> {
    let lower = url.to_ascii_lowercase();
    if lower.starts_with("spotify:") {
        return Some(MetaSource::Spotify);
    }
    let host = url_host(url);
    if host.is_empty() {
        return None;
    }
    if host == "open.spotify.com" || host == "play.spotify.com" || host == "embed.spotify.com" {
        return Some(MetaSource::Spotify);
    }
    if host == "music.apple.com" || host == "itunes.apple.com" {
        return Some(MetaSource::Apple);
    }
    if host.starts_with("music.amazon.") {
        return Some(MetaSource::Amazon);
    }
    if host == "tidal.com"
        || host.ends_with(".tidal.com")
        || host == "listen.tidal.com"
        || host == "embed.tidal.com"
    {
        return Some(MetaSource::Tidal);
    }
    None
}

/// Provider-agnostic preview for rich embeds. `source` is None on the
/// Lavalink fallback (no provider matched or the fetch failed).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NormalizedPreview {
    pub title: String,
    pub artist: Option<String>,
    pub image: Option<String>,
    pub link: String,
    pub date: Option<String>,
    pub source: Option<MetaSource>,
}

fn non_empty(s: &str) -> Option<String> {
    if s.trim().is_empty() {
        None
    } else {
        Some(s.to_string())
    }
}

pub fn preview_from_spotify(p: &crate::metadata::spotify::Preview) -> NormalizedPreview {
    NormalizedPreview {
        title: p.title.clone(),
        artist: p.artist.clone().filter(|a| !a.trim().is_empty()),
        image: p.image.clone().filter(|u| !u.trim().is_empty()),
        link: p.link.clone(),
        date: p.date.clone(),
        source: Some(MetaSource::Spotify),
    }
}

pub fn preview_from_apple_track(t: &crate::metadata::apple_music::Track) -> NormalizedPreview {
    NormalizedPreview {
        title: t.title.clone(),
        artist: non_empty(&t.artist.name),
        image: None,
        link: t.url.clone(),
        date: None,
        source: Some(MetaSource::Apple),
    }
}

pub fn preview_from_apple_result(
    r: &crate::metadata::apple_music::AppleResult,
) -> NormalizedPreview {
    match r {
        crate::metadata::apple_music::AppleResult::Song(t) => preview_from_apple_track(t),
        crate::metadata::apple_music::AppleResult::Album(a) => match a.tracks.first() {
            Some(t) => preview_from_apple_track(t),
            None => NormalizedPreview {
                title: a.title.clone(),
                artist: non_empty(&a.artist.name),
                image: None,
                link: String::new(),
                date: None,
                source: Some(MetaSource::Apple),
            },
        },
        crate::metadata::apple_music::AppleResult::Playlist(p) => match p.tracks.first() {
            Some(t) => preview_from_apple_track(t),
            None => NormalizedPreview {
                title: p.title.clone(),
                artist: non_empty(&p.creator.name),
                image: None,
                link: String::new(),
                date: None,
                source: Some(MetaSource::Apple),
            },
        },
    }
}

pub fn preview_from_amazon_track(t: &crate::metadata::amazon_music::Track) -> NormalizedPreview {
    NormalizedPreview {
        title: t.title.clone(),
        artist: non_empty(&t.artist.name),
        image: None,
        link: t.url.clone(),
        date: None,
        source: Some(MetaSource::Amazon),
    }
}

pub fn preview_from_amazon_result(
    r: &crate::metadata::amazon_music::AmazonResult,
) -> NormalizedPreview {
    match r {
        crate::metadata::amazon_music::AmazonResult::Song(t) => preview_from_amazon_track(t),
        crate::metadata::amazon_music::AmazonResult::Album(a) => match a.tracks.first() {
            Some(t) => preview_from_amazon_track(t),
            None => NormalizedPreview {
                title: a.title.clone(),
                artist: non_empty(&a.artist.name),
                image: None,
                link: String::new(),
                date: None,
                source: Some(MetaSource::Amazon),
            },
        },
        crate::metadata::amazon_music::AmazonResult::Playlist(p) => match p.tracks.first() {
            Some(t) => preview_from_amazon_track(t),
            None => NormalizedPreview {
                title: p.title.clone(),
                artist: None,
                image: None,
                link: String::new(),
                date: None,
                source: Some(MetaSource::Amazon),
            },
        },
    }
}

pub fn preview_from_tidal_track(t: &crate::metadata::tidal::Track) -> NormalizedPreview {
    NormalizedPreview {
        title: t.title.clone(),
        artist: non_empty(&t.artist.name),
        image: None,
        link: t.url.clone(),
        date: None,
        source: Some(MetaSource::Tidal),
    }
}

pub fn preview_from_tidal_result(r: &crate::metadata::tidal::TidalResult) -> NormalizedPreview {
    match r {
        crate::metadata::tidal::TidalResult::Song(t) => preview_from_tidal_track(t),
        crate::metadata::tidal::TidalResult::Album(a) => match a.tracks.first() {
            Some(t) => preview_from_tidal_track(t),
            None => NormalizedPreview {
                title: a.title.clone(),
                artist: non_empty(&a.artist.name),
                image: None,
                link: String::new(),
                date: None,
                source: Some(MetaSource::Tidal),
            },
        },
        crate::metadata::tidal::TidalResult::Playlist(p) => match p.tracks.first() {
            Some(t) => preview_from_tidal_track(t),
            None => NormalizedPreview {
                title: p.title.clone(),
                artist: None,
                image: None,
                link: String::new(),
                date: None,
                source: Some(MetaSource::Tidal),
            },
        },
    }
}

/// Lavalink fallback: raw player info, no provider enrichment.
pub fn fallback_preview(title: &str, author: &str, uri: Option<&str>) -> NormalizedPreview {
    NormalizedPreview {
        title: title.to_string(),
        artist: non_empty(author),
        image: None,
        link: uri.unwrap_or("").to_string(),
        date: None,
        source: None,
    }
}

pub fn fallback_preview_for(t: &crate::lavalink::QueuedTrack) -> NormalizedPreview {
    fallback_preview(&t.title, &t.author, t.uri.as_deref())
}

fn amazon_domain_of(url: &str) -> String {
    let host = url_host(url);
    if host.starts_with("music.amazon.") {
        host.to_string()
    } else {
        crate::metadata::amazon_music::DEFAULT_DOMAIN.to_string()
    }
}

/// Fetch the normalized preview for a track URL. None when unmatched or
/// when the provider fetch fails (caller falls back to Lavalink info).
pub async fn enrich_preview(url: &str) -> Option<NormalizedPreview> {
    match detect_meta_source(url)? {
        MetaSource::Spotify => crate::metadata::spotify::get_preview(url)
            .await
            .ok()
            .map(|p| preview_from_spotify(&p)),
        MetaSource::Apple => crate::metadata::apple_music::search(url)
            .await
            .ok()?
            .as_ref()
            .map(preview_from_apple_result),
        MetaSource::Amazon => {
            let domain = amazon_domain_of(url);
            crate::metadata::amazon_music::search(url, &domain)
                .await
                .ok()
                .map(|r| preview_from_amazon_result(&r))
        }
        MetaSource::Tidal => crate::metadata::tidal::search(url)
            .await
            .ok()
            .map(|r| preview_from_tidal_result(&r)),
    }
}

/// Preview for a queued track: enriched when its URL matches a provider,
/// Lavalink fallback otherwise.
pub async fn preview_for_track(t: &crate::lavalink::QueuedTrack) -> NormalizedPreview {
    match t.uri.as_deref() {
        Some(url) => enrich_preview(url)
            .await
            .unwrap_or_else(|| fallback_preview_for(t)),
        None => fallback_preview_for(t),
    }
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// SVG equivalent of the TS `.spotify-banner` html2png card (no browser).
/// Pure string builder, fixture-testable.
pub fn spotify_banner_svg(title: &str, artist: Option<&str>, state: &str) -> String {
    let title = xml_escape(title);
    let artist = xml_escape(artist.unwrap_or("Unknown artist"));
    let state = xml_escape(state);
    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"400\" viewBox=\"0 0 1200 400\">\
<rect width=\"1200\" height=\"400\" rx=\"24\" fill=\"#121212\"/>\
<rect x=\"0\" y=\"0\" width=\"16\" height=\"400\" fill=\"#1DB954\"/>\
<circle cx=\"96\" cy=\"200\" r=\"56\" fill=\"#1DB954\"/>\
<text x=\"96\" y=\"222\" font-family=\"sans-serif\" font-size=\"64\" text-anchor=\"middle\" fill=\"#121212\">S</text>\
<text x=\"190\" y=\"180\" font-family=\"sans-serif\" font-size=\"56\" font-weight=\"bold\" fill=\"#ffffff\">{title}</text>\
<text x=\"190\" y=\"244\" font-family=\"sans-serif\" font-size=\"40\" fill=\"#b3b3b3\">{artist}</text>\
<text x=\"190\" y=\"308\" font-family=\"sans-serif\" font-size=\"32\" fill=\"#1DB954\">{state} - Spotify</text>\
</svg>"
    )
}

/// Rich embed from a normalized preview; Lavalink duration appended when
/// known. Thumbnail only when the provider gave an image.
fn preview_embed(p: &NormalizedPreview, length_ms: Option<u64>) -> serenity::CreateEmbed {
    let mut desc = p
        .artist
        .clone()
        .unwrap_or_else(|| "Unknown artist".to_string());
    if let Some(ms) = length_ms {
        desc.push_str(&format!(" • [{}]", fmt_duration(ms)));
    }
    if let Some(d) = p.date.as_deref().filter(|d| !d.is_empty()) {
        desc.push_str(&format!(" • {d}"));
    }
    let source_line = match p.source {
        Some(s) => meta_source_tag(s).to_string(),
        None => "Lavalink".to_string(),
    };
    let mut embed = serenity::CreateEmbed::default()
        .title(p.title.clone())
        .description(desc)
        .footer(serenity::CreateEmbedFooter::new(source_line));
    if !p.link.is_empty() {
        embed = embed.url(&p.link);
    }
    if let Some(img) = p.image.as_deref().filter(|u| !u.is_empty()) {
        embed = embed.thumbnail(img);
    }
    embed
}

/// Queue line for one track: markdown link when a URI exists, tagged with
/// the detected provider (pure, no network fan-out over the queue).
pub fn queue_line(idx: usize, title: &str, author: &str, uri: Option<&str>) -> String {
    let tag = uri
        .and_then(detect_meta_source)
        .map(|s| format!(" [{}]", meta_source_tag(s)))
        .unwrap_or_default();
    match uri.filter(|u| !u.is_empty()) {
        Some(u) => format!("{idx}. [{title}]({u}) - {author}{tag}"),
        None => format!("{idx}. {title} - {author}{tag}"),
    }
}

pub mod clear_queue;
pub mod history;
pub mod r#loop;
pub mod lyrics;
#[allow(clippy::module_inception)]
pub mod music;
pub mod nowplaying;
pub mod pause;
pub mod play;
pub mod queue;
pub mod resume;
pub mod shuffle;
pub mod skip;
pub mod stop;
pub mod trackinfo;
pub mod volume;

/// Old registry path (`music::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::clear_queue::*;
    pub use super::history::*;
    pub use super::lyrics::*;
    pub use super::music::*;
    pub use super::nowplaying::*;
    pub use super::pause::*;
    pub use super::play::*;
    pub use super::queue::*;
    pub use super::r#loop::*;
    pub use super::resume::*;
    pub use super::shuffle::*;
    pub use super::skip::*;
    pub use super::stop::*;
    pub use super::trackinfo::*;
    pub use super::volume::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn history_purges_older_than_30d() {
        let h = push_history(
            vec![],
            HistoryEntry {
                title: "old".into(),
                at_ms: 0,
            },
            HISTORY_TTL_MS + 1,
        );
        assert!(h.is_empty());
        let h = push_history(
            vec![],
            HistoryEntry {
                title: "new".into(),
                at_ms: 1000,
            },
            2000,
        );
        assert_eq!(h.len(), 1);
    }

    #[test]
    fn loop_parses() {
        assert_eq!(parse_loop("off"), Some(LoopMode::Off));
        assert_eq!(parse_loop("track"), Some(LoopMode::Track));
        assert_eq!(parse_loop("queue"), None);
    }

    #[test]
    fn lyrics_truncate() {
        assert_eq!(truncate_lyrics("abc"), "abc");
        let long = "x".repeat(3000);
        assert_eq!(truncate_lyrics(&long).len(), 2000);
    }

    #[test]
    fn duration_formats() {
        assert_eq!(fmt_duration(0), "0:00");
        assert_eq!(fmt_duration(65_000), "1:05");
        assert_eq!(fmt_duration(3_600_000), "60:00");
    }

    #[test]
    fn detect_sources_per_url() {
        assert_eq!(
            detect_meta_source("https://open.spotify.com/track/5nTtCOCds6I0PHMNtqelas"),
            Some(MetaSource::Spotify)
        );
        assert_eq!(
            detect_meta_source("spotify:track:5nTtCOCds6I0PHMNtqelas"),
            Some(MetaSource::Spotify)
        );
        assert_eq!(
            detect_meta_source("https://embed.spotify.com/?uri=spotify:track:abc"),
            Some(MetaSource::Spotify)
        );
        assert_eq!(
            detect_meta_source("https://music.apple.com/us/album/foo/123?i=456"),
            Some(MetaSource::Apple)
        );
        assert_eq!(
            detect_meta_source("https://music.amazon.fr/albums/B0XXXX?trackAsin=B0YYYY"),
            Some(MetaSource::Amazon)
        );
        assert_eq!(
            detect_meta_source("https://tidal.com/track/123456"),
            Some(MetaSource::Tidal)
        );
        assert_eq!(
            detect_meta_source("https://www.youtube.com/watch?v=abc"),
            None
        );
        assert_eq!(detect_meta_source("just a query"), None);
    }

    fn fixture_spotify_preview() -> crate::metadata::spotify::Preview {
        crate::metadata::spotify::Preview {
            date: Some("2020-01-01T00:00:00.000Z".to_string()),
            title: "Album Title".to_string(),
            preview_type: "album".to_string(),
            track: "First Song".to_string(),
            description: Some("A description".to_string()),
            artist: Some("Some Artist".to_string()),
            image: Some("https://i.scdn.co/image/abc".to_string()),
            audio: None,
            link: "https://open.spotify.com/album/abc".to_string(),
            embed: "https://embed.spotify.com/?uri=spotify:album:abc".to_string(),
        }
    }

    #[test]
    fn spotify_preview_normalizes() {
        let p = preview_from_spotify(&fixture_spotify_preview());
        assert_eq!(p.title, "Album Title");
        assert_eq!(p.artist.as_deref(), Some("Some Artist"));
        assert_eq!(p.image.as_deref(), Some("https://i.scdn.co/image/abc"));
        assert_eq!(p.link, "https://open.spotify.com/album/abc");
        assert_eq!(p.date.as_deref(), Some("2020-01-01T00:00:00.000Z"));
        assert_eq!(p.source, Some(MetaSource::Spotify));
    }

    fn fixture_provider_track(
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
                duration: 197,
                title: "Song".to_string(),
                url: url.to_string(),
                kind: "song".to_string(),
            },
            crate::metadata::amazon_music::Track {
                artist: crate::metadata::amazon_music::Artist {
                    name: name.to_string(),
                    url: String::new(),
                },
                duration: 197,
                title: "Song".to_string(),
                url: url.to_string(),
                kind: "song".to_string(),
            },
            crate::metadata::tidal::Track {
                artist: crate::metadata::tidal::Artist {
                    name: name.to_string(),
                    url: String::new(),
                },
                duration: 197,
                title: "Song".to_string(),
                url: url.to_string(),
                kind: "song".to_string(),
            },
        )
    }

    #[test]
    fn provider_tracks_normalize() {
        let (apple, amazon, tidal) = fixture_provider_track("Artist", "https://example.com/t/1");
        let a = preview_from_apple_track(&apple);
        assert_eq!(a.source, Some(MetaSource::Apple));
        assert_eq!(a.artist.as_deref(), Some("Artist"));
        assert_eq!(a.link, "https://example.com/t/1");
        let b = preview_from_amazon_track(&amazon);
        assert_eq!(b.source, Some(MetaSource::Amazon));
        assert_eq!(b.title, "Song");
        let c = preview_from_tidal_track(&tidal);
        assert_eq!(c.source, Some(MetaSource::Tidal));
        assert_eq!(c.artist.as_deref(), Some("Artist"));
    }

    #[test]
    fn apple_album_result_uses_first_track() {
        let (track, _, _) = fixture_provider_track("Band", "https://music.apple.com/song/1");
        let r = crate::metadata::apple_music::AppleResult::Song(track);
        let p = preview_from_apple_result(&r);
        assert_eq!(p.source, Some(MetaSource::Apple));
        assert_eq!(p.title, "Song");
    }

    #[test]
    fn fallback_keeps_lavalink_info() {
        let t = crate::lavalink::QueuedTrack {
            encoded: "enc".to_string(),
            title: "YT Title".to_string(),
            author: "YT Author".to_string(),
            uri: Some("https://www.youtube.com/watch?v=abc".to_string()),
            length_ms: 65_000,
            source: "youtube".to_string(),
            requester: 1,
        };
        let p = fallback_preview_for(&t);
        assert_eq!(p.title, "YT Title");
        assert_eq!(p.artist.as_deref(), Some("YT Author"));
        assert_eq!(p.source, None);
        assert!(p.image.is_none());
    }

    #[test]
    fn banner_svg_escapes_and_labels() {
        let svg = spotify_banner_svg("A<B & C>", Some("Artist\"X\""), "playing");
        assert!(svg.contains("A&lt;B &amp; C&gt;"));
        assert!(svg.contains("Artist&quot;X&quot;"));
        assert!(svg.contains("playing - Spotify"));
        assert!(svg.starts_with("<svg"));
    }

    #[test]
    fn queue_lines_tag_sources() {
        let s = queue_line(
            1,
            "Song",
            "Artist",
            Some("https://open.spotify.com/track/abc"),
        );
        assert!(s.contains("[Spotify]"), "{s}");
        assert!(
            s.contains("[Song](https://open.spotify.com/track/abc)"),
            "{s}"
        );
        let y = queue_line(2, "V", "A", Some("https://www.youtube.com/watch?v=x"));
        assert!(!y.contains("Spotify"), "{y}");
        let n = queue_line(3, "V", "A", None);
        assert!(n.contains("3. V - A"), "{n}");
    }
}
