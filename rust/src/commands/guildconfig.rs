// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/guildconfig/* (autoreact,
// commandlimit, setlogschannel, support).
//
// TS keys: GUILD.AUTOREACT [{channelId, emoji}], UTILS.COMMAND_LIMITS
// {cmd: {count, windowMs}}, GUILD.SERVER_LOGS.<type>, GUILD.SUPPORT.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CommandLimit {
    pub count: u32,
    pub window_ms: i64,
}

/// Parse "10s/1m/1h" windows. Mirrors commandlimit.ts time parsing.
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
    "boost",
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

#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "guildconfig",
    subcommands(
        "gc_commandlimit",
        "gc_setlogs",
        "gc_support",
        "gc_autoreact",
        "gc_autoreact_list",
        "gc_autoreact_remove",
        "gc_autoreact_toggle",
        "gc_prefix",
        "gc_ghost_add",
        "gc_ghost_remove",
        "gc_ghost_list",
        "gc_perm_set",
        "gc_perm_user",
        "gc_perm_list",
        "gc_perm_reset",
        "gc_perm_change",
        "gc_perm_delete",
        "gc_perm_list_all",
        "gc_perm_delete_all",
        "gc_wc_channel",
        "gc_wc_embed",
        "gc_wc_text",
        "gc_wc_components",
        "gc_config_save",
        "gc_config_restore",
        "gc_perm_roles_create",
        "gc_perm_roles_edit",
        "gc_show",
        "gc_autologs",
        "gc_setup",
        "gc_automod",
        "gc_blockbot",
        "gc_toonew",
        "gc_joindm",
        "gc_joinrole"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn guildconfig(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "commandlimit")]
