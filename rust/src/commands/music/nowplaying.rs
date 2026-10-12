use super::*;
use std::time::{Duration, Instant};

/// Live-card refresh cadence, mirroring TS `setInterval(..., 5900)`.
pub const NOWPLAYING_REFRESH_MS: u64 = 5900;
/// Streams report `length_ms == 0`; bound their collector like a long track.
const STREAM_COLLECTOR_CAP_MS: u64 = 600_000;
/// TS `!nowplaying.ts:44` artwork fallback, shared with `!trackinfo.ts`.
pub const NOWPLAYING_ARTWORK_FALLBACK: &str =
    "https://www.ihorizon.org/assets/img/unknown-user.png";
/// The `nowPlaying` HTML card TS hands to html2png (`!nowplaying.ts:46-55`).
const NOWPLAYING_CARD_TEMPLATE: &str = include_str!("../../../../src/assets/html/nowPlaying.html");

/// `MM:SS` clock, mirroring TS `formatTime` (`padStart(2, "0")`).
pub fn format_clock_secs(secs: u64) -> String {
    format!("{:02}:{:02}", secs / 60, secs % 60)
}

/// Effective playback position: wall-clock elapsed minus time spent
/// paused (mirrors `player.position`, which freezes while paused),
/// capped at the track duration. Streams (`duration_ms == 0`, unknown
/// length) are uncapped.
pub fn nowplaying_position_ms(elapsed_ms: u64, paused_ms: u64, duration_ms: u64) -> u64 {
    let pos = elapsed_ms.saturating_sub(paused_ms);
    if duration_ms == 0 {
        pos
    } else {
        pos.min(duration_ms)
    }
}

/// Collector lifetime left (mirrors the TS collector
/// `time: duration - player.position`): remaining track time, or the
/// remaining stream cap for streams.
pub fn nowplaying_remaining_ms(elapsed_ms: u64, paused_ms: u64, duration_ms: u64) -> u64 {
    let total = if duration_ms == 0 {
        STREAM_COLLECTOR_CAP_MS
    } else {
        duration_ms
    };
    total.saturating_sub(nowplaying_position_ms(elapsed_ms, paused_ms, total))
}

/// Progress readout, mirroring TS `generateProgressBar` math (floor to
/// seconds, 17-wide bar, pointer after the elapsed dashes).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NowProgress {
    pub bar: String,
    pub current: String,
    pub total: String,
}

pub fn nowplaying_progress(position_ms: u64, duration_ms: u64) -> NowProgress {
    let cur_s = position_ms / 1000;
    let tot_s = duration_ms / 1000;
    let pct = if tot_s == 0 {
        0.0
    } else {
        (cur_s as f64 / tot_s as f64) * 100.0
    };
    let before = ((17 - 2) as f64 * pct / 100.0).floor() as usize;
    let before = before.min(17 - 2);
    let after = 17 - before - 2;
    let current = format_clock_secs(cur_s);
    let total = format_clock_secs(tot_s);
    let bar = format!(
        "{current} ┃ {}{}{} ┃ {total}",
        "━".repeat(before),
        "●",
        "━".repeat(after),
    );
    NowProgress {
        bar,
        current,
        total,
    }
}

/// TS lyrics leg trims to 1997 UTF-16 units and appends `...` whenever the
/// source reached that width (substring(0, 1997) + length check). Astral
/// chars cost 2 units and pairs are never split.
pub fn trim_lyrics_1997(s: &str) -> String {
    let mut units = 0usize;
    let mut end = 0usize;
    for (i, c) in s.char_indices() {
        let w = c.len_utf16();
        if units + w > 1997 {
            break;
        }
        units += w;
        end = i + c.len_utf8();
    }
    if end < s.len() || units >= 1997 {
        format!("{}...", &s[..end])
    } else {
        s.to_string()
    }
}

/// TS `!nowplaying.ts:37-43` embed: title `**title**, author`, URL, a
/// `by: <@requester>`-only description (no progress bar — progress lives
/// in the `nowPlaying` HTML card image), dominant `color1` with the
/// `#6fa8dc` fallback, and a timestamp.
fn nowplaying_embed(
    title: &str,
    author: &str,
    uri: Option<&str>,
    requester_id: u64,
    colour: u32,
) -> serenity::CreateEmbed {
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("**{title}**, {author}"))
        .description(format!("by: <@{requester_id}>"))
        .colour(colour)
        .timestamp(serenity::Timestamp::now());
    if let Some(u) = uri.filter(|u| !u.is_empty()) {
        embed = embed.url(u);
    }
    embed
}

