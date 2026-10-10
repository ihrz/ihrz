use super::*;

/// Output filename. Mirrors `name: "love.png"` in `!love.ts`.
pub fn love_output_name() -> &'static str {
    "love.png"
}

/// html2png element selector. Mirrors `images.love` (`love.html`).
pub fn love_template_selector() -> &'static str {
    ".love-container"
}

/// Center heart asset. Mirrors the `{Y}` replace in `images.love`.
pub fn love_heart_url() -> &'static str {
    "https://gitlab.com/ihrz/ihrz/-/raw/production/src/assets/heart.png"
}

/// Render viewport. Mirrors the `width: 1600, height: 600, scaleSize: 1`
/// options in `images.love`.
pub fn love_render_size() -> (u32, u32, u32) {
    (1600, 600, 1)
}

/// Template variables for `love.html`: `{X}`/`{Z}` are the two avatar
/// URLs, `{Y}` is the heart asset.
pub fn love_render_vars(avatar1: &str, avatar2: &str) -> (String, String, String) {
    (
        avatar1.to_string(),
        love_heart_url().to_string(),
        avatar2.to_string(),
    )
}

/// Forced-100% check. Mirrors the `always100.find(...)` in `!love.ts`
/// (`config.command.always100`, exact `"id1xid2"` match in both orders).
pub fn love_is_forced(a: u64, b: u64, always100: &[String]) -> bool {
    let direct = format!("{a}x{b}");
    let swapped = format!("{b}x{a}");
    always100.iter().any(|c| c == &direct || c == &swapped)
}

/// Compatibility roll. Mirrors `Math.floor(Math.random() * 101)` in
/// `!love.ts`: uniform 0..=100, overridden to 100 for forced couples.
pub fn love_roll(a: u64, b: u64, always100: &[String]) -> u64 {
    if love_is_forced(a, b, always100) {
        return 100;
    }
    rand::Rng::gen_range(&mut rand::thread_rng(), 0..=100)
}

/// One love tile side. Mirrors the 400x400 `love.html` tiles.
pub const LOVE_TILE: u32 = 400;
/// Gap between tiles. Mirrors `gap: 20px` in `love.html`.
pub const LOVE_GAP: u32 = 20;

/// Build the `love.png` composite (avatar | heart | avatar) with the
/// `image` crate: there is no Chromium/html2png in Rust, so the
/// `love.html` render becomes a 1240x400 tile strip. Returns `None`
/// when an avatar blob does not decode; a missing heart falls back to
/// a pink disc so the strip keeps its TS shape.
pub fn love_composite_png(avatar1: &[u8], avatar2: &[u8], heart: Option<&[u8]>) -> Option<Vec<u8>> {
    use image::GenericImage;
    fn tile(bytes: &[u8]) -> Option<image::RgbaImage> {
        let img = image::load_from_memory(bytes).ok()?;
        Some(
            img.resize_exact(LOVE_TILE, LOVE_TILE, image::imageops::FilterType::Triangle)
                .to_rgba8(),
        )
    }
    let left = tile(avatar1)?;
    let right = tile(avatar2)?;
    let mid: image::RgbaImage = match heart.and_then(tile) {
        Some(h) => h,
        None => {
            let mut disc = image::RgbaImage::new(LOVE_TILE, LOVE_TILE);
            let (c, r) = (LOVE_TILE as f32 / 2.0, LOVE_TILE as f32 / 2.0);
            for (x, y, px) in disc.enumerate_pixels_mut() {
                let (dx, dy) = (x as f32 - c, y as f32 - c);
                if dx * dx + dy * dy <= r * r {
                    *px = image::Rgba([255, 192, 203, 255]);
                }
            }
            disc
        }
    };
    let mut canvas = image::RgbaImage::new(LOVE_TILE * 3 + LOVE_GAP * 2, LOVE_TILE);
    canvas.copy_from(&left, 0, 0).ok()?;
    canvas.copy_from(&mid, LOVE_TILE + LOVE_GAP, 0).ok()?;
    canvas
        .copy_from(&right, (LOVE_TILE + LOVE_GAP) * 2, 0)
        .ok()?;
    let mut out = std::io::Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(canvas)
        .write_to(&mut out, image::ImageFormat::Png)
        .ok()?;
    Some(out.into_inner())
}

/// Fill `love_embed_description`. Mirrors the three TS replaces:
/// `${user1.username}`, `${user2.username}`, `${randomNumber}`.
pub fn love_description(template: &str, user1: &str, user2: &str, score: u64) -> String {
    template
        .replace("${user1.username}", user1)
        .replace("${user2.username}", user2)
        .replace("${randomNumber}", &score.to_string())
}

/// Pick a random guild member's user for the default `user2`.
/// Mirrors `interaction.guild?.members.cache.random()?.user` in `!love.ts`;
/// `None` when outside a guild or the cache is empty (caller falls back
/// to the author).
fn random_guild_user(ctx: &Ctx<'_>) -> Option<poise::serenity_prelude::User> {
    let gid = ctx.guild_id()?;
    let guild = ctx.serenity_context().cache.guild(gid)?;
    let members: Vec<_> = guild.members.values().collect();
    if members.is_empty() {
        return None;
    }
    let idx = rand::random::<usize>() % members.len();
    Some(members[idx].user.clone())
}

