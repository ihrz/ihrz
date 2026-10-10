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

/// Podium card (ranks + economy): top 3 highlight + ranked list below.
///
/// `entries` is expected pre-sorted (rank 1 first), `(display_name, score)`.
/// Score is XP (ranks) or wealth (economy). Self-contained 800x460 SVG.
pub fn podium_svg(entries: &[(String, u64)]) -> String {
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
                r##"<g><rect x="{x}" y="{bar_y}" width="200" height="{bar_h}" rx="12" fill="#23272A" stroke="{color}" stroke-width="3"/><rect x="{x}" y="{bar_y}" width="200" height="5" fill="{color}"/><circle cx="{cx}" cy="{ay}" r="28" fill="{color}"/><text x="{cx}" y="{ayr}" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#23272A">{rank_n}</text><text x="{cx}" y="{ny}" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">{name}</text><text x="{cx}" y="{sy}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#B9BBBE">{score} XP</text><text x="{cx}" y="{ry}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="{color}">{rank}</text></g>"##,
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
                r##"<text x="60" y="{row_y}" font-family="sans-serif" font-size="13" fill="#B9BBBE">#{rank}</text><text x="110" y="{row_y}" font-family="sans-serif" font-size="13" fill="#ffffff">{name}</text><text x="740" y="{row_y}" text-anchor="end" font-family="sans-serif" font-size="13" fill="#B9BBBE">{score} XP</text>"##,
                row_y = row_y,
                rank = i + 1,
                name = escape_xml(name),
                score = score,
            ));
        }
    }

    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="460" viewBox="0 0 800 460" role="img" aria-label="Podium"><rect x="0" y="0" width="800" height="460" rx="16" fill="#36393f"/><text x="400" y="44" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff">PODIUM</text><rect x="60" y="60" width="680" height="5" fill="#9a5af2"/>{podium}{list}</svg>"##,
        podium = podium,
        list = list,
    )
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
}
