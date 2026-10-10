use super::*;
use poise::serenity_prelude as serenity;

/// One of the five refusal guards of TS !join.ts, in evaluation order:
/// not-in-voice, not-text-based, already-enabled, music-playing,
/// H24/7-mismatch. Mirrors the early returns in
/// src/Interaction/HybridCommands/tts/!join.ts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum JoinGuard {
    NotInVoice,
    NotTextBased,
    AlreadyEnabled,
    MusicPlaying,
    H247Mismatch,
    Ready { needs_cleanup: bool },
}

/// Inputs for the join guard chain. `member_voice` is the caller's own
/// voice channel (member-voice source, never a slash option); `tts_enabled`
/// is row presence; `player_connected` is the live player state;
/// `music_playing` is the live music state; `h247` is
/// (enabled, voice_channel_id).
pub struct JoinState {
    pub member_voice: Option<u64>,
    pub text_based: bool,
    pub tts_enabled: bool,
    pub player_connected: bool,
    pub music_playing: bool,
    pub h247: Option<(bool, u64)>,
}

/// Evaluate the five guards in TS order. When TTS is already stored but
/// the player is gone, TS runs cleanupTTS and continues, which surfaces
/// here as Ready { needs_cleanup: true }.
pub fn evaluate_join_guards(s: &JoinState) -> JoinGuard {
    let voice = match s.member_voice {
        Some(v) => v,
        None => return JoinGuard::NotInVoice,
    };
    if !s.text_based {
        return JoinGuard::NotTextBased;
    }
    if s.tts_enabled {
        if s.player_connected {
            return JoinGuard::AlreadyEnabled;
        }
        // Fall through to Ready with cleanup (mirrors cleanupTTS leg).
        if s.music_playing {
            return JoinGuard::MusicPlaying;
        }
        if let Some((enabled, h247_voice)) = s.h247 {
            if enabled && voice != h247_voice {
                return JoinGuard::H247Mismatch;
            }
        }
        return JoinGuard::Ready {
            needs_cleanup: true,
        };
    }
    if s.music_playing {
        return JoinGuard::MusicPlaying;
    }
    if let Some((enabled, h247_voice)) = s.h247 {
        if enabled && voice != h247_voice {
            return JoinGuard::H247Mismatch;
        }
    }
    JoinGuard::Ready {
        needs_cleanup: false,
    }
}

/// Lang key for each refusal guard. None means proceed.
pub fn join_refusal_key(g: &JoinGuard) -> Option<&'static str> {
    match g {
        JoinGuard::NotInVoice => Some("tts_join_not_in_voice"),
        JoinGuard::NotTextBased => Some("tts_join_not_text_based"),
        JoinGuard::AlreadyEnabled => Some("tts_join_already_enabled"),
        JoinGuard::MusicPlaying => Some("tts_join_music_playing"),
        JoinGuard::H247Mismatch => Some("h247_tts_refused"),
        JoinGuard::Ready { .. } => None,
    }
}

/// Table-first read of the GUILD.H247 row for the park guard.
async fn load_h247_raw(pool: &crate::db::Pool, guild_id: &str) -> Option<String> {
    let backend = crate::backends::Backend::sqlite(pool.clone());
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>("GUILD.H247").await {
        return match v {
            serde_json::Value::String(s) => Some(s),
            other => Some(other.to_string()),
        };
    }
    crate::db::kv_get(pool, guild_id, "GUILD.H247").await
}

