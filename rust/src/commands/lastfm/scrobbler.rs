// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors `LastFMScrobblerManager` per-listener HTTP legs in
// src/core/modules/lastFMScrobblerManager.ts: `track.updateNowPlaying`
// + `track.scrobble` signed calls, the invalid-session detector
// (error 9 / /session/i), and the elapsed/threshold clock
// (`getElapsedListeningMs`, `getThresholdMs`, `shouldScrobble`).
// Guild-session bookkeeping lives in `crate::lavalink`; per-user
// session keys stay behind `LASTFM.<uid>` rows (super::lastfm_settings).

use super::login::{lastfm_signed_fields, LASTFM_API_URL};

/// Last.fm API error shape. Mirrors `LastFMApiResponse`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LastFmError {
    pub code: Option<i64>,
    pub message: String,
}

/// `isInvalidSessionError` mirror: error 9 or a session-flavoured
/// message means the stored session key is dead (caller invalidates
/// the user row, exactly like the TS attach/scrobble legs).
pub fn is_invalid_session_error(code: Option<i64>, message: &str) -> bool {
    if code == Some(9) {
        return true;
    }
    message
        .to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .any(|w| w == "session")
}

/// `getThresholdMs` mirror: half the track, capped at 4 minutes.
pub fn scrobble_threshold_ms(duration_ms: u64) -> u64 {
    (duration_ms / 2).min(240_000)
}

/// `shouldScrobble` mirror: tracks under 30s never count (streams
/// carry duration 0 and are excluded by the same gate).
pub fn should_scrobble(duration_ms: u64) -> bool {
    duration_ms >= 30_000
}

/// `getElapsedListeningMs` mirror: wall time minus the start minus
/// banked pauses minus any still-open pause.
pub fn elapsed_listening_ms(
    started_ms: i64,
    paused_ms: u64,
    pause_started_ms: Option<i64>,
    now_ms: i64,
) -> u64 {
    let open = pause_started_ms
        .map(|s| (now_ms - s).max(0) as u64)
        .unwrap_or(0);
    let wall = (now_ms - started_ms).max(0) as u64;
    wall.saturating_sub(paused_ms).saturating_sub(open)
}

/// Remaining ms before the listen counts (mirrors `scheduleScrobble`'s
/// `thresholdMs - elapsed` computation; `None` when already due or
/// the track is too short to ever count).
pub fn scrobble_remaining_ms(
    duration_ms: u64,
    started_ms: i64,
    paused_ms: u64,
    pause_started_ms: Option<i64>,
    now_ms: i64,
) -> Option<u64> {
    if !should_scrobble(duration_ms) {
        return None;
    }
    let threshold = scrobble_threshold_ms(duration_ms);
    let elapsed = elapsed_listening_ms(started_ms, paused_ms, pause_started_ms, now_ms);
    if elapsed >= threshold {
        None
    } else {
        Some(threshold - elapsed)
    }
}

/// Track identity shared by both calls (mirrors `LastFMTrackData`;
/// `started_sec` is the unix-seconds listen start, i.e.
/// `floor(startedAt/1000)`, used only by the scrobble call).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScrobbleTrack {
    pub artist: String,
    pub title: String,
    pub album: Option<String>,
    pub duration_ms: u64,
    pub started_sec: i64,
}
/// Duration leg shared by both calls: whole seconds, dropped when
/// the track has no known length (TS passes `undefined`, the signer
/// drops empty values).
fn duration_secs(duration_ms: u64) -> Option<String> {
    if duration_ms > 0 {
        Some((duration_ms / 1000).to_string())
    } else {
        None
    }
}

/// `updateNowPlaying` field builder (album / artist / duration / sk /
/// track, signed). `None` duration is left out by the signer.
pub fn now_playing_fields(
    api_key: &str,
    shared_secret: &str,
    session_key: &str,
    track: &ScrobbleTrack,
) -> Vec<(String, String)> {
    let dur = duration_secs(track.duration_ms);
    let params: Vec<(&str, &str)> = [
        ("album", track.album.as_deref().unwrap_or("")),
        ("artist", track.artist.as_str()),
        ("duration", dur.as_deref().unwrap_or("")),
        ("sk", session_key),
        ("track", track.title.as_str()),
    ]
    .into_iter()
    .collect();
    lastfm_signed_fields(api_key, shared_secret, "track.updateNowPlaying", &params)
}

/// `scrobbleTrack` field builder (adds `chosenByUser=1` + the listen
/// start timestamp, mirroring the TS call exactly).
pub fn scrobble_fields(
    api_key: &str,
    shared_secret: &str,
    session_key: &str,
    track: &ScrobbleTrack,
) -> Vec<(String, String)> {
    let dur = duration_secs(track.duration_ms);
    let ts = track.started_sec.to_string();
    let params: Vec<(&str, &str)> = [
        ("album", track.album.as_deref().unwrap_or("")),
        ("artist", track.artist.as_str()),
        ("chosenByUser", "1"),
        ("duration", dur.as_deref().unwrap_or("")),
        ("sk", session_key),
        ("timestamp", ts.as_str()),
        ("track", track.title.as_str()),
    ]
    .into_iter()
    .collect();
    lastfm_signed_fields(api_key, shared_secret, "track.scrobble", &params)
}

