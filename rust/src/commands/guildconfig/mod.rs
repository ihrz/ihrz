// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/guildconfig/* (autoreact,
// commandlimit, setlogschannel, support).
//
// TS keys: GUILD.AUTOREACT {channelId: [emoji]}, GUILD.GUILD_CONFIG.hey_reaction, UTILS.COMMAND_LIMITS
// {cmd: {count, windowMs}}, GUILD.SERVER_LOGS.<type>, GUILD.SUPPORT.

use crate::bot::Ctx;

use serde::{Deserialize, Serialize};

use std::collections::HashMap;

pub use super::shared::{
    has_perm_requirements, load_all_cmd_perms, load_cmd_perms, load_guild_config, perm_key,
    save_guild_config, welcomer_set,
};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CommandLimit {
    pub count: u32,
    pub window_ms: i64,
}

/// Parse "10s/1m/1h" windows. Kept for the unit test; the command
/// itself uses the fuller time_ms port (mirrors to_ms).
pub fn parse_window_ms(s: &str) -> Option<i64> {
    let s = s.trim().to_ascii_lowercase();
    let (num, mult) = s
        .strip_suffix('s')
        .map(|n| (n, 1_000))
        .or_else(|| s.strip_suffix('m').map(|n| (n, 60_000)))
        .or_else(|| s.strip_suffix('h').map(|n| (n, 3_600_000)))?;
    let n: i64 = num.trim().parse().ok()?;
    if n <= 0 {
        None
    } else {
        Some(n * mult)
    }
}

pub const LOG_TYPES: [&str; 11] = [
    "antispam",
    "boosts",
    "channel",
    "messages",
    "moderation",
    "roles",
    "ticket",
    "voice",
    "confession",
    "economy",
    "all",
];

pub fn valid_log_type(t: &str) -> bool {
    LOG_TYPES.contains(&t)
}

/// Autoreact lookup. Mirrors Events/guildconfig/autoreact.ts: all emojis
/// configured for the channel fire.
pub fn autoreact_for_channel(list: &[serde_json::Value], channel_id: &str) -> Vec<String> {
    list.iter()
        .filter(|e| e.get("channelId").and_then(|c| c.as_str()) == Some(channel_id))
        .filter_map(|e| {
            e.get("emoji")
                .and_then(|x| x.as_str())
                .map(|s| s.to_string())
        })
        .collect()
}

/// Minimum account age check. Mirrors !too-new-account.ts
/// (GUILD.BLOCK_NEW_ACCOUNT {state, req}).
pub fn too_young(created_unix: i64, req_ms: i64, now_unix: i64) -> bool {
    req_ms > 0 && (now_unix - created_unix) * 1000 < req_ms
}

/// Custom automod detectors. Mirrors SlashCommands/guildconfig/automod/*
/// toggles (link, spam, mass-mention, discord-invite, telegram), enforced
/// in the message handler. Native Discord AutoMod rule sync pending.
pub fn automod_key(kind: &str) -> String {
    format!("GUILD.AUTOMOD.{kind}")
}

pub const AUTOMOD_KINDS: [&str; 5] = ["link", "spam", "mass-mention", "discord-invite", "telegram"];

/// discord.gg / discord.com/invite links (case-insensitive).
pub fn contains_discord_invite(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("discord.gg/")
        || lower.contains("discord.com/invite/")
        || lower.contains("discordapp.com/invite/")
}

/// t.me / telegram.me links.
pub fn contains_telegram_link(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("t.me/") || lower.contains("telegram.me/")
}

/// Bare http(s) links.
pub fn contains_link(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("http://") || lower.contains("https://")
}

/// Count user/role mentions in raw content.
pub fn mention_count(text: &str) -> usize {
    text.matches("<@").count() + text.matches("<@&").count()
}

pub async fn load_ghost(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    crate::db::kv_get(pool, guild_id, ghost_key())
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Ghost-ping watch channels. Mirrors join-ghostping
/// (GUILD.GUILD_CONFIG.GHOST_PING.channels[]).
pub fn ghost_key() -> &'static str {
    "GUILD.GUILD_CONFIG.GHOST_PING.channels"
}

/// Format a limit. Mirrors formatRateLimit (count + localized window).
pub fn format_limit(limit: &CommandLimit, code: &str) -> String {
    crate::lang::get(code, "commandlimit_current_value")
        .unwrap_or_default()
        .replace("${count}", &limit.count.to_string())
        .replace(
            "${time}",
            &crate::funcs::beautiful_ms(limit.window_ms as f64),
        )
}

