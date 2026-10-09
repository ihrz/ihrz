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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HistoryEntry {
    pub title: String,
    #[serde(default)]
    pub uri: Option<String>,
    #[serde(default)]
    pub requester: Option<String>,
    pub at_ms: i64,
}

impl HistoryEntry {
    pub fn new(title: &str, uri: Option<&str>, requester: Option<&str>, at_ms: i64) -> Self {
        let clean = |s: &str| {
            let s = s.trim();
            if s.is_empty() {
                None
            } else {
                Some(s.to_string())
            }
        };
        Self {
            title: title.to_string(),
            uri: uri.and_then(clean),
            requester: requester.and_then(clean),
            at_ms,
        }
    }
}

pub const HISTORY_KEY: &str = "MUSIC_HISTORY";
pub const HISTORY_TTL_MS: i64 = 30 * 86_400_000;
/// Count cap (TS grew the arrays unbounded). Oldest entries drop first.
pub const HISTORY_MAX_ENTRIES: usize = 200;
/// TS `usersPerPage`.
pub const HISTORY_PAGE_SIZE: usize = 10;
/// TS attachment name for the `.txt` export.
pub const HISTORY_EXPORT_NAME: &str = "music_history_by_ihorizon.txt";

pub fn push_history(mut h: Vec<HistoryEntry>, e: HistoryEntry, now_ms: i64) -> Vec<HistoryEntry> {
    h.push(e);
    prune_history(h, now_ms)
}

/// 30d TTL purge (on read, like TS) + count cap. Chronological
/// oldest-first in, oldest-first out.
pub fn prune_history(mut h: Vec<HistoryEntry>, now_ms: i64) -> Vec<HistoryEntry> {
    h.retain(|x| now_ms - x.at_ms <= HISTORY_TTL_MS);
    if h.len() > HISTORY_MAX_ENTRIES {
        h.drain(0..h.len() - HISTORY_MAX_ENTRIES);
    }
    h
}

/// TS `<t:(\d+):` timestamp embedded in the legacy embed lines.
pub fn history_timestamp_secs(s: &str) -> Option<i64> {
    let i = s.find("<t:")?;
    let rest = &s[i + 3..];
    let end = rest.find(':')?;
    rest[..end].parse::<i64>().ok()
}

/// One legacy TS embed line:
/// `<t:unix:R>: requester - title | uri by requester`.
/// Best-effort: timestamp falls back to `now_ms` (TS kept
/// timestamp-less entries "for safety").
pub fn parse_legacy_entry(s: &str, now_ms: i64) -> HistoryEntry {
    let at_ms = history_timestamp_secs(s)
        .map(|secs| secs * 1000)
        .unwrap_or(now_ms);
    let body = match s.find(": ") {
        Some(i) => s[i + 2..].trim(),
        None => s.trim(),
    };
    let (requester, rest) = match body.find(" - ") {
        Some(i) => (Some(body[..i].trim()), body[i + 3..].trim()),
        None => (None, body),
    };
    let (title, tail) = match rest.find(" | ") {
        Some(i) => (rest[..i].trim(), rest[i + 3..].trim()),
        None => (rest, ""),
    };
    // TS tail is `<uri> by <requester>`; the uri is its head.
    let uri = tail
        .rsplit_once(" by ")
        .map(|(u, _)| u.trim())
        .unwrap_or(tail.trim());
    let uri = uri.strip_prefix('{').unwrap_or(uri).trim();
    let uri = uri.strip_suffix('}').unwrap_or(uri).trim();
    HistoryEntry::new(
        if title.is_empty() { s.trim() } else { title },
        if uri.starts_with("http") {
            Some(uri)
        } else {
            None
        },
        requester.filter(|r| !r.is_empty()),
        at_ms,
    )
}

#[derive(Debug, Deserialize)]
struct LegacyHistoryShape {
    #[serde(default)]
    embed: Vec<String>,
    #[serde(default)]
    buffer: Vec<String>,
}

