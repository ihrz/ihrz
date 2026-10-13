// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Welcome-banner + captcha image legs via HorizonGateway. Mirrors
// src/Events/guildconfig/joinMessage.ts (buildJoinImagePayload /
// generateJoinImage) and src/core/captcha.ts, rendered through
// crate::funcs::gateway_render_html (the HorizonGateway branch of
// src/core/functions/html2png.ts). No local Chromium render exists
// here: without a gateway base the banner leg degrades to None (like
// the TS catch that leaves bannerImage undefined) and the captcha
// leg falls back to the deterministic cards::captcha_png raster.

/// Token swapped for the downscaled avatar bytes in the welcome cart.
/// Mirrors JOIN_IMAGE_AVATAR_TOKEN in joinMessage.ts.
pub const JOIN_IMAGE_AVATAR_TOKEN: &str = "%%AVATAR%%";

/// Raw welcome-cart template. Mirrors
/// `client.htmlfiles["guildconfigWelcomeCart"]`.
pub const WELCOME_CART_TEMPLATE: &str =
    include_str!("../../src/assets/html/guildconfigWelcomeCart.html");

/// Raw captcha template. Mirrors `client.htmlfiles["captcha"]`.
pub const CAPTCHA_TEMPLATE: &str = include_str!("../../src/assets/html/captcha.html");

/// `generateJoinImage` render options. TS passes only
/// `{ omitBackground: false, selectElement: false }` (no width/height/
/// scale keys), so the gateway JSON carries exactly those two keys.
pub const BANNER_RENDER_OPTIONS_JSON: &str = r#"{"omitBackground":false,"selectElement":false}"#;

/// `captcha()` render options. Key order mirrors the TS object
/// literal (JSON.stringify preserves insertion order).
pub const CAPTCHA_RENDER_OPTIONS_JSON: &str = r#"{"omitBackground":true,"selectElement":true,"elementSelector":".captcha-container","height":300,"width":900}"#;

/// Attachment name for the rendered welcome banner. Mirrors the
/// `bannerAttachmentName ?? "image.png"` default in welcomerMessage.ts.
pub const BANNER_ATTACHMENT_NAME: &str = "image.png";

/// Resolved fields for one welcome-cart render. `frame_color` is the
/// already-resolved ring colour (displayHexColor default, or the
/// presence-status mapping when profilePictureRound is "status").
/// `message_html` is the already preview-rendered MSG text.
/// `avatar_url` is the CDN URL, or [`JOIN_IMAGE_AVATAR_TOKEN`] when
/// the avatar bytes were downloaded for the assets leg.
pub struct JoinImageFields {
    pub username: String,
    pub guild_name: String,
    pub member_count: u64,
    pub frame_color: String,
    pub background_url: String,
    pub text_colour: String,
    pub message_html: String,
    pub text_size: String,
    pub avatar_size: String,
    pub avatar_url: String,
}

/// Fill the welcome-cart template. Mirrors `buildJoinImagePayload`
/// slot-for-slot in TS order: USERLOGO, USERNAME
/// (`globalName || displayName`, resolved by the caller), SERVERNAME,
/// XXX (member count), `#000000` (frame), BACKGROUNDURL (wrapped as
/// `url('...')`), `#aa9999` (text colour), MSG, `40px` (text size),
/// `140px` (avatar size). Plain sequential replaces like TS
/// (replaceAll each) — later values containing earlier tokens would
/// double-replace exactly like TS, so no escaping is applied.
pub fn build_join_image_code(template: &str, f: &JoinImageFields) -> String {
    template
        .replace("USERLOGO", &f.avatar_url)
        .replace("USERNAME", &f.username)
        .replace("SERVERNAME", &f.guild_name)
        .replace("XXX", &f.member_count.to_string())
        .replace("#000000", &f.frame_color)
        .replace("BACKGROUNDURL", &format!("url('{}')", f.background_url))
        .replace("#aa9999", &f.text_colour)
        .replace("MSG", &f.message_html)
        .replace("40px", &f.text_size)
        .replace("140px", &f.avatar_size)
}

/// Fill the captcha template. TS uses `.replace` (first occurrence
/// only), mirrored here with `replacen(..., 1)`.
pub fn fill_captcha_template(template: &str, code: &str) -> String {
    template.replacen("{X}", code, 1)
}

/// Captcha HTML for `code`. Mirrors `captcha()`:
/// `htmlfiles["captcha"].replace("{X}", captchaCode)`.
pub fn captcha_code_html(code: &str) -> String {
    fill_captcha_template(CAPTCHA_TEMPLATE, code)
}

