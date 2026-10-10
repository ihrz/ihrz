use super::*;
use poise::serenity_prelude as serenity;

/// One of the four refusal guards of TS !join.ts, in evaluation order:
/// invalid-channel, already-active-same-channel, music-playing,
/// TTS-on-other-channel. Mirrors the early returns in
/// src/Interaction/HybridCommands/h247/!join.ts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum H247JoinGuard {
    InvalidChannel,
    AlreadyActive,
    MusicPlaying,
    TtsActive,
    Ready { keep_tts_connection: bool },
}

/// Inputs for the join guard chain. `tts` is (enabled, voice_channel_id).
pub struct H247JoinState {
    pub channel_is_voice: bool,
    pub h247: Option<(bool, u64)>,
    pub target_channel: u64,
    pub music_playing: bool,
    pub tts: Option<(bool, u64)>,
}

/// Evaluate the four guards in TS order. When TTS runs on the same
/// channel its player owns the voice connection, which surfaces here
/// as Ready { keep_tts_connection: true } (adopt instead of destroy).
pub fn evaluate_h247_join_guards(s: &H247JoinState) -> H247JoinGuard {
    if !s.channel_is_voice {
        return H247JoinGuard::InvalidChannel;
    }
    if let Some((enabled, parked)) = s.h247 {
        if enabled && parked == s.target_channel {
            return H247JoinGuard::AlreadyActive;
        }
    }
    if s.music_playing {
        return H247JoinGuard::MusicPlaying;
    }
    if let Some((enabled, tts_voice)) = s.tts {
        if enabled && tts_voice != s.target_channel {
            return H247JoinGuard::TtsActive;
        }
        if enabled {
            return H247JoinGuard::Ready {
                keep_tts_connection: true,
            };
        }
    }
    H247JoinGuard::Ready {
        keep_tts_connection: false,
    }
}

/// Lang key for each refusal guard. None means proceed.
pub fn h247_join_refusal_key(g: &H247JoinGuard) -> Option<&'static str> {
    match g {
        H247JoinGuard::InvalidChannel => Some("h247_join_invalid_channel"),
        H247JoinGuard::AlreadyActive => Some("h247_join_already_active"),
        H247JoinGuard::MusicPlaying => Some("h247_join_music_playing"),
        H247JoinGuard::TtsActive => Some("h247_join_tts_active"),
        H247JoinGuard::Ready { .. } => None,
    }
}

