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

/// Board data array key: GUILD.STARBOARD_DATA / GUILD.SKULLBOARD_DATA.
pub fn board_data_key(board: &str) -> String {
    match board {
        "skullboard" => "GUILD.SKULLBOARD_DATA".to_string(),
        _ => "GUILD.STARBOARD_DATA".to_string(),
    }
}

/// One posted board message. Mirrors StarboardData (camelCase wire
/// keys: channelId/messageId/number/author).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BoardEntry {
    pub channel_id: String,
    pub message_id: String,
    pub number: String,
    #[serde(default)]
    pub author: String,
}

pub async fn load_entries(pool: &crate::db::Pool, guild_id: &str, board: &str) -> Vec<BoardEntry> {
    crate::db::kv_get(pool, guild_id, &board_data_key(board))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_entries(
    pool: &crate::db::Pool,
    guild_id: &str,
    board: &str,
    entries: &[BoardEntry],
) {
    let s = serde_json::to_string(entries).unwrap_or_else(|_| "[]".to_string());
    let _ = crate::db::kv_set(pool, guild_id, &board_data_key(board), &s).await;
}

/// Find the board entry for one source message. Mirrors the
/// starboardData.find(messageId+channelId) in all four event files.
pub fn find_entry<'a>(
    entries: &'a [BoardEntry],
    channel_id: &str,
    message_id: &str,
) -> Option<&'a BoardEntry> {
    entries
        .iter()
        .find(|e| e.message_id == message_id && e.channel_id == channel_id)
}

/// Board message content line. Mirrors `⭐ **n** | <#channel>`
/// (💀 for skullboard).
pub fn board_content(emoji: &str, count: i64, channel_id: u64) -> String {
    format!("{emoji} **{count}** | <#{channel_id}>")
}

/// Board embed color. Mirrors #ffac33 (star) / #2b2d31 (skull).
pub fn board_color(board: &str) -> u32 {
    match board {
        "skullboard" => 0x2b2d31,
        _ => 0xffac33,
    }
}

/// Board trigger emoji. Mirrors the emoji.name gates.
pub fn board_emoji(board: &str) -> &'static str {
    match board {
        "skullboard" => "💀",
        _ => "⭐",
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
        assert_eq!(board_data_key("starboard"), "GUILD.STARBOARD_DATA");
        assert_eq!(board_data_key("skullboard"), "GUILD.SKULLBOARD_DATA");
    }

    #[test]
    fn board_render_helpers_match_ts() {
        assert_eq!(board_content("⭐", 5, 123), "⭐ **5** | <#123>");
        assert_eq!(board_content("💀", 2, 7), "💀 **2** | <#7>");
        assert_eq!(board_color("starboard"), 0xffac33);
        assert_eq!(board_color("skullboard"), 0x2b2d31);
        assert_eq!(board_emoji("starboard"), "⭐");
        assert_eq!(board_emoji("skullboard"), "💀");
        let entries = vec![
            BoardEntry {
                channel_id: "10".to_string(),
                message_id: "20".to_string(),
                number: "30".to_string(),
                author: "40".to_string(),
            },
            BoardEntry {
                channel_id: "11".to_string(),
                message_id: "21".to_string(),
                number: "31".to_string(),
                author: "41".to_string(),
            },
        ];
        assert_eq!(find_entry(&entries, "10", "20").unwrap().number, "30");
        assert!(find_entry(&entries, "10", "21").is_none());
        assert!(find_entry(&entries, "11", "20").is_none());
        // Wire shape mirrors StarboardData (camelCase).
        let json = serde_json::to_string(&entries[0]).unwrap();
        assert!(json.contains("\"channelId\":\"10\""));
        assert!(json.contains("\"messageId\":\"20\""));
        assert!(json.contains("\"number\":\"30\""));
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
