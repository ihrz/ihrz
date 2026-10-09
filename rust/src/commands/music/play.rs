use super::*;

/// Mirrors `!play.ts`.
#[poise::command(slash_command, prefix_command, rename = "play", aliases("p"))]
pub async fn m_play(
    ctx: Ctx<'_>,
    #[description = "Title or URL"] title: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    if (title.contains("://") || title.contains("www.")) && !crate::funcs::is_allowed_links(&title)
    {
        ctx.say(
            crate::lang::get(&code, "p_not_allowed")
                .unwrap_or_else(|| "The link you sent is not supported by this bot. Please use authorized music streaming services such as Deezer, Spotify, Soundcloud, etc.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let voice = voice_channel_of(&ctx);
    if voice.is_none() {
        ctx.say(
            crate::lang::get(&code, "msg_not_in_voice")
                .unwrap_or_else(|| "You must be in a voice channel to play music.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let m = synced_mgr(&ctx).await;
    let requester = ctx.author().id.get();
    let text_channel = ctx.channel_id().get();
    m.with_player(gid, |p| {
        p.voice_channel = voice;
        p.text_channel = Some(text_channel);
    })
    .await;
    match m.play_query(gid, &title, requester, now_ms()).await {
        Ok((0, t)) => {
            record_history(&ctx.data().pool, gid, &title).await;
            ctx.say(format!("Now playing: {} - {}", t.author, t.title))
                .await?;
        }
        Ok((pos, t)) => {
            record_history(&ctx.data().pool, gid, &title).await;
            ctx.say(format!("Queued at #{pos}: {} - {}", t.author, t.title))
                .await?;
        }
        Err(crate::lavalink::MusicError::NoNodes) => {
            record_history(&ctx.data().pool, gid, &title).await;
            ctx.say(
                crate::lang::get(&code, "msg_lavalink_offline")
                    .unwrap_or_else(|| {
                        "No Lavalink node is configured; the track was recorded in history but cannot play.".to_string()
                    }),
            )
            .await?;
        }
        Err(e) => {
            ctx.say(format!("Play failed: {e}")).await?;
        }
    }
    Ok(())
}
