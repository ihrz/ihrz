// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Serenity event handler. Mirrors src/Events/** dispatch (95 files) +
// src/core/handlers/loadEvent.ts binding.
//
// Strategy: best-effort, never panic. Every DB access is optional-chained;
// failures are traced, never propagated. Pure decisions live in events.rs
// / voice.rs (unit-tested); this file only does Discord + KV I/O.

use crate::db::Pool;
use poise::serenity_prelude as serenity;
use poise::serenity_prelude::Mentionable;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

/// Invite uses cache: guild -> code -> (uses, inviter).
type InviteCache = HashMap<String, HashMap<String, (u64, u64)>>;

#[derive(Clone)]
pub struct Handler {
    pub pool: Pool,
    /// Sliding-window message timestamps per (guild,user).
    /// Mirrors Events/antispam in-memory raidInfo cache.
    pub spam: Arc<tokio::sync::Mutex<HashMap<String, Vec<i64>>>>,
    /// Invite uses cache per guild: code -> (uses, inviter).
    /// Mirrors invitemanager onInviteCreate/Delete tracking.
    pub invites: Arc<tokio::sync::Mutex<InviteCache>>,
    /// Guilds already owner-sealed this boot.
    /// Mirrors guildOwnerSafetySetWhenMessage already_visited.
    pub sealed: Arc<tokio::sync::Mutex<std::collections::HashSet<String>>>,
    /// Pending security captcha challenges: "guild.user" -> challenge.
    /// Mirrors Events/security/onMemberJoin.ts (message-collector flow).
    pub security: Arc<tokio::sync::Mutex<HashMap<String, SecurityChallenge>>>,
    /// Slash-command file log. Mirrors Events/logs/slashCommandLogger.ts
    /// (SafeJSONLogger at src/files/slash.log.json).
    pub slashlog: Arc<crate::slashlog::SlashLog>,
    /// Guilds with a protection restore currently running.
    /// Mirrors restorationInProgress in avoidChannelDelete.ts.
    pub restoring: Arc<tokio::sync::Mutex<HashSet<String>>>,
}

/// Pending captcha challenge for a newcomer.
pub struct SecurityChallenge {
    pub channel_id: u64,
    pub message_id: u64,
    pub user_id: u64,
    pub code: String,
    pub attempts_left: u8,
    pub role: Option<u64>,
    pub role2: Option<u64>,
    pub joined_at: Option<i64>,
}

/// Key for the pending-challenge map.
pub fn security_key(guild_id: u64, user_id: u64) -> String {
    format!("{guild_id}.{user_id}")
}

/// Captcha code alphabet. Mirrors generateRandomCode in
/// Events/security/onMemberJoin.ts (no J, 7 chars).
pub const SECURITY_CODE_ALPHABET: &str = "ABCDEFGHIKLMNOPQRSTUVWXYZ0123456789";

/// Generate a 7-char captcha code.
pub fn security_code() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let alpha: Vec<char> = SECURITY_CODE_ALPHABET.chars().collect();
    (0..7)
        .map(|_| alpha[rng.gen_range(0..alpha.len())])
        .collect()
}

/// Welcome target: system channel, else the lowest-position text
/// channel. Mirrors the guildCreate.ts channel pick.
pub fn welcome_channel(guild: &serenity::Guild) -> Option<serenity::ChannelId> {
    if let Some(ch) = guild.system_channel_id {
        return Some(ch);
    }
    guild
        .channels
        .values()
        .filter(|c| c.kind == serenity::ChannelType::Text)
        .min_by_key(|c| c.position)
        .map(|c| c.id)
}

/// Snapshot entry for a deleted channel id: top-level first, then
/// nested inside categories. None when the channel was never
/// snapshotted (created after the last backup). Pure, unit-tested.
pub fn backup_channel_for<'a>(
    backup: &'a crate::commands::protection::backup::GuildBackup,
    channel_id: &str,
) -> Option<&'a crate::commands::protection::backup::BackupChannel> {
    backup
        .channels
        .iter()
        .find(|c| c.id == channel_id)
        .or_else(|| {
            backup
                .categories
                .iter()
                .flat_map(|cat| cat.channels.iter())
                .find(|c| c.id == channel_id)
        })
}

/// Snapshot entry for a deleted category id. None when the category
/// was never snapshotted. Pure, unit-tested.
pub fn backup_category_for<'a>(
    backup: &'a crate::commands::protection::backup::GuildBackup,
    category_id: &str,
) -> Option<&'a crate::commands::protection::backup::BackupCategory> {
    backup.categories.iter().find(|c| c.id == category_id)
}

/// Try to claim the per-guild restore slot. True on first claim,
/// false while a restore is already running. Pure predicate backing
/// Handler::restore_claim, unit-tested below (no Discord needed).
pub fn restore_slot_claim(running: &mut HashSet<String>, guild_id: &str) -> bool {
    running.insert(guild_id.to_string())
}

/// Release the per-guild restore slot (no-op when absent). Pure
/// predicate backing Handler::restore_release, unit-tested below.
pub fn restore_slot_release(running: &mut HashSet<String>, guild_id: &str) {
    running.remove(guild_id);
}

/// Delay before a left guild's data is wiped. Mirrors
/// GUILD_DELETE_DELAY in Events/client/deleteDatabaseDataOnGuildLeave.ts.
pub const GUILD_WIPE_DELAY_MS: i64 = 10 * 60 * 60 * 1000;

/// Global wipe-queue key. Mirrors GUILD_DELETE_QUEUE_KEY (a single
/// global row, hence the "0" scope like other global keys).
pub const GUILD_DELETE_QUEUE_KEY: &str = "GUILD_DELETE_QUEUE_KEY";
/// Scope holding the global wipe queue (mirrors the single-key TS store).
pub const GUILD_WIPE_QUEUE_SCOPE: &str = "0";

/// Pending deferred guild-data wipe. Mirrors PendingGuildDeletion
/// in Events/client/deleteDatabaseDataOnGuildLeave.ts (camelCase
/// wire shape kept for fidelity).
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct PendingGuildDeletion {
    #[serde(rename = "guildId")]
    pub guild_id: String,
    #[serde(rename = "guildName")]
    pub guild_name: String,
    #[serde(rename = "ownerId")]
    pub owner_id: String,
    #[serde(rename = "deleteAt")]
    pub delete_at: i64,
}

/// Enqueue (or refresh) a deferred wipe for a left guild. Returns
/// the wipe deadline. Pure predicate backing guild_delete,
/// unit-tested below (no Discord needed).
pub fn wipe_queue_enqueue(
    queue: &mut HashMap<String, PendingGuildDeletion>,
    guild_id: &str,
    guild_name: &str,
    owner_id: &str,
    now_ms: i64,
) -> i64 {
    let delete_at = now_ms.saturating_add(GUILD_WIPE_DELAY_MS);
    queue.insert(
        guild_id.to_string(),
        PendingGuildDeletion {
            guild_id: guild_id.to_string(),
            guild_name: guild_name.to_string(),
            owner_id: owner_id.to_string(),
            delete_at,
        },
    );
    delete_at
}

/// Cancel a pending wipe on rejoin. True when an entry existed.
/// Pure predicate backing guild_create (mirrors
/// cancelPendingGuildDataDeletion), unit-tested below.
pub fn wipe_queue_cancel(
    queue: &mut HashMap<String, PendingGuildDeletion>,
    guild_id: &str,
) -> bool {
    queue.remove(guild_id).is_some()
}

/// Guilds whose wipe is due: deadline passed and the bot is still
/// absent (mirrors clearGuildData's cache guard that skips guilds
/// back in cache). Pure predicate backing the wipe-queue sweep and
/// the ready recovery, unit-tested below.
pub fn wipe_queue_due(
    queue: &HashMap<String, PendingGuildDeletion>,
    now_ms: i64,
    present: &HashSet<String>,
) -> Vec<String> {
    queue
        .iter()
        .filter(|(gid, p)| now_ms >= p.delete_at && !present.contains(*gid))
        .map(|(gid, _)| gid.clone())
        .collect()
}

impl Handler {
    pub fn new(pool: Pool, slashlog: Arc<crate::slashlog::SlashLog>) -> Self {
        Self {
            pool,
            spam: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            invites: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            sealed: Arc::new(tokio::sync::Mutex::new(std::collections::HashSet::new())),
            security: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            slashlog,
            restoring: Arc::new(tokio::sync::Mutex::new(HashSet::new())),
        }
    }

    /// File-log one slash command invocation. Mirrors the
    /// interactionCreate leg of Events/logs/slashCommandLogger.ts
    /// (bot + non-guild skipped; option values redacted by
    /// sanitizeInteractionOptionValue).
    async fn log_slash_command(&self, ctx: &serenity::Context, cmd: &serenity::CommandInteraction) {
        if cmd.user.bot {
            return;
        }
        let Some(guild_id) = cmd.guild_id else {
            return;
        };
        let guild_name = ctx
            .cache
            .guild(guild_id)
            .map(|g| g.name.clone())
            .unwrap_or_else(|| guild_id.get().to_string());
        let channel_name = cmd
            .channel_id
            .to_channel(&ctx.http)
            .await
            .ok()
            .and_then(|c| c.guild().map(|g| g.name.clone()))
            .unwrap_or_else(|| "unknown".to_string());
        let (sub, opts) = crate::slashlog::split_command_options(&cmd.data.options());
        let entry = crate::slashlog::ParsedSavedCommand {
            guild_name,
            guild_id: Some(guild_id.get().to_string()),
            executor_username: cmd.user.name.clone(),
            timestamp: chrono::Local::now().timestamp_millis(),
            channel_name,
            channel_id: cmd.channel_id.get().to_string(),
            command: crate::slashlog::format_logged_command(&sub, &opts),
        };
        self.slashlog.log(entry).await;
    }

    /// Captcha attempt handling (mirrors the collector "collect" leg
    /// in Events/security/onMemberJoin.ts): delete the attempt, pass
    /// on exact code match (role add, role2 remove, delete prompt),
    /// otherwise decrement and re-render, kicking at zero.
    async fn security_answer(&self, ctx: &serenity::Context, msg: &serenity::Message) {
        let Some(guild_id) = msg.guild_id else {
            return;
        };
        if msg.author.bot {
            return;
        }
        let key = security_key(guild_id.get(), msg.author.id.get());
        let mut guard = self.security.lock().await;
        let Some(ch) = guard.get_mut(&key) else {
            return;
        };
        if ch.channel_id != msg.channel_id.get() {
            return;
        }
        let _ = msg.delete(&ctx.http).await;
        if msg.content == ch.code {
            let (role, role2, message_id, channel_id) =
                (ch.role, ch.role2, ch.message_id, ch.channel_id);
            guard.remove(&key);
            drop(guard);
            if let Ok(member) = guild_id.member(&ctx.http, msg.author.id).await {
                if let Some(r) = role {
                    let _ = member.add_role(&ctx.http, serenity::RoleId::new(r)).await;
                }
                if let Some(r) = role2 {
                    let _ = member
                        .remove_role(&ctx.http, serenity::RoleId::new(r))
                        .await;
                }
            }
            let _ = serenity::ChannelId::new(channel_id)
                .delete_message(&ctx.http, serenity::MessageId::new(message_id))
                .await;
            return;
        }
        if ch.attempts_left <= 1 {
            let (message_id, channel_id) = (ch.message_id, ch.channel_id);
            guard.remove(&key);
            drop(guard);
            let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
            let kick_reason =
                crate::lang::get(&lang_code, "event_security_kick_reason").unwrap_or_default();
            if let Ok(member) = guild_id.member(&ctx.http, msg.author.id).await {
                let _ = member.kick_with_reason(&ctx.http, &kick_reason).await;
            }
            let _ = serenity::ChannelId::new(channel_id)
                .delete_message(&ctx.http, serenity::MessageId::new(message_id))
                .await;
            return;
        }
        ch.attempts_left -= 1;
        let (left, code, message_id, channel_id) = (
            ch.attempts_left,
            ch.code.clone(),
            ch.message_id,
            ch.channel_id,
        );
        drop(guard);
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let emoji = crate::emojis::app_emoji_markup(&ctx.http, "Schedule")
            .await
            .unwrap_or_default();
        let content = format!(
            "{}\n\n`{code}`\n\n{}\n-# {}",
            text("event_security").replace("${member}", &format!("<@{}>", msg.author.id.get())),
            text("event_security_expiry")
                .replace(
                    "${timestamp}",
                    &format!("<t:{}:R>", crate::commands::context::now_ms() / 1000 + 150)
                )
                .replace("${attempts}", &left.to_string())
                .replace("{emoji}", &emoji),
            text("event_security_footer"),
        );
        let _ = serenity::ChannelId::new(channel_id)
            .edit_message(
                &ctx.http,
                serenity::MessageId::new(message_id),
                serenity::EditMessage::new().content(content),
            )
            .await;
    }

