// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/stats/*.
//
// TS keys: <guild>.STATS (guild aggregates), <guild>.STATS.USER.<uid>
// {messages, voiceMs}. PNG renders (ustats/gstats/top-*) pending; compare
// (pure embed) fully ported.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserStats {
    #[serde(default)]
    pub messages: u64,
    #[serde(default)]
    pub voice_ms: u64,
}

pub fn stats_key(user_id: u64) -> String {
    format!("STATS.USER.{user_id}")
}

pub async fn load_stats(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> UserStats {
    crate::db::kv_get(pool, guild_id, &stats_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "stats",
    rename = "stats",
    subcommands(
        "stats_user",
        "stats_compare",
        "stats_guild",
        "stats_top_messages",
        "stats_top_voice",
        "stats_channel"
    )
)]
pub async fn stats(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "ustats")]
pub async fn stats_user(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let s = load_stats(&ctx.data().pool, &gid, uid).await;
    ctx.say(format!(
        "Messages: {} | Voice: {}m",
        s.messages,
        s.voice_ms / 60_000
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "gstats")]
pub async fn stats_guild(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.USER.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut messages = 0u64;
    let mut voice_ms = 0u64;
    for raw in &rows {
        if let Ok(s) = serde_json::from_str::<UserStats>(raw) {
            messages += s.messages;
            voice_ms += s.voice_ms;
        }
    }
    ctx.say(format!(
        "Members tracked: {} | Messages: {} | Voice: {}m",
        rows.len(),
        messages,
        voice_ms / 60_000
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "compare")]
pub async fn stats_compare(
    ctx: Ctx<'_>,
    #[description = "First user"] user1: poise::serenity_prelude::User,
    #[description = "Second user"] user2: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if user1.id == user2.id {
        ctx.say("Compare two different users.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let a = load_stats(&ctx.data().pool, &gid, user1.id.get()).await;
    let b = load_stats(&ctx.data().pool, &gid, user2.id.get()).await;
    let winner = if a.messages + a.voice_ms >= b.messages + b.voice_ms {
        &user1
    } else {
        &user2
    };
    ctx.say(format!(
        "{}: {}msg/{}m vs {}: {}msg/{}m — winner {}",
        user1.tag(),
        a.messages,
        a.voice_ms / 60_000,
        user2.tag(),
        b.messages,
        b.voice_ms / 60_000,
        winner.tag()
    ))
    .await?;
    Ok(())
}

async fn top_by(
    ctx: &Ctx<'_>,
    pick: fn(&UserStats) -> u64,
    unit: &str,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.USER.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, u64)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let id: u64 = k.strip_prefix("STATS.USER.")?.parse().ok()?;
            let s: UserStats = serde_json::from_str(v).ok()?;
            Some((id, pick(&s)))
        })
        .collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
    let top: Vec<String> = parsed
        .iter()
        .take(10)
        .enumerate()
        .map(|(i, (uid, n))| format!("{}. <@{uid}> — {n}{unit}", i + 1))
        .collect();
    ctx.say(if top.is_empty() {
        "No data.".to_string()
    } else {
        top.join("\n")
    })
    .await?;
    Ok(())
}

/// Top messages. Mirrors stats top-messages (text form; PNG pending).
#[poise::command(slash_command, prefix_command, rename = "top-messages", aliases("top"))]
pub async fn stats_top_messages(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    top_by(&ctx, |s| s.messages, "msg").await
}

/// Top voice. Mirrors stats top-voice (text form; PNG pending).
#[poise::command(slash_command, prefix_command, rename = "top-voice")]
pub async fn stats_top_voice(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    top_by(&ctx, |s| s.voice_ms / 60_000, "m").await
}

/// Channel stats. Mirrors stats channel-stats (message counts per channel).
#[poise::command(slash_command, prefix_command, rename = "channel-stats")]
pub async fn stats_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"] channel: Option<poise::serenity_prelude::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    match channel {
        Some(ch) => {
            let n: u64 = crate::db::kv_get(
                &ctx.data().pool,
                &gid,
                &crate::events::channel_stats_key(ch.id.get()),
            )
            .await
            .and_then(|v| v.parse().ok())
            .unwrap_or(0);
            ctx.say(format!("<#{}>: {n} messages.", ch.id.get()))
                .await?;
        }
        None => {
            let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
                "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'STATS.CHANNEL.%'",
            )
            .bind(&gid)
            .fetch_all(&ctx.data().pool)
            .await
            .unwrap_or_default();
            let mut parsed: Vec<(String, u64)> = rows
                .iter()
                .filter_map(|(k, v)| {
                    let id = k.strip_prefix("STATS.CHANNEL.")?.to_string();
                    Some((id, v.parse().ok()?))
                })
                .collect();
            parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
            let top: Vec<String> = parsed
                .iter()
                .take(10)
                .enumerate()
                .map(|(i, (id, n))| format!("{}. <#{id}> — {n}", i + 1))
                .collect();
            ctx.say(if top.is_empty() {
                "No data.".to_string()
            } else {
                top.join("\n")
            })
            .await?;
        }
    }
    Ok(())
}
