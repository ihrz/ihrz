// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/core/functions/shard_helper.ts (GuildData, DetailedGuildData,
// getGuildData / getDetailedGuildData broadcast-first-non-null projection).
//
// Pure projectors only: shard broadcast + Discord I/O live in the async
// driver (registry + HTTP fallback, next unit). No serenity import here so
// these stay offline-testable.

use serde::{Deserialize, Serialize};

/// Mirrors `GuildData` in shard_helper.ts.
/// TS quirk preserved: `iconURL` / `joinedTimestamp` are required-nullable
/// (`string | null`), while `vanityURLCode?` is optional-nullable.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuildData {
    pub name: String,
    pub member_count: u64,
    pub preferred_locale: String,
    #[serde(rename = "iconURL")]
    pub icon_url: Option<String>,
    pub joined_timestamp: Option<i64>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "vanityURLCode"
    )]
    pub vanity_url_code: Option<String>,
}

/// Mirrors `DetailedGuildData` in shard_helper.ts.
/// TS quirk preserved: every field past `preferredLocale` is optional
/// (`iconURL?`, `joinedTimestamp?`, `vanityURLCode?`, `ownerId?`,
/// `createdTimestamp?`, `description?`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetailedGuildData {
    pub name: String,
    pub member_count: u64,
    pub preferred_locale: String,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "iconURL")]
    pub icon_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub joined_timestamp: Option<i64>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "vanityURLCode"
    )]
    pub vanity_url_code: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_timestamp: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Mirrors `guildResults.find((r) => r !== null) || null` for `getGuildData`.
/// First `Some` wins; `None` entries are skipped, never matched.
/// Empty / all-`None` input yields `None`.
pub fn find_guild_data(results: &[Option<GuildData>]) -> Option<&GuildData> {
    results.iter().flatten().next()
}

/// Mirrors `guildResults.find((r) => r !== null) || null` for
/// `getDetailedGuildData`. Same first-non-null-wins semantics.
pub fn find_detailed_guild_data(
    results: &[Option<DetailedGuildData>],
) -> Option<&DetailedGuildData> {
    results.iter().flatten().next()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(name: &str) -> GuildData {
        GuildData {
            name: name.to_string(),
            member_count: 42,
            preferred_locale: "en-US".to_string(),
            icon_url: None,
            joined_timestamp: None,
            vanity_url_code: None,
        }
    }

    fn detailed(name: &str) -> DetailedGuildData {
        DetailedGuildData {
            name: name.to_string(),
            member_count: 7,
            preferred_locale: "fr-FR".to_string(),
            icon_url: None,
            joined_timestamp: None,
            vanity_url_code: None,
            owner_id: None,
            created_timestamp: None,
            description: None,
        }
    }

    #[test]
    fn none_entries_are_skipped_not_matched() {
        let results = vec![None, None, Some(sample("found"))];
        assert_eq!(find_guild_data(&results).unwrap().name, "found");

        let detailed_results = vec![None, None, Some(detailed("d"))];
        assert_eq!(
            find_detailed_guild_data(&detailed_results).unwrap().name,
            "d"
        );
    }

    #[test]
    fn first_non_null_wins() {
        let results = vec![Some(sample("first")), Some(sample("second")), None];
        assert_eq!(find_guild_data(&results).unwrap().name, "first");

        let detailed_results = vec![Some(detailed("a")), Some(detailed("b"))];
        assert_eq!(
            find_detailed_guild_data(&detailed_results).unwrap().name,
            "a"
        );
    }

    #[test]
    fn empty_or_all_none_yields_none() {
        let empty: Vec<Option<GuildData>> = vec![];
        assert!(find_guild_data(&empty).is_none());
        assert!(find_guild_data(&[None, None]).is_none());

        let empty_d: Vec<Option<DetailedGuildData>> = vec![];
        assert!(find_detailed_guild_data(&empty_d).is_none());
        assert!(find_detailed_guild_data(&[None]).is_none());
    }

    #[test]
    fn ts_optionality_quirk_roundtrip() {
        // GuildData: required-nullable fields serialize as explicit nulls.
        let g = sample("q");
        let v = serde_json::to_value(&g).unwrap();
        assert!(v.get("iconURL").is_some());
        assert!(v.get("joinedTimestamp").is_some());
        // Optional vanity key is omitted when absent (TS `?`).
        assert!(v.get("vanityURLCode").is_none());

        // DetailedGuildData: optional fields default to None when missing.
        let d: DetailedGuildData = serde_json::from_value(serde_json::json!({
            "name": "q",
            "memberCount": 1,
            "preferredLocale": "en-US"
        }))
        .unwrap();
        assert!(d.icon_url.is_none());
        assert!(d.owner_id.is_none());
        assert!(d.description.is_none());
    }
}
