// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/fun/* (sample: !dice, ping).

use crate::bot::Ctx;

/// Basic latency check. Mirrors the TS ping-style fun commands.
#[poise::command(slash_command, prefix_command, category = "fun")]
pub async fn ping(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let latency = ctx.ping().await.as_millis();
    let msg = crate::commands::lang_for(&ctx, "var_latency", "Latency").await;
    ctx.say(format!("{msg}: {latency}ms")).await?;
    Ok(())
}

/// Dice roll. Mirrors src/Interaction/HybridCommands/fun/!dice.ts.
#[poise::command(slash_command, prefix_command, category = "fun")]
pub async fn dice(
    ctx: Ctx<'_>,
    #[description = "Faces (default 6)"] faces: Option<u32>,
) -> Result<(), anyhow::Error> {
    let faces = normalize_faces(faces);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    let roll = roll_dice(now, faces);
    ctx.say(format!("🎲 {roll} / {faces}")).await?;
    Ok(())
}

pub fn normalize_faces(faces: Option<u32>) -> u32 {
    faces.unwrap_or(6).clamp(2, 100)
}

pub fn roll_dice(now_ms: u64, faces: u32) -> u64 {
    (now_ms % faces as u64) + 1
}

/// Coin flip. Mirrors !heads-tails.ts.
pub fn coin_flip(now_ms: u64) -> &'static str {
    if now_ms.is_multiple_of(2) {
        "heads"
    } else {
        "tails"
    }
}

/// Random number in [min, max]. Mirrors !number.ts.
pub fn roll_range(now_ms: u64, min: i64, max: i64) -> i64 {
    let (lo, hi) = if min <= max { (min, max) } else { (max, min) };
    let span = (hi - lo + 1) as u64;
    lo + (now_ms % span) as i64
}

/// 8-ball answer pick. Mirrors !question.ts answer pool.
pub const EIGHTBALL: [&str; 8] = [
    "yes",
    "no",
    "maybe",
    "definitely",
    "ask later",
    "doubtful",
    "certainly",
    "never",
];

pub fn eightball(now_ms: u64) -> &'static str {
    EIGHTBALL[(now_ms % EIGHTBALL.len() as u64) as usize]
}

