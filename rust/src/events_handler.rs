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
use std::collections::HashMap;
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
}

impl Handler {
    pub fn new(pool: Pool) -> Self {
        Self {
            pool,
            spam: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            invites: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
            sealed: Arc::new(tokio::sync::Mutex::new(std::collections::HashSet::new())),
        }
    }

    /// PUNISHPUB spam flow. Mirrors Events/guildconfig/blockSpam.ts:
    /// non-whitelisted/non-media links and blacklisted terms delete the
    /// message, bump flags, and sanction at amountMax.
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

    /// Server-log poster. Mirrors Events/logs/* reading
    /// GUILD.SERVER_LOGS.<suffix> (best-effort, never fails).
    async fn server_log(&self, ctx: &serenity::Context, gid: &str, suffix: &str, text: String) {
        let key = format!("GUILD.SERVER_LOGS.{suffix}");
        let Some(ch) = crate::db::kv_get(&self.pool, gid, &key).await else {
            return;
        };
        let Ok(ch_id) = ch.parse::<u64>() else {
            return;
        };
        let _ = serenity::ChannelId::new(ch_id).say(&ctx.http, text).await;
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
            .and_then(|s| serde_json::from_str::<crate::commands::protection::RuleState>(&s).ok())
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

    async fn guild_key(&self, guild_id: u64) -> String {
        guild_id.to_string()
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
    }

    async fn guild_create(
        &self,
        _ctx: serenity::Context,
        guild: serenity::Guild,
        _is_new: Option<bool>,
    ) {
        // Mirrors guildCreate.ts: ensure GUILD.LANG exists (auto-locale default).
        let gid = guild.id.get().to_string();
        if crate::db::kv_get(&self.pool, &gid, "GUILD.LANG")
            .await
            .is_none()
        {
            let _ = crate::db::kv_set(&self.pool, &gid, "GUILD.LANG", "en-US").await;
        }
        tracing::debug!("guildCreate {}", gid);
    }

    async fn guild_delete(
        &self,
        _ctx: serenity::Context,
        incomplete: serenity::UnavailableGuild,
        _full: Option<serenity::Guild>,
    ) {
        // Mirrors deleteDatabaseDataOnGuildLeave.ts: deferred wipe. We flag
        // the guild for GC instead of deleting inline (shard race safety).
        let gid = incomplete.id.get().to_string();
        let _ = crate::db::kv_set(&self.pool, &gid, "GUILD_DELETE_QUEUED", "1").await;
        tracing::info!("guildDelete {} queued for GC", gid);
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
        if let Some(role_id) = crate::db::kv_get(&self.pool, &gid, "GUILD.JOIN_ROLE").await {
            if let Ok(rid) = role_id.parse::<u64>() {
                let _ = new_member
                    .add_role(&ctx.http, serenity::RoleId::new(rid))
                    .await;
            }
        }
        // Invite attribution (mirrors joinMessage invite tracker):
        // diff live invite uses against the cache to find the inviter.
        if let Ok(live) = new_member.guild_id.invites(&ctx.http).await {
            let mut cache = self.invites.lock().await;
            let entry = cache.entry(gid.clone()).or_default();
            for inv in &live {
                let cached = entry.get(&inv.code).map(|(u, _)| *u).unwrap_or(0);
                if inv.uses > cached {
                    if let Some(inviter) = inv.inviter.as_ref() {
                        let inviter_id = inviter.id.get();
                        entry.insert(inv.code.clone(), (inv.uses, inviter_id));
                        // Credit: invites+1, regular+1, record BY.
                        let stats = crate::commands::invitesmanager::load_invites(
                            &self.pool, &gid, inviter_id,
                        )
                        .await;
                        let next = crate::commands::invitesmanager::InviteStats {
                            invites: stats.invites + 1,
                            regular: stats.regular + 1,
                            bonus: stats.bonus,
                            leaves: stats.leaves,
                        };
                        let _ = crate::commands::invitesmanager::save_invites(
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
        // Guild blacklist gate (mirrors blacklistFetcher.ts).
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
        // Join DM (text template).
        if let Some(dm) = crate::db::kv_get(&self.pool, &gid, "GUILD.JOIN_DM").await {
            let _ = new_member
                .user
                .direct_message(&ctx.http, serenity::CreateMessage::new().content(dm))
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
                        let text = crate::events::render_welcome(
                            tpl,
                            &new_member.user.mention().to_string(),
                            "this server",
                            count,
                        );
                        let _ = serenity::ChannelId::new(ch_id).say(&ctx.http, text).await;
                    }
                }
            }
        }
        // Mirrors rolesaver/onMemberJoin.ts: restore snapshot roles.
        if let Some(raw) = crate::db::kv_get(
            &self.pool,
            &gid,
            &format!("ROLESAVER.{}", new_member.user.id.get()),
        )
        .await
        {
            let roles: Vec<String> = serde_json::from_str(&raw).unwrap_or_default();
            for r in roles.iter().filter_map(|s| s.parse::<u64>().ok()) {
                let _ = new_member
                    .add_role(&ctx.http, serenity::RoleId::new(r))
                    .await;
            }
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(format!("ROLESAVER.{}", new_member.user.id.get()))
                .execute(&self.pool)
                .await;
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
                    self.server_log(
                        &ctx,
                        &guild_id.get().to_string(),
                        "moderation",
                        format!("Kicked {}.", user.tag()),
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
            let stats = crate::commands::invitesmanager::load_invites(&self.pool, &gid, by).await;
            let next = crate::commands::invitesmanager::InviteStats {
                invites: (stats.invites - 1).max(0),
                regular: stats.regular,
                bonus: stats.bonus,
                leaves: stats.leaves + 1,
            };
            let _ =
                crate::commands::invitesmanager::save_invites(&self.pool, &gid, by, &next).await;
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
        // Mirrors rolesaver/onMemberLeave.ts: snapshot roles (gated).
        if !crate::commands::newfeatures::rolesaver_enabled(&self.pool, &gid).await {
            if let Some(m) = member {
                let roles = crate::events::snapshot_roles(
                    &m.roles.iter().map(|r| r.get()).collect::<Vec<_>>(),
                    guild_id.get(),
                );
                let _ = crate::db::kv_set(
                    &self.pool,
                    &gid,
                    &format!("ROLESAVER.{}", user.id.get()),
                    &serde_json::to_string(&roles).unwrap_or_default(),
                )
                .await;
            }
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
            let before = crate::commands::ranks::load_rank(&self.pool, &gid, msg.author.id.get())
                .await
                .level;
            let (level, leveled) = crate::events::record_message_activity(
                &self.pool,
                &gid,
                msg.author.id.get(),
                msg.channel_id.get(),
            )
            .await;
            if leveled {
                // Level-up message (template or default).
                let tpl = crate::db::kv_get(&self.pool, &gid, "GUILD.RANKS.message")
                    .await
                    .unwrap_or_else(|| "Level up! {user} is now level {level}.".to_string());
                let text = tpl
                    .replace("{user}", &msg.author.mention().to_string())
                    .replace("{level}", &level.to_string());
                let _ = msg.channel_id.say(&_ctx.http, text).await;
                // Rank-role rewards.
                let roles_raw = crate::db::kv_get(&self.pool, &gid, "GUILD.RANKS.roles").await;
                let roles: Vec<crate::commands::ranks::RankRole> = roles_raw
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
        // Mirrors Events/sticky/onNewMessage.ts: repost text sticky.
        // Mirrors Events/sticky/onNewMessage.ts: repost text sticky.
        if let Some(raw) = crate::db::kv_get(
            &self.pool,
            &gid,
            &crate::commands::sticky::sticky_key(msg.channel_id.get()),
        )
        .await
        {
            if let Ok(cfg) = serde_json::from_str::<crate::commands::sticky::StickyConfig>(&raw) {
                if !cfg.message.is_empty() && cfg.embed_id.is_none() {
                    let _ = msg.channel_id.say(&_ctx.http, cfg.message.clone()).await;
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
            let raw = crate::db::kv_get(&self.pool, &gid, "UTILS.autoFeur").await;
            if crate::commands::legacy::flag_on(raw)
                && crate::commands::legacy::is_quoi_bait(&msg.content)
            {
                let _ = msg.reply(&_ctx.http, "feur.").await;
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
            let trigger = msg.content.trim().to_ascii_lowercase();
            if !trigger.is_empty() {
                if let Some(resp) =
                    crate::db::kv_get(&self.pool, &gid, &format!("GUILD.REACT_MSG.{trigger}")).await
                {
                    let _ = msg.reply(&_ctx.http, resp).await;
                }
            }
        }
        // Mirrors Events/github-lines/onNewMessage.ts: unfurl code links.
        if crate::db::kv_get(&self.pool, &gid, "UTILS.git_lines")
            .await
            .as_deref()
            == Some("1")
        {
            for word in msg.content.split_whitespace().take(3) {
                if let Some(r) = crate::commands::utils::parse_github_link(word) {
                    if let Some(snippet) = crate::commands::utils::fetch_snippet(&r).await {
                        let _ = msg.reply(&_ctx.http, snippet).await;
                        break;
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
            if let Some(raw) =
                crate::db::kv_get(&self.pool, &gid, crate::commands::antispam::ANTISPAM_KEY).await
            {
                if let Ok(cfg) =
                    serde_json::from_str::<crate::commands::antispam::AntispamConfig>(&raw)
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
                        if crate::commands::antispam::window_tripped(
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
            self.server_log(
                &ctx,
                &gid,
                "message",
                format!(
                    "Message {} deleted in <#{}>.",
                    deleted_message_id.get(),
                    channel_id.get()
                ),
            )
            .await;
        }
    }

    async fn message_update(
        &self,
        ctx: serenity::Context,
        old: Option<serenity::Message>,
        new: Option<serenity::Message>,
        _event: serenity::MessageUpdateEvent,
    ) {
        // Mirrors logs/messageUpdateLogs.ts: diff logging.
        if let (Some(old), Some(new)) = (old, new) {
            if old.content != new.content {
                if let Some(gid) = new.guild_id {
                    let before: String = old.content.chars().take(500).collect();
                    let after: String = new.content.chars().take(500).collect();
                    self.server_log(
                        &ctx,
                        &gid.get().to_string(),
                        "message",
                        format!(
                            "Edited by {} in <#{}>:\n- {before}\n+ {after}",
                            new.author.tag(),
                            new.channel_id.get()
                        ),
                    )
                    .await;
                }
            }
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
        // Session tracking (mirrors stats/onVoiceUpdate.ts + economy coins).
        match (old.as_ref().and_then(|o| o.channel_id), new.channel_id) {
            (old_ch, Some(new_ch)) if old_ch != Some(new_ch) => {
                crate::events::voice_join(&self.pool, &gid, new.user_id.get(), now).await;
                // Voice logs (join/move/leave).
                let verb = if old_ch.is_none() {
                    "joined"
                } else {
                    "moved to"
                };
                self.server_log(
                    &ctx,
                    &gid,
                    "voice",
                    format!("<@{}> {verb} <#{}>.", new.user_id.get(), new_ch.get()),
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
                            None => crate::events::temp_channel_name(&name),
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
                                            crate::commands::voicedashboard::tempvoice_buttons(),
                                        ),
                                )
                                .await;
                        }
                        return;
                    }
                }
            }
            (Some(_), None) => {
                self.server_log(
                    &ctx,
                    &gid,
                    "voice",
                    format!("<@{}> left voice.", new.user_id.get()),
                )
                .await;
                // Boost from shop roles (mirrors getMemberBoost).
                let roles: Vec<u64> = guild_id
                    .member(&ctx.http, new.user_id)
                    .await
                    .map(|m| m.roles.iter().map(|r| r.get()).collect())
                    .unwrap_or_default();
                let shop_raw = crate::db::kv_get(&self.pool, &gid, "ECONOMY.buyableRoles")
                    .await
                    .unwrap_or_default();
                let boost = crate::commands::economy::member_boost(&shop_raw, &roles).max(1) as u64;
                crate::events::voice_leave(&self.pool, &gid, new.user_id.get(), now, boost).await;
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
    }

    async fn reaction_add(&self, ctx: serenity::Context, add: serenity::Reaction) {
        // Mirrors reactionrole/onReactAdd.ts + starboard/onNewReact.ts.
        let Some(guild_id) = add.guild_id else { return };
        let Some(user_id) = add.user_id else { return };
        let gid = guild_id.get().to_string();
        let emoji = match &add.emoji {
            serenity::ReactionType::Unicode(u) => u.clone(),
            serenity::ReactionType::Custom { id, .. } => id.get().to_string(),
            _ => return,
        };
        let key = format!("GUILD.REACTION_ROLES.{}.{}", add.message_id.get(), emoji);
        if let Some(role_id) = crate::db::kv_get(&self.pool, &gid, &key).await {
            if let Ok(role_id) = role_id.parse::<u64>() {
                if let Ok(member) = guild_id.member(&ctx.http, user_id).await {
                    let _ = member
                        .add_role(&ctx.http, serenity::RoleId::new(role_id))
                        .await;
                }
            }
        }
        // Mirrors starboard/skullboard onNewReact.ts: post once threshold hit.
        for (board_name, star_emoji, data_prefix) in [
            ("starboard", "⭐", "STARBOARD_DATA"),
            ("skullboard", "💀", "SKULLBOARD_DATA"),
        ] {
            let board = crate::commands::starboard::load_board(&self.pool, &gid, board_name).await;
            if board.enabled == "yes" && !board.channel.is_empty() {
                if let Ok(channel) = add.channel(&ctx.http).await {
                    if let Ok(message) = channel.id().message(&ctx.http, add.message_id).await {
                        let stars = message
                            .reactions
                            .iter()
                            .filter(|r| {
                                r.reaction_type
                                    == serenity::ReactionType::Unicode(star_emoji.to_string())
                            })
                            .map(|r| r.count as i64)
                            .sum::<i64>();
                        if stars >= board.threshold {
                            let marker = format!("{data_prefix}.{}", add.message_id.get());
                            if crate::db::kv_get(&self.pool, &gid, &marker).await.is_none() {
                                let url = format!(
                                    "https://discord.com/channels/{}/{}/{}",
                                    gid,
                                    message.channel_id.get(),
                                    message.id.get()
                                );
                                let embed = serenity::CreateEmbed::default()
                                    .description(message.content.clone())
                                    .field("Author", message.author.tag(), true)
                                    .field("Stars", stars.to_string(), true)
                                    .field("Jump", url, false);
                                if let Ok(ch_id) = board.channel.parse::<u64>() {
                                    let ch = serenity::ChannelId::new(ch_id);
                                    if ch
                                        .send_message(
                                            &ctx.http,
                                            serenity::CreateMessage::new().embed(embed),
                                        )
                                        .await
                                        .is_ok()
                                    {
                                        let _ =
                                            crate::db::kv_set(&self.pool, &gid, &marker, "1").await;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    async fn reaction_remove(&self, ctx: serenity::Context, removed: serenity::Reaction) {
        // Mirrors reactionrole/onReactRemove.ts.
        let Some(guild_id) = removed.guild_id else {
            return;
        };
        let Some(user_id) = removed.user_id else {
            return;
        };
        let gid = guild_id.get().to_string();
        let emoji = match &removed.emoji {
            serenity::ReactionType::Unicode(u) => u.clone(),
            serenity::ReactionType::Custom { id, .. } => id.get().to_string(),
            _ => return,
        };
        let key = format!(
            "GUILD.REACTION_ROLES.{}.{}",
            removed.message_id.get(),
            emoji
        );
        let Some(role_id) = crate::db::kv_get(&self.pool, &gid, &key).await else {
            return;
        };
        let Ok(role_id) = role_id.parse::<u64>() else {
            return;
        };
        let Ok(member) = guild_id.member(&ctx.http, user_id).await else {
            return;
        };
        let _ = member
            .remove_role(&ctx.http, serenity::RoleId::new(role_id))
            .await;
    }

    async fn user_update(
        &self,
        _ctx: serenity::Context,
        _old: Option<serenity::CurrentUser>,
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
        _removed_role_id: serenity::RoleId,
        _removed_role_data_if_available: Option<serenity::Role>,
    ) {
        use serenity::model::guild::audit_log::{Action, RoleAction};
        self.protection_guard(
            &ctx,
            guild_id,
            Action::Role(RoleAction::Delete),
            "deleterole",
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
        self.server_log(
            &ctx,
            &channel.guild_id.get().to_string(),
            "channel",
            format!("Channel created: {} ({}).", channel.name, channel.id.get()),
        )
        .await;
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
        self.server_log(
            &ctx,
            &channel.guild_id.get().to_string(),
            "channel",
            format!("Channel deleted: {} ({}).", channel.name, channel.id.get()),
        )
        .await;
        // Purge ticket rows bound to this channel (mirrors
        // deleteTicketPanel.ts).
        let gid = channel.guild_id.get().to_string();
        let _ =
            sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'TICKET_ALL.%.' || ?")
                .bind(&gid)
                .bind(channel.id.get().to_string())
                .execute(&self.pool)
                .await;
    }

    async fn channel_update(
        &self,
        ctx: serenity::Context,
        _old: Option<serenity::GuildChannel>,
        new: serenity::GuildChannel,
    ) {
        use serenity::model::guild::audit_log::{Action, ChannelAction};
        self.protection_guard(
            &ctx,
            new.guild_id,
            Action::Channel(ChannelAction::Update),
            "updatechannel",
        )
        .await;
        self.server_log(
            &ctx,
            &new.guild_id.get().to_string(),
            "channel",
            format!("Channel updated: {} ({}).", new.name, new.id.get()),
        )
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
        self.server_log(
            &ctx,
            &guild_id.get().to_string(),
            "moderation",
            format!("Banned {}.", banned_user.tag()),
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
        self.server_log(
            &ctx,
            &guild_id.get().to_string(),
            "moderation",
            format!("Unbanned {}.", unbanned_user.tag()),
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
        // Role diff log (mirrors logs/rolesLogs.ts).
        {
            let added: Vec<String> = new
                .roles
                .iter()
                .filter(|r| !old.roles.contains(r))
                .map(|r| format!("<@&{}>", r.get()))
                .collect();
            let removed: Vec<String> = old
                .roles
                .iter()
                .filter(|r| !new.roles.contains(r))
                .map(|r| format!("<@&{}>", r.get()))
                .collect();
            if !added.is_empty() || !removed.is_empty() {
                self.server_log(
                    &ctx,
                    &new.guild_id.get().to_string(),
                    "roles",
                    format!(
                        "{} roles: +{} -{}",
                        new.user.tag(),
                        added.join(","),
                        removed.join(",")
                    ),
                )
                .await;
            }
            // Boost detection (mirrors logs/boostLogs.ts).
            if old.premium_since.is_none() && new.premium_since.is_some() {
                self.server_log(
                    &ctx,
                    &new.guild_id.get().to_string(),
                    "boost",
                    format!("{} boosted the server!", new.user.tag()),
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

    async fn ratelimit(&self, _data: serenity::RatelimitInfo) {
        // Mirrors client/onRateLimit.ts: throttle logging.
        tracing::warn!("discord rate limited");
    }

    async fn interaction_create(&self, ctx: serenity::Context, interaction: serenity::Interaction) {
        // Mirrors buttonHandler.ts routing for component custom_ids.
        let serenity::Interaction::Component(comp) = interaction else {
            return;
        };
        let id = comp.data.custom_id.as_str();
        if id == "new-confession-button" {
            // Mirrors confession panel submit entry: modal -> cooldown gate
            // -> anonymous post (see handle_confess_button).
            let _ =
                crate::commands::confession::handle_confess_button(&ctx, &comp, &self.pool).await;
        } else if id.starts_with(crate::commands::confession::CONFESSIONRES_PREFIX) {
            let _ =
                crate::commands::confession::handle_confession_response(&ctx, &comp, &self.pool)
                    .await;
        } else if id.starts_with("confession-author%") {
            let _ = crate::commands::confession::handle_confession_author(&ctx, &comp).await;
        } else if id.starts_with(crate::commands::legacy::NEWSLETTER_TOGGLE_PREFIX) {
            let _ =
                crate::commands::legacy::handle_newsletter_toggle(&ctx, &comp, &self.pool).await;
        } else if id.starts_with("confirm-entry-giveaway") {
            // Mirrors giveawaysManager entry button (AvoidDoubleEntries).
            let Some(guild_id) = comp.guild_id else {
                return;
            };
            let gid = guild_id.get().to_string();
            let mid = comp.message.id.get();
            let key = crate::commands::giveaway::giveaway_key(mid);
            let raw = crate::db::kv_get(&self.pool, &gid, &key).await;
            let Some(raw) = raw else { return };
            let mut v: serde_json::Value = match serde_json::from_str(&raw) {
                Ok(v) => v,
                Err(_) => return,
            };
            let mut entries: Vec<String> = v
                .get("entries")
                .and_then(|e| serde_json::from_value(e.clone()).ok())
                .unwrap_or_default();
            let requirement = v
                .get("requirement")
                .and_then(|r| r.as_str())
                .unwrap_or("none")
                .to_string();
            let req_value = v
                .get("requirement_value")
                .and_then(|r| r.as_str())
                .unwrap_or("")
                .to_string();
            let roles: Vec<u64> = guild_id
                .member(&ctx.http, comp.user.id)
                .await
                .map(|m| m.roles.iter().map(|r| r.get()).collect())
                .unwrap_or_default();
            if !crate::commands::giveaway::check_requirement(
                &self.pool,
                &gid,
                comp.user.id.get(),
                &roles,
                &requirement,
                &req_value,
            )
            .await
            {
                let _ = comp
                    .create_response(
                        &ctx.http,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content("Requirement not met.")
                                .ephemeral(true),
                        ),
                    )
                    .await;
                return;
            }
            let joined = crate::commands::giveaway::join_giveaway(
                &mut entries,
                &comp.user.id.get().to_string(),
            );
            if let Some(obj) = v.as_object_mut() {
                obj.insert("entries".into(), serde_json::json!(entries));
            }
            let _ = crate::db::kv_set(&self.pool, &gid, &key, &v.to_string()).await;
            let _ = comp
                .create_response(
                    &ctx.http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(if joined {
                                "Entered."
                            } else {
                                "Already entered."
                            })
                            .ephemeral(true),
                    ),
                )
                .await;
        } else if id == crate::commands::rolereactions::ROLESELECT_CUSTOM_ID {
            let _ = crate::commands::rolereactions::handle_roleselect_pick(&ctx, &comp).await;
        } else if id.starts_with("rolepanel:") {
            let _ = crate::commands::moderation::handle_rolepanel_button(&ctx, &comp).await;
        } else if id == crate::commands::honeypot::HONEYPOT_CUSTOM_ID {
            let _ = crate::commands::honeypot::handle_honeypot_claim(&ctx, &comp, &self.pool).await;
        } else if id == crate::commands::ticket::TICKET_EMBED_DELETE {
            let _ =
                crate::commands::ticket::handle_ticket_embed_delete(&ctx, &comp, &self.pool).await;
        } else if id == crate::commands::ticket::TICKET_EMBED_TRANSCRIPT {
            let _ =
                crate::commands::ticket::handle_ticket_embed_transcript(&ctx, &comp, &self.pool)
                    .await;
        } else if id == crate::commands::ticket::TICKET_EMBED_SELECT_USER {
            let _ =
                crate::commands::ticket::handle_ticket_select_user(&ctx, &comp, &self.pool).await;
        } else if id.starts_with(crate::commands::ticket::TICKET_OPEN_CUSTOM_ID_PREFIX) {
            let _ =
                crate::commands::ticket::handle_ticket_open_button(&ctx, &comp, &self.pool).await;
        } else if id.starts_with(crate::commands::voicedashboard::TEMPVOICE_PREFIX) {
            let _ =
                crate::commands::voicedashboard::handle_tempvoice_button(&ctx, &comp, &self.pool)
                    .await;
        } else {
            // Generic button-role toggle. Mirrors
            // Components/Buttons/button_reaction.ts:
            // GUILD.REACTION_ROLES.<messageId> { [customId]: {rolesID} }.
            let gid = comp
                .guild_id
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let key = format!("GUILD.REACTION_ROLES.{}", comp.message.id.get());
            if let Some(raw) = crate::db::kv_get(&self.pool, &gid, &key).await {
                if let Ok(map) = serde_json::from_str::<serde_json::Value>(&raw) {
                    if let Some(role_id) = map
                        .get(id)
                        .and_then(|e| e.get("rolesID"))
                        .and_then(|r| r.as_str())
                        .and_then(|s| s.parse::<u64>().ok())
                    {
                        if let Some(guild_id) = comp.guild_id {
                            if let Ok(member) = guild_id.member(&ctx.http, comp.user.id).await {
                                let role = serenity::RoleId::new(role_id);
                                let msg = if member.roles.contains(&role) {
                                    let _ = member.remove_role(&ctx.http, role).await;
                                    "Role removed."
                                } else {
                                    let _ = member.add_role(&ctx.http, role).await;
                                    "Role added."
                                };
                                let _ = comp
                                    .create_response(
                                        &ctx.http,
                                        serenity::CreateInteractionResponse::Message(
                                            serenity::CreateInteractionResponseMessage::new()
                                                .content(msg)
                                                .ephemeral(true),
                                        ),
                                    )
                                    .await;
                            }
                        }
                    }
                }
            }
        }
    }
}
