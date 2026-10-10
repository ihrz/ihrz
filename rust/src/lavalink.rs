// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Lavalink v4 music manager (lava-rs types + reqwest transport).
//
// TS mirrors: src/core/modules/playerManager.ts (LavalinkManager, nodes,
// trackStart/trackEnd handlers, onEmptyQueue destroyAfterMs 120s,
// defaultSearchPlatform "youtube"), src/core/functions/musicPlay.ts
// (queue ops, ytsearch routing), src/Events/lavalink-client/raw.ts +
// stopMusicOnEmptyVoiceChannel.ts (voice state/server handshake).
//
// Server-side sources (Spotify / Apple Music / Deezer / Tidal / YouTube)
// are resolved by LavaSrc + platform plugins installed ON THE NODE (see
// the [lavalink] comment in config.example.toml); plain track URLs are
// passed through untouched and only bare queries get the `ytsearch:`
// prefix (mirrors defaultSearchPlatform: "youtube").
//
// Transport note: lava-rs 0.1.0 ships real REST/event types
// (LoadResult, Track, UpdatePlayerPayload, VoiceState, EventDispatcher)
// but its LavaRestClient hardcodes an `http://` base URL, so nodes with
// `secure = true` (https, e.g. :443) go through this module's reqwest
// transport which honors the scheme. The high-level LavalinkClient is
// still a stub upstream, hence this manager.
//
// Offline policy: with no nodes configured every live call fails with
// MusicError::NoNodes before any I/O; queue/loop/volume/pause state
// stays usable so commands remain unit-testable without a node.

use std::collections::{HashMap, HashSet, VecDeque};
use std::fmt;
use std::sync::{Arc, OnceLock};
use std::time::{Duration, Instant};

use lava_rs::events::{
    EventDispatcher, LavalinkEvent, TrackEndEvent, TrackEndReason, TrackEvent, TrackExceptionEvent,
    TrackStartEvent, TrackStuckEvent,
};
use lava_rs::model::{Track, VoiceState};
use lava_rs::rest::{LoadResult, Player as RestPlayer, UpdatePlayerPayload};
use lava_rs::ws::session::ReadyPayload;
use lava_rs::{LavalinkConfig, LavalinkError};
use poise::serenity_prelude as serenity;
use tokio::sync::{Mutex, RwLock};

/// Mirrors onEmptyQueue.destroyAfterMs in playerManager.ts.
pub const EMPTY_QUEUE_DESTROY_AFTER_MS: i64 = 120_000;

/// Default node volume applied on every fresh start. Mirrors
/// `DEFAULT_VOLUME = 75` in musicPlay.ts (`player.setVolume(
/// player.customVolume || DEFAULT_VOLUME)` after createPlayer).
pub const DEFAULT_VOLUME: u8 = 75;

/// Client-Name header sent on the node WS handshake (mirrors the
/// lavalink-client default; lava-rs connect_to_node sends its own).
pub const LAVALINK_CLIENT_NAME: &str = "ihrz-lava-rs/0.1.0";

/// Minimal node view shared by config sync (mirrors config.lavalink.nodes).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NodeCfg {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub password: String,
    pub secure: bool,
}

impl From<&crate::config::LavalinkNode> for NodeCfg {
    fn from(n: &crate::config::LavalinkNode) -> Self {
        Self {
            id: n.id.clone(),
            host: n.host.clone(),
            port: n.port,
            password: n.authorization.clone(),
            secure: n.secure,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LoopMode {
    Off,
    Track,
    /// Mirrors lavalink-client `setRepeatMode("queue")`: a finished
    /// track rejoins the back of the queue (`!loop.ts` accepts
    /// off/track/queue).
    Queue,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MusicError {
    NoNodes,
    NoSession(String),
    Rest(u16, String),
    Transport(String),
    EmptyQueue,
    NothingPlaying,
    NoMatches,
}

impl fmt::Display for MusicError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NoNodes => write!(f, "no lavalink node configured"),
            Self::NoSession(n) => write!(f, "node {n} has no session (websocket not ready)"),
            Self::Rest(s, m) => write!(f, "lavalink error {s}: {m}"),
            Self::Transport(m) => write!(f, "lavalink transport: {m}"),
            Self::EmptyQueue => write!(f, "queue is empty"),
            Self::NothingPlaying => write!(f, "nothing playing"),
            Self::NoMatches => write!(f, "no matches found"),
        }
    }
}

impl std::error::Error for MusicError {}

impl From<reqwest::Error> for MusicError {
    fn from(e: reqwest::Error) -> Self {
        Self::Transport(e.to_string())
    }
}

impl From<LavalinkError> for MusicError {
    fn from(e: LavalinkError) -> Self {
        match e {
            LavalinkError::RestError(s, m) => Self::Rest(s, m),
            LavalinkError::NodeError => Self::NoNodes,
            LavalinkError::SessionError => Self::NoSession(String::new()),
            other => Self::Transport(other.to_string()),
        }
    }
}

/// One connected Lavalink node (REST + session id from the WS Ready op).
pub struct NodeEntry {
    pub id: String,
    pub secure: bool,
    pub lava_cfg: LavalinkConfig,
    session_id: Mutex<Option<String>>,
}

impl NodeEntry {
    pub fn new(cfg: &NodeCfg, user_id: u64) -> Self {
        let lava_cfg = LavalinkConfig::builder()
            .host(cfg.host.clone())
            .port(cfg.port)
            .password(cfg.password.clone())
            .user_id(user_id)
            .client_name(LAVALINK_CLIENT_NAME)
            .build();
        Self {
            id: cfg.id.clone(),
            secure: cfg.secure,
            lava_cfg,
            session_id: Mutex::new(None),
        }
    }

    pub fn base_url(&self) -> String {
        let scheme = if self.secure { "https" } else { "http" };
        format!("{}://{}:{}", scheme, self.lava_cfg.host, self.lava_cfg.port)
    }

    pub async fn session(&self) -> Option<String> {
        self.session_id.lock().await.clone()
    }

    pub async fn set_session(&self, session: String) {
        *self.session_id.lock().await = Some(session);
    }
}

/// A resolved, playable track (lava-rs Track snapshot + requester).
#[derive(Debug, Clone)]
pub struct QueuedTrack {
    pub encoded: String,
    pub title: String,
    pub author: String,
    pub uri: Option<String>,
    pub length_ms: u64,
    pub source: String,
    /// Cover art for the play/trackStart embeds (mirrors
    /// `track.info.artworkUrl`; None when the node omits it).
    pub artwork: Option<String>,
    pub requester: u64,
}

impl From<(&Track, u64)> for QueuedTrack {
    fn from((t, requester): (&Track, u64)) -> Self {
        Self {
            encoded: t.encoded.clone(),
            title: t.info.title.clone(),
            author: t.info.author.clone(),
            uri: t.info.uri.clone(),
            length_ms: t.info.length,
            source: t.info.source_name.clone(),
            artwork: t.info.artwork_url.clone(),
            requester,
        }
    }
}

/// Per-guild player state. Pure logic (no I/O) so it stays unit-testable.
#[derive(Debug, Default)]
pub struct GuildPlayer {
    pub queue: VecDeque<QueuedTrack>,
    pub current: Option<QueuedTrack>,
    pub loop_mode: Option<LoopMode>,
    pub volume: u8,
    pub paused: bool,
    pub voice_channel: Option<u64>,
    pub text_channel: Option<u64>,
    pub idle_since_ms: Option<i64>,
}

impl GuildPlayer {
    pub fn new() -> Self {
        Self {
            volume: DEFAULT_VOLUME,
            loop_mode: Some(LoopMode::Off),
            ..Default::default()
        }
    }

    pub fn loop_mode(&self) -> LoopMode {
        self.loop_mode.unwrap_or(LoopMode::Off)
    }

    /// Enqueue; returns 1-based position. First track becomes current when
    /// idle (mirrors the TS auto-play on empty player).
    pub fn enqueue(&mut self, track: QueuedTrack, now_ms: i64) -> usize {
        if self.current.is_none() {
            self.current = Some(track);
            self.idle_since_ms = None;
            let _ = now_ms;
            0
        } else {
            self.queue.push_back(track);
            self.queue.len()
        }
    }

    pub fn skip(&mut self, now_ms: i64) -> Option<QueuedTrack> {
        let skipped = self.current.take();
        self.current = self.queue.pop_front();
        if self.current.is_none() {
            self.idle_since_ms = Some(now_ms);
        }
        skipped
    }

    pub fn stop(&mut self, now_ms: i64) {
        self.queue.clear();
        self.current = None;
        self.paused = false;
        self.idle_since_ms = Some(now_ms);
    }

    pub fn clear_queue(&mut self) -> usize {
        let n = self.queue.len();
        self.queue.clear();
        n
    }

    pub fn shuffle(&mut self, seed: u64) {
        // Same seeded xorshift as voice::TrackQueue (no RNG dep).
        let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
        let len = self.queue.len();
        for i in (1..len).rev() {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let j = (state % (i as u64 + 1)) as usize;
            self.queue.swap(i, j);
        }
    }

    pub fn set_volume(&mut self, level: i64) -> u8 {
        let v = crate::voice::clamp_volume(level) as u8;
        self.volume = v;
        v
    }

    /// Track-end state advance. Loop-track replays on Finished; loop-queue
    /// rejoins the finished track at the back and pops the next one
    /// (mirrors lavalink-client `setRepeatMode("queue")`); Replaced
    /// keeps current (node swapped it externally); anything else pops the
    /// next queued track or goes idle (TS onEmptyQueue path).
    pub fn advance_on_end(&mut self, reason: &TrackEndReason, now_ms: i64) -> AdvanceOutcome {
        match reason {
            TrackEndReason::Replaced => AdvanceOutcome::Kept,
            TrackEndReason::Finished if self.loop_mode() == LoopMode::Track => {
                AdvanceOutcome::Replay
            }
            TrackEndReason::Finished if self.loop_mode() == LoopMode::Queue => {
                if let Some(done) = self.current.clone() {
                    self.queue.push_back(done);
                }
                self.current = self.queue.pop_front();
                if self.current.is_some() {
                    AdvanceOutcome::Next
                } else {
                    self.paused = false;
                    self.idle_since_ms = Some(now_ms);
                    AdvanceOutcome::Idle
                }
            }
            _ => {
                self.current = self.queue.pop_front();
                if self.current.is_some() {
                    AdvanceOutcome::Next
                } else {
                    self.paused = false;
                    self.idle_since_ms = Some(now_ms);
                    AdvanceOutcome::Idle
                }
            }
        }
    }

