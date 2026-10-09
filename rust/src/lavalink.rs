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

use std::collections::{HashMap, VecDeque};
use std::fmt;
use std::sync::{Arc, OnceLock};

use lava_rs::events::{EventDispatcher, TrackEndEvent, TrackEndReason, TrackStartEvent};
use lava_rs::model::{Track, VoiceState};
use lava_rs::rest::{LoadResult, Player as RestPlayer, UpdatePlayerPayload};
use lava_rs::{LavalinkConfig, LavalinkError};
use tokio::sync::{Mutex, RwLock};

/// Mirrors onEmptyQueue.destroyAfterMs in playerManager.ts.
pub const EMPTY_QUEUE_DESTROY_AFTER_MS: i64 = 120_000;

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
            .client_name("ihrz-lava-rs/0.1.0")
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
            volume: 100,
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

    /// Track-end state advance. Loop-track replays on Finished; Replaced
    /// keeps current (node swapped it externally); anything else pops the
    /// next queued track or goes idle (TS onEmptyQueue path).
    pub fn advance_on_end(&mut self, reason: &TrackEndReason, now_ms: i64) -> AdvanceOutcome {
        match reason {
            TrackEndReason::Replaced => AdvanceOutcome::Kept,
            TrackEndReason::Finished if self.loop_mode() == LoopMode::Track => {
                AdvanceOutcome::Replay
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

pub struct LavalinkManager {
    nodes: RwLock<Vec<Arc<NodeEntry>>>,
    players: Mutex<HashMap<u64, GuildPlayer>>,
    pending_voice: Mutex<HashMap<u64, PendingVoice>>,
    dispatcher: Mutex<EventDispatcher>,
    http: reqwest::Client,
}

impl LavalinkManager {
    pub fn new() -> Self {
        Self {
            nodes: RwLock::new(vec![]),
            players: Mutex::new(HashMap::new()),
            pending_voice: Mutex::new(HashMap::new()),
            dispatcher: Mutex::new(EventDispatcher::new()),
            http: reqwest::Client::new(),
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

    /// Deterministic node pick (guild-affine, mirrors least-penalty
    /// routing intent without live stats in the offline path).
    pub async fn node_for(&self, guild_id: u64) -> Option<Arc<NodeEntry>> {
        let nodes = self.nodes.read().await;
        if nodes.is_empty() {
            return None;
        }
        Some(Arc::clone(&nodes[guild_id as usize % nodes.len()]))
    }

    pub async fn set_session(&self, node_id: &str, session: String) {
        let nodes = self.nodes.read().await;
        if let Some(n) = nodes.iter().find(|n| n.id == node_id) {
            n.set_session(session).await;
        }
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

    /// Incoming WS TrackStart: refresh current from the node payload and
    /// fan out to registered callbacks (mirrors playerManager trackStart).
    pub async fn handle_track_start(&self, ev: TrackStartEvent) {
        if let Ok(gid) = ev.guild_id.parse::<u64>() {
            let mut players = self.players.lock().await;
            let p = players.entry(gid).or_insert_with(GuildPlayer::new);
            p.current = Some(QueuedTrack::from((&ev.track, 0)));
            p.idle_since_ms = None;
            p.paused = false;
        }
        self.dispatcher.lock().await.dispatch_track_start(ev).await;
    }

    /// Incoming WS TrackEnd: advance state per reason, fan out, and when
    /// live push the next track to the node (queue auto-advance).
    pub async fn handle_track_end(&self, ev: TrackEndEvent, now_ms: i64) {
        let next_encoded: Option<(Arc<NodeEntry>, String, String)> = {
            let gid = ev.guild_id.parse::<u64>().ok();
            let mut players = self.players.lock().await;
            if let Some(gid) = gid {
                if let Some(p) = players.get_mut(&gid) {
                    match p.advance_on_end(&ev.reason, now_ms) {
                        AdvanceOutcome::Next => {
                            let enc = p.current.as_ref().map(|t| t.encoded.clone());
                            let node = self.node_for(gid).await;
                            match (node, enc) {
                                (Some(n), Some(e)) => {
                                    let sess = n.session().await;
                                    sess.map(|s| (n, s, e))
                                }
                                _ => None,
                            }
                        }
                        _ => None,
                    }
                } else {
                    None
                }
            } else {
                None
            }
        };
        if let Some((node, session, encoded)) = next_encoded {
            let gid = ev.guild_id.parse::<u64>().unwrap_or(0);
            let _ = self.rest_play(&node, &session, gid, &encoded, false).await;
        }
        self.dispatcher.lock().await.dispatch_track_end(ev).await;
    }

    // ---- voice handshake (mirrors raw.ts) ----

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

    // ---- player state access ----

    pub async fn with_player<R>(&self, guild_id: u64, f: impl FnOnce(&mut GuildPlayer) -> R) -> R {
        let mut players = self.players.lock().await;
        f(players.entry(guild_id).or_insert_with(GuildPlayer::new))
    }

    pub async fn snapshot(&self, guild_id: u64) -> Option<PlayerSnapshot> {
        let players = self.players.lock().await;
        players.get(&guild_id).map(PlayerSnapshot::from)
    }

    // ---- high-level flows used by music/ commands ----

    pub async fn live_node_and_session(
        &self,
        guild_id: u64,
    ) -> Result<(Arc<NodeEntry>, String), MusicError> {
        let node = self.node_for(guild_id).await.ok_or(MusicError::NoNodes)?;
        let session = node
            .session()
            .await
            .ok_or_else(|| MusicError::NoSession(node.id.clone()))?;
        Ok((node, session))
    }

    /// Resolve + enqueue. Returns (position, track title): position 0
    /// means it started playing immediately.
    pub async fn play_query(
        &self,
        guild_id: u64,
        query: &str,
        requester: u64,
        now_ms: i64,
    ) -> Result<(usize, QueuedTrack), MusicError> {
        let (node, session) = self.live_node_and_session(guild_id).await?;
        let loaded = self
            .rest_load(&node, &Self::search_identifier(query))
            .await?;
        let mut tracks: Vec<Track> = match loaded {
            LoadResult::Track(t) => vec![t],
            LoadResult::Playlist(data) => data.tracks,
            LoadResult::Search(mut v) => {
                if v.is_empty() {
                    return Err(MusicError::NoMatches);
                }
                vec![v.remove(0)]
            }
            LoadResult::Empty => return Err(MusicError::NoMatches),
            LoadResult::Error(e) => {
                return Err(MusicError::Rest(422, e.message));
            }
        };
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
            if let Some(current) = self.snapshot(guild_id).await.and_then(|s| s.current) {
                let _ = self
                    .rest_play(&node, &session, guild_id, &current.encoded, false)
                    .await?;
            }
        }
        Ok((position, title))
    }
}

impl Default for LavalinkManager {
    fn default() -> Self {
        Self::new()
    }
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
#[derive(Debug, Clone)]
pub struct PlayerSnapshot {
    pub current: Option<QueuedTrack>,
    pub queue: Vec<QueuedTrack>,
    pub loop_mode: LoopMode,
    pub volume: u8,
    pub paused: bool,
}

impl From<&GuildPlayer> for PlayerSnapshot {
    fn from(p: &GuildPlayer) -> Self {
        Self {
            current: p.current.clone(),
            queue: p.queue.iter().cloned().collect(),
            loop_mode: p.loop_mode(),
            volume: p.volume,
            paused: p.paused,
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
}
