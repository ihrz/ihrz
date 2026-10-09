// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/honeypot/* (config) +
// honeypotManager lure trigger (simplified single-pass).
//
// TS keys: GUILD.HONEYPOT {enabled, channelId}. TS runs two passes
// (1500ms + 8000ms) in a 2h window; the Rust port bans on lure claim
// after a 2s grace delay. Custom_id: honeypot-claim.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub const HONEYPOT_CUSTOM_ID: &str = "honeypot-claim";

pub fn honeypot_key() -> &'static str {
    "GUILD.HONEYPOT"
}

/// Lure claim handler: grace delay, then ban if still enabled.
pub async fn handle_honeypot_claim(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let enabled: bool = crate::db::kv_get(pool, &gid, honeypot_key())
        .await
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.get("enabled").and_then(|e| e.as_bool()))
        .unwrap_or(false);
    if !enabled {
        return Ok(());
    }
    let user_id = comp.user.id;
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content("Checking...")
                .ephemeral(true),
        ),
    )
    .await?;
    let http = ctx.http.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        let _ = guild_id.ban(&http, user_id, 0).await;
    });
    Ok(())
}

/// Honeypot trap config. Mirrors GUILD.HONEYPOT
/// {enabled, channelId, action, logsChannelId} (action defaults to
/// "none" like the TS schema).
pub struct HoneypotTrap {
    pub enabled: bool,
    pub channel_id: String,
    pub action: String,
    pub logs_channel_id: String,
}

/// Parse the trap config blob. Missing action means "none".
pub fn parse_trap_config(raw: Option<String>) -> HoneypotTrap {
    let v: serde_json::Value = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::Value::Null);
    HoneypotTrap {
        enabled: v.get("enabled").and_then(|e| e.as_bool()).unwrap_or(false),
        channel_id: v
            .get("channelId")
            .and_then(|c| c.as_str())
            .unwrap_or_default()
            .to_string(),
        action: v
            .get("action")
            .and_then(|a| a.as_str())
            .unwrap_or("none")
            .to_string(),
        logs_channel_id: v
            .get("logsChannelId")
            .and_then(|c| c.as_str())
            .unwrap_or_default()
            .to_string(),
    }
}

/// Truncate a log field. Mirrors truncate() (1024 + ...).
pub fn truncate_field(s: &str) -> String {
    const MAX: usize = 1024;
    if s.len() <= MAX {
        return s.to_string();
    }
    format!("{}...", &s[..MAX - 3])
}

/// Debounced trap entry: at most one pipeline per
/// guild.channel.user, 1500ms delay, latest message wins.
/// Mirrors scheduleHoneypotTrigger/queueHoneypotTrigger.
pub fn schedule_trap(ctx: &serenity::Context, pool: &crate::db::Pool, msg: &serenity::Message) {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static SEQS: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
    let Some(guild_id) = msg.guild_id else {
        return;
    };
    if msg.author.bot || msg.webhook_id.is_some() {
        return;
    }
    // Staff are exempt (mirrors Events/honeypot/honeypot.ts).
    if let Some(perms) = msg.member.as_ref().and_then(|m| m.permissions) {
        if perms.administrator()
            || perms.manage_guild()
            || perms.ban_members()
            || perms.kick_members()
        {
            return;
        }
    }
    let key = format!(
        "{}.{}.{}",
        guild_id.get(),
        msg.channel_id.get(),
        msg.author.id.get()
    );
    let seq = {
        let map = SEQS.get_or_init(|| Mutex::new(HashMap::new()));
        let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
        let n = guard.get(&key).copied().unwrap_or(0) + 1;
        guard.insert(key.clone(), n);
        n
    };
    let http = ctx.http.clone();
    let pool = pool.clone();
    let msg_id = msg.id;
    let channel_id = msg.channel_id;
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        let current = SEQS
            .get()
            .and_then(|m| m.lock().ok())
            .and_then(|g| g.get(&key).copied());
        if current != Some(seq) {
            return;
        }
        if let Err(e) = run_trap_pipeline(&http, &pool, guild_id, channel_id, msg_id).await {
            tracing::warn!("honeypot pipeline failed: {e}");
        }
    });
}