/// POST a signed field set, mapping the wire shape back to the
/// `LastFMApiResponse` contract (non-2xx or an `error` member =
/// failure with code + message, like `callLastFM`).
async fn post_signed(
    fields: Vec<(String, String)>,
    method: &str,
) -> Result<serde_json::Value, LastFmError> {
    let res = reqwest::Client::new()
        .post(LASTFM_API_URL)
        .form(&fields)
        .send()
        .await
        .map_err(|e| LastFmError {
            code: None,
            message: e.to_string(),
        })?;
    let status = res.status();
    let body = res.text().await.unwrap_or_default();
    let payload: serde_json::Value = serde_json::from_str(&body).unwrap_or_default();
    if !status.is_success() || payload.get("error").is_some() {
        let code = payload
            .get("error")
            .and_then(|e| e.as_i64())
            .or(if status.is_success() {
                None
            } else {
                Some(status.as_u16() as i64)
            });
        let message = payload
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or_else(|| status.canonical_reason().unwrap_or(method))
            .to_string();
        return Err(LastFmError { code, message });
    }
    Ok(payload)
}

/// Live `track.updateNowPlaying` (mirrors the TS attach leg: the
/// caller invalidates the user row when the error is session-shaped).
pub async fn post_now_playing(
    api_key: &str,
    shared_secret: &str,
    session_key: &str,
    track: &ScrobbleTrack,
) -> Result<(), LastFmError> {
    let fields = now_playing_fields(api_key, shared_secret, session_key, track);
    post_signed(fields, "track.updateNowPlaying")
        .await
        .map(|_| ())
}

/// Live `track.scrobble` (mirrors `scrobbleTrack`).
pub async fn post_scrobble(
    api_key: &str,
    shared_secret: &str,
    session_key: &str,
    track: &ScrobbleTrack,
) -> Result<(), LastFmError> {
    let fields = scrobble_fields(api_key, shared_secret, session_key, track);
    post_signed(fields, "track.scrobble").await.map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn threshold_halves_and_caps_at_four_minutes() {
        assert_eq!(scrobble_threshold_ms(200_000), 100_000);
        assert_eq!(scrobble_threshold_ms(600_000), 240_000);
        assert_eq!(scrobble_threshold_ms(480_000), 240_000);
    }

    #[test]
    fn short_tracks_and_streams_never_count() {
        assert!(!should_scrobble(29_999));
        assert!(should_scrobble(30_000));
        assert!(!should_scrobble(0));
    }

    #[test]
    fn elapsed_subtracts_banked_and_open_pauses() {
        // 100s wall, 20s banked pause, no open pause -> 80s.
        assert_eq!(elapsed_listening_ms(0, 20_000, None, 100_000), 80_000);
        // Same plus a 10s still-open pause -> 70s.
        assert_eq!(
            elapsed_listening_ms(0, 20_000, Some(90_000), 100_000),
            70_000
        );
    }

    #[test]
    fn remaining_counts_down_to_due() {
        // 200s track -> 100s threshold; 80s in -> 20s left.
        assert_eq!(
            scrobble_remaining_ms(200_000, 0, 0, None, 80_000),
            Some(20_000)
        );
        // Past threshold -> due (None).
        assert_eq!(scrobble_remaining_ms(200_000, 0, 0, None, 100_000), None);
        // Short track -> never (None).
        assert_eq!(scrobble_remaining_ms(10_000, 0, 0, None, 5_000), None);
    }

    #[test]
    fn invalid_session_matches_ts_detector() {
        assert!(is_invalid_session_error(Some(9), "whatever"));
        assert!(is_invalid_session_error(None, "Invalid session key"));
        assert!(!is_invalid_session_error(Some(4), "Authentication Failed"));
        assert!(!is_invalid_session_error(None, "ok"));
    }

    #[test]
    fn now_playing_fields_sign_and_drop_empty() {
        let base = ScrobbleTrack {
            artist: "artist".to_string(),
            title: "title".to_string(),
            album: None,
            duration_ms: 180_000,
            started_sec: 0,
        };
        let f = now_playing_fields("k", "s", "sk1", &base);
        // album (None) dropped by the signer, duration kept as seconds.
        assert!(f.iter().any(|(k, v)| k == "duration" && v == "180"));
        assert!(!f.iter().any(|(k, _)| k == "album"));
        assert!(f.iter().any(|(k, _)| k == "api_sig"));
        assert!(f
            .iter()
            .any(|(k, v)| k == "method" && v == "track.updateNowPlaying"));
        // Unknown-length track drops duration too.
        let stream = ScrobbleTrack {
            album: Some("alb".to_string()),
            duration_ms: 0,
            ..base.clone()
        };
        let g = now_playing_fields("k", "s", "sk1", &stream);
        assert!(!g.iter().any(|(k, _)| k == "duration"));
        assert!(g.iter().any(|(k, v)| k == "album" && v == "alb"));
    }

    #[test]
    fn scrobble_fields_carry_chosen_by_user_and_timestamp() {
        let track = ScrobbleTrack {
            artist: "artist".to_string(),
            title: "title".to_string(),
            album: None,
            duration_ms: 200_000,
            started_sec: 1_700_000_000,
        };
        let f = scrobble_fields("k", "s", "sk1", &track);
        assert!(f.iter().any(|(k, v)| k == "chosenByUser" && v == "1"));
        assert!(f.iter().any(|(k, v)| k == "timestamp" && v == "1700000000"));
        assert!(f
            .iter()
            .any(|(k, v)| k == "method" && v == "track.scrobble"));
        assert!(f.iter().any(|(k, _)| k == "api_sig"));
    }
}
