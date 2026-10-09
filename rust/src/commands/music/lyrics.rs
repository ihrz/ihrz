use super::*;

/// Mirrors `!lyrics.ts`.
// Lyrics via a plain text API (lyrics.ovh), never the Lavalink lyrics
// plugin — mirrors the TS searchLyrics result shape (title + text).
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

#[poise::command(slash_command, prefix_command, rename = "lyrics")]
pub async fn m_lyrics(
    ctx: Ctx<'_>,
    #[description = "Query"] query: String,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    match fetch_lyrics_text(&query).await {
        Some((title, text)) => {
            ctx.say(format!("{title}\n{}", truncate_lyrics(&text)))
                .await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "lyrics_not_found")
                    .unwrap_or_else(|| "No lyrics found".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
