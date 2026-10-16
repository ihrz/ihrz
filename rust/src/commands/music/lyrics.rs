use super::*;
use crate::commands::shared::{embed_with_footer, footer_parts};

/// Shared HTTP client for the lyrics.ovh legs (suggest + body): one
/// process-wide pool instead of a fresh TLS handshake per lookup.
pub(crate) fn http_client() -> reqwest::Client {
    static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(reqwest::Client::new).clone()
}

/// Backend divergence (documented, E1): TS `searchLyrics.ts:25-60`
/// resolves lyrics through the Lavalink node (`search` + the
/// lyrics-plugin `lyrics.get(track)`, synced lyrics, `null` when none).
/// This port fetches plain (unsynced) lyrics text from the lyrics.ovh
/// API instead — no lyrics-plugin round-trip — and uses the live
/// Lavalink search hit only for track identity (title/uri/artwork/
/// author, see `resolve_lyrics_meta`). `None` here covers both TS
/// null legs (no suggest hit, empty text).
pub(crate) async fn fetch_lyrics_text(query: &str) -> Option<(String, String)> {
    let client = http_client();
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

/// TS `||` fallback leg for the `!lyrics.ts` embed render
/// (`title || unknown`, `author || unknown`, `uri || FALLBACK`):
/// only nullish/empty fall back; whitespace-only stays verbatim
/// (truthy in TS). Battery slice 165: `""` -> unknown, `"   "` ->
/// `"   "`, `None` -> unknown.
pub fn lyrics_or_unknown<'a>(value: Option<&'a str>, unknown: &'a str) -> &'a str {
    value.filter(|v| !v.is_empty()).unwrap_or(unknown)
}

/// W6 slice 166: `!lyrics.ts:76,89` embed constants. Battery
/// slice166-lyrics-render.js: `setColor("#cd703a")` resolves to
/// 13463610 (`0xCD703A`); `uri || "https://www.ihorizon.org"`
/// falls back on nullish/empty only (whitespace-only URIs stay
/// verbatim — truthy — matching the `filter(!empty).unwrap_or`
/// shape at the live site, TS-exact).
pub const LYRICS_EMBED_COLOR: u32 = 0xCD703A;
pub const LYRICS_URL_FALLBACK: &str = "https://www.ihorizon.org";

/// W6 slice 166: `!lyrics.ts:56` prefix title leg
/// (`args?.join(" ") || " "`). Nullish/empty/empty-joined args
/// yield a single space; whitespace-only joins stay verbatim
/// (truthy in TS — `["  "]` -> `"  "`); segments join with
/// single spaces, untrimmed. Zero live callers: poise parses the
/// `#[rest] query` itself (no-arg invocations get a framework
/// usage error instead of searching `" "`) — dead-helper parity
/// like slices 145/152/161/162/164. DELTA (doc-noted, no code
/// change): TS searches `" "` and replies `lyrics_not_found`;
/// here the usage error fires first — convergent refusal UX.
pub fn prefix_lyrics_title(args: Option<&[&str]>) -> String {
    args.map(|a| a.join(" "))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| " ".to_string())
}

/// TS `substring(0, 1997)` + `"..."` suffix rule (`trimmed.length ===
/// 1997`, which holds whenever the source reached that width —
/// including an exactly-1997 source). `substring`/`.length` count
/// UTF-16 code units, so astral-plane chars cost 2: the cut walks
/// `char_indices` accumulating `len_utf16` and never splits a
/// surrogate pair.
/// Deltas (doc-noted, no code change — battery slice 165):
/// astral straddling the 1997-unit boundary keeps a lone high
/// surrogate in TS (`"x"*1996 + "\uD83D"`, length 1997, suffix
/// applies) while this drops the char (a Rust `String` cannot hold
/// a lone surrogate; strictly more robust — Discord-bound payloads
/// never carry unpaired halves); the `?? "null"` description leg is
/// dead for string text (the `!response?.res.text` gate already
/// filtered falsy, and truthy non-string text throws at the
/// `.substring` call into the outer catch -> `lyrics_not_found`).
pub fn lyrics_embed_description(text: &str) -> String {
    let mut units = 0usize;
    let mut end = 0usize;
    for (i, c) in text.char_indices() {
        let w = c.len_utf16();
        if units + w > 1997 {
            break;
        }
        units += w;
        end = i + c.len_utf8();
    }
    let trimmed = &text[..end];
    if text.encode_utf16().count() >= 1997 {
        format!("{trimmed}...")
    } else {
        trimmed.to_string()
    }
}

