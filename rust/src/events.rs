// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Events/** (95 files).
//
// Full inventory: see rust/PORT_INVENTORY.md (events section to be extended).
// This module hosts pure routing helpers shared by the serenity event
// handler (to be wired in bot.rs): log-channel routing, protection punish
// decisions, XP/level math. All Discord I/O stays in the handler; only
// pure logic lives here so it stays unit-testable.

/// Server-log categories mirroring {guild}.GUILD.SERVER_LOGS.* keys.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogCategory {
    Message,
    Channel,
    Roles,
    Boost,
    Voice,
    Moderation,
    Command,
}

/// Route a Discord audit event to its log category + DB key suffix.
/// Mirrors src/Events/logs/*.ts reading SERVER_LOGS.<suffix>.
pub fn route_log(event: &str) -> Option<(LogCategory, &'static str)> {
    match event {
        "messageDelete" | "messageUpdate" => Some((LogCategory::Message, "message")),
        "channelCreate" | "channelUpdate" => Some((LogCategory::Channel, "channel")),
        "guildMemberUpdate-roles" => Some((LogCategory::Roles, "roles")),
        "guildMemberUpdate-boost" => Some((LogCategory::Boost, "boosts")),
        "voiceStateUpdate" => Some((LogCategory::Voice, "voice")),
        "guildBanAdd" | "guildBanRemove" | "guildMemberRemove-kick" => {
            Some((LogCategory::Moderation, "moderation"))
        }
        "interactionCreate-command" => Some((LogCategory::Command, "command")),
        _ => None,
    }
}

/// Protection punish decision. Mirrors src/Events/protection/avoid*.ts:
/// whitelist/owner bypass, otherwise punish the audit-log executor.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PunishDecision {
    Ignore,
    Punish,
}

pub fn protection_decision(
    is_owner: bool,
    is_allowlisted: bool,
    executor_is_bot: bool,
) -> PunishDecision {
    if is_owner || is_allowlisted || executor_is_bot {
        PunishDecision::Ignore
    } else {
        PunishDecision::Punish
    }
}

/// XP curve helper. Mirrors rank level-up checks (level * 100 XP).
pub fn xp_for_next_level(level: u64) -> u64 {
    level.saturating_mul(100)
}

/// XP ignore check. Mirrors !ignore-channels.ts runtime gate.
pub fn should_gain_xp(ignore: &[String], channel_id: &str) -> bool {
    !ignore.iter().any(|c| c == channel_id)
}

/// Level-role rewards earned crossing old_level -> new_level.
/// Mirrors rankRoleModule.ts attribution.
pub fn roles_earned(
    roles: &[crate::commands::ranks::main::RankRole],
    old_level: u64,
    new_level: u64,
) -> Vec<String> {
    roles
        .iter()
        .filter(|r| r.level > old_level && r.level <= new_level)
        .map(|r| r.role_id.clone())
        .collect()
}

/// Bounded name-history push. Mirrors prevnamesModule.ts (userUpdate +
/// guildMemberUpdate): newest first, capped, dedup consecutive.
pub fn push_prevname(mut history: Vec<String>, name: &str, cap: usize) -> Vec<String> {
    let name = name.to_string();
    if history.first().map(|f| f == &name).unwrap_or(false) {
        return history;
    }
    history.insert(0, name);
    history.truncate(cap.max(1));
    history
}

pub const PREVNAMES_CAP: usize = 20;

pub fn prevnames_key(user_id: u64) -> String {
    format!("PREVNAMES.{user_id}")
}

/// Role snapshot for rolesaver. Mirrors onMemberLeave/onMemberJoin:
/// skips @everyone and, when the guild opts out of admin restore
/// (`rolesaver.admin === "no"`), admin-permission roles.
pub fn snapshot_roles(roles: &[(u64, bool)], everyone_id: u64, skip_admin: bool) -> Vec<String> {
    roles
        .iter()
        .filter(|(id, admin)| *id != everyone_id && !(skip_admin && *admin))
        .map(|(id, _)| id.to_string())
        .collect()
}

/// Voice session tracking. Mirrors Events/stats/onVoiceUpdate.ts
/// (ACTIVE_VOICE_SESSIONS + addCoins with member boost on leave).
pub fn voice_session_key(user_id: u64) -> String {
    format!("VOICE_SESSION.{user_id}")
}

