// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/notifier/* +
// src/core/StreamNotifier.ts (config surface).
//
// TS keys: NOTIFIER.users[] {id_or_username, platform}, NOTIFIER.channelId,
// NOTIFIER.message, NOTIFIER.lastMediaNotified. Live author validation +
// 120s polling pending API keys; dedup helper in notifier.rs.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NotifierEntry {
    pub id_or_username: String,
    pub platform: String,
}

pub fn valid_platform(p: &str) -> bool {
    matches!(
        p.to_ascii_lowercase().as_str(),
        "twitch" | "youtube" | "kick"
    )
}

pub async fn load_entries(pool: &crate::db::Pool, guild_id: &str) -> Vec<NotifierEntry> {
    crate::db::kv_get(pool, guild_id, "NOTIFIER.users")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

async fn save_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    entries: &[NotifierEntry],
) -> anyhow::Result<()> {
    crate::db::kv_set(
        pool,
        guild_id,
        "NOTIFIER.users",
        &serde_json::to_string(entries)?,
    )
    .await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "notifier",
    rename = "notifier",
    subcommands(
        "notifier_add",
        "notifier_remove",
        "notifier_list",
        "notifier_channel",
        "notifier_message"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn notifier(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "add")]
pub async fn notifier_add(
    ctx: Ctx<'_>,
    #[description = "twitch, youtube or kick"] platform: String,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    if !valid_platform(&platform) {
        ctx.say("Bad platform (twitch, youtube, kick).").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut entries = load_entries(&ctx.data().pool, &gid).await;
    let entry = NotifierEntry {
        id_or_username: author.trim().to_string(),
        platform: platform.to_ascii_lowercase(),
    };
    if !entries.contains(&entry) {
        entries.push(entry);
        save_entries(&ctx.data().pool, &gid, &entries).await?;
    }
    ctx.say("Notifier entry added.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "remove")]
pub async fn notifier_remove(
    ctx: Ctx<'_>,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut entries = load_entries(&ctx.data().pool, &gid).await;
    let before = entries.len();
    entries.retain(|e| e.id_or_username != author.trim());
    if entries.len() == before {
        ctx.say("Not found.").await?;
        return Ok(());
    }
    save_entries(&ctx.data().pool, &gid, &entries).await?;
    ctx.say("Notifier entry removed.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn notifier_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let entries = load_entries(&ctx.data().pool, &gid).await;
    ctx.say(if entries.is_empty() {
        "No notifier entries.".to_string()
    } else {
        entries
            .iter()
            .map(|e| format!("{} ({})", e.id_or_username, e.platform))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "channel")]
pub async fn notifier_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "NOTIFIER.channelId",
        &channel.id.get().to_string(),
    )
    .await?;
    ctx.say("Notifier channel set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "message")]
pub async fn notifier_message(
    ctx: Ctx<'_>,
    #[description = "Template"] template: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(&ctx.data().pool, &gid, "NOTIFIER.message", template.trim()).await?;
    ctx.say("Notifier message set.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platforms() {
        assert!(valid_platform("twitch"));
        assert!(valid_platform("YouTube"));
        assert!(!valid_platform("nope"));
    }
}