    /// TS onEmptyQueue.destroyAfterMs guard.
    pub fn destroy_due(&self, now_ms: i64) -> bool {
        match (self.current.as_ref(), self.idle_since_ms) {
            (None, Some(idle)) => now_ms - idle >= EMPTY_QUEUE_DESTROY_AFTER_MS,
            _ => false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdvanceOutcome {
    Replay,
    Next,
    Idle,
    Kept,
}

/// One track-end step: the advance decision plus the optional
/// (node, session, encoded track) to push to Lavalink.
pub type AdvanceStep = (
    Option<AdvanceOutcome>,
    Option<(Arc<NodeEntry>, String, String)>,
);

/// Fallback re-search source for a failed track (mirrors the two
/// `player.node.search` branches in the TS `trackError` handler:
/// `scsearch` for broken playback, `deezer` for login-gated videos).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FallbackSource {
    SoundCloud,
    Deezer,
}

/// TS branch selector: which exception messages get a fallback
/// re-search (`"Something broke when playing the track."` ->
/// SoundCloud, `"This video requires login."` -> Deezer). Anything
/// else returns None (skip to next, log only).
pub fn fallback_source_for(exception_message: &str) -> Option<FallbackSource> {
    match exception_message {
        "Something broke when playing the track." => Some(FallbackSource::SoundCloud),
        "This video requires login." => Some(FallbackSource::Deezer),
        _ => None,
    }
}

/// Fallback re-search identifier for `title - author` on the given
/// source (mirrors the TS `query` + `source` search args).
pub fn fallback_identifier(source: FallbackSource, title: &str, author: &str) -> String {
    let q = format!("{title} - {author}");
    match source {
        FallbackSource::SoundCloud => format!("scsearch:{q}"),
        FallbackSource::Deezer => format!("dzsearch:{q}"),
    }
}

/// Bot user id from a Discord token. Mirrors userIdFromToken in
/// playerManager.ts (`Buffer.from(token.split(".")[0], "base64")`,
/// None for the empty-string case). The first segment is unpadded
/// base64, so padding is restored before decoding (no new dep: the
/// self-contained decoder in [`crate::emojis`]).
pub fn user_id_from_token(token: &str) -> Option<String> {
    let first = token.split('.').next().unwrap_or("");
    let mut compact: String = first.chars().filter(|c| !c.is_ascii_whitespace()).collect();
    if compact.is_empty() {
        return None;
    }
    let rem = compact.len() % 4;
    if rem != 0 {
        for _ in 0..(4 - rem) {
            compact.push('=');
        }
    }
    let bytes = crate::emojis::base64_decode(&compact)?;
    let id = String::from_utf8_lossy(&bytes).into_owned();
    (!id.is_empty()).then_some(id)
}

/// Outcome of a trackError/trackStuck recovery step.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorRecovery {
    /// Fallback re-search hit: the replacement is now current.
    Requeued { title: String },
    /// Failed track dropped, next queued track started.
    Advanced,
    /// Failed track dropped, queue drained (TS onEmptyQueue path).
    Idle,
    /// No player state for the guild (nothing to recover).
    NoPlayer,
}

/// Flatten a load result to its playable tracks (first-track and
/// playlist legs mirror `play_query`; empty/error legs are dropped
/// here — the caller falls through to the skip path).
fn load_tracks_flat(loaded: LoadResult) -> Vec<Track> {
    match loaded {
        LoadResult::Track(t) => vec![t],
        LoadResult::Playlist(data) => data.tracks,
        LoadResult::Search(v) => v.into_iter().take(1).collect(),
        LoadResult::Empty | LoadResult::Error(_) => vec![],
    }
}

// ---- search pipeline (mirrors searchQueryOnNode in musicPlay.ts) ----

/// True when the query parses as a URL (mirrors `isUrlQuery`).
pub fn is_url_query(query: &str) -> bool {
    let q = query.trim();
    q.starts_with("http://") || q.starts_with("https://")
}

fn url_host(query: &str) -> Option<String> {
    let rest = query
        .trim()
        .strip_prefix("https://")
        .or_else(|| query.trim().strip_prefix("http://"))?;
    let host = rest.split('/').next().unwrap_or("").to_ascii_lowercase();
    (!host.is_empty()).then_some(host)
}

/// Mirrors `isSpotifyURL` (host contains "spotify").
pub fn is_spotify_url(query: &str) -> bool {
    url_host(query).is_some_and(|h| h.contains("spotify"))
}

/// Mirrors `isYoutubeURL` (host contains "youtu").
pub fn is_youtube_url(query: &str) -> bool {
    url_host(query).is_some_and(|h| h.contains("youtu"))
}

/// Mirrors `isAppleMusicURL` (host contains "apple.com").
pub fn is_apple_music_url(query: &str) -> bool {
    url_host(query).is_some_and(|h| h.contains("apple.com"))
}

/// Mirrors `isAmazonMusicURL` (host contains "amazon").
pub fn is_amazon_music_url(query: &str) -> bool {
    url_host(query).is_some_and(|h| h.contains("amazon"))
}

/// Mirrors `isTidalURL` (host contains "tidal").
pub fn is_tidal_url(query: &str) -> bool {
    url_host(query).is_some_and(|h| h.contains("tidal"))
}

/// Strip `(…)` / `[…]` groups (mirrors `removeParenthesesContent`:
/// YouTube titles carry `(Prod. …)` extras Deezer/Spotify don't).
pub fn remove_parentheses_content(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut depth: usize = 0;
    for ch in text.chars() {
        match ch {
            '(' | '[' => depth += 1,
            ')' | ']' => {
                depth = depth.saturating_sub(1);
            }
            _ => {
                if depth == 0 {
                    out.push(ch);
                }
            }
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Drop YouTube tracking/playlist params (mirrors `sanitizeYoutubeUrl`).
/// Non-YouTube inputs pass through untouched.
pub fn sanitize_youtube_url(input: &str) -> String {
    let host = match url_host(input) {
        Some(h) => h,
        None => return input.to_string(),
    };
    let is_yt = [
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "music.youtube.com",
    ]
    .iter()
    .any(|h| host == *h || host.ends_with(&format!(".{h}")));
    if !is_yt {
        return input.to_string();
    }
    const DROP: &[&str] = &[
        "si",
        "t",
        "list",
        "index",
        "start_radio",
        "pp",
        "feature",
        "embeds_referring_euri",
        "source_ve_path",
        "app",
    ];
    let (base, query) = match input.split_once('?') {
        Some((b, q)) => (b, q),
        None => return input.to_string(),
    };
    let kept: Vec<&str> = query
        .split('&')
        .filter(|pair| {
            let key = pair.split('=').next().unwrap_or("");
            !DROP.contains(&key)
        })
        .collect();
    if kept.is_empty() {
        base.to_string()
    } else {
        format!("{base}?{}", kept.join("&"))
    }
}

/// Mask raw links in track titles (mirrors `maskLink`: any title
/// carrying a URL-ish token becomes `Hidden Link`).
pub fn mask_link(input: &str) -> String {
    const BLACKLIST: &[&str] = &["http://", "https://", "discordapp", ".com", ".gg"];
    if BLACKLIST.iter().any(|b| input.contains(b)) {
        return "Hidden Link".to_string();
    }
    input.to_string()
}

/// Apply [`mask_link`] to every loaded track title in place (mirrors
/// the `res.tracks.forEach(track => track.info.title =
/// maskLink(...))` leg in `handleMusicPlay`).
pub fn mask_tracks(mut tracks: Vec<Track>) -> Vec<Track> {
    for t in &mut tracks {
        t.info.title = mask_link(&t.info.title);
    }
    tracks
}

/// Levenshtein distance (mirrors `music_proximity.levenshtein`).
pub fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    for i in 1..=a.len() {
        let mut cur = vec![i; b.len() + 1];
        for j in 1..=b.len() {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            cur[j] = (prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + cost);
        }
        prev = cur;
    }
    prev[b.len()]
}

/// Similarity score in 0..=1 (mirrors `music_proximity.similarity`).
pub fn proximity_similarity(a: &str, b: &str) -> f64 {
    let dist = levenshtein(&a.to_lowercase(), &b.to_lowercase()) as f64;
    let max_len = a.chars().count().max(b.chars().count()) as f64;
    if max_len == 0.0 {
        1.0
    } else {
        1.0 - dist / max_len
    }
}

/// `title + author` label compared against queries (mirrors
/// `buildTrackLabel`).
pub fn build_track_label(title: &str, author: &str) -> String {
    format!("{} {}", title.trim(), author.trim())
        .trim()
        .to_string()
}

/// Word-level fuzzy match (mirrors `music_proximity.isSimilar` with
/// its default 0.5 / 0.6 thresholds): every query word needs a
/// track word scoring >= word_threshold, and the share of matched
/// words must reach threshold.
pub fn is_similar(query: &str, title: &str, author: &str) -> bool {
    is_similar_thresholds(query, title, author, 0.5, 0.6)
}

pub fn is_similar_thresholds(
    query: &str,
    title: &str,
    author: &str,
    threshold: f64,
    word_threshold: f64,
) -> bool {
    let query_words: Vec<String> = query
        .to_lowercase()
        .split_whitespace()
        .map(str::to_string)
        .collect();
    if query_words.is_empty() {
        return false;
    }
    let track_words: Vec<String> = format!("{} {}", author.to_lowercase(), title.to_lowercase())
        .split_whitespace()
        .map(str::to_string)
        .collect();
    let mut matched = 0usize;
    for qw in &query_words {
        let best = track_words
            .iter()
            .map(|tw| proximity_similarity(qw, tw))
            .fold(0.0f64, f64::max);
        if best >= word_threshold {
            matched += 1;
        }
    }
    matched as f64 / query_words.len() as f64 >= threshold
}

/// A loaded search hit counts when it carries a titled first track
/// (mirrors `responseExist`).
pub fn response_exists(tracks: &[Track]) -> bool {
    tracks
        .first()
        .is_some_and(|t| !t.info.title.trim().is_empty())
}

/// Provider tag for the play reply (mirrors `platformLabel`:
/// Deezer / SoundCloud source lines, None otherwise).
pub fn platform_source_tag(uri: Option<&str>) -> Option<&'static str> {
    let url = uri?;
    if url.contains("deezer") {
        Some("Deezer")
    } else if url.contains("soundcloud") {
        Some("SoundCloud")
    } else {
        None
    }
}

/// Outcome of feeding one raw Lavalink node WS text frame.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FedWs {
    /// `ready` op: session stored via set_session.
    Session(String),
    Started,
    Ended,
    ErrorHandled,
    StuckHandled,
    Ignored,
}

/// Guild whose player aged out of its empty queue (mirrors the
/// onEmptyQueue destroyAfterMs path). Carries the voice channel so the
/// sweeper can OP4-leave and clear its status after the destroy.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IdleDestroyTarget {
    pub guild_id: u64,
    pub voice_channel: Option<u64>,
}

/// Discord gateway OP 4 (Voice State Update) payload builder. Sent on the
/// guild shard to join/move/leave a voice channel; the resulting
/// voice-state + voice-server events feed `note_voice_state` /
/// `note_voice_server` below (hook these in the serenity
/// voice_state_update / voice_server_update handlers).
pub fn voice_state_update_op(guild_id: u64, channel_id: Option<u64>) -> serde_json::Value {
    serde_json::json!({
        "op": 4,
        "d": {
            "guild_id": guild_id.to_string(),
            "channel_id": channel_id.map(|c| c.to_string()),
            "self_mute": false,
            "self_deaf": true,
        }
    })
}

/// Node WS endpoint (mirrors audio.rs `ws_url` + the path lava-rs
/// `connect_to_node` dials, but honors `secure`: lava-rs hardcodes
/// `ws://`, so wss nodes would fail the upgrade there).
pub fn node_ws_url(cfg: &NodeCfg) -> String {
    let scheme = if cfg.secure { "wss" } else { "ws" };
    format!("{}://{}:{}/v4/websocket", scheme, cfg.host, cfg.port)
}

/// Node WS handshake request. Headers mirror lava-rs
/// `connect_to_node` (Authorization + User-Id + Client-Name, Session-Id
/// for resume); the URL is [`node_ws_url`] so secure nodes dial wss.
pub fn node_ws_request(
    cfg: &NodeCfg,
    user_id: u64,
    session: Option<&str>,
) -> Result<tungstenite::handshake::client::Request, MusicError> {
    use tungstenite::http::header::HeaderValue;
    let hv = |v: &str| HeaderValue::from_str(v).map_err(|e| MusicError::Transport(e.to_string()));
    let mut builder = tungstenite::http::Request::builder()
        .method("GET")
        .uri(node_ws_url(cfg))
        .version(tungstenite::http::Version::HTTP_11)
        .header("Authorization", hv(&cfg.password)?)
        .header("User-Id", hv(&user_id.to_string())?)
        .header("Client-Name", hv(LAVALINK_CLIENT_NAME)?);
    if let Some(sid) = session {
        builder = builder.header("Session-Id", hv(sid)?);
    }
    builder
        .body(())
        .map_err(|e| MusicError::Transport(e.to_string()))
}

/// Half of the Lavalink voice handshake (mirrors raw.ts): Discord
/// VoiceStateUpdate gives the session id + channel, VoiceServerUpdate
/// gives token + endpoint. When both halves are present the combined
/// `VoiceState` is pushed to the node via update_player.
#[derive(Debug, Clone, Default)]
struct PendingVoice {
    channel_id: Option<u64>,
    discord_session_id: Option<String>,
    token: Option<String>,
    endpoint: Option<String>,
}

impl PendingVoice {
    fn combined(&self) -> Option<VoiceState> {
        Some(VoiceState {
            token: self.token.clone()?,
            endpoint: self.endpoint.clone()?,
            session_id: self.discord_session_id.clone()?,
            channel_id: self.channel_id.map(|c| c.to_string()).unwrap_or_default(),
        })
    }
}

/// Discord-side deps for the trackError report leg (mirrors the
/// register_shard pattern: captured once at ready, read on the feed).
#[derive(Debug, Clone)]
pub struct ExceptionReportCtx {
    pub http: Arc<serenity::Http>,
    pub logs_channel_id: String,
    pub owners: Vec<String>,
}

pub struct LavalinkManager {
    nodes: RwLock<Vec<Arc<NodeEntry>>>,
    players: Mutex<HashMap<u64, GuildPlayer>>,
    pending_voice: Mutex<HashMap<u64, PendingVoice>>,
    dispatcher: Mutex<EventDispatcher>,
    http: reqwest::Client,
    /// Discord shard messengers by shard id (registered at ready; OP4
    /// leave must go out on the shard serving the guild).
    shards: Mutex<HashMap<u64, serenity::ShardMessenger>>,
    /// Total shard count for guild->shard routing (bot.rs shard-count
    /// site; None until known, e.g. autoshard pre-ready).
    total_shards: Mutex<Option<u64>>,
    /// Track-error report deps (live Http + lavalink_logs_channel_id +
    /// owners snapshot, registered once at ready). When set, the feed
    /// TrackException arm runs the bot.rs wrapper; when unset (tests,
    /// pre-ready) it falls back to the offline recovery.
    exception_report: Mutex<Option<ExceptionReportCtx>>,
    /// Guilds whose trackStart announce is suppressed while TTS owns
    /// the player (mirrors the `getTTSData` early-return in the TS
    /// `trackStart` handler). Set when a play/TTS cleanup runs, read
    /// by [`LavalinkManager::announce_track_start`].
    tts_suppressed: Mutex<HashSet<u64>>,
    /// In-memory LastFM playback sessions per guild (mirrors the TS
    /// `guildSessions` map in lastFMScrobblerManager.ts). Fed by the
    /// track start/end/queue-end hooks; the HTTP scrobble POST itself
    /// stays with the live caller (needs per-user session keys).
    lastfm_sessions: Mutex<HashMap<u64, LastFmSession>>,
}

impl LavalinkManager {
    pub fn new() -> Self {
        Self {
            nodes: RwLock::new(vec![]),
            players: Mutex::new(HashMap::new()),
            pending_voice: Mutex::new(HashMap::new()),
            dispatcher: Mutex::new(EventDispatcher::new()),
            http: reqwest::Client::new(),
            shards: Mutex::new(HashMap::new()),
            total_shards: Mutex::new(None),
            exception_report: Mutex::new(None),
            tts_suppressed: Mutex::new(HashSet::new()),
            lastfm_sessions: Mutex::new(HashMap::new()),
        }
    }

    /// Reconcile node list with config (idempotent; preserves sessions).
    pub async fn sync_nodes(&self, cfgs: &[NodeCfg], user_id: u64) {
        let mut nodes = self.nodes.write().await;
        let mut kept: Vec<Arc<NodeEntry>> = vec![];
        for cfg in cfgs {
            if cfg.host.trim().is_empty() {
                continue;
            }
            if let Some(existing) = nodes.iter().find(|n| n.id == cfg.id) {
                kept.push(Arc::clone(existing));
            } else {
                kept.push(Arc::new(NodeEntry::new(cfg, user_id)));
            }
        }
        *nodes = kept;
    }

    pub async fn is_live(&self) -> bool {
        !self.nodes.read().await.is_empty()
    }

    pub async fn require_live(&self) -> Result<(), MusicError> {
        if self.is_live().await {
            Ok(())
        } else {
            Err(MusicError::NoNodes)
        }
    }

    /// Guild-affine node order: the affine pick first, then the rest
    /// in stable config order. Failover legs walk this order and use
    /// the first node with a ready session instead of failing when
    /// only the primary is down.
    pub async fn nodes_in_failover_order(&self, guild_id: u64) -> Vec<Arc<NodeEntry>> {
        let nodes = self.nodes.read().await;
        if nodes.is_empty() {
            return vec![];
        }
        let start = guild_id as usize % nodes.len();
        (0..nodes.len())
            .map(|i| Arc::clone(&nodes[(start + i) % nodes.len()]))
            .collect()
    }

    /// Deterministic node pick (guild-affine, mirrors least-penalty
    /// routing intent without live stats in the offline path).
    /// First entry of [`Self::nodes_in_failover_order`].
    pub async fn node_for(&self, guild_id: u64) -> Option<Arc<NodeEntry>> {
        self.nodes_in_failover_order(guild_id)
            .await
            .into_iter()
            .next()
    }

    pub async fn set_session(&self, node_id: &str, session: String) {
        let nodes = self.nodes.read().await;
        if let Some(n) = nodes.iter().find(|n| n.id == node_id) {
            n.set_session(session).await;
        }
    }

    pub async fn node_session(&self, node_id: &str) -> Option<String> {
        let nodes = self.nodes.read().await;
        let node = nodes.iter().find(|n| n.id == node_id)?;
        node.session().await
    }

    // ---- event callbacks (lava-rs EventDispatcher) ----

    pub async fn on_track_start<F, Fut>(&self, handler: F)
    where
        F: Fn(TrackStartEvent) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send,
    {
        self.dispatcher.lock().await.on_track_start(handler);
    }

    pub async fn on_track_end<F, Fut>(&self, handler: F)
    where
        F: Fn(TrackEndEvent) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send,
    {
        self.dispatcher.lock().await.on_track_end(handler);
    }

    pub async fn on_track_exception<F, Fut>(&self, handler: F)
    where
        F: Fn(TrackExceptionEvent) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send,
    {
        self.dispatcher.lock().await.on_track_exception(handler);
    }

    pub async fn on_track_stuck<F, Fut>(&self, handler: F)
    where
        F: Fn(TrackStuckEvent) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send,
    {
        self.dispatcher.lock().await.on_track_stuck(handler);
    }