    async fn check_punishpub(&self, ctx: &serenity::Context, gid: &str, msg: &serenity::Message) {
        let antipub_off: bool = crate::db::kv_get(&self.pool, gid, "GUILD.GUILD_CONFIG.antipub")
            .await
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|v| v.as_str().map(|x| x == "off"))
            .unwrap_or(false);
        let is_staff = msg
            .member
            .as_ref()
            .map(|m| {
                m.permissions
                    .map(|p| p.administrator() || p.manage_guild())
                    .unwrap_or(false)
            })
            .unwrap_or(false);
        if antipub_off || is_staff {
            return;
        }
        let links = crate::funcs::extract_links(&msg.content);
        let mut sanction = false;
        if !links.is_empty() {
            let mut all_media = true;
            let mut whitelisted = false;
            for url in &links {
                if !crate::funcs::is_media_link(url).await {
                    all_media = false;
                }
                if crate::funcs::is_whitelisted_url(url, &[]) {
                    whitelisted = true;
                }
            }
            sanction = !all_media && !whitelisted;
        }
        if !sanction && crate::funcs::has_blacklisted_term(&msg.content) {
            sanction = true;
        }
        if !sanction {
            return;
        }
        let _ = msg.delete(&ctx.http).await;
        let flag_key = format!("PUNISH_DATA.{gid}.{}", msg.author.id.get());
        let flags: i64 = crate::db::kv_get(&self.pool, gid, &flag_key)
            .await
            .and_then(|s| {
                serde_json::from_str::<serde_json::Value>(&s)
                    .ok()
                    .and_then(|v| v.get("flags").and_then(|f| f.as_i64()))
            })
            .unwrap_or(0);
        let new_flags = flags + 1;
        let _ = crate::db::kv_set(
            &self.pool,
            gid,
            &flag_key,
            &serde_json::json!({"flags": new_flags}).to_string(),
        )
        .await;
        let raw = match crate::db::kv_get(&self.pool, gid, "GUILD.PUNISH.PUNISH_PUB").await {
            Some(raw) => raw,
            None => return,
        };
        let cfg: serde_json::Value = match serde_json::from_str(&raw) {
            Ok(cfg) => cfg,
            Err(_) => return,
        };
        let max = cfg.get("amountMax").and_then(|n| n.as_i64());
        let state_on = cfg.get("state").and_then(|s| s.as_str()) == Some("true");
        let kind = cfg
            .get("punishementType")
            .and_then(|s| s.as_str())
            .unwrap_or("ban");
        if !(state_on && max == Some(new_flags)) {
            return;
        }
        match kind {
            "kick" => {
                if let Some(g) = msg.guild_id {
                    let _ = g
                        .kick_with_reason(&ctx.http, msg.author.id, "Ban by PUNISHPUB")
                        .await;
                }
            }
            "mute" => {
                if let Some(g) = msg.guild_id {
                    if let Ok(member) = g.member(&ctx.http, msg.author.id).await {
                        let mut member = member;
                        if let Ok(until) = serenity::Timestamp::from_unix_timestamp(
                            std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_secs() as i64)
                                .unwrap_or(0)
                                + 40,
                        ) {
                            let _ = member
                                .disable_communication_until_datetime(&ctx.http, until)
                                .await;
                        }
                    }
                }
            }
            _ => {
                if let Some(g) = msg.guild_id {
                    let _ = g.ban(&ctx.http, msg.author.id, 0).await;
                }
            }
        }
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(gid)
            .bind(&flag_key)
            .execute(&self.pool)
            .await;
    }

    /// Moderation audit embed (mirrors logs/addBanLogs.ts,
    /// removeBanLogs.ts, kickLogs.ts): latest audit entry for the
    /// action -> #010101 embed with the Reason field, posted to
    /// GUILD.SERVER_LOGS.moderation. Silent when no log channel or
    /// no audit entry, like TS. Executor comes from the audit entry;
    /// target from the caller.
    async fn mod_audit_log(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        action: serenity::model::guild::audit_log::Action,
        desc_key: &str,
        target_id: u64,
        target_name: Option<&str>,
    ) {
        let gid = guild_id.get().to_string();
        let logs_ch: Option<u64> =
            crate::db::kv_get(&self.pool, &gid, "GUILD.SERVER_LOGS.moderation")
                .await
                .and_then(|s| s.parse().ok());
        let Some(logs_ch) = logs_ch else {
            return;
        };
        let Ok(logs) = guild_id
            .audit_logs(&ctx.http, Some(action), None, None, Some(1))
            .await
        else {
            return;
        };
        let Some(entry) = logs.entries.first() else {
            return;
        };
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let desc = text(desc_key)
            .replace(
                "${firstEntry.executor.id}",
                &entry.user_id.get().to_string(),
            )
            .replace("${firstEntry.target.id}", &target_id.to_string())
            .replace("${firstEntry.target.username}", target_name.unwrap_or(""));
        let reason = entry
            .reason
            .clone()
            .unwrap_or_else(|| text("blacklist_var_no_reason"));
        let embed = serenity::CreateEmbed::default()
            .colour(0x010101_u32)
            .description(desc)
            .field(
                text("event_srvLogs_banAdd_fields_name"),
                text("event_srvLogs_banAdd_fields_value").replace("{reason}", &reason),
                false,
            )
            .timestamp(serenity::Timestamp::now());
        let _ = serenity::ChannelId::new(logs_ch)
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }

    /// Autoreact emitter. Extracted from the message handler so the
    /// master switch gates it cleanly.
    async fn autoreact_emit(
        pool: &crate::db::Pool,
        http: &std::sync::Arc<poise::serenity_prelude::Http>,
        gid: &str,
        msg: &serenity::Message,
    ) {
        let Some(raw) = crate::db::kv_get(pool, gid, "GUILD.AUTOREACT").await else {
            return;
        };
        let list: Vec<serde_json::Value> = serde_json::from_str(&raw).unwrap_or_default();
        for emoji in crate::commands::guildconfig::autoreact_for_channel(
            &list,
            &msg.channel_id.get().to_string(),
        ) {
            let reaction = if let Ok(id) = emoji.parse::<u64>() {
                serenity::ReactionType::Custom {
                    animated: false,
                    id: serenity::EmojiId::new(id),
                    name: None,
                }
            } else {
                serenity::ReactionType::Unicode(emoji.clone())
            };
            let _ = msg.react(http, reaction).await;
        }
    }

    async fn automod_on(&self, guild_id: &str, kind: &str) -> bool {
        crate::db::kv_get(
            &self.pool,
            guild_id,
            &crate::commands::guildconfig::automod_key(kind),
        )
        .await
        .as_deref()
            == Some("1")
    }

    /// Anti-raid guard. Mirrors Events/protection/avoid*.ts with
    /// PROTECTION.<rule> {allow} + PROTECTION.SANCTION + ALLOWLIST keys:
    /// fetch the audit-log executor, skip owner/allowlisted/bot, apply the
    /// configured sanction otherwise. Never panics.
    async fn protection_guard(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        action: serenity::model::guild::audit_log::Action,
        rule: &str,
    ) {
        let gid = guild_id.get().to_string();
        let allowed: bool = crate::db::kv_get(&self.pool, &gid, &format!("PROTECTION.{rule}"))
            .await
            .and_then(|s| {
                serde_json::from_str::<crate::commands::protection::protect::RuleState>(&s).ok()
            })
            .map(|r| r.allow)
            .unwrap_or(true);
        if allowed {
            return;
        }
        let Ok(logs) = guild_id
            .audit_logs(&ctx.http, Some(action), None, None, Some(1))
            .await
        else {
            return;
        };
        let Some(entry) = logs.entries.first() else {
            return;
        };
        let exec = entry.user_id;
        if exec == ctx.cache.current_user().id {
            return;
        }
        // Derogations are exempt from protection sanctions.
        let derogated: bool = crate::db::kv_get(&self.pool, &gid, "GUILD.UTILS.DEROGATION")
            .await
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
            .map(|list| list.contains(&exec.to_string()))
            .unwrap_or(false);
        if derogated {
            return;
        }
        let decision = crate::events::protection_decision(
            crate::db::kv_get(&self.pool, &gid, &format!("GUILD.OWNER.{exec}"))
                .await
                .is_some(),
            crate::db::kv_get(&self.pool, &gid, &format!("ALLOWLIST.list.{exec}"))
                .await
                .is_some(),
            false,
        );
        if decision != crate::events::PunishDecision::Punish {
            return;
        }
        let sanction: String = crate::db::kv_get(&self.pool, &gid, "PROTECTION.SANCTION")
            .await
            .unwrap_or_else(|| "ban".to_string());
        match sanction.to_ascii_lowercase().as_str() {
            "kick" => {
                let _ = guild_id
                    .kick_with_reason(&ctx.http, exec, "protection")
                    .await;
            }
            "timeout" | "mute" => {
                if let Ok(member) = guild_id.member(&ctx.http, exec).await {
                    let mut member = member;
                    let until = serenity::Timestamp::from_unix_timestamp(
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_secs() as i64)
                            .unwrap_or(0)
                            + 3600,
                    );
                    if let Ok(until) = until {
                        let _ = member
                            .disable_communication_until_datetime(&ctx.http, until)
                            .await;
                    }
                }
            }
            _ => {
                let _ = guild_id.ban(&ctx.http, exec, 0).await;
            }
        }
        // Mirrors ihorizon_logs.ts: report to the ihorizon-logs channel.
        if let Ok(channels) = guild_id.channels(&ctx.http).await {
            let list: Vec<(u64, String)> = channels
                .iter()
                .map(|(id, c)| (id.get(), c.name.clone()))
                .collect();
            if let Some(log_id) = crate::funcs::logs_channel_id(&list) {
                let _ = serenity::ChannelId::new(log_id)
                    .send_message(
                        &ctx.http,
                        serenity::CreateMessage::new().embed(
                            serenity::CreateEmbed::default()
                                .title("Protection")
                                .description(format!("Sanction {sanction} applied to <@{exec}>."))
                                .colour(0xBF0BB9),
                        ),
                    )
                    .await;
            }
        }
    }

    /// Claim the per-guild restore slot. Returns false when a restore
    /// is already running (caller must skip). Mirrors the
    /// restorationInProgress.get check in avoidChannelDelete.ts.
    async fn restore_claim(&self, guild_id: &str) -> bool {
        restore_slot_claim(&mut *self.restoring.lock().await, guild_id)
    }

    /// Release the per-guild restore slot. Mirrors the `finally`
    /// restorationInProgress.delete in avoidChannelDelete.ts.
    async fn restore_release(&self, guild_id: &str) {
        restore_slot_release(&mut *self.restoring.lock().await, guild_id);
    }

    /// Bot administrator gate. Mirrors the members.me Administrator
    /// check at the top of avoidChannelDelete.ts / avoidRoleDelete.ts.
    async fn bot_is_admin(&self, ctx: &serenity::Context, guild_id: serenity::GuildId) -> bool {
        let bot = ctx.cache.current_user().id;
        // Snapshot out of the cache without holding the !Send guard
        // across an await.
        let cached: Option<(serenity::Guild, serenity::Member)> = ctx
            .cache
            .guild(guild_id)
            .and_then(|g| g.members.get(&bot).cloned().map(|m| (g.clone(), m)));
        if let Some((guild, member)) = cached {
            return guild.member_permissions(&member).administrator();
        }
        // Cache miss: fetch our member row, then compute against the
        // cached roles.
        if let Ok(member) = guild_id.member(&ctx.http, bot).await {
            if let Some(guild) = ctx.cache.guild(guild_id).map(|g| g.clone()) {
                return guild.member_permissions(&member).administrator();
            }
        }
        false
    }

    /// Resolve a snapshot parent category to a live channel id.
    /// Returns None when the snapshot has no parent or the parent no
    /// longer exists (then the channel is recreated top-level).
    async fn live_parent(
        ctx: &serenity::Context,
        parent: Option<&str>,
    ) -> Option<serenity::ChannelId> {
        let pid = parent?.parse::<u64>().ok()?;
        let id = serenity::ChannelId::new(pid);
        ctx.http.get_channel(id).await.ok().map(|_| id)
    }

    /// Clone-restore one snapshot channel: name, type, position,
    /// permission overwrites and parent. Mirrors the create-channel
    /// branch of avoidChannelDelete.ts.
    async fn create_snapshot_channel(
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        entry: &crate::commands::protection::backup::BackupChannel,
        parent: Option<serenity::ChannelId>,
    ) -> Option<serenity::GuildChannel> {
        let mut builder = serenity::CreateChannel::new(entry.name.clone())
            .kind(entry.kind)
            .position(entry.position)
            .permissions(entry.permissions.clone());
        if let Some(parent) = parent {
            builder = builder.category(parent);
        }
        guild_id.create_channel(&ctx.http, builder).await.ok()
    }

    /// Clone-restore a deleted channel or category from the structure
    /// snapshot. Mirrors avoidChannelDelete.ts: category recreates
    /// with its missing children (300ms pacing), a plain channel
    /// recreates with perms/parent/position. Best-effort, never panics.
    async fn restore_deleted_channel(
        &self,
        ctx: &serenity::Context,
        channel: &serenity::GuildChannel,
    ) {
        let gid = channel.guild_id.get().to_string();
        if !self.bot_is_admin(ctx, channel.guild_id).await {
            return;
        }
        if !self.restore_claim(&gid).await {
            return;
        }
        self.restore_deleted_channel_inner(ctx, channel).await;
        self.restore_release(&gid).await;
    }

    async fn restore_deleted_channel_inner(
        &self,
        ctx: &serenity::Context,
        channel: &serenity::GuildChannel,
    ) {
        let gid = channel.guild_id.get().to_string();
        let Some(backup) = crate::commands::protection::backup::load_backup(&self.pool, &gid).await
        else {
            return;
        };
        let deleted_id = channel.id.get().to_string();
        if channel.kind == serenity::ChannelType::Category {
            let Some(cat) = backup_category_for(&backup, &deleted_id) else {
                return;
            };
            let builder = serenity::CreateChannel::new(cat.name.clone())
                .kind(serenity::ChannelType::Category)
                .position(cat.position);
            let Ok(new_cat) = channel.guild_id.create_channel(&ctx.http, builder).await else {
                return;
            };
            let live: HashSet<String> = channel
                .guild_id
                .channels(&ctx.http)
                .await
                .map(|map| map.keys().map(|id| id.get().to_string()).collect())
                .unwrap_or_default();
            for child in cat
                .channels
                .iter()
                .filter(|c| !live.contains(&c.id) && c.id != deleted_id)
            {
                let _ =
                    Self::create_snapshot_channel(ctx, channel.guild_id, child, Some(new_cat.id))
                        .await;
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            }
            return;
        }
        let Some(entry) = backup_channel_for(&backup, &deleted_id) else {
            return;
        };
        let parent = Self::live_parent(ctx, entry.parent.as_deref()).await;
        let _ = Self::create_snapshot_channel(ctx, channel.guild_id, entry, parent).await;
    }

    /// Rebuild a deleted role from the event payload (name, permissions,
    /// colour, hoist, mentionable, position via EditRole::from_role,
    /// mirroring the TS `...role` spread) and re-add the snapshot
    /// members. Mirrors avoidRoleDelete.ts. Best-effort, never panics.
    async fn restore_deleted_role(
        &self,
        ctx: &serenity::Context,
        guild_id: serenity::GuildId,
        removed_role_id: serenity::RoleId,
        removed: &Option<serenity::Role>,
    ) {
        if !self.bot_is_admin(ctx, guild_id).await {
            return;
        }
        let Some(deleted) = removed else {
            return;
        };
        let gid = guild_id.get().to_string();
        let backup = crate::commands::protection::backup::load_backup(&self.pool, &gid).await;
        let members: Vec<u64> = backup
            .as_ref()
            .map(|b| {
                crate::commands::protection::backup::role_members(
                    b,
                    &removed_role_id.get().to_string(),
                )
                .iter()
                .filter_map(|s| s.parse::<u64>().ok())
                .collect()
            })
            .unwrap_or_default();
        let builder = serenity::EditRole::from_role(deleted)
            .position(deleted.position)
            .audit_log_reason("Role re-created by Protect");
        let Ok(new_role) = guild_id.create_role(&ctx.http, builder).await else {
            return;
        };
        for uid in members {
            if let Ok(member) = guild_id.member(&ctx.http, serenity::UserId::new(uid)).await {
                let _ = member.add_role(&ctx.http, new_role.id).await;
            }
        }
    }

    async fn guild_key(&self, guild_id: u64) -> String {
        guild_id.to_string()
    }

    /// Voice state log (mirrors logs/voiceLogs.ts): #010101 embed
    /// for leave / join / self-deafen / self-undeafen / self-mute /
    /// self-unmute. Silent when no log channel, for the bot itself,
    /// or when nothing relevant changed (moves included).
    async fn voice_state_log(
        &self,
        ctx: &serenity::Context,
        gid: &str,
        old: Option<&serenity::VoiceState>,
        new: &serenity::VoiceState,
    ) {
        let logs_ch: Option<u64> = crate::db::kv_get(&self.pool, gid, "GUILD.SERVER_LOGS.voice")
            .await
            .and_then(|s| s.parse().ok());
        let Some(logs_ch) = logs_ch else {
            return;
        };
        if new.user_id == ctx.cache.current_user().id {
            return;
        }
        let guild_u64: u64 = gid.parse().unwrap_or(0);
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild_u64)).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let uid = new.user_id.get().to_string();
        let old_ch = old.and_then(|o| o.channel_id);
        let desc = if new.channel_id.is_none() {
            text("event_srvLogs_voiceStateUpdate_description")
                .replace("${targetUser.id}", &uid)
                .replace(
                    "${OchannelID}",
                    &old_ch.map(|c| c.get().to_string()).unwrap_or_default(),
                )
        } else if old_ch.is_none() {
            text("event_srvLogs_voiceStateUpdate_2_description")
                .replace("${targetUser.id}", &uid)
                .replace(
                    "${channelID}",
                    &new.channel_id
                        .map(|c| c.get().to_string())
                        .unwrap_or_default(),
                )
        } else {
            let ch = new
                .channel_id
                .map(|c| c.get().to_string())
                .unwrap_or_default();
            let old_deaf = old.map(|o| o.self_deaf).unwrap_or(false);
            let old_mute = old.map(|o| o.self_mute).unwrap_or(false);
            if !old_deaf && new.self_deaf {
                text("event_srvLogs_voiceStateUpdate_3_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else if old_deaf && !new.self_deaf {
                text("event_srvLogs_voiceStateUpdate_4_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else if !old_mute && new.self_mute {
                text("event_srvLogs_voiceStateUpdate_5_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else if old_mute && !new.self_mute {
                text("event_srvLogs_voiceStateUpdate_6_description")
                    .replace("${targetUser.id}", &uid)
                    .replace("${channelID}", &ch)
            } else {
                return;
            }
        };
        let (name, avatar) = new
            .user_id
            .to_user(&ctx.http)
            .await
            .map(|u| (u.name.clone(), u.avatar_url().unwrap_or_default()))
            .unwrap_or_default();
        let embed = serenity::CreateEmbed::default()
            .colour(0x010101_u32)
            .author(serenity::CreateEmbedAuthor::new(name).icon_url(avatar))
            .description(desc)
            .timestamp(serenity::Timestamp::now());
        let _ = serenity::ChannelId::new(logs_ch)
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }
}

/// One rendered board message: content line + embed + file uploads.
pub struct BoardRender {
    pub content: String,
    pub embed: serenity::CreateEmbed,
    pub files: Vec<serenity::CreateAttachment>,
}

/// Build the send payload for a new board message (content + embed
/// + footer/author file uploads).
pub fn board_send(render: BoardRender) -> serenity::CreateMessage {
    let mut msg = serenity::CreateMessage::new()
        .content(render.content)
        .embed(render.embed);
    for f in render.files {
        msg = msg.add_file(f);
    }
    msg
}

/// Render one board message. Mirrors the embed build shared by all
/// four starboard/skullboard files: board color, author tag +
/// avatar snapshot (TS uses the raw CDN URL; bytes are attached so
/// the icon survives avatar changes), 2000-char description
/// (chars; TS cuts UTF-16 units), original-message link field,
/// source timestamp, bot footer + icon file, first image
/// attachment.
pub async fn render_board_message(
    pool: &crate::db::Pool,
    ctx: &serenity::Context,
    board: &str,
    message: &serenity::Message,
    count: i64,
    gid: &str,
) -> BoardRender {
    let code = crate::db::guild_lang(pool, message.guild_id.map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let url = crate::funcs::message_url(
        gid.parse().unwrap_or(0),
        message.channel_id.get(),
        message.id.get(),
    );
    let desc: String = message.content.chars().take(2000).collect();
    let desc = if desc.is_empty() { t("var_none") } else { desc };
    let mut files = Vec::new();
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(
            crate::commands::starboard::board_color(board),
        ))
        .description(desc)
        .field(
            t("var_original_message"),
            format!("[{}]({url})", t("var_click_here")),
            false,
        )
        .timestamp(message.timestamp);
    match crate::commands::botcat::download_bytes(&message.author.face()).await {
        Some(bytes) => {
            embed = embed.author(
                serenity::CreateEmbedAuthor::new(message.author.tag())
                    .icon_url("attachment://board_author.png"),
            );
            files.push(serenity::CreateAttachment::bytes(bytes, "board_author.png"));
        }
        None => {
            embed = embed.author(serenity::CreateEmbedAuthor::new(message.author.tag()));
        }
    }
    if let Some(first) = message.attachments.iter().find(|a| {
        a.content_type
            .as_deref()
            .unwrap_or_default()
            .starts_with("image/")
    }) {
        embed = embed.image(&first.url);
    }
    let footer_name = crate::commands::botcat::bot_footer_name(
        crate::db::kv_get(pool, gid, crate::commands::botcat::BOT_NAME_KEY)
            .await
            .as_deref(),
    );
    let stored = crate::db::kv_get(pool, gid, crate::commands::botcat::BOT_PFP_KEY).await;
    let icon = match crate::commands::botcat::footer_icon_bytes(stored.as_deref()) {
        Some(bytes) => Some(bytes),
        None => {
            let face = ctx.cache.current_user().face();
            crate::commands::botcat::download_bytes(&face).await
        }
    };
    match icon {
        Some(bytes) => {
            embed = embed.footer(
                serenity::CreateEmbedFooter::new(footer_name)
                    .icon_url("attachment://footer_icon.png"),
            );
            files.push(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        None => {
            embed = embed.footer(serenity::CreateEmbedFooter::new(footer_name));
        }
    }
    let content = crate::commands::starboard::board_content(
        crate::commands::starboard::board_emoji(board),
        count,
        message.channel_id.get(),
    );
    BoardRender {
        content,
        embed,
        files,
    }
}

/// Fetch the source message + fresh emoji count for board handling.
/// Returns None when the message is gone or authored by a bot
/// (both TS files skip those).
pub async fn board_source_message(
    ctx: &serenity::Context,
    reaction: &serenity::Reaction,
    emoji: &str,
    message_id: serenity::MessageId,
) -> Option<(serenity::Message, i64)> {
    let channel = reaction.channel(&ctx.http).await.ok()?;
    let message = channel.id().message(&ctx.http, message_id).await.ok()?;
    if message.author.bot {
        return None;
    }
    let count: i64 = message
        .reactions
        .iter()
        .filter(|r| r.reaction_type == serenity::ReactionType::Unicode(emoji.to_string()))
        .map(|r| r.count as i64)
        .sum();
    Some((message, count))
}

/// Mirrors starboard/skullboard onNewReact.ts: threshold post with
/// the rich embed, edit-in-place on further reactions, repost +
/// number update when the board message is gone, thread creation
/// on new posts, DATA entry store.
pub async fn board_reaction_add(
    pool: &crate::db::Pool,
    ctx: &serenity::Context,
    guild_id: u64,
    emoji: &str,
    message: &serenity::Message,
    count: i64,
) {
    let gid = guild_id.to_string();
    for board in ["starboard", "skullboard"] {
        if crate::commands::starboard::board_emoji(board) != emoji {
            continue;
        }
        let cfg = crate::commands::starboard::load_board(pool, &gid, board).await;
        if cfg.enabled == "no" || cfg.channel.is_empty() {
            continue;
        }
        if count < cfg.threshold {
            continue;
        }
        let Ok(board_channel_id) = cfg.channel.parse::<u64>() else {
            continue;
        };
        let board_channel = serenity::ChannelId::new(board_channel_id);
        // TS instanceof TextChannel gate.
        let is_text = board_channel
            .to_channel(&ctx.http)
            .await
            .ok()
            .and_then(|c| c.guild())
            .is_some();
        if !is_text {
            continue;
        }
        let mut entries = crate::commands::starboard::load_entries(pool, &gid, board).await;
        let chan_str = message.channel_id.get().to_string();
        let msg_str = message.id.get().to_string();
        let render = render_board_message(pool, ctx, board, message, count, &gid).await;
        let number: Option<String> =
            crate::commands::starboard::find_entry(&entries, &chan_str, &msg_str)
                .map(|e| e.number.clone());
        if let Some(number) = number {
            let number: u64 = number.parse().unwrap_or(0);
            if let Ok(board_msg) = board_channel
                .message(&ctx.http, serenity::MessageId::new(number))
                .await
            {
                let edit = serenity::EditMessage::new()
                    .content(render.content)
                    .embed(render.embed)
                    .attachments(crate::commands::embed::embed_builder::edit_attachments(
                        render.files,
                    ));
                let _ = board_channel
                    .edit_message(&ctx.http, board_msg.id, edit)
                    .await;
            } else if let Ok(new_msg) = board_channel
                .send_message(&ctx.http, board_send(render))
                .await
            {
                // Board message gone: repost + number update.
                let num = new_msg.id.get().to_string();
                for e in entries.iter_mut() {
                    if e.message_id == msg_str && e.channel_id == chan_str {
                        e.number = num.clone();
                    }
                }
                crate::commands::starboard::save_entries(pool, &gid, board, &entries).await;
            }
        } else if let Ok(board_msg) = board_channel
            .send_message(&ctx.http, board_send(render))
            .await
        {
            if cfg.create_thread {
                let code = crate::db::guild_lang(pool, Some(guild_id)).await;
                let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
                let nick = if message.author.name.is_empty() {
                    t("var_unknown")
                } else {
                    message.author.name.clone()
                };
                let emoji = crate::commands::starboard::board_emoji(board);
                let name = format!(
                    "{emoji} {}",
                    t("var_s_message").replace("{nickname}", &nick)
                );
                let builder = serenity::CreateThread::new(name)
                    .auto_archive_duration(serenity::model::channel::AutoArchiveDuration::OneDay);
                let _ = ctx
                    .http
                    .create_thread_from_message(board_channel, board_msg.id, &builder, None)
                    .await;
            }
            entries.push(crate::commands::starboard::BoardEntry {
                channel_id: chan_str,
                message_id: msg_str,
                number: board_msg.id.get().to_string(),
                author: message.author.id.get().to_string(),
            });
            crate::commands::starboard::save_entries(pool, &gid, board, &entries).await;
        }
    }
}

/// Mirrors starboard/skullboard onDeletedReact.ts: below threshold
/// the board message is deleted and its DATA entry dropped (entry
/// kept when the delete itself fails); at or above threshold the
/// board message is re-rendered.
pub async fn board_reaction_remove(
    pool: &crate::db::Pool,
    ctx: &serenity::Context,
    guild_id: u64,
    emoji: &str,
    message: &serenity::Message,
    count: i64,
) {
    let gid = guild_id.to_string();
    for board in ["starboard", "skullboard"] {
        if crate::commands::starboard::board_emoji(board) != emoji {
            continue;
        }
        let cfg = crate::commands::starboard::load_board(pool, &gid, board).await;
        if cfg.enabled == "no" || cfg.channel.is_empty() {
            continue;
        }
        let mut entries = crate::commands::starboard::load_entries(pool, &gid, board).await;
        let chan_str = message.channel_id.get().to_string();
        let msg_str = message.id.get().to_string();
        let Some(entry) = crate::commands::starboard::find_entry(&entries, &chan_str, &msg_str)
        else {
            continue;
        };
        let number: u64 = entry.number.parse().unwrap_or(0);
        let Ok(board_channel_id) = cfg.channel.parse::<u64>() else {
            continue;
        };
        let board_channel = serenity::ChannelId::new(board_channel_id);
        let Ok(board_msg) = board_channel
            .message(&ctx.http, serenity::MessageId::new(number))
            .await
        else {
            // TS returns here without touching DATA.
            continue;
        };
        if count < cfg.threshold {
            if board_channel
                .delete_message(&ctx.http, board_msg.id)
                .await
                .is_ok()
            {
                entries.retain(|e| !(e.message_id == msg_str && e.channel_id == chan_str));
                crate::commands::starboard::save_entries(pool, &gid, board, &entries).await;
            }
        } else {
            let render = render_board_message(pool, ctx, board, message, count, &gid).await;
            let edit = serenity::EditMessage::new()
                .content(render.content)
                .embed(render.embed)
                .attachments(crate::commands::embed::embed_builder::edit_attachments(
                    render.files,
                ));
            let _ = board_channel
                .edit_message(&ctx.http, board_msg.id, edit)
                .await;
        }
    }
}

#[serenity::async_trait]
impl serenity::EventHandler for Handler {
    async fn ready(&self, ctx: serenity::Context, ready: serenity::Ready) {
        // Mirrors src/Events/client/ready.ts (cache warm, owner fetch).
        tracing::info!(
            "{} connected ({} guilds)",
            ready.user.tag(),
            ready.guilds.len()
        );
        ctx.set_activity(Some(serenity::ActivityData::custom("iHorizon")));
        // Track-start nowplaying announcer (mirrors the trackStart send
        // in playerManager.ts). Registered once: ready fires per shard
        // and the dispatcher would otherwise post once per shard.
        static ANNOUNCE_ONCE: std::sync::OnceLock<()> = std::sync::OnceLock::new();
        if ANNOUNCE_ONCE.set(()).is_ok() {
            crate::lavalink::manager()
                .register_announce(ctx.http.clone())
                .await;
        }
    }

    async fn guild_create(
        &self,
        ctx: serenity::Context,
        guild: serenity::Guild,
        _is_new: Option<bool>,
    ) {
        // Mirrors client/guildCreate.ts.
        let gid = guild.id.get().to_string();
        // Cancel a pending deferred wipe from a previous leave (mirrors
        // cancelPendingGuildDataDeletion in deleteDatabaseDataOnGuildLeave.ts).
        {
            let mut queue = crate::scheduler::load_wipe_queue(&self.pool).await;
            if wipe_queue_cancel(&mut queue, &gid) {
                crate::scheduler::save_wipe_queue(&self.pool, &queue).await;
                tracing::info!("guildCreate {} cancelled pending wipe", gid);
            }
        }
        // Drop the legacy immediate flag (migration from the old design).
        let _ = crate::db::kv_del(&self.pool, &gid, "GUILD_DELETE_QUEUED").await;
        // Auto-locale default (setLangByRegion).
        if crate::db::kv_get(&self.pool, &gid, "GUILD.LANG")
            .await
            .is_none()
        {
            let _ = crate::db::kv_set(
                &self.pool,
                &gid,
                "GUILD.LANG",
                crate::lang::locale_lang_code(&guild.preferred_locale),
            )
            .await;
        }
        let lang_code = crate::db::guild_lang(&self.pool, Some(guild.id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        // Seed the guild owner (ownerHelper.addGuildOwner).
        let _ = crate::db::kv_set(
            &self.pool,
            &gid,
            &format!("GUILD.OWNER.{}", guild.owner_id.get()),
            "1",
        )
        .await;
        // Blacklist leave: blacklisted owner -> farewell embed, then leave.
        if crate::db::kv_get(
            &self.pool,
            "0",
            &crate::commands::owner::main::blacklist_key(guild.owner_id.get()),
        )
        .await
        .is_some()
        {
            let embed = serenity::CreateEmbed::default()
                .colour(0xFF0000_u32)
                .description(format!(
                    "Dear <@{}>, I'm sorry, but you have been blacklisted by the bot.\nAs a result, I will be leaving your server. If you have any questions or concerns, please contact my developer.\n\nThank you for your understanding",
                    guild.owner_id.get()
                ))
                .timestamp(serenity::Timestamp::now());
            if let Some(ch) = welcome_channel(&guild) {
                let _ = ch
                    .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                    .await;
            }
            let _ = guild.id.leave(&ctx.http).await;
            return;
        }
        // Cache invites for join attribution (getInvites).
        if let Ok(live) = guild.id.invites(&ctx.http).await {
            let mut cache = self.invites.lock().await;
            let entry = cache.entry(gid.clone()).or_default();
            for inv in live {
                entry.insert(
                    inv.code.clone(),
                    (
                        inv.uses,
                        inv.inviter.as_ref().map(|u| u.id.get()).unwrap_or(0),
                    ),
                );
            }
        }
        // Voice-session recovery (mirrors recoverActiveSessions, which TS
        // runs once at ready): guild_create carries full voice states, so
        // stale sessions close here with no cache race. Runs per guild
        // stream (idempotent) rather than once at boot.
        {
            let in_voice: std::collections::HashSet<u64> =
                guild.voice_states.keys().map(|u| u.get()).collect();
            let now = crate::commands::context::now_ms();
            crate::events::recover_voice_sessions(&self.pool, &gid, &in_voice, now).await;
        }
        // Seed the protection structure snapshot so delete-restore
        // works before the first 60s sweep (mirrors
        // backupGuildStructure in protection/ready.ts).
        {
            use crate::commands::protection::backup::{BackupRole, RawChannel};
            let raws: Vec<RawChannel> = guild.channels.values().map(RawChannel::from).collect();
            let roles: Vec<BackupRole> = guild
                .roles
                .keys()
                .map(|id| {
                    let members: Vec<String> = guild
                        .members
                        .values()
                        .filter(|m| m.roles.contains(id))
                        .map(|m| m.user.id.get().to_string())
                        .collect();
                    BackupRole {
                        id: id.get().to_string(),
                        members,
                    }
                })
                .collect();
            let backup = crate::commands::protection::backup::build_backup(&raws, roles);
            let _ =
                crate::commands::protection::backup::save_backup(&self.pool, &gid, &backup).await;
        }
        // Owner log embed to the guild-logs channel (email leg is SMTP-blocked).
        if let Ok(logs_ch) = crate::config::load()
            .map(|c| c.guild_logs_channel_id)
            .unwrap_or_default()
            .trim()
            .parse::<u64>()
        {
            let vanity = guild
                .vanity_url_code
                .as_ref()
                .map(|v| format!("discord.gg/{v}"))
                .unwrap_or_else(|| "None".to_string());
            let log_embed = serenity::CreateEmbed::default()
                .colour(0x00FF00_u32)
                .description("**A new guild added iHorizon !**")
                .field("Server Name", format!("`{}`", guild.name), true)
                .field("Server ID", format!("`{}`", guild.id.get()), true)
                .field(
                    "Server Region",
                    format!("`{}`", guild.preferred_locale),
                    true,
                )
                .field(
                    "Member Count",
                    format!("`{}` members", guild.member_count),
                    true,
                )
                .field("Vanity URL", format!("`{vanity}`"), true)
                .field("Guilds total", ctx.cache.guild_count().to_string(), true)
                .footer(serenity::CreateEmbedFooter::new("iHorizon Joined at"));
            let _ = serenity::ChannelId::new(logs_ch)
                .send_message(&ctx.http, serenity::CreateMessage::new().embed(log_embed))
                .await;
        }
        // Welcome message to the server (banner image pending html2png).
        if let Some(ch) = welcome_channel(&guild) {
            let titles = crate::lang::get_list(&lang_code, "new_guild_embed_title");
            let pick = titles
                .get((crate::commands::context::now_ms() as usize) % titles.len().max(1))
                .cloned()
                .unwrap_or_default();
            let app_id = ctx.cache.current_user().id.get();
            let embed = serenity::CreateEmbed::default()
                .colour(0x2134FF_u32)
                .description(text("new_guild_embed_desc").replace("${randomMessage}", &pick))
                .footer(serenity::CreateEmbedFooter::new("iHorizon"));
            let row1 = serenity::CreateActionRow::Buttons(vec![
                serenity::CreateButton::new_link(format!(
                    "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
                ))
                .label(text("guild_create_btn_invite")),
                serenity::CreateButton::new_link("https://www.ihorizon.org")
                    .label(text("guild_create_btn_website")),
                serenity::CreateButton::new_link("https://www.ihorizon.org/search")
                    .label(text("guild_create_btn_search")),
            ]);
            let row2 = serenity::CreateActionRow::Buttons(vec![
                serenity::CreateButton::new_link("https://gitlab.com/ihrz/ihrz")
                    .label(text("guild_create_btn_repos")),
                serenity::CreateButton::new_link("https://discord.gg/ihorizon")
                    .label(text("guild_create_btn_support")),
                serenity::CreateButton::new_link("https://docs.ihorizon.org")
                    .label(text("guild_create_btn_docs")),
            ]);
            let _ = ch
                .send_message(
                    &ctx.http,
                    serenity::CreateMessage::new()
                        .embed(embed)
                        .components(vec![row1, row2]),
                )
                .await;
        }
        // Owner welcome DM (inviter resolved via BotAdd audit log, best effort).
        let app_id = ctx.cache.current_user().id.get();
        let mut dm_targets = vec![guild.owner_id];
        if let Ok(logs) = guild
            .id
            .audit_logs(
                &ctx.http,
                Some(serenity::model::guild::audit_log::Action::Member(
                    serenity::model::guild::audit_log::MemberAction::BotAdd,
                )),
                None,
                None,
                Some(1),
            )
            .await
        {
            if let Some(entry) = logs.entries.first() {
                let bot_id = ctx.cache.current_user().id.get();
                if entry.target_id.map(|t| t.get()) == Some(bot_id)
                    && entry.user_id.get() != guild.owner_id.get()
                {
                    dm_targets.push(entry.user_id);
                }
            }
        }
        for target in dm_targets {
            if let Ok(user) = target.to_user(&ctx.http).await {
                let embed = serenity::CreateEmbed::default()
                    .colour(0x2B2D31_u32)
                    .description(
                        text("new_guild_owner_dm_description")
                            .replace("${owner}", &user.name)
                            .replace("${guild.name}", &guild.name),
                    )
                    .footer(serenity::CreateEmbedFooter::new("iHorizon"))
                    .timestamp(serenity::Timestamp::now());
                let row = serenity::CreateActionRow::Buttons(vec![
                    serenity::CreateButton::new_link(format!(
                        "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
                    ))
                    .label(text("guild_create_btn_invite")),
                    serenity::CreateButton::new_link("https://www.ihorizon.org")
                        .label(text("guild_create_btn_website")),
                    serenity::CreateButton::new_link("https://discord.gg/ihorizon")
                        .label(text("guild_create_btn_support")),
                ]);
                let _ = user
                    .direct_message(
                        &ctx.http,
                        serenity::CreateMessage::new()
                            .embed(embed)
                            .components(vec![row]),
                    )
                    .await;
            }
        }
        // Per-guild bot bio in the join language (setBotBioByLang).
        if let Some(bio_tpl) = crate::lang::get(&lang_code, "bot_server_bio") {
            let command_count = crate::commands::all().len();
            let bio = crate::commands::botcat::sanitize_bio(
                &bio_tpl.replace("{count}", &command_count.to_string()),
            );
            if let Some(token) = crate::config::bot_token() {
                let _ = crate::commands::botcat::patch_guild_me(
                    &token,
                    guild.id.get(),
                    serde_json::json!({ "bio": bio }),
                )
                .await;
            }
        }
        tracing::debug!("guildCreate {}", gid);
    }

    async fn guild_delete(
        &self,
        _ctx: serenity::Context,
        incomplete: serenity::UnavailableGuild,
        full: Option<serenity::Guild>,
    ) {
        // Mirrors deleteDatabaseDataOnGuildLeave.ts: enqueue a 10h
        // cancellable wipe instead of deleting inline (shard race safety).
        let gid = incomplete.id.get().to_string();
        let now = crate::commands::context::now_ms();
        let mut queue = crate::scheduler::load_wipe_queue(&self.pool).await;
        // The unavailable payload only carries the id; name/owner are
        // best effort from the full guild when Discord provides it.
        let name = full.as_ref().map(|g| g.name.clone()).unwrap_or_default();
        let owner = full
            .as_ref()
            .map(|g| g.owner_id.get().to_string())
            .unwrap_or_default();
        let delete_at = wipe_queue_enqueue(&mut queue, &gid, &name, &owner, now);
        crate::scheduler::save_wipe_queue(&self.pool, &queue).await;
        // Drop the legacy immediate flag (migration from the old design).
        let _ = crate::db::kv_del(&self.pool, &gid, "GUILD_DELETE_QUEUED").await;
        // Mirrors invitemanager/onGuildLeave.ts: drop the invite cache.
        self.invites.lock().await.remove(&gid);
        tracing::info!("guildDelete {} queued, wipe at {}", gid, delete_at);
    }

    async fn guild_member_addition(&self, ctx: serenity::Context, new_member: serenity::Member) {
        // Mirrors guildconfig/joinRole.ts + joinMessage.ts + joinDm.ts
        // + blockBot.ts + tooNewAccount.ts.
        let gid = new_member.guild_id.get().to_string();
        // Block bots when configured.
        if new_member.user.bot
            && crate::db::kv_get(&self.pool, &gid, "GUILD.BLOCK_BOT")
                .await
                .as_deref()
                == Some("1")
        {
            let _ = new_member
                .guild_id
                .kick_with_reason(&ctx.http, new_member.user.id, "bots blocked")
                .await;
            return;
        }
        // Minimum account age gate.
        if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "GUILD.BLOCK_NEW_ACCOUNT").await {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                let req = v.get("req").and_then(|r| r.as_i64()).unwrap_or(0);
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(0);
                if crate::commands::guildconfig::too_young(
                    new_member.user.created_at().unix_timestamp(),
                    req,
                    now,
                ) {
                    let _ = new_member
                        .guild_id
                        .kick_with_reason(&ctx.http, new_member.user.id, "account too new")
                        .await;
                    return;
                }
            }
        }
        // Join roles (mirrors joinRole.ts: blob joinroles string|string[],
        // legacy GUILD.JOIN_ROLE fallback; arrays replace the member's
        // roles like roles.set, singles add like roles.add).
        let join_roles = crate::events::join_role_ids(&self.pool, &gid).await;
        if join_roles.len() > 1 {
            let keep: std::collections::HashSet<u64> = join_roles.iter().copied().collect();
            for role_id in new_member.roles.iter() {
                if role_id.get() != new_member.guild_id.get() && !keep.contains(&role_id.get()) {
                    let _ = new_member.remove_role(&ctx.http, *role_id).await;
                }
            }
            for rid in &join_roles {
                let _ = new_member
                    .add_role(&ctx.http, serenity::RoleId::new(*rid))
                    .await;
            }
        } else if let Some(rid) = join_roles.first() {
            let _ = new_member
                .add_role(&ctx.http, serenity::RoleId::new(*rid))
                .await;
        }
        // Invite attribution (mirrors joinMessage invite tracker):
        // diff live invite uses against the cache to find the inviter.
        // The winner is kept for the join message inviter slots below.
        let mut attributed: Option<(u64, String, String)> = None;
        if let Ok(live) = new_member.guild_id.invites(&ctx.http).await {
            let mut cache = self.invites.lock().await;
            let entry = cache.entry(gid.clone()).or_default();
            for inv in &live {
                let cached = entry.get(&inv.code).map(|(u, _)| *u).unwrap_or(0);
                if inv.uses > cached {
                    if let Some(inviter) = inv.inviter.as_ref() {
                        let inviter_id = inviter.id.get();
                        attributed = Some((inviter_id, inv.code.clone(), inviter.name.clone()));
                        entry.insert(inv.code.clone(), (inv.uses, inviter_id));
                        // Credit: invites+1, regular+1, record BY.
                        let stats = crate::commands::invitesmanager::inv::load_invites(
                            &self.pool, &gid, inviter_id,
                        )
                        .await;
                        let next = crate::commands::invitesmanager::inv::InviteStats {
                            invites: stats.invites + 1,
                            regular: stats.regular + 1,
                            bonus: stats.bonus,
                            leaves: stats.leaves,
                        };
                        let _ = crate::commands::invitesmanager::inv::save_invites(
                            &self.pool, &gid, inviter_id, &next,
                        )
                        .await;
                        let _ = crate::db::kv_set(
                            &self.pool,
                            &gid,
                            &format!("USER.{}.INVITES.BY", new_member.user.id.get()),
                            &inviter_id.to_string(),
                        )
                        .await;
                    }
                    break;
                }
            }
            // Refresh cache snapshot.
            for inv in &live {
                entry.insert(
                    inv.code.clone(),
                    (
                        inv.uses,
                        inv.inviter.as_ref().map(|u| u.id.get()).unwrap_or(0),
                    ),
                );
            }
        }
        // Guild blacklist gate (mirrors blacklistFetcher.ts): the global
        // BLACKLIST.<uid> table carries a reason; DM it, then ban.
        if let Some(reason) = crate::db::kv_get(
            &self.pool,
            "0",
            &crate::commands::owner::main::blacklist_key(new_member.user.id.get()),
        )
        .await
        {
            let lang_code =
                crate::db::guild_lang(&self.pool, Some(new_member.guild_id.get())).await;
            let dm = crate::lang::get(&lang_code, "global_blacklist_msg_to_send")
                .unwrap_or_default()
                .replace("${data.reason}", &reason);
            let _ = new_member
                .user
                .direct_message(&ctx.http, serenity::CreateMessage::new().content(dm))
                .await;
            let ban_reason = crate::lang::get(&lang_code, "global_blacklist_reason")
                .unwrap_or_default()
                .replace("${data.reason}", &reason);
            let _ = new_member
                .guild_id
                .ban_with_reason(&ctx.http, new_member.user.id, 0, &ban_reason)
                .await;
            return;
        }
        if crate::db::kv_get(
            &self.pool,
            &gid,
            &format!("BLACKLIST.{}", new_member.user.id.get()),
        )
        .await
        .is_some()
        {
            let _ = new_member
                .guild_id
                .ban(&ctx.http, new_member.user.id, 0)
                .await;
            return;
        }
        // Nickname kicker (mirrors nickKicker.ts).
        if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "UTILS.NICK_KICKER").await {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
                let enabled = cfg
                    .get("enabled")
                    .and_then(|e| e.as_bool())
                    .unwrap_or(false);
                let words: Vec<String> = cfg
                    .get("words")
                    .and_then(|w| serde_json::from_value(w.clone()).ok())
                    .unwrap_or_default();
                if enabled
                    && crate::commands::utils::nick_matches(
                        &words,
                        &new_member.user.name,
                        Some(&new_member.nick.clone().unwrap_or_default()),
                    )
                {
                    let _ = new_member
                        .guild_id
                        .kick_with_reason(&ctx.http, new_member.user.id, "banned nickname")
                        .await;
                    return;
                }
            }
        }
        // Join DM (mirrors joinDm.ts: blob joindm template, legacy
        // GUILD.JOIN_DM fallback, "off" disables; rendered preview +
        // disabled "Message from <guild id>" button, keeping the TS quirk).
        if let Some(tpl) = crate::events::join_dm_template(&self.pool, &gid).await {
            let count = ctx
                .cache
                .guild(new_member.guild_id)
                .map(|g| g.member_count)
                .unwrap_or(0);
            let guild_name = ctx
                .cache
                .guild(new_member.guild_id)
                .map(|g| g.name.clone())
                .unwrap_or_else(|| "this server".to_string());
            let text = crate::events::render_join_dm(
                &tpl,
                &new_member.user.name,
                &new_member.user.mention().to_string(),
                count,
                &guild_name,
            );
            let button = serenity::CreateButton::new("join-dm-from-server")
                .label(format!("Message from {}", new_member.guild_id.get()))
                .style(serenity::ButtonStyle::Secondary)
                .disabled(true);
            let row = serenity::CreateActionRow::Buttons(vec![button]);
            let _ = new_member
                .user
                .direct_message(
                    &ctx.http,
                    serenity::CreateMessage::new()
                        .content(text)
                        .components(vec![row]),
                )
                .await;
        }
        // Welcome message (text template; image variant pending html2png).
        if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "GUILD.GUILD_CONFIG").await {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let (Some(ch), Some(tpl)) = (
                    cfg.get("join").and_then(|c| c.as_str()),
                    cfg.get("joinmessage").and_then(|m| m.as_str()),
                ) {
                    if let Ok(ch_id) = ch.parse::<u64>() {
                        let count = ctx
                            .cache
                            .guild(new_member.guild_id)
                            .map(|g| g.member_count)
                            .unwrap_or(0);
                        // Attributed inviter display (mirrors the joinMessage
                        // inviterUsername/inviterMention slots incl. the
                        // custom-vanity variant; TS literal defaults kept
                        // when unattributed).
                        let (inv_name, inv_mention) = match &attributed {
                            Some((iid, code, uname)) => {
                                let raw = crate::db::kv_get(&self.pool, "0", "api.VANITY").await;
                                let table: Option<serde_json::Value> =
                                    raw.and_then(|s| serde_json::from_str(&s).ok());
                                let bot_id = ctx.cache.current_user().id.get();
                                let vanity = crate::events::custom_vanity_code(
                                    table.as_ref(),
                                    &gid,
                                    code,
                                    bot_id,
                                    *iid,
                                );
                                crate::events::inviter_display(
                                    vanity.as_deref(),
                                    uname,
                                    &format!("<@{iid}>"),
                                )
                            }
                            None => ("unknow_user".to_string(), "@unknow_user".to_string()),
                        };
                        let text = crate::events::render_inviter_slots(
                            &crate::events::render_welcome(
                                tpl,
                                &new_member.user.mention().to_string(),
                                "this server",
                                count,
                            ),
                            &inv_name,
                            &inv_mention,
                        );
                        let _ = serenity::ChannelId::new(ch_id).say(&ctx.http, text).await;
                    }
                }
            }
        }
        // Mirrors rolesaver/onMemberJoin.ts: restore snapshot roles
        // (replace semantics) when enabled, then drop the row.
        if crate::commands::newfeatures::load_rolesaver_cfg(&self.pool, &gid)
            .await
            .enabled
        {
            let key = format!("ROLE_SAVER.{}", new_member.user.id.get());
            if let Some(raw) = crate::db::kv_get(&self.pool, &gid, &key).await {
                let roles: Vec<String> = serde_json::from_str(&raw).unwrap_or_default();
                let want: Vec<serenity::RoleId> = roles
                    .iter()
                    .filter_map(|s| s.parse::<u64>().ok())
                    .map(serenity::RoleId::new)
                    .collect();
                // Delta: no audit-log reason in serenity 0.12.
                for r in want.iter().filter(|r| !new_member.roles.contains(r)) {
                    let _ = new_member.add_role(&ctx.http, *r).await;
                }
                for r in new_member
                    .roles
                    .iter()
                    .filter(|r| r.get() != new_member.guild_id.get() && !want.contains(r))
                {
                    let _ = new_member.remove_role(&ctx.http, *r).await;
                }
                let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                    .bind(&gid)
                    .bind(key)
                    .execute(&self.pool)
                    .await;
            }
        }
        // Ghost-ping watch prime (mirrors ghostPingModule.ts): send the
        // newcomer's mention into each watch channel, then delete it.
        for ch in crate::commands::guildconfig::load_ghost(&self.pool, &gid).await {
            if let Ok(ch_id) = ch.parse::<u64>() {
                if let Ok(sent) = serenity::ChannelId::new(ch_id)
                    .say(&ctx.http, format!("<@{}>", new_member.user.id.get()))
                    .await
                {
                    let _ = sent.delete(&ctx.http).await;
                }
            }
        }
        // Security captcha challenge (mirrors security/onMemberJoin.ts).
        // The png render is html2png-blocked, so the code goes out as
        // text; attempts, roles, and the expiry kick all mirror TS.
        if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "SECURITY").await {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
                let disabled = cfg
                    .get("disable")
                    .and_then(|d| d.as_bool())
                    .unwrap_or(false);
                let ch_id = cfg
                    .get("channel")
                    .and_then(|c| c.as_str())
                    .and_then(|c| c.parse::<u64>().ok());
                if !disabled {
                    if let Some(ch_id) = ch_id {
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(new_member.guild_id.get()))
                                .await;
                        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                        let code = security_code();
                        let expires = crate::commands::context::now_ms() / 1000 + 150;
                        let emoji = crate::emojis::app_emoji_markup(&ctx.http, "Schedule")
                            .await
                            .unwrap_or_default();
                        let content = format!(
                            "{}\n\n`{code}`\n\n{}\n-# {}",
                            text("event_security")
                                .replace("${member}", &format!("<@{}>", new_member.user.id.get())),
                            text("event_security_expiry")
                                .replace("${timestamp}", &format!("<t:{expires}:R>"))
                                .replace("${attempts}", "3")
                                .replace("{emoji}", &emoji),
                            text("event_security_footer"),
                        );
                        if let Ok(sent) = serenity::ChannelId::new(ch_id)
                            .send_message(
                                &ctx.http,
                                serenity::CreateMessage::new().content(content),
                            )
                            .await
                        {
                            let role = cfg
                                .get("role")
                                .and_then(|r| r.as_str())
                                .and_then(|r| r.parse::<u64>().ok());
                            let role2 = cfg
                                .get("role2")
                                .and_then(|r| r.as_str())
                                .and_then(|r| r.parse::<u64>().ok());
                            let key =
                                security_key(new_member.guild_id.get(), new_member.user.id.get());
                            let joined_at = new_member.joined_at.map(|t| t.unix_timestamp());
                            self.security.lock().await.insert(
                                key.clone(),
                                SecurityChallenge {
                                    channel_id: ch_id,
                                    message_id: sent.id.get(),
                                    user_id: new_member.user.id.get(),
                                    code,
                                    attempts_left: 3,
                                    role,
                                    role2,
                                    joined_at,
                                },
                            );
                            // Expiry sweep (mirrors the collector "end" leg).
                            let http = ctx.http.clone();
                            let pool = self.pool.clone();
                            let security = self.security.clone();
                            let guild_id = new_member.guild_id;
                            let user_id = new_member.user.id;
                            tokio::spawn(async move {
                                tokio::time::sleep(std::time::Duration::from_secs(150)).await;
                                let taken = security.lock().await.remove(&key);
                                if let Some(ch) = taken {
                                    let lang_code =
                                        crate::db::guild_lang(&pool, Some(guild_id.get())).await;
                                    let kick_reason =
                                        crate::lang::get(&lang_code, "event_security_kick_reason")
                                            .unwrap_or_default();
                                    if let Ok(member) = guild_id.member(&http, user_id).await {
                                        let same_join =
                                            member.joined_at.map(|t| t.unix_timestamp())
                                                == ch.joined_at;
                                        if member.joined_at.is_none() || same_join {
                                            let _ =
                                                member.kick_with_reason(&http, &kick_reason).await;
                                        }
                                    }
                                    let _ = serenity::ChannelId::new(ch.channel_id)
                                        .delete_message(
                                            &http,
                                            serenity::MessageId::new(ch.message_id),
                                        )
                                        .await;
                                }
                            });
                        }
                    }
                }
            }
        }
    }

    async fn guild_member_removal(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        user: serenity::User,
        member: Option<serenity::Member>,
    ) {
        // Mirrors avoidKickMember.ts: audit-log kick attribution.
        {
            use serenity::model::guild::audit_log::{Action, MemberAction};
            if let Ok(logs) = guild_id
                .audit_logs(
                    &ctx.http,
                    Some(Action::Member(MemberAction::Kick)),
                    None,
                    None,
                    Some(1),
                )
                .await
            {
                if !logs.entries.is_empty() {
                    self.protection_guard(
                        &ctx,
                        guild_id,
                        Action::Member(MemberAction::Kick),
                        "kickmember",
                    )
                    .await;
                    // Rich audit embed (mirrors logs/kickLogs.ts).
                    self.mod_audit_log(
                        &ctx,
                        guild_id,
                        Action::Member(MemberAction::Kick),
                        "event_srvLogs_guildMemberRemove_description",
                        user.id.get(),
                        None,
                    )
                    .await;
                }
            }
        }
        // Leaves tracking (mirrors invitesmanager leaves): decrement the
        // recorded inviter, record the leave.
        let gid = guild_id.get().to_string();
        if let Some(by) = crate::db::kv_get(
            &self.pool,
            &gid,
            &format!("USER.{}.INVITES.BY", user.id.get()),
        )
        .await
        .and_then(|s| s.parse::<u64>().ok())
        {
            let stats =
                crate::commands::invitesmanager::inv::load_invites(&self.pool, &gid, by).await;
            let next = crate::commands::invitesmanager::inv::InviteStats {
                invites: (stats.invites - 1).max(0),
                regular: stats.regular,
                bonus: stats.bonus,
                leaves: stats.leaves + 1,
            };
            let _ = crate::commands::invitesmanager::inv::save_invites(&self.pool, &gid, by, &next)
                .await;
        }
        // Leave message (mirrors leaveMessage.ts text path).
        let gid = guild_id.get().to_string();
        if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "GUILD.GUILD_CONFIG").await {
            if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let (Some(ch), Some(tpl)) = (
                    cfg.get("leave").and_then(|c| c.as_str()),
                    cfg.get("leavemessage").and_then(|m| m.as_str()),
                ) {
                    if let Ok(ch_id) = ch.parse::<u64>() {
                        let text =
                            crate::events::render_welcome(tpl, &user.tag(), "this server", 0);
                        let _ = serenity::ChannelId::new(ch_id).say(&ctx.http, text).await;
                    }
                }
            }
        }
        // Mirrors rolesaver/onMemberLeave.ts: snapshot roles when
        // enabled (skips @everyone + admin roles on opt-out).
        let rs_cfg = crate::commands::newfeatures::load_rolesaver_cfg(&self.pool, &gid).await;
        if rs_cfg.enabled {
            if let Some(m) = member {
                let admin_of: std::collections::HashMap<u64, bool> = ctx
                    .cache
                    .guild(guild_id)
                    .map(|g| {
                        g.roles
                            .iter()
                            .map(|(id, r)| (id.get(), r.permissions.administrator()))
                            .collect()
                    })
                    .unwrap_or_default();
                let flagged: Vec<(u64, bool)> = m
                    .roles
                    .iter()
                    .map(|r| (r.get(), admin_of.get(&r.get()).copied().unwrap_or(false)))
                    .collect();
                let roles =
                    crate::events::snapshot_roles(&flagged, guild_id.get(), rs_cfg.skip_admin);
                let _ = crate::db::kv_set(
                    &self.pool,
                    &gid,
                    &format!("ROLE_SAVER.{}", user.id.get()),
                    &serde_json::to_string(&roles).unwrap_or_default(),
                )
                .await;
            }
        }
        // Ticket cleanup on leave (mirrors deleteTicketOnLeave.ts):
        // transcript + log each of the leaver's tickets, delete the
        // channels, then drop their TICKET_ALL rows.
        let ticket_rows: Vec<String> = sqlx::query_scalar(
            "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.' || ? || '.%'",
        )
        .bind(&gid)
        .bind(user.id.get().to_string())
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();
        if !ticket_rows.is_empty() {
            let lang_code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
            let actor = format!("<@{}>", user.id.get());
            for key in &ticket_rows {
                if let Some(ch_str) = key.rsplit('.').next() {
                    if let Ok(ch_id) = ch_str.parse::<u64>() {
                        let channel_id = serenity::ChannelId::new(ch_id);
                        let name = channel_id
                            .to_channel(&ctx.http)
                            .await
                            .ok()
                            .and_then(|c| c.guild().map(|g| g.name.clone()))
                            .unwrap_or_default();
                        let _ = crate::commands::ticket::main::close_ticket_channel(
                            &ctx.http,
                            &self.pool,
                            crate::commands::ticket::main::TicketCloseSpec {
                                gid: &gid,
                                lang_code: &lang_code,
                                channel_id,
                                title_key: "event_ticket_logsChannel_onDelete_embed_title",
                                desc_key: "event_ticket_logsChannel_onDelete_embed_desc",
                                replacements: &[
                                    ("${interaction.user}", &actor),
                                    ("${interaction.channel.name}", &format!("#{name}")),
                                ],
                                colour: 0x008000_u32,
                            },
                        )
                        .await;
                    }
                }
            }
            let _ = sqlx::query(
                "DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.' || ? || '.%'",
            )
            .bind(&gid)
            .bind(user.id.get().to_string())
            .execute(&self.pool)
            .await;
        }
        tracing::debug!("memberLeave {} user {}", gid, user.id.get());
    }

    async fn message(&self, _ctx: serenity::Context, msg: serenity::Message) {
        // Mirrors Events/stats/onNewMessage.ts + ranks/onNewMessage.ts.
        if msg.author.bot {
            return;
        }
        // Guild owner safety seal (once per guild per boot).
        if let Some(guild_id) = msg.guild_id {
            let gid = guild_id.get().to_string();
            let fresh = {
                let mut sealed = self.sealed.lock().await;
                sealed.insert(gid.clone())
            };
            if fresh {
                if let Ok(owner_id) = guild_id
                    .to_partial_guild(&_ctx.http)
                    .await
                    .map(|g| g.owner_id.get().to_string())
                {
                    let _ = crate::db::kv_set(
                        &self.pool,
                        &gid,
                        &format!("GUILD.OWNER.{owner_id}"),
                        "1",
                    )
                    .await;
                }
            }
        }
        let Some(guild_id) = msg.guild_id else { return };
        let gid = guild_id.get().to_string();
        let ch_id = msg.channel_id.get().to_string();
        // Embed-builder awaited input (mirrors the handleCollector
        // message collectors in utils !embed.ts). The input still
        // flows through normal processing below, like TS.
        if crate::db::kv_get(
            &self.pool,
            &gid,
            &crate::commands::embed::embed_builder::await_key(msg.author.id.get()),
        )
        .await
        .is_some()
        {
            let guild_name = guild_id
                .to_partial_guild(&_ctx.http)
                .await
                .map(|g| g.name)
                .unwrap_or_else(|_| "this server".to_string());
            crate::commands::embed::embed_builder::handle_builder_input(
                &_ctx.http,
                &self.pool,
                &gid,
                &guild_name,
                &msg,
            )
            .await;
        }
        // Allowlist lazy seed (mirrors createAllowlistOnMessage.ts):
        // first observed message creates the owner entry.
        if !msg.author.bot {
            let seeded: bool = sqlx::query_scalar(
                "SELECT COUNT(*) FROM kv WHERE guild_id = ? AND key_name LIKE 'ALLOWLIST.list.%'",
            )
            .bind(&gid)
            .fetch_one(&self.pool)
            .await
            .map(|n: i64| n > 0)
            .unwrap_or(true);
            if !seeded {
                if let Ok(owner) = guild_id
                    .to_partial_guild(&_ctx.http)
                    .await
                    .map(|g| g.owner_id.get().to_string())
                {
                    let _ = crate::db::kv_set(
                        &self.pool,
                        &gid,
                        &format!("ALLOWLIST.list.{owner}"),
                        r#"{"allowed":true}"#,
                    )
                    .await;
                }
            }
        }
        // Security captcha answers (mirrors the onMemberJoin collector).
        self.security_answer(&_ctx, &msg).await;
        // Custom automod enforcement (link/invite/telegram/mass-mention).
        {
            let content = &msg.content;
            let tripped = (self.automod_on(&gid, "discord-invite").await
                && crate::commands::guildconfig::contains_discord_invite(content))
                || (self.automod_on(&gid, "telegram-link").await
                    && crate::commands::guildconfig::contains_telegram_link(content))
                || (self.automod_on(&gid, "link").await
                    && crate::commands::guildconfig::contains_link(content))
                || (self.automod_on(&gid, "mass-mention").await
                    && crate::commands::guildconfig::mention_count(content) >= 5);
            if tripped {
                let _ = msg.delete(&_ctx.http).await;
                return;
            }
        }
        // XP ignore gate (mirrors !ignore-channels.ts).
        let ignore_raw = crate::db::kv_get(&self.pool, &gid, "GUILD.RANKS.ignoreChannels").await;
        let ignore: Vec<String> = ignore_raw
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        let xp_only: Vec<String> = crate::db::kv_get(&self.pool, &gid, "GUILD.RANKS.xpChannels")
            .await
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        if crate::events::should_gain_xp(&ignore, &ch_id)
            && (xp_only.is_empty() || xp_only.contains(&ch_id))
        {
            let before =
                crate::commands::ranks::main::load_rank(&self.pool, &gid, msg.author.id.get())
                    .await
                    .level;
            let (level, leveled) = crate::events::record_message_activity(
                &self.pool,
                &gid,
                msg.author.id.get(),
                msg.channel_id.get(),
                msg.content.len() as u64,
                msg.timestamp.unix_timestamp() * 1000,
            )
            .await;
            if leveled {
                // Level-up message (template or default).
                // Mirrors ranks/onNewMessage.ts: GUILD.RANKS.message
                // template, else the event_xp_level_earn lang key.
                let stored_tpl = crate::db::kv_get(&self.pool, &gid, "GUILD.RANKS.message").await;
                let tpl = match stored_tpl {
                    Some(t) => t,
                    None => {
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                        crate::lang::get(&lang_code, "event_xp_level_earn")
                            .map(|s| {
                                s.replace("{memberMention}", &msg.author.mention().to_string())
                                    .replace("{xpLevel}", &level.to_string())
                            })
                            .unwrap_or_else(|| "Level up! {user} is now level {level}.".to_string())
                    }
                };
                let text = tpl
                    .replace("{user}", &msg.author.mention().to_string())
                    .replace("{level}", &level.to_string());
                let _ = msg.channel_id.say(&_ctx.http, text).await;
                // Rank-role rewards.
                let roles_raw = crate::db::kv_get(&self.pool, &gid, "GUILD.RANKS.roles").await;
                let roles: Vec<crate::commands::ranks::main::RankRole> = roles_raw
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
                for role_id in crate::events::roles_earned(&roles, before, level) {
                    if let Ok(rid) = role_id.parse::<u64>() {
                        if let Ok(member) = guild_id.member(&_ctx.http, msg.author.id).await {
                            let _ = member
                                .add_role(&_ctx.http, poise::serenity_prelude::RoleId::new(rid))
                                .await;
                        }
                    }
                }
            }
        }
        // Counting game. Mirrors Events/counter/onNewMessage.ts
        // (bots/webhooks/empty messages skip; wrong entries reset
        // COUNTER_DATA to zero with ✅/❌ reactions, replies and
        // topic updates).
        if msg.webhook_id.is_none() && !msg.content.trim().is_empty() {
            if let Some(counter_ch) = crate::db::kv_get(&self.pool, &gid, "COUNTER.channel").await {
                if counter_ch == msg.channel_id.get().to_string() {
                    let enabled = crate::db::kv_get(&self.pool, &gid, "COUNTER.config")
                        .await
                        .map(|v| v != "off")
                        .unwrap_or(true);
                    if enabled {
                        use crate::commands::newfeatures as nf;
                        let author_id = msg.author.id.get().to_string();
                        let raw = crate::db::kv_get(&self.pool, &gid, "COUNTER_DATA").await;
                        let last = nf::parse_counter_data(raw.as_deref());
                        let code = crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                        let text = |key: &str, fallback: &str| {
                            crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
                        };
                        let reset = || {
                            nf::counter_data_json(&nf::CounterData {
                                amount: 0,
                                user_id: None,
                            })
                        };
                        match nf::counter_step(&last, &author_id, &msg.content) {
                            nf::CounterOutcome::Accept { number } => {
                                let data = nf::CounterData {
                                    amount: number,
                                    user_id: Some(author_id),
                                };
                                let _ = crate::db::kv_set(
                                    &self.pool,
                                    &gid,
                                    "COUNTER_DATA",
                                    &nf::counter_data_json(&data),
                                )
                                .await;
                                let _ = msg.react(&_ctx.http, '✅').await;
                                let topic =
                                    text("counter_actual_number", "Current Number: {number}")
                                        .replace("{number}", &number.to_string());
                                let _ = msg
                                    .channel_id
                                    .edit(&_ctx.http, serenity::EditChannel::new().topic(topic))
                                    .await;
                            }
                            nf::CounterOutcome::WrongNumber { same_user, number } => {
                                let _ = msg.react(&_ctx.http, '❌').await;
                                let _ =
                                    crate::db::kv_set(&self.pool, &gid, "COUNTER_DATA", &reset())
                                        .await;
                                if same_user {
                                    let reply = text(
                                        "counter_error_too_much_u",
                                        "You cannot count twice in a row. Next number is 1.",
                                    )
                                    .replace(
                                        "${message.author.id}",
                                        &msg.author.id.get().to_string(),
                                    )
                                    .replace("${number}", &number.to_string());
                                    let _ = msg.reply(&_ctx.http, reply).await;
                                } else {
                                    let reply = text(
                                        "counter_error_syntaxic",
                                        "Wrong number. Next number is 1.",
                                    )
                                    .replace(
                                        "${message.author.id}",
                                        &msg.author.id.get().to_string(),
                                    );
                                    let _ = msg.reply(&_ctx.http, reply).await;
                                }
                            }
                            nf::CounterOutcome::NotNumber => {
                                let _ = msg.react(&_ctx.http, '❌').await;
                                let _ =
                                    crate::db::kv_set(&self.pool, &gid, "COUNTER_DATA", &reset())
                                        .await;
                                let reply = text(
                                    "counter_error_syntaxic",
                                    "Wrong number. Next number is 1.",
                                )
                                .replace("${message.author.id}", &msg.author.id.get().to_string());
                                let _ = msg.reply(&_ctx.http, reply).await;
                            }
                        }
                    }
                }
            }
        }
        // Mirrors Events/utils/picOnlyModule.ts: media-only channels.
        if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "UTILS.picOnly").await {
            let list: Vec<String> = serde_json::from_str(&raw).unwrap_or_default();
            if list.contains(&msg.channel_id.get().to_string()) {
                let has_media = !msg.attachments.is_empty()
                    || msg
                        .embeds
                        .iter()
                        .any(|e| e.image.is_some() || e.thumbnail.is_some() || e.video.is_some());
                if !has_media {
                    let _ = msg.delete(&_ctx.http).await;
                    return;
                }
            }
        }
        // Mirrors Events/guildconfig/autoreact.ts (master switch first).
        let autoreact_on = crate::db::kv_get(&self.pool, &gid, "GUILD.AUTOREACT.enabled")
            .await
            .map(|v| v != "0")
            .unwrap_or(true);
        if autoreact_on {
            Self::autoreact_emit(&self.pool, &_ctx.http, &gid, &msg).await;
        }
        // Mirrors Events/sticky/onNewMessage.ts: 5s debounced
        // repost of the enabled sticky (bot/webhook messages skip).
        if !msg.author.bot && msg.webhook_id.is_none() {
            if let Some(guild_id) = msg.guild_id {
                if crate::commands::sticky::main::load_sticky(
                    &self.pool,
                    &gid,
                    msg.channel_id.get(),
                )
                .await
                .is_some()
                {
                    crate::commands::sticky::main::schedule_refresh(
                        _ctx.http.clone(),
                        _ctx.cache.clone(),
                        self.pool.clone(),
                        gid.clone(),
                        guild_id,
                        msg.channel_id,
                    );
                }
            }
        }
        // Mirrors Events/suggestion/onNewMessage.ts: thread + record + votes.
        if let Some(suggest_ch) = crate::db::kv_get(&self.pool, &gid, "SUGGEST.channel").await {
            if suggest_ch == msg.channel_id.get().to_string() {
                let disabled = crate::db::kv_get(&self.pool, &gid, "SUGGEST.disable")
                    .await
                    .as_deref()
                    == Some("1");
                if !disabled {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_nanos() as u64)
                        .unwrap_or(1);
                    let code = crate::commands::suggestion::gen_suggest_code(now);
                    if let Ok(thread) = msg
                        .channel_id
                        .create_thread(&_ctx.http, serenity::CreateThread::new(format!("#{code}")))
                        .await
                    {
                        let rec = crate::commands::suggestion::Suggestion {
                            author: msg.author.id.get().to_string(),
                            msg_id: msg.id.get().to_string(),
                            thread_id: thread.id.get().to_string(),
                            status: "open".to_string(),
                        };
                        let _ = crate::db::kv_set(
                            &self.pool,
                            &gid,
                            &crate::commands::suggestion::suggestion_key(&code),
                            &serde_json::to_string(&rec).unwrap_or_default(),
                        )
                        .await;
                    }
                    let _ = msg
                        .react(&_ctx.http, serenity::ReactionType::Unicode("⬆️".into()))
                        .await;
                    let _ = msg
                        .react(&_ctx.http, serenity::ReactionType::Unicode("⬇️".into()))
                        .await;
                }
            }
        }
        // Mirrors Events/utils/autoFeur.ts + antiExe.ts + custom reacts.
        {
            use crate::commands::legacy;
            let raw = crate::db::kv_get(&self.pool, &gid, "UTILS.autoFeur").await;
            if legacy::autofeur_on(raw.clone()) {
                let lang = crate::db::guild_lang(&self.pool, msg.guild_id.map(|g| g.get())).await;
                if lang == "fr-ME" {
                    if let Some(reply) = legacy::autofeur_match(&msg.content) {
                        let now = crate::commands::context::now_ms();
                        if legacy::autofeur_cooldown_ok(now, msg.author.id.get()) {
                            let mut text = reply.to_string();
                            // Promo suffix 1/8 when never configured.
                            if raw.is_none() && {
                                use rand::Rng;
                                rand::thread_rng().gen_range(0..8) == 0
                            } {
                                let prefix = crate::db::guild_prefix(
                                    &self.pool,
                                    msg.guild_id.map(|g| g.get()),
                                    "?",
                                )
                                .await;
                                let emoji =
                                    crate::emojis::app_emoji_markup(&_ctx.http, "VC_OpenChat")
                                        .await
                                        .unwrap_or_default();
                                text += &legacy::autofeur_promo(&emoji, &prefix);
                            }
                            let _ = msg.reply(&_ctx.http, text).await;
                        }
                    }
                } else if legacy::is_quoi_bait(&msg.content) {
                    let _ = msg.reply(&_ctx.http, "feur.").await;
                }
            }
            let raw = crate::db::kv_get(&self.pool, &gid, "UTILS.antiExe").await;
            if crate::commands::legacy::flag_on(raw) {
                let names: Vec<String> =
                    msg.attachments.iter().map(|a| a.filename.clone()).collect();
                if crate::commands::legacy::has_blocked_exe(&names) {
                    let _ = msg.delete(&_ctx.http).await;
                    return;
                }
            }
            // Custom + greeting reacts (mirrors
            // guildconfig/reactToMessage.ts): literal `false` in
            // GUILD.GUILD_CONFIG.hey_reaction disables; otherwise a
            // case-insensitive trigger substring earns its emoji react
            // and a greeting first word earns a wave.
            let hey_off = crate::db::kv_get(&self.pool, &gid, "GUILD.GUILD_CONFIG.hey_reaction")
                .await
                .as_deref()
                == Some("false");
            if !hey_off {
                let lowered = msg.content.to_ascii_lowercase();
                let triggers: Vec<String> = sqlx::query_scalar(
                    "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GUILD.REACT_MSG.%'",
                )
                .bind(&gid)
                .fetch_all(&self.pool)
                .await
                .unwrap_or_default();
                for key in triggers {
                    if let Some(trigger) = key.strip_prefix("GUILD.REACT_MSG.") {
                        if !trigger.is_empty() && lowered.contains(trigger) {
                            if let Some(emoji) = crate::db::kv_get(&self.pool, &gid, &key).await {
                                let _ = msg
                                    .react(
                                        &_ctx.http,
                                        crate::commands::legacy::parse_react_emoji(&emoji),
                                    )
                                    .await;
                            }
                            break;
                        }
                    }
                }
                if crate::commands::legacy::is_greeting_word(&msg.content) {
                    let _ = msg
                        .react(
                            &_ctx.http,
                            serenity::ReactionType::Unicode("👋".to_string()),
                        )
                        .await;
                }
            }
        }
        // Mirrors Events/github-lines/onNewMessage.ts: unfurl code
        // links (GitHub/GitLab/Gist) with spam/limit guards.
        if !msg.author.bot && msg.webhook_id.is_none() {
            let stored = crate::db::kv_get(&self.pool, &gid, "UTILS.git_lines").await;
            if crate::commands::utils::github_lines_enabled(stored.as_deref()) {
                let targets = crate::commands::utils::extract_git_targets(&msg.content);
                if !targets.is_empty() {
                    let code =
                        crate::db::guild_lang(&self.pool, msg.guild_id.map(|g| g.get())).await;
                    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
                    let mut items = vec![];
                    for target in &targets {
                        if let Some(d) = crate::commands::utils::fetch_git_target(target).await {
                            items.push(d);
                        }
                    }
                    let total: usize = items.iter().map(|d| d.line_length).sum();
                    // Shared 5s auto-delete for the guard replies.
                    let auto_delete =
                        |sent: serenity::Message, http: std::sync::Arc<serenity::Http>| {
                            tokio::spawn(async move {
                                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                                let _ = http.delete_message(sent.channel_id, sent.id, None).await;
                            });
                        };
                    if total > 50 {
                        if let Ok(sent) = msg
                            .channel_id
                            .say(&_ctx.http, t("git_lines_avoiding_spam"))
                            .await
                        {
                            auto_delete(sent, _ctx.http.clone());
                        }
                    } else {
                        let joined = items
                            .iter()
                            .map(|d| crate::commands::utils::render_block(&d.display, &d.extension))
                            .collect::<Vec<_>>()
                            .join("\n");
                        if joined.is_empty() {
                            // No resolvable snippet: silent, like botMsg null.
                        } else if joined.len() >= 2000 {
                            if let Ok(sent) = msg
                                .channel_id
                                .say(&_ctx.http, t("git_lines_avoiding_limit"))
                                .await
                            {
                                auto_delete(sent, _ctx.http.clone());
                            }
                        } else {
                            let mut out = joined;
                            // Promo upsell on first sight (key absent, 1/8).
                            if stored.is_none() && rand::random::<u8>().is_multiple_of(8) {
                                let promo = t("git_lines_borred_warning");
                                if let Some(chat) =
                                    crate::emojis::app_emoji_markup(&_ctx.http, "VC_OpenChat").await
                                {
                                    out.push_str(
                                        &promo.replace(
                                            "${client.iHorizon_Emojis.VC_OpenChat}",
                                            &chat,
                                        ),
                                    );
                                }
                            }
                            if let Ok(sent) = msg.channel_id.say(&_ctx.http, out).await {
                                // Author-only trash delete (15s, like the TS
                                // reaction collector); spawned so the event
                                // handler never blocks.
                                let http = _ctx.http.clone();
                                let shard = _ctx.shard.clone();
                                let author = msg.author.id;
                                tokio::spawn(async move {
                                    let trash = serenity::ReactionType::Unicode("🗑️".to_string());
                                    let _ = sent.react(&http, trash.clone()).await;
                                    let collected =
                                        serenity::collector::ReactionCollector::new(&shard)
                                            .channel_id(sent.channel_id)
                                            .message_id(sent.id)
                                            .author_id(author)
                                            .timeout(std::time::Duration::from_secs(15))
                                            .next()
                                            .await;
                                    match collected {
                                        Some(r) if r.emoji == trash => {
                                            let _ = http
                                                .delete_message(sent.channel_id, sent.id, None)
                                                .await;
                                        }
                                        _ => {
                                            let _ = http
                                                .delete_reaction_me(
                                                    sent.channel_id,
                                                    sent.id,
                                                    &trash,
                                                )
                                                .await;
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
        // Mirrors Events/antispam/onNewMessage.ts sliding window.
        // Bypass roles/channels are exempt.
        let bypassed = {
            let bypass_roles: Vec<String> =
                crate::db::kv_get(&self.pool, &gid, "GUILD.ANTISPAM.BYPASS_ROLES")
                    .await
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            let bypass_channels: Vec<String> =
                crate::db::kv_get(&self.pool, &gid, "GUILD.ANTISPAM.BYPASS_CHANNELS")
                    .await
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
            let member_roles: Vec<String> = msg
                .member
                .as_ref()
                .map(|m| m.roles.iter().map(|r| r.get().to_string()).collect())
                .unwrap_or_default();
            bypass_channels.contains(&msg.channel_id.get().to_string())
                || member_roles.iter().any(|r| bypass_roles.contains(r))
        };
        if !bypassed {
            if let Some(raw) = crate::db::kv_get(
                &self.pool,
                &gid,
                crate::commands::antispam::main::ANTISPAM_KEY,
            )
            .await
            {
                if let Ok(cfg) =
                    serde_json::from_str::<crate::commands::antispam::main::AntispamConfig>(&raw)
                {
                    if cfg.enabled {
                        let now = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_millis() as i64)
                            .unwrap_or(0);
                        let slot = format!("{gid}.{}", msg.author.id.get());
                        let mut spam = self.spam.lock().await;
                        let entry = spam.entry(slot).or_default();
                        entry.push(now);
                        entry.retain(|t| now - t <= cfg.max_interval_ms);
                        if crate::commands::antispam::main::window_tripped(
                            entry.len() as u32,
                            cfg.threshold,
                            cfg.max_interval_ms,
                            cfg.max_interval_ms,
                        ) {
                            entry.clear();
                            drop(spam);
                            let _ = msg.delete(&_ctx.http).await;
                            if let Some(guild_id) = msg.guild_id {
                                if let Ok(mut member) =
                                    guild_id.member(&_ctx.http, msg.author.id).await
                                {
                                    let until = serenity::Timestamp::from_unix_timestamp(
                                        std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .map(|d| d.as_secs() as i64)
                                            .unwrap_or(0)
                                            + (cfg.punish_time_ms / 1000).max(60),
                                    );
                                    if let Ok(until) = until {
                                        let _ = member
                                            .disable_communication_until_datetime(&_ctx.http, until)
                                            .await;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        self.check_punishpub(&_ctx, &gid, &msg).await;
        // Honeypot trap trigger (debounced two-pass pipeline).
        // Mirrors honeypotManager scheduleHoneypotTrigger.
        crate::commands::honeypot::main::schedule_trap(&_ctx, &self.pool, &msg);
    }

    async fn message_delete(
        &self,
        ctx: serenity::Context,
        channel_id: serenity::ChannelId,
        deleted_message_id: serenity::MessageId,
        guild_id: Option<serenity::GuildId>,
    ) {
        // Mirrors utils/snipeModule.ts: keep last deleted id per guild.
        // Full content needs cache; we store the id marker only.
        if let Some(gid) = guild_id {
            let gid = gid.get().to_string();
            // Full content from the message cache (mirrors snipeModule.ts).
            let snap: Option<String> =
                ctx.cache
                    .message(channel_id, deleted_message_id)
                    .map(|cached| {
                        serde_json::json!({
                            "author": cached.author.tag(),
                            "content": cached.content.clone(),
                        })
                        .to_string()
                    });
            if let Some(snap) = snap {
                let _ = crate::db::kv_set(
                    &self.pool,
                    &gid,
                    &format!("SNIPE.{}", channel_id.get()),
                    &snap,
                )
                .await;
            }
            let _ = crate::db::kv_set(
                &self.pool,
                &gid,
                "SNIPE.last_deleted_id",
                &deleted_message_id.get().to_string(),
            )
            .await;
            // Drop any ticket-panel marker bound to the deleted message
            // (mirrors deleteTicketPanelOnMessageDelete.ts).
            let _ = crate::db::kv_del(
                &self.pool,
                &gid,
                &format!("GUILD.TICKET.{}", deleted_message_id.get()),
            )
            .await;
            // Rich delete log (mirrors logs/messageDeleteLogs.ts):
            // #010101 embed with author + content from the message
            // cache, attachments re-uploaded; silent on cache miss.
            // The bot's own messages are skipped, like TS.
            // Owned snapshot first: the cache guard is not Send and
            // must drop before any await.
            let snap: Option<(u64, String, String, String, Vec<(String, String, String)>)> = ctx
                .cache
                .message(channel_id, deleted_message_id)
                .map(|cached| {
                    (
                        cached.author.id.get(),
                        cached.author.name.clone(),
                        cached.author.avatar_url().unwrap_or_default(),
                        cached.content.clone(),
                        cached
                            .attachments
                            .iter()
                            .take(5)
                            .map(|a| {
                                (
                                    a.url.clone(),
                                    a.filename.clone(),
                                    a.content_type.clone().unwrap_or_default(),
                                )
                            })
                            .collect(),
                    )
                });
            if let Some((author_id, author_name, avatar, content, attachments)) = snap {
                if author_id != ctx.cache.current_user().id.get() {
                    let logs_ch: Option<u64> =
                        crate::db::kv_get(&self.pool, &gid, "GUILD.SERVER_LOGS.message")
                            .await
                            .and_then(|s| s.parse().ok());
                    if let Some(logs_ch) = logs_ch {
                        let lang_code =
                            crate::db::guild_lang(&self.pool, Some(gid.parse().unwrap_or(0))).await;
                        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                        let desc = text("event_srvLogs_messageDelete_description")
                            .replace("${message.channel.id}", &channel_id.get().to_string())
                            .replace("${message.content}", &format!(" {content}"));
                        let mut embed = serenity::CreateEmbed::default()
                            .colour(0x010101_u32)
                            .author(serenity::CreateEmbedAuthor::new(author_name).icon_url(avatar))
                            .description(desc)
                            .timestamp(serenity::Timestamp::now());
                        let mut files = vec![];
                        if attachments.len() == 1 && attachments[0].2.starts_with("image/") {
                            if let Some(bytes) =
                                crate::commands::botcat::download_bytes(&attachments[0].0).await
                            {
                                files.push(serenity::CreateAttachment::bytes(
                                    bytes,
                                    "sniped-image-by-ihorizon.png",
                                ));
                                embed = embed.image("attachment://sniped-image-by-ihorizon.png");
                            }
                        } else {
                            for (url, filename, _) in &attachments {
                                if let Some(bytes) =
                                    crate::commands::botcat::download_bytes(url).await
                                {
                                    files.push(serenity::CreateAttachment::bytes(
                                        bytes,
                                        filename.clone(),
                                    ));
                                }
                            }
                        }
                        let _ = serenity::ChannelId::new(logs_ch)
                            .send_message(
                                &ctx.http,
                                serenity::CreateMessage::new().embed(embed).files(files),
                            )
                            .await;
                    }
                }
            }
            // Cache miss: TS messageDeleteLogs.ts reads the message
            // from cache and stays silent without it — no fallback.
        }
    }

    async fn message_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::Message>,
        new: Option<serenity::Message>,
        _event: serenity::MessageUpdateEvent,
    ) {
        // Rich edit log (mirrors logs/messageUpdateLogs.ts): #010101
        // embed with author, jump link, Before/After fields (or the
        // ```diff block past 160 chars). Bots and empty contents
        // are skipped, like TS.
        if let (Some(old), Some(new)) = (old, new) {
            if new.author.bot || old.content.is_empty() || new.content.is_empty() {
                return;
            }
            if old.content == new.content {
                return;
            }
            let Some(gid) = new.guild_id else {
                return;
            };
            let gid = gid.get().to_string();
            let logs_ch: Option<u64> =
                crate::db::kv_get(&self.pool, &gid, "GUILD.SERVER_LOGS.message")
                    .await
                    .and_then(|s| s.parse().ok());
            let Some(logs_ch) = logs_ch else {
                return;
            };
            let lang_code = crate::db::guild_lang(&self.pool, new.guild_id.map(|g| g.get())).await;
            let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
            let jump = format!(
                "(https://discord.com/channels/{}/{}/{})",
                gid,
                new.channel_id.get(),
                new.id.get()
            );
            let desc = text("event_srvLogs_messageUpdate_description")
                .replace("${oldMessage.channelId}", &new.channel_id.get().to_string())
                .replace("(xxx)", &jump);
            let avatar = new.author.avatar_url().unwrap_or_default();
            let mut embed = serenity::CreateEmbed::default()
                .colour(0x010101_u32)
                .author(serenity::CreateEmbedAuthor::new(new.author.name.clone()).icon_url(avatar))
                .description(desc)
                .timestamp(serenity::Timestamp::now());
            if old.content.len() > 160 || new.content.len() > 160 {
                embed = embed.field(
                    text("var_message"),
                    crate::events::message_diff(&old.content, &new.content),
                    false,
                );
            } else {
                embed = embed
                    .field(
                        text("event_srvLogs_messageUpdate_footer_1"),
                        old.content.clone(),
                        false,
                    )
                    .field(
                        text("event_srvLogs_messageUpdate_footer_2"),
                        new.content.clone(),
                        false,
                    );
            }
            let _ = serenity::ChannelId::new(logs_ch)
                .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                .await;
        }
    }

    async fn voice_state_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::VoiceState>,
        new: serenity::VoiceState,
    ) {
        let Some(guild_id) = new.guild_id else {
            return;
        };
        let gid = guild_id.get().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        // Lavalink voice handshake, state half (mirrors the raw.ts
        // voice-packet forward): our own VoiceStateUpdate carries the
        // Discord session id. Noted always; pushed to the node only
        // while joined (channel None = leaving, nothing to forward).
        if new.user_id == ctx.cache.current_user().id {
            let m = crate::lavalink::manager();
            let combined = m
                .note_voice_state(
                    guild_id.get(),
                    new.channel_id.map(|c| c.get()),
                    new.session_id.clone(),
                )
                .await;
            if new.channel_id.is_some() {
                if let Some(voice) = combined {
                    let _ = m.push_voice_state(guild_id.get(), voice).await;
                }
            }
        }
        // H247 24/7 rejoin guard (mirrors Events/h247/voiceState.ts +
        // handleH247VoiceStateChange -> ensureH247VoicePresence): only
        // the bot's own channel change can break the presence. The
        // voluntary /h247 leave deletes GUILD.H247 first, so this
        // resolves to a no-op then. Rejoin goes out as a gateway OP4
        // voice-state update (send_voice_state), like sendH247VoiceStateUpdate.
        if crate::commands::ranks::grant::h247_voice_broken(
            new.user_id == ctx.cache.current_user().id,
            old.as_ref().and_then(|o| o.channel_id).map(|c| c.get()),
            new.channel_id.map(|c| c.get()),
        ) {
            if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "GUILD.H247").await {
                let target = crate::commands::ranks::grant::h247_rejoin_target(
                    crate::commands::ranks::grant::parse_h247(&raw).as_ref(),
                    new.channel_id.map(|c| c.get()),
                );
                if let Some(ch) = target {
                    crate::lavalink::LavalinkManager::send_voice_state(
                        &ctx.shard,
                        guild_id.get(),
                        Some(ch),
                    );
                    tracing::info!("h247 rejoin {} -> {}", gid, ch);
                }
            }
        }
        // Rich voice log (mirrors logs/voiceLogs.ts).
        self.voice_state_log(&ctx, &gid, old.as_ref(), &new).await;
        // Session tracking (mirrors stats/onVoiceUpdate.ts + economy coins).
        match (old.as_ref().and_then(|o| o.channel_id), new.channel_id) {
            (old_ch, Some(new_ch)) if old_ch != Some(new_ch) => {
                // Boost from shop roles (mirrors getMemberBoost in
                // processSessionEnd, also applied on move).
                let roles: Vec<u64> = guild_id
                    .member(&ctx.http, new.user_id)
                    .await
                    .map(|m| m.roles.iter().map(|r| r.get()).collect())
                    .unwrap_or_default();
                let shop_raw = crate::db::kv_get(&self.pool, &gid, "ECONOMY.buyableRoles")
                    .await
                    .unwrap_or_default();
                let boost =
                    crate::commands::economy::main::member_boost(&shop_raw, &roles).max(1) as u64;
                crate::events::voice_switch(
                    &self.pool,
                    &gid,
                    new.user_id.get(),
                    new_ch.get(),
                    now,
                    boost,
                    true,
                )
                .await;
                // Leash follow (mirrors leashModule.ts): drag followers along.
                let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
                    "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'UTILS.LEASH.%'",
                )
                .bind(&gid)
                .fetch_all(&self.pool)
                .await
                .unwrap_or_default();
                for (key, target) in rows {
                    if target == new.user_id.get().to_string() {
                        if let Some(fid) = key
                            .strip_prefix("UTILS.LEASH.")
                            .and_then(|x| x.parse::<u64>().ok())
                        {
                            let _ = guild_id
                                .move_member(
                                    &ctx.http,
                                    poise::serenity_prelude::UserId::new(fid),
                                    new_ch,
                                )
                                .await;
                        }
                    }
                }
                // Lobby spawn (mirrors voicedashboard): temp channel + move.
                if let Some(lobby) =
                    crate::db::kv_get(&self.pool, &gid, "GUILD.VOICE_INTERFACE.voice_channel").await
                {
                    if lobby == new_ch.get().to_string() {
                        let name = new
                            .member
                            .as_ref()
                            .map(|m| m.user.name.clone())
                            .unwrap_or_else(|| "voice".to_string());
                        // Name template (VOICE_INTERFACE.voice_channel_name,
                        // {user} placeholder) or default.
                        let tpl = crate::db::kv_get(
                            &self.pool,
                            &gid,
                            "VOICE_INTERFACE.voice_channel_name",
                        )
                        .await
                        .filter(|t| !t.trim().is_empty());
                        let title = match tpl {
                            Some(t) => t.replace("{user}", &name),
                            None => {
                                let lang_code =
                                    crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                                crate::events::temp_channel_name_in(
                                    &name,
                                    crate::lang::get(&lang_code, "temporary_voice_channel_name")
                                        .as_deref(),
                                )
                            }
                        };
                        let builder =
                            serenity::CreateChannel::new(title).kind(serenity::ChannelType::Voice);
                        if let Ok(ch) = guild_id.create_channel(&ctx.http, builder).await {
                            let _ = guild_id.move_member(&ctx.http, new.user_id, ch.id).await;
                            let _ = crate::db::kv_set(
                                &self.pool,
                                &gid,
                                &crate::events::temp_voice_key(guild_id.get(), new.user_id.get()),
                                &ch.id.get().to_string(),
                            )
                            .await;
                            // Dashboard panel (mirrors voicedashboard interface).
                            let _ = ch
                                .send_message(
                                    &ctx.http,
                                    serenity::CreateMessage::new()
                                        .content("Manage your channel:")
                                        .components(
                                            crate::commands::voicedashboard::main::tempvoice_buttons(),
                                        ),
                                )
                                .await;
                        }
                        return;
                    }
                }
            }
            (Some(_), None) => {
                // Member gate (mirrors `newState.member` in processSessionEnd):
                // a user who left the guild earns nothing. Roles prefer the
                // event member, falling back to a fetch.
                let (roles, present) = match new.member.as_ref() {
                    Some(m) => (m.roles.iter().map(|r| r.get()).collect(), true),
                    None => match guild_id.member(&ctx.http, new.user_id).await {
                        Ok(m) => (m.roles.iter().map(|r| r.get()).collect(), true),
                        Err(_) => (vec![], false),
                    },
                };
                let shop_raw = crate::db::kv_get(&self.pool, &gid, "ECONOMY.buyableRoles")
                    .await
                    .unwrap_or_default();
                let boost =
                    crate::commands::economy::main::member_boost(&shop_raw, &roles).max(1) as u64;
                crate::events::voice_leave(
                    &self.pool,
                    &gid,
                    new.user_id.get(),
                    now,
                    boost,
                    present,
                )
                .await;
            }
            _ => {}
        }
        // Voice freeze enforcement (mirrors voiceTalkFreeze.ts).
        if new.channel_id.is_some() {
            if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "UTILS.VOICE_FREEZE").await {
                // Array shape: frozen member list. Object shape: channel-bound
                // freeze with allowedUsers (mirrors !wlvc.ts).
                let frozen_member = serde_json::from_str::<Vec<String>>(&raw)
                    .map(|list| list.contains(&new.user_id.get().to_string()))
                    .unwrap_or(false);
                let frozen_channel = serde_json::from_str::<serde_json::Value>(&raw)
                    .ok()
                    .map(|v| {
                        let ch_ok = v.get("channelId").and_then(|c| c.as_str())
                            == Some(
                                &new.channel_id
                                    .map(|c| c.get().to_string())
                                    .unwrap_or_default(),
                            );
                        let allowed: Vec<String> = v
                            .get("allowedUsers")
                            .and_then(|a| serde_json::from_value(a.clone()).ok())
                            .unwrap_or_default();
                        ch_ok && !allowed.contains(&new.user_id.get().to_string())
                    })
                    .unwrap_or(false);
                if frozen_member || frozen_channel {
                    if let Ok(member) = guild_id.member(&ctx.http, new.user_id).await {
                        let mut member = member;
                        let _ = member
                            .edit(&ctx.http, serenity::EditMember::new().mute(true))
                            .await;
                    }
                }
            }
        }
        // Sweep emptied temp channels for this guild.
        let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
            "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'CUSTOM_VOICE.%.%'",
        )
        .bind(&gid)
        .fetch_all(&self.pool)
        .await
        .unwrap_or_default();
        for (key, ch_id) in rows {
            let Ok(ch_num) = ch_id.parse::<u64>() else {
                continue;
            };
            let occupied = ctx
                .cache
                .guild(guild_id)
                .map(|g| {
                    g.voice_states
                        .values()
                        .any(|v| v.channel_id == Some(serenity::ChannelId::new(ch_num)))
                })
                .unwrap_or(true);
            if !occupied {
                let _ = serenity::ChannelId::new(ch_num).delete(&ctx.http).await;
                let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                    .bind(&gid)
                    .bind(&key)
                    .execute(&self.pool)
                    .await;
            }
        }
        // Music empty-channel guard (mirrors
        // stopMusicOnEmptyVoiceChannel.ts, whose TS body is commented
        // out: bot alone in its music voice channel -> stop + OP4
        // leave + destroy the node player + notify the stored text
        // channel with event_mp_emptyChannel). Skipped for the bot's
        // own updates (it just joined/moved; humans may follow) and
        // when the cache guild is unavailable (no blind leaves).
        {
            let m = crate::lavalink::manager();
            let snap = m.snapshot(guild_id.get()).await;
            let bot_id = ctx.cache.current_user().id;
            if new.user_id != bot_id {
                if let Some(s) = snap {
                    if let (Some(vc), true) = (s.voice_channel, s.current.is_some()) {
                        let occupants = ctx
                            .cache
                            .guild(guild_id)
                            .map(|g| {
                                g.voice_states
                                    .values()
                                    .filter(|v| v.channel_id == Some(serenity::ChannelId::new(vc)))
                                    .count()
                            })
                            .unwrap_or(usize::MAX);
                        let alone = m
                            .with_player(guild_id.get(), |p| {
                                p.voice_channel == Some(vc)
                                    && crate::lavalink::LavalinkManager::should_leave_when_alone(
                                        p, occupants,
                                    )
                            })
                            .await;
                        if alone {
                            m.with_player(guild_id.get(), |p| p.stop(now)).await;
                            crate::lavalink::LavalinkManager::send_voice_state(
                                &ctx.shard,
                                guild_id.get(),
                                None,
                            );
                            if let Ok((node, session)) =
                                m.live_node_and_session(guild_id.get()).await
                            {
                                let _ = m.rest_destroy(&node, &session, guild_id.get()).await;
                            }
                            if let Some(tc) = s.text_channel {
                                let lang_code =
                                    crate::db::guild_lang(&self.pool, Some(guild_id.get())).await;
                                let msg = crate::lang::get(&lang_code, "event_mp_emptyChannel")
                                    .unwrap_or_default();
                                if !msg.is_empty() {
                                    let _ = serenity::ChannelId::new(tc).say(&ctx.http, msg).await;
                                }
                            }
                        }
                    }
                }
            }
        }
        // TTS memberless cleanup (mirrors Events/tts/voiceState.ts +
        // the offline leg of cleanupTTS in ttsManager.ts): someone left
        // the TTS voice channel and no non-bot member remains -> stop
        // playback, OP4-leave (unless H24/7 parks the bot there),
        // destroy the node player, delete the welcome embed
        // best-effort, drop GUILD.TTS. The Flowery speak leg stays TS.
        {
            let old_ch = old.as_ref().and_then(|o| o.channel_id).map(|c| c.get());
            let new_ch = new.channel_id.map(|c| c.get());
            if let Some(raw) = crate::db::kv_get(&self.pool, &gid, "GUILD.TTS").await {
                if crate::commands::tts::tts_row_enabled(&raw) {
                    if let Ok(cfg) = serde_json::from_str::<crate::commands::tts::TtsConfig>(&raw) {
                        if let Ok(tts_vc) = cfg.voice_channel_id.parse::<u64>() {
                            if crate::commands::tts::tts_voice_left(old_ch, new_ch, tts_vc) {
                                // Memberless check mirrors isMemberlessChannel
                                // (fresh fetch in TS; cache voice_states here).
                                // Missing cache guild = no blind leaves.
                                let bot_id = ctx.cache.current_user().id;
                                let humans = ctx.cache.guild(guild_id).map(|g| {
                                    g.voice_states
                                        .values()
                                        .filter(|v| {
                                            v.channel_id == Some(serenity::ChannelId::new(tts_vc))
                                                && v.user_id != bot_id
                                                && !ctx
                                                    .cache
                                                    .user(v.user_id)
                                                    .map(|u| u.bot)
                                                    .unwrap_or(false)
                                        })
                                        .count()
                                });
                                if humans == Some(0) {
                                    let keep =
                                        match crate::db::kv_get(&self.pool, &gid, "GUILD.H247")
                                            .await
                                        {
                                            Some(hraw) => crate::commands::tts::tts_keep_voice(
                                                crate::commands::ranks::grant::parse_h247(&hraw)
                                                    .as_ref(),
                                                tts_vc,
                                            ),
                                            None => false,
                                        };
                                    let m = crate::lavalink::manager();
                                    m.with_player(guild_id.get(), |p| p.stop(now)).await;
                                    if !keep {
                                        crate::lavalink::LavalinkManager::send_voice_state(
                                            &ctx.shard,
                                            guild_id.get(),
                                            None,
                                        );
                                    }
                                    if let Ok((node, session)) =
                                        m.live_node_and_session(guild_id.get()).await
                                    {
                                        let _ =
                                            m.rest_destroy(&node, &session, guild_id.get()).await;
                                    }
                                    if let Some((tc, msg)) =
                                        crate::commands::tts::tts_embed_ids(&raw)
                                    {
                                        if let Ok(message) = serenity::ChannelId::new(tc)
                                            .message(&ctx.http, serenity::MessageId::new(msg))
                                            .await
                                        {
                                            let _ = message.delete(&ctx.http).await;
                                        }
                                    }
                                    let _ = sqlx::query(
                                        "DELETE FROM kv WHERE guild_id = ? AND key_name = ?",
                                    )
                                    .bind(&gid)
                                    .bind("GUILD.TTS")
                                    .execute(&self.pool)
                                    .await;
                                    tracing::info!("tts cleanup {} channel {}", gid, tts_vc);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    async fn voice_server_update(
        &self,
        _ctx: serenity::Context,
        event: serenity::VoiceServerUpdateEvent,
    ) {
        // Lavalink voice handshake, server half (mirrors the raw.ts
        // voice-packet forward): token + endpoint. Combined with the
        // noted Discord session it is pushed to the node via
        // update_player. Best-effort: fails silently offline.
        let Some(guild_id) = event.guild_id else {
            return;
        };
        let Some(endpoint) = event.endpoint else {
            return;
        };
        let m = crate::lavalink::manager();
        if let Some(voice) = m
            .note_voice_server(guild_id.get(), event.token, endpoint)
            .await
        {
            let _ = m.push_voice_state(guild_id.get(), voice).await;
        }
    }

    async fn reaction_add(&self, ctx: serenity::Context, add: serenity::Reaction) {
        // Mirrors reactionrole/onReactAdd.ts (toggle) + starboard/onNewReact.ts.
        let Some(guild_id) = add.guild_id else { return };
        let Some(user_id) = add.user_id else { return };
        // The bot's own seeded reactions never trigger toggles.
        if user_id != ctx.cache.current_user().id {
            if let Some(role_id) =
                crate::commands::rolereactions::rolereaction::lookup_reaction_role(
                    &self.pool,
                    &guild_id.get().to_string(),
                    add.message_id.get(),
                    &add.emoji,
                )
                .await
            {
                // Missing roles are skipped (cache first, fetch fallback).
                let mut roles = ctx.cache.guild(guild_id).map(|g| g.roles.clone());
                if roles
                    .as_ref()
                    .map(|m| m.contains_key(&role_id))
                    .unwrap_or(false)
                    || guild_id
                        .roles(&ctx.http)
                        .await
                        .map(|m| {
                            let hit = m.contains_key(&role_id);
                            roles = Some(m);
                            hit
                        })
                        .unwrap_or(false)
                {
                    if let Ok(member) = guild_id.member(&ctx.http, user_id).await {
                        // Toggle, like the TS has/remove legs (no audit
                        // reason in serenity 0.12).
                        if member.roles.contains(&role_id) {
                            let _ = member.remove_role(&ctx.http, role_id).await;
                        } else {
                            let _ = member.add_role(&ctx.http, role_id).await;
                        }
                    }
                }
            }
        }
        // Mirrors starboard/skullboard onNewReact.ts (rich post/edit +
        // DATA entries + threads). Independent of the role handler.
        if let serenity::ReactionType::Unicode(emoji) = &add.emoji {
            if emoji == "⭐" || emoji == "💀" {
                let reactor_bot = ctx.cache.user(user_id).map(|u| u.bot).unwrap_or(false);
                if !reactor_bot {
                    if let Some((message, count)) =
                        board_source_message(&ctx, &add, emoji, add.message_id).await
                    {
                        board_reaction_add(
                            &self.pool,
                            &ctx,
                            guild_id.get(),
                            emoji,
                            &message,
                            count,
                        )
                        .await;
                    }
                }
            }
        }
    }

    async fn reaction_remove(&self, ctx: serenity::Context, removed: serenity::Reaction) {
        // Mirrors reactionrole/onReactRemove.ts (name-key lookup in
        // both legs, like the TS duplicate).
        if let (Some(guild_id), Some(user_id)) = (removed.guild_id, removed.user_id) {
            if user_id != ctx.cache.current_user().id {
                let name = match &removed.emoji {
                    serenity::ReactionType::Unicode(u) => u.clone(),
                    serenity::ReactionType::Custom { name, .. } => name.clone().unwrap_or_default(),
                    _ => String::new(),
                };
                if !name.is_empty() {
                    let gid = guild_id.get().to_string();
                    let key = format!("GUILD.REACTION_ROLES.{}.{}", removed.message_id.get(), name);
                    if let Some(role_id) = crate::db::kv_get(&self.pool, &gid, &key)
                        .await
                        .as_deref()
                        .and_then(crate::commands::rolereactions::rolereaction::parse_reaction_role)
                    {
                        if let Ok(member) = guild_id.member(&ctx.http, user_id).await {
                            let _ = member
                                .remove_role(&ctx.http, serenity::RoleId::new(role_id))
                                .await;
                        }
                    }
                }
            }
        }
        // Mirrors starboard/skullboard onDeletedReact.ts (delete or
        // re-render below/above threshold). Independent of roles.
        let Some(guild_id) = removed.guild_id else {
            return;
        };
        let emoji = match &removed.emoji {
            serenity::ReactionType::Unicode(u) => u.clone(),
            _ => return,
        };
        if emoji != "⭐" && emoji != "💀" {
            return;
        }
        if let Some(user_id) = removed.user_id {
            if ctx.cache.user(user_id).map(|u| u.bot).unwrap_or(false) {
                return;
            }
        }
        if let Some((message, count)) =
            board_source_message(&ctx, &removed, &emoji, removed.message_id).await
        {
            board_reaction_remove(&self.pool, &ctx, guild_id.get(), &emoji, &message, count).await;
        }
    }

    async fn user_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::CurrentUser>,
        new: serenity::CurrentUser,
    ) {
        // Mirrors prevnamesModule.ts (global username history).
        let key = crate::events::prevnames_key(new.id.get());
        let raw = crate::db::kv_get(&self.pool, "0", &key).await;
        let history: Vec<String> = raw
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        let next = crate::events::push_prevname(history, &new.name, crate::events::PREVNAMES_CAP);
        let _ = crate::db::kv_set(
            &self.pool,
            "0",
            &key,
            &serde_json::to_string(&next).unwrap_or_default(),
        )
        .await;
        // Rank-role username-change grant (mirrors
        // Events/utils/rankRoleModule_2.ts): on username/globalName
        // change, grant or remove the GUILD.RANK_ROLES role based on
        // whether the new names contain the configured substring.
        // Reuses the GUILD.RANK_ROLES.roles / .nicknames keys (no new keys).
        if !crate::commands::ranks::grant::names_changed(
            old.as_ref().map(|o| o.name.as_str()),
            old.as_ref().map(|o| o.global_name.as_deref()),
            &new.name,
            new.global_name.as_deref(),
        ) {
            return;
        }
        // Cache snapshot first (mirrors guilds.cache.filter(has member));
        // the guards are dropped before any await below.
        let gids: Vec<serenity::GuildId> = ctx
            .cache
            .guilds()
            .into_iter()
            .filter(|gid| {
                ctx.cache
                    .guild(*gid)
                    .map(|g| g.members.contains_key(&new.id))
                    .unwrap_or(false)
            })
            .collect();
        for gid in gids {
            let g = gid.get().to_string();
            let roles_raw = crate::db::kv_get(&self.pool, &g, "GUILD.RANK_ROLES.roles").await;
            let nick_raw = crate::db::kv_get(&self.pool, &g, "GUILD.RANK_ROLES.nicknames").await;
            let (Some(roles_raw), Some(nick_raw)) = (roles_raw, nick_raw) else {
                continue;
            };
            let Some(role_num) = crate::commands::ranks::grant::parse_role_id(&roles_raw) else {
                continue;
            };
            let matched = crate::commands::ranks::grant::rank_needles(&nick_raw)
                .iter()
                .any(|n| {
                    crate::commands::ranks::grant::username_matches(
                        &new.name,
                        new.global_name.as_deref(),
                        n,
                    )
                });
            let Ok(member) = gid.member(&ctx.http, new.id).await else {
                continue;
            };
            let role_id = serenity::RoleId::new(role_num);
            match crate::commands::ranks::grant::grant_decision(
                member.roles.contains(&role_id),
                matched,
            ) {
                crate::commands::ranks::grant::RankGrant::Grant => {
                    let _ = member.add_role(&ctx.http, role_id).await;
                }
                crate::commands::ranks::grant::RankGrant::Remove => {
                    let _ = member.remove_role(&ctx.http, role_id).await;
                }
                crate::commands::ranks::grant::RankGrant::Keep => {}
            }
        }
    }

    async fn guild_role_create(&self, ctx: serenity::Context, new: serenity::Role) {
        use serenity::model::guild::audit_log::{Action, RoleAction};
        self.protection_guard(
            &ctx,
            new.guild_id,
            Action::Role(RoleAction::Create),
            "createrole",
        )
        .await;
    }

    async fn guild_role_delete(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        removed_role_id: serenity::RoleId,
        removed_role_data_if_available: Option<serenity::Role>,
    ) {
        use serenity::model::guild::audit_log::{Action, RoleAction};
        self.protection_guard(
            &ctx,
            guild_id,
            Action::Role(RoleAction::Delete),
            "deleterole",
        )
        .await;
        // Live restore (mirrors avoidRoleDelete.ts): rebuild the role
        // from the event payload and re-add the snapshot members.
        self.restore_deleted_role(
            &ctx,
            guild_id,
            removed_role_id,
            &removed_role_data_if_available,
        )
        .await;
    }

    async fn guild_role_update(
        &self,
        ctx: serenity::Context,
        _old_data_if_available: Option<serenity::Role>,
        new: serenity::Role,
    ) {
        use serenity::model::guild::audit_log::{Action, RoleAction};
        self.protection_guard(
            &ctx,
            new.guild_id,
            Action::Role(RoleAction::Update),
            "updaterole",
        )
        .await;
    }

    async fn channel_create(&self, ctx: serenity::Context, channel: serenity::GuildChannel) {
        use serenity::model::guild::audit_log::{Action, ChannelAction};
        self.protection_guard(
            &ctx,
            channel.guild_id,
            Action::Channel(ChannelAction::Create),
            "createchannel",
        )
        .await;
        // No TS channel-create log file exists — the protection
        // guard above is the whole parity surface.
        // Setup embed for freshly created "ihorizon-logs" channels
        // (mirrors logs/ihorizon_logs.ts).
        if channel.name.contains("ihorizon-logs") {
            let lang_code = crate::db::guild_lang(&self.pool, Some(channel.guild_id.get())).await;
            let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
            let embed = serenity::CreateEmbed::default()
                .colour(0x1E1D22_u32)
                .title(text("event_channel_create_message_embed_title"))
                .description(text("event_channel_create_message_embed_description"));
            let _ = channel
                .id
                .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                .await;
        }
    }

    async fn channel_delete(
        &self,
        ctx: serenity::Context,
        channel: serenity::GuildChannel,
        _messages: Option<Vec<serenity::Message>>,
    ) {
        use serenity::model::guild::audit_log::{Action, ChannelAction};
        self.protection_guard(
            &ctx,
            channel.guild_id,
            Action::Channel(ChannelAction::Delete),
            "deletechannel",
        )
        .await;
        // No TS channel-delete log file exists — the protection
        // guard above is the whole parity surface.
        // Purge ticket rows bound to this channel (mirrors
        // deleteTicketPanel.ts).
        let gid = channel.guild_id.get().to_string();
        let _ =
            sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.%.' || ?")
                .bind(&gid)
                .bind(channel.id.get().to_string())
                .execute(&self.pool)
                .await;
        // Live restore (mirrors avoidChannelDelete.ts): clone-restore
        // the deleted channel/category from the structure snapshot.
        self.restore_deleted_channel(&ctx, &channel).await;
    }

    async fn channel_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::GuildChannel>,
        new: serenity::GuildChannel,
    ) {
        use serenity::model::guild::audit_log::{Action, ChannelAction, ChannelOverwriteAction};
        self.protection_guard(
            &ctx,
            new.guild_id,
            Action::Channel(ChannelAction::Update),
            "updatechannel",
        )
        .await;
        // Rich channel-update log (mirrors logs/channelUpdateLogs.ts):
        // latest ChannelUpdate + ChannelOverwriteUpdate audit entries
        // -> #010101 embed with the name/overwrite change list.
        // Silent when no audit entry, both executors are the bot, or
        // the diff is empty, like TS.
        let Some(old) = old else {
            return;
        };
        let gid = new.guild_id.get().to_string();
        let logs_ch: Option<u64> = crate::db::kv_get(&self.pool, &gid, "GUILD.SERVER_LOGS.channel")
            .await
            .and_then(|s| s.parse().ok());
        let Some(logs_ch) = logs_ch else {
            return;
        };
        let self_id = ctx.cache.current_user().id;
        let rel = new
            .guild_id
            .audit_logs(
                &ctx.http,
                Some(Action::Channel(ChannelAction::Update)),
                None,
                None,
                Some(1),
            )
            .await
            .ok();
        let rel2 = new
            .guild_id
            .audit_logs(
                &ctx.http,
                Some(Action::ChannelOverwrite(ChannelOverwriteAction::Update)),
                None,
                None,
                Some(1),
            )
            .await
            .ok();
        let (Some(rel), Some(rel2)) = (rel.as_ref(), rel2.as_ref()) else {
            return;
        };
        let (Some(e1), Some(e2)) = (rel.entries.first(), rel2.entries.first()) else {
            return;
        };
        if e1.user_id == self_id && e2.user_id == self_id {
            return;
        }
        let lang_code = crate::db::guild_lang(&self.pool, Some(new.guild_id.get())).await;
        let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
        let map_ow = |c: &serenity::GuildChannel| {
            c.permission_overwrites
                .iter()
                .map(|o| crate::events::PermOverwriteDiff {
                    id: match o.kind {
                        serenity::PermissionOverwriteType::Role(id) => id.get(),
                        serenity::PermissionOverwriteType::Member(id) => id.get(),
                        _ => 0,
                    },
                    is_role: matches!(o.kind, serenity::PermissionOverwriteType::Role(_)),
                    allow: o
                        .allow
                        .get_permission_names()
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                    deny: o
                        .deny
                        .get_permission_names()
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                })
                .collect::<Vec<_>>()
        };
        let old_ow = map_ow(&old);
        let new_ow = map_ow(&new);
        let mut changes =
            crate::events::channel_perm_diff(&old.name, &new.name, &old_ow, &new_ow, &text);
        if changes.is_empty() {
            return;
        }
        if changes.len() > 1024 {
            changes = format!("{}...", &changes[..1021]);
        }
        let executor_name = e1
            .user_id
            .to_user(&ctx.http)
            .await
            .map(|u| u.name.clone())
            .unwrap_or_else(|_| text("var_unknown"));
        let desc = text("event_srvLogs_channelUpdate_embed_desc")
            .replace("${newChannel.toString()}", &format!("<#{}>", new.id.get()));
        let embed = serenity::CreateEmbed::default()
            .colour(0x010101_u32)
            .author(serenity::CreateEmbedAuthor::new(executor_name))
            .description(desc)
            .field(text("event_srvLogs_messageUpdate_footer_2"), changes, false)
            .timestamp(serenity::Timestamp::now());
        let _ = serenity::ChannelId::new(logs_ch)
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }

    async fn guild_ban_addition(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        banned_user: serenity::User,
    ) {
        use serenity::model::guild::audit_log::{Action, MemberAction};
        self.protection_guard(
            &ctx,
            guild_id,
            Action::Member(MemberAction::BanAdd),
            "banmembers",
        )
        .await;
        // Rich audit embed (mirrors logs/addBanLogs.ts).
        self.mod_audit_log(
            &ctx,
            guild_id,
            Action::Member(MemberAction::BanAdd),
            "event_srvLogs_banAdd_description",
            banned_user.id.get(),
            None,
        )
        .await;
    }

    async fn guild_ban_removal(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        unbanned_user: serenity::User,
    ) {
        use serenity::model::guild::audit_log::{Action, MemberAction};
        self.protection_guard(
            &ctx,
            guild_id,
            Action::Member(MemberAction::BanRemove),
            "unbanmembers",
        )
        .await;
        // Rich audit embed (mirrors logs/removeBanLogs.ts).
        self.mod_audit_log(
            &ctx,
            guild_id,
            Action::Member(MemberAction::BanRemove),
            "event_srvLogs_banRemove_description",
            unbanned_user.id.get(),
            Some(&unbanned_user.name),
        )
        .await;
    }

    async fn guild_update(
        &self,
        ctx: serenity::Context,
        _old_data_if_available: Option<serenity::Guild>,
        new_data: serenity::PartialGuild,
    ) {
        use serenity::model::guild::audit_log::Action;
        self.protection_guard(&ctx, new_data.id, Action::GuildUpdate, "updateguild")
            .await;
    }

    async fn webhook_update(
        &self,
        ctx: serenity::Context,
        guild_id: serenity::GuildId,
        _belongs_to_channel_id: serenity::ChannelId,
    ) {
        use serenity::model::guild::audit_log::{Action, WebhookAction};
        self.protection_guard(
            &ctx,
            guild_id,
            Action::Webhook(WebhookAction::Create),
            "webhook",
        )
        .await;
    }

    async fn guild_member_update(
        &self,
        ctx: serenity::Context,
        old_if_available: Option<serenity::Member>,
        new: Option<serenity::Member>,
        _event: serenity::GuildMemberUpdateEvent,
    ) {
        // Role limits (mirrors !rolelimit.ts): drop over-cap roles.
        if let Some(ref updated) = new {
            let gid = updated.guild_id.get().to_string();
            for role_id in updated.roles.iter() {
                let key = format!("GUILD.UTILS.ROLE_LIMIT.{}", role_id.get());
                if let Some(limit) = crate::db::kv_get(&self.pool, &gid, &key)
                    .await
                    .and_then(|s| s.parse::<usize>().ok())
                {
                    let count = ctx
                        .cache
                        .guild(updated.guild_id)
                        .map(|g| {
                            g.members
                                .values()
                                .filter(|m| m.roles.contains(role_id))
                                .count()
                        })
                        .unwrap_or(0);
                    if count > limit.max(1) {
                        if let Ok(member) =
                            updated.guild_id.member(&ctx.http, updated.user.id).await
                        {
                            let _ = member.remove_role(&ctx.http, *role_id).await;
                        }
                    }
                }
            }
        }
        // Mirrors avoidAdminRankWithoutConsent.ts: punish fresh admin grants.
        let (Some(old), Some(new)) = (old_if_available, new) else {
            return;
        };
        let admin_roles = |member: &serenity::Member| -> Vec<u64> {
            member
                .roles
                .iter()
                .filter(|r| {
                    ctx.cache
                        .guild(new.guild_id)
                        .and_then(|g| g.roles.get(r).cloned())
                        .map(|role| role.permissions.administrator())
                        .unwrap_or(false)
                })
                .map(|r| r.get())
                .collect()
        };
        let before = admin_roles(&old);
        if admin_roles(&new).iter().any(|r| !before.contains(r)) {
            use serenity::model::guild::audit_log::{Action, MemberAction};
            self.protection_guard(
                &ctx,
                new.guild_id,
                Action::Member(MemberAction::RoleUpdate),
                "add_admin_roles",
            )
            .await;
        }
        // Any role add/remove (mirrors avoidMemberUpdate.ts).
        if old.roles != new.roles {
            use serenity::model::guild::audit_log::{Action, MemberAction};
            self.protection_guard(
                &ctx,
                new.guild_id,
                Action::Member(MemberAction::RoleUpdate),
                "updatemember",
            )
            .await;
        }
        // Rich role log (mirrors logs/rolesLogs.ts): latest
        // MemberRoleUpdate audit entry for the target -> #010101
        // embed with removed/added role mentions. Silent when roles
        // are unchanged, no log channel, no audit entry, the
        // executor is the bot, or the entry targets someone else.
        if old.roles != new.roles {
            let gid = new.guild_id.get().to_string();
            let logs_ch: Option<u64> =
                crate::db::kv_get(&self.pool, &gid, "GUILD.SERVER_LOGS.roles")
                    .await
                    .and_then(|s| s.parse().ok());
            if let Some(logs_ch) = logs_ch {
                use serenity::model::guild::audit_log::{Action, Change, MemberAction};
                let self_id = ctx.cache.current_user().id;
                if let Ok(logs) = new
                    .guild_id
                    .audit_logs(
                        &ctx.http,
                        Some(Action::Member(MemberAction::RoleUpdate)),
                        None,
                        None,
                        Some(1),
                    )
                    .await
                {
                    if let Some(entry) = logs.entries.first() {
                        let target_ok = entry
                            .target_id
                            .map(|t| t.get() == new.user.id.get())
                            .unwrap_or(false);
                        if entry.user_id != self_id && target_ok {
                            let mut added: Vec<u64> = vec![];
                            let mut removed: Vec<u64> = vec![];
                            for change in entry.changes.clone().unwrap_or_default() {
                                match change {
                                    Change::RolesAdded { new, .. } => {
                                        added.extend(
                                            new.unwrap_or_default().iter().map(|r| r.id.get()),
                                        );
                                    }
                                    Change::RolesRemove { new, .. } => {
                                        removed.extend(
                                            new.unwrap_or_default().iter().map(|r| r.id.get()),
                                        );
                                    }
                                    _ => {}
                                }
                            }
                            if !added.is_empty() || !removed.is_empty() {
                                let lang_code =
                                    crate::db::guild_lang(&self.pool, Some(new.guild_id.get()))
                                        .await;
                                let text =
                                    |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                                let username = new
                                    .user
                                    .id
                                    .to_user(&ctx.http)
                                    .await
                                    .map(|u| u.name.clone())
                                    .unwrap_or_else(|_| new.user.name.clone());
                                let avatar = new.user.avatar_url().unwrap_or_default();
                                let mut desc = " ".to_string();
                                if !removed.is_empty() {
                                    desc += &(text("event_srvLogs_guildMemberUpdate_description")
                                        .replace(
                                            "${firstEntry.executor.id}",
                                            &entry.user_id.get().to_string(),
                                        )
                                        .replace(
                                            "${removedRoles}",
                                            &removed
                                                .iter()
                                                .map(|id| format!("<@&{id}>"))
                                                .collect::<Vec<_>>()
                                                .join(","),
                                        )
                                        .replace("${oldMember.user.username}", &username)
                                        + "\n");
                                }
                                if !added.is_empty() {
                                    desc += &text("event_srvLogs_guildMemberUpdate_2_description")
                                        .replace(
                                            "${firstEntry.executor.id}",
                                            &entry.user_id.get().to_string(),
                                        )
                                        .replace(
                                            "${addedRoles}",
                                            &added
                                                .iter()
                                                .map(|id| format!("<@&{id}>"))
                                                .collect::<Vec<_>>()
                                                .join(","),
                                        )
                                        .replace("${oldMember.user.username}", &username);
                                }
                                let embed = serenity::CreateEmbed::default()
                                    .colour(0x010101_u32)
                                    .author(
                                        serenity::CreateEmbedAuthor::new(username).icon_url(avatar),
                                    )
                                    .description(desc)
                                    .timestamp(serenity::Timestamp::now());
                                let _ = serenity::ChannelId::new(logs_ch)
                                    .send_message(
                                        &ctx.http,
                                        serenity::CreateMessage::new().embed(embed),
                                    )
                                    .await;
                            }
                        }
                    }
                }
            }
        }
        // Boost detection (mirrors logs/boostLogs.ts): #a27cec
        // embed with author avatar, add + sub cases, 10-minute
        // recency guard on fresh boosts.
        let (old_premium, new_premium) = (old.premium_since, new.premium_since);
        if old_premium != new_premium {
            let gid = new.guild_id.get().to_string();
            let logs_ch: Option<u64> =
                crate::db::kv_get(&self.pool, &gid, "GUILD.SERVER_LOGS.boosts")
                    .await
                    .and_then(|s| s.parse().ok());
            if let Some(logs_ch) = logs_ch {
                let now_ms = crate::commands::context::now_ms();
                let recent = new_premium
                    .map(|t| now_ms - t.unix_timestamp() * 1000 <= 10 * 60 * 1000)
                    .unwrap_or(false);
                let lang_code = crate::db::guild_lang(&self.pool, Some(new.guild_id.get())).await;
                let text = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
                let boost_count = new
                    .guild_id
                    .to_partial_guild(&ctx.http)
                    .await
                    .map(|g| g.premium_subscription_count.unwrap_or(0).to_string())
                    .unwrap_or_default();
                let desc = if old_premium.is_none() && new_premium.is_some() && recent {
                    Some(
                        text("event_boostlog_add")
                            .replace("${newMember.user.id}", &new.user.id.get().to_string())
                            .replace("${newMember.guild.premiumSubscriptionCount}", &boost_count),
                    )
                } else if old_premium.is_some() && new_premium.is_none() {
                    Some(
                        text("event_boostlog_sub")
                            .replace("${newMember.user.id}", &new.user.id.get().to_string())
                            .replace("${newMember.guild.premiumSubscriptionCount}", &boost_count),
                    )
                } else {
                    None
                };
                if let Some(desc) = desc {
                    let mut avatar = new.user.avatar_url().unwrap_or_default();
                    if avatar.is_empty() {
                        if let Ok(full) = new.user.id.to_user(&ctx.http).await {
                            avatar = full.avatar_url().unwrap_or_default();
                        }
                    }
                    let embed = serenity::CreateEmbed::default()
                        .colour(0xA27CEC_u32)
                        .author(
                            serenity::CreateEmbedAuthor::new(new.user.name.clone())
                                .icon_url(avatar),
                        )
                        .description(desc)
                        .timestamp(serenity::Timestamp::now());
                    let _ = serenity::ChannelId::new(logs_ch)
                        .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
                        .await;
                }
            }
        }
        // Nickname history (mirrors prevnamesModuleGuild.ts): when the
        // nickname changes, record the previous one with a date stamp.
        if let (Some(previous), updated) = (old.nick.clone(), &new) {
            if Some(previous.clone()) != updated.nick && !previous.is_empty() {
                let guild_name = updated
                    .guild_id
                    .to_partial_guild(&ctx.http)
                    .await
                    .map(|g| g.name)
                    .unwrap_or_default();
                let entry = format!(
                    "<t:{}:d> - [nickname:{}] {}",
                    crate::commands::context::now_ms() / 1000,
                    guild_name,
                    previous
                );
                let key = crate::events::prevnames_key(updated.user.id.get());
                let raw = crate::db::kv_get(&self.pool, "0", &key).await;
                let history: Vec<String> = raw
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();
                let next =
                    crate::events::push_prevname(history, &entry, crate::events::PREVNAMES_CAP);
                let _ = crate::db::kv_set(
                    &self.pool,
                    "0",
                    &key,
                    &serde_json::to_string(&next).unwrap_or_default(),
                )
                .await;
            }
        }
        // Nickname-role rules (mirrors !setmentionrole.ts enforcement).
        let nick = new
            .nick
            .clone()
            .unwrap_or_else(|| new.user.name.clone())
            .to_ascii_lowercase();
        if let Some(raw) = crate::db::kv_get(
            &self.pool,
            &new.guild_id.get().to_string(),
            "GUILD.RANK_ROLES.nicknames",
        )
        .await
        {
            if let Ok(map) = serde_json::from_str::<std::collections::HashMap<String, String>>(&raw)
            {
                for (part, role_id) in map {
                    if nick.contains(&part.to_ascii_lowercase()) {
                        if let Ok(rid) = role_id.parse::<u64>() {
                            if let Ok(member) = new.guild_id.member(&ctx.http, new.user.id).await {
                                let _ =
                                    member.add_role(&ctx.http, serenity::RoleId::new(rid)).await;
                            }
                        }
                    }
                }
            }
        }
    }

    async fn invite_create(&self, _ctx: serenity::Context, creation: serenity::InviteCreateEvent) {
        // Mirrors invitemanager/onInviteCreate.ts: cache uses by code.
        let Some(guild_id) = creation.guild_id else {
            return;
        };
        let mut cache = self.invites.lock().await;
        cache.entry(guild_id.get().to_string()).or_default().insert(
            creation.code.clone(),
            (
                creation.uses,
                creation.inviter.as_ref().map(|u| u.id.get()).unwrap_or(0),
            ),
        );
    }

    async fn invite_delete(&self, _ctx: serenity::Context, deletion: serenity::InviteDeleteEvent) {
        // Mirrors invitemanager/onInviteDelete.ts: purge cache entry.
        let Some(guild_id) = deletion.guild_id else {
            return;
        };
        let mut cache = self.invites.lock().await;
        if let Some(guild) = cache.get_mut(&guild_id.get().to_string()) {
            guild.remove(&deletion.code);
        }
    }

    /// Support role sync (mirrors utils/supportModule.ts): grant or
    /// remove the configured role based on the user's bio/vanity
    /// (type "bio") or server tag (type "tag").
    async fn presence_update(&self, ctx: serenity::Context, new_data: serenity::Presence) {
        let Some(guild_id) = new_data.guild_id else {
            return;
        };
        use serenity::model::user::OnlineStatus;
        if matches!(
            new_data.status,
            OnlineStatus::Offline | OnlineStatus::Invisible
        ) {
            return;
        }
        let gid = guild_id.get().to_string();
        let Some(raw) = crate::db::kv_get(&self.pool, &gid, "GUILD.SUPPORT").await else {
            return;
        };
        let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) else {
            return;
        };
        let Some(role_str) = cfg.get("rolesId").and_then(|r| r.as_str()) else {
            return;
        };
        let Ok(role_id) = role_str.parse::<u64>() else {
            return;
        };
        let role_id = serenity::RoleId::new(role_id);
        let Ok(member) = guild_id.member(&ctx.http, new_data.user.id).await else {
            return;
        };
        let kind = cfg.get("type").and_then(|t| t.as_str()).unwrap_or("");
        let has = member.roles.contains(&role_id);
        // Early-out removals mirroring the TS guards.
        if kind == "bio"
            && new_data
                .activities
                .first()
                .and_then(|a| a.state.as_ref())
                .is_none()
        {
            if has {
                let _ = member.remove_role(&ctx.http, role_id).await;
            }
            return;
        }
        if kind == "tag" {
            let tagged = new_data
                .user
                .id
                .to_user(&ctx.http)
                .await
                .ok()
                .and_then(|u| u.primary_guild)
                .and_then(|p| p.identity_guild_id)
                == Some(guild_id);
            if !tagged {
                if has {
                    let _ = member.remove_role(&ctx.http, role_id).await;
                }
                return;
            }
        }
        let matched = if kind == "bio" {
            let state = new_data
                .activities
                .first()
                .and_then(|a| a.state.as_ref())
                .map(|s| s.to_lowercase())
                .unwrap_or_default();
            let input = cfg
                .get("input")
                .and_then(|i| i.as_str())
                .unwrap_or_default()
                .to_lowercase();
            let vanity = guild_id
                .to_partial_guild(&ctx.http)
                .await
                .ok()
                .and_then(|g| g.vanity_url_code)
                .unwrap_or_default()
                .to_lowercase();
            state.contains(&input) || (!vanity.is_empty() && state.contains(&vanity))
        } else if kind == "tag" {
            new_data
                .user
                .id
                .to_user(&ctx.http)
                .await
                .ok()
                .and_then(|u| u.primary_guild)
                .and_then(|p| p.identity_guild_id)
                == Some(guild_id)
        } else {
            false
        };
        if matched {
            if !has {
                let _ = member.add_role(&ctx.http, role_id).await;
            }
        } else if has {
            let _ = member.remove_role(&ctx.http, role_id).await;
        }
    }

    async fn ratelimit(&self, _data: serenity::RatelimitInfo) {
        // Mirrors client/onRateLimit.ts: throttle logging.
        tracing::warn!("discord rate limited");
    }

    async fn interaction_create(&self, ctx: serenity::Context, interaction: serenity::Interaction) {
        // Mirrors Events/logs/slashCommandLogger.ts interactionCreate
        // (command rows go to src/files/slash.log.json).
        if let serenity::Interaction::Command(cmd) = &interaction {
            self.log_slash_command(&ctx, cmd).await;
            return;
        }
        // Mirrors buttonHandler.ts routing for component custom_ids.
        let serenity::Interaction::Component(comp) = interaction else {
            return;
        };
        let id = comp.data.custom_id.as_str();
        if id == "new-confession-button" {
            // Mirrors confession panel submit entry: modal -> cooldown gate
            // -> anonymous post (see handle_confess_button).
            let _ =
                crate::commands::confession::main::handle_confess_button(&ctx, &comp, &self.pool)
                    .await;
        } else if id.starts_with(crate::commands::confession::main::CONFESSIONRES_PREFIX) {
            let _ = crate::commands::confession::main::handle_confession_response(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id.starts_with("confession-author%") {
            let _ = crate::commands::confession::main::handle_confession_author(&ctx, &comp).await;
        } else if id.starts_with(crate::commands::legacy::NEWSLETTER_TOGGLE_PREFIX) {
            let _ =
                crate::commands::legacy::handle_newsletter_toggle(&ctx, &comp, &self.pool).await;
        } else if id == crate::commands::giveaway::main::GW_ENTRY_ID {
            crate::commands::giveaway::main::handle_giveaway_entry(&ctx.http, &self.pool, &comp)
                .await;
        } else if id == crate::commands::giveaway::main::GW_LIST_ID {
            crate::commands::giveaway::main::handle_giveaway_list(&ctx.http, &self.pool, &comp)
                .await;
        } else if let Some(rest) = id.strip_prefix(crate::commands::giveaway::main::GW_LEAVE_ID) {
            // `giveaway-leave:<mid>` (stateless 60s-collector equivalent).
            if let Some(mid) = rest.strip_prefix(':').and_then(|s| s.parse::<u64>().ok()) {
                crate::commands::giveaway::main::handle_giveaway_leave(
                    &ctx.http, &self.pool, &comp, mid,
                )
                .await;
            }
        } else if let Some(rest) =
            id.strip_prefix(crate::commands::giveaway::main::GW_ENTRIES_PAGE_PREFIX)
        {
            // `gw-entries:<mid>:<page>`.
            let mut parts = rest.split(':');
            if let (Some(mid), Some(page)) = (parts.next(), parts.next()) {
                if let (Ok(mid), Ok(page)) = (mid.parse::<u64>(), page.parse::<usize>()) {
                    crate::commands::giveaway::main::handle_giveaway_entries_page(
                        &ctx.http, &self.pool, &comp, mid, page,
                    )
                    .await;
                }
            }
        } else if id == crate::commands::rolereactions::rolereaction::ROLESELECT_MAIN_ID {
            let _ = crate::commands::rolereactions::rolereaction::handle_roleselect_main(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if let Some(rest) = id
            .strip_prefix(crate::commands::rolereactions::rolereaction::ROLESELECT_ROLE_PICK_PREFIX)
        {
            let config_msg = rest.parse::<u64>().unwrap_or(0);
            let _ = crate::commands::rolereactions::rolereaction::handle_roleselect_role_pick(
                &ctx, &comp, &self.pool, config_msg,
            )
            .await;
        } else if id
            .starts_with(crate::commands::rolereactions::rolereaction::ROLESELECT_ROLES_PREFIX)
        {
            // Saved-select presses, like
            // SelectMenu/roleselect_roles.ts.
            let _ = crate::commands::rolereactions::rolereaction::handle_roleselect_grant(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id.starts_with("rolepanel:") {
            let _ = crate::commands::moderation::main::handle_rolepanel_button(&ctx, &comp).await;
        } else if let Some(role) =
            id.strip_prefix(crate::commands::rolereactions::rolereaction::BUTTON_REACTION_PREFIX)
        {
            // TS-verbatim role button presses (button_reaction%<role>).
            if let Ok(role_id) = role.parse::<u64>() {
                let _ = crate::commands::rolereactions::rolereaction::handle_button_reaction(
                    &ctx, &comp, &self.pool, role_id,
                )
                .await;
            }
        } else if id == crate::commands::honeypot::main::HONEYPOT_CUSTOM_ID {
            let _ = crate::commands::honeypot::main::handle_honeypot_claim(&ctx, &comp, &self.pool)
                .await;
        } else if id == crate::commands::ticket::main::TICKET_EMBED_DELETE {
            let _ =
                crate::commands::ticket::main::handle_ticket_embed_delete(&ctx, &comp, &self.pool)
                    .await;
        } else if id == crate::commands::ticket::main::TICKET_EMBED_TRANSCRIPT {
            let _ = crate::commands::ticket::main::handle_ticket_embed_transcript(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id == crate::commands::ticket::main::TICKET_EMBED_SELECT_USER {
            let _ =
                crate::commands::ticket::main::handle_ticket_select_user(&ctx, &comp, &self.pool)
                    .await;
        } else if id.starts_with(crate::commands::ticket::main::TICKET_OPEN_CUSTOM_ID_PREFIX) {
            let _ =
                crate::commands::ticket::main::handle_ticket_open_button(&ctx, &comp, &self.pool)
                    .await;
        } else if id == crate::commands::ticket::main::LEGACY_OPEN_BUTTON_ID {
            // TS-verbatim panel button (CreateTicketChannel v1).
            let _ = crate::commands::ticket::main::handle_legacy_ticket_open(
                &ctx, &comp, &self.pool, None,
            )
            .await;
        } else if id == crate::commands::ticket::main::LEGACY_SELECT_ID {
            // TS-verbatim panel select (CreateTicketChannel v1).
            let selected = match &comp.data.kind {
                serenity::ComponentInteractionDataKind::StringSelect { values } => {
                    values.first().cloned()
                }
                _ => None,
            };
            let _ = crate::commands::ticket::main::handle_legacy_ticket_open(
                &ctx, &comp, &self.pool, selected,
            )
            .await;
        } else if id == crate::commands::ticket::main::V2_SELECT_ID {
            // TS-verbatim V2 panel select (CreateTicketChannelV2).
            if let serenity::ComponentInteractionDataKind::StringSelect { values } = &comp.data.kind
            {
                if let Some(selected) = values.first() {
                    let _ = crate::commands::ticket::main::handle_v2_ticket_open(
                        &ctx, &comp, &self.pool, selected,
                    )
                    .await;
                }
            }
        } else if id.starts_with(crate::commands::voicedashboard::main::TEMPVOICE_PREFIX) {
            let _ = crate::commands::voicedashboard::main::handle_tempvoice_button(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id == crate::commands::welcomer_panel::main::WELCOMER_SECTION_ID
            || id.starts_with(crate::commands::welcomer_panel::main::WELCOMER_PREFIX)
        {
            let _ = crate::commands::welcomer_panel::main::handle_welcomer_component(
                &ctx, &comp, &self.pool,
            )
            .await;
        } else if id == crate::commands::embed::embed_builder::EMBED_SELECT_ID
            || id == crate::commands::embed::embed_builder::EMBED_SAVE_CHANNEL_ID
            || id.starts_with(crate::commands::embed::embed_builder::EMBED_BTN_PREFIX)
        {
            crate::commands::embed::embed_builder::handle_embed_component(
                &ctx.http, &self.pool, &comp,
            )
            .await;
        } else if id.starts_with(crate::commands::utils::ADMIN_ROLES_PREFIX) {
            crate::commands::utils::handle_admin_roles_component(&ctx.http, &self.pool, &comp)
                .await;
        } else if id == crate::commands::legacy::HELPALL_SELECT_ID {
            crate::commands::legacy::handle_helpall_select(&ctx.http, &self.pool, &comp).await;
        } else if id.starts_with(crate::commands::legacy::HELP_SELECT_PREFIX)
            || id.starts_with(crate::commands::legacy::HELP_PREV_ID)
            || id.starts_with(crate::commands::legacy::HELP_NEXT_ID)
        {
            crate::commands::legacy::handle_help_component(&ctx.http, &self.pool, &comp).await;
        } else {
            // Unknown component ids are ignored (every TS component
            // file now has a dedicated arm above, including the
            // verbatim button_reaction% role buttons).
        }
    }
}

#[cfg(test)]
mod restore_tests {
    use super::*;
    use crate::commands::protection::backup::{build_backup, BackupRole, RawChannel};
    use poise::serenity_prelude::ChannelType;

    fn raw(
        id: &str,
        name: &str,
        kind: ChannelType,
        position: u16,
        parent: Option<&str>,
    ) -> RawChannel {
        RawChannel {
            id: id.to_string(),
            name: name.to_string(),
            kind,
            position,
            permissions: Vec::new(),
            parent: parent.map(str::to_string),
        }
    }

    fn sample() -> crate::commands::protection::backup::GuildBackup {
        build_backup(
            &[
                raw("cat1", "lobby", ChannelType::Category, 0, None),
                raw("ch1", "general", ChannelType::Text, 1, Some("cat1")),
                raw("ch2", "top", ChannelType::Text, 0, None),
            ],
            vec![BackupRole {
                id: "r1".to_string(),
                members: vec!["u1".to_string(), "u2".to_string()],
            }],
        )
    }

    #[test]
    fn restore_slot_dedups_concurrent_claims() {
        let mut running = HashSet::new();
        assert!(restore_slot_claim(&mut running, "g1"));
        // Second claim while running is rejected.
        assert!(!restore_slot_claim(&mut running, "g1"));
        // Other guilds are unaffected.
        assert!(restore_slot_claim(&mut running, "g2"));
        restore_slot_release(&mut running, "g1");
        assert!(restore_slot_claim(&mut running, "g1"));
        // Releasing an absent guild is a no-op.
        restore_slot_release(&mut running, "missing");
        assert!(!restore_slot_claim(&mut running, "g1"));
    }

    #[test]
    fn channel_lookup_finds_top_level_and_nested() {
        let b = sample();
        let top = backup_channel_for(&b, "ch2").expect("top-level channel");
        assert_eq!(top.name, "top");
        assert_eq!(top.parent, None);
        let nested = backup_channel_for(&b, "ch1").expect("nested channel");
        assert_eq!(nested.name, "general");
        assert_eq!(nested.parent.as_deref(), Some("cat1"));
        assert_eq!(nested.position, 1);
    }

    #[test]
    fn category_lookup_finds_snapshot_entry() {
        let b = sample();
        let cat = backup_category_for(&b, "cat1").expect("category");
        assert_eq!(cat.name, "lobby");
        assert_eq!(cat.channels.len(), 1);
        assert_eq!(cat.channels[0].id, "ch1");
    }

    #[test]
    fn unknown_ids_yield_no_restore() {
        let b = sample();
        assert!(backup_channel_for(&b, "nope").is_none());
        assert!(backup_category_for(&b, "nope").is_none());
        // A category id is not a channel entry and vice versa.
        assert!(backup_channel_for(&b, "cat1").is_none());
        assert!(backup_category_for(&b, "ch1").is_none());
    }

    #[test]
    fn role_member_source_pins_readd_list() {
        let b = sample();
        assert_eq!(
            crate::commands::protection::backup::role_members(&b, "r1"),
            &["u1".to_string(), "u2".to_string()]
        );
        assert!(crate::commands::protection::backup::role_members(&b, "unknown").is_empty());
    }

    #[test]
    fn wipe_queue_enqueue_sets_ten_hour_deadline() {
        let mut q = HashMap::new();
        let delete_at = wipe_queue_enqueue(&mut q, "g1", "Guild", "o1", 1_000);
        assert_eq!(delete_at, 1_000 + GUILD_WIPE_DELAY_MS);
        assert_eq!(q["g1"].delete_at, delete_at);
        assert_eq!(q["g1"].guild_name, "Guild");
        // A second leave refreshes the deadline instead of duplicating.
        let later = wipe_queue_enqueue(&mut q, "g1", "Guild", "o1", 2_000);
        assert_eq!(later, 2_000 + GUILD_WIPE_DELAY_MS);
        assert_eq!(q.len(), 1);
    }

    #[test]
    fn wipe_queue_cancel_removes_pending_only() {
        let mut q = HashMap::new();
        wipe_queue_enqueue(&mut q, "g1", "Guild", "o1", 0);
        wipe_queue_enqueue(&mut q, "g2", "Other", "o2", 0);
        assert!(wipe_queue_cancel(&mut q, "g1"));
        // Cancelling twice reports nothing left to cancel.
        assert!(!wipe_queue_cancel(&mut q, "g1"));
        // Other guilds are unaffected.
        assert!(q.contains_key("g2"));
        assert!(!wipe_queue_cancel(&mut q, "missing"));
    }

    #[test]
    fn wipe_queue_due_fires_only_when_expired_and_absent() {
        let mut q = HashMap::new();
        wipe_queue_enqueue(&mut q, "gone", "Gone", "o1", 0);
        wipe_queue_enqueue(&mut q, "fresh", "Fresh", "o2", 0);
        wipe_queue_enqueue(&mut q, "back", "Back", "o3", 0);
        let deadline = GUILD_WIPE_DELAY_MS;
        // Before the deadline nothing is due (ready recovery keeps all).
        let empty = HashSet::new();
        assert!(wipe_queue_due(&q, deadline - 1, &empty).is_empty());
        // At the deadline the absent guild is due...
        let mut due = wipe_queue_due(&q, deadline, &HashSet::from(["back".to_string()]));
        due.sort();
        assert_eq!(due, vec!["fresh".to_string(), "gone".to_string()]);
        // ...but a rejoined guild present in cache is spared.
        let present: HashSet<String> =
            HashSet::from(["back".to_string(), "fresh".to_string(), "gone".to_string()]);
        assert!(wipe_queue_due(&q, deadline, &present).is_empty());
    }
}