/// Minimal morse encoder (a-z 0-9). Mirrors !morse.ts latin side.
pub fn morse_encode(s: &str) -> String {
    const TABLE: [(&str, &str); 36] = [
        ("a", ".-"),
        ("b", "-..."),
        ("c", "-.-."),
        ("d", "-.."),
        ("e", "."),
        ("f", "..-."),
        ("g", "--."),
        ("h", "...."),
        ("i", ".."),
        ("j", ".---"),
        ("k", "-.-"),
        ("l", ".-.."),
        ("m", "--"),
        ("n", "-."),
        ("o", "---"),
        ("p", ".--."),
        ("q", "--.-"),
        ("r", ".-."),
        ("s", "..."),
        ("t", "-"),
        ("u", "..-"),
        ("v", "...-"),
        ("w", ".--"),
        ("x", "-..-"),
        ("y", "-.--"),
        ("z", "--.."),
        ("0", "-----"),
        ("1", ".----"),
        ("2", "..---"),
        ("3", "...--"),
        ("4", "....-"),
        ("5", "....."),
        ("6", "-...."),
        ("7", "--..."),
        ("8", "---.."),
        ("9", "----."),
    ];
    s.to_ascii_lowercase()
        .chars()
        .filter_map(|c| {
            if c == ' ' {
                Some("/".to_string())
            } else {
                TABLE
                    .iter()
                    .find(|(k, _)| *k == c.to_string().as_str())
                    .map(|(_, m)| m.to_string())
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn now_ms_sys() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1)
}

/// Animal image API endpoints. Mirrors fun animal commands
/// (api.animality.xyz, random-d.uk, edgecats.net, cataas.com).
pub fn animal_api_url(kind: &str) -> Option<&'static str> {
    match kind {
        "fox" | "frog" | "panda" | "dolphin" => None, // built dynamically below
        "dog" => Some("https://random-d.uk/api/v2/random"),
        "cat" => Some("https://edgecats.net/random"),
        "catsay" => Some("https://cataas.com/cat/says/"),
        _ => None,
    }
}

pub fn animality_url(kind: &str) -> String {
    format!("https://api.animality.xyz/all/{kind}")
}

/// Fake-hack lines. Mirrors !hack.ts progressive embed (pure text).
pub fn hack_lines(target: &str) -> Vec<String> {
    vec![
        format!("Hacking {target}..."),
        "Finding IP...".to_string(),
        "Bypassing firewall...".to_string(),
        "Done. (fake)".to_string(),
    ]
}
/// Poll tally. Mirrors !poll.ts reaction counts: winner = max, ties kept.
pub fn tally_poll(options: &[String], counts: &[u64]) -> Vec<(String, u64)> {
    let mut rows: Vec<(String, u64)> = options
        .iter()
        .cloned()
        .zip(counts.iter().copied())
        .collect();
    rows.sort_by_key(|a| std::cmp::Reverse(a.1));
    rows
}

/// Social interaction line. Mirrors hug/kiss/slap embeds (nekos APIs
/// pending; text shape ported).
pub fn interaction_line(actor: &str, target: &str, verb: &str) -> String {
    format!("**{actor}** {verb} **{target}**")
}

/// Poll command (options as comma list; reactions tallied by clients).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "poll")]
pub async fn poll(
    ctx: Ctx<'_>,
    #[description = "Comma-separated options"] options: String,
) -> Result<(), anyhow::Error> {
    let opts: Vec<String> = options
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if opts.len() < 2 {
        ctx.say("Give at least 2 options.").await?;
        return Ok(());
    }
    ctx.say(
        opts.iter()
            .enumerate()
            .map(|(i, o)| format!("{}. {o}", i + 1))
            .collect::<Vec<_>>()
            .join("\n"),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "hack")]
pub async fn hack(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    ctx.say(hack_lines(&user.tag()).join("\n")).await?;
    Ok(())
}

/// Cat command. Mirrors !cat.ts (edgecats/thecatapi fetch).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "cat")]
pub async fn cat(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let text = match http_client().get(catsay_search_url()).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => String::new(),
    };
    match parse_cat_json(&text) {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default().image(u);
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            ctx.say("Cat API down.").await?;
        }
    }
    Ok(())
}

/// Dog command. Mirrors !dog.ts (random-d.uk fetch).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "dog")]
pub async fn dog(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let text = match http_client()
        .get(animal_api_url("dog").unwrap_or("dogs"))
        .send()
        .await
    {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => String::new(),
    };
    match parse_dog_json(&text) {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default().image(u);
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            ctx.say("Dog API down.").await?;
        }
    }
    Ok(())
}

/// Hug command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "hug")]
pub async fn hug(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    ctx.say(interaction_line(&ctx.author().tag(), &user.tag(), "hugs"))
        .await?;
    Ok(())
}

/// Kiss command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "kiss")]
pub async fn kiss(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    ctx.say(interaction_line(&ctx.author().tag(), &user.tag(), "kisses"))
        .await?;
    Ok(())
}

/// Slap command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "slap")]
pub async fn slap(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    ctx.say(interaction_line(&ctx.author().tag(), &user.tag(), "slaps"))
        .await?;
    Ok(())
}
/// Love compatibility 0..=100. Mirrors !love.ts: deterministic from the
/// ordered id pair; couples in `always100` (config.command.always100,
/// "id1xid2") always score 100.
pub fn love_score(a: u64, b: u64, always100: &[String]) -> u64 {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    if always100.iter().any(|c| c.trim() == format!("{lo}x{hi}")) {
        return 100;
    }
    let mut h = lo.wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(hi);
    h ^= h >> 30;
    h = h.wrapping_mul(0xBF58476D1CE4E5B9);
    h ^= h >> 27;
    h = h.wrapping_mul(0x94D049BB133111EB);
    h ^= h >> 31;
    h % 101
}

/// Love command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "love")]
pub async fn love(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: poise::serenity_prelude::User,
    #[description = "Second user"] user2: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let b = user2
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let score = love_score(user1.id.get(), b, &[]);
    ctx.say(format!("Love between {} and <@{b}>: {score}%", user1.tag()))
        .await?;
    Ok(())
}

