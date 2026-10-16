use super::*;

/// Play a song!
///
/// Mirrors `!play.ts` + `handleMusicPlay`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "play",
    aliases("p"),
    description_localized("fr", "Jouer une musique!"),
    description_localized("ja", "曲を再生！"),
    description_localized("ru", "Воспроизвести песню!"),
    description_localized("es-ES", "Reproducir una canción!")
)]
pub async fn m_play(
    ctx: Ctx<'_>,
    #[description_localized(
        "fr",
        "Titre de la musique que vous souhaitez (vous pouvez mettre une URL si vous le voulez)"
    )]
    #[description_localized("ja", "希望するトラックタイトル（URLでも可）")]
    #[description_localized("ru", "Название трека (можно указать URL)")]
    #[description_localized(
        "es-ES",
        "El título de la pista que deseas (puedes poner URL como quieras)"
    )]
    #[description = "The track title you want (you can put URL as you want)"]
    #[rest]
    title: String,
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
    // Guard order mirrors musicPlay.ts:788-833 exactly: not-in-voice
    // -> H247 -> TTS cleanup -> same-voice -> empty-query ->
    // allowed-links. Each leg returns before the next runs, so a
    // same-channel user on an H247 guild still gets the H247 refusal.
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
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
    // `ttsData && ttsData.enabled` -> `cleanupTTS`): only a stored TTS
    // row with the enabled flag runs the full cleanup legs (drop
    // player, welcome-embed delete, voice-status clear, row delete).
    // A disabled row is left untouched and never blocks the play.
    if let Some(tts_cfg) = crate::commands::tts::load_tts(&ctx.data().pool, &gid_str).await {
        if tts_cfg.enabled {
            // Routed H247 grant (table-first load, scheduler parked
            // fallback for TS-shaped rows); reuses the guard's config
            // before hitting the store again.
            let h247_grant = match h247_tts_grant(&h247) {
                Some(g) => Some(g),
                None => parked_h247_grant(
                    crate::scheduler::h247_parked_channel(&ctx.data().pool, &gid_str).await,
                ),
            };
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
    }
    // TS only enforces same-channel once the bot is in voice.
    if let Some(bot) = bot_voice_channel(&ctx, gid, snap.as_ref().and_then(|s| s.voice_channel)) {
        if guard_same_voice(&ctx, &code, Some(voice), Some(bot)).await {
            return Ok(());
        }
    }
    // Empty-query (mirrors the normalizedQueries.length === 0 leg):
    // blank input answers the no-result embed, never the pipeline.
    let query = title.trim().to_string();
    if query.is_empty() {
        ctx.send(poise::CreateReply::default().embed(no_result_embed(&code)))
            .await?;
        return Ok(());
    }
    // Allowed-links last (mirrors musicPlay.ts:834
    // `normalizedQueries.some((query) => !isAllowedLinks(query))`):
    // plain search terms carry no scheme, so `is_allowed_links` lets
    // them through exactly like the TS hostname check.
    if !crate::funcs::is_allowed_links(&query) {
        say_key(
            &ctx,
            &code,
            "p_not_allowed",
            "The link you sent is not supported by this bot. Please use authorized music streaming services such as Deezer, Spotify, Soundcloud, etc.",
        )
        .await?;
        return Ok(());
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
            ctx.say("I can't get speaker permission in this stage channel. Ask a moderator to invite me to speak, then try again.",
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
    // Platform queries resolve exactly where TS does: Spotify / Apple /
    // Amazon / Tidal URLs are scraped via the
    // `commands::music::metadata::{spotify, apple_music, amazon_music,
    // tidal}` ports and re-searched on Deezer inside
    // `resolve_query_tracks` (TS `searchQueryOnNode` + `handle*` legs in
    // musicPlay.ts), falling back to previous behavior (no-matches ->
    // no-result embed) on scrape failure. Genuinely unsupported links
    // never reach here: the `is_allowed_links` denial above keeps the
    // "link not supported, use Deezer/Spotify/Soundcloud" gate.
    let mut results = m
        .play_queries(gid, std::slice::from_ref(&query), requester, now_ms())
        .await;
    match results.pop() {
        Some(Ok((_pos, t, is_playlist))) => {
            // Rich entry (mirrors musicPlay.ts buffer/embed rows:
            // requester - resolved title | uri by requester).
            // Titles are link-masked like the TS `maskLink` leg at
            // queue-add time (`Hidden Link` on URL-ish input), so the
            // reply embed, the queue-add echo and the history row all
            // carry the masked form.
            let shown_title = crate::funcs::mask_link(&t.title);
            let requester_tag = format!("<@{requester}>");
            // History rows need owned copies: the write lands after the
            // reply below (TS `respond` precedes the `db.push` legs).
            let history_title = shown_title.clone();
            let history_uri = t.uri.clone();
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
                .description(format!("**{shown_title}**{platform_line}"))
                // TS `SUCCESS_EMBED_COLOR` (#00cc1a, musicPlay.ts:76).
                .colour(0x00CC1A)
                .timestamp(serenity::Timestamp::now())
                .footer(serenity::CreateEmbedFooter::new(format!(
                    "{duration}{}",
                    fmt_track_duration(t.length_ms)
                )));
            // No `.url()`: the TS success embed carries no URL (the link
            // lives in the description via `platformLabel`, mirrored in
            // `platform_line` above).
            if let Some(art) = t.artwork.as_deref().filter(|u| !u.is_empty()) {
                embed = embed.thumbnail(art);
            }
            let reply = ctx
                .send(poise::CreateReply::default().content(content).embed(embed))
                .await?;
            // Rich entry (mirrors musicPlay.ts buffer/embed rows after
            // `respond`): two DB round-trips off the user-visible path.
            record_history_full(
                &ctx.data().pool,
                gid,
                &history_title,
                history_uri.as_deref(),
                Some(&requester_tag),
            )
            .await;
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
            // Queued: echo in the player's text channel when it differs
            // from the interaction channel (TS `sendQueueAddMessage`
            // gates purely on the channel mismatch, for every added
            // track — no position check). `snap` predates the
            // `with_player` rebind above, so it carries the previously
            // bound channel like TS `player.textChannelId`.
            if let Some(text) =
                queue_add_target(snap.as_ref().and_then(|s| s.text_channel), text_channel)
            {
                let icon = emoji_markup(&ctx, "Music_Icon", "🎵").await;
                let desc = crate::lang::get(&code, "event_mp_audioTrackAdd")
                    .map(|s| render_queue_add_desc(&s, &icon, &shown_title))
                    .unwrap_or_else(|| format!("{shown_title} added to the queue!"));
                let embed = serenity::CreateEmbed::default()
                    // TS `QUEUE_ADD_EMBED_COLOR` (2829617 == 0x2B2D31, musicPlay.ts:77).
                    .colour(0x2B2D31)
                    .description(desc);
                let _ = serenity::ChannelId::new(text)
                    .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
                    .await;
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

/// Queue-add echo target (mirrors `sendQueueAddMessage`'s
/// `channel?.id !== interaction.channelId` gate, musicPlay.ts:747).
/// `player_text_channel` is the PRE-play snapshot: the player is created
/// with `textChannelId: interaction.channelId`, so a fresh player never
/// echoes and a rebound player echoes into its previously bound channel.
/// Returns the channel id to send into, or `None` to skip.
///
/// DELTA (doc-noted, no code change): a missing channel
/// (`player_text_channel: None`) passes the TS gate
/// (`undefined !== id`) and then throws on `.send`; Rust folds it to a
/// silent skip (the player always carries a text channel in practice,
/// set at creation).
pub fn queue_add_target(player_text_channel: Option<u64>, interaction_channel: u64) -> Option<u64> {
    player_text_channel.filter(|id| *id != interaction_channel)
}

/// Queue-add description fill (mirrors the `event_mp_audioTrackAdd`
/// two-`.replace` chain, musicPlay.ts:752-765, icon first then title).
/// TS `String.replace(string)` swaps FIRST-ONLY; `replacen` keeps that
/// shape, so a track titled `${track.title}` (or carrying the icon
/// token) leaves the injected occurrence literal exactly like TS.
pub fn render_queue_add_desc(template: &str, icon: &str, title: &str) -> String {
    template
        .replacen("${client.iHorizon_Emojis.Music_Icon}", icon, 1)
        .replacen("${track.title}", title, 1)
}

#[cfg(test)]
mod tests {
    use super::{queue_add_target, render_queue_add_desc};

    #[test]
    fn queue_add_gate_and_desc_match_ts_send_queue_add_legs() {
        // Gate legs (`channel?.id !== interaction.channelId`).
        assert_eq!(queue_add_target(Some(1), 2), Some(1));
        assert_eq!(queue_add_target(Some(1), 1), None);
        assert_eq!(queue_add_target(None, 1), None);
        // Description legs (en-US `event_mp_audioTrackAdd` shape).
        let tpl =
            "${client.iHorizon_Emojis.Music_Icon} - ${track.title} has been added to the queue!";
        assert_eq!(
            render_queue_add_desc(tpl, "<:m:1>", "Song"),
            "<:m:1> - Song has been added to the queue!"
        );
        // Hostile titles: injected placeholders survive (first-only).
        assert_eq!(
            render_queue_add_desc(tpl, "<:m:1>", "${track.title}"),
            "<:m:1> - ${track.title} has been added to the queue!"
        );
        assert_eq!(
            render_queue_add_desc(tpl, "<:m:1>", "${client.iHorizon_Emojis.Music_Icon}"),
            "<:m:1> - ${client.iHorizon_Emojis.Music_Icon} has been added to the queue!"
        );
        // Doubled template: only the first occurrence fills.
        assert_eq!(
            render_queue_add_desc(&format!("{tpl}{tpl}"), "<:m:1>", "Song"),
            "<:m:1> - Song has been added to the queue!${client.iHorizon_Emojis.Music_Icon} - ${track.title} has been added to the queue!"
        );
    }
}
