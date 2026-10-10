//! Rank / podium cards as self-contained SVG (no chromium, no html2png).
//!
//! Port of `src/assets/html/ranksCard.html`,
//! `podiumRanksModule.html` and `podiumEconomyModule.html`
//! used by `src/Interaction/HybridCommands/ranks/!show.ts`.
//! Brand gradient: `#9a5af2` -> `#6d28d9`.

/// Escape `& < > " '` for safe embedding in XML/SVG text nodes and attributes.
pub fn escape_xml(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for c in input.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&apos;"),
            _ => out.push(c),
        }
    }
    out
}

/// Clamped progress ratio in `0.0..=1.0`. `needed == 0` yields `0.0`.
fn progress_ratio(xp: u64, needed: u64) -> f64 {
    if needed == 0 {
        return 0.0;
    }
    ((xp as f64) / (needed as f64)).clamp(0.0, 1.0)
}

/// First uppercase letter of a name for the avatar placeholder circle.
fn initial(username: &str) -> String {
    let c = username.chars().find(|c| !c.is_whitespace()).unwrap_or('?');
    escape_xml(&c.to_uppercase().to_string())
}

/// 800x250 rank card. Self-contained SVG, no external font/network.
/// `avatar` is an embedded `data:` URL (never a remote CDN URL, so the
/// card survives avatar changes); `None` keeps the initial placeholder.
///
/// Mirrors `ranksCard.html` as driven by `!show.ts`: username,
/// `{level} LEVEL`, progress bar (`CURRENT_XP / XP_NEEDED` where
/// `XP_NEEDED = level * 500 + 500`), `{needed_xp} XP_REMAINING`, and —
/// exactly like TS — the `{xp_total}` slot shows the CURRENT xp
/// (`TOTAL_XP` is replaced with `currentxp` in TS).
pub fn rank_card_svg(username: &str, level: u64, xp: u64, avatar: Option<&str>) -> String {
    let safe_name = escape_xml(username);
    // TS: `const xpNeeded = level * 500 + 500`.
    let needed = level.saturating_mul(500).saturating_add(500).max(500);
    let ratio = progress_ratio(xp, needed);
    let percent = ratio * 100.0;
    // Track geometry must stay in sync with the `<rect>` below.
    const TRACK_W: f64 = 530.0;
    let bar_w = (TRACK_W * ratio).round() as u64;
    let remaining = needed.saturating_sub(xp);
    // TS TOTAL_XP slot carries the current xp, not a lifetime total.
    let total = xp;

    let face = match avatar.map(str::trim).filter(|s| !s.is_empty()) {
        Some(url) => format!(
            r##"<clipPath id="ih-avatar"><circle cx="115" cy="125" r="60"/></clipPath><g clip-path="url(#ih-avatar)"><image href="{src}" x="55" y="65" width="120" height="120" preserveAspectRatio="xMidYMid slice"/></g>"##,
            src = escape_xml(url),
        ),
        None => format!(
            r##"<circle cx="115" cy="125" r="60" fill="#9a5af2"/><text x="115" y="145" text-anchor="middle" font-family="sans-serif" font-size="52" font-weight="bold" fill="#ffffff">{initial}</text>"##,
            initial = initial(username),
        ),
    };

    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="250" viewBox="0 0 800 250" role="img" aria-label="Rank card for {safe_name}"><defs><linearGradient id="ih-bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#9a5af2"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient><clipPath id="ih-track"><rect x="230" y="150" width="530" height="28" rx="14"/></clipPath></defs><rect x="0" y="0" width="800" height="250" rx="16" fill="#2C2F33"/><rect x="10" y="10" width="780" height="230" rx="12" fill="#23272A"/>{face}<circle cx="115" cy="125" r="60" fill="none" stroke="#6d28d9" stroke-width="4"/><text x="230" y="70" font-family="sans-serif" font-size="30" font-weight="bold" fill="#ffffff">{safe_name}</text><text x="230" y="108" font-family="sans-serif" font-size="20" fill="#B9BBBE">LEVEL {level}</text><rect x="230" y="150" width="530" height="28" rx="14" fill="#40444B"/><g clip-path="url(#ih-track)"><rect x="230" y="150" width="{bar_w}" height="28" fill="url(#ih-bar)"/></g><text x="495" y="170" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff">{xp} / {needed} XP ({percent:.1}%)</text><text x="230" y="210" font-family="sans-serif" font-size="14" fill="#B9BBBE">{remaining} XP needed</text><text x="760" y="210" text-anchor="end" font-family="sans-serif" font-size="14" fill="#B9BBBE">Total {total} XP</text></svg>"##,
        safe_name = safe_name,
        face = face,
        level = level,
        bar_w = bar_w,
        xp = xp,
        needed = needed,
        percent = percent,
        remaining = remaining,
        total = total,
    )
}

