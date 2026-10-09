use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

pub const H247_KEY: &str = "GUILD.H247";

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct H247Config {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub voice_channel_id: String,
}

pub async fn load_h247(pool: &crate::db::Pool, guild_id: &str) -> H247Config {
    crate::db::kv_get(pool, guild_id, H247_KEY)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_h247(
    pool: &crate::db::Pool,
    guild_id: &str,
    cfg: &H247Config,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, guild_id, H247_KEY, &serde_json::to_string(cfg)?).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "h247",
    rename = "h247",
    subcommands("h247_join", "h247_leave", "h247_info"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn h247(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "join",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn h247_join(
    ctx: Ctx<'_>,
    #[description = "Voice channel to park in"]
    #[channel_types("Voice")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    save_h247(
        &ctx.data().pool,
        &gid,
        &H247Config {
            enabled: true,
            voice_channel_id: channel.id.get().to_string(),
        },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "h247_joined")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${voiceChannel}", &format!("<#{}>", channel.id.get()))
            })
            .unwrap_or_else(|| format!("H247 parked in <#{}>.", channel.id.get())),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leave",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn h247_leave(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    save_h247(&ctx.data().pool, &gid, &H247Config::default()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "h247_left")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| "H247 left.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "info")]
pub async fn h247_info(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let cfg = load_h247(&ctx.data().pool, &gid).await;
    ctx.say(if cfg.enabled {
        format!("H247 enabled in <#{}>.", cfg.voice_channel_id)
    } else {
        "H247 disabled.".to_string()
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_disabled() {
        assert!(!H247Config::default().enabled);
    }

    #[tokio::test]
    async fn roundtrip_memory() {
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
        save_h247(
            &pool,
            "g",
            &H247Config {
                enabled: true,
                voice_channel_id: "123".into(),
            },
        )
        .await
        .unwrap();
        let back = load_h247(&pool, "g").await;
        assert!(back.enabled);
        assert_eq!(back.voice_channel_id, "123");
    }
}