/// Coin flip command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "coinflip")]
pub async fn coinflip(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say(coin_flip(now_ms_sys())).await?;
    Ok(())
}

/// Random number command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "number")]
pub async fn number(
    ctx: Ctx<'_>,
    #[description = "Min"] min: Option<i64>,
    #[description = "Max"] max: Option<i64>,
) -> Result<(), anyhow::Error> {
    ctx.say(roll_range(now_ms_sys(), min.unwrap_or(1), max.unwrap_or(100)).to_string())
        .await?;
    Ok(())
}

/// 8-ball command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "question")]
pub async fn question(
    ctx: Ctx<'_>,
    #[description = "Your question"] _q: String,
) -> Result<(), anyhow::Error> {
    ctx.say(eightball(now_ms_sys())).await?;
    Ok(())
}

/// Morse command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "morse")]
pub async fn morse(
    ctx: Ctx<'_>,
    #[description = "Text"] text: String,
) -> Result<(), anyhow::Error> {
    ctx.say(morse_encode(&text)).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_faces_defaults_and_clamps() {
        assert_eq!(normalize_faces(None), 6);
        assert_eq!(normalize_faces(Some(6)), 6);
        assert_eq!(normalize_faces(Some(0)), 2);
        assert_eq!(normalize_faces(Some(1)), 2);
        assert_eq!(normalize_faces(Some(500)), 100);
    }

    #[test]
    fn roll_dice_stays_in_range() {
        for faces in [2, 6, 20, 100] {
            for now in [0, 1, 5, 6, 123456789] {
                let r = roll_dice(now, faces);
                assert!((1..=faces as u64).contains(&r));
            }
        }
    }

    #[test]
    fn roll_dice_is_deterministic_for_same_input() {
        assert_eq!(roll_dice(10, 6), roll_dice(10, 6));
        assert_eq!(roll_dice(10, 6), 5);
        assert_eq!(roll_dice(12, 6), 1);
    }

    #[test]
    fn coin_and_range_helpers() {
        assert_eq!(coin_flip(0), "heads");
        assert_eq!(coin_flip(1), "tails");
        assert_eq!(roll_range(5, 1, 10), 6);
        assert_eq!(roll_range(5, 10, 1), 6);
        assert!(EIGHTBALL.contains(&eightball(3)));
    }

    #[test]
    fn morse_encodes() {
        assert_eq!(morse_encode("sos"), "... --- ...");
        assert_eq!(morse_encode("a b"), ".- / -...");
    }

    #[test]
    fn love_is_deterministic_and_bounded() {
        let a = love_score(1, 2, &[]);
        assert!(a <= 100);
        assert_eq!(a, love_score(2, 1, &[]));
        assert_eq!(a, love_score(1, 2, &[]));
    }

    #[test]
    fn love_always100_couples() {
        let forced = vec!["1x2".to_string()];
        assert_eq!(love_score(1, 2, &forced), 100);
        assert_eq!(love_score(2, 1, &forced), 100);
        assert!(love_score(1, 3, &forced) <= 100);
    }

    #[test]
    fn interaction_line_shapes() {
        assert_eq!(interaction_line("a", "b", "hugs"), "**a** hugs **b**");
    }

    #[test]
    fn tally_sorts_desc() {
        let rows = tally_poll(&["a".into(), "b".into()], &[3, 9]);
        assert_eq!(rows[0], ("b".to_string(), 9));
    }

    #[test]
    fn animal_endpoints_and_hack() {
        assert_eq!(
            animal_api_url("dog"),
            Some("https://random-d.uk/api/v2/random")
        );
        assert_eq!(animality_url("fox"), "https://api.animality.xyz/all/fox");
        assert_eq!(hack_lines("x").len(), 4);
    }
}
// ---- caracteres (!caracteres.ts: fontStyles map + convertText) ----

/// Original alphabet. Mirrors fontStyles["Original"] in !caracteres.ts.
pub const CARACTERES_ORIGINAL: &str =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/// Bold table. Mirrors fontStyles["Bold"] in !caracteres.ts.
pub const CARACTERES_BOLD: &str = "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵";

/// Fullwidth table. Mirrors fontStyles["FULL"] in !caracteres.ts.
pub const CARACTERES_FULL: &str = "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９";

