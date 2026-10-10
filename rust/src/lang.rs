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
/// FORGIVING FALLBACK, INTENTIONAL (H20): unknown codes resolve to the
/// en-US table instead of erroring, mirroring getLanguageDataByCode's
/// default branch. Every guild path must still do DB -> code -> table
/// (`kv_get GUILD.LANG`, default `"en-US"` when unset, then this fn) —
/// cf. getLanguageData.ts and funcs::guild_banner_url. Callers resolve
/// keys via [`get`]/[`get_list`] on the returned table.
pub fn table_for(code: &str) -> serde_yaml::Value {
    let t = table();
    t.get(code)
        .or_else(|| t.get("en-US"))
        .cloned()
        .unwrap_or(serde_yaml::Value::Null)
}

/// Map a Discord locale to an iHorizon language code.
/// Mirrors setLangByRegion in client/guildCreate.ts.
/// SUBSET MAP, INTENTIONAL (H20): only the locales TS handles are mapped
/// (`fr`, `en-US`/`en-GB`, `es-ES`, `de`, `it`, `ja`, `pt-BR`, `ru`);
/// everything else falls back to `en-US` exactly like the TS default
/// branch. Do not extend without mirroring the TS switch first.
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

/// Discord permission bit value -> (YAML lang key, exact en-US fallback).
/// Mirrors PERMISSION_MAPPING in
/// src/core/functions/permissonsCalculator.ts: the map keys are the
/// decimal bit values, the names are the YAML keys resolved via
/// `lang[perm.name]` in formatPermissionName (src/core/commandExecutor.ts).
/// Reuses the existing `perm_*_name` YAML keys (never hardcoded user
/// strings); the en-US literal is the final fallback only, matching the
/// TS `lang[p.name] || p.name` chain. SET_VOICE_CHANNEL_STATUS (1 << 48)
/// has no TS mapping entry and stays unmapped here as well.
const PERMISSION_NAMES: &[(u64, &str, &str)] = &[
    (1, "perm_createinstantinvite_name", "Create Instant Invite"),
    (2, "perm_kickmembers_name", "Kick Members"),
    (4, "perm_banmembers_name", "Ban Members"),
    (8, "perm_administrator_name", "Administrator"),
    (16, "perm_managechannels_name", "Manage Channels"),
    (32, "perm_manageguild_name", "Manage Server"),
    (64, "perm_addreactions_name", "Add Reactions"),
    (128, "perm_viewauditlog_name", "View Audit Log"),
    (256, "perm_priorityspeaker_name", "Priority Speaker"),
    (512, "perm_stream_name", "Stream"),
    (1024, "perm_viewchannel_name", "View Channel"),
    (2048, "perm_sendmessages_name", "Send Messages"),
    (4096, "perm_sendttsmessages_name", "Send TTS Messages"),
    (8192, "perm_managemessages_name", "Manage Messages"),
    (16384, "perm_embedlinks_name", "Embed Links"),
    (32768, "perm_attachfiles_name", "Attach Files"),
    (
        65536,
        "perm_readmessagehistory_name",
        "Read Message History",
    ),
    (131072, "perm_mentioneveryone_name", "Mention Everyone"),
    (262144, "perm_useexternalemojis_name", "Use External Emojis"),
    (
        524288,
        "perm_viewguildinsights_name",
        "View Server Insights",
    ),
    (1048576, "perm_connect_name", "Connect"),
    (2097152, "perm_speak_name", "Speak"),
    (4194304, "perm_mutemembers_name", "Mute Members"),
    (8388608, "perm_deafenmembers_name", "Deafen Members"),
    (16777216, "perm_movemembers_name", "Move Members"),
    (33554432, "perm_usevad_name", "Use Voice Activity"),
    (67108864, "perm_changenickname_name", "Change Nickname"),
    (134217728, "perm_managenicknames_name", "Manage Nicknames"),
    (268435456, "perm_manageroles_name", "Manage Roles"),
    (536870912, "perm_managewebhooks_name", "Manage Webhooks"),
    (
        1073741824,
        "perm_manageemojisandstickers_name",
        "Manage Emojis and Stickers",
    ),
    (
        2147483648,
        "perm_useapplicationcommands_name",
        "Use Application Commands",
    ),
    (4294967296, "perm_requesttospeak_name", "Request to Speak"),
    (8589934592, "perm_manageevents_name", "Manage Events"),
    (17179869184, "perm_managethreads_name", "Manage Threads"),
    (
        34359738368,
        "perm_createpublicthreads_name",
        "Create Public Threads",
    ),
    (
        68719476736,
        "perm_createprivatethreads_name",
        "Create Private Threads",
    ),
    (
        137438953472,
        "perm_useexternalstickers_name",
        "Use External Stickers",
    ),
    (
        274877906944,
        "perm_sendmessagesinthreads_name",
        "Send Messages in Threads",
    ),
    (
        549755813888,
        "perm_useembeddedactivities_name",
        "Use Embedded Activities",
    ),
    (
        1099511627776,
        "perm_moderatemembers_name",
        "Moderate Members",
    ),
    (
        2199023255552,
        "perm_viewcreatormonetizationanalytics_name",
        "View Creator Monetization Analytics",
    ),
    (4398046511104, "perm_usesoundboard_name", "Use Soundboard"),
    (
        8796093022208,
        "perm_createguildexpressions_name",
        "Create Server Expressions",
    ),
    (17592186044416, "perm_createevents_name", "Create Events"),
    (
        35184372088832,
        "perm_useexternalsounds_name",
        "Use External Sounds",
    ),
    (
        70368744177664,
        "perm_sendvoicemessages_name",
        "Send Voice Messages",
    ),
    (562949953421312, "perm_sendpolls_name", "Send Polls"),
    (
        1125899906842624,
        "perm_useexternalapps_name",
        "Use External Apps",
    ),
];

