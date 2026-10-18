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

/// Voice-only channel predicate. Mirrors fetchH247VoiceChannel in
/// src/core/modules/h247Manager.ts (`channel.type !==
/// ChannelType.GuildVoice` returns null): only plain voice channels
/// are joinable — Stage channels (ChannelType::Stage) are rejected,
/// even though they are voice-adjacent. The poise
/// `#[channel_types("Voice")]` filter already narrows slash input;
/// this predicate covers the prefix path and the guard unit seam.
pub fn h247_joinable_channel(kind: &serenity::ChannelType) -> bool {
    *kind == serenity::ChannelType::Voice
}

/// Parse a raw prefix channel token (`<#id>` mention or bare id) into
/// a channel id. Returns None for anything else (names, garbage).
/// Shared with the voicedashboard lobby prefix head, which enforces
/// the same TS-decl channel type on prefix.
pub fn prefix_channel_token_id(token: &str) -> Option<u64> {
    let stripped: String = token
        .chars()
        .filter(|c| !matches!(c, '<' | '>' | '#'))
        .collect();
    if stripped.is_empty() || !stripped.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    stripped.parse::<u64>().ok()
}

/// Verdict of the prefix channel gate for `h247 join`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum H247PrefixGate {
    /// No token at all: caret usage embed (prod: bare `+h247 join`).
    Missing,
    /// Token resolves to a cached non-voice channel: caret usage embed
    /// flagging the offending token (prod: `+h247 join <#text>`).
    WrongType(String),
    /// Token is not a resolvable channel id: fall through to the
    /// handler invalid-channel content leg (precedented match).
    Fallthrough,
    /// Token resolves to a cached voice channel: run the handler.
    Proceed,
}

