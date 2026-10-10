use super::*;

/// Leave guard outcome (mockable). Mirrors the two early returns in
/// src/Interaction/HybridCommands/tts/!leave.ts: not-active, then
/// caller-must-be-in-the-TTS-voice-channel.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TtsLeaveGuard {
    NotActive,
    NotInVoice,
    Ready,
}

/// Evaluate the leave guards. `tts` is (enabled, voice_channel_id);
/// `member_voice` is the caller's own voice channel.
pub fn evaluate_tts_leave_guard(
    tts: Option<(bool, u64)>,
    member_voice: Option<u64>,
) -> TtsLeaveGuard {
    let Some((enabled, tts_voice)) = tts else {
        return TtsLeaveGuard::NotActive;
    };
    if !enabled {
        return TtsLeaveGuard::NotActive;
    }
    if member_voice != Some(tts_voice) {
        return TtsLeaveGuard::NotInVoice;
    }
    TtsLeaveGuard::Ready
}

/// Offline leg of cleanupTTS in src/core/modules/ttsManager.ts:
/// drop the player (keeping the voice connection when H24/7 parks the
/// bot in the TTS channel), delete the welcome embed, clear the voice
/// status, delete the row. Gateway/HTTP legs are best-effort.
pub async fn cleanup_tts_live(
    http: &poise::serenity_prelude::Http,
    shard: &poise::serenity_prelude::ShardMessenger,
    pool: &crate::db::Pool,
    guild_id: u64,
    cfg: &TtsConfig,
    h247: Option<&crate::commands::h247::grant::H247Config>,
) {
    let tts_voice = cfg.voice_channel_id.parse::<u64>().unwrap_or_default();
    let keep_voice = tts_keep_voice(h247, tts_voice);
    let mgr = crate::lavalink::manager();
    let _ = mgr.remove_player(guild_id).await;
    if let Ok((node, session)) = mgr.live_node_and_session(guild_id).await {
        let _ = mgr.rest_destroy(&node, &session, guild_id).await;
    }
    if !keep_voice {
        crate::lavalink::LavalinkManager::send_voice_state(shard, guild_id, None);
    }
    // Welcome-embed delete (TS-written rows carry embedMessageId).
    if let Ok(text_id) = cfg.text_channel_id.parse::<u64>() {
        let backend = crate::backends::Backend::sqlite(pool.clone());
        let gid = guild_id.to_string();
        let raw: Option<serde_json::Value> = backend.table(&gid).get(TTS_KEY).await.ok().flatten();
        if let Some(msg_id) = raw
            .as_ref()
            .and_then(|v| v.get("embedMessageId"))
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u64>().ok())
        {
            let _ = poise::serenity_prelude::ChannelId::new(text_id)
                .delete_message(http, poise::serenity_prelude::MessageId::new(msg_id))
                .await;
        }
    }
    if tts_voice != 0 {
        let _ = crate::lavalink::LavalinkManager::clear_voice_status(http, tts_voice).await;
    }
    let _ = delete_tts(pool, &guild_id.to_string()).await;
}

/// Leave the voice channel and disable TTS mode!
#[poise::command(slash_command, prefix_command, rename = "leave", aliases("ttsleave"))]
pub async fn tts_leave(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
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

    let cfg = load_tts(&ctx.data().pool, &gid).await;
    // TS !leave.ts guards on `!ttsData || !ttsData.enabled`: a stored
    // row with `enabled: false` refuses like a missing row.
    let tts = cfg.as_ref().and_then(|c| {
        c.voice_channel_id
            .parse::<u64>()
            .ok()
            .map(|v| (c.enabled, v))
    });
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

    match evaluate_tts_leave_guard(tts, member_voice) {
        TtsLeaveGuard::NotActive => {
            ctx.say(refuse(
                "tts_leave_not_active",
                "The TTS module is not currently active on this server!",
            ))
            .await?;
            return Ok(());
        }
        TtsLeaveGuard::NotInVoice => {
            ctx.say(refuse(
                "tts_leave_not_in_voice",
                "You must be in the TTS voice channel to disable it!",
            ))
            .await?;
            return Ok(());
        }
        TtsLeaveGuard::Ready => {}
    }

    let cfg = cfg.unwrap_or_default();
    let h247_raw = {
        let backend = crate::backends::Backend::sqlite(ctx.data().pool.clone());
        backend
            .table(&gid)
            .get_raw("GUILD.H247")
            .await
            .ok()
            .flatten()
            .map(|v| v.to_string())
    };
    let h247 = h247_raw
        .as_deref()
        .and_then(crate::commands::h247::grant::parse_h247);
    cleanup_tts_live(
        ctx.http(),
        &ctx.serenity_context().shard,
        &ctx.data().pool,
        guild_id.get(),
        &cfg,
        h247.as_ref(),
    )
    .await;

    ctx.say(
        crate::lang::get(&code, "tts_leave_disabled")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| "TTS left and cleaned up.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn not_active_without_row_or_when_disabled() {
        assert_eq!(
            evaluate_tts_leave_guard(None, Some(7)),
            TtsLeaveGuard::NotActive
        );
        assert_eq!(
            evaluate_tts_leave_guard(Some((false, 7)), Some(7)),
            TtsLeaveGuard::NotActive
        );
    }

    #[test]
    fn caller_must_be_in_tts_channel() {
        assert_eq!(
            evaluate_tts_leave_guard(Some((true, 7)), None),
            TtsLeaveGuard::NotInVoice
        );
        assert_eq!(
            evaluate_tts_leave_guard(Some((true, 7)), Some(9)),
            TtsLeaveGuard::NotInVoice
        );
        assert_eq!(
            evaluate_tts_leave_guard(Some((true, 7)), Some(7)),
            TtsLeaveGuard::Ready
        );
    }
}