    /// Incoming WS TrackStart: refresh current from the node payload and
    /// fan out to registered callbacks (mirrors playerManager trackStart).
    pub async fn handle_track_start(&self, ev: TrackStartEvent) {
        if let Ok(gid) = ev.guild_id.parse::<u64>() {
            let mut players = self.players.lock().await;
            let p = players.entry(gid).or_insert_with(GuildPlayer::new);
            p.current = Some(QueuedTrack::from((&ev.track, 0)));
            p.idle_since_ms = None;
            p.paused = false;
            let requester = p.current.as_ref().map(|t| t.requester).unwrap_or(0);
            drop(players);
            // LastFM start hook (mirrors
            // lastFMScrobbler.handleTrackStart: clear the old session,
            // open a new one for this track).
            self.lastfm_track_start(
                gid,
                ev.track.info.author.clone(),
                ev.track.info.title.clone(),
                ev.track.info.length,
                requester,
                now_ms_wall(),
            )
            .await;
        }
        self.dispatcher.lock().await.dispatch_track_start(ev).await;
    }

    /// Open (replacing any stale) LastFM session for a starting track
    /// (mirrors `handleTrackStart` clearing + setting guildSessions).
    pub async fn lastfm_track_start(
        &self,
        guild_id: u64,
        artist: String,
        title: String,
        duration_ms: u64,
        requester: u64,
        now_ms: i64,
    ) {
        self.lastfm_sessions.lock().await.insert(
            guild_id,
            LastFmSession {
                artist,
                title,
                duration_ms,
                requester,
                started_ms: now_ms,
            },
        );
    }

    /// Close the session at track end, returning the scrobble payload
    /// when the listen counts (mirrors `handleTrackEnd` +
    /// `tryScrobbleListener`; load-failed tracks are dropped by the
    /// caller before reaching here).
    pub async fn lastfm_track_end_due(&self, guild_id: u64, now_ms: i64) -> Option<ScrobbleDue> {
        let session = self.lastfm_sessions.lock().await.remove(&guild_id)?;
        let played_ms = (now_ms - session.started_ms).max(0) as u64;
        if should_scrobble(session.duration_ms, played_ms) {
            Some(ScrobbleDue {
                artist: session.artist,
                title: session.title,
                duration_ms: session.duration_ms,
                requester: session.requester,
                started_ms: session.started_ms,
            })
        } else {
            None
        }
    }

    /// Drop the session with no scrobble (mirrors `handleQueueEnd` ->
    /// clearGuildSession).
    pub async fn lastfm_queue_end(&self, guild_id: u64) {
        self.lastfm_sessions.lock().await.remove(&guild_id);
    }

    /// Mark a guild as TTS-owned so the next trackStart announce is
    /// skipped (mirrors the `getTTSData` early-return). Cleared when a
    /// play/TTS cleanup runs.
    pub async fn set_tts_suppressed(&self, guild_id: u64, suppressed: bool) {
        let mut set = self.tts_suppressed.lock().await;
        if suppressed {
            set.insert(guild_id);
        } else {
            set.remove(&guild_id);
        }
    }

    async fn is_tts_suppressed(&self, guild_id: u64) -> bool {
        self.tts_suppressed.lock().await.contains(&guild_id)
    }

    /// Incoming WS TrackEnd: advance state per reason, fan out, and when
    /// live push the next track to the node (queue auto-advance). A
    /// loop-track Replay re-pushes the same encoded track (without this
    /// the node would go idle and the loop would never replay).
    pub async fn handle_track_end(&self, ev: TrackEndEvent, now_ms: i64) {
        let (outcome, next_encoded): AdvanceStep = {
            let gid = ev.guild_id.parse::<u64>().ok();
            let mut players = self.players.lock().await;
            if let Some(gid) = gid {
                if let Some(p) = players.get_mut(&gid) {
                    let adv = p.advance_on_end(&ev.reason, now_ms);
                    match adv {
                        AdvanceOutcome::Next | AdvanceOutcome::Replay => {
                            let enc = p.current.as_ref().map(|t| t.encoded.clone());
                            drop(players);
                            let live = self.live_node_and_session(gid).await.ok();
                            match (live, enc) {
                                (Some((n, s)), Some(e)) => (Some(adv), Some((n, s, e))),
                                _ => (Some(adv), None),
                            }
                        }
                        other => (Some(other), None),
                    }
                } else {
                    (None, None)
                }
            } else {
                (None, None)
            }
        };
        if let Some((node, session, encoded)) = next_encoded {
            let gid = ev.guild_id.parse::<u64>().unwrap_or(0);
            let _ = self.rest_play(&node, &session, gid, &encoded, false).await;
        }
        // LastFM scrobble hooks (mirrors playerManager.ts trackEnd ->
        // lastFMScrobbler.handleTrackEnd, and the Idle drain -> queueEnd
        // -> handleQueueEnd leg). Load-failed tracks never scrobble.
        if let Ok(gid) = ev.guild_id.parse::<u64>() {
            match outcome {
                Some(AdvanceOutcome::Idle) => {
                    self.lastfm_queue_end(gid).await;
                }
                Some(_) => {
                    if !matches!(ev.reason, TrackEndReason::LoadFailed) {
                        self.lastfm_track_end_due(gid, now_ms).await;
                    } else {
                        self.lastfm_queue_end(gid).await;
                    }
                }
                None => {}
            }
        }
        self.dispatcher.lock().await.dispatch_track_end(ev).await;
    }

    // ---- trackError recovery (mirrors playerManager.ts trackError) ----

    /// Incoming WS TrackException: log the owner-visible diagnostics,
    /// try the TS fallback re-search branches, else skip to the next
    /// queued track (or idle). The live re-search + requeue legs are
    /// best-effort: with no live node/session the state still advances
    /// so the offline path stays unit-testable.
    pub async fn handle_track_exception(
        &self,
        ev: TrackExceptionEvent,
        now_ms: i64,
    ) -> ErrorRecovery {
        let gid = match ev.guild_id.parse::<u64>() {
            Ok(g) => g,
            Err(_) => return ErrorRecovery::NoPlayer,
        };
        let failed = match self.snapshot(gid).await.and_then(|s| s.current) {
            Some(t) => t,
            None => return ErrorRecovery::NoPlayer,
        };
        let report = Self::track_error_report(
            &ev,
            Some(failed.requester),
            self.node_for_guild_hint(&ev.guild_id).await.as_deref(),
        );
        tracing::error!("lavalink trackError: {report}");
        if let Some(source) = fallback_source_for(&ev.exception.message) {
            let query = fallback_identifier(source, &failed.title, &failed.author);
            if let Ok((node, session)) = self.live_node_and_session(gid).await {
                match self.rest_load(&node, &query).await {
                    Ok(loaded) => {
                        let mut tracks = load_tracks_flat(loaded);
                        if !tracks.is_empty() {
                            let requester = failed.requester;
                            let first = QueuedTrack::from((&tracks.remove(0), requester));
                            let title = first.title.clone();
                            let encoded = first.encoded.clone();
                            self.with_player(gid, |p| {
                                p.current = Some(first);
                                for t in tracks.drain(..) {
                                    p.queue.push_back(QueuedTrack::from((&t, requester)));
                                }
                                p.idle_since_ms = None;
                            })
                            .await;
                            let _ = self.rest_play(&node, &session, gid, &encoded, false).await;
                            self.dispatcher
                                .lock()
                                .await
                                .dispatch_track_exception(ev)
                                .await;
                            return ErrorRecovery::Requeued { title };
                        }
                    }
                    Err(e) => {
                        tracing::warn!("lavalink trackError fallback search failed: {e}");
                    }
                }
            }
        }
        let outcome = self.skip_to_next(gid, now_ms).await;
        self.dispatcher
            .lock()
            .await
            .dispatch_track_exception(ev)
            .await;
        outcome
    }

    /// Incoming WS TrackStuck: the TS side has no stuck branch, so this
    /// skips the wedged track (state always advances) and logs the
    /// owner-visible diagnostics, mirroring the trackError log leg.
    pub async fn handle_track_stuck(&self, ev: TrackStuckEvent, now_ms: i64) -> ErrorRecovery {
        let report = format!(
            "trackStuck guild={} threshold_ms={} track={} - {} uri={} encoded={}",
            ev.guild_id,
            ev.threshold_ms,
            ev.track.info.title,
            ev.track.info.author,
            ev.track.info.uri.as_deref().unwrap_or("-"),
            ev.track.encoded,
        );
        tracing::error!("lavalink trackStuck: {report}");
        let gid = match ev.guild_id.parse::<u64>() {
            Ok(g) => g,
            Err(_) => return ErrorRecovery::NoPlayer,
        };
        if self.snapshot(gid).await.is_none() {
            return ErrorRecovery::NoPlayer;
        }
        let outcome = self.skip_to_next(gid, now_ms).await;
        self.dispatcher.lock().await.dispatch_track_stuck(ev).await;
        outcome
    }

    /// Pop the failed/wedged current track and start the next queued
    /// one (live rest_play is best-effort; offline only state moves).
    async fn skip_to_next(&self, guild_id: u64, now_ms: i64) -> ErrorRecovery {
        let advanced: Option<bool> = {
            let mut players = self.players.lock().await;
            match players.get_mut(&guild_id) {
                Some(p) => {
                    p.skip(now_ms);
                    Some(p.current.is_some())
                }
                None => None,
            }
        };
        match advanced {
            None => ErrorRecovery::NoPlayer,
            Some(false) => ErrorRecovery::Idle,
            Some(true) => {
                let encoded = self
                    .snapshot(guild_id)
                    .await
                    .and_then(|s| s.current.map(|t| t.encoded));
                match encoded {
                    Some(e) => {
                        if let Ok((node, session)) = self.live_node_and_session(guild_id).await {
                            let _ = self.rest_play(&node, &session, guild_id, &e, false).await;
                        }
                        ErrorRecovery::Advanced
                    }
                    None => ErrorRecovery::Idle,
                }
            }
        }
    }

    /// Best-effort node hint for the diagnostics report (id/host/port/
    /// secure of the guild-affine node, if any). Never fails.
    async fn node_for_guild_hint(&self, guild_id: &str) -> Option<String> {
        let gid = guild_id.parse::<u64>().ok()?;
        let node = self.node_for(gid).await?;
        Some(format!(
            "{} {}:{} secure={}",
            node.id,
            node.lava_cfg.host,
            node.lava_cfg.port,
            if node.secure { "yes" } else { "no" },
        ))
    }

    /// Full owner-visible diagnostics document for a failed track: a
    /// one-line summary (kept in the tracing log) followed by the
    /// markdown body posted to the lavalink error channel. Mirrors the
    /// TS `trackError` error_log fields: client ping/status, guild,
    /// requester, title/author/uri/encoded, source, stream flag,
    /// exception message/severity/cause, node hint.
    pub fn track_error_report(
        ev: &TrackExceptionEvent,
        requester: Option<u64>,
        node_hint: Option<&str>,
    ) -> String {
        Self::track_error_report_with_client_stats(ev, requester, None, node_hint, None, None)
    }

    /// [`Self::track_error_report`] plus the live client stats (WS
    /// ping/status, mirroring the TS `## Client about` block) and the
    /// requester's global username when the caller knows it. Pass None
    /// for stats the caller cannot observe; they render as `-`.
    pub fn track_error_report_with_client_stats(
        ev: &TrackExceptionEvent,
        requester: Option<u64>,
        requester_name: Option<&str>,
        node_hint: Option<&str>,
        ws_ping_ms: Option<u64>,
        ws_status: Option<&str>,
    ) -> String {
        let requester_tag = requester
            .map(|r| format!("<@{r}>"))
            .unwrap_or_else(|| "-".to_string());
        let generated_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let ping = ws_ping_ms
            .map(|p| format!("{p}ms"))
            .unwrap_or_else(|| "-".to_string());
        format!(
            "trackError guild={} requester={} track={} - {} uri={} encoded={} source={} error={} node={}\n\
             \n\
             ==================================================================================\n\
             \n\
             # Oops! Lavalink issue when lavalink-client \"trackError\" event.\n\
             \n\
             ==================================================================================\n\
             \n\
             # Debug Info\n\
             \n\
             ## Client about\n\
             Client:\n\
             \u{20} * WS ping: `{ping}`\n\
             \u{20} * WS status: `{}`\n\
             \n\
             ## Guild about\n\
             Guild:\n\
             \u{20} * Guild ID: `{}`\n\
             \u{20} * requester User ID: `{}`\n\
             \u{20} * requester global username: `{}`\n\
             \n\
             ## Track about\n\
             Track:\n\
             \u{20} * Track Info (title, author): `{} - {}`\n\
             \u{20} * Uri: `{}`\n\
             \u{20} * Encoded: `{}`\n\
             Source: `{}`\n\
             Stream?: `{}`\n\
             \n\
             ## Error\n\
             <TrackExceptionEvent>.error: `{}`\n\
             <TrackExceptionEvent>.exception.severity: `{}`\n\
             <TrackExceptionEvent>.exception.cause: `{}`\n\
             \n\
             ## Node about\n\
             Node: `{}`\n\
             \n\
             Report generated at `{generated_ms}ms`",
            ev.guild_id,
            requester_tag,
            ev.track.info.title,
            ev.track.info.author,
            ev.track.info.uri.as_deref().unwrap_or("-"),
            ev.track.encoded,
            ev.track.info.source_name,
            ev.exception.message,
            node_hint.unwrap_or("-"),
            ws_status.unwrap_or("-"),
            ev.guild_id,
            requester_tag,
            requester_name.unwrap_or("-"),
            ev.track.info.title,
            ev.track.info.author,
            ev.track.info.uri.as_deref().unwrap_or("-"),
            ev.track.encoded,
            ev.track.info.source_name,
            if ev.track.info.is_stream { "yes" } else { "no" },
            ev.exception.message,
            ev.exception.severity,
            ev.exception.cause,
            node_hint.unwrap_or("-"),
        )
    }

    /// Parse the configured lavalink error-channel id. Empty/unset or
    /// non-numeric values mean no channel (mirrors the TS fetch-fail
    /// guard that leaves `lavalink_error_channel` unusable).
    pub fn resolve_error_channel_id(raw: &str) -> Option<u64> {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return None;
        }
        trimmed.parse::<u64>().ok()
    }

    /// Owner-ping line posted above the diagnostics file. Mirrors the
    /// TS `"<@" + owners[0] + ">\nIssue with lavalink founded!"`
    /// send; no ping when no owner is configured.
    pub fn error_report_content(first_owner: Option<&str>) -> String {
        match first_owner.map(str::trim).filter(|s| !s.is_empty()) {
            Some(owner) => format!("<@{owner}>\nIssue with lavalink founded!"),
            None => "Issue with lavalink founded!".to_string(),
        }
    }

    /// Diagnostics attachment name (mirrors the TS
    /// `` `logs-${Date.now()}.md` `` file).
    pub fn error_report_filename(now_ms: i64) -> String {
        format!("logs-{now_ms}.md")
    }

    /// Guild-facing notice for the Requeued recovery leg (the TS side
    /// requeues the fallback hit silently; the guild only sees
    /// playback restart).
    pub fn requeued_notice_text(title: &str) -> String {
        format!("Fallback track requeued: {title}")
    }

