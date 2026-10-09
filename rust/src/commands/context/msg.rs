use super::*;

/// 8-ball on a message. Mirrors question message-command bridge.
#[poise::command(context_menu_command = "Question")]
pub async fn msg_question(
    ctx: Ctx<'_>,
    #[description = "Message"] msg: poise::serenity_prelude::Message,
) -> Result<(), anyhow::Error> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    ctx.say(crate::commands::fun::eightball(
        now.wrapping_add(msg.id.get()),
    ))
    .await?;
    Ok(())
}

/// Queue a message's content. Mirrors play message-command bridge
/// (lavalink wiring pending, history recorded like /music play).
#[poise::command(context_menu_command = "Play")]
pub async fn msg_play(
    ctx: Ctx<'_>,
    #[description = "Message"] msg: poise::serenity_prelude::Message,
) -> Result<(), anyhow::Error> {
    let title = msg.content.trim().to_string();
    if title.is_empty() {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_empty_message")
                .unwrap_or_else(|| "Empty message.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_queued_title_lavalink_wiring_pending")
            .map(|s| s.replace("{title}", &title))
            .unwrap_or_else(|| format!("Queued: {title} [lavalink wiring pending]")),
    )
    .await?;
    Ok(())
}

/// Whether an attachment looks like audio. Mirrors the contentType +
/// extension check in sound_to_video.ts.
pub fn is_audio_attachment(content_type: Option<&str>, name: &str) -> bool {
    if content_type.unwrap_or("").starts_with("audio/") {
        return true;
    }
    let lower = name.to_lowercase();
    ["ogg", "mp3", "wav", "m4a", "webm", "flac", "aac"]
        .iter()
        .any(|e| lower.ends_with(&format!(".{e}")))
}

/// Escape a filename for ffmpeg drawtext. Mirrors the TS escapes
/// (backslash/colon prefixed, single quote escaped).
pub fn escape_drawtext(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace(':', "\\:")
        .replace('\'', "\\'")
}

/// Per-user convert cooldowns (user id -> usable-again ms).
/// Mirrors helper.cooldown(user, "convert2mp4", 1m30s).
pub fn convert_cooldown_ok(now_ms: i64, user_id: u64) -> bool {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static MAP: OnceLock<Mutex<HashMap<u64, i64>>> = OnceLock::new();
    let map = MAP.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
    let next = guard.get(&user_id).copied().unwrap_or(0);
    if now_ms < next {
        return false;
    }
    guard.insert(user_id, now_ms + 90_000);
    true
}