/// AuthRestore dashboard card: registrations histogram, locale split,
/// recent verifications.
///
/// Port of `src/assets/html/authRestoreGetPage.html` as driven by
/// `src/Interaction/SlashCommands/authrestore/!get.ts`
/// (`registrationData`/`timeLabels`, `localeData`,
/// `recentVerifications`). NOTE: the TS dashboard renders through
/// Chromium (`client.func.html2png`); no render backend exists here,
/// so the same numbers are drawn as a self-contained SVG following
/// the rank-card pattern above (no external font/network), attached
/// as `authrestore.svg` with the text summary kept as the embed
/// description fallback.
///
/// `histogram` is day label + count pairs (oldest first),
/// `locales` is `(locale, count)` most-common-first, `recent` is
/// `(username, date)` newest-first. All slices are capped in-card.
pub fn authrestore_dashboard_svg(
    total_members: usize,
    key_used_count: i64,
    histogram: &[(String, usize)],
    locales: &[(String, usize)],
    recent: &[(String, String)],
) -> String {
    const W: u64 = 800;
    const BAR_AREA_X: u64 = 60;
    const BAR_AREA_W: u64 = 680;
    const BAR_MAX_H: u64 = 120;
    let peak = histogram.iter().map(|(_, c)| *c).max().unwrap_or(0).max(1) as f64;
    let n = histogram.len().max(1) as f64;
    let slot = BAR_AREA_W as f64 / n;
    let bar_w = (slot * 0.6).round().clamp(2.0, 22.0);
    let mut bars = String::new();
    for (i, (_, count)) in histogram.iter().enumerate() {
        let h = ((*count as f64 / peak) * BAR_MAX_H as f64).round() as u64;
        let x = (BAR_AREA_X as f64 + i as f64 * slot + (slot - bar_w) / 2.0).round() as u64;
        bars.push_str(&format!(
            r##"<rect x="{x}" y="{y}" width="{bw}" height="{h}" rx="2" fill="#9a5af2"/>"##,
            x = x,
            y = 250 - h,
            bw = bar_w as u64,
            h = h.max(2),
        ));
    }
    let mut locale_rows = String::new();
    if locales.is_empty() {
        locale_rows.push_str(
            r##"<text x="60" y="330" font-family="sans-serif" font-size="14" fill="#B9BBBE">No locales yet</text>"##,
        );
    } else {
        for (i, (locale, count)) in locales.iter().take(6).enumerate() {
            let y = 330 + (i as u64) * 22;
            locale_rows.push_str(&format!(
                r##"<text x="60" y="{y}" font-family="sans-serif" font-size="14" fill="#ffffff">{locale}</text><text x="380" y="{y}" text-anchor="end" font-family="sans-serif" font-size="14" fill="#B9BBBE">{count}</text>"##,
                y = y,
                locale = escape_xml(locale),
                count = count,
            ));
        }
    }
    let mut recent_rows = String::new();
    if recent.is_empty() {
        recent_rows.push_str(
            r##"<text x="430" y="330" font-family="sans-serif" font-size="14" fill="#B9BBBE">No verifications yet</text>"##,
        );
    } else {
        for (i, (name, date)) in recent.iter().take(6).enumerate() {
            let y = 330 + (i as u64) * 22;
            recent_rows.push_str(&format!(
                r##"<text x="430" y="{y}" font-family="sans-serif" font-size="14" fill="#ffffff">{name}</text><text x="740" y="{y}" text-anchor="end" font-family="sans-serif" font-size="13" fill="#B9BBBE">{date}</text>"##,
                y = y,
                name = escape_xml(name),
                date = escape_xml(date),
            ));
        }
    }
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="480" viewBox="0 0 {W} 480" role="img" aria-label="AuthRestore dashboard"><rect x="0" y="0" width="{W}" height="480" rx="16" fill="#36393f"/><text x="400" y="44" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="bold" fill="#ffffff">AUTHRESTORE</text><rect x="60" y="60" width="680" height="5" fill="#9a5af2"/><text x="60" y="110" font-family="sans-serif" font-size="16" fill="#B9BBBE">Total members</text><text x="60" y="140" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff">{total}</text><text x="430" y="110" font-family="sans-serif" font-size="16" fill="#B9BBBE">Key used</text><text x="430" y="140" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff">{keys}</text><text x="60" y="190" font-family="sans-serif" font-size="16" fill="#B9BBBE">Registrations (30 days)</text>{bars}<text x="60" y="290" font-family="sans-serif" font-size="16" fill="#B9BBBE">Locales</text><text x="430" y="290" font-family="sans-serif" font-size="16" fill="#B9BBBE">Recent verifications</text>{locales}{recent}</svg>"##,
        W = W,
        total = total_members,
        keys = key_used_count,
        bars = bars,
        locales = locale_rows,
        recent = recent_rows,
    )
}

