// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/modules/playerManager.ts + musicPlay.ts +
// music_proximity.ts + searchLyrics.ts + ttsManager.ts + h247Manager.ts.
//
// TS stack: lavalink-client (LavalinkManager, nodes, queue), youtubei.js +
// spotify/apple/amazon/tidal-metadata forks, Flowery TTS (ftts source),
// H247 24/7 parking. Rust equivalents: lavalink-rs, yt-dlp, rspotify,
// reqwest (Flowery/lyrics). This module hosts the pure parts: source
// routing, proximity choice, anti-conflict guards, volume/threshold
// clamps. Network/audio wiring comes later.

/// Music source providers mirrored from musicPlay.ts routing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MusicSource {
    Spotify,
    YouTube,
    Apple,
    Amazon,
    Tidal,
    Deezer,
    SoundCloud,
}

pub fn route_source(url: &str) -> MusicSource {
    let u = url.to_ascii_lowercase();
    if u.contains("spotify.") {
        MusicSource::Spotify
    } else if u.contains("youtube.") || u.contains("youtu.be") {
        MusicSource::YouTube
    } else if u.contains("music.apple.") {
        MusicSource::Apple
    } else if u.contains("music.amazon.") {
        MusicSource::Amazon
    } else if u.contains("tidal.") {
        MusicSource::Tidal
    } else if u.contains("deezer.") {
        MusicSource::Deezer
    } else {
        MusicSource::SoundCloud
    }
}