/// Circled table. Mirrors fontStyles["Circled"] in !caracteres.ts.
pub const CARACTERES_CIRCLED: &str =
    "ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨";

/// Style names exposed by the poise port (subset; TS shows 25 via select menu).
pub fn caracteres_styles() -> &'static [&'static str] {
    &["Bold", "Full", "Circled"]
}

pub fn caracteres_table(style: &str) -> Option<&'static str> {
    match style.to_ascii_lowercase().as_str() {
        "bold" => Some(CARACTERES_BOLD),
        "full" => Some(CARACTERES_FULL),
        "circled" | "circle" => Some(CARACTERES_CIRCLED),
        _ => None,
    }
}

/// Pure port of convertText(text, style) in !caracteres.ts:
/// index-map each ORIGINAL char to the style table char, passthrough otherwise.
pub fn convert_font(text: &str, style_table: &str) -> String {
    let orig: Vec<char> = CARACTERES_ORIGINAL.chars().collect();
    let styled: Vec<char> = style_table.chars().collect();
    if styled.len() != orig.len() {
        return text.to_string();
    }
    text.chars()
        .map(|c| {
            orig.iter()
                .position(|&o| o == c)
                .map(|i| styled[i])
                .unwrap_or(c)
        })
        .collect()
}

pub fn caracteres_convert(text: &str, style: &str) -> Option<String> {
    caracteres_table(style).map(|t| convert_font(text, t))
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "caracteres")]
pub async fn caracteres(
    ctx: Ctx<'_>,
    #[description = "Text to transform"] text: String,
    #[description = "Style: Bold, Full, Circled"] style: Option<String>,
) -> Result<(), anyhow::Error> {
    let style = style.unwrap_or_else(|| "Bold".to_string());
    match caracteres_convert(&text, &style) {
        Some(out) => {
            ctx.say(format!("**{style}**: {out}")).await?;
        }
        None => {
            ctx.say(format!(
                "Unknown style `{style}`. Available: {}",
                caracteres_styles().join(", ")
            ))
            .await?;
        }
    }
    Ok(())
}

// ---- catsay (!catsay.ts: thecatapi search + catsay html render) ----

/// Mirrors the thecatapi search call in !catsay.ts.
pub fn catsay_search_url() -> &'static str {
    "https://api.thecatapi.com/v1/images/search?mime_types=jpg,png"
}

/// Parse random-d.uk JSON ({"url": ...}).
pub fn parse_dog_json(raw: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(raw)
        .ok()?
        .get("url")?
        .as_str()
        .map(|s| s.to_string())
}

/// Parse thecatapi JSON ([{"url": ...}]).
pub fn parse_cat_json(raw: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(raw)
        .ok()?
        .as_array()?
        .first()?
        .get("url")?
        .as_str()
        .map(|s| s.to_string())
}

/// Direct cataas render URL for !catsay.ts text.
pub fn catsay_image_url(text: &str) -> String {
    format!("https://cataas.com/cat/says/{}", pct_encode(text))
}

fn http_client() -> reqwest::Client {
    reqwest::Client::new()
}

