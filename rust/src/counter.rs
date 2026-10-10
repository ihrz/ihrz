// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Counting-room game. Mirrors src/Events/counter/onNewMessage.ts:
// a message only counts when its number equals the last amount + 1
// (from a different user); anything else leaves the count to reset.
//
// NOTE: the live stream-notifier surface lives in commands/notifier/*
// + scheduler.rs; this module is the counter game only.

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
