// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/sticky/* via
// core/modules/stickyMessageManager.ts.
//
// TS keys: <guild>.STICKY.<channelId> StickyChannelConfig; EMBED.<id> lookup
// for the embed variant.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StickyConfig {
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub embed_id: Option<String>,
}

pub fn sticky_key(channel_id: u64) -> String {
    format!("STICKY.{channel_id}")
}

pub fn describe(cfg: &StickyConfig) -> &'static str {
    match (&cfg.message.is_empty(), &cfg.embed_id) {
        (false, Some(_)) => "text_embed",
        (false, None) => "text",
        (true, Some(_)) => "embed",
        (true, None) => "none",
    }
}

pub async fn load_sticky(
    pool: &crate::db::Pool,
    guild_id: &str,
    channel_id: u64,
) -> Option<StickyConfig> {
    crate::db::kv_get(pool, guild_id, &sticky_key(channel_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "sticky",
    rename = "sticky",
    subcommands(
        "sticky_text",
        "sticky_embed",
        "sticky_disable",
        "sticky_show",
        "sticky_list",
        "sticky_refresh"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn sticky(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "text")]
pub async fn sticky_text(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Message"] message: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let cfg = StickyConfig {
        message,
        embed_id: None,
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &sticky_key(channel.id.get()),
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    ctx.say("Sticky text set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "embed")]
pub async fn sticky_embed(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
    #[description = "Embed id"] embed_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if crate::db::kv_get(&ctx.data().pool, &gid, &format!("EMBED.{embed_id}"))
        .await
        .is_none()
    {
        ctx.say("Embed not found.").await?;
        return Ok(());
    }
    let cfg = StickyConfig {
        message: String::new(),
        embed_id: Some(embed_id),
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &sticky_key(channel.id.get()),
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    ctx.say("Sticky embed set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "disable")]
pub async fn sticky_disable(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(sticky_key(channel.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Sticky disabled.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "show")]
pub async fn sticky_show(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match load_sticky(&ctx.data().pool, &gid, channel.id.get()).await {
        Some(cfg) => {
            ctx.say(format!("Sticky ({}): {}", describe(&cfg), cfg.message))
                .await?
        }
        None => ctx.say("No sticky here.").await?,
    };
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn sticky_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'STICKY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No stickies.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "refresh")]
pub async fn sticky_refresh(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match load_sticky(&ctx.data().pool, &gid, channel.id.get()).await {
        Some(cfg) => {
            channel.id.say(&ctx.http(), cfg.message.clone()).await?;
            ctx.say("Sticky refreshed.").await?;
        }
        None => {
            ctx.say("No sticky here.").await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_layout() {
        assert_eq!(sticky_key(123), "STICKY.123");
    }

    #[test]
    fn describe_variants() {
        assert_eq!(
            describe(&StickyConfig {
                message: "hi".into(),
                embed_id: None
            }),
            "text"
        );
        assert_eq!(
            describe(&StickyConfig {
                message: String::new(),
                embed_id: Some("e".into())
            }),
            "embed"
        );
        assert_eq!(
            describe(&StickyConfig {
                message: "hi".into(),
                embed_id: Some("e".into())
            }),
            "text_embed"
        );
        assert_eq!(
            describe(&StickyConfig {
                message: String::new(),
                embed_id: None
            }),
            "none"
        );
    }
}