/// Full trap pipeline: DM notify -> kick/ban -> two cleanup sweeps
/// (8s apart, 2h window) -> logs channel. Mirrors
/// processHoneypotTrigger.
pub async fn run_trap_pipeline(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    guild_id: serenity::GuildId,
    channel_id: serenity::ChannelId,
    msg_id: serenity::MessageId,
) -> anyhow::Result<()> {
    let gid = guild_id.get().to_string();
    let msg = channel_id.message(http, msg_id).await?;
    let trap = parse_trap_config(crate::db::kv_get(pool, &gid, honeypot_key()).await);
    if !trap.enabled
        || trap.channel_id.is_empty()
        || channel_id.get().to_string() != trap.channel_id
    {
        return Ok(());
    }
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    // 1. DM notify (best effort).
    let dm_action = match trap.action.as_str() {
        "ban" => text("honeypot_dm_action_banned"),
        "kick" => text("honeypot_dm_action_kicked"),
        "none" => text("honeypot_dm_action_none"),
        _ => text("honeypot_action_failed"),
    };
    let guild_name = guild_id
        .to_partial_guild(http)
        .await
        .map(|g| g.name.clone())
        .unwrap_or_default();
    let dm_embed = serenity::CreateEmbed::default()
        .colour(0xD88A3D_u32)
        .thumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
        .title(text("honeypot_dm_title"))
        .description(
            text("honeypot_dm_desc")
                .replace("${guild}", &guild_name)
                .replace("${action}", &dm_action),
        );
    let dm_delivered = msg
        .author
        .direct_message(http, serenity::CreateMessage::new().embed(dm_embed))
        .await
        .is_ok();
    // 2. Sanction first (stops the bleeding).
    let action_result = match trap.action.as_str() {
        "kick" => {
            if guild_id
                .kick_with_reason(http, msg.author.id, "Honeypot triggered")
                .await
                .is_ok()
            {
                "kick"
            } else {
                "failed"
            }
        }
        "ban" => {
            if guild_id
                .ban_with_reason(http, msg.author.id, 0, "Honeypot triggered")
                .await
                .is_ok()
            {
                "ban"
            } else {
                "failed"
            }
        }
        _ => "none",
    };
    // 3. Two cleanup sweeps, 8s apart.
    let first = sweep_user_messages(http, guild_id, msg.author.id).await;
    tokio::time::sleep(std::time::Duration::from_millis(8000)).await;
    let second = sweep_user_messages(http, guild_id, msg.author.id).await;
    let deleted = first + second;
    // 4. Persist lastTriggeredAt like the TS manager.
    if let Some(raw) = crate::db::kv_get(pool, &gid, honeypot_key()).await {
        if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(obj) = v.as_object_mut() {
                obj.insert(
                    "lastTriggeredAt".into(),
                    serde_json::json!(crate::commands::context::now_ms()),
                );
                let _ = crate::db::kv_set(pool, &gid, honeypot_key(), &v.to_string()).await;
            }
        }
    }
    // 5. Logs channel.
    if trap.logs_channel_id.trim().is_empty() {
        return Ok(());
    }
    let Ok(logs_id) = trap.logs_channel_id.trim().parse::<u64>() else {
        return Ok(());
    };
    let log_action = match action_result {
        "ban" => text("honeypot_log_action_ban"),
        "kick" => text("honeypot_log_action_kick"),
        "none" => text("honeypot_log_action_none"),
        _ => text("honeypot_action_failed"),
    };
    let attachments = msg
        .attachments
        .iter()
        .map(|a| a.url.clone())
        .collect::<Vec<_>>()
        .join("\n");
    let stickers = msg
        .sticker_items
        .iter()
        .map(|s| s.name.clone())
        .collect::<Vec<_>>()
        .join("\n");
    let message_text = if msg.content.trim().is_empty() {
        text("honeypot_log_no_content")
    } else {
        msg.content.clone()
    };
    let attachments_text = if attachments.is_empty() {
        text("honeypot_log_no_content")
    } else {
        attachments
    };
    let stickers_text = if stickers.is_empty() {
        text("honeypot_log_no_content")
    } else {
        stickers
    };
    let log_embed = serenity::CreateEmbed::default()
        .colour(0xD88A3D_u32)
        .thumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
        .title(text("honeypot_log_title").replace("${action}", &log_action))
        .timestamp(msg.timestamp)
        .field(
            text("honeypot_log_field_author"),
            truncate_field(&format!(
                "<@{}>\n`{}`",
                msg.author.id.get(),
                msg.author.id.get()
            )),
            true,
        )
        .field(
            text("honeypot_log_field_channel"),
            format!("<#{}>", channel_id.get()),
            true,
        )
        .field(
            text("honeypot_log_field_triggered_messages"),
            "`1`".to_string(),
            true,
        )
        .field(
            text("honeypot_log_field_deleted_messages"),
            format!("`{deleted}`"),
            true,
        )
        .field(
            text("honeypot_log_field_embeds"),
            format!("`{}`", msg.embeds.len()),
            true,
        )
        .field(
            text("honeypot_log_field_dm_status"),
            if dm_delivered {
                text("honeypot_log_dm_open")
            } else {
                text("honeypot_log_dm_closed")
            },
            true,
        )
        .field(
            text("honeypot_log_field_message"),
            truncate_field(&message_text),
            false,
        )
        .field(
            text("honeypot_log_field_attachments"),
            truncate_field(&attachments_text),
            false,
        )
        .field(
            text("honeypot_log_field_stickers"),
            truncate_field(&stickers_text),
            false,
        );
    let _ = serenity::ChannelId::new(logs_id)
        .send_message(http, serenity::CreateMessage::new().embed(log_embed))
        .await;
    Ok(())
}

