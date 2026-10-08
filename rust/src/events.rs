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
        "guildMemberUpdate-boost" => Some((LogCategory::Boost, "boost")),
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
    roles: &[crate::commands::ranks::RankRole],
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

/// Role snapshot for rolesaver. Mirrors onMemberLeave/onMemberJoin.
pub fn snapshot_roles(role_ids: &[u64], everyone_id: u64) -> Vec<String> {
    role_ids
        .iter()
        .filter(|id| **id != everyone_id)
        .map(|id| id.to_string())
        .collect()
}

/// Voice session tracking. Mirrors Events/stats/onVoiceUpdate.ts
/// (ACTIVE_VOICE_SESSIONS + addCoins with member boost on leave).
pub fn voice_session_key(user_id: u64) -> String {
    format!("VOICE_SESSION.{user_id}")
}

/// Coins earned: 1 per full minute, multiplied by boost.
pub fn coins_for_voice(minutes: u64, boost_mult: u64) -> i64 {
    (minutes * boost_mult.max(1)) as i64
}

pub async fn voice_join(pool: &crate::db::Pool, guild_id: &str, user_id: u64, now_ms: i64) {
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &voice_session_key(user_id),
        &now_ms.to_string(),
    )
    .await;
}

/// Close a session. Returns (minutes, coins) credited to wallet + voice_ms.
pub async fn voice_leave(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    now_ms: i64,
    boost_mult: u64,
) -> (u64, i64) {
    let start: Option<i64> = crate::db::kv_get(pool, guild_id, &voice_session_key(user_id))
        .await
        .and_then(|s| s.parse().ok());
    let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(guild_id)
        .bind(voice_session_key(user_id))
        .execute(pool)
        .await;
    let Some(start) = start else {
        return (0, 0);
    };
    let minutes = ((now_ms - start).max(0) / 60_000) as u64;
    let coins = coins_for_voice(minutes, boost_mult);
    let mut econ = crate::commands::economy::load_econ(pool, guild_id, user_id).await;
    econ.money += coins;
    let _ = crate::commands::economy::save_econ(pool, guild_id, user_id, &econ).await;
    let mut stats = crate::commands::stats::load_stats(pool, guild_id, user_id).await;
    stats.voice_ms += minutes * 60_000;
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &crate::commands::stats::stats_key(user_id),
        &serde_json::to_string(&stats).unwrap_or_default(),
    )
    .await;
    (minutes, coins)
}
/// Temp voice helpers. Mirrors voicedashboard/voiceState.ts:
/// joining the lobby spawns a personal channel (CUSTOM_VOICE), emptied
/// temp channels are deleted.
pub fn temp_voice_key(guild_id: u64, user_id: u64) -> String {
    format!("CUSTOM_VOICE.{guild_id}.{user_id}")
}

pub fn temp_channel_name(username: &str) -> String {
    format!(
        "{}'s channel",
        username.chars().take(20).collect::<String>()
    )
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

/// Record one message: +1 STATS message, +10 RANKS XP (level-ups applied).
/// Mirrors Events/stats/onNewMessage.ts + ranks/onNewMessage.ts.
/// Returns (new_level, leveled_up).
pub fn channel_stats_key(channel_id: u64) -> String {
    format!("STATS.CHANNEL.{channel_id}")
}

pub async fn record_message_activity(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    channel_id: u64,
) -> (u64, bool) {
    let chan_key = channel_stats_key(channel_id);
    let chan_count: u64 = crate::db::kv_get(pool, guild_id, &chan_key)
        .await
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let _ = crate::db::kv_set(pool, guild_id, &chan_key, &(chan_count + 1).to_string()).await;
    let mut stats = crate::commands::stats::load_stats(pool, guild_id, user_id).await;
    stats.messages += 1;
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &crate::commands::stats::stats_key(user_id),
        &serde_json::to_string(&stats).unwrap_or_default(),
    )
    .await;

    let entry = crate::commands::ranks::load_rank(pool, guild_id, user_id).await;
    let (next, leveled) = crate::commands::ranks::apply_xp(entry, 10);
    let level = next.level;
    let _ = crate::db::kv_set(
        pool,
        guild_id,
        &crate::commands::ranks::ranks_key(user_id),
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
            crate::commands::ranks::RankRole {
                role_id: "a".into(),
                level: 2,
            },
            crate::commands::ranks::RankRole {
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
            snapshot_roles(&[1, 2, 3], 1),
            vec!["2".to_string(), "3".to_string()]
        );
    }

    #[test]
    fn temp_voice_helpers() {
        assert_eq!(temp_voice_key(1, 2), "CUSTOM_VOICE.1.2");
        assert_eq!(temp_channel_name("bob"), "bob's channel");
        assert!(temp_channel_name(&"x".repeat(50)).len() < 40);
    }

    #[test]
    fn voice_coins_and_sessions() {
        assert_eq!(coins_for_voice(10, 1), 10);
        assert_eq!(coins_for_voice(10, 3), 30);
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
        voice_join(&pool, "g", 1, 0).await;
        let (minutes, coins) = voice_leave(&pool, "g", 1, 600_000, 2).await;
        assert_eq!((minutes, coins), (10, 20));
        let econ = crate::commands::economy::load_econ(&pool, "g", 1).await;
        assert_eq!(econ.money, 20);
        let stats = crate::commands::stats::load_stats(&pool, "g", 1).await;
        assert_eq!(stats.voice_ms, 600_000);
        // No session -> nothing.
        assert_eq!(voice_leave(&pool, "g", 1, 999_999, 1).await, (0, 0));
    }

    #[test]
    fn welcome_renders_placeholders() {
        let out = render_welcome("Hi {user} in {server} #{memberCount}!", "@a", "G", 42);
        assert_eq!(out, "Hi @a in G #42!");
        assert_eq!(render_welcome("plain", "@a", "G", 1), "plain");
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
        let (level, leveled) = record_message_activity(&pool, "g", 1, 7).await;
        assert_eq!((level, leveled), (0, false));
        let s = crate::commands::stats::load_stats(&pool, "g", 1).await;
        assert_eq!(s.messages, 1);
        let mut last = (0, false);
        for _ in 0..9 {
            last = record_message_activity(&pool, "g", 1, 7).await;
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
