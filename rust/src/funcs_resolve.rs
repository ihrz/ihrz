// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Prefix-argument resolver battery. Mirrors src/core/functions/method.ts
// user()/member()/voiceChannel()/channel()/role()/string()/longString()/
// number() as pure offline predicates over plain snapshots (no discord.js).
//
// Priority order per resolver matches TS exactly:
// - user: parsed-mention[index] -> <@id> fetch -> numeric id -> exact username
// - member: <@id> cache -> numeric id cache -> exact username
// - channel: exact name -> mention[index] -> numeric id
// - role: mention[index] -> id -> exact name
// - voiceChannel: numeric id (voice types only) -> fuzzy name (>= 0.6)
// Callers pass the already-filtered mention list (bot-prefix filtering
// happens at the Discord call site, see method.ts user()).
//
// DECISION (poise-parser, P5-RESOLVER-WIRING): poise stays the prefix
// parser; this battery is NOT wired into dispatch (bot.rs
// prefix_options). Verified against poise 0.6.2 + serenity 0.12.5
// sources: full User/Member/Channel/Role prefix params parse via
// serenity::ArgumentConvert::convert on the single word popped at that
// parameter's own position (poise prefix_argument/argument_trait.rs
// blanket impl, _parse_prefix in macros.rs), and poise strips the
// `<@bot>` mention prefix from the content before arg splitting
// (dispatch/prefix.rs), so the bot mention never enters the arg stream
// and feed_user_mentions filtering is equivalent-by-construction there.
// For well-formed invocations (a mention, if any, sits at its own arg
// slot) that agrees with the TS legs below; pinned by the
// prefix_parity_* tests. The leftover TS quirks are bugs, not parity
// targets: user() returns parsedUsers[argsNumber] even when
// arg[argsNumber] is not that mention (wrong user), and null when the
// index is out of range even if the arg text is a valid id/username the
// later legs would resolve; member() is guild-cache-only while serenity
// falls back to HTTP search_members (superset); name lookups are exact
// (`===`) in TS but case-insensitive in serenity (superset);
// channel() tries exact name before mention while serenity tries
// id/mention first (observable only on name/id collisions). Wiring the
// battery into dispatch would need live snapshots (ordered mention
// lists, member/channel/role caches) assembled in the dispatch path and
// would CHANGE prefix behavior; it stays out until a live-parser
// divergence is proven with a failing test first. The battery remains
// available for call sites needing TS-exact offline resolution (e.g.
// the voiceChannel fuzzy leg, which ArgumentConvert cannot do).

/// True when the arg is a non-blank number. Mirrors isNumber()
/// (`!isNaN(Number(str)) && str.trim() !== ""`) exactly: JS `Number`
/// accepts unsigned hex/binary/octal literals (`0x11`, `0b101`, `0o17`
/// — signed forms like `-0x10` are NaN), the exact-case words
/// `Infinity`/`+Infinity`/`-Infinity` (lowercase `infinity`/`inf` and
/// any `NaN` casing are NaN), and decimal/exponent forms (node ground
/// truth: `"1_2"`/`"1e"`/`"e5"`/`"0x1g"`/`"--5"` all false, `"5."`/`
/// ".5"`/`"+.5e-3"`/`"5.e3"` true). Rust `f64::from_str` instead
/// rejects hex/bin/oct (false negatives) and accepts `inf`/`NaN` in
/// any case (false positives), so the grammar is scanned by hand.
pub fn is_number(s: &str) -> bool {
    // JS String trim also strips a BOM; Rust trim does not.
    let t = s.trim().trim_matches('\u{FEFF}');
    if t.is_empty() {
        return false;
    }
    if t == "Infinity" || t == "+Infinity" || t == "-Infinity" {
        return true;
    }
    let b = t.as_bytes();
    // Unsigned radix literals only: a leading sign makes them NaN.
    if b.len() > 2 && b[0] == b'0' {
        let (digits, ok): (&[u8], fn(u8) -> bool) = match b[1] {
            b'x' | b'X' => (&b[2..], |c: u8| c.is_ascii_hexdigit()),
            b'b' | b'B' => (&b[2..], |c: u8| c == b'0' || c == b'1'),
            b'o' | b'O' => (&b[2..], |c: u8| (b'0'..=b'7').contains(&c)),
            _ => (&[], |_| false),
        };
        if b[1] == b'x'
            || b[1] == b'X'
            || b[1] == b'b'
            || b[1] == b'B'
            || b[1] == b'o'
            || b[1] == b'O'
        {
            return !digits.is_empty() && digits.iter().all(|c| ok(*c));
        }
    }
    is_js_decimal(t)
}

