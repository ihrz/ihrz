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

/// Deny reply for bad source images. Mirrors the `No` emoji replies in
/// `!togif.ts` (both the content-type guard and the conversion catch).
async fn deny_invalid(ctx: &Ctx<'_>, code: &str) -> Result<(), anyhow::Error> {
    ctx.say(
        crate::lang::get(code, "msg_invalid_image_type")
            .unwrap_or_else(|| "Invalid image type.".to_string()),
    )
    .await?;
    Ok(())
}
#[poise::command(slash_command, prefix_command, category = "fun", rename = "togif")]
pub async fn togif(
    ctx: Ctx<'_>,
    #[description = "Image file"] image: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    // Guard's typing is DM-compatible: no guild/member requirement.
    // Mirrors the `if (!client.user || !interaction.channel) return` guard.
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `client.func.validImageType(image.contentType)` (exact
    // allowlist incl. webp/gif).
    if image.url.is_empty() || !crate::funcs::is_valid_image_type(image.content_type.as_deref()) {
        deny_invalid(&ctx, &code).await?;
        return Ok(());
    }
    // Mirrors `createGifFromUrl`: download (15 MiB cap), decode, clamp the
    // long side to 512, flatten alpha on white, encode GIF.
    // Delta (documented): single-frame output vs the TS two identical
    // frames (visually identical still); webp sources need the TS
    // browser-canvas decode path and fall into the deny reply here
    // (`image` enables png/jpeg/gif only).
    let bytes = match reqwest::Client::new().get(&image.url).send().await {
        Ok(resp) => match resp.bytes().await {
            Ok(b) => b.to_vec(),
            Err(_) => {
                deny_invalid(&ctx, &code).await?;
                return Ok(());
            }
        },
        Err(_) => {
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
        let mut buf = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgb8(flat).write_to(&mut buf, image::ImageFormat::Gif)?;
        Ok(buf.into_inner())
    })();
    match gif {
        Ok(data) => {
            ctx.send(poise::CreateReply::default().attachment(
                poise::serenity_prelude::CreateAttachment::bytes(data, togif_output_name()),
            ))
            .await?;
        }
        Err(_) => {
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
}
