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
    )
)]
pub async fn notifier(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_add(
    ctx: Ctx<'_>,
    #[description = "twitch, youtube or kick"] platform: String,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    if !valid_platform(&platform) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_platform_twitch_youtube_kick")
                .unwrap_or_else(|| "Bad platform (twitch, youtube, kick).".to_string()),
        )
        .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_notifier_entry_added")
            .unwrap_or_else(|| "Notifier entry added.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    default_member_permissions = "MANAGE_GUILD"
)]
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
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_not_found").unwrap_or_else(|| "Not found.".to_string()),
        )
        .await?;
        return Ok(());
    }
    save_entries(&ctx.data().pool, &gid, &entries).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_notifier_entry_removed")
            .unwrap_or_else(|| "Notifier entry removed.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "MANAGE_GUILD"
)]
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

#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "MANAGE_GUILD"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "notifier_config_message_command_ok")
            .map(|s| s.replace("${channel.toString()}", &format!("<#{}>", channel.id.get())))
            .unwrap_or_else(|| "Notifier channel set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_message(
    ctx: Ctx<'_>,
    #[description = "Template"] template: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(&ctx.data().pool, &gid, "NOTIFIER.message", template.trim()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let tick = crate::emojis::app_emoji_markup(ctx.http(), "GreenTick")
        .await
        .unwrap_or_default();
    ctx.say(
        crate::lang::get(&code, "notifier_config_message_command_work_on_enable")
            .map(|s| s.replace("${client.iHorizon_Emojis.GreenTick}", &tick))
            .unwrap_or_else(|| "Notifier message set.".to_string()),
    )
    .await?;
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
