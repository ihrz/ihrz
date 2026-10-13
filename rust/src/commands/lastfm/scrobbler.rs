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

// ---- W4 live-wiring slice: per-listener attach / sync / invalidation ----
// Mirrors `attachMemberToSession` / `detachMemberFromSession` /
// `syncMembersWithVoiceChannel` / `getDecryptedUserSession` /
// `invalidateUserSession` in
// src/core/modules/lastFMScrobblerManager.ts. The TS voice-state
// branch (`wasInTrackedChannel`/`isInTrackedChannel`) already has its
// pure mirror (`lastfm_tracked_change` in events_handler.rs); this
// layer is the decision + secret half the live caller needs.

/// Per-listener playback state (mirrors `LastFMListenerSession`;
/// `timeout` handle stays with the live caller's scheduler).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListenerState {
    pub user_id: u64,
    pub username: String,
    pub started_ms: i64,
    pub paused_ms: u64,
    pub pause_started_ms: Option<i64>,
    pub threshold_ms: u64,
    pub scrobbled: bool,
}

/// Fresh listener for a member joining the tracked channel (mirrors
/// the `attachMemberToSession` constructor: empty pause bank, an
/// open pause when the player is already paused, track-shaped
/// threshold). The caller posts `updateNowPlaying` next and drops the
/// listener when the error is session-shaped (see
/// `is_invalid_session_error`).
pub fn new_listener(
    user_id: u64,
    username: &str,
    duration_ms: u64,
    now_ms: i64,
    player_paused: bool,
) -> ListenerState {
    ListenerState {
        user_id,
        username: username.to_string(),
        started_ms: now_ms,
        paused_ms: 0,
        pause_started_ms: if player_paused { Some(now_ms) } else { None },
        threshold_ms: scrobble_threshold_ms(duration_ms),
        scrobbled: false,
    }
}

/// Elapsed listen for one listener (open pauses excluded, like
/// `getElapsedListeningMs`).
pub fn listener_elapsed_ms(l: &ListenerState, now_ms: i64) -> u64 {
    elapsed_listening_ms(l.started_ms, l.paused_ms, l.pause_started_ms, now_ms)
}

/// True when the listener's final scrobble is due (mirrors the
/// `tryScrobbleListener` gate: not yet credited, track long enough,
/// elapsed past the threshold).
pub fn listener_ready_to_scrobble(l: &ListenerState, duration_ms: u64, now_ms: i64) -> bool {
    !l.scrobbled && should_scrobble(duration_ms) && listener_elapsed_ms(l, now_ms) >= l.threshold_ms
}

/// Voice-member reconcile (mirrors `syncMembersWithVoiceChannel`):
/// listeners gone from the channel detach (the caller scrobbles them
/// out with `finalize=true` first, like `detachMemberFromSession`);
/// channel members with no listener attach. Bot filtering stays with
/// the live caller (it owns the member objects).
pub fn sync_listener_sets(channel_members: &[u64], listener_ids: &[u64]) -> (Vec<u64>, Vec<u64>) {
    let to_attach: Vec<u64> = channel_members
        .iter()
        .copied()
        .filter(|m| !listener_ids.contains(m))
        .collect();
    let to_detach: Vec<u64> = listener_ids
        .iter()
        .copied()
        .filter(|l| !channel_members.contains(l))
        .collect();
    (to_attach, to_detach)
}

/// `getEncryptionSecret` mirror: the API token wins, else the Last.fm
/// shared secret (same precedence as login.rs).
pub fn encryption_secret(api_token: &str, shared_secret: &str) -> String {
    if api_token.trim().is_empty() {
        shared_secret.to_string()
    } else {
        api_token.to_string()
    }
}

/// Decrypted per-user session for the attach leg (mirrors
/// `getDecryptedUserSession`): needs a stored `sessionKey` +
/// `username` and an `enabled` flag that is not false; undecryptable
/// keys resolve to `None` and the caller invalidates the row.
pub async fn decrypted_user_session(
    pool: &crate::db::Pool,
    user_id: u64,
    secret: &str,
) -> Option<(String, String)> {
    let settings = super::lastfm_settings(pool, user_id).await?;
    if settings.get("enabled").and_then(|v| v.as_bool()) == Some(false) {
        return None;
    }
    let enc = settings.get("sessionKey")?.as_str()?;
    let username = settings.get("username")?.as_str()?;
    if enc.is_empty() || username.is_empty() {
        return None;
    }
    let session_key = crate::funcs::decrypt_text(secret, enc)?;
    Some((session_key, username.to_string()))
}

/// Invalidated settings row (mirrors `invalidateUserSession`: the
/// dead `sessionKey` is dropped, `enabled` flips off, `connectedAt` +
/// `username` are kept).
pub fn invalidated_settings_json(settings: &serde_json::Value) -> serde_json::Value {
    let mut out = serde_json::json!({ "enabled": false });
    for key in ["connectedAt", "username"] {
        if let Some(v) = settings.get(key) {
            out[key] = v.clone();
        }
    }
    out
}

