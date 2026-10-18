// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/stats/*.
//
// TS keys: <guild>.STATS.USER.<uid> rows shaped like
// DatabaseStructure.UserStats: `{messages[]?, voices[]?}` histories
// with camelCase records (sentTimestamp/contentLength/channelId,
// startTimestamp/endTimestamp) and string channel ids. TS stores no
// aggregate counters (totals read via `messages.length`, voice time
// summed from sessions). Rust rows add `{messages, voice_ms,
// msg_log[], voice_log[]}`; loaders accept both shapes (see
// `UserStats` deserialization). Window calculators + ustats
// periods/top-channels ported (text form).
//
// PNG note: the TS stats cards render HTML via client.func.html2png
// (puppeteer Chromium or HorizonGateway). Chromium is excluded from
// this runtime; the cards below render through HorizonGateway
// (`gateway_render_html`, same FormData/options shape as the TS
// gateway branch) with the text rankings kept as fallback when the
// gateway is unset or the render fails. Compare (pure embed) fully
// ported.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Channel id accepting the TS string form or a number, like the
/// `ACTIVE_VOICE_SESSIONS.<uid>` `{startTimestamp, channelId}` object
/// in Events/stats/onVoiceUpdate.ts (discord.js snowflakes serialize
/// as strings). Lenient: unparsable reads as 0 so one bad record
/// never zeroes the whole user row.
fn de_string_or_u64<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct ChannelVisitor;
    impl<'de> serde::de::Visitor<'de> for ChannelVisitor {
        type Value = u64;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("a channel id as a number or a numeric string")
        }
        fn visit_u64<E: serde::de::Error>(self, v: u64) -> Result<u64, E> {
            Ok(v)
        }
        fn visit_i64<E: serde::de::Error>(self, v: i64) -> Result<u64, E> {
            Ok(u64::try_from(v).unwrap_or(0))
        }
        fn visit_str<E: serde::de::Error>(self, v: &str) -> Result<u64, E> {
            Ok(v.trim().parse::<u64>().unwrap_or(0))
        }
        fn visit_string<E: serde::de::Error>(self, v: String) -> Result<u64, E> {
            self.visit_str(&v)
        }
    }
    deserializer.deserialize_any(ChannelVisitor)
}

/// One message record. Mirrors DatabaseStructure.StatsMessage
/// (`sentTimestamp`/`contentLength`/`channelId`, string ids).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StatsMessage {
    #[serde(default, alias = "sentTimestamp")]
    pub sent_ts: i64,
    #[serde(default, alias = "contentLength")]
    pub content_len: u64,
    #[serde(default, alias = "channelId", deserialize_with = "de_string_or_u64")]
    pub channel_id: u64,
}

/// One closed voice session. Mirrors DatabaseStructure.StatsVoice
/// (`startTimestamp`/`endTimestamp`/`channelId`, string ids).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StatsVoice {
    #[serde(default, alias = "startTimestamp")]
    pub start_ts: i64,
    #[serde(default, alias = "endTimestamp")]
    pub end_ts: i64,
    #[serde(default, alias = "channelId", deserialize_with = "de_string_or_u64")]
    pub channel_id: u64,
}

/// Lenient u64 counter: TS never writes these keys, but legacy rows
/// may hold numbers, numeric strings, or floats.
fn counter_from_value(v: &serde_json::Value) -> Option<u64> {
    match v {
        serde_json::Value::Number(n) => n.as_u64().or_else(|| {
            n.as_i64()
                .and_then(|i| u64::try_from(i).ok())
                .or_else(|| n.as_f64().filter(|f| *f >= 0.0).map(|f| f as u64))
        }),
        serde_json::Value::String(s) => s.trim().parse::<u64>().ok(),
        _ => None,
    }
}

#[derive(Debug, Clone, Default, Serialize)]
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