/// Decode the store: new `Vec<HistoryEntry>` shape first (minimal
/// `{title, at_ms}` rows still parse via serde defaults), then the
/// legacy TS `{embed, buffer}` shape. Returns the entries and whether
/// a one-time migration rewrite is due.
pub fn decode_history(raw: &str, now_ms: i64) -> (Vec<HistoryEntry>, bool) {
    if let Ok(list) = serde_json::from_str::<Vec<HistoryEntry>>(raw) {
        return (list, false);
    }
    let Ok(legacy) = serde_json::from_str::<LegacyHistoryShape>(raw) else {
        return (Vec::new(), false);
    };
    if legacy.embed.is_empty() && legacy.buffer.is_empty() {
        return (Vec::new(), false);
    }
    let n = legacy.embed.len().max(legacy.buffer.len());
    let mut out = Vec::with_capacity(n);
    for i in 0..n {
        let line = legacy
            .embed
            .get(i)
            .filter(|s| !s.trim().is_empty())
            .or_else(|| legacy.buffer.get(i))
            .map(|s| s.as_str())
            .unwrap_or_default();
        if line.trim().is_empty() {
            continue;
        }
        out.push(parse_legacy_entry(line, now_ms));
    }
    (out, true)
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

/// Parse a volume argument like TS `parseInt(String(query))`:
/// leading-integer parse, non-numeric (NaN) -> None, then the
/// 10..=100 clamp. Pure and offline-testable.
pub fn parse_volume_query(raw: &str) -> Option<u8> {
    let s = raw.trim();
    if s.is_empty() {
        return None;
    }
    let negative = s.starts_with('-');
    let digits: String = s
        .trim_start_matches(['+', '-'])
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect();
    if digits.is_empty() {
        return None;
    }
    let magnitude: i64 = digits.parse().unwrap_or(i64::MAX);
    let n = if negative {
        magnitude.saturating_neg()
    } else {
        magnitude
    };
    Some(crate::voice::clamp_volume(n) as u8)
}

/// Runtime Administrator check for prefix parity: poise
/// `default_member_permissions` only gates slash commands, while the
/// TS `permission` field gates both paths. False when the member or
/// its permissions are unavailable.
pub async fn caller_is_admin(ctx: &Ctx<'_>) -> bool {
    match ctx.author_member().await {
        Some(m) => m.permissions.map(|p| p.administrator()).unwrap_or(false),
        None => false,
    }
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
    record_history_full(pool, gid, title, None, None).await;
}

/// Rich write path (requester + URI), fed by the play command with the
/// resolved track fields (mirrors the musicPlay.ts buffer/embed rows).
async fn record_history_full(
    pool: &crate::db::Pool,
    gid: u64,
    title: &str,
    uri: Option<&str>,
    requester: Option<&str>,
) {
    let key = gid.to_string();
    let now = now_ms();
    let raw = crate::db::kv_get(pool, &key, HISTORY_KEY).await;
    let mut hist: Vec<HistoryEntry> = raw
        .as_deref()
        .map(|s| decode_history(s, now).0)
        .unwrap_or_default();
    hist = push_history(hist, HistoryEntry::new(title, uri, requester, now), now);
    if let Ok(json) = serde_json::to_string(&hist) {
        let _ = crate::db::kv_set(pool, &key, HISTORY_KEY, &json).await;
    }
}

/// Newest-first page (`page` is 0-based, `HISTORY_PAGE_SIZE` entries).
pub fn history_page(entries: &[HistoryEntry], page: usize) -> Vec<&HistoryEntry> {
    entries
        .iter()
        .rev()
        .skip(page.saturating_mul(HISTORY_PAGE_SIZE))
        .take(HISTORY_PAGE_SIZE)
        .collect()
}

pub fn history_page_count(len: usize) -> usize {
    len.div_ceil(HISTORY_PAGE_SIZE)
}

/// Embed line, mirroring the TS shape (`<t:unix:R>: requester -
/// title | uri by requester`) so re-parsing stays stable.
pub fn format_history_line(e: &HistoryEntry) -> String {
    let ts = if e.at_ms > 0 {
        format!("<t:{}:R>: ", e.at_ms / 1000)
    } else {
        String::new()
    };
    let req = e.requester.as_deref().unwrap_or("Unknown");
    match e.uri.as_deref().filter(|u| !u.is_empty()) {
        Some(u) => format!("{ts}{req} - {} | {u} by {req}", e.title),
        None => format!("{ts}{req} - {}", e.title),
    }
}

/// UTC `YYYY-MM-DD HH:MM:SS` without pulling a date dependency.
fn fmt_utc_date(ms: i64) -> String {
    let time = ms.div_euclid(1000).rem_euclid(86_400);
    let mut days = ms.div_euclid(1000).div_euclid(86_400);
    // Howard Hinnant's civil-from-days.
    days += 719_468;
    let era = days.div_euclid(146_097);
    let doe = days.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let mut y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    y += i64::from(m <= 2);
    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
        y,
        m,
        d,
        time / 3600,
        (time % 3600) / 60,
        time % 60
    )
}