/// Target width for the banner avatar. Mirrors `downscaleAvatar`:
/// `parseInt(avatarSize) || 256`, clamped to 64..=512. `parseInt`
/// stops at the first non-digit (`"140px"` -> 140) and yields NaN
/// (here: None) on garbage; 0 is falsy so it falls back to 256 too.
pub fn downscale_target_width(avatar_size: &str) -> u32 {
    let digits: String = avatar_size
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect();
    let parsed: u32 = digits.parse().unwrap_or(0);
    let base = if parsed == 0 { 256 } else { parsed };
    base.clamp(64, 512)
}

/// Downscale avatar bytes for the assets leg. Mirrors `downscaleAvatar`
/// via Jimp: resize to the target width (aspect kept, never upscale)
/// and re-encode PNG. Any decode/encode failure returns the input
/// untouched (TS `catch { return buffer }`).
pub fn downscale_avatar_png(bytes: &[u8], avatar_size: &str) -> Vec<u8> {
    let target = downscale_target_width(avatar_size);
    let img = match image::load_from_memory(bytes) {
        Ok(img) => img,
        Err(_) => return bytes.to_vec(),
    };
    if img.width() <= target {
        return bytes.to_vec();
    }
    let height = ((img.height() as u64 * target as u64) / img.width() as u64).max(1) as u32;
    let resized = img.resize(target, height, image::imageops::FilterType::Triangle);
    let mut out = Vec::new();
    match resized.write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png) {
        Ok(()) => out,
        Err(_) => bytes.to_vec(),
    }
}

/// Render the welcome banner through HorizonGateway. Mirrors
/// `generateJoinImage`: avatar bytes (already downloaded by the
/// caller) are downscaled and attached under [`JOIN_IMAGE_AVATAR_TOKEN`]
/// with `image/png`; without bytes the CDN URL stays inline (TS
/// try/catch fallback). Any render failure yields None (TS catch
/// leaves `bannerImage` undefined and the welcome goes out text-only).
pub async fn render_join_banner(
    gateway_base: &str,
    api_token: &str,
    fields: &JoinImageFields,
    avatar_bytes: Option<Vec<u8>>,
) -> Option<Vec<u8>> {
    let (avatar_url, assets): (String, Vec<(String, String, Vec<u8>)>) = match avatar_bytes {
        Some(raw) => {
            let resized = downscale_avatar_png(&raw, &fields.avatar_size);
            (
                JOIN_IMAGE_AVATAR_TOKEN.to_string(),
                vec![(
                    JOIN_IMAGE_AVATAR_TOKEN.to_string(),
                    "image/png".to_string(),
                    resized,
                )],
            )
        }
        None => (fields.avatar_url.clone(), Vec::new()),
    };
    let owned = JoinImageFields {
        avatar_url,
        username: fields.username.clone(),
        guild_name: fields.guild_name.clone(),
        member_count: fields.member_count,
        frame_color: fields.frame_color.clone(),
        background_url: fields.background_url.clone(),
        text_colour: fields.text_colour.clone(),
        message_html: fields.message_html.clone(),
        text_size: fields.text_size.clone(),
        avatar_size: fields.avatar_size.clone(),
    };
    let code = build_join_image_code(WELCOME_CART_TEMPLATE, &owned);
    crate::funcs::gateway_render_html(
        gateway_base,
        api_token,
        &code,
        BANNER_RENDER_OPTIONS_JSON,
        &assets,
        None,
    )
    .await
    .ok()
}

/// Render the captcha challenge image. Mirrors `captcha()`: the HTML
/// card goes through the gateway (html2png branch) when a base is
/// configured; otherwise — or on any gateway failure — the
/// deterministic local raster (`cards::captcha_png`) is used, which
/// carries the same parchment/ink geometry as `captcha.html`.
pub async fn render_captcha_image(
    gateway_base: Option<&str>,
    api_token: &str,
    code: &str,
) -> Vec<u8> {
    if let Some(base) = gateway_base {
        let html = captcha_code_html(code);
        if let Ok(bytes) = crate::funcs::gateway_render_html(
            base,
            api_token,
            &html,
            CAPTCHA_RENDER_OPTIONS_JSON,
            &[],
            None,
        )
        .await
        {
            return bytes;
        }
    }
    crate::cards::captcha_png(code)
}

#[cfg(test)]
mod tests {
    use super::*;

