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

#[poise::command(
    slash_command,
    prefix_command,
    category = "music",
    rename = "music",
    aliases("m"),
    subcommands(
        "m_play",
        "m_skip",
        "m_stop",
        "m_pause",
        "m_resume",
        "m_queue",
        "m_clear",
        "m_shuffle",
        "m_loop",
        "m_volume",
        "m_nowplaying",
        "m_history",
        "m_lyrics",
        "m_trackinfo"
    )
)]
pub async fn music(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "play", aliases("p"))]
pub async fn m_play(
    ctx: Ctx<'_>,
    #[description = "Title or URL"] title: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    if (title.contains("://") || title.contains("www.")) && !crate::funcs::is_allowed_links(&title)
    {
        ctx.say(
            crate::lang::get(&code, "p_not_allowed")
                .unwrap_or_else(|| "The link you sent is not supported by this bot. Please use authorized music streaming services such as Deezer, Spotify, Soundcloud, etc.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let voice = voice_channel_of(&ctx);
    if voice.is_none() {
        ctx.say(
            crate::lang::get(&code, "msg_not_in_voice")
                .unwrap_or_else(|| "You must be in a voice channel to play music.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let m = synced_mgr(&ctx).await;
    let requester = ctx.author().id.get();
    let text_channel = ctx.channel_id().get();
    m.with_player(gid, |p| {
        p.voice_channel = voice;
        p.text_channel = Some(text_channel);
    })
    .await;
    match m.play_query(gid, &title, requester, now_ms()).await {
        Ok((0, t)) => {
            record_history(&ctx.data().pool, gid, &title).await;
            ctx.say(format!("Now playing: {} - {}", t.author, t.title))
                .await?;
        }
        Ok((pos, t)) => {
            record_history(&ctx.data().pool, gid, &title).await;
            ctx.say(format!("Queued at #{pos}: {} - {}", t.author, t.title))
                .await?;
        }
        Err(crate::lavalink::MusicError::NoNodes) => {
            record_history(&ctx.data().pool, gid, &title).await;
            ctx.say(
                crate::lang::get(&code, "msg_lavalink_offline")
                    .unwrap_or_else(|| {
                        "No Lavalink node is configured; the track was recorded in history but cannot play.".to_string()
                    }),
            )
            .await?;
        }
        Err(e) => {
            ctx.say(format!("Play failed: {e}")).await?;
        }
    }
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "skip", aliases("next"))]
pub async fn m_skip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let skipped = m.with_player(gid, |p| p.skip(now_ms())).await;
    let Some(skipped) = skipped else {
        ctx.say("Nothing to skip.").await?;
        return Ok(());
    };
    // Push the next track (or destroy the node player when drained).
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let next = m.snapshot(gid).await.and_then(|s| s.current);
        match next {
            Some(t) => {
                let _ = m.rest_play(&node, &session, gid, &t.encoded, false).await;
                ctx.say(format!("Skipped. Now playing: {} - {}", t.author, t.title))
                    .await?;
            }
            None => {
                let _ = m.rest_destroy(&node, &session, gid).await;
                ctx.say(format!("Skipped {} (queue drained).", skipped.title))
                    .await?;
            }
        }
    } else {
        ctx.say(format!("Skipped {}.", skipped.title)).await?;
    }
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "stop")]
pub async fn m_stop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    m.with_player(gid, |p| p.stop(now_ms())).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_destroy(&node, &session, gid).await;
    }
    ctx.say("Stopped and cleared the queue.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "pause")]
pub async fn m_pause(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let has_current = m.snapshot(gid).await.and_then(|s| s.current).is_some();
    if !has_current {
        ctx.say("Nothing playing.").await?;
        return Ok(());
    }
    m.with_player(gid, |p| p.paused = true).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_paused(&node, &session, gid, true).await;
    }
    ctx.say("Paused.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "resume", aliases("unpause"))]
pub async fn m_resume(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let has_current = m.snapshot(gid).await.and_then(|s| s.current).is_some();
    if !has_current {
        ctx.say("Nothing playing.").await?;
        return Ok(());
    }
    m.with_player(gid, |p| p.paused = false).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_paused(&node, &session, gid, false).await;
    }
    ctx.say("Resumed.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "queue")]
pub async fn m_queue(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    let (current, queue) = snap.map(|s| (s.current, s.queue)).unwrap_or((None, vec![]));
    let Some(current) = current else {
        ctx.say("Queue is empty.").await?;
        return Ok(());
    };
    // Enrich the now-playing head via metadata (single fetch); queued
    // lines are source-tagged without network fan-out, all falling back
    // to Lavalink info.
    let head = preview_for_track(&current).await;
    let head_artist = head
        .artist
        .clone()
        .unwrap_or_else(|| current.author.clone());
    let head_uri = if head.link.is_empty() {
        current.uri.as_deref()
    } else {
        Some(head.link.as_str())
    };
    let mut lines = vec![format!(
        "Now: {}",
        queue_line(0, &head.title, &head_artist, head_uri)
    )];
    for (i, t) in queue.iter().take(10).enumerate() {
        lines.push(queue_line(i + 1, &t.title, &t.author, t.uri.as_deref()));
    }
    if queue.len() > 10 {
        lines.push(format!("…and {} more.", queue.len() - 10));
    }
    ctx.say(lines.join("\n")).await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear-queue",
    aliases("clearqueue")
)]
pub async fn m_clear(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let n = m.with_player(gid, |p| p.clear_queue()).await;
    ctx.say(format!("Cleared {n} queued track(s).")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "shuffle")]
pub async fn m_shuffle(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let seed = now_ms() as u64;
    let n = m
        .with_player(gid, |p| {
            p.shuffle(seed);
            p.queue.len()
        })
        .await;
    if n == 0 {
        ctx.say("Queue is empty.").await?;
    } else {
        ctx.say(format!("Shuffled {n} queued track(s).")).await?;
    }
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "loop")]
pub async fn m_loop(
    ctx: Ctx<'_>,
    #[description = "off or track"] mode: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(m) = parse_loop(&mode) else {
        ctx.say(
            crate::lang::get(&code, "msg_use_off_track")
                .unwrap_or_else(|| "Use off/track.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let mgr = synced_mgr(&ctx).await;
    let live_mode: crate::lavalink::LoopMode = m.into();
    mgr.with_player(gid, |p| p.loop_mode = Some(live_mode))
        .await;
    ctx.say(format!("Loop: {m:?}.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "volume")]
pub async fn m_volume(
    ctx: Ctx<'_>,
    #[description = "10-100"] level: i64,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let v = m.with_player(gid, |p| p.set_volume(level)).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        if let Err(e) = m.rest_set_volume(&node, &session, gid, v).await {
            ctx.say(format!("Volume: {v} (node sync failed: {e})."))
                .await?;
            return Ok(());
        }
    }
    ctx.say(format!("Volume: {v}.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "nowplaying")]
pub async fn m_nowplaying(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    match snap.and_then(|s| s.current.map(|t| (t, s.paused))) {
        Some((t, paused)) => {
            let state = if paused { "paused" } else { "playing" };
            let preview = preview_for_track(&t).await;
            let embed = preview_embed(&preview, Some(t.length_ms));
            let mut reply = poise::CreateReply::default().embed(embed);
            // Spotify-sourced tracks get the SVG banner card (TS
            // .spotify-banner html2png equivalent, no browser here).
            if preview.source == Some(MetaSource::Spotify) {
                let svg = spotify_banner_svg(&preview.title, preview.artist.as_deref(), state);
                reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
                    svg.into_bytes(),
                    "nowplaying.svg",
                ));
            }
            ctx.send(reply).await?;
        }
        None => {
            ctx.say("Nothing playing.").await?;
        }
    }
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "history",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn m_history(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, HISTORY_KEY).await;
    let list: Vec<HistoryEntry> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "history_no_entries")
            .unwrap_or_else(|| "There are no entries in the music history.".to_string())
    } else {
        list.iter()
            .rev()
            .take(10)
            .map(|e| e.title.clone())
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

// Lyrics via a plain text API (lyrics.ovh), never the Lavalink lyrics
// plugin — mirrors the TS searchLyrics result shape (title + text).
async fn fetch_lyrics_text(query: &str) -> Option<(String, String)> {
    let client = reqwest::Client::new();
    let suggest: serde_json::Value = client
        .get(format!(
            "https://api.lyrics.ovh/suggest/{}",
            percent_encode(query)
        ))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    let first = suggest.get("data")?.as_array()?.first()?;
    let title = first.get("title")?.as_str()?;
    let artist = first.get("artist")?.get("name")?.as_str()?;
    let body: serde_json::Value = client
        .get(format!(
            "https://api.lyrics.ovh/v1/{}/{}",
            percent_encode(artist),
            percent_encode(title)
        ))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    let text = body.get("lyrics")?.as_str()?;
    if text.trim().is_empty() {
        return None;
    }
    Some((format!("{artist} - {title}"), text.to_string()))
}

fn percent_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

#[poise::command(slash_command, prefix_command, rename = "lyrics")]
pub async fn m_lyrics(
    ctx: Ctx<'_>,
    #[description = "Query"] query: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    match fetch_lyrics_text(&query).await {
        Some((title, text)) => {
            ctx.say(format!("{title}\n{}", truncate_lyrics(&text)))
                .await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "lyrics_not_found")
                    .unwrap_or_else(|| "Lyrics not found.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

// Track info lookup: live Lavalink search when a query is given,
// otherwise the current track. Mirrors !trackinfo.ts.
#[poise::command(slash_command, prefix_command, rename = "trackinfo")]
pub async fn m_trackinfo(
    ctx: Ctx<'_>,
    #[description = "Title or URL"] title: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    // Resolve a lava track first (query search or current track), then
    // enrich via source-detected metadata with Lavalink fallback.
    async fn enriched_from_lava(t: &lava_rs::model::Track) -> NormalizedPreview {
        match t.info.uri.as_deref() {
            Some(url) => enrich_preview(url).await.unwrap_or_else(|| {
                fallback_preview(&t.info.title, &t.info.author, t.info.uri.as_deref())
            }),
            None => fallback_preview(&t.info.title, &t.info.author, None),
        }
    }
    if let Some(q) = title {
        if let Ok((node, _)) = m.live_node_and_session(gid).await {
            let id = crate::lavalink::LavalinkManager::search_identifier(&q);
            match m.rest_load(&node, &id).await {
                Ok(lava_rs::rest::LoadResult::Track(t)) => {
                    let p = enriched_from_lava(&t).await;
                    let len = if t.info.length == 0 {
                        None
                    } else {
                        Some(t.info.length)
                    };
                    ctx.send(poise::CreateReply::default().embed(preview_embed(&p, len)))
                        .await?;
                    return Ok(());
                }
                Ok(lava_rs::rest::LoadResult::Search(v)) if !v.is_empty() => {
                    let p = enriched_from_lava(&v[0]).await;
                    ctx.send(
                        poise::CreateReply::default()
                            .embed(preview_embed(&p, Some(v[0].info.length))),
                    )
                    .await?;
                    return Ok(());
                }
                Ok(lava_rs::rest::LoadResult::Playlist(d)) if !d.tracks.is_empty() => {
                    let p = enriched_from_lava(&d.tracks[0]).await;
                    let mut embed = preview_embed(&p, Some(d.tracks[0].info.length));
                    embed = embed.field(
                        "Playlist",
                        format!("{} ({} tracks)", d.info.name, d.tracks.len()),
                        false,
                    );
                    ctx.send(poise::CreateReply::default().embed(embed)).await?;
                    return Ok(());
                }
                _ => {
                    ctx.say("No matches found.").await?;
                    return Ok(());
                }
            }
        }
        // Node offline: still try metadata when the query itself is a URL.
        match enrich_preview(&q).await {
            Some(p) => {
                ctx.send(poise::CreateReply::default().embed(preview_embed(&p, None)))
                    .await?;
            }
            None => {
                ctx.say(format!("Track info for {q} (node offline)."))
                    .await?;
            }
        }
        return Ok(());
    }
    match m.snapshot(gid).await.and_then(|s| s.current) {
        Some(t) => {
            let p = preview_for_track(&t).await;
            ctx.send(poise::CreateReply::default().embed(preview_embed(&p, Some(t.length_ms))))
                .await?;
        }
        None => {
            ctx.say("Nothing playing.").await?;
        }
    }
    Ok(())
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