/// Podium card (ranks + economy): top 3 highlight + ranked list below.
///
/// `entries` is expected pre-sorted (rank 1 first), `(display_name, score)`.
/// Score is XP (ranks) or wealth (economy). Self-contained 800x460 SVG.
pub fn podium_svg(entries: &[(String, u64)]) -> String {
    podium_svg_with_unit(entries, "XP")
}

/// Score-unit variant of [`podium_svg`]. The economy leaderboard reuses the
/// same SVG shape for wealth (unit `"coins"`): Chromium/html2png PNG
/// rendering is unavailable here, so the SVG itself is attached instead of
/// rendering the `podiumEconomyModule` HTML to PNG — same pattern as the
/// rank cards. No PNG render is attempted, deliberately.
pub fn podium_svg_with_unit(entries: &[(String, u64)], unit: &str) -> String {
    const MEDALS: [(&str, &str); 3] = [("#ffd700", "#1"), ("#c0c0c0", "#2"), ("#cd7f32", "#3")];
    // Visual order: 2nd left, 1st center (taller), 3rd right — like the HTML.
    const SLOTS: [(usize, u64, u64, u64); 3] = [
        (1, 80, 190, 150),  // entry index, x, bar y, bar h
        (0, 300, 140, 200), // winner, taller
        (2, 520, 190, 150),
    ];

    let mut podium = String::new();
    for (entry_idx, x, bar_y, bar_h) in SLOTS {
        if let Some((name, score)) = entries.get(entry_idx) {
            let (color, rank) = MEDALS[entry_idx.min(2)];
            podium.push_str(&format!(
                r##"<g><rect x="{x}" y="{bar_y}" width="200" height="{bar_h}" rx="12" fill="#23272A" stroke="{color}" stroke-width="3"/><rect x="{x}" y="{bar_y}" width="200" height="5" fill="{color}"/><circle cx="{cx}" cy="{ay}" r="28" fill="{color}"/><text x="{cx}" y="{ayr}" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#23272A">{rank_n}</text><text x="{cx}" y="{ny}" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">{name}</text><text x="{cx}" y="{sy}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#B9BBBE">{score} {unit}</text><text x="{cx}" y="{ry}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="{color}">{rank}</text></g>"##,
                x = x,
                bar_y = bar_y,
                bar_h = bar_h,
                cx = x + 100,
                ay = bar_y - 34,
                ayr = bar_y - 26,
                rank_n = entry_idx + 1,
                ny = bar_y + 60,
                name = escape_xml(name),
                sy = bar_y + 84,
                score = score,
                unit = escape_xml(unit),
                ry = bar_y + 108,
                color = color,
                rank = rank,
            ));
        } else {
            podium.push_str(&format!(
                r##"<g opacity="0.35"><rect x="{x}" y="{bar_y}" width="200" height="{bar_h}" rx="12" fill="#23272A"/><text x="{cx}" y="{ty}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#B9BBBE">—</text></g>"##,
                x = x,
                bar_y = bar_y,
                bar_h = bar_h,
                cx = x + 100,
                ty = bar_y + 80,
            ));
        }
    }

    let mut list = String::new();
    if entries.is_empty() {
        list.push_str(
            r##"<text x="400" y="400" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#B9BBBE">No entries yet</text>"##,
        );
    } else {
        for (i, (name, score)) in entries.iter().take(8).enumerate() {
            let row_y = 370 + (i as u64) * 22;
            if row_y > 444 {
                break;
            }
            list.push_str(&format!(
                r##"<text x="60" y="{row_y}" font-family="sans-serif" font-size="13" fill="#B9BBBE">#{rank}</text><text x="110" y="{row_y}" font-family="sans-serif" font-size="13" fill="#ffffff">{name}</text><text x="740" y="{row_y}" text-anchor="end" font-family="sans-serif" font-size="13" fill="#B9BBBE">{score} {unit}</text>"##,
                row_y = row_y,
                rank = i + 1,
                name = escape_xml(name),
                score = score,
                unit = escape_xml(unit),
            ));
        }
    }

    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="460" viewBox="0 0 800 460" role="img" aria-label="Podium"><rect x="0" y="0" width="800" height="460" rx="16" fill="#36393f"/><text x="400" y="44" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff">PODIUM</text><rect x="60" y="60" width="680" height="5" fill="#9a5af2"/>{podium}{list}</svg>"##,
        podium = podium,
        list = list,
    )
}