    const MINI_TEMPLATE: &str = "logo=USERLOGO user=USERNAME srv=SERVERNAME n=XXX \
        ring=#000000 bg=BACKGROUNDURL tc=#aa9999 msg=MSG ts=40px as=140px";

    fn sample_fields() -> JoinImageFields {
        JoinImageFields {
            username: "Kisa".to_string(),
            guild_name: "iHorizon".to_string(),
            member_count: 42,
            frame_color: "#23a55a".to_string(),
            background_url: "https://cdn/x.png".to_string(),
            text_colour: "#ffffff".to_string(),
            message_html: "Hi".to_string(),
            text_size: "40px".to_string(),
            avatar_size: "140px".to_string(),
            avatar_url: "https://cdn/a.png".to_string(),
        }
    }

    #[test]
    fn join_code_fills_every_slot_in_ts_order() {
        let code = build_join_image_code(MINI_TEMPLATE, &sample_fields());
        assert_eq!(
            code,
            "logo=https://cdn/a.png user=Kisa srv=iHorizon n=42 \
            ring=#23a55a bg=url('https://cdn/x.png') tc=#ffffff msg=Hi ts=40px as=140px"
        );
    }

    #[test]
    fn join_code_empty_background_keeps_url_wrapper() {
        let mut f = sample_fields();
        f.background_url = String::new();
        let code = build_join_image_code(MINI_TEMPLATE, &f);
        assert!(code.contains("bg=url('')"), "{code}");
    }

    #[test]
    fn downscale_target_parses_px_suffix_and_clamps() {
        assert_eq!(downscale_target_width("140px"), 140);
        assert_eq!(downscale_target_width("256"), 256);
        assert_eq!(downscale_target_width("9999px"), 512);
        assert_eq!(downscale_target_width("10px"), 64);
        assert_eq!(downscale_target_width("abc"), 256);
        assert_eq!(downscale_target_width(""), 256);
        assert_eq!(downscale_target_width("0"), 256);
    }

    fn solid_png(w: u32, h: u32) -> Vec<u8> {
        let img = image::RgbImage::from_pixel(w, h, image::Rgb([9, 9, 9]));
        let mut out = Vec::new();
        image::DynamicImage::ImageRgb8(img)
            .write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)
            .expect("encode test png");
        out
    }

    #[test]
    fn downscale_shrinks_wide_images_and_keeps_small_ones() {
        let big = solid_png(600, 400);
        let small = downscale_avatar_png(&big, "140px");
        let back = image::load_from_memory(&small).expect("decode");
        assert_eq!(back.width(), 140);
        assert_eq!(back.height(), 93);
        let tiny = solid_png(32, 32);
        let kept = downscale_avatar_png(&tiny, "140px");
        assert_eq!(kept, tiny);
    }

    #[test]
    fn downscale_invalid_bytes_returned_as_is() {
        let junk = b"not an image".to_vec();
        assert_eq!(downscale_avatar_png(&junk, "140px"), junk);
    }

    #[test]
    fn captcha_template_replaces_first_x_only_like_ts() {
        let out = fill_captcha_template("a{X}b{X}c", "K");
        assert_eq!(out, "aKb{X}c");
    }

    #[test]
    fn captcha_html_embeds_code_in_real_template() {
        let html = captcha_code_html("ABCDEFG");
        assert!(html.contains(">ABCDEFG<"), "{html}");
        assert!(!html.contains("{X}"));
    }

    #[test]
    fn render_options_json_is_byte_exact() {
        assert_eq!(
            BANNER_RENDER_OPTIONS_JSON,
            "{\"omitBackground\":false,\"selectElement\":false}"
        );
        assert_eq!(
            CAPTCHA_RENDER_OPTIONS_JSON,
            "{\"omitBackground\":true,\"selectElement\":true,\
            \"elementSelector\":\".captcha-container\",\"height\":300,\"width\":900}"
        );
    }

    #[tokio::test]
    async fn join_banner_without_gateway_base_returns_none() {
        let fields = sample_fields();
        let out = render_join_banner("", "", &fields, None).await;
        assert!(out.is_none());
    }

    #[tokio::test]
    async fn captcha_without_gateway_uses_local_raster() {
        let via_none = render_captcha_image(None, "", "ABCDEFG").await;
        assert_eq!(via_none, crate::cards::captcha_png("ABCDEFG"));
        let via_empty = render_captcha_image(Some(""), "", "ABCDEFG").await;
        assert_eq!(via_empty, crate::cards::captcha_png("ABCDEFG"));
    }
}
