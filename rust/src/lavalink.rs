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
    EventDispatcher, LavalinkEvent, PlayerUpdatePayload, TrackEndEvent, TrackEndReason, TrackEvent,
    TrackExceptionEvent, TrackStartEvent, TrackStuckEvent,
};
use lava_rs::model::{Track, VoiceState};
use lava_rs::node::health::NodeStats;
use lava_rs::rest::{LoadResult, UpdatePlayerPayload};
use lava_rs::ws::session::ReadyPayload;
use lava_rs::{LavalinkConfig, LavalinkError};
use poise::serenity_prelude as serenity;
use tokio::sync::{Mutex, RwLock};

/// Mirrors onEmptyQueue.destroyAfterMs in playerManager.ts.
pub const EMPTY_QUEUE_DESTROY_AFTER_MS: i64 = 120_000;

/// Initial local volume for a new guild player. Mirrors
/// `DEFAULT_VOLUME = 75` in musicPlay.ts; it is only pushed to the
/// node when a custom volume was set (`if (player.customVolume)`),
/// otherwise the node default applies.
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
    /// Latest `stats` op payload from the node WS feed (player counts,
    /// CPU/memory load). Powers the node line of the track-error report
    /// (mirrors the TS `## Node about` block).
    stats: Mutex<Option<NodeStats>>,
    /// Latest `playerUpdate.state.ping` seen on this node's feed.
    player_ping_ms: Mutex<Option<i64>>,
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
            stats: Mutex::new(None),
            player_ping_ms: Mutex::new(None),
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
    /// Accepted end-to-end with no filtering: `track_start_embed`
    /// renders it as the embed image and the lyrics command renders it
    /// as the embed thumbnail; empty strings are treated as absent at
    /// each render site.
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
    /// Explicitly set level (mirrors TS `player.customVolume`): None
    /// until the volume command runs, so a fresh start can leave the
    /// node default alone.
    pub custom_volume: Option<u8>,
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
        self.custom_volume = Some(v);
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
/// `|| null` on the empty-string case). Node ground truth (v24
/// battery): the decoder keeps the base64 + base64url alphabet
/// (`-` -> 62, `_` -> 63) plus `=`, skips every other char
/// (whitespace, `!`, non-ASCII BMP, ...), truncates at the first
/// `=`, then decodes full quanta plus a 2/3-char tail (a lone
/// trailing char is dropped). Astral-plane chars are GIGO (Node
/// stops, skips, or emits garbage depending on the codepoint --
/// version-fragile, unrepresentable in real tokens); Rust drops
/// them like any other non-alphabet char.
pub fn user_id_from_token(token: &str) -> Option<String> {
    let first = token.split('.').next().unwrap_or("");
    let mut clean: String = first
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '/' | '-' | '_' | '='))
        .collect();
    if let Some(pos) = clean.find('=') {
        clean.truncate(pos);
    }
    let mut std: String = clean
        .chars()
        .map(|c| match c {
            '-' => '+',
            '_' => '/',
            c => c,
        })
        .collect();
    if std.len() % 4 == 1 {
        std.pop();
    }
    if std.is_empty() {
        return None;
    }
    let rem = std.len() % 4;
    if rem != 0 {
        for _ in 0..(4 - rem) {
            std.push('=');
        }
    }
    let bytes = crate::emojis::base64_decode(&std)?;
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
    /// Exception matched no fallback branch: current kept, no skip
    /// (mirrors the TS `trackError` handler, which only acts on its
    /// two message branches and otherwise does nothing).
    Kept,
}

/// Split a load result into (tracks, is_playlist), masking titles.
///
/// Search/track legs expose only the first hit (TS `handleMusicPlay`
/// enqueues `res.tracks[0]` unless `loadType === "playlist"`);
/// playlists propagate every track. Empty/error legs are empty here
/// so callers fall through to the no-match path (a node `error`
/// load answers the no-result embed, never a 422 reply).
fn split_loaded(loaded: LoadResult) -> (Vec<Track>, bool) {
    match loaded {
        LoadResult::Track(t) => (mask_tracks(vec![t]), false),
        LoadResult::Playlist(data) => (mask_tracks(data.tracks), true),
        LoadResult::Search(v) => (mask_tracks(v.into_iter().take(1).collect()), false),
        LoadResult::Empty | LoadResult::Error(_) => (vec![], false),
    }
}

/// Deezer identifier for a bare cleaned title (mirrors
/// `handleYoutube`'s `{ query: itemName, source: "deezer" }` leg).
pub fn deezer_title_identifier(title: &str) -> String {
    format!("dzsearch:{}", title.trim())
}

/// YouTube title-to-deezer fallback query (mirrors the
/// `handleYoutube` tail: `removeParenthesesContent(title)`, then the
/// `if (itemName !== "" || itemName !== null)` gate).
/// DELTA (deliberate, documented): the TS gate is a tautology — a
/// string is never both `""` and `null`, so even a title that strips
/// to `""` (e.g. `"(Official Video)"`) is searched on deezer with an
/// empty query. The `else { return undefined }` branch is dead code.
/// Here an empty cleaned name folds to `None` (no-matches) instead:
/// an empty `dzsearch:` query can only yield an empty/error load,
/// which the `searchMusicQuery` accept gate
/// (`res?.tracks.length && length > 0`) rejects downstream anyway,
/// so both sides converge to no-result without a wasted node round
/// trip. `Some` carries the exact `deezer_title_identifier` string
/// (trimmed — `removeParenthesesContent` already trims, so the
/// second trim is a no-op on reachable inputs).
pub fn youtube_deezer_fallback_query(cleaned_name: &str) -> Option<String> {
    let trimmed = cleaned_name.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(format!("dzsearch:{trimmed}"))
}

/// Single first-hit load for the concurrent fan-out. None on any
/// failure (transport, REST status, parse, empty/error load): the
/// per-track catch, mirroring the TS `catch { return undefined }`.
async fn load_first_hit(
    http: &reqwest::Client,
    base_url: &str,
    password: &str,
    identifier: &str,
) -> Option<Track> {
    let res = http
        .get(format!(
            "{base_url}/v4/loadtracks?identifier={}",
            urlencoding(identifier)
        ))
        .header("Authorization", password)
        .send()
        .await
        .ok()?;
    if !res.status().is_success() {
        return None;
    }
    let loaded: LoadResult = res.json().await.ok()?;
    split_loaded(loaded).0.into_iter().next()
}

/// YouTube title lookup for the title-to-deezer fallback (mirrors the
/// youtubei.js title fetch in `handleYoutube`). Keyless oEmbed; None
/// on any failure so the caller falls through to no-matches.
async fn youtube_oembed_title(http: &reqwest::Client, url: &str) -> Option<(String, String)> {
    let endpoint = format!(
        "https://www.youtube.com/oembed?url={}&format=json",
        urlencoding(url)
    );
    let res = http.get(endpoint).send().await.ok()?;
    if !res.status().is_success() {
        return None;
    }
    let body: serde_json::Value = res.json().await.ok()?;
    let title = body.get("title")?.as_str()?;
    if title.trim().is_empty() {
        return None;
    }
    let author = body
        .get("author_name")
        .and_then(|a| a.as_str())
        .unwrap_or("")
        .to_string();
    Some((title.to_string(), author))
}

// ---- search pipeline (mirrors searchQueryOnNode in musicPlay.ts) ----

/// Query-batch normalization (mirrors `handleMusicPlay` +
/// `searchMusicQuery`, musicPlay.ts:825-827:
/// `queries.map((query) => query.trim()).filter(Boolean)`).
/// Trims every query with the JS whitespace set ([`crate::funcs::js_trim`]),
/// drops the empties, order preserved. JS `filter(Boolean)` drops exactly
/// the empty string post-trim (node battery: `["  song  ","   ",""]` ->
/// `["song"]`, `[]` -> `[]`), which is `!is_empty` here.
///
/// JS-TRIM EXACTNESS (W6 slice 163): this previously used Rust
/// `str::trim`, which strips U+0085 NEL (`White_Space=yes`) while JS
/// `String.trim` keeps it (node ground truth: `"\u0085".trim()` is
/// length 1, so `["\u0085"]` normalizes to one query and plays; the old
/// Rust folded it to `[]` and answered the no-result embed). U+180E
/// matches on both sides (neither trims, post-ES2016 table).
pub fn normalize_play_queries(queries: &[String]) -> Vec<String> {
    queries
        .iter()
        .map(|q| crate::funcs::js_trim(q).to_string())
        .filter(|q| !q.is_empty())
        .collect()
}

/// True when the query already carries a `source:` search prefix
/// (lavalink-client `transformQuery` extracts these before routing, so
/// they pass through instead of stacking a second prefix).
/// JS-trimmed, not Rust-trimmed: U+0085 NEL survives `String.trim`
/// but not `str::trim` (same W6 slice 163 class as
/// `normalize_play_queries`), so a NEL-padded query must route bare
/// on both sides.
fn has_search_prefix(query: &str) -> bool {
    let q = crate::funcs::js_trim(query);
    let Some(colon) = q.find(':') else {
        return false;
    };
    let (scheme, rest) = q.split_at(colon);
    if scheme.is_empty() || rest.len() <= 1 {
        return false;
    }
    let mut chars = scheme.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.')
}

/// True when the query parses as a URL (mirrors `isUrlQuery`: the TS
/// side runs `new URL(query)`).
///
/// node ground-truth battery (W6 slice 146): any scheme parses, not just
/// http(s) (`spotify:track:abc`, `tel:+123`, `C:\path` all true); scheme
/// grammar is ASCII `^[A-Za-z][A-Za-z0-9+.-]*:` (`:foo`/`1abc:def`/nonascii
/// false). Non-special schemes accept ANY opaque rest, including empty
/// (`foo:`, `tel:`, `ab:`, `just:`) and whitespace (`foo:ba r`,
/// `title: test`, `foo:  a  b  `, `dzsearch:never gonna give you up`).
/// A `//` rest opens authority parsing even for non-special schemes
/// (`foo://`/`foo:////` true via the empty-host leg, `foo://h/` true,
/// `foo://a b/`/`foo://h:bad/`/`foo://h:99999/` false). Special schemes
/// (http/https/ws/wss/ftp) need a real host (`http://`/`http:`/`wss://`
/// false; `http:example.com`/`http:/x`/`http:///x`/upper-scheme true).
/// `file:` allows an empty host (`file:`/`file://`/`file:///x` true).
/// Preprocessing is WHATWG, not a plain trim: tabs/newlines are stripped
/// everywhere (`foo:bar-tab`, `https://a-tab.com` true) and ends trim to
/// C0/space only, so U+0085 is NOT stripped (NEL-prefixed false).
/// DELTA (unrepresentable): lone surrogates (impossible in `&str`).
pub fn is_url_query(query: &str) -> bool {
    let stripped: String = query
        .chars()
        .filter(|&c| !matches!(c, '\t' | '\n' | '\r'))
        .collect();
    let src = trim_url_ends(&stripped);
    let Some(colon) = src.find(':') else {
        return false;
    };
    let (scheme_raw, after) = (&src[..colon], &src[colon + 1..]);
    if scheme_raw.is_empty() {
        return false;
    }
    let mut chars = scheme_raw.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() => {}
        _ => return false,
    }
    if !chars.all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.') {
        return false;
    }
    let scheme = scheme_raw.to_ascii_lowercase();
    // Authority-bearing rests (`//...`) validate the host even for
    // non-special schemes; `file:` additionally tolerates an empty host.
    if scheme == "file" {
        match after.strip_prefix("//") {
            None => return true,
            Some(rest) => {
                let auth_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
                if rest[..auth_end].is_empty() {
                    return true;
                }
            }
        }
    } else if is_special_scheme(&scheme) {
        return whatwg_host(src).is_some();
    } else if let Some(rest) = after.strip_prefix("//") {
        let auth_end = rest.find(['/', '?', '#']).unwrap_or(rest.len());
        if rest[..auth_end].is_empty() {
            return true;
        }
    } else {
        // Opaque rest: always parses (empty, spaces, NUL all fine).
        return true;
    }
    whatwg_host(src).is_some()
}

/// Mirror of `new URL(url).host` — the `.host` the TS `is*URL` guards
/// call `.includes()` on (musicPlay.ts:106-144), pinned by a node
/// ground-truth battery (W6 slice 32). Any scheme with an authority
/// parses (`ftp:`/`ws:`/`wss:`, uppercase schemes, `scheme:` without
/// slashes for special schemes); `file:` alone strips exactly `//`
/// (empty file hosts stay hostless); userinfo cuts at the last `@`;
/// the port must be empty or ASCII digits <= 65535 (anything else
/// fails the whole parse); default ports drop, as does any port on a
/// trailing-dot host; `%HH` host escapes decode but a bare `%` or a
/// decoded forbidden char (`#%/:<>?@[\]^|`, C0, space, DEL) fails;
/// ASCII tab/newline is stripped everywhere first, ends trimmed to
/// C0/space (WHATWG). None = parse failure or empty host — both read
/// false in every classifier. Deltas (hostile-input edges, all
/// verdict-neutral for the five alpha-substring classifiers):
/// non-ASCII hosts pass through ASCII-lowercased instead of IDNA
/// punycode + full Unicode casefold; inner non-tab/newline C0
/// controls fail instead of the exact WHATWG table; IPv6 brackets
/// keep raw text (charset-gated) instead of compressing; non-special
/// ports > 65535 fail like special ones.
pub fn whatwg_host(input: &str) -> Option<String> {
    let stripped: String = input
        .chars()
        .filter(|&c| !matches!(c, '\t' | '\n' | '\r'))
        .collect();
    let src = trim_url_ends(&stripped);
    let colon = src.find(':')?;
    let (scheme_raw, after) = (&src[..colon], &src[colon + 1..]);
    if scheme_raw.is_empty()
        || !scheme_raw.bytes().enumerate().all(|(i, b)| {
            b.is_ascii_alphabetic()
                || (i > 0 && (b.is_ascii_digit() || matches!(b, b'+' | b'-' | b'.')))
        })
    {
        return None;
    }
    let scheme = scheme_raw.to_ascii_lowercase();
    let special = is_special_scheme(&scheme);
    let rest = if scheme == "file" {
        after.strip_prefix("//")?
    } else if special {
        after.trim_start_matches(['/', '\\'])
    } else {
        after.strip_prefix("//")?
    };
    let auth_end = rest
        .find(|c: char| c == '/' || c == '?' || c == '#' || (special && c == '\\'))
        .unwrap_or(rest.len());
    let authority = &rest[..auth_end];
    if authority.is_empty() {
        return None;
    }
    let hostport = match authority.rfind('@') {
        Some(i) => &authority[i + 1..],
        None => authority,
    };
    let (host_raw, port) = if hostport.starts_with('[') {
        let close = hostport.find(']')?;
        let tail = &hostport[close + 1..];
        let port = if let Some(p) = tail.strip_prefix(':') {
            Some(p)
        } else if tail.is_empty() {
            None
        } else {
            return None;
        };
        (&hostport[..close + 1], port)
    } else {
        match hostport.rfind(':') {
            Some(i) => {
                let p = &hostport[i + 1..];
                if p.is_empty() {
                    (&hostport[..i], None)
                } else if p.bytes().all(|b| b.is_ascii_digit()) {
                    (&hostport[..i], Some(p))
                } else {
                    // WHATWG: garbage port fails the whole parse.
                    return None;
                }
            }
            None => (hostport, None),
        }
    };
    if host_raw.is_empty() {
        return None;
    }
    let is_bracket = host_raw.starts_with('[');
    let host = if is_bracket {
        if !host_raw[1..host_raw.len() - 1]
            .bytes()
            .all(|b| b.is_ascii_hexdigit() || b == b':' || b == b'.')
        {
            return None;
        }
        host_raw.to_ascii_lowercase()
    } else {
        decode_host(host_raw, special)?.to_ascii_lowercase()
    };
    let keep_port = match port {
        None => None,
        Some(p) => {
            let n: u32 = p.parse().ok()?;
            if n > 65535 {
                return None;
            }
            let is_default = yt_default_port(&scheme).is_some_and(|d| d == n);
            if is_default || host.ends_with('.') {
                None
            } else {
                Some(p)
            }
        }
    };
    let mut out = host;
    if let Some(p) = keep_port {
        out.push(':');
        out.push_str(p);
    }
    Some(out)
}

/// Percent-decode a URL host (`%HH` must be valid hex); None on a bare
/// `%`, undecodable UTF-8, or a decoded forbidden host char (WHATWG
/// forbidden host code points + C0/space/DEL). Non-ASCII bytes pass
/// through raw (no IDNA — see `whatwg_host` deltas). For special schemes
/// C1 controls (U+0080–U+009F) also fail: TS `new URL` runs domain to
/// ASCII (UTS-46) there and throws, so every `is*URL` classifier is
/// false; opaque (non-special) hosts keep them percent-encoded instead.
fn decode_host(s: &str, special: bool) -> Option<String> {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            if i + 2 >= b.len() || !b[i + 1].is_ascii_hexdigit() || !b[i + 2].is_ascii_hexdigit() {
                return None;
            }
            let v = u8::from_str_radix(&s[i + 1..i + 3], 16).ok()?;
            out.push(v);
            i += 3;
        } else {
            out.push(b[i]);
            i += 1;
        }
    }
    for &v in &out {
        if v <= 0x20
            || v == 0x7f
            || matches!(
                v,
                b'#' | b'%'
                    | b'/'
                    | b':'
                    | b'<'
                    | b'>'
                    | b'?'
                    | b'@'
                    | b'['
                    | b'\\'
                    | b']'
                    | b'^'
                    | b'|'
            )
        {
            return None;
        }
    }
    String::from_utf8(out)
        .ok()
        .filter(|h| !special || !h.chars().any(|c| ('\u{80}'..='\u{9f}').contains(&c)))
}

/// Mirrors `isSpotifyURL` (host contains "spotify", any scheme with an
/// authority — `ftp:`/`spotify:` hosts count, opaque `spotify:track:…`
/// URIs stay hostless and false).
pub fn is_spotify_url(query: &str) -> bool {
    whatwg_host(query).is_some_and(|h| h.contains("spotify"))
}

/// Mirrors `isYoutubeURL` (host contains "youtu").
pub fn is_youtube_url(query: &str) -> bool {
    whatwg_host(query).is_some_and(|h| h.contains("youtu"))
}

/// Mirrors `isAppleMusicURL` (host contains "apple.com").
pub fn is_apple_music_url(query: &str) -> bool {
    whatwg_host(query).is_some_and(|h| h.contains("apple.com"))
}

/// Mirrors `isAmazonMusicURL` (host contains "amazon").
pub fn is_amazon_music_url(query: &str) -> bool {
    whatwg_host(query).is_some_and(|h| h.contains("amazon"))
}

/// Mirrors `isTidalURL` (host contains "tidal").
pub fn is_tidal_url(query: &str) -> bool {
    whatwg_host(query).is_some_and(|h| h.contains("tidal"))
}

/// Source-routing outcome for one play query (mirrors the
/// `searchQueryOnNode` if/else chain in musicPlay.ts, whose order is
/// spotify → youtube → apple → amazon → tidal → url-query → bare
/// text; first hit wins, so overlap hosts route by position).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QueryRoute {
    Spotify,
    Youtube,
    Apple,
    Amazon,
    Tidal,
    Url,
    Bare,
}

/// Pure port of the `searchQueryOnNode` routing chain (musicPlay.ts).
/// NOTE: `resolve_on` JS-trims the query before routing, which converges
/// with TS — WHATWG URL parsing strips leading/trailing spaces anyway
/// (node battery: a space-padded Spotify URL still routes `spotify`;
/// U+0085 is kept by both and fails the parse, routing bare).
pub fn route_query_source(query: &str) -> QueryRoute {
    if is_spotify_url(query) {
        QueryRoute::Spotify
    } else if is_youtube_url(query) {
        QueryRoute::Youtube
    } else if is_apple_music_url(query) {
        QueryRoute::Apple
    } else if is_amazon_music_url(query) {
        QueryRoute::Amazon
    } else if is_tidal_url(query) {
        QueryRoute::Tidal
    } else if is_url_query(query) {
        QueryRoute::Url
    } else {
        QueryRoute::Bare
    }
}

/// Deezer-vs-SoundCloud winner pick (mirrors the URL branch's
/// `soundcloudScore > deezerScore ? soundcloudRes : deezerRes`: strict
/// greater, so an exact tie keeps the deezer result; URL-branch-only —
/// the bare-text tail serves the dissimilarity re-search verbatim with
/// no pick, W6 slice 157).
pub fn prefers_soundcloud(deezer_score: f64, sc_score: f64) -> bool {
    sc_score > deezer_score
}

/// Album/playlist fan-out cap (mirrors the `tracks.slice(0, 100)` in
/// `handleSpotify`/`handleAppleMusic`/`handleTidalMusic`/
/// `handleAmazonMusic`, musicPlay.ts:170/:340: only the first 100
/// metadata tracks are re-searched, input order kept).
pub const PLAYLIST_FANOUT_CAP: usize = 100;

/// Deezer re-search identifier for one metadata track (mirrors
/// `handleSpotify`'s `` { query: `${track.artist} ${track.name}`,
/// source: "deezer" } `` legs, musicPlay.ts:160-166/:175-181: the
/// identifier is `dzsearch:<artist> <name>`, single space).
/// DELTAS (doc, convergent on reachable inputs): TS interpolates
/// verbatim (no trim, so a padded artist sends padded; a missing
/// artist renders the literal `"undefined"`) while this trims both
/// halves and maps a missing artist to `""` — the metadata port
/// (`metadata::spotify::join_artist_names`) only ever yields clean
/// joined names, so the legs agree on every real input.
pub fn spotify_track_query(artist: Option<&str>, title: &str) -> String {
    format!(
        "dzsearch:{} {}",
        artist.unwrap_or_default().trim(),
        title.trim()
    )
}

/// Deezer re-search identifier for one Apple/Tidal/Amazon single song
/// (mirrors the `// Single song` legs of `handleAppleMusic` /
/// `handleTidalMusic` / `handleAmazonMusic`, musicPlay.ts:328/:407/:486:
/// `` { query: `${res.title} - ${res.artist.name}`, source: "deezer" } ``
/// — title FIRST with a ` - ` separator, reversed vs the Spotify leg).
/// DELTAS (doc, convergent on reachable inputs): TS interpolates
/// verbatim (no trim, so padded input sends padded; a missing artist
/// renders the literal `"undefined"`) while this trims both halves and
/// maps a missing artist to `""` — the metadata ports yield clean
/// non-optional `String` fields (`title`, `artist.name`), so the legs
/// agree on every real input.
pub fn platform_song_query(artist: Option<&str>, title: &str) -> String {
    format!(
        "dzsearch:{} - {}",
        title.trim(),
        artist.unwrap_or_default().trim()
    )
}

/// Deezer re-search identifier for one Apple/Tidal/Amazon album/playlist
/// track (mirrors the fan-out legs, musicPlay.ts:347/:426/:505:
/// `` { query: `${track.title} ${track.artist.name}`, source: "deezer" } ``
/// — title FIRST with a single space and NO dash, reversed vs the
/// Spotify fan-out leg). Same trim/missing deltas as
/// [`platform_song_query`]; same reachability (clean port strings).
pub fn platform_album_track_query(artist: Option<&str>, title: &str) -> String {
    format!(
        "dzsearch:{} {}",
        title.trim(),
        artist.unwrap_or_default().trim()
    )
}