/// Captcha challenge as rasterized PNG bytes (no chromium, no html2png).
///
/// Port of `src/core/captcha.ts` + `src/assets/html/captcha.html`:
/// 900x300 parchment (`#d6d2c8`) card, dark (`#1c130a`) code glyphs,
/// fixed distortion strokes drawn OVER the text (like `.captcha-lines`
/// at z-index 3). Glyphs come from an embedded 5x7 bitmap font — no
/// external font, image, or network — so output is deterministic per
/// code (same code yields identical bytes).
///
/// The PNG itself carries the challenge: attach it as `captcha.png`
/// (via `CreateAttachment::bytes`) and do NOT repeat the code in the
/// message text. The events_handler captcha leg reads this pure fn.
pub const CAPTCHA_WIDTH: u32 = 900;
pub const CAPTCHA_HEIGHT: u32 = 300;

const CAPTCHA_BG: [u8; 3] = [0xd6, 0xd2, 0xc8];
const CAPTCHA_INK: [u8; 3] = [0x1c, 0x13, 0x0a];

/// Render `code` (uppercased, unknown chars become `?`) to PNG bytes.
pub fn captcha_png(code: &str) -> Vec<u8> {
    use image::codecs::png::PngEncoder;
    use image::{ExtendedColorType, ImageEncoder};

    let mut img = image::RgbImage::new(CAPTCHA_WIDTH, CAPTCHA_HEIGHT);
    for px in img.pixels_mut() {
        *px = image::Rgb(CAPTCHA_BG);
    }

    draw_captcha_text(&mut img, code);
    draw_captcha_strokes(&mut img);
    draw_captcha_noise(&mut img, code);

    let mut buf = Vec::new();
    PngEncoder::new(&mut buf)
        .write_image(
            &img.into_raw(),
            CAPTCHA_WIDTH,
            CAPTCHA_HEIGHT,
            ExtendedColorType::Rgb8,
        )
        .expect("captcha PNG encode to memory");
    buf
}