/// JS decimal NumericLiteral scan (digits with optional fraction and
/// optional exponent), full-string match.
fn is_js_decimal(t: &str) -> bool {
    let b = t.as_bytes();
    let mut i = 0;
    if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
        i += 1;
    }
    let mut digits = 0;
    while i < b.len() && b[i].is_ascii_digit() {
        digits += 1;
        i += 1;
    }
    let mut frac = 0;
    if i < b.len() && b[i] == b'.' {
        i += 1;
        while i < b.len() && b[i].is_ascii_digit() {
            frac += 1;
            i += 1;
        }
    }
    if digits + frac == 0 {
        return false;
    }
    if i < b.len() && (b[i] == b'e' || b[i] == b'E') {
        i += 1;
        if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
            i += 1;
        }
        let mut exp = 0;
        while i < b.len() && b[i].is_ascii_digit() {
            exp += 1;
            i += 1;
        }
        if exp == 0 {
            return false;
        }
    }
    i == b.len()
}

/// True when the arg contains any mention-sigil char. Mirrors
/// method.ts user()/member() `/[<@!>]/g.test(arg)`: a bare `@`, `!`
/// or `>` with no `<...>` wrapper still takes the mention-strip
/// path (node: `"!111"`, `"@bob"`, `"a>b"` all test true).
fn looks_like_user_mention(s: &str) -> bool {
    s.chars().any(|c| matches!(c, '<' | '@' | '!' | '>'))
}

/// Strip mention formatting, e.g. "<@123>" / "<@!123>" -> "123".
pub fn strip_user_mention(s: &str) -> String {
    s.chars()
        .filter(|c| !matches!(c, '<' | '>' | '@' | '!'))
        .collect()
}

/// Strip channel mention formatting, e.g. "<#123>" -> "123".
pub fn strip_channel_mention(s: &str) -> String {
    s.chars()
        .filter(|c| !matches!(c, '<' | '>' | '#'))
        .collect()
}

/// Strip role mention formatting, e.g. "<@&123>" -> "123".
pub fn strip_role_mention(s: &str) -> String {
    s.chars()
        .filter(|c| !matches!(c, '<' | '>' | '@' | '&'))
        .collect()
}

fn all_digits(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

/// Minimal directory entry used by the resolvers.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Entry {
    pub id: String,
    pub name: String,
}

impl Entry {
    pub fn new(id: &str, name: &str) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
        }
    }
}

/// Bot-mention prefix filter for the user-mention feed. Mirrors the
/// `prefix_mention` branch in method.ts user(): when the prefix itself
/// is the bot mention, parsedUsers[0] is the bot, so the bot id is
/// dropped before the caller indexes the list (the `mentions` param of
/// resolve_user). Non-mention prefixes pass through untouched. Pure
/// over plain snapshots for offline use.
pub fn feed_user_mentions(
    parsed_users: &[String],
    bot_id: &str,
    is_mention_prefix: bool,
) -> Vec<String> {
    if is_mention_prefix {
        parsed_users
            .iter()
            .filter(|id| id.as_str() != bot_id)
            .cloned()
            .collect()
    } else {
        parsed_users.to_vec()
    }
}

/// Indexed mention feed for the channel/role resolvers. Mirrors
/// `interaction.mentions.channels.map((x) => x)[argsNumber]` and the
/// roles equivalent in method.ts channel()/role(): the caller passes
/// the already-ordered mention id list plus the arg index, and feeds
/// the result as the `mention` param of resolve_channel/resolve_role.
pub fn feed_mention_at(mentions: &[String], index: usize) -> Option<String> {
    mentions.get(index).cloned()
}

/// Resolve a user id from a prefix arg. Mirrors method.ts user().
/// `mentions` is the ordered parsedUsers list already passed through
/// feed_user_mentions (bot-prefix filtering happens there, see
/// method.ts user()); `members` is the guild member cache snapshot
/// (id, username).
pub fn resolve_user(arg: Option<&str>, mentions: &[String], members: &[Entry]) -> Option<String> {
    let arg = arg?;
    if let Some(id) = mentions.first() {
        // TS: parsedUsers non-empty -> mentions path wins unconditionally.
        let _ = arg;
        return Some(id.clone());
    }
    if looks_like_user_mention(arg) {
        let id = strip_user_mention(arg);
        if members.iter().any(|m| m.id == id) {
            return Some(id);
        }
        return None;
    }
    if is_number(arg) && members.iter().any(|m| m.id == arg) {
        return Some(arg.to_string());
    }
    members.iter().find(|m| m.name == arg).map(|m| m.id.clone())
}

/// Resolve a guild member id. Mirrors method.ts member().
pub fn resolve_member(arg: Option<&str>, members: &[Entry]) -> Option<String> {
    let arg = arg?;
    if looks_like_user_mention(arg) {
        let id = strip_user_mention(arg);
        return members.iter().find(|m| m.id == id).map(|m| m.id.clone());
    }
    if is_number(arg) {
        if let Some(m) = members.iter().find(|m| m.id == arg) {
            return Some(m.id.clone());
        }
        return None;
    }
    members.iter().find(|m| m.name == arg).map(|m| m.id.clone())
}

