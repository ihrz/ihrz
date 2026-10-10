// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Live Flowery TTS speak leg. Mirrors speakTTS +
// prefetchFloweryVoices/getFloweryVoiceMapping in
// src/core/modules/ttsManager.ts, driven by the messageCreate arm in
// src/Events/tts/messageCreate.ts.
//
// Speak infra check (lavalink.rs): no dedicated speak path exists, but
// every primitive speakTTS needs is public — live_node_and_session,
// rest_load (identifier-routed, so `ftts:<query>?voice=<id>` loads
// through the node's ftts source), with_player/enqueue, snapshot,
// rest_play and set_tts_suppressed. This module composes them;
// nothing is blocked.
//
// Limits (documented, need lavalink.rs changes which are out of scope):
// - The TS self-heal recreates the lavalink-client player object with
//   stored voice/text channel ids and awaits connect(). Here the
//   in-memory GuildPlayer entry is ensured via with_player (channels
//   set from the persisted TTS row) and the gateway OP4 join is
//   re-emitted by the caller when no live player snapshot exists.
// - No voice-handshake replay happens here (unlike the H24/7
//   playerCreate leg, which replays the cached credentials): speakTTS
//   itself never resends VOICE_STATE_UPDATE / VOICE_SERVER_UPDATE, so
//   neither does this port.

use std::sync::OnceLock;

/// Flowery voices list endpoint (mirrors getFloweryVoiceMapping).
pub const FLOWERY_VOICES_URL: &str = "https://api.flowery.pw/v1/tts/voices";

fn flowery_cache() -> &'static tokio::sync::Mutex<Option<Vec<super::FloweryVoice>>> {
    static CACHE: OnceLock<tokio::sync::Mutex<Option<Vec<super::FloweryVoice>>>> = OnceLock::new();
    CACHE.get_or_init(|| tokio::sync::Mutex::new(None))
}

/// Warm the Flowery voice cache. Mirrors prefetchFloweryVoices: silent
/// on failure, speakTTS falls back to the default voice.
pub async fn prefetch_flowery_voices() {
    if flowery_cache().lock().await.is_some() {
        return;
    }
    match fetch_flowery_voices().await {
        Ok(voices) => {
            tracing::debug!("tts: cached {} Flowery voices", voices.len());
            *flowery_cache().lock().await = Some(voices);
        }
        Err(e) => {
            tracing::debug!("tts: Flowery prefetch failed, default voice it is: {e:#}");
        }
    }
}

async fn fetch_flowery_voices() -> anyhow::Result<Vec<super::FloweryVoice>> {
    let res = reqwest::Client::new()
        .get(FLOWERY_VOICES_URL)
        .header("User-Agent", "iHorizon-Discord-Bot/1.0")
        .send()
        .await?;
    if !res.status().is_success() {
        anyhow::bail!("Flowery API returned {}", res.status());
    }
    let body: serde_json::Value = res.json().await?;
    let voices = body
        .get("voices")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    Ok(voices
        .iter()
        .filter_map(|v| {
            Some(super::FloweryVoice {
                id: v.get("id")?.as_str()?.to_string(),
                source: v.get("source")?.as_str()?.to_string(),
                lang_code: v.get("language")?.get("code")?.as_str()?.to_string(),
            })
        })
        .collect())
}

/// Cached voice id for a guild locale (None = default voice, like the
/// TS `no voice found ... using default` debug path). Warms the cache
/// inline on first use so speak works even when the ready prefetch
/// has not run yet.
pub async fn flowery_voice_id(locale: &str) -> Option<String> {
    if flowery_cache().lock().await.is_none() {
        match fetch_flowery_voices().await {
            Ok(voices) => *flowery_cache().lock().await = Some(voices),
            Err(_) => return None,
        }
    }
    let guard = flowery_cache().lock().await;
    let voices = guard.as_ref()?;
    super::resolve_flowery_voice_id(voices, locale)
}

/// Percent-encode for the ftts query (mirrors the lyrics/nowplaying
/// encoder; TS uses encodeURIComponent, which leaves
/// `A-Za-z0-9 -_.!~*'()` bare and escapes everything else).
pub fn percent_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// ftts load identifier, mirroring the TS search call:
/// `` `${encodeURIComponent(sanitized)}${voice ? `?voice=${id}` : ""}` ``
/// with `source: "ftts"`, i.e. `ftts:<query>[?voice=<id>]`.
pub fn ftts_identifier(sanitized: &str, voice_id: Option<&str>) -> String {
    let mut id = format!("ftts:{}", percent_encode(sanitized));
    if let Some(v) = voice_id {
        id.push_str("?voice=");
        id.push_str(&percent_encode(v));
    }
    id
}

