use super::*;

/// Output filename. Mirrors `name: "togif.gif"` in `!togif.ts`.
pub fn togif_output_name() -> &'static str {
    "togif.gif"
}

/// Download cap. Mirrors `MAX_SOURCE_BYTES` (15 MiB) in `!togif.ts`.
pub const TOGIF_MAX_SOURCE_BYTES: usize = 15 * 1024 * 1024;

/// Long-side clamp. Mirrors `MAX_GIF_SIDE` (512) in `!togif.ts`.
pub const TOGIF_MAX_GIF_SIDE: u32 = 512;

/// Frame timing. Mirrors the two `GifFrame` delays (`delayCentisecs: 50`)
/// and infinite loop (`loops: 0`) in `!togif.ts`.
pub const TOGIF_FRAME_DELAY_CS: u16 = 50;
pub const TOGIF_LOOPS: u16 = 0;

/// Download timeout. Mirrors `FETCH_TIMEOUT_MS` (15s) in `!togif.ts`
/// (`AbortSignal.timeout`).
pub const TOGIF_FETCH_TIMEOUT_SECS: u64 = 15;

/// Resize rule. Mirrors the Jimp branch in `!togif.ts`: when the long side
/// exceeds 512, scale down on the longer side, preserving aspect ratio.
pub fn togif_resize_dims(width: u32, height: u32) -> (u32, u32) {
    let long = width.max(height);
    if long <= TOGIF_MAX_GIF_SIDE || long == 0 {
        return (width, height);
    }
    if width >= height {
        let h = ((height as u64 * TOGIF_MAX_GIF_SIDE as u64) / width as u64).max(1) as u32;
        (TOGIF_MAX_GIF_SIDE, h)
    } else {
        let w = ((width as u64 * TOGIF_MAX_GIF_SIDE as u64) / height as u64).max(1) as u32;
        (w, TOGIF_MAX_GIF_SIDE)
    }
}

/// Flatten RGBA onto white before GIF encode. Mirrors the white
/// `Jimp` composite in `!togif.ts` (GIF 1-bit transparency would
/// otherwise leave black halos on transparent PNGs).
pub fn togif_flatten_white(img: &image::RgbaImage) -> image::RgbImage {
    let (w, h) = img.dimensions();
    let mut out = image::RgbImage::new(w, h);
    for (x, y, px) in img.enumerate_pixels() {
        let a = f32::from(px[3]) / 255.0;
        let mix = |c: u8| (f32::from(c) * a + 255.0 * (1.0 - a)).round() as u8;
        out.put_pixel(x, y, image::Rgb([mix(px[0]), mix(px[1]), mix(px[2])]));
    }
    out
}

/// Deny reply for bad source images. Mirrors the `No` app-emoji replies in
/// `!togif.ts` (both the content-type guard and the conversion catch),
/// via the shared `deny_no_emoji` helper (bubbles deny pattern).
async fn deny_invalid(ctx: &Ctx<'_>, _code: &str) -> Result<(), anyhow::Error> {
    deny_no_emoji(ctx).await;
    Ok(())
}

