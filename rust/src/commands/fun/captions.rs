use super::*;

/// Output filename. Mirrors `name: "captions.gif"` in `!captions.ts`.
pub fn captions_output_name() -> &'static str {
    "captions.gif"
}

/// html2png element selector. Mirrors `images.captions` (`captions.html`).
pub fn captions_template_selector() -> &'static str {
    ".meme-container"
}

/// Template variables for `captions.html`: `{X}` is the source image,
/// `{Z}` is the caption text. Mirrors `images.captions(img, text)`.
pub fn captions_render_vars(image_url: &str, text: &str) -> (String, String) {
    (image_url.to_string(), text.to_string())
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "captions")]
pub async fn captions(
    ctx: Ctx<'_>,
    #[description = "Image"] image: poise::serenity_prelude::Attachment,
    #[description = "Your captions"] query: String,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!captions.ts`: no fun_guard here
    // (parity: no deny where TS has none).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `client.func.validImageType(image.contentType)` in `!captions.ts`
    // (exact allowlist: png/jpeg/jpg/gif/webp); the deny is the `No`
    // app-emoji reply like `!captions.ts` and `!bubbles.ts`.
    if !crate::funcs::is_valid_image_type(image.content_type.as_deref()) {
        deny_no_emoji(&ctx).await;
        return Ok(());
    }
    // GIF render (`html2png` captions template, `.meme-container`) pending;
    // validation shape ported. Uses the shared pending template like bubbles.
    let file = captions_output_name();
    ctx.say(
        crate::lang::get(&code, "fun_bubbles_pending")
            .map(|s| {
                s.replace("${file}", file)
                    .replace("${url}", &image.url)
                    .replace("${query}", &query)
            })
            .unwrap_or_else(|| format!("{file} (render pending for {})", image.url)),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod captions_tests {
    use super::*;

    #[test]
    fn captions_shape_matches_ts() {
        assert_eq!(captions_output_name(), "captions.gif");
        assert_eq!(captions_template_selector(), ".meme-container");
        let (x, z) = captions_render_vars("https://cdn/x.png", "hi");
        assert_eq!(x, "https://cdn/x.png");
        assert_eq!(z, "hi");
        // Guard mirrors the exact TS allowlist (incl. webp, excl. svg).
        assert!(crate::funcs::is_valid_image_type(Some("image/webp")));
        assert!(crate::funcs::is_valid_image_type(Some("IMAGE/PNG")));
        assert!(!crate::funcs::is_valid_image_type(Some("image/svg+xml")));
        assert!(!crate::funcs::is_valid_image_type(None));
    }
}