/// Accepts both row shapes for the same key: the Rust
/// `{messages: u64, voice_ms, msg_log[], voice_log[]}` row and the TS
/// DatabaseStructure.UserStats `{messages[]?, voices[]?}` row
/// (camelCase records, string channel ids, no counters). Mixed rows
/// merge both logs; explicit numeric counters win, otherwise
/// `messages` falls back to the merged log length (like
/// `res.messages?.length || 0` in `!ustats.ts`) and `voice_ms` to the
/// summed session durations.
impl<'de> Deserialize<'de> for UserStats {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize, Default)]
        struct RawUserStats {
            #[serde(default)]
            messages: Option<serde_json::Value>,
            #[serde(default)]
            voices: Option<serde_json::Value>,
            #[serde(default)]
            voice_ms: Option<serde_json::Value>,
            #[serde(default)]
            msg_log: Vec<StatsMessage>,
            #[serde(default)]
            voice_log: Vec<StatsVoice>,
        }
        let raw = RawUserStats::deserialize(deserializer)?;
        let mut msg_log = raw.msg_log;
        let mut voice_log = raw.voice_log;
        let mut messages = None;
        if let Some(v) = raw.messages.as_ref() {
            match v {
                serde_json::Value::Array(items) => {
                    for item in items {
                        if let Ok(m) = serde_json::from_value::<StatsMessage>(item.clone()) {
                            msg_log.push(m);
                        }
                    }
                }
                other => messages = counter_from_value(other),
            }
        }
        if let Some(serde_json::Value::Array(items)) = raw.voices.as_ref() {
            for item in items {
                if let Ok(vc) = serde_json::from_value::<StatsVoice>(item.clone()) {
                    voice_log.push(vc);
                }
            }
        }
        let messages = messages.unwrap_or(msg_log.len() as u64);
        let voice_ms = raw
            .voice_ms
            .as_ref()
            .and_then(counter_from_value)
            .unwrap_or_else(|| {
                voice_log
                    .iter()
                    .map(|v| (v.end_ts - v.start_ts).max(0) as u64)
                    .sum()
            });
        Ok(UserStats {
            messages,
            voice_ms,
            msg_log,
            voice_log,
        })
    }
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
/// Mirrors calculateMessageTime in userStatsUtils.ts: the monthly window
/// is a flat 30 days (2_592_000_000 ms), like every other stats timeout
/// (`!ustats.ts`, `!compare.ts`, `!top-messages.ts`, `!top-voice.ts`).
pub fn msg_window_counts(messages: &[StatsMessage], now_ms: i64) -> (u64, u64, u64, u64) {
    let day = now_ms - 86_400_000;
    let week = now_ms - 604_800_000;
    let month = now_ms - 2_592_000_000;
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
/// Mirrors calculateVoiceActivity in userStatsUtils.ts (monthly = flat
/// 30 days, 2_592_000_000 ms, like `!ustats.ts`).
pub fn voice_window_ms(voices: &[StatsVoice], now_ms: i64) -> (u64, u64, u64, u64) {
    let day = now_ms - 86_400_000;
    let week = now_ms - 604_800_000;
    let month = now_ms - 2_592_000_000;
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
/// Mirrors calculateActiveVoiceChannels in userStatsUtils.ts.
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

/// One user row. Accepts the Rust `{messages, voice_ms, msg_log,
/// voice_log}` shape and the TS DatabaseStructure.UserStats
/// `{messages[]?, voices[]?}` shape (camelCase records, string
/// channel ids, counters derived); see `UserStats` deserialization.
pub async fn load_stats(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> UserStats {
    table_value_or_legacy(pool, guild_id, &stats_key(user_id))
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// True when a `STATS.USER.<uid>` row exists (table or legacy).
/// `load_stats` falls back to a zeroed default for missing rows, so
/// callers that must distinguish "no row" (e.g. `!ustats.ts`, which
/// replies `unblacklist_user_is_not_exist`) check this first.
pub async fn stats_row_exists(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> bool {
    table_value_or_legacy(pool, guild_id, &stats_key(user_id))
        .await
        .is_some()
}

/// Append one message record in the exact TS shape
/// (`Events/stats/onNewMessage.ts`: `db.push` of
/// `{channelId: string, contentLength, sentTimestamp}` into
/// `STATS.USER.<uid>.messages[]`). The dashboard/gateway reads these
/// arrays; the old Rust aggregate row (`{messages: u64, msg_log[]}`)
/// is invisible to it, so writers must use this leg. Unbounded like
/// TS (no cap). Existing aggregate fields on the row are preserved
/// untouched for old readers (loaders merge both shapes).
pub async fn push_ts_stats_message(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
    content_len: u64,
    sent_ts: i64,
) {
    let mut doc = table_value_or_legacy(pool, guild_id, &stats_key(user_id))
        .await
        .filter(|v| v.is_object())
        .unwrap_or_else(|| serde_json::json!({}));
    let arr = doc
        .as_object_mut()
        .expect("filtered object")
        .entry("messages".to_string())
        .or_insert_with(|| serde_json::json!([]));
    if !arr.is_array() {
        *arr = serde_json::json!([]);
    }
    arr.as_array_mut().expect("array").push(serde_json::json!({
        "channelId": channel_id.to_string(),
        "contentLength": content_len,
        "sentTimestamp": sent_ts,
    }));
    let _ = crate::db::tbl_set_json(pool, guild_id, &stats_key(user_id), &doc).await;
}

/// Append one closed voice session in the exact TS shape
/// (`processSessionEnd` in `Events/stats/onVoiceUpdate.ts`: `db.push`
/// of `{startTimestamp, endTimestamp, channelId: string}` into
/// `STATS.USER.<uid>.voices[]`). Same dashboard-visibility rationale
/// as [`push_ts_stats_message`]; unbounded like TS.
pub async fn push_ts_stats_voice(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
    start_ts: i64,
    end_ts: i64,
) {
    let mut doc = table_value_or_legacy(pool, guild_id, &stats_key(user_id))
        .await
        .filter(|v| v.is_object())
        .unwrap_or_else(|| serde_json::json!({}));
    let arr = doc
        .as_object_mut()
        .expect("filtered object")
        .entry("voices".to_string())
        .or_insert_with(|| serde_json::json!([]));
    if !arr.is_array() {
        *arr = serde_json::json!([]);
    }
    arr.as_array_mut().expect("array").push(serde_json::json!({
        "startTimestamp": start_ts,
        "endTimestamp": end_ts,
        "channelId": channel_id.to_string(),
    }));
    let _ = crate::db::tbl_set_json(pool, guild_id, &stats_key(user_id), &doc).await;
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
/// legacy `STATS.USER.%` rows filling gaps (table wins). Each row
/// parses via the tolerant `UserStats` deserialization, so TS-shaped
/// `{messages[]?, voices[]?}` rows count alongside Rust rows.
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

/// Per-channel aggregate computed from `STATS.USER` rows. Mirrors
/// `!channel-stats.ts:98-155`: messages/voices are filtered by
/// `channelId` across every user, windows use sentTimestamp (messages)
/// / endTimestamp (voices), and active users are those with at least
/// one row in the channel. There is no `STATS.CHANNEL` writer in TS
/// (see `Events/stats/onNewMessage.ts`, USER rows only), so the
/// per-channel counters some ports kept are dropped here.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ChannelAggregate {
    pub daily_messages: u64,
    pub weekly_messages: u64,
    pub monthly_messages: u64,
    pub total_messages: u64,
    pub daily_voice_ms: u64,
    pub weekly_voice_ms: u64,
    pub monthly_voice_ms: u64,
    pub total_voice_ms: u64,
    pub active_users: u64,
    /// Top message users (uid, count), desc, top 5.
    pub top_message_users: Vec<(u64, u64)>,
    /// Top voice users (uid, ms), desc, top 5.
    pub top_voice_users: Vec<(u64, u64)>,
}

/// Aggregate one channel from all user rows. Mirrors
/// `!channel-stats.ts:105-190` (top-5 slices at :173-187).
pub fn aggregate_channel(
    rows: &[(u64, UserStats)],
    channel_id: u64,
    now_ms: i64,
) -> ChannelAggregate {
    const DAY: i64 = 86_400_000;
    const WEEK: i64 = 604_800_000;
    const MONTH: i64 = 2_592_000_000;
    let mut out = ChannelAggregate::default();
    let mut per_user_msg: Vec<(u64, u64)> = Vec::new();
    let mut per_user_vc: Vec<(u64, u64)> = Vec::new();
    for (uid, s) in rows {
        let msgs: Vec<&StatsMessage> = s
            .msg_log
            .iter()
            .filter(|m| m.channel_id == channel_id)
            .collect();
        let voices: Vec<&StatsVoice> = s
            .voice_log
            .iter()
            .filter(|v| v.channel_id == channel_id)
            .collect();
        if msgs.is_empty() && voices.is_empty() {
            continue;
        }
        out.active_users += 1;
        out.total_messages += msgs.len() as u64;
        per_user_msg.push((*uid, msgs.len() as u64));
        let mut user_vc_total = 0u64;
        for m in &msgs {
            if now_ms - m.sent_ts <= DAY {
                out.daily_messages += 1;
            }
            if now_ms - m.sent_ts <= WEEK {
                out.weekly_messages += 1;
            }
            if now_ms - m.sent_ts <= MONTH {
                out.monthly_messages += 1;
            }
        }
        for v in &voices {
            let dur = (v.end_ts - v.start_ts).max(0) as u64;
            user_vc_total += dur;
            out.total_voice_ms += dur;
            if now_ms - v.end_ts <= DAY {
                out.daily_voice_ms += dur;
            }
            if now_ms - v.end_ts <= WEEK {
                out.weekly_voice_ms += dur;
            }
            if now_ms - v.end_ts <= MONTH {
                out.monthly_voice_ms += dur;
            }
        }
        per_user_vc.push((*uid, user_vc_total));
    }
    per_user_msg.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    per_user_vc.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    per_user_msg.truncate(5);
    per_user_vc.truncate(5);
    out.top_message_users = per_user_msg;
    out.top_voice_users = per_user_vc;
    out
}

/// Per-member day/week/month windows for the guild leaderboard.
/// Mirrors `!gstats.ts:97-205` (monthly = flat 30 days).
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct MemberWindows {
    pub user_id: u64,
    pub daily_messages: u64,
    pub weekly_messages: u64,
    pub monthly_messages: u64,
    pub daily_voice_ms: u64,
    pub weekly_voice_ms: u64,
    pub monthly_voice_ms: u64,
}

/// Per-member windows over every user row. Mirrors
/// `!gstats.ts:114-195` (message windows keyed on sentTimestamp,
/// voice windows on endTimestamp).
pub fn guild_member_windows(rows: &[(u64, UserStats)], now_ms: i64) -> Vec<MemberWindows> {
    const DAY: i64 = 86_400_000;
    const WEEK: i64 = 604_800_000;
    const MONTH: i64 = 2_592_000_000;
    rows.iter()
        .map(|(uid, s)| {
            let mut w = MemberWindows {
                user_id: *uid,
                ..Default::default()
            };
            for m in &s.msg_log {
                if now_ms - m.sent_ts <= DAY {
                    w.daily_messages += 1;
                }
                if now_ms - m.sent_ts <= WEEK {
                    w.weekly_messages += 1;
                }
                if now_ms - m.sent_ts <= MONTH {
                    w.monthly_messages += 1;
                }
            }
            for v in &s.voice_log {
                let dur = (v.end_ts - v.start_ts).max(0) as u64;
                if now_ms - v.end_ts <= DAY {
                    w.daily_voice_ms += dur;
                }
                if now_ms - v.end_ts <= WEEK {
                    w.weekly_voice_ms += dur;
                }
                if now_ms - v.end_ts <= MONTH {
                    w.monthly_voice_ms += dur;
                }
            }
            w
        })
        .collect()
}

/// Top-3 channels by daily volume, built from the same USER rows.
/// Mirrors `!gstats.ts:125-184` (`channelStats` map) + `topThree`
/// at :207-223 (top-3 by `dailyMessages` for text, `dailyVoice`
/// for voice).
/// Top-3 channel id/volume pairs, text then voice.
pub type ChannelTops = (Vec<(u64, u64)>, Vec<(u64, u64)>);

pub fn guild_top_channels(rows: &[(u64, UserStats)], now_ms: i64) -> ChannelTops {
    const DAY: i64 = 86_400_000;
    let mut text: HashMap<u64, u64> = HashMap::new();
    let mut voice: HashMap<u64, u64> = HashMap::new();
    for (_, s) in rows {
        for m in &s.msg_log {
            if now_ms - m.sent_ts <= DAY {
                *text.entry(m.channel_id).or_insert(0) += 1;
            }
        }
        for v in &s.voice_log {
            if now_ms - v.end_ts <= DAY {
                *voice.entry(v.channel_id).or_insert(0) += (v.end_ts - v.start_ts).max(0) as u64;
            }
        }
    }
    let mut text: Vec<(u64, u64)> = text.into_iter().collect();
    text.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    text.truncate(3);
    let mut voice: Vec<(u64, u64)> = voice.into_iter().collect();
    voice.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    voice.truncate(3);
    (text, voice)
}

/// Leaderboard period. Mirrors the `period` option in !top-messages.ts
/// / !top-voice.ts: "daily" | "weekly" | "monthly", default "monthly".
/// Unknown input falls back to monthly, like the TS includes() guard.
pub fn parse_top_period(raw: Option<&str>) -> &'static str {
    match raw.map(|s| s.trim().to_ascii_lowercase()).as_deref() {
        Some("daily") => "daily",
        Some("weekly") => "weekly",
        _ => "monthly",
    }
}

/// Top period choice. Mirrors the `period` option `choices` in
/// stats.ts:117-147 (top-messages) and stats.ts:197-227 (top-voice):
/// slash shows the localized display names, the handler maps each
/// variant back to the TS `value` read by [`parse_top_period`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum TopPeriod {
    #[name = "daily"]
    #[name_localized("en-US", "Daily")]
    #[name_localized("en-GB", "Daily")]
    #[name_localized("fr", "Quotidien")]
    #[name_localized("ja", "daily")]
    #[name_localized("ru", "daily")]
    #[name_localized("es-ES", "daily")]
    Daily,
    #[name = "weekly"]
    #[name_localized("en-US", "Weekly")]
    #[name_localized("en-GB", "Weekly")]
    #[name_localized("fr", "Hebdomadaire")]
    #[name_localized("ja", "weekly")]
    #[name_localized("ru", "weekly")]
    #[name_localized("es-ES", "weekly")]
    Weekly,
    #[name = "monthly"]
    #[name_localized("en-US", "Monthly")]
    #[name_localized("en-GB", "Monthly")]
    #[name_localized("fr", "Mensuel")]
    #[name_localized("ja", "monthly")]
    #[name_localized("ru", "monthly")]
    #[name_localized("es-ES", "monthly")]
    Monthly,
}

impl TopPeriod {
    /// TS `value` read by [`parse_top_period`].
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Daily => "daily",
            Self::Weekly => "weekly",
            Self::Monthly => "monthly",
        }
    }
}

/// Prefix-only leaderboard row cap. Mirrors the TS prefix leg in
/// !top-messages.ts / !top-voice.ts (`Math.min(Math.max(n, 5), 25)`):
/// default 10, clamped to 5..=25. The slash path never clamps (see
/// `slash_top_limit`).
pub fn clamp_top_limit(raw: Option<i64>) -> usize {
    raw.unwrap_or(10).clamp(5, 25) as usize
}

/// Slash `limit` option. Mirrors the TS slash leg
/// (`interaction.options.getInteger("limit") || 10`): no 5..=25 clamp
/// on the slash path. `None`/`0` read as the default 10; anything else
/// passes through unchanged, including negatives — truncation happens at
/// the call site ([`js_slice_take`]), where the row count is known.
pub fn slash_top_limit(raw: Option<i64>) -> i64 {
    match raw {
        None | Some(0) => 10,
        Some(n) => n,
    }
}

/// JS `slice(0, limit)` row count. Mirrors the TS
/// `leaderboardData.slice(0, limit)` in !top-messages.ts / !top-voice.ts
/// (via getTopUsersByMessages / getTopUsersByVoice in userStatsUtils.ts):
/// a non-negative limit keeps at most `limit` rows, while a negative
/// limit keeps all-but-last-|limit| rows (empty only when |limit| >= row
/// count).
pub fn js_slice_take(len: usize, limit: i64) -> usize {
    if limit < 0 {
        len.saturating_sub(limit.saturating_abs() as usize)
    } else {
        (limit as usize).min(len)
    }
}

/// Window timeout (ms) for a leaderboard period. Mirrors the TS
/// dailyTimeout/weeklyTimeout/monthlyTimeout in !top-messages.ts and
/// !top-voice.ts (monthly = 2_592_000_000, i.e. 30 days).
pub fn top_period_timeout_ms(period: &str) -> i64 {
    match period {
        "daily" => 86_400_000,
        "weekly" => 604_800_000,
        _ => 2_592_000_000,
    }
}

/// Message count inside a leaderboard window. Same predicate as the TS
/// `nowTimestamp - message.sentTimestamp <= timeout` loop.
pub fn msg_window_count(messages: &[StatsMessage], now_ms: i64, timeout_ms: i64) -> u64 {
    messages
        .iter()
        .filter(|m| now_ms - m.sent_ts <= timeout_ms)
        .count() as u64
}

/// Voice ms inside a leaderboard window. Same predicate as the TS
/// `nowTimestamp - voice.endTimestamp <= timeout` loop.
pub fn voice_window_total(voices: &[StatsVoice], now_ms: i64, timeout_ms: i64) -> u64 {
    voices
        .iter()
        .filter(|v| now_ms - v.end_ts <= timeout_ms)
        .map(|v| (v.end_ts - v.start_ts).max(0) as u64)
        .sum()
}

/// Compact duration label. Mirrors `to_beautiful_string` short form in
/// src/core/functions/ms.ts over y/mo/w/d/h/m/s/ms (largest units
/// first, remainders appended); empty renders "0m" like the TS
/// `return result === "" ? "0" + lang.var_m` leg. Unit words come from
/// the guild lang (var_year/var_mo/var_w/var_d/var_h/var_m/var_s)
/// with plain-letter fallbacks.
pub fn beautiful_voice_ms(ms: u64, code: &str) -> String {
    let unit = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    let table: [(u64, String); 8] = [
        (31_557_600_000, unit("var_year", "y")),
        (2_592_000_000, unit("var_mo", "mo")),
        (604_800_000, unit("var_w", "w")),
        (86_400_000, unit("var_d", "d")),
        (3_600_000, unit("var_h", "h")),
        (60_000, unit("var_m", "m")),
        (1_000, unit("var_s", "s")),
        (1, "ms".to_string()),
    ];
    let mut rest = ms;
    let mut out = String::new();
    for (factor, name) in &table {
        if rest >= *factor {
            let value = rest / factor;
            if !out.is_empty() {
                out.push(' ');
            }
            out.push_str(&format!("{value}{name}"));
            rest %= factor;
            if rest == 0 {
                break;
            }
        }
    }
    if out.is_empty() {
        format!("0{}", unit("var_m", "m"))
    } else {
        out
    }
}

async fn top_by(ctx: &Ctx<'_>, kind: &str, period: &str, limit: i64) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let timeout = top_period_timeout_ms(period);
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let mut parsed: Vec<(u64, u64, String)> = Vec::new();
    for (id, s) in load_all_user_stats(&ctx.data().pool, &gid).await {
        let (n, label) = if kind == "voice" {
            let total = voice_window_total(&s.voice_log, now_ms, timeout);
            (total, beautiful_voice_ms(total, &code))
        } else {
            let n = msg_window_count(&s.msg_log, now_ms, timeout);
            (n, n.to_string())
        };
        if n > 0 {
            parsed.push((id, n, label));
        }
    }
    // TS drops zero-activity users, sorts by count desc only
    // (`b.messages - a.messages`, stable — ties keep scan order), and
    // slices to `limit` with JS slice(0, limit) semantics. Ordering
    // delegates to stats_calc (mirrors getTopUsersByMessages /
    // getTopUsersByVoice); labels rejoin here. Scan order is uid-ascending
    // (see load_all_user_stats), so tied rows keep that order on both
    // paths, like the TS stable sort.
    // Truncation needs the row count (negative limits keep
    // all-but-last-|limit|), so resolve it here via js_slice_take.
    let take = js_slice_take(parsed.len(), limit);
    let labels: HashMap<u64, String> = parsed
        .iter()
        .map(|(id, _, label)| (*id, label.clone()))
        .collect();
    let nums: HashMap<u64, u64> = parsed.iter().map(|(id, n, _)| (*id, *n)).collect();
    let ordered_ids: Vec<u64> = if kind == "voice" {
        crate::stats_calc::top_by_voice(
            parsed
                .iter()
                .map(|(id, n, _)| (id.to_string(), *n as i64))
                .collect(),
            take,
        )
        .into_iter()
        .filter_map(|(id, _)| id.parse::<u64>().ok())
        .collect()
    } else {
        crate::stats_calc::top_by_messages(
            parsed
                .iter()
                .map(|(id, n, _)| (id.to_string(), *n))
                .collect(),
            take,
        )
        .into_iter()
        .filter_map(|(id, _)| id.parse::<u64>().ok())
        .collect()
    };
    let top: Vec<String> = ordered_ids
        .iter()
        .enumerate()
        .map(|(i, uid)| {
            let label = labels.get(uid).cloned().unwrap_or_default();
            format!("{}. <@{uid}> — {label}", i + 1)
        })
        .collect();
    let text = if top.is_empty() {
        crate::lang::get(&code, "stats_no_data")
            .unwrap_or_else(|| "No statistics data available for this server.".to_string())
    } else {
        top.join("\n")
    };
    // Card leg (`!top-messages.ts:123-195`, `!top-voice.ts:123-201`):
    // the same ranking as HTML via HorizonGateway (`top-messages.png`
    // / `top-voice.png`). Gateway unset/fail keeps the text reply.
    if !ordered_ids.is_empty() {
        if let Some((base, token)) = card_gateway(ctx) {
            let word =
                |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
            let (guild_name, guild_icon) = guild_name_icon(ctx);
            let bot_avatar = ctx.cache().current_user().avatar_url().unwrap_or_default();
            let unknown = word("var_unknown", "Unknown");
            let msg_word = word("messages_word", "Messages");
            // `period === "daily" ? var_1d : weekly ? var_7d : var_14d`.
            let period_label = match period {
                "daily" => word("var_1d", "Daily"),
                "weekly" => word("var_7d", "Weekly"),
                _ => word("var_14d", "Monthly"),
            };
            let rows_html = ordered_ids
                .iter()
                .enumerate()
                .map(|(i, uid)| {
                    let (avatar, name) = match ctx.cache().user(*uid) {
                        Some(u) => (u.face(), u.name.clone()),
                        None => (gstats::GSTATS_DEFAULT_AVATAR.to_string(), unknown.clone()),
                    };
                    if kind == "voice" {
                        let vt = labels.get(uid).cloned().unwrap_or_default();
                        member_list_item(
                            i,
                            &avatar,
                            &name,
                            &format!("{}: {vt}", word("var_total", "Total")),
                            &vt,
                            &word("voice_activity", "Voice Activity"),
                        )
                    } else {
                        let n = nums.get(uid).copied().unwrap_or(0);
                        member_list_item(
                            i,
                            &avatar,
                            &name,
                            &format!("{}: {n} {msg_word}", word("var_total", "Total")),
                            &n.to_string(),
                            &msg_word,
                        )
                    }
                })
                .collect::<String>();
            let member_count = ctx
                .guild_id()
                .and_then(|g| ctx.cache().guild(g))
                .map(|g| g.member_count.to_string())
                .unwrap_or_else(|| ordered_ids.len().to_string());
            let png_opt = if kind == "voice" {
                let html = top_voice::top_voice_card_html(&top_voice::TopVoiceCardData {
                    header_h1_value: word("top_voice_title", "Top Voice"),
                    guild_pfp: if guild_icon.is_empty() {
                        bot_avatar.clone()
                    } else {
                        guild_icon.clone()
                    },
                    author_username: guild_name.clone(),
                    member_count,
                    current_date: format_current_date(now_ms),
                    period_label,
                    top_voice_users: rows_html,
                    top_voice_title: word("top_voice_title", "Top Voice"),
                    top_active_users_title: word("top_active_users_title", "Most Active Users"),
                    var_members: word("var_members", "Members"),
                });
                render_card_png(
                    &base,
                    &token,
                    &html,
                    &top_voice::top_voice_options_json(ordered_ids.len()),
                )
                .await
            } else {
                let html =
                    top_messages::top_messages_card_html(&top_messages::TopMessagesCardData {
                        header_h1_value: word("top_messages_title", "Top Messages"),
                        guild_pfp: if guild_icon.is_empty() {
                            bot_avatar.clone()
                        } else {
                            guild_icon.clone()
                        },
                        author_username: guild_name.clone(),
                        member_count,
                        current_date: format_current_date(now_ms),
                        period_label,
                        top_message_users: rows_html,
                        top_active_users_title: word("top_active_users_title", "Most Active Users"),
                        var_members: word("var_members", "Members"),
                    });
                render_card_png(
                    &base,
                    &token,
                    &html,
                    &top_messages::top_messages_options_json(ordered_ids.len()),
                )
                .await
            };
            if let Some(png) = png_opt {
                use poise::serenity_prelude as serenity;
                let name = if kind == "voice" {
                    "top-voice.png"
                } else {
                    "top-messages.png"
                };
                // TS `!top-messages.ts:199` / `!top-voice.ts:205` edit to
                // the bare file (`{ content: null, files: [attachment] }`):
                // no embed, no text — the file alone is the final shape.
                ctx.send(
                    poise::CreateReply::default()
                        .attachment(serenity::CreateAttachment::bytes(png, name)),
                )
                .await?;
                return Ok(());
            }
        }
    }
    ctx.say(text).await?;
    Ok(())
}

// ---- HTML card rendering via HorizonGateway ----
// Mirrors the `client.func.html2png` gateway branch
// (`src/core/functions/html2png.ts`): multipart POST
// (adminKey/options/code) through `gateway_render_html`. `None` on
// any failure so callers keep the text-embed fallback.
use chrono::{Datelike as _, Timelike as _};

/// Gateway base + token for card renders, `None` when unset (mirrors
/// the nowplaying `card_gateway` pattern).
pub fn card_gateway(ctx: &Ctx<'_>) -> Option<(String, String)> {
    ctx.data()
        .config
        .gateway_internal()
        .map(|base| (base, crate::config::api_token().unwrap_or_default()))
}

/// Render filled card HTML through HorizonGateway. `None` on any
/// failure so the caller falls back to the text reply.
pub async fn render_card_png(
    base: &str,
    token: &str,
    html: &str,
    options_json: &str,
) -> Option<Vec<u8>> {
    crate::funcs::gateway_render_html(
        base,
        token,
        html,
        options_json,
        &[],
        Some(std::time::Duration::from_secs(30)),
    )
    .await
    .ok()
}

/// Guild display name + icon URL for card headers. Mirrors
/// `interaction.guild.name` / `interaction.guild.iconURL({size:512})`
/// (empty icon when the guild has none; TS falls back to the bot
/// avatar there, which the caller passes instead).
pub fn guild_name_icon(ctx: &Ctx<'_>) -> (String, String) {
    match ctx.guild_id().and_then(|g| ctx.cache().guild(g)) {
        Some(g) => (g.name.clone(), g.icon_url().unwrap_or_default()),
        None => (String::new(), String::new()),
    }
}

/// Channel display name for cards. Mirrors `getChannelName`
/// (`userStatsUtils.ts:142-144`): the cached channel name, else
/// `"Deleted Channel"`.
pub fn card_channel_name(ctx: &Ctx<'_>, guild_id: Option<u64>, channel_id: u64) -> String {
    guild_id
        .and_then(|g| {
            ctx.serenity_context()
                .cache
                .guild(poise::serenity_prelude::GuildId::new(g))
        })
        .and_then(|g| {
            g.channels
                .get(&poise::serenity_prelude::ChannelId::new(channel_id))
                .map(|c| c.name.clone())
        })
        .unwrap_or_else(|| "Deleted Channel".to_string())
}

/// Rank CSS class for card list rows. Mirrors the TS ternaries
/// (`index === 0 ? "rank-1" : ... : ""`).
pub fn rank_class(index: usize) -> &'static str {
    match index {
        0 => "rank-1",
        1 => "rank-2",
        2 => "rank-3",
        _ => "",
    }
}

