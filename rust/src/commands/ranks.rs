// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/ranks/*.
//
// TS keys: GUILD.RANKS {disable, xpChannels, ignoreChannels[], roles[],
// message}, USER.<uid>.RANKS {level, xp, xptotal, message}.
// XP engine (message counting) lives in events; card/podHTML->PNG render
// pending (see PORT_INVENTORY.md).

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RankEntry {
    #[serde(default)]
    pub level: u64,
    #[serde(default)]
    pub xp: u64,
    #[serde(default)]
    pub xptotal: u64,
}

pub fn ranks_key(user_id: u64) -> String {
    format!("RANKS.{user_id}")
}

/// XP needed for next level. Mirrors TS level curve (level * 100).
pub fn xp_needed(level: u64) -> u64 {
    level.saturating_mul(100).max(100)
}

/// Apply XP, leveling up while threshold crossed. Returns (new_entry, leveled).
pub fn apply_xp(mut e: RankEntry, amount: u64) -> (RankEntry, bool) {
    e.xp += amount;
    e.xptotal += amount;
    let mut leveled = false;
    while e.xp >= xp_needed(e.level + 1) {
        e.xp -= xp_needed(e.level + 1);
        e.level += 1;
        leveled = true;
    }
    (e, leveled)
}

pub async fn load_rank(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> RankEntry {
    crate::db::kv_get(pool, guild_id, &ranks_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "ranks",
    rename = "ranks",
    subcommands(
        "ranks_show",
        "ranks_leaderboard",
        "ranks_config",
        "ranks_channel",
        "ranks_ureset",
        "ranks_greset",
        "ranks_ignore_add",
        "ranks_ignore_list",
        "ranks_msg",
        "ranks_role_add",
        "ranks_role_list",
        "ranks_xp_channels"
    )
)]
pub async fn ranks(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "show")]
pub async fn ranks_show(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let e = load_rank(&ctx.data().pool, &gid, uid).await;
    let name = user
        .as_ref()
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let svg = crate::cards::rank_card_svg(&name, e.level, e.xp, xp_needed(e.level + 1), e.xptotal);
    ctx.send(
        poise::CreateReply::default()
            .content(format!(
                "Level {} — {}/{} XP (total {})",
                e.level,
                e.xp,
                xp_needed(e.level + 1),
                e.xptotal
            ))
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                svg.into_bytes(),
                "rank.svg",
            )),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "leaderboard")]
pub async fn ranks_leaderboard(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'RANKS.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, RankEntry)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let id: u64 = k.strip_prefix("RANKS.")?.parse().ok()?;
            Some((id, serde_json::from_str(v).ok()?))
        })
        .collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1.xptotal));
    let svg = crate::cards::podium_svg(
        &parsed
            .iter()
            .take(8)
            .map(|(uid, e)| (format!("<@{uid}>"), e.xptotal))
            .collect::<Vec<_>>(),
    );
    let top: Vec<String> = parsed
        .iter()
        .take(15)
        .enumerate()
        .map(|(i, (uid, e))| format!("{}. <@{uid}> — lvl {} ({} XP)", i + 1, e.level, e.xptotal))
        .collect();
    ctx.send(
        poise::CreateReply::default()
            .content(if top.is_empty() {
                "No ranks.".to_string()
            } else {
                top.join("\n")
            })
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                svg.into_bytes(),
                "podium.svg",
            )),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_config(
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
        "GUILD.RANKS.disable",
        if enabled { "0" } else { "1" },
    )
    .await?;
    ctx.say(if enabled { "Ranks on." } else { "Ranks off." })
        .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            crate::db::kv_set(
                &ctx.data().pool,
                &gid,
                "GUILD.RANKS.channel",
                &ch.id.get().to_string(),
            )
            .await?;
            ctx.say("Ranks channel set.").await?;
        }
        None => {
            sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind("GUILD.RANKS.channel")
                .execute(&ctx.data().pool)
                .await?;
            ctx.say("Ranks channel cleared.").await?;
        }
    }
    Ok(())
}

/// Reset one user's ranks. Mirrors !ureset.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ureset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_ureset(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_uranks_are_you_sure",
        "Delete all rank data for this user? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(ranks_key(user.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Ranks reset for user.").await?;
    Ok(())
}

/// Reset all guild ranks. Mirrors !greset.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_uranks_are_you_sure",
        "Delete all rank data for ALL members? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'RANKS.%'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("All ranks reset.").await?;
    Ok(())
}