/// Toggle an id in a grant list. Returns true when added.
/// Mirrors the role/user toggle in !command.ts change action.
pub fn toggle_grant(list: &mut Vec<String>, id: &str) -> bool {
    if let Some(pos) = list.iter().position(|x| x == id) {
        list.remove(pos);
        false
    } else {
        list.push(id.to_string());
        true
    }
}

/// Level label. Mirrors formatPermissionLevel (null -> var_none).
pub fn perm_level_label(level: Option<u8>, none_label: &str) -> String {
    match level {
        Some(n) => n.to_string(),
        None => none_label.to_string(),
    }
}

/// Grouped permission overview embed fields.
/// Mirrors the list action grouping in !command.ts: `**perm N**` level
/// fields, then role blocks, then user blocks. Pure for testability;
/// role/user existence filtering is done by callers with live data.
pub fn perm_list_fields(
    entries: &[(String, crate::executor::CmdPerms)],
    perm_word: &str,
    live_roles: Option<&std::collections::HashSet<String>>,
) -> Vec<(String, String, bool)> {
    use std::collections::BTreeMap;
    let mut by_level: BTreeMap<u8, Vec<String>> = BTreeMap::new();
    let mut by_role: BTreeMap<String, Vec<String>> = BTreeMap::new();
    let mut by_user: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for (cmd, p) in entries {
        let level = p.level.unwrap_or(0);
        if level > 0 {
            by_level.entry(level).or_default().push(format!("`{cmd}`"));
        }
        for r in &p.roles {
            if live_roles.map(|live| live.contains(r)).unwrap_or(true) {
                by_role.entry(r.clone()).or_default().push(cmd.clone());
            }
        }
        for u in &p.users {
            by_user.entry(u.clone()).or_default().push(cmd.clone());
        }
    }
    let mut fields = vec![];
    for (level, cmds) in by_level {
        fields.push((format!("**{perm_word} {level}**"), cmds.join(", "), false));
    }
    for (role, cmds) in by_role {
        let numbered: Vec<String> = cmds
            .iter()
            .enumerate()
            .map(|(i, c)| format!("{} {c}", i + 1))
            .collect();
        fields.push((
            "** **".to_string(),
            format!("<@&{role}>\n```\n{}\n```", numbered.join("\n")),
            true,
        ));
    }
    for (user, cmds) in by_user {
        let numbered: Vec<String> = cmds
            .iter()
            .enumerate()
            .map(|(i, c)| format!("{} {c}", i + 1))
            .collect();
        fields.push((
            "** **".to_string(),
            format!("<@{user}>\n```\n{}\n```", numbered.join("\n")),
            true,
        ));
    }
    fields
}

