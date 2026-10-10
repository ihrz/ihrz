// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/sticky/* via
// core/modules/stickyMessageManager.ts.
//
// TS keys: <guild>.STICKY.<channelId> StickyChannelConfig
// ({channelId, content, embedId, lastMessageId, enabled});
// EMBED.<id> is bot-global (metasTable, see
// embed::embed_builder::load_stored_embed) — never guild-scoped.

use crate::bot::Ctx;
use once_cell::sync::Lazy;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

fn enabled_default() -> bool {
    true
}

/// TS StickyChannelConfig (legacy Rust rows used `message` /
/// `embed_id` / `last_message_id` and are accepted via aliases).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StickyConfig {
    #[serde(default)]
    pub channel_id: String,
    #[serde(default, alias = "message")]
    pub content: Option<String>,
    #[serde(default, alias = "embed_id")]
    pub embed_id: Option<String>,
    #[serde(default, alias = "last_message_id")]
    pub last_message_id: Option<String>,
    #[serde(default = "enabled_default")]
    pub enabled: bool,
}

pub fn sticky_key(channel_id: u64) -> String {
    format!("STICKY.{channel_id}")
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

/// Table-routed write for one sticky config (keys unchanged).
pub async fn save_sticky(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &StickyConfig,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(&sticky_key(cfg.channel_id.parse().unwrap_or(0)), cfg)
        .await
}

/// Table-routed delete: clears the guild-table row and any legacy row.
pub async fn delete_sticky(pool: &crate::db::Pool, guild_id: &str, channel_id: u64) {
    let backend = guild_backend(pool);
    let _ = backend
        .table(guild_id)
        .delete(&sticky_key(channel_id))
        .await;
    let _ = crate::db::kv_del(pool, guild_id, &sticky_key(channel_id)).await;
}

/// Every enabled sticky config: guild-table subtree first, legacy
/// `STICKY.%` rows filling gaps (table wins).
pub async fn load_all_stickies(pool: &crate::db::Pool, guild_id: &str) -> Vec<StickyConfig> {
    let mut by_channel: std::collections::HashMap<String, StickyConfig> =
        std::collections::HashMap::new();
    let backend = guild_backend(pool);
    if let Ok(Some(root)) = backend
        .table(guild_id)
        .get::<serde_json::Value>("STICKY")
        .await
    {
        if let Some(map) = root.as_object() {
            for (id, v) in map {
                if id.is_empty() || id.contains('.') {
                    continue;
                }
                if let Ok(cfg) = serde_json::from_value::<StickyConfig>(v.clone()) {
                    if cfg.enabled {
                        by_channel.insert(id.clone(), cfg);
                    }
                }
            }
        }
    }
    let rows: Vec<(String, String)> = crate::db::kv_scan_prefix(pool, guild_id, "STICKY.").await;
    for (k, v) in &rows {
        let Some(id) = k.strip_prefix("STICKY.") else {
            continue;
        };
        if id.is_empty() || id.contains('.') || by_channel.contains_key(id) {
            continue;
        }
        if let Ok(cfg) = serde_json::from_str::<StickyConfig>(v) {
            if cfg.enabled {
                by_channel.insert(id.to_string(), cfg);
            }
        }
    }
    let mut out: Vec<StickyConfig> = by_channel.into_values().collect();
    out.sort_by(|a, b| a.channel_id.cmp(&b.channel_id));
    out
}

/// Enabled configs only (TS getStickyChannelConfig returns null
/// when `!config?.enabled`).
pub async fn load_sticky(
    pool: &crate::db::Pool,
    guild_id: &str,
    channel_id: u64,
) -> Option<StickyConfig> {
    table_value_or_legacy(pool, guild_id, &sticky_key(channel_id))
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .filter(|cfg: &StickyConfig| cfg.enabled)
}

/// Type label for show/list (resolveStickyType / resolveListLine
/// share the content+embedId ordering).
pub fn sticky_type_label(
    content: Option<&str>,
    embed_id: Option<&str>,
    var_text: &str,
    var_embed: &str,
    var_text_embed: &str,
) -> String {
    let has_content = content.map(|s| !s.is_empty()).unwrap_or(false);
    match (has_content, embed_id.is_some()) {
        (true, true) => var_text_embed.to_string(),
        (false, true) => var_embed.to_string(),
        _ => var_text.to_string(),
    }
}

pub fn list_line(
    channel_id: &str,
    content: Option<&str>,
    embed_id: Option<&str>,
    line_text: &str,
    line_embed: &str,
    line_text_embed: &str,
) -> String {
    let channel = format!("<#{channel_id}>");
    match (content.map(|s| !s.is_empty()).unwrap_or(false), embed_id) {
        (true, Some(id)) => line_text_embed
            .replace("${channel}", &channel)
            .replace("${embed_id}", id),
        (false, Some(id)) => line_embed
            .replace("${channel}", &channel)
            .replace("${embed_id}", id),
        _ => line_text.replace("${channel}", &channel),
    }
}

fn fill(template: &str, pairs: &[(&str, &str)]) -> String {
    let mut out = template.to_string();
    for (k, v) in pairs {
        out = out.replace(k, v);
    }
    out
}

async fn yes_markup(http: &std::sync::Arc<serenity::Http>) -> String {
    crate::emojis::app_emoji_markup(http, "Yes")
        .await
        .unwrap_or_default()
}

async fn no_markup(http: &std::sync::Arc<serenity::Http>) -> String {
    crate::emojis::app_emoji_markup(http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StickyStatus {
    Sent,
    MissingConfig,
    MissingEmbed,
    MissingPermissions,
}

pub struct StickyRefresh {
    pub status: StickyStatus,
    pub message_id: Option<u64>,
}

fn refresh_result(status: StickyStatus) -> StickyRefresh {
    StickyRefresh {
        status,
        message_id: None,
    }
}

/// Stored-embed source for the sticky embed variant. `EMBED.<id>`
/// rows are bot-global (metasTable in Events/client/ready.ts), so this
/// reads the global metas store — not the guild table — via
/// `embed::embed_builder::load_stored_embed`, then projects
/// `embedSource` like the TS `embedData?.embedSource` lookup in
/// `HybridCommands/sticky/!embed.ts`.
async fn load_embed_source(pool: &crate::db::Pool, embed_id: &str) -> Option<serde_json::Value> {
    crate::commands::embed::embed_builder::load_stored_embed(pool, embed_id)
        .await?
        .get("embedSource")
        .cloned()
}

/// Delete + resend + store lastMessageId. Mirrors
/// refreshStickyChannel (SendMessages check, embed lookup,
/// send failure → missing_permissions).
pub async fn refresh_sticky(
    http: &std::sync::Arc<serenity::Http>,
    cache: &std::sync::Arc<serenity::Cache>,
    pool: &crate::db::Pool,
    gid: &str,
    guild_id: serenity::GuildId,
    channel_id: serenity::ChannelId,
) -> StickyRefresh {
    let Some(cfg) = load_sticky(pool, gid, channel_id.get()).await else {
        return refresh_result(StickyStatus::MissingConfig);
    };
    let bot_id = cache.current_user().id;
    let can_send = cache
        .guild(guild_id)
        .map(
            |g| match (g.members.get(&bot_id), g.channels.get(&channel_id)) {
                (Some(member), Some(ch)) => g.user_permissions_in(ch, member).send_messages(),
                _ => false,
            },
        )
        .unwrap_or(false);
    if !can_send {
        return refresh_result(StickyStatus::MissingPermissions);
    }
    let mut msg = serenity::CreateMessage::new();
    let mut has = false;
    if let Some(content) = cfg.content.as_deref().filter(|s| !s.is_empty()) {
        msg = msg.content(content);
        has = true;
    }
    if let Some(eid) = cfg.embed_id.as_deref() {
        let Some(src) = load_embed_source(pool, eid).await else {
            return refresh_result(StickyStatus::MissingEmbed);
        };
        msg = msg.embed(crate::commands::embed::embed_builder::build_embed(&src));
        has = true;
    }
    if !has {
        return refresh_result(StickyStatus::MissingEmbed);
    }
    if let Some(last) = cfg
        .last_message_id
        .as_deref()
        .and_then(|s| s.parse::<u64>().ok())
    {
        let _ = channel_id
            .delete_message(http, serenity::MessageId::new(last))
            .await;
    }
    let Ok(sent) = channel_id.send_message(http, msg).await else {
        return refresh_result(StickyStatus::MissingPermissions);
    };
    let mut updated = cfg.clone();
    updated.channel_id = channel_id.get().to_string();
    updated.last_message_id = Some(sent.id.get().to_string());
    let _ = save_sticky(pool, gid, &updated).await;
    StickyRefresh {
        status: StickyStatus::Sent,
        message_id: Some(sent.id.get()),
    }
}

// Per-channel serialization (TS stickyRefreshQueue) + 5s debounce
// (TS stickyRefreshTimeouts with reset-on-message).
static STICKY_LOCKS: Lazy<Mutex<HashMap<u64, Arc<tokio::sync::Mutex<()>>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static STICKY_TIMERS: Lazy<Mutex<HashMap<u64, tokio::task::JoinHandle<()>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Queued refresh (replaces queueStickyChannelRefresh).
pub async fn refresh_queued(
    http: &std::sync::Arc<serenity::Http>,
    cache: &std::sync::Arc<serenity::Cache>,
    pool: &crate::db::Pool,
    gid: &str,
    guild_id: serenity::GuildId,
    channel_id: serenity::ChannelId,
) -> StickyRefresh {
    // Poison-tolerant: a panicking holder must not cascade into
    // every later refresh (TS has no shared lock to poison).
    let lock = STICKY_LOCKS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .entry(channel_id.get())
        .or_default()
        .clone();
    let _guard = lock.lock().await;
    refresh_sticky(http, cache, pool, gid, guild_id, channel_id).await
}

/// Debounced schedule: reset the 5s timer on every message
/// (replaces scheduleStickyChannelRefresh).
pub fn schedule_refresh(
    http: std::sync::Arc<serenity::Http>,
    cache: std::sync::Arc<serenity::Cache>,
    pool: crate::db::Pool,
    gid: String,
    guild_id: serenity::GuildId,
    channel_id: serenity::ChannelId,
) {
    let mut timers = STICKY_TIMERS.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(old) = timers.remove(&channel_id.get()) {
        old.abort();
    }
    timers.insert(
        channel_id.get(),
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_secs(5)).await;
            refresh_queued(&http, &cache, &pool, &gid, guild_id, channel_id).await;
        }),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_layout() {
        assert_eq!(sticky_key(123), "STICKY.123");
    }

    #[test]
    fn ts_row_shape_parses() {
        let cfg: StickyConfig = serde_json::from_str(
            r#"{"channelId":"9","content":"hi","embedId":"e","lastMessageId":"m","enabled":true}"#,
        )
        .unwrap();
        assert_eq!(cfg.content.as_deref(), Some("hi"));
        assert_eq!(cfg.embed_id.as_deref(), Some("e"));
        assert_eq!(cfg.last_message_id.as_deref(), Some("m"));
        assert!(cfg.enabled);
        // Legacy Rust rows keep working.
        let old: StickyConfig = serde_json::from_str(r#"{"message":"hi","embed_id":"e"}"#).unwrap();
        assert_eq!(old.content.as_deref(), Some("hi"));
        assert_eq!(old.embed_id.as_deref(), Some("e"));
        assert!(old.enabled);
    }

    #[test]
    fn type_labels_match_ts() {
        assert_eq!(
            sticky_type_label(Some("hi"), Some("e"), "T", "E", "TE"),
            "TE"
        );
        assert_eq!(sticky_type_label(None, Some("e"), "T", "E", "TE"), "E");
        assert_eq!(sticky_type_label(Some("hi"), None, "T", "E", "TE"), "T");
        assert_eq!(sticky_type_label(Some(""), None, "T", "E", "TE"), "T");
    }

    #[test]
    fn list_lines_match_ts() {
        assert_eq!(
            list_line(
                "1",
                Some("hi"),
                Some("e"),
                "T ${channel}",
                "E ${channel} `${embed_id}`",
                "TE ${channel} `${embed_id}`"
            ),
            "TE <#1> `e`"
        );
        assert_eq!(
            list_line(
                "1",
                None,
                Some("e"),
                "T ${channel}",
                "E ${channel} `${embed_id}`",
                "TE ${channel} `${embed_id}`"
            ),
            "E <#1> `e`"
        );
        assert_eq!(
            list_line("1", Some("hi"), None, "T ${channel}", "E", "TE"),
            "T <#1>"
        );
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    fn sticky_cfg(channel: &str, content: &str) -> StickyConfig {
        StickyConfig {
            channel_id: channel.to_string(),
            content: Some(content.to_string()),
            embed_id: None,
            last_message_id: None,
            enabled: true,
        }
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_sticky(&pool, "g1", &sticky_cfg("11", "hi"))
            .await
            .unwrap();
        assert_eq!(
            load_sticky(&pool, "g1", 11)
                .await
                .unwrap()
                .content
                .as_deref(),
            Some("hi")
        );
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "STICKY.11").await;
        assert_eq!(legacy, None);
        // Legacy rows still read (single + union scan).
        crate::db::kv_set(
            &pool,
            "g1",
            &sticky_key(22),
            r#"{"channelId":"22","content":"old"}"#,
        )
        .await
        .unwrap();
        assert_eq!(
            load_sticky(&pool, "g1", 22)
                .await
                .unwrap()
                .content
                .as_deref(),
            Some("old")
        );
        assert_eq!(load_all_stickies(&pool, "g1").await.len(), 2);
        // Delete clears both stores.
        crate::db::kv_set(
            &pool,
            "g1",
            &sticky_key(11),
            r#"{"channelId":"11","content":"stale"}"#,
        )
        .await
        .unwrap();
        delete_sticky(&pool, "g1", 11).await;
        assert!(load_sticky(&pool, "g1", 11).await.is_none());
        assert_eq!(load_all_stickies(&pool, "g1").await.len(), 1);
    }
}

pub mod disable;
pub mod embed;
pub mod list;
pub mod refresh;
pub mod show;
#[allow(clippy::module_inception)]
pub mod sticky;
pub mod text;

/// Old registry path (`sticky::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::disable::*;
    pub use super::embed::*;
    pub use super::list::*;
    pub use super::refresh::*;
    pub use super::show::*;
    pub use super::sticky::*;
    pub use super::text::*;
    pub use super::*;
}
