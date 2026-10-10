use super::*;

/// Mirrors `!trackinfo.ts` (search/current track, lyrics, Link button).
#[poise::command(slash_command, prefix_command, rename = "trackinfo")]
pub async fn m_trackinfo(
    ctx: Ctx<'_>,
    #[description = "Title or URL"] title: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    // Empty search never matches (TS `searchMusicQuery` with "").
    async fn no_result(ctx: &Ctx<'_>, code: &str) -> Result<(), anyhow::Error> {
        ctx.send(
            poise::CreateReply::default()
                .embed(no_result_embed(code))
                .ephemeral(true),
        )
        .await?;
        Ok(())
    }
    if let Some(q) = title {
        // Full resolve pipeline (mirrors `!trackinfo.ts:61-65`
        // `searchMusicQuery(query || "")`): every source leg applies,
        // and any resolve failure answers the no-result embed like TS
        // (`!res || res.tracks.length <= 0`).
        match m.resolve_query_tracks(gid, &q).await {
            Ok((tracks, _)) if !tracks.is_empty() => {
                return reply_for_lava(&ctx, &code, &tracks[0], Some(&q)).await;
            }
            Ok(_) => {
                return no_result(&ctx, &code).await;
            }
            Err(crate::lavalink::MusicError::NoNodes) => {}
            Err(_) => {
                return no_result(&ctx, &code).await;
            }
        }
        // Node offline: still try metadata when the query itself is a URL.
        match enrich_preview(&q).await {
            Some(p) => {
                return reply_for_preview(&ctx, &code, &p, Some(&q)).await;
            }
            None => {
                return no_result(&ctx, &code).await;
            }
        }
    }
    // No query means no search, hence the no-result embed — mirrors
    // `!trackinfo.ts:61-73` (`searchMusicQuery(query || "")` with no
    // current-track fallback).
    no_result(&ctx, &code).await
}

/// Lava search-hit path: artwork/colour from the hit, enrichment for the
/// provider image when Lavalink ships none. `query` feeds the lyrics
/// lookup (TS `searchLyrics(String(query))`).
async fn reply_for_lava(
    ctx: &Ctx<'_>,
    code: &str,
    t: &lava_rs::model::Track,
    query: Option<&str>,
) -> Result<(), anyhow::Error> {
    let p = enriched_from_lava(t).await;
    let artwork = t
        .info
        .artwork_url
        .clone()
        .filter(|u| !u.trim().is_empty())
        .or(p.image.clone());
    let requester = ctx.author().name.clone();
    reply_for_trackinfo(
        ctx,
        code,
        &t.info.title,
        &t.info.author,
        t.info.uri.as_deref(),
        artwork.as_deref(),
        &requester,
        query,
    )
    .await
}

/// Resolve a lava track (query search or current track), then enrich via
/// source-detected metadata with Lavalink fallback.
async fn enriched_from_lava(t: &lava_rs::model::Track) -> NormalizedPreview {
    match t.info.uri.as_deref() {
        Some(url) => enrich_preview(url).await.unwrap_or_else(|| {
            fallback_preview(&t.info.title, &t.info.author, t.info.uri.as_deref())
        }),
        None => fallback_preview(&t.info.title, &t.info.author, None),
    }
}