/// Mirrors `.slice(0, 70)` on the text option in !catsay.ts.
pub fn truncate_catsay_text(s: &str) -> String {
    s.chars().take(70).collect()
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "catsay")]
pub async fn catsay(
    ctx: Ctx<'_>,
    #[description = "Text (max 70 chars)"] text: Option<String>,
) -> Result<(), anyhow::Error> {
    let text = truncate_catsay_text(text.as_deref().unwrap_or(""));
    // cataas renders server-side: direct image URL, no local render needed.
    let embed = poise::serenity_prelude::CreateEmbed::default().image(catsay_image_url(&text));
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

// ---- transgender (!transgender.ts: some-random-api canvas URL) ----

/// Minimal encodeURIComponent equivalent (unreserved chars pass through).
pub fn pct_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if matches!(b, b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~') {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Mirrors the canvas link builder in !transgender.ts.
pub fn transgender_url(avatar_url: &str) -> String {
    format!(
        "https://some-random-api.com/canvas/misc/transgender?avatar={}",
        pct_encode(avatar_url)
    )
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "transgender"
)]
pub async fn transgender(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.unwrap_or_else(|| ctx.author().clone());
    let avatar = u.face();
    // Canvas fetch pending; URL shape ported.
    ctx.say(transgender_url(&avatar)).await?;
    Ok(())
}

// ---- youtube + tweet shared (!youtube.ts / !tweet.ts) ----

/// Mirrors `username.substring(0, 15)` in !youtube.ts and !tweet.ts.
pub fn truncate_display_name(s: &str) -> String {
    s.chars().take(15).collect()
}

/// Mirrors `Math.floor(Math.random() * (90_000 - 1 + 1)) + 1` in !youtube.ts.
pub fn youtube_likes(now_ms: u64) -> u64 {
    (now_ms % 90_000) + 1
}

/// Mirrors the non-empty comment guard in !youtube.ts / !tweet.ts.
pub fn has_comment(entry: &str) -> bool {
    !entry.trim().is_empty()
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "youtube")]
pub async fn youtube(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    #[description = "Comment"] comment: String,
) -> Result<(), anyhow::Error> {
    if !has_comment(&comment) {
        ctx.say("Please, send a good sentence.").await?;
        return Ok(());
    }
    let name = user
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let display = truncate_display_name(&name);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    // html2png comment-card render pending; text shape ported.
    ctx.say(format!(
        "{display}: {comment} ({} likes, render pending)",
        youtube_likes(now)
    ))
    .await?;
    Ok(())
}

/// Deterministic tweet stats. Mirrors the Math.random ranges in !tweet.ts:
/// likes 1..=90_000, retweets 1..=50_000, replies 1..=10_000, views 1000..=500_000.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TweetStats {
    pub likes: u64,
    pub retweets: u64,
    pub replies: u64,
    pub views: u64,
}

pub fn tweet_stats(now_ms: u64) -> TweetStats {
    TweetStats {
        likes: (now_ms % 90_000) + 1,
        retweets: ((now_ms / 7) % 50_000) + 1,
        replies: ((now_ms / 13) % 10_000) + 1,
        views: ((now_ms / 29) % (500_000 - 1_000 + 1)) + 1_000,
    }
}

/// Mirrors `` `@${username}` `` handle in !tweet.ts.
pub fn tweet_handle(username: &str) -> String {
    format!("@{username}")
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "tweet")]
pub async fn tweet(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    #[description = "Comment"] comment: String,
) -> Result<(), anyhow::Error> {
    if !has_comment(&comment) {
        ctx.say("Please, send a good sentence.").await?;
        return Ok(());
    }
    let name = user
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let display = truncate_display_name(&name);
    let handle = tweet_handle(&ctx.author().name);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    let s = tweet_stats(now);
    // html2png tweet-card render pending; text shape ported.
    ctx.say(format!(
        "{display} {handle}: {comment} ({} likes, {} RTs, {} replies, {} views, render pending)",
        s.likes, s.retweets, s.replies, s.views
    ))
    .await?;
    Ok(())
}

// ---- bubbles (!bubbles.ts: bubbles(url) html2png GIF) ----

/// Mirrors the attachment filename in !bubbles.ts.
pub fn bubbles_output_name() -> &'static str {
    "bubbles.gif"
}

/// Mirrors `client.func.validImageType(contentType)` guard in !bubbles.ts.
pub fn bubbles_valid_content_type(ct: Option<&str>) -> bool {
    matches!(ct, Some(c) if c.starts_with("image/"))
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "bubbles")]
pub async fn bubbles(
    ctx: Ctx<'_>,
    #[description = "Image"] image: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    if !bubbles_valid_content_type(image.content_type.as_deref()) {
        ctx.say("Invalid image type.").await?;
        return Ok(());
    }
    // GIF render (html2png bubbles template) pending; validation shape ported.
    ctx.say(format!(
        "{} (render pending for {})",
        bubbles_output_name(),
        image.url
    ))
    .await?;
    Ok(())
}

#[cfg(test)]
mod fun_extra_tests {
    use super::*;