/// Transform image to gif
#[poise::command(slash_command, prefix_command, category = "fun", rename = "togif")]
pub async fn togif(
    ctx: Ctx<'_>,
    #[description = "Image file"] image: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!togif.ts`: no fun_guard here
    // (parity: no deny where TS has none). The TS
    // `if (!client.user || !interaction.channel) return` guard needs no
    // port: poise only runs commands with a client user and a channel.
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `client.func.validImageType(image.contentType)` (exact
    // allowlist incl. webp/gif).
    if image.url.is_empty() || !crate::funcs::is_valid_image_type(image.content_type.as_deref()) {
        deny_invalid(&ctx, &code).await?;
        return Ok(());
    }
    // Mirrors `createGifFromUrl`: download (15s timeout like
    // `AbortSignal.timeout(FETCH_TIMEOUT_MS)`, non-2xx rejected like
    // `if (!response.ok) throw`, 15 MiB cap), decode, clamp the
    // long side to 512, flatten alpha on white, encode GIF with two
    // identical 50cs frames and loop-0 like the TS
    // `GifFrame`/`encodeGif([frame1, frame2], { loops: 0 })` path.
    // Deliberate webp denial (documented standing exclusion):
    // `validImageType` allowlists webp and TS decodes it through a
    // headless-browser canvas (`decodeWithBrowser`), but the Rust `image`
    // crate is built with `features = ["png", "jpeg", "gif"]` only (see
    // Cargo.toml) — no webp decoder exists in the tree — so webp sources
    // fall into the deny reply here.
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(TOGIF_FETCH_TIMEOUT_SECS))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let bytes = match client.get(&image.url).send().await {
        Ok(resp) => match resp.error_for_status() {
            Ok(ok) => match ok.bytes().await {
                Ok(b) => b.to_vec(),
                Err(error) => {
                    // Mirrors `logger.err` in the `!togif.ts` catch path.
                    tracing::error!("togif download body failed for {}: {error}", image.url);
                    deny_invalid(&ctx, &code).await?;
                    return Ok(());
                }
            },
            Err(error) => {
                // Mirrors `logger.err` in the `!togif.ts` catch path
                // (`Image download failed (HTTP ...)`).
                tracing::error!("togif download failed for {}: {error}", image.url);
                deny_invalid(&ctx, &code).await?;
                return Ok(());
            }
        },
        Err(error) => {
            // Mirrors `logger.err` in the `!togif.ts` catch path.
            tracing::error!("togif download failed for {}: {error}", image.url);
            deny_invalid(&ctx, &code).await?;
            return Ok(());
        }
    };
    if bytes.is_empty() || bytes.len() > TOGIF_MAX_SOURCE_BYTES {
        deny_invalid(&ctx, &code).await?;
        return Ok(());
    }
    let gif = (|| -> anyhow::Result<Vec<u8>> {
        let decoded = image::load_from_memory(&bytes)?;
        let (w, h) = (decoded.width(), decoded.height());
        if w == 0 || h == 0 {
            anyhow::bail!("invalid dimensions");
        }
        let (nw, nh) = togif_resize_dims(w, h);
        let resized = decoded.resize_exact(nw, nh, image::imageops::FilterType::Lanczos3);
        let flat = togif_flatten_white(&resized.to_rgba8());
        // Two identical frames at 50cs with loop-0 (infinite), mirroring
        // the TS `GifFrame` pair + `encodeGif([frame1, frame2], { loops: 0 })`.
        let delay = image::Delay::from_numer_denom_ms(500, 1);
        let rgba = image::DynamicImage::ImageRgb8(flat).to_rgba8();
        let frame_a = image::Frame::from_parts(rgba.clone(), 0, 0, delay);
        let frame_b = image::Frame::from_parts(rgba, 0, 0, delay);
        let mut buf = std::io::Cursor::new(Vec::new());
        {
            let mut encoder = image::codecs::gif::GifEncoder::new(&mut buf);
            encoder.set_repeat(image::codecs::gif::Repeat::Infinite)?;
            encoder.encode_frame(frame_a)?;
            encoder.encode_frame(frame_b)?;
        }
        Ok(buf.into_inner())
    })();
    match gif {
        Ok(data) => {
            ctx.send(poise::CreateReply::default().attachment(
                poise::serenity_prelude::CreateAttachment::bytes(data, togif_output_name()),
            ))
            .await?;
        }
        Err(error) => {
            // Mirrors `logger.err` in the `!togif.ts` catch path.
            tracing::error!("togif conversion failed for {}: {error}", image.url);
            deny_invalid(&ctx, &code).await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod togif_tests {
    use super::*;

    #[test]
    fn togif_limits_match_ts() {
        assert_eq!(togif_output_name(), "togif.gif");
        assert_eq!(TOGIF_MAX_SOURCE_BYTES, 15 * 1024 * 1024);
        assert_eq!(TOGIF_MAX_GIF_SIDE, 512);
        assert_eq!(TOGIF_FRAME_DELAY_CS, 50);
        assert_eq!(TOGIF_LOOPS, 0);
        assert_eq!(TOGIF_FETCH_TIMEOUT_SECS, 15);
    }

    #[test]
    fn resize_clamps_long_side() {
        assert_eq!(togif_resize_dims(1024, 512), (512, 256));
        assert_eq!(togif_resize_dims(512, 1024), (256, 512));
        assert_eq!(togif_resize_dims(100, 100), (100, 100));
        assert_eq!(togif_resize_dims(512, 512), (512, 512));
    }

    #[test]
    fn flatten_puts_transparent_on_white() {
        let mut img = image::RgbaImage::new(2, 1);
        img.put_pixel(0, 0, image::Rgba([255, 0, 0, 255]));
        img.put_pixel(1, 0, image::Rgba([0, 0, 0, 0]));
        let flat = togif_flatten_white(&img);
        assert_eq!(flat.get_pixel(0, 0), &image::Rgb([255, 0, 0]));
        assert_eq!(flat.get_pixel(1, 0), &image::Rgb([255, 255, 255]));
    }

    #[test]
    fn gif_roundtrip_encodes() {
        let img = image::RgbImage::from_pixel(4, 4, image::Rgb([9, 9, 9]));
        let mut buf = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgb8(img)
            .write_to(&mut buf, image::ImageFormat::Gif)
            .expect("gif encodes");
        assert_eq!(&buf.get_ref()[0..6], b"GIF89a");
    }

    #[test]
    fn two_frames_50cs_loop0() {
        use image::AnimationDecoder;
        let rgba = image::DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
            4,
            4,
            image::Rgb([9, 9, 9]),
        ))
        .to_rgba8();
        let delay = image::Delay::from_numer_denom_ms(500, 1);
        let mut buf = std::io::Cursor::new(Vec::new());
        {
            let mut encoder = image::codecs::gif::GifEncoder::new(&mut buf);
            encoder
                .set_repeat(image::codecs::gif::Repeat::Infinite)
                .expect("repeat set");
            encoder
                .encode_frame(image::Frame::from_parts(rgba.clone(), 0, 0, delay))
                .expect("frame 1 encodes");
            encoder
                .encode_frame(image::Frame::from_parts(rgba, 0, 0, delay))
                .expect("frame 2 encodes");
        }
        let bytes = buf.into_inner();
        assert_eq!(&bytes[0..6], b"GIF89a");
        // NETSCAPE extension = loop-0 (infinite) like `{ loops: 0 }`.
        assert!(bytes.windows(11).any(|w| w == b"NETSCAPE2.0"));
        let decoder = image::codecs::gif::GifDecoder::new(std::io::Cursor::new(&bytes[..]))
            .expect("gif decodes");
        let frames: Vec<_> = decoder
            .into_frames()
            .collect::<Result<_, _>>()
            .expect("frames decode");
        assert_eq!(frames.len(), 2);
        for f in &frames {
            assert_eq!(f.delay().numer_denom_ms(), (500, 1));
        }
    }
}