/// Coins earned: floor(minutes / 10), multiplied by boost.
/// Mirrors onVoiceUpdate.ts (Math.floor(durationMin / 10) * boost).
pub fn coins_for_voice(minutes: u64, boost_mult: u64) -> i64 {
    ((minutes / 10) * boost_mult.max(1)) as i64
}

pub async fn voice_join(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
    now_ms: i64,
) {
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &voice_session_key(user_id),
        &format!("{now_ms}:{channel_id}"),
    )
    .await;
}

/// Parse a session value ("<start_ms>:<channel_id>"; legacy bare
/// "<start_ms>" rows read channel 0).
pub fn parse_voice_session(raw: &str) -> Option<(i64, u64)> {
    let (start_s, chan_s) = match raw.split_once(':') {
        Some((a, b)) => (a, b),
        None => (raw, "0"),
    };
    let start: i64 = start_s.parse().ok()?;
    let channel: u64 = chan_s.parse().unwrap_or(0);
    Some((start, channel))
}

/// Parameters for closing one voice leg (keeps arg counts clippy-clean).
struct VoiceClose {
    channel_id: u64,
    start: i64,
    now_ms: i64,
    boost_mult: u64,
    pay: bool,
}

async fn close_voice_session(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    close: VoiceClose,
) -> (u64, i64) {
    let elapsed_ms = (close.now_ms - close.start).max(0) as u64;
    let minutes = elapsed_ms / 60_000;
    // TS pays only when coinsEarned > 0 AND newState.member is non-null
    // (a user who left the guild earns nothing). Stats are pushed either
    // way, exactly like processSessionEnd.
    let coins = if close.pay {
        coins_for_voice(minutes, close.boost_mult)
    } else {
        0
    };
    let mut econ = crate::commands::economy::main::load_econ(pool, guild_id, user_id).await;
    econ.money += coins;
    let _ = crate::commands::economy::main::save_econ(pool, guild_id, user_id, &econ).await;
    let mut stats = crate::commands::stats::main::load_stats(pool, guild_id, user_id).await;
    // Exact elapsed ms (TS stores exact start/end timestamps; the old
    // whole-minutes truncation lost up to ~59.9s per session).
    stats.voice_ms += elapsed_ms;
    stats.voice_log = crate::commands::stats::main::push_voice_log(
        stats.voice_log,
        crate::commands::stats::main::StatsVoice {
            start_ts: close.start,
            end_ts: close.now_ms,
            channel_id: close.channel_id,
        },
    );
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &crate::commands::stats::main::stats_key(user_id),
        &serde_json::to_string(&stats).unwrap_or_default(),
    )
    .await;
    (minutes, coins)
}

/// Close a session. Returns (minutes, coins) credited to wallet + voice_ms.
/// Mirrors processSessionEnd in onVoiceUpdate.ts. `pay` is the
/// newState.member gate: false when the user left the guild.
pub async fn voice_leave(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    now_ms: i64,
    boost_mult: u64,
    pay: bool,
) -> (u64, i64) {
    let raw: Option<String> = crate::db::kv_get(pool, guild_id, &voice_session_key(user_id)).await;
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(voice_session_key(user_id))
        .execute(pool)
        .await;
    let Some(raw) = raw else {
        return (0, 0);
    };
    let Some((start, channel_id)) = parse_voice_session(&raw) else {
        return (0, 0);
    };
    close_voice_session(
        pool,
        guild_id,
        user_id,
        VoiceClose {
            channel_id,
            start,
            now_ms,
            boost_mult,
            pay,
        },
    )
    .await
}

/// Channel move: close the old leg (coins + StatsVoice, mirrors TS
/// processSessionEnd on move) then open the new session.
pub async fn voice_switch(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    new_channel_id: u64,
    now_ms: i64,
    boost_mult: u64,
    pay: bool,
) -> (u64, i64) {
    let raw: Option<String> = crate::db::kv_get(pool, guild_id, &voice_session_key(user_id)).await;
    let mut out = (0, 0);
    if let Some(raw) = raw {
        if let Some((start, channel_id)) = parse_voice_session(&raw) {
            out = close_voice_session(
                pool,
                guild_id,
                user_id,
                VoiceClose {
                    channel_id,
                    start,
                    now_ms,
                    boost_mult,
                    pay,
                },
            )
            .await;
        }
    }
    voice_join(pool, guild_id, user_id, new_channel_id, now_ms).await;
    out
}

/// Delete one session row.
pub async fn delete_voice_session(pool: &crate::db::Pool, guild_id: &str, user_id: u64) {
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(voice_session_key(user_id))
        .execute(pool)
        .await;
}

