// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/suggestion/* +
// src/Events/suggestion/onNewMessage.ts.
//
// TS keys: SUGGEST.{channel, disable}, SUGGESTION.<code>
// {author, msgId, threadId} (+ status managed here).

use crate::bot::Ctx;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Suggestion {
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub msg_id: String,
    #[serde(default)]
    pub thread_id: String,
    #[serde(default)]
    pub status: String,
}

pub fn suggestion_key(code: &str) -> String {
    format!("SUGGESTION.{code}")
}

/// 6-char uppercase code. Mirrors TS suggestCode generation.
pub fn gen_suggest_code(seed: u64) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(6);
    for _ in 0..6 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHA[(state % ALPHA.len() as u64) as usize] as char);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn code_is_6_upper_alnum() {
        let c = gen_suggest_code(42);
        assert_eq!(c.len(), 6);
        assert!(c
            .chars()
            .all(|x| x.is_ascii_uppercase() || x.is_ascii_digit()));
        assert_eq!(suggestion_key("ABC"), "SUGGESTION.ABC");
    }
}

pub mod setsuggest;
pub mod suggest;