/// W6 slice 164: `searchLyrics.ts` node-loop pick, pure decision leg.
/// The TS loop skips only `connected === false` (strict: `0`/`""`/
/// `null`/`undefined` are all searched — node battery slice 164),
/// searches every other node in insertion order, and breaks at the
/// first `res?.tracks.length > 0` (empty/nullish results never break).
/// `connected` models the flag with `None` for nullish (searched);
/// `track_counts` models the searched result with `None` for a
/// nullish `res` (never a hit). Zero live callers: the Rust lyrics
/// flow resolves through the lyrics.ovh backend + a single live node
/// (documented E1 divergence on `fetch_lyrics_text`), so the
/// multi-node loop shape has no mirror — dead-helper parity like
/// slices 145/152/161/162. DELTA (doc-noted, no code change): a
/// present-but-trackless `res` (`{}`) throws TypeError in TS at the
/// `.length` read; here it is `None` (no hit), strictly more robust.
pub fn lyrics_first_hit(
    connected: &[Option<bool>],
    track_counts: &[Option<usize>],
) -> Option<usize> {
    for (i, (c, t)) in connected.iter().zip(track_counts.iter()).enumerate() {
        if *c == Some(false) {
            continue;
        }
        if matches!(t, Some(n) if *n > 0) {
            return Some(i);
        }
    }
    None
}

/// W6 slice 164: `searchLyrics.ts` tail null legs. `res?.tracks.length
/// === 0` returns null even when a lyrics response exists; otherwise
/// `!response` (any falsy shape) returns null; else the
/// `{ track: res?.tracks[0], res: response }` pair is served.
/// `tracks_len` is `None` for a nullish `res` (never `=== 0`, so the
/// flow proceeds to the response leg, TS-exact).
pub fn lyrics_tail_is_null(tracks_len: Option<usize>, response_present: bool) -> bool {
    matches!(tracks_len, Some(0)) || !response_present
}

