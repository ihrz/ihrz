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
/// NOTE: the TS is a case-insensitive SUBSTRING test
/// (`/session/i`), so plurals ("Sessions expired") and embeddings
/// ("obsession") count — this is `contains`, not a word match.
/// FOLD (battery scratch `slice-w4s91-invalidsession.cjs`, green
/// 28/28): the fold is ASCII-only by design. The old
/// `to_lowercase()` used full Unicode mapping, which lowercases
/// U+1E9E to "ss" — so a message with U+1E9E in s-position read
/// as an invalid session here while the V8 `i` flag does NOT
/// fold it (node ground truth: false). The battery also proves
/// V8 folds NONE of the exotic variants (U+017F, U+0130,
/// U+0131, U+FF53, U+FF33, U+00DF, U+0435 — all false), so
/// ASCII folding agrees with the TS on every probed leg. DELTA (unreachable: the
/// s86 envelope always yields number|undefined codes): a
/// string code `"9"` is `!== 9` in TS but unrepresentable past
/// the `Option<i64>` signature.
pub fn is_invalid_session_error(code: Option<i64>, message: &str) -> bool {
    if code == Some(9) {
        return true;
    }
    message.to_ascii_lowercase().contains("session")
}

/// `isConfigured` mirror: `Boolean(apiKey && sharedSecret)` — truthy
/// iff both are non-empty (bare JS `&&`, so whitespace-only counts
/// as configured, exactly like `!is_empty()` here; env-vs-file
/// precedence lives in config.rs, already pinned there).
/// Battery: scratch `slice-w4s90-normalize.cjs` (node, 17/17).
pub fn lastfm_configured(api_key: &str, shared_secret: &str) -> bool {
    !api_key.is_empty() && !shared_secret.is_empty()
}

/// `getThresholdMs` mirror: half the track, capped at 4 minutes.
/// NOTE: the TS computes `durationMs / 2` in float, so odd durations
/// keep a `.5` half (e.g. 30001 -> 15000.5) while both sides compare
/// against an integer `elapsed` (`Date.now()` deltas). `elapsed >=
/// half` on integers is exactly `elapsed >= div_ceil`, hence the
/// ceiling here -- a plain `/ 2` floor would credit an elapsed
/// sitting exactly on `floor(half)` that TS still rejects.
/// Battery: scratch `slice-w4s81-threshold.cjs` (node, DIVERGES: 7
/// on the floor; slice 89 applies the slice-81 fix to this copy --
/// the live `lf::scrobble_threshold_ms` call sites in lavalink.rs
/// resolve here, not to the lavalink.rs duplicate).
pub fn scrobble_threshold_ms(duration_ms: u64) -> u64 {
    (duration_ms.div_ceil(2)).min(240_000)
}

/// `shouldScrobble` mirror: tracks under 30s never count (streams
/// carry duration 0 and are excluded by the same gate).
pub fn should_scrobble(duration_ms: u64) -> bool {
    duration_ms >= 30_000
}

/// `normalizeTrack` duration leg mirror: streams (`isStream`) count
/// as zero-length, so `should_scrobble` rejects them and the
/// now-playing/scrobble `duration` field is dropped by the signer —
/// exactly like the TS `track.info.isStream ? 0 : track.info.duration`.
/// NOTE: the TS `getThresholdMs` keeps float halves on odd durations
/// (`30001/2 = 15000.5`); `scrobble_threshold_ms` above uses
/// `div_ceil` so integer `elapsed >= half` matches TS exactly
/// (slice-81 battery, slice-89 fix on this copy).
pub fn normalize_lastfm_duration_ms(is_stream: bool, length_ms: u64) -> u64 {
    if is_stream {
        0
    } else {
        length_ms
    }
}

