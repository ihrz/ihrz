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

/// Proximity fallback choice. Mirrors music_proximity.ts isSimilar()
/// word-overlap heuristic with 0.5/0.6 thresholds: pick Deezer when the
/// candidate is close to the query, else SoundCloud.
pub fn proximity_pick(query_words: &[&str], candidate_words: &[&str]) -> MusicSource {
    if query_words.is_empty() || candidate_words.is_empty() {
        return MusicSource::SoundCloud;
    }
    let hits = query_words
        .iter()
        .filter(|w| candidate_words.contains(w))
        .count();
    let ratio = hits as f64 / query_words.len().max(candidate_words.len()) as f64;
    if ratio >= 0.5 {
        MusicSource::Deezer
    } else {
        MusicSource::SoundCloud
    }
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
    fn proximity_picks_deezer_on_close_match() {
        assert_eq!(
            proximity_pick(&["never", "gonna"], &["never", "gonna", "live"]),
            MusicSource::Deezer
        );
        assert_eq!(
            proximity_pick(&["hello", "world"], &["goodbye", "moon"]),
            MusicSource::SoundCloud
        );
        assert_eq!(proximity_pick(&[], &["x"]), MusicSource::SoundCloud);
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
