// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Stream + article notifiers. Mirrors src/core/StreamNotifier.ts
// (Twitch/YouTube/Kick poll every 120s) + Blogger.ts (rss-parser every
// 60s) dedup logic: only announce when the latest id differs from the
// stored one. HTTP polling wiring is pending; dedup + embed shaping here.
//
// Note: the live announce gate is scheduler::pending_notifier_media
// (row match on user + media id / timestamp); the trivial
// last-vs-latest string helper that used to live here was deleted as
// dead code — no caller used it.

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
    fn counter_strict_increment() {
        assert!(counter_valid(41, 42));
        assert!(!counter_valid(41, 43));
        assert!(!counter_valid(41, 41));
        assert_eq!(counter_expected(41), 42);
    }
}