/// Find the lyrics of a title!
///
/// Lyrics command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "lyrics",
    description_localized("fr", "Trouver les lyrics d'un titre"),
    description_localized("ja", "曲の歌詞を検索！"),
    description_localized("ru", "Найти текст песни!"),
    description_localized("es-ES", "Encontrar la letra de una canción!")
)]
pub async fn m_lyrics(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Titre de la musique que vous souhaitez")]
    #[description_localized("ja", "希望するトラックのタイトル")]
    #[description_localized("ru", "Название желаемого трека")]
    #[description_localized("es-ES", "El título de la pista que deseas")]
    #[description = "The track title you want"]
    #[rest]
    query: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let gid_str = ctx.guild_id().map(|g| g.get().to_string());
    let not_found = || {
        crate::lang::get(&code, "lyrics_not_found").unwrap_or_else(|| "No lyrics found".to_string())
    };
    // Lyrics text (ovh suggest + body) and track identity (Lavalink
    // search hit) are independent: run them concurrently instead of
    // stacking both round-trips before the first reply.
    let mgr = synced_mgr(&ctx).await;
    let gid_opt = ctx.guild_id().map(|g| g.get());
    let (lyrics, meta) = tokio::join!(fetch_lyrics_text(&query), async {
        match gid_opt {
            Some(g) => resolve_lyrics_meta(mgr, g, &query).await,
            None => LyricsTrackMeta::default(),
        }
    });
    let Some((suggest_title, text)) = lyrics else {
        ctx.say(not_found()).await?;
        return Ok(());
    };
    let unknown_title = crate::lang::get(&code, "lyrics_embed_title_unknown")
        .unwrap_or_else(|| "Unknown title".to_string());
    let unknown_author = crate::lang::get(&code, "lyrics_embed_author_name_unknown")
        .unwrap_or_else(|| "Unknown author".to_string());
    // TS `||` legs: only nullish/empty fall back; whitespace-only stays
    // verbatim (truthy). `meta` misses fall back to the ovh suggest
    // title first (E1 backend structure: no TS counterpart for suggest).
    let title = lyrics_or_unknown(
        Some(meta.title.as_deref().unwrap_or(&suggest_title)),
        &unknown_title,
    )
    .to_string();
    let author = lyrics_or_unknown(meta.author.as_deref(), &unknown_author).to_string();
    let mut embed = serenity::CreateEmbed::default()
        .title(title)
        .url(
            meta.uri
                .as_deref()
                .filter(|u| !u.is_empty())
                .unwrap_or(LYRICS_URL_FALLBACK),
        )
        .author(serenity::CreateEmbedAuthor::new(author))
        .description(lyrics_embed_description(&text))
        .colour(LYRICS_EMBED_COLOR)
        .timestamp(serenity::Timestamp::now());
    if let Some(art) = meta.artwork.as_deref().filter(|u| !u.is_empty()) {
        embed = embed.thumbnail(art);
    }
    let reply = match &gid_str {
        Some(g) => {
            let (fname, fbytes) = footer_parts(&ctx, g).await;
            // No icon means plain footer text (never an empty-string
            // icon_url); the file is attached below only when referenced.
            if fbytes.is_some() {
                embed = embed_with_footer(embed, &fname, true);
            } else {
                embed = embed.footer(serenity::CreateEmbedFooter::new(fname.clone()));
            }
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
    fn shared_http_client_initializes() {
        // Smoke: the process-wide pool builds without panicking.
        let _ = http_client();
    }

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

    #[test]
    fn description_counts_utf16_units_like_ts_substring() {
        // Astral chars cost 2 UTF-16 units in TS `substring`/`.length`:
        // 2000 emoji = 4000 units, cut to 1997 units = 998 whole emoji
        // (1996 units; the 999th would not fit), plus the suffix.
        let long = "😀".repeat(2000);
        let out = lyrics_embed_description(&long);
        assert!(out.ends_with("..."));
        let body = out.strip_suffix("...").unwrap();
        assert_eq!(body, "😀".repeat(998));
        assert_eq!(body.encode_utf16().count(), 1996);
        // Odd-unit boundary: 1996 ASCII + 1 emoji = 1998 units, so the
        // suffix applies and the cut drops the emoji (1996 + 2 > 1997).
        let mixed = format!("{}{}", "x".repeat(1996), "😀");
        let out = lyrics_embed_description(&mixed);
        assert_eq!(out, format!("{}...", "x".repeat(1996)));
    }

    #[test]
    fn lyrics_or_unknown_matches_ts_double_pipe_legs() {
        // Battery slice165-lyrics-render.js: `||` is falsy-only —
        // whitespace-only stays verbatim, empty/nullish fall back.
        assert_eq!(lyrics_or_unknown(Some("T"), "UT"), "T");
        assert_eq!(lyrics_or_unknown(Some(""), "UT"), "UT");
        assert_eq!(lyrics_or_unknown(Some("   "), "UT"), "   ");
        assert_eq!(lyrics_or_unknown(None, "UA"), "UA");
        assert_eq!(
            lyrics_or_unknown(Some(""), "https://www.ihorizon.org"),
            "https://www.ihorizon.org"
        );
    }

    #[test]
    fn lyrics_render_consts_and_prefix_title_match_ts_legs() {
        // Battery slice166-lyrics-render.js: setColor("#cd703a")
        // resolves to 13463610; uri || fallback on nullish/empty.
        assert_eq!(LYRICS_EMBED_COLOR, 13463610);
        assert_eq!(LYRICS_URL_FALLBACK, "https://www.ihorizon.org");
        assert_eq!(
            lyrics_or_unknown(Some(""), LYRICS_URL_FALLBACK),
            LYRICS_URL_FALLBACK
        );
        assert_eq!(
            lyrics_or_unknown(None, LYRICS_URL_FALLBACK),
            LYRICS_URL_FALLBACK
        );
        assert_eq!(
            lyrics_or_unknown(Some("https://x.test/t"), LYRICS_URL_FALLBACK),
            "https://x.test/t"
        );
        // Prefix title leg (!lyrics.ts:56): nullish/empty/empty-join
        // -> " "; ws-only joins stay verbatim; no trim.
        assert_eq!(prefix_lyrics_title(None), " ");
        assert_eq!(prefix_lyrics_title(Some(&[])), " ");
        assert_eq!(prefix_lyrics_title(Some(&[""])), " ");
        assert_eq!(prefix_lyrics_title(Some(&["  "])), "  ");
        assert_eq!(prefix_lyrics_title(Some(&["a", "b"])), "a b");
        assert_eq!(prefix_lyrics_title(Some(&[" a "])), " a ");
    }

    #[test]
    fn lyrics_node_pick_and_tail_match_ts_search_lyrics_legs() {
        // Node-loop legs (battery slice164-lyrics.js, 13 rows): skip
        // only literal false, empty/nullish never break, first hit wins.
        assert_eq!(
            lyrics_first_hit(&[Some(false), Some(false)], &[Some(1), Some(1)]),
            None
        );
        assert_eq!(
            lyrics_first_hit(&[Some(false), Some(true)], &[Some(1), Some(2)]),
            Some(1)
        );
        assert_eq!(
            lyrics_first_hit(&[Some(true), Some(true)], &[Some(0), Some(1)]),
            Some(1)
        );
        assert_eq!(
            lyrics_first_hit(&[Some(true), Some(true)], &[Some(1), Some(2)]),
            Some(0)
        );
        // Strict `=== false`: nullish flags are searched, not skipped.
        assert_eq!(
            lyrics_first_hit(&[None, None], &[Some(1), Some(1)]),
            Some(0)
        );
        assert_eq!(lyrics_first_hit(&[Some(false)], &[Some(1)]), None);
        // Nullish results never break the loop.
        assert_eq!(
            lyrics_first_hit(
                &[Some(true), Some(true), Some(true)],
                &[None, None, Some(1)]
            ),
            Some(2)
        );
        // Tail null legs: `=== 0` nulls even with a response; nullish
        // res proceeds to the response leg; any missing response nulls.
        assert!(!lyrics_tail_is_null(None, true));
        assert!(lyrics_tail_is_null(Some(0), true));
        assert!(lyrics_tail_is_null(Some(1), false));
        assert!(lyrics_tail_is_null(None, false));
        assert!(!lyrics_tail_is_null(Some(1), true));
        assert!(!lyrics_tail_is_null(Some(2), true));
    }
}