    /// Post the full trackError report + owner ping to the configured
    /// lavalink error channel (the TS error-channel send leg, with the
    /// markdown report as a `.md` attachment). Returns false when the
    /// channel id is unset/unparsable or the send fails.
    pub async fn post_track_error_report(
        http: &serenity::Http,
        raw_channel_id: &str,
        first_owner: Option<&str>,
        report: &str,
        now_ms: i64,
    ) -> bool {
        let Some(channel) = Self::resolve_error_channel_id(raw_channel_id) else {
            return false;
        };
        let message = serenity::CreateMessage::new()
            .content(Self::error_report_content(first_owner))
            .add_file(serenity::CreateAttachment::bytes(
                report.as_bytes().to_vec(),
                Self::error_report_filename(now_ms),
            ));
        serenity::ChannelId::new(channel)
            .send_message(http, message)
            .await
            .is_ok()
    }

    /// Post the trackError skip detail to the guild's stored text
    /// channel (guild-visible leg; the full report goes to the
    /// dedicated error channel via
    /// [`Self::post_track_error_report`]).
    pub async fn announce_track_error(&self, http: &serenity::Http, guild_id: u64, detail: &str) {
        let snap = self.snapshot(guild_id).await;
        let Some(s) = snap else { return };
        let Some(ch) = s.text_channel else { return };
        let _ = serenity::ChannelId::new(ch)
            .say(http, format!("Track error skipped: {detail}"))
            .await;
    }

    /// Post the Requeued recovery notice to the guild's stored text
    /// channel (guild-visible leg of the fallback re-search hit).
    pub async fn announce_requeued(&self, http: &serenity::Http, guild_id: u64, title: &str) {
        let snap = self.snapshot(guild_id).await;
        let Some(s) = snap else { return };
        let Some(ch) = s.text_channel else { return };
        let _ = serenity::ChannelId::new(ch)
            .say(http, Self::requeued_notice_text(title))
            .await;
    }

    // ---- LastFM scrobble hooks (mirrors lastFMScrobblerManager.ts) ----
    // Session types + threshold fns live at module level
    // (`LastFmSession`, `scrobble_threshold_ms`, `should_scrobble`).

    pub async fn note_voice_state(
        &self,
        guild_id: u64,
        channel_id: Option<u64>,
        discord_session_id: String,
    ) -> Option<VoiceState> {
        let mut pending = self.pending_voice.lock().await;
        let entry = pending.entry(guild_id).or_default();
        entry.channel_id = channel_id;
        entry.discord_session_id = Some(discord_session_id);
        entry.combined()
    }

    pub async fn note_voice_server(
        &self,
        guild_id: u64,
        token: String,
        endpoint: String,
    ) -> Option<VoiceState> {
        let mut pending = self.pending_voice.lock().await;
        let entry = pending.entry(guild_id).or_default();
        entry.token = Some(token);
        entry.endpoint = Some(endpoint);
        entry.combined()
    }

    pub async fn take_pending_voice(&self, guild_id: u64) -> Option<VoiceState> {
        let pending = self.pending_voice.lock().await;
        pending.get(&guild_id).and_then(|p| p.combined())
    }

    /// Push a completed Discord voice handshake to the guild node
    /// (mirrors the update_player voice forward fed by raw.ts).
    pub async fn push_voice_state(
        &self,
        guild_id: u64,
        voice: VoiceState,
    ) -> Result<(), MusicError> {
        let (node, session) = self.live_node_and_session(guild_id).await?;
        self.rest_set_voice(&node, &session, guild_id, voice)
            .await?;
        Ok(())
    }

    // ---- stage channels (no TS equivalent; intentional addition) ----

    /// True for Stage voice channels: bots join them suppressed
    /// (audience) and must be unsuppressed before audio is heard.
    /// The TS side never detects this (playerManager.ts has no
    /// stage branch), so joining a stage silently plays to nobody.
    pub fn is_stage_channel(kind: serenity::ChannelType) -> bool {
        matches!(kind, serenity::ChannelType::Stage)
    }

    /// Best-effort request to speak on a stage channel (unsuppress
    /// the bot via PATCH voice-state/@me, the bot equivalent of
    /// accepting a speak invite). False on any HTTP failure, in
    /// which case the caller refuses the play with a user message.
    pub async fn request_stage_speaker(
        http: &serenity::Http,
        guild_id: u64,
        channel_id: u64,
    ) -> bool {
        http.edit_voice_state_me(
            serenity::GuildId::new(guild_id),
            &serde_json::json!({
                "channel_id": channel_id.to_string(),
                "suppress": false,
            }),
        )
        .await
        .is_ok()
    }

    // ---- node websocket feed (ready session + track events) ----

    /// Parse a node `ready` payload
    /// (`{"op":"ready","resumed":false,"sessionId":"..."}`) into its
    /// session id. Anything else (unknown/hello-style ops, garbage)
    /// yields None — Lavalink v4 sends no `hello`; only `ready`
    /// carries a session. Uses lava-rs's dedicated ReadyPayload
    /// parser: the generic LavalinkEvent enum cannot take ready
    /// frames (its inner struct redeclares the `op` tag field).
    pub fn parse_ready_session(text: &str) -> Option<String> {
        ReadyPayload::parse(text).map(|p| p.session_id)
    }

    /// Feed one raw Lavalink node WS text frame: `ready` stores the
    /// session (feeds `set_session`, previously unwired);
    /// track start/end reuse the state handlers + dispatcher fan-out;
    /// exception runs the bot.rs trackError wrapper when report deps
    /// are registered (else the offline recovery); stuck runs the
    /// trackError recovery (fallback re-search, then requeue, else
    /// skip) with the owner-visible log leg.
    /// Stats/playerUpdate/closed frames are ignored.
    pub async fn feed_node_ws(&self, node_id: &str, text: &str, now_ms: i64) -> FedWs {
        if let Some(ready) = ReadyPayload::parse(text) {
            self.set_session(node_id, ready.session_id.clone()).await;
            return FedWs::Session(ready.session_id);
        }
        match LavalinkEvent::parse(text) {
            Some(LavalinkEvent::Event(ev)) => match *ev {
                TrackEvent::TrackStartEvent(e) => {
                    self.handle_track_start(e).await;
                    FedWs::Started
                }
                TrackEvent::TrackEndEvent(e) => {
                    self.handle_track_end(e, now_ms).await;
                    FedWs::Ended
                }
                TrackEvent::TrackExceptionEvent(e) => {
                    match self.exception_report_ctx().await {
                        Some(ctx) => {
                            crate::bot::handle_track_exception_event(
                                &ctx.http,
                                &ctx.logs_channel_id,
                                &ctx.owners,
                                e,
                                now_ms,
                            )
                            .await;
                        }
                        None => {
                            self.handle_track_exception(e, now_ms).await;
                        }
                    }
                    FedWs::ErrorHandled
                }
                TrackEvent::TrackStuckEvent(e) => {
                    self.handle_track_stuck(e, now_ms).await;
                    FedWs::StuckHandled
                }
                _ => FedWs::Ignored,
            },
            _ => FedWs::Ignored,
        }
    }

    // ---- node websocket dial (ready / reconnect) ----

    /// Blocking dial + read for one node (runs in spawn_blocking):
    /// forwards text frames to the async pump, answers Ping, returns on
    /// close/error so the supervisor redials.
    fn read_node_ws(
        req: tungstenite::handshake::client::Request,
        tx: tokio::sync::mpsc::UnboundedSender<String>,
    ) -> Result<(), String> {
        let (mut sock, _) = tungstenite::connect(req).map_err(|e| e.to_string())?;
        loop {
            match sock.read() {
                Ok(tungstenite::Message::Text(t)) => {
                    if tx.send(t).is_err() {
                        break;
                    }
                }
                Ok(tungstenite::Message::Ping(d)) => {
                    let _ = sock.send(tungstenite::Message::Pong(d));
                }
                Ok(tungstenite::Message::Close(_)) => break,
                Ok(_) => {}
                Err(e) => return Err(e.to_string()),
            }
        }
        Ok(())
    }

    // ---- Discord gateway OP 4 (join/move/leave) ----

    /// Send a voice-state payload on the guild shard (mirrors
    /// sendToShard in playerManager.ts: join/move/leave). The shard
    /// messenger takes a tungstenite message as-is (serenity
    /// re-exports tokio-tungstenite's tungstenite 0.21 Message type,
    /// hence the direct tungstenite 0.21 dep).
    pub fn send_voice_state(
        shard: &serenity::ShardMessenger,
        guild_id: u64,
        channel_id: Option<u64>,
    ) {
        let payload = voice_state_update_op(guild_id, channel_id).to_string();
        shard.websocket_message(tungstenite::Message::Text(payload));
    }

    // ---- shard registry + OP4 leave (idle sweep leg) ----

    /// Remember one Discord shard messenger (call at ready per shard;
    /// OP4 leave must go out on the shard serving the guild).
    pub async fn register_shard(&self, shard_id: u64, shard: serenity::ShardMessenger) {
        self.shards.lock().await.insert(shard_id, shard);
    }

    /// Authoritative total shard count (bot.rs shard-count site).
    pub async fn set_total_shards(&self, total: u64) {
        *self.total_shards.lock().await = Some(total);
    }

    /// Fallback total (ready.shard.total) when the tuned count is still
    /// unknown, e.g. autoshard pre-boot. Never overwrites an explicit set.
    pub async fn ensure_total_shards(&self, total: u32) {
        if total == 0 {
            return;
        }
        let mut slot = self.total_shards.lock().await;
        if slot.is_none() {
            *slot = Some(total as u64);
        }
    }

    /// Capture the track-error report deps (call once at ready with the
    /// live Http handle + lavalink_logs_channel_id / owners config
    /// snapshot). The feed TrackException arm reads this (never a
    /// dispatcher subscriber: the wrapper dispatches, so subscribing
    /// it would recurse).
    pub async fn register_exception_report(
        &self,
        http: Arc<serenity::Http>,
        logs_channel_id: String,
        owners: Vec<String>,
    ) {
        *self.exception_report.lock().await = Some(ExceptionReportCtx {
            http,
            logs_channel_id,
            owners,
        });
    }

    async fn exception_report_ctx(&self) -> Option<ExceptionReportCtx> {
        self.exception_report.lock().await.clone()
    }

    /// OP4 leave on the shard serving `guild_id` (mirrors the
    /// sendToShard leave in the TS destroy path). False when no
    /// messenger is registered (yet) — the REST destroy + status clear
    /// still run; multi-shard fan-out per shard messenger is next.
    pub async fn leave_voice(&self, guild_id: u64) -> bool {
        let messenger = {
            let shards = self.shards.lock().await;
            let total = *self.total_shards.lock().await;
            match total {
                Some(t) if t > 0 => {
                    let sid = crate::funcs::guild_shard(guild_id, t);
                    shards.get(&sid).cloned()
                }
                _ => shards
                    .get(&0)
                    .cloned()
                    .or_else(|| shards.values().next().cloned()),
            }
        };
        match messenger {
            Some(m) => {
                Self::send_voice_state(&m, guild_id, None);
                true
            }
            None => false,
        }
    }

    /// True when the bot's own voice update left every channel, i.e.
    /// the `onDisconnect.destroyPlayer` leg applies (mirrors
    /// `playerOptions.onDisconnect.destroyPlayer: true`).
    pub fn should_destroy_on_disconnect(bot_channel: Option<u64>) -> bool {
        bot_channel.is_none()
    }

    /// Voice-disconnect cleanup (mirrors `onDisconnect.destroyPlayer:
    /// true` in playerManager.ts): drop the guild player state and
    /// REST-destroy the node player (best-effort, skipped offline).
    /// Returns the destroy target so the caller can OP4-leave + clear
    /// the voice status. Wire point: the bot's own voice_state_update
    /// with `channel_id == None` in events_handler.rs.
    pub async fn on_voice_disconnect(&self, guild_id: u64) -> Option<IdleDestroyTarget> {
        let target = self.remove_player(guild_id).await;
        self.lastfm_queue_end(guild_id).await;
        if let Ok((node, session)) = self.live_node_and_session(guild_id).await {
            let _ = self.rest_destroy(&node, &session, guild_id).await;
        }
        target
    }

    /// Clear a voice channel's status (mirrors
    /// changeVoiceChannelStatus(voiceChannelId, "") on queueEnd in
    /// playerManager.ts). Best-effort; false on any HTTP failure.
    pub async fn clear_voice_status(http: &serenity::Http, voice_channel_id: u64) -> bool {
        http.edit_voice_status(
            serenity::ChannelId::new(voice_channel_id),
            &serde_json::json!({ "status": "" }),
            None,
        )
        .await
        .is_ok()
    }

    /// Set a voice channel's status line (mirrors
    /// changeVoiceChannelStatus(voiceChannelId, `:musical_note: title -
    /// author`) on trackStart in playerManager.ts). Best-effort.
    pub async fn set_voice_status(
        http: &serenity::Http,
        voice_channel_id: u64,
        text: &str,
    ) -> bool {
        http.edit_voice_status(
            serenity::ChannelId::new(voice_channel_id),
            &serde_json::json!({ "status": text }),
            None,
        )
        .await
        .is_ok()
    }

    // ---- track-start announcements + empty-channel guard ----

    /// Track-start status line (mirrors the changeVoiceChannelStatus
    /// `:musical_note: title - author` payload in playerManager.ts).
    pub fn nowplaying_text(t: &QueuedTrack) -> String {
        format!(":musical_note: {} - {}", t.title, t.author)
    }

    /// Empty-channel guard (mirrors stopMusicOnEmptyVoiceChannel.ts:
    /// bot alone in its voice channel -> stop + leave). `occupants`
    /// counts every cached voice state in the bot channel, bot
    /// included, so `<= 1` means alone.
    pub fn should_leave_when_alone(player: &GuildPlayer, occupants: usize) -> bool {
        player.current.is_some() && occupants <= 1
    }

    /// Rich trackStart embed (mirrors the playerManager.ts trackStart
    /// send: `event_mp_playerStart` description + artwork image; the TS
    /// html2png banner has no Rust equivalent, so the node artwork is
    /// used directly). Pure and offline-testable; `lang_code` falls
    /// back to the embedded English template when the key is missing.
    pub fn track_start_embed(
        lang_code: &str,
        title: &str,
        author: &str,
        uri: Option<&str>,
        artwork: Option<&str>,
        voice_channel_id: u64,
        music_icon: &str,
    ) -> serenity::CreateEmbed {
        let desc = crate::lang::get(lang_code, "event_mp_playerStart")
            .unwrap_or_else(|| {
                "🎵 - Now playing [`${track.title}`](${url}) in **${queue.channel.name}**..."
                    .to_string()
            })
            .replace("${client.iHorizon_Emojis.Music_Icon}", music_icon)
            .replace("${track.title}", title)
            .replace("${queue.channel.name}", &format!("<#{voice_channel_id}>"))
            .replace("${url}", uri.unwrap_or(""));
        let _ = author;
        let mut embed = serenity::CreateEmbed::default()
            .colour(0x2B2D31)
            .description(desc);
        if let Some(art) = artwork.filter(|u| !u.is_empty()) {
            embed = embed.image(art);
        }
        embed
    }