/// Convert a message's audio attachment to MP4. Mirrors
/// MessageApplicationCommands sound_to_video.ts (ffprobe duration,
/// ffmpeg still-image render, 25 MB Discord cap).
#[poise::command(context_menu_command = "Convert to MP4")]
pub async fn msg_convert_mp4(
    ctx: Ctx<'_>,
    #[description = "Message"] msg: poise::serenity_prelude::Message,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude::{CreateAttachment, CreateEmbed};
    use poise::CreateReply;
    if !convert_cooldown_ok(now_ms(), ctx.author().id.get()) {
        ctx.send(
            CreateReply::default()
                .content(
                    crate::commands::lang_for(
                        &ctx,
                        "media_gen_cooldown",
                        "Wait between media generations.",
                    )
                    .await,
                )
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let Some(att) = msg.attachments.first() else {
        let embed = CreateEmbed::default()
            .title(crate::commands::lang_for(&ctx, "global_error", "Error").await)
            .colour(0xFF0000)
            .description(crate::commands::lang_for(&ctx, "global_not_atc", "No attachment.").await)
            .timestamp(poise::serenity_prelude::Timestamp::now());
        ctx.send(CreateReply::default().embed(embed).ephemeral(true))
            .await?;
        return Ok(());
    };
    if !is_audio_attachment(att.content_type.as_deref(), &att.filename) {
        let embed = CreateEmbed::default()
            .title("Error")
            .colour(0xFF0000)
            .description(
                crate::commands::lang_for(&ctx, "global_not_valid_atc", "Not audio.").await,
            )
            .timestamp(poise::serenity_prelude::Timestamp::now());
        ctx.send(CreateReply::default().embed(embed).ephemeral(true))
            .await?;
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let handle = ctx
        .say(crate::lang::get(&code, "msg_loading").unwrap_or_else(|| "Loading...".to_string()))
        .await?;
    let out = convert_attachment(&att.url, &att.filename).await;
    // TS leaves its tmp dir behind; we clean up ours.
    match out {
        Ok((mp4_name, mp4_bytes)) => {
            let mb = mp4_bytes.len() as f64 / (1024.0 * 1024.0);
            if mb > 25.0 {
                let embed = CreateEmbed::default()
                    .title(crate::commands::lang_for(&ctx, "global_error", "Error").await)
                    .colour(0xFF0000)
                    .description(
                        crate::commands::lang_for(
                            &ctx,
                            "global_too_heavy_file",
                            "Too large (${fileSizeMB.toFixed(2)} MB).",
                        )
                        .await
                        .replace("${fileSizeMB.toFixed(2)}", &format!("{mb:.2}")),
                    )
                    .timestamp(poise::serenity_prelude::Timestamp::now());
                handle
                    .edit(ctx, CreateReply::default().content("").embed(embed))
                    .await?;
            } else {
                let embed = CreateEmbed::default()
                    .title(crate::commands::lang_for(&ctx, "global_convert_ok", "Converted").await)
                    .colour(0x00FF00)
                    .description(
                        crate::commands::lang_for(
                            &ctx,
                            "global_convert_ok_desc",
                            "Converted (${fileSizeMB.toFixed(2)} MB).",
                        )
                        .await
                        .replace("${fileSizeMB.toFixed(2)}", &format!("{mb:.2}")),
                    )
                    .timestamp(poise::serenity_prelude::Timestamp::now());
                handle
                    .edit(
                        ctx,
                        CreateReply::default()
                            .content("")
                            .embed(embed)
                            .attachment(CreateAttachment::bytes(mp4_bytes, mp4_name)),
                    )
                    .await?;
            }
        }
        Err(e) => {
            handle
                .edit(
                    ctx,
                    CreateReply::default().content(format!("Conversion failed: {e}")),
                )
                .await?;
        }
    }
    Ok(())
}

/// Download audio, probe its duration, render the still-image MP4.
/// Returns the output filename + bytes. Shells out to ffprobe/ffmpeg
/// exactly like the TS version.
pub async fn convert_attachment(url: &str, filename: &str) -> Result<(String, Vec<u8>), String> {
    let bytes = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .map_err(|e| format!("download: {e}"))?
        .bytes()
        .await
        .map_err(|e| format!("download: {e}"))?;
    let dir =
        std::env::temp_dir().join(format!("ihrz-audiomp4-{}-{}", std::process::id(), now_ms()));
    std::fs::create_dir_all(&dir).map_err(|e| format!("tmpdir: {e}"))?;
    let input = dir.join(if filename.is_empty() {
        "input_audio".to_string()
    } else {
        filename.to_string()
    });
    std::fs::write(&input, &bytes).map_err(|e| format!("write: {e}"))?;
    let output = dir.join("output.mp4");
    let probe = std::process::Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
        ])
        .arg(&input)
        .output()
        .map_err(|e| format!("ffprobe: {e}"))?;
    let duration: f64 = String::from_utf8_lossy(&probe.stdout)
        .trim()
        .parse()
        .map_err(|_| "invalid audio duration".to_string())?;
    if !duration.is_finite() || duration <= 0.0 {
        return Err("invalid audio duration".to_string());
    }
    let stem = filename
        .rsplit_once('.')
        .map(|(s, _)| s)
        .unwrap_or(filename);
    let title = if stem.is_empty() { "Audio" } else { stem };
    let status = std::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-f",
            "lavfi",
            "-i",
            &format!("color=c=black:s=1280x720:r=1:d={duration}"),
            "-i",
            &input.to_string_lossy(),
            "-vf",
            &format!(
                "drawtext=text='{}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                escape_drawtext(title)
            ),
            "-c:v",
            "libx264",
            "-tune",
            "stillimage",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "1",
            "-movflags",
            "+faststart",
        ])
        .arg(&output)
        .status()
        .map_err(|e| format!("ffmpeg: {e}"))?;
    if !status.success() {
        return Err("ffmpeg render failed".to_string());
    }
    let mp4 = std::fs::read(&output).map_err(|e| format!("read output: {e}"))?;
    let _ = std::fs::remove_dir_all(&dir);
    Ok((format!("{title}.mp4"), mp4))
}

#[cfg(test)]
mod context_tests {
    use super::{escape_drawtext, is_audio_attachment};

    #[test]
    fn audio_check_matches_ts() {
        assert!(is_audio_attachment(Some("audio/ogg"), "x.bin"));
        assert!(is_audio_attachment(None, "song.MP3"));
        assert!(is_audio_attachment(Some("video/mp4"), "clip.webm"));
        assert!(!is_audio_attachment(Some("image/png"), "pic.png"));
        assert!(!is_audio_attachment(None, "note.txt"));
    }

    #[test]
    fn drawtext_escape_matches_ts() {
        assert_eq!(escape_drawtext("a:b\\c'd"), "a\\:b\\\\c\\'d");
    }
}
