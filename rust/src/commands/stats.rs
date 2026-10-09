// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/stats/*.
//
// TS keys: <guild>.STATS (guild aggregates), <guild>.STATS.USER.<uid>
// {messages[], voices[]} histories + aggregate counters. Window
// calculators + ustats periods/top-channels ported (text form; the
// TS PNG cards stay pending); compare (pure embed) fully ported.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// One message record. Mirrors DatabaseStructure.StatsMessage.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StatsMessage {
    #[serde(default)]
    pub sent_ts: i64,
    #[serde(default)]
    pub content_len: u64,
    #[serde(default)]
    pub channel_id: u64,
}

/// One closed voice session. Mirrors DatabaseStructure.StatsVoice.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StatsVoice {
    #[serde(default)]
    pub start_ts: i64,
    #[serde(default)]
    pub end_ts: i64,
    #[serde(default)]
    pub channel_id: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserStats {
    #[serde(default)]
    pub messages: u64,
    #[serde(default)]
    pub voice_ms: u64,
    /// Recent message history for daily/weekly/monthly windows.
    /// TS stores an unbounded array; rows are capped here to bound
    /// kv size (oldest dropped first).
    #[serde(default)]
    pub msg_log: Vec<StatsMessage>,
    /// Closed voice sessions for window + top-channel stats.
    #[serde(default)]
    pub voice_log: Vec<StatsVoice>,
}

/// Caps for the history logs (TS is unbounded; kv rows are not).
pub const MAX_MSG_LOG: usize = 2000;
pub const MAX_VOICE_LOG: usize = 500;

/// Push a message record, dropping oldest past the cap.
pub fn push_msg_log(mut log: Vec<StatsMessage>, entry: StatsMessage) -> Vec<StatsMessage> {
    log.push(entry);
    if log.len() > MAX_MSG_LOG {
        let drop = log.len() - MAX_MSG_LOG;
        log.drain(..drop);
    }
    log
}

/// Push a voice session, dropping oldest past the cap.
pub fn push_voice_log(mut log: Vec<StatsVoice>, entry: StatsVoice) -> Vec<StatsVoice> {
    log.push(entry);
    if log.len() > MAX_VOICE_LOG {
        let drop = log.len() - MAX_VOICE_LOG;
        log.drain(..drop);
    }
    log
}

/// Message counts in the TS windows (day/week/month/all).
/// Mirrors calculateMessageTime in userStatsUtils.ts.
pub fn msg_window_counts(messages: &[StatsMessage], now_ms: i64) -> (u64, u64, u64, u64) {
    let day = now_ms - 86_400_000;
    let week = now_ms - 604_800_000;
    let month = now_ms - 2_629_743_000;
    let mut daily = 0u64;
    let mut weekly = 0u64;
    let mut monthly = 0u64;
    for m in messages {
        if m.sent_ts >= day {
            daily += 1;
        }
        if m.sent_ts >= week {
            weekly += 1;
        }
        if m.sent_ts >= month {
            monthly += 1;
        }
    }
    (daily, weekly, monthly, messages.len() as u64)
}

/// Voice time in the TS windows (day/week/month/all), ms.
/// Mirrors calculateVoiceActivity in userStatsUtils.ts.
pub fn voice_window_ms(voices: &[StatsVoice], now_ms: i64) -> (u64, u64, u64, u64) {
    let day = now_ms - 86_400_000;
    let week = now_ms - 604_800_000;
    let month = now_ms - 2_629_743_000;
    let mut daily = 0u64;
    let mut weekly = 0u64;
    let mut monthly = 0u64;
    let mut total = 0u64;
    for v in voices {
        let dur = (v.end_ts - v.start_ts).max(0) as u64;
        total += dur;
        if v.end_ts >= day {
            daily += dur;
        }
        if v.end_ts >= week {
            weekly += dur;
        }
        if v.end_ts >= month {
            monthly += dur;
        }
    }
    (daily, weekly, monthly, total)
}

/// Top text channels by message count (top 5).
/// Mirrors calculateActiveChannels in userStatsUtils.ts.
pub fn top_text_channels(messages: &[StatsMessage], top_n: usize) -> Vec<(u64, u64)> {
    let mut counts: HashMap<u64, u64> = HashMap::new();
    for m in messages {
        *counts.entry(m.channel_id).or_insert(0) += 1;
    }
    let mut ranked: Vec<(u64, u64)> = counts.into_iter().collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    ranked.truncate(top_n);
    ranked
}