    #[test]
    fn caracteres_converts_and_passthrough() {
        assert_eq!(convert_font("ab", CARACTERES_BOLD).chars().count(), 2);
        assert!(convert_font("ab", CARACTERES_BOLD).contains('𝗮'));
        assert_eq!(convert_font("a! Z09", CARACTERES_BOLD).chars().count(), 6);
        assert!(convert_font("!", CARACTERES_BOLD).contains('!'));
        assert_eq!(convert_font("ab", "short"), "ab");
    }

    #[test]
    fn caracteres_tables_resolve() {
        assert!(caracteres_table("Bold").is_some());
        assert!(caracteres_table("nope").is_none());
        assert_eq!(caracteres_convert("hi", "Full").unwrap().chars().count(), 2);
        assert!(caracteres_convert("hi", "nope").is_none());
    }

    #[test]
    fn catsay_helpers() {
        assert_eq!(
            catsay_search_url(),
            "https://api.thecatapi.com/v1/images/search?mime_types=jpg,png"
        );
        assert_eq!(truncate_catsay_text(&"a".repeat(100)).chars().count(), 70);
        assert_eq!(truncate_catsay_text("hi"), "hi");
    }

    #[test]
    fn animal_json_parsers() {
        assert_eq!(
            parse_dog_json(r#"{"id":1,"url":"https://x/d.png"}"#).as_deref(),
            Some("https://x/d.png")
        );
        assert_eq!(parse_dog_json("nope"), None);
        assert_eq!(
            parse_cat_json(r#"[{"url":"https://x/c.jpg"}]"#).as_deref(),
            Some("https://x/c.jpg")
        );
        assert_eq!(parse_cat_json("[]"), None);
        assert_eq!(
            catsay_image_url("hi you"),
            "https://cataas.com/cat/says/hi%20you"
        );
    }

    #[test]
    fn transgender_url_encodes_avatar() {
        let u = transgender_url("https://cdn/a b.png");
        assert_eq!(
            u,
            "https://some-random-api.com/canvas/misc/transgender?avatar=https%3A%2F%2Fcdn%2Fa%20b.png"
        );
    }

    #[test]
    fn youtube_helpers() {
        assert_eq!(truncate_display_name(&"a".repeat(20)).chars().count(), 15);
        assert_eq!(youtube_likes(0), 1);
        assert_eq!(youtube_likes(90_000), 1);
        assert!(!has_comment("   "));
        assert!(has_comment("hi"));
    }

    #[test]
    fn tweet_helpers() {
        let s = tweet_stats(0);
        assert_eq!(s.likes, 1);
        assert_eq!(s.views, 1_000);
        assert!((1..=90_000).contains(&tweet_stats(123456).likes));
        assert!((1_000..=500_000).contains(&tweet_stats(123456).views));
        assert_eq!(tweet_handle("bob"), "@bob");
    }

    #[test]
    fn bubbles_helpers() {
        assert_eq!(bubbles_output_name(), "bubbles.gif");
        assert!(bubbles_valid_content_type(Some("image/png")));
        assert!(!bubbles_valid_content_type(Some("text/plain")));
        assert!(!bubbles_valid_content_type(None));
    }
}

// ---- affinity percents (!rate.ts, !gay.ts, !stench.ts) ----

/// Deterministic percentage. Mirrors the TS percent commands.
pub fn affinity_score(seed: u64, salt: u64) -> u64 {
    let mut h = seed.wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(salt);
    h ^= h >> 30;
    h = h.wrapping_mul(0xBF58476D1CE4E5B9);
    h ^= h >> 27;
    h % 101
}

macro_rules! affinity_cmd {
    ($fn_name:ident, $sub:literal, $salt:expr, $label:literal) => {
        #[poise::command(slash_command, prefix_command, category = "fun", rename = $sub)]
        pub async fn $fn_name(
            ctx: Ctx<'_>,
            #[description = "Member"] user: Option<poise::serenity_prelude::User>,
        ) -> Result<(), anyhow::Error> {
            let uid = user
                .as_ref()
                .map(|u| u.id.get())
                .unwrap_or_else(|| ctx.author().id.get());
            ctx.say(format!("{}: {}%", $label, affinity_score(uid, $salt)))
                .await?;
            Ok(())
        }
    };
}

affinity_cmd!(rate, "rate", 7, "Rate");
affinity_cmd!(gay, "gay", 13, "Gay");
affinity_cmd!(stench, "stench", 29, "Stench");

#[cfg(test)]
mod affinity_tests {
    use super::*;

    #[test]
    fn affinity_bounded_deterministic() {
        let a = affinity_score(123, 7);
        assert!(a <= 100);
        assert_eq!(a, affinity_score(123, 7));
        assert!(affinity_score(1, 13) <= 100);
    }
}

// ---- trans (!trans.ts text path via MyMemory) ----

/// Parse MyMemory translation JSON ({"responseData": {"translatedText"}}).
pub fn parse_translation(raw: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(raw)
        .ok()?
        .get("responseData")?
        .get("translatedText")?
        .as_str()
        .map(|s| s.to_string())
}

/// Translate text (MyMemory free API). Mirrors !trans.ts text path
/// (image render pending).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "trans")]
pub async fn trans(
    ctx: Ctx<'_>,
    #[description = "Text"] text: String,
    #[description = "Target lang (e.g. fr, en, ja)"] target: Option<String>,
) -> Result<(), anyhow::Error> {
    let target = target.unwrap_or_else(|| "en".to_string());
    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair=autodetect|{}",
        pct_encode(&text),
        pct_encode(&target)
    );
    let body = match http_client().get(&url).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => String::new(),
    };
    match parse_translation(&body) {
        Some(t) => {
            ctx.say(t).await?;
        }
        None => {
            ctx.say("Translation failed.").await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod trans_tests {
    use super::*;

    #[test]
    fn translation_parses() {
        let raw = r#"{"responseData":{"translatedText":"Bonjour"},"responseStatus":200}"#;
        assert_eq!(parse_translation(raw).as_deref(), Some("Bonjour"));
        assert_eq!(parse_translation("nope"), None);
    }
}

/// Inside joke reply. Mirrors MessageCommands bot @ (grosbg), verbatim.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "grosbg")]
pub async fn grosbg(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    ctx.say("kly ( @hjcbebcbknckehcbckb ) le plus beau").await?;
    Ok(())
}

/// Animal image commands. Mirrors dolphin/duck/fox/frog/panda/squirrel
/// (animality API fetch, same shape as cat/dog).
macro_rules! animal_cmd {
    ($fn_name:ident, $sub:literal, $kind:literal) => {
        #[poise::command(slash_command, prefix_command, category = "fun", rename = $sub)]
        pub async fn $fn_name(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
            let url = format!("https://api.animality.xyz/all/{}", $kind);
            let text = match http_client().get(&url).send().await {
                Ok(r) => r.text().await.unwrap_or_default(),
                Err(_) => String::new(),
            };
            // animality returns a direct image URL (plain text or JSON with url).
            let img = serde_json::from_str::<serde_json::Value>(&text)
                .ok()
                .and_then(|v| v.get("url").and_then(|u| u.as_str()).map(|x| x.to_string()))
                .or_else(|| {
                    let t = text.trim().to_string();
                    if t.starts_with("http") {
                        Some(t)
                    } else {
                        None
                    }
                });
            match img {
                Some(u) => {
                    let embed = poise::serenity_prelude::CreateEmbed::default().image(u);
                    ctx.send(poise::CreateReply::default().embed(embed)).await?;
                }
                None => {
                    ctx.say("Animal API down.").await?;
                }
            }
            Ok(())
        }
    };
}

animal_cmd!(dolphin, "dolphin", "dolphin");
animal_cmd!(duck, "duck", "duck");
animal_cmd!(fox, "fox", "fox");
animal_cmd!(frog, "frog", "frog");
animal_cmd!(panda, "panda", "panda");
animal_cmd!(squirrel, "squirrel", "squirrel");

/// Enable/disable fun commands. Mirrors fun !config.ts (GUILD.FUN.states).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn fun_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.FUN.states",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled { "Fun on." } else { "Fun off." })
        .await?;
    Ok(())
}

/// Fun kill-switch check for the global gate.
pub async fn fun_enabled(pool: &crate::db::Pool, guild_id: Option<u64>) -> bool {
    let Some(gid) = guild_id else {
        return true;
    };
    crate::db::kv_get(pool, &gid.to_string(), "GUILD.FUN.states")
        .await
        .map(|v| v != "0")
        .unwrap_or(true)
}
