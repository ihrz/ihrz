/// Fetch a user's banner hash via Discord REST.
/// Mirrors utils banner !user.ts (GET /users/{id} with the bot token).
pub async fn fetch_user_banner_hash(token: &str, user_id: u64) -> Option<String> {
    reqwest::Client::new()
        .get(format!("https://discord.com/api/v10/users/{user_id}"))
        .header("Authorization", format!("Bot {token}"))
        .send()
        .await
        .ok()?
        .json::<serde_json::Value>()
        .await
        .ok()?
        .get("banner")?
        .as_str()
        .map(|s| s.to_string())
}

/// User banner CDN URL. Mirrors the cdn.../banners/{id}/{hash} embed
/// image (gif for animated a_ hashes, png otherwise, size 1024).
pub fn user_banner_url(user_id: u64, banner_hash: &str) -> String {
    let ext = if banner_hash.starts_with("a_") {
        "gif"
    } else {
        "png"
    };
    format!("https://cdn.discordapp.com/banners/{user_id}/{banner_hash}.{ext}?size=1024")
}

#[cfg(test)]
mod banner_tests {
    use super::user_banner_url;

    #[test]
    fn banner_url_picks_gif_for_animated_hashes() {
        assert_eq!(
            user_banner_url(7, "a_abc"),
            "https://cdn.discordapp.com/banners/7/a_abc.gif?size=1024"
        );
        assert_eq!(
            user_banner_url(7, "abc"),
            "https://cdn.discordapp.com/banners/7/abc.png?size=1024"
        );
    }
}
