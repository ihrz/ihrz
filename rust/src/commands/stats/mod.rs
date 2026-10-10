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

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

pub async fn load_stats(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> UserStats {
    table_value_or_legacy(pool, guild_id, &stats_key(user_id))
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// Table-routed write for one user row (keys unchanged).
pub async fn save_stats(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    stats: &UserStats,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(&stats_key(user_id), stats)
        .await
}

/// Every tracked user row: guild-table `STATS.USER` subtree first,
/// legacy `STATS.USER.%` rows filling gaps (table wins).
pub async fn load_all_user_stats(pool: &crate::db::Pool, guild_id: &str) -> Vec<(u64, UserStats)> {
    let mut by_user: HashMap<u64, UserStats> = HashMap::new();
    let backend = guild_backend(pool);
    if let Ok(Some(root)) = backend
        .table(guild_id)
        .get::<serde_json::Value>("STATS")
        .await
    {
        if let Some(users) = root.get("USER").and_then(|u| u.as_object()) {
            for (id, v) in users {
                if id.is_empty() || id.contains('.') {
                    continue;
                }
                if let (Ok(uid), Ok(s)) = (
                    id.parse::<u64>(),
                    serde_json::from_value::<UserStats>(v.clone()),
                ) {
                    by_user.insert(uid, s);
                }
            }
        }
    }
    let rows: Vec<(String, String)> =
        crate::db::kv_scan_prefix(pool, guild_id, "STATS.USER.").await;
    for (k, v) in &rows {
        let Some(id) = k.strip_prefix("STATS.USER.") else {
            continue;
        };
        if id.is_empty() || id.contains('.') {
            continue;
        }
        if let Ok(uid) = id.parse::<u64>() {
            if by_user.contains_key(&uid) {
                continue;
            }
            if let Ok(s) = serde_json::from_str::<UserStats>(v) {
                by_user.insert(uid, s);
            }
        }
    }
    let mut out: Vec<(u64, UserStats)> = by_user.into_iter().collect();
    out.sort_by_key(|a| a.0);
    out
}

/// One channel message counter: table first (number or numeric string),
/// then the legacy plain-number row.
pub async fn load_channel_count(pool: &crate::db::Pool, guild_id: &str, channel_id: u64) -> u64 {
    if let Some(v) = table_value_or_legacy(
        pool,
        guild_id,
        &crate::events::channel_stats_key(channel_id),
    )
    .await
    {
        match v {
            serde_json::Value::Number(n) => return n.as_u64().unwrap_or(0),
            serde_json::Value::String(s) => return s.parse().unwrap_or(0),
            _ => return 0,
        }
    }
    0
}

/// Every channel counter: guild-table `STATS.CHANNEL` subtree first,
/// legacy `STATS.CHANNEL.%` rows filling gaps (table wins).
pub async fn load_all_channel_counts(pool: &crate::db::Pool, guild_id: &str) -> Vec<(String, u64)> {
    let mut by_channel: HashMap<String, u64> = HashMap::new();
    let backend = guild_backend(pool);
    if let Ok(Some(root)) = backend
        .table(guild_id)
        .get::<serde_json::Value>("STATS")
        .await
    {
        if let Some(channels) = root.get("CHANNEL").and_then(|c| c.as_object()) {
            for (id, v) in channels {
                if id.is_empty() || id.contains('.') {
                    continue;
                }
                let n = match v {
                    serde_json::Value::Number(n) => n.as_u64().unwrap_or(0),
                    serde_json::Value::String(s) => s.parse().unwrap_or(0),
                    _ => continue,
                };
                by_channel.insert(id.clone(), n);
            }
        }
    }
    let rows: Vec<(String, String)> =
        crate::db::kv_scan_prefix(pool, guild_id, "STATS.CHANNEL.").await;
    for (k, v) in &rows {
        let Some(id) = k.strip_prefix("STATS.CHANNEL.") else {
            continue;
        };
        if id.is_empty() || id.contains('.') || by_channel.contains_key(id) {
            continue;
        }
        if let Ok(n) = v.parse::<u64>() {
            by_channel.insert(id.to_string(), n);
        }
    }
    let mut out: Vec<(String, u64)> = by_channel.into_iter().collect();
    out.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    out
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
    let mut parsed: Vec<(u64, u64)> = load_all_user_stats(&ctx.data().pool, &gid)
        .await
        .into_iter()
        .map(|(id, s)| (id, pick(&s)))
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

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_stats(
            &pool,
            "g1",
            7,
            &UserStats {
                messages: 3,
                ..Default::default()
            },
        )
        .await
        .unwrap();
        assert_eq!(load_stats(&pool, "g1", 7).await.messages, 3);
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "STATS.USER.7").await;
        assert_eq!(legacy, None);
        // Legacy rows still read (single + union scans).
        crate::db::kv_set(&pool, "g1", &stats_key(9), r#"{"messages":5}"#)
            .await
            .unwrap();
        assert_eq!(load_stats(&pool, "g1", 9).await.messages, 5);
        let all = load_all_user_stats(&pool, "g1").await;
        assert_eq!(all.len(), 2);
        // Table wins over legacy for the same user.
        crate::db::kv_set(&pool, "g1", &stats_key(7), r#"{"messages":99}"#)
            .await
            .unwrap();
        assert_eq!(load_stats(&pool, "g1", 7).await.messages, 3);
        // Channel counters: legacy plain-number rows still read.
        crate::db::kv_set(&pool, "g1", "STATS.CHANNEL.11", "42")
            .await
            .unwrap();
        assert_eq!(load_channel_count(&pool, "g1", 11).await, 42);
        let counts = load_all_channel_counts(&pool, "g1").await;
        assert_eq!(counts, vec![("11".to_string(), 42)]);
    }
}

pub mod channel_stats;
pub mod compare;
pub mod gstats;
#[allow(clippy::module_inception)]
pub mod stats;
pub mod top_messages;
pub mod top_voice;
pub mod ustats;

/// Old registry path (`stats::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::channel_stats::*;
    pub use super::compare::*;
    pub use super::gstats::*;
    pub use super::stats::*;
    pub use super::top_messages::*;
    pub use super::top_voice::*;
    pub use super::ustats::*;
    pub use super::*;
}