/// Classify the first raw prefix token against the cached guild
/// channels `(id, is_voice)`. Mirrors the TS framework gate prod
/// enforces on `+h247 join` (h247.ts: `channel` required GuildVoice):
/// HZ93 live shows bare AND text-channel-mention inputs both answer
/// `+join [channel]` caret usage, never the handler content leg.
pub fn h247_prefix_gate(token: Option<&str>, channels: &[(u64, bool)]) -> H247PrefixGate {
    let Some(token) = token else {
        return H247PrefixGate::Missing;
    };
    let Some(id) = prefix_channel_token_id(token) else {
        return H247PrefixGate::Fallthrough;
    };
    match channels.iter().find(|(cid, _)| *cid == id) {
        Some((_, true)) => H247PrefixGate::Proceed,
        Some((_, false)) => H247PrefixGate::WrongType(token.to_string()),
        None => H247PrefixGate::Fallthrough,
    }
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

/// Bot permission gate for the join. Mirrors the Connect + Speak
/// `permissionsIn` check inside joinH247VoiceChannel: without both,
/// the join is refused (TS surfaces it as a failed join). Like
/// discord.js `has()`, ADMINISTRATOR implies every permission.
pub fn h247_bot_may_join(perms: serenity::Permissions) -> bool {
    perms.contains(serenity::Permissions::ADMINISTRATOR)
        || (perms.contains(serenity::Permissions::CONNECT)
            && perms.contains(serenity::Permissions::SPEAK))
}

/// Connect confirm for the join. Mirrors waitForH247VoiceConnection:
/// poll the cached bot voice state (up to 8 x 300ms) for the parked
/// channel before persisting.
pub async fn confirm_h247_join(
    cache: &std::sync::Arc<serenity::Cache>,
    guild_id: serenity::GuildId,
    bot_id: serenity::UserId,
    target: u64,
) -> bool {
    for _ in 0..crate::voice::H247_JOIN_CONFIRM_ATTEMPTS {
        tokio::time::sleep(std::time::Duration::from_millis(
            crate::voice::H247_JOIN_CONFIRM_INTERVAL_MS as u64,
        ))
        .await;
        let parked = cache
            .guild(guild_id)
            .and_then(|g| g.voice_states.get(&bot_id).cloned())
            .and_then(|v| v.channel_id)
            .map(|c| c.get());
        if parked == Some(target) {
            return true;
        }
    }
    false
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

/// Join the voice channel and park iHorizon 24/7!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "join",
    default_member_permissions = "ADMINISTRATOR",
    name_localized("fr", "rejoindre"),
    name_localized("ja", "join"),
    name_localized("ru", "join"),
    name_localized("es-ES", "join"),
    description_localized("fr", "Garer iHorizon 24/7 dans un salon vocal!"),
    description_localized("ja", "iHorizonをボイスチャンネルに常駐させます！"),
    description_localized("ru", "Оставить iHorizon 24/7 в голосовом канале!"),
    description_localized("es-ES", "¡Estacionar a iHorizon 24/7 en un canal de voz!")
)]
pub async fn h247_join(
    ctx: Ctx<'_>,
    // Optional so the prefix leg can receive no channel or garbage like
    // TS `!join.ts` (`voiceChannel(interaction, args!, 0)` may resolve
    // null). The prefix head above diverts the missing and
    // resolvable-but-non-voice cases to the caret usage embed (prod);
    // only unresolvable input reaches the `h247_join_invalid_channel`
    // content leg below. Slash callers must still pass the channel
    // (TS declares the option `required: true`).
    // PREFIX NARROWING: TS `voiceChannel` also fuzzy-matches the raw arg
    // against voice-channel names (`similarity(arg, name) >= 0.6` over
    // GuildVoice + Stage). Poise parses this `GuildChannel` arg from a
    // mention/ID only, so a bare channel name never resolves here — that
    // fuzzy-name leg is narrowed, not ported. The algorithm itself lives
    // on as `crate::funcs_resolve::resolve_voice_channel` (mention/ID
    // first, then the same `>= 0.6` fuzzy-name fallback) for any future
    // prefix-string wiring.
    #[name_localized("fr", "salon")]
    #[name_localized("ja", "channel")]
    #[name_localized("ru", "channel")]
    #[name_localized("es-ES", "canal")]
    #[description_localized("fr", "Le salon vocal où iHorizon restera!")]
    #[description_localized("ja", "iHorizonが常駐するボイスチャンネル！")]
    #[description_localized("ru", "Голосовой канал, где останется iHorizon!")]
    #[description_localized("es-ES", "¡El canal de voz donde se quedará iHorizon!")]
    #[description = "The voice channel where iHorizon will stay!"]
    #[rename = "channel"]
    #[channel_types("Voice")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    // Prefix checkCommandArgs head (see h247_prefix_gate): the TS
    // framework validates the required GuildVoice option before the
    // handler runs. Missing and resolvable-but-non-voice inputs answer
    // the caret usage embed like prod; only unresolvable garbage falls
    // through to the handler invalid-channel content leg.
    if let poise::Context::Prefix(pctx) = ctx {
        let tokens = crate::bot::prefix_args::split_caret_args(pctx.args);
        let snapshot: Vec<(u64, bool)> = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| {
                g.channels
                    .iter()
                    .map(|(id, c)| (id.get(), h247_joinable_channel(&c.kind)))
                    .collect()
            })
            .unwrap_or_default();
        match h247_prefix_gate(tokens.first().map(String::as_str), &snapshot) {
            H247PrefixGate::Proceed | H247PrefixGate::Fallthrough => {}
            H247PrefixGate::Missing => {
                crate::bot::prefix_usage_denial(ctx, None).await;
                return Ok(());
            }
            H247PrefixGate::WrongType(tok) => {
                crate::bot::prefix_usage_denial(ctx, Some(tok)).await;
                return Ok(());
            }
        }
    }
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

    // Mirrors `!join.ts:45-54` (`if (!channel || channel.type !== GuildVoice)`).
    let Some(channel) = channel else {
        ctx.say(refuse(
            "h247_join_invalid_channel",
            "Please provide a valid voice channel!",
        ))
        .await?;
        return Ok(());
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
    // Paused counts as playing: lavalink-client `pause()` sets
    // `paused = true` while keeping `playing = true`, so the TS
    // `player?.playing` guard refuses while paused too.
    let snapshot = crate::lavalink::manager().snapshot(guild_id.get()).await;
    let music_playing = snapshot
        .as_ref()
        .map(|p| p.current.is_some())
        .unwrap_or(false);
    let tts = load_tts_presence(&ctx.data().pool, &gid).await;

    match evaluate_h247_join_guards(&H247JoinState {
        channel_is_voice: h247_joinable_channel(&channel.kind),
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
            // Permission gate (mirrors the Connect + Speak
            // permissionsIn check in joinH247VoiceChannel): without
            // both, the join fails like TS. Owned snapshot first: the
            // cache guard is not Send and must drop before any await.
            let bot_id = ctx.serenity_context().cache.current_user().id;
            let may_join = ctx
                .serenity_context()
                .cache
                .guild(guild_id)
                .and_then(|g| {
                    let me = g.members.get(&bot_id)?.clone();
                    Some(h247_bot_may_join(g.user_permissions_in(&channel, &me)))
                })
                .unwrap_or(false);
            if !may_join {
                ctx.say(refuse(
                    "h247_join_error",
                    "An error occurred while enabling the H24/7 module.",
                ))
                .await?;
                return Ok(());
            }
            // Real voice join (gateway OP4, mirrors joinH247VoiceChannel).
            crate::lavalink::LavalinkManager::send_voice_state(
                &ctx.serenity_context().shard,
                guild_id.get(),
                Some(target),
            );
            // Connect confirm before persisting (mirrors
            // waitForH247VoiceConnection): the row is stored only after
            // the bot is observed in the channel.
            if !confirm_h247_join(&ctx.serenity_context().cache, guild_id, bot_id, target).await {
                tracing::warn!("h247 join for {gid} got no voice state for channel {target}");
                ctx.say(refuse(
                    "h247_join_error",
                    "An error occurred while enabling the H24/7 module.",
                ))
                .await?;
                return Ok(());
            }
            crate::commands::h247::session::prime_session(guild_id.get(), target).await;
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
    fn joinable_channel_is_voice_only() {
        use super::serenity::ChannelType;
        assert!(h247_joinable_channel(&ChannelType::Voice));
        // Stage (and everything else TS would null out) is rejected.
        assert!(!h247_joinable_channel(&ChannelType::Stage));
        assert!(!h247_joinable_channel(&ChannelType::Text));
        assert!(!h247_joinable_channel(&ChannelType::Category));
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

    #[test]
    fn perm_gate_needs_connect_and_speak() {
        use super::serenity::Permissions as P;
        assert!(h247_bot_may_join(P::CONNECT | P::SPEAK));
        // discord.js has() implies everything under ADMINISTRATOR.
        assert!(h247_bot_may_join(P::ADMINISTRATOR));
        assert!(!h247_bot_may_join(P::CONNECT));
        assert!(!h247_bot_may_join(P::SPEAK));
        assert!(!h247_bot_may_join(P::empty()));
    }

    #[test]
    fn prefix_token_id_parses_mention_and_bare_id() {
        assert_eq!(prefix_channel_token_id("<#123>"), Some(123));
        assert_eq!(prefix_channel_token_id("123"), Some(123));
        assert_eq!(prefix_channel_token_id("cmd-1"), None);
        assert_eq!(prefix_channel_token_id(""), None);
        assert_eq!(prefix_channel_token_id("<@123>"), None);
    }

    #[test]
    fn prefix_gate_matrix_matches_prod() {
        // (id, is_voice) snapshot: 7 = voice, 9 = text.
        let snap = [(7u64, true), (9u64, false)];
        // Bare input: caret usage (prod `+h247 join`).
        assert_eq!(h247_prefix_gate(None, &snap), H247PrefixGate::Missing);
        // Resolvable non-voice mention: caret usage on the token
        // (prod `+h247 join <#text>`).
        assert_eq!(
            h247_prefix_gate(Some("<#9>"), &snap),
            H247PrefixGate::WrongType("<#9>".to_string())
        );
        // Voice mention: handler runs.
        assert_eq!(
            h247_prefix_gate(Some("<#7>"), &snap),
            H247PrefixGate::Proceed
        );
        // Unresolvable garbage or unknown id: handler content leg.
        assert_eq!(
            h247_prefix_gate(Some("nope"), &snap),
            H247PrefixGate::Fallthrough
        );
        assert_eq!(
            h247_prefix_gate(Some("<#555>"), &snap),
            H247PrefixGate::Fallthrough
        );
    }
}