    /// Post the trackStart announce for the current track (mirrors the
    /// trackStart handler in playerManager.ts):
    ///
    ///   - TTS early-return while the guild is TTS-suppressed;
    ///   - rich `event_mp_playerStart` embed with artwork;
    ///   - channel fallback when the stored text channel is gone (voice
    ///     channel, then any guild text channel, mirroring the TS
    ///     fallback chain);
    ///   - `:musical_note: title - author` voice status.
    ///
    /// Runs after handle_track_start on the WS feed path.
    pub async fn announce_track_start(&self, http: &serenity::Http, guild_id: u64) {
        if self.is_tts_suppressed(guild_id).await {
            return;
        }
        let snap = self.snapshot(guild_id).await;
        let Some(s) = snap else { return };
        let Some(cur) = s.current.as_ref() else {
            return;
        };
        let icon = crate::emojis::app_emoji_markup(http, "Music_Icon")
            .await
            .unwrap_or_else(|| "🎵".to_string());
        let embed = Self::track_start_embed(
            "en-US",
            &cur.title,
            &cur.author,
            cur.uri.as_deref(),
            cur.artwork.as_deref(),
            s.voice_channel.unwrap_or(0),
            &icon,
        );
        if let Some(vc) = s.voice_channel {
            let _ = Self::set_voice_status(http, vc, &Self::nowplaying_text(cur)).await;
        }
        // Primary leg: the stored text channel.
        if let Some(ch) = s.text_channel {
            if serenity::ChannelId::new(ch)
                .send_message(http, serenity::CreateMessage::new().embed(embed.clone()))
                .await
                .is_ok()
            {
                return;
            }
        }
        // Fallback leg (mirrors the TS deleted-channel fallback):
        // first text channel of the guild, then remember it.
        if let Ok(channels) = http.get_channels(serenity::GuildId::new(guild_id)).await {
            if let Some(fallback) = channels
                .iter()
                .find(|c| c.kind == serenity::ChannelType::Text)
            {
                let id = fallback.id.get();
                if fallback
                    .id
                    .send_message(http, serenity::CreateMessage::new().embed(embed))
                    .await
                    .is_ok()
                {
                    self.with_player(guild_id, |p| {
                        p.text_channel = Some(id);
                    })
                    .await;
                }
            }
        }
    }

    /// Register the dispatcher-level nowplaying announcer: every node
    /// TrackStart posts the rich announce to the stored text channel.
    /// Also registers the queueEnd voice-status clear (playerManager.ts
    /// `queueEnd` leg): when a TrackEnd drains the player to idle
    /// (no current track), the voice channel status is cleared.
    /// Call once on ready with the live Http handle.
    pub async fn register_announce(&self, http: Arc<serenity::Http>) {
        let start_http = Arc::clone(&http);
        self.dispatcher
            .lock()
            .await
            .on_track_start(move |ev: TrackStartEvent| {
                let http = Arc::clone(&start_http);
                async move {
                    let Ok(gid) = ev.guild_id.parse::<u64>() else {
                        return;
                    };
                    manager().announce_track_start(&http, gid).await;
                }
            });
        let idle_http = Arc::clone(&http);
        self.dispatcher
            .lock()
            .await
            .on_track_end(move |ev: TrackEndEvent| {
                let http = Arc::clone(&idle_http);
                async move {
                    let Ok(gid) = ev.guild_id.parse::<u64>() else {
                        return;
                    };
                    let snap = manager().snapshot(gid).await;
                    let idle = snap.as_ref().and_then(|s| s.current.clone()).is_none();
                    let vc = snap.as_ref().and_then(|s| s.voice_channel);
                    if idle {
                        if let Some(vc) = vc {
                            let _ = Self::clear_voice_status(&http, vc).await;
                        }
                    }
                }
            });
    }

    // ---- identifier routing (mirrors defaultSearchPlatform) ----

    /// Plain URLs pass through for server-side LavaSrc resolution
    /// (Spotify/Apple/Deezer/Tidal/YouTube); bare text gets ytsearch:.
    pub fn search_identifier(query: &str) -> String {
        let q = query.trim();
        if q.contains("://") {
            q.to_string()
        } else {
            format!("ytsearch:{q}")
        }
    }

    // ---- REST transport (scheme-aware; see module docs) ----

    async fn rest_get<T: serde::de::DeserializeOwned>(
        &self,
        node: &NodeEntry,
        endpoint: &str,
    ) -> Result<T, MusicError> {
        let res = self
            .http
            .get(format!("{}{endpoint}", node.base_url()))
            .header("Authorization", &node.lava_cfg.password)
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(MusicError::Rest(status.as_u16(), body));
        }
        res.json::<T>().await.map_err(MusicError::from)
    }

    async fn rest_patch<T: serde::de::DeserializeOwned>(
        &self,
        node: &NodeEntry,
        endpoint: &str,
        payload: &UpdatePlayerPayload,
    ) -> Result<T, MusicError> {
        let res = self
            .http
            .patch(format!("{}{endpoint}", node.base_url()))
            .header("Authorization", &node.lava_cfg.password)
            .json(payload)
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(MusicError::Rest(status.as_u16(), body));
        }
        res.json::<T>().await.map_err(MusicError::from)
    }

    async fn rest_delete(&self, node: &NodeEntry, endpoint: &str) -> Result<(), MusicError> {
        let res = self
            .http
            .delete(format!("{}{endpoint}", node.base_url()))
            .header("Authorization", &node.lava_cfg.password)
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(MusicError::Rest(status.as_u16(), body));
        }
        Ok(())
    }

    pub async fn rest_load(
        &self,
        node: &NodeEntry,
        identifier: &str,
    ) -> Result<LoadResult, MusicError> {
        let endpoint = format!("/v4/loadtracks?identifier={}", urlencoding(identifier));
        self.rest_get(node, &endpoint).await
    }

    pub async fn rest_play(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
        encoded: &str,
        no_replace: bool,
    ) -> Result<RestPlayer, MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace={no_replace}");
        let payload = UpdatePlayerPayload {
            encoded_track: Some(encoded.to_string()),
            ..Default::default()
        };
        self.rest_patch(node, &endpoint, &payload).await
    }

    pub async fn rest_set_paused(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
        paused: bool,
    ) -> Result<RestPlayer, MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace=false");
        let payload = UpdatePlayerPayload {
            paused: Some(paused),
            ..Default::default()
        };
        self.rest_patch(node, &endpoint, &payload).await
    }

    pub async fn rest_set_volume(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
        volume: u8,
    ) -> Result<RestPlayer, MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace=false");
        let payload = UpdatePlayerPayload {
            volume: Some(volume),
            ..Default::default()
        };
        self.rest_patch(node, &endpoint, &payload).await
    }

    pub async fn rest_destroy(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
    ) -> Result<(), MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}");
        self.rest_delete(node, &endpoint).await
    }

    /// Stop playback without destroying the node player (mirrors
    /// lavalink-client `player.stopPlaying()`: PATCH with an explicit
    /// null track, keeping the player + voice connection alive).
    /// `UpdatePlayerPayload` skips None fields, so this goes out as a
    /// raw `{"encodedTrack": null}` PATCH.
    pub async fn rest_stop_playing(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
    ) -> Result<(), MusicError> {
        let res = self
            .http
            .patch(format!(
                "{}/v4/sessions/{session}/players/{guild_id}?noReplace=false",
                node.base_url()
            ))
            .header("Authorization", &node.lava_cfg.password)
            .json(&serde_json::json!({ "encodedTrack": null }))
            .send()
            .await?;
        let status = res.status();
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            return Err(MusicError::Rest(status.as_u16(), body));
        }
        Ok(())
    }

    /// Push the Discord voice handshake (token/endpoint/session) to
    /// the node player (mirrors the voice forward in raw.ts).
    pub async fn rest_set_voice(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
        voice: VoiceState,
    ) -> Result<RestPlayer, MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace=false");
        let payload = UpdatePlayerPayload {
            voice: Some(voice),
            ..Default::default()
        };
        self.rest_patch(node, &endpoint, &payload).await
    }

    // ---- player state access ----

    pub async fn with_player<R>(&self, guild_id: u64, f: impl FnOnce(&mut GuildPlayer) -> R) -> R {
        let mut players = self.players.lock().await;
        f(players.entry(guild_id).or_insert_with(GuildPlayer::new))
    }

    pub async fn snapshot(&self, guild_id: u64) -> Option<PlayerSnapshot> {
        let players = self.players.lock().await;
        players.get(&guild_id).map(PlayerSnapshot::from)
    }

    // ---- idle destroy (TS onEmptyQueue.destroyAfterMs consumer) ----

    /// Guilds whose empty queue aged past [`EMPTY_QUEUE_DESTROY_AFTER_MS`].
    pub async fn destroy_due_guilds(&self, now_ms: i64) -> Vec<IdleDestroyTarget> {
        let players = self.players.lock().await;
        players
            .iter()
            .filter(|(_, p)| p.destroy_due(now_ms))
            .map(|(gid, p)| IdleDestroyTarget {
                guild_id: *gid,
                voice_channel: p.voice_channel,
            })
            .collect()
    }

    /// Drop one player state, returning its destroy target (if any).
    pub async fn remove_player(&self, guild_id: u64) -> Option<IdleDestroyTarget> {
        let mut players = self.players.lock().await;
        players.remove(&guild_id).map(|p| IdleDestroyTarget {
            guild_id,
            voice_channel: p.voice_channel,
        })
    }

    /// One idle-destroy step: for each due guild, REST DELETE the node
    /// player (best-effort; skipped with no live node/session so the
    /// offline path still drops state) and drop the player. Returns the
    /// destroyed targets so the caller can OP4-leave + clear status.
    pub async fn sweep_idle_destroy(&self, now_ms: i64) -> Vec<IdleDestroyTarget> {
        let due = self.destroy_due_guilds(now_ms).await;
        let mut done = Vec::with_capacity(due.len());
        for t in due {
            if let Ok((node, session)) = self.live_node_and_session(t.guild_id).await {
                let _ = self.rest_destroy(&node, &session, t.guild_id).await;
            }
            self.players.lock().await.remove(&t.guild_id);
            done.push(t);
        }
        done
    }

    // ---- high-level flows used by music/ commands ----

    pub async fn live_node_and_session(
        &self,
        guild_id: u64,
    ) -> Result<(Arc<NodeEntry>, String), MusicError> {
        let ordered = self.nodes_in_failover_order(guild_id).await;
        let first = ordered.first().ok_or(MusicError::NoNodes)?;
        for node in &ordered {
            if let Some(session) = node.session().await {
                return Ok((Arc::clone(node), session));
            }
        }
        Err(MusicError::NoSession(first.id.clone()))
    }

    /// Load one identifier on the live node (failover order). Thin
    /// wrapper so the search pipeline reads like the TS
    /// `node.search(...)` legs.
    async fn load_on_live_node(
        &self,
        guild_id: u64,
        identifier: &str,
    ) -> Result<LoadResult, MusicError> {
        let (node, _) = self.live_node_and_session(guild_id).await?;
        self.rest_load(&node, identifier).await
    }

    /// First-hit tracks for one `artist title` text query (deezer leg
    /// only; the caller decides playlist vs single).
    async fn deezer_first_hit(&self, guild_id: u64, artist: &str, title: &str) -> Option<Track> {
        let identifier = format!("dzsearch:{} {}", artist.trim(), title.trim());
        match self.load_on_live_node(guild_id, &identifier).await {
            Ok(loaded) => load_tracks_flat(loaded).into_iter().next(),
            Err(_) => None,
        }
    }

    /// Bare-text search with the deezer-vs-soundcloud proximity legs
    /// (mirrors the non-URL tail of `searchQueryOnNode`): deezer first,
    /// soundcloud fallback when deezer misses or looks dissimilar, and
    /// the similarity-score pick when both hit.
    pub async fn search_text_tracks(
        &self,
        guild_id: u64,
        query: &str,
    ) -> Result<Vec<Track>, MusicError> {
        let deezer = match self
            .load_on_live_node(guild_id, &format!("dzsearch:{query}"))
            .await
        {
            Ok(loaded) => load_tracks_flat(loaded),
            Err(_) => vec![],
        };
        if !response_exists(&deezer) {
            let sc = match self
                .load_on_live_node(guild_id, &format!("scsearch:{query}"))
                .await
            {
                Ok(loaded) => load_tracks_flat(loaded),
                Err(_) => vec![],
            };
            if response_exists(&sc) {
                return Ok(sc);
            }
            return Err(MusicError::NoMatches);
        }
        let first = &deezer[0];
        if is_similar(query, &first.info.title, &first.info.author) {
            return Ok(deezer);
        }
        let sc = match self
            .load_on_live_node(guild_id, &format!("scsearch:{query}"))
            .await
        {
            Ok(loaded) => load_tracks_flat(loaded),
            Err(_) => vec![],
        };
        if !response_exists(&sc) {
            return Ok(deezer);
        }
        let deezer_score = proximity_similarity(
            query,
            &build_track_label(&first.info.title, &first.info.author),
        );
        let sc_first = &sc[0];
        let sc_score = proximity_similarity(
            query,
            &build_track_label(&sc_first.info.title, &sc_first.info.author),
        );
        if sc_score > deezer_score {
            Ok(sc)
        } else {
            Ok(deezer)
        }
    }

    /// Resolve one play query to node tracks + a playlist flag. Mirrors
    /// `searchQueryOnNode`: Spotify/Apple/Amazon/Tidal URLs resolve via
    /// the metadata ports and re-search on deezer (albums/playlists fan
    /// out to 100 per-track deezer hits, like TS); YouTube URLs are
    /// sanitized and loaded direct (the TS youtubei.js title lookup has
    /// no Rust equivalent); other URLs load direct; bare text goes
    /// through [`Self::search_text_tracks`]. Every returned title runs
    /// through [`mask_link`].
    pub async fn resolve_query_tracks(
        &self,
        guild_id: u64,
        query: &str,
    ) -> Result<(Vec<Track>, bool), MusicError> {
        let query = query.trim();
        if is_spotify_url(query) {
            return self.resolve_spotify(guild_id, query).await;
        }
        if is_apple_music_url(query) {
            if let Some(res) = self.resolve_apple(guild_id, query).await? {
                return Ok(res);
            }
            return Err(MusicError::NoMatches);
        }
        if is_amazon_music_url(query) {
            if let Some(res) = self.resolve_amazon(guild_id, query).await? {
                return Ok(res);
            }
            return Err(MusicError::NoMatches);
        }
        if is_tidal_url(query) {
            if let Some(res) = self.resolve_tidal(guild_id, query).await? {
                return Ok(res);
            }
            return Err(MusicError::NoMatches);
        }
        if is_youtube_url(query) {
            let clean = sanitize_youtube_url(query);
            match self.load_on_live_node(guild_id, &clean).await {
                Ok(LoadResult::Playlist(data)) => {
                    return Ok((mask_tracks(data.tracks), true));
                }
                Ok(loaded) => {
                    let tracks = mask_tracks(load_tracks_flat(loaded));
                    if response_exists(&tracks) {
                        return Ok((tracks, false));
                    }
                }
                Err(_) => {}
            }
            return Err(MusicError::NoMatches);
        }
        if is_url_query(query) {
            // Generic URL: LavaSrc resolves the URL itself, so deezer
            // and soundcloud legs would return the same tracks — one
            // direct load is equivalent.
            match self.load_on_live_node(guild_id, query).await {
                Ok(LoadResult::Playlist(data)) => {
                    return Ok((mask_tracks(data.tracks), true));
                }
                Ok(LoadResult::Error(e)) => {
                    return Err(MusicError::Rest(422, e.message));
                }
                Ok(loaded) => {
                    let tracks = mask_tracks(load_tracks_flat(loaded));
                    if response_exists(&tracks) {
                        return Ok((tracks, false));
                    }
                }
                Err(_) => {}
            }
            return Err(MusicError::NoMatches);
        }
        let tracks = mask_tracks(self.search_text_tracks(guild_id, query).await?);
        if !response_exists(&tracks) {
            return Err(MusicError::NoMatches);
        }
        Ok((tracks, false))
    }

    async fn resolve_spotify(
        &self,
        guild_id: u64,
        url: &str,
    ) -> Result<(Vec<Track>, bool), MusicError> {
        let details = crate::metadata::spotify::get_details(url)
            .await
            .map_err(|e| MusicError::Transport(e.to_string()))?;
        if details.tracks.len() == 1 {
            let t = &details.tracks[0];
            let artist = t.artist.clone().unwrap_or_default();
            match self.deezer_first_hit(guild_id, &artist, &t.name).await {
                Some(hit) => Ok((mask_tracks(vec![hit]), false)),
                None => Err(MusicError::NoMatches),
            }
        } else {
            let mut found = Vec::new();
            for t in details.tracks.iter().take(100) {
                let artist = t.artist.clone().unwrap_or_default();
                if let Some(hit) = self.deezer_first_hit(guild_id, &artist, &t.name).await {
                    found.push(hit);
                }
            }
            if found.is_empty() {
                return Err(MusicError::NoMatches);
            }
            Ok((mask_tracks(found), true))
        }
    }

    async fn resolve_apple(
        &self,
        guild_id: u64,
        url: &str,
    ) -> Result<Option<(Vec<Track>, bool)>, MusicError> {
        let res = crate::metadata::apple_music::search(url)
            .await
            .map_err(|e| MusicError::Transport(e.to_string()))?;
        let Some(res) = res else {
            return Ok(None);
        };
        match res {
            crate::metadata::apple_music::AppleResult::Song(t) => {
                match self
                    .deezer_first_hit(guild_id, &t.artist.name, &t.title)
                    .await
                {
                    Some(hit) => Ok(Some((mask_tracks(vec![hit]), false))),
                    None => Ok(None),
                }
            }
            crate::metadata::apple_music::AppleResult::Album(a) => Ok(Some((
                self.deezer_fan_out(guild_id, &a.tracks).await?,
                true,
            ))),
            crate::metadata::apple_music::AppleResult::Playlist(p) => Ok(Some((
                self.deezer_fan_out(guild_id, &p.tracks).await?,
                true,
            ))),
        }
    }

    async fn deezer_fan_out(
        &self,
        guild_id: u64,
        tracks: &[crate::metadata::apple_music::Track],
    ) -> Result<Vec<Track>, MusicError> {
        let mut found = Vec::new();
        for t in tracks.iter().take(100) {
            if let Some(hit) = self
                .deezer_first_hit(guild_id, &t.artist.name, &t.title)
                .await
            {
                found.push(hit);
            }
        }
        if found.is_empty() {
            return Err(MusicError::NoMatches);
        }
        Ok(mask_tracks(found))
    }

    async fn resolve_tidal(
        &self,
        guild_id: u64,
        url: &str,
    ) -> Result<Option<(Vec<Track>, bool)>, MusicError> {
        let res = crate::metadata::tidal::search(url)
            .await
            .map_err(|e| MusicError::Transport(e.to_string()))?;
        match res {
            crate::metadata::tidal::TidalResult::Song(t) => {
                match self
                    .deezer_first_hit(guild_id, &t.artist.name, &t.title)
                    .await
                {
                    Some(hit) => Ok(Some((mask_tracks(vec![hit]), false))),
                    None => Ok(None),
                }
            }
            crate::metadata::tidal::TidalResult::Album(a) => Ok(Some((
                self.deezer_fan_out_tidal(guild_id, &a.tracks).await?,
                true,
            ))),
            crate::metadata::tidal::TidalResult::Playlist(p) => Ok(Some((
                self.deezer_fan_out_tidal(guild_id, &p.tracks).await?,
                true,
            ))),
        }
    }

    async fn deezer_fan_out_tidal(
        &self,
        guild_id: u64,
        tracks: &[crate::metadata::tidal::Track],
    ) -> Result<Vec<Track>, MusicError> {
        let mut found = Vec::new();
        for t in tracks.iter().take(100) {
            if let Some(hit) = self
                .deezer_first_hit(guild_id, &t.artist.name, &t.title)
                .await
            {
                found.push(hit);
            }
        }
        if found.is_empty() {
            return Err(MusicError::NoMatches);
        }
        Ok(mask_tracks(found))
    }

    async fn resolve_amazon(
        &self,
        guild_id: u64,
        url: &str,
    ) -> Result<Option<(Vec<Track>, bool)>, MusicError> {
        let domain = url_host(url).unwrap_or_else(|| "music.amazon.com".to_string());
        let res = crate::metadata::amazon_music::search(url, &domain)
            .await
            .map_err(|e| MusicError::Transport(e.to_string()))?;
        match res {
            crate::metadata::amazon_music::AmazonResult::Song(t) => {
                match self
                    .deezer_first_hit(guild_id, &t.artist.name, &t.title)
                    .await
                {
                    Some(hit) => Ok(Some((mask_tracks(vec![hit]), false))),
                    None => Ok(None),
                }
            }
            crate::metadata::amazon_music::AmazonResult::Album(a) => Ok(Some((
                self.deezer_fan_out_amazon(guild_id, &a.tracks).await?,
                true,
            ))),
            crate::metadata::amazon_music::AmazonResult::Playlist(p) => Ok(Some((
                self.deezer_fan_out_amazon(guild_id, &p.tracks).await?,
                true,
            ))),
        }
    }

    async fn deezer_fan_out_amazon(
        &self,
        guild_id: u64,
        tracks: &[crate::metadata::amazon_music::Track],
    ) -> Result<Vec<Track>, MusicError> {
        let mut found = Vec::new();
        for t in tracks.iter().take(100) {
            if let Some(hit) = self
                .deezer_first_hit(guild_id, &t.artist.name, &t.title)
                .await
            {
                found.push(hit);
            }
        }
        if found.is_empty() {
            return Err(MusicError::NoMatches);
        }
        Ok(mask_tracks(found))
    }

    /// Resolve + enqueue. Returns (position, first track, is_playlist):
    /// position 0 means it started playing immediately.
    pub async fn play_query(
        &self,
        guild_id: u64,
        query: &str,
        requester: u64,
        now_ms: i64,
    ) -> Result<(usize, QueuedTrack, bool), MusicError> {
        // Fail fast with no live node (keeps the offline NoNodes unit
        // test green) before any metadata fetch.
        self.live_node_and_session(guild_id).await?;
        let (mut tracks, is_playlist) = self.resolve_query_tracks(guild_id, query).await?;
        if tracks.is_empty() {
            return Err(MusicError::NoMatches);
        }
        let first = QueuedTrack::from((&tracks[0], requester));
        let title = first.clone();
        let position = self
            .with_player(guild_id, |p| {
                let mut pos = p.enqueue(first, now_ms);
                for t in tracks.drain(1..) {
                    p.queue.push_back(QueuedTrack::from((&t, requester)));
                    pos = p.queue.len();
                }
                pos
            })
            .await;
        if position == 0 {
            let snap = self.snapshot(guild_id).await;
            if let Some(current) = snap.as_ref().and_then(|s| s.current.clone()) {
                let (node, session) = self.live_node_and_session(guild_id).await?;
                let out = self
                    .rest_play(&node, &session, guild_id, &current.encoded, false)
                    .await;
                // Re-apply the stored volume on every fresh start
                // (mirrors musicPlay.ts `player.setVolume(player.customVolume
                // || DEFAULT_VOLUME)` after createPlayer): the node
                // player is new, so it would otherwise play at 100.
                let volume = snap.map(|s| s.volume).unwrap_or(DEFAULT_VOLUME);
                let _ = self
                    .rest_set_volume(&node, &session, guild_id, volume)
                    .await;
                out?;
            }
        }
        Ok((position, title, is_playlist))
    }
}

