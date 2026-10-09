use super::*;

/// Full-question guard. Mirrors `question?.split(" ")` + `if (!text?.[2])`
/// in question.ts: at least 3 space-separated parts with a non-empty third.
pub fn question_words_ok(content: &str) -> bool {
    let parts: Vec<&str> = content.split(' ').collect();
    parts.len() > 2 && !parts[2].is_empty()
}

/// Fill the question embed title. Mirrors the TS global replace of
/// `${interaction.user.username}` with the target author's display name.
pub fn question_title(template: &str, author_display: &str) -> String {
    template.replace("${interaction.user.username}", author_display)
}

/// Pick the 8-ball answer. Mirrors `reponses[Math.floor(Math.random() *
/// reponses.length)]` over the guild language `question_s` pool.
pub fn pick_answer(pool: &[String], now_ms: u64) -> &str {
    if pool.is_empty() {
        return crate::commands::fun::eightball(now_ms);
    }
    &pool[(now_ms as usize) % pool.len()]
}

/// 8-ball on a message. Mirrors the "Pose a question!" message command in
/// MessageApplicationCommands/question.ts: short content gets
/// `question_not_full`, otherwise an embed with the question + random answer.
#[poise::command(context_menu_command = "Pose a question!")]
pub async fn msg_question(
    ctx: Ctx<'_>,
    #[description = "Message"] msg: poise::serenity_prelude::Message,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude::CreateEmbed;
    use poise::CreateReply;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let question = if msg.content.is_empty() {
        ".".to_string()
    } else {
        msg.content.clone()
    };
    if !question_words_ok(&question) {
        ctx.say(
            crate::lang::get(&code, "question_not_full")
                .unwrap_or_else(|| "Enter a full question with 3 or more words!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let author_display = msg
        .author
        .global_name
        .clone()
        .unwrap_or_else(|| msg.author.tag());
    let pool = crate::lang::get_list(&code, "question_s");
    let answer = pick_answer(&pool, now_ms() as u64).to_string();
    let embed = CreateEmbed::default()
        .title(question_title(
            &crate::lang::get(&code, "question_embed_title")
                .unwrap_or_else(|| "__**Question**__: `${interaction.user.username}`".to_string()),
            &author_display,
        ))
        .colour(0xDDD98B)
        .field(
            crate::lang::get(&code, "question_fields_input_embed")
                .unwrap_or_else(|| ":question:__**Question**__".to_string()),
            question,
            true,
        )
        .field(
            crate::lang::get(&code, "question_fields_output_embed")
                .unwrap_or_else(|| ":grey_exclamation:__**Answer:**__".to_string()),
            answer,
            false,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// 10 MB per-attachment cap. Mirrors MAX_ATTACHMENT_SIZE_BYTES in play.ts.
pub const PLAY_MAX_ATTACHMENT_BYTES: u64 = 10 * 1024 * 1024;

/// Resolve the play queries for a message. Mirrors play.ts: attachment URLs
/// win when the message has attachments, otherwise the message content.
/// Oversized attachments abort with `"too_large"`, empty content with `"empty"`.
pub fn play_queries(
    attachments: &[(String, u64)],
    content: &str,
) -> Result<Vec<String>, &'static str> {
    if attachments
        .iter()
        .any(|(_, size)| *size > PLAY_MAX_ATTACHMENT_BYTES)
    {
        return Err("too_large");
    }
    if !attachments.is_empty() {
        return Ok(attachments.iter().map(|(url, _)| url.clone()).collect());
    }
    let title = content.trim();
    if title.is_empty() {
        return Err("empty");
    }
    Ok(vec![title.to_string()])
}

/// Queue a message's content. Mirrors the "Play it in a voice channel"
/// message command in MessageApplicationCommands/play.ts (attachment URLs
/// preferred, 10 MB guard via `p_attachment_too_large`; lavalink wiring
/// pending, history recorded like /music play).
#[poise::command(context_menu_command = "Play it in a voice channel")]
pub async fn msg_play(
    ctx: Ctx<'_>,
    #[description = "Message"] msg: poise::serenity_prelude::Message,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let attachments: Vec<(String, u64)> = msg
        .attachments
        .iter()
        .map(|a| (a.url.clone(), a.size as u64))
        .collect();
    match play_queries(&attachments, &msg.content) {
        Err("too_large") => {
            let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "p_attachment_too_large")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "The attached file exceeds the 10MB limit.".to_string()),
            )
            .await?;
            Ok(())
        }
        Err(_) => {
            ctx.say(
                crate::lang::get(&code, "msg_empty_message")
                    .unwrap_or_else(|| "Empty message.".to_string()),
            )
            .await?;
            Ok(())
        }
        Ok(queries) => {
            let title = queries.join(", ");
            ctx.say(
                crate::lang::get(&code, "msg_queued_title_lavalink_wiring_pending")
                    .map(|s| s.replace("{title}", &title))
                    .unwrap_or_else(|| format!("Queued: {title} [lavalink wiring pending]")),
            )
            .await?;
            Ok(())
        }
    }
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
    use super::{
        escape_drawtext, is_audio_attachment, msg_convert_mp4, msg_play, msg_question, pick_answer,
        play_queries, question_title, question_words_ok,
    };

    #[test]
    fn audio_check_matches_ts() {
        assert!(is_audio_attachment(Some("audio/ogg"), "x.bin"));
        assert!(is_audio_attachment(None, "song.MP3"));
        assert!(is_audio_attachment(Some("video/mp4"), "clip.webm"));
        assert!(!is_audio_attachment(Some("image/png"), "pic.png"));
        assert!(!is_audio_attachment(None, "note.txt"));
    }

    /// Name locks: must stay identical to MessageApplicationCommands/*.ts.
    /// (poise keeps the context-menu display string in `context_menu_name`;
    /// `name` is the function identifier.)
    #[test]
    fn context_menu_names_match_ts() {
        assert_eq!(
            msg_question().context_menu_name.as_deref(),
            Some("Pose a question!")
        );
        assert_eq!(
            msg_play().context_menu_name.as_deref(),
            Some("Play it in a voice channel")
        );
        assert_eq!(
            msg_convert_mp4().context_menu_name.as_deref(),
            Some("Convert to MP4")
        );
    }

    #[test]
    fn question_guard_matches_ts_split_check() {
        assert!(!question_words_ok("."));
        assert!(!question_words_ok("is this"));
        assert!(!question_words_ok("a b "));
        assert!(question_words_ok("is this real"));
        assert!(question_words_ok("a b c d"));
    }

    #[test]
    fn question_title_replaces_author() {
        assert_eq!(
            question_title("Q `${interaction.user.username}`!", "Bob"),
            "Q `Bob`!"
        );
    }

    #[test]
    fn pick_answer_cycles_pool_and_falls_back() {
        let pool = vec!["Yes.".to_string(), "No.".to_string()];
        assert_eq!(pick_answer(&pool, 0), "Yes.");
        assert_eq!(pick_answer(&pool, 1), "No.");
        assert_eq!(pick_answer(&pool, 2), "Yes.");
        let empty: Vec<String> = vec![];
        assert!(!pick_answer(&empty, 3).is_empty());
    }

    #[test]
    fn play_queries_mirror_ts_priority_and_caps() {
        // Attachments win over content.
        assert_eq!(
            play_queries(&[("https://cdn/x.mp3".to_string(), 100)], "some text").unwrap(),
            vec!["https://cdn/x.mp3".to_string()]
        );
        // Content fallback, trimmed.
        assert_eq!(
            play_queries(&[], "  hello  ").unwrap(),
            vec!["hello".to_string()]
        );
        // Oversized attachment aborts (10 MB cap like TS).
        assert_eq!(
            play_queries(
                &[("https://cdn/big.mp3".to_string(), 10 * 1024 * 1024 + 1)],
                "text"
            ),
            Err("too_large")
        );
        // Empty message with no attachments aborts.
        assert_eq!(play_queries(&[], "   "), Err("empty"));
    }

    #[test]
    fn drawtext_escape_matches_ts() {
        assert_eq!(escape_drawtext("a:b\\c'd"), "a\\:b\\\\c\\'d");
    }
}