/// Boot recovery. Mirrors recoverActiveSessions in onVoiceUpdate.ts:
/// sessions for users no longer in voice are closed WITHOUT pay (the TS
/// synthetic leave state carries no member, so the member gate pays
/// nothing) and their stats are still recorded. `in_voice` holds the
/// user ids currently in a voice channel. Returns closed count.
pub async fn recover_voice_sessions(
    pool: &crate::db::Pool,
    guild_id: &str,
    in_voice: &std::collections::HashSet<u64>,
    now_ms: i64,
) -> usize {
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'VOICE_SESSION.%'",
    )
    .bind(guild_id)
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut closed = 0;
    for (key, raw) in rows {
        let Some(uid) = key
            .strip_prefix("VOICE_SESSION.")
            .and_then(|s| s.parse::<u64>().ok())
        else {
            continue;
        };
        if in_voice.contains(&uid) {
            continue;
        }
        let Some((start, channel_id)) = parse_voice_session(&raw) else {
            delete_voice_session(pool, guild_id, uid).await;
            continue;
        };
        delete_voice_session(pool, guild_id, uid).await;
        close_voice_session(
            pool,
            guild_id,
            uid,
            VoiceClose {
                channel_id,
                start,
                now_ms,
                boost_mult: 1,
                pay: false,
            },
        )
        .await;
        closed += 1;
    }
    closed
}
/// Temp voice helpers. Mirrors voicedashboard/voiceState.ts:
/// joining the lobby spawns a personal channel (CUSTOM_VOICE), emptied
/// temp channels are deleted.
pub fn temp_voice_key(guild_id: u64, user_id: u64) -> String {
    format!("CUSTOM_VOICE.{guild_id}.{user_id}")
}

pub fn temp_channel_name(username: &str) -> String {
    temp_channel_name_in(username, None)
}

/// Temp channel name with an optional lang template (TS
/// `temporary_voice_channel_name`, `{nickname}` slot). `None`
/// keeps the current English default.
pub fn temp_channel_name_in(username: &str, template: Option<&str>) -> String {
    let short: String = username.chars().take(20).collect();
    match template {
        Some(t) => t.replace("{nickname}", &short),
        None => format!("{short}'s channel"),
    }
}

/// Welcome template render. Mirrors generateCustomMessagePreview for
/// join/leave messages: {user} {server} {memberCount} {username}.
pub fn render_welcome(
    template: &str,
    user_mention: &str,
    guild_name: &str,
    member_count: u64,
) -> String {
    template
        .replace("{user}", user_mention)
        .replace("{username}", user_mention)
        .replace("{server}", guild_name)
        .replace("{memberCount}", &member_count.to_string())
}

/// Inviter display for join messages. Mirrors the isCustomVanity branch
/// in joinMessage.ts: bot-attributed custom-vanity joins show the short
/// vanity links, otherwise the plain username/mention.
pub fn inviter_display(
    vanity_code: Option<&str>,
    username: &str,
    mention: &str,
) -> (String, String) {
    match vanity_code {
        Some(code) => (format!(".wf/{code}"), format!("discord.wf/{code}")),
        None => (username.to_string(), mention.to_string()),
    }
}

/// Custom-vanity lookup. Mirrors `apiTable.get(VANITY.${guildId})` plus
/// the bot-inviter and invite-code match (entry shape {vanity, invite}).
pub fn custom_vanity_code(
    table: Option<&serde_json::Value>,
    guild_id: &str,
    invite_code: &str,
    bot_id: u64,
    inviter_id: u64,
) -> Option<String> {
    if inviter_id != bot_id {
        return None;
    }
    let entry = table?.get(guild_id)?;
    if entry.get("invite")?.as_str()? != invite_code {
        return None;
    }
    entry.get("vanity")?.as_str().map(str::to_string)
}

/// Apply the join-message inviter slots once attribution resolves an
/// inviter (render_welcome itself has no inviter vocabulary).
pub fn render_inviter_slots(template: &str, username: &str, mention: &str) -> String {
    template
        .replace("{inviterUsername}", username)
        .replace("{inviterMention}", mention)
}