/// Load the level -> role id map (`UTILS.roles`). Mirrors
/// UtilsRoleData in !create-roles.ts / !edit-roles.ts.
pub async fn load_perm_roles(
    pool: &crate::db::Pool,
    gid: &str,
) -> std::collections::HashMap<String, String> {
    crate::db::kv_get(pool, gid, "UTILS.roles")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Owner-only gate. Mirrors the `member.id === guild.ownerId` checks in
/// the perm role subcommands.
pub async fn is_guild_owner(ctx: Ctx<'_>) -> bool {
    let Some(gid) = ctx.guild_id() else {
        return false;
    };
    let owner = gid
        .to_partial_guild(ctx.http())
        .await
        .map(|g| g.owner_id)
        .unwrap_or_else(|_| ctx.author().id);
    owner == ctx.author().id
}

/// Display name for a perm level. Mirrors permissionLevel in perm.ts
/// (English defaults; TS localizes the same names inline).
pub fn perm_level_name(level: i64) -> String {
    if level == 0 {
        "Default".to_string()
    } else {
        format!("Perm {level}")
    }
}

/// Dump all kv rows of a guild as a JSON map (for encrypted backup).
pub async fn dump_guild_rows(
    pool: &crate::db::Pool,
    gid: &str,
) -> serde_json::Map<String, serde_json::Value> {
    let rows = crate::db::kv_scan(pool, gid).await;
    let mut map = serde_json::Map::new();
    for (k, v) in rows {
        let value: serde_json::Value =
            serde_json::from_str(&v).unwrap_or(serde_json::Value::String(v));
        map.insert(k, value);
    }
    map
}

/// Replace all kv rows of a guild from a JSON map (encrypted restore).
pub async fn restore_guild_rows(
    pool: &crate::db::Pool,
    gid: &str,
    map: &serde_json::Map<String, serde_json::Value>,
) -> anyhow::Result<()> {
    crate::db::kv_del_guild(pool, gid).await?;
    for (k, v) in map {
        let s = match v {
            serde_json::Value::String(s) => s.clone(),
            _ => v.to_string(),
        };
        crate::db::kv_set(pool, gid, k, &s).await?;
    }
    Ok(())
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// Parse a join|leave selector. Mirrors the panel isJoin branches.
pub fn welcomer_kind(s: &str) -> Option<bool> {
    match s.trim().to_ascii_lowercase().as_str() {
        "join" => Some(true),
        "leave" => Some(false),
        _ => None,
    }
}

/// All registered command paths ("cmd", "cmd sub", "cmd group sub").
/// Mirrors getCommandChoices/resolveCommand over client.commands +
/// client.subCommands.
pub fn registered_paths() -> Vec<String> {
    fn walk(
        cmd: &poise::Command<crate::bot::Data, anyhow::Error>,
        prefix: &str,
        out: &mut Vec<String>,
    ) {
        let path = if prefix.is_empty() {
            cmd.name.clone()
        } else {
            format!("{prefix} {}", cmd.name)
        };
        out.push(path.clone());
        for sub in &cmd.subcommands {
            walk(sub, &path, out);
        }
    }
    let mut out = vec![];
    for cmd in crate::commands::all() {
        walk(&cmd, "", &mut out);
    }
    out
}

pub mod autologs;
pub mod automod;
pub mod autoreact;
pub mod blockbot;
pub mod commandlimit;
pub mod ghost;
#[allow(clippy::module_inception)]
pub mod guildconfig;
pub mod joindm;
pub mod joinrole;
pub mod perm;
pub mod prefix;
pub mod restore;
pub mod save;
pub mod setlogschannel;
pub mod setup;
pub mod show;
pub mod support;
pub mod tonew;
pub mod welcomer;

/// Old registry path (`guildconfig::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::autologs::*;
    pub use super::automod::*;
    pub use super::autoreact::*;
    pub use super::blockbot::*;
    pub use super::commandlimit::*;
    pub use super::ghost::*;
    pub use super::guildconfig::*;
    pub use super::joindm::*;
    pub use super::joinrole::*;
    pub use super::perm::*;
    pub use super::prefix::*;
    pub use super::restore::*;
    pub use super::save::*;
    pub use super::setlogschannel::*;
    pub use super::setup::*;
    pub use super::show::*;
    pub use super::support::*;
    pub use super::tonew::*;
    pub use super::welcomer::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn window_parses_units() {
        assert_eq!(parse_window_ms("10s"), Some(10_000));
        assert_eq!(parse_window_ms("1m"), Some(60_000));
        assert_eq!(parse_window_ms("2h"), Some(7_200_000));
        assert_eq!(parse_window_ms("0s"), None);
        assert_eq!(parse_window_ms("bogus"), None);
    }

    #[test]
    fn log_types_cover_11() {
        assert_eq!(LOG_TYPES.len(), 11);
        assert!(valid_log_type("all"));
        assert!(!valid_log_type("bogus"));
    }

    #[test]
    fn automod_detectors() {
        assert!(contains_discord_invite("join discord.gg/abc"));
        assert!(contains_discord_invite("https://discord.com/invite/x"));
        assert!(!contains_discord_invite("hello world"));
        assert!(contains_telegram_link("see t.me/foo"));
        assert!(!contains_telegram_link("nothing"));
        assert!(contains_link("https://x.y"));
        assert!(!contains_link("plain"));
        assert_eq!(mention_count("<@1> hi <@&2>"), 3);
        assert_eq!(automod_key("spam"), "GUILD.AUTOMOD.spam");
    }

    #[test]
    fn age_gate() {
        assert!(too_young(1000, 86_400_000, 1000 + 3600));
        assert!(!too_young(0, 86_400_000, 100_000));
        assert!(!too_young(1000, 0, 1001));
    }

    #[test]
    fn perm_user_gate_and_key() {
        use super::perm::{perm_user_blocked, user_perm_key};
        assert_eq!(user_perm_key(7), "UTILS.USER_PERMS.7");
        // TS: fetchedPerm <= perm && not owner -> warn.
        assert!(perm_user_blocked(2, 3, false));
        assert!(perm_user_blocked(3, 3, false));
        assert!(!perm_user_blocked(4, 3, false));
        assert!(!perm_user_blocked(0, 9, true));
        assert!(!perm_user_blocked(2, 3, true));
    }

    #[test]
    fn perm_level_names() {
        assert_eq!(perm_level_name(0), "Default");
        assert_eq!(perm_level_name(1), "Perm 1");
        assert_eq!(perm_level_name(9), "Perm 9");
    }

    #[test]
    fn grant_toggle_and_requirements() {
        let mut list = vec!["1".to_string()];
        assert!(toggle_grant(&mut list, "2"));
        assert_eq!(list, vec!["1".to_string(), "2".to_string()]);
        assert!(!toggle_grant(&mut list, "1"));
        assert_eq!(list, vec!["2".to_string()]);
        assert_eq!(perm_level_label(None, "None"), "None");
        assert_eq!(perm_level_label(Some(3), "None"), "3");
        let open = crate::executor::CmdPerms::default();
        assert!(!has_perm_requirements(&open));
        let leveled = crate::executor::CmdPerms {
            level: Some(2),
            ..Default::default()
        };
        assert!(has_perm_requirements(&leveled));
    }

    #[test]
    fn perm_list_fields_groups() {
        let entries = vec![
            (
                "ban".to_string(),
                crate::executor::CmdPerms {
                    users: vec![],
                    roles: vec!["10".to_string()],
                    level: Some(3),
                },
            ),
            (
                "kick".to_string(),
                crate::executor::CmdPerms {
                    users: vec!["20".to_string()],
                    roles: vec![],
                    level: Some(3),
                },
            ),
        ];
        let fields = perm_list_fields(&entries, "Permission", None);
        assert_eq!(fields.len(), 3);
        assert_eq!(fields[0].0, "**Permission 3**");
        assert!(fields[0].1.contains("`ban`"));
        assert!(fields[1].1.starts_with("<@&10>"));
        assert!(fields[2].1.starts_with("<@20>"));
        let live: std::collections::HashSet<String> = ["99".to_string()].into_iter().collect();
        let filtered = perm_list_fields(&entries, "Permission", Some(&live));
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn welcomer_panel_fields_summarize() {
        let cfg = serde_json::json!({
            "join": "11",
            "leave": "",
            "joinmessage": "hi",
            "joinroles": ["5"],
            "joinTextEnabled": false,
        });
        let fields = super::welcomer::welcomer_panel_fields(&cfg);
        assert_eq!(fields.len(), 7);
        let join = fields.iter().find(|(n, _, _)| n == "Join channel").unwrap();
        assert_eq!(join.1, "<#11>");
        let leave = fields
            .iter()
            .find(|(n, _, _)| n == "Leave channel")
            .unwrap();
        assert_eq!(leave.1, "Not set");
        let roles = fields.iter().find(|(n, _, _)| n == "Join roles").unwrap();
        assert_eq!(roles.1, "<@&5>");
        let toggles = fields
            .iter()
            .find(|(n, _, _)| n == "Join text / components")
            .unwrap();
        assert_eq!(toggles.1, "off / on");
    }

    #[test]
    fn welcomer_kind_and_set() {
        assert_eq!(welcomer_kind("join"), Some(true));
        assert_eq!(welcomer_kind("LEAVE"), Some(false));
        assert_eq!(welcomer_kind("x"), None);
        let mut cfg = serde_json::json!({"join": "1"});
        welcomer_set(&mut cfg, "join", None);
        assert!(cfg.get("join").is_none());
        welcomer_set(&mut cfg, "leave", Some(serde_json::json!("2")));
        assert_eq!(cfg["leave"], "2");
    }

    #[test]
    fn autoreact_filters_by_channel() {
        let list = vec![
            serde_json::json!({"channelId": "1", "emoji": "a"}),
            serde_json::json!({"channelId": "2", "emoji": "b"}),
            serde_json::json!({"channelId": "1", "emoji": "c"}),
        ];
        assert_eq!(
            autoreact_for_channel(&list, "1"),
            vec!["a".to_string(), "c".to_string()]
        );
        assert!(autoreact_for_channel(&list, "9").is_empty());
    }
}
