// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/notifier/* +
// src/core/StreamNotifier.ts (config surface).
//
// TS keys: NOTIFIER.users[] {id_or_username, platform}, NOTIFIER.channelId,
// NOTIFIER.message, NOTIFIER.lastMediaNotified. Live author validation
// (authorExistOnPlatform) + 120s sweep in scheduler.rs; dedup helper
// in notifier.rs.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NotifierEntry {
    pub id_or_username: String,
    pub platform: String,
}

pub fn valid_platform(p: &str) -> bool {
    matches!(
        p.to_ascii_lowercase().as_str(),
        "twitch" | "youtube" | "kick"
    )
}

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

pub async fn load_entries(pool: &crate::db::Pool, guild_id: &str) -> Vec<NotifierEntry> {
    table_value_or_legacy(pool, guild_id, "NOTIFIER.users")
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub async fn save_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    entries: &[NotifierEntry],
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set("NOTIFIER.users", entries)
        .await
}

/// Table-routed plain-string read with legacy fallback
/// (NOTIFIER.channelId / NOTIFIER.message).
pub async fn load_notifier_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<String> {
    table_value_or_legacy(pool, guild_id, key)
        .await
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        })
}

/// Table-routed plain-string write (keys unchanged).
pub async fn save_notifier_string(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    guild_backend(pool).table(guild_id).set(key, value).await
}

/// Author link for the authors embed. Mirrors the platform switch in
/// generateAuthorsEmbed (youtube/twitch only; anything else has no
/// link, like the TS switch falling through).
pub fn author_link(platform: &str, id_or_username: &str) -> Option<String> {
    match platform.to_ascii_lowercase().as_str() {
        "youtube" => Some(format!("https://youtube.com/channel/{id_or_username}")),
        "twitch" => Some(format!("https://twitch.tv/{id_or_username}")),
        _ => None,
    }
}

/// Authors embed description. Mirrors generateAuthorsEmbed: the lang
/// prefix plus one `<platform> - [`name`](link)` row per author.
pub fn authors_embed_desc(prefix: &str, rows: &[(String, String, Option<String>)]) -> String {
    let mut desc = prefix.to_string();
    for (platform, name, link) in rows {
        match link {
            Some(url) => desc.push_str(&format!("{platform} - [`{name}`]({url})\n")),
            None => desc.push_str(&format!("{platform} - `{name}`\n")),
        }
    }
    desc
}

/// Authors embed. Mirrors generateAuthorsEmbed (title + colour
/// 2829617).
pub fn authors_embed(
    code: &str,
    rows: &[(String, String, Option<String>)],
) -> serenity::CreateEmbed {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    serenity::CreateEmbed::default()
        .title(say(
            "notifier_generateAuthorsEmbed_embed_title",
            "All Streamers/Youtubers in the guild",
        ))
        .description(authors_embed_desc(
            &say(
                "notifier_generateAuthorsEmbed_embed_desc",
                "This is the list of all Streamers/Youtubers:\n",
            ),
            rows,
        ))
        .colour(serenity::Colour::new(2829617))
}

/// Configuration embed. Mirrors generateConfigurationEmbed: notify
/// channel field (`<#id>` or setjoinroles_var_none) + notify message
/// field (stored template or notifier_on_new_media_default_message).
pub fn config_embed(
    code: &str,
    channel_id: Option<&str>,
    message: Option<&str>,
) -> serenity::CreateEmbed {
    let say = |key: &str, fallback: &str| {
        crate::lang::get(code, key).unwrap_or_else(|| fallback.to_string())
    };
    let channel_value = match channel_id.filter(|s| !s.is_empty()) {
        Some(id) => format!("<#{id}>"),
        None => say("setjoinroles_var_none", "None"),
    };
    let message_value = match message.filter(|s| !s.is_empty()) {
        Some(t) => t.to_string(),
        None => say(
            "notifier_on_new_media_default_message",
            "@everyone has published a new video",
        ),
    };
    serenity::CreateEmbed::default()
        .title(say(
            "notifier_generateConfigurationEmbed_embed_title",
            "Notifier Module Configuration",
        ))
        .colour(serenity::Colour::new(2829617))
        .field(
            say(
                "notifier_generateConfigurationEmbed_embed_fields_1_name",
                "Notify Channel",
            ),
            channel_value,
            false,
        )
        .field(
            say(
                "notifier_generateConfigurationEmbed_embed_fields_2_name",
                "Notify Message",
            ),
            message_value,
            false,
        )
}

/// Entry lookup. Mirrors authorExist (platform + id match).
pub fn entry_exists(entries: &[NotifierEntry], platform: &str, author: &str) -> bool {
    entries
        .iter()
        .any(|e| e.platform.eq_ignore_ascii_case(platform) && e.id_or_username == author)
}

/// Dedup helper. Mirrors the JSON-stringify uniqueness filter in
/// !add.ts (platform + id pair).
pub fn dedup_entries(entries: &mut Vec<NotifierEntry>) {
    let mut seen = std::collections::HashSet::new();
    entries.retain(|e| seen.insert((e.platform.to_ascii_lowercase(), e.id_or_username.clone())));
}

