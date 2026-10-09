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
    match m.play_query(gid, &title, requester, now_ms()).await {
        Ok((pos, t)) => {
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
            let content = crate::lang::get(&code, "p_loading_message")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Timer}", &timer)
                        .replace("{result}", "track")
                })
                .unwrap_or_else(|| format!("Loading: **{}**!", t.title));
            let duration =
                crate::lang::get(&code, "p_duration").unwrap_or_else(|| "Duration: ".to_string());
            let mut embed = serenity::CreateEmbed::default()
                .description(format!("**{}**", t.title))
                .colour(0x00FF00)
                .timestamp(serenity::Timestamp::now())
                .footer(serenity::CreateEmbedFooter::new(format!(
                    "{duration}{}",
                    fmt_duration(t.length_ms)
                )));
            if let Some(uri) = t.uri.as_deref() {
                embed = embed.url(uri);
            }
            ctx.send(poise::CreateReply::default().content(content).embed(embed))
                .await?;
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
        Err(crate::lavalink::MusicError::NoMatches) | Err(crate::lavalink::MusicError::NoNodes) => {
            // TS `searchMusicQuery` returns {} with no nodes/tracks,
            // and the handler answers the no-result embed.
            ctx.send(poise::CreateReply::default().embed(no_result_embed(&code)))
                .await?;
        }
        Err(e) => {
            // Fallible resolve/start legs beyond no-matches (no
            // session, REST/transport failure): answer the queue-error
            // shape instead of dropping into the generic handler with
            // no user-visible reply.
            ctx.say(queue_error_text(&code, &e.to_string())).await?;
        }
    }
    Ok(())
}
