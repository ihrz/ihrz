// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/starboard/* (+ skullboard mirror).
//
// TS key: <guild>.GUILD.STARBOARD {channel, createThread, enabled, threshold}
// with threshold clamped 2..=10. Skullboard uses GUILD.SKULLBOARD.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BoardConfig {
    #[serde(default)]
    pub channel: String,
    #[serde(default)]
    pub create_thread: bool,
    #[serde(default = "default_enabled")]
    pub enabled: String,
    #[serde(default = "default_threshold")]
    pub threshold: i64,
}

fn default_enabled() -> String {
    "no".to_string()
}

fn default_threshold() -> i64 {
    2
}

impl Default for BoardConfig {
    fn default() -> Self {
        Self {
            channel: String::new(),
            create_thread: false,
            enabled: default_enabled(),
            threshold: default_threshold(),
        }
    }
}

pub fn clamp_threshold(amount: i64) -> i64 {
    amount.clamp(2, 10)
}

pub fn board_key(board: &str) -> String {
    match board {
        "skullboard" => "GUILD.SKULLBOARD".to_string(),
        _ => "GUILD.STARBOARD".to_string(),
    }
}

pub async fn load_board(pool: &crate::db::Pool, guild_id: &str, board: &str) -> BoardConfig {
    let raw = crate::db::kv_get(pool, guild_id, &board_key(board)).await;
    raw.and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_board(
    pool: &crate::db::Pool,
    guild_id: &str,
    board: &str,
    cfg: &BoardConfig,
) -> anyhow::Result<()> {
    let s = serde_json::to_string(cfg)?;
    crate::db::kv_set(pool, guild_id, &board_key(board), &s).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "starboard",
    subcommands(
        "starboard_config",
        "starboard_channel",
        "starboard_threshold",
        "starboard_thread"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "skullboard",
    subcommands("skull_config", "skull_channel", "skull_threshold", "skull_thread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skullboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

macro_rules! board_subs {
    ($board:literal, $cfg_fn:ident, $ch_fn:ident, $th_fn:ident, $tr_fn:ident) => {
        #[poise::command(slash_command, prefix_command, rename = "config")]
        pub async fn $cfg_fn(
            ctx: Ctx<'_>,
            #[description = "on or off"] action: String,
        ) -> Result<(), anyhow::Error> {
            let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
            let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
                return Ok(());
            };
            let mut cfg = load_board(&ctx.data().pool, &gid, $board).await;
            cfg.enabled = if enabled {
                "yes".to_string()
            } else {
                "no".to_string()
            };
            save_board(&ctx.data().pool, &gid, $board, &cfg).await?;
            ctx.say(format!("{} {}", $board, cfg.enabled)).await?;
            Ok(())
        }

        #[poise::command(slash_command, prefix_command, rename = "channel")]
        pub async fn $ch_fn(
            ctx: Ctx<'_>,
            #[description = "Target channel"]
            #[channel_types("Text", "News")]
            channel: serenity::GuildChannel,
        ) -> Result<(), anyhow::Error> {
            let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
                return Ok(());
            };
            let mut cfg = load_board(&ctx.data().pool, &gid, $board).await;
            cfg.channel = channel.id.get().to_string();
            save_board(&ctx.data().pool, &gid, $board, &cfg).await?;
            ctx.say(format!("{} channel set.", $board)).await?;
            Ok(())
        }

        #[poise::command(slash_command, prefix_command, rename = "threshold")]
        pub async fn $th_fn(
            ctx: Ctx<'_>,
            #[description = "Stars needed (2-10)"] amount: i64,
        ) -> Result<(), anyhow::Error> {
            let clamped = clamp_threshold(amount);
            let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
                return Ok(());
            };
            let mut cfg = load_board(&ctx.data().pool, &gid, $board).await;
            cfg.threshold = clamped;
            save_board(&ctx.data().pool, &gid, $board, &cfg).await?;
            ctx.say(format!("{} threshold: {clamped}", $board)).await?;
            Ok(())
        }

        #[poise::command(slash_command, prefix_command, rename = "create-thread")]
        pub async fn $tr_fn(
            ctx: Ctx<'_>,
            #[description = "yes or no"] action: String,
        ) -> Result<(), anyhow::Error> {
            let create = matches!(action.to_ascii_lowercase().as_str(), "yes" | "on");
            let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
                return Ok(());
            };
            let mut cfg = load_board(&ctx.data().pool, &gid, $board).await;
            cfg.create_thread = create;
            save_board(&ctx.data().pool, &gid, $board, &cfg).await?;
            ctx.say(format!("{} create_thread: {create}", $board))
                .await?;
            Ok(())
        }
    };
}

board_subs!(
    "starboard",
    starboard_config,
    starboard_channel,
    starboard_threshold,
    starboard_thread
);
board_subs!(
    "skullboard",
    skull_config,
    skull_channel,
    skull_threshold,
    skull_thread
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn threshold_clamps_like_ts() {
        assert_eq!(clamp_threshold(1), 2);
        assert_eq!(clamp_threshold(2), 2);
        assert_eq!(clamp_threshold(5), 5);
        assert_eq!(clamp_threshold(10), 10);
        assert_eq!(clamp_threshold(99), 10);
    }

    #[test]
    fn board_keys_mirror_ts() {
        assert_eq!(board_key("starboard"), "GUILD.STARBOARD");
        assert_eq!(board_key("skullboard"), "GUILD.SKULLBOARD");
        assert_eq!(board_key("other"), "GUILD.STARBOARD");
    }

    #[test]
    fn default_config_matches_ts_fallback() {
        let cfg = BoardConfig::default();
        assert_eq!(cfg.threshold, 2);
        assert_eq!(cfg.enabled, "no");
        assert!(!cfg.create_thread);
    }

    #[tokio::test]
    async fn board_roundtrip_json() {
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
        let mut cfg = load_board(&pool, "g", "starboard").await;
        assert_eq!(cfg.threshold, 2);
        cfg.threshold = clamp_threshold(99);
        save_board(&pool, "g", "starboard", &cfg).await.unwrap();
        let re = load_board(&pool, "g", "starboard").await;
        assert_eq!(re.threshold, 10);
    }
}