/// Love command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "love")]
pub async fn love(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: Option<poise::serenity_prelude::User>,
    #[description = "Second user"] user2: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Both options are optional in TS: user1 defaults to the invoker,
    // user2 to a random guild member.
    let u1 = user1.unwrap_or_else(|| ctx.author().clone());
    let u2 = user2
        .or_else(|| random_guild_user(&ctx))
        .unwrap_or_else(|| ctx.author().clone());
    // Forced couples come from the shared config like the TS
    // `client.config.command.always100` read (see the `user_love`
    // context command for the same wiring).
    let score = love_roll(u1.id.get(), u2.id.get(), &ctx.data().config.always100);
    // Composite `love.png` (avatar | heart | avatar tile strip, the
    // `image`-crate stand-in for the `love.html` html2png render).
    // Avatar download failure degrades to the text embed, like the TS
    // catch path that replies with `love_command_error`.
    // Mirrors `displayAvatarURL({ extension: "png", size: 512 })`
    // (forced PNG, not the webp `face()` URL).
    let (avatar1, avatar2) = (
        crate::commands::shared::download_bytes(&avatar_png_url(&u1, 512)).await,
        crate::commands::shared::download_bytes(&avatar_png_url(&u2, 512)).await,
    );
    let heart = crate::commands::shared::download_bytes(love_heart_url()).await;
    let png = match (avatar1, avatar2) {
        (Some(a1), Some(a2)) => love_composite_png(&a1, &a2, heart.as_deref()),
        _ => None,
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xFFC0CB)
        .title("💕")
        .description(love_description(
            &crate::lang::get(&code, "love_embed_description").unwrap_or_else(|| {
                "**${user1.username}** + **${user2.username}** = __${randomNumber}%__ of love 💗"
                    .to_string()
            }),
            // Mirrors `!love.ts`: plain `user.username`, not the global name.
            &u1.name,
            &u2.name,
            score,
        ));
    if png.is_some() {
        embed = embed.image("attachment://love.png");
    }
    embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some())
        .timestamp(poise::serenity_prelude::Timestamp::now());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = png {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes, "love.png",
        ));
    }
    if let Some(bytes) = fbytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    if let Err(error) = ctx.send(reply).await {
        tracing::warn!("love reply failed: {error}");
        ctx.say(
            crate::lang::get(&code, "love_command_error").unwrap_or_else(|| {
                "An error occurred while trying to create the image".to_string()
            }),
        )
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod love_tests {
    use super::*;

    #[test]
    fn love_shape_matches_ts() {
        assert_eq!(love_output_name(), "love.png");
        assert_eq!(love_template_selector(), ".love-container");
        assert_eq!(
            love_heart_url(),
            "https://gitlab.com/ihrz/ihrz/-/raw/production/src/assets/heart.png"
        );
        assert_eq!(love_render_size(), (1600, 600, 1));
        let (x, y, z) = love_render_vars("a1", "a2");
        assert_eq!(
            (x.as_str(), y.as_str(), z.as_str()),
            ("a1", love_heart_url(), "a2")
        );
    }

    #[test]
    fn description_fills_all_three_tokens() {
        let out = love_description(
            "**${user1.username}** + **${user2.username}** = __${randomNumber}%__",
            "ann",
            "bob",
            42,
        );
        assert_eq!(out, "**ann** + **bob** = __42%__");
    }

    #[test]
    fn forced_couples_score_100_both_orders() {
        let list = vec!["1x2".to_string()];
        assert!(love_is_forced(1, 2, &list));
        assert!(love_is_forced(2, 1, &list));
        assert!(!love_is_forced(1, 3, &list));
        assert!(!love_is_forced(1, 2, &[]));
        assert_eq!(love_roll(1, 2, &list), 100);
        assert_eq!(love_roll(2, 1, &list), 100);
    }

    #[test]
    fn roll_is_bounded() {
        for _ in 0..50 {
            assert!(love_roll(7, 9, &[]) <= 100);
        }
    }

    fn test_tile(color: [u8; 4]) -> Vec<u8> {
        let img = image::RgbaImage::from_pixel(8, 8, image::Rgba(color));
        let mut out = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgba8(img)
            .write_to(&mut out, image::ImageFormat::Png)
            .unwrap();
        out.into_inner()
    }

    #[test]
    fn composite_is_1240x400_png() {
        let a1 = test_tile([255, 0, 0, 255]);
        let a2 = test_tile([0, 0, 255, 255]);
        let png = love_composite_png(&a1, &a2, None).expect("composite");
        assert_eq!(&png[1..4], b"PNG");
        let img = image::load_from_memory(&png).expect("decode");
        assert_eq!(
            (img.width(), img.height()),
            (LOVE_TILE * 3 + LOVE_GAP * 2, LOVE_TILE)
        );
        // Left tile keeps the first avatar color, right tile the second.
        let rgba = img.to_rgba8();
        assert_eq!(rgba.get_pixel(0, 0).0, [255, 0, 0, 255]);
        assert_eq!(
            rgba.get_pixel(LOVE_TILE * 3 + LOVE_GAP * 2 - 1, 0).0,
            [0, 0, 255, 255]
        );
    }

    #[test]
    fn composite_rejects_bad_avatars() {
        let good = test_tile([255, 0, 0, 255]);
        assert!(love_composite_png(b"not an image", &good, None).is_none());
        assert!(love_composite_png(&good, b"not an image", None).is_none());
    }
}