/// FNV-1a 64-bit hash. Seeds the deterministic jitter/noise so the
/// same code always renders the same image.
fn captcha_hash(code: &str) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in code.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    h
}

/// Deterministic xorshift64 step for jitter/noise.
fn captcha_rand(state: &mut u64) -> u64 {
    let mut x = *state | 1;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    *state = x;
    x
}

fn captcha_blend(img: &mut image::RgbImage, x: u32, y: u32, rgb: [u8; 3], alpha: f32) {
    if x >= CAPTCHA_WIDTH || y >= CAPTCHA_HEIGHT {
        return;
    }
    let dst = img.get_pixel_mut(x, y).0;
    let a = alpha.clamp(0.0, 1.0);
    let mut out = [0u8; 3];
    for i in 0..3 {
        out[i] = (rgb[i] as f32 * a + dst[i] as f32 * (1.0 - a)).round() as u8;
    }
    *img.get_pixel_mut(x, y) = image::Rgb(out);
}

/// Filled disc stamp for thick strokes.
fn captcha_disc(img: &mut image::RgbImage, cx: i32, cy: i32, r: i32, rgb: [u8; 3], alpha: f32) {
    for dy in -r..=r {
        for dx in -r..=r {
            if dx * dx + dy * dy <= r * r {
                let (x, y) = (cx + dx, cy + dy);
                if x >= 0 && y >= 0 {
                    captcha_blend(img, x as u32, y as u32, rgb, alpha);
                }
            }
        }
    }
}

/// Bresenham line with round stamps. Mirrors one `<line>`/`<path>`
/// of the captcha.html distortion overlay, scaled to 900x300.
fn captcha_line(
    img: &mut image::RgbImage,
    x0: i32,
    y0: i32,
    x1: i32,
    y1: i32,
    width: i32,
    alpha: f32,
) {
    let (mut x, mut y) = (x0, y0);
    let dx = (x1 - x0).abs();
    let dy = -(y1 - y0).abs();
    let sx = if x0 < x1 { 1 } else { -1 };
    let sy = if y0 < y1 { 1 } else { -1 };
    let r = (width.max(1) - 1).max(0);
    loop {
        captcha_disc(img, x, y, r, CAPTCHA_INK, alpha);
        if x == x1 && y == y1 {
            break;
        }
        let e2 = 2 * (dx + dy);
        if e2 >= dy {
            if x == x1 {
                break;
            }
            x += sx;
        }
        if e2 <= dx {
            if y == y1 {
                break;
            }
            y += sy;
        }
    }
}

/// Quadratic bezier sampled into stamps. Mirrors the
/// `M 27 88 Q 60 5 99 48` curve of captcha.html, scaled to 900x300.
#[allow(clippy::too_many_arguments)]
fn captcha_quad(
    img: &mut image::RgbImage,
    x0: i32,
    y0: i32,
    cx: i32,
    cy: i32,
    x1: i32,
    y1: i32,
    width: i32,
    alpha: f32,
) {
    let steps = 140;
    for i in 0..=steps {
        let t = i as f32 / steps as f32;
        let u = 1.0 - t;
        let x = (u * u * x0 as f32 + 2.0 * u * t * cx as f32 + t * t * x1 as f32).round() as i32;
        let y = (u * u * y0 as f32 + 2.0 * u * t * cy as f32 + t * t * y1 as f32).round() as i32;
        captcha_disc(img, x, y, (width.max(1) - 1).max(0), CAPTCHA_INK, alpha);
    }
}