/// Delete a plain-string notifier key from both stores. Mirrors
/// client.db.delete (`NOTIFIER.message` reset leg).
pub async fn delete_notifier_key(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> anyhow::Result<()> {
    crate::backends::Backend::sqlite(pool.clone())
        .table(guild_id)
        .delete(key)
        .await?;
    crate::db::kv_del(pool, guild_id, key).await?;
    Ok(())
}

/// Authors + configuration embeds for the add/remove/list replies.
/// Mirrors the TS replies sending generateAuthorsEmbed +
/// generateConfigurationEmbed together. Display names resolve live
/// (YouTube channel title, Twitch login fallback, id on error, like
/// getChannelNameById).
pub async fn authors_and_config_embeds(
    pool: &crate::db::Pool,
    guild_id: &str,
    code: &str,
) -> (serenity::CreateEmbed, serenity::CreateEmbed) {
    let entries = load_entries(pool, guild_id).await;
    let mut rows = Vec::with_capacity(entries.len());
    for e in &entries {
        let name = crate::scheduler::author_display_name(&e.platform, &e.id_or_username).await;
        rows.push((
            e.platform.clone(),
            name,
            author_link(&e.platform, &e.id_or_username),
        ));
    }
    let channel = load_notifier_string(pool, guild_id, "NOTIFIER.channelId").await;
    let message = load_notifier_string(pool, guild_id, "NOTIFIER.message").await;
    (
        authors_embed(code, &rows),
        config_embed(code, channel.as_deref(), message.as_deref()),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platforms() {
        assert!(valid_platform("twitch"));
        assert!(valid_platform("YouTube"));
        assert!(!valid_platform("nope"));
    }

    #[test]
    fn author_links_mirror_ts_switch() {
        assert_eq!(
            author_link("youtube", "UC1"),
            Some("https://youtube.com/channel/UC1".to_string())
        );
        assert_eq!(
            author_link("twitch", "ninja"),
            Some("https://twitch.tv/ninja".to_string())
        );
        assert_eq!(author_link("kick", "x"), None);
    }

    #[test]
    fn authors_desc_rows_mirror_ts_format() {
        let rows = vec![(
            "twitch".to_string(),
            "Ninja".to_string(),
            Some("https://twitch.tv/ninja".to_string()),
        )];
        assert_eq!(
            authors_embed_desc("list:\n", &rows),
            "list:\ntwitch - [`Ninja`](https://twitch.tv/ninja)\n"
        );
    }

    #[test]
    fn entry_lookup_is_platform_scoped() {
        let entries = vec![NotifierEntry {
            id_or_username: "ninja".into(),
            platform: "twitch".into(),
        }];
        assert!(entry_exists(&entries, "twitch", "ninja"));
        assert!(entry_exists(&entries, "TWITCH", "ninja"));
        // Same author on another platform is a different watch.
        assert!(!entry_exists(&entries, "youtube", "ninja"));
        assert!(!entry_exists(&entries, "twitch", "other"));
    }

    #[test]
    fn dedup_keeps_first_per_platform_pair() {
        let mut entries = vec![
            NotifierEntry {
                id_or_username: "a".into(),
                platform: "twitch".into(),
            },
            NotifierEntry {
                id_or_username: "a".into(),
                platform: "Twitch".into(),
            },
            NotifierEntry {
                id_or_username: "a".into(),
                platform: "youtube".into(),
            },
        ];
        dedup_entries(&mut entries);
        assert_eq!(entries.len(), 2);
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_entries(
            &pool,
            "g1",
            &[NotifierEntry {
                id_or_username: "auth1".into(),
                platform: "twitch".into(),
            }],
        )
        .await
        .unwrap();
        assert_eq!(load_entries(&pool, "g1").await.len(), 1);
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "NOTIFIER.users").await;
        assert_eq!(legacy, None);
        // Legacy rows still read.
        crate::db::kv_set(
            &pool,
            "g2",
            "NOTIFIER.users",
            r#"[{"id_or_username":"a","platform":"kick"}]"#,
        )
        .await
        .unwrap();
        assert_eq!(load_entries(&pool, "g2").await.len(), 1);
        // Plain-string keys round-trip with legacy fallback.
        save_notifier_string(&pool, "g1", "NOTIFIER.channelId", "8")
            .await
            .unwrap();
        assert_eq!(
            load_notifier_string(&pool, "g1", "NOTIFIER.channelId")
                .await
                .as_deref(),
            Some("8")
        );
        crate::db::kv_set(&pool, "g2", "NOTIFIER.message", "hello")
            .await
            .unwrap();
        assert_eq!(
            load_notifier_string(&pool, "g2", "NOTIFIER.message")
                .await
                .as_deref(),
            Some("hello")
        );
    }
}

pub mod add;
pub mod channel;
pub mod list;
pub mod message;
#[allow(clippy::module_inception)]
pub mod notifier;
pub mod remove;

/// Old registry path (`notifier::main::notifier`) kept working.
pub mod main {
    pub use super::notifier::*;
}