/// `.txt` export line, mirroring the TS buffer rows
/// (`[date: PLAYED]: { requester - title | uri } by requester`).
pub fn history_txt_line(e: &HistoryEntry) -> String {
    let req = e.requester.as_deref().unwrap_or("Unknown");
    let uri = e.uri.as_deref().unwrap_or("");
    format!(
        "[{}: PLAYED]: {{ {req} - {} | {uri} }} by {req}",
        fmt_utc_date(e.at_ms),
        e.title
    )
}

/// Full `.txt` export (newest first, like the TS `buffer` join).
pub fn history_export_txt(entries: &[HistoryEntry]) -> String {
    entries
        .iter()
        .rev()
        .map(history_txt_line)
        .collect::<Vec<_>>()
        .join("\n")
}

async fn lang_code(ctx: &Ctx<'_>) -> String {
    crate::db::guild_lang(&ctx.data().pool, guild_id_of(ctx)).await
}

/// App-emoji markup with a plain fallback. Mirrors the
/// `${client.iHorizon_Emojis.X}` interpolations in the music TS files.
async fn emoji_markup(ctx: &Ctx<'_>, name: &str, fallback: &str) -> String {
    crate::emojis::app_emoji_markup(&ctx.serenity_context().http, name)
        .await
        .unwrap_or_else(|| fallback.to_string())
}

/// Plain content reply for a language key with a byte-identical
/// fallback (mirrors `interactionSend` with `{ content }`).
async fn say_key(
    ctx: &Ctx<'_>,
    code: &str,
    key: &str,
    fallback: &str,
) -> Result<(), anyhow::Error> {
    ctx.say(crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string()))
        .await?;
    Ok(())
}

/// Bot's current voice channel: Discord state first (TS
/// `guild.members.me.voice.channelId`), falling back to the player
/// snapshot the play command maintains.
fn bot_voice_channel(ctx: &Ctx<'_>, gid: u64, snapshot_voice: Option<u64>) -> Option<u64> {
    let me = ctx.serenity_context().cache.current_user().id;
    if let Some(g) = ctx
        .serenity_context()
        .cache
        .guild(serenity::GuildId::new(gid))
    {
        if let Some(c) = g.voice_states.get(&me).and_then(|v| v.channel_id) {
            return Some(c.get());
        }
    }
    snapshot_voice
}

/// Same-voice-as-bot gate. Mirrors the `music_cannot` checks
/// (`member.voice.channelId !== members.me.voice.channelId`).
/// Returns true when the caller must stop.
async fn guard_same_voice(
    ctx: &Ctx<'_>,
    code: &str,
    user_voice: Option<u64>,
    bot_voice: Option<u64>,
) -> bool {
    if user_voice != bot_voice {
        let no = emoji_markup(ctx, "No", "❌").await;
        let msg = crate::lang::get(code, "music_cannot")
            .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
            .unwrap_or_else(|| {
                "You need to be in the same voice channel as me to use this command!".to_string()
            });
        let _ = ctx.say(msg).await;
        return true;
    }
    false
}

/// Not-in-voice gate with the per-command TS key (each carries the
/// `${client.iHorizon_Emojis.Warning_Icon}` placeholder).
/// Returns true when the caller must stop.
async fn guard_user_voice(ctx: &Ctx<'_>, code: &str, key: &str, user_voice: Option<u64>) -> bool {
    if user_voice.is_none() {
        let icon = emoji_markup(ctx, "Warning_Icon", "⚠️").await;
        let msg = crate::lang::get(code, key)
            .map(|s| s.replace("${client.iHorizon_Emojis.Warning_Icon}", &icon))
            .unwrap_or_else(|| "You're not in a voice channel!".to_string());
        let _ = ctx.say(msg).await;
        return true;
    }
    false
}