/// Offline URL-metadata path (no Lavalink hit).
async fn reply_for_preview(
    ctx: &Ctx<'_>,
    code: &str,
    p: &NormalizedPreview,
    query: Option<&str>,
) -> Result<(), anyhow::Error> {
    let requester = ctx.author().name.clone();
    let link = Some(p.link.as_str()).filter(|s| !s.is_empty());
    reply_for_trackinfo(
        ctx,
        code,
        &p.title,
        p.artist.as_deref().unwrap_or(""),
        link,
        p.image.as_deref(),
        &requester,
        query,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
async fn reply_for_trackinfo(
    ctx: &Ctx<'_>,
    code: &str,
    title: &str,
    author: &str,
    uri: Option<&str>,
    artwork: Option<&str>,
    requester: &str,
    lyrics_query: Option<&str>,
) -> Result<(), anyhow::Error> {
    let link = uri.unwrap_or_default();
    let trimmed = match lyrics_query {
        Some(q) => super::lyrics::fetch_lyrics_text(q)
            .await
            .map(|(_, text)| super::lyrics::lyrics_embed_description(&text)),
        None => None,
    }
    .filter(|s| !s.trim().is_empty())
    .unwrap_or_else(|| {
        crate::lang::get(code, "lyrics_not_found").unwrap_or_else(|| "No lyrics found".to_string())
    });
    let micro = emoji_markup(ctx, "Micro", "🎤").await;
    let music_icon = emoji_markup(ctx, "Music_Icon", "🎵").await;
    let lyrics_word =
        crate::lang::get(code, "music_lyrics").unwrap_or_else(|| "Lyrics".to_string());
    let requested_by =
        crate::lang::get(code, "music_requested_by").unwrap_or_else(|| "Requested by".to_string());
    let link_here = crate::lang::get(code, "music_link_here")
        .unwrap_or_else(|| "Link here: [Click here]({link})".to_string());
    let visit_here =
        crate::lang::get(code, "music_visit_here").unwrap_or_else(|| "Visit here".to_string());
    let colour = dominant_colour(artwork).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(colour)
        .title(format!("{music_icon} {title}"))
        .description(trackinfo_description(
            &link_here,
            link,
            &micro,
            &lyrics_word,
            &trimmed,
        ))
        .footer(serenity::CreateEmbedFooter::new(trackinfo_footer(
            author,
            &requested_by,
            requester,
        )));
    if let Some(art) = artwork.filter(|u| !u.is_empty()) {
        embed = embed.thumbnail(art);
    }
    let mut reply = poise::CreateReply::default().embed(embed);
    if !link.is_empty() {
        let button = serenity::CreateButton::new_link(link.to_string()).label(visit_here);
        reply = reply.components(vec![serenity::CreateActionRow::Buttons(vec![button])]);
    }
    ctx.send(reply).await?;
    Ok(())
}

/// TS `image_dominant_color(artworkUrl || unknown-user.png)` colour leg
/// (`color1`); constant fallback when the fetch fails.
async fn dominant_colour(artwork: Option<&str>) -> u32 {
    let input = artwork
        .filter(|u| !u.is_empty())
        .unwrap_or("https://www.ihorizon.org/assets/img/unknown-user.png");
    match crate::funcs::image_dominant_color(input).await {
        Ok((c1, _)) => u32::from_str_radix(c1.trim_start_matches('#'), 16).unwrap_or(0x2B2D31),
        Err(_) => 0x2B2D31,
    }
}

/// TS description shape:
/// `{music_link_here({link} -> uri)}\n# {micro} {lyrics}\n*{trimmed}*`.
pub fn trackinfo_description(
    link_template: &str,
    uri: &str,
    micro: &str,
    lyrics_word: &str,
    trimmed: &str,
) -> String {
    let link_line = link_template.replace("{link}", uri);
    format!("{link_line}\n# {micro} {lyrics_word}\n*{trimmed}*")
}

/// TS footer shape: `{author} - {requested_by} {username}`.
pub fn trackinfo_footer(author: &str, requested_by: &str, username: &str) -> String {
    format!("{author} - {requested_by} {username}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn description_mirrors_ts_shape() {
        let out = trackinfo_description(
            "Link here: [Click here]({link})",
            "https://example.com/t",
            "MIC",
            "Lyrics",
            "la la",
        );
        assert_eq!(
            out,
            "Link here: [Click here](https://example.com/t)\n# MIC Lyrics\n*la la*"
        );
    }

    #[test]
    fn footer_mirrors_ts_shape() {
        assert_eq!(
            trackinfo_footer("Artist", "Requested by", "bob"),
            "Artist - Requested by bob"
        );
    }
}
