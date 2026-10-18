/// Nickname kicker config. Mirrors util !nick-kicker.ts
/// (UTILS.NICK_KICKER {enabled, words[]}): a member trips when any
/// word appears in the username, the guild display name, or the
/// global display name (TS checks all three: username, displayName,
/// globalName). Case-insensitive substring via full-Unicode
/// `to_lowercase`, like TS `toLowerCase()` (the old ASCII fold missed
/// accented legs writer-reachable in this FR-heavy userbase, e.g.
/// word "café" vs username "CAFÉ", Kelvin "K" vs "k").
/// DELTA (doc-noted, unrepresentable char-wise): Greek final-sigma is
/// context-sensitive in JS (`"ΟΣ".toLowerCase()` ends in U+03C2 `ς`)
/// but context-free in Rust (`to_lowercase` yields U+03C3 `σ`), so a
/// `σ`-word trips "ΟΣ" here while TS stays silent (battery leg
/// `greek-sigma-final` pins the TS side).
pub fn nick_matches(
    words: &[String],
    username: &str,
    display: Option<&str>,
    global_name: Option<&str>,
) -> bool {
    let username = username.to_lowercase();
    let display = display.map(|d| d.to_lowercase());
    let global_name = global_name.map(|g| g.to_lowercase());
    words.iter().any(|w| {
        let w = w.to_lowercase();
        username.contains(&w)
            || display.as_ref().map(|d| d.contains(&w)).unwrap_or(false)
            || global_name
                .as_ref()
                .map(|g| g.contains(&w))
                .unwrap_or(false)
    })
}

/// Nick-kicker enabled gate. Mirrors the TS `baseData?.enabled`
/// truthiness leg exactly (the writer stores real booleans, so this
/// only differs from `as_bool` on manual-DB rows: `"false"`/`1` are
/// truthy in TS). Missing/null/false/0/"" read disabled.
/// JSON has no NaN/undefined.
pub fn nick_kicker_enabled(cfg: &serde_json::Value) -> bool {
    match cfg.get("enabled") {
        None | Some(serde_json::Value::Null) => false,
        Some(serde_json::Value::Bool(b)) => *b,
        Some(serde_json::Value::Number(n)) => n.as_f64().is_some_and(|f| f != 0.0),
        Some(serde_json::Value::String(s)) => !s.is_empty(),
        Some(_) => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nick_kicker_matches() {
        let words = vec!["bad".to_string()];
        assert!(nick_matches(&words, "xBadx", None, None));
        assert!(nick_matches(&words, "ok", Some("myBADname"), None));
        assert!(nick_matches(&words, "ok", None, Some("The Bad One")));
        assert!(!nick_matches(&words, "ok", Some("fine"), Some("Fine Name")));
        assert!(!nick_matches(&[], "bad", None, None));
    }

    #[test]
    fn nick_kicker_event_gates_match_ts_battery() {
        // Unicode fold legs (battery: unicode-e-acute both ways, kelvin,
        // turkish-dotless, german-ss) — missed by the old ASCII fold.
        let cafe = vec!["café".to_string()];
        assert!(nick_matches(&cafe, "CAFÉ lover", Some("x"), None));
        let cafe_upper = vec!["CAFÉ".to_string()];
        assert!(nick_matches(&cafe_upper, "café lover", Some("x"), None));
        let k = vec!["k".to_string()];
        assert!(nick_matches(&k, "K", Some("x"), None));
        let upper = vec!["KISAKAY".to_string()];
        assert!(nick_matches(&upper, "kisakay", Some("x"), None));
        let strasse = vec!["strasse".to_string()];
        assert!(nick_matches(&strasse, "Strasse", Some("x"), None));
        // Empty word trips everyone (`includes("")`, battery leg).
        let empty = vec!["".to_string()];
        assert!(nick_matches(
            &empty,
            "anyone",
            Some("nope"),
            Some("nothing")
        ));
        // Substring, not whole-word (battery substr-not-whole).
        let bad = vec!["bad".to_string()];
        assert!(nick_matches(&bad, "badminton", Some("x"), None));
        // Enabled gate mirrors `baseData?.enabled` truthiness (battery
        // enabled-* legs; writer stores real bools).
        let on = serde_json::json!({"enabled": true, "words": ["bad"]});
        assert!(nick_kicker_enabled(&on));
        let off = serde_json::json!({"enabled": false, "words": ["bad"]});
        assert!(!nick_kicker_enabled(&off));
        let one = serde_json::json!({"enabled": 1});
        assert!(one.get("enabled").is_some() && nick_kicker_enabled(&one));
        let str_false = serde_json::json!({"enabled": "false"});
        assert!(nick_kicker_enabled(&str_false));
        let zero = serde_json::json!({"enabled": 0});
        assert!(!nick_kicker_enabled(&zero));
        let missing = serde_json::json!({"words": ["bad"]});
        assert!(!nick_kicker_enabled(&missing));
        let null = serde_json::json!({"enabled": null});
        assert!(!nick_kicker_enabled(&null));
    }
}
