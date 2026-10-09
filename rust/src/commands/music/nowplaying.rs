use super::*;

/// Mirrors `!nowplaying.ts`.
#[poise::command(slash_command, prefix_command, rename = "nowplaying")]
pub async fn m_nowplaying(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    match snap.and_then(|s| s.current.map(|t| (t, s.paused))) {
        Some((t, paused)) => {
            let state = if paused { "paused" } else { "playing" };
            let preview = preview_for_track(&t).await;
            let embed = preview_embed(&preview, Some(t.length_ms));
            let mut reply = poise::CreateReply::default().embed(embed);
            // Spotify-sourced tracks get the SVG banner card (TS
            // .spotify-banner html2png equivalent, no browser here).
            if preview.source == Some(MetaSource::Spotify) {
                let svg = spotify_banner_svg(&preview.title, preview.artist.as_deref(), state);
                reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
                    svg.into_bytes(),
                    "nowplaying.svg",
                ));
            }
            ctx.send(reply).await?;
        }
        None => {
            ctx.say("Nothing playing.").await?;
        }
    }
    Ok(())
}
