// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Stream + article notifiers. Mirrors src/core/StreamNotifier.ts
// (Twitch/YouTube/Kick poll every 120s) + Blogger.ts (rss-parser every
// 60s) dedup logic: only announce when the latest id differs from the
// stored one. HTTP polling wiring is pending; dedup + embed shaping here.

/// Returns the id to announce, if it differs from the stored one.
pub fn pending_announce(last_notified: Option<&str>, latest: &str) -> Option<String> {
    if latest.is_empty() {
        return None;
    }
    match last_notified {
        Some(last) if last == latest => None,
        _ => Some(latest.to_string()),
    }
}

/// Strict counter check. Mirrors Events/counter/onNewMessage.ts: the
/// message must equal last+1, else the counter resets.
pub fn counter_expected(last: i64) -> i64 {
    last + 1
}

pub fn counter_valid(last: i64, got: i64) -> bool {
    got == counter_expected(last)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedup_announces_only_new() {
        assert_eq!(pending_announce(None, "v12"), Some("v12".into()));
        assert_eq!(pending_announce(Some("v11"), "v12"), Some("v12".into()));
        assert_eq!(pending_announce(Some("v12"), "v12"), None);
        assert_eq!(pending_announce(Some("v12"), ""), None);
    }

    #[test]
    fn counter_strict_increment() {
        assert!(counter_valid(41, 42));
        assert!(!counter_valid(41, 43));
        assert!(!counter_valid(41, 41));
        assert_eq!(counter_expected(41), 42);
    }
}