/// Single-bit lookup into the permission table.
pub fn permission_name_key(bits: u64) -> Option<(&'static str, &'static str)> {
    PERMISSION_NAMES
        .iter()
        .find(|(v, _, _)| *v == bits)
        .map(|(_, key, fallback)| (*key, *fallback))
}

/// Localized display names for a combined permission bitmask.
/// Mirrors formatPermissionName in src/core/commandExecutor.ts: every
/// known set bit resolves through the guild lang table with the exact
/// en-US string as the final fallback; unknown bits are skipped (TS
/// filters nulls). Returns None when no bit maps, so the caller falls
/// back to a generic noun; otherwise names joined with ", ".
pub fn permission_names(code: &str, missing_bits: u64) -> Option<String> {
    let names: Vec<String> = PERMISSION_NAMES
        .iter()
        .filter(|(v, _, _)| missing_bits & v != 0)
        .map(|(_, key, fallback)| get(code, key).unwrap_or_else(|| fallback.to_string()))
        .collect();
    if names.is_empty() {
        None
    } else {
        Some(names.join(", "))
    }
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

    #[test]
    fn perm_table_keys_match_en_us_fallbacks() {
        // Every table entry must reuse an existing YAML key whose en-US
        // value equals the compiled fallback (locks the TS parity).
        for (bits, key, fallback) in super::PERMISSION_NAMES {
            assert_eq!(
                get("en-US", key).as_deref(),
                Some(*fallback),
                "bit {bits} key {key} drifted from en-US.yml"
            );
        }
    }

    #[test]
    fn perm_names_resolve_en_us() {
        assert_eq!(
            permission_names("en-US", 8).as_deref(),
            Some("Administrator")
        );
        // Combined bits join with ", " like the TS array branch.
        assert_eq!(
            permission_names("en-US", 4 | 8).as_deref(),
            Some("Ban Members, Administrator")
        );
    }

    #[test]
    fn perm_names_are_localized_not_english() {
        assert_eq!(
            permission_names("fr-FR", 8).as_deref(),
            Some("Administrateur")
        );
        assert_eq!(
            permission_names("fr-FR", 2048).as_deref(),
            Some("Envoyer des messages")
        );
    }

    #[test]
    fn perm_names_unknown_bits_yield_none() {
        // 1 << 48 (SET_VOICE_CHANNEL_STATUS) has no TS mapping entry.
        assert_eq!(permission_names("en-US", 1 << 48), None);
        assert_eq!(permission_names("en-US", 0), None);
        assert_eq!(permission_name_key(1 << 48), None);
    }

    #[test]
    fn perm_names_skips_unknown_bits_keeps_known() {
        assert_eq!(
            permission_names("en-US", 8 | (1 << 48)).as_deref(),
            Some("Administrator")
        );
    }

    /// Extract every replace-target token from a YAML value: `${...}`
    /// (method.replace targets) and `{name}` (template fills). Pure
    /// scanner so the audit needs no regex dependency.
    fn placeholder_tokens(value: &str) -> std::collections::BTreeSet<String> {
        let mut out = std::collections::BTreeSet::new();
        let bytes = value.as_bytes();
        let mut i = 0;
        while i < bytes.len() {
            if bytes[i] == b'$' && i + 1 < bytes.len() && bytes[i + 1] == b'{' {
                if let Some(end) = value[i + 2..].find('}') {
                    out.insert(value[i..i + 2 + end + 1].to_string());
                    i += 2 + end + 1;
                    continue;
                }
                break;
            }
            if bytes[i] == b'{' {
                if let Some(end) = value[i + 1..].find('}') {
                    let inner = &value[i + 1..i + 1 + end];
                    if !inner.is_empty()
                        && inner
                            .bytes()
                            .all(|b| b.is_ascii_alphanumeric() || b == b'_')
                    {
                        out.insert(value[i..i + 1 + end + 1].to_string());
                    }
                    i += 1 + end + 1;
                    continue;
                }
                break;
            }
            i += 1;
        }
        out
    }

    #[test]
    fn placeholder_tokens_match_en_us_in_all_locales() {
        // I4 portable equivalent (no CI in this repo): every locale must
        // carry the exact replace-target tokens of en-US, otherwise the
        // `.replace(token, ...)` calls in TS/Rust miss and users see raw
        // `${...}`/`{...}` text (lived bug: jp-JP
        // `perm_roles_created_role` used `join('、')` while the code
        // replaces `join(', ')`). Exceptions below are upstream-authored
        // meme-locale rewrites (fr-ME) and one fr-FR joke rewrite where
        // the token is deliberately absent (no garbage renders, the name
        // is just dropped); `var_doesnt_have_permissions` additionally
        // has zero TS/Rust callers (dead key, I6 queue).
        const EXCEPTIONS: &[(&str, &str)] = &[
            ("fr-FR", "util_wakeup_not_in_vc"),
            ("fr-ME", "var_doesnt_have_permissions"),
            ("fr-ME", "kisakay_message"),
            ("fr-ME", "setjoindm_help_embed_desc"),
            ("fr-ME", "setjoinmessage_help_embed_desc"),
            ("fr-ME", "notifier_config_message_command_work_on_enable"),
            ("fr-ME", "event_welcomer_inviter"),
            ("fr-ME", "event_welcomer_default"),
            ("fr-ME", "ping_bot_show_info_msg"),
        ];
        let en = table_for("en-US");
        let en_map = en.as_mapping().expect("en-US.yml should parse");
        for code in [
            "ar-EG", "de-DE", "es-ES", "fr-FR", "fr-ME", "it-IT", "jp-JP", "pt-PT", "ru-RU",
        ] {
            let table = table_for(code);
            let map = table.as_mapping().expect("locale should parse");
            assert_eq!(
                map.len(),
                en_map.len(),
                "{code} key count drifted from en-US"
            );
            for (key, value) in en_map {
                let Some(key) = key.as_str() else { continue };
                let en_text = value.as_str().unwrap_or_default();
                let want = placeholder_tokens(en_text);
                if want.is_empty() {
                    continue;
                }
                if EXCEPTIONS.contains(&(code, key)) {
                    continue;
                }
                let got = map
                    .get(key)
                    .and_then(|v| v.as_str())
                    .map(placeholder_tokens)
                    .unwrap_or_default();
                assert_eq!(
                    got, want,
                    "{code}.{key}: placeholder set drifted from en-US"
                );
            }
        }
    }
}
