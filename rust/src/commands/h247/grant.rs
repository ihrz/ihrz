// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Pure guards for the h247 24/7 voice rejoin + the rank-role
// username-change grant. Mirrors src/Events/h247/voiceState.ts
// (handleH247VoiceStateChange -> ensureH247VoicePresence) and
// src/Events/utils/rankRoleModule_2.ts. No live Discord here;
// the event arms in events_handler.rs do the I/O.

use std::collections::HashMap;

/// H247 24/7 persisted state. Mirrors DatabaseStructure.H247Schema
/// ({enabled, voiceChannelId}) stored at GUILD.H247.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct H247Config {
    pub enabled: bool,
    pub voice_channel_id: u64,
}

/// Parse a GUILD.H247 row. Returns None when disabled-shaped data
/// is missing or malformed (best-effort, never panic).
pub fn parse_h247(raw: &str) -> Option<H247Config> {
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    if v.get("enabled").and_then(|e| e.as_bool()) != Some(true) {
        return None;
    }
    let ch = v.get("voiceChannelId")?.as_str()?.parse::<u64>().ok()?;
    Some(H247Config {
        enabled: true,
        voice_channel_id: ch,
    })
}

/// Break guard. Mirrors voiceState.ts: mute/deafen-only updates keep
/// the channel (no-op), and only the bot's own voice state can break
/// the H24/7 presence.
pub fn h247_voice_broken(
    is_self: bool,
    old_channel: Option<u64>,
    new_channel: Option<u64>,
) -> bool {
    is_self && old_channel != new_channel
}

/// Rejoin target. Mirrors ensureH247VoicePresence: when H24/7 is
/// enabled and the bot is not (or no longer) in the expected channel,
/// rejoin it via a gateway OP4 voice-state update. The voluntary
/// /h247 leave deletes GUILD.H247 first, so parse_h247 is None there
/// and this resolves to a no-op, like the TS handler.
pub fn h247_rejoin_target(cfg: Option<&H247Config>, current_channel: Option<u64>) -> Option<u64> {
    let cfg = cfg?;
    if !cfg.enabled {
        return None;
    }
    if current_channel == Some(cfg.voice_channel_id) {
        return None;
    }
    Some(cfg.voice_channel_id)
}

/// Change gate. Mirrors rankRoleModule_2.ts: only username /
/// globalName changes trigger the grant pass.
pub fn names_changed(
    old_name: Option<&str>,
    old_global: Option<Option<&str>>,
    new_name: &str,
    new_global: Option<&str>,
) -> bool {
    match (old_name, old_global) {
        (Some(o), Some(og)) => *o != *new_name || og != new_global,
        // No old snapshot: enforce the current names.
        _ => true,
    }
}

/// Parse a GUILD.RANK_ROLES.roles row (single role id, plain or
/// JSON-quoted, as written by !setmentionrole.ts).
pub fn parse_role_id(raw: &str) -> Option<u64> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    if let Ok(s) = serde_json::from_str::<String>(t) {
        return s.trim().parse::<u64>().ok();
    }
    t.parse::<u64>().ok()
}

/// Needles from a GUILD.RANK_ROLES.nicknames row: the TS single
/// substring shape, or the map shape (part -> role id) where the
/// keys are the substrings (mirrors the guild_member_update arm).
pub fn rank_needles(raw: &str) -> Vec<String> {
    let t = raw.trim();
    if t.is_empty() {
        return Vec::new();
    }
    if let Ok(map) = serde_json::from_str::<HashMap<String, String>>(t) {
        return map.into_keys().filter(|k| !k.is_empty()).collect();
    }
    if let Ok(s) = serde_json::from_str::<String>(t) {
        if !s.is_empty() {
            return vec![s];
        }
        return Vec::new();
    }
    vec![t.to_string()]
}

/// Match leg. Mirrors TS: username.includes(nicknames) ||
/// globalName?.includes(nicknames).
pub fn username_matches(username: &str, global_name: Option<&str>, needle: &str) -> bool {
    if needle.is_empty() {
        return false;
    }
    username.contains(needle) || global_name.map(|g| g.contains(needle)).unwrap_or(false)
}

/// Grant decision. Mirrors TS: match without the role -> add with
/// "[Rank] Module"; no match with the role -> remove; else no-op.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RankGrant {
    Grant,
    Remove,
    Keep,
}