/// Artwork with the TS `unknown-user.png` fallback
/// (`!nowplaying.ts:44`, also used by `!trackinfo.ts`).
pub fn artwork_or_fallback(artwork: Option<&str>) -> &str {
    artwork
        .filter(|u| !u.is_empty())
        .unwrap_or(NOWPLAYING_ARTWORK_FALLBACK)
}

/// `String((position / duration) * 100)` exactly like the TS
/// `time0` (`generateProgressBar` — raw float division, so `0/0`
/// renders `"NaN"` and `x/0` renders `"Infinity"`).
pub fn card_percent_js(position_ms: u64, duration_ms: u64) -> String {
    if duration_ms == 0 {
        if position_ms == 0 {
            "NaN".to_string()
        } else {
            "Infinity".to_string()
        }
    } else {
        ((position_ms as f64 / duration_ms as f64) * 100.0).to_string()
    }
}

/// Fill the `nowPlaying` HTML template (`src/assets/html/nowPlaying.html`,
/// rendered by html2png in TS). Placeholder names are the template's own.
#[allow(clippy::too_many_arguments)] // one arg per template placeholder
pub fn nowplaying_card_html(
    title: &str,
    author: &str,
    artwork_url: &str,
    color1: &str,
    color2: &str,
    percent: &str,
    current: &str,
    total: &str,
) -> String {
    NOWPLAYING_CARD_TEMPLATE
        .replace("{album_cover}", artwork_url)
        .replace("{song_title}", title)
        .replace("{song_author}", author)
        .replace("{color1}", color1)
        .replace("{color2}", color2)
        .replace("{time0}", percent)
        .replace("{time1}", current)
        .replace("{time2}", total)
}

/// `#rrggbb` (or `rrggbb`) to a serenity colour, with the TS
/// `|| "#6fa8dc"` fallback on anything unparsable.
pub fn parse_hex_colour(s: &str) -> u32 {
    let hex = s.trim().strip_prefix('#').unwrap_or(s.trim());
    u32::from_str_radix(hex, 16).unwrap_or(0x6FA8DC)
}

/// Render the filled card through HorizonGateway (`omitBackground` +
/// full-page, mirroring the TS `html2png` options). `None` on any
/// failure so the caller falls back to the text embed.
async fn render_nowplaying_png(base: &str, token: &str, html: &str) -> Option<Vec<u8>> {
    crate::funcs::gateway_render_html(
        base,
        token,
        html,
        r#"{"omitBackground":true,"selectElement":false}"#,
        &[],
        Some(std::time::Duration::from_secs(30)),
    )
    .await
    .ok()
}

/// Announce a pause/stop line in the player's text channel like TS
/// (`player.textChannelId` via `channel.send`); falls back to the
/// interaction reply when the channel is unknown or the send fails.
async fn announce_to_player_channel(
    ctx: &Ctx<'_>,
    m: &crate::lavalink::LavalinkManager,
    gid: u64,
    text: &str,
) {
    let channel = m.snapshot(gid).await.and_then(|s| s.text_channel);
    if let Some(ch) = channel {
        if serenity::ChannelId::new(ch)
            .say(ctx.http(), text)
            .await
            .is_ok()
        {
            return;
        }
    }
    let _ = ctx.say(text).await;
}

