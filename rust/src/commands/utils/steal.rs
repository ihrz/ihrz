/// Parse `<:name:id>` / `<a:name:id>` into (animated, name, id).
pub fn parse_steal_token(token: &str) -> Option<(bool, String, String)> {
    let animated = token.starts_with("<a:");
    let inner = token
        .strip_prefix("<a:")
        .or_else(|| token.strip_prefix("<:"))?
        .strip_suffix('>')?;
    let mut parts = inner.split(':');
    let name = parts.next()?.to_string();
    let id = parts.next()?.to_string();
    if name.is_empty()
        || !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
        || id.is_empty()
        || !id.chars().all(|c| c.is_ascii_digit())
    {
        return None;
    }
    Some((animated, name, id))
}

/// Safe zip entry name. Mirrors the TS sanitize-then-upload flow.
pub fn sanitize_emoji_filename(name: &str, ext: &str) -> String {
    let clean: String = name
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .take(32)
        .collect();
    let clean = if clean.is_empty() {
        "emoji".to_string()
    } else {
        clean
    };
    format!("{clean}.{ext}")
}

/// Sticker CDN url best-effort (PNG preview).
pub fn sticker_url(sticker: &poise::serenity_prelude::Sticker) -> Option<String> {
    use poise::serenity_prelude::StickerFormatType;
    match sticker.format_type {
        StickerFormatType::Png | StickerFormatType::Apng => Some(format!(
            "https://cdn.discordapp.com/stickers/{}.png",
            sticker.id.get()
        )),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn steal_tokens_parse() {
        assert_eq!(
            parse_steal_token("<:pepe:123>"),
            Some((false, "pepe".to_string(), "123".to_string()))
        );
        assert_eq!(parse_steal_token("<a:dance:456>").map(|v| v.0), Some(true));
        assert_eq!(parse_steal_token("hello"), None);
        assert_eq!(parse_steal_token("<:bad name:1>"), None);
    }

    #[test]
    fn emoji_filenames_sanitized() {
        assert_eq!(sanitize_emoji_filename("Pepe!", "png"), "Pepe.png");
        assert_eq!(sanitize_emoji_filename("", "gif"), "emoji.gif");
        assert_eq!(
            sanitize_emoji_filename("a".repeat(50).as_str(), "png").len(),
            36
        );
    }
}