/// Join the voice channel and enable TTS mode!
#[poise::command(slash_command, prefix_command, rename = "join")]
pub async fn tts_join(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
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

    // Guard 1 source: the caller's own voice state (never a slash option).
    let member_voice = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| {
            g.voice_states
                .get(&ctx.author().id)
                .and_then(|v| v.channel_id)
        })
        .map(|c| c.get());
    // Guard 2: text-in-voice support. Serenity has no isTextBased flag;
    // Stage channels never carry text chat, Voice kinds do.
    let text_based = match member_voice {
        Some(id) => match serenity::ChannelId::new(id).to_channel(ctx.http()).await {
            Ok(serenity::Channel::Guild(g)) => !matches!(g.kind, serenity::ChannelType::Stage),
            Ok(_) => true,
            Err(_) => true,
        },
        None => true,
    };
    // Guard 3 inputs: stored TTS row plus the live lavalink snapshot.
    // TS !join.ts refuses only when `existingTTS && existingTTS.enabled`
    // (getTTSData already nulls disabled rows), so a stored row with
    // `enabled: false` behaves like no row: no refusal, no cleanup.
    // A stored row with no live session takes the cleanup path; a stored
    // row with a live voice session refuses.
    let tts_enabled = load_tts(&ctx.data().pool, &gid)
        .await
        .map(|c| c.enabled)
        .unwrap_or(false);
    let player_snapshot = crate::lavalink::manager().snapshot(guild_id.get()).await;
    let player_connected = player_snapshot
        .as_ref()
        .map(|p| p.voice_channel.is_some())
        .unwrap_or(false);
    // Guard 4: live music state (any current track; paused counts as
    // playing because lavalink-client `pause()` keeps `playing = true`,
    // so the TS `musicPlayer.playing` guard refuses while paused too).
    let music_playing = player_snapshot
        .as_ref()
        .map(|p| p.current.is_some())
        .unwrap_or(false);
    // Guard 5: H24/7 park mismatch.
    let h247 = load_h247_raw(&ctx.data().pool, &gid)
        .await
        .and_then(|raw| crate::commands::h247::grant::parse_h247(&raw))
        .map(|h| (h.enabled, h.voice_channel_id));

    match evaluate_join_guards(&JoinState {
        member_voice,
        text_based,
        tts_enabled,
        player_connected,
        music_playing,
        h247,
    }) {
        JoinGuard::NotInVoice => {
            ctx.say(refuse(
                "tts_join_not_in_voice",
                "You must be connected to a voice channel to use this command!",
            ))
            .await?;
            return Ok(());
        }
        JoinGuard::NotTextBased => {
            ctx.say(refuse(
                "tts_join_not_text_based",
                "This voice channel does not support text messages.",
            ))
            .await?;
            return Ok(());
        }
        JoinGuard::AlreadyEnabled => {
            ctx.say(refuse(
                "tts_join_already_enabled",
                "The TTS module is already enabled on this server!",
            ))
            .await?;
            return Ok(());
        }
        JoinGuard::MusicPlaying => {
            ctx.say(refuse(
                "tts_join_music_playing",
                "Music is currently playing on this server.",
            ))
            .await?;
            return Ok(());
        }
        JoinGuard::H247Mismatch => {
            ctx.say(refuse(
                "h247_tts_refused",
                "The H24/7 module is active on this server.",
            ))
            .await?;
            return Ok(());
        }
        JoinGuard::Ready { needs_cleanup } => {
            if needs_cleanup {
                let _ = delete_tts(&ctx.data().pool, &gid).await;
            }
        }
    }

    // Live join leg (mirrors createPlayer + connect + voice status +
    // welcome embed in TS !join.ts). TS stores textChannelId =
    // voiceChannelId (the voice channel itself).
    let voice_id = member_voice.unwrap_or_default();
    let tts_lang = crate::lang::get(&code, "tts_join_lang_fallback")
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "en-US".to_string());

    let live: anyhow::Result<()> = async {
        // Create/connect the player: gateway OP4 join + local state.
        crate::lavalink::LavalinkManager::send_voice_state(
            &ctx.serenity_context().shard,
            guild_id.get(),
            Some(voice_id),
        );
        crate::lavalink::manager()
            .with_player(guild_id.get(), |p| {
                p.voice_channel = Some(voice_id);
                p.text_channel = Some(voice_id);
            })
            .await;
        // Voice-channel status (mirrors changeVoiceChannelStatus).
        let status = crate::lang::get(&code, "tts_voice_status")
            .unwrap_or_else(|| "TTS Mode - Text-to-Speech".to_string());
        let _ = ctx
            .http()
            .edit_voice_status(
                serenity::ChannelId::new(voice_id),
                &serde_json::json!({ "status": status }),
                None,
            )
            .await;
        // Welcome embed posted into the voice channel; its id is
        // persisted as embedMessageId (mirrors sendTTSWelcomeEmbed).
        let members: Vec<String> = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                g.voice_states
                    .iter()
                    .filter(|(_, v)| v.channel_id.map(|c| c.get()) == Some(voice_id))
                    .map(|(u, _)| format!("<@{u}>"))
                    .collect()
            })
            .unwrap_or_default();
        let embed = serenity::CreateEmbed::new()
            .color(0x5865F2)
            .title(
                crate::lang::get(&code, "tts_embed_title")
                    .unwrap_or_else(|| "TTS Mode Activated".to_string()),
            )
            .description(
                crate::lang::get(&code, "tts_embed_description")
                    .map(|s| {
                        let members = if members.is_empty() {
                            crate::lang::get(&code, "var_none")
                                .unwrap_or_else(|| "None".to_string())
                        } else {
                            members.join(", ")
                        };
                        s.replace("${voiceChannel}", &format!("<#{voice_id}>"))
                            .replace("${members}", &members)
                    })
                    .unwrap_or_else(|| format!("TTS active in <#{voice_id}>.")),
            )
            .footer(serenity::CreateEmbedFooter::new(
                crate::lang::get(&code, "tts_embed_footer")
                    .unwrap_or_else(|| "Use /tts leave to stop TTS".to_string()),
            ))
            .timestamp(serenity::Timestamp::now());
        let embed_message_id = serenity::ChannelId::new(voice_id)
            .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
            .await
            .map(|m| m.id.get().to_string())
            .unwrap_or_default();
        // Persist with embedMessageId + enabled flag (TS row shape;
        // load_tts ignores the extras, tts_embed_ids reads them back).
        let row = serde_json::json!({
            "enabled": true,
            "textChannelId": voice_id.to_string(),
            "voiceChannelId": voice_id.to_string(),
            "embedMessageId": embed_message_id,
            "lang": tts_lang,
        });
        crate::backends::Backend::sqlite(ctx.data().pool.clone())
            .table(gid.clone())
            .set(TTS_KEY, row)
            .await?;
        Ok(())
    }
    .await;

    if let Err(e) = live {
        tracing::warn!("tts join failed for {gid}: {e:#}");
        ctx.say(refuse(
            "tts_join_error",
            "An error occurred while enabling TTS mode.",
        ))
        .await?;
        return Ok(());
    }
    ctx.say(
        crate::lang::get(&code, "tts_join_enabled")
            .map(|s| {
                s.replace("${voiceChannel}", &format!("<#{voice_id}>"))
                    .replace("${client.iHorizon_Emojis.Yes}", &yes)
            })
            .unwrap_or_else(|| "TTS joined.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(
        member_voice: Option<u64>,
        text_based: bool,
        tts_enabled: bool,
        player_connected: bool,
        music_playing: bool,
        h247: Option<(bool, u64)>,
    ) -> JoinState {
        JoinState {
            member_voice,
            text_based,
            tts_enabled,
            player_connected,
            music_playing,
            h247,
        }
    }

    #[test]
    fn guard1_not_in_voice_wins() {
        assert_eq!(
            evaluate_join_guards(&state(None, true, false, false, false, None)),
            JoinGuard::NotInVoice
        );
        assert_eq!(
            join_refusal_key(&JoinGuard::NotInVoice),
            Some("tts_join_not_in_voice")
        );
    }

    #[test]
    fn guard2_not_text_based() {
        assert_eq!(
            evaluate_join_guards(&state(Some(7), false, false, false, false, None)),
            JoinGuard::NotTextBased
        );
        assert_eq!(
            join_refusal_key(&JoinGuard::NotTextBased),
            Some("tts_join_not_text_based")
        );
    }

    #[test]
    fn guard3_already_enabled_needs_live_player() {
        // Stored row + live player: refuse.
        assert_eq!(
            evaluate_join_guards(&state(Some(7), true, true, true, false, None)),
            JoinGuard::AlreadyEnabled
        );
        // Stored row, player gone: cleanup path, then proceed.
        assert_eq!(
            evaluate_join_guards(&state(Some(7), true, true, false, false, None)),
            JoinGuard::Ready {
                needs_cleanup: true
            }
        );
        assert_eq!(
            join_refusal_key(&JoinGuard::AlreadyEnabled),
            Some("tts_join_already_enabled")
        );
    }

    #[test]
    fn guard4_music_playing() {
        assert_eq!(
            evaluate_join_guards(&state(Some(7), true, false, false, true, None)),
            JoinGuard::MusicPlaying
        );
        assert_eq!(
            join_refusal_key(&JoinGuard::MusicPlaying),
            Some("tts_join_music_playing")
        );
    }

    #[test]
    fn guard5_h247_mismatch() {
        // Parked elsewhere: refuse.
        assert_eq!(
            evaluate_join_guards(&state(Some(7), true, false, false, false, Some((true, 9)))),
            JoinGuard::H247Mismatch
        );
        // Same channel or disabled: proceed.
        assert_eq!(
            evaluate_join_guards(&state(Some(7), true, false, false, false, Some((true, 7)))),
            JoinGuard::Ready {
                needs_cleanup: false
            }
        );
        assert_eq!(
            evaluate_join_guards(&state(Some(7), true, false, false, false, Some((false, 9)))),
            JoinGuard::Ready {
                needs_cleanup: false
            }
        );
        assert_eq!(
            join_refusal_key(&JoinGuard::H247Mismatch),
            Some("h247_tts_refused")
        );
    }

    #[test]
    fn ready_needs_no_cleanup_by_default() {
        assert_eq!(
            evaluate_join_guards(&state(Some(7), true, false, false, false, None)),
            JoinGuard::Ready {
                needs_cleanup: false
            }
        );
        assert_eq!(
            join_refusal_key(&JoinGuard::Ready {
                needs_cleanup: false
            }),
            None
        );
    }

    #[test]
    fn member_voice_is_the_channel_source() {
        // A slash-option channel must never override the member's voice:
        // None always refuses even when every other guard would pass.
        let g = evaluate_join_guards(&state(None, true, false, false, false, Some((false, 1))));
        assert_eq!(g, JoinGuard::NotInVoice);
    }
}