/// No-result embed. Mirrors `buildNoResultEmbed` in musicPlay.ts
/// (`p_embed_title`, #ff0000).
fn no_result_embed(code: &str) -> serenity::CreateEmbed {
    let title = crate::lang::get(code, "p_embed_title").unwrap_or_else(|| "No results".to_string());
    serenity::CreateEmbed::default()
        .title(title)
        .colour(0xFF0000)
        .timestamp(serenity::Timestamp::now())
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

/// Guild-visible line for a trackError recovery outcome: the Requeued
/// fallback-hit notice, None for the skip legs (announced via
/// announce_track_error instead). Reuses the manager notice text so a
/// command reply matches the player-channel post.
pub fn track_error_notice(recovery: &crate::lavalink::ErrorRecovery) -> Option<String> {
    match recovery {
        crate::lavalink::ErrorRecovery::Requeued { title } => Some(
            crate::lavalink::LavalinkManager::requeued_notice_text(title),
        ),
        _ => None,
    }
}

/// Guild-visible reply when a live playback push fails after the local
/// state already moved (skip's rest_play/rest_destroy). Mirrors the TS
/// `event_mp_playerError` shape
/// (`I'm having trouble connecting => ${error.message}`).
pub fn player_error_text(code: &str, detail: &str) -> String {
    crate::lang::get(code, "event_mp_playerError")
        .map(|s| s.replace("${error.message}", detail))
        .unwrap_or_else(|| format!("I'm having trouble connecting => {detail}"))
}

/// Guild-visible reply when resolving/starting playback fails
/// (play's fallible `play_query` legs beyond no-matches). Mirrors the
/// TS `event_mp_error` shape
/// (`There was a problem with the song queue => ${error.message}`).
pub fn queue_error_text(code: &str, detail: &str) -> String {
    crate::lang::get(code, "event_mp_error")
        .map(|s| s.replace("${error.message}", detail))
        .unwrap_or_else(|| format!("There was a problem with the song queue => {detail}"))
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
            HistoryEntry::new("old", None, None, 0),
            HISTORY_TTL_MS + 1,
        );
        assert!(h.is_empty());
        let h = push_history(vec![], HistoryEntry::new("new", None, None, 1000), 2000);
        assert_eq!(h.len(), 1);
    }

    #[test]
    fn history_caps_entry_count() {
        let mut h = Vec::new();
        for i in 0..HISTORY_MAX_ENTRIES + 50 {
            h = push_history(
                h,
                HistoryEntry::new(&format!("t{i}"), None, None, 1000 + i as i64),
                2000,
            );
        }
        assert_eq!(h.len(), HISTORY_MAX_ENTRIES);
        assert_eq!(h.first().unwrap().title, "t50");
        assert_eq!(h.last().unwrap().title, "t249");
    }

    #[test]
    fn history_decodes_minimal_rows() {
        // Pre-enrichment `{title, at_ms}` rows still parse via defaults.
        let (list, migrated) = decode_history(r#"[{"title":"A","at_ms":1000}]"#, 2000);
        assert!(!migrated);
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].title, "A");
        assert!(list[0].uri.is_none());
        assert!(list[0].requester.is_none());
    }

    fn legacy_ts_fixture() -> String {
        serde_json::json!({
            "embed": [
                "<t:1700000000:R>: <@111> - First Song | https://example.com/a by <@111>",
                "<t:1700000060:R>: <@222> - Second Song | https://example.com/b by <@222>",
                "plain entry without timestamp"
            ],
            "buffer": [
                "[01/01/2024: PLAYED]: { <@111> - First Song | https://example.com/a } by <@111>",
                "[01/01/2024: PLAYED]: { <@222> - Second Song | https://example.com/b } by <@222>",
                "[01/01/2024: PLAYED]: { <@333> - Third Song | https://example.com/c } by <@333>"
            ]
        })
        .to_string()
    }

    #[test]
    fn history_migrates_legacy_ts_shape() {
        let now = 1_700_000_060_000 + 1_000;
        let (list, migrated) = decode_history(&legacy_ts_fixture(), now);
        assert!(migrated);
        assert_eq!(list.len(), 3);
        assert_eq!(list[0].title, "First Song");
        assert_eq!(list[0].uri.as_deref(), Some("https://example.com/a"));
        assert_eq!(list[0].at_ms, 1_700_000_000_000);
        assert_eq!(list[1].title, "Second Song");
        // Timestamp-less entries survive (TS kept them "for safety").
        assert_eq!(list[2].at_ms, now);
        assert_eq!(list[2].title, "plain entry without timestamp");
    }

    #[test]
    fn history_migration_round_trips() {
        let now = 1_700_000_060_000 + 1_000;
        let (list, migrated) = decode_history(&legacy_ts_fixture(), now);
        assert!(migrated);
        let json = serde_json::to_string(&list).unwrap();
        let (again, migrated_again) = decode_history(&json, now);
        assert!(!migrated_again);
        assert_eq!(again, list);
    }

    #[test]
    fn history_pages_newest_first() {
        let entries: Vec<HistoryEntry> = (0..25)
            .map(|i| HistoryEntry::new(&format!("t{i:02}"), None, None, 1000 + i))
            .collect();
        assert_eq!(history_page_count(entries.len()), 3);
        let p0: Vec<String> = history_page(&entries, 0)
            .iter()
            .map(|e| e.title.clone())
            .collect();
        assert_eq!(p0.len(), 10);
        assert_eq!(p0[0], "t24");
        assert_eq!(p0[9], "t15");
        let p2: Vec<String> = history_page(&entries, 2)
            .iter()
            .map(|e| e.title.clone())
            .collect();
        assert_eq!(p2.len(), 5);
        assert_eq!(p2[4], "t00");
        assert!(history_page(&entries, 3).is_empty());
    }

    #[test]
    fn history_lines_carry_requester_uri_timestamp() {
        let e = HistoryEntry::new(
            "Song",
            Some("https://example.com/x"),
            Some("<@42>"),
            1_700_000_000_000,
        );
        let line = format_history_line(&e);
        assert!(line.contains("<t:1700000000:R>"), "{line}");
        assert!(line.contains("Song"), "{line}");
        assert!(line.contains("https://example.com/x"), "{line}");
        assert!(line.contains("<@42>"), "{line}");
        let txt = history_txt_line(&e);
        assert!(txt.contains("PLAYED"), "{txt}");
        assert!(txt.contains("2023-11-14"), "{txt}");
        assert!(txt.contains("https://example.com/x"), "{txt}");
        // Re-parse stability: the embed line decodes back.
        let back = parse_legacy_entry(&line, 0);
        assert_eq!(back.title, "Song");
        assert_eq!(back.uri.as_deref(), Some("https://example.com/x"));
        assert_eq!(back.at_ms, 1_700_000_000_000);
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
    fn volume_query_parses_like_ts_parseint() {
        assert_eq!(parse_volume_query("75"), Some(75));
        assert_eq!(parse_volume_query("  80  "), Some(80));
        assert_eq!(parse_volume_query("75abc"), Some(75));
        assert_eq!(parse_volume_query("12.9"), Some(12));
        assert_eq!(parse_volume_query("+60"), Some(60));
        assert_eq!(parse_volume_query("5"), Some(10));
        assert_eq!(parse_volume_query("-5"), Some(10));
        assert_eq!(parse_volume_query("500"), Some(100));
        assert_eq!(parse_volume_query("99999999999999999999999"), Some(100));
        assert_eq!(parse_volume_query(""), None);
        assert_eq!(parse_volume_query("   "), None);
        assert_eq!(parse_volume_query("abc"), None);
        assert_eq!(parse_volume_query("NaN"), None);
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
    fn track_error_notice_only_covers_requeued_branch() {
        use crate::lavalink::ErrorRecovery;
        let hit = track_error_notice(&ErrorRecovery::Requeued {
            title: "Fallback Song".to_string(),
        });
        assert_eq!(
            hit,
            Some(crate::lavalink::LavalinkManager::requeued_notice_text(
                "Fallback Song"
            ))
        );
        for other in [
            ErrorRecovery::Advanced,
            ErrorRecovery::Idle,
            ErrorRecovery::NoPlayer,
        ] {
            assert_eq!(track_error_notice(&other), None);
        }
    }

    #[test]
    fn error_notice_texts_mirror_ts_shapes() {
        // Byte-identical to the en-US YAML shapes (unknown locales
        // resolve through the en-US table; the hardcoded fallbacks
        // match it exactly).
        assert_eq!(
            player_error_text("xx-UNKNOWN", "boom"),
            "I'm having trouble connecting => boom"
        );
        assert_eq!(
            queue_error_text("xx-UNKNOWN", "boom"),
            "There was a problem with the song queue => boom"
        );
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