/// 5x7 bitmap rows for the captcha alphabet
/// (`ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789`, no J).
/// Each u8 holds one row, bit 4 = leftmost pixel.
fn captcha_glyph(c: char) -> [u8; 7] {
    match c {
        'A' => [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
        'B' => [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
        'C' => [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
        'D' => [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
        'E' => [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
        'F' => [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
        'G' => [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F],
        'H' => [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
        'I' => [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
        'K' => [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
        'L' => [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
        'M' => [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
        'N' => [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
        'O' => [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
        'P' => [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
        'Q' => [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
        'R' => [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
        'S' => [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
        'T' => [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
        'U' => [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
        'V' => [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
        'W' => [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
        'X' => [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
        'Y' => [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
        'Z' => [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
        '0' => [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
        '1' => [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
        '2' => [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F],
        '3' => [0x1F, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0E],
        '4' => [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
        '5' => [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
        '6' => [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
        '7' => [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
        '8' => [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
        '9' => [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
        _ => [0x0E, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
    }
}

/// Centered code line: 9x glyph scale, 20px tracking, small
/// deterministic vertical jitter per char (bot-readable, hard to OCR).
fn draw_captcha_text(img: &mut image::RgbImage, code: &str) {
    const SCALE: i32 = 9;
    const TRACKING: i32 = 20;
    let chars: Vec<char> = code.to_uppercase().chars().collect();
    if chars.is_empty() {
        return;
    }
    let cell_w = 5 * SCALE + TRACKING;
    let total_w = chars.len() as i32 * cell_w - TRACKING;
    let mut rng = captcha_hash(code);
    let x0 = (CAPTCHA_WIDTH as i32 - total_w) / 2;
    let y0 = (CAPTCHA_HEIGHT as i32 - 7 * SCALE) / 2;
    for (i, c) in chars.iter().enumerate() {
        let glyph = captcha_glyph(*c);
        let jitter = (captcha_rand(&mut rng) % 21) as i32 - 10;
        let gx = x0 + i as i32 * cell_w;
        let gy = (y0 + jitter).clamp(8, CAPTCHA_HEIGHT as i32 - 7 * SCALE - 8);
        for (row, bits) in glyph.iter().enumerate() {
            for col in 0..5 {
                if (bits >> (4 - col)) & 1 == 1 {
                    for sy in 0..SCALE {
                        for sx in 0..SCALE {
                            captcha_blend(
                                img,
                                (gx + col * SCALE + sx) as u32,
                                (gy + row as i32 * SCALE + sy) as u32,
                                CAPTCHA_INK,
                                1.0,
                            );
                        }
                    }
                }
            }
        }
    }
}

/// Fixed distortion strokes over the text. Coordinates are the
/// captcha.html overlay (viewBox 100x100) scaled to 900x300.
fn draw_captcha_strokes(img: &mut image::RgbImage) {
    captcha_line(img, 18, 210, 252, 45, 4, 0.7);
    captcha_line(img, 9, 120, 243, 240, 4, 0.6);
    captcha_line(img, 54, 60, 216, 255, 3, 0.5);
    captcha_quad(img, 243, 264, 540, 15, 891, 144, 4, 0.55);
}

/// Deterministic speckle noise (inset 8px so the card edge stays
/// clean parchment). Seeded by the code, like the text jitter.
fn draw_captcha_noise(img: &mut image::RgbImage, code: &str) {
    let mut rng = captcha_hash(code) ^ 0x9e3779b97f4a7c15;
    for _ in 0..700 {
        let x = 8 + (captcha_rand(&mut rng) % (CAPTCHA_WIDTH - 16) as u64) as u32;
        let y = 8 + (captcha_rand(&mut rng) % (CAPTCHA_HEIGHT - 16) as u64) as u32;
        captcha_blend(img, x, y, CAPTCHA_INK, 0.10);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rank_card_is_self_contained_svg() {
        let svg = rank_card_svg("Kisakay", 7, 250, None);
        assert!(svg.starts_with("<svg"), "must start with <svg");
        assert!(svg.contains(r#"xmlns="http://www.w3.org/2000/svg""#));
        assert!(svg.contains(r#"width="800""#));
        assert!(svg.contains(r#"height="250""#));
        assert!(svg.contains("</svg>"));
        assert!(svg.contains("#9a5af2"), "iHorizon brand color");
        assert!(!svg.contains("xlink:href"), "no external refs");
        assert!(!svg.contains("AVATAR_URL"), "no unreplaced placeholder");
        // No avatar: initial placeholder, no remote image.
        assert!(!svg.contains("<image"), "no external images");
    }

    #[test]
    fn rank_card_progress_matches_ts_curve() {
        // TS: xpNeeded = level * 500 + 500; level 0 -> 500.
        let svg = rank_card_svg("User", 0, 250, None);
        // Track is 530px wide -> 50% == 265px bar.
        assert!(svg.contains(r#"width="265""#), "bar:\n{svg}");
        assert!(svg.contains("50.0%"));
        assert!(svg.contains("250 / 500 XP"));
    }

    #[test]
    fn rank_card_embeds_avatar_when_provided() {
        let svg = rank_card_svg("User", 1, 10, Some("data:image/png;base64,AAAA"));
        assert!(svg.contains("<image"), "avatar missing:\n{svg}");
        assert!(svg.contains("data:image/png;base64,AAAA"));
        assert!(svg.contains("clip-path=\"url(#ih-avatar)\""));
        // Empty/blank avatar falls back to the initial placeholder.
        let svg = rank_card_svg("User", 1, 10, Some("  "));
        assert!(!svg.contains("<image"));
    }

    #[test]
    fn rank_card_escapes_xss_username() {
        let svg = rank_card_svg("<script>alert(&'x')</script>", 3, 10, None);
        assert!(!svg.contains("<script>"), "raw tag leaked:\n{svg}");
        assert!(svg.contains("&lt;script&gt;"));
        assert!(svg.contains("&amp;"));
        assert!(svg.contains("&apos;"));
    }

    #[test]
    fn rank_card_shows_level_and_totals() {
        // TS TOTAL_XP slot carries the CURRENT xp (level 12 -> 6500 needed).
        let svg = rank_card_svg("Ada", 12, 6000, None);
        assert!(svg.contains("LEVEL 12"));
        assert!(svg.contains("6000 / 6500 XP"));
        assert!(svg.contains("500 XP needed")); // 6500 - 6000
        assert!(svg.contains("Total 6000 XP"));
    }

    #[test]
    fn rank_card_zero_xp_does_not_nan() {
        let svg = rank_card_svg("Zero", 0, 0, None);
        assert!(svg.contains(r#"width="0""#));
        assert!(svg.contains("0.0%"));
        assert!(!svg.contains("NaN"));
    }

    #[test]
    fn podium_renders_top3_and_list() {
        let entries = vec![
            ("Alice".to_string(), 9000),
            ("Bob".to_string(), 7000),
            ("Cara".to_string(), 5000),
            ("Dan".to_string(), 1000),
        ];
        let svg = podium_svg(&entries);
        assert!(svg.contains(r#"width="800""#));
        assert!(svg.contains("#ffd700"));
        assert!(svg.contains("#c0c0c0"));
        assert!(svg.contains("#cd7f32"));
        for name in ["Alice", "Bob", "Cara", "Dan"] {
            assert!(svg.contains(name), "missing {name}");
        }
        assert!(svg.contains("#1") && svg.contains("#2") && svg.contains("#3"));
    }

    #[test]
    fn podium_empty_and_xss_safe() {
        let empty = podium_svg(&[]);
        assert!(empty.contains("No entries yet"));
        assert!(empty.contains("</svg>"));
        let evil = podium_svg(&[("<b>&Co</b>".to_string(), 42)]);
        assert!(!evil.contains("<b>"));
        assert!(evil.contains("&lt;b&gt;&amp;Co&lt;/b&gt;"));
    }

    #[test]
    fn podium_default_unit_stays_xp_for_ranks() {
        let svg = podium_svg(&[("Alice".to_string(), 9000)]);
        assert!(svg.contains("9000 XP"));
    }

    #[test]
    fn podium_economy_unit_labels_wealth_as_coins() {
        // Economy reuses the SVG shape with wealth + coin unit instead of
        // rendering the podiumEconomyModule HTML to PNG (no Chromium).
        let entries = vec![("Alice".to_string(), 9000), ("Bob".to_string(), 7000)];
        let svg = podium_svg_with_unit(&entries, "coins");
        assert!(svg.contains("9000 coins"));
        assert!(svg.contains("7000 coins"));
        assert!(!svg.contains("XP"));
    }

    #[test]
    fn captcha_png_is_real_png_900x300() {
        let png = captcha_png("ABCDEFG");
        assert!(png.len() > 1000, "too small: {}", png.len());
        assert_eq!(&png[0..8], &[137, 80, 78, 71, 13, 10, 26, 10], "PNG magic");
        let img = image::load_from_memory(&png).expect("decodable PNG");
        assert_eq!((img.width(), img.height()), (900, 300));
        let rgb = img.to_rgb8();
        // Clean parchment edge (noise is inset 8px, strokes stay clear).
        assert_eq!(rgb.get_pixel(2, 2).0, [0xd6, 0xd2, 0xc8]);
    }

    #[test]
    fn captcha_png_carries_ink_and_varies_per_code() {
        let a = captcha_png("AAAAAAA");
        let b = captcha_png("BBBBBBB");
        assert_ne!(a, b, "different codes must rasterize differently");
        assert_eq!(a, captcha_png("AAAAAAA"), "deterministic per code");
        let img = image::load_from_memory(&a)
            .expect("decodable PNG")
            .to_rgb8();
        let ink = img
            .pixels()
            .filter(|p| {
                let d = (p.0[0] as i32 - 0x1c).abs()
                    + (p.0[1] as i32 - 0x13).abs()
                    + (p.0[2] as i32 - 0x0a).abs();
                d < 60
            })
            .count();
        assert!(ink > 1000, "code glyphs missing, ink px: {ink}");
    }

    #[test]
    fn captcha_png_empty_code_stays_valid() {
        let png = captcha_png("");
        let img = image::load_from_memory(&png).expect("decodable PNG");
        assert_eq!((img.width(), img.height()), (900, 300));
    }

    #[test]
    fn authrestore_dashboard_carries_same_numbers_as_text() {
        let histogram = vec![
            ("Jan 1".to_string(), 0),
            ("Jan 2".to_string(), 3),
            ("Jan 3".to_string(), 7),
        ];
        let locales = vec![("fr".to_string(), 5), ("en-US".to_string(), 2)];
        let recent = vec![("Ada".to_string(), "Jan 3".to_string())];
        let svg = authrestore_dashboard_svg(7, 4, &histogram, &locales, &recent);
        assert!(svg.starts_with("<svg"), "must start with <svg");
        assert!(svg.contains(r#"xmlns="http://www.w3.org/2000/svg""#));
        assert!(svg.contains("</svg>"));
        assert!(!svg.contains("<script>"), "no raw markup leak");
        // Totals, locale split, recent row all present.
        assert!(svg.contains(">7<"), "total:\\n{svg}");
        assert!(svg.contains(">4<"), "key count:\\n{svg}");
        assert!(svg.contains("fr") && svg.contains(">5<"));
        assert!(svg.contains("Ada"));
        // Histogram peak bar hits the full height.
        assert!(svg.contains(r#"height="120""#), "peak bar:\\n{svg}");
        // XSS-safe.
        let evil = authrestore_dashboard_svg(
            1,
            0,
            &[],
            &[],
            &[("<b>&Co</b>".to_string(), "now".to_string())],
        );
        assert!(!evil.contains("<b>"));
        assert!(evil.contains("&lt;b&gt;&amp;Co&lt;/b&gt;"));
        assert!(evil.contains("No locales yet"));
    }
}