/// Resolve a text channel id. Mirrors method.ts channel().
/// `mention` is mentions.channels[index], if any.
pub fn resolve_channel(
    arg: Option<&str>,
    mention: Option<&str>,
    channels: &[Entry],
) -> Option<String> {
    let arg = arg?;
    if let Some(c) = channels.iter().find(|c| c.name == arg) {
        return Some(c.id.clone());
    }
    if let Some(m) = mention {
        return Some(m.to_string());
    }
    let id = strip_channel_mention(arg);
    if all_digits(&id) {
        return channels.iter().find(|c| c.id == id).map(|c| c.id.clone());
    }
    None
}

/// Resolve a role id. Mirrors method.ts role().
pub fn resolve_role(arg: Option<&str>, mention: Option<&str>, roles: &[Entry]) -> Option<String> {
    let arg = arg?;
    if let Some(m) = mention {
        return Some(m.to_string());
    }
    let entry = strip_role_mention(arg);
    if let Some(r) = roles.iter().find(|r| r.id == entry) {
        return Some(r.id.clone());
    }
    roles.iter().find(|r| r.name == entry).map(|r| r.id.clone())
}

/// Voice channel snapshot (id, name, is_voice_type).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VoiceChannel {
    pub id: String,
    pub name: String,
    pub is_voice: bool,
}