impl Default for LavalinkManager {
    fn default() -> Self {
        Self::new()
    }
}

// ---- LastFM scrobble hooks (mirrors lastFMScrobblerManager.ts) ----

/// In-memory LastFM playback session for one guild (mirrors the TS
/// `LastFMGuildPlaybackSession`: the track that started + when).
/// Listener sync (voice members with a LastFM login) and the signed
/// HTTP scrobble POST stay with the live caller: per-user session
/// keys live behind `LASTFM.<uid>` rows the manager cannot reach.
#[derive(Debug, Clone)]
pub struct LastFmSession {
    pub artist: String,
    pub title: String,
    pub duration_ms: u64,
    pub requester: u64,
    pub started_ms: i64,
}

/// Track ready to scrobble once the live caller attaches the user's
/// session key (mirrors `tryScrobbleListener`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScrobbleDue {
    pub artist: String,
    pub title: String,
    pub duration_ms: u64,
    pub requester: u64,
    pub started_ms: i64,
}

/// Scrobble threshold: half the track or 4 minutes, whichever is
/// shorter (Last.fm "played half / 4min" rule, mirrors the TS
/// thresholdMs computation).
pub fn scrobble_threshold_ms(duration_ms: u64) -> u64 {
    (duration_ms / 2).min(4 * 60 * 1000)
}

/// True when a finished listen counts (played past the threshold and
/// the track is long enough to matter; mirrors the TS scrobble
/// gate, streams with unknown length never count).
pub fn should_scrobble(duration_ms: u64, played_ms: u64) -> bool {
    duration_ms >= 30_000 && played_ms >= scrobble_threshold_ms(duration_ms)
}

// ---- node WS supervisors (ready dial + reconnect) ----

/// Retry schedule: 5s doubling to 50s (mirrors TS retryDelay 50_000),
/// infinite retries (mirrors retryAmount Infinity).
const NODE_WS_FIRST_BACKOFF: Duration = Duration::from_secs(5);
const NODE_WS_MAX_BACKOFF: Duration = Duration::from_secs(50);
/// A connection living longer than this resets the backoff.
const NODE_WS_STABLE_FOR: Duration = Duration::from_secs(60);

/// Next reconnect delay: double the last wait, capped at 50s
/// (mirrors the TS `retryDelay: 50_000` ceiling; retries are
/// unbounded like `retryAmount: Infinity`). Pure so the schedule
/// stays unit-testable without a node.
pub fn next_backoff(current: Duration) -> Duration {
    (current * 2).min(NODE_WS_MAX_BACKOFF)
}

