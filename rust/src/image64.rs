// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Shared image fetcher. Mirrors src/core/functions/image64.ts image64()
// (GET url as bytes, None on any error). Canonical home deduplicating the
// inline call sites: botcat/avatar (download + base64 data URL),
// profil/show (avatar snapshot for the thumbnail attachment), ticket
// transcript stub (prefetched avatar/image caches).

/// Fetch raw image bytes. Returns None on any network or read error,
/// mirroring the TS try/catch that returns undefined.
pub async fn image64(url: &str) -> Option<Vec<u8>> {
    if url.trim().is_empty() {
        return None;
    }
    reqwest::Client::new()
        .get(url)
        .send()
        .await
        .ok()?
        .bytes()
        .await
        .ok()
        .map(|b| b.to_vec())
}

/// Wrap bytes as a `data:<mime>;base64,...` URL for embedding avatars
/// in Components V2 thumbnails and HTML templates (never a raw CDN URL).
pub fn data_url(bytes: &[u8], mime: &str) -> String {
    format!("data:{mime};base64,{}", crate::emojis::base64_encode(bytes))
}

/// Fetch an image and wrap it as a data URL. None on any error.
pub async fn image64_data_url(url: &str, mime: &str) -> Option<String> {
    image64(url).await.map(|b| data_url(&b, mime))
}

#[cfg(test)]
mod image64_tests {
    use super::*;

    #[test]
    fn data_url_wraps_base64() {
        assert_eq!(data_url(b"Man", "image/png"), "data:image/png;base64,TWFu");
        assert_eq!(
            data_url(b"hello", "image/webp"),
            "data:image/webp;base64,aGVsbG8="
        );
    }

    #[tokio::test]
    async fn empty_url_yields_none() {
        assert!(image64("").await.is_none());
        assert!(image64("   ").await.is_none());
        assert!(image64_data_url("", "image/png").await.is_none());
    }
}
