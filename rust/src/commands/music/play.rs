use super::*;

/// Mirrors `!play.ts` + `handleMusicPlay`.
#[poise::command(slash_command, prefix_command, rename = "play", aliases("p"))]
pub async fn m_play(
    ctx: Ctx<'_>,
    #[description = "Title or URL"] title: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let voice = voice_channel_of(&ctx);
    let Some(voice) = voice else {
        say_key(
            &ctx,
            &code,
            "p_not_in_voice_channel",
            "You must be connected to a voice channel to use this command!",
        )
        .await?;
        return Ok(());
    };
    if (title.contains("://") || title.contains("www.")) && !crate::funcs::is_allowed_links(&title)
    {
        say_key(
            &ctx,
            &code,
            "p_not_allowed",
            "The link you sent is not supported by this bot. Please use authorized music streaming services such as Deezer, Spotify, Soundcloud, etc.",
        )
        .await?;
        return Ok(());
    }
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    // TS only enforces same-channel once the bot is in voice.
    if let Some(bot) = bot_voice_channel(&ctx, gid, snap.as_ref().and_then(|s| s.voice_channel)) {
        if guard_same_voice(&ctx, &code, Some(voice), Some(bot)).await {
            return Ok(());
        }
    }
    // H247 guard (mirrors musicPlay.ts:792-806): refuse play when 24/7
    // is enabled and the requester is not in the parked voice channel.
    let gid_str = gid.to_string();
    let h247 = crate::commands::h247::load_h247(&ctx.data().pool, &gid_str).await;
    let h247_voice = if h247.enabled {
        h247.voice_channel_id.parse::<u64>().ok()
    } else {
        None
    };
    if h247_refuses(h247.enabled, h247_voice, Some(voice)) {
        let no = emoji_markup(&ctx, "No", "❌").await;
        let msg = crate::lang::get(&code, "h247_play_refused")
            .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
            .unwrap_or_else(|| {
                "The H24/7 module is active on this server. Join the H24/7 voice channel to play music!"
                    .to_string()
            });
        ctx.say(msg).await?;
        return Ok(());
    }
    // TTS cleanup before playing (mirrors musicPlay.ts:807-810
    // `getTTSData`/`cleanupTTS`): a stored TTS row means the module
    // owns the player, so run the full cleanup legs (drop player,
    // welcome-embed delete, voice-status clear, row delete).
    if let Some(tts_cfg) = crate::commands::tts::load_tts(&ctx.data().pool, &gid_str).await {
        let h247_grant = crate::db::kv_get(&ctx.data().pool, &gid_str, "GUILD.H247")
            .await
            .and_then(|raw| crate::commands::h247::grant::parse_h247(&raw));
        crate::commands::tts::leave::cleanup_tts_live(
            ctx.http(),
            &ctx.serenity_context().shard,
            &ctx.data().pool,
            gid,
            &tts_cfg,
            h247_grant.as_ref(),
        )
        .await;
        m.set_tts_suppressed(gid, false).await;
    }
    let requester = ctx.author().id.get();
    let text_channel = ctx.channel_id().get();
    // Stage channels join suppressed (audience): ask for speaker, and
    // refuse the play when the bot cannot be unsuppressed (the TS
    // side has no stage branch and would play to nobody).
    let is_stage = ctx
        .serenity_context()
        .cache
        .guild(serenity::GuildId::new(gid))
        .and_then(|g| {
            g.channels
                .get(&serenity::ChannelId::new(voice))
                .map(|c| c.kind)
        })
        .map(crate::lavalink::LavalinkManager::is_stage_channel)
        .unwrap_or(false);
    if is_stage {
        let speaker =
            crate::lavalink::LavalinkManager::request_stage_speaker(ctx.http(), gid, voice).await;
        if !speaker {
            ctx.say(
                "I can't get speaker permission in this stage channel. Ask a moderator to invite me to speak, then try again.",
            )
            .await?;
            return Ok(());
        }
    }
    m.with_player(gid, |p| {
        p.voice_channel = Some(voice);
        p.text_channel = Some(text_channel);
    })
    .await;
    // Single-query batch through the pinned-node pipeline (mirrors
    // `handleMusicPlay` looping `queries[]` with `currentNode` pinned
    // from the first successful search; one query pins trivially).
    let mut results = m
        .play_queries(gid, std::slice::from_ref(&title), requester, now_ms())
        .await;
    match results.pop() {
        Some(Ok((pos, t, is_playlist))) => {
            // Rich entry (mirrors musicPlay.ts buffer/embed rows:
            // requester - resolved title | uri by requester).
            let requester_tag = format!("<@{requester}>");
            record_history_full(
                &ctx.data().pool,
                gid,
                &t.title,
                t.uri.as_deref(),
                Some(&requester_tag),
            )
            .await;
            let timer = emoji_markup(&ctx, "Timer", "⏱️").await;
            let result = if is_playlist { "playlist" } else { "track" };
            let content = crate::lang::get(&code, "p_loading_message")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Timer}", &timer)
                        .replace("{result}", result)
                })
                .unwrap_or_else(|| format!("Loading: **{result}**!"));
            let duration =
                crate::lang::get(&code, "p_duration").unwrap_or_else(|| "Duration: ".to_string());
            // Platform source line (mirrors `platformLabel`: Deezer /
            // SoundCloud attribution under the title).
            let platform_line = match crate::lavalink::platform_source_tag(t.uri.as_deref()) {
                Some(tag) => {
                    let emoji_name = if tag == "Deezer" {
                        "Deezer"
                    } else {
                        "SoundCloud"
                    };
                    let icon = emoji_markup(&ctx, emoji_name, "🎵").await;
                    let source_word = crate::lang::get(&code, "var_source")
                        .unwrap_or_else(|| "Music from: ".to_string());
                    match t.uri.as_deref() {
                        Some(url) => format!("\n-# {icon} [{source_word}{tag}]({url})"),
                        None => String::new(),
                    }
                }
                None => String::new(),
            };
            let mut embed = serenity::CreateEmbed::default()
                .description(format!("**{}**{platform_line}", t.title))
                .colour(0x00FF00)
                .timestamp(serenity::Timestamp::now())
                .footer(serenity::CreateEmbedFooter::new(format!(
                    "{duration}{}",
                    fmt_track_duration(t.length_ms)
                )));
            if let Some(uri) = t.uri.as_deref() {
                embed = embed.url(uri);
            }
            if let Some(art) = t.artwork.as_deref().filter(|u| !u.is_empty()) {
                embed = embed.thumbnail(art);
            }
            let reply = ctx
                .send(poise::CreateReply::default().content(content).embed(embed))
                .await?;
            // Auto-clear the loading line after 3s (mirrors
            // `deleteAfterMs = 3000`: content nulled, embed kept).
            // Best-effort: failures (deleted message, 403) are ignored.
            if let Ok(msg) = reply.into_message().await {
                let http = ctx.serenity_context().http.clone();
                let (channel_id, message_id) = (msg.channel_id, msg.id);
                tokio::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    let _ = http
                        .edit_message(
                            channel_id,
                            message_id,
                            &serenity::EditMessage::new().content(""),
                            Vec::new(),
                        )
                        .await;
                });
            }
            // Queued (not first): announce in the player's text
            // channel when it differs (TS `sendQueueAddMessage`).
            if pos > 0
                && text_channel
                    != snap
                        .as_ref()
                        .and_then(|s| s.text_channel)
                        .unwrap_or(text_channel)
            {
                if let Some(text) = snap.as_ref().and_then(|s| s.text_channel) {
                    let icon = emoji_markup(&ctx, "Music_Icon", "🎵").await;
                    let desc = crate::lang::get(&code, "event_mp_audioTrackAdd")
                        .map(|s| {
                            s.replace("${client.iHorizon_Emojis.Music_Icon}", &icon)
                                .replace("${track.title}", &t.title)
                        })
                        .unwrap_or_else(|| format!("{} added to the queue!", t.title));
                    let embed = serenity::CreateEmbed::default()
                        .colour(0x00FF00)
                        .description(desc);
                    let _ = serenity::ChannelId::new(text)
                        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
                        .await;
                }
            }
        }
        Some(Err(crate::lavalink::MusicError::NoMatches))
        | Some(Err(crate::lavalink::MusicError::NoNodes))
        | None => {
            // TS `searchMusicQuery` returns {} with no nodes/tracks
            // (and `handleMusicPlay` on empty queries), and the handler
            // answers the no-result embed.
            ctx.send(poise::CreateReply::default().embed(no_result_embed(&code)))
                .await?;
        }
        Some(Err(e)) => {
            // Fallible resolve/start legs beyond no-matches (no
            // session, REST/transport failure): answer the queue-error
            // shape instead of dropping into the generic handler with
            // no user-visible reply.
            ctx.say(queue_error_text(&code, &e.to_string())).await?;
        }
    }
    Ok(())
}