/// `normalizeTrack` album leg mirror: `pluginInfo?.albumName` passes
/// the album through untouched (missing/nullish pluginInfo, non-object
/// pluginInfo, and a missing key all fold to `None`; empty-string stays
/// `Some("")` and is dropped downstream by the signer, exactly like the
/// TS `value !== ""` filter).
/// Battery: scratch `slice-w4s88-album.cjs` (node, 17/17).
/// DELTA (doc-noted, unreachable: Lavalink `pluginInfo` is JSON so
/// `albumName` is always a string when present): a truthy non-string
/// (`0`, `123`) is wired by the TS signer (URLSearchParams coerces)
/// but folds to `None` here — strictly less garbage POSTed.
pub fn lastfm_track_album(plugin_info: Option<&serde_json::Value>) -> Option<String> {
    plugin_info
        .and_then(|v| v.get("albumName"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// `getElapsedListeningMs` mirror: wall time minus the start minus
/// banked pauses minus any still-open pause.
/// Battery: scratch `slice-w4s92-elapsedskew.cjs`, green 10/10.
/// DELTA (doc-noted, unreachable without a backwards clock step
/// mid-listen: `Date.now()` never goes backwards in steady state):
/// the TS arithmetic goes negative when `now` predates the start
/// (S1), when the bank exceeds the wall (S2), or when an open pause
/// started "in the future" (S3, inflating elapsed) — and the resume
/// leg banks a negative step (R2). The `u64` plumbing saturates all
/// of these at zero instead (a longer/shorter re-arm, same NotYetDue
/// verdict). A `Some(0)` open-pause start also reads absent in TS
/// (`if (pausedStartedAt)` / the ternary treat 0 as falsy, R3) but
/// counts as open here — `Date.now()` is never 0 live.
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

/// JS truthiness of a parsed `error` member (mirrors the
/// `payload.error` test in `callLastFM`: `0`/`""`/`false`/`null`
/// are falsy — a 2xx carrying `error: 0` is a SUCCESS there —
/// while objects/arrays (even `{}`/`[]`) are truthy).
fn js_truthy(v: &serde_json::Value) -> bool {
    match v {
        serde_json::Value::Null => false,
        serde_json::Value::Bool(b) => *b,
        serde_json::Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(true),
        serde_json::Value::String(s) => !s.is_empty(),
        _ => true,
    }
}

/// JS `Number()` coercion of a truthy `error` member (mirrors
/// `Number(payload.error)` in `callLastFM`: numeric strings like
/// `"9"` yield their value). Non-numeric members (`"abc"`,
/// objects, booleans — `NaN`/`1`/`0` in JS, unrepresentable or
/// meaningless as `errorCode`) fold to `None`.
/// Battery: scratch `slice-w4s86-envelope.cjs`, green 12/12.
fn js_error_code(v: &serde_json::Value) -> Option<i64> {
    match v {
        serde_json::Value::Number(n) => n.as_i64().or_else(|| n.as_f64().map(|f| f as i64)),
        serde_json::Value::String(s) => s.parse::<f64>().ok().map(|f| f as i64),
        // `false`/`null` are falsy (unreachable here); `true` coerces to 1.
        serde_json::Value::Bool(true) => Some(1),
        _ => None,
    }
}

/// Pure `callLastFM` response-envelope classifier (mirrors
/// `LastFMScrobblerManager.callLastFM` below the `isConfigured`
/// guard — every caller gates configuration first: `login` via
/// `isConfigured()`, the attach/scrobble legs outcome-equivalently
/// since `{errorCode: -1, ok: false}` is never session-shaped, so
/// both sides take the transient-failure path).
/// `status` is the HTTP status code, `reason` its reason phrase
/// (the `response.statusText` fallback), `raw_body` the raw text.
/// Legs: empty body parses as `{}`; an UNPARSEABLE non-empty body
/// throws inside the TS `try` and answers failure with NO code
/// (even on a non-2xx status — the catch swallows it) and the
/// parse message; failure iff non-2xx OR a truthy `error` member;
/// code is `Number(error)` when truthy else the status; message is
/// `payload.message || statusText` (empty messages fall back).
/// Battery: scratch `slice-w4s86-envelope.cjs`, green 12/12.
/// DELTA (doc-noted, unreachable: Last.fm always sends integer
/// `error` codes): a non-numeric truthy `error` (`"abc"`, `{}`)
/// yields `NaN` in TS but `None` here — same failure verdict,
/// and `is_invalid_session_error` reads `None` as non-9 both sides
/// would only differ from a `NaN` the same way (`NaN === 9` false).
pub fn classify_lastfm_response(
    status: u16,
    reason: &str,
    raw_body: &str,
) -> Result<serde_json::Value, LastFmError> {
    let payload: serde_json::Value = if raw_body.is_empty() {
        serde_json::Value::Object(Default::default())
    } else {
        match serde_json::from_str(raw_body) {
            Ok(v) => v,
            Err(e) => {
                return Err(LastFmError {
                    code: None,
                    message: e.to_string(),
                })
            }
        }
    };
    let ok_status = (200..300).contains(&status);
    let err_member = payload.get("error").filter(|e| js_truthy(e));
    if !ok_status || err_member.is_some() {
        let code = err_member.and_then(js_error_code).or(if ok_status {
            None
        } else {
            Some(status as i64)
        });
        let message = payload
            .get("message")
            .and_then(|m| m.as_str())
            .filter(|s| !s.is_empty())
            .unwrap_or(reason)
            .to_string();
        return Err(LastFmError { code, message });
    }
    Ok(payload)
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
    super::scrobbler::classify_lastfm_response(
        status.as_u16(),
        status.canonical_reason().unwrap_or(method),
        &body,
    )
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

/// `getEncryptionSecret` mirror: exact JS `||` on the token string —
/// only the empty string falls through to the shared secret. A
/// whitespace-only token is truthy in JS and wins there, so no
/// trimming here (a trim would encrypt with a different key than the
/// TS side and corrupt cross-reads).
/// Battery: scratch `slice-w4s82-secret.cjs`, green 9/9.
pub fn encryption_secret(api_token: &str, shared_secret: &str) -> String {
    if api_token.is_empty() {
        shared_secret.to_string()
    } else {
        api_token.to_string()
    }
}

/// `getDecryptedUserSession` outcome. `Missing` covers no row, a
/// missing/empty `sessionKey`/`username`, and rows whose `enabled`
/// is not literally `true` (TS checks `!auth.enabled` at the attach
/// site, so a missing flag skips the attach exactly like `false`).
/// `DecryptFailed` covers an undecryptable key AND an empty
/// plaintext (TS `!decryptedSessionKey` is falsy for both) — the
/// caller must invalidate the row, exactly like the TS getter.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecryptedSession {
    Missing,
    DecryptFailed,
    Ok((String, String)),
}

/// Decrypted per-user session for the attach leg (mirrors
/// `getDecryptedUserSession` + the `!auth.enabled` attach gate).
pub async fn decrypted_user_session(
    pool: &crate::db::Pool,
    user_id: u64,
    secret: &str,
) -> DecryptedSession {
    let Some(settings) = super::lastfm_settings(pool, user_id).await else {
        return DecryptedSession::Missing;
    };
    if settings.get("enabled").and_then(|v| v.as_bool()) != Some(true) {
        return DecryptedSession::Missing;
    }
    let enc = settings
        .get("sessionKey")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let username = settings
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if enc.is_empty() || username.is_empty() {
        return DecryptedSession::Missing;
    }
    match crate::funcs::decrypt_text(secret, enc) {
        Some(key) if !key.is_empty() => DecryptedSession::Ok((key, username.to_string())),
        _ => DecryptedSession::DecryptFailed,
    }
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

/// Scheduler + finalize decision legs (mirrors `scheduleScrobble` /
/// `tryScrobbleListener`). Timeouts stay with the live caller (tokio
/// tasks); these pure decisions are what the timer arms check.
/// `scheduleScrobble` action: short tracks and already-credited
/// listeners are skipped, due listeners scrobble out immediately
/// (`void tryScrobbleListener(..., true)`), the rest re-arm in the
/// remaining ms (`setTimeout(..., remaining)` firing a non-finalize
/// attempt).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScheduleAction {
    Skip,
    PostNow,
    FireInMs(u64),
}

pub fn schedule_scrobble_action(
    duration_ms: u64,
    scrobbled: bool,
    elapsed_ms: u64,
    threshold_ms: u64,
) -> ScheduleAction {
    if scrobbled || !should_scrobble(duration_ms) {
        return ScheduleAction::Skip;
    }
    if elapsed_ms >= threshold_ms {
        ScheduleAction::PostNow
    } else {
        ScheduleAction::FireInMs(threshold_ms - elapsed_ms)
    }
}

/// `tryScrobbleListener` gate outcome. `ReadyToPost` means the caller
/// performs the live `track.scrobble` POST (invalidating the user row
/// on session-shaped errors, logging the rest, then marking the
/// listener credited and clearing its timer — exactly the TS tail).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TryScrobbleOutcome {
    SkipDone,
    StaleTrack,
    LeftChannel,
    NotYetDue,
    ReadyToPost,
}

pub fn try_scrobble_decision(
    scrobbled: bool,
    duration_ms: u64,
    finalize: bool,
    track_current: bool,
    still_in_channel: bool,
    elapsed_ms: u64,
    threshold_ms: u64,
) -> TryScrobbleOutcome {
    if scrobbled || !should_scrobble(duration_ms) {
        return TryScrobbleOutcome::SkipDone;
    }
    if !finalize {
        if !track_current {
            return TryScrobbleOutcome::StaleTrack;
        }
        if !still_in_channel {
            return TryScrobbleOutcome::LeftChannel;
        }
    }
    if elapsed_ms < threshold_ms {
        // NOTE: on finalize legs (detach/track-end) the TS returns
        // false here without rescheduling; the caller drops NotYetDue
        // unless it came from a timer fire.
        return TryScrobbleOutcome::NotYetDue;
    }
    TryScrobbleOutcome::ReadyToPost
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn threshold_halves_and_caps_at_four_minutes() {
        assert_eq!(scrobble_threshold_ms(200_000), 100_000);
        assert_eq!(scrobble_threshold_ms(600_000), 240_000);
        assert_eq!(scrobble_threshold_ms(480_000), 240_000);
        // Slice-89 battery (slice-w4s81-threshold.cjs): TS keeps float
        // halves, so odd durations need the ceiling -- elapsed sitting
        // exactly on floor(half) must still miss like TS.
        assert_eq!(scrobble_threshold_ms(30_001), 15_001);
        assert_eq!(scrobble_threshold_ms(59_999), 30_000);
        assert_eq!(scrobble_threshold_ms(480_001), 240_000);
    }

    #[test]
    fn short_tracks_and_streams_never_count() {
        assert!(!should_scrobble(29_999));
        assert!(should_scrobble(30_000));
        assert!(!should_scrobble(0));
    }

    #[test]
    fn normalize_stream_counts_as_zero_length() {
        // Mirrors the slice-w4s61 node battery (`normalizeTrack` +
        // `shouldScrobble` + threshold + duration-field legs).
        assert_eq!(normalize_lastfm_duration_ms(false, 200_000), 200_000);
        assert_eq!(normalize_lastfm_duration_ms(false, 29_999), 29_999);
        // Streams fold to 0 no matter the reported length, so the
        // gate rejects them and the signer drops `duration`.
        assert_eq!(normalize_lastfm_duration_ms(true, 3_600_000), 0);
        assert_eq!(normalize_lastfm_duration_ms(true, 0), 0);
        assert!(!should_scrobble(normalize_lastfm_duration_ms(
            true, 3_600_000
        )));
        assert_eq!(
            scrobble_threshold_ms(normalize_lastfm_duration_ms(true, 3_600_000)),
            0
        );
    }

    #[test]
    fn track_album_matches_ts_normalize_legs() {
        // `normalizeTrack` album leg (`pluginInfo?.albumName`):
        // battery scratch/slice-w4s88-album.cjs (node, 17/17).
        use serde_json::json;
        // Missing/nullish pluginInfo folds to None (the common
        // YouTube case: no album POSTed, signer drops the param).
        assert_eq!(lastfm_track_album(None), None);
        // Non-object pluginInfo never throws under `?.` — folds None.
        for v in [json!(5), json!("x"), json!(true), json!([]), json!(null)] {
            assert_eq!(lastfm_track_album(Some(&v)), None);
        }
        // Object without the key, or an explicit null, folds None
        // (TS null is dropped by the signer's `!== ""` filter too).
        assert_eq!(lastfm_track_album(Some(&json!({}))), None);
        assert_eq!(
            lastfm_track_album(Some(&json!({ "albumName": null }))),
            None
        );
        // Empty string passes through and is dropped downstream by
        // the signer on both sides — never normalized early here.
        assert_eq!(
            lastfm_track_album(Some(&json!({ "albumName": "" }))),
            Some(String::new())
        );
        // Whitespace + real albums wire verbatim into both POSTs.
        assert_eq!(
            lastfm_track_album(Some(&json!({ "albumName": "  " }))),
            Some("  ".to_string())
        );
        assert_eq!(
            lastfm_track_album(Some(&json!({ "albumName": "Alb" }))),
            Some("Alb".to_string())
        );
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
        // Slice-92 battery (scratch/slice-w4s92-elapsedskew.cjs, 10/10):
        // steady-clock legs agree exactly (N1/N2/N3); skew legs
        // saturate where the TS arithmetic goes negative (S1/S2) or
        // inflates (S3) — DELTA doc-noted on the fn.
        assert_eq!(elapsed_listening_ms(0, 0, None, 100_000), 100_000); // N1
        assert_eq!(elapsed_listening_ms(0, 20_000, None, 100_000), 80_000); // N2
        assert_eq!(
            elapsed_listening_ms(5_000, 0, Some(90_000), 100_000),
            85_000
        ); // N4
        assert_eq!(elapsed_listening_ms(100_000, 0, None, 90_000), 0); // S1
        assert_eq!(elapsed_listening_ms(0, 20_000, None, 10_000), 0); // S2
        assert_eq!(elapsed_listening_ms(0, 0, Some(110_000), 100_000), 100_000);
        // S3
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
        // Battery legs: scratch `slice-w4s91-invalidsession.cjs`,
        // green 28/28 (I-prefix ids below).
        assert!(is_invalid_session_error(Some(9), "whatever")); // I1
        assert!(is_invalid_session_error(Some(9), "")); // I2/I3/I4 (nullish msg folds to "" via `||`)
        assert!(is_invalid_session_error(None, "Invalid session key")); // I5
        assert!(is_invalid_session_error(None, "SESSION EXPIRED")); // I6
                                                                    // TS `/session/i` is a SUBSTRING test: plurals + embeddings count.
        assert!(is_invalid_session_error(None, "Sessions expired, re-auth")); // I7
        assert!(is_invalid_session_error(None, "obsession detected")); // I8
        assert!(is_invalid_session_error(None, "SeSsIoN timeout")); // I9
        assert!(!is_invalid_session_error(Some(4), "Authentication Failed")); // I10
        assert!(!is_invalid_session_error(None, "ok")); // I11/I17 (code 0 same leg)
        assert!(!is_invalid_session_error(None, "")); // I12/I13/I14
        assert!(is_invalid_session_error(Some(10), "Invalid session key")); // I16 (message leg wins)
        assert!(is_invalid_session_error(None, "No session")); // I18
        assert!(is_invalid_session_error(None, "Session\nkey invalid")); // I19
        assert!(is_invalid_session_error(None, "SESSIONS")); // I24
                                                             // V8 `i` folds NO exotic variant: ASCII fold agrees everywhere
                                                             // (codepoints via from_u32: no raw non-ASCII in source).
                                                             // I20 long-s U+017F, I21 dotted capital I U+0130,
                                                             // I22 dotless i U+0131, I23 fullwidth s U+FF53,
                                                             // I25 capital sharp s U+1E9E (the fixed divergence),
                                                             // I26 U+00DF, I27 fullwidth upper U+FF33,
                                                             // I28 cyrillic ie U+0435.
        for cp in [0x17Fu32, 0x130, 0x131, 0xFF53, 0x1E9E, 0xDF, 0xFF33, 0x435] {
            let ch = char::from_u32(cp).unwrap().to_string();
            assert!(
                !is_invalid_session_error(None, &(ch.clone() + "ession")),
                "U+{:X} must not fold to s",
                cp
            );
            assert!(
                !is_invalid_session_error(None, &("se".to_owned() + &ch + "ion")),
                "U+{:X} must not fold into session",
                cp
            );
        }
    }

    #[test]
    fn call_lastfm_envelope_matches_ts_battery() {
        // Battery legs: scratch `slice-w4s86-envelope.cjs`, green 12/12.
        let ok = classify_lastfm_response(200, "OK", r#"{"a":1}"#).unwrap();
        assert_eq!(ok.get("a").and_then(|v| v.as_i64()), Some(1));
        let empty = classify_lastfm_response(200, "OK", "").unwrap();
        assert_eq!(empty, serde_json::Value::Object(Default::default()));
        // Unparseable body throws inside the TS try: failure, NO code.
        let bad = classify_lastfm_response(200, "OK", "{oops").unwrap_err();
        assert_eq!(bad.code, None);
        assert!(!bad.message.is_empty());
        let e9 =
            classify_lastfm_response(200, "OK", r#"{"error":9,"message":"Invalid session key"}"#)
                .unwrap_err();
        assert_eq!(
            (e9.code, e9.message.as_str()),
            (Some(9), "Invalid session key")
        );
        // JS Number("9") coerces numeric strings.
        let es = classify_lastfm_response(200, "OK", r#"{"error":"9","message":"bad key"}"#)
            .unwrap_err();
        assert_eq!((es.code, es.message.as_str()), (Some(9), "bad key"));
        // Falsy error:0 is a SUCCESS in TS (`payload.error` test).
        let zero = classify_lastfm_response(200, "OK", r#"{"error":0,"x":1}"#).unwrap();
        assert_eq!(zero.get("error").and_then(|v| v.as_i64()), Some(0));
        // Missing message falls back to statusText.
        let nomsg = classify_lastfm_response(200, "OK", r#"{"error":9}"#).unwrap_err();
        assert_eq!((nomsg.code, nomsg.message.as_str()), (Some(9), "OK"));
        let f403 =
            classify_lastfm_response(403, "Forbidden", r#"{"error":4,"message":"Unauthorized"}"#)
                .unwrap_err();
        assert_eq!(
            (f403.code, f403.message.as_str()),
            (Some(4), "Unauthorized")
        );
        let e500 = classify_lastfm_response(500, "Internal Server Error", "").unwrap_err();
        assert_eq!(
            (e500.code, e500.message.as_str()),
            (Some(500), "Internal Server Error")
        );
        // Garbage body on a non-2xx: the TS catch swallows the status too.
        let g500 =
            classify_lastfm_response(500, "Internal Server Error", "<html>oops").unwrap_err();
        assert_eq!(g500.code, None);
        assert!(!g500.message.is_empty());
        // Session-shaped codes still route to invalidate downstream.
        assert!(is_invalid_session_error(e9.code, &e9.message));
        assert!(!is_invalid_session_error(e500.code, &e500.message));
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
        // W4 slice 71 battery (scratch `slice-w4s71-fields.cjs` 12/12):
        // sub-second remainders floor, never round (29999 -> "29",
        // TS `Math.floor(ms / 1000)` == u64 `/ 1000` on >= 0 inputs).
        let floor = now_playing_fields(
            "k",
            "s",
            "sk1",
            &ScrobbleTrack {
                duration_ms: 29_999,
                ..base.clone()
            },
        );
        assert!(floor.iter().any(|(k, v)| k == "duration" && v == "29"));
        // 999ms -> "0", and "0" survives the signer (only "" drops --
        // TS `value !== ""`, Rust `!v.is_empty()`).
        let zero = now_playing_fields(
            "k",
            "s",
            "sk1",
            &ScrobbleTrack {
                duration_ms: 999,
                ..base.clone()
            },
        );
        assert!(zero.iter().any(|(k, v)| k == "duration" && v == "0"));
        // Now-playing carries no timestamp / chosenByUser (scrobble-only
        // legs in TS).
        assert!(!f.iter().any(|(k, _)| k == "timestamp"));
        assert!(!f.iter().any(|(k, _)| k == "chosenByUser"));
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
    fn scrobble_stream_drops_duration_keeps_epoch_zero() {
        // W4 slice 71 battery: a zero-length scrobble drops duration
        // but keeps the per-listener timestamp, even at epoch 0
        // ("0" is not "" on either side of the signer).
        let track = ScrobbleTrack {
            artist: "artist".to_string(),
            title: "title".to_string(),
            album: None,
            duration_ms: 0,
            started_sec: 0,
        };
        let f = scrobble_fields("k", "s", "sk1", &track);
        assert!(!f.iter().any(|(k, _)| k == "duration"));
        assert!(f.iter().any(|(k, v)| k == "timestamp" && v == "0"));
        assert!(f.iter().any(|(k, v)| k == "chosenByUser" && v == "1"));
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
        // JS `||`: whitespace is truthy, so the token wins (battery
        // slice-w4s82-secret.cjs legs 3-5).
        assert_eq!(encryption_secret("  ", "sh"), "  ");
        assert_eq!(encryption_secret("\t", "sh"), "\t");
        assert_eq!(encryption_secret("", "sh"), "sh");
    }

    #[test]
    fn configured_gate_matches_ts_is_configured_legs() {
        // Battery: scratch `slice-w4s90-normalize.cjs` (node, 17/17):
        // `Boolean(apiKey && sharedSecret)` — bare `&&`, so only the
        // empty string (and nullish, unrepresentable here) fails.
        assert!(lastfm_configured("k", "s"));
        assert!(!lastfm_configured("", "s"));
        assert!(!lastfm_configured("k", ""));
        assert!(!lastfm_configured("", ""));
        // Whitespace is truthy in JS: counts as configured (same
        // whitespace class as the slice-82 secret delta).
        assert!(lastfm_configured(" ", " "));
        assert!(lastfm_configured("\t", "s"));
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
        let got = decrypted_user_session(&pool, 77, secret).await;
        assert_eq!(
            got,
            DecryptedSession::Ok(("sk-live".to_string(), "dj".to_string()))
        );
        // Wrong secret: undecryptable -> DecryptFailed (caller invalidates).
        assert_eq!(
            decrypted_user_session(&pool, 77, "wrong").await,
            DecryptedSession::DecryptFailed
        );
        // Disabled rows never attach (no invalidate side effect).
        let off = serde_json::json!({ "enabled": false, "sessionKey": enc, "username": "dj" });
        super::super::save_lastfm_settings(&pool, 78, &off)
            .await
            .unwrap();
        assert_eq!(
            decrypted_user_session(&pool, 78, secret).await,
            DecryptedSession::Missing
        );
        // Invalidation persists the TS shape (key dropped, off).
        assert!(invalidate_user_session(&pool, 77).await.unwrap());
        let after = super::super::lastfm_settings(&pool, 77).await.unwrap();
        assert_eq!(after["enabled"], serde_json::json!(false));
        assert!(after.get("sessionKey").is_none());
        assert_eq!(after["username"], serde_json::json!("dj"));
        // Unknown user: nothing to invalidate.
        assert!(!invalidate_user_session(&pool, 999_999).await.unwrap());
    }

    #[tokio::test]
    async fn decrypt_getter_matches_ts_battery() {
        // Slice-65 pin: battery cases D/E/G from
        // scratch/slice-w4s65-decrypt.cjs (TS getDecryptedUserSession +
        // `!auth.enabled` attach gate). Missing/empty key or user and a
        // missing enabled flag resolve to Missing (attach skips, no row
        // write); undecryptable keys resolve to DecryptFailed.
        let pool = crate::db::memory_pool().await;
        let secret = "w4s65-secret";
        let enc = crate::funcs::encrypt_text(secret, "sk-65");
        let put = |uid: u64, row: serde_json::Value| {
            let pool = &pool;
            async move {
                super::super::save_lastfm_settings(pool, uid, &row)
                    .await
                    .unwrap()
            }
        };
        put(
            1,
            serde_json::json!({ "enabled": true, "sessionKey": enc, "username": "dj" }),
        )
        .await;
        put(
            2,
            serde_json::json!({ "enabled": true, "sessionKey": "not-encrypted", "username": "dj" }),
        )
        .await;
        put(
            3,
            serde_json::json!({ "sessionKey": enc, "username": "dj" }),
        )
        .await;
        put(4, serde_json::json!({ "enabled": true, "username": "dj" })).await;
        put(5, serde_json::json!({ "enabled": true, "sessionKey": enc })).await;
        // Empty plaintext decrypts to "" (falsy in TS) -> DecryptFailed.
        let enc_empty = crate::funcs::encrypt_text(secret, "");
        put(
            6,
            serde_json::json!({ "enabled": true, "sessionKey": enc_empty, "username": "dj" }),
        )
        .await;
        assert_eq!(
            decrypted_user_session(&pool, 1, secret).await,
            DecryptedSession::Ok(("sk-65".to_string(), "dj".to_string()))
        );
        assert_eq!(
            decrypted_user_session(&pool, 2, secret).await,
            DecryptedSession::DecryptFailed
        );
        assert_eq!(
            decrypted_user_session(&pool, 6, secret).await,
            DecryptedSession::DecryptFailed
        );
        for uid in [3u64, 4, 5, 999_999] {
            assert_eq!(
                decrypted_user_session(&pool, uid, secret).await,
                DecryptedSession::Missing,
                "uid {uid}"
            );
        }
    }

    #[test]
    fn schedule_action_mirrors_schedule_scrobble() {
        // Short track or credited listener: skipped.
        assert_eq!(
            schedule_scrobble_action(10_000, false, 0, 5_000),
            ScheduleAction::Skip
        );
        assert_eq!(
            schedule_scrobble_action(200_000, true, 0, 100_000),
            ScheduleAction::Skip
        );
        // Past threshold: immediate finalize attempt.
        assert_eq!(
            schedule_scrobble_action(200_000, false, 100_000, 100_000),
            ScheduleAction::PostNow
        );
        // 80s into a 100s threshold: re-arm in 20s.
        assert_eq!(
            schedule_scrobble_action(200_000, false, 80_000, 100_000),
            ScheduleAction::FireInMs(20_000)
        );
    }

    #[test]
    fn try_scrobble_decision_mirrors_ts_gate_order() {
        // Credited or too short: done, even on finalize paths.
        assert_eq!(
            try_scrobble_decision(true, 200_000, true, true, true, 200_000, 100_000),
            TryScrobbleOutcome::SkipDone
        );
        assert_eq!(
            try_scrobble_decision(false, 10_000, true, true, true, 60_000, 5_000),
            TryScrobbleOutcome::SkipDone
        );
        // Timer fire on a stale track: dropped.
        assert_eq!(
            try_scrobble_decision(false, 200_000, false, false, true, 200_000, 100_000),
            TryScrobbleOutcome::StaleTrack
        );
        // Timer fire after the member left: dropped.
        assert_eq!(
            try_scrobble_decision(false, 200_000, false, true, false, 200_000, 100_000),
            TryScrobbleOutcome::LeftChannel
        );
        // Finalize paths skip both liveness gates (detach/track-end
        // credit whatever elapsed, threshold still applies).
        assert_eq!(
            try_scrobble_decision(false, 200_000, true, false, false, 200_000, 100_000),
            TryScrobbleOutcome::ReadyToPost
        );
        // Early timer fire: not due (caller reschedules).
        assert_eq!(
            try_scrobble_decision(false, 200_000, false, true, true, 80_000, 100_000),
            TryScrobbleOutcome::NotYetDue
        );
        // Due: caller POSTs track.scrobble.
        assert_eq!(
            try_scrobble_decision(false, 200_000, false, true, true, 100_000, 100_000),
            TryScrobbleOutcome::ReadyToPost
        );
    }
}
