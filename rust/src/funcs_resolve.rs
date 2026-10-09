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

/// True when the arg is a non-blank number. Mirrors isNumber().
pub fn is_number(s: &str) -> bool {
    let t = s.trim();
    !t.is_empty() && t.parse::<f64>().is_ok()
}

/// True when the arg contains mention brackets. Mirrors /[<@!>]/ test.
fn looks_like_user_mention(s: &str) -> bool {
    s.contains('<') && (s.contains('@') || s.contains('!'))
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
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
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

/// Lowercased similarity in [0,1]. Mirrors music_proximity similarity().
pub fn similarity(a: &str, b: &str) -> f64 {
    let la = a.to_lowercase();
    let lb = b.to_lowercase();
    let max = la.chars().count().max(lb.chars().count());
    if max == 0 {
        return 1.0;
    }
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

/// Raw string arg. Mirrors method.ts string().
pub fn resolve_string(args: &[String], index: usize) -> Option<String> {
    args.get(index).cloned()
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

/// Parsed int arg, 0 on NaN. Mirrors method.ts number()
/// (`Number.isNaN(parseInt(value)) ? 0 : parseInt(value)`).
///
/// DECISION (number-coercion): TS parseInt is lenient — parseInt("42abc")
/// is 42, parseInt("3.9") is 3, parseInt("0x10") is 16 — while this port
/// uses a strict whole-string i64 parse (anything non-canonical -> 0).
/// Strict is deliberate: prefix args arrive pre-split on whitespace, so
/// trailing garbage ("42abc") is user error, not a numeric prefix worth
/// salvaging, and hex/float truncation would surprise per-command range
/// checks. Canonical ints ("42", "-7") agree with TS exactly; only the
/// garbage cases differ, and both sides yield 0 for missing/empty input.
pub fn resolve_number(args: &[String], index: usize) -> i64 {
    args.get(index)
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0)
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
    fn string_number_scalars() {
        let args = vec!["a".to_string(), "42".to_string(), "".to_string()];
        assert_eq!(resolve_string(&args, 0).as_deref(), Some("a"));
        assert_eq!(resolve_string(&args, 9), None);
        assert_eq!(resolve_long_string(&args, 1).as_deref(), Some("42 "));
        assert_eq!(resolve_long_string(&args, 9), None);
        assert_eq!(resolve_number(&args, 1), 42);
        assert_eq!(resolve_number(&args, 0), 0);
        assert_eq!(resolve_number(&args, 9), 0);
    }

    #[test]
    fn number_coercion_is_strict_unlike_parse_int() {
        // DECISION record (see resolve_number docs): TS parseInt would
        // salvage 42 from "42abc" and 3 from "3.9"; the port yields 0.
        let args = vec!["42abc".to_string(), "3.9".to_string(), "0x10".to_string()];
        assert_eq!(resolve_number(&args, 0), 0);
        assert_eq!(resolve_number(&args, 1), 0);
        assert_eq!(resolve_number(&args, 2), 0);
    }
}