/// Top voice channels by accumulated ms (top 5).
/// Mirrors getStatsLeaderboard in userStatsUtils.ts.
pub fn top_voice_channels(voices: &[StatsVoice], top_n: usize) -> Vec<(u64, u64)> {
    let mut acc: HashMap<u64, u64> = HashMap::new();
    for v in voices {
        *acc.entry(v.channel_id).or_insert(0) += (v.end_ts - v.start_ts).max(0) as u64;
    }
    let mut ranked: Vec<(u64, u64)> = acc.into_iter().collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    ranked.truncate(top_n);
    ranked
}

pub fn stats_key(user_id: u64) -> String {
    format!("STATS.USER.{user_id}")
}

pub async fn load_stats(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> UserStats {
    crate::db::kv_get(pool, guild_id, &stats_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "stats",
    rename = "stats",
    subcommands(
        "stats_user",
        "stats_compare",
        "stats_guild",
        "stats_top_messages",
        "stats_top_voice",
        "stats_channel"
    )
)]
pub async fn stats(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "ustats", aliases("u"))]
pub async fn stats_user(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let s = load_stats(&ctx.data().pool, &gid, uid).await;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let (d_msg, w_msg, m_msg, _) = msg_window_counts(&s.msg_log, now_ms);
    let (d_vc, w_vc, m_vc, _) = voice_window_ms(&s.voice_log, now_ms);
    let top_text: Vec<String> = top_text_channels(&s.msg_log, 3)
        .iter()
        .map(|(ch, n)| format!("<#{ch}> ({n})"))
        .collect();
    let top_vc: Vec<String> = top_voice_channels(&s.voice_log, 3)
        .iter()
        .map(|(ch, ms)| format!("<#{ch}> ({}m)", ms / 60_000))
        .collect();
    ctx.say(format!(
        "Messages: {} (day {d_msg} / week {w_msg} / month {m_msg}) | Voice: {}m (day {}m / week {}m / month {}m)\nTop channels: {}\nTop voice: {}",
        s.messages,
        s.voice_ms / 60_000,
        d_vc / 60_000,
        w_vc / 60_000,
        m_vc / 60_000,
        if top_text.is_empty() {
            "-".to_string()
        } else {
            top_text.join(", ")
        },
        if top_vc.is_empty() {
            "-".to_string()
        } else {
            top_vc.join(", ")
        },
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "gstats", aliases("g"))]
pub async fn stats_guild(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.USER.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut messages = 0u64;
    let mut voice_ms = 0u64;
    for raw in &rows {
        if let Ok(s) = serde_json::from_str::<UserStats>(raw) {
            messages += s.messages;
            voice_ms += s.voice_ms;
        }
    }
    ctx.say(format!(
        "Members tracked: {} | Messages: {} | Voice: {}m",
        rows.len(),
        messages,
        voice_ms / 60_000
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "compare", aliases("cmp"))]
pub async fn stats_compare(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: poise::serenity_prelude::User,
    #[description = "Second user"] user2: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if user1.id == user2.id {
        ctx.say("Compare two different users.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let a = load_stats(&ctx.data().pool, &gid, user1.id.get()).await;
    let b = load_stats(&ctx.data().pool, &gid, user2.id.get()).await;
    let winner = if a.messages + a.voice_ms >= b.messages + b.voice_ms {
        &user1
    } else {
        &user2
    };
    ctx.say(format!(
        "{}: {}msg/{}m vs {}: {}msg/{}m — winner {}",
        user1.tag(),
        a.messages,
        a.voice_ms / 60_000,
        user2.tag(),
        b.messages,
        b.voice_ms / 60_000,
        winner.tag()
    ))
    .await?;
    Ok(())
}

async fn top_by(
    ctx: &Ctx<'_>,
    pick: fn(&UserStats) -> u64,
    unit: &str,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.USER.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, u64)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let id: u64 = k.strip_prefix("STATS.USER.")?.parse().ok()?;
            let s: UserStats = serde_json::from_str(v).ok()?;
            Some((id, pick(&s)))
        })
        .collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
    let top: Vec<String> = parsed
        .iter()
        .take(10)
        .enumerate()
        .map(|(i, (uid, n))| format!("{}. <@{uid}> — {n}{unit}", i + 1))
        .collect();
    ctx.say(if top.is_empty() {
        "No data.".to_string()
    } else {
        top.join("\n")
    })
    .await?;
    Ok(())
}

