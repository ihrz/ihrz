// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/functions/getLanguageData.ts + src/lang/*.yml.
//
// TS rule: no user-visible string hardcoded; everything lives in YAML.
// This loader reuses the existing YAML files in-place (../src/lang)
// so the Rust port needs no duplication. Typed access comes later via
// codegen (mirrors `bun run type:lang`).

use once_cell::sync::OnceCell;
use std::collections::HashMap;

static CACHE: OnceCell<HashMap<String, serde_yaml::Value>> = OnceCell::new();

fn lang_dir() -> std::path::PathBuf {
    // rust/src/lang.rs -> rust/ -> repo root -> src/lang
    let mut p = std::env::current_dir().unwrap_or_else(|_| ".".into());
    if p.ends_with("rust") {
        p.pop();
    }
    p.join("src").join("lang")
}

fn table() -> &'static HashMap<String, serde_yaml::Value> {
    CACHE.get_or_init(|| {
        let mut map = HashMap::new();
        let dir = lang_dir();
        let codes = [
            "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT",
            "ru-RU",
        ];
        for code in codes {
            let path = dir.join(format!("{code}.yml"));
            let value = std::fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_yaml::from_str(&s).ok())
                .unwrap_or(serde_yaml::Value::Null);
            map.insert(code.to_string(), value);
        }
        map
    })
}

/// Mirrors getLanguageData(guildId): guild lookup happens in db layer;
/// here we resolve a language code to its YAML table with en-US fallback
/// for the *lookup* only (never a substitute for missing keys).
pub fn table_for(code: &str) -> serde_yaml::Value {
    let t = table();
    t.get(code)
        .or_else(|| t.get("en-US"))
        .cloned()
        .unwrap_or(serde_yaml::Value::Null)
}

/// Map a Discord locale to an iHorizon language code.
/// Mirrors setLangByRegion in client/guildCreate.ts.
pub fn locale_lang_code(locale: &str) -> &'static str {
    match locale {
        "fr" => "fr-FR",
        "en-US" | "en-GB" => "en-US",
        "es-ES" => "es-ES",
        "de" => "de-DE",
        "it" => "it-IT",
        "ja" => "jp-JP",
        "pt-BR" => "pt-PT",
        "ru" => "ru-RU",
        _ => "en-US",
    }
}

/// Get a list key, e.g. get_list("en-US", "new_guild_embed_title").
pub fn get_list(code: &str, key: &str) -> Vec<String> {
    table_for(code)
        .get(key)
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

/// Get a single key, e.g. get("en-US", "var_member").
pub fn get(code: &str, key: &str) -> Option<String> {
    table_for(code).get(key).and_then(|v| {
        v.as_str().map(|s| s.to_string()).or_else(|| {
            v.as_u64()
                .map(|n| n.to_string())
                .or_else(|| v.as_bool().map(|b| b.to_string()))
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn en_us_table_loads_and_has_core_keys() {
        let t = table_for("en-US");
        assert!(t.is_mapping(), "en-US.yml should parse to a mapping");
        assert_eq!(get("en-US", "var_member").as_deref(), Some("Members"));
    }

    #[test]
    fn all_locales_load_as_mappings() {
        for code in [
            "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT",
            "ru-RU",
        ] {
            let t = table_for(code);
            assert!(t.is_mapping(), "{code} should parse to a mapping");
        }
    }

    #[test]
    fn unknown_lang_falls_back_to_en_us_table() {
        assert_eq!(table_for("xx-XX"), table_for("en-US"));
    }

    #[test]
    fn unknown_key_returns_none_never_panics() {
        assert_eq!(get("en-US", "definitely_not_a_real_key_12345"), None);
        assert_eq!(get("xx-XX", "definitely_not_a_real_key_12345"), None);
    }

    #[test]
    fn list_key_returns_titles() {
        let titles = get_list("en-US", "new_guild_embed_title");
        assert!(!titles.is_empty(), "welcome titles should load");
        assert!(get_list("en-US", "definitely_not_a_real_key_12345").is_empty());
    }

    #[test]
    fn locale_map_matches_set_lang_by_region() {
        assert_eq!(locale_lang_code("fr"), "fr-FR");
        assert_eq!(locale_lang_code("en-GB"), "en-US");
        assert_eq!(locale_lang_code("es-ES"), "es-ES");
        assert_eq!(locale_lang_code("de"), "de-DE");
        assert_eq!(locale_lang_code("it"), "it-IT");
        assert_eq!(locale_lang_code("ja"), "jp-JP");
        assert_eq!(locale_lang_code("pt-BR"), "pt-PT");
        assert_eq!(locale_lang_code("ru"), "ru-RU");
        assert_eq!(locale_lang_code("xx-YY"), "en-US");
    }

    #[test]
    fn fr_member_key_is_translated_not_english() {
        let fr = get("fr-FR", "var_member");
        assert!(fr.is_some());
        assert_ne!(fr.as_deref(), Some("Members"));
    }

    #[test]
    fn core_keys_exist_in_all_locales() {
        for code in [
            "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT",
            "ru-RU",
        ] {
            for key in ["var_member", "var_latency", "var_enabled", "var_disabled"] {
                assert!(
                    get(code, key).is_some(),
                    "{code} missing {key} (no-fallback rule)"
                );
            }
        }
    }

    #[test]
    fn wave2_msg_keys_exist_in_all_locales() {
        // U-I18N wave-2 block: every msg_* fallback key must exist in
        // all 10 locales (parity enforced at insert; this locks it).
        for code in [
            "ar-EG", "de-DE", "en-US", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT",
            "ru-RU",
        ] {
            for key in [
                "msg_this_command_must_be_used_in_a_server",
                "msg_frozen",
                "msg_not_found",
                "msg_loading",
                "msg_welcomer_updated",
                "msg_could_not_download_that_image",
                "msg_use_on_off",
                "msg_ticket_opened",
                "msg_shop_role_added",
                "msg_translation_failed",
                "bledit_reason_updated",
            ] {
                assert!(
                    get(code, key).is_some(),
                    "{code} missing {key} (no-fallback rule)"
                );
            }
        }
    }

    #[test]
    fn wave2_msg_values_are_translated_not_english() {
        // Spot-check: non-English locales must not parrot the English.
        assert_ne!(
            get("fr-FR", "msg_frozen").as_deref(),
            get("en-US", "msg_frozen").as_deref()
        );
        assert_ne!(
            get("de-DE", "msg_not_found").as_deref(),
            get("en-US", "msg_not_found").as_deref()
        );
        assert_ne!(
            get("jp-JP", "msg_loading").as_deref(),
            get("en-US", "msg_loading").as_deref()
        );
    }
}