/// Ignore-list helpers. Mirrors !ignore-channels.ts
/// (GUILD.RANKS.ignoreChannels[]).
pub fn toggle_ignore(mut list: Vec<String>, channel_id: &str) -> (Vec<String>, bool) {
    if let Some(pos) = list.iter().position(|c| c == channel_id) {
        list.remove(pos);
        (list, false)
    } else {
        list.push(channel_id.to_string());
        (list, true)
    }
}

async fn load_ignore(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    crate::db::kv_get(pool, guild_id, "GUILD.RANKS.ignoreChannels")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_ignore_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (next, added) = toggle_ignore(
        load_ignore(&ctx.data().pool, &gid).await,
        &channel.id.get().to_string(),
    );
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.RANKS.ignoreChannels",
        &serde_json::to_string(&next)?,
    )
    .await?;
    ctx.say(if added {
        "Channel ignored for XP."
    } else {
        "Channel unignored."
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "ignore-list")]
pub async fn ranks_ignore_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let list = load_ignore(&ctx.data().pool, &gid).await;
    ctx.say(if list.is_empty() {
        "No ignored channels.".to_string()
    } else {
        list.join(", ")
    })
    .await?;
    Ok(())
}

/// Custom level-up message template.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_msg(
    ctx: Ctx<'_>,
    #[description = "Template (empty to clear)"] template: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match template
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
    {
        Some(t) => {
            crate::db::kv_set(&ctx.data().pool, &gid, "GUILD.RANKS.message", &t).await?;
            ctx.say("Level-up message set.").await?;
        }
        None => {
            sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind("GUILD.RANKS.message")
                .execute(&ctx.data().pool)
                .await?;
            ctx.say("Level-up message cleared.").await?;
        }
    }
    Ok(())
}

/// Level-role rewards. Mirrors !roles.ts (GUILD.RANKS.roles[]).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RankRole {
    pub role_id: String,
    pub level: u64,
}

async fn load_rank_roles(pool: &crate::db::Pool, guild_id: &str) -> Vec<RankRole> {
    crate::db::kv_get(pool, guild_id, "GUILD.RANKS.roles")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_role_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: serenity::Role,
    #[description = "Level"] level: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_rank_roles(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    roles.retain(|r| r.role_id != id);
    roles.push(RankRole {
        role_id: id,
        level: level.max(1) as u64,
    });
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.RANKS.roles",
        &serde_json::to_string(&roles)?,
    )
    .await?;
    ctx.say("Rank role added.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "role-list")]
pub async fn ranks_role_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = load_rank_roles(&ctx.data().pool, &gid).await;
    ctx.say(if roles.is_empty() {
        "No rank roles.".to_string()
    } else {
        roles
            .iter()
            .map(|r| format!("<@&{}> — lvl {}", r.role_id, r.level))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

/// XP allowlist channels. Only these channels grant XP when non-empty.
/// Complements the ignore list.
#[poise::command(slash_command, prefix_command, rename = "xp-channels")]
pub async fn ranks_xp_channels(
    ctx: Ctx<'_>,
    #[description = "Channel (omit to clear all)"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.RANKS.xpChannels").await;
            let mut list: Vec<String> = raw
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default();
            let id = ch.id.get().to_string();
            if !list.contains(&id) {
                list.push(id);
                crate::db::kv_set(
                    &ctx.data().pool,
                    &gid,
                    "GUILD.RANKS.xpChannels",
                    &serde_json::to_string(&list)?,
                )
                .await?;
            }
            ctx.say("XP channel added.").await?;
        }
        None => {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind("GUILD.RANKS.xpChannels")
                .execute(&ctx.data().pool)
                .await;
            ctx.say("XP channels cleared.").await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xp_curve_starts_at_100() {
        assert_eq!(xp_needed(0), 100);
        assert_eq!(xp_needed(1), 100);
        assert_eq!(xp_needed(5), 500);
    }

    #[test]
    fn apply_xp_levels_up() {
        let (e, leveled) = apply_xp(RankEntry::default(), 150);
        assert!(leveled);
        assert_eq!(e.level, 1);
        assert_eq!(e.xp, 50);
        assert_eq!(e.xptotal, 150);
    }

    #[test]
    fn apply_xp_no_level() {
        let (e, leveled) = apply_xp(RankEntry::default(), 50);
        assert!(!leveled);
        assert_eq!(e.level, 0);
    }
}