/// Top messages. Mirrors stats top-messages (text form; PNG pending).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "top-messages",
    aliases("tm", "topm")
)]
pub async fn stats_top_messages(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    top_by(&ctx, |s| s.messages, "msg").await
}

/// Top voice. Mirrors stats top-voice (text form; PNG pending).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "top-voice",
    aliases("tv", "topv")
)]
pub async fn stats_top_voice(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    top_by(&ctx, |s| s.voice_ms / 60_000, "m").await
}

/// Channel stats. Mirrors stats channel-stats (message counts per channel).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel-stats",
    aliases("cstats", "chstats")
)]
pub async fn stats_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: Option<poise::serenity_prelude::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            let n: u64 = crate::db::kv_get(
                &ctx.data().pool,
                &gid,
                &crate::events::channel_stats_key(ch.id.get()),
            )
            .await
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);
            ctx.say(format!("<#{}>: {n} messages.", ch.id.get()))
                .await?;
        }
        None => {
            let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
                "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.CHANNEL.%'",
            )
            .bind(&gid)
            .fetch_all(&ctx.data().pool)
            .await
            .unwrap_or_default();
            let mut parsed: Vec<(String, u64)> = rows
                .iter()
                .filter_map(|(k, v)| {
                    let id = k.strip_prefix("STATS.CHANNEL.")?.to_string();
                    Some((id, v.parse().ok()?))
                })
                .collect();
            parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
            let top: Vec<String> = parsed
                .iter()
                .take(10)
                .enumerate()
                .map(|(i, (id, n))| format!("{}. <#{id}> — {n}", i + 1))
                .collect();
            ctx.say(if top.is_empty() {
                "No data.".to_string()
            } else {
                top.join("\n")
            })
            .await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn msg(ts: i64, ch: u64) -> StatsMessage {
        StatsMessage {
            sent_ts: ts,
            content_len: 10,
            channel_id: ch,
        }
    }

    #[test]
    fn windows_match_ts_user_stats_utils() {
        // now = 3_000_000_000 (~day 34). Windows: day 86.4M, week
        // 604.8M, month 2_629_743_000.
        let now = 3_000_000_000i64;
        let log = vec![
            msg(now - 1_000, 1),         // day+week+month
            msg(now - 100_000_000, 1),   // week+month
            msg(now - 700_000_000, 2),   // month only
            msg(now - 2_700_000_000, 2), // none (older than month)
        ];
        assert_eq!(msg_window_counts(&log, now), (1, 2, 3, 4));
        let voices = vec![
            StatsVoice {
                start_ts: now - 2_000,
                end_ts: now - 1_000,
                channel_id: 5,
            },
            StatsVoice {
                start_ts: now - 200_000_000,
                end_ts: now - 100_000_000,
                channel_id: 5,
            },
            StatsVoice {
                start_ts: now - 800_000_000,
                end_ts: now - 700_000_000,
                channel_id: 6,
            },
        ];
        let (d, w, m, total) = voice_window_ms(&voices, now);
        assert_eq!(d, 1_000);
        assert_eq!(w, 100_001_000);
        assert_eq!(m, 200_001_000);
        assert_eq!(total, 200_001_000);
        assert_eq!(top_text_channels(&log, 5), vec![(1, 2), (2, 2)]);
        assert_eq!(
            top_voice_channels(&voices, 5),
            vec![(5, 100_001_000), (6, 100_000_000)]
        );
    }

    #[test]
    fn push_helpers_cap_oldest_first() {
        let mut log = Vec::new();
        for i in 0..(MAX_MSG_LOG + 10) {
            log = push_msg_log(log, msg(i as i64, 1));
        }
        assert_eq!(log.len(), MAX_MSG_LOG);
        assert_eq!(log[0].sent_ts, 10);
        let mut vlog = Vec::new();
        for i in 0..(MAX_VOICE_LOG + 3) {
            vlog = push_voice_log(
                vlog,
                StatsVoice {
                    start_ts: i as i64,
                    end_ts: i as i64 + 1,
                    channel_id: 1,
                },
            );
        }
        assert_eq!(vlog.len(), MAX_VOICE_LOG);
        assert_eq!(vlog[0].start_ts, 3);
    }

    #[test]
    fn parse_voice_session_shapes() {
        assert_eq!(
            crate::events::parse_voice_session("123:456"),
            Some((123, 456))
        );
        // Legacy bare-timestamp rows read channel 0.
        assert_eq!(crate::events::parse_voice_session("123"), Some((123, 0)));
        assert_eq!(crate::events::parse_voice_session("nope"), None);
    }
}