fn levenshtein(a: &str, b: &str) -> usize {
    // TS indexes UTF-16 code units; astral chars count 2.
    let a: Vec<u16> = a.encode_utf16().collect();
    let b: Vec<u16> = b.encode_utf16().collect();
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    let mut cur = vec![0usize; b.len() + 1];
    for i in 1..=a.len() {
        cur[0] = i;
        for j in 1..=b.len() {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            cur[j] = (prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    prev[b.len()]
}

/// Lowercased similarity in [0,1]. Mirrors music_proximity similarity():
/// distance on the lowercased pair, maxLen from the ORIGINALS in UTF-16
/// units (astral chars count 2).
pub fn similarity(a: &str, b: &str) -> f64 {
    let max = a.encode_utf16().count().max(b.encode_utf16().count());
    if max == 0 {
        return 1.0;
    }
    let la = a.to_lowercase();
    let lb = b.to_lowercase();
    1.0 - levenshtein(&la, &lb) as f64 / max as f64
}

/// Resolve a voice channel id. Mirrors method.ts voiceChannel():
/// numeric id (voice types only) first, then fuzzy name (>= 0.6).
pub fn resolve_voice_channel(arg: Option<&str>, channels: &[VoiceChannel]) -> Option<String> {
    let arg = arg?;
    let id = strip_channel_mention(arg);
    if all_digits(&id) {
        if let Some(c) = channels.iter().find(|c| c.id == id && c.is_voice) {
            return Some(c.id.clone());
        }
    }
    channels
        .iter()
        .filter(|c| c.is_voice)
        .find(|c| similarity(arg, &c.name) >= 0.6)
        .map(|c| c.id.clone())
}

/// Raw string arg. Mirrors method.ts string() (`args[n] || null`):
/// a present-but-empty word is falsy in TS, so it yields None.
pub fn resolve_string(args: &[String], index: usize) -> Option<String> {
    args.get(index).filter(|s| !s.is_empty()).cloned()
}

/// Rest-of-line arg. Mirrors method.ts longString().
pub fn resolve_long_string(args: &[String], index: usize) -> Option<String> {
    if index >= args.len() {
        return None;
    }
    let joined = args[index..].join(" ");
    if joined.is_empty() {
        None
    } else {
        Some(joined)
    }
}

/// Parsed int arg, 0 on NaN. Mirrors method.ts number() exactly
/// (`Number.isNaN(parseInt(value)) ? 0 : parseInt(value)`), pinned by a
/// node ground-truth battery (53 cases, W6 slice 25):
/// leading JS-whitespace stripped (incl. NBSP/FEFF), one optional sign,
/// `0x`/`0X` hex leg (needs 1+ hex digits, else NaN like `"0x"`), else
/// the longest ASCII-digit prefix (`"42abc"` -> 42, `"3.9"` -> 3,
/// `"1e3"` -> 1, `"0b101"` -> 0, `".5"`/`"Infinity"`/empty -> NaN -> 0).
/// Decimal magnitudes use correctly-rounded `f64` parsing, so huge
/// inputs agree bit-for-bit (`"99999999999999999999"` -> 1e20,
/// `"9007199254740993"` -> 9007199254740992); the sign survives zero
/// (`"-0"` -> -0.0, and `"-000"` too). Missing args are `undefined` in
/// TS (`parseInt(undefined)` is NaN), hence 0.0.
/// Returns `f64` because parseInt returns a JS number (magnitudes past
/// `i64::MAX` stay finite, e.g. 1e20).
pub fn resolve_number(args: &[String], index: usize) -> f64 {
    args.get(index).map(|s| parse_int_ts(s)).unwrap_or(0.0)
}

/// `parseInt(s)` without radix, returning 0.0 for NaN (the
/// `Number.isNaN(...) ? 0 : ...` wrapper in `number()`).
fn parse_int_ts(s: &str) -> f64 {
    let t = s.trim_start_matches(crate::funcs::is_js_whitespace);
    let (neg, rest) = match t.strip_prefix(['+', '-']) {
        Some(r) => (t.starts_with('-'), r),
        None => (false, t),
    };
    let digits = rest.as_bytes();
    let value =
        if digits.len() >= 2 && digits[0] == b'0' && (digits[1] == b'x' || digits[1] == b'X') {
            // Hex leg: longest [0-9a-fA-F] run after the prefix.
            let len = digits[2..]
                .iter()
                .take_while(|b| b.is_ascii_hexdigit())
                .count();
            if len == 0 {
                return 0.0;
            }
            let hex = &rest[2..2 + len];
            if len <= 32 {
                // Fits u128 exactly; `as f64` rounds to nearest-even, the
                // same value JS ToNumber yields for the exact integer.
                u128::from_str_radix(hex, 16)
                    .map(|v| v as f64)
                    .unwrap_or(0.0)
            } else {
                // Absurd widths (>2^128): exact single-rounding conversion
                // (like JS ToNumber on the exact integer). The old iterative
                // `v * 16 + d` fold drifted ~1 ulp on rounding-boundary
                // inputs (node ground truth: 24,544/237,372
                // boundary-targeted cases diverge, e.g.
                // `0x4bb9092a4bba020000000000000000001` folded to
                // 1.61044576792645e+39 vs exact 1.6104457679264503e+39).
                hex_wide_to_f64(hex)
            }
        } else {
            // Decimal leg: longest [0-9] run.
            let len = digits.iter().take_while(|b| b.is_ascii_digit()).count();
            if len == 0 {
                return 0.0;
            }
            // Correctly-rounded decimal parse == JS ToNumber of the exact
            // integer (both round-to-nearest-even; huge widths yield inf).
            rest[..len].parse::<f64>().unwrap_or(0.0)
        };
    if neg {
        -value
    } else {
        value
    }
}

/// Exact `f64` value of a long ASCII-hex digit run: the exact integer
/// rounded once to nearest-even, exactly what JS `ToNumber` yields.
/// `hex` holds only `[0-9a-fA-F]` (guaranteed by the caller's
/// `take_while`). Leading zeros shrink the significant width, so
/// zero-padded-short values stay exact; magnitudes past `f64::MAX`
/// yield Infinity like JS.
fn hex_wide_to_f64(hex: &str) -> f64 {
    let d = hex.as_bytes();
    let mut i = 0;
    while i < d.len() && d[i] == b'0' {
        i += 1;
    }
    let sig = &d[i..];
    if sig.is_empty() {
        return 0.0;
    }
    let val = |b: u8| -> u32 { (b as char).to_digit(16).unwrap_or(0) };
    let first_bits = 32 - val(sig[0]).leading_zeros();
    let total_bits = first_bits as usize + 4 * (sig.len() - 1);
    if total_bits <= 53 {
        let mut v: u64 = 0;
        for &b in sig {
            v = v * 16 + val(b) as u64;
        }
        return v as f64;
    }
    // First 53 significant bits, then the round bit + sticky tail.
    let mut m: u64 = 0;
    let mut taken = 0usize;
    let mut round = false;
    let mut sticky = false;
    for (idx, &b) in sig.iter().enumerate() {
        let nv = val(b);
        let width = if idx == 0 { first_bits } else { 4 };
        for k in (0..width).rev() {
            let bit = (nv >> k) & 1 == 1;
            if taken < 53 {
                m = (m << 1) | u64::from(bit);
                taken += 1;
            } else if taken == 53 {
                round = bit;
                taken += 1;
            } else {
                sticky |= bit;
            }
        }
    }
    if round && (sticky || m & 1 == 1) {
        m += 1;
    }
    let mut exp = total_bits - 53;
    if m >= 1 << 53 {
        m >>= 1;
        exp += 1;
    }
    // Past ~2^1100 every mantissa overflows: Infinity, like JS.
    if exp > 1100 {
        return f64::INFINITY;
    }
    (m as f64) * 2f64.powi(exp as i32)
}

/// Subtract coins from a member's wallet. Mirrors subCoins in
/// method.ts (`db.sub` on `<guild>.USER.<member>.ECONOMY.money`).
/// Runs through the routed table-first account (load, apply, save)
/// so table and legacy kv readers stay in sync like the other
/// economy leaves. Returns the new wallet balance.
pub async fn sub_coins(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    coins: f64,
) -> anyhow::Result<f64> {
    apply_coins(pool, guild_id, user_id, -coins).await
}

/// Add coins to a member's wallet. Mirrors addCoins in method.ts
/// (`db.add` on the same key). Returns the new wallet balance.
pub async fn add_coins(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    coins: f64,
) -> anyhow::Result<f64> {
    apply_coins(pool, guild_id, user_id, coins).await
}

async fn apply_coins(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    delta: f64,
) -> anyhow::Result<f64> {
    use crate::commands::economy::balance::{load_econ_routed, save_econ_routed};
    let mut account = load_econ_routed(pool, guild_id, user_id).await;
    crate::commands::economy::add_money(&mut account, delta);
    save_econ_routed(pool, guild_id, user_id, &account).await?;
    Ok(account.money)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn members() -> Vec<Entry> {
        vec![Entry::new("111", "alice"), Entry::new("222", "bob")]
    }

    #[test]
    fn user_mention_list_wins_over_arg() {
        // Adversarial: arg names bob but mention list says 999 -> mention wins.
        let out = resolve_user(Some("bob"), &["999".to_string()], &members());
        assert_eq!(out.as_deref(), Some("999"));
    }

    #[test]
    fn similarity_maxlen_uses_original_strings() {
        // TS music_proximity similarity(): maxLen from the ORIGINALS.
        assert_eq!(similarity("İ", "i"), 0.0);
        assert_eq!(similarity("", ""), 1.0);
    }

    #[test]
    fn similarity_matches_ts_utf16_units() {
        // Node ground truth: TS lengths are UTF-16 units, astral = 2.
        assert_eq!(levenshtein("\u{1F600}", "X"), 2);
        assert_eq!(levenshtein("A\u{1F600}", "A"), 2);
        assert!((similarity("\u{1F600}", "\u{1F600}x") - (1.0 - 1.0 / 3.0)).abs() < 1e-12);
        assert!((similarity("A\u{1F600}", "A\u{1F600}x") - 0.75).abs() < 1e-12);
        assert_eq!(similarity("\u{1F600}", "X"), 0.0);
    }

    #[test]
    fn is_number_matches_js_number_grammar() {
        // Pinned via node: !isNaN(Number(s)) && s.trim() !== "".
        for s in [
            "123",
            "12.5",
            "0x11",
            "0Xff",
            "0b101",
            "0o17",
            "Infinity",
            "+Infinity",
            "-Infinity",
            "  12  ",
            "  0x11  ",
            "1e3",
            ".5",
            "5.",
            "5.e3",
            "+.5e-3",
            "  -Infinity  ",
        ] {
            assert!(is_number(s), "{s:?} must be numeric");
        }
        for s in [
            "-0x10", "0b2", "0o9", "infinity", "inf", "NaN", "nan", "", "   ", "12abc", "0b", "0x",
            "1_2", "--5", "0x1g", "1e", "e5", "-", ".", "+", "0d5",
        ] {
            assert!(!is_number(s), "{s:?} must NOT be numeric");
        }
    }

    #[test]
    fn user_mention_pattern_resolves_id() {
        let out = resolve_user(Some("<@111>"), &[], &members());
        assert_eq!(out.as_deref(), Some("111"));
    }

    #[test]
    fn user_unknown_mention_pattern_returns_none_not_fallback() {
        // Adversarial: <@999> must NOT fall through to username matching.
        let out = resolve_user(Some("<@999>"), &[], &members());
        assert_eq!(out, None);
    }

    #[test]
    fn mention_gate_matches_ts_sigil_test() {
        // Pinned via node: /[<@!>]/g.test(s) — any single sigil char
        // takes the strip path, no <...> wrapper required.
        for s in [
            "hello!", "a>b", "@bob", "<alice", "!111", "<#456>", "<@111>", "<@!111>",
        ] {
            assert!(looks_like_user_mention(s), "{s:?} must take the strip path");
        }
        for s in ["plain", "123", "", "a#b", "a&b", "bob"] {
            assert!(
                !looks_like_user_mention(s),
                "{s:?} must NOT take the strip path"
            );
        }
        // member(): bare-"!" id strips to the cached id like TS cache.get.
        assert_eq!(
            resolve_member(Some("!111"), &members()).as_deref(),
            Some("111")
        );
        assert_eq!(
            resolve_user(Some("!111"), &[], &members()).as_deref(),
            Some("111")
        );
        // "@bob" strips to "bob", which is a name not an id -> None
        // (TS cache.get("bob") misses and fetch("bob") fails too).
        assert_eq!(resolve_member(Some("@bob"), &members()), None);
        // string(): "" is falsy -> null in TS (`args[n] || null`).
        assert_eq!(resolve_string(&["".to_string()], 0), None);
    }

    #[test]
    fn user_numeric_id_and_username_fallback() {
        assert_eq!(
            resolve_user(Some("222"), &[], &members()).as_deref(),
            Some("222")
        );
        assert_eq!(
            resolve_user(Some("alice"), &[], &members()).as_deref(),
            Some("111")
        );
        assert_eq!(resolve_user(Some("mallory"), &[], &members()), None);
        assert_eq!(resolve_user(None, &[], &members()), None);
    }

    #[test]
    fn member_fallbacks() {
        assert_eq!(
            resolve_member(Some("<@!222>"), &members()).as_deref(),
            Some("222")
        );
        assert_eq!(
            resolve_member(Some("111"), &members()).as_deref(),
            Some("111")
        );
        // Adversarial: numeric arg with no cache hit must not match username.
        assert_eq!(resolve_member(Some("999"), &members()), None);
        assert_eq!(
            resolve_member(Some("bob"), &members()).as_deref(),
            Some("222")
        );
    }

    #[test]
    fn channel_name_beats_mention_and_id() {
        let chs = vec![Entry::new("10", "general"), Entry::new("20", "random")];
        // Adversarial: exact name wins even when a mention is present.
        let out = resolve_channel(Some("general"), Some("20"), &chs);
        assert_eq!(out.as_deref(), Some("10"));
        // Mention fallback when no name matches.
        let out = resolve_channel(Some("zzz"), Some("20"), &chs);
        assert_eq!(out.as_deref(), Some("20"));
        // ID path with mention formatting.
        let out = resolve_channel(Some("<#20>"), None, &chs);
        assert_eq!(out.as_deref(), Some("20"));
        assert_eq!(resolve_channel(Some("zzz"), None, &chs), None);
    }

    #[test]
    fn role_priority_mention_then_id_then_name() {
        let roles = vec![Entry::new("5", "Mods"), Entry::new("6", "VIP")];
        assert_eq!(
            resolve_role(Some("VIP"), Some("5"), &roles).as_deref(),
            Some("5")
        );
        assert_eq!(
            resolve_role(Some("<@&6>"), None, &roles).as_deref(),
            Some("6")
        );
        assert_eq!(
            resolve_role(Some("Mods"), None, &roles).as_deref(),
            Some("5")
        );
        assert_eq!(resolve_role(Some("Nobody"), None, &roles), None);
    }

    #[test]
    fn voice_id_must_be_voice_type_fuzzy_fallback() {
        let chs = vec![
            VoiceChannel {
                id: "1".into(),
                name: "Lobby".into(),
                is_voice: true,
            },
            VoiceChannel {
                id: "2".into(),
                name: "general".into(),
                is_voice: false,
            },
        ];
        // Adversarial: numeric id of a TEXT channel must not resolve.
        assert_eq!(resolve_voice_channel(Some("2"), &chs), None);
        assert_eq!(resolve_voice_channel(Some("1"), &chs).as_deref(), Some("1"));
        // Fuzzy name match.
        assert_eq!(
            resolve_voice_channel(Some("lobby"), &chs).as_deref(),
            Some("1")
        );
        // Fuzzy must not match text channels.
        assert_eq!(resolve_voice_channel(Some("general"), &chs), None);
        assert_eq!(resolve_voice_channel(Some("zzz-nope"), &chs), None);
    }

    #[test]
    fn mention_prefix_feed_drops_bot_id() {
        let parsed = vec!["BOT".to_string(), "111".to_string(), "222".to_string()];
        // Mention prefix: bot id filtered out before indexing.
        assert_eq!(
            feed_user_mentions(&parsed, "BOT", true),
            vec!["111".to_string(), "222".to_string()]
        );
        // Plain prefix: passthrough, bot entry stays.
        assert_eq!(feed_user_mentions(&parsed, "BOT", false), parsed);
        // Adversarial: bot id absent -> unchanged.
        assert_eq!(
            feed_user_mentions(&["111".to_string()], "BOT", true),
            vec!["111".to_string()]
        );
        assert!(feed_user_mentions(&[], "BOT", true).is_empty());
    }

    #[test]
    fn indexed_mention_feed_mirrors_args_number_indexing() {
        let mentions = vec!["10".to_string(), "20".to_string()];
        assert_eq!(feed_mention_at(&mentions, 0).as_deref(), Some("10"));
        assert_eq!(feed_mention_at(&mentions, 1).as_deref(), Some("20"));
        assert_eq!(feed_mention_at(&mentions, 2), None);
    }

    #[test]
    fn string_longstring_falsy_legs_match_ts() {
        // Node ground-truth battery for method.ts string()/longString()
        // (`args[n] || null`, `args.slice(n).join(" ") || null`), W6 slice 97:
        // only "" and out-of-range are falsy ("0"/" " pass through); an
        // all-empty slice joins to spaces (truthy) unless it is empty.
        let s = |v: &[&str], i: usize| {
            resolve_string(&v.iter().map(|x| x.to_string()).collect::<Vec<_>>(), i)
        };
        let l = |v: &[&str], i: usize| {
            resolve_long_string(&v.iter().map(|x| x.to_string()).collect::<Vec<_>>(), i)
        };
        assert_eq!(s(&["a", "42", ""], 2), None);
        assert_eq!(s(&["0"], 0).as_deref(), Some("0"));
        assert_eq!(s(&[" "], 0).as_deref(), Some(" "));
        assert_eq!(s(&[], 0), None);
        assert_eq!(l(&["", ""], 0).as_deref(), Some(" "));
        assert_eq!(l(&["", ""], 1), None);
        assert_eq!(l(&["a", ""], 1), None);
        assert_eq!(l(&["a", "", "b"], 1).as_deref(), Some(" b"));
        assert_eq!(l(&["a", "", "b"], 0).as_deref(), Some("a  b"));
    }

    #[test]
    fn string_number_scalars() {
        let args = vec!["a".to_string(), "42".to_string(), "".to_string()];
        assert_eq!(resolve_string(&args, 0).as_deref(), Some("a"));
        assert_eq!(resolve_string(&args, 9), None);
        assert_eq!(resolve_long_string(&args, 1).as_deref(), Some("42 "));
        assert_eq!(resolve_long_string(&args, 9), None);
        assert_eq!(resolve_number(&args, 1), 42.0);
        assert_eq!(resolve_number(&args, 0), 0.0);
        assert_eq!(resolve_number(&args, 9), 0.0);
    }

    #[test]
    fn number_matches_parse_int_quirks() {
        // Node ground-truth battery for method.ts number()
        // (Number.isNaN(parseInt(v)) ? 0 : parseInt(v)), W6 slice 25.
        let n = |s: &str| resolve_number(&[s.to_string()], 0);
        // Salvage + truncation + hex legs (old strict port gave 0 here).
        assert_eq!(n("42abc"), 42.0);
        assert_eq!(n("12abc34"), 12.0);
        assert_eq!(n("3.9"), 3.0);
        assert_eq!(n("-3.9"), -3.0);
        assert_eq!(n("0x10"), 16.0);
        assert_eq!(n("-0x10"), -16.0);
        assert_eq!(n("+0xF"), 15.0);
        assert_eq!(n("0X1A"), 26.0);
        assert_eq!(n("0x10p"), 16.0);
        assert_eq!(n("  0xF "), 15.0);
        // Bare prefixes and radix lookalikes: the "0" parses, rest stops.
        assert_eq!(n("0x"), 0.0);
        assert_eq!(n("0xg"), 0.0);
        assert_eq!(n("0b101"), 0.0);
        assert_eq!(n("0o17"), 0.0);
        assert_eq!(n("0b"), 0.0);
        // Non-digit starts, exponent tails, separators: NaN -> 0 / stop.
        assert_eq!(n("abc"), 0.0);
        assert_eq!(n("Infinity"), 0.0);
        assert_eq!(n("-Infinity"), 0.0);
        assert_eq!(n(".5"), 0.0);
        assert_eq!(n("+.5"), 0.0);
        assert_eq!(n("1e3"), 1.0);
        assert_eq!(n("1_2"), 1.0);
        assert_eq!(n("10n"), 10.0);
        assert_eq!(n("12 34"), 12.0);
        // Sign without digits, or whitespace after the sign: NaN -> 0.
        assert_eq!(n("- 5"), 0.0);
        assert_eq!(n("--5"), 0.0);
        assert_eq!(n("-+5"), 0.0);
        assert_eq!(n("+"), 0.0);
        // Leading JS-whitespace incl. TAB/LF/NBSP/FEFF is stripped.
        assert_eq!(n("  5 "), 5.0);
        assert_eq!(n("\t-12\n"), -12.0);
        assert_eq!(n(" 42"), 42.0);
        assert_eq!(n("﻿42"), 42.0);
        // f64-range magnitudes agree bit-for-bit (i64::MAX overflowed
        // the old strict port to 0; TS yields finite floats).
        assert_eq!(n("99999999999999999999"), 1e20);
        assert_eq!(n("9007199254740993"), 9007199254740992.0);
        // "-0" keeps its sign like parseInt.
        let neg_zero = n("-0");
        assert!(neg_zero == 0.0 && neg_zero.is_sign_negative());
        // Empty / missing input: parseInt("") and parseInt(undefined)
        // are both NaN -> 0.
        assert_eq!(n(""), 0.0);
        assert_eq!(n(" "), 0.0);
        assert_eq!(resolve_number(&[], 0), 0.0);
    }

    #[test]
    fn giant_hex_matches_js_single_rounding() {
        // Node ground truth for >32-digit hex runs (W6 slice 40): the
        // old iterative fold drifted ~1 ulp on rounding boundaries.
        let n = |s: &str| resolve_number(&[s.to_string()], 0);
        assert_eq!(
            n("0x4bb9092a4bba020000000000000000001"),
            1.6104457679264503e39
        );
        assert_eq!(
            n("0x647549f05c8a020000000000000000001"),
            2.1365087675238353e39
        );
        assert_eq!(
            n("0x22b991f261da01fffffffffffffffffff"),
            7.385165908545207e38
        );
        assert_eq!(
            n("0x22b991f261d9fdfffffffffffffffffff"),
            7.385165908545204e38
        );
        assert_eq!(
            n("0x500b1998afaa020000000000000000001"),
            1.7023339853683738e39
        );
        assert_eq!(
            n(&("0x".to_string() + &"F".repeat(33))),
            5.444517870735016e39
        );
        assert_eq!(
            n(&("0x1".to_string() + &"f".repeat(32))),
            6.80564733841877e38
        );
        assert_eq!(
            n("0x10000000000000000000000000000000000000000"),
            1.461501637330903e48
        );
        assert_eq!(
            n("0x80000000000000000000000000000000000000000"),
            1.1692013098647223e49
        );
        assert_eq!(
            n("0x7ffffffffffffffffffffffffffffffffffffffff"),
            1.1692013098647223e49
        );
        assert_eq!(
            n("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"),
            1.0072043472637575e77
        );
        // Zero-padded-short stays exact; overflow is Infinity like JS.
        assert_eq!(n("0x0000000000000000000000000000000000000000ff"), 255.0);
        assert_eq!(n("0x000000000000000000000000000000000"), 0.0);
        assert_eq!(n("0x"), 0.0);
        assert_eq!(n("0xZZZ"), 0.0);
        assert_eq!(n("0xdeadBEEF"), 3735928559.0);
        let neg = n("-0xffffffffffffffffffffffffffffffffffffffff");
        assert_eq!(neg, -1.461501637330903e48);
        assert!(n(&("0x".to_string() + &"f".repeat(400))).is_infinite());
        assert!(n(&("0x".to_string() + &"0".repeat(400))).eq(&0.0));
    }

    #[test]
    fn prefix_parity_user_aligned_mention_with_bot_prefix() {
        // Well-formed `@bot ban <@111> ...`: poise strips the mention
        // prefix before arg splitting (dispatch/prefix.rs), so the bot
        // id never enters the arg stream; TS instead filters it out of
        // parsedUsers (feed_user_mentions) and indexes [argsNumber].
        // Both must resolve the word at its own slot to the same id.
        let parsed = vec!["BOT".to_string(), "111".to_string()];
        let feed = feed_user_mentions(&parsed, "BOT", true);
        let arg = "<@111>";
        // Positional word names the same id the mention feed carries.
        assert_eq!(strip_user_mention(arg), feed[0]);
        assert_eq!(
            resolve_user(Some(arg), &feed, &members()).as_deref(),
            Some("111")
        );
    }

    #[test]
    fn prefix_parity_role_mention_index() {
        // TS role(): mentions.roles[argsNumber] wins. `!cmd <@&6>` with
        // the role at arg 0 feeds mention index 0; poise parses the same
        // word positionally via ArgumentConvert (id/mention -> name), so
        // aligned invocations agree.
        let roles = vec![Entry::new("5", "Mods"), Entry::new("6", "VIP")];
        let mention = feed_mention_at(&["6".to_string()], 0);
        assert_eq!(
            resolve_role(Some("<@&6>"), mention.as_deref(), &roles).as_deref(),
            Some("6")
        );
        // Two role slots: the second param (argsNumber 1) feeds the
        // second mention, mirroring the TS index.
        let mentions = vec!["5".to_string(), "6".to_string()];
        let mention = feed_mention_at(&mentions, 1);
        assert_eq!(
            resolve_role(Some("<@&6>"), mention.as_deref(), &roles).as_deref(),
            Some("6")
        );
    }

    #[test]
    fn prefix_parity_channel_mention_index() {
        // TS channel(): exact name first, then
        // mentions.channels[argsNumber]. `!cmd <#20>` with no name match
        // feeds mention index 0; poise parses the same word
        // positionally (id/mention -> name).
        let chs = vec![Entry::new("10", "general"), Entry::new("20", "random")];
        let mention = feed_mention_at(&["20".to_string()], 0);
        assert_eq!(
            resolve_channel(Some("<#20>"), mention.as_deref(), &chs).as_deref(),
            Some("20")
        );
        // Second positional slot indexes the second mention (argsNumber).
        let mentions = vec!["10".to_string(), "20".to_string()];
        assert_eq!(feed_mention_at(&mentions, 1).as_deref(), Some("20"));
        assert_eq!(feed_mention_at(&mentions, 2), None);
    }

    #[test]
    fn prefix_parity_positional_scalars() {
        // TS string()/longString()/number() index args by argsNumber;
        // poise pops words positionally. `!cmd 7 hello world` with a
        // number at 0 and a longString at 1 must agree on both legs.
        let args = vec!["7".to_string(), "hello".to_string(), "world".to_string()];
        assert_eq!(resolve_number(&args, 0), 7.0);
        assert_eq!(resolve_string(&args, 1).as_deref(), Some("hello"));
        assert_eq!(
            resolve_long_string(&args, 1).as_deref(),
            Some("hello world")
        );
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn sub_and_add_coins_mirror_method_ts() {
        use crate::commands::economy::balance::load_econ_routed;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY", r#"{"money":100,"bank":0}"#)
            .await
            .unwrap();
        // subCoins subtracts like db.sub (float delta, no truncation).
        assert_eq!(sub_coins(&pool, "g", 1, 30.0).await.unwrap(), 70.0);
        assert_eq!(sub_coins(&pool, "g", 1, 2.9).await.unwrap(), 67.1);
        // addCoins sibling adds on the same key.
        assert_eq!(add_coins(&pool, "g", 1, 3.0).await.unwrap(), 70.1);
        // Unknown users start at 0, like the TS missing-key path.
        assert_eq!(sub_coins(&pool, "g", 9, 5.0).await.unwrap(), -5.0);
        // Routed readers see the same balance (table + legacy in sync).
        assert_eq!(load_econ_routed(&pool, "g", 1).await.money, 70.1);
    }
}
