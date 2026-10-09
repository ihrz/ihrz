// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/sticky/* via
// core/modules/stickyMessageManager.ts.
//
// TS keys: <guild>.STICKY.<channelId> StickyChannelConfig
// ({channelId, content, embedId, lastMessageId, enabled});
// EMBED.<id> lookup for the embed variant.

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

/// Enabled configs only (TS getStickyChannelConfig returns null
/// when `!config?.enabled`).
pub async fn load_sticky(
    pool: &crate::db::Pool,
    guild_id: &str,
    channel_id: u64,
) -> Option<StickyConfig> {
    crate::db::kv_get(pool, guild_id, &sticky_key(channel_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
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

async fn load_embed_source(
    pool: &crate::db::Pool,
    gid: &str,
    embed_id: &str,
) -> Option<serde_json::Value> {
    let raw = crate::db::kv_get(pool, gid, &format!("EMBED.{embed_id}")).await?;
    serde_json::from_str::<serde_json::Value>(&raw)
        .ok()?
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
        let Some(src) = load_embed_source(pool, gid, eid).await else {
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
    let _ = crate::db::kv_set(
        pool,
        gid,
        &sticky_key(channel_id.get()),
        &serde_json::to_string(&updated).unwrap_or_default(),
    )
    .await;
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