/// `en-US` short month/day labels for the trailing 30 days, oldest
/// first. Mirrors the `timeLabels` builders (`toLocaleDateString`
/// `"en-US"`, `{month:"short", day:"numeric"}`).
pub fn time_labels_30d(now_ms: i64) -> Vec<String> {
    const MONTHS: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    (0..30)
        .map(|i| {
            let ts = now_ms - (29 - i as i64) * 24 * 60 * 60 * 1000;
            match chrono::DateTime::from_timestamp_millis(ts) {
                Some(dt) => {
                    let dt = dt.naive_utc();
                    format!("{} {}", MONTHS[dt.month() as usize - 1], dt.day())
                }
                None => String::new(),
            }
        })
        .collect()
}

/// Per-day message counts for the trailing 30 days (index 29 =
/// today). Mirrors the `messageDataArray` loop in `!ustats.ts`
/// (`Math.floor((now - sentTimestamp) / 86400000)`, single pass).
pub fn message_buckets_30d(messages: &[StatsMessage], now_ms: i64) -> Vec<u64> {
    let mut out = vec![0u64; 30];
    for m in messages {
        let day = (now_ms - m.sent_ts).div_euclid(86_400_000);
        if (0..30).contains(&day) {
            out[(29 - day) as usize] += 1;
        }
    }
    out
}

