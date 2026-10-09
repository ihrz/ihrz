// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/fun/* (sample: !dice, ping).

use crate::bot::Ctx;

// ---- ping network section (bot/ping.ts) ----
// The TS ping embeds gateway latency plus four ICMP probes
// (google/cloudflare/discord/ihorizon) rendered through the
// ping_embed_desc template. Probes run sequentially like the TS awaits;
// a failed probe shows ping_down_msg.

/// Probe targets in template order (_net01.._net04).
pub const PING_PROBE_HOSTS: [&str; 4] = [
    "google.com",
    "cloudflare.com",
    "discord.com",
    "ihorizon.org",
];

/// Label for one probe: first-sample ms or the down message. Mirrors
/// `Number(result.time)` vs the catch-path down message.
pub fn ping_net_label(time_ms: Option<f64>, down_msg: &str) -> String {
    match time_ms {
        Some(t) => {
            if t.fract() == 0.0 {
                format!("{}", t as i64)
            } else {
                format!("{t}")
            }
        }
        None => down_msg.to_string(),
    }
}

/// Mean over successful probes. Delta vs TS (documented): the TS
/// average divides parseInt sums by 4, so one down host renders NaN;
/// here only successful probes count (identical when all are up).
pub fn ping_average_ms(times_ms: &[Option<f64>]) -> Option<f64> {
    let ups: Vec<f64> = times_ms.iter().filter_map(|t| *t).collect();
    if ups.is_empty() {
        return None;
    }
    Some(ups.iter().sum::<f64>() / ups.len() as f64)
}

/// Fill the ping_embed_desc template. Mirrors the exact TS replace
/// mix: username/Crown/_net01-03 are replace-ALL, _net04/ws/Pointer/
/// average replace FIRST occurrence only.
#[allow(clippy::too_many_arguments)]
pub fn render_ping_desc(
    template: &str,
    username: &str,
    crown: &str,
    pointer: &str,
    nets: &[String; 4],
    ws_ms: u128,
    average_ms: Option<f64>,
) -> String {
    let avg = average_ms.map(|a| {
        if a.fract() == 0.0 {
            format!("{}", a as i64)
        } else {
            format!("{a}")
        }
    });
    let out = template
        .replace("${interaction.client.user.username}", username)
        .replace("${_net03}", &nets[2])
        .replace("${_net02}", &nets[1])
        .replace("${_net01}", &nets[0])
        .replace("${client.iHorizon_Emojis.Crown}", crown);
    let out = out.replacen("${_net04}", &nets[3], 1);
    let out = out.replacen("${client.ws.ping}", &ws_ms.to_string(), 1);
    let out = out.replacen("${client.iHorizon_Emojis.Pointer}", pointer, 1);
    match avg {
        Some(a) => out.replacen("${averagePing}", &a, 1),
        None => out.replacen("${averagePing}", "NaN", 1),
    }
}

/// Roll `count` dice with `faces` faces (1-based each).
/// Pure helper behind the dice command.
pub fn roll_dice_set(count: usize, faces: u32) -> Vec<u32> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..count)
        .map(|_| rng.gen_range(1..=faces.max(2)))
        .collect()
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

// ---- hug/kiss/slap asset GIFs ----
// Mirrors !hug.ts/!kiss.ts/!slap.ts: fun kill-switch, random asset GIF
// picked via the length.json counts (assetsCalc boot fetch), reachability
// check (axios.get().then), coloured embed with filled title + image +
// timestamp, fun_var_down_api when the fetch fails.

/// length.json location. Mirrors the assetsCalc fetch URL.
pub const ASSET_LENGTHS_URL: &str =
    "https://gitlab.com/ihrz/assets/-/raw/main/length.json?ref_type=heads";

/// Parse length.json into counts. Mirrors assetsCalc
/// (JSON.parse into the Assets map; unparsable entries are skipped).
pub fn parse_asset_counts(raw: &str) -> std::collections::HashMap<String, u64> {
    serde_json::from_str::<serde_json::Value>(raw)
        .ok()
        .and_then(|v| {
            v.as_object().map(|m| {
                m.iter()
                    .filter_map(|(k, v)| v.as_u64().map(|n| (k.clone(), n)))
                    .collect()
            })
        })
        .unwrap_or_default()
}

