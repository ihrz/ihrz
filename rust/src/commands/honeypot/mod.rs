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

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed raw read with legacy flat-row fallback: table JSON
/// values stringify, plain strings pass through, legacy rows as-is.
async fn load_honeypot_raw(pool: &crate::db::Pool, guild_id: &str) -> Option<String> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(honeypot_key()).await {
        return match v {
            serde_json::Value::String(s) => Some(s),
            other => Some(other.to_string()),
        };
    }
    crate::db::kv_get(pool, guild_id, honeypot_key()).await
}

/// Table-routed write for the trap blob (keys unchanged).
async fn save_honeypot(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &serde_json::Value,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(honeypot_key(), cfg)
        .await
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
    let enabled: bool = load_honeypot_raw(pool, &gid)
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
    let pool_clone = pool.clone();
    tokio::spawn(async move {
        // Two-pass trap window like TS (1500ms + 8000ms): honor the
        // configured action, never a fixed ban; post to the logs channel.
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        let trap = parse_trap_config(load_honeypot_raw(&pool_clone, &gid).await);
        let sanction = post::resolve_claim_sanction(&trap.action);
        // Kickable/bannable pre-check (mirrors applyConfiguredAction and
        // the discord.js kickable/bannable flags): the bot needs the
        // Kick/BanMembers permission plus role hierarchy over the target,
        // and the target must not own the guild. Otherwise failed.
        let bot_id = http.get_current_user().await.map(|u| u.id).ok();
        let guild_roles = http.get_guild_roles(guild_id).await.unwrap_or_default();
        let bot_roles: Vec<serenity::RoleId> = match bot_id {
            Some(id) => guild_id
                .member(&http, id)
                .await
                .map(|m| m.roles)
                .unwrap_or_default(),
            None => Vec::new(),
        };
        let mut bot_perms = serenity::Permissions::empty();
        let mut bot_top: u16 = 0;
        for r in &guild_roles {
            if bot_roles.contains(&r.id) {
                bot_perms |= r.permissions;
                bot_top = bot_top.max(r.position);
            }
            if r.id.get() == guild_id.get() {
                bot_perms |= r.permissions;
            }
        }
        if bot_perms.administrator() {
            bot_perms = serenity::Permissions::all();
        }
        let target = guild_id.member(&http, user_id).await.ok();
        let target_top: Option<u16> = target.as_ref().map(|m| {
            m.roles
                .iter()
                .filter_map(|id| guild_roles.iter().find(|r| &r.id == id))
                .map(|r| r.position)
                .max()
                .unwrap_or(0)
        });
        let is_owner = guild_id
            .to_partial_guild(&http)
            .await
            .map(|g| g.owner_id == user_id)
            .unwrap_or(false);
        let manageable =
            target.is_some() && !is_owner && target_top.map(|t| bot_top > t).unwrap_or(false);
        let result = post::sanction_applicable(
            sanction,
            manageable && bot_perms.kick_members(),
            manageable && bot_perms.ban_members(),
        );
        match result {
            "ban" => {
                let _ =
                    ban_with_cleanup_window(&http, guild_id, user_id, "Honeypot triggered").await;
            }
            "kick" => {
                let _ = guild_id.kick(&http, user_id).await;
            }
            _ => {}
        }
        if post::should_post_claim_log(&trap.logs_channel_id) {
            if let Ok(chan_id) = trap.logs_channel_id.parse::<u64>() {
                let chan = serenity::ChannelId::new(chan_id);
                let code = crate::db::guild_lang(&pool_clone, Some(guild_id.get())).await;
                let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
                let action_label = t(post::claim_log_key(result));
                let action_label = if action_label.trim().is_empty() {
                    result.to_string()
                } else {
                    action_label
                };
                let title = t("honeypot_log_title");
                let title = if title.trim().is_empty() {
                    format!("Honeypot Triggered - {action_label}")
                } else {
                    title.replace("${action}", &action_label)
                };
                let _ = chan
                    .say(&http, format!("<@{}>: {title}", user_id.get()))
                    .await;
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(6500)).await;
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

/// Next per-key trap trigger count. Mirrors the nextTriggerCount
/// increment in scheduleHoneypotTrigger: each message on the same
/// guild.channel.user key bumps the count, and the pipeline consumes
/// (resets) it. Pure, unit-tested.
pub fn next_trigger_count(prev: Option<u64>) -> u64 {
    prev.map(|n| n.saturating_add(1)).unwrap_or(1)
}

/// Debounced trap entry: at most one pipeline per
/// guild.channel.user, 1500ms delay, latest message wins.
/// Mirrors scheduleHoneypotTrigger/queueHoneypotTrigger.
pub fn schedule_trap(ctx: &serenity::Context, pool: &crate::db::Pool, msg: &serenity::Message) {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};
    static SEQS: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
    static COUNTS: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
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
    // Per-key trigger count (mirrors nextTriggerCount): every message on
    // the same key bumps it; the winning pipeline run consumes it.
    {
        let map = COUNTS.get_or_init(|| Mutex::new(HashMap::new()));
        let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
        let n = next_trigger_count(guard.get(&key).copied());
        guard.insert(key.clone(), n);
    }
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
        // Consume this key's trigger count like processHoneypotTrigger
        // consumes scheduledTrigger.triggerCount.
        let trigger_count = COUNTS
            .get()
            .and_then(|m| m.lock().ok())
            .and_then(|mut g| g.remove(&key))
            .unwrap_or(1);
        if let Err(e) =
            run_trap_pipeline(&http, &pool, guild_id, channel_id, msg_id, trigger_count).await
        {
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
    trigger_count: u64,
) -> anyhow::Result<()> {
    let gid = guild_id.get().to_string();
    let msg = channel_id.message(http, msg_id).await?;
    let trap = parse_trap_config(load_honeypot_raw(pool, &gid).await);
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
            if ban_with_cleanup_window(http, guild_id, msg.author.id, "Honeypot triggered").await {
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
    if let Some(raw) = load_honeypot_raw(pool, &gid).await {
        if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(obj) = v.as_object_mut() {
                obj.insert(
                    "lastTriggeredAt".into(),
                    serde_json::json!(crate::commands::context::now_ms()),
                );
                let _ = save_honeypot(pool, &gid, &v).await;
            }
        }
    }
    // 5. Logs channel (mirrors sendLogs: real triggerCount, result row,
    // first-image attachment, var_none fallbacks via build_claim_log_embed).
    if trap.logs_channel_id.trim().is_empty() {
        return Ok(());
    }
    let Ok(logs_id) = trap.logs_channel_id.trim().parse::<u64>() else {
        return Ok(());
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
    // First image attachment mirrors the TS setImage(firstImageAttachment)
    // lookup (image content-type or known width).
    let first_image = msg
        .attachments
        .iter()
        .find(|a| {
            a.content_type
                .as_deref()
                .map(|c| c.starts_with("image/"))
                .unwrap_or(false)
                || a.width.is_some()
        })
        .map(|a| a.url.as_str());
    let author_mention = format!("<@{}>", msg.author.id.get());
    let author_id = msg.author.id.get().to_string();
    let channel_mention = format!("<#{}>", channel_id.get());
    let log_data = post::ClaimLogData {
        author_mention: &author_mention,
        author_id: &author_id,
        channel_mention: &channel_mention,
        trigger_count,
        deleted_count: deleted,
        embed_count: msg.embeds.len(),
        dm_delivered,
        message_content: &msg.content,
        attachment_urls: &attachments,
        sticker_names: &stickers,
        first_image_url: first_image,
        action_result,
    };
    let log_embed = post::build_claim_log_embed(&text, &log_data);
    let _ = serenity::ChannelId::new(logs_id)
        .send_message(http, serenity::CreateMessage::new().embed(log_embed))
        .await;
    Ok(())
}

/// Two-hour window (ms) for the manual cleanup sweeps and the native ban
/// deletion alike. Mirrors HONEYPOT_WINDOW_MS.
pub const HONEYPOT_WINDOW_MS: i64 = 2 * 3_600_000;

/// Ban honoring the TS 2h native message-deletion window
/// (`deleteMessageSeconds: 7200`). The bulk-ban endpoint is the only
/// single-call path with second-granularity deletion, so it goes first;
/// on failure fall back to a classic ban since the manual sweeps delete
/// the rest anyway.
pub async fn ban_with_cleanup_window(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
    reason: &str,
) -> bool {
    if let Ok(res) = guild_id
        .bulk_ban(http, &[user_id], post::CLAIM_BAN_DELETE_SECS, Some(reason))
        .await
    {
        if res.banned_users.contains(&user_id) {
            return true;
        }
    }
    guild_id
        .ban_with_reason(http, user_id, 0, reason)
        .await
        .is_ok()
}

/// Channel kinds swept for trap spam. Mirrors isHoneypotChannel in
/// honeypotManager.ts (text, announcement, voice, forum, media, stage).
/// serenity 0.12 has no Media variant, so GuildMedia (type 16) arrives
/// as Unknown(16) and is matched by discriminant. Pure, unit-tested.
pub fn sweepable_kind(kind: &serenity::model::channel::ChannelType) -> bool {
    use serenity::model::channel::ChannelType as T;
    matches!(
        kind,
        T::Text | T::News | T::Voice | T::Forum | T::Stage | T::Unknown(16)
    )
}

/// Channel ids to sweep: guild text-like channels plus active threads plus
/// archived public threads of text/announcement/forum parents. Mirrors
/// collectChannels (fetch + fetchActiveThreads + fetchArchived public).
async fn collect_sweep_channels(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
) -> Vec<serenity::ChannelId> {
    use serenity::model::channel::ChannelType;
    let mut ids: Vec<serenity::ChannelId> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let channels = guild_id.channels(http).await.unwrap_or_default();
    let mut parents: Vec<serenity::ChannelId> = Vec::new();
    for (id, ch) in &channels {
        if sweepable_kind(&ch.kind) {
            if seen.insert(id.get()) {
                ids.push(*id);
            }
            if matches!(
                ch.kind,
                ChannelType::Text | ChannelType::News | ChannelType::Forum
            ) {
                parents.push(*id);
            }
        }
    }
    // Active threads (never cache-only: uncached threads would keep spam).
    if let Ok(active) = guild_id.get_active_threads(http).await {
        for t in &active.threads {
            if seen.insert(t.id.get()) {
                ids.push(t.id);
            }
        }
    }
    // Best effort: spam may also sit in archived threads.
    for parent in parents {
        let mut before: Option<u64> = None;
        loop {
            let page = match http
                .get_channel_archived_public_threads(parent, before, Some(100))
                .await
            {
                Ok(p) => p,
                Err(_) => break,
            };
            let n = page.threads.len();
            for t in &page.threads {
                if seen.insert(t.id.get()) {
                    ids.push(t.id);
                }
            }
            if n < 100 {
                break;
            }
            before = page.threads.last().map(|t| t.id.get());
            if before.is_none() {
                break;
            }
        }
    }
    ids
}

/// Paginated per-channel sweep with the 2h cutoff. Mirrors one
/// deleteRecentMessages channel pass (100/fetch, single delete or bulk,
/// stop at cutoff or channel start).
async fn sweep_channel_messages(
    http: &std::sync::Arc<serenity::Http>,
    channel_id: serenity::ChannelId,
    user_id: serenity::UserId,
    cutoff_ms: i64,
) -> u64 {
    let mut deleted = 0u64;
    let mut before: Option<serenity::MessageId> = None;
    loop {
        let mut get = serenity::GetMessages::new().limit(100);
        if let Some(b) = before {
            get = get.before(b);
        }
        let Ok(fetched) = channel_id.messages(http, get).await else {
            break;
        };
        if fetched.is_empty() {
            break;
        }
        let targets: Vec<&serenity::Message> = fetched
            .iter()
            .filter(|m| m.author.id == user_id && m.timestamp.unix_timestamp() * 1000 >= cutoff_ms)
            .collect();
        if targets.len() == 1 {
            if targets[0].delete(http).await.is_ok() {
                deleted += 1;
            }
        } else if targets.len() > 1 {
            let ids: Vec<serenity::MessageId> = targets.iter().map(|m| m.id).collect();
            let n = ids.len() as u64;
            if channel_id.delete_messages(http, &ids).await.is_ok() {
                deleted += n;
            }
        }
        let oldest = fetched.last();
        let done = oldest.map(|m| m.timestamp.unix_timestamp() * 1000 < cutoff_ms);
        if done.unwrap_or(true) || fetched.len() < 100 {
            break;
        }
        before = oldest.map(|m| m.id);
    }
    deleted
}

/// Delete one user's messages from the last 2h across guild text channels,
/// active threads and archived public threads. Mirrors deleteRecentMessages
/// (100/fetch pagination, single delete or bulk, stops at cutoff).
/// Returns deleted count.
pub async fn sweep_user_messages(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
) -> u64 {
    let cutoff_ms = crate::commands::context::now_ms() - HONEYPOT_WINDOW_MS;
    let mut deleted = 0u64;
    for id in collect_sweep_channels(http, guild_id).await {
        deleted += sweep_channel_messages(http, id, user_id, cutoff_ms).await;
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

    #[test]
    fn sweep_window_is_two_hours() {
        assert_eq!(HONEYPOT_WINDOW_MS, 7_200_000);
        assert_eq!(
            HONEYPOT_WINDOW_MS / 1000,
            post::CLAIM_BAN_DELETE_SECS as i64
        );
    }

    #[test]
    fn trigger_count_starts_at_one_and_increments() {
        assert_eq!(next_trigger_count(None), 1);
        assert_eq!(next_trigger_count(Some(1)), 2);
        assert_eq!(next_trigger_count(Some(7)), 8);
        // Saturates instead of wrapping at the top of the range.
        assert_eq!(next_trigger_count(Some(u64::MAX)), u64::MAX);
    }

    #[test]
    fn sweep_covers_ts_channel_kinds_including_media() {
        use poise::serenity_prelude::ChannelType;
        for kind in [
            ChannelType::Text,
            ChannelType::News,
            ChannelType::Voice,
            ChannelType::Forum,
            ChannelType::Stage,
            // GuildMedia (16): no serenity 0.12 variant.
            ChannelType::Unknown(16),
        ] {
            assert!(sweepable_kind(&kind), "swept: {kind:?}");
        }
        for kind in [
            ChannelType::Category,
            ChannelType::Private,
            ChannelType::GroupDm,
            ChannelType::PublicThread,
            ChannelType::PrivateThread,
            ChannelType::NewsThread,
            ChannelType::Directory,
            ChannelType::Unknown(99),
        ] {
            assert!(!sweepable_kind(&kind), "skipped: {kind:?}");
        }
    }

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_honeypot(
            &pool,
            "g1",
            &serde_json::json!({"enabled": true, "channelId": "3"}),
        )
        .await
        .unwrap();
        let trap = parse_trap_config(load_honeypot_raw(&pool, "g1").await);
        assert!(trap.enabled);
        assert_eq!(trap.channel_id, "3");
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.HONEYPOT'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap();
        assert_eq!(legacy, None);
        // Legacy rows still read, table wins over legacy.
        crate::db::kv_set(&pool, "g2", honeypot_key(), r#"{"enabled":true}"#)
            .await
            .unwrap();
        assert!(parse_trap_config(load_honeypot_raw(&pool, "g2").await).enabled);
        crate::db::kv_set(&pool, "g1", honeypot_key(), r#"{"enabled":false}"#)
            .await
            .unwrap();
        assert!(parse_trap_config(load_honeypot_raw(&pool, "g1").await).enabled);
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