/// Per-day voice minutes (fractional, like TS) for the trailing 30
/// days. Mirrors the `voiceDataArray` loop in `!ustats.ts`
/// (`(endTimestamp - startTimestamp) / 1000 / 60` bucketed by the
/// session start day).
pub fn voice_buckets_30d(voices: &[StatsVoice], now_ms: i64) -> Vec<f64> {
    let mut out = vec![0f64; 30];
    for v in voices {
        let day = (now_ms - v.start_ts).div_euclid(86_400_000);
        if (0..30).contains(&day) {
            out[(29 - day) as usize] += (v.end_ts - v.start_ts) as f64 / 1000.0 / 60.0;
        }
    }
    out
}

/// Footer date for card headers. Mirrors `new
/// Date().toLocaleDateString(lang, {year, month:long, day, hour,
/// minute})` (`!gstats.ts`, `!channel-stats.ts`, `!top-messages.ts`,
/// `!top-voice.ts`: en-US shape `"October 13, 2026, 02:30 PM"`).
pub fn format_current_date(now_ms: i64) -> String {
    const MONTHS: [&str; 12] = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    match chrono::DateTime::from_timestamp_millis(now_ms) {
        Some(dt) => {
            let dt = dt.naive_utc();
            let h24 = dt.hour();
            let (h12, ap) = match h24 {
                0 => (12, "AM"),
                12 => (12, "PM"),
                1..=11 => (h24, "AM"),
                _ => (h24 - 12, "PM"),
            };
            format!(
                "{} {}, {}, {:02}:{:02} {}",
                MONTHS[dt.month() as usize - 1],
                dt.day(),
                dt.year(),
                h12,
                dt.minute(),
                ap
            )
        }
        None => String::new(),
    }
}