/// Join-DM template rendering. Mirrors generateCustomMessagePreview in
/// core/functions/method.ts for the joinDm call (member/guild
/// placeholders resolved; inviter/ranks/notifier/blogger slots keep
/// their TS literal defaults since join emission carries no context).
pub fn render_join_dm(
    template: &str,
    username: &str,
    mention: &str,
    member_count: u64,
    guild_name: &str,
) -> String {
    template
        .replace("{memberUsername}", username)
        .replace("{memberMention}", mention)
        .replace("{memberCount}", &member_count.to_string())
        .replace("{guildName}", guild_name)
        .replace("{inviterUsername}", "unknow_user")
        .replace("{inviterMention}", "@unknow_user")
        .replace("{invitesCount}", "1337")
        .replace("{xpLevel}", "1337")
        .replace("{artistAuthor}", "Ninja")
        .replace("{artistLink}", "https://twitch.tv/Ninja")
        .replace("{mediaURL}", "https://twitch.tv/Ninja/media")
        .replace("{articleTitle}", "Unknow Article")
        .replace("{articleAuthor}", "Unknown Author")
        .replace("{articleLink}", "Unknown Link")
        .replace("{blogName}", "Unknown Blog Name")
}

/// Join-role list from the welcomer blob. Mirrors joinRole.ts
/// (GUILD.GUILD_CONFIG.joinroles as string | string[]), falling back
/// to the legacy GUILD.JOIN_ROLE row written by the old setter.
pub async fn join_role_ids(pool: &crate::db::Pool, gid: &str) -> Vec<u64> {
    let parse = |s: &str| s.parse::<u64>().ok();
    if let Some(raw) = crate::db::kv_get(pool, gid, "GUILD.GUILD_CONFIG").await {
        if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(v) = cfg.get("joinroles") {
                if let Some(s) = v.as_str() {
                    return parse(s).into_iter().collect();
                }
                if let Some(arr) = v.as_array() {
                    return arr
                        .iter()
                        .filter_map(|x| x.as_str().and_then(parse))
                        .collect();
                }
            }
        }
    }
    crate::db::kv_get(pool, gid, "GUILD.JOIN_ROLE")
        .await
        .and_then(|s| parse(&s))
        .into_iter()
        .collect()
}

/// Join-DM template from the welcomer blob. Mirrors joinDm.ts
/// (GUILD.GUILD_CONFIG.joindm; "off" disables), falling back to the
/// legacy GUILD.JOIN_DM row. Returns None when unset or "off".
pub async fn join_dm_template(pool: &crate::db::Pool, gid: &str) -> Option<String> {
    let blob = if let Some(raw) = crate::db::kv_get(pool, gid, "GUILD.GUILD_CONFIG").await {
        serde_json::from_str::<serde_json::Value>(&raw)
            .ok()
            .and_then(|cfg| cfg.get("joindm").and_then(|v| v.as_str()).map(String::from))
    } else {
        None
    };
    let tpl = match blob {
        Some(t) => Some(t),
        None => crate::db::kv_get(pool, gid, "GUILD.JOIN_DM").await,
    }?;
    if tpl == "off" {
        return None;
    }
    Some(tpl)
}

/// Record one message: +1 STATS message, +10 RANKS XP (level-ups applied).
/// Mirrors Events/stats/onNewMessage.ts + ranks/onNewMessage.ts.
/// Returns (new_level, leveled_up).
pub fn channel_stats_key(channel_id: u64) -> String {
    format!("STATS.CHANNEL.{channel_id}")
}

/// One permission-overwrite entry in plain data form (mirrors the
/// discord.js PermissionOverwrite cache rows consumed by getDiff in
/// Events/logs/channelUpdateLogs.ts). Serenity mapping happens at
/// the call site so this stays unit-testable.
pub struct PermOverwriteDiff {
    pub id: u64,
    pub is_role: bool,
    pub allow: Vec<String>,
    pub deny: Vec<String>,
}

