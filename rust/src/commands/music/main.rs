use crate::bot::Ctx;
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
    let mut lines = vec![format!("Now: {} - {}", current.author, current.title)];
    for (i, t) in queue.iter().take(10).enumerate() {
        lines.push(format!("{}. {} - {}", i + 1, t.author, t.title));
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
            ctx.say(format!(
                "{}: {} - {} [{}]",
                state,
                t.author,
                t.title,
                fmt_duration(t.length_ms)
            ))
            .await?;
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
    if let Some(q) = title {
        if let Ok((node, _)) = m.live_node_and_session(gid).await {
            let id = crate::lavalink::LavalinkManager::search_identifier(&q);
            match m.rest_load(&node, &id).await {
                Ok(lava_rs::rest::LoadResult::Track(t)) => {
                    ctx.say(track_line(&t)).await?;
                    return Ok(());
                }
                Ok(lava_rs::rest::LoadResult::Search(v)) if !v.is_empty() => {
                    ctx.say(track_line(&v[0])).await?;
                    return Ok(());
                }
                Ok(lava_rs::rest::LoadResult::Playlist(d)) if !d.tracks.is_empty() => {
                    ctx.say(format!(
                        "Playlist {} ({} tracks). First: {}",
                        d.info.name,
                        d.tracks.len(),
                        track_line(&d.tracks[0])
                    ))
                    .await?;
                    return Ok(());
                }
                _ => {
                    ctx.say("No matches found.").await?;
                    return Ok(());
                }
            }
        }
        ctx.say(format!("Track info for {q} (node offline)."))
            .await?;
        return Ok(());
    }
    match m.snapshot(gid).await.and_then(|s| s.current) {
        Some(t) => {
            ctx.say(format!(
                "{} - {} [{}] ({})",
                t.author,
                t.title,
                fmt_duration(t.length_ms),
                t.source
            ))
            .await?;
        }
        None => {
            ctx.say("Nothing playing.").await?;
        }
    }
    Ok(())
}

fn track_line(t: &lava_rs::model::Track) -> String {
    format!(
        "{} - {} [{}] ({})",
        t.info.author,
        t.info.title,
        fmt_duration(t.info.length),
        t.info.source_name
    )
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
}
