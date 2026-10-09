// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// User/guild stats calculators. Mirrors src/core/functions/userStatsUtils.ts
// (8 fns) as pure offline logic over plain snapshots.

/// Message snapshot. Mirrors DatabaseStructure.StatsMessage.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StatsMessage {
    pub sent_timestamp: i64,
    pub content_length: u64,
    pub channel_id: String,
}

/// Voice session snapshot. Mirrors DatabaseStructure.StatsVoice.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StatsVoice {
    pub start_timestamp: i64,
    pub end_timestamp: i64,
    pub channel_id: String,
}

/// Windowed message buckets. Mirrors calculateMessageTime().
pub fn bucket_message(
    msg: &StatsMessage,
    now: i64,
    daily_timeout: i64,
    weekly_timeout: i64,
    monthly_timeout: i64,
) -> (bool, bool, bool) {
    (
        msg.sent_timestamp >= now - daily_timeout,
        msg.sent_timestamp >= now - weekly_timeout,
        msg.sent_timestamp >= now - monthly_timeout,
    )
}

/// Windowed voice accumulation. Mirrors calculateVoiceActivity().
/// Returns the session duration added to each window (0 when outside).
pub fn accumulate_voice(
    voice: &StatsVoice,
    now: i64,
    daily_timeout: i64,
    weekly_timeout: i64,
    monthly_timeout: i64,
) -> (i64, i64, i64) {
    let duration = voice.end_timestamp - voice.start_timestamp;
    (
        if voice.end_timestamp >= now - daily_timeout {
            duration
        } else {
            0
        },
        if voice.end_timestamp >= now - weekly_timeout {
            duration
        } else {
            0
        },
        if voice.end_timestamp >= now - monthly_timeout {
            duration
        } else {
            0
        },
    )
}

/// Top-3 text channels by message count ("N/A" fill). Mirrors calculateActiveChannels().
pub fn active_channels(messages: &[StatsMessage]) -> (String, String, String) {
    top_n_counts(messages.iter().map(|m| m.channel_id.as_str()))
}

/// Top-3 voice channels by summed duration ("N/A" fill). Mirrors calculateActiveVoiceChannels().
pub fn active_voice_channels(voices: &[StatsVoice]) -> (String, String, String) {
    let mut totals: std::collections::HashMap<&str, i64> = std::collections::HashMap::new();
    for v in voices {
        *totals.entry(v.channel_id.as_str()).or_default() += v.end_timestamp - v.start_timestamp;
    }
    let mut sorted: Vec<(&str, i64)> = totals.into_iter().collect();
    sorted.sort_by_key(|a| std::cmp::Reverse(a.1));
    pick3(sorted.into_iter().map(|(id, _)| id.to_string()))
}

fn top_n_counts<'a>(ids: impl Iterator<Item = &'a str>) -> (String, String, String) {
    let mut counts: std::collections::HashMap<&str, u64> = std::collections::HashMap::new();
    for id in ids {
        *counts.entry(id).or_default() += 1;
    }
    let mut sorted: Vec<(&str, u64)> = counts.into_iter().collect();
    sorted.sort_by_key(|a| std::cmp::Reverse(a.1));
    pick3(sorted.into_iter().map(|(id, _)| id.to_string()))
}

fn pick3(mut ids: impl Iterator<Item = String>) -> (String, String, String) {
    (
        ids.next().unwrap_or_else(|| "N/A".into()),
        ids.next().unwrap_or_else(|| "N/A".into()),
        ids.next().unwrap_or_else(|| "N/A".into()),
    )
}

/// Message count in one channel. Mirrors getChannelMessagesCount().
pub fn channel_messages_count(channel_id: &str, messages: &[StatsMessage]) -> usize {
    messages
        .iter()
        .filter(|m| m.channel_id == channel_id)
        .count()
}

/// Whole minutes spent in one voice channel. Mirrors getChannelMinutesCount().
pub fn channel_minutes_count(channel_id: &str, voices: &[StatsVoice]) -> i64 {
    let total: i64 = voices
        .iter()
        .filter(|v| v.channel_id == channel_id)
        .map(|v| v.end_timestamp - v.start_timestamp)
        .sum();
    total / 1000 / 60
}

/// Per-member aggregate for the leaderboard. Member id stands in for
/// the discord.js User (pure module keeps no Discord types).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LeaderRow {
    pub member_id: String,
    pub daily_messages: u64,
    pub weekly_messages: u64,
    pub monthly_messages: u64,
    pub daily_voice: i64,
    pub weekly_voice: i64,
    pub monthly_voice: i64,
}

/// Top-3 leaderboard with TS tiebreak order (daily > weekly > monthly
/// messages, then daily > weekly > monthly voice). Mirrors getStatsLeaderboard().
pub fn stats_leaderboard(mut rows: Vec<LeaderRow>) -> Vec<LeaderRow> {
    rows.sort_by(|a, b| {
        b.daily_messages
            .cmp(&a.daily_messages)
            .then(b.weekly_messages.cmp(&a.weekly_messages))
            .then(b.monthly_messages.cmp(&a.monthly_messages))
            .then(b.daily_voice.cmp(&a.daily_voice))
            .then(b.weekly_voice.cmp(&a.weekly_voice))
            .then(b.monthly_voice.cmp(&a.monthly_voice))
    });
    rows.truncate(3);
    rows
}

