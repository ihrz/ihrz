use super::*;
use std::time::{Duration, Instant};

/// Live-card refresh cadence, mirroring TS `setInterval(..., 5900)`.
pub const NOWPLAYING_REFRESH_MS: u64 = 5900;
/// Streams report `length_ms == 0`; bound their collector like a long track.
const STREAM_COLLECTOR_CAP_MS: u64 = 600_000;

/// `MM:SS` clock, mirroring TS `formatTime` (`padStart(2, "0")`).
pub fn format_clock_secs(secs: u64) -> String {
    format!("{:02}:{:02}", secs / 60, secs % 60)
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

/// TS lyrics leg trims to 1997 chars and appends `...` whenever the source
/// reached that width (substring(0, 1997) + length check).
pub fn trim_lyrics_1997(s: &str) -> String {
    let head: String = s.chars().take(1997).collect();
    if s.chars().count() >= 1997 {
        format!("{head}...")
    } else {
        head
    }
}

fn nowplaying_embed(
    title: &str,
    author: &str,
    uri: Option<&str>,
    requester_id: u64,
    prog: &NowProgress,
) -> serenity::CreateEmbed {
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("**{title}**, {author}"))
        .description(format!("by: <@{requester_id}>\n{}", prog.bar))
        .colour(0x6FA8DC);
    if let Some(u) = uri.filter(|u| !u.is_empty()) {
        embed = embed.url(u);
    }
    embed
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

/// Mirrors `!nowplaying.ts` (live card + collector, see below).
// Live progress card refreshed every 5.9s plus a requester-gated button
// collector (`pause` / `stop` / `lyrics`). Position is tracked locally
// from command time (no live Lavalink position in the snapshot); the loop
// ends when the track changes, its time is up, or the collector times
// out, and the buttons are stripped on end like TS.
#[poise::command(slash_command, prefix_command, rename = "nowplaying")]
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
    let collect_for_ms = if duration_ms > 0 {
        duration_ms
    } else {
        STREAM_COLLECTOR_CAP_MS
    };
    let started = Instant::now();
    let mut paused = s.paused;

    let prog = nowplaying_progress(0, duration_ms);
    let embed = nowplaying_embed(
        &track.title,
        &track.author,
        track.uri.as_deref(),
        requester_id,
        &prog,
    );
    let stop_label =
        crate::lang::get(&code, "nowplaying_stop_label").unwrap_or_else(|| "Stop".to_string());
    let pause_label =
        crate::lang::get(&code, "nowplaying_pause_label").unwrap_or_else(|| "Pause".to_string());
    let lyrics_label =
        crate::lang::get(&code, "nowplaying_lyrics_label").unwrap_or_else(|| "Lyrics".to_string());
    let mk_row = || {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("np-stop")
                .label(stop_label.clone())
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("np-pause")
                .label(pause_label.clone())
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("np-lyrics")
                .label(lyrics_label.clone())
                .style(serenity::ButtonStyle::Secondary),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(vec![mk_row()]);
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
            if started.elapsed().as_millis() as u64 >= collect_for_ms {
                break;
            }
            let current_now = m.snapshot(gid).await.and_then(|s| s.current);
            match current_now {
                Some(t) if t.encoded == track_id => {
                    if !paused {
                        let elapsed = started.elapsed().as_millis() as u64;
                        let pos = elapsed.min(duration_ms.max(elapsed));
                        let prog = nowplaying_progress(pos, duration_ms);
                        let fresh = nowplaying_embed(
                            &t.title,
                            &t.author,
                            t.uri.as_deref(),
                            requester_id,
                            &prog,
                        );
                        let _ = msg
                            .edit(ctx.http(), serenity::EditMessage::new().embed(fresh))
                            .await;
                    }
                }
                _ => break,
            }
            continue;
        };
        if !press.data.custom_id.starts_with("np-") {
            continue;
        }
        // Requester gate (TS compares against the track requester).
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
            "np-pause" => {
                paused = !paused;
                m.with_player(gid, |p| p.paused = paused).await;
                if let Ok((node, session)) = m.live_node_and_session(gid).await {
                    let _ = m.rest_set_paused(&node, &session, gid, paused).await;
                }
                let elapsed = started.elapsed().as_millis() as u64;
                let prog = nowplaying_progress(elapsed.min(duration_ms.max(elapsed)), duration_ms);
                let fresh = nowplaying_embed(
                    &track.title,
                    &track.author,
                    track.uri.as_deref(),
                    requester_id,
                    &prog,
                );
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
                let _ = ctx.say(text).await;
            }
            "np-stop" => {
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
                let elapsed = started.elapsed().as_millis() as u64;
                let prog = nowplaying_progress(elapsed.min(duration_ms.max(elapsed)), duration_ms);
                let fresh = nowplaying_embed(
                    &track.title,
                    &track.author,
                    track.uri.as_deref(),
                    requester_id,
                    &prog,
                );
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
                let _ = ctx.say(text).await;
                break;
            }
            "np-lyrics" => {
                let query = format!("{} - {}", track.title, track.author);
                let response = match fetch_lyrics_text(&query).await {
                    Some((_, body)) => {
                        let lyrics_embed = serenity::CreateEmbed::default()
                            .title(track.title.clone())
                            .author(serenity::CreateEmbedAuthor::new(track.author.clone()))
                            .description(trim_lyrics_1997(&body))
                            .colour(0xCD703A)
                            .timestamp(serenity::Timestamp::now());
                        let mut msg_builder = serenity::CreateInteractionResponseMessage::new()
                            .embed(lyrics_embed)
                            .ephemeral(true);
                        if let Some(u) = track.uri.as_deref().filter(|u| !u.is_empty()) {
                            msg_builder = msg_builder.content(format!("<{u}>"));
                        }
                        serenity::CreateInteractionResponse::Message(msg_builder)
                    }
                    None => {
                        let text = crate::lang::get(&code, "nowplaying_lyrics_button")
                            .unwrap_or_else(|| {
                                "The lyrics for this song were not found".to_string()
                            });
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(text)
                                .ephemeral(true),
                        )
                    }
                };
                let _ = press.create_response(ctx.http(), response).await;
            }
            _ => continue,
        }
        if started.elapsed().as_millis() as u64 >= collect_for_ms {
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
    use super::{format_clock_secs, nowplaying_progress, trim_lyrics_1997};

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
}