/// Channel-update change list. Mirrors getDiff in
/// Events/logs/channelUpdateLogs.ts (name line + allow/deny
/// add/remove lines via the event_srvLogs_channelUpdate_* keys;
/// empty string means "no relevant change, stay silent").
pub fn channel_perm_diff(
    old_name: &str,
    new_name: &str,
    old_ow: &[PermOverwriteDiff],
    new_ow: &[PermOverwriteDiff],
    text: &dyn Fn(&str) -> String,
) -> String {
    let mut after = String::new();
    if old_name != new_name {
        after +=
            &text("event_srvLogs_channelUpdate_field_name").replace("${newChannel.name}", new_name);
    }
    let target = |o: &PermOverwriteDiff| {
        if o.is_role {
            format!("<@&{}>", o.id)
        } else {
            format!("<@{}>", o.id)
        }
    };
    for old_perm in old_ow {
        let Some(new_perm) = new_ow.iter().find(|n| n.id == old_perm.id) else {
            continue;
        };
        let t = target(new_perm);
        for p in old_perm
            .allow
            .iter()
            .filter(|p| !new_perm.allow.contains(p))
        {
            after += &text("event_srvLogs_channelUpdate_disabled_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
        for p in new_perm
            .allow
            .iter()
            .filter(|p| !old_perm.allow.contains(p))
        {
            after += &text("event_srvLogs_channelUpdate_enabled_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
        for p in old_perm.deny.iter().filter(|p| !new_perm.deny.contains(p)) {
            after += &text("event_srvLogs_channelUpdate_allowed_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
        for p in new_perm.deny.iter().filter(|p| !old_perm.deny.contains(p)) {
            after += &text("event_srvLogs_channelUpdate_unallowed_for")
                .replace("${perm}", p)
                .replace("${target}", &t);
        }
    }
    for new_perm in new_ow {
        if old_ow.iter().any(|o| o.id == new_perm.id) {
            continue;
        }
        let t = target(new_perm);
        after += &text("event_srvLogs_channelUpdate_perm_added").replace("${target}", &t);
        for p in &new_perm.allow {
            after += &format!("-    ✅ {p}\n");
        }
        for p in &new_perm.deny {
            after += &format!("-    ❌ {p}\n");
        }
    }
    after
}

/// Line diff for edited-message logs. Mirrors getDetailedDiff in
/// Events/logs/messageUpdateLogs.ts (30-char window around the
/// first difference, ```diff fenced).
pub fn message_diff(old_text: &str, new_text: &str) -> String {
    const MAX_LINE: usize = 30;
    fn diff_index(a: &str, b: &str) -> usize {
        let a: Vec<char> = a.chars().collect();
        let b: Vec<char> = b.chars().collect();
        for i in 0..a.len().min(b.len()) {
            if a[i] != b[i] {
                return i;
            }
        }
        a.len().max(b.len())
    }
    fn trunc(line: &str, idx: usize) -> String {
        let chars: Vec<char> = line.chars().collect();
        let start = idx.saturating_sub(MAX_LINE / 2);
        let end = (start + MAX_LINE).min(chars.len());
        chars[start..end].iter().collect()
    }
    let old_lines: Vec<&str> = old_text.trim().split('\n').collect();
    let new_lines: Vec<&str> = new_text.trim().split('\n').collect();
    let mut out = vec![];
    for i in 0..old_lines.len().max(new_lines.len()) {
        let o = old_lines.get(i).copied().unwrap_or("");
        let n = new_lines.get(i).copied().unwrap_or("");
        let (to, tn) = (
            if o.len() > MAX_LINE {
                trunc(o, diff_index(o, n))
            } else {
                o.to_string()
            },
            if n.len() > MAX_LINE {
                trunc(n, diff_index(o, n))
            } else {
                n.to_string()
            },
        );
        if !o.is_empty() && n.is_empty() {
            out.push(format!("- {to}"));
        } else if o.is_empty() && !n.is_empty() {
            out.push(format!("+ {tn}"));
        } else if o != n {
            out.push(format!("- {to}"));
            out.push(format!("+ {tn}"));
        }
    }
    format!("```diff\n{}\n```", out.join("\n"))
}

pub async fn record_message_activity(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
    content_len: u64,
    now_ms: i64,
) -> (u64, bool) {
    let chan_key = channel_stats_key(channel_id);
    let chan_count: u64 = crate::db::kv_get(pool, guild_id, &chan_key)
        .await
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let _ = crate::db::kv_set(pool, guild_id, &chan_key, &(chan_count + 1).to_string()).await;
    let mut stats = crate::commands::stats::main::load_stats(pool, guild_id, user_id).await;
    stats.messages += 1;
    stats.msg_log = crate::commands::stats::main::push_msg_log(
        stats.msg_log,
        crate::commands::stats::main::StatsMessage {
            sent_ts: now_ms,
            content_len,
            channel_id,
        },
    );
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &crate::commands::stats::main::stats_key(user_id),
        &serde_json::to_string(&stats).unwrap_or_default(),
    )
    .await;

    let entry = crate::commands::ranks::main::load_rank(pool, guild_id, user_id).await;
    let (next, leveled) = crate::commands::ranks::main::apply_xp(entry, 10);
    let level = next.level;
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &crate::commands::ranks::main::ranks_key(user_id),
        &serde_json::to_string(&next).unwrap_or_default(),
    )
    .await;
    (level, leveled)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_routing_mirrors_ts_keys() {
        assert_eq!(
            route_log("messageDelete"),
            Some((LogCategory::Message, "message"))
        );
        assert_eq!(
            route_log("channelCreate"),
            Some((LogCategory::Channel, "channel"))
        );
        assert_eq!(
            route_log("guildBanAdd"),
            Some((LogCategory::Moderation, "moderation"))
        );
        assert_eq!(route_log("unknown-event"), None);
    }

    #[test]
    fn protection_bypasses_owner_allowlist_and_bots() {
        assert_eq!(
            protection_decision(true, false, false),
            PunishDecision::Ignore
        );
        assert_eq!(
            protection_decision(false, true, false),
            PunishDecision::Ignore
        );
        assert_eq!(
            protection_decision(false, false, true),
            PunishDecision::Ignore
        );
        assert_eq!(
            protection_decision(false, false, false),
            PunishDecision::Punish
        );
    }

    #[test]
    fn xp_curve_is_linear_100_per_level() {
        assert_eq!(xp_for_next_level(0), 0);
        assert_eq!(xp_for_next_level(1), 100);
        assert_eq!(xp_for_next_level(5), 500);
    }

    #[test]
    fn ignore_gate_and_role_rewards() {
        assert!(should_gain_xp(&[], "1"));
        assert!(!should_gain_xp(&["1".to_string()], "1"));
        let roles = vec![
            crate::commands::ranks::main::RankRole {
                role_id: "a".into(),
                level: 2,
            },
            crate::commands::ranks::main::RankRole {
                role_id: "b".into(),
                level: 5,
            },
        ];
        assert_eq!(roles_earned(&roles, 1, 3), vec!["a".to_string()]);
        assert!(roles_earned(&roles, 3, 4).is_empty());
    }

    #[test]
    fn prevnames_dedup_and_cap() {
        let h = push_prevname(vec![], "a", 3);
        let h = push_prevname(h, "a", 3);
        assert_eq!(h.len(), 1);
        let h = push_prevname(h, "b", 3);
        let h = push_prevname(h, "c", 3);
        let h = push_prevname(h, "d", 3);
        assert_eq!(h, vec!["d".to_string(), "c".to_string(), "b".to_string()]);
    }

    #[test]
    fn rolesaver_skips_everyone() {
        assert_eq!(
            snapshot_roles(&[(1, false), (2, false), (3, true)], 1, false),
            vec!["2".to_string(), "3".to_string()]
        );
        // Admin opt-out drops admin roles only.
        assert_eq!(
            snapshot_roles(&[(1, false), (2, false), (3, true)], 1, true),
            vec!["2".to_string()]
        );
    }

    #[test]
    fn temp_voice_helpers() {
        assert_eq!(temp_voice_key(1, 2), "CUSTOM_VOICE.1.2");
        assert_eq!(temp_channel_name("bob"), "bob's channel");
        assert!(temp_channel_name(&"x".repeat(50)).len() < 40);
        assert_eq!(
            temp_channel_name_in("bob", Some("{nickname}'s Channel")),
            "bob's Channel"
        );
        assert_eq!(temp_channel_name_in("bob", None), "bob's channel");
    }

    #[test]
    fn voice_coins_and_sessions() {
        assert_eq!(coins_for_voice(10, 1), 1);
        assert_eq!(coins_for_voice(10, 3), 3);
        assert_eq!(coins_for_voice(9, 5), 0);
        assert_eq!(coins_for_voice(25, 2), 4);
        assert_eq!(coins_for_voice(0, 5), 0);
    }

    #[tokio::test]
    async fn voice_leave_credits_wallet_and_stats() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool).await.unwrap();
        voice_join(&pool, "g", 1, 9, 0).await;
        let (minutes, coins) = voice_leave(&pool, "g", 1, 6_000_000, 2, true).await;
        assert_eq!((minutes, coins), (100, 20));
        let econ = crate::commands::economy::main::load_econ(&pool, "g", 1).await;
        assert_eq!(econ.money, 20);
        let stats = crate::commands::stats::main::load_stats(&pool, "g", 1).await;
        assert_eq!(stats.voice_ms, 6_000_000);
        assert_eq!(stats.voice_log.len(), 1);
        assert_eq!(stats.voice_log[0].channel_id, 9);
        assert_eq!(stats.voice_log[0].end_ts, 6_000_000);
        // No session -> nothing.
        assert_eq!(voice_leave(&pool, "g", 1, 999_999, 1, true).await, (0, 0));
    }

    #[tokio::test]
    async fn voice_leave_member_gate_and_exact_ms() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool).await.unwrap();
        // pay=false (user left the guild, TS newState.member null):
        // no coins, but the session still closes and stats push.
        voice_join(&pool, "g", 1, 9, 0).await;
        let (minutes, coins) = voice_leave(&pool, "g", 1, 6_100_000, 2, false).await;
        assert_eq!((minutes, coins), (101, 0));
        let econ = crate::commands::economy::main::load_econ(&pool, "g", 1).await;
        assert_eq!(econ.money, 0);
        // Exact ms accumulate (no whole-minute truncation).
        let stats = crate::commands::stats::main::load_stats(&pool, "g", 1).await;
        assert_eq!(stats.voice_ms, 6_100_000);
        assert_eq!(stats.voice_log.len(), 1);
        // Session row is gone in both cases.
        assert!(crate::db::kv_get(&pool, "g", &voice_session_key(1))
            .await
            .is_none());
    }

    #[tokio::test]
    async fn recover_voice_sessions_closes_absentees_unpaid() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool).await.unwrap();
        // User 1 still in voice (kept), user 2 gone (closed, unpaid).
        voice_join(&pool, "g", 1, 9, 0).await;
        voice_join(&pool, "g", 2, 9, 0).await;
        let in_voice: std::collections::HashSet<u64> = [1].into_iter().collect();
        assert_eq!(
            recover_voice_sessions(&pool, "g", &in_voice, 6_000_000).await,
            1
        );
        assert!(crate::db::kv_get(&pool, "g", &voice_session_key(1))
            .await
            .is_some());
        assert!(crate::db::kv_get(&pool, "g", &voice_session_key(2))
            .await
            .is_none());
        let econ = crate::commands::economy::main::load_econ(&pool, "g", 2).await;
        assert_eq!(econ.money, 0);
        let stats = crate::commands::stats::main::load_stats(&pool, "g", 2).await;
        assert_eq!(stats.voice_ms, 6_000_000);
        assert_eq!(stats.voice_log.len(), 1);
        // Idempotent: second run closes nothing.
        assert_eq!(
            recover_voice_sessions(&pool, "g", &in_voice, 7_000_000).await,
            0
        );
    }

    #[test]
    fn welcome_renders_placeholders() {
        let out = render_welcome("Hi {user} in {server} #{memberCount}!", "@a", "G", 42);
        assert_eq!(out, "Hi @a in G #42!");
        assert_eq!(render_welcome("plain", "@a", "G", 1), "plain");
    }

    #[test]
    fn join_inviter_display_matches_ts() {
        // Plain attribution passes username/mention through.
        assert_eq!(
            inviter_display(None, "bob", "<@9>"),
            ("bob".to_string(), "<@9>".to_string())
        );
        // Bot-attributed custom-vanity joins show the short links.
        assert_eq!(
            inviter_display(Some("vip"), "Bot", "<@1>"),
            (".wf/vip".to_string(), "discord.wf/vip".to_string())
        );
        // Lookup: bot inviter + matching invite code hits the entry.
        let table = serde_json::json!({ "7": { "vanity": "vip", "invite": "abc" } });
        assert_eq!(
            custom_vanity_code(Some(&table), "7", "abc", 1, 1),
            Some("vip".to_string())
        );
        // Non-bot inviter, wrong code, missing table all miss.
        assert_eq!(custom_vanity_code(Some(&table), "7", "abc", 1, 2), None);
        assert_eq!(custom_vanity_code(Some(&table), "7", "zzz", 1, 1), None);
        assert_eq!(custom_vanity_code(None, "7", "abc", 1, 1), None);
        assert_eq!(custom_vanity_code(Some(&table), "8", "abc", 1, 1), None);
        // Slot fill for the join message path.
        assert_eq!(
            render_inviter_slots("by {inviterUsername} ({inviterMention})", "b", "<@9>"),
            "by b (<@9>)"
        );
    }

    #[test]
    fn join_dm_renders_ts_placeholders() {
        let out = render_join_dm(
            "Hi {memberUsername} {memberMention} #{memberCount} in {guildName} by {inviterUsername} ({inviterMention} x{invitesCount}) lvl {xpLevel} ft {artistAuthor}",
            "bob",
            "<@9>",
            42,
            "G",
        );
        assert_eq!(
            out,
            "Hi bob <@9> #42 in G by unknow_user (@unknow_user x1337) lvl 1337 ft Ninja"
        );
    }

    #[tokio::test]
    async fn join_keys_read_blob_then_legacy() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        // Empty -> nothing from either source.
        assert!(join_role_ids(&pool, "g").await.is_empty());
        assert!(join_dm_template(&pool, "g").await.is_none());
        // Legacy rows work.
        crate::db::kv_set(&pool, "g", "GUILD.JOIN_ROLE", "7")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.JOIN_DM", "hey")
            .await
            .unwrap();
        assert_eq!(join_role_ids(&pool, "g").await, vec![7]);
        assert_eq!(join_dm_template(&pool, "g").await.as_deref(), Some("hey"));
        // Blob wins: string role, "off" DM disables.
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG",
            r#"{"joinroles":"8","joindm":"off"}"#,
        )
        .await
        .unwrap();
        assert_eq!(join_role_ids(&pool, "g").await, vec![8]);
        assert!(join_dm_template(&pool, "g").await.is_none());
        // Blob array roles + blob DM template.
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG",
            r#"{"joinroles":["1","2","xx"],"joindm":"yo"}"#,
        )
        .await
        .unwrap();
        assert_eq!(join_role_ids(&pool, "g").await, vec![1, 2]);
        assert_eq!(join_dm_template(&pool, "g").await.as_deref(), Some("yo"));
    }

    #[test]
    fn channel_perm_diff_matches_ts() {
        let text = |k: &str| match k {
            "event_srvLogs_channelUpdate_field_name" => "NAME:${newChannel.name}".to_string(),
            "event_srvLogs_channelUpdate_disabled_for" => "DIS ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_enabled_for" => "EN ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_allowed_for" => "AL ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_unallowed_for" => "UN ${perm} ${target}".to_string(),
            "event_srvLogs_channelUpdate_perm_added" => "ADD ${target}".to_string(),
            _ => k.to_string(),
        };
        assert_eq!(channel_perm_diff("a", "a", &[], &[], &text), "");
        let mk = |id: u64, is_role: bool, allow: &[&str], deny: &[&str]| PermOverwriteDiff {
            id,
            is_role,
            allow: allow.iter().map(|s| s.to_string()).collect(),
            deny: deny.iter().map(|s| s.to_string()).collect(),
        };
        let d = channel_perm_diff(
            "old",
            "new",
            &[mk(1, true, &["SendMessages"], &[]), mk(9, false, &[], &[])],
            &[
                mk(1, true, &[], &["SendMessages"]),
                mk(2, false, &["ViewChannel"], &[]),
            ],
            &text,
        );
        assert!(d.contains("NAME:new"));
        assert!(d.contains("DIS SendMessages <@&1>"));
        assert!(d.contains("UN SendMessages <@&1>"));
        assert!(d.contains("ADD <@2>"));
        assert!(d.contains("-    ✅ ViewChannel\n"));
    }

    #[test]
    fn message_diff_matches_ts() {
        let d = message_diff("hello world", "hello there");
        assert!(d.starts_with("```diff\n"));
        assert!(d.contains("- hello world"));
        assert!(d.contains("+ hello there"));
        let long_old = "a".repeat(50);
        let long_new = "a".repeat(49) + "b";
        let d2 = message_diff(&long_old, &long_new);
        assert!(d2.contains("- "));
        assert!(d2.contains("+ "));
    }

    #[tokio::test]
    async fn record_message_increments_stats_and_xp() {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE guild_lang (guild_id TEXT PRIMARY KEY, lang TEXT NOT NULL DEFAULT 'en-US')")
            .execute(&pool).await.unwrap();
        let (level, leveled) = record_message_activity(&pool, "g", 1, 7, 5, 1_000).await;
        assert_eq!((level, leveled), (0, false));
        let s = crate::commands::stats::main::load_stats(&pool, "g", 1).await;
        assert_eq!(s.messages, 1);
        assert_eq!(s.msg_log.len(), 1);
        assert_eq!(s.msg_log[0].channel_id, 7);
        assert_eq!(s.msg_log[0].content_len, 5);
        let mut last = (0, false);
        for _ in 0..9 {
            last = record_message_activity(&pool, "g", 1, 7, 5, 1_000).await;
        }
        let chan: u64 = crate::db::kv_get(&pool, "g", &channel_stats_key(7))
            .await
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);
        assert_eq!(chan, 10);
        // 10 messages x 10 XP = 100 XP = level 1 (curve: level*100).
        assert_eq!(last, (1, true));
    }
}