/// Top-N by message count. Mirrors getTopUsersByMessages() (default 10).
pub fn top_by_messages(mut rows: Vec<(String, u64)>, limit: usize) -> Vec<(String, u64)> {
    rows.sort_by_key(|a| std::cmp::Reverse(a.1));
    rows.truncate(limit);
    rows
}

/// Top-N by voice duration. Mirrors getTopUsersByVoice() (default 10).
pub fn top_by_voice(mut rows: Vec<(String, i64)>, limit: usize) -> Vec<(String, i64)> {
    rows.sort_by_key(|a| std::cmp::Reverse(a.1));
    rows.truncate(limit);
    rows
}

#[cfg(test)]
mod tests {
    use super::*;

    fn msg(ts: i64, ch: &str) -> StatsMessage {
        StatsMessage {
            sent_timestamp: ts,
            content_length: 5,
            channel_id: ch.into(),
        }
    }

    fn voice(start: i64, end: i64, ch: &str) -> StatsVoice {
        StatsVoice {
            start_timestamp: start,
            end_timestamp: end,
            channel_id: ch.into(),
        }
    }

    #[test]
    fn buckets_use_gte_boundaries() {
        // Adversarial: exactly on the boundary counts as inside (>=).
        assert_eq!(
            bucket_message(&msg(900, "c"), 1000, 100, 500, 2000),
            (true, true, true)
        );
        assert_eq!(
            bucket_message(&msg(899, "c"), 1000, 100, 500, 2000),
            (false, true, true)
        );
        assert_eq!(
            bucket_message(&msg(0, "c"), 1000, 100, 500, 2000),
            (false, false, true)
        );
    }

    #[test]
    fn voice_accumulation_windows_and_saturation() {
        let (d, w, m) = accumulate_voice(&voice(800, 950, "v"), 1000, 100, 500, 2000);
        assert_eq!((d, w, m), (150, 150, 150));
        // Adversarial: end before daily window -> daily 0, wider windows keep it.
        let (d, w, m) = accumulate_voice(&voice(100, 500, "v"), 1000, 100, 500, 2000);
        assert_eq!((d, w, m), (0, 400, 400));
        // Adversarial: inverted session propagates negative duration,
        // exactly like TS (endTimestamp - startTimestamp, no guard).
        let (d, w, m) = accumulate_voice(&voice(900, 100, "v"), 1000, 2000, 2000, 2000);
        assert_eq!((d, w, m), (-800, -800, -800));
    }

    #[test]
    fn active_channels_rank_and_fill() {
        let msgs = vec![
            msg(1, "a"),
            msg(2, "b"),
            msg(3, "a"),
            msg(4, "a"),
            msg(5, "b"),
        ];
        assert_eq!(
            active_channels(&msgs),
            ("a".to_string(), "b".to_string(), "N/A".to_string())
        );
        let empty: Vec<StatsMessage> = vec![];
        assert_eq!(
            active_channels(&empty),
            ("N/A".to_string(), "N/A".to_string(), "N/A".to_string())
        );
        // Voice variant ranks by duration, not session count.
        let voices = vec![
            voice(0, 60_000, "x"),
            voice(0, 10_000, "y"),
            voice(0, 10_000, "y"),
        ];
        let (first, second, third) = active_voice_channels(&voices);
        assert_eq!(first, "x");
        assert_eq!(second, "y");
        assert_eq!(third, "N/A");
    }

    #[test]
    fn channel_counters() {
        let msgs = vec![msg(1, "a"), msg(2, "a"), msg(3, "b")];
        assert_eq!(channel_messages_count("a", &msgs), 2);
        assert_eq!(channel_messages_count("zzz", &msgs), 0);
        // 90_000 ms = 1.5 min -> Math.round down via integer div = 1.
        let voices = vec![voice(0, 90_000, "v"), voice(0, 30_000, "v")];
        assert_eq!(channel_minutes_count("v", &voices), 2);
        assert_eq!(channel_minutes_count("zzz", &voices), 0);
    }

    #[test]
    fn leaderboard_order_and_top3_cap() {
        let row = |id: &str, d: u64, w: u64, dv: i64| LeaderRow {
            member_id: id.into(),
            daily_messages: d,
            weekly_messages: w,
            monthly_messages: 0,
            daily_voice: dv,
            weekly_voice: 0,
            monthly_voice: 0,
        };
        let rows = vec![
            row("a", 1, 99, 0),
            row("b", 2, 0, 0),
            row("c", 2, 5, 0),
            row("d", 2, 5, 10),
            row("e", 0, 0, 0),
        ];
        let top = stats_leaderboard(rows);
        // Adversarial tiebreaks: daily first, then weekly, then daily voice.
        assert_eq!(top.len(), 3);
        assert_eq!(top[0].member_id, "d");
        assert_eq!(top[1].member_id, "c");
        assert_eq!(top[2].member_id, "b");
    }

    #[test]
    fn top_n_helpers() {
        let rows = vec![
            ("a".to_string(), 3u64),
            ("b".to_string(), 9),
            ("c".to_string(), 1),
        ];
        assert_eq!(
            top_by_messages(rows, 2),
            vec![("b".to_string(), 9), ("a".to_string(), 3)]
        );
        let rows = vec![
            ("a".to_string(), 30i64),
            ("b".to_string(), 90),
            ("c".to_string(), 10),
        ];
        assert_eq!(top_by_voice(rows, 10).len(), 3);
        assert_eq!(top_by_voice(vec![], 10), vec![]);
    }
}