/// Speak one message in a TTS guild. Mirrors speakTTS: sanitize, skip
/// empties, resolve the Flowery voice (best-effort), load the ftts
/// track, queue it and play when idle. Returns true when a track was
/// queued. The caller performs the OP4 self-heal join first when no
/// live player snapshot exists (see module docs).
pub async fn speak_tts(
    pool: &crate::db::Pool,
    guild_id: u64,
    text: &str,
    locale: &str,
    requester: u64,
) -> anyhow::Result<bool> {
    let sanitized = super::sanitize_tts_text(text);
    if sanitized.is_empty() {
        return Ok(false);
    }
    let Some(cfg) = super::load_tts(pool, &guild_id.to_string()).await else {
        return Ok(false);
    };
    let mgr = crate::lavalink::manager();
    // No handshake replay here (audit V9): speakTTS never resends
    // voice credentials — it relies on createPlayer/connect self-heal
    // (the with_player channel re-attach below plus the caller's OP4
    // join when no live snapshot exists). The cached handshake is
    // replayed only by the H24/7 playerCreate leg.
    let voice_id = flowery_voice_id(locale).await;
    if voice_id.is_some() {
        tracing::debug!(
            "tts: using voice {} for locale {locale}",
            voice_id.as_deref().unwrap_or("")
        );
    } else {
        tracing::debug!("tts: no voice found for locale {locale}, using default");
    }
    let identifier = ftts_identifier(&sanitized, voice_id.as_deref());
    let (node, _) = mgr
        .live_node_and_session(guild_id)
        .await
        .map_err(|e| anyhow::anyhow!("tts has no live node: {e:?}"))?;
    let loaded = mgr
        .rest_load(&node, &identifier)
        .await
        .map_err(|e| anyhow::anyhow!("tts load failed: {e:?}"))?;
    let track = match loaded {
        lava_rs::rest::LoadResult::Track(t) => Some(t),
        lava_rs::rest::LoadResult::Playlist(data) => data.tracks.into_iter().next(),
        lava_rs::rest::LoadResult::Search(mut v) => v.drain(..).next(),
        lava_rs::rest::LoadResult::Empty | lava_rs::rest::LoadResult::Error(_) => None,
    };
    let Some(track) = track else {
        tracing::debug!("tts: no tracks returned for \"{sanitized}\" in guild {guild_id}");
        return Ok(false);
    };
    let queued = crate::lavalink::QueuedTrack::from((&track, requester));
    let voice_channel = cfg.voice_channel_id.parse::<u64>().ok();
    let text_channel = cfg.text_channel_id.parse::<u64>().ok();
    let position = mgr
        .with_player(guild_id, |p| {
            // Self-heal: re-attach the persisted TTS channels (mirrors
            // createPlayer from the TTS state in speakTTS).
            if p.voice_channel.is_none() {
                p.voice_channel = voice_channel;
            }
            if p.text_channel.is_none() {
                p.text_channel = text_channel;
            }
            p.enqueue(queued, crate::commands::context::now_ms())
        })
        .await;
    mgr.set_tts_suppressed(guild_id, true).await;
    // Mirrors `if (!player.playing) await player.play()`: position 0
    // means the track became current on an idle player.
    if position == 0 {
        if let Some(current) = mgr.snapshot(guild_id).await.and_then(|s| s.current) {
            let (node, session) = mgr
                .live_node_and_session(guild_id)
                .await
                .map_err(|e| anyhow::anyhow!("tts has no live node: {e:?}"))?;
            mgr.rest_play(&node, &session, guild_id, &current.encoded, false)
                .await
                .map_err(|e| anyhow::anyhow!("tts play failed: {e:?}"))?;
        }
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ftts_identifier_encodes_query_and_voice() {
        assert_eq!(ftts_identifier("hello world", None), "ftts:hello%20world");
        assert_eq!(
            ftts_identifier("hello world", Some("azure-fr")),
            "ftts:hello%20world?voice=azure-fr"
        );
        // TS encodeURIComponent leaves A-Za-z0-9 and -_.!~*'() bare.
        assert_eq!(ftts_identifier("a-_.~z09", None), "ftts:a-_.~z09");
        assert_eq!(ftts_identifier("a!'()*", None), "ftts:a!'()*");
        assert_eq!(
            ftts_identifier("caf\u{e9} & co", None),
            "ftts:caf%C3%A9%20%26%20co"
        );
    }

    #[test]
    fn percent_encode_matches_ts_encode_uri_component_subset() {
        assert_eq!(percent_encode("abcXYZ019"), "abcXYZ019");
        assert_eq!(percent_encode("-_.~"), "-_.~");
        assert_eq!(percent_encode(" "), "%20");
        assert_eq!(percent_encode("?voice="), "%3Fvoice%3D");
    }
}