/// Dynamic board height for the top-messages/top-voice cards.
/// Mirrors `Math.min(1080, 200 + topUsers.length * 120)`.
pub fn top_board_height(n: usize) -> u64 {
    (200 + n as u64 * 120).min(1080)
}

/// One member list-item row for the leaderboard cards. Mirrors the
/// `.map(...).join("")` row builders in `!gstats.ts` /
/// `!channel-stats.ts` / `!top-messages.ts` / `!top-voice.ts`.
pub fn member_list_item(
    index: usize,
    avatar_url: &str,
    name: &str,
    detail: &str,
    stat: &str,
    stat_word: &str,
) -> String {
    format!(
        "\n        <div class=\"list-item\">\n            <div class=\"rank {}\">{}</div>\n            <img class=\"avatar\" src=\"{}\" alt=\"User\">\n            <div class=\"info\">\n                <div class=\"name\">@{}</div>\n                <div class=\"detail\">{}</div>\n            </div>\n            <div class=\"stat\">{} <span>{}</span></div>\n        </div>\n        ",
        rank_class(index),
        index + 1,
        avatar_url,
        name,
        detail,
        stat,
        stat_word
    )
}

/// One `#`/`microphone` channel list-item row. Mirrors the
/// `{top_text_channels}` / `{top_voice_channels}` builders in
/// `!gstats.ts` / `!channel-stats.ts`.
#[allow(clippy::too_many_arguments)]
pub fn channel_list_item(
    index: usize,
    icon: &str,
    name: &str,
    category: &str,
    stat: &str,
    stat_word: &str,
    category_word: &str,
) -> String {
    format!(
        "\n        <div class=\"list-item\">\n            <div class=\"rank {}\">{}</div>\n            <div class=\"channel-icon\">{}</div>\n            <div class=\"info\">\n                <div class=\"name\">{}</div>\n                <div class=\"detail\">{}: {}</div>\n            </div>\n            <div class=\"stat\">{} <span>{}</span></div>\n        </div>\n        ",
        rank_class(index),
        index + 1,
        icon,
        name,
        category_word,
        category,
        stat,
        stat_word
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn top_period_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = TopPeriod::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["daily", "weekly", "monthly"]);
        assert_eq!(TopPeriod::Daily.as_str(), "daily");
        assert_eq!(TopPeriod::Weekly.as_str(), "weekly");
        assert_eq!(TopPeriod::Monthly.as_str(), "monthly");
        assert_eq!(TopPeriod::from_name("daily"), Some(TopPeriod::Daily));
        assert_eq!(TopPeriod::from_name("weekly"), Some(TopPeriod::Weekly));
        assert_eq!(TopPeriod::from_name("yearly"), None);
        assert_eq!(TopPeriod::from_index(0), Some(TopPeriod::Daily));
        assert_eq!(TopPeriod::from_index(2), Some(TopPeriod::Monthly));
        assert_eq!(TopPeriod::from_index(3), None);
        // Values feed parse_top_period unchanged.
        assert_eq!(parse_top_period(Some(TopPeriod::Daily.as_str())), "daily");
        assert_eq!(parse_top_period(None), "monthly");
        let list = TopPeriod::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Quotidien")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Hebdomadaire")
        );
        assert_eq!(
            list[2].localizations.get("fr").map(String::as_str),
            Some("Mensuel")
        );
        assert_eq!(TopPeriod::Weekly.localized_name("ja"), Some("weekly"));
    }

    fn msg(ts: i64, ch: u64) -> StatsMessage {
        StatsMessage {
            sent_ts: ts,
            content_len: 10,
            channel_id: ch,
        }
    }

    #[test]
    fn ts_camelcase_rows_parse_with_string_channel_ids() {
        // Exact TS DatabaseStructure shapes (onNewMessage.ts:39,
        // onVoiceUpdate.ts processSessionEnd): camelCase keys, string
        // channel ids, no aggregate counters.
        let v: serde_json::Value = serde_json::json!({
            "messages": [
                {"sentTimestamp": 1_000, "contentLength": 5, "channelId": "123"},
                {"sentTimestamp": 2_000, "contentLength": 7, "channelId": 456}
            ],
            "voices": [
                {"startTimestamp": 1_000, "endTimestamp": 61_000, "channelId": "123"}
            ]
        });
        let s: UserStats = serde_json::from_value(v).unwrap();
        assert_eq!(s.messages, 2);
        assert_eq!(s.msg_log.len(), 2);
        assert_eq!(s.msg_log[0].channel_id, 123);
        assert_eq!(s.msg_log[0].sent_ts, 1_000);
        assert_eq!(s.msg_log[0].content_len, 5);
        assert_eq!(s.msg_log[1].channel_id, 456);
        assert_eq!(s.voice_log.len(), 1);
        assert_eq!(s.voice_log[0].channel_id, 123);
        assert_eq!(s.voice_ms, 60_000);
    }

    #[test]
    fn rust_counters_win_over_derived_lengths() {
        // Mixed split-brain row: explicit Rust counters beat the
        // array-derived fallbacks, logs merge both legs.
        let v: serde_json::Value = serde_json::json!({
            "messages": 10,
            "voice_ms": 999_000,
            "msg_log": [{"sent_ts": 1, "content_len": 2, "channel_id": 9}],
            "voices": [
                {"startTimestamp": 1_000, "endTimestamp": 2_000, "channelId": "9"}
            ]
        });
        let s: UserStats = serde_json::from_value(v).unwrap();
        assert_eq!(s.messages, 10);
        assert_eq!(s.voice_ms, 999_000);
        assert_eq!(s.msg_log.len(), 1);
        assert_eq!(s.voice_log.len(), 1);
    }

    #[test]
    fn windows_match_ts_user_stats_utils() {
        // now = 3_000_000_000 (~day 34). Windows: day 86.4M, week
        // 604.8M, month 2_592_000_000 (flat 30 days, like !ustats.ts).
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
    fn top_period_and_limit_mirror_ts() {
        assert_eq!(parse_top_period(None), "monthly");
        assert_eq!(parse_top_period(Some("daily")), "daily");
        assert_eq!(parse_top_period(Some("WEEKLY")), "weekly");
        // Unknown falls back to monthly, like the TS includes() guard.
        assert_eq!(parse_top_period(Some("yearly")), "monthly");
        assert_eq!(clamp_top_limit(None), 10);
        assert_eq!(clamp_top_limit(Some(7)), 7);
        assert_eq!(clamp_top_limit(Some(1)), 5);
        assert_eq!(clamp_top_limit(Some(99)), 25);
        // Slash path: default 10, no clamp (mirrors
        // `getInteger("limit") || 10`).
        assert_eq!(slash_top_limit(None), 10);
        assert_eq!(slash_top_limit(Some(0)), 10);
        assert_eq!(slash_top_limit(Some(7)), 7);
        assert_eq!(slash_top_limit(Some(99)), 99);
        // Negatives pass through: TS applies slice(0, limit), which keeps
        // all-but-last-|limit| rows (!top-messages.ts:52,121,
        // userStatsUtils.ts:245,262).
        assert_eq!(slash_top_limit(Some(-3)), -3);
        // JS slice(0, limit) row counts at the call site.
        assert_eq!(js_slice_take(10, 10), 10);
        assert_eq!(js_slice_take(10, 7), 7);
        assert_eq!(js_slice_take(10, 99), 10);
        assert_eq!(js_slice_take(10, -3), 7);
        assert_eq!(js_slice_take(10, -10), 0);
        assert_eq!(js_slice_take(3, -99), 0);
        assert_eq!(js_slice_take(0, 10), 0);
        assert_eq!(js_slice_take(0, -3), 0);
        assert_eq!(top_period_timeout_ms("daily"), 86_400_000);
        assert_eq!(top_period_timeout_ms("weekly"), 604_800_000);
        assert_eq!(top_period_timeout_ms("monthly"), 2_592_000_000);
    }

    #[test]
    fn beautiful_durations_mirror_to_beautiful_string() {
        // en-US short names are the quirky TS ones (var_h = "hour(s)").
        assert_eq!(beautiful_voice_ms(3_600_000, "en-US"), "1hour(s)");
        assert_eq!(
            beautiful_voice_ms(90_000, "en-US"),
            "1minute(s) 30second(s)"
        );
        assert_eq!(beautiful_voice_ms(500, "en-US"), "500ms");
        // Empty renders "0"+var_m, like the TS `result === ""` leg.
        assert_eq!(beautiful_voice_ms(0, "en-US"), "0minute(s)");
        // Window predicate: end_ts inside the timeout counts.
        let now = 3_000_000_000i64;
        let voices = vec![
            StatsVoice {
                start_ts: now - 2_000,
                end_ts: now - 1_000,
                channel_id: 1,
            },
            StatsVoice {
                start_ts: now - 200_000_000,
                end_ts: now - 100_000_000,
                channel_id: 1,
            },
        ];
        assert_eq!(voice_window_total(&voices, now, 86_400_000), 1_000);
        assert_eq!(voice_window_total(&voices, now, 604_800_000), 100_001_000);
        let log = vec![msg(now - 1_000, 1), msg(now - 200_000_000, 2)];
        assert_eq!(msg_window_count(&log, now, 86_400_000), 1);
        assert_eq!(msg_window_count(&log, now, 604_800_000), 2);
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
    async fn ts_shape_pushes_match_dashboard_keys() {
        // Dashboard/gateway parity: message + voice writers must append
        // TS-camelCase records into `messages[]` / `voices[]` arrays
        // (string channel ids), exactly like db.push in the TS events.
        let pool = memory_pool().await;
        push_ts_stats_message(&pool, "g1", 7, 42, 5, 1000).await;
        push_ts_stats_message(&pool, "g1", 7, 43, 6, 2000).await;
        push_ts_stats_voice(&pool, "g1", 7, 44, 3000, 4000).await;
        let raw = table_value_or_legacy(&pool, "g1", &stats_key(7))
            .await
            .expect("row");
        assert_eq!(raw["messages"][0]["channelId"], "42");
        assert_eq!(raw["messages"][0]["contentLength"], 5);
        assert_eq!(raw["messages"][0]["sentTimestamp"], 1000);
        assert_eq!(raw["messages"].as_array().unwrap().len(), 2);
        assert_eq!(raw["voices"][0]["channelId"], "44");
        assert_eq!(raw["voices"][0]["startTimestamp"], 3000);
        assert_eq!(raw["voices"][0]["endTimestamp"], 4000);
        // Rust readers still decode the TS-shaped row.
        let loaded = load_stats(&pool, "g1", 7).await;
        assert_eq!(loaded.messages, 2);
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
    }

    #[test]
    fn channel_aggregate_filters_by_channel_like_ts() {
        // now = 3_000_000_000. User 1: two recent + one stale message in
        // channel 9, plus a voice session; user 2: rows in channel 10
        // only (must not leak into the channel-9 aggregate).
        let now = 3_000_000_000i64;
        let u1 = UserStats {
            msg_log: vec![
                msg(now - 1_000, 9),
                msg(now - 100_000_000, 9),
                msg(now - 2_700_000_000, 9),
            ],
            voice_log: vec![StatsVoice {
                start_ts: now - 2_000,
                end_ts: now - 1_000,
                channel_id: 9,
            }],
            ..Default::default()
        };
        let u2 = UserStats {
            msg_log: vec![msg(now - 1_000, 10)],
            ..Default::default()
        };
        let agg = aggregate_channel(&[(1, u1), (2, u2)], 9, now);
        assert_eq!(agg.total_messages, 3);
        assert_eq!(agg.daily_messages, 1);
        assert_eq!(agg.weekly_messages, 2);
        assert_eq!(agg.monthly_messages, 2);
        assert_eq!(agg.total_voice_ms, 1_000);
        assert_eq!(agg.daily_voice_ms, 1_000);
        assert_eq!(agg.active_users, 1);
        assert_eq!(agg.top_message_users, vec![(1, 3)]);
        assert_eq!(agg.top_voice_users, vec![(1, 1_000)]);
        // Unknown channel: zeros, no users.
        let empty = aggregate_channel(&[(1, UserStats::default())], 42, now);
        assert_eq!(empty, ChannelAggregate::default());
    }

    #[test]
    fn guild_windows_and_top_channels_match_gstats_ts() {
        let now = 3_000_000_000i64;
        let u1 = UserStats {
            msg_log: vec![msg(now - 1_000, 9), msg(now - 700_000_000, 10)],
            voice_log: vec![StatsVoice {
                start_ts: now - 2_000,
                end_ts: now - 1_000,
                channel_id: 7,
            }],
            ..Default::default()
        };
        let rows = vec![(1u64, u1)];
        let members = guild_member_windows(&rows, now);
        assert_eq!(members.len(), 1);
        assert_eq!(members[0].daily_messages, 1);
        assert_eq!(members[0].weekly_messages, 1);
        assert_eq!(members[0].monthly_messages, 2);
        assert_eq!(members[0].daily_voice_ms, 1_000);
        let (text, voice) = guild_top_channels(&rows, now);
        // Only day-window rows rank (mirrors topThree on daily keys).
        assert_eq!(text, vec![(9, 1)]);
        assert_eq!(voice, vec![(7, 1_000)]);
    }

    #[test]
    fn card_helpers_mirror_ts_shapes() {
        assert_eq!(rank_class(0), "rank-1");
        assert_eq!(rank_class(2), "rank-3");
        assert_eq!(rank_class(5), "");
        assert_eq!(top_board_height(0), 200);
        assert_eq!(top_board_height(5), 800);
        // Math.min(1080, 200 + n*120).
        assert_eq!(top_board_height(10), 1080);
        assert_eq!(top_board_height(25), 1080);
        let row = member_list_item(0, "av", "bob", "Total: 3", "3", "Messages");
        assert!(row.contains("rank-1"));
        assert!(row.contains("@bob"));
        let ch = channel_list_item(1, "#", "general", "Cat", "5", "Messages", "Category");
        assert!(ch.contains("rank-2"));
        assert!(ch.contains("Category: Cat"));
        // 30 labels, oldest first, "Oct 13" shape.
        let labels = time_labels_30d(1_760_000_000_000);
        assert_eq!(labels.len(), 30);
        assert!(labels[29].contains(' '));
        // Buckets: today + yesterday land at 29/28.
        let now = 1_760_000_000_000i64;
        let msgs = vec![msg(now - 1_000, 9), msg(now - 86_400_000 - 1_000, 9)];
        let b = message_buckets_30d(&msgs, now);
        assert_eq!(b[29], 1);
        assert_eq!(b[28], 1);
        assert_eq!(b.iter().sum::<u64>(), 2);
        let voices = vec![StatsVoice {
            start_ts: now - 60_000,
            end_ts: now,
            channel_id: 7,
        }];
        let vb = voice_buckets_30d(&voices, now);
        assert!((vb[29] - 1.0).abs() < 1e-9);
        // "October 13, 2026, 02:30 PM" shape.
        assert_eq!(
            format_current_date(1_791_901_800_000),
            "October 13, 2026, 02:30 PM"
        );
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

#[cfg(test)]
mod localization_tests {

    type LocCmd = poise::Command<crate::commands::Data, crate::commands::Error>;

    fn find_path<'a>(cmds: &'a [LocCmd], path: &[&str]) -> &'a LocCmd {
        let cmd = cmds
            .iter()
            .find(|c| c.name == path[0])
            .unwrap_or_else(|| panic!("command {} missing", path.join(" ")));
        if path.len() == 1 {
            cmd
        } else {
            find_path(&cmd.subcommands, &path[1..])
        }
    }

    #[test]
    fn loc_stats() {
        // TS stats/stats.ts (`stats`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous-groupé pour la catégorie des statistique des utilisateurs!")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("統計カテゴリのサブコマンド！")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
    }

    #[test]
    fn loc_channel_stats() {
        // TS stats/stats.ts (`channel-stats`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats", "channel-stats"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Voir les statistiques d'un canal spécifique")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("特定のチャンネルの統計を表示")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "channel")
            .expect("param channel");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Le canal à analyser")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("分析するチャンネル")
        );
    }

    #[test]
    fn loc_compare() {
        // TS stats/stats.ts (`compare`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats", "compare"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Comparer les statistiques entre plusieurs utilisateurs")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("複数ユーザー間の統計を比較")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "user1")
            .expect("param user1");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Premier utilisateur à comparer")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("比較する1人目のユーザー")
        );
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "user2")
            .expect("param user2");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Deuxième utilisateur à comparer")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("比較する2人目のユーザー")
        );
    }

    #[test]
    fn loc_top_messages() {
        // TS stats/stats.ts (`top-messages`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats", "top-messages"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Voir le top des utilisateurs par messages")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("メッセージ数トップユーザーを表示")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "period")
            .expect("param period");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Période (quotidien, hebdomadaire, mensuel)")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("期間（デイリー、ウィークリー、マンスリー）")
        );
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "limit")
            .expect("param limit");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("表示するユーザー数（デフォルト: 10, 最大: 25）")
        );
    }

    #[test]
    fn loc_top_voice() {
        // TS stats/stats.ts (`top-voice`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats", "top-voice"]);
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Voir le top des utilisateurs par activité vocale")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("ボイスアクティビティトップユーザーを表示")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "period")
            .expect("param period");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Période (quotidien, hebdomadaire, mensuel)")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("期間（デイリー、ウィークリー、マンスリー）")
        );
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "limit")
            .expect("param limit");
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("Nombre d'utilisateurs à afficher (par défaut: 10, max: 25)")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("表示するユーザー数（デフォルト: 10, 最大: 25）")
        );
    }

    #[test]
    fn loc_ustats() {
        // TS stats/stats.ts (`ustats`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats", "ustats"]);
        assert_eq!(cmd.description.as_deref(), Some("See profil"));
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Regarder un profil")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("プロフィールを表示")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        let prm = cmd
            .parameters
            .iter()
            .find(|x| x.name == "member")
            .expect("param member");
        assert_eq!(prm.description.as_deref(), Some("The member you want"));
        assert_eq!(
            prm.description_localizations.get("fr").map(String::as_str),
            Some("L'utilisateur que vous souhaiter")
        );
        assert_eq!(
            prm.description_localizations.get("ja").map(String::as_str),
            Some("対象のメンバー")
        );
    }

    #[test]
    fn loc_gstats() {
        // TS stats/stats.ts (`gstats`)
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats", "gstats"]);
        assert_eq!(cmd.description.as_deref(), Some("See guild leaderboard"));
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Regarder le classement du serveur")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("サーバーランキングを表示")
        );
        assert_eq!(cmd.description_localizations.len(), 4);
        assert!(cmd.parameters.is_empty());
    }

    #[test]
    fn default_descriptions_mirror_ts() {
        // TS stats/stats.ts: every subcommand + param default description,
        // byte-wise (poise takes the first doc paragraph as description).
        let cmds = crate::commands::all();
        let cmd = find_path(&cmds, &["stats"]);
        assert_eq!(
            cmd.description.as_deref(),
            Some("Subcommand for stats category!")
        );
        let desc = |path: &[&str]| -> Option<String> { find_path(&cmds, path).description.clone() };
        assert_eq!(
            desc(&["stats", "top-messages"]),
            Some("See top users by messages".to_string())
        );
        assert_eq!(
            desc(&["stats", "top-voice"]),
            Some("See top users by voice activity".to_string())
        );
        assert_eq!(
            desc(&["stats", "compare"]),
            Some("Compare statistics between multiple users".to_string())
        );
        assert_eq!(
            desc(&["stats", "channel-stats"]),
            Some("See statistics for a specific channel".to_string())
        );
        let prm_desc = |path: &[&str], name: &str| -> Option<String> {
            find_path(&cmds, path)
                .parameters
                .iter()
                .find(|x| x.name == name)
                .unwrap_or_else(|| panic!("param {name}"))
                .description
                .clone()
        };
        assert_eq!(
            prm_desc(&["stats", "top-messages"], "period"),
            Some("Time period (daily, weekly, monthly)".to_string())
        );
        assert_eq!(
            prm_desc(&["stats", "top-messages"], "limit"),
            Some("Number of users to show (default: 10, max: 25)".to_string())
        );
        assert_eq!(
            prm_desc(&["stats", "top-voice"], "period"),
            Some("Time period (daily, weekly, monthly)".to_string())
        );
        assert_eq!(
            prm_desc(&["stats", "top-voice"], "limit"),
            Some("Number of users to show (default: 10, max: 25)".to_string())
        );
        assert_eq!(
            prm_desc(&["stats", "compare"], "user1"),
            Some("First user to compare".to_string())
        );
        assert_eq!(
            prm_desc(&["stats", "compare"], "user2"),
            Some("Second user to compare".to_string())
        );
        assert_eq!(
            prm_desc(&["stats", "channel-stats"], "channel"),
            Some("The channel to analyze".to_string())
        );
    }
}