/// Delete one user's messages from the last 2h across guild text
/// channels. Mirrors deleteRecentMessages (100/fetch pagination,
/// single delete or bulk, stops at cutoff). Returns deleted count.
pub async fn sweep_user_messages(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
) -> u64 {
    use serenity::model::channel::ChannelType;
    let cutoff = crate::commands::context::now_ms() - 2 * 3_600_000;
    let channels = guild_id.channels(http).await.unwrap_or_default();
    let mut deleted = 0u64;
    for (id, ch) in channels {
        if !matches!(
            ch.kind,
            ChannelType::Text | ChannelType::News | ChannelType::Voice
        ) {
            continue;
        }
        let mut before: Option<serenity::MessageId> = None;
        loop {
            let mut get = serenity::GetMessages::new().limit(100);
            if let Some(b) = before {
                get = get.before(b);
            }
            let Ok(fetched) = id.messages(http, get).await else {
                break;
            };
            if fetched.is_empty() {
                break;
            }
            let targets: Vec<&serenity::Message> = fetched
                .iter()
                .filter(|m| m.author.id == user_id && m.timestamp.unix_timestamp() * 1000 >= cutoff)
                .collect();
            if targets.len() == 1 {
                if targets[0].delete(http).await.is_ok() {
                    deleted += 1;
                }
            } else if targets.len() > 1 {
                let ids: Vec<serenity::MessageId> = targets.iter().map(|m| m.id).collect();
                let n = ids.len() as u64;
                if id.delete_messages(http, &ids).await.is_ok() {
                    deleted += n;
                }
            }
            let oldest = fetched.last();
            let done = oldest.map(|m| m.timestamp.unix_timestamp() * 1000 < cutoff);
            if done.unwrap_or(true) || fetched.len() < 100 {
                break;
            }
            before = oldest.map(|m| m.id);
        }
    }
    deleted
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trap_config_parses_and_defaults() {
        let none = parse_trap_config(None);
        assert!(!none.enabled);
        assert_eq!(none.action, "none");
        let full = parse_trap_config(Some(
            r#"{"enabled":true,"channelId":"1","action":"ban","logsChannelId":"2"}"#.to_string(),
        ));
        assert!(full.enabled);
        assert_eq!(full.channel_id, "1");
        assert_eq!(full.action, "ban");
        assert_eq!(full.logs_channel_id, "2");
    }

    #[test]
    fn truncate_field_caps_at_1024() {
        assert_eq!(truncate_field("abc"), "abc");
        let long = "x".repeat(2000);
        let out = truncate_field(&long);
        assert_eq!(out.len(), 1024);
        assert!(out.ends_with("..."));
    }

    #[test]
    fn key_shape() {
        assert_eq!(honeypot_key(), "GUILD.HONEYPOT");
    }
}

pub mod config;
#[allow(clippy::module_inception)]
pub mod honeypot;
pub mod post;

/// Old registry path (`honeypot::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::config::*;
    pub use super::honeypot::*;
    pub use super::post::*;
    pub use super::*;
}