/// Persist the invalidation (DB leg of `invalidateUserSession`;
/// dropping the listener from live sessions stays with the caller,
/// like `removeUserFromActiveSessions`).
pub async fn invalidate_user_session(pool: &crate::db::Pool, user_id: u64) -> anyhow::Result<bool> {
    let Some(settings) = super::lastfm_settings(pool, user_id).await else {
        return Ok(false);
    };
    let next = invalidated_settings_json(&settings);
    super::save_lastfm_settings(pool, user_id, &next).await?;
    Ok(true)
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

    #[test]
    fn new_listener_seeds_threshold_and_pause_leg() {
        // Playing: no open pause, half-track threshold.
        let l = new_listener(7, "dj", 200_000, 1_000, false);
        assert_eq!(l.threshold_ms, 100_000);
        assert_eq!(l.pause_started_ms, None);
        assert!(!l.scrobbled);
        // Player already paused: open pause starts now (TS branch).
        let p = new_listener(7, "dj", 600_000, 1_000, true);
        assert_eq!(p.threshold_ms, 240_000);
        assert_eq!(p.pause_started_ms, Some(1_000));
    }

    #[test]
    fn listener_due_gate_mirrors_try_scrobble() {
        let mut l = new_listener(7, "dj", 200_000, 0, false);
        // 80s into a 100s threshold: not due.
        assert!(!listener_ready_to_scrobble(&l, 200_000, 80_000));
        // Past threshold: due.
        assert!(listener_ready_to_scrobble(&l, 200_000, 100_000));
        // Already credited: never due again.
        l.scrobbled = true;
        assert!(!listener_ready_to_scrobble(&l, 200_000, 200_000));
        // Short track: never due even past its length.
        let s = new_listener(8, "dj2", 10_000, 0, false);
        assert!(!listener_ready_to_scrobble(&s, 10_000, 60_000));
    }

    #[test]
    fn sync_sets_split_attach_and_detach() {
        // Members 1,2 in channel; listener 2,3 tracked -> attach 1, detach 3.
        let (attach, detach) = sync_listener_sets(&[1, 2], &[2, 3]);
        assert_eq!(attach, vec![1]);
        assert_eq!(detach, vec![3]);
        // Steady state: nothing to do.
        let (a, d) = sync_listener_sets(&[1], &[1]);
        assert!(a.is_empty() && d.is_empty());
    }

    #[test]
    fn secret_prefers_api_token() {
        assert_eq!(encryption_secret("tok", "sh"), "tok");
        assert_eq!(encryption_secret("  ", "sh"), "sh");
        assert_eq!(encryption_secret("", "sh"), "sh");
    }

    #[test]
    fn invalidation_drops_key_and_disables() {
        let settings = serde_json::json!({
            "connectedAt": 123, "enabled": true,
            "sessionKey": "dead", "username": "dj",
        });
        let next = invalidated_settings_json(&settings);
        assert_eq!(next["enabled"], serde_json::json!(false));
        assert_eq!(next["username"], serde_json::json!("dj"));
        assert_eq!(next["connectedAt"], serde_json::json!(123));
        assert!(next.get("sessionKey").is_none());
    }

    #[tokio::test]
    async fn decrypt_leg_round_trips_and_invalidate_persists() {
        let pool = crate::db::memory_pool().await;
        let secret = "w4-test-secret";
        let enc = crate::funcs::encrypt_text(secret, "sk-live");
        let row = serde_json::json!({
            "connectedAt": 5, "enabled": true,
            "sessionKey": enc, "username": "dj",
        });
        super::super::save_lastfm_settings(&pool, 77, &row)
            .await
            .unwrap();
        // Attach leg resolves the cleartext key + username.
        let got = decrypted_user_session(&pool, 77, secret).await.unwrap();
        assert_eq!(got, ("sk-live".to_string(), "dj".to_string()));
        // Wrong secret: undecryptable -> None (caller invalidates).
        assert!(decrypted_user_session(&pool, 77, "wrong").await.is_none());
        // Disabled rows never attach.
        let off = serde_json::json!({ "enabled": false, "sessionKey": enc, "username": "dj" });
        super::super::save_lastfm_settings(&pool, 78, &off)
            .await
            .unwrap();
        assert!(decrypted_user_session(&pool, 78, secret).await.is_none());
        // Invalidation persists the TS shape (key dropped, off).
        assert!(invalidate_user_session(&pool, 77).await.unwrap());
        let after = super::super::lastfm_settings(&pool, 77).await.unwrap();
        assert_eq!(after["enabled"], serde_json::json!(false));
        assert!(after.get("sessionKey").is_none());
        assert_eq!(after["username"], serde_json::json!("dj"));
        // Unknown user: nothing to invalidate.
        assert!(!invalidate_user_session(&pool, 999_999).await.unwrap());
    }
}