pub fn grant_decision(has_role: bool, matched: bool) -> RankGrant {
    match (has_role, matched) {
        (false, true) => RankGrant::Grant,
        (true, false) => RankGrant::Remove,
        _ => RankGrant::Keep,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn h247_ignores_mute_deafen_and_others() {
        // Same channel (mute/deafen-only) is a no-op.
        assert!(!h247_voice_broken(true, Some(1), Some(1)));
        // Other members never break the presence.
        assert!(!h247_voice_broken(false, Some(1), None));
        assert!(!h247_voice_broken(false, None, Some(2)));
    }

    #[test]
    fn h247_breaks_on_own_channel_change() {
        // Disconnect, join, and move all break.
        assert!(h247_voice_broken(true, Some(1), None));
        assert!(h247_voice_broken(true, None, Some(2)));
        assert!(h247_voice_broken(true, Some(1), Some(2)));
    }

    #[test]
    fn h247_rejoin_targets_expected_channel() {
        let cfg = H247Config {
            enabled: true,
            voice_channel_id: 7,
        };
        assert_eq!(h247_rejoin_target(Some(&cfg), None), Some(7));
        assert_eq!(h247_rejoin_target(Some(&cfg), Some(9)), Some(7));
        // Already parked: no-op.
        assert_eq!(h247_rejoin_target(Some(&cfg), Some(7)), None);
        // Disabled / missing state: no-op (voluntary leave path).
        assert_eq!(h247_rejoin_target(None, None), None);
        let off = H247Config {
            enabled: false,
            voice_channel_id: 7,
        };
        assert_eq!(h247_rejoin_target(Some(&off), None), None);
    }

    #[test]
    fn h247_parses_ts_row_shape() {
        let cfg = parse_h247(r#"{"enabled":true,"voiceChannelId":"123"}"#);
        assert_eq!(
            cfg,
            Some(H247Config {
                enabled: true,
                voice_channel_id: 123,
            })
        );
        assert_eq!(
            parse_h247(r#"{"enabled":false,"voiceChannelId":"123"}"#),
            None
        );
        assert_eq!(parse_h247("not json"), None);
        assert_eq!(parse_h247(r#"{"enabled":true}"#), None);
    }

    #[test]
    fn rank_gate_only_on_name_change() {
        assert!(names_changed(Some("a"), Some(Some("g")), "b", Some("g")));
        assert!(names_changed(Some("a"), Some(Some("g")), "a", Some("h")));
        assert!(!names_changed(Some("a"), Some(Some("g")), "a", Some("g")));
        assert!(!names_changed(Some("a"), Some(None), "a", None));
        assert!(names_changed(None, None, "a", None));
    }

    #[test]
    fn rank_grant_mapping_mirrors_ts() {
        // username hit -> grant.
        assert!(username_matches("pro-ihorizon", None, "ihorizon"));
        // globalName hit -> grant.
        assert!(username_matches(
            "plain",
            Some("my ihorizon tag"),
            "ihorizon"
        ));
        // no hit anywhere -> remove path.
        assert!(!username_matches("plain", Some("other"), "ihorizon"));
        assert!(!username_matches("plain", None, "ihorizon"));
        // Empty needle never matches (avoids mass-grant).
        assert!(!username_matches("anyone", None, ""));

        assert_eq!(grant_decision(false, true), RankGrant::Grant);
        assert_eq!(grant_decision(true, false), RankGrant::Remove);
        assert_eq!(grant_decision(true, true), RankGrant::Keep);
        assert_eq!(grant_decision(false, false), RankGrant::Keep);
    }

    #[test]
    fn rank_rows_parse_both_shapes() {
        assert_eq!(parse_role_id("123"), Some(123));
        assert_eq!(parse_role_id("\"123\""), Some(123));
        assert_eq!(parse_role_id("nope"), None);
        // TS single-substring shape.
        assert_eq!(rank_needles("ihorizon"), vec!["ihorizon".to_string()]);
        assert_eq!(rank_needles("\"ihorizon\""), vec!["ihorizon".to_string()]);
        // Map shape: keys are the substrings.
        let mut needles = rank_needles(r#"{"ihrz":"999"}"#);
        needles.sort();
        assert_eq!(needles, vec!["ihrz".to_string()]);
        assert!(rank_needles("").is_empty());
    }
}