/// How many resolved tracks the multi-query loop enqueues for one
/// query result (mirrors `player.queue.add(loadType === "playlist"
/// ? tracks : tracks[0])` in `handleMusicPlay`, musicPlay.ts:883-885:
/// strict-`===` playlist takes every track, any other loadType takes
/// exactly the first hit; battery slice 158 replicating the verbatim
/// legs (`TRACK`/uppercase is single, empty stays empty). The
/// `firstResult ??= res` latch needs no fn (`Option::or`, same
/// nullish-only swap, pinned below); the per-query abort gate
/// (`!res || tracks.length === 0` -> NoResult + return, :854-857)
/// folds into the existing `response_exists` + `NoMatches` path.
pub fn enqueue_take(is_playlist: bool, track_count: usize) -> usize {
    if is_playlist {
        track_count
    } else {
        track_count.min(1)
    }
}

/// Strip `(…)` / `[…]` groups (mirrors `removeParenthesesContent`:
/// YouTube titles carry `(Prod. …)` extras Deezer/Spotify don't).
/// The whitespace collapse mirrors JS `/\s+/g` + `trim()`: U+0085 is
/// NOT JS whitespace (kept), U+FEFF is (split) — unlike Rust
/// `split_whitespace`, which does the exact opposite on both.
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
    let trimmed = out.trim_matches(crate::funcs::is_js_whitespace);
    let mut res = String::with_capacity(trimmed.len());
    let mut in_gap = false;
    for c in trimmed.chars() {
        if crate::funcs::is_js_whitespace(c) {
            in_gap = true;
        } else {
            if in_gap && !res.is_empty() {
                res.push(' ');
            }
            in_gap = false;
            res.push(c);
        }
    }
    res
}

/// Exact-match YouTube hosts from `sanitizeYoutubeUrl`
/// (`youtubeHosts.includes(url.hostname)` — subdomains do NOT match).
const YT_HOSTS: [&str; 4] = [
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
    "music.youtube.com",
];

/// Tracking/playback params deleted by `sanitizeYoutubeUrl`.
const YT_DROP_PARAMS: [&str; 10] = [
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

/// Default port dropped on serialization (WHATWG special schemes).
fn yt_default_port(scheme: &str) -> Option<u32> {
    match scheme {
        "http" | "ws" => Some(80),
        "https" | "wss" => Some(443),
        "ftp" => Some(21),
        _ => None,
    }
}

fn is_special_scheme(scheme: &str) -> bool {
    matches!(scheme, "http" | "https" | "ws" | "wss" | "ftp" | "file")
}

/// Leading/trailing C0 controls + space, the only chars `new URL`
/// strips (NOT full Unicode trim: U+0085 stays and fails the parse).
fn trim_url_ends(s: &str) -> &str {
    s.trim_matches(|c: char| (c as u32) <= 0x20)
}

/// application/x-www-form-urlencoded decode (`+` -> space, `%XX` ->
/// bytes, bare `%` kept literally for the re-encode pass).
fn form_decode(s: &str) -> Vec<u8> {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        match b[i] {
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b'%' if i + 2 < b.len()
                && b[i + 1].is_ascii_hexdigit()
                && b[i + 2].is_ascii_hexdigit() =>
            {
                out.push(u8::from_str_radix(&s[i + 1..i + 3], 16).unwrap_or(b'%'));
                i += 3;
            }
            _ => {
                out.push(b[i]);
                i += 1;
            }
        }
    }
    out
}

/// WHATWG urlencoded serializer: keeps `[0-9A-Za-z*._-]`, space ->
/// `+`, everything else `%UPPERHEX` (so `~` -> `%7E`, `/` stays
/// `%2F`, lone `%` -> `%25`).
fn form_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.as_bytes() {
        match b {
            b'0'..=b'9' | b'A'..=b'Z' | b'a'..=b'z' | b'*' | b'-' | b'.' | b'_' => {
                out.push(*b as char);
            }
            b' ' => out.push('+'),
            _ => {
                out.push_str(&format!("%{b:02X}"));
            }
        }
    }
    out
}

/// WHATWG path percent-encode set (C0 + space, `"#<>?` `` ` `` `{}`,
/// DEL, non-ASCII as UTF-8 `%UPPERHEX`; `%` and `/` stay raw).
fn path_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        if (c as u32) <= 0x20
            || c == '\u{7f}'
            || (c as u32) > 0x7e
            || matches!(c, '"' | '#' | '<' | '>' | '?' | '`' | '{' | '}')
        {
            let mut buf = [0u8; 4];
            for b in c.encode_utf8(&mut buf).as_bytes() {
                out.push_str(&format!("%{b:02X}"));
            }
        } else {
            out.push(c);
        }
    }
    out
}

/// Dot-segment resolution for special-scheme paths (`/a/../watch` ->
/// `/watch`); inner empty segments are preserved, `..` past the root
/// is dropped.
fn remove_dot_segments(path: &str) -> String {
    let trailing_slash = path.ends_with('/') || path.ends_with("/.") || path.ends_with("/..");
    let mut stack: Vec<&str> = Vec::new();
    for seg in path.split('/') {
        if seg == ".." {
            if stack.last().is_some_and(|s| !s.is_empty()) {
                stack.pop();
            }
        } else if seg != "." {
            stack.push(seg);
        }
    }
    let mut res = stack.join("/");
    if !res.starts_with('/') {
        res.insert(0, '/');
    }
    if trailing_slash && !res.ends_with('/') {
        res.push('/');
    }
    res
}