/// Levenshtein edit distance. Mirrors music_proximity.ts
/// levenshtein() (TS indexes UTF-16 code units; char iteration here
/// is identical for BMP text).
pub fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    let mut cur = vec![0usize; b.len() + 1];
    for i in 1..=a.len() {
        cur[0] = i;
        for j in 1..=b.len() {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            cur[j] = (prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    prev[b.len()]
}

/// Normalized string similarity. Mirrors similarity()
/// (lowercased both sides, 1.0 when both empty).
pub fn similarity(a: &str, b: &str) -> f64 {
    let lowered_a = a.to_lowercase();
    let lowered_b = b.to_lowercase();
    let max_len = lowered_a.chars().count().max(lowered_b.chars().count());
    if max_len == 0 {
        return 1.0;
    }
    1.0 - levenshtein(&lowered_a, &lowered_b) as f64 / max_len as f64
}

/// Word-level similarity gate. Mirrors isSimilar(query, track,
/// threshold = 0.5, wordThreshold): each query word must reach
/// wordThreshold against its best "author title" word, and the hit
/// fraction must reach threshold. Empty queries never match
/// (TS yields NaN, which fails the comparison).
pub fn is_similar(
    query: &str,
    author: &str,
    title: &str,
    threshold: f64,
    word_threshold: f64,
) -> bool {
    let query_words: Vec<&str> = query.split_whitespace().collect();
    if query_words.is_empty() {
        return false;
    }
    let track = format!("{author} {title}");
    let track_words: Vec<&str> = track.split_whitespace().collect();
    let mut hits = 0;
    for q in &query_words {
        let best = track_words
            .iter()
            .map(|t| similarity(q, t))
            .fold(0.0f64, f64::max);
        if best >= word_threshold {
            hits += 1;
        }
    }
    hits as f64 / query_words.len() as f64 >= threshold
}

/// "title author" search label. Mirrors buildTrackLabel()
/// (note: title first, unlike the "author title" order in
/// isSimilar — preserved exactly).
pub fn track_label(author: &str, title: &str) -> String {
    format!("{title} {author}").trim().to_string()
}

/// Deezer-vs-SoundCloud winner. Mirrors the strict `>` comparison
/// in searchQueryOnNode (ties keep Deezer).
pub fn soundcloud_beats_deezer(deezer_score: f64, soundcloud_score: f64) -> bool {
    soundcloud_score > deezer_score
}

/// Anti-conflict guard. Mirrors handleMusicPlay + tts/!join.ts + h247/!join.ts:
/// music is refused when the user is not in the H247 channel or when the
/// bot is busy elsewhere; TTS takes over an idle player.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AudioConflict {
    Ok,
    H247Refused,
    BusyElsewhere,
    TtsActive,
}

pub fn music_guard(
    h247_enabled: bool,
    user_in_h247_channel: bool,
    bot_busy_elsewhere: bool,
    tts_active: bool,
) -> AudioConflict {
    if h247_enabled && !user_in_h247_channel {
        AudioConflict::H247Refused
    } else if bot_busy_elsewhere {
        AudioConflict::BusyElsewhere
    } else if tts_active {
        AudioConflict::TtsActive
    } else {
        AudioConflict::Ok
    }
}

/// Volume clamp 10..=100 mirroring !volume.ts choices.
pub fn clamp_volume(v: i64) -> i64 {
    v.clamp(10, 100)
}

/// H247 24/7 timing. Mirrors the constants at the top of
/// src/core/modules/h247Manager.ts. The live rejoin/watchdog I/O
/// stays TS-side (lavalink-client + gateway); the pure gates below
/// keep the Rust event arm (h247_rejoin_target in
/// commands/h247/grant.rs, wired in voice_state_update) from looping.
pub const H247_REJOIN_DELAY_MS: i64 = 1_000;
pub const H247_REJOIN_RETRY_MS: i64 = 2_000;
pub const H247_REJOIN_MAX_ATTEMPTS: u32 = 3;
pub const H247_JOIN_CONFIRM_INTERVAL_MS: i64 = 300;
pub const H247_JOIN_CONFIRM_ATTEMPTS: u32 = 8;
pub const H247_DISCONNECT_OBSERVE_INTERVAL_MS: i64 = 500;
pub const H247_DISCONNECT_OBSERVE_ATTEMPTS: u32 = 10;
pub const H247_EVENT_REJOIN_COOLDOWN_MS: i64 = 5_000;
pub const H247_WATCHDOG_WARN_INTERVAL_MS: i64 = 30 * 60_000;
pub const H247_NEGATIVE_CACHE_TTL_MS: i64 = 30 * 60_000;

/// Event-arm rejoin gate. Mirrors h247EventRejoinCooldowns: a voice
/// state change may trigger a rejoin only when no attempt ran in the
/// last H247_EVENT_REJOIN_COOLDOWN_MS (no record yet means due).
pub fn h247_event_rejoin_due(last_attempt_ms: Option<i64>, now_ms: i64) -> bool {
    match last_attempt_ms {
        None => true,
        Some(last) => now_ms.saturating_sub(last) >= H247_EVENT_REJOIN_COOLDOWN_MS,
    }
}

/// Attempts left, mirroring H247_REJOIN_MAX_ATTEMPTS.
pub fn h247_rejoin_attempts_left(attempts: u32) -> bool {
    attempts < H247_REJOIN_MAX_ATTEMPTS
}

/// Negative-cache validity. Mirrors h247NegativeCache: a guild
/// resolved as "H24/7 not enabled" skips the DB read until the TTL
/// elapses.
pub fn h247_negative_cached(resolved_at_ms: i64, now_ms: i64) -> bool {
    now_ms.saturating_sub(resolved_at_ms) < H247_NEGATIVE_CACHE_TTL_MS
}

/// In-memory track queue. Mirrors the Lavalink player queue surface used
/// by musicPlay.ts (!play/skip/clear-queue/shuffle/queue): append, skip,
/// clear, deterministic shuffle (seeded xorshift, no RNG dep).
#[derive(Debug, Clone, Default)]
pub struct TrackQueue {
    pub tracks: Vec<String>,
}

impl TrackQueue {
    pub fn push(&mut self, t: String) {
        self.tracks.push(t);
    }

    pub fn push_many(&mut self, ts: Vec<String>) {
        self.tracks.extend(ts);
    }

    pub fn skip(&mut self) -> Option<String> {
        if self.tracks.is_empty() {
            None
        } else {
            Some(self.tracks.remove(0))
        }
    }

    pub fn clear(&mut self) -> usize {
        let n = self.tracks.len();
        self.tracks.clear();
        n
    }

    pub fn shuffle(&mut self, seed: u64) {
        let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
        for i in (1..self.tracks.len()).rev() {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let j = (state % (i as u64 + 1)) as usize;
            self.tracks.swap(i, j);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn source_routing_mirrors_ts() {
        assert_eq!(
            route_source("https://open.spotify.com/track/x"),
            MusicSource::Spotify
        );
        assert_eq!(route_source("https://youtu.be/x"), MusicSource::YouTube);
        assert_eq!(
            route_source("https://music.apple.com/x"),
            MusicSource::Apple
        );
        assert_eq!(
            route_source("https://music.amazon.com/x"),
            MusicSource::Amazon
        );
        assert_eq!(route_source("https://tidal.com/x"), MusicSource::Tidal);
        assert_eq!(route_source("https://deezer.com/x"), MusicSource::Deezer);
        assert_eq!(route_source("free text query"), MusicSource::SoundCloud);
    }

    #[test]
    fn levenshtein_and_similarity_match_ts() {
        assert_eq!(levenshtein("kitten", "sitting"), 3);
        assert_eq!(levenshtein("", "abc"), 3);
        assert_eq!(levenshtein("same", "same"), 0);
        assert_eq!(similarity("", ""), 1.0);
        assert_eq!(similarity("Never", "never"), 1.0);
        assert!((similarity("kitten", "sitting") - (1.0 - 3.0 / 7.0)).abs() < 1e-9);
    }

    #[test]
    fn is_similar_uses_musicplay_thresholds() {
        // Call shape from musicPlay.ts: isSimilar(query, track, 0.5, 0.6).
        assert!(is_similar("never gonna", "x", "never gonna live", 0.5, 0.6));
        assert!(!is_similar("hello world", "x", "goodbye moon", 0.5, 0.6));
        assert!(!is_similar("", "x", "never gonna", 0.5, 0.6));
        assert!(!is_similar("   ", "x", "never gonna", 0.5, 0.6));
    }

    #[test]
    fn track_label_and_tiebreak_mirror_ts() {
        assert_eq!(track_label("author", "title"), "title author");
        assert!(!soundcloud_beats_deezer(0.8, 0.8));
        assert!(soundcloud_beats_deezer(0.8, 0.9));
        assert!(!soundcloud_beats_deezer(0.9, 0.8));
    }

    #[test]
    fn guard_priority_h247_then_busy_then_tts() {
        assert_eq!(
            music_guard(true, false, false, false),
            AudioConflict::H247Refused
        );
        assert_eq!(
            music_guard(false, true, true, false),
            AudioConflict::BusyElsewhere
        );
        assert_eq!(
            music_guard(false, true, false, true),
            AudioConflict::TtsActive
        );
        assert_eq!(music_guard(false, true, false, false), AudioConflict::Ok);
    }

    #[test]
    fn volume_clamps_like_ts() {
        assert_eq!(clamp_volume(5), 10);
        assert_eq!(clamp_volume(50), 50);
        assert_eq!(clamp_volume(150), 100);
    }

    #[test]
    fn h247_timing_mirrors_manager_consts() {
        assert_eq!(H247_REJOIN_DELAY_MS, 1_000);
        assert_eq!(H247_REJOIN_RETRY_MS, 2_000);
        assert_eq!(H247_REJOIN_MAX_ATTEMPTS, 3);
        assert_eq!(H247_JOIN_CONFIRM_INTERVAL_MS, 300);
        assert_eq!(H247_JOIN_CONFIRM_ATTEMPTS, 8);
        assert_eq!(H247_DISCONNECT_OBSERVE_INTERVAL_MS, 500);
        assert_eq!(H247_DISCONNECT_OBSERVE_ATTEMPTS, 10);
        assert_eq!(H247_EVENT_REJOIN_COOLDOWN_MS, 5_000);
        assert_eq!(H247_WATCHDOG_WARN_INTERVAL_MS, 30 * 60_000);
        assert_eq!(H247_NEGATIVE_CACHE_TTL_MS, 30 * 60_000);
        // Rejoin gate: first event always due, then 5s cooldown.
        assert!(h247_event_rejoin_due(None, 10_000));
        assert!(!h247_event_rejoin_due(Some(10_000), 10_000 + 4_999));
        assert!(h247_event_rejoin_due(Some(10_000), 10_000 + 5_000));
        assert!(h247_rejoin_attempts_left(0));
        assert!(h247_rejoin_attempts_left(2));
        assert!(!h247_rejoin_attempts_left(3));
        // Negative cache: valid inside the TTL only.
        assert!(h247_negative_cached(0, H247_NEGATIVE_CACHE_TTL_MS - 1));
        assert!(!h247_negative_cached(0, H247_NEGATIVE_CACHE_TTL_MS));
    }

    #[test]
    fn queue_skip_clear() {
        let mut q = TrackQueue::default();
        assert_eq!(q.skip(), None);
        q.push_many(vec!["a".into(), "b".into(), "c".into()]);
        assert_eq!(q.skip().as_deref(), Some("a"));
        assert_eq!(q.clear(), 2);
        assert!(q.tracks.is_empty());
    }

    #[test]
    fn queue_shuffle_keeps_all_tracks() {
        let mut q = TrackQueue::default();
        q.push_many((0..10).map(|i| i.to_string()).collect());
        q.shuffle(42);
        let mut sorted = q.tracks.clone();
        sorted.sort();
        assert_eq!(sorted, (0..10).map(|i| i.to_string()).collect::<Vec<_>>());
    }
}