fn percent_encode(s: &str) -> String {
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

/// Local lyrics lookup (lyrics.ovh suggest + body), same shape as the
/// lyrics command — kept here because that module owns its helper.
/// Lyrics source verdict (kept): plain ovh text stays; the Lavalink
/// lyrics-plugin transport (`search` + `lyrics.get(track)` in
/// searchLyrics.ts) is excluded on this button leg, which has no live
/// node session to reuse and must not open a plugin round-trip per
/// press — the stateless HTTP lookup is enough for an ephemeral card.
async fn fetch_lyrics_text(query: &str) -> Option<(String, String)> {
    let client = reqwest::Client::new();
    let suggest: serde_json::Value = client
        .get(format!(
            "https://api.lyrics.ovh/suggest/{}",
            percent_encode(query)
        ))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    let first = suggest.get("data")?.as_array()?.first()?;
    let title = first.get("title")?.as_str()?;
    let artist = first.get("artist")?.get("name")?.as_str()?;
    let body: serde_json::Value = client
        .get(format!(
            "https://api.lyrics.ovh/v1/{}/{}",
            percent_encode(artist),
            percent_encode(title)
        ))
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    let text = body.get("lyrics")?.as_str()?;
    if text.trim().is_empty() {
        return None;
    }
    Some((format!("{artist} - {title}"), text.to_string()))
}

/// App-emoji button glyph with a Unicode fallback (backup
/// `delete.rs:102-108` pattern): custom emoji id when synced, plain
/// glyph when the table is cold.
async fn button_emoji(ctx: &Ctx<'_>, name: &str, fallback: &str) -> serenity::ReactionType {
    match crate::emojis::cached_emoji_entry(ctx.http(), name).await {
        Some((id, full_name, animated)) => serenity::ReactionType::Custom {
            animated,
            id: serenity::EmojiId::new(id),
            name: Some(full_name),
        },
        None => serenity::ReactionType::Unicode(fallback.to_string()),
    }
}

/// Get the current playing song!
///
/// Mirrors `!nowplaying.ts` (live card + collector, see below).
// Live progress card refreshed every 5.9s plus a requester-gated button
// collector (`pause` / `stop` / `lyrics`). Position is tracked locally
// from command time (no live Lavalink position in the snapshot); the loop
// ends when the track changes, its time is up, or the collector times
// out, and the buttons are stripped on end like TS.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "nowplaying",
    name_localized("fr", "en-lecture"),
    name_localized("ja", "nowplaying"),
    name_localized("ru", "nowplaying"),
    name_localized("es-ES", "nowplaying"),
    description_localized("fr", "Obtenir la chanson en cours de lecture"),
    description_localized("ja", "現在再生中の曲を取得！"),
    description_localized("ru", "Получить текущую песню!"),
    description_localized("es-ES", "Obtener la canción actual!")
)]
pub async fn m_nowplaying(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    let voice = voice_channel_of(&ctx);
    let Some(s) = snap else {
        say_key(
            &ctx,
            &code,
            "nowplaying_no_queue",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    };
    let Some(track) = s.current.clone() else {
        say_key(
            &ctx,
            &code,
            "nowplaying_no_queue",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    };
    // `!nowplaying.ts:82` gates on `!player.playing` only, and
    // lavalink-client keeps `playing == true` while paused: `pause()`
    // sets just `paused = true` (dist/index.js), and server
    // `playerUpdate` ops only touch position/ping — never `playing`
    // (only track start/end/stuck/error flip it). So the TS card
    // renders when paused; no `s.paused` refusal here.
    if voice.is_none() {
        say_key(
            &ctx,
            &code,
            "nowplaying_no_queue",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    }

    let requester_id = track.requester;
    let track_id = track.encoded.clone();
    let duration_ms = track.length_ms;
    let started = Instant::now();
    let mut paused = s.paused;
    // Pause-offset clock (mirrors `player.position`, which freezes
    // while paused): `paused_ms` accumulates closed pause spans, and
    // `pause_began` marks the open one. Every tick renders
    // `wall - paused_total` via `nowplaying_position_ms`, and the loop
    // ends on `nowplaying_remaining_ms` (TS `duration - position`).
    let mut paused_ms: u64 = 0;
    // Entering while already paused (card renders when paused, see the
    // gate above): the open pause span starts now so the position clock
    // stays frozen like `player.position`.
    let mut pause_began: Option<Instant> = if paused { Some(started) } else { None };
    // Wall clock plus the open pause span, for one tick.
    let tick_ms =
        |started: &Instant, paused_ms: u64, pause_began: &Option<Instant>| -> (u64, u64) {
            let wall = started.elapsed().as_millis() as u64;
            let open = pause_began
                .map(|b| b.elapsed().as_millis() as u64)
                .unwrap_or(0);
            (wall, paused_ms.saturating_add(open))
        };

    let prog = nowplaying_progress(0, duration_ms);
    // TS `!nowplaying.ts:44-55`: dominant colors off the artwork (with
    // the unknown-user.png fallback), then the nowPlaying HTML card via
    // html2png. Here the card renders through HorizonGateway; when the
    // gateway is unset or the render fails, the text embed goes out
    // alone (plus the legacy Spotify SVG banner, kept from the
    // no-browser era).
    let artwork = artwork_or_fallback(track.artwork.as_deref()).to_string();
    let (color1, color2) = match crate::funcs::image_dominant_color(&artwork).await {
        Ok((c1, c2)) => (c1, c2),
        Err(_) => ("#6fa8dc".to_string(), "#6fa8dc".to_string()),
    };
    let colour = parse_hex_colour(&color1);
    let card_gateway: Option<(String, String)> = ctx
        .data()
        .config
        .gateway_internal()
        .map(|base| (base, crate::config::api_token().unwrap_or_default()));
    let mut embed = nowplaying_embed(
        &track.title,
        &track.author,
        track.uri.as_deref(),
        requester_id,
        colour,
    );
    let mut reply = poise::CreateReply::default();
    let mut card_rendered = false;
    if let Some((ref base, ref token)) = card_gateway {
        let html = nowplaying_card_html(
            &track.title,
            &track.author,
            &artwork,
            &color1,
            &color2,
            &card_percent_js(0, duration_ms),
            &prog.current,
            &prog.total,
        );
        if let Some(png) = render_nowplaying_png(base, token, &html).await {
            embed = embed.image("attachment://nowplaying.png");
            reply = reply.attachment(serenity::CreateAttachment::bytes(png, "nowplaying.png"));
            card_rendered = true;
        }
    }
    if !card_rendered {
        // Spotify-sourced tracks keep the SVG banner card (TS .spotify-banner
        // html2png equivalent, no browser here).
        let preview = preview_for_track(&track).await;
        if preview.source == Some(MetaSource::Spotify) {
            let state = if paused { "paused" } else { "playing" };
            let svg = spotify_banner_svg(&preview.title, preview.artist.as_deref(), state);
            reply = reply.attachment(serenity::CreateAttachment::bytes(
                svg.into_bytes(),
                "nowplaying.svg",
            ));
        }
    }
    reply = reply.embed(embed);
    // Emoji-only buttons mirroring `!nowplaying.ts:58-76`: customIds
    // `stop` / `pause` / `lyrics` with the Music_Stop / Pause / Paper
    // app emojis, no labels.
    let stop_emoji = button_emoji(&ctx, "Music_Stop", "⏹️").await;
    let pause_emoji = button_emoji(&ctx, "Pause", "⏸️").await;
    let lyrics_emoji = button_emoji(&ctx, "Paper", "📝").await;
    let mk_row = || {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("stop")
                .emoji(stop_emoji.clone())
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("pause")
                .emoji(pause_emoji.clone())
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("lyrics")
                .emoji(lyrics_emoji.clone())
                .style(serenity::ButtonStyle::Secondary),
        ])
    };
    reply = reply.components(vec![mk_row()]);
    let handle = ctx.send(reply).await?;
    let Ok(mut msg) = handle.into_message().await else {
        return Ok(());
    };
    let no_mark = emoji_markup(&ctx, "No", "❌").await;
    let invoker_mention = format!("<@{}>", ctx.author().id.get());

    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(Duration::from_millis(NOWPLAYING_REFRESH_MS))
            .await;
        let Some(press) = press else {
            // 5.9s refresh tick: re-render while the same track plays.
            let (wall, paused_total) = tick_ms(&started, paused_ms, &pause_began);
            if nowplaying_remaining_ms(wall, paused_total, duration_ms) == 0 {
                break;
            }
            let current_now = m.snapshot(gid).await.and_then(|s| s.current);
            match current_now {
                Some(t) if t.encoded == track_id => {
                    if !paused {
                        let pos = nowplaying_position_ms(wall, paused_total, duration_ms);
                        let prog = nowplaying_progress(pos, duration_ms);
                        let mut fresh = nowplaying_embed(
                            &t.title,
                            &t.author,
                            t.uri.as_deref(),
                            requester_id,
                            colour,
                        );
                        // TS re-renders the whole HTML card every 5.9s
                        // (`displayNowPlaying` per tick): same fill, same
                        // artwork/colors (same track), fresh clock.
                        let mut edit = serenity::EditMessage::new();
                        if let Some((ref base, ref token)) = card_gateway {
                            let html = nowplaying_card_html(
                                &t.title,
                                &t.author,
                                &artwork,
                                &color1,
                                &color2,
                                &card_percent_js(pos, duration_ms),
                                &prog.current,
                                &prog.total,
                            );
                            if let Some(png) = render_nowplaying_png(base, token, &html).await {
                                fresh = fresh.image("attachment://nowplaying.png");
                                edit = edit.new_attachment(serenity::CreateAttachment::bytes(
                                    png,
                                    "nowplaying.png",
                                ));
                            }
                        }
                        let _ = msg.edit(ctx.http(), edit.embed(fresh)).await;
                    }
                }
                _ => break,
            }
            continue;
        };
        if !matches!(press.data.custom_id.as_str(), "stop" | "pause" | "lyrics") {
            continue;
        }
        // Requester gate (TS compares against the track requester and
        // answers the `No` emoji, ephemeral, to anyone else).
        if press.user.id.get() != requester_id {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(no_mark.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "pause" => {
                paused = !paused;
                // Freeze/unfreeze the clock on the pause offset.
                if paused {
                    pause_began = Some(Instant::now());
                } else if let Some(began) = pause_began.take() {
                    paused_ms = paused_ms.saturating_add(began.elapsed().as_millis() as u64);
                }
                m.with_player(gid, |p| p.paused = paused).await;
                if let Ok((node, session)) = m.live_node_and_session(gid).await {
                    let _ = m.rest_set_paused(&node, &session, gid, paused).await;
                }
                let mut fresh = nowplaying_embed(
                    &track.title,
                    &track.author,
                    track.uri.as_deref(),
                    requester_id,
                    colour,
                );
                // The card attachment survives the edit, but the fresh
                // embed must reference it again or the image vanishes
                // until the next 5.9s refresh tick.
                if card_rendered {
                    fresh = fresh.image("attachment://nowplaying.png");
                }
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .embed(fresh)
                                .components(vec![mk_row()]),
                        ),
                    )
                    .await;
                let key = if paused {
                    "nowplaying_pause_button"
                } else {
                    "nowplaying_resume_button"
                };
                let fallback = if paused {
                    "paused the music!"
                } else {
                    "resumed the music!"
                };
                let text = crate::lang::get(&code, key)
                    .map(|s| s.replace("${interaction.user}", &invoker_mention))
                    .unwrap_or_else(|| format!("{invoker_mention} **{fallback}**"));
                announce_to_player_channel(&ctx, m, gid, &text).await;
            }
            "stop" => {
                let snap = m.snapshot(gid).await;
                if snap.as_ref().and_then(|s| s.current.clone()).is_none() {
                    let text = crate::lang::get(&code, "nowplaying_no_queue")
                        .unwrap_or_else(|| "There is nothing playing".to_string());
                    let _ = press
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Message(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content(text)
                                    .ephemeral(true),
                            ),
                        )
                        .await;
                    continue;
                }
                m.with_player(gid, |p| p.stop(now_ms())).await;
                if let Ok((node, session)) = m.live_node_and_session(gid).await {
                    let _ = m.rest_destroy(&node, &session, gid).await;
                }
                // `player.destroy()` also drops the voice connection
                // (lavalink-client disconnects on destroy), while
                // `rest_destroy` is REST-only: OP4-leave explicitly so
                // the bot does not linger in the channel.
                m.leave_voice(gid).await;
                let mut fresh = nowplaying_embed(
                    &track.title,
                    &track.author,
                    track.uri.as_deref(),
                    requester_id,
                    colour,
                );
                // The card attachment survives the edit, but the fresh
                // embed must reference it again or the image vanishes
                // until the next 5.9s refresh tick.
                if card_rendered {
                    fresh = fresh.image("attachment://nowplaying.png");
                }
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .embed(fresh)
                                .components(vec![mk_row()]),
                        ),
                    )
                    .await;
                let text = crate::lang::get(&code, "nowplaying_stop_buttom")
                    .map(|s| s.replace("${interaction.user}", &invoker_mention))
                    .unwrap_or_else(|| format!("{invoker_mention} **stopped** the music!"));
                announce_to_player_channel(&ctx, m, gid, &text).await;
                break;
            }
            "lyrics" => {
                // TS `!nowplaying.ts:158-206` defers ephemerally with the
                // `nowplaying_lyrics_button` text ("...were not found" — the
                // key doubles as the searching placeholder), then EDITS the
                // same reply to add the lyrics embed (content kept, quirk
                // included); the catch leg edits back to the text alone.
                let searching = crate::lang::get(&code, "nowplaying_lyrics_button")
                    .unwrap_or_else(|| "The lyrics for this song were not found".to_string());
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(&searching)
                                .ephemeral(true),
                        ),
                    )
                    .await;
                let query = format!("{} - {}", track.title, track.author);
                match fetch_lyrics_text(&query).await {
                    Some((_, body)) => {
                        let youtube = emoji_markup(&ctx, "YouTube_Icon", "🎶").await;
                        let trimmed = trim_lyrics_1997(&body);
                        let description = if trimmed.is_empty() {
                            crate::lang::get(&code, "lyrics_not_found")
                                .unwrap_or_else(|| "No lyrics found".to_string())
                        } else {
                            trimmed
                        };
                        let (footer_name, footer_icon) =
                            crate::commands::shared::footer_parts_pool(
                                &ctx.data().pool,
                                &gid.to_string(),
                            )
                            .await;
                        let mut footer = serenity::CreateEmbedFooter::new(footer_name);
                        if footer_icon.is_some() {
                            footer = footer.icon_url("attachment://footer_icon.png");
                        }
                        let mut lyrics_embed = serenity::CreateEmbed::default()
                            .title(format!("{youtube} {}", track.title))
                            .author(serenity::CreateEmbedAuthor::new(track.author.clone()))
                            .description(description)
                            .footer(footer)
                            .colour(0xCD703A)
                            .timestamp(serenity::Timestamp::now());
                        if let Some(u) = track.uri.as_deref().filter(|u| !u.is_empty()) {
                            lyrics_embed = lyrics_embed.url(u);
                        }
                        let mut edit =
                            serenity::EditInteractionResponse::new().embeds(vec![lyrics_embed]);
                        if let Some(icon) = footer_icon {
                            edit = edit.new_attachment(serenity::CreateAttachment::bytes(
                                icon,
                                "footer_icon.png",
                            ));
                        }
                        let _ = press.edit_response(ctx.http(), edit).await;
                    }
                    None => {
                        let _ = press
                            .edit_response(
                                ctx.http(),
                                serenity::EditInteractionResponse::new().content(searching),
                            )
                            .await;
                    }
                }
            }
            _ => continue,
        }
        let (wall, paused_total) = tick_ms(&started, paused_ms, &pause_began);
        if nowplaying_remaining_ms(wall, paused_total, duration_ms) == 0 {
            break;
        }
        if m.snapshot(gid)
            .await
            .and_then(|s| s.current)
            .map(|t| t.encoded != track_id)
            .unwrap_or(true)
        {
            break;
        }
    }
    // Disable-on-end like the TS collector `end` leg.
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        artwork_or_fallback, card_percent_js, format_clock_secs, nowplaying_card_html,
        nowplaying_position_ms, nowplaying_progress, nowplaying_remaining_ms, parse_hex_colour,
        trim_lyrics_1997, NOWPLAYING_ARTWORK_FALLBACK, STREAM_COLLECTOR_CAP_MS,
    };

    #[test]
    fn clock_pads_like_ts_format_time() {
        assert_eq!(format_clock_secs(0), "00:00");
        assert_eq!(format_clock_secs(65), "01:05");
        assert_eq!(format_clock_secs(600), "10:00");
    }

    #[test]
    fn progress_bar_is_17_wide_with_pointer() {
        let p = nowplaying_progress(0, 200_000);
        assert_eq!(p.current, "00:00");
        assert_eq!(p.total, "03:20");
        assert!(p.bar.starts_with("00:00 ┃ ●"));
        assert!(p.bar.ends_with("┃ 03:20"));
        // 15 dashes + pointer at zero progress.
        assert_eq!(p.bar.chars().filter(|c| *c == '━').count(), 15);
    }

    #[test]
    fn progress_halfway_splits_dashes() {
        let p = nowplaying_progress(90_000, 180_000);
        assert_eq!(p.current, "01:30");
        let before = p.bar.split('●').next().unwrap();
        assert_eq!(before.chars().filter(|c| *c == '━').count(), 7);
    }

    #[test]
    fn progress_clamps_past_duration_and_zero_duration() {
        let p = nowplaying_progress(300_000, 180_000);
        assert_eq!(p.bar.chars().filter(|c| *c == '━').count(), 15);
        let z = nowplaying_progress(5_000, 0);
        assert_eq!(z.total, "00:00");
    }

    #[test]
    fn lyrics_trim_appends_ellipsis_at_ts_width() {
        assert_eq!(trim_lyrics_1997("abc"), "abc");
        let long = "x".repeat(2000);
        let t = trim_lyrics_1997(&long);
        assert!(t.ends_with("..."));
        assert_eq!(t.chars().count(), 2000);
    }

    #[test]
    fn position_freezes_while_paused_and_caps_at_duration() {
        assert_eq!(nowplaying_position_ms(10_000, 0, 180_000), 10_000);
        // Paused spans are subtracted (mirrors player.position).
        assert_eq!(nowplaying_position_ms(10_000, 4_000, 180_000), 6_000);
        assert_eq!(nowplaying_position_ms(3_000, 5_000, 180_000), 0);
        // Capped at the track duration; streams are uncapped.
        assert_eq!(nowplaying_position_ms(300_000, 0, 180_000), 180_000);
        assert_eq!(nowplaying_position_ms(300_000, 0, 0), 300_000);
        assert_eq!(nowplaying_position_ms(300_000, 50_000, 0), 250_000);
    }

    #[test]
    fn remaining_is_duration_minus_elapsed() {
        assert_eq!(nowplaying_remaining_ms(0, 0, 180_000), 180_000);
        assert_eq!(nowplaying_remaining_ms(90_000, 0, 180_000), 90_000);
        // Paused time does not consume the collector lifetime.
        assert_eq!(nowplaying_remaining_ms(90_000, 30_000, 180_000), 120_000);
        assert_eq!(nowplaying_remaining_ms(200_000, 0, 180_000), 0);
        // Streams count down the collector cap instead.
        assert_eq!(nowplaying_remaining_ms(0, 0, 0), STREAM_COLLECTOR_CAP_MS);
        assert_eq!(
            nowplaying_remaining_ms(100_000, 20_000, 0),
            STREAM_COLLECTOR_CAP_MS - 80_000
        );
    }

    #[test]
    fn artwork_falls_back_to_unknown_user_png() {
        assert_eq!(artwork_or_fallback(None), NOWPLAYING_ARTWORK_FALLBACK);
        assert_eq!(artwork_or_fallback(Some("")), NOWPLAYING_ARTWORK_FALLBACK);
        assert_eq!(
            artwork_or_fallback(Some("https://img/u.png")),
            "https://img/u.png"
        );
    }

    #[test]
    fn card_percent_matches_js_string_of_division() {
        assert_eq!(card_percent_js(0, 200_000), "0");
        assert_eq!(card_percent_js(90_000, 180_000), "50");
        // Raw float division like TS: 0/0 -> NaN, x/0 -> Infinity.
        assert_eq!(card_percent_js(0, 0), "NaN");
        assert_eq!(card_percent_js(5_000, 0), "Infinity");
    }

    #[test]
    fn card_html_fills_every_template_placeholder() {
        let html = nowplaying_card_html(
            "Title",
            "Artist",
            "https://img/u.png",
            "#111111",
            "#222222",
            "50",
            "01:30",
            "03:00",
        );
        for token in [
            "{album_cover}",
            "{song_title}",
            "{song_author}",
            "{color1}",
            "{color2}",
            "{time0}",
            "{time1}",
            "{time2}",
        ] {
            assert!(!html.contains(token), "unfilled {token}");
        }
        assert!(html.contains("Title"));
        assert!(html.contains("https://img/u.png"));
    }

    #[test]
    fn hex_colour_parses_with_ts_fallback() {
        assert_eq!(parse_hex_colour("#6fa8dc"), 0x6FA8DC);
        assert_eq!(parse_hex_colour("cd703a"), 0xCD703A);
        assert_eq!(parse_hex_colour("not-a-color"), 0x6FA8DC);
    }
}
