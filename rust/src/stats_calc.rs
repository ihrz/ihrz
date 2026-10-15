// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// User/guild stats calculators. Mirrors src/core/functions/userStatsUtils.ts
// (8 fns) as pure offline logic over plain snapshots. The top-N
// ordering helpers are shared with the stats commands' leaderboard
// renderer (see commands::stats `top_by`).

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
/// TS accumulates in a plain object (first-seen insertion order) and V8
/// sort is stable, so duration ties resolve first-seen-first (node:
/// [["y",10],["x",30],["y",20]] ranks y(30) before x(30)). A bare
/// HashMap walk would randomize ties, so the stable sort runs over an
/// explicit first-seen order instead. Presence (not value) decides
/// order, exactly like TS key insertion (a total passing through 0
/// keeps its slot; NaN totals are impossible on i64; "__proto__"-style
/// keys are unreachable — channel ids are Discord snowflakes).
pub fn active_voice_channels(voices: &[StatsVoice]) -> (String, String, String) {
    let mut order: Vec<&str> = Vec::new();
    let mut totals: std::collections::HashMap<&str, i64> = std::collections::HashMap::new();
    for v in voices {
        let id = v.channel_id.as_str();
        if !totals.contains_key(id) {
            order.push(id);
        }
        *totals.entry(id).or_default() += v.end_timestamp - v.start_timestamp;
    }
    let mut sorted: Vec<(&str, i64)> = order.into_iter().map(|id| (id, totals[id])).collect();
    sorted.sort_by_key(|a| std::cmp::Reverse(a.1));
    pick3(sorted.into_iter().map(|(id, _)| id.to_string()))
}