fn now_ms_wall() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Spawn one supervised WS task per node (call once at ready with the
/// synced config + bot user id). Each task dials with
/// [`node_ws_request`] (resume via the stored session), pumps text
/// frames into [`LavalinkManager::feed_node_ws`] — so track-end advance
/// + the nowplaying announce run live — and redials forever on drop.
pub fn spawn_all_node_ws(cfgs: Vec<NodeCfg>, user_id: u64) {
    for cfg in cfgs {
        spawn_node_ws(cfg, user_id);
    }
}

/// Spawn the supervised WS task for one node. No-op for empty hosts.
pub fn spawn_node_ws(cfg: NodeCfg, user_id: u64) {
    if cfg.host.trim().is_empty() {
        return;
    }
    let node_id = cfg.id.clone();
    tokio::spawn(async move {
        let mut backoff = NODE_WS_FIRST_BACKOFF;
        loop {
            let session = manager().node_session(&node_id).await;
            let req = match node_ws_request(&cfg, user_id, session.as_deref()) {
                Ok(r) => r,
                Err(e) => {
                    tracing::warn!("lavalink ws {node_id}: request build failed ({e}), retry");
                    tokio::time::sleep(backoff).await;
                    backoff = next_backoff(backoff);
                    continue;
                }
            };
            let connected_at = Instant::now();
            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();
            let pump_id = node_id.clone();
            let pump = tokio::spawn(async move {
                while let Some(text) = rx.recv().await {
                    manager().feed_node_ws(&pump_id, &text, now_ms_wall()).await;
                }
            });
            let dial = tokio::task::spawn_blocking(move || LavalinkManager::read_node_ws(req, tx));
            match dial.await {
                Ok(Ok(())) => tracing::info!("lavalink ws {node_id}: closed, redialing"),
                Ok(Err(e)) => tracing::warn!("lavalink ws {node_id}: dropped ({e}), redialing"),
                Err(e) => tracing::warn!("lavalink ws {node_id}: reader panicked ({e}), redialing"),
            }
            let _ = pump.await;
            if connected_at.elapsed() >= NODE_WS_STABLE_FOR {
                backoff = NODE_WS_FIRST_BACKOFF;
            }
            // Sleep the current wait, then step it up for the next
            // drop (first redial waits 5s, doubling to the 50s cap).
            tokio::time::sleep(backoff).await;
            backoff = next_backoff(backoff);
        }
    });
}

fn urlencoding(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Read-only player view for queue/nowplaying/trackinfo replies.
/// Channel ids route track-start announcements (mirrors
/// player.textChannelId in playerManager.ts).
#[derive(Debug, Clone)]
pub struct PlayerSnapshot {
    pub current: Option<QueuedTrack>,
    pub queue: Vec<QueuedTrack>,
    pub loop_mode: LoopMode,
    pub volume: u8,
    pub paused: bool,
    pub voice_channel: Option<u64>,
    pub text_channel: Option<u64>,
}

impl From<&GuildPlayer> for PlayerSnapshot {
    fn from(p: &GuildPlayer) -> Self {
        Self {
            current: p.current.clone(),
            queue: p.queue.iter().cloned().collect(),
            loop_mode: p.loop_mode(),
            volume: p.volume,
            paused: p.paused,
            voice_channel: p.voice_channel,
            text_channel: p.text_channel,
        }
    }
}

static MANAGER: OnceLock<LavalinkManager> = OnceLock::new();

/// Process-wide manager (bot.rs Data cannot hold it without touching
/// shared files; nodes are re-synced from config on each command).
pub fn manager() -> &'static LavalinkManager {
    MANAGER.get_or_init(LavalinkManager::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_track(title: &str) -> QueuedTrack {
        QueuedTrack {
            encoded: format!("enc-{title}"),
            title: title.into(),
            author: "artist".into(),
            uri: None,
            length_ms: 180_000,
            source: "youtube".into(),
            artwork: None,
            requester: 1,
        }
    }

    #[test]
    fn search_identifier_routes_like_ts_default_platform() {
        assert_eq!(
            LavalinkManager::search_identifier("never gonna give you up"),
            "ytsearch:never gonna give you up"
        );
        assert_eq!(
            LavalinkManager::search_identifier("https://open.spotify.com/track/x"),
            "https://open.spotify.com/track/x"
        );
        assert_eq!(
            LavalinkManager::search_identifier("https://music.apple.com/x"),
            "https://music.apple.com/x"
        );
    }

    #[test]
    fn user_id_from_token_decodes_first_segment() {
        // "123456789" -> "MTIzNDU2Nzg5" (no padding needed).
        assert_eq!(
            user_id_from_token("MTIzNDU2Nzg5.fake.sig"),
            Some("123456789".to_string())
        );
        // "12345678" -> "MTIzNDU2Nzg=" (unpadded token form needs padding).
        assert_eq!(
            user_id_from_token("MTIzNDU2Nzg.fake.sig"),
            Some("12345678".to_string())
        );
        // No dots: the whole token is the segment.
        assert_eq!(user_id_from_token("OTk5"), Some("999".to_string()));
        // Empty / undecodable segments mirror the TS `|| null`.
        assert_eq!(user_id_from_token(""), None);
        assert_eq!(user_id_from_token("..."), None);
        assert_eq!(user_id_from_token("!!!.a.b"), None);
    }

    #[test]
    fn enqueue_first_becomes_current() {
        let mut p = GuildPlayer::new();
        assert_eq!(p.enqueue(sample_track("a"), 0), 0);
        assert_eq!(p.current.as_ref().unwrap().title, "a");
        assert_eq!(p.enqueue(sample_track("b"), 0), 1);
        assert_eq!(p.queue.len(), 1);
    }

    #[test]
    fn skip_advances_or_idles() {
        let mut p = GuildPlayer::new();
        p.enqueue(sample_track("a"), 0);
        p.enqueue(sample_track("b"), 0);
        p.skip(100);
        assert_eq!(p.current.as_ref().unwrap().title, "b");
        assert!(p.idle_since_ms.is_none());
        p.skip(200);
        assert!(p.current.is_none());
        assert_eq!(p.idle_since_ms, Some(200));
    }

    #[test]
    fn loop_track_replays_on_finished() {
        let mut p = GuildPlayer::new();
        p.enqueue(sample_track("a"), 0);
        p.loop_mode = Some(LoopMode::Track);
        assert_eq!(
            p.advance_on_end(&TrackEndReason::Finished, 0),
            AdvanceOutcome::Replay
        );
        assert_eq!(p.current.as_ref().unwrap().title, "a");
        p.loop_mode = Some(LoopMode::Off);
        assert_eq!(
            p.advance_on_end(&TrackEndReason::Finished, 50),
            AdvanceOutcome::Idle
        );
        assert!(p.current.is_none());
    }

    #[test]
    fn replaced_keeps_current() {
        let mut p = GuildPlayer::new();
        p.enqueue(sample_track("a"), 0);
        assert_eq!(
            p.advance_on_end(&TrackEndReason::Replaced, 0),
            AdvanceOutcome::Kept
        );
        assert!(p.current.is_some());
    }

    #[test]
    fn destroy_due_after_120s_idle() {
        let mut p = GuildPlayer::new();
        p.stop(1000);
        assert!(!p.destroy_due(1000 + EMPTY_QUEUE_DESTROY_AFTER_MS - 1));
        assert!(p.destroy_due(1000 + EMPTY_QUEUE_DESTROY_AFTER_MS));
    }

    #[test]
    fn shuffle_keeps_all_tracks() {
        let mut p = GuildPlayer::new();
        p.enqueue(sample_track("now"), 0);
        for i in 0..10 {
            p.queue.push_back(sample_track(&format!("t{i}")));
        }
        p.shuffle(42);
        assert_eq!(p.queue.len(), 10);
        assert_eq!(p.current.as_ref().unwrap().title, "now");
    }

    #[test]
    fn volume_clamps_like_ts() {
        let mut p = GuildPlayer::new();
        assert_eq!(p.set_volume(5), 10);
        assert_eq!(p.set_volume(75), 75);
        assert_eq!(p.set_volume(500), 100);
    }

    #[test]
    fn voice_op_shape() {
        let join = voice_state_update_op(123, Some(456));
        assert_eq!(join["op"], 4);
        assert_eq!(join["d"]["guild_id"], "123");
        assert_eq!(join["d"]["channel_id"], "456");
        let leave = voice_state_update_op(123, None);
        assert!(leave["d"]["channel_id"].is_null());
    }

    #[test]
    fn secure_nodes_use_https() {
        let entry = NodeEntry::new(
            &NodeCfg {
                id: "n".into(),
                host: "lava.example.com".into(),
                port: 443,
                password: "pw".into(),
                secure: true,
            },
            1,
        );
        assert!(entry.base_url().starts_with("https://"));
    }

    #[test]
    fn insecure_nodes_use_http() {
        let entry = NodeEntry::new(
            &NodeCfg {
                id: "n".into(),
                host: "127.0.0.1".into(),
                port: 2333,
                password: "pw".into(),
                secure: false,
            },
            1,
        );
        assert!(entry.base_url().starts_with("http://"));
        assert!(!entry.base_url().starts_with("https://"));
    }

    #[tokio::test]
    async fn offline_manager_fails_before_io() {
        let m = LavalinkManager::new();
        assert!(!m.is_live().await);
        assert_eq!(
            m.play_query(1, "hello", 2, 0).await.unwrap_err(),
            MusicError::NoNodes
        );
        assert!(m.node_for(1).await.is_none());
    }

    #[test]
    fn ready_session_parses_ready_ignores_other_ops() {
        assert_eq!(
            LavalinkManager::parse_ready_session(
                r#"{"op":"ready","resumed":false,"sessionId":"abc123"}"#
            ),
            Some("abc123".to_string())
        );
        // No hello op in Lavalink v4; unknown ops carry no session.
        assert_eq!(
            LavalinkManager::parse_ready_session(r#"{"op":"hello"}"#),
            None
        );
        assert_eq!(
            LavalinkManager::parse_ready_session(r#"{"op":"stats","players":0}"#),
            None
        );
        assert_eq!(LavalinkManager::parse_ready_session("not json"), None);
    }

    #[test]
    fn nowplaying_and_empty_guard() {
        let t = sample_track("a");
        assert_eq!(
            LavalinkManager::nowplaying_text(&t),
            ":musical_note: a - artist"
        );
        let mut p = GuildPlayer::new();
        // Nothing playing: never leave.
        assert!(!LavalinkManager::should_leave_when_alone(&p, 1));
        p.enqueue(sample_track("a"), 0);
        assert!(LavalinkManager::should_leave_when_alone(&p, 1));
        assert!(LavalinkManager::should_leave_when_alone(&p, 0));
        assert!(!LavalinkManager::should_leave_when_alone(&p, 2));
    }

    fn test_node_cfg() -> NodeCfg {
        NodeCfg {
            id: "n1".into(),
            host: "127.0.0.1".into(),
            port: 2333,
            password: "x".into(),
            secure: false,
        }
    }

    fn track_start_frame(guild: &str, title: &str) -> String {
        serde_json::json!({
            "op": "event",
            "type": "TrackStartEvent",
            "guildId": guild,
            "track": {
                "encoded": format!("enc-{title}"),
                "info": {
                    "identifier": "id",
                    "isSeekable": true,
                    "author": "artist",
                    "length": 180000,
                    "isStream": false,
                    "position": 0,
                    "title": title,
                    "sourceName": "youtube"
                }
            }
        })
        .to_string()
    }

    #[tokio::test]
    async fn feed_ready_stores_session() {
        let m = LavalinkManager::new();
        m.sync_nodes(&[test_node_cfg()], 9).await;
        let out = m
            .feed_node_ws(
                "n1",
                r#"{"op":"ready","resumed":false,"sessionId":"sess-1"}"#,
                0,
            )
            .await;
        assert_eq!(out, FedWs::Session("sess-1".to_string()));
        let node = m.node_for(77).await.unwrap();
        assert_eq!(node.session().await, Some("sess-1".to_string()));
        // Unknown node id: parsed but stored nowhere.
        let out = m
            .feed_node_ws(
                "nope",
                r#"{"op":"ready","resumed":true,"sessionId":"s"}"#,
                0,
            )
            .await;
        assert_eq!(out, FedWs::Session("s".to_string()));
        // Garbage + stats frames are ignored without touching sessions.
        assert_eq!(m.feed_node_ws("n1", "garbage", 0).await, FedWs::Ignored);
        assert_eq!(
            m.feed_node_ws("n1", r#"{"op":"stats","players":0}"#, 0)
                .await,
            FedWs::Ignored
        );
        assert_eq!(node.session().await, Some("sess-1".to_string()));
    }

    #[tokio::test]
    async fn feed_track_start_refreshes_current() {
        let m = LavalinkManager::new();
        m.sync_nodes(&[test_node_cfg()], 9).await;
        let out = m
            .feed_node_ws("n1", &track_start_frame("7", "hello"), 0)
            .await;
        assert_eq!(out, FedWs::Started);
        let snap = m.snapshot(7).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().title, "hello");
    }

    fn track_value(title: &str) -> serde_json::Value {
        serde_json::json!({
            "encoded": format!("enc-{title}"),
            "info": {
                "identifier": "id",
                "isSeekable": true,
                "author": "artist",
                "length": 180000,
                "isStream": false,
                "position": 0,
                "title": title,
                "uri": format!("https://example.test/{title}"),
                "sourceName": "youtube"
            }
        })
    }

    fn exception_frame(guild: &str, title: &str, message: &str) -> String {
        serde_json::json!({
            "op": "event",
            "type": "TrackExceptionEvent",
            "guildId": guild,
            "track": track_value(title),
            "exception": {
                "message": message,
                "severity": "common",
                "cause": "test"
            }
        })
        .to_string()
    }

    fn stuck_frame(guild: &str, title: &str) -> String {
        serde_json::json!({
            "op": "event",
            "type": "TrackStuckEvent",
            "guildId": guild,
            "track": track_value(title),
            "thresholdMs": 10_000
        })
        .to_string()
    }

    fn parse_exception(text: &str) -> TrackExceptionEvent {
        match LavalinkEvent::parse(text) {
            Some(LavalinkEvent::Event(ev)) => match *ev {
                TrackEvent::TrackExceptionEvent(e) => e,
                _ => panic!("expected TrackExceptionEvent"),
            },
            _ => panic!("exception frame did not parse"),
        }
    }

    fn parse_stuck(text: &str) -> TrackStuckEvent {
        match LavalinkEvent::parse(text) {
            Some(LavalinkEvent::Event(ev)) => match *ev {
                TrackEvent::TrackStuckEvent(e) => e,
                _ => panic!("expected TrackStuckEvent"),
            },
            _ => panic!("stuck frame did not parse"),
        }
    }

    #[test]
    fn fallback_source_mirrors_ts_branches() {
        assert_eq!(
            fallback_source_for("Something broke when playing the track."),
            Some(FallbackSource::SoundCloud)
        );
        assert_eq!(
            fallback_source_for("This video requires login."),
            Some(FallbackSource::Deezer)
        );
        assert_eq!(fallback_source_for("boom"), None);
        assert_eq!(
            fallback_identifier(FallbackSource::SoundCloud, "Song", "Band"),
            "scsearch:Song - Band"
        );
        assert_eq!(
            fallback_identifier(FallbackSource::Deezer, "Song", "Band"),
            "dzsearch:Song - Band"
        );
    }

    #[test]
    fn track_error_report_carries_ts_fields() {
        let ev = parse_exception(&exception_frame("7", "hello", "boom"));
        let report = LavalinkManager::track_error_report(&ev, Some(42), Some("n1 h:1 secure=no"));
        for want in [
            "trackError",
            "guild=7",
            "<@42>",
            "hello - artist",
            "https://example.test/hello",
            "enc-hello",
            "youtube",
            "boom",
            "n1 h:1 secure=no",
            // Full markdown body (TS error_log mirror).
            "lavalink-client \"trackError\" event",
            "## Client about",
            "WS ping",
            "WS status",
            "## Guild about",
            "## Track about",
            "## Error",
            "## Node about",
            "Stream?",
            "common",
            "test",
            "Report generated",
        ] {
            assert!(report.contains(want), "report missing {want}: {report}");
        }
        let bare = LavalinkManager::track_error_report(&ev, None, None);
        assert!(bare.contains("requester=-"));
        assert!(bare.contains("node=-"));
    }

    #[test]
    fn error_channel_builders_stay_offline() {
        assert_eq!(
            LavalinkManager::resolve_error_channel_id(" 123 "),
            Some(123)
        );
        assert_eq!(LavalinkManager::resolve_error_channel_id(""), None);
        assert_eq!(LavalinkManager::resolve_error_channel_id("   "), None);
        assert_eq!(LavalinkManager::resolve_error_channel_id("abc"), None);
        assert_eq!(
            LavalinkManager::error_report_content(Some("111")),
            "<@111>\nIssue with lavalink founded!"
        );
        assert_eq!(
            LavalinkManager::error_report_content(None),
            "Issue with lavalink founded!"
        );
        assert_eq!(
            LavalinkManager::error_report_content(Some("  ")),
            "Issue with lavalink founded!"
        );
        assert_eq!(LavalinkManager::error_report_filename(42), "logs-42.md");
        let notice = LavalinkManager::requeued_notice_text("hello");
        assert!(notice.contains("hello"), "notice missing title: {notice}");
    }

    #[tokio::test]
    async fn exception_without_player_is_noop() {
        let m = LavalinkManager::new();
        let ev = parse_exception(&exception_frame("21", "ghost", "boom"));
        assert_eq!(
            m.handle_track_exception(ev, 100).await,
            ErrorRecovery::NoPlayer
        );
        let stuck = parse_stuck(&stuck_frame("21", "ghost"));
        assert_eq!(
            m.handle_track_stuck(stuck, 100).await,
            ErrorRecovery::NoPlayer
        );
    }

    #[tokio::test]
    async fn exception_skips_failed_track_offline() {
        let m = LavalinkManager::new();
        m.with_player(22, |p| {
            p.enqueue(sample_track("a"), 0);
            p.enqueue(sample_track("b"), 0);
        })
        .await;
        // Fallback-branch message, but with no live node the re-search
        // leg is skipped and state still advances past the failure.
        let ev = parse_exception(&exception_frame(
            "22",
            "a",
            "Something broke when playing the track.",
        ));
        assert_eq!(
            m.handle_track_exception(ev, 100).await,
            ErrorRecovery::Advanced
        );
        let snap = m.snapshot(22).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().title, "b");
    }

    #[tokio::test]
    async fn exception_on_last_track_idles() {
        let m = LavalinkManager::new();
        m.with_player(23, |p| {
            p.enqueue(sample_track("solo"), 0);
        })
        .await;
        let ev = parse_exception(&exception_frame("23", "solo", "other failure"));
        assert_eq!(m.handle_track_exception(ev, 100).await, ErrorRecovery::Idle);
        let snap = m.snapshot(23).await.unwrap();
        assert!(snap.current.is_none());
    }

    #[tokio::test]
    async fn stuck_skips_wedged_track() {
        let m = LavalinkManager::new();
        m.with_player(24, |p| {
            p.enqueue(sample_track("a"), 0);
            p.enqueue(sample_track("b"), 0);
        })
        .await;
        let stuck = parse_stuck(&stuck_frame("24", "a"));
        assert_eq!(
            m.handle_track_stuck(stuck, 100).await,
            ErrorRecovery::Advanced
        );
        let snap = m.snapshot(24).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().title, "b");
    }

    #[tokio::test]
    async fn feed_routes_exception_and_stuck() {
        let m = LavalinkManager::new();
        m.sync_nodes(&[test_node_cfg()], 9).await;
        m.with_player(25, |p| {
            p.enqueue(sample_track("a"), 0);
            p.enqueue(sample_track("b"), 0);
        })
        .await;
        let out = m
            .feed_node_ws("n1", &exception_frame("25", "a", "boom"), 100)
            .await;
        assert_eq!(out, FedWs::ErrorHandled);
        assert_eq!(
            m.snapshot(25)
                .await
                .unwrap()
                .current
                .as_ref()
                .unwrap()
                .title,
            "b"
        );
        let out = m.feed_node_ws("n1", &stuck_frame("25", "b"), 200).await;
        assert_eq!(out, FedWs::StuckHandled);
        assert!(m.snapshot(25).await.unwrap().current.is_none());
    }

    #[tokio::test]
    async fn exception_report_ctx_roundtrip() {
        let m = LavalinkManager::new();
        assert!(m.exception_report_ctx().await.is_none());
        m.register_exception_report(
            Arc::new(serenity::Http::new("dummy")),
            "123".to_string(),
            vec!["111".to_string()],
        )
        .await;
        let ctx = m.exception_report_ctx().await.unwrap();
        assert_eq!(ctx.logs_channel_id, "123");
        assert_eq!(ctx.owners, vec!["111".to_string()]);
    }

    #[tokio::test]
    async fn feed_exception_routes_through_report_wrapper() {
        // Offline-safe: empty logs channel id (no report-post I/O) and
        // no stored text channel (no announce I/O); the wrapper still
        // runs the recovery on the process-wide manager.
        let gid = 29_001u64;
        let gm = manager();
        gm.with_player(gid, |p| {
            p.enqueue(sample_track("a"), 0);
            p.enqueue(sample_track("b"), 0);
        })
        .await;
        let m = LavalinkManager::new();
        m.register_exception_report(
            Arc::new(serenity::Http::new("dummy")),
            String::new(),
            vec![],
        )
        .await;
        let gid_str = gid.to_string();
        let out = m
            .feed_node_ws("n1", &exception_frame(&gid_str, "a", "boom"), 100)
            .await;
        assert_eq!(out, FedWs::ErrorHandled);
        let snap = gm.snapshot(gid).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().title, "b");
        gm.remove_player(gid).await;
    }

    #[tokio::test]
    async fn sync_nodes_skips_empty_hosts() {
        let m = LavalinkManager::new();
        m.sync_nodes(
            &[
                NodeCfg {
                    id: "bad".into(),
                    host: String::new(),
                    port: 2333,
                    password: "x".into(),
                    secure: false,
                },
                NodeCfg {
                    id: "good".into(),
                    host: "127.0.0.1".into(),
                    port: 2333,
                    password: "x".into(),
                    secure: false,
                },
            ],
            9,
        )
        .await;
        assert!(m.is_live().await);
        // Deterministic guild-affine pick.
        let a = m.node_for(7).await.unwrap();
        let b = m.node_for(7).await.unwrap();
        assert_eq!(a.id, b.id);
    }

    #[test]
    fn node_ws_url_honors_secure() {
        let plain = NodeCfg {
            id: "n".into(),
            host: "lava.example.com".into(),
            port: 2333,
            password: "pw".into(),
            secure: false,
        };
        assert_eq!(
            node_ws_url(&plain),
            "ws://lava.example.com:2333/v4/websocket"
        );
        let tls = NodeCfg {
            secure: true,
            ..plain
        };
        assert_eq!(
            node_ws_url(&tls),
            "wss://lava.example.com:2333/v4/websocket"
        );
    }

    #[test]
    fn node_ws_request_carries_auth_headers() {
        let cfg = test_node_cfg();
        let req = node_ws_request(&cfg, 42, None).unwrap();
        let h = req.headers();
        assert_eq!(h.get("authorization").unwrap(), "x");
        assert_eq!(h.get("user-id").unwrap(), "42");
        assert_eq!(h.get("client-name").unwrap(), LAVALINK_CLIENT_NAME);
        assert!(h.get("session-id").is_none());
        let resumed = node_ws_request(&cfg, 42, Some("sess-9")).unwrap();
        assert_eq!(resumed.headers().get("session-id").unwrap(), "sess-9");
    }

    #[tokio::test]
    async fn sweep_idle_destroy_drops_state_offline() {
        let m = LavalinkManager::new();
        // Idle past the 120s window with a voice channel attached.
        m.with_player(11, |p| {
            p.voice_channel = Some(77);
            p.stop(1000);
        })
        .await;
        // Fresh idle: not due yet.
        m.with_player(12, |p| {
            p.stop(1000 + EMPTY_QUEUE_DESTROY_AFTER_MS - 60_000);
        })
        .await;
        let due = m
            .destroy_due_guilds(1000 + EMPTY_QUEUE_DESTROY_AFTER_MS)
            .await;
        assert_eq!(
            due,
            vec![IdleDestroyTarget {
                guild_id: 11,
                voice_channel: Some(77),
            }]
        );
        // No nodes: REST leg skipped, state still dropped.
        let done = m
            .sweep_idle_destroy(1000 + EMPTY_QUEUE_DESTROY_AFTER_MS)
            .await;
        assert_eq!(done.len(), 1);
        assert_eq!(done[0].guild_id, 11);
        assert!(m.snapshot(11).await.is_none());
        assert!(m.snapshot(12).await.is_some());
        // Second sweep finds nothing.
        assert!(m
            .sweep_idle_destroy(1000 + EMPTY_QUEUE_DESTROY_AFTER_MS)
            .await
            .is_empty());
    }

    #[test]
    fn backoff_doubles_and_caps_at_50s() {
        assert_eq!(
            next_backoff(Duration::from_secs(5)),
            Duration::from_secs(10)
        );
        assert_eq!(
            next_backoff(Duration::from_secs(25)),
            Duration::from_secs(50)
        );
        assert_eq!(
            next_backoff(Duration::from_secs(50)),
            Duration::from_secs(50)
        );
    }

    #[test]
    fn stage_channel_detect() {
        assert!(LavalinkManager::is_stage_channel(
            serenity::ChannelType::Stage
        ));
        assert!(!LavalinkManager::is_stage_channel(
            serenity::ChannelType::Voice
        ));
        assert!(!LavalinkManager::is_stage_channel(
            serenity::ChannelType::Text
        ));
    }

    fn two_node_cfgs() -> Vec<NodeCfg> {
        vec![
            NodeCfg {
                id: "n1".into(),
                host: "127.0.0.1".into(),
                port: 2333,
                password: "x".into(),
                secure: false,
            },
            NodeCfg {
                id: "n2".into(),
                host: "127.0.0.2".into(),
                port: 2333,
                password: "x".into(),
                secure: false,
            },
        ]
    }

    #[tokio::test]
    async fn failover_order_starts_affine_then_rest() {
        let m = LavalinkManager::new();
        m.sync_nodes(&two_node_cfgs(), 9).await;
        // Guild 0 is affine to n1, guild 1 to n2.
        let o0: Vec<String> = m
            .nodes_in_failover_order(0)
            .await
            .iter()
            .map(|n| n.id.clone())
            .collect();
        assert_eq!(o0, vec!["n1".to_string(), "n2".to_string()]);
        let o1: Vec<String> = m
            .nodes_in_failover_order(1)
            .await
            .iter()
            .map(|n| n.id.clone())
            .collect();
        assert_eq!(o1, vec!["n2".to_string(), "n1".to_string()]);
        assert!(LavalinkManager::new()
            .nodes_in_failover_order(0)
            .await
            .is_empty());
    }

    #[tokio::test]
    async fn live_session_fails_over_to_healthy_node() {
        let m = LavalinkManager::new();
        m.sync_nodes(&two_node_cfgs(), 9).await;
        // Only n2 has a session; guild 0 is affine to n1, must fail over.
        m.set_session("n2", "sess-2".to_string()).await;
        let (node, session) = m.live_node_and_session(0).await.unwrap();
        assert_eq!(node.id, "n2");
        assert_eq!(session, "sess-2");
        // No sessions anywhere: NoSession names the affine node.
        let m2 = LavalinkManager::new();
        m2.sync_nodes(&two_node_cfgs(), 9).await;
        let err = m2
            .live_node_and_session(1)
            .await
            .err()
            .expect("expected NoSession");
        assert_eq!(err, MusicError::NoSession("n2".to_string()));
    }

    #[tokio::test]
    async fn leave_voice_false_without_shard() {
        let m = LavalinkManager::new();
        assert!(!m.leave_voice(123).await);
        assert!(m.remove_player(123).await.is_none());
    }

    #[test]
    fn url_classifiers_match_ts_hosts() {
        assert!(is_spotify_url("https://open.spotify.com/track/x"));
        assert!(!is_spotify_url("https://www.deezer.com/track/1"));
        assert!(is_youtube_url("https://www.youtube.com/watch?v=x"));
        assert!(is_youtube_url("https://youtu.be/x"));
        assert!(is_apple_music_url("https://music.apple.com/us/song/x"));
        assert!(is_amazon_music_url("https://music.amazon.fr/track/x"));
        assert!(is_tidal_url("https://tidal.com/browse/track/1"));
        assert!(!is_url_query("never gonna give you up"));
        assert!(is_url_query("https://example.test/x"));
    }

    #[test]
    fn parentheses_content_stripped_like_ts() {
        assert_eq!(
            remove_parentheses_content("Song (Prod. X) [Remix] Title"),
            "Song Title"
        );
        assert_eq!(remove_parentheses_content("  spaced   out  "), "spaced out");
    }

    #[test]
    fn youtube_sanitize_drops_tracking_params() {
        assert_eq!(
            sanitize_youtube_url("https://www.youtube.com/watch?v=abc&si=zzz&list=LL"),
            "https://www.youtube.com/watch?v=abc"
        );
        assert_eq!(
            sanitize_youtube_url("https://youtu.be/abc?si=zzz"),
            "https://youtu.be/abc"
        );
        assert_eq!(
            sanitize_youtube_url("https://www.deezer.com/track/1?foo=bar"),
            "https://www.deezer.com/track/1?foo=bar"
        );
        assert_eq!(sanitize_youtube_url("plain query"), "plain query");
    }

    #[test]
    fn mask_link_hides_url_titles() {
        assert_eq!(mask_link("cool song"), "cool song");
        assert_eq!(mask_link("x https://evil.test"), "Hidden Link");
        assert_eq!(mask_link("join .gg/abc"), "Hidden Link");
        assert_eq!(mask_link("a.com song"), "Hidden Link");
    }

    #[test]
    fn proximity_matches_ts_thresholds() {
        assert_eq!(levenshtein("kitten", "sitting"), 3);
        assert!((proximity_similarity("abc", "abc") - 1.0).abs() < 1e-9);
        assert_eq!(proximity_similarity("", ""), 1.0);
        assert!(is_similar(
            "never gonna give you up",
            "Never Gonna Give You Up",
            "Rick Astley"
        ));
        assert!(!is_similar(
            "totally different words xyz",
            "Never Gonna Give You Up",
            "Rick Astley"
        ));
        assert_eq!(build_track_label("Title", "Author"), "Title Author");
    }

    #[test]
    fn platform_tag_covers_deezer_and_soundcloud() {
        assert_eq!(
            platform_source_tag(Some("https://www.deezer.com/track/1")),
            Some("Deezer")
        );
        assert_eq!(
            platform_source_tag(Some("https://soundcloud.com/a/b")),
            Some("SoundCloud")
        );
        assert_eq!(platform_source_tag(Some("https://youtu.be/x")), None);
        assert_eq!(platform_source_tag(None), None);
    }

    #[test]
    fn queue_loop_requeues_finished_track() {
        let mut p = GuildPlayer::new();
        p.loop_mode = Some(LoopMode::Queue);
        p.current = Some(sample_track("a"));
        p.queue.push_back(sample_track("b"));
        assert_eq!(
            p.advance_on_end(&TrackEndReason::Finished, 1),
            AdvanceOutcome::Next
        );
        assert_eq!(p.current.as_ref().unwrap().title, "b");
        assert_eq!(p.queue.len(), 1);
        assert_eq!(p.queue[0].title, "a");
        // Single-track queue loops onto itself.
        p.queue.clear();
        p.current = Some(sample_track("solo"));
        assert_eq!(
            p.advance_on_end(&TrackEndReason::Finished, 2),
            AdvanceOutcome::Next
        );
        assert_eq!(p.current.as_ref().unwrap().title, "solo");
    }

    #[test]
    fn track_loop_replays_without_advancing() {
        let mut p = GuildPlayer::new();
        p.loop_mode = Some(LoopMode::Track);
        p.current = Some(sample_track("a"));
        p.queue.push_back(sample_track("b"));
        assert_eq!(
            p.advance_on_end(&TrackEndReason::Finished, 1),
            AdvanceOutcome::Replay
        );
        assert_eq!(p.current.as_ref().unwrap().title, "a");
        assert_eq!(p.queue.len(), 1);
    }

    #[test]
    fn scrobble_gate_matches_lastfm_rule() {
        assert_eq!(scrobble_threshold_ms(200_000), 100_000);
        assert_eq!(scrobble_threshold_ms(600_000), 240_000);
        assert!(should_scrobble(200_000, 100_000));
        assert!(!should_scrobble(200_000, 99_999));
        assert!(!should_scrobble(20_000, 20_000));
        assert!(!should_scrobble(0, 0));
    }

    #[test]
    fn track_start_embed_uses_artwork_and_template() {
        let e = LavalinkManager::track_start_embed(
            "xx-UNKNOWN",
            "Title",
            "Author",
            Some("https://example.test/t"),
            Some("https://example.test/art.png"),
            99,
            "🎵",
        );
        let json = serde_json::to_value(&e).unwrap();
        let desc = json
            .get("description")
            .and_then(|d| d.as_str())
            .unwrap_or("");
        assert!(desc.contains("Title"), "desc: {desc}");
        assert!(desc.contains("<#99>"), "desc: {desc}");
        assert_eq!(
            json.get("image")
                .and_then(|i| i.get("url"))
                .and_then(|u| u.as_str()),
            Some("https://example.test/art.png")
        );
    }

    #[test]
    fn disconnect_gate_and_report_stats() {
        assert!(LavalinkManager::should_destroy_on_disconnect(None));
        assert!(!LavalinkManager::should_destroy_on_disconnect(Some(5)));
        let ev = parse_exception(&exception_frame("7", "hello", "boom"));
        let report = LavalinkManager::track_error_report_with_client_stats(
            &ev,
            Some(42),
            Some("someone"),
            Some("n1"),
            Some(123),
            Some("READY"),
        );
        for want in ["## Client about", "123ms", "READY", "someone"] {
            assert!(report.contains(want), "report missing {want}");
        }
    }

    #[test]
    fn default_volume_is_75() {
        assert_eq!(DEFAULT_VOLUME, 75);
        assert_eq!(GuildPlayer::new().volume, 75);
    }
}
