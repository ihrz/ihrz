// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/music/* (14 subs).
//
// Full audio (LavalinkManager, queue, voice connect) pending lavalink-rs
// wiring; see voice.rs guards + PORT_INVENTORY.md. Ported for real:
// MUSIC_HISTORY store (buffer/embed, 30d purge), volume clamp, loop mode
// parsing, lyrics truncation. Play/skip/stop/pause/resume/queue/clear/
// shuffle/nowplaying/trackinfo answer with the node state once wired.

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

/// Discord embed description limit guard (lyrics truncate at 1997 + …).
pub fn truncate_lyrics(s: &str) -> String {
    if s.len() <= 1997 {
        s.to_string()
    } else {
        format!("{}…", &s[..1997])
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "music",
    rename = "music",
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
        "m_lyrics"
    )
)]
pub async fn music(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "play")]
pub async fn m_play(
    ctx: Ctx<'_>,
    #[description = "Title or URL"] title: String,
) -> Result<(), anyhow::Error> {
    if (title.contains("://") || title.contains("www.")) && !crate::funcs::is_allowed_links(&title)
    {
        ctx.say("Link not allowed.").await?;
        return Ok(());
    }
    let source = crate::voice::route_source(&title);
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, HISTORY_KEY).await;
    let mut hist: Vec<HistoryEntry> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    hist = push_history(
        hist,
        HistoryEntry {
            title: title.clone(),
            at_ms: crate::commands::schedule::now_ms(),
        },
        crate::commands::schedule::now_ms(),
    );
    let _ = crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        HISTORY_KEY,
        &serde_json::to_string(&hist)?,
    )
    .await;
    ctx.say(format!(
        "Queued ({source:?}): {title} [lavalink wiring pending]"
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "skip")]
pub async fn m_skip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Skipped. [lavalink wiring pending]").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "stop")]
pub async fn m_stop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Stopped. [lavalink wiring pending]").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "pause")]
pub async fn m_pause(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Paused. [lavalink wiring pending]").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "resume")]
pub async fn m_resume(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Resumed. [lavalink wiring pending]").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "queue")]
pub async fn m_queue(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Queue is empty. [lavalink wiring pending]").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "clear-queue")]
pub async fn m_clear(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Queue cleared. [lavalink wiring pending]").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "shuffle")]
pub async fn m_shuffle(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Shuffled. [lavalink wiring pending]").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "loop")]
pub async fn m_loop(
    ctx: Ctx<'_>,
    #[description = "off or track"] mode: String,
) -> Result<(), anyhow::Error> {
    let Some(m) = parse_loop(&mode) else {
        ctx.say("Use off/track.").await?;
        return Ok(());
    };
    ctx.say(format!("Loop: {m:?}. [lavalink wiring pending]"))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "volume")]
pub async fn m_volume(
    ctx: Ctx<'_>,
    #[description = "10-100"] level: i64,
) -> Result<(), anyhow::Error> {
    ctx.say(format!(
        "Volume: {}. [lavalink wiring pending]",
        crate::voice::clamp_volume(level)
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "nowplaying")]
pub async fn m_nowplaying(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("Nothing playing. [lavalink wiring pending]")
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "history")]
pub async fn m_history(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, HISTORY_KEY).await;
    let list: Vec<HistoryEntry> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    ctx.say(if list.is_empty() {
        "No history.".to_string()
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

#[poise::command(slash_command, prefix_command, rename = "lyrics")]
pub async fn m_lyrics(
    ctx: Ctx<'_>,
    #[description = "Query"] query: String,
) -> Result<(), anyhow::Error> {
    ctx.say(truncate_lyrics(&format!(
        "Lyrics for {query} [lavalink lyrics plugin pending]"
    )))
    .await?;
    Ok(())
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
}
