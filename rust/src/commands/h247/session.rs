// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// In-memory H24/7 session state. Mirrors the module-level maps in
// src/core/modules/h247Manager.ts: h247Sessions (enabled sessions),
// h247VoiceSessions (voice handshake cache), h247NegativeCache
// (guilds resolved as not-enabled + timestamp), h247EventRejoinCooldowns
// and h247WatchdogWarns.
//
// Notes on the Rust mapping:
// - The voice-handshake credential cache (channel/session/token/
//   endpoint) already lives in lavalink.rs `pending_voice`, fed by both
//   voice_state_update and voice_server_update arms; it is not
//   duplicated here. `prime_session` only records the parked channel.
// - The lavalink manager owns the canonical shard registry, but it
//   exposes no messenger accessor and lavalink.rs is out of scope, so
//   the watchdog keeps its own guild -> ShardMessenger mirror, noted
//   from event arms (which run on the guild's serving shard) and
//   pruned on guild_delete. Entries are tiny clones; the map is capped
//   so a pathological guild count cannot grow it without bound.

use poise::serenity_prelude as serenity;
use std::collections::HashMap;
use std::sync::OnceLock;

struct SessionState {
    parked: HashMap<u64, u64>,
    negative: HashMap<u64, i64>,
    warns: HashMap<u64, i64>,
    cooldowns: HashMap<u64, i64>,
    messengers: HashMap<u64, serenity::ShardMessenger>,
}

/// Max guild->messenger entries (safety cap; one entry per guild with
/// observed voice/guild activity would otherwise grow without bound).
pub const MAX_MESSENGERS: usize = 20_000;

fn state() -> &'static tokio::sync::Mutex<SessionState> {
    static STATE: OnceLock<tokio::sync::Mutex<SessionState>> = OnceLock::new();
    STATE.get_or_init(|| {
        tokio::sync::Mutex::new(SessionState {
            parked: HashMap::new(),
            negative: HashMap::new(),
            warns: HashMap::new(),
            cooldowns: HashMap::new(),
            messengers: HashMap::new(),
        })
    })
}

/// Record (or refresh) a parked H24/7 session. Mirrors the
/// h247Sessions.set + ensureH247VoiceSession legs of setH247Data /
/// recoverH247Sessions / ensureH247VoicePresence.
pub async fn prime_session(guild_id: u64, channel_id: u64) {
    let mut s = state().lock().await;
    s.parked.insert(guild_id, channel_id);
    s.negative.remove(&guild_id);
}

/// Drop every in-memory record for a guild. Mirrors deleteH247Data
/// (plus the disabled branch of setH247Data / ensureH247VoicePresence).
pub async fn clear_guild(guild_id: u64) {
    let mut s = state().lock().await;
    s.parked.remove(&guild_id);
    s.negative.remove(&guild_id);
    s.warns.remove(&guild_id);
    s.cooldowns.remove(&guild_id);
}

/// Parked channel for a guild, if the session mirror knows it.
pub async fn parked_channel(guild_id: u64) -> Option<u64> {
    state().lock().await.parked.get(&guild_id).copied()
}

/// Snapshot of all parked sessions for the watchdog tick.
pub async fn parked_snapshot() -> Vec<(u64, u64)> {
    state()
        .lock()
        .await
        .parked
        .iter()
        .map(|(g, c)| (*g, *c))
        .collect()
}

/// Negative-cache read: true while the guild may skip its H247 DB
/// read. Pure leg in voice.rs (`h247_negative_cached`).
pub async fn negative_hit(guild_id: u64, now_ms: i64) -> bool {
    match state().lock().await.negative.get(&guild_id).copied() {
        Some(at) => crate::voice::h247_negative_cached(at, now_ms),
        None => false,
    }
}

/// Record a "not enabled" resolution (mirrors the negative-cache set).
pub async fn note_negative(guild_id: u64, now_ms: i64) {
    state().lock().await.negative.insert(guild_id, now_ms);
}

/// Drop a negative entry (mirrors the delete on setH247Data enabled).
pub async fn clear_negative(guild_id: u64) {
    state().lock().await.negative.remove(&guild_id);
}

/// Warn throttle: true when a watchdog warning for the guild is due.
/// Pure leg in voice.rs (`h247_warn_due`); stamps on due.
pub async fn warn_due(guild_id: u64, now_ms: i64) -> bool {
    let mut s = state().lock().await;
    let due = crate::voice::h247_warn_due(s.warns.get(&guild_id).copied(), now_ms);
    if due {
        s.warns.insert(guild_id, now_ms);
    }
    due
}

/// Clear a guild's warn stamp after a successful restore (mirrors
/// h247WatchdogWarns.delete on joined).
pub async fn clear_warn(guild_id: u64) {
    state().lock().await.warns.remove(&guild_id);
}

/// Event-rejoin cooldown: true when a voice-state-driven rejoin may
/// run now (stamps on due). Pure leg in voice.rs
/// (`h247_event_rejoin_due`).
pub async fn event_rejoin_due(guild_id: u64, now_ms: i64) -> bool {
    let mut s = state().lock().await;
    let last = s.cooldowns.get(&guild_id).copied();
    if crate::voice::h247_event_rejoin_due(last, now_ms) {
        s.cooldowns.insert(guild_id, now_ms);
        true
    } else {
        false
    }
}

/// Remember the serving shard messenger for a guild (called from event
/// arms, which run on the guild's shard).
pub async fn note_messenger(guild_id: u64, messenger: serenity::ShardMessenger) {
    let mut s = state().lock().await;
    if s.messengers.len() >= MAX_MESSENGERS && !s.messengers.contains_key(&guild_id) {
        return;
    }
    s.messengers.insert(guild_id, messenger);
}

/// Messenger for watchdog/ retry OP4 sends, if one was noted.
pub async fn messenger_for(guild_id: u64) -> Option<serenity::ShardMessenger> {
    state().lock().await.messengers.get(&guild_id).cloned()
}

/// Drop a guild's messenger (mirrors guild_delete cleanup).
pub async fn prune_messenger(guild_id: u64) {
    state().lock().await.messengers.remove(&guild_id);
}
