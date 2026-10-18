// ---- vanity-generator ----
// Mirrors utils !vanity-generator.ts: code validation, local VANITY
// claim scan, permanent invite creation, gateway CreateCustomVanity
// registration. The local api table is read-only seed data in TS (no
// writer exists), mirrored as kv guild "0" key "api.VANITY".

/// Mirrors method.isValidDiscordInviteCode (`/^[a-z0-9]+(-[a-z0-9]+)*$/i`,
/// max 32 chars). Byte length stands in for the TS UTF-16 `.length`
/// check: any regex-passing string is pure ASCII (bytes == units), so a
/// byte-over/unit-under split can only ever flip which leg returns false
/// (node battery: 32x"é"/16x"😀" fail the regex leg in TS, the length leg
/// here). Modern V8 does NOT apply the Annex-B special foldings in
/// non-unicode mode (`ſ`/`İ`/`ı`/`K` all fail the TS regex — node ground
/// truth), so ASCII-only segment matching is exact, not approximate.
pub fn is_valid_vanity_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 32 {
        return false;
    }
    for segment in code.split('-') {
        if segment.is_empty() {
            return false;
        }
        if !segment.bytes().all(|b| b.is_ascii_alphanumeric()) {
            return false;
        }
    }
    true
}

/// Mirrors VanityCodeAlreadyExist (any table entry whose vanity equals
/// the code; missing/non-object table means no claim).
pub fn vanity_already_claimed(table: Option<&serde_json::Value>, code: &str) -> bool {
    let Some(map) = table.and_then(|v| v.as_object()) else {
        return false;
    };
    map.values()
        .any(|entry| entry.get("vanity").and_then(|v| v.as_str()) == Some(code))
}

/// Mirrors the invalid-code template fill (TS String.replace: first
/// occurrence of `${VanityCode}`).
pub fn vanity_invalid_text(template: &str, code: &str) -> String {
    template.replacen("${VanityCode}", code, 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vanity_code_rules_match_ts() {
        // Valid: alnum groups joined by single hyphens, max 32.
        assert!(is_valid_vanity_code("abc"));
        assert!(is_valid_vanity_code("ABC-123-x"));
        assert!(is_valid_vanity_code("0-0"));
        assert!(is_valid_vanity_code("Z-9-x"));
        assert!(is_valid_vanity_code(&"a".repeat(32)));
        // Invalid: empty, too long, edge/double hyphens, bad chars.
        assert!(!is_valid_vanity_code(""));
        assert!(!is_valid_vanity_code(&"a".repeat(33)));
        assert!(!is_valid_vanity_code(&format!("{}-b", "a".repeat(31))));
        assert!(!is_valid_vanity_code("-abc"));
        assert!(!is_valid_vanity_code("abc-"));
        assert!(!is_valid_vanity_code("a--b"));
        assert!(!is_valid_vanity_code("ab_c"));
        assert!(!is_valid_vanity_code("ab c"));
        assert!(!is_valid_vanity_code("a.b"));
        assert!(!is_valid_vanity_code("a/b"));
        assert!(!is_valid_vanity_code("-"));
        assert!(!is_valid_vanity_code("--"));
        assert!(!is_valid_vanity_code("caf\u{e9}"));
        // Node ground truth (non-unicode /i has no Annex-B foldings):
        // ſ/İ/ı/K/Σ/ß all fail the TS regex, like the ASCII-only check.
        assert!(!is_valid_vanity_code("ſ"));
        assert!(!is_valid_vanity_code("İ"));
        assert!(!is_valid_vanity_code("ı"));
        assert!(!is_valid_vanity_code("K"));
        assert!(!is_valid_vanity_code("Σ"));
        assert!(!is_valid_vanity_code("xßx"));
        // Length-leg outcome identity (UTF-16 .length vs byte len): these
        // pass the TS length check but fail its regex leg; Rust fails the
        // length leg instead. Same false either way.
        assert!(!is_valid_vanity_code(&"é".repeat(32)));
        assert!(!is_valid_vanity_code(&"😀".repeat(16)));
    }

    #[test]
    fn vanity_claim_scan_matches_ts() {
        let table = serde_json::json!({
            "111": { "vanity": "taken", "invite": "x" },
            "222": { "vanity": "other" },
            "333": "not-an-object",
        });
        assert!(vanity_already_claimed(Some(&table), "taken"));
        assert!(!vanity_already_claimed(Some(&table), "free"));
        assert!(!vanity_already_claimed(None, "taken"));
        assert!(!vanity_already_claimed(
            Some(&serde_json::json!([])),
            "taken"
        ));
        // Template fill replaces the first placeholder only.
        assert_eq!(
            vanity_invalid_text("`${VanityCode}` bad ${VanityCode}", "x-y"),
            "`x-y` bad ${VanityCode}"
        );
    }
}