/// Drop YouTube tracking/playlist params. Mirrors `sanitizeYoutubeUrl`
/// exactly (WHATWG `new URL` + `searchParams.delete` + `toString`,
/// pinned by a node ground-truth battery, W6 slice 31): any scheme
/// with a host parses (incl. `ftp:`, uppercase, `scheme:` without
/// slashes for special schemes); the host must match EXACTLY (lowered,
/// port/userinfo stripped — subdomains and trailing-dot hosts pass
/// through); default ports drop; empty paths gain `/`; dot segments
/// resolve (special schemes); the query re-serializes even when
/// nothing is dropped (bare `?x` -> `?x=`, `%41` -> `A`, `+` kept,
/// `;`/`=` in values encoded, lone `%` -> `%25`, param names decoded
/// before the case-sensitive DROP match so `%73%69` drops but `SI`
/// stays); fragments survive verbatim; non-URLs and non-matching hosts
/// return the input untouched (untrimmed). Non-YouTube inputs pass
/// through untouched.
pub fn sanitize_youtube_url(input: &str) -> String {
    let src = trim_url_ends(input);
    let colon = match src.find(':') {
        Some(i) => i,
        None => return input.to_string(),
    };
    let (scheme_raw, after) = (&src[..colon], &src[colon + 1..]);
    if scheme_raw.is_empty()
        || !scheme_raw.bytes().enumerate().all(|(i, b)| {
            b.is_ascii_alphabetic()
                || (i > 0 && (b.is_ascii_digit() || matches!(b, b'+' | b'-' | b'.')))
        })
    {
        return input.to_string();
    }
    let scheme = scheme_raw.to_ascii_lowercase();
    let special = is_special_scheme(&scheme);
    let rest = if special {
        after.trim_start_matches(['/', '\\'])
    } else {
        match after.strip_prefix("//") {
            Some(r) => r,
            None => return input.to_string(),
        }
    };
    let auth_end = rest
        .find(|c: char| c == '/' || c == '?' || c == '#' || (special && c == '\\'))
        .unwrap_or(rest.len());
    let (authority, mut remainder) = rest.split_at(auth_end);
    if authority.is_empty() {
        return input.to_string();
    }
    let (userinfo, hostport) = match authority.rfind('@') {
        Some(i) => (Some(&authority[..i]), &authority[i + 1..]),
        None => (None, authority),
    };
    let (host_raw, port) = if hostport.starts_with('[') {
        let close = match hostport.find(']') {
            Some(i) => i,
            None => return input.to_string(),
        };
        let tail = &hostport[close + 1..];
        let port = if let Some(p) = tail.strip_prefix(':') {
            Some(p)
        } else if tail.is_empty() {
            None
        } else {
            return input.to_string();
        };
        (&hostport[..close + 1], port)
    } else {
        match hostport.rfind(':') {
            Some(i) => {
                let p = &hostport[i + 1..];
                if p.is_empty() {
                    (&hostport[..i], None)
                } else if p.bytes().all(|b| b.is_ascii_digit()) {
                    (&hostport[..i], Some(p))
                } else {
                    // WHATWG: garbage port fails the whole parse.
                    return input.to_string();
                }
            }
            None => (hostport, None),
        }
    };
    if host_raw.is_empty() {
        return input.to_string();
    }
    if let Some(p) = port {
        if p.parse::<u32>().is_ok_and(|n| n > 65535) {
            return input.to_string();
        }
    }
    let host = host_raw.to_ascii_lowercase();
    if !YT_HOSTS.contains(&host.as_str()) {
        return input.to_string();
    }
    // Fragment splits first so `?` inside it stays literal.
    let fragment = match remainder.find('#') {
        Some(i) => {
            let f = &remainder[i..];
            remainder = &remainder[..i];
            Some(f)
        }
        None => None,
    };
    let query_raw = match remainder.find('?') {
        Some(i) => {
            let q = &remainder[i + 1..];
            remainder = &remainder[..i];
            Some(q)
        }
        None => None,
    };
    let mut path = if special {
        remainder.replace('\\', "/")
    } else {
        remainder.to_string()
    };
    if special {
        path = remove_dot_segments(&path);
    }
    if path.is_empty() {
        path = "/".to_string();
    }
    let path = path_encode(&path);
    let mut kept: Vec<(String, String)> = Vec::new();
    if let Some(q) = query_raw {
        for pair in q.split('&') {
            if pair.is_empty() {
                continue;
            }
            let (name_raw, value_raw) = match pair.split_once('=') {
                Some((n, v)) => (n, v),
                None => (pair, ""),
            };
            let name = String::from_utf8_lossy(&form_decode(name_raw)).into_owned();
            if YT_DROP_PARAMS.contains(&name.as_str()) {
                continue;
            }
            let value = String::from_utf8_lossy(&form_decode(value_raw)).into_owned();
            kept.push((name, value));
        }
    }
    let drop_port = port.is_some_and(|p| yt_default_port(&scheme) == p.parse().ok());
    let mut out = format!("{scheme}://");
    if let Some(u) = userinfo {
        out.push_str(u);
        out.push('@');
    }
    out.push_str(&host);
    if let Some(p) = port.filter(|_| !drop_port) {
        out.push(':');
        out.push_str(p);
    }
    out.push_str(&path);
    if !kept.is_empty() {
        out.push('?');
        out.push_str(
            &kept
                .iter()
                .map(|(n, v)| format!("{}={}", form_encode(n), form_encode(v)))
                .collect::<Vec<_>>()
                .join("&"),
        );
    }
    if let Some(f) = fragment {
        out.push_str(f);
    }
    out
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

/// Levenshtein distance (mirrors `music_proximity.levenshtein`:
/// TS indexes UTF-16 code units, so astral chars count 2).
pub fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<u16> = a.encode_utf16().collect();
    let b: Vec<u16> = b.encode_utf16().collect();
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

/// Similarity score in 0..=1 (mirrors `music_proximity.similarity`:
/// maxLen is the ORIGINAL strings in UTF-16 units).
pub fn proximity_similarity(a: &str, b: &str) -> f64 {
    let dist = levenshtein(&a.to_lowercase(), &b.to_lowercase()) as f64;
    let max_len = a.encode_utf16().count().max(b.encode_utf16().count()) as f64;
    if max_len == 0.0 {
        1.0
    } else {
        1.0 - dist / max_len
    }
}

/// `title + author` label compared against queries (mirrors
/// `buildTrackLabel`: `` `${title} ${author}`.trim() `` — the parts are
/// NOT trimmed individually, so a trailing space in the title (or a
/// leading space in the author) survives as an inner double space;
/// only the whole is JS-trimmed. Slice 96 battery: ("a ","b") and
/// ("a"," b") both yield "a  b"; ("  ","  ") yields "").
pub fn build_track_label(title: &str, author: &str) -> String {
    crate::funcs::js_trim(&format!("{title} {author}")).to_string()
}

/// Word-level fuzzy match (mirrors `music_proximity.isSimilar` with
/// its default 0.5 / 0.6 thresholds): words split on the JS `\s` set
/// (U+0085 does NOT split, U+FEFF does); every query word needs a
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
        .split(crate::funcs::is_js_whitespace)
        .filter(|w| !w.is_empty())
        .map(str::to_string)
        .collect();
    if query_words.is_empty() {
        return false;
    }
    let track_words: Vec<String> = format!("{} {}", author.to_lowercase(), title.to_lowercase())
        .split(crate::funcs::is_js_whitespace)
        .filter(|w| !w.is_empty())
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
/// (mirrors `responseExist`: `tracks.length > 0 &&
/// !!tracks[0].info.title`). The check is raw JS truthiness — a
/// whitespace-only title (" ") COUNTS (slice 96 battery: true), so no
/// `.trim()` here; only the empty string misses. Callers fall through
/// to the no-match path exactly like the TS `searchQueryOnNode`
/// Deezer/SoundCloud legs. Unrepresentable past the `&[Track]`
/// signature (live `SearchResult.tracks` is always an array):
/// `tracks: null` throws in TS instead of returning false.
pub fn response_exists(tracks: &[Track]) -> bool {
    tracks.first().is_some_and(|t| !t.info.title.is_empty())
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
    /// `playerUpdate` op: node ping recorded for diagnostics.
    PlayerUpdated,
    /// `stats` op: node load recorded for diagnostics.
    StatsUpdated,
    Ignored,
}

/// One guild channel projected for announce fallback ordering.
/// `parent_id` is the category for the same-category leg.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AnnounceChannel {
    pub id: u64,
    pub kind: serenity::ChannelType,
    pub parent_id: Option<u64>,
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
///
/// Flag shape mirrors lavalink-client exactly (verified against the
/// bundled dist): `connect()` sends `self_mute: selfMute ?? false,
/// self_deaf: selfDeaf ?? true` (the TS player is created with
/// `selfDeaf: true, selfMute: false`), while `disconnect()` — the
/// leave leg every destroy path funnels through — sends
/// `channel_id: null, self_mute: false, self_deaf: false`.
pub fn voice_state_update_op(guild_id: u64, channel_id: Option<u64>) -> serde_json::Value {
    serde_json::json!({
        "op": 4,
        "d": {
            "guild_id": guild_id.to_string(),
            "channel_id": channel_id.map(|c| c.to_string()),
            "self_mute": false,
            "self_deaf": channel_id.is_some(),
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
///
/// The RFC 6455 handshake headers (Host / Connection / Upgrade /
/// Sec-WebSocket-Version / Sec-WebSocket-Key) are set explicitly:
/// tungstenite 0.21's `generate_request` (used by `connect` on a
/// prebuilt `Request`) REQUIRES them present and fails with
/// `InvalidHeader(sec-websocket-key)` otherwise — it does not add
/// them for caller-built requests.
pub fn node_ws_request(
    cfg: &NodeCfg,
    user_id: u64,
    session: Option<&str>,
) -> Result<tungstenite::handshake::client::Request, MusicError> {
    use tungstenite::http::header::HeaderValue;
    let hv = |v: &str| HeaderValue::from_str(v).map_err(|e| MusicError::Transport(e.to_string()));
    let host = if (cfg.secure && cfg.port == 443) || (!cfg.secure && cfg.port == 80) {
        cfg.host.clone()
    } else {
        format!("{}:{}", cfg.host, cfg.port)
    };
    let mut builder = tungstenite::http::Request::builder()
        .method("GET")
        .uri(node_ws_url(cfg))
        .version(tungstenite::http::Version::HTTP_11)
        .header("Host", hv(&host)?)
        .header("Connection", hv("Upgrade")?)
        .header("Upgrade", hv("websocket")?)
        .header("Sec-WebSocket-Version", hv("13")?)
        .header(
            "Sec-WebSocket-Key",
            hv(&tungstenite::handshake::client::generate_key())?,
        )
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
    /// track start/end/queue-end hooks; the live drive task POSTs
    /// now-playing + scrobbles once [`LavalinkManager::register_lastfm_live`]
    /// supplies Http + pool + keys.
    lastfm_sessions: Mutex<HashMap<u64, LastFmSession>>,
    /// Live LastFM driver ctx (Http + pool + API keys), registered
    /// once from the first music command. `None` in tests / pre-first-
    /// command: sessions track but nothing POSTs.
    lastfm_live: Mutex<Option<LastfmLiveCtx>>,
    /// DB pool for the trackStart announce leg (guild lang + LastFM tip
    /// row). Registered from music commands via [`LavalinkManager::set_announce_pool`]
    /// (the WS-feed announce path has no command context to read it
    /// from); None until the first music command runs, in which case
    /// the announce falls back to `en-US` with no tip, like before.
    announce_pool: Mutex<Option<crate::db::Pool>>,
}

/// Bundled start-of-track params for [`LavalinkManager::lastfm_track_start`].
#[derive(Debug, Clone)]
pub struct LastfmTrackStart {
    pub guild_id: u64,
    pub artist: String,
    pub title: String,
    /// Raw Lavalink `length`; normalized via
    /// `normalize_lastfm_duration_ms` (streams count as 0, mirroring
    /// `normalizeTrack`) before the session stores it.
    pub duration_ms: u64,
    /// Lavalink `isStream` leg of `normalizeTrack`.
    pub is_stream: bool,
    pub requester: u64,
    pub now_ms: i64,
    pub voice_channel: Option<u64>,
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
            lastfm_live: Mutex::new(None),
            announce_pool: Mutex::new(None),
        }
    }

    /// Register the DB pool for the trackStart announce leg (guild lang
    /// and LastFM tip row). Called from music commands, which own a pool;
    /// the WS-feed announce path cannot reach one otherwise.
    pub async fn set_announce_pool(&self, pool: crate::db::Pool) {
        *self.announce_pool.lock().await = Some(pool);
    }

    /// Reconcile node list with config (idempotent; preserves sessions).
    /// Entries whose connection fields changed (host/port/password/
    /// secure) are rebuilt so the new config actually dials; unchanged
    /// ids keep their entry + WS session.
    pub async fn sync_nodes(&self, cfgs: &[NodeCfg], user_id: u64) {
        let mut nodes = self.nodes.write().await;
        let mut kept: Vec<Arc<NodeEntry>> = vec![];
        for cfg in cfgs {
            if cfg.host.trim().is_empty() {
                continue;
            }
            if let Some(existing) = nodes.iter().find(|n| n.id == cfg.id) {
                let same = existing.lava_cfg.host == cfg.host
                    && existing.lava_cfg.port == cfg.port
                    && existing.lava_cfg.password == cfg.password
                    && existing.secure == cfg.secure;
                if same {
                    kept.push(Arc::clone(existing));
                    continue;
                }
                // Field change: fall through and rebuild (the old
                // session belongs to the old endpoint/credentials).
            }
            kept.push(Arc::new(NodeEntry::new(cfg, user_id)));
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
    /// The node payload carries no requester, so the previous current's
    /// requester is preserved (lavalink-client keeps the queue track's
    /// requester across the start event; dropping it would orphan the
    /// LastFM tip + error-report attribution).
    pub async fn handle_track_start(&self, ev: TrackStartEvent) {
        if let Ok(gid) = ev.guild_id.parse::<u64>() {
            let mut players = self.players.lock().await;
            let p = players.entry(gid).or_insert_with(GuildPlayer::new);
            let prev_requester = p.current.as_ref().map(|t| t.requester);
            let mut next = QueuedTrack::from((&ev.track, 0));
            if let Some(r) = prev_requester {
                next.requester = r;
            }
            p.current = Some(next);
            p.idle_since_ms = None;
            p.paused = false;
            let requester = p.current.as_ref().map(|t| t.requester).unwrap_or(0);
            let voice_channel = p.voice_channel;
            drop(players);
            // LastFM start hook (mirrors
            // lastFMScrobbler.handleTrackStart: clear the old session,
            // open a new one for this track).
            self.lastfm_track_start(LastfmTrackStart {
                guild_id: gid,
                artist: ev.track.info.author.clone(),
                title: ev.track.info.title.clone(),
                duration_ms: ev.track.info.length,
                is_stream: ev.track.info.is_stream,
                requester,
                now_ms: now_ms_wall(),
                voice_channel,
            })
            .await;
        }
        self.dispatcher.lock().await.dispatch_track_start(ev).await;
    }

    /// Open (replacing any stale) LastFM session for a starting track
    /// (mirrors `handleTrackStart` clearing + setting guildSessions).
    /// `voice_channel` seeds the tracked channel (mirrors
    /// `session.voiceChannelId`); pause accumulators start empty
    /// (mirrors a fresh listener map).
    pub async fn lastfm_track_start(&self, start: LastfmTrackStart) {
        let track_key = lastfm_track_key(&start.artist, &start.title, start.now_ms);
        // `normalizeTrack`: streams store duration 0, so every
        // downstream gate (drive attach/scrobble, track-end due,
        // now-playing duration field) rejects them like the TS.
        let duration_ms = crate::commands::lastfm::scrobbler::normalize_lastfm_duration_ms(
            start.is_stream,
            start.duration_ms,
        );
        self.lastfm_sessions.lock().await.insert(
            start.guild_id,
            LastFmSession {
                artist: start.artist.clone(),
                title: start.title.clone(),
                duration_ms,
                requester: start.requester,
                started_ms: start.now_ms,
                paused_ms: 0,
                pause_started_ms: None,
                voice_channel_id: start.voice_channel,
                track_key: track_key.clone(),
                listeners: HashMap::new(),
            },
        );
        // Live drive (mirrors handleTrackStart -> syncMembersWithVoiceChannel
        // -> attach + scheduleScrobble): no live ctx yet means track-only,
        // like before.
        if self.lastfm_live.lock().await.is_some() {
            let gid = start.guild_id;
            tokio::spawn(async move {
                manager().drive_lastfm_guild(gid, track_key).await;
            });
        }
    }

    /// Register the live LastFM driver ctx once (Http + pool + API
    /// keys + pre-derived row secret). Called from the first music
    /// command, which owns all four; mirrors the client + config the
    /// TS manager closes over.
    pub async fn register_lastfm_live(
        &self,
        cache: std::sync::Arc<serenity::Cache>,
        pool: crate::db::Pool,
        api_key: String,
        shared_secret: String,
        api_token: String,
    ) {
        let secret =
            crate::commands::lastfm::scrobbler::encryption_secret(&api_token, &shared_secret);
        *self.lastfm_live.lock().await = Some(LastfmLiveCtx {
            cache,
            pool,
            api_key,
            shared_secret,
            secret,
        });
    }

    /// PlayerUpdate pause leg (mirrors lavalink-client `playerUpdate` ->
    /// `lastFMScrobbler.handlePlayerUpdate`, including its
    /// `oldPlayerJson.paused === newPlayer.paused` no-op guard): only a
    /// real flag flip touches the scrobble clock. Live pause/resume
    /// commands and [`Self::rest_set_paused`] funnel through here so the
    /// clock cannot drift from the node state.
    pub async fn handle_player_update(&self, guild_id: u64, paused: bool, now_ms: i64) {
        let changed = {
            let mut players = self.players.lock().await;
            match players.get_mut(&guild_id) {
                Some(p) => {
                    if p.paused == paused {
                        false
                    } else {
                        p.paused = paused;
                        true
                    }
                }
                None => false,
            }
        };
        if changed {
            self.lastfm_note_paused(guild_id, paused, now_ms).await;
        }
    }

    /// Pause/unpause accounting (mirrors `handlePlayerUpdate`: pausing
    /// freezes every listener's elapsed clock, resuming banks the
    /// paused span and reschedules). No session yet means nothing to
    /// account (e.g. pause raced a queue drain).
    pub async fn lastfm_note_paused(&self, guild_id: u64, paused: bool, now_ms: i64) {
        let mut sessions = self.lastfm_sessions.lock().await;
        let Some(session) = sessions.get_mut(&guild_id) else {
            return;
        };
        if paused {
            if session.pause_started_ms.is_none() {
                session.pause_started_ms = Some(now_ms);
            }
        } else if let Some(started) = session.pause_started_ms.take() {
            session.paused_ms += (now_ms - started).max(0) as u64;
        }
    }

    /// Player voice move (mirrors `handlePlayerMove`: the session
    /// follows the player to the new channel). Listener re-sync
    /// against the channel's members stays with the live caller, like
    /// the rest of the member sync (per-user session keys live behind
    /// `LASTFM.<uid>` rows the manager cannot reach).
    pub async fn lastfm_player_move(&self, guild_id: u64, new_voice_channel: u64) {
        if let Some(session) = self.lastfm_sessions.lock().await.get_mut(&guild_id) {
            session.voice_channel_id = Some(new_voice_channel);
        }
    }

    /// Close the session at track end, returning the scrobble payload
    /// when the listen counts (mirrors `handleTrackEnd` +
    /// `tryScrobbleListener`; load-failed tracks are dropped by the
    /// caller before reaching here). Paused spans never count toward
    /// the threshold (mirrors `getElapsedListeningMs` subtracting
    /// `pausedDurationMs` + any ongoing pause). Un-credited listeners
    /// whose elapsed clears the threshold are POSTed here (mirrors
    /// the `finalize = true` leg) before the session is dropped.
    pub async fn lastfm_track_end_due(&self, guild_id: u64, now_ms: i64) -> Option<ScrobbleDue> {
        let session = self.lastfm_sessions.lock().await.remove(&guild_id)?;
        let paused = lastfm_paused_total(session.paused_ms, session.pause_started_ms, now_ms);
        let played_ms = lastfm_listener_elapsed(session.started_ms, paused, now_ms);
        if let Some(live) = self.lastfm_live.lock().await.clone() {
            if !live.api_key.is_empty() && !live.shared_secret.is_empty() {
                use crate::commands::lastfm::scrobbler as lf;
                for (uid, l) in session.listeners.iter() {
                    if l.scrobbled
                        || lastfm_listener_elapsed(l.started_ms, paused, now_ms) < l.threshold_ms
                    {
                        continue;
                    }
                    let track = lf::ScrobbleTrack {
                        artist: session.artist.clone(),
                        title: session.title.clone(),
                        album: None,
                        duration_ms: session.duration_ms,
                        started_sec: l.started_ms / 1000,
                    };
                    match lf::post_scrobble(
                        &live.api_key,
                        &live.shared_secret,
                        &l.session_key,
                        &track,
                    )
                    .await
                    {
                        Ok(()) => {}
                        Err(e) => {
                            if lf::is_invalid_session_error(e.code, &e.message) {
                                let _ = lf::invalidate_user_session(&live.pool, *uid).await;
                            } else {
                                tracing::warn!(
                                    "lastfm end-scrobble failed for {uid}: {}",
                                    e.message
                                );
                            }
                        }
                    }
                }
            }
        }
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
}

/// Track identity for staleness checks (mirrors `trackKey`).
fn lastfm_track_key(artist: &str, title: &str, started_ms: i64) -> String {
    format!("{artist}\0{title}\0{started_ms}")
}

/// Non-bot member ids of a voice channel. Mirrors the
/// `voiceChannel.members` scan in `syncMembersWithVoiceChannel` (TS
/// reads the cached guild voice states; same source here — there is
/// no list-voice-members REST endpoint).
/// Members without a resolved `member` are kept: they carry no row
/// downstream (`decrypted_user_session` finds nothing), so the
/// fail-open cannot POST.
fn lastfm_voice_members(cache: &serenity::Cache, guild_id: u64, channel_id: u64) -> Vec<u64> {
    let Some(guild) = cache.guild(serenity::GuildId::new(guild_id)) else {
        return Vec::new();
    };
    guild
        .voice_states
        .values()
        .filter(|vs| vs.channel_id.map(|c| c.get()) == Some(channel_id))
        .filter(|vs| vs.member.as_ref().map(|m| !m.user.bot).unwrap_or(true))
        .map(|vs| vs.user_id.get())
        .collect()
}

/// Total paused time at `now` (banked + ongoing leg). Mirrors the
/// pause half of `getElapsedListeningMs`.
fn lastfm_paused_total(paused_ms: u64, pause_started_ms: Option<i64>, now_ms: i64) -> u64 {
    paused_ms
        + pause_started_ms
            .map(|s| (now_ms - s).max(0) as u64)
            .unwrap_or(0)
}

/// Listener elapsed listening ms (mirrors `getElapsedListeningMs`).
fn lastfm_listener_elapsed(started_ms: i64, paused_total_ms: u64, now_ms: i64) -> u64 {
    (now_ms - started_ms).max(0) as u64 - paused_total_ms.min((now_ms - started_ms).max(0) as u64)
}

impl LavalinkManager {
    /// Live drive for one track generation (mirrors
    /// `syncMembersWithVoiceChannel` + `scheduleScrobble`): attach
    /// every voice member with an enabled LastFM row (now-playing
    /// POST), then sleep until the threshold and POST the scrobble
    /// for listeners still present in the same generation. A
    /// replaced-away track or a voice leave is handled by the
    /// generation / membership re-checks (mirrors `trackKey` +
    /// `isMemberInVoiceChannel`); the track-end finalize covers
    /// early ends.
    async fn drive_lastfm_guild(&self, guild_id: u64, track_key: String) {
        use crate::commands::lastfm::scrobbler as lf;
        let Some(live) = self.lastfm_live.lock().await.clone() else {
            return;
        };
        if live.api_key.is_empty() || live.shared_secret.is_empty() {
            return;
        }
        let snapshot = {
            let sessions = self.lastfm_sessions.lock().await;
            let Some(s) = sessions.get(&guild_id) else {
                return;
            };
            if s.track_key != track_key || !lf::should_scrobble(s.duration_ms) {
                return;
            }
            (s.voice_channel_id, s.duration_ms)
        };
        let Some(channel_id) = snapshot.0 else {
            return;
        };
        let members = lastfm_voice_members(&live.cache, guild_id, channel_id);
        let now = now_ms_wall();
        let threshold = lf::scrobble_threshold_ms(snapshot.1);
        for uid in members {
            self.lastfm_attach_member(&live, guild_id, &track_key, uid, now)
                .await;
        }
        let elapsed = (now_ms_wall() - now).max(0) as u64;
        if threshold > elapsed {
            tokio::time::sleep(std::time::Duration::from_millis(threshold - elapsed)).await;
        }
        self.lastfm_finalize_due(&live, guild_id, &track_key).await;
    }

    /// Attach one member as a listener (mirrors `attachMemberToSession`:
    /// enabled row -> now-playing POST -> insert + schedule). Returns
    /// false when there is nothing to schedule (no row, invalid
    /// session, or stale generation).
    async fn lastfm_attach_member(
        &self,
        live: &LastfmLiveCtx,
        guild_id: u64,
        track_key: &str,
        user_id: u64,
        now_ms: i64,
    ) -> bool {
        use crate::commands::lastfm::scrobbler as lf;
        let snapshot = {
            let sessions = self.lastfm_sessions.lock().await;
            let Some(s) = sessions.get(&guild_id) else {
                return false;
            };
            if s.track_key != track_key || !lf::should_scrobble(s.duration_ms) {
                return false;
            }
            if s.listeners.contains_key(&user_id) {
                return true;
            }
            (
                s.artist.clone(),
                s.title.clone(),
                s.duration_ms,
                lf::scrobble_threshold_ms(s.duration_ms),
            )
        };
        let Some((session_key, _username)) =
            lf::decrypted_user_session(&live.pool, user_id, &live.secret).await
        else {
            return false;
        };
        let track = lf::ScrobbleTrack {
            artist: snapshot.0,
            title: snapshot.1,
            album: None,
            duration_ms: snapshot.2,
            started_sec: now_ms / 1000,
        };
        match lf::post_now_playing(&live.api_key, &live.shared_secret, &session_key, &track).await {
            Ok(()) => {}
            Err(e) => {
                if lf::is_invalid_session_error(e.code, &e.message) {
                    let _ = lf::invalidate_user_session(&live.pool, user_id).await;
                } else {
                    tracing::warn!("lastfm now-playing failed for {user_id}: {}", e.message);
                }
                return false;
            }
        }
        let mut sessions = self.lastfm_sessions.lock().await;
        let Some(s) = sessions.get_mut(&guild_id) else {
            return false;
        };
        if s.track_key != track_key {
            return false;
        }
        s.listeners.insert(
            user_id,
            LastfmListener {
                session_key,
                username: String::new(),
                started_ms: now_ms,
                threshold_ms: snapshot.3,
                scrobbled: false,
            },
        );
        true
    }

    /// POST the scrobble for every un-credited listener of this
    /// generation whose elapsed listening clears its threshold
    /// (mirrors `tryScrobbleListener` with `finalize = false` after
    /// the timer, and `finalize = true` from trackEnd/detach: the
    /// elapsed check decides in both cases). Marks credited
    /// listeners; invalidates dead session rows.
    async fn lastfm_finalize_due(&self, live: &LastfmLiveCtx, guild_id: u64, track_key: &str) {
        use crate::commands::lastfm::scrobbler as lf;
        let now = now_ms_wall();
        let work: Vec<(u64, lf::ScrobbleTrack)> = {
            let sessions = self.lastfm_sessions.lock().await;
            let Some(s) = sessions.get(&guild_id) else {
                return;
            };
            if s.track_key != track_key {
                return;
            }
            let paused = lastfm_paused_total(s.paused_ms, s.pause_started_ms, now);
            s.listeners
                .iter()
                .filter(|(_, l)| {
                    !l.scrobbled
                        && lastfm_listener_elapsed(l.started_ms, paused, now) >= l.threshold_ms
                })
                .map(|(uid, l)| {
                    (
                        *uid,
                        lf::ScrobbleTrack {
                            artist: s.artist.clone(),
                            title: s.title.clone(),
                            album: None,
                            duration_ms: s.duration_ms,
                            started_sec: l.started_ms / 1000,
                        },
                    )
                })
                .collect()
        };
        // Re-check voice presence (mirrors `isMemberInVoiceChannel`
        // on the timer leg): leavers are finalized by the detach
        // path instead.
        let channel = self
            .lastfm_sessions
            .lock()
            .await
            .get(&guild_id)
            .and_then(|s| s.voice_channel_id);
        let present = match channel {
            Some(ch) => lastfm_voice_members(&live.cache, guild_id, ch),
            None => Vec::new(),
        };
        for (uid, track) in work {
            if !present.contains(&uid) {
                continue;
            }
            let key = self
                .lastfm_sessions
                .lock()
                .await
                .get(&guild_id)
                .and_then(|s| s.listeners.get(&uid).map(|l| l.session_key.clone()));
            let Some(key) = key else { continue };
            match lf::post_scrobble(&live.api_key, &live.shared_secret, &key, &track).await {
                Ok(()) => {
                    if let Some(s) = self.lastfm_sessions.lock().await.get_mut(&guild_id) {
                        if let Some(l) = s.listeners.get_mut(&uid) {
                            l.scrobbled = true;
                        }
                    }
                }
                Err(e) => {
                    if lf::is_invalid_session_error(e.code, &e.message) {
                        let _ = lf::invalidate_user_session(&live.pool, uid).await;
                    } else {
                        tracing::warn!("lastfm scrobble failed for {uid}: {}", e.message);
                    }
                }
            }
        }
    }

    /// Voice join on the tracked channel (mirrors the attach leg of
    /// `handleVoiceStateUpdate`).
    pub async fn lastfm_member_join(&self, guild_id: u64, user_id: u64) {
        let Some(live) = self.lastfm_live.lock().await.clone() else {
            return;
        };
        if live.api_key.is_empty() || live.shared_secret.is_empty() {
            return;
        }
        let key = self
            .lastfm_sessions
            .lock()
            .await
            .get(&guild_id)
            .map(|s| s.track_key.clone());
        if let Some(key) = key {
            self.lastfm_attach_member(&live, guild_id, &key, user_id, now_ms_wall())
                .await;
        }
    }

    /// Voice leave off the tracked channel (mirrors
    /// `detachMemberFromSession`: finalize-credit if due, then drop
    /// the listener).
    pub async fn lastfm_member_leave(&self, guild_id: u64, user_id: u64) {
        let live = self.lastfm_live.lock().await.clone();
        let now = now_ms_wall();
        let mut sessions = self.lastfm_sessions.lock().await;
        let Some(s) = sessions.get_mut(&guild_id) else {
            return;
        };
        let Some(l) = s.listeners.remove(&user_id) else {
            return;
        };
        let due = !l.scrobbled
            && lastfm_listener_elapsed(
                l.started_ms,
                lastfm_paused_total(s.paused_ms, s.pause_started_ms, now),
                now,
            ) >= l.threshold_ms;
        let track = crate::commands::lastfm::scrobbler::ScrobbleTrack {
            artist: s.artist.clone(),
            title: s.title.clone(),
            album: None,
            duration_ms: s.duration_ms,
            started_sec: l.started_ms / 1000,
        };
        drop(sessions);
        if due {
            if let Some(live) = live {
                if !live.api_key.is_empty() && !live.shared_secret.is_empty() {
                    use crate::commands::lastfm::scrobbler as lf;
                    match lf::post_scrobble(
                        &live.api_key,
                        &live.shared_secret,
                        &l.session_key,
                        &track,
                    )
                    .await
                    {
                        Ok(()) => {}
                        Err(e) => {
                            if lf::is_invalid_session_error(e.code, &e.message) {
                                let _ = lf::invalidate_user_session(&live.pool, user_id).await;
                            } else {
                                tracing::warn!(
                                    "lastfm leave-scrobble failed for {user_id}: {}",
                                    e.message
                                );
                            }
                        }
                    }
                }
            }
        }
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
        // Replaced ends the old listen without credit too: the node
        // swapped the track externally, so the previous track never
        // completed (the TS handleTrackEnd only exempts loadFailed, but
        // scrobbling a replaced-away track would credit an unplayed
        // listen; the new track opens a fresh session on trackStart).
        if let Ok(gid) = ev.guild_id.parse::<u64>() {
            match outcome {
                Some(AdvanceOutcome::Idle) => {
                    self.lastfm_queue_end(gid).await;
                }
                Some(_) => {
                    if matches!(
                        ev.reason,
                        TrackEndReason::LoadFailed | TrackEndReason::Replaced
                    ) {
                        self.lastfm_queue_end(gid).await;
                    } else {
                        self.lastfm_track_end_due(gid, now_ms).await;
                    }
                }
                None => {}
            }
        }
        self.dispatcher.lock().await.dispatch_track_end(ev).await;
    }

    // ---- trackError recovery (mirrors playerManager.ts trackError) ----

    /// Fallback identity for a failed track: the live current when
    /// present, else the event track (mirrors the TS `trackError`
    /// handler, which re-searches `y.track.info.title - author` — the
    /// event payload — rather than the queue state, so recovery still
    /// works when local state already drained). Pure for testability.
    pub fn exception_fallback_parts(
        current: Option<&QueuedTrack>,
        ev_title: &str,
        ev_author: &str,
    ) -> (String, String, Option<u64>) {
        match current {
            Some(t) => (t.title.clone(), t.author.clone(), Some(t.requester)),
            None => (ev_title.to_string(), ev_author.to_string(), None),
        }
    }

    /// Incoming WS TrackException: log the owner-visible diagnostics,
    /// try the TS fallback re-search branches, else keep the current
    /// track untouched when the exception matches no branch (the TS
    /// handler has no fallback for those and does nothing). A matched
    /// branch that misses (no live node/session, failed load, empty
    /// result) also keeps the current with no skip: the TS handler
    /// only acts on a non-empty fallback hit, so the player stalls on
    /// the errored track until the user skips.
    pub async fn handle_track_exception(
        &self,
        ev: TrackExceptionEvent,
        _now_ms: i64,
    ) -> ErrorRecovery {
        let gid = match ev.guild_id.parse::<u64>() {
            Ok(g) => g,
            Err(_) => return ErrorRecovery::NoPlayer,
        };
        let snap = self.snapshot(gid).await;
        let had_current = snap.as_ref().and_then(|s| s.current.clone()).is_some();
        let (failed_title, failed_author, failed_requester) = Self::exception_fallback_parts(
            snap.as_ref().and_then(|s| s.current.as_ref()),
            &ev.track.info.title,
            &ev.track.info.author,
        );
        let report = Self::track_error_report(
            &ev,
            failed_requester,
            self.node_for_guild_hint(&ev.guild_id).await.as_deref(),
        );
        tracing::error!("lavalink trackError: {report}");
        if let Some(source) = fallback_source_for(&ev.exception.message) {
            let query = fallback_identifier(source, &failed_title, &failed_author);
            if let Ok((node, session)) = self.live_node_and_session(gid).await {
                match self.rest_load(&node, &query).await {
                    Ok(loaded) => {
                        let (tracks, _) = split_loaded(loaded);
                        if !tracks.is_empty() {
                            // Append behind current, never preempt it
                            // (mirrors `player.queue.add(...)`): the hit
                            // only becomes current when the player is
                            // idle, and then playback restarts on it.
                            // Playlist hits propagate every track.
                            let requester = failed_requester.unwrap_or(0);
                            let title = tracks[0].info.title.clone();
                            let encoded = tracks[0].encoded.clone();
                            let was_idle = self
                                .with_player(gid, |p| {
                                    let idle = p.current.is_none();
                                    if idle {
                                        let mut hits = tracks.into_iter();
                                        if let Some(first) = hits.next() {
                                            p.current =
                                                Some(QueuedTrack::from((&first, requester)));
                                        }
                                        for t in hits {
                                            p.queue.push_back(QueuedTrack::from((&t, requester)));
                                        }
                                        p.idle_since_ms = None;
                                    } else {
                                        for t in tracks {
                                            p.queue.push_back(QueuedTrack::from((&t, requester)));
                                        }
                                    }
                                    idle
                                })
                                .await;
                            if was_idle {
                                // Re-ensure voice before restarting
                                // playback (mirrors the TS
                                // `if (!player.connected) await
                                // player.connect()` on the hit leg):
                                // re-emit the OP4 join, then re-push
                                // the cached Discord handshake.
                                let _ = self.ensure_voice_connected(gid).await;
                                if let Some(voice) = self.take_pending_voice(gid).await {
                                    let _ = self.rest_set_voice(&node, &session, gid, voice).await;
                                }
                                let _ = self.rest_play(&node, &session, gid, &encoded, false).await;
                            }
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
            // Fallback-branch miss (no live node/session, failed load,
            // or empty result): keep the failed current, no skip. The
            // TS handler only acts on a non-empty fallback hit and
            // otherwise does nothing, so the player stalls on the
            // errored track until the user skips.
            self.dispatcher
                .lock()
                .await
                .dispatch_track_exception(ev)
                .await;
            return if had_current {
                ErrorRecovery::Kept
            } else {
                ErrorRecovery::NoPlayer
            };
        }
        // Unmatched exception: no-op, current is kept (mirrors the TS
        // handler falling through both message branches).
        self.dispatcher
            .lock()
            .await
            .dispatch_track_exception(ev)
            .await;
        if had_current {
            ErrorRecovery::Kept
        } else {
            ErrorRecovery::NoPlayer
        }
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
    /// secure of the guild-affine node, plus the live `stats` op load
    /// and `playerUpdate` ping when the feed has seen them — mirrors
    /// the TS `## Node about` block: connected/host/port/SSL/ping).
    /// Never fails.
    async fn node_for_guild_hint(&self, guild_id: &str) -> Option<String> {
        let gid = guild_id.parse::<u64>().ok()?;
        let node = self.node_for(gid).await?;
        let connected = node.session().await.is_some();
        let mut hint = format!(
            "{} {}:{} secure={} connected={}",
            node.id,
            node.lava_cfg.host,
            node.lava_cfg.port,
            if node.secure { "yes" } else { "no" },
            if connected { "yes" } else { "no" },
        );
        if let Some(stats) = node.stats.lock().await.clone() {
            hint += &format!(
                " players={}/{} cpu={:.1}% mem={}MB",
                stats.playing_players,
                stats.players,
                stats.cpu.system_load * 100.0,
                stats.memory.used / 1024 / 1024,
            );
        }
        if let Some(ping) = *node.player_ping_ms.lock().await {
            hint += &format!(" ping={ping}ms");
        }
        Some(hint)
    }

    /// Record a `stats` op payload on the node entry (feeds the
    /// track-error node hint; mirrors the TS node-about fields).
    pub async fn note_node_stats(&self, node_id: &str, stats: NodeStats) {
        let nodes = self.nodes.read().await;
        if let Some(n) = nodes.iter().find(|n| n.id == node_id) {
            *n.stats.lock().await = Some(stats);
        }
    }

    /// Record a `playerUpdate.state.ping` sample on the node entry.
    pub async fn note_node_ping(&self, node_id: &str, ping_ms: i64) {
        let nodes = self.nodes.read().await;
        if let Some(n) = nodes.iter().find(|n| n.id == node_id) {
            *n.player_ping_ms.lock().await = Some(ping_ms);
        }
    }

    /// Handle one decoded `playerUpdate` frame: node ping goes to the
    /// entry for diagnostics. Pause accounting intentionally does NOT
    /// ride here — the node frame carries no paused flag (only
    /// time/position/connected/ping); flips flow through
    /// [`Self::handle_player_update`] (fed by [`Self::rest_set_paused`]
    /// on every live pause/resume, mirroring lavalink-client's
    /// `playerUpdate` -> `handlePlayerUpdate` leg).
    pub async fn handle_node_player_update(&self, node_id: &str, payload: &PlayerUpdatePayload) {
        self.note_node_ping(node_id, payload.state.ping).await;
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
        let combined = entry.combined();
        drop(pending);
        // Player voice resync (mirrors `handlePlayerMove`: the session
        // follows the player to the new channel). This hook only ever
        // sees the bot's own updates (events_handler filters on the
        // bot user id), so the channel is authoritative for the
        // player. No entry is created for guilds without one.
        {
            let mut players = self.players.lock().await;
            if let Some(p) = players.get_mut(&guild_id) {
                p.voice_channel = channel_id;
            }
        }
        if let Some(ch) = channel_id {
            self.lastfm_player_move(guild_id, ch).await;
        }
        combined
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

    /// Drop the cached Discord voice handshake for a guild. Mirrors the
    /// h247VoiceSessions.delete leg of deleteH247Data in
    /// src/core/modules/h247Manager.ts: after a voluntary /h247 leave
    /// no stale token/endpoint/session may survive to feed a future
    /// player handshake.
    pub async fn drop_pending_voice(&self, guild_id: u64) {
        self.pending_voice.lock().await.remove(&guild_id);
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
    /// `playerUpdate` records the node ping for diagnostics (pause
    /// accounting rides on [`Self::handle_player_update`], fed by
    /// [`Self::rest_set_paused`] — node frames carry no paused flag);
    /// `stats` records the node load for the track-error report;
    /// track start/end reuse the state handlers + dispatcher fan-out;
    /// exception runs the bot.rs trackError wrapper when report deps
    /// are registered (else the offline recovery); stuck runs the
    /// trackError recovery (fallback re-search, then requeue, else
    /// skip) with the owner-visible log leg.
    /// Closed frames are ignored.
    pub async fn feed_node_ws(&self, node_id: &str, text: &str, now_ms: i64) -> FedWs {
        if let Some(ready) = ReadyPayload::parse(text) {
            self.set_session(node_id, ready.session_id.clone()).await;
            return FedWs::Session(ready.session_id);
        }
        match LavalinkEvent::parse(text) {
            Some(LavalinkEvent::PlayerUpdate(pu)) => {
                self.handle_node_player_update(node_id, &pu).await;
                FedWs::PlayerUpdated
            }
            Some(LavalinkEvent::Stats(stats)) => {
                self.note_node_stats(node_id, stats).await;
                FedWs::StatsUpdated
            }
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

    /// Shard messenger serving `guild_id` (mirrors the sendToShard
    /// routing in playerManager.ts). None when no messenger is
    /// registered (yet).
    async fn shard_messenger_for(&self, guild_id: u64) -> Option<serenity::ShardMessenger> {
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
    }

    /// Ensure the bot is voice-connected before a fresh start (mirrors
    /// `if (!player.connected) await player.connect()` in musicPlay.ts
    /// and on the trackError hit legs): re-emit the OP4 join for the
    /// stored voice channel unless the noted Discord handshake already
    /// targets it. True when the join is (re)sent or already in place;
    /// false when there is no voice channel or no shard messenger yet —
    /// callers must fail loudly instead of playing to nobody.
    pub async fn ensure_voice_connected(&self, guild_id: u64) -> bool {
        let channel = self.snapshot(guild_id).await.and_then(|s| s.voice_channel);
        let Some(ch) = channel else {
            return false;
        };
        let already = self
            .take_pending_voice(guild_id)
            .await
            .and_then(|v| v.channel_id.parse::<u64>().ok())
            == Some(ch);
        if already {
            return true;
        }
        match self.shard_messenger_for(guild_id).await {
            Some(m) => {
                Self::send_voice_state(&m, guild_id, Some(ch));
                true
            }
            None => false,
        }
    }

    /// OP4 leave on the shard serving `guild_id` (mirrors the
    /// sendToShard leave in the TS destroy path). False when no
    /// messenger is registered (yet) — the REST destroy + status clear
    /// still run; multi-shard fan-out per shard messenger is next.
    pub async fn leave_voice(&self, guild_id: u64) -> bool {
        match self.shard_messenger_for(guild_id).await {
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
    /// Battery: scratch/slice-w7s59-lavalinkclient.cjs (C) replicates
    /// the commented TS body verbatim. TWO DEAD-CODE DELTAS (both
    /// sides never run: the TS body is commented out, this arm sits
    /// behind `MUSIC_EMPTY_STOP_ENABLED = false`): TS fires on
    /// `members.size === 1` exactly (a 0-occupant stale row stays
    /// silent) while `<= 1` also stops on 0; TS only needs the player
    /// to exist while this also needs `current` (an idle player stays
    /// silent here, TS would stopPlaying + notify). Kept as-is: the
    /// disabled mirror stays one flag away, and `<= 1` + current is
    /// the safer re-enable shape.
    pub fn should_leave_when_alone(player: &GuildPlayer, occupants: usize) -> bool {
        player.current.is_some() && occupants <= 1
    }

    /// Attachment name for the rendered card. Mirrors
    /// `music_banner.png` in playerManager.ts.
    const MUSIC_BANNER_ATTACHMENT_NAME: &str = "music_banner.png";

    /// Track-start embed (mirrors the trackStart send in
    /// playerManager.ts). `image_url` is `attachment://music_banner.png`
    /// when the gateway card rendered, else the node artwork (fallback
    /// when no gateway is configured). Pure and offline-testable;
    /// `lang_code` falls back to the embedded English template when the
    /// key is missing.
    pub fn track_start_embed(
        lang_code: &str,
        title: &str,
        author: &str,
        uri: Option<&str>,
        image_url: Option<&str>,
        voice_channel_id: u64,
        music_icon: &str,
    ) -> serenity::CreateEmbed {
        let desc = crate::lang::get(lang_code, "event_mp_playerStart")
            .unwrap_or_else(|| {
                "${client.iHorizon_Emojis.Music_Icon} - Now playing [`${track.title}`](${url}) in **${queue.channel.name}**..."
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
        if let Some(url) = image_url.filter(|u| !u.is_empty()) {
            embed = embed.image(url);
        }
        embed
    }

    /// 1/3 roll gate for the LastFM tip embed (mirrors
    /// `Math.random() < 1 / 3`). Pure so tests don't roll dice.
    pub fn lastfm_tip_due(roll: f64) -> bool {
        roll < 1.0 / 3.0
    }

    /// LastFM tip embed (mirrors the `even_mp_playerStart_tip` leg
    /// sent ahead of the main trackStart embed when the requester has
    /// no LastFM row).
    pub fn lastfm_tip_embed(lang_code: &str, logo: &str, glasses: &str) -> serenity::CreateEmbed {
        let desc = crate::lang::get(lang_code, "even_mp_playerStart_tip")
            .unwrap_or_else(|| {
                "> ${client.iHorizon_Emojis.LastFM_Logo} Did you know that you can scrobble your music with `/lastfm` on iHorizon? ${client.iHorizon_Emojis.Sunglass}".to_string()
            })
            .replace("${client.iHorizon_Emojis.LastFM_Logo}", logo)
            .replace("${client.iHorizon_Emojis.Sunglass}", glasses);
        serenity::CreateEmbed::default()
            .colour(0xBA0000)
            .description(desc)
    }

    /// One guild channel projected for announce fallback ordering
    /// ([`AnnounceChannel`]); `parent_id` is the category for the
    /// same-category leg.
    ///
    /// Announce channel order (mirrors the TS trackStart fallback
    /// chain): stored text channel, then the voice channel itself when
    /// it takes text (text-in-voice, no perm check in TS either), then
    /// same-category text channels, then any guild text channel. Pure
    /// so the chain stays unit-testable; the live leg try-sends in
    /// this order and treats a failed send (including missing
    /// SendMessages) as "try the next", which reproduces the outcome
    /// of the TS `permissionsFor(...).has("SendMessages")` gates
    /// without a guild cache on this path.
    pub fn announce_channel_order(
        stored: Option<u64>,
        voice: Option<u64>,
        channels: &[AnnounceChannel],
    ) -> Vec<u64> {
        fn textable(kind: serenity::ChannelType) -> bool {
            matches!(
                kind,
                serenity::ChannelType::Text
                    | serenity::ChannelType::News
                    | serenity::ChannelType::Voice
            )
        }
        let mut order: Vec<u64> = Vec::new();
        let mut push = |id: u64| {
            if !order.contains(&id) {
                order.push(id);
            }
        };
        if let Some(id) = stored {
            push(id);
        }
        let voice_parent = voice.and_then(|v| {
            channels
                .iter()
                .find(|c| c.id == v)
                .and_then(|c| c.parent_id)
        });
        if let Some(v) = voice {
            if channels.iter().any(|c| c.id == v && textable(c.kind)) {
                push(v);
            }
        }
        if let Some(parent) = voice_parent {
            for c in channels {
                if c.parent_id == Some(parent) && textable(c.kind) {
                    push(c.id);
                }
            }
        }
        for c in channels {
            if textable(c.kind) {
                push(c.id);
            }
        }
        order
    }

    /// Post the trackStart announce for the current track (mirrors the
    /// trackStart handler in playerManager.ts):
    ///
    ///   - TTS early-return while the guild is TTS-suppressed;
    ///   - guild language for both embeds (mirrors `getLanguageData`;
    ///     `en-US` until a music command registers the pool);
    ///   - LastFM tip embed ahead of the main one on a 1/3 roll when
    ///     the requester has no `LASTFM.<uid>` row;
    ///   - channel fallback chain (stored text channel, voice channel
    ///     itself, same-category text, any guild text);
    ///   - silent destroy when nowhere can take the announce;
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
        let pool = self.announce_pool.lock().await.clone();
        let lang_code = match &pool {
            Some(p) => crate::db::guild_lang(p, Some(guild_id)).await,
            None => "en-US".to_string(),
        };
        let icon = crate::emojis::app_emoji_markup(http, "Music_Icon")
            .await
            .unwrap_or_else(|| "🎵".to_string());
        // Track-start card (mirrors the musicBanner html2png leg, kit
        // in commands::music::nowplaying): gateway render first, node
        // artwork when no gateway/failure.
        use crate::commands::music::nowplaying as np;
        let banner = match (crate::config::gateway_base(), crate::config::api_token()) {
            (Some(base), token) => {
                let html = np::music_banner_card_html(
                    &cur.title,
                    &cur.author,
                    np::banner_artwork_or_fallback(cur.artwork.as_deref()),
                );
                np::render_music_banner_png(&base, token.as_deref().unwrap_or(""), &html).await
            }
            _ => None,
        };
        let image_url;
        let attachment: Option<serenity::CreateAttachment> = match banner {
            Some(png) => {
                image_url = format!("attachment://{}", Self::MUSIC_BANNER_ATTACHMENT_NAME);
                Some(serenity::CreateAttachment::bytes(
                    png,
                    Self::MUSIC_BANNER_ATTACHMENT_NAME,
                ))
            }
            None => {
                image_url = cur.artwork.clone().unwrap_or_default();
                None
            }
        };
        let main = Self::track_start_embed(
            &lang_code,
            &cur.title,
            &cur.author,
            cur.uri.as_deref(),
            if image_url.is_empty() {
                None
            } else {
                Some(&image_url)
            },
            s.voice_channel.unwrap_or(0),
            &icon,
        );
        let mut embeds = vec![main];
        // LastFM tip leg (mirrors `Math.random() < 1 / 3 &&
        // !isLastFmConfig`): the tip embed goes first.
        if Self::lastfm_tip_due(rand::random::<f64>()) {
            if let Some(p) = &pool {
                let row = crate::commands::lastfm::lastfm_username(p, cur.requester).await;
                if row.is_none() {
                    let logo = crate::emojis::app_emoji_markup(http, "LastFM_Logo")
                        .await
                        .unwrap_or_else(|| "🎶".to_string());
                    let glasses = crate::emojis::app_emoji_markup(http, "Sunglass")
                        .await
                        .unwrap_or_else(|| "😎".to_string());
                    embeds.insert(0, Self::lastfm_tip_embed(&lang_code, &logo, &glasses));
                }
            }
        }
        if let Some(vc) = s.voice_channel {
            let _ = Self::set_voice_status(http, vc, &Self::nowplaying_text(cur)).await;
        }
        // Channel fallback chain (mirrors the TS deleted-channel
        // fallback): try-sends in fallback order, remembering the
        // winner like `player.textChannelId = fallback.id`.
        let mut order = vec![];
        if let Some(ch) = s.text_channel {
            order.push(ch);
        }
        if let Ok(channels) = http.get_channels(serenity::GuildId::new(guild_id)).await {
            let listed: Vec<AnnounceChannel> = channels
                .iter()
                .map(|c| AnnounceChannel {
                    id: c.id.get(),
                    kind: c.kind,
                    parent_id: c.parent_id.map(|p| p.get()),
                })
                .collect();
            for id in Self::announce_channel_order(None, s.voice_channel, &listed) {
                if !order.contains(&id) {
                    order.push(id);
                }
            }
        }
        for id in order {
            let mut msg = serenity::CreateMessage::new().embeds(embeds.clone());
            if let Some(file) = &attachment {
                msg = msg.add_file(file.clone());
            }
            if serenity::ChannelId::new(id)
                .send_message(http, msg)
                .await
                .is_ok()
            {
                self.with_player(guild_id, |p| {
                    p.text_channel = Some(id);
                })
                .await;
                return;
            }
        }
        // Nowhere to send — destroy the player silently (mirrors the
        // TS `player.destroy()` with no fallback channel).
        let _ = self.remove_player(guild_id).await;
        if let Ok((node, session)) = self.live_node_and_session(guild_id).await {
            let _ = self.rest_destroy(&node, &session, guild_id).await;
        }
        let _ = self.leave_voice(guild_id).await;
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
    /// Already-prefixed queries (`ytsearch:…`, …) carry a `source:`
    /// prefix and pass through instead of stacking a second one.
    pub fn search_identifier(query: &str) -> String {
        let q = crate::funcs::js_trim(query);
        if has_search_prefix(q) {
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

    /// PATCH a player endpoint and accept any 2xx body. Lavalink minor
    /// versions drift the player object shape (e.g. 4.2.x returns
    /// `voice.channelId: null` before the voice handshake, which the
    /// strict lava-rs `RestPlayer` model rejects with a decode error);
    /// none of our callers read the response body, so decoding it
    /// strictly only turned server-side shape drift into user-facing
    /// "problem with the song queue" failures (TS lavalink-client
    /// ignores unknown/absent fields the same way).
    async fn rest_patch_ok(
        &self,
        node: &NodeEntry,
        endpoint: &str,
        payload: &UpdatePlayerPayload,
    ) -> Result<(), MusicError> {
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
        Ok(())
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
    ) -> Result<(), MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace={no_replace}");
        let payload = UpdatePlayerPayload {
            encoded_track: Some(encoded.to_string()),
            ..Default::default()
        };
        self.rest_patch_ok(node, &endpoint, &payload).await
    }

    pub async fn rest_set_paused(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
        paused: bool,
    ) -> Result<(), MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace=false");
        let payload = UpdatePlayerPayload {
            paused: Some(paused),
            ..Default::default()
        };
        let out = self.rest_patch_ok(node, &endpoint, &payload).await;
        // Forward the flip to the scrobble clock (mirrors the
        // lavalink-client `playerUpdate` -> `handlePlayerUpdate` leg;
        // the change guard inside makes the pre-set commands idempotent).
        self.handle_player_update(guild_id, paused, now_ms_wall())
            .await;
        out
    }

    pub async fn rest_set_volume(
        &self,
        node: &NodeEntry,
        session: &str,
        guild_id: u64,
        volume: u8,
    ) -> Result<(), MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace=false");
        let payload = UpdatePlayerPayload {
            volume: Some(volume),
            ..Default::default()
        };
        self.rest_patch_ok(node, &endpoint, &payload).await
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
    ) -> Result<(), MusicError> {
        let endpoint = format!("/v4/sessions/{session}/players/{guild_id}?noReplace=false");
        let payload = UpdatePlayerPayload {
            voice: Some(voice),
            ..Default::default()
        };
        self.rest_patch_ok(node, &endpoint, &payload).await
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
    /// H24/7-parked guilds are never swept here (their idle destroy
    /// keeps voice via the no-disconnect path); pass their ids through
    /// [`Self::sweep_idle_destroy_skipping`].
    pub async fn sweep_idle_destroy(&self, now_ms: i64) -> Vec<IdleDestroyTarget> {
        self.sweep_idle_destroy_skipping(&HashSet::new(), now_ms)
            .await
    }

    /// [`Self::sweep_idle_destroy`] skipping H24/7-parked guilds
    /// (mirrors `handleH247PlayerIdleDestroy`, which destroys parked
    /// players with `disconnect = false` so the bot never visibly
    /// leaves its H24/7 channel: the parked destroy keeps voice and
    /// must not go through the OP4-leave + status-clear path below).
    /// Parked guilds still get the node-side destroy (REST DELETE),
    /// but their local state is kept and they are excluded from the
    /// returned targets (no OP4-leave, no state drop). The idle clock
    /// re-arms so the destroy does not repeat on every sweep tick.
    pub async fn sweep_idle_destroy_skipping(
        &self,
        parked_guilds: &HashSet<u64>,
        now_ms: i64,
    ) -> Vec<IdleDestroyTarget> {
        let due = self.destroy_due_guilds(now_ms).await;
        let mut done = Vec::with_capacity(due.len());
        for t in due {
            if parked_guilds.contains(&t.guild_id) {
                if let Ok((node, session)) = self.live_node_and_session(t.guild_id).await {
                    let _ = self.rest_destroy(&node, &session, t.guild_id).await;
                }
                {
                    let mut players = self.players.lock().await;
                    if let Some(p) = players.get_mut(&t.guild_id) {
                        p.idle_since_ms = Some(now_ms);
                    }
                }
                continue;
            }
            if let Ok((node, session)) = self.live_node_and_session(t.guild_id).await {
                let _ = self.rest_destroy(&node, &session, t.guild_id).await;
            }
            self.players.lock().await.remove(&t.guild_id);
            done.push(t);
        }
        done
    }

    // ---- H24/7 player legs (mirrors h247Manager.ts event handlers) ----

    /// Create leg (mirrors `handleH247PlayerCreated`, which replays the
    /// cached voice handshake on `playerCreate`): hand back the cached
    /// Discord voice state for the guild, if any, so the caller can
    /// push it to the (re)created node player via
    /// [`Self::push_voice_state`]. None means no parked session.
    pub async fn h247_on_player_created(&self, guild_id: u64) -> Option<VoiceState> {
        self.take_pending_voice(guild_id).await
    }

    /// Destroy leg (mirrors `handleH247PlayerDestroyed`, which rejoins
    /// the parked channel after a `playerDestroy`): true when the
    /// caller must restore the voice presence (H24/7 enabled with a
    /// parked channel). The Discord-side rejoin itself stays
    /// caller-side; this is the pure rejoin decision.
    pub fn h247_rejoin_after_destroy(enabled: bool, parked_voice: Option<u64>) -> bool {
        enabled && parked_voice.is_some()
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

    /// Load one identifier on one pinned node. The loads are
    /// sessionless (`/v4/loadtracks`), so pinning only fixes which
    /// node answers — the multi-query batch and the per-node failover
    /// both build on this.
    async fn load_on_node(
        &self,
        node: &NodeEntry,
        identifier: &str,
    ) -> Result<LoadResult, MusicError> {
        self.rest_load(node, identifier).await
    }

    /// Direct URL load split into (tracks, is_playlist) on one node;
    /// transport/REST failures and empty/error loads are empty (the
    /// caller falls through to the next leg or no-matches).
    async fn load_url_tracks_on(&self, node: &NodeEntry, url: &str) -> (Vec<Track>, bool) {
        match self.load_on_node(node, url).await {
            Ok(loaded) => split_loaded(loaded),
            Err(_) => (vec![], false),
        }
    }

    /// First-hit track for one `artist title` deezer query on the
    /// pinned node (None on miss or transport failure: the per-track
    /// catch, mirroring the TS `catch { return undefined }`).
    async fn deezer_first_hit_on(
        &self,
        node: &NodeEntry,
        artist: &str,
        title: &str,
    ) -> Option<Track> {
        let identifier = spotify_track_query(Some(artist), title);
        match self.load_on_node(node, &identifier).await {
            Ok(loaded) => split_loaded(loaded).0.into_iter().next(),
            Err(_) => None,
        }
    }

    /// First-hit track for one Apple/Tidal/Amazon `title - artist` deezer
    /// query on the pinned node (same miss/transport-None shape as
    /// [`Self::deezer_first_hit_on`]; the identifier is the reversed
    /// [`platform_song_query`], not the Spotify order).
    async fn platform_first_hit_on(
        &self,
        node: &NodeEntry,
        artist: &str,
        title: &str,
    ) -> Option<Track> {
        let identifier = platform_song_query(Some(artist), title);
        match self.load_on_node(node, &identifier).await {
            Ok(loaded) => split_loaded(loaded).0.into_iter().next(),
            Err(_) => None,
        }
    }

    /// Concurrent deezer fan-out for album/playlist metadata (mirrors
    /// the TS `Promise.all(tracks.map(...))` with its per-track
    /// try/catch): one in-flight load per `(artist, title)` pair,
    /// failures drop that track, survivors keep input order.
    async fn deezer_fan_out_queries(
        &self,
        node: &NodeEntry,
        queries: &[(String, String)],
    ) -> Vec<Track> {
        if queries.is_empty() {
            return vec![];
        }
        let http = self.http.clone();
        let base = node.base_url();
        let password = node.lava_cfg.password.clone();
        let mut set = tokio::task::JoinSet::new();
        for (idx, (artist, title)) in queries.iter().enumerate().take(PLAYLIST_FANOUT_CAP) {
            let http = http.clone();
            let base = base.clone();
            let password = password.clone();
            let identifier = spotify_track_query(Some(artist.as_str()), title);
            set.spawn(async move {
                let hit = load_first_hit(&http, &base, &password, &identifier).await;
                (idx, hit)
            });
        }
        let mut ordered: Vec<(usize, Track)> = Vec::new();
        while let Some(res) = set.join_next().await {
            // Per-track catch: transport/parse/join failures drop the track.
            if let Ok((idx, Some(hit))) = res {
                ordered.push((idx, hit));
            }
        }
        ordered.sort_by_key(|(idx, _)| *idx);
        mask_tracks(ordered.into_iter().map(|(_, t)| t).collect())
    }

    /// Concurrent deezer fan-out for Apple/Tidal/Amazon album/playlist
    /// metadata (same `Promise.all` + per-track-catch + order-restore +
    /// cap shape as [`Self::deezer_fan_out_queries`]; each identifier is
    /// the title-first [`platform_album_track_query`], not Spotify order).
    async fn platform_fan_out_queries(
        &self,
        node: &NodeEntry,
        queries: &[(String, String)],
    ) -> Vec<Track> {
        if queries.is_empty() {
            return vec![];
        }
        let http = self.http.clone();
        let base = node.base_url();
        let password = node.lava_cfg.password.clone();
        let mut set = tokio::task::JoinSet::new();
        for (idx, (artist, title)) in queries.iter().enumerate().take(PLAYLIST_FANOUT_CAP) {
            let http = http.clone();
            let base = base.clone();
            let password = password.clone();
            let identifier = platform_album_track_query(Some(artist.as_str()), title);
            set.spawn(async move {
                let hit = load_first_hit(&http, &base, &password, &identifier).await;
                (idx, hit)
            });
        }
        let mut ordered: Vec<(usize, Track)> = Vec::new();
        while let Some(res) = set.join_next().await {
            // Per-track catch: transport/parse/join failures drop the track.
            if let Ok((idx, Some(hit))) = res {
                ordered.push((idx, hit));
            }
        }
        ordered.sort_by_key(|(idx, _)| *idx);
        mask_tracks(ordered.into_iter().map(|(_, t)| t).collect())
    }

    /// Bare-text search with the deezer-vs-soundcloud legs (mirrors the
    /// non-URL tail of `searchQueryOnNode`, musicPlay.ts:655-701).
    /// Single-hit results only (TS enqueues `res.tracks[0]` for
    /// non-playlists). Node battery (W6 slice 157, stubbed `node.search`
    /// plus `isSimilar`):
    ///
    /// ```text
    /// dz-hit-similar             => [dz] serve dz, no sc call
    /// dz-miss + sc1-hit-similar  => [dz, sc1] serve sc1, no sc2 call
    /// dz-hit-dissimilar + sc2-hit   => [dz, sc2] serve sc2 verbatim
    /// dz-hit-dissimilar + sc2-empty => [dz, sc2] ABANDON (empty res fails
    ///    the searchMusicQuery accept gate, failover continues)
    /// dz-hit-dissimilar + sc2-throw => ABANDON
    /// dz-miss + sc1-miss         => [dz, sc1] ABANDON
    /// dz-miss + sc1-throw        => ABANDON
    /// dz-throw                   => ABANDON, no same-node sc call
    /// ```
    /// Divergences fixed here (all in this tail; the URL branch already
    /// mirrors its shape). First, a dissimilar-dz plus bad-sc2 leg served
    /// deezer while TS abandons the node. Second, a dz throw fell through
    /// to same-node sc while TS abandons the node outright (`catch ->
    /// undefined`: the sc fallback only runs when dz RESOLVED with no
    /// hit). Third, dz-miss plus sc1-hit returned sc1 while TS falls
    /// through to the dissimilarity gate (a dissimilar sc1 is discarded
    /// for a second soundcloud search). Fourth, the deezer-vs-soundcloud
    /// score pick ran here, but the bare tail has NO pick (`return res`
    /// verbatim — the strict-`>` pick is URL-branch-only, kept in
    /// `search_url_tracks_on`): a dissimilar dz-hit plus sc2-hit serves
    /// sc2 even when dz scores higher.
    pub async fn search_text_tracks(
        &self,
        guild_id: u64,
        query: &str,
    ) -> Result<Vec<Track>, MusicError> {
        for node in self.nodes_in_failover_order(guild_id).await {
            match self.search_text_tracks_on(&node, query).await {
                Ok(tracks) if response_exists(&tracks) => return Ok(tracks),
                _ => continue,
            }
        }
        Err(MusicError::NoMatches)
    }

    /// [`Self::search_text_tracks`] on one pinned node. An abandoned
    /// node is `Err(NoMatches)`: both callers treat it exactly like the
    /// TS `searchMusicQuery` accept gate failing (`res?.tracks.length
    /// && length > 0` false on the undefined/empty `res`) and fail over
    /// to the next node.
    async fn search_text_tracks_on(
        &self,
        node: &NodeEntry,
        query: &str,
    ) -> Result<Vec<Track>, MusicError> {
        // Deezer leg: a throw abandons the node outright (TS `catch ->
        // undefined` covers the whole try, so the sc fallback below only
        // runs when dz RESOLVED with no hit — never after a throw).
        let deezer = match self.load_on_node(node, &format!("dzsearch:{query}")).await {
            Ok(loaded) => split_loaded(loaded).0,
            Err(_) => return Err(MusicError::NoMatches),
        };
        // First fallback (dz resolved-miss): a throw abandons the node,
        // a miss abandons it too (TS `res = undefined`). A HIT does not
        // return yet — TS falls through into the dissimilarity gate
        // below with `res = sc1` (a dissimilar sc1 hit is discarded for
        // a second soundcloud search, not served).
        let mut res = if response_exists(&deezer) {
            deezer
        } else {
            let sc = match self.load_on_node(node, &format!("scsearch:{query}")).await {
                Ok(loaded) => split_loaded(loaded).0,
                Err(_) => return Err(MusicError::NoMatches),
            };
            if !response_exists(&sc) {
                return Err(MusicError::NoMatches);
            }
            sc
        };
        // `res` carries a titled first track here on every path, which
        // is exactly the TS `res?.tracks[0] &&` leg.
        if !is_similar(query, &res[0].info.title, &res[0].info.author) {
            // Dissimilarity re-search: served VERBATIM — no exist check
            // and no score pick (the strict-`>` pick is URL-branch-only).
            // An empty leg fails the caller accept gate (node abandoned,
            // same as the TS empty `res`); a throw abandons it directly.
            res = match self.load_on_node(node, &format!("scsearch:{query}")).await {
                Ok(loaded) => split_loaded(loaded).0,
                Err(_) => return Err(MusicError::NoMatches),
            };
            if !response_exists(&res) {
                return Err(MusicError::NoMatches);
            }
        }
        Ok(res)
    }

    /// Generic-URL search with the deezer-then-soundcloud legs (mirrors
    /// the `isUrlQuery` branch of `searchQueryOnNode`). lavalink-client
    /// sends the raw URL for `http(s)` queries whatever the source, so
    /// both legs are direct URL loads resolved server-side; the
    /// deezer-vs-soundcloud proximity pick is kept structurally.
    async fn search_url_tracks_on(
        &self,
        node: &NodeEntry,
        url: &str,
    ) -> Result<(Vec<Track>, bool), MusicError> {
        let (deezer, deezer_playlist) = self.load_url_tracks_on(node, url).await;
        if !response_exists(&deezer) {
            let (sc, sc_playlist) = self.load_url_tracks_on(node, url).await;
            if response_exists(&sc) {
                return Ok((sc, sc_playlist));
            }
            return Err(MusicError::NoMatches);
        }
        let first = &deezer[0];
        if is_similar(url, &first.info.title, &first.info.author) {
            return Ok((deezer, deezer_playlist));
        }
        let (sc, sc_playlist) = self.load_url_tracks_on(node, url).await;
        if !response_exists(&sc) {
            return Ok((deezer, deezer_playlist));
        }
        let deezer_score = proximity_similarity(
            url,
            &build_track_label(&first.info.title, &first.info.author),
        );
        let sc_first = &sc[0];
        let sc_score = proximity_similarity(
            url,
            &build_track_label(&sc_first.info.title, &sc_first.info.author),
        );
        if prefers_soundcloud(deezer_score, sc_score) {
            Ok((sc, sc_playlist))
        } else {
            Ok((deezer, deezer_playlist))
        }
    }

    /// Resolve one play query to node tracks + a playlist flag, with
    /// per-node failover (mirrors `searchMusicQuery`, which tries every
    /// connected node and keeps the first hit): the first node in
    /// failover order with a titled hit wins, otherwise NoMatches.
    /// Every returned title runs through [`mask_link`].
    pub async fn resolve_query_tracks(
        &self,
        guild_id: u64,
        query: &str,
    ) -> Result<(Vec<Track>, bool), MusicError> {
        let ordered = self.nodes_in_failover_order(guild_id).await;
        if ordered.is_empty() {
            return Err(MusicError::NoNodes);
        }
        for node in &ordered {
            match self.resolve_on(node, query).await {
                Ok((tracks, is_playlist)) if response_exists(&tracks) => {
                    return Ok((tracks, is_playlist));
                }
                _ => continue,
            }
        }
        Err(MusicError::NoMatches)
    }

    /// [`Self::resolve_query_tracks`] on one pinned node. Mirrors
    /// `searchQueryOnNode`: Spotify/YouTube/Apple/Amazon/Tidal URLs
    /// resolve via their metadata ports (YouTube loads direct with a
    /// title-to-deezer fallback, like `handleYoutube`; albums/playlists
    /// fan out to per-track deezer hits, like TS); other URLs run the
    /// deezer/soundcloud legs; bare text goes through
    /// [`Self::search_text_tracks_on`].
    async fn resolve_on(
        &self,
        node: &NodeEntry,
        query: &str,
    ) -> Result<(Vec<Track>, bool), MusicError> {
        // JS-trim, not Rust trim: the TS query reaching `searchQueryOnNode`
        // is `String.trim()`-normalized (U+0085 NEL survives and fails the
        // WHATWG parse, routing NEL-padded URLs to bare text). Rust `trim`
        // would strip NEL first and misroute e.g. "\u{85}https://…spotify…"
        // to the Spotify leg (same W6 slice 163 class as `js_trim`).
        let query = crate::funcs::js_trim(query);
        match route_query_source(query) {
            QueryRoute::Spotify => return self.resolve_spotify_on(node, query).await,
            QueryRoute::Youtube => return self.resolve_youtube_on(node, query).await,
            QueryRoute::Apple => {
                if let Some(res) = self.resolve_apple_on(node, query).await? {
                    return Ok(res);
                }
                return Err(MusicError::NoMatches);
            }
            QueryRoute::Amazon => {
                if let Some(res) = self.resolve_amazon_on(node, query).await? {
                    return Ok(res);
                }
                return Err(MusicError::NoMatches);
            }
            QueryRoute::Tidal => {
                if let Some(res) = self.resolve_tidal_on(node, query).await? {
                    return Ok(res);
                }
                return Err(MusicError::NoMatches);
            }
            QueryRoute::Url => return self.search_url_tracks_on(node, query).await,
            QueryRoute::Bare => {}
        }
        let tracks = self.search_text_tracks_on(node, query).await?;
        if !response_exists(&tracks) {
            return Err(MusicError::NoMatches);
        }
        Ok((tracks, false))
    }

    /// YouTube URL leg: sanitized direct load first, then the
    /// title-to-deezer fallback (mirrors `handleYoutube`, which looks
    /// the video title up and re-searches it on deezer; the keyless
    /// oEmbed endpoint stands in for youtubei.js here, stripped of
    /// `(…)`/`[…]` extras like `removeParenthesesContent`).
    async fn resolve_youtube_on(
        &self,
        node: &NodeEntry,
        query: &str,
    ) -> Result<(Vec<Track>, bool), MusicError> {
        let clean = sanitize_youtube_url(query);
        let (tracks, is_playlist) = self.load_url_tracks_on(node, &clean).await;
        if response_exists(&tracks) {
            return Ok((tracks, is_playlist));
        }
        if let Some((title, _)) = youtube_oembed_title(&self.http, &clean).await {
            let name = remove_parentheses_content(&title);
            if let Some(identifier) = youtube_deezer_fallback_query(&name) {
                if let Ok(loaded) = self.load_on_node(node, &identifier).await {
                    let (hits, _) = split_loaded(loaded);
                    if response_exists(&hits) {
                        return Ok((hits, false));
                    }
                }
            }
        }
        Err(MusicError::NoMatches)
    }

    async fn resolve_spotify_on(
        &self,
        node: &NodeEntry,
        url: &str,
    ) -> Result<(Vec<Track>, bool), MusicError> {
        let details = crate::metadata::spotify::get_details(url)
            .await
            .map_err(|e| MusicError::Transport(e.to_string()))?;
        if details.tracks.len() == 1 {
            let t = &details.tracks[0];
            let artist = t.artist.clone().unwrap_or_default();
            match self.deezer_first_hit_on(node, &artist, &t.name).await {
                Some(hit) => Ok((mask_tracks(vec![hit]), false)),
                None => Err(MusicError::NoMatches),
            }
        } else {
            let queries: Vec<(String, String)> = details
                .tracks
                .iter()
                .map(|t| (t.artist.clone().unwrap_or_default(), t.name.clone()))
                .collect();
            let found = self.deezer_fan_out_queries(node, &queries).await;
            if found.is_empty() {
                return Err(MusicError::NoMatches);
            }
            Ok((found, true))
        }
    }

    async fn resolve_apple_on(
        &self,
        node: &NodeEntry,
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
                    .platform_first_hit_on(node, &t.artist.name, &t.title)
                    .await
                {
                    Some(hit) => Ok(Some((mask_tracks(vec![hit]), false))),
                    None => Ok(None),
                }
            }
            crate::metadata::apple_music::AppleResult::Album(a) => {
                let queries: Vec<(String, String)> = a
                    .tracks
                    .iter()
                    .map(|t| (t.artist.name.clone(), t.title.clone()))
                    .collect();
                let found = self.platform_fan_out_queries(node, &queries).await;
                if found.is_empty() {
                    return Err(MusicError::NoMatches);
                }
                Ok(Some((found, true)))
            }
            crate::metadata::apple_music::AppleResult::Playlist(p) => {
                let queries: Vec<(String, String)> = p
                    .tracks
                    .iter()
                    .map(|t| (t.artist.name.clone(), t.title.clone()))
                    .collect();
                let found = self.platform_fan_out_queries(node, &queries).await;
                if found.is_empty() {
                    return Err(MusicError::NoMatches);
                }
                Ok(Some((found, true)))
            }
        }
    }

    async fn resolve_tidal_on(
        &self,
        node: &NodeEntry,
        url: &str,
    ) -> Result<Option<(Vec<Track>, bool)>, MusicError> {
        let res = crate::metadata::tidal::search(url)
            .await
            .map_err(|e| MusicError::Transport(e.to_string()))?;
        match res {
            crate::metadata::tidal::TidalResult::Song(t) => {
                match self
                    .platform_first_hit_on(node, &t.artist.name, &t.title)
                    .await
                {
                    Some(hit) => Ok(Some((mask_tracks(vec![hit]), false))),
                    None => Ok(None),
                }
            }
            crate::metadata::tidal::TidalResult::Album(a) => {
                let queries: Vec<(String, String)> = a
                    .tracks
                    .iter()
                    .map(|t| (t.artist.name.clone(), t.title.clone()))
                    .collect();
                let found = self.platform_fan_out_queries(node, &queries).await;
                if found.is_empty() {
                    return Err(MusicError::NoMatches);
                }
                Ok(Some((found, true)))
            }
            crate::metadata::tidal::TidalResult::Playlist(p) => {
                let queries: Vec<(String, String)> = p
                    .tracks
                    .iter()
                    .map(|t| (t.artist.name.clone(), t.title.clone()))
                    .collect();
                let found = self.platform_fan_out_queries(node, &queries).await;
                if found.is_empty() {
                    return Err(MusicError::NoMatches);
                }
                Ok(Some((found, true)))
            }
        }
    }

    async fn resolve_amazon_on(
        &self,
        node: &NodeEntry,
        url: &str,
    ) -> Result<Option<(Vec<Track>, bool)>, MusicError> {
        let domain = whatwg_host(url).unwrap_or_else(|| "music.amazon.com".to_string());
        let res = crate::metadata::amazon_music::search(url, &domain)
            .await
            .map_err(|e| MusicError::Transport(e.to_string()))?;
        match res {
            crate::metadata::amazon_music::AmazonResult::Song(t) => {
                match self
                    .platform_first_hit_on(node, &t.artist.name, &t.title)
                    .await
                {
                    Some(hit) => Ok(Some((mask_tracks(vec![hit]), false))),
                    None => Ok(None),
                }
            }
            crate::metadata::amazon_music::AmazonResult::Album(a) => {
                let queries: Vec<(String, String)> = a
                    .tracks
                    .iter()
                    .map(|t| (t.artist.name.clone(), t.title.clone()))
                    .collect();
                let found = self.platform_fan_out_queries(node, &queries).await;
                if found.is_empty() {
                    return Err(MusicError::NoMatches);
                }
                Ok(Some((found, true)))
            }
            crate::metadata::amazon_music::AmazonResult::Playlist(p) => {
                let queries: Vec<(String, String)> = p
                    .tracks
                    .iter()
                    .map(|t| (t.artist.name.clone(), t.title.clone()))
                    .collect();
                let found = self.platform_fan_out_queries(node, &queries).await;
                if found.is_empty() {
                    return Err(MusicError::NoMatches);
                }
                Ok(Some((found, true)))
            }
        }
    }

    /// Enqueue already-resolved tracks on the pinned node + start
    /// playback when the first track went straight to current
    /// (position 0). Playlist results enqueue every track; single
    /// results enqueue only the first hit (mirrors
    /// `player.queue.add(loadType === "playlist" ? tracks : tracks[0])`).
    async fn enqueue_resolved(
        &self,
        node: &NodeEntry,
        guild_id: u64,
        tracks: Vec<Track>,
        is_playlist: bool,
        requester: u64,
        now_ms: i64,
    ) -> Result<(usize, QueuedTrack, bool), MusicError> {
        if !response_exists(&tracks) {
            return Err(MusicError::NoMatches);
        }
        let take = enqueue_take(is_playlist, tracks.len());
        let first = QueuedTrack::from((&tracks[0], requester));
        let shown = first.clone();
        let rest: Vec<Track> = tracks
            .into_iter()
            .skip(1)
            .take(take.saturating_sub(1))
            .collect();
        let position = self
            .with_player(guild_id, |p| {
                let mut pos = p.enqueue(first, now_ms);
                if is_playlist {
                    for t in rest {
                        p.queue.push_back(QueuedTrack::from((&t, requester)));
                        pos = p.queue.len();
                    }
                }
                pos
            })
            .await;
        if position == 0 {
            // Voice-connect ensure (mirrors `if (!player.connected)
            // await player.connect()` before `player.play()`): the
            // play must not fire with nowhere to send audio. Loud
            // failure (not a silent stall) so the command answers the
            // queue-error shape.
            if !self.ensure_voice_connected(guild_id).await {
                return Err(MusicError::Transport(format!(
                    "voice not connected for guild {guild_id}: no voice channel or shard messenger"
                )));
            }
            let snap = self.snapshot(guild_id).await;
            if let Some(current) = snap.as_ref().and_then(|s| s.current.clone()) {
                let session = node
                    .session()
                    .await
                    .ok_or_else(|| MusicError::NoSession(node.id.clone()))?;
                // Re-push the cached Discord handshake first (the
                // second half of `connect()`): best-effort, since the
                // events_handler handshake forward replays it on
                // completion anyway.
                if let Some(voice) = self.take_pending_voice(guild_id).await {
                    let _ = self.rest_set_voice(node, &session, guild_id, voice).await;
                }
                self.rest_play(node, &session, guild_id, &current.encoded, false)
                    .await?;
                // Re-apply the stored volume only when a custom volume
                // was set (mirrors musicPlay.ts `if
                // (player.customVolume) player.setVolume(...)` after
                // createPlayer): otherwise the node default applies.
                if let Some(volume) = snap.and_then(|s| s.custom_volume) {
                    let _ = self.rest_set_volume(node, &session, guild_id, volume).await;
                }
            }
        }
        Ok((position, shown, is_playlist))
    }

    /// Resolve + enqueue. Returns (position, first track, is_playlist):
    /// position 0 means it started playing immediately. The first node
    /// in failover order with a hit wins (mirrors `searchMusicQuery`
    /// keeping the first successful node).
    pub async fn play_query(
        &self,
        guild_id: u64,
        query: &str,
        requester: u64,
        now_ms: i64,
    ) -> Result<(usize, QueuedTrack, bool), MusicError> {
        let ordered = self.nodes_in_failover_order(guild_id).await;
        if ordered.is_empty() {
            return Err(MusicError::NoNodes);
        }
        for node in &ordered {
            match self.resolve_on(node, query).await {
                Ok((tracks, is_playlist)) if response_exists(&tracks) => {
                    return self
                        .enqueue_resolved(node, guild_id, tracks, is_playlist, requester, now_ms)
                        .await;
                }
                _ => continue,
            }
        }
        Err(MusicError::NoMatches)
    }

    /// Multi-query batch on one pinned node (mirrors `handleMusicPlay`
    /// looping `queries[]` with `currentNode` pinned from the first
    /// successful search): the first query walks the failover order
    /// and pins its winning node; every later query resolves on that
    /// node only. A failed query aborts the batch (TS answers the
    /// no-result embed and returns), keeping the results so far.
    pub async fn play_queries(
        &self,
        guild_id: u64,
        queries: &[String],
        requester: u64,
        now_ms: i64,
    ) -> Vec<Result<(usize, QueuedTrack, bool), MusicError>> {
        let normalized = normalize_play_queries(queries);
        let mut out = Vec::with_capacity(normalized.len());
        let mut pinned: Option<Arc<NodeEntry>> = None;
        for query in &normalized {
            if let Some(node) = pinned.clone() {
                match self.resolve_on(&node, query).await {
                    Ok((tracks, is_playlist)) if response_exists(&tracks) => {
                        match self
                            .enqueue_resolved(
                                &node,
                                guild_id,
                                tracks,
                                is_playlist,
                                requester,
                                now_ms,
                            )
                            .await
                        {
                            Ok(hit) => out.push(Ok(hit)),
                            Err(e) => {
                                out.push(Err(e));
                                break;
                            }
                        }
                    }
                    _ => {
                        out.push(Err(MusicError::NoMatches));
                        break;
                    }
                }
                continue;
            }
            // First query: failover until a resolve hits, pin the winner.
            let mut hit: Option<(Arc<NodeEntry>, Vec<Track>, bool)> = None;
            for candidate in self.nodes_in_failover_order(guild_id).await {
                match self.resolve_on(&candidate, query).await {
                    Ok((tracks, is_playlist)) if response_exists(&tracks) => {
                        hit = Some((candidate, tracks, is_playlist));
                        break;
                    }
                    _ => continue,
                }
            }
            match hit {
                Some((node, tracks, is_playlist)) => {
                    match self
                        .enqueue_resolved(&node, guild_id, tracks, is_playlist, requester, now_ms)
                        .await
                    {
                        Ok(res) => {
                            pinned = Some(node);
                            out.push(Ok(res));
                        }
                        Err(e) => {
                            out.push(Err(e));
                            break;
                        }
                    }
                }
                None => {
                    let empty = self.nodes_in_failover_order(guild_id).await.is_empty();
                    out.push(Err(if empty {
                        MusicError::NoNodes
                    } else {
                        MusicError::NoMatches
                    }));
                    break;
                }
            }
        }
        out
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
    /// Accumulated paused time (mirrors `pausedDurationMs`).
    pub paused_ms: u64,
    /// Ongoing pause start, if currently paused (mirrors
    /// `pausedStartedAt`).
    pub pause_started_ms: Option<i64>,
    /// Tracked voice channel (mirrors `session.voiceChannelId`,
    /// re-synced on `playerMove` via `lastfm_player_move`).
    pub voice_channel_id: Option<u64>,
    /// Track identity for staleness checks (mirrors `trackKey`:
    /// a new trackStart replaces the session, orphaning in-flight
    /// drive tasks which must not POST for the old track).
    pub track_key: String,
    /// Attached listeners by user id (mirrors `session.listeners`).
    pub listeners: HashMap<u64, LastfmListener>,
}

/// Per-listener scrobble state (mirrors `LastFMListenerSession`,
/// minus the live timer handle: the drive task owns the wait).
#[derive(Debug, Clone)]
pub struct LastfmListener {
    pub session_key: String,
    pub username: String,
    pub started_ms: i64,
    pub threshold_ms: u64,
    pub scrobbled: bool,
}

/// Live driver credentials (mirrors the client + config the TS
/// manager closes over). Registered once from the first music
/// command (pool + Http + keys); `None` until then, in which case
/// sessions are tracked but nothing is POSTed (previous behavior).
#[derive(Clone)]
pub struct LastfmLiveCtx {
    pub cache: std::sync::Arc<serenity::Cache>,
    pub pool: crate::db::Pool,
    pub api_key: String,
    pub shared_secret: String,
    /// Pre-derived `encryption_secret(api_token, shared_secret)`
    /// for decrypting `<uid>.lastfm` session rows.
    pub secret: String,
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

/// Retry schedule: fixed 50s between attempts (mirrors the TS
/// `retryDelay: 50_000`), infinite retries (mirrors `retryAmount:
/// Infinity`). The first redial already waits the full 50s like TS;
/// the doubling helper below only enforces the same 50s ceiling.
const NODE_WS_FIRST_BACKOFF: Duration = Duration::from_secs(50);
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

pub(crate) fn now_ms_wall() -> i64 {
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
            // drop (every redial waits 50s, mirroring the TS
            // `retryDelay: 50_000`; retries are unbounded like
            // `retryAmount: Infinity`).
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
    pub custom_volume: Option<u8>,
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
            custom_volume: p.custom_volume,
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
    use lava_rs::rest::Player as RestPlayer;

    #[test]
    fn platform_url_classifiers_match_ts_host_includes_legs() {
        // W6 slice 149 battery: TS `new URL(url).host.includes(<token>)`
        // try/catch legs, replicated verbatim in node (single source).
        // `.host` is the lowercased host (+ non-default port), so the
        // `includes` is effectively case-insensitive and substring-based
        // (`notspotify.com` / `evilspotify.com` / `apple.com.evil.com`
        // all hit); opaque `spotify:track:...` URIs stay hostless (false).
        let hit: &[(&str, bool, bool, bool, bool, bool)] = &[
            (
                "https://open.spotify.com/track/abc",
                true,
                false,
                false,
                false,
                false,
            ),
            ("https://SPOTIFY.COM/x", true, false, false, false, false),
            (
                "https://open.spotify.com:443/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:8080/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://user@open.spotify.com/x",
                true,
                false,
                false,
                false,
                false,
            ),
            ("https://notspotify.com/x", true, false, false, false, false),
            (
                "https://spotify.evil.com/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://evilspotify.com/x",
                true,
                false,
                false,
                false,
                false,
            ),
            ("https://spotify.com", true, false, false, false, false),
            ("https://spotify.com./x", true, false, false, false, false),
            ("spotify:track:abc", false, false, false, false, false),
            ("spotify://open/x", false, false, false, false, false),
            ("ftp://spotify.com/x", true, false, false, false, false),
            (
                "https://www.youtube.com/watch?v=1",
                false,
                true,
                false,
                false,
                false,
            ),
            ("https://youtu.be/abc", false, true, false, false, false),
            (
                "https://music.youtube.com/x",
                false,
                true,
                false,
                false,
                false,
            ),
            ("https://YOUTU.BE/abc", false, true, false, false, false),
            (
                "https://youtube.com:443/x",
                false,
                true,
                false,
                false,
                false,
            ),
            ("https://notyoutu.com/x", false, true, false, false, false),
            (
                "https://music.apple.com/us/x",
                false,
                false,
                true,
                false,
                false,
            ),
            ("https://APPLE.COM/x", false, false, true, false, false),
            (
                "https://apple.com.evil.com/x",
                false,
                false,
                true,
                false,
                false,
            ),
            (
                "https://music.amazon.com/x",
                false,
                false,
                false,
                true,
                false,
            ),
            (
                "https://www.amazon.co.uk/x",
                false,
                false,
                false,
                true,
                false,
            ),
            ("https://tidal.com/x", false, false, false, false, true),
            (
                "https://listen.tidal.com/x",
                false,
                false,
                false,
                false,
                true,
            ),
            (
                "https://user:pass@tidal.com:8080/x",
                false,
                false,
                false,
                false,
                true,
            ),
            (
                "https://open.spotify.com/x?foo=1#frag",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "  https://open.spotify.com/x  ",
                true,
                false,
                false,
                false,
                false,
            ),
        ];
        let miss = [
            "not a url",
            "",
            "https://",
            "https://[::1]/x",
            "https://192.168.1.1/x",
            "http://localhost:3000/x",
            "https://\u{85}spotify.com/x",
            "https://a\u{80}spotify.com/x",
            "https://a\u{9f}spotify.com/x",
            "https://a\u{7f}spotify.com/x",
        ];
        for (url, s, y, a, m, t) in hit {
            assert_eq!(is_spotify_url(url), *s, "spotify {url:?}");
            assert_eq!(is_youtube_url(url), *y, "youtube {url:?}");
            assert_eq!(is_apple_music_url(url), *a, "apple {url:?}");
            assert_eq!(is_amazon_music_url(url), *m, "amazon {url:?}");
            assert_eq!(is_tidal_url(url), *t, "tidal {url:?}");
        }
        for url in miss {
            assert!(!is_spotify_url(url), "spotify miss {url:?}");
            assert!(!is_youtube_url(url), "youtube miss {url:?}");
            assert!(!is_apple_music_url(url), "apple miss {url:?}");
            assert!(!is_amazon_music_url(url), "amazon miss {url:?}");
            assert!(!is_tidal_url(url), "tidal miss {url:?}");
        }
    }

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
        // Already-prefixed queries carry a scheme and pass through
        // instead of stacking a second prefix.
        assert_eq!(
            LavalinkManager::search_identifier("ytsearch:never gonna give you up"),
            "ytsearch:never gonna give you up"
        );
        assert_eq!(
            LavalinkManager::search_identifier("dzsearch:daft punk"),
            "dzsearch:daft punk"
        );
        assert_eq!(
            LavalinkManager::search_identifier("spsearch:daft punk"),
            "spsearch:daft punk"
        );
        assert_eq!(
            LavalinkManager::search_identifier("dzsearch:never gonna give you up"),
            "dzsearch:never gonna give you up"
        );
    }

    #[test]
    fn user_id_from_token_matches_ts_base64_leniency() {
        // Node ground truth (`Buffer.from(seg, "base64").toString() || null`):
        // skips non-alphabet chars, decodes `-`/`_` as 62/63, truncates
        // at the first `=`, drops a lone trailing char past a multiple of 4.
        let cases: &[(&str, Option<&str>)] = &[
            ("MTIzNDU2Nzg5.fake.sig", Some("123456789")),
            ("MTIzNDU2Nzg.fake.sig", Some("12345678")),
            ("OTk5", Some("999")),
            ("MTIzNDU2Nzg5", Some("123456789")),
            ("MTIz ND\nU2\tNzg5.x.y", Some("123456789")),
            ("MT!IzNDU2Nzg5.a.b", Some("123456789")),
            ("MTIzNDU2Nzg5!!.a.b", Some("123456789")),
            ("TQ", Some("M")),
            ("TQ==.a", Some("M")),
            ("TWFuT", Some("Man")),
            ("TWFuTW", Some("ManM")),
            ("TWFuTWF", Some("ManMa")),
            ("ABCDE", Some("\0\u{10}\u{fffd}")),
            ("AB=C.a.b", Some("\0")),
            ("MTIz====.a.b", Some("123")),
            ("QUI=Q0Q=", Some("AB")),
            ("AB==CD.x", Some("\0")),
            ("TWFu===TWFu", Some("Man")),
            ("TWFu=.x", Some("Man")),
            ("TWF-", Some("Ma~")),
            ("TWF_", Some("Ma\u{7f}")),
            ("AA-_", Some("\0\u{f}\u{fffd}")),
            ("//79.a.b", Some("\u{fffd}\u{fffd}\u{fffd}")),
            ("4oI.x", Some("\u{fffd}")),
            ("MTIzéNDU2.a", Some("123456")),
            ("MTIz\x7fNDU2.a", Some("123456")),
            ("MTIz\u{1}NDU2.a", Some("123456")),
            ("", None),
            (".a.b", None),
            ("...", None),
            ("!!!.a.b", None),
            ("T", None),
            ("A", None),
            ("M.R.I.z", None),
            ("====.a", None),
            ("=TWFu.x", None),
        ];
        for (input, want) in cases {
            assert_eq!(
                user_id_from_token(input),
                want.map(str::to_string),
                "input {input:?}"
            );
        }
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
        // connect() leg: selfDeaf:true/selfMute:false creation options.
        assert_eq!(join["d"]["self_mute"], false);
        assert_eq!(join["d"]["self_deaf"], true);
        let leave = voice_state_update_op(123, None);
        assert!(leave["d"]["channel_id"].is_null());
        // disconnect() leg: channel_id:null + self_mute:false +
        // self_deaf:false (every destroy path funnels through it).
        assert_eq!(leave["d"]["self_mute"], false);
        assert_eq!(leave["d"]["self_deaf"], false);
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
    async fn exception_fallback_miss_keeps_current_offline() {
        let m = LavalinkManager::new();
        m.with_player(22, |p| {
            p.enqueue(sample_track("a"), 0);
            p.enqueue(sample_track("b"), 0);
        })
        .await;
        // Fallback-branch message, but with no live node the re-search
        // leg cannot run: the failed current is kept with no skip
        // (mirrors the TS handler, which only acts on a non-empty
        // fallback hit and otherwise stalls).
        let ev = parse_exception(&exception_frame(
            "22",
            "a",
            "Something broke when playing the track.",
        ));
        assert_eq!(m.handle_track_exception(ev, 100).await, ErrorRecovery::Kept);
        let snap = m.snapshot(22).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().title, "a");
    }

    #[tokio::test]
    async fn exception_unmatched_keeps_current() {
        let m = LavalinkManager::new();
        m.with_player(23, |p| {
            p.enqueue(sample_track("solo"), 0);
        })
        .await;
        // Unmatched exception message: no-op, current is kept (mirrors
        // the TS handler falling through both message branches).
        let ev = parse_exception(&exception_frame("23", "solo", "other failure"));
        assert_eq!(m.handle_track_exception(ev, 100).await, ErrorRecovery::Kept);
        let snap = m.snapshot(23).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().title, "solo");
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
        // Unmatched exception: no-op, current is kept.
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
            "a"
        );
        // Matched fallback branch, but with no live session the
        // re-search leg cannot run: the failed current is kept, no
        // skip (mirrors the TS stall on a fallback miss).
        let out = m
            .feed_node_ws(
                "n1",
                &exception_frame("25", "a", "Something broke when playing the track."),
                150,
            )
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
            "a"
        );
        let out = m.feed_node_ws("n1", &stuck_frame("25", "a"), 200).await;
        assert_eq!(out, FedWs::StuckHandled);
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
            .feed_node_ws(
                "n1",
                &exception_frame(&gid_str, "a", "Something broke when playing the track."),
                100,
            )
            .await;
        assert_eq!(out, FedWs::ErrorHandled);
        let snap = gm.snapshot(gid).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().title, "a");
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

    #[test]
    fn node_ws_request_carries_rfc6455_handshake_headers() {
        // tungstenite 0.21 `connect` on a caller-built Request does not add
        // the handshake headers itself: a request missing Sec-WebSocket-Key
        // fails with `InvalidHeader(sec-websocket-key)` before any byte is
        // sent (this was the node1 drop loop).
        let cfg = test_node_cfg();
        let h = node_ws_request(&cfg, 7, None).unwrap();
        let h = h.headers();
        assert_eq!(h.get("connection").unwrap(), "Upgrade");
        assert_eq!(h.get("upgrade").unwrap(), "websocket");
        assert_eq!(h.get("sec-websocket-version").unwrap(), "13");
        let key = h.get("sec-websocket-key").unwrap().to_str().unwrap();
        assert_eq!(key.len(), 24, "base64 of 16 random bytes");
        assert!(!h.get("host").unwrap().is_empty());
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

    #[tokio::test]
    async fn sweep_idle_destroy_skips_parked_guilds() {
        let m = LavalinkManager::new();
        for gid in [31u64, 32u64] {
            m.with_player(gid, |p| {
                p.voice_channel = Some(77);
                p.stop(1000);
            })
            .await;
        }
        let at = 1000 + EMPTY_QUEUE_DESTROY_AFTER_MS;
        // Parked guild 31 keeps its state (no-disconnect idle path);
        // guild 32 is destroyed as usual.
        let mut parked = std::collections::HashSet::new();
        parked.insert(31u64);
        let done = m.sweep_idle_destroy_skipping(&parked, at).await;
        assert_eq!(done.len(), 1);
        assert_eq!(done[0].guild_id, 32);
        assert!(m.snapshot(31).await.is_some());
        assert!(m.snapshot(32).await.is_none());
    }

    #[test]
    fn h247_rejoin_after_destroy_needs_enabled_parked() {
        assert!(LavalinkManager::h247_rejoin_after_destroy(true, Some(7)));
        assert!(!LavalinkManager::h247_rejoin_after_destroy(true, None));
        assert!(!LavalinkManager::h247_rejoin_after_destroy(false, Some(7)));
        assert!(!LavalinkManager::h247_rejoin_after_destroy(false, None));
    }

    #[test]
    fn normalize_play_queries_match_ts_trim_filter_legs() {
        // W6 slice 152 battery: TS
        // `queries.map((query) => query.trim()).filter(Boolean)`
        // replicated verbatim in node.
        let q = |ss: &[&str]| ss.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        assert_eq!(
            normalize_play_queries(&q(&["  song  ", "   ", "", "\ttab\t", "a", "  "])),
            vec!["song".to_string(), "tab".to_string(), "a".to_string()]
        );
        // Order preserved, inner whitespace kept.
        assert_eq!(
            normalize_play_queries(&q(&["b", "  a  b  ", "c"])),
            vec!["b".to_string(), "a  b".to_string(), "c".to_string()]
        );
        // Empty in, empty out (TS answers the no-result embed).
        assert!(normalize_play_queries(&[]).is_empty());
        assert!(normalize_play_queries(&q(&["   ", "\n\t "])).is_empty());
        // W6 slice 163: JS-whitespace-set exactness (node battery
        // `slice163-trim.js`, 13 cases). U+0085 NEL is NOT trimmed by
        // JS, so it survives as a query (old Rust `trim` dropped it).
        assert_eq!(
            normalize_play_queries(&q(&["\u{85}", "\u{85}x", "x\u{85}", " \u{85} "])),
            vec![
                "\u{85}".to_string(),
                "\u{85}x".to_string(),
                "x\u{85}".to_string(),
                "\u{85}".to_string()
            ]
        );
        // FEFF/NBSP/LS/PS trim like Rust; ZWSP/U+180E survive both sides.
        assert_eq!(
            normalize_play_queries(&q(&["\u{feff}x", "\u{a0}x\u{a0}", "\u{2028}x\u{2029}"])),
            vec!["x".to_string(), "x".to_string(), "x".to_string()]
        );
        assert_eq!(
            normalize_play_queries(&q(&["\u{200b}x", "\u{180e}"])),
            vec!["\u{200b}x".to_string(), "\u{180e}".to_string()]
        );
    }

    #[test]
    fn route_query_source_matches_ts_chain_order() {
        use super::{prefers_soundcloud, route_query_source, QueryRoute as R};
        // W6 slice 153 battery: the `searchQueryOnNode` if/else chain
        // replicated verbatim in node (spotify -> youtube -> apple ->
        // amazon -> tidal -> url -> bare; first hit wins).
        let cases = [
            ("https://open.spotify.com/track/abc", R::Spotify),
            ("https://www.youtube.com/watch?v=abc", R::Youtube),
            ("https://youtu.be/abc", R::Youtube),
            ("https://music.apple.com/us/album/x", R::Apple),
            ("https://music.amazon.com/albums/x", R::Amazon),
            ("https://tidal.com/browse/track/1", R::Tidal),
            // Overlap hosts route by chain position (youtube is 2nd).
            ("https://youtu.be.apple.com/x", R::Youtube),
            ("https://apple.com.youtube.com/x", R::Youtube),
            ("https://spotify.youtube.com/x", R::Spotify),
            ("https://example.com/foo", R::Url),
            ("just some words", R::Bare),
            // WHATWG trims padding, so padded URLs still route (node: spotify).
            ("  https://open.spotify.com/x  ", R::Spotify),
            ("https://open.spotify.com:443/x", R::Spotify),
            // U+0085 NEL survives JS trim: a leading NEL fails the WHATWG
            // parse on both sides (node: `new URL` throws) and routes bare,
            // while `resolve_on` JS-trims (never Rust-trims) before routing.
            // A trailing NEL stays in the path and keeps the Spotify host.
            ("\u{85}https://open.spotify.com/x", R::Bare),
            ("https://open.spotify.com/x\u{85}", R::Spotify),
        ];
        for (q, want) in cases {
            assert_eq!(route_query_source(q), want, "route {q:?}");
        }
        // Strict-greater pick: tie keeps deezer, sc wins only above.
        assert!(!prefers_soundcloud(0.5, 0.5));
        assert!(prefers_soundcloud(0.6, 0.61));
        assert!(!prefers_soundcloud(0.61, 0.6));
    }

    #[test]
    fn spotify_fanout_shape_matches_ts_handle_spotify_legs() {
        use super::{spotify_track_query, PLAYLIST_FANOUT_CAP};
        // Query build (node battery: `${artist} ${name}`, single space).
        assert_eq!(
            spotify_track_query(Some("Daft Punk"), "One More Time"),
            "dzsearch:Daft Punk One More Time"
        );
        assert_eq!(spotify_track_query(Some(""), "X"), "dzsearch: X");
        assert_eq!(spotify_track_query(None, "X"), "dzsearch: X");
        assert_eq!(spotify_track_query(Some("A"), ""), "dzsearch:A ");
        // Cap (node battery: 150 -> first 100 in order, short vecs whole).
        assert_eq!(PLAYLIST_FANOUT_CAP, 100);
        let big: Vec<u32> = (0..150).collect();
        let capped: Vec<u32> = big.iter().take(PLAYLIST_FANOUT_CAP).copied().collect();
        assert_eq!(capped.len(), 100);
        assert_eq!(capped[0], 0);
        assert_eq!(capped[99], 99);
        let small = [1u32, 2, 3];
        assert_eq!(small.iter().take(PLAYLIST_FANOUT_CAP).count(), 3);
    }

    #[test]
    fn platform_queries_match_ts_apple_tidal_amazon_legs() {
        use super::{platform_album_track_query, platform_song_query};
        // Single-song legs (node battery: `${title} - ${artist.name}`,
        // title first with ` - `; shared by all three handlers).
        assert_eq!(
            platform_song_query(Some("Daft Punk"), "One More Time"),
            "dzsearch:One More Time - Daft Punk"
        );
        assert_eq!(
            platform_song_query(Some("Taylor Swift"), "Shake It Off"),
            "dzsearch:Shake It Off - Taylor Swift"
        );
        // Album/playlist fan-out legs (node battery:
        // `${title} ${artist.name}`, title first, no dash).
        assert_eq!(
            platform_album_track_query(Some("Daft Punk"), "One More Time"),
            "dzsearch:One More Time Daft Punk"
        );
        // Cross-check: platform shapes differ from the Spotify leg on the
        // same input (artist-first there, title-first here).
        assert_eq!(
            spotify_track_query(Some("Daft Punk"), "One More Time"),
            "dzsearch:Daft Punk One More Time"
        );
        // Missing-artist legs (node battery renders literal "undefined";
        // the pure fns map it to "" — unreachable: metadata ports yield
        // clean non-optional Strings, doc-noted on the fns).
        assert_eq!(platform_song_query(None, "X"), "dzsearch:X - ");
        assert_eq!(platform_album_track_query(None, "X"), "dzsearch:X ");
        assert_eq!(platform_song_query(Some(""), ""), "dzsearch: - ");
    }

    #[test]
    fn enqueue_take_matches_ts_playlist_vs_single_legs() {
        use super::enqueue_take;
        // Playlist legs (strict `=== "playlist"` takes every track).
        assert_eq!(enqueue_take(true, 3), 3);
        assert_eq!(enqueue_take(true, 1), 1);
        assert_eq!(enqueue_take(true, 0), 0);
        // Single legs (any other loadType takes exactly the first hit;
        // node battery: `TRACK`/uppercase is single, empty stays empty).
        assert_eq!(enqueue_take(false, 3), 1);
        assert_eq!(enqueue_take(false, 1), 1);
        assert_eq!(enqueue_take(false, 0), 0);
        // `firstResult ??= res` latch leg (nullish-only swap == Option::or).
        let mut first: Option<&str> = None;
        first = first.or(Some("R1"));
        assert_eq!(first, Some("R1"));
        first = first.or(Some("R2"));
        assert_eq!(first, Some("R1"));
    }

    #[tokio::test]
    async fn play_queries_offline_reports_per_query() {
        let m = LavalinkManager::new();
        // Empty/blank batches resolve to nothing (TS answers no-result).
        assert!(m.play_queries(1, &[], 2, 0).await.is_empty());
        assert!(m
            .play_queries(1, &["   ".to_string()], 2, 0)
            .await
            .is_empty());
        // No nodes: the first query aborts the batch with NoNodes.
        let out = m
            .play_queries(1, &["a".to_string(), "b".to_string()], 2, 0)
            .await;
        assert_eq!(out.len(), 1);
        assert_eq!(
            out.into_iter().next().unwrap().unwrap_err(),
            MusicError::NoNodes
        );
    }

    #[test]
    fn reconnect_schedule_is_fixed_50s_like_ts() {
        // TS `retryDelay: 50_000` is a fixed wait, not a ramp: the
        // first redial already waits the full 50s.
        assert_eq!(NODE_WS_FIRST_BACKOFF, Duration::from_secs(50));
        assert_eq!(NODE_WS_MAX_BACKOFF, Duration::from_secs(50));
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
        // (input, spotify, youtu, apple, amazon, tidal) from the node
        // ground-truth battery over `new URL(url).host.includes(…)`.
        let cases: &[(&str, bool, bool, bool, bool, bool)] = &[
            (
                "https://open.spotify.com/track/abc",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "http://open.spotify.com/track/abc",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "ftp://open.spotify.com/track/abc",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "FTP://OPEN.SPOTIFY.COM/track/abc",
                true,
                false,
                false,
                false,
                false,
            ),
            ("HTTPS://YOUTU.BE/abc", false, true, false, false, false),
            (
                "https://spotify@evil.com/",
                false,
                false,
                false,
                false,
                false,
            ),
            (
                "https://user:pass@open.spotify.com:443/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:8080/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:abc/x",
                false,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:/x",
                true,
                false,
                false,
                false,
                false,
            ),
            ("spotify:track:abc", false, false, false, false, false),
            ("not a url", false, false, false, false, false),
            ("https://", false, false, false, false, false),
            (
                "https://music.youtube.com/x",
                false,
                true,
                false,
                false,
                false,
            ),
            (
                "https://sub.youtube.com/x",
                false,
                true,
                false,
                false,
                false,
            ),
            (
                "https://music.apple.com/fr/x",
                false,
                false,
                true,
                false,
                false,
            ),
            (
                "https://music.amazon.fr/albums/x",
                false,
                false,
                false,
                true,
                false,
            ),
            ("https://tidal.com/x", false, false, false, false, true),
            (
                "https://listen.tidal.com/x",
                false,
                false,
                false,
                false,
                true,
            ),
            (
                " https://open.spotify.com/x ",
                true,
                false,
                false,
                false,
                false,
            ),
            ("https://spotify .com/", false, false, false, false, false),
            (
                "https://open.spotify.com/x?y",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com/x#f",
                true,
                false,
                false,
                false,
                false,
            ),
            ("http://[::1]/x", false, false, false, false, false),
            ("//open.spotify.com/x", false, false, false, false, false),
            (
                "https://evil.com?spotify",
                false,
                false,
                false,
                false,
                false,
            ),
            (
                "https://spotify.evil.com/",
                true,
                false,
                false,
                false,
                false,
            ),
            ("https://evilspotify.com/", true, false, false, false, false),
            (
                "https://open.spotify.com./x",
                true,
                false,
                false,
                false,
                false,
            ),
            ("file:///etc/passwd", false, false, false, false, false),
            (
                "https://user@spotify.com@evil.com/",
                false,
                false,
                false,
                false,
                false,
            ),
            (
                "\t\nhttps://youtu.be/abc\t\n",
                false,
                true,
                false,
                false,
                false,
            ),
            ("https://youtu.be:abc/", false, false, false, false, false),
            ("ws://open.spotify.com/x", true, false, false, false, false),
            (
                "spotify://open.spotify.com/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com\\/x",
                true,
                false,
                false,
                false,
                false,
            ),
            ("https://:8080/x", false, false, false, false, false),
            (
                "https://music.amazon.com./x",
                false,
                false,
                false,
                true,
                false,
            ),
            (
                "HTTPS://MUSIC.AMAZON.FR/x",
                false,
                false,
                false,
                true,
                false,
            ),
            ("https://%73potify.com/", true, false, false, false, false),
            (
                "https://open.spotify.com:99999/x",
                false,
                false,
                false,
                false,
                false,
            ),
            ("https://100%.com/", false, false, false, false, false),
            ("https://%zz.com/", false, false, false, false, false),
            ("https://a%20b.com/", false, false, false, false, false),
            (
                "https://open.spotify.com%2fx/",
                false,
                false,
                false,
                false,
                false,
            ),
            ("https://münchen.de/", false, false, false, false, false),
            (
                "https://open.spotify.com:80/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "http://open.spotify.com:443/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "http://open.spotify.com:80/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "ftp://open.spotify.com:21/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "ftp://open.spotify.com:22/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "ws://open.spotify.com:80/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "spotify://open.spotify.com:123/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "spotify://open.spotify.com:/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:0/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:65535/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:65536/x",
                false,
                false,
                false,
                false,
                false,
            ),
            (
                "https://[::ffff:1.2.3.4]/x",
                false,
                false,
                false,
                false,
                false,
            ),
            ("https://[::1]:8080/x", false, false, false, false, false),
            (
                "https://user:p@ss@open.spotify.com/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com./:8080/x",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://sub.youtu.be@evil.com/",
                false,
                false,
                false,
                false,
                false,
            ),
            ("https://youtu.be./x", false, true, false, false, false),
            (
                "HtTpS://OpEn.SpOtIfY.cOm/X",
                true,
                false,
                false,
                false,
                false,
            ),
            (
                "https://open.spotify.com:443/x",
                true,
                false,
                false,
                false,
                false,
            ),
            ("https://tidal.com:443/x", false, false, false, false, true),
            ("http://tidal.com:80/x", false, false, false, false, true),
            (
                "https://www.youtube.com/watch?v=x",
                false,
                true,
                false,
                false,
                false,
            ),
            ("https://youtu.be/x", false, true, false, false, false),
            (
                "https://music.apple.com/us/song/x",
                false,
                false,
                true,
                false,
                false,
            ),
            (
                "https://music.amazon.fr/track/x",
                false,
                false,
                false,
                true,
                false,
            ),
            (
                "https://tidal.com/browse/track/1",
                false,
                false,
                false,
                false,
                true,
            ),
            (
                "https://www.deezer.com/track/1",
                false,
                false,
                false,
                false,
                false,
            ),
        ];
        for (input, spotify, youtu, apple, amazon, tidal) in cases {
            assert_eq!(is_spotify_url(input), *spotify, "spotify {input:?}");
            assert_eq!(is_youtube_url(input), *youtu, "youtu {input:?}");
            assert_eq!(is_apple_music_url(input), *apple, "apple {input:?}");
            assert_eq!(is_amazon_music_url(input), *amazon, "amazon {input:?}");
            assert_eq!(is_tidal_url(input), *tidal, "tidal {input:?}");
        }
        // Direct `.host` pins (None = THROW or empty host in node).
        let hosts: &[(&str, Option<&str>)] = &[
            (
                "https://open.spotify.com/track/abc",
                Some("open.spotify.com"),
            ),
            (
                "https://user:pass@open.spotify.com:443/x",
                Some("open.spotify.com"),
            ),
            (
                "https://open.spotify.com:8080/x",
                Some("open.spotify.com:8080"),
            ),
            ("HTTPS://YOUTU.BE/abc", Some("youtu.be")),
            ("https://open.spotify.com:abc/x", None),
            ("https://open.spotify.com:99999/x", None),
            ("https://open.spotify.com:65536/x", None),
            ("https://open.spotify.com:0/x", Some("open.spotify.com:0")),
            ("http://[::1]/x", Some("[::1]")),
            ("https://[::1]:8080/x", Some("[::1]:8080")),
            ("https://[v1.fe]/x", None),
            ("spotify:track:abc", None),
            ("file:///etc/passwd", None),
            ("file://host/path", Some("host")),
            ("file:////etc", None),
            ("https:///path", Some("path")),
            (
                "https://open.spotify.com./:8080/x",
                Some("open.spotify.com."),
            ),
            ("https://%73potify.com/", Some("spotify.com")),
            ("https://100%.com/", None),
            ("https://", None),
            ("https://:8080/x", None),
            ("https://open.spotify.com@/x", None),
            (
                "spotify://open.spotify.com:123/x",
                Some("open.spotify.com:123"),
            ),
            ("ftp://open.spotify.com:21/x", Some("open.spotify.com")),
            ("ftp://open.spotify.com:22/x", Some("open.spotify.com:22")),
            ("https://münchen.de/", Some("münchen.de")),
            ("spotify://", None),
            ("https://open.spotify.com\\/x", Some("open.spotify.com")),
            ("https:open.spotify.com/x", Some("open.spotify.com")),
            ("https:/open.spotify.com/x", Some("open.spotify.com")),
        ];
        for (input, expected) in hosts {
            assert_eq!(whatwg_host(input).as_deref(), *expected, "host {input:?}");
        }
        assert!(!is_url_query("never gonna give you up"));
        assert!(is_url_query("https://example.test/x"));
        // Any-scheme detection (mirrors `new URL(query)`), pinned by a
        // node ground-truth battery (W6 slice 146): non-special schemes
        // accept any opaque rest, empty or whitespace-bearing.
        assert!(is_url_query("spotify:track:abc123"));
        assert!(is_url_query("https://example.test/x"));
        assert!(!is_url_query("never gonna give you up"));
        assert!(is_url_query("dzsearch:never gonna give you up"));
        assert!(!is_url_query("12:34"));
        assert!(is_url_query("title: test"));
        assert!(is_url_query("just:"));
        assert!(is_url_query("foo:"));
        assert!(is_url_query("tel:+123"));
        assert!(is_url_query("mailto:a@b.c"));
        assert!(is_url_query("foo:ba r"));
        assert!(is_url_query("foo:  a  b  "));
        assert!(is_url_query("aB1+-.:x"));
        assert!(!is_url_query(":foo"));
        assert!(!is_url_query("1abc:def"));
        assert!(!is_url_query("foo :bar"));
        assert!(!is_url_query("relative/path"));
        assert!(!is_url_query("?q=1"));
        assert!(!is_url_query("#f"));
        assert!(!is_url_query("//host/path"));
        assert!(!is_url_query(""));
        assert!(!is_url_query("   "));
        // `//` rests open authority parsing, even off-special-scheme.
        assert!(is_url_query("foo://"));
        assert!(is_url_query("foo:////"));
        assert!(is_url_query("foo://h/"));
        assert!(is_url_query("foo://user@h/"));
        assert!(is_url_query("foo://h:80/x"));
        assert!(!is_url_query("foo://a b/"));
        assert!(!is_url_query("foo://h:bad/"));
        assert!(!is_url_query("foo://h:99999/"));
        assert!(!is_url_query("foo://h\\x"));
        // Special schemes need a real host; slashless still parses.
        assert!(!is_url_query("http://"));
        assert!(!is_url_query("http:"));
        assert!(!is_url_query("https:"));
        assert!(!is_url_query("wss://"));
        assert!(!is_url_query("http://exa mple.com"));
        assert!(!is_url_query("http://a:99999/"));
        assert!(!is_url_query("http://a:b/"));
        assert!(is_url_query("http:example.com"));
        assert!(is_url_query("http:/x"));
        assert!(is_url_query("http:///x"));
        assert!(is_url_query("HtTp://a"));
        assert!(is_url_query("HTTP:EXAMPLE.COM"));
        assert!(is_url_query("http://user@h/"));
        assert!(is_url_query("http://h\\x"));
        assert!(is_url_query("wss://a:443"));
        // `file:` tolerates an empty host.
        assert!(is_url_query("file:"));
        assert!(is_url_query("file://"));
        assert!(is_url_query("file:///x"));
        assert!(is_url_query("file://h/x"));
        assert!(!is_url_query("file://a b/"));
        // WHATWG preprocessing: tabs/newlines stripped everywhere, ends
        // trim to C0/space only (U+0085 is NOT stripped).
        assert!(is_url_query("  https://example.test/x  "));
        assert!(is_url_query("\thttps://example.test/x\n"));
        assert!(is_url_query("foo:bar\tbaz"));
        assert!(is_url_query("https://a\t.com"));
        assert!(is_url_query("C:\\path"));
        assert!(is_url_query("a:é"));
        assert!(!is_url_query("é:a"));
        assert!(!is_url_query("été:x"));
        assert!(!is_url_query("\u{85}foo:bar"));
        assert!(is_url_query("foo:bar\u{85}"));
    }

    #[test]
    fn deezer_title_identifier_prefixes_cleaned_title() {
        assert_eq!(
            deezer_title_identifier("  Never Gonna Give You Up  "),
            "dzsearch:Never Gonna Give You Up"
        );
    }

    #[test]
    fn youtube_fallback_gate_matches_ts_tautology_legs() {
        // Battery (node, verbatim handleYoutube tail): `!video` is
        // falsy-only (undefined/null/0/""/false miss, {} proceeds);
        // `title.text || ""` falls back on undefined/null/"";
        // `itemName !== "" || itemName !== null` is a tautology —
        // even "" proceeds to the deezer search (dead else branch).
        // The pure port folds the dead "" leg to None (convergent
        // downstream via the searchMusicQuery accept gate); every
        // Some leg carries the exact `deezer_title_identifier` string.
        assert_eq!(
            youtube_deezer_fallback_query("Never Gonna Give You Up"),
            Some("dzsearch:Never Gonna Give You Up".to_string())
        );
        assert_eq!(
            youtube_deezer_fallback_query("0"),
            Some("dzsearch:0".to_string())
        );
        // Paren-only titles strip to "" (battery:
        // "(Official Video)" -> ""): TS searches anyway, here None.
        assert_eq!(
            youtube_deezer_fallback_query(&remove_parentheses_content("(Official Video) [HD]")),
            None
        );
        assert_eq!(youtube_deezer_fallback_query(""), None);
        assert_eq!(youtube_deezer_fallback_query("   "), None);
        // Non-empty legs agree byte-for-byte with the live helper.
        for name in ["x", "Daft Punk One More Time", "  padded  "] {
            assert_eq!(
                youtube_deezer_fallback_query(name),
                Some(deezer_title_identifier(name))
            );
        }
    }

    fn lava_test_track(title: &str) -> Track {
        Track {
            encoded: format!("enc-{title}"),
            info: lava_rs::model::TrackInfo {
                identifier: "id".to_string(),
                is_seekable: true,
                author: "artist".to_string(),
                length: 180_000,
                is_stream: false,
                position: 0,
                title: title.to_string(),
                uri: Some(format!("https://example.test/{title}")),
                artwork_url: None,
                isrc: None,
                source_name: "youtube".to_string(),
            },
            plugin_info: None,
        }
    }

    #[test]
    fn split_loaded_singles_first_and_propagates_playlists() {
        // Search legs expose only the first hit.
        let (tracks, playlist) = split_loaded(LoadResult::Search(vec![
            lava_test_track("a"),
            lava_test_track("b"),
        ]));
        assert!(!playlist);
        assert_eq!(tracks.len(), 1);
        assert_eq!(tracks[0].info.title, "a");
        // Single track leg.
        let (tracks, playlist) = split_loaded(LoadResult::Track(lava_test_track("solo")));
        assert!(!playlist);
        assert_eq!(tracks.len(), 1);
        // Playlist legs propagate every track.
        let (tracks, playlist) = split_loaded(LoadResult::Playlist(
            serde_json::from_value(serde_json::json!({
                "info": { "name": "list", "selectedTrack": 0 },
                "tracks": [
                    { "encoded": "enc-a", "info": { "identifier": "id", "isSeekable": true, "author": "artist", "length": 180000, "isStream": false, "position": 0, "title": "a", "sourceName": "youtube" } },
                    { "encoded": "enc-b", "info": { "identifier": "id", "isSeekable": true, "author": "artist", "length": 180000, "isStream": false, "position": 0, "title": "b", "sourceName": "youtube" } }
                ]
            }))
            .unwrap(),
        ));
        assert!(playlist);
        assert_eq!(tracks.len(), 2);
        // Empty/error legs are empty (callers fall to no-matches).
        let (tracks, _) = split_loaded(LoadResult::Empty);
        assert!(tracks.is_empty());
    }

    #[test]
    fn parentheses_content_stripped_like_ts() {
        assert_eq!(
            remove_parentheses_content("Song (Prod. X) [Remix] Title"),
            "Song Title"
        );
        assert_eq!(remove_parentheses_content("  spaced   out  "), "spaced out");
        // Slice 150 battery (node ground truth): cross-type brackets share
        // one depth counter, unmatched closers are swallowed, unterminated
        // opens drop the tail.
        assert_eq!(remove_parentheses_content("a (b] c"), "a c");
        assert_eq!(remove_parentheses_content("a ) b"), "a b");
        assert_eq!(remove_parentheses_content("a(b(c)d)e"), "ae");
        assert_eq!(remove_parentheses_content("(a"), "");
        assert_eq!(remove_parentheses_content("a)"), "a");
    }

    #[test]
    fn parentheses_whitespace_matches_js_s() {
        // U+0085 is NOT JS \s (kept verbatim); U+FEFF and U+2028 are.
        let nel: String = char::from_u32(0x85).unwrap().to_string();
        let feff: String = char::from_u32(0xfeff).unwrap().to_string();
        let ls: String = char::from_u32(0x2028).unwrap().to_string();
        assert_eq!(
            remove_parentheses_content(&format!("a{nel}b (c)")),
            format!("a{nel}b")
        );
        assert_eq!(remove_parentheses_content(&format!("a{feff}b (c)")), "a b");
        assert_eq!(remove_parentheses_content(&format!("a{ls}b (c)")), "a b");
        // Mixed-depth brackets still collapse like TS.
        assert_eq!(remove_parentheses_content("x ([a)] y"), "x y");
    }

    #[test]
    fn youtube_sanitize_matches_ts_battery() {
        // Node ground-truth battery (W6 slice 31): (input, sanitizeYoutubeUrl(input)).
        let cases = [
            (
                "https://www.youtube.com/watch?v=abc&si=zzz&list=LL",
                "https://www.youtube.com/watch?v=abc",
            ),
            ("https://youtu.be/abc?si=zzz", "https://youtu.be/abc"),
            (
                "https://www.deezer.com/track/1?foo=bar",
                "https://www.deezer.com/track/1?foo=bar",
            ),
            ("plain query", "plain query"),
            (
                "https://sub.youtube.com/watch?v=1&si=2",
                "https://sub.youtube.com/watch?v=1&si=2",
            ),
            (
                "https://www.youtube.com:443/watch?v=1&si=2",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://WWW.YOUTUBE.COM/watch?v=1&si=2",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "HTTPS://www.youtube.com/watch?v=1&si=2",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "ftp://www.youtube.com/watch?v=1&si=2",
                "ftp://www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?v=1&si=2#frag",
                "https://www.youtube.com/watch?v=1#frag",
            ),
            (
                "https://www.youtube.com/watch?",
                "https://www.youtube.com/watch",
            ),
            (
                "https://www.youtube.com/watch?v=1&SI=2",
                "https://www.youtube.com/watch?v=1&SI=2",
            ),
            (
                "https://www.youtube.com/watch?v=1&s%69=2",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://user@www.youtube.com/watch?v=1&si=2",
                "https://user@www.youtube.com/watch?v=1",
            ),
            ("https://www.youtube.com?si=1", "https://www.youtube.com/"),
            (
                "  https://www.youtube.com/watch?v=1&si=2  ",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?si=1&si=2&v=3",
                "https://www.youtube.com/watch?v=3",
            ),
            (
                "https://www.youtube.com/watch?v=1&t=30",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://music.youtube.com/watch?v=1&si=2",
                "https://music.youtube.com/watch?v=1",
            ),
            (
                "https://youtube.com/watch?v=1&feature=shared&v2=3",
                "https://youtube.com/watch?v=1&v2=3",
            ),
            ("https://youtu.be/abc", "https://youtu.be/abc"),
            (
                "https://www.youtube.com/watch?v=abc",
                "https://www.youtube.com/watch?v=abc",
            ),
            (
                "https://evil-youtube.com/watch?v=1&si=2",
                "https://evil-youtube.com/watch?v=1&si=2",
            ),
            (
                "https://www.youtube.com./watch?v=1&si=2",
                "https://www.youtube.com./watch?v=1&si=2",
            ),
            (
                "https://www.youtube.com/watch?v=a+b&si=1",
                "https://www.youtube.com/watch?v=a+b",
            ),
            (
                "https://www.youtube.com/watch?v=%41&si=1",
                "https://www.youtube.com/watch?v=A",
            ),
            (
                "https://www.youtube.com/watch?v=%2F&si=1",
                "https://www.youtube.com/watch?v=%2F",
            ),
            (
                "http://www.youtube.com:80/watch?v=1&si=2",
                "http://www.youtube.com/watch?v=1",
            ),
            (
                "ftp://www.youtube.com:21/watch?si=1",
                "ftp://www.youtube.com/watch",
            ),
            (
                "https://www.youtube.com:444/watch?v=1&si=2",
                "https://www.youtube.com:444/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?=x&si=1",
                "https://www.youtube.com/watch?=x",
            ),
            (
                "https://www.youtube.com/watch?v=1;si=2",
                "https://www.youtube.com/watch?v=1%3Bsi%3D2",
            ),
            (
                "https://www.youtube.com/a/../watch?v=1&si=2",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?v=1&si=2&si=3",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://u:p@www.youtube.com/watch?v=1&si=2",
                "https://u:p@www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?v=1#",
                "https://www.youtube.com/watch?v=1#",
            ),
            (
                "https://www.youtube.com/watch#frag",
                "https://www.youtube.com/watch#frag",
            ),
            (
                "foo://www.youtube.com/watch?si=1",
                "foo://www.youtube.com/watch",
            ),
            ("www.youtube.com/watch?si=1", "www.youtube.com/watch?si=1"),
            ("https://youtu.be", "https://youtu.be/"),
            ("https://youtu.be?si=1", "https://youtu.be/"),
            (
                "https://www.youtube.com/watch?v=1&list=",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?v=1&x=%",
                "https://www.youtube.com/watch?v=1&x=%25",
            ),
            (
                "https://www.YOUTUBE.com./watch?si=1",
                "https://www.YOUTUBE.com./watch?si=1",
            ),
            (
                "HTTPS://WWW.YOUTUBE.COM:443/watch?si=1",
                "https://www.youtube.com/watch",
            ),
            (
                "https://user:pass@sub.youtube.com/watch?si=1",
                "https://user:pass@sub.youtube.com/watch?si=1",
            ),
            (
                "https://www.youtube.com/watch?v=%26&si=1",
                "https://www.youtube.com/watch?v=%26",
            ),
            (
                "https://www.youtube.com/watch?%73%69=1&v=2",
                "https://www.youtube.com/watch?v=2",
            ),
            (
                "https://www.youtube.com/watch?v=1&Si=2",
                "https://www.youtube.com/watch?v=1&Si=2",
            ),
            (
                "https://www.youtube.com/watch?x&si=1",
                "https://www.youtube.com/watch?x=",
            ),
            (
                "https://www.youtube.com/watch?x",
                "https://www.youtube.com/watch?x=",
            ),
            (
                "https:https://www.youtube.com/watch?si=1",
                "https:https://www.youtube.com/watch?si=1",
            ),
            (
                "https:www.youtube.com/watch?si=1",
                "https://www.youtube.com/watch",
            ),
            (
                "https://www.youtube.com/watch?v=1&&si=2",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?&&si=1",
                "https://www.youtube.com/watch",
            ),
            (
                "https://www.youtube.com/watch?%53%49=1&v=2",
                "https://www.youtube.com/watch?SI=1&v=2",
            ),
            (
                "https://www.youtube.com/watch?v=a b&si=1",
                "https://www.youtube.com/watch?v=a+b",
            ),
            (
                "https://www.youtube.com/watch?v=1&si",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?v=1&x=",
                "https://www.youtube.com/watch?v=1&x=",
            ),
            (
                "//www.youtube.com/watch?si=1",
                "//www.youtube.com/watch?si=1",
            ),
            (
                "https://u%20s@www.youtube.com/watch?v=1&si=2",
                "https://u%20s@www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?%2B=1&v=2",
                "https://www.youtube.com/watch?%2B=1&v=2",
            ),
            (
                "https://www.youtube.com/watch?s%2Bi=1&v=2",
                "https://www.youtube.com/watch?s%2Bi=1&v=2",
            ),
            (
                "https://www.youtube.com/watch?v=%ZZ&si=1",
                "https://www.youtube.com/watch?v=%25ZZ",
            ),
            (
                "https://user@www.youtube.com:443/watch?v=1&si=2",
                "https://user@www.youtube.com/watch?v=1",
            ),
            ("HTTPS://youtu.be/abc?si=1", "https://youtu.be/abc"),
            (
                "https://m.youtube.com/watch?v=1&si=2",
                "https://m.youtube.com/watch?v=1&si=2",
            ),
            (
                "https://www.youtube.com/watch?v=1&v=2",
                "https://www.youtube.com/watch?v=1&v=2",
            ),
            (
                "https://www.youtube.com/watch?v=%C3%A9&si=1",
                "https://www.youtube.com/watch?v=%C3%A9",
            ),
            (
                "https://www.youtube.com/watch?v=*-._~!&si=1",
                "https://www.youtube.com/watch?v=*-._%7E%21",
            ),
            (
                "https://www.youtube.com/watch?v=a b+%2B&si=1",
                "https://www.youtube.com/watch?v=a+b+%2B",
            ),
            (
                "https://www.youtube.com/watch?a=b=c&si=1",
                "https://www.youtube.com/watch?a=b%3Dc",
            ),
            (
                "https://www.youtube.com/w atch?v=1&si=2",
                "https://www.youtube.com/w%20atch?v=1",
            ),
            (
                "https://www.youtube.com/watch?v=1&t=1s&t=2s",
                "https://www.youtube.com/watch?v=1",
            ),
            (
                "https://www.youtube.com/watch?Si=1&v=2",
                "https://www.youtube.com/watch?Si=1&v=2",
            ),
            (
                "https://www.youtube.com/watch?+=1&v=2",
                "https://www.youtube.com/watch?+=1&v=2",
            ),
            (
                "https://www.youtube.com/watch?%20=1&v=2",
                "https://www.youtube.com/watch?+=1&v=2",
            ),
            (
                "https://www.youtube.com/watch?v=%41%42&si=1",
                "https://www.youtube.com/watch?v=AB",
            ),
            (
                "https://www.youtube.com/watch?v=1&x=%41",
                "https://www.youtube.com/watch?v=1&x=A",
            ),
            (
                "https://www.youtube.com:99999/watch?si=1",
                "https://www.youtube.com:99999/watch?si=1",
            ),
            (
                "https://www.youtube.com:/watch?si=1",
                "https://www.youtube.com/watch",
            ),
            (
                "https://www.youtube.com:abc/watch?si=1",
                "https://www.youtube.com:abc/watch?si=1",
            ),
            ("http://[::1]/watch?si=1", "http://[::1]/watch?si=1"),
            ("http://youtu.be:80/a?si=1", "http://youtu.be/a"),
            (
                "ws://www.youtube.com/watch?si=1",
                "ws://www.youtube.com/watch",
            ),
            ("file:///watch?si=1", "file:///watch?si=1"),
            ("mailto:v@example.com?si=1", "mailto:v@example.com?si=1"),
            ("spotify:track:1", "spotify:track:1"),
            // Slice 150 battery (node ground truth): %20 reserializes to +,
            // middle drops keep order, http scheme + app param, m. host miss.
            (
                "https://www.youtube.com/watch?v=a%20b&si=1",
                "https://www.youtube.com/watch?v=a+b",
            ),
            (
                "https://music.youtube.com/watch?v=abc&pp=1&other=2",
                "https://music.youtube.com/watch?v=abc&other=2",
            ),
            (
                "http://youtu.be/abc?app=desktop&x=1",
                "http://youtu.be/abc?x=1",
            ),
            (
                "https://m.youtube.com/watch?v=abc&si=1",
                "https://m.youtube.com/watch?v=abc&si=1",
            ),
            (
                "https://www.youtube.com/watch?v=abc&feature=shared&t=1",
                "https://www.youtube.com/watch?v=abc",
            ),
        ];
        for (input, expected) in cases {
            assert_eq!(sanitize_youtube_url(input), expected, "input: {input}");
        }
        // Backslash separators (special schemes treat them as slashes).
        let bs = char::from_u32(0x5c).unwrap().to_string();
        assert_eq!(
            sanitize_youtube_url(&format!("https:{bs}{bs}www.youtube.com{bs}watch?si=1")),
            "https://www.youtube.com/watch"
        );
        assert_eq!(
            sanitize_youtube_url(&format!("https:/www.youtube.com{bs}watch?v=1&si=2")),
            "https://www.youtube.com/watch?v=1"
        );
    }

    #[test]
    fn mask_link_hides_url_titles() {
        assert_eq!(mask_link("cool song"), "cool song");
        assert_eq!(mask_link("x https://evil.test"), "Hidden Link");
        assert_eq!(mask_link("join .gg/abc"), "Hidden Link");
        assert_eq!(mask_link("a.com song"), "Hidden Link");
    }

    #[test]
    fn mask_legs_match_ts_blacklist_legs() {
        // Node ground truth (35-case battery on the verbatim
        // maskLink.ts + the forEach loop, script at scratch
        // `slice159-masklink.js`): `String.includes` is
        // case-sensitive ASCII-substring, so `str::contains` agrees
        // on every input (ASCII needles can never match inside a
        // UTF-8 multi-byte sequence).
        for title in [
            "",
            " ",
            "HTTP://X",
            "HTTPS://X",
            ".COM",
            ".Gg",
            "http:/x",
            "htp://x",
            "discor dapp",
            ".c0m",
            "com",
            "gg",
            "http",
            "a.b",
            "x,com",
            "null",
            "undefined",
            "0",
            "Hidden Link",
        ] {
            assert_eq!(mask_link(title), title, "clean title kept: {title:?}");
        }
        for title in [
            "http://",
            "https://",
            ".com",
            ".gg",
            "discordapp",
            "mydiscordappname",
            "a .comb",
            "Hidden Link http://x",
            "  https://x  ",
            "\u{e9}.com \u{2713}",
            "http://\u{1F600}.com/x",
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.com",
        ] {
            assert_eq!(
                mask_link(title),
                "Hidden Link",
                "blacklist title masked: {title:?}"
            );
        }
        // The forEach loop masks EVERY track in place (playlist
        // tracks past index 0 included); `mask_tracks` is the same
        // per-element pure map, so order/length are preserved.
        fn track_with_title(title: &str) -> Track {
            Track {
                encoded: String::new(),
                info: lava_rs::model::TrackInfo {
                    identifier: String::new(),
                    is_seekable: false,
                    author: String::new(),
                    length: 0,
                    is_stream: false,
                    position: 0,
                    title: title.to_string(),
                    uri: None,
                    artwork_url: None,
                    isrc: None,
                    source_name: String::new(),
                },
                plugin_info: None,
            }
        }
        let masked = mask_tracks(vec![
            track_with_title("a.com"),
            track_with_title("clean"),
            track_with_title("x https://y"),
        ]);
        let titles: Vec<&str> = masked.iter().map(|t| t.info.title.as_str()).collect();
        assert_eq!(titles, vec!["Hidden Link", "clean", "Hidden Link"]);
        assert!(mask_tracks(vec![]).is_empty());
    }

    #[test]
    fn proximity_matches_ts_utf16_units() {
        // Node ground truth: TS lengths are UTF-16 units, astral = 2.
        assert_eq!(levenshtein("\u{1F600}", "X"), 2);
        assert!(
            (proximity_similarity("\u{1F600}", "\u{1F600}x") - (1.0 - 1.0 / 3.0)).abs() < 1e-12
        );
        assert_eq!(proximity_similarity("\u{1F600}", "X"), 0.0);
        // JS \s word split: U+0085 does NOT split (one word, no hit)...
        assert!(!is_similar_thresholds(
            "never\u{85}gonna",
            "x",
            "never gonna",
            0.5,
            0.6
        ));
        // ...while U+FEFF does (two words, both exact hits).
        assert!(is_similar_thresholds(
            "never\u{FEFF}gonna",
            "x",
            "never gonna",
            0.5,
            0.6
        ));
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
    fn music_play_label_response_platform_match_ts_battery() {
        // Slice 96 battery (node ground truth over musicPlay.ts verbatim):
        // buildTrackLabel never trims the parts, only the whole, so edge
        // spaces survive as inner doubles.
        assert_eq!(build_track_label("a ", "b"), "a  b");
        assert_eq!(build_track_label("a", " b"), "a  b");
        assert_eq!(build_track_label(" a", "b "), "a b");
        assert_eq!(build_track_label("", ""), "");
        assert_eq!(build_track_label("  ", "  "), "");
        assert_eq!(build_track_label("a  b", "c"), "a  b c");
        assert_eq!(build_track_label("\tt", "a"), "t a");
        // responseExist is raw JS truthiness: whitespace-only counts.
        assert!(response_exists(&[lava_test_track("x")]));
        assert!(response_exists(&[lava_test_track(" ")]));
        assert!(!response_exists(&[lava_test_track("")]));
        assert!(!response_exists(&[]));
        // platformLabel: case-sensitive substring, deezer first.
        assert_eq!(platform_source_tag(Some("https://DEEZER.com/x")), None);
        // Slice 150 battery: deezer wins when both substrings match.
        assert_eq!(
            platform_source_tag(Some("https://deezersoundcloud.com/x")),
            Some("Deezer")
        );
        assert_eq!(
            platform_source_tag(Some("https://xQC/soundcloudyy")),
            Some("SoundCloud")
        );
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
    fn music_banner_wiring_uses_attachment_url() {
        // Card fill covered in nowplaying (music_banner_fill_...);
        // here: the embed points at the attachment when present.
        let e = LavalinkManager::track_start_embed(
            "xx-UNKNOWN",
            "Dunya",
            "Author",
            Some("https://example.test/t"),
            Some("attachment://music_banner.png"),
            99,
            "🎵",
        );
        let json = serde_json::to_value(&e).unwrap();
        assert_eq!(
            json.get("image")
                .and_then(|i| i.get("url"))
                .and_then(|u| u.as_str()),
            Some("attachment://music_banner.png")
        );
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
    fn lastfm_tip_due_matches_one_third_roll() {
        assert!(LavalinkManager::lastfm_tip_due(0.0));
        assert!(LavalinkManager::lastfm_tip_due(0.33));
        assert!(!LavalinkManager::lastfm_tip_due(1.0 / 3.0));
        assert!(!LavalinkManager::lastfm_tip_due(0.9));
    }

    #[test]
    fn lastfm_tip_embed_renders_template_and_color() {
        let e = LavalinkManager::lastfm_tip_embed("xx-UNKNOWN", "<LOGO>", "<COOL>");
        let json = serde_json::to_value(&e).unwrap();
        let desc = json
            .get("description")
            .and_then(|d| d.as_str())
            .unwrap_or("");
        assert!(desc.contains("<LOGO>"), "desc: {desc}");
        assert!(desc.contains("<COOL>"), "desc: {desc}");
        assert!(!desc.contains("client.iHorizon_Emojis"), "desc: {desc}");
        assert_eq!(json.get("color").and_then(|c| c.as_u64()), Some(0xBA0000));
    }

    #[test]
    fn announce_channel_order_mirrors_ts_fallback_chain() {
        use super::serenity::ChannelType as T;
        let ch = |id: u64, kind: T, parent: Option<u64>| AnnounceChannel {
            id,
            kind,
            parent_id: parent,
        };
        let channels = vec![
            ch(10, T::Voice, Some(1)), // player voice channel
            ch(11, T::Text, Some(1)),  // same-category text
            ch(12, T::Text, Some(2)),  // other category
            ch(13, T::Category, None), // never sendable
        ];
        // Stored, then voice itself, then same-category, then any.
        assert_eq!(
            LavalinkManager::announce_channel_order(Some(12), Some(10), &channels),
            vec![12, 10, 11]
        );
        // No stored channel: voice first.
        assert_eq!(
            LavalinkManager::announce_channel_order(None, Some(10), &channels),
            vec![10, 11, 12]
        );
        // Voice channel unknown to the listing: siblings unresolvable,
        // but the listed voice channel still counts as a text-based
        // last resort (TS `isTextBased()` includes voice channels).
        assert_eq!(
            LavalinkManager::announce_channel_order(None, Some(99), &channels),
            vec![10, 11, 12]
        );
        // Nothing sendable: empty (caller destroys silently).
        assert_eq!(
            LavalinkManager::announce_channel_order(None, None, &[ch(13, T::Category, None)]),
            Vec::<u64>::new()
        );
    }

    #[tokio::test]
    async fn lastfm_pause_time_excluded_from_scrobble() {
        let m = LavalinkManager::new();
        // 200s track, threshold 100s. 120s wall clock, 60s paused:
        // only 60s count, below threshold -> no scrobble.
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 31,
            artist: "a".into(),
            title: "t".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(5),
        })
        .await;
        m.lastfm_note_paused(31, true, 60_000).await;
        m.lastfm_note_paused(31, false, 120_000).await;
        assert!(m.lastfm_track_end_due(31, 120_000).await.is_none());
        // Same shape without the pause: 120s count -> scrobbles.
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 31,
            artist: "a".into(),
            title: "t".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(5),
        })
        .await;
        assert!(m.lastfm_track_end_due(31, 120_000).await.is_some());
        // Ongoing pause at track end counts too (never resumed).
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 31,
            artist: "a".into(),
            title: "t".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(5),
        })
        .await;
        m.lastfm_note_paused(31, true, 60_000).await;
        assert!(m.lastfm_track_end_due(31, 120_000).await.is_none());
    }

    #[tokio::test]
    async fn lastfm_player_move_resyncs_voice_channel() {
        let m = LavalinkManager::new();
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 32,
            artist: "a".into(),
            title: "t".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(5),
        })
        .await;
        m.lastfm_player_move(32, 9).await;
        let session = m.lastfm_sessions.lock().await;
        assert_eq!(session.get(&32).and_then(|s| s.voice_channel_id), Some(9));
    }

    #[test]
    fn lastfm_track_key_unique_per_generation() {
        // Same track restarted later is a new generation (orphans the
        // old drive task); different titles never collide.
        let a = lastfm_track_key("a", "t", 1_000);
        assert_eq!(a, lastfm_track_key("a", "t", 1_000));
        assert_ne!(a, lastfm_track_key("a", "t", 2_000));
        assert_ne!(a, lastfm_track_key("a", "t2", 1_000));
    }

    #[test]
    fn lastfm_elapsed_math_matches_ts() {
        // No pause: wall minus start.
        assert_eq!(lastfm_listener_elapsed(1_000, 0, 61_000), 60_000);
        // Banked pause subtracts.
        assert_eq!(lastfm_listener_elapsed(0, 10_000, 61_000), 51_000);
        // Ongoing pause counts via the total helper.
        assert_eq!(lastfm_paused_total(10_000, Some(50_000), 60_000), 20_000);
        assert_eq!(
            lastfm_listener_elapsed(0, lastfm_paused_total(10_000, Some(50_000), 60_000), 60_000),
            40_000
        );
        // Pause longer than the listen clamps at zero, never wraps.
        assert_eq!(lastfm_listener_elapsed(59_000, 5_000, 60_000), 0);
    }

    #[tokio::test]
    async fn lastfm_stream_start_stores_zero_duration() {
        // `normalizeTrack`: a stream with a huge reported length folds
        // to 0, so no scrobble is ever due for it (TS `shouldScrobble`
        // rejects 0, and the signer drops the duration field).
        let m = LavalinkManager::new();
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 47,
            artist: "a".into(),
            title: "radio".into(),
            duration_ms: 3_600_000,
            is_stream: true,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(5),
        })
        .await;
        let sessions = m.lastfm_sessions.lock().await;
        assert_eq!(sessions.get(&47).map(|s| s.duration_ms), Some(0));
        drop(sessions);
        assert!(m.lastfm_track_end_due(47, 3_600_000).await.is_none());
    }

    #[tokio::test]
    async fn lastfm_track_start_opens_empty_listeners() {
        let m = LavalinkManager::new();
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 46,
            artist: "a".into(),
            title: "t".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 1_000,
            voice_channel: Some(5),
        })
        .await;
        let sessions = m.lastfm_sessions.lock().await;
        let s = sessions.get(&46).unwrap();
        assert!(!s.track_key.is_empty());
        assert!(s.listeners.is_empty());
    }

    #[tokio::test]
    async fn register_lastfm_live_roundtrip() {
        // Registration stores Http-independent creds + the derived
        // row secret (api_token wins, like login.rs).
        let m = LavalinkManager::new();
        assert!(m.lastfm_live.lock().await.is_none());
        m.register_lastfm_live(
            std::sync::Arc::new(serenity::Cache::default()),
            crate::db::memory_pool().await,
            "key".into(),
            "secret".into(),
            "api-token".into(),
        )
        .await;
        let live = m.lastfm_live.lock().await.clone().unwrap();
        assert_eq!(live.api_key, "key");
        assert_eq!(live.secret, "api-token");
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

    fn end_frame(guild: &str, title: &str, reason: &str) -> String {
        serde_json::json!({
            "op": "event",
            "type": "TrackEndEvent",
            "guildId": guild,
            "track": track_value(title),
            "reason": reason,
        })
        .to_string()
    }

    fn parse_end(text: &str) -> TrackEndEvent {
        match LavalinkEvent::parse(text) {
            Some(LavalinkEvent::Event(ev)) => match *ev {
                TrackEvent::TrackEndEvent(e) => e,
                _ => panic!("expected TrackEndEvent"),
            },
            _ => panic!("end frame did not parse"),
        }
    }

    #[tokio::test]
    async fn track_start_preserves_requester() {
        // L1: the node payload carries no requester; the previous
        // current's requester survives the refresh (LastFM tip +
        // error-report attribution).
        let m = LavalinkManager::new();
        m.sync_nodes(&[test_node_cfg()], 9).await;
        m.with_player(41, |p| {
            let mut t = sample_track("hello");
            t.requester = 42;
            p.current = Some(t);
        })
        .await;
        let out = m
            .feed_node_ws("n1", &track_start_frame("41", "hello"), 0)
            .await;
        assert_eq!(out, FedWs::Started);
        let snap = m.snapshot(41).await.unwrap();
        assert_eq!(snap.current.as_ref().unwrap().requester, 42);
        let sessions = m.lastfm_sessions.lock().await;
        assert_eq!(sessions.get(&41).map(|s| s.requester), Some(42));
    }

    #[tokio::test]
    async fn sync_nodes_rebuilds_on_field_change() {
        // L9: same id, changed password -> rebuilt entry (old session
        // belongs to the old credentials); identical re-sync preserves.
        let m = LavalinkManager::new();
        m.sync_nodes(&[test_node_cfg()], 9).await;
        m.set_session("n1", "sess-1".to_string()).await;
        let changed = NodeCfg {
            password: "rotated".into(),
            ..test_node_cfg()
        };
        m.sync_nodes(&[changed], 9).await;
        assert!(m.is_live().await);
        assert_eq!(m.node_session("n1").await, None);
        m.set_session("n1", "sess-2".to_string()).await;
        m.sync_nodes(&[test_node_cfg()], 9).await;
        // Back to the original password: rebuilt again, session dropped.
        assert_eq!(m.node_session("n1").await, None);
        m.set_session("n1", "sess-3".to_string()).await;
        m.sync_nodes(&[test_node_cfg()], 9).await;
        // Identical config: entry + session preserved.
        assert_eq!(m.node_session("n1").await, Some("sess-3".to_string()));
    }

    #[tokio::test]
    async fn note_voice_state_resyncs_player_channel() {
        // L3: the bot's own voice update moves the player channel (and
        // the LastFM session); guilds without a player gain none.
        let m = LavalinkManager::new();
        m.with_player(43, |p| {
            p.voice_channel = Some(1);
        })
        .await;
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 43,
            artist: "a".into(),
            title: "t".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(1),
        })
        .await;
        m.note_voice_state(43, Some(9), "sess-9".to_string()).await;
        assert_eq!(m.snapshot(43).await.unwrap().voice_channel, Some(9));
        let sessions = m.lastfm_sessions.lock().await;
        assert_eq!(sessions.get(&43).and_then(|s| s.voice_channel_id), Some(9));
        drop(sessions);
        // Unknown guild: pending handshake noted, no player created.
        m.note_voice_state(4499, Some(9), "sess-x".to_string())
            .await;
        assert!(m.snapshot(4499).await.is_none());
    }

    #[tokio::test]
    async fn voice_handshake_push_gate_matches_ts_raw_legs() {
        // Mirrors the raw.ts forward + h247Manager null-endpoint
        // invalidation (battery: scratch/slice-w7s59-lavalinkclient.cjs
        // B): the state half alone never completes the push gate, the
        // server half completes it once all three legs are fresh, and
        // a null-endpoint drop clears stale creds (no push after).
        // Packet-shape / guild-id / user-id filter legs are structural
        // here (serenity-typed voice_state_update / voice_server_update
        // arms): malformed packets never reach the handlers.
        let m = LavalinkManager::new();
        // VSTU leg only: pending noted, gate closed.
        assert!(m
            .note_voice_state(7, Some(9), "sess".to_string())
            .await
            .is_none());
        assert!(m.take_pending_voice(7).await.is_none());
        // VSU leg: token + endpoint fresh -> pushable.
        assert!(m
            .note_voice_server(7, "tok".to_string(), "ep".to_string())
            .await
            .is_some());
        assert!(m.take_pending_voice(7).await.is_some());
        // Null-endpoint packet (TS nulls token/endpoint in the h247
        // session): drop -> gate closed, stale creds never push.
        m.drop_pending_voice(7).await;
        assert!(m.take_pending_voice(7).await.is_none());
        // Leave (channel None, TS null channel_id): noted, gate closed.
        assert!(m
            .note_voice_state(7, None, "sess".to_string())
            .await
            .is_none());
        assert!(m.take_pending_voice(7).await.is_none());
    }

    #[tokio::test]
    async fn player_update_flips_pause_clock_once() {
        // L4: only a real paused flip touches the scrobble clock
        // (mirrors the oldPlayerJson.paused === newPlayer.paused guard).
        let m = LavalinkManager::new();
        m.with_player(44, |p| {
            p.enqueue(sample_track("a"), 0);
        })
        .await;
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 44,
            artist: "a".into(),
            title: "t".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(5),
        })
        .await;
        m.handle_player_update(44, true, 60_000).await;
        assert!(m.snapshot(44).await.unwrap().paused);
        // Repeated pause is a no-op: no double-counted span.
        m.handle_player_update(44, true, 70_000).await;
        // 120s wall, 60s paused -> 60s counted < 100s threshold.
        assert!(m.lastfm_track_end_due(44, 120_000).await.is_none());
        // Unknown guild: no panic, nothing accounted.
        m.handle_player_update(4498, true, 0).await;
    }

    #[tokio::test]
    async fn replaced_end_drops_scrobble_keeps_current() {
        // L5: a replaced-away track never completed -> session dropped
        // with no scrobble, current kept (advance_on_end Kept).
        let m = LavalinkManager::new();
        m.with_player(45, |p| {
            p.enqueue(sample_track("a"), 0);
        })
        .await;
        m.lastfm_track_start(LastfmTrackStart {
            guild_id: 45,
            artist: "artist".into(),
            title: "a".into(),
            duration_ms: 200_000,
            is_stream: false,
            requester: 7,
            now_ms: 0,
            voice_channel: Some(5),
        })
        .await;
        let ev = parse_end(&end_frame("45", "a", "replaced"));
        m.handle_track_end(ev, 150_000).await;
        assert!(m.lastfm_sessions.lock().await.get(&45).is_none());
        // No scrobble payload survived either.
        assert!(m.lastfm_track_end_due(45, 150_000).await.is_none());
        assert_eq!(m.snapshot(45).await.unwrap().current.unwrap().title, "a");
    }

    #[test]
    fn exception_fallback_prefers_current_then_event_track() {
        // L7: recovery identity falls back to the event track when
        // local state drained.
        let cur = sample_track("live");
        let (title, author, requester) =
            LavalinkManager::exception_fallback_parts(Some(&cur), "ev-t", "ev-a");
        assert_eq!(
            (title.as_str(), author.as_str(), requester),
            ("live", "artist", Some(1))
        );
        let (title, author, requester) =
            LavalinkManager::exception_fallback_parts(None, "ev-t", "ev-a");
        assert_eq!(
            (title.as_str(), author.as_str(), requester),
            ("ev-t", "ev-a", None)
        );
    }

    #[tokio::test]
    async fn feed_records_player_update_and_stats() {
        // L4/L10: playerUpdate + stats frames feed node diagnostics.
        let m = LavalinkManager::new();
        m.sync_nodes(&[test_node_cfg()], 9).await;
        let out = m
            .feed_node_ws(
                "n1",
                r#"{"op":"playerUpdate","guildId":"7","state":{"time":1,"position":2,"connected":true,"ping":50}}"#,
                0,
            )
            .await;
        assert_eq!(out, FedWs::PlayerUpdated);
        let out = m
            .feed_node_ws(
                "n1",
                r#"{"op":"stats","players":2,"playingPlayers":1,"uptime":99,"memory":{"free":1,"used":2097152,"allocated":3,"reservable":4},"cpu":{"cores":2,"systemLoad":0.5,"lavalinkLoad":0.1},"frameStats":null}"#,
                0,
            )
            .await;
        assert_eq!(out, FedWs::StatsUpdated);
        // Unknown node id: recorded nowhere, no panic.
        let out = m
            .feed_node_ws("nope", r#"{"op":"stats","players":0}"#, 0)
            .await;
        assert_eq!(out, FedWs::Ignored);
        let hint = m.node_for_guild_hint("7").await.unwrap();
        for want in ["connected=no", "players=1/2", "ping=50ms"] {
            assert!(hint.contains(want), "hint missing {want}: {hint}");
        }
    }

    #[tokio::test]
    async fn ensure_voice_fails_loud_without_channel_or_shard() {
        // L2: no voice channel (or no shard messenger) -> false, so
        // the position-0 leg fails loudly instead of silent no-audio.
        let m = LavalinkManager::new();
        assert!(!m.ensure_voice_connected(777).await);
        m.with_player(778, |p| {
            p.voice_channel = Some(5);
        })
        .await;
        assert!(!m.ensure_voice_connected(778).await);
    }

    #[tokio::test]
    async fn parked_sweep_destroys_node_side_and_rearms() {
        // L8: parked idle -> node destroy, state kept, excluded from
        // the OP4-leave targets, idle clock re-armed.
        let m = LavalinkManager::new();
        m.with_player(46, |p| {
            p.voice_channel = Some(77);
            p.stop(1000);
        })
        .await;
        let at = 1000 + EMPTY_QUEUE_DESTROY_AFTER_MS;
        let mut parked = std::collections::HashSet::new();
        parked.insert(46u64);
        let done = m.sweep_idle_destroy_skipping(&parked, at).await;
        assert!(done.is_empty());
        assert!(m.snapshot(46).await.is_some());
        // Re-armed: not due immediately after, due a full window later.
        assert!(!m.snapshot(46).await.unwrap().current.is_some());
        assert!(m.destroy_due_guilds(at).await.is_empty());
        assert_eq!(
            m.destroy_due_guilds(at + EMPTY_QUEUE_DESTROY_AFTER_MS)
                .await
                .len(),
            1
        );
    }

    #[test]
    fn default_volume_is_75() {
        assert_eq!(DEFAULT_VOLUME, 75);
        assert_eq!(GuildPlayer::new().volume, 75);
    }

    /// Lavalink 4.2.x returns `voice.channelId: null` on player PATCH
    /// responses before the voice handshake completes. The strict
    /// lava-rs `RestPlayer` model requires `channel_id: String`, so
    /// decoding the body strictly fails with "error decoding response
    /// body" — this was the live `/play` queue failure. Player PATCH
    /// helpers therefore ignore the body (`rest_patch_ok`); this test
    /// pins the strict-decode failure so nobody reintroduces it.
    #[test]
    fn lavalink422_null_voice_channel_breaks_strict_player_decode() {
        let body = serde_json::json!({
            "guildId": "1",
            "track": null,
            "volume": 100,
            "paused": false,
            "state": { "time": 1, "position": 2, "connected": false, "ping": 3 },
            "voice": { "token": "", "endpoint": "", "sessionId": "", "channelId": null },
            "filters": {}
        });
        let raw = serde_json::to_vec(&body).expect("fixture serializes");
        assert!(
            serde_json::from_slice::<RestPlayer>(&raw).is_err(),
            "strict RestPlayer decode must keep failing on null channelId"
        );
    }
}
