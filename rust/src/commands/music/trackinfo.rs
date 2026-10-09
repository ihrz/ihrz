use super::*;

/// Mirrors `!trackinfo.ts`.
// Track info lookup: live Lavalink search when a query is given,
// otherwise the current track. Mirrors !trackinfo.ts.
#[poise::command(slash_command, prefix_command, rename = "trackinfo")]
pub async fn m_trackinfo(
    ctx: Ctx<'_>,
    #[description = "Title or URL"] title: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        ctx.say("This command can only be used in a server.")
            .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    // Resolve a lava track first (query search or current track), then
    // enrich via source-detected metadata with Lavalink fallback.
    async fn enriched_from_lava(t: &lava_rs::model::Track) -> NormalizedPreview {
        match t.info.uri.as_deref() {
            Some(url) => enrich_preview(url).await.unwrap_or_else(|| {
                fallback_preview(&t.info.title, &t.info.author, t.info.uri.as_deref())
            }),
            None => fallback_preview(&t.info.title, &t.info.author, None),
        }
    }
    if let Some(q) = title {
        if let Ok((node, _)) = m.live_node_and_session(gid).await {
            let id = crate::lavalink::LavalinkManager::search_identifier(&q);
            match m.rest_load(&node, &id).await {
                Ok(lava_rs::rest::LoadResult::Track(t)) => {
                    let p = enriched_from_lava(&t).await;
                    let len = if t.info.length == 0 {
                        None
                    } else {
                        Some(t.info.length)
                    };
                    ctx.send(poise::CreateReply::default().embed(preview_embed(&p, len)))
                        .await?;
                    return Ok(());
                }
                Ok(lava_rs::rest::LoadResult::Search(v)) if !v.is_empty() => {
                    let p = enriched_from_lava(&v[0]).await;
                    ctx.send(
                        poise::CreateReply::default()
                            .embed(preview_embed(&p, Some(v[0].info.length))),
                    )
                    .await?;
                    return Ok(());
                }
                Ok(lava_rs::rest::LoadResult::Playlist(d)) if !d.tracks.is_empty() => {
                    let p = enriched_from_lava(&d.tracks[0]).await;
                    let mut embed = preview_embed(&p, Some(d.tracks[0].info.length));
                    embed = embed.field(
                        "Playlist",
                        format!("{} ({} tracks)", d.info.name, d.tracks.len()),
                        false,
                    );
                    ctx.send(poise::CreateReply::default().embed(embed)).await?;
                    return Ok(());
                }
                _ => {
                    ctx.say("No matches found.").await?;
                    return Ok(());
                }
            }
        }
        // Node offline: still try metadata when the query itself is a URL.
        match enrich_preview(&q).await {
            Some(p) => {
                ctx.send(poise::CreateReply::default().embed(preview_embed(&p, None)))
                    .await?;
            }
            None => {
                ctx.say(format!("Track info for {q} (node offline)."))
                    .await?;
            }
        }
        return Ok(());
    }
    match m.snapshot(gid).await.and_then(|s| s.current) {
        Some(t) => {
            let p = preview_for_track(&t).await;
            ctx.send(poise::CreateReply::default().embed(preview_embed(&p, Some(t.length_ms))))
                .await?;
        }
        None => {
            ctx.say("Nothing playing.").await?;
        }
    }
    Ok(())
}
