use super::*;
use crate::commands::shared::{embed_with_footer, footer_parts};

/// Backend divergence (documented, E1): TS `searchLyrics.ts:25-60`
/// resolves lyrics through the Lavalink node (`search` + the
/// lyrics-plugin `lyrics.get(track)`, synced lyrics, `null` when none).
/// This port fetches plain (unsynced) lyrics text from the lyrics.ovh
/// API instead — no lyrics-plugin round-trip — and uses the live
/// Lavalink search hit only for track identity (title/uri/artwork/
/// author, see `resolve_lyrics_meta`). `None` here covers both TS
/// null legs (no suggest hit, empty text).
pub(crate) async fn fetch_lyrics_text(query: &str) -> Option<(String, String)> {
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

/// Track identity for the lyrics embed. Lavalink search hit first
/// (TS `res.tracks[0].info`); suggest-result fallback when offline.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct LyricsTrackMeta {
    pub title: Option<String>,
    pub author: Option<String>,
    pub uri: Option<String>,
    pub artwork: Option<String>,
}

pub(crate) async fn resolve_lyrics_meta(
    m: &crate::lavalink::LavalinkManager,
    gid: u64,
    query: &str,
) -> LyricsTrackMeta {
    let Ok((node, _)) = m.live_node_and_session(gid).await else {
        return LyricsTrackMeta::default();
    };
    let id = crate::lavalink::LavalinkManager::search_identifier(query);
    let track = match m.rest_load(&node, &id).await {
        Ok(lava_rs::rest::LoadResult::Track(t)) => Some(t),
        Ok(lava_rs::rest::LoadResult::Search(v)) => v.into_iter().next(),
        Ok(lava_rs::rest::LoadResult::Playlist(d)) => d.tracks.into_iter().next(),
        _ => None,
    };
    match track {
        Some(t) => LyricsTrackMeta {
            title: Some(t.info.title.clone()),
            author: Some(t.info.author.clone()),
            uri: t.info.uri.clone(),
            artwork: t.info.artwork_url.clone(),
        },
        None => LyricsTrackMeta::default(),
    }
}

/// TS `substring(0, 1997)` + `"..."` suffix rule (`trimmed.length ===
/// 1997`, which holds whenever the source reached that width —
/// including an exactly-1997 source), char-safe.
pub fn lyrics_embed_description(text: &str) -> String {
    let trimmed: String = text.chars().take(1997).collect();
    if text.chars().count() >= 1997 {
        format!("{trimmed}...")
    } else {
        trimmed
    }
}

/// Lyrics command.
#[poise::command(slash_command, prefix_command, rename = "lyrics")]
pub async fn m_lyrics(
    ctx: Ctx<'_>,
    #[description = "Query"] query: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let gid_str = ctx.guild_id().map(|g| g.get().to_string());
    let not_found = || {
        crate::lang::get(&code, "lyrics_not_found").unwrap_or_else(|| "No lyrics found".to_string())
    };
    let Some((suggest_title, text)) = fetch_lyrics_text(&query).await else {
        ctx.say(not_found()).await?;
        return Ok(());
    };
    let meta = match ctx.guild_id() {
        Some(g) => resolve_lyrics_meta(synced_mgr(&ctx).await, g.get(), &query).await,
        None => LyricsTrackMeta::default(),
    };
    let title = meta.title.clone().unwrap_or(suggest_title);
    let author = meta.author.clone().unwrap_or_else(|| {
        crate::lang::get(&code, "lyrics_embed_author_name_unknown")
            .unwrap_or_else(|| "Unknown author".to_string())
    });
    let title = if title.trim().is_empty() {
        crate::lang::get(&code, "lyrics_embed_title_unknown")
            .unwrap_or_else(|| "Unknown title".to_string())
    } else {
        title
    };
    let mut embed = serenity::CreateEmbed::default()
        .title(title)
        .url(
            meta.uri
                .as_deref()
                .filter(|u| !u.is_empty())
                .unwrap_or("https://www.ihorizon.org"),
        )
        .author(serenity::CreateEmbedAuthor::new(author))
        .description(lyrics_embed_description(&text))
        .colour(0xCD703A)
        .timestamp(serenity::Timestamp::now());
    if let Some(art) = meta.artwork.as_deref().filter(|u| !u.is_empty()) {
        embed = embed.thumbnail(art);
    }
    let reply = match &gid_str {
        Some(g) => {
            let (fname, fbytes) = footer_parts(&ctx, g).await;
            embed = embed_with_footer(embed, &fname, fbytes.is_some());
            let mut r = poise::CreateReply::default().embed(embed);
            if let Some(bytes) = fbytes {
                r = r.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
            }
            r
        }
        None => poise::CreateReply::default().embed(embed),
    };
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn description_passes_short_through() {
        assert_eq!(lyrics_embed_description("abc"), "abc");
    }

    #[test]
    fn description_trims_long_with_ellipsis() {
        let long = "x".repeat(3000);
        let out = lyrics_embed_description(&long);
        assert_eq!(out.len(), 2000);
        assert!(out.ends_with("..."));
        assert_eq!(&out[..1997], "x".repeat(1997).as_str());
    }

    #[test]
    fn description_exact_1997_gets_suffix_like_ts() {
        // TS checks `trimmed.length === 1997`, which also holds for an
        // exactly-1997 source, so the suffix applies there too.
        let exact = "y".repeat(1997);
        assert_eq!(
            lyrics_embed_description(&exact),
            format!("{}...", "y".repeat(1997))
        );
        let under = "y".repeat(1996);
        assert_eq!(lyrics_embed_description(&under), under);
        let over = "y".repeat(1998);
        assert_eq!(
            lyrics_embed_description(&over),
            format!("{}...", "y".repeat(1997))
        );
    }
}