fn top_n_counts<'a>(ids: impl Iterator<Item = &'a str>) -> (String, String, String) {
    let mut order: Vec<&'a str> = Vec::new();
    let mut counts: std::collections::HashMap<&'a str, u64> = std::collections::HashMap::new();
    for id in ids {
        if !counts.contains_key(id) {
            order.push(id);
        }
        *counts.entry(id).or_default() += 1;
    }
    // Same first-seen reasoning as active_voice_channels (node:
    // ["b","a","b","a"] ranks b before a on the 2-2 tie).
    let mut sorted: Vec<(&str, u64)> = order.into_iter().map(|id| (id, counts[id])).collect();
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
    // TS Math.round (halves toward +inf): floor(x + 0.5), not integer
    // truncation (90_000 ms = 1.5 min rounds to 2, trunc gives 1).
    ((total as f64 / 1000.0 / 60.0) + 0.5).floor() as i64
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
    fn active_channels_ties_keep_first_seen_order() {
        // TS accumulates counts in a plain object (first-seen insertion
        // order) and V8 sort is stable, so ties rank first-seen-first
        // (node ground truth: ["b","a","b","a"] -> ["b","a"],
        // ["x","y","y","x","z"] -> ["x","y","z"]). The old HashMap walk
        // resolved ties in hasher order instead.
        let tied = vec![msg(1, "b"), msg(2, "a"), msg(3, "b"), msg(4, "a")];
        assert_eq!(
            active_channels(&tied),
            ("b".to_string(), "a".to_string(), "N/A".to_string())
        );
        let three_way = vec![
            msg(1, "x"),
            msg(2, "y"),
            msg(3, "y"),
            msg(4, "x"),
            msg(5, "z"),
        ];
        assert_eq!(
            active_channels(&three_way),
            ("x".to_string(), "y".to_string(), "z".to_string())
        );
        // Voice variant: y totals 30 (10+20), x totals 30 — first-seen y wins.
        let vtied = vec![voice(0, 10, "y"), voice(0, 30, "x"), voice(30, 50, "y")];
        assert_eq!(
            active_voice_channels(&vtied),
            ("y".to_string(), "x".to_string(), "N/A".to_string())
        );
    }

    #[test]
    fn channel_counters() {
        let msgs = vec![msg(1, "a"), msg(2, "a"), msg(3, "b")];
        assert_eq!(channel_messages_count("a", &msgs), 2);
        assert_eq!(channel_messages_count("zzz", &msgs), 0);
        // 90_000 ms + 30_000 ms = 120_000 ms = 2 min via Math.round.
        let voices = vec![voice(0, 90_000, "v"), voice(0, 30_000, "v")];
        assert_eq!(channel_minutes_count("v", &voices), 2);
        assert_eq!(channel_minutes_count("zzz", &voices), 0);
        // Adversarial half-minute: Math.round(1.5) = 2, truncation = 1.
        assert_eq!(channel_minutes_count("h", &[voice(0, 90_000, "h")]), 2);
        assert_eq!(channel_minutes_count("q", &[voice(0, 30_000, "q")]), 1);
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
    fn leaderboard_matches_ts_six_level_legs() {
        // Node battery (slice 120): each of the six comparator levels
        // decides alone; a full tie keeps input order (V8 stable sort ==
        // `sort_by` stable); the cap keeps the first 3 of the sorted
        // order; negatives sort below zero.
        let full = |id: &str, d: u64, w: u64, m: u64, dv: i64, wv: i64, mv: i64| LeaderRow {
            member_id: id.into(),
            daily_messages: d,
            weekly_messages: w,
            monthly_messages: m,
            daily_voice: dv,
            weekly_voice: wv,
            monthly_voice: mv,
        };
        // Monthly-messages level.
        let top = stats_leaderboard(vec![
            full("a", 2, 5, 1, 0, 0, 0),
            full("b", 2, 5, 9, 0, 0, 0),
        ]);
        assert_eq!(
            [top[0].member_id.as_str(), top[1].member_id.as_str()],
            ["b", "a"]
        );
        // Weekly-voice level.
        let top = stats_leaderboard(vec![
            full("a", 2, 5, 9, 7, 1, 0),
            full("b", 2, 5, 9, 7, 8, 0),
        ]);
        assert_eq!(
            [top[0].member_id.as_str(), top[1].member_id.as_str()],
            ["b", "a"]
        );
        // Monthly-voice level.
        let top = stats_leaderboard(vec![
            full("a", 2, 5, 9, 7, 8, 1),
            full("b", 2, 5, 9, 7, 8, 2),
        ]);
        assert_eq!(
            [top[0].member_id.as_str(), top[1].member_id.as_str()],
            ["b", "a"]
        );
        // Full tie: input order kept.
        let top = stats_leaderboard(vec![
            full("x", 1, 1, 1, 1, 1, 1),
            full("y", 1, 1, 1, 1, 1, 1),
            full("z", 1, 1, 1, 1, 1, 1),
        ]);
        assert_eq!(
            top.iter().map(|r| r.member_id.as_str()).collect::<Vec<_>>(),
            ["x", "y", "z"]
        );
        // Cap: first 3 of 5 sorted rows.
        let top = stats_leaderboard(vec![
            full("a", 1, 0, 0, 0, 0, 0),
            full("b", 2, 0, 0, 0, 0, 0),
            full("c", 3, 0, 0, 0, 0, 0),
            full("d", 4, 0, 0, 0, 0, 0),
            full("e", 5, 0, 0, 0, 0, 0),
        ]);
        assert_eq!(
            top.iter().map(|r| r.member_id.as_str()).collect::<Vec<_>>(),
            ["e", "d", "c"]
        );
        // DELTAS (doc-noted, unreachable): TS filters `member === undefined`
        // rows first -- unrepresentable here (`LeaderRow` always carries a
        // member id, and the fn has no live callers); a NaN count would
        // neutralize one comparator level in TS (`!==` true, difference NaN
        // sorts as 0) while u64/i64 cannot hold NaN (live counts and voice
        // minutes are integers).
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
        // Slice 120 (node battery): ties keep input order (stable sort
        // both sides); limit 0 yields []; over-long limits keep all;
        // negatives sort below zero on the voice leg.
        let tied = vec![
            ("a".to_string(), 5u64),
            ("b".to_string(), 5),
            ("c".to_string(), 5),
        ];
        assert_eq!(
            top_by_messages(tied, 10),
            vec![
                ("a".to_string(), 5),
                ("b".to_string(), 5),
                ("c".to_string(), 5)
            ]
        );
        assert_eq!(top_by_messages(vec![("a".to_string(), 3u64)], 0), vec![]);
        assert_eq!(top_by_messages(vec![("a".to_string(), 3u64)], 10).len(), 1);
        let vrows = vec![("a".to_string(), -5i64), ("b".to_string(), 0)];
        assert_eq!(
            top_by_voice(vrows, 10),
            vec![("b".to_string(), 0), ("a".to_string(), -5)]
        );
        // DELTAS (doc-noted, unreachable at the fn): negative/fractional
        // `limit` shapes (`slice(0, -1)` keeps all-but-last, `slice(0, 2.5)`
        // keeps 2 -- node ground truth) are unrepresentable past the `usize`
        // signature; the live call site resolves them via `js_slice_take`
        // (+ prefix 5..=25 clamp / slash `|| 10`), all pinned in
        // `top_period_and_limit_mirror_ts`. Side note (framework-level,
        // NOT touched): poise parses the prefix `limit` as `Option<i64>`,
        // so `!top-messages 2.5` reads None -> 10 while TS `parseInt` reads
        // 2 -> clamp 5; same poise-vs-TS parse family as U-ETERNAL-241.
    }
}