/// Best-effort raw read of the GUILD.TTS row: (enabled, voice_channel_id).
/// TS rows carry `enabled`; absent flag means enabled (see tts_row_enabled).
async fn load_tts_presence(pool: &crate::db::Pool, guild_id: &str) -> Option<(bool, u64)> {
    let backend = crate::backends::Backend::sqlite(pool.clone());
    let table = backend.table(guild_id);
    let v: Option<serde_json::Value> = match table
        .get::<serde_json::Value>(crate::commands::tts::TTS_KEY)
        .await
    {
        Ok(Some(v)) => Some(v),
        _ => crate::db::kv_get(pool, guild_id, crate::commands::tts::TTS_KEY)
            .await
            .and_then(|s| serde_json::from_str(&s).ok()),
    };
    let v = v?;
    let enabled = match v.get("enabled") {
        Some(e) => e.as_bool().unwrap_or(true),
        None => true,
    };
    let voice = v.get("voiceChannelId")?.as_str()?.parse::<u64>().ok()?;
    Some((enabled, voice))
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "join",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn h247_join(
    ctx: Ctx<'_>,
    #[description = "Voice channel to park in"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let refuse = |key: &str, fallback: &str| {
        crate::lang::get(&code, key)
            .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
            .unwrap_or_else(|| fallback.to_string())
    };

    let target = channel.id.get();
    let stored = load_h247(&ctx.data().pool, &gid).await;
    let h247 = if stored.enabled {
        stored
            .voice_channel_id
            .parse::<u64>()
            .ok()
            .map(|v| (true, v))
    } else {
        None
    };
    // Live music state (lavalink legs stay caller-side; snapshot is local).
    let snapshot = crate::lavalink::manager().snapshot(guild_id.get()).await;
    let music_playing = snapshot
        .as_ref()
        .map(|p| p.current.is_some() && !p.paused)
        .unwrap_or(false);
    let tts = load_tts_presence(&ctx.data().pool, &gid).await;

    match evaluate_h247_join_guards(&H247JoinState {
        channel_is_voice: channel.kind == serenity::ChannelType::Voice,
        h247,
        target_channel: target,
        music_playing,
        tts,
    }) {
        H247JoinGuard::InvalidChannel => {
            ctx.say(refuse(
                "h247_join_invalid_channel",
                "Please provide a valid voice channel!",
            ))
            .await?;
            return Ok(());
        }
        H247JoinGuard::AlreadyActive => {
            let msg = crate::lang::get(&code, "h247_join_already_active")
                .map(|s| {
                    s.replace("${voiceChannel}", &format!("<#{target}>"))
                        .replace("${client.iHorizon_Emojis.No}", &no)
                })
                .unwrap_or_else(|| format!("H247 already active in <#{target}>."));
            ctx.say(msg).await?;
            return Ok(());
        }
        H247JoinGuard::MusicPlaying => {
            ctx.say(refuse(
                "h247_join_music_playing",
                "Music is currently playing on this server.",
            ))
            .await?;
            return Ok(());
        }
        H247JoinGuard::TtsActive => {
            ctx.say(refuse(
                "h247_join_tts_active",
                "The TTS module is currently active in another voice channel.",
            ))
            .await?;
            return Ok(());
        }
        H247JoinGuard::Ready {
            keep_tts_connection,
        } => {
            // When TTS runs on the same channel, its player owns the voice
            // connection: adopt it instead of destroying it.
            if snapshot.is_some() && !keep_tts_connection {
                let mgr = crate::lavalink::manager();
                let _ = mgr.remove_player(guild_id.get()).await;
                if let Ok((node, session)) = mgr.live_node_and_session(guild_id.get()).await {
                    let _ = mgr.rest_destroy(&node, &session, guild_id.get()).await;
                }
            }
            // Real voice join (gateway OP4, mirrors joinH247VoiceChannel)
            // before persisting: the row is stored only after the join.
            crate::lavalink::LavalinkManager::send_voice_state(
                &ctx.serenity_context().shard,
                guild_id.get(),
                Some(target),
            );
            if let Err(e) = save_h247(
                &ctx.data().pool,
                &gid,
                &H247Config {
                    enabled: true,
                    voice_channel_id: target.to_string(),
                },
            )
            .await
            {
                tracing::warn!("h247 join persist failed for {gid}: {e:#}");
                ctx.say(refuse(
                    "h247_join_error",
                    "An error occurred while enabling the H24/7 module.",
                ))
                .await?;
                return Ok(());
            }
        }
    }

    ctx.say(
        crate::lang::get(&code, "h247_joined")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${voiceChannel}", &format!("<#{target}>"))
            })
            .unwrap_or_else(|| format!("H247 parked in <#{target}>.")),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(
        channel_is_voice: bool,
        h247: Option<(bool, u64)>,
        target: u64,
        music_playing: bool,
        tts: Option<(bool, u64)>,
    ) -> H247JoinState {
        H247JoinState {
            channel_is_voice,
            h247,
            target_channel: target,
            music_playing,
            tts,
        }
    }

    #[test]
    fn guard1_invalid_channel_wins() {
        assert_eq!(
            evaluate_h247_join_guards(&state(false, None, 7, false, None)),
            H247JoinGuard::InvalidChannel
        );
        assert_eq!(
            h247_join_refusal_key(&H247JoinGuard::InvalidChannel),
            Some("h247_join_invalid_channel")
        );
    }

    #[test]
    fn guard2_already_active_same_channel() {
        assert_eq!(
            evaluate_h247_join_guards(&state(true, Some((true, 7)), 7, false, None)),
            H247JoinGuard::AlreadyActive
        );
        // Parked elsewhere: proceed (re-park).
        assert_eq!(
            evaluate_h247_join_guards(&state(true, Some((true, 9)), 7, false, None)),
            H247JoinGuard::Ready {
                keep_tts_connection: false
            }
        );
        // Disabled row: proceed.
        assert_eq!(
            evaluate_h247_join_guards(&state(true, Some((false, 7)), 7, false, None)),
            H247JoinGuard::Ready {
                keep_tts_connection: false
            }
        );
    }

    #[test]
    fn guard3_music_playing() {
        assert_eq!(
            evaluate_h247_join_guards(&state(true, None, 7, true, None)),
            H247JoinGuard::MusicPlaying
        );
        assert_eq!(
            h247_join_refusal_key(&H247JoinGuard::MusicPlaying),
            Some("h247_join_music_playing")
        );
    }

    #[test]
    fn guard4_tts_other_channel_refuses_same_channel_adopts() {
        assert_eq!(
            evaluate_h247_join_guards(&state(true, None, 7, false, Some((true, 9)))),
            H247JoinGuard::TtsActive
        );
        assert_eq!(
            evaluate_h247_join_guards(&state(true, None, 7, false, Some((true, 7)))),
            H247JoinGuard::Ready {
                keep_tts_connection: true
            }
        );
        assert_eq!(
            h247_join_refusal_key(&H247JoinGuard::TtsActive),
            Some("h247_join_tts_active")
        );
    }

    #[test]
    fn ready_by_default() {
        assert_eq!(
            evaluate_h247_join_guards(&state(true, None, 7, false, None)),
            H247JoinGuard::Ready {
                keep_tts_connection: false
            }
        );
        assert_eq!(
            h247_join_refusal_key(&H247JoinGuard::Ready {
                keep_tts_connection: false
            }),
            None
        );
    }
}