pub async fn gc_commandlimit(
    ctx: Ctx<'_>,
    #[description = "set, reset or list"] action: String,
    #[description = "Command name"] command: Option<String>,
    #[description = "Max uses"] count: Option<i64>,
    #[description = "Window (e.g. 10s, 1m, 1h)"] window: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.COMMAND_LIMITS").await;
    let mut map: HashMap<String, CommandLimit> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    match action.to_ascii_lowercase().as_str() {
        "list" => {
            let list = map
                .iter()
                .map(|(k, v)| format!("{k}: {}/{}ms", v.count, v.window_ms))
                .collect::<Vec<_>>()
                .join("\n");
            ctx.say(if list.is_empty() {
                "No limits.".to_string()
            } else {
                list
            })
            .await?;
        }
        "reset" => {
            if let Some(cmd) = command {
                map.remove(&cmd);
                crate::db::kv_set(
                    &ctx.data().pool,
                    &gid,
                    "UTILS.COMMAND_LIMITS",
                    &serde_json::to_string(&map)?,
                )
                .await?;
                ctx.say("Limit reset.").await?;
            }
        }
        _ => {
            let (Some(cmd), Some(count), Some(window)) = (command, count, window) else {
                ctx.say("Usage: command, count, window.").await?;
                return Ok(());
            };
            let Some(window_ms) = parse_window_ms(&window) else {
                ctx.say("Bad window (10s/1m/1h).").await?;
                return Ok(());
            };
            map.insert(
                cmd.clone(),
                CommandLimit {
                    count: count.max(1) as u32,
                    window_ms,
                },
            );
            crate::db::kv_set(
                &ctx.data().pool,
                &gid,
                "UTILS.COMMAND_LIMITS",
                &serde_json::to_string(&map)?,
            )
            .await?;
            ctx.say(format!("Limit set for {cmd}.")).await?;
        }
    }
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "setlogs")]
pub async fn gc_setlogs(
    ctx: Ctx<'_>,
    #[description = "Log type"] log_type: String,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    if !valid_log_type(&log_type) {
        ctx.say("Bad log type.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("GUILD.SERVER_LOGS.{log_type}");
    match channel {
        Some(ch) => {
            crate::db::kv_set(&ctx.data().pool, &gid, &key, &ch.id.get().to_string()).await?;
            ctx.say(format!("Logs {log_type} set.")).await?;
        }
        None => {
            sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(&ctx.data().pool)
                .await?;
            ctx.say(format!("Logs {log_type} cleared.")).await?;
        }
    }
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "setprefix")]
pub async fn gc_prefix(
    ctx: Ctx<'_>,
    #[description = "New prefix (1-5 chars)"] prefix: String,
) -> Result<(), anyhow::Error> {
    let prefix = prefix.trim().to_string();
    if prefix.is_empty() || prefix.len() > 5 {
        ctx.say("Prefix must be 1-5 characters.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(&ctx.data().pool, &gid, "GUILD.PREFIX", &prefix).await?;
    ctx.say(format!("Prefix set to `{prefix}`.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "support")]
pub async fn gc_support(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.SUPPORT",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Support on."
    } else {
        "Support off."
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "autoreact")]
pub async fn gc_autoreact(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Emoji"] emoji: String,
) -> Result<(), anyhow::Error> {
    if !crate::funcs::is_single_emoji(&emoji) && !crate::funcs::is_discord_emoji(&emoji) {
        ctx.say("Invalid emoji.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.AUTOREACT").await;
    let mut list: Vec<serde_json::Value> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    list.push(serde_json::json!({"channelId": channel.id.get().to_string(), "emoji": emoji}));
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say("Autoreact added.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "autoreact-list")]
pub async fn gc_autoreact_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.AUTOREACT").await;
    let list: Vec<serde_json::Value> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    ctx.say(if list.is_empty() {
        "No autoreacts.".to_string()
    } else {
        list.iter()
            .map(|e| {
                format!(
                    "<#{}> {}",
                    e.get("channelId").and_then(|c| c.as_str()).unwrap_or("?"),
                    e.get("emoji").and_then(|x| x.as_str()).unwrap_or("?")
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "autoreact-remove")]
pub async fn gc_autoreact_remove(
    ctx: Ctx<'_>,
    #[description = "Index (from autoreact-list, 1-based)"] index: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.AUTOREACT").await;
    let mut list: Vec<serde_json::Value> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let i = index as usize;
    if i == 0 || i > list.len() {
        ctx.say("Bad index.").await?;
        return Ok(());
    }
    list.remove(i - 1);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.AUTOREACT",
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say("Autoreact removed.").await?;
    Ok(())
}

/// Block bot joins. Mirrors blockBot config (GUILD.BLOCK_BOT).
#[poise::command(slash_command, prefix_command, rename = "blockbot")]
pub async fn gc_blockbot(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.BLOCK_BOT",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Bot joins blocked."
    } else {
        "Bot joins allowed."
    })
    .await?;
    Ok(())
}

/// Minimum account age check. Mirrors !too-new-account.ts
/// (GUILD.BLOCK_NEW_ACCOUNT {state, req}).
pub fn too_young(created_unix: i64, req_ms: i64, now_unix: i64) -> bool {
    req_ms > 0 && (now_unix - created_unix) * 1000 < req_ms
}

#[poise::command(slash_command, prefix_command, rename = "toonew")]
pub async fn gc_toonew(
    ctx: Ctx<'_>,
    #[description = "Minimum age (e.g. 7d) or off"] age: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if age.trim().eq_ignore_ascii_case("off") {
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind("GUILD.BLOCK_NEW_ACCOUNT")
            .execute(&ctx.data().pool)
            .await;
        ctx.say("Age check off.").await?;
        return Ok(());
    }
    let Some(ms) = crate::commands::schedule::parse_duration_ms(&age) else {
        ctx.say("Bad duration.").await?;
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.BLOCK_NEW_ACCOUNT",
        &serde_json::json!({"state": true, "req": ms}).to_string(),
    )
    .await?;
    ctx.say("Age check on.").await?;
    Ok(())
}

/// Join DM text. Mirrors joinDm (GUILD.JOIN_DM).
#[poise::command(slash_command, prefix_command, rename = "joindm")]
pub async fn gc_joindm(
    ctx: Ctx<'_>,
    #[description = "Message (empty to clear)"] message: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match message
        .map(|m| m.trim().to_string())
        .filter(|m| !m.is_empty())
    {
        Some(m) => {
            crate::db::kv_set(&ctx.data().pool, &gid, "GUILD.JOIN_DM", &m).await?;
            ctx.say("Join DM set.").await?;
        }
        None => {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind("GUILD.JOIN_DM")
                .execute(&ctx.data().pool)
                .await;
            ctx.say("Join DM cleared.").await?;
        }
    }
    Ok(())
}

/// Join role. Mirrors joinRole (GUILD.JOIN_ROLE).
#[poise::command(slash_command, prefix_command, rename = "joinrole")]
pub async fn gc_joinrole(
    ctx: Ctx<'_>,
    #[description = "Role (omit to clear)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match role {
        Some(r) => {
            crate::db::kv_set(
                &ctx.data().pool,
                &gid,
                "GUILD.JOIN_ROLE",
                &r.id.get().to_string(),
            )
            .await?;
            ctx.say("Join role set.").await?;
        }
        None => {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind("GUILD.JOIN_ROLE")
                .execute(&ctx.data().pool)
                .await;
            ctx.say("Join role cleared.").await?;
        }
    }
    Ok(())
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

#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "automod",
    subcommands(
        "gc_automod_link",
        "gc_automod_spam",
        "gc_automod_mass",
        "gc_automod_discord",
        "gc_automod_telegram"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_automod(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

macro_rules! automod_toggle {
    ($fn_name:ident, $sub:literal, $kind:literal) => {
        #[poise::command(slash_command, prefix_command, rename = $sub)]
        pub async fn $fn_name(
            ctx: Ctx<'_>,
            #[description = "on or off"] action: String,
        ) -> Result<(), anyhow::Error> {
            let gid = ctx
                .guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
            crate::db::kv_set(
                &ctx.data().pool,
                &gid,
                &automod_key($kind),
                if enabled { "1" } else { "0" },
            )
            .await?;
            ctx.say(format!(
                "Automod {} {}.",
                $kind,
                if enabled { "on" } else { "off" }
            ))
            .await?;
            Ok(())
        }
    };
}

automod_toggle!(gc_automod_link, "link", "link");
automod_toggle!(gc_automod_spam, "spam", "spam");
automod_toggle!(gc_automod_mass, "mass-mention", "mass-mention");
automod_toggle!(gc_automod_discord, "discord-invite", "discord-invite");
automod_toggle!(gc_automod_telegram, "telegram-link", "telegram");

/// Ghost-ping watch channels. Mirrors join-ghostping
/// (GUILD.GUILD_CONFIG.GHOST_PING.channels[]).
pub fn ghost_key() -> &'static str {
    "GUILD.GUILD_CONFIG.GHOST_PING.channels"
}

pub async fn load_ghost(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    crate::db::kv_get(pool, guild_id, ghost_key())
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(slash_command, prefix_command, rename = "ghost-add")]
pub async fn gc_ghost_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut list = load_ghost(&ctx.data().pool, &gid).await;
    let id = channel.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            ghost_key(),
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    ctx.say("Ghost-ping watch added.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "ghost-remove")]
pub async fn gc_ghost_remove(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut list = load_ghost(&ctx.data().pool, &gid).await;
    let id = channel.id.get().to_string();
    list.retain(|c| c != &id);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        ghost_key(),
        &serde_json::to_string(&list)?,
    )
    .await?;
    ctx.say("Ghost-ping watch removed.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "ghost-list")]
pub async fn gc_ghost_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let list = load_ghost(&ctx.data().pool, &gid).await;
    ctx.say(if list.is_empty() {
        "No ghost-ping watches.".to_string()
    } else {
        list.join(", ")
    })
    .await?;
    Ok(())
}

/// Dump guild config keys. Mirrors guildconfig !show.ts.
#[poise::command(slash_command, prefix_command, rename = "show")]
pub async fn gc_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND (key_name LIKE 'GUILD.%' OR key_name LIKE 'UTILS.%' OR key_name LIKE 'COUNTER.%')",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No config stored.".to_string()
    } else {
        rows.iter()
            .take(25)
            .map(|(k, v)| format!("{k} = {}", v.chars().take(80).collect::<String>()))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

/// Point every server log at one channel. Mirrors autologs preset.
#[poise::command(slash_command, prefix_command, rename = "autologs")]
pub async fn gc_autologs(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    for t in LOG_TYPES.iter().filter(|t| **t != "all") {
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            &format!("GUILD.SERVER_LOGS.{t}"),
            &channel.id.get().to_string(),
        )
        .await?;
    }
    ctx.say("All server logs pointed here.").await?;
    Ok(())
}

/// Custom per-command permissions. Mirrors perm/!command.ts
/// (UTILS.PERMS.<command> {users, roles, level}).
pub fn perm_key(command: &str) -> String {
    format!("UTILS.PERMS.{command}")
}

pub async fn load_cmd_perms(
    pool: &crate::db::Pool,
    guild_id: &str,
    command: &str,
) -> Option<crate::executor::CmdPerms> {
    let raw = crate::db::kv_get(pool, guild_id, &perm_key(command)).await?;
    if let Ok(p) = serde_json::from_str(&raw) {
        return Some(p);
    }
    // Legacy bare-number format (PermLevel). Mirrors the
    // `typeof existingPerms === "number"` branch in !command.ts.
    raw.trim()
        .parse::<u8>()
        .ok()
        .map(|n| crate::executor::CmdPerms {
            level: Some(n),
            ..Default::default()
        })
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

/// True when the entry restricts anything. Mirrors
/// has(Permission|CommandPermission)Requirements.
pub fn has_perm_requirements(perms: &crate::executor::CmdPerms) -> bool {
    !perms.users.is_empty() || !perms.roles.is_empty() || perms.level.unwrap_or(0) > 0
}

#[poise::command(slash_command, prefix_command, rename = "perm-set")]
pub async fn gc_perm_set(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
    #[description = "Required level 0-9"] level: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut perms = load_cmd_perms(&ctx.data().pool, &gid, command.trim())
        .await
        .unwrap_or_default();
    perms.level = Some(level.clamp(0, 9) as u8);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &perm_key(command.trim()),
        &serde_json::to_string(&perms)?,
    )
    .await?;
    ctx.say("Permission level set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "perm-user")]
pub async fn gc_perm_user(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
    #[description = "Member"] user: serenity::User,
    #[description = "Level 0-9"] level: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("UTILS.USER_PERMS.{}", user.id.get()),
        &level.clamp(0, 9).to_string(),
    )
    .await?;
    ctx.say(format!("User level set for {command}.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "perm-list")]
pub async fn gc_perm_list(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let perms = load_cmd_perms(&ctx.data().pool, &gid, command.trim()).await;
    ctx.say(match perms {
        Some(p) => format!(
            "level {:?}, users [{}], roles [{}]",
            p.level,
            p.users.join(","),
            p.roles.join(",")
        ),
        None => "Default permissions.".to_string(),
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "perm-reset")]
pub async fn gc_perm_reset(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(perm_key(command.trim()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Permissions reset.").await?;
    Ok(())
}

/// Change per-command grants and level.
// Mirrors the change action in !command.ts: level set (0 clears),
// role/user toggle, change summary, row deleted when emptied.
#[poise::command(slash_command, prefix_command, rename = "perm-change")]
pub async fn gc_perm_change(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
    #[description = "Level 0-9 (0 clears)"] permission: Option<i64>,
    #[description = "Role to toggle"] custom_role: Option<serenity::Role>,
    #[description = "User to toggle"] custom_user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let command = command.trim().to_string();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let mut perms = load_cmd_perms(pool, &gid, &command)
        .await
        .unwrap_or_default();
    let mut changes: Vec<String> = vec![];
    if let Some(p) = permission {
        let normalized = match p.clamp(0, 9) as u8 {
            0 => None,
            n => Some(n),
        };
        if normalized != perms.level {
            let none = t("var_none");
            changes.push(format!(
                "{}: {} ➡️ {}",
                t("perm_set_chng_perm_lvl"),
                perm_level_label(perms.level, &none),
                perm_level_label(normalized, &none)
            ));
            perms.level = normalized;
        }
    }
    if let Some(role) = &custom_role {
        let id = role.id.get().to_string();
        let mention = format!("<@&{id}>");
        if toggle_grant(&mut perms.roles, &id) {
            changes.push(format!("{}: {mention}", t("perm_set_add_role")));
        } else {
            changes.push(format!("{}: {mention}", t("perm_rmv_role")));
        }
    }
    if let Some(user) = &custom_user {
        let id = user.id.get().to_string();
        let mention = format!("<@{id}>");
        if toggle_grant(&mut perms.users, &id) {
            changes.push(format!("{}: {mention}", t("perm_set_add_usr")));
        } else {
            changes.push(format!("{}: {mention}", t("perm_rmv_usr")));
        }
    }
    let parts = command.split_whitespace().count();
    let kind = match parts {
        1 => t("var_command"),
        2 => t("var_subcommand"),
        _ => t("var_subcommand_group"),
    };
    if !has_perm_requirements(&perms) {
        sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind(perm_key(&command))
            .execute(pool)
            .await?;
        ctx.say(format!(
            "{kind}: {command}\n {}",
            t("perm_set_command_reset")
        ))
        .await?;
    } else {
        let summary = if changes.is_empty() {
            t("perm_set_no_modified")
        } else {
            changes.join("\n")
        };
        crate::db::kv_set(
            pool,
            &gid,
            &perm_key(&command),
            &serde_json::to_string(&perms).unwrap_or_default(),
        )
        .await?;
        ctx.say(format!("{kind}: {command}\n\n{summary}")).await?;
    }
    Ok(())
}

/// Delete stored permissions for one command.
// Mirrors the delete action in !command.ts.
#[poise::command(slash_command, prefix_command, rename = "perm-delete")]
pub async fn gc_perm_delete(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: Option<String>,
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let Some(cmd) = command
        .map(|c| c.trim().to_string())
        .filter(|c| !c.is_empty())
    else {
        ctx.say(t("perm_command_delete_specify_command")).await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if load_cmd_perms(pool, &gid, &cmd).await.is_none() {
        ctx.say(t("perm_command_delete_dont_exist")).await?;
        return Ok(());
    }
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(perm_key(&cmd))
        .execute(pool)
        .await?;
    ctx.say(t("perm_command_delete_command_deleted").replace("${commands}", &cmd))
        .await?;
    Ok(())
}

/// Load every per-command permission row: (command, perms).
/// Mirrors reading the whole `UTILS.PERMS` subtree in !command.ts.
pub async fn load_all_cmd_perms(
    pool: &crate::db::Pool,
    gid: &str,
) -> Vec<(String, crate::executor::CmdPerms)> {
    let keys: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'UTILS.PERMS.%'",
    )
    .bind(gid)
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    let mut out = vec![];
    for key in keys {
        let Some(cmd) = key.strip_prefix("UTILS.PERMS.") else {
            continue;
        };
        if cmd.is_empty() || cmd.contains('.') {
            continue;
        }
        if let Some(p) = load_cmd_perms(pool, gid, cmd).await {
            out.push((cmd.to_string(), p));
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
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

/// List every command permission, grouped and paged.
// Mirrors the list action in !command.ts (15 fields per page;
// page param replaces the prev/next collector).
#[poise::command(slash_command, prefix_command, rename = "perm-list-all")]
pub async fn gc_perm_list_all(
    ctx: Ctx<'_>,
    #[description = "Page number"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let entries = load_all_cmd_perms(pool, &gid).await;
    if entries.is_empty() {
        ctx.say(t("perm_list_no_command_set")).await?;
        return Ok(());
    }
    let live: std::collections::HashSet<String> = ctx
        .guild_id()
        .map(|g| {
            ctx.cache()
                .guild(g)
                .map(|gd| gd.roles.keys().map(|r| r.get().to_string()).collect())
                .unwrap_or_default()
        })
        .unwrap_or_default();
    let fields = perm_list_fields(&entries, &t("var_permission"), Some(&live));
    let pages = fields.len().div_ceil(15).max(1);
    let page = (page.unwrap_or(1).max(1) as usize).min(pages);
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x010101)
        .title(format!("{} ({page}/{pages})", t("var_permission")))
        .timestamp(serenity::Timestamp::now());
    for (name, value, inline) in fields.iter().skip((page - 1) * 15).take(15) {
        embed = embed.field(name, value, *inline);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Bulk-remove one permission/role/user across commands.
// Mirrors the delete-all action in !command.ts.
#[poise::command(slash_command, prefix_command, rename = "perm-delete-all")]
pub async fn gc_perm_delete_all(
    ctx: Ctx<'_>,
    #[description = "Level 0-9"] permission: Option<i64>,
    #[description = "Role to strip"] custom_role: Option<serenity::Role>,
    #[description = "User to strip"] custom_user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let set_count = [
        permission.is_some(),
        custom_role.is_some(),
        custom_user.is_some(),
    ]
    .into_iter()
    .filter(|b| *b)
    .count();
    if set_count == 0 {
        ctx.say(t("perm_command_delete_all_one")).await?;
        return Ok(());
    }
    if set_count > 1 {
        ctx.say(t("perm_command_delete_all_one_option")).await?;
        return Ok(());
    }
    let entries = load_all_cmd_perms(pool, &gid).await;
    if entries.is_empty() {
        ctx.say(t("perm_list_no_command_set")).await?;
        return Ok(());
    }
    let mut changes: Vec<String> = vec![];
    if let Some(p) = permission {
        let level = p.clamp(0, 9) as u8;
        for (cmd, perms) in &entries {
            if perms.level.unwrap_or(0) == level && level > 0 {
                sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                    .bind(&gid)
                    .bind(perm_key(cmd))
                    .execute(pool)
                    .await?;
                changes.push(format!("- {cmd} ({}: {level})\n", t("var_level")));
            }
        }
    } else if let Some(role) = &custom_role {
        let id = role.id.get().to_string();
        for (cmd, perms) in &entries {
            if perms.roles.iter().any(|r| r == &id) {
                let mut next = perms.clone();
                next.roles.retain(|r| r != &id);
                if !has_perm_requirements(&next) {
                    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                        .bind(&gid)
                        .bind(perm_key(cmd))
                        .execute(pool)
                        .await?;
                } else {
                    crate::db::kv_set(
                        pool,
                        &gid,
                        &perm_key(cmd),
                        &serde_json::to_string(&next).unwrap_or_default(),
                    )
                    .await?;
                }
                changes.push(format!("- {cmd} ({}: @{})\n", t("var_roles"), role.name));
            }
        }
    } else if let Some(user) = &custom_user {
        let id = user.id.get().to_string();
        for (cmd, perms) in &entries {
            if perms.users.iter().any(|u| u == &id) {
                let mut next = perms.clone();
                next.users.retain(|u| u != &id);
                if !has_perm_requirements(&next) {
                    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                        .bind(&gid)
                        .bind(perm_key(cmd))
                        .execute(pool)
                        .await?;
                } else {
                    crate::db::kv_set(
                        pool,
                        &gid,
                        &perm_key(cmd),
                        &serde_json::to_string(&next).unwrap_or_default(),
                    )
                    .await?;
                }
                changes.push(format!("- {cmd} ({}: {id})\n", t("var_user")));
            }
        }
    }
    if changes.is_empty() {
        ctx.say(t("perm_command_delete_all_zero_change")).await?;
        return Ok(());
    }
    let (kind, value) = if let Some(p) = permission {
        (t("var_permission"), p.clamp(0, 9).to_string())
    } else if let Some(role) = &custom_role {
        (t("var_roles"), format!("<@&{}>", role.id.get()))
    } else if let Some(user) = &custom_user {
        (t("var_user"), format!("<@{}>", user.id.get()))
    } else {
        (String::new(), String::new())
    };
    let mut msg = format!("```diff\n{}```", changes.concat());
    msg += &t("perm_command_delete_all_command_ok")
        .replace("${changes.length}", &changes.len().to_string())
        .replace("${type}", &kind)
        .replace("${value}", &value);
    ctx.say(msg).await?;
    Ok(())
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

/// Create the Perm 1-9 roles when missing.
#[poise::command(slash_command, prefix_command, rename = "perm-roles-create")]
pub async fn gc_perm_roles_create(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if !is_guild_owner(ctx).await {
        ctx.say(
            crate::lang::get(&code, "perm_roles_not_owner")
                .unwrap_or_else(|| "Not owner.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let outcome: anyhow::Result<String> = async {
        let mut map = load_perm_roles(pool, &gid).await;
        let guild_id = ctx.guild_id().unwrap();
        let live = guild_id.roles(ctx.http()).await.unwrap_or_default();
        let mut created: Vec<String> = vec![];
        for n in 1..=9i64 {
            let name = perm_level_name(n);
            let key = n.to_string();
            let keep = map
                .get(&key)
                .and_then(|r| r.parse::<u64>().ok())
                .map(|r| live.contains_key(&serenity::RoleId::new(r)))
                .unwrap_or(false);
            if keep {
                continue;
            }
            let role = guild_id
                .create_role(ctx.http(), serenity::EditRole::new().name(&name))
                .await?;
            map.insert(key, role.id.get().to_string());
            created.push(name);
        }
        crate::db::kv_set(pool, &gid, "UTILS.roles", &serde_json::to_string(&map)?).await?;
        Ok(if created.is_empty() {
            crate::lang::get(&code, "perm_roles_already_upate").unwrap_or_default()
        } else {
            crate::lang::get(&code, "perm_roles_created_role")
                .unwrap_or_default()
                .replace("${createdRoles.join(', ')}", &created.join(", "))
        })
    }
    .await;
    match outcome {
        Ok(msg) => {
            ctx.say(msg).await?;
        }
        Err(_) => {
            let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "perm_roles_error").unwrap_or_else(|| "Error.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// Point a perm level at a role.
#[poise::command(slash_command, prefix_command, rename = "perm-roles-edit")]
pub async fn gc_perm_roles_edit(
    ctx: Ctx<'_>,
    #[description = "Level 1-9"] level: i64,
    #[description = "Role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if !is_guild_owner(ctx).await {
        ctx.say(
            crate::lang::get(&code, "perm_roles_not_owner")
                .unwrap_or_else(|| "Not owner.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if !(1..=9).contains(&level) {
        ctx.say("Level must be 1-9.").await?;
        return Ok(());
    }
    let mut map = load_perm_roles(pool, &gid).await;
    map.insert(level.to_string(), role.id.get().to_string());
    crate::db::kv_set(
        pool,
        &gid,
        "UTILS.roles",
        &serde_json::to_string(&map).unwrap_or_default(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "perm_edit_roles_command_ok")
            .unwrap_or_default()
            .replace("${permName}", &perm_level_name(level))
            .replace("${strRole}", &format!("<@&{}>", role.id.get())),
    )
    .await?;
    Ok(())
}

/// Dump all kv rows of a guild as a JSON map (for encrypted backup).
pub async fn dump_guild_rows(
    pool: &crate::db::Pool,
    gid: &str,
) -> serde_json::Map<String, serde_json::Value> {
    let rows: Vec<(String, String)> =
        sqlx::query_as::<_, (String, String)>("SELECT key_name, value FROM kv WHERE guild_id = ?")
            .bind(gid)
            .fetch_all(pool)
            .await
            .unwrap_or_default();
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
    sqlx::query("DELETE FROM kv WHERE guild_id = ?")
        .bind(gid)
        .execute(pool)
        .await?;
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

/// Export the guild config backup.
// Mirrors !save.ts: gateway link on prod/dev, encrypted file DM else.
#[poise::command(slash_command, prefix_command, rename = "config-save")]
pub async fn gc_config_save(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    ctx.send(
        poise::CreateReply::default()
            .content(t("guildconfig_config_save_check_dm"))
            .ephemeral(true),
    )
    .await?;
    let token = crate::config::api_token().unwrap_or_default();
    if crate::config::is_gateway_env() {
        if let (Some(base), Some(_)) = (crate::config::gateway_base(), Some(())) {
            if let Ok(link) =
                crate::funcs::gateway_url(&base, crate::funcs::GatewayMethod::ServerBackup)
            {
                let url = format!(
                    "{link}/{}/{}",
                    crate::funcs::encrypt_text(&token, &gid),
                    crate::funcs::encrypt_text(&token, &now_ms().to_string())
                );
                let _ = ctx
                    .author()
                    .direct_message(
                        ctx.http(),
                        serenity::CreateMessage::new()
                            .content(format!("{}{url}", t("guildconfig_config_save_user_msg_2"))),
                    )
                    .await;
                return Ok(());
            }
        }
    }
    let dump = dump_guild_rows(pool, &gid).await;
    let payload = crate::funcs::encrypt_text(&token, &serde_json::Value::Object(dump).to_string());
    let guild_name = ctx
        .guild()
        .map(|g| g.name.clone())
        .unwrap_or_else(|| gid.clone());
    let _ = ctx
        .author()
        .direct_message(
            ctx.http(),
            serenity::CreateMessage::new()
                .content(
                    t("guildconfig_config_save_user_msg")
                        .replace("${interaction.guild.name}", &guild_name),
                )
                .add_file(serenity::CreateAttachment::bytes(
                    payload.into_bytes(),
                    format!("{gid}.json"),
                )),
        )
        .await;
    Ok(())
}

/// Load a guild config backup from an encrypted file.
// Mirrors !restore.ts (always replies restore_msg).
#[poise::command(slash_command, prefix_command, rename = "config-restore")]
pub async fn gc_config_restore(
    ctx: Ctx<'_>,
    #[description = "Backup file"] backup_to_load: Option<serenity::Attachment>,
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    if let (Some(gid), Some(att)) = (ctx.guild_id().map(|g| g.get().to_string()), backup_to_load) {
        let token = crate::config::api_token().unwrap_or_default();
        if let Ok(bytes) = att.download().await {
            if let Ok(text) = String::from_utf8(bytes) {
                // Stray control bytes break JSON parsing; string
                // escapes stay intact (they are not literal).
                let clean: String = text.chars().filter(|c| !c.is_control()).collect();
                if let Some(plain) = crate::funcs::decrypt_text(&token, clean.trim()) {
                    if let Ok(serde_json::Value::Object(map)) =
                        serde_json::from_str::<serde_json::Value>(&plain)
                    {
                        let _ = restore_guild_rows(pool, &gid, &map).await;
                    }
                }
            }
        }
    }
    ctx.say(t("guildconfig_config_restore_msg")).await?;
    Ok(())
}

/// Load the guild config blob. Mirrors the GUILD.GUILD_CONFIG object
/// read by the welcomer panel and the join/leave emitters.
pub async fn load_guild_config(pool: &crate::db::Pool, gid: &str) -> serde_json::Value {
    crate::db::kv_get(pool, gid, "GUILD.GUILD_CONFIG")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}))
}

pub async fn save_guild_config(
    pool: &crate::db::Pool,
    gid: &str,
    cfg: &serde_json::Value,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, gid, "GUILD.GUILD_CONFIG", &cfg.to_string()).await
}

/// Parse a join|leave selector. Mirrors the panel isJoin branches.
pub fn welcomer_kind(s: &str) -> Option<bool> {
    match s.trim().to_ascii_lowercase().as_str() {
        "join" => Some(true),
        "leave" => Some(false),
        _ => None,
    }
}

/// Set or remove a blob field. Mirrors the panel set/delete pairs
/// (message/embed/channel/toggle keys).
pub fn welcomer_set(cfg: &mut serde_json::Value, field: &str, value: Option<serde_json::Value>) {
    match value {
        Some(v) => cfg[field] = v,
        None => {
            if let Some(map) = cfg.as_object_mut() {
                map.remove(field);
            }
        }
    }
}

/// Set the join/leave channel (clears when omitted).
// Mirrors the panel channel pickers (GUILD.GUILD_CONFIG.join/leave).
#[poise::command(slash_command, prefix_command, rename = "wc-channel")]
pub async fn gc_wc_channel(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "Channel (omit to clear)"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let Some(join) = welcomer_kind(&kind) else {
        ctx.say("Use join or leave.").await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    let field = if join { "join" } else { "leave" };
    welcomer_set(
        &mut cfg,
        field,
        channel.map(|c| serde_json::Value::String(c.id.get().to_string())),
    );
    save_guild_config(pool, &gid, &cfg).await?;
    ctx.say("Welcomer channel updated.").await?;
    Ok(())
}

/// Set the join/leave embed id (clears when omitted).
// Mirrors the panel embed setters (joinEmbedId/leaveEmbedId).
#[poise::command(slash_command, prefix_command, rename = "wc-embed")]
pub async fn gc_wc_embed(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "Embed id (omit to clear)"] embed_id: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(join) = welcomer_kind(&kind) else {
        ctx.say("Use join or leave.").await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    let field = if join { "joinEmbedId" } else { "leaveEmbedId" };
    welcomer_set(
        &mut cfg,
        field,
        embed_id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .map(serde_json::Value::String),
    );
    save_guild_config(pool, &gid, &cfg).await?;
    ctx.say("Welcomer embed updated.").await?;
    Ok(())
}

/// Toggle the join/leave text message.
// Mirrors the panel text toggles (joinTextEnabled/leaveTextEnabled).
#[poise::command(slash_command, prefix_command, rename = "wc-text")]
pub async fn gc_wc_text(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let (Some(join), Some(enabled)) = (
        welcomer_kind(&kind),
        crate::commands::security::parse_on_off(&action),
    ) else {
        ctx.say("Use join/leave and on/off.").await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    welcomer_set(
        &mut cfg,
        if join {
            "joinTextEnabled"
        } else {
            "leaveTextEnabled"
        },
        Some(serde_json::Value::Bool(enabled)),
    );
    save_guild_config(pool, &gid, &cfg).await?;
    ctx.say("Welcomer text updated.").await?;
    Ok(())
}

/// Toggle the join/leave components.
// Mirrors the panel component toggles
// (joinComponentsEnabled/leaveComponentsEnabled).
#[poise::command(slash_command, prefix_command, rename = "wc-components")]
pub async fn gc_wc_components(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let (Some(join), Some(enabled)) = (
        welcomer_kind(&kind),
        crate::commands::security::parse_on_off(&action),
    ) else {
        ctx.say("Use join/leave and on/off.").await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    welcomer_set(
        &mut cfg,
        if join {
            "joinComponentsEnabled"
        } else {
            "leaveComponentsEnabled"
        },
        Some(serde_json::Value::Bool(enabled)),
    );
    save_guild_config(pool, &gid, &cfg).await?;
    ctx.say("Welcomer components updated.").await?;
    Ok(())
}

/// Create the private ihorizon-logs channel. Mirrors !setup.ts.
#[poise::command(slash_command, prefix_command, rename = "setup")]
pub async fn gc_setup(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let exists = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.channels
                .values()
                .any(|c| c.name.contains("ihorizon-logs"))
        })
        .unwrap_or(false);
    if exists {
        ctx.say("Logs channel already exists.").await?;
        return Ok(());
    }
    guild_id
        .create_channel(
            ctx.http(),
            serenity::CreateChannel::new("ihorizon-logs")
                .kind(serenity::ChannelType::Text)
                .permissions(vec![serenity::PermissionOverwrite {
                    allow: serenity::Permissions::empty(),
                    deny: serenity::Permissions::VIEW_CHANNEL
                        | serenity::Permissions::SEND_MESSAGES
                        | serenity::Permissions::READ_MESSAGE_HISTORY,
                    kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(
                        guild_id.get(),
                    )),
                }]),
        )
        .await?;
    ctx.say("Logs channel created.").await?;
    Ok(())
}

/// Master switch for autoreacts. Mirrors toggle-react.
#[poise::command(slash_command, prefix_command, rename = "autoreact-toggle")]
pub async fn gc_autoreact_toggle(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.AUTOREACT.enabled",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "Autoreacts on."
    } else {
        "Autoreacts off."
    })
    .await?;
    Ok(())
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