/// Boot-time counts, fetched once and cached. Mirrors client.assets.
async fn asset_counts() -> std::collections::HashMap<String, u64> {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static CACHE: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
    let cache = CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    let hit = cache.lock().unwrap_or_else(|e| e.into_inner()).clone();
    if !hit.is_empty() {
        return hit;
    }
    let fetched: HashMap<String, u64> =
        match reqwest::Client::new().get(ASSET_LENGTHS_URL).send().await {
            Ok(resp) => match resp.text().await {
                Ok(text) => parse_asset_counts(&text),
                Err(_) => HashMap::new(),
            },
            Err(_) => HashMap::new(),
        };
    if !fetched.is_empty() {
        *cache.lock().unwrap_or_else(|e| e.into_inner()) = fetched.clone();
    }
    fetched
}

/// Description fill for the social embeds. Mirrors the /g replaces of
/// `${interaction.user.id}` and the per-command `${<target>.id}` token.
pub fn social_embed_desc(
    template: &str,
    author_id: u64,
    target_token: &str,
    target_id: u64,
) -> String {
    template
        .replace("${interaction.user.id}", &author_id.to_string())
        .replace(target_token, &target_id.to_string())
}

async fn social_gif(
    ctx: &Ctx<'_>,
    target: &poise::serenity_prelude::User,
    kind: &str,
    title_key: &str,
    title_fallback: &str,
    colour: u32,
    target_token: &str,
) -> Result<(), anyhow::Error> {
    if fun_guard(ctx).await {
        return Ok(());
    }
    let counts = asset_counts().await;
    let url =
        crate::funcs::assets_url(kind, counts.get(kind).copied().unwrap_or(0), rand::random());
    let reachable = if url.is_empty() {
        false
    } else {
        reqwest::Client::new()
            .get(&url)
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    };
    if !reachable {
        ctx.say(
            crate::commands::lang_for(
                ctx,
                "fun_var_down_api",
                "Error: Seems like the API is down!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let desc = social_embed_desc(
        &crate::commands::lang_for(ctx, title_key, title_fallback).await,
        ctx.author().id.get(),
        target_token,
        target.id.get(),
    );
    ctx.send(
        poise::CreateReply::default().embed(
            poise::serenity_prelude::CreateEmbed::default()
                .colour(colour)
                .description(desc)
                .image(url)
                .timestamp(poise::serenity_prelude::Timestamp::now()),
        ),
    )
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ping_labels_average_and_template_match_ts() {
        // Probe labels: first-sample ms or the down message.
        assert_eq!(ping_net_label(Some(12.0), "**DOWN**"), "12");
        assert_eq!(ping_net_label(Some(12.3), "**DOWN**"), "12.3");
        assert_eq!(ping_net_label(None, "**DOWN**"), "**DOWN**");
        // Average over successful probes (documented NaN delta).
        assert_eq!(
            ping_average_ms(&[Some(10.0), Some(20.0), None, Some(30.0)]),
            Some(20.0)
        );
        assert_eq!(ping_average_ms(&[None, None]), None);
        // Template fill mirrors the TS replace/replaceAll mix.
        let nets = [
            "1".to_string(),
            "2".to_string(),
            "3".to_string(),
            "4".to_string(),
        ];
        let out = render_ping_desc(
            "U=${interaction.client.user.username} ${_net03}/${_net03} ${_net02} ${_net01} C=${client.iHorizon_Emojis.Crown} N4=${_net04}/${_net04} W=${client.ws.ping} P=${client.iHorizon_Emojis.Pointer}/${client.iHorizon_Emojis.Pointer} A=${averagePing}/${averagePing}",
            "Bot",
            "<:Crown:1>",
            "<:Pointer:2>",
            &nets,
            50,
            Some(2.5),
        );
        assert_eq!(
            out,
            "U=Bot 3/3 2 1 C=<:Crown:1> N4=4/${_net04} W=50 P=<:Pointer:2>/${client.iHorizon_Emojis.Pointer} A=2.5/${averagePing}"
        );
        // All probes down renders the NaN average like the TS math.
        let downs = render_ping_desc("A=${averagePing}", "B", "", "", &nets, 0, None);
        assert_eq!(downs, "A=NaN");
    }

    #[test]
    fn social_gif_parts_match_ts() {
        // length.json parse skips non-number entries.
        let counts = parse_asset_counts(r#"{"hug": 12, "kiss": "x", "slap": 3}"#);
        assert_eq!(counts.get("hug"), Some(&12));
        assert_eq!(counts.get("slap"), Some(&3));
        assert!(!counts.contains_key("kiss"));
        assert!(parse_asset_counts("not json").is_empty());
        // Description fills mirror the /g token replaces.
        assert_eq!(
            social_embed_desc(
                "<@${interaction.user.id}> gives a hug to <@${hug.id}>",
                1,
                "${hug.id}",
                2
            ),
            "<@1> gives a hug to <@2>"
        );
        assert_eq!(
            social_embed_desc(
                "<@${interaction.user.id}> slaps <@${slap.id}> x${slap.id}",
                7,
                "${slap.id}",
                9
            ),
            "<@7> slaps <@9> x9"
        );
    }

    #[test]
    fn roll_dice_set_respects_count_and_range() {
        let rolls = super::roll_dice_set(5, 6);
        assert_eq!(rolls.len(), 5);
        for r in rolls {
            assert!((1..=6).contains(&r));
        }
        let one = super::roll_dice_set(1, 2);
        assert_eq!(one.len(), 1);
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

// ---- bubbles (!bubbles.ts: bubbles(url) html2png GIF) ----

/// Mirrors the attachment filename in !bubbles.ts.
pub fn bubbles_output_name() -> &'static str {
    "bubbles.gif"
}

/// Mirrors `client.func.validImageType(contentType)` guard in !bubbles.ts.
pub fn bubbles_valid_content_type(ct: Option<&str>) -> bool {
    matches!(ct, Some(c) if c.starts_with("image/"))
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

/// Fun kill-switch check for the global gate.
/// Mirrors the `GUILD.FUN.states === "off"` guards (!config.ts stores
/// "on"/"off"; legacy "0" still counts as off).
pub async fn fun_enabled(pool: &crate::db::Pool, guild_id: Option<u64>) -> bool {
    let Some(gid) = guild_id else {
        return true;
    };
    crate::db::kv_get(pool, &gid.to_string(), "GUILD.FUN.states")
        .await
        .map(|v| v != "off" && v != "0")
        .unwrap_or(true)
}

/// Random embed colour. Mirrors `.setColor("Random")`.
pub fn random_colour() -> poise::serenity_prelude::Colour {
    use rand::Rng;
    poise::serenity_prelude::Colour::from(rand::thread_rng().gen_range(0..=0xFFFFFF_u32) as u32)
}

/// Deny reply when the fun category is off.
/// Mirrors the `fun_category_disable` guards.
pub async fn fun_guard(ctx: &Ctx<'_>) -> bool {
    if fun_enabled(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await {
        return false;
    }
    ctx.say(
        crate::commands::lang_for(
            ctx,
            "fun_category_disable",
            "Fun commands are disabled in this server.",
        )
        .await,
    )
    .await
    .ok();
    true
}

/// Fetch one image URL field from a JSON HTTP API.
/// Shared by the animal picture commands.
pub async fn fetch_json_image(url: &str, field: &str) -> Option<String> {
    let text = http_client()
        .get(url)
        .send()
        .await
        .ok()?
        .text()
        .await
        .ok()?;
    serde_json::from_str::<serde_json::Value>(&text)
        .ok()?
        .get(field)?
        .as_str()
        .map(|s| s.to_string())
}

/// Send an animal picture embed. Mirrors the animality/random-d.uk
/// commands (!duck/!dolphin/!fox/!frog/!panda/!squirrel.ts).
pub async fn animal_pic(
    ctx: &Ctx<'_>,
    api_url: &str,
    field: &str,
    title_key: &str,
    fallback_title: &str,
) -> Result<(), anyhow::Error> {
    if fun_guard(ctx).await {
        return Ok(());
    }
    match fetch_json_image(api_url, field).await {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default()
                .image(u)
                .title(crate::commands::lang_for(ctx, title_key, fallback_title).await)
                .timestamp(poise::serenity_prelude::Timestamp::now());
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "fun_var_down_api")
                    .unwrap_or_else(|| "Image API down.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// Shared percent-of-a-user reply. Mirrors !gay.ts / !stench.ts
/// (random 0..100, `${user}` + `${random}` replacements).
pub async fn percent_user(
    ctx: &Ctx<'_>,
    user: Option<poise::serenity_prelude::User>,
    lang_key: &str,
    fallback: &str,
) -> Result<(), anyhow::Error> {
    use rand::Rng;
    let u = user.as_ref().unwrap_or_else(|| ctx.author());
    let random: u32 = rand::thread_rng().gen_range(0..100);
    ctx.say(
        crate::commands::lang_for(ctx, lang_key, fallback)
            .await
            .replace("${user}", &format!("<@{}>", u.id.get()))
            .replace("${random}", &random.to_string()),
    )
    .await?;
    Ok(())
}

pub mod animals;
pub mod games;
pub mod media;
pub mod misc;
pub mod social;
