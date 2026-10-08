// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/giveaway/* via giveawaysManager.ts.
//
// TS store: giveawaysTable keyed by messageId {guildId, channelId,
// winnerCount, prize, hostedBy, expireIn, ended, entries[], winners[]}.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Giveaway {
    pub guild_id: String,
    pub channel_id: String,
    pub winner_count: u32,
    pub prize: String,
    pub hosted_by: String,
    pub expire_in_ms: i64,
    #[serde(default)]
    pub ended: bool,
    #[serde(default)]
    pub entries: Vec<String>,
    #[serde(default)]
    pub winners: Vec<String>,
    /// none | invites | messages | roles (mirrors create requirement choice).
    #[serde(default = "default_req")]
    pub requirement: String,
    #[serde(default)]
    pub requirement_value: String,
}

fn default_req() -> String {
    "none".to_string()
}

/// Requirement gate. Mirrors the entry checks in giveawaysManager.
pub async fn check_requirement(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    member_roles: &[u64],
    requirement: &str,
    value: &str,
) -> bool {
    match requirement {
        "invites" => {
            let need: i64 = value.trim().parse().unwrap_or(i64::MAX);
            let stats =
                crate::commands::invitesmanager::load_invites(pool, guild_id, user_id).await;
            stats.invites >= need
        }
        "messages" => {
            let need: u64 = value.trim().parse().unwrap_or(u64::MAX);
            let stats = crate::commands::stats::load_stats(pool, guild_id, user_id).await;
            stats.messages >= need
        }
        "roles" => value
            .trim()
            .parse::<u64>()
            .map(|need| member_roles.contains(&need))
            .unwrap_or(false),
        _ => true,
    }
}

pub fn giveaway_key(message_id: u64) -> String {
    format!("GIVEAWAY.{message_id}")
}

/// Join a giveaway entry list. Returns false when already entered
/// (mirrors AvoidDoubleEntries in giveawaysManager).
pub fn join_giveaway(entries: &mut Vec<String>, user_id: &str) -> bool {
    if entries.iter().any(|e| e == user_id) {
        return false;
    }
    entries.push(user_id.to_string());
    true
}

/// Deterministic winner pick (xorshift over entries). Mirrors tirage;
/// production shuffles with randomness, tests stay deterministic.
pub fn pick_winners(entries: &[String], count: usize, seed: u64) -> Vec<String> {
    let mut pool: Vec<String> = entries.to_vec();
    pool.sort();
    pool.dedup();
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = vec![];
    let n = count.min(pool.len());
    for _ in 0..n {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        let idx = (state % pool.len() as u64) as usize;
        out.push(pool.remove(idx));
    }
    out
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "giveaway",
    rename = "gw",
    subcommands(
        "gw_create",
        "gw_end",
        "gw_reroll",
        "gw_list",
        "gw_entries",
        "gw_get_data",
        "gw_get_all"
    )
)]
pub async fn giveaway(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "create")]
pub async fn gw_create(
    ctx: Ctx<'_>,
    #[description = "Winners"] winners: i64,
    #[description = "Duration (e.g. 10m, 1h, 7d)"] time: String,
    #[description = "Prize"] prize: String,
    #[description = "Requirement: none, invites, messages, roles"] requirement: Option<String>,
    #[description = "Requirement value"] requirement_value: Option<String>,
) -> Result<(), anyhow::Error> {
    let delta = crate::commands::schedule::parse_duration_ms(&time);
    let Some(delta) = delta else {
        ctx.say("Bad duration.").await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let now = crate::commands::schedule::now_ms();
    let gw = Giveaway {
        guild_id: gid.clone(),
        channel_id: ctx.channel_id().get().to_string(),
        winner_count: winners.clamp(1, 20) as u32,
        prize: prize.clone(),
        hosted_by: ctx.author().id.get().to_string(),
        expire_in_ms: now + delta,
        ended: false,
        entries: vec![],
        winners: vec![],
        requirement: requirement.unwrap_or_else(|| "none".to_string()),
        requirement_value: requirement_value.unwrap_or_default(),
    };
    let msg = ctx
        .say(format!(
            "Giveaway: {prize} ({} winners, ends <t:{}:F>)",
            gw.winner_count,
            gw.expire_in_ms / 1000
        ))
        .await?;
    let mid = msg.into_message().await?.id.get();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &giveaway_key(mid),
        &serde_json::to_string(&gw)?,
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "end")]
pub async fn gw_end(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    let Some(raw) = raw else {
        ctx.say("Giveaway not found.").await?;
        return Ok(());
    };
    let mut gw: Giveaway = serde_json::from_str(&raw).unwrap_or_else(|_| Giveaway {
        guild_id: gid.clone(),
        channel_id: String::new(),
        winner_count: 1,
        prize: String::new(),
        hosted_by: String::new(),
        expire_in_ms: 0,
        ended: false,
        entries: vec![],
        winners: vec![],
        requirement: "none".to_string(),
        requirement_value: String::new(),
    });
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    gw.winners = pick_winners(&gw.entries, gw.winner_count as usize, seed);
    gw.ended = true;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &giveaway_key(mid),
        &serde_json::to_string(&gw)?,
    )
    .await?;
    ctx.say(if gw.winners.is_empty() {
        "No entries.".to_string()
    } else {
        format!("Winners: {}", gw.winners.join(", "))
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "reroll")]
pub async fn gw_reroll(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    let Some(raw) = raw else {
        ctx.say("Giveaway not found.").await?;
        return Ok(());
    };
    let mut gw: Giveaway = serde_json::from_str(&raw).unwrap_or_else(|_| Giveaway {
        guild_id: gid.clone(),
        channel_id: String::new(),
        winner_count: 1,
        prize: String::new(),
        hosted_by: String::new(),
        expire_in_ms: 0,
        ended: true,
        entries: vec![],
        winners: vec![],
        requirement: "none".to_string(),
        requirement_value: String::new(),
    });
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1)
        .wrapping_add(1);
    gw.winners = pick_winners(&gw.entries, gw.winner_count as usize, seed);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &giveaway_key(mid),
        &serde_json::to_string(&gw)?,
    )
    .await?;
    ctx.say(if gw.winners.is_empty() {
        "No entries.".to_string()
    } else {
        format!("New winners: {}", gw.winners.join(", "))
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn gw_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No giveaways.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list-entries")]
pub async fn gw_entries(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    let Some(raw) = raw else {
        ctx.say("Giveaway not found.").await?;
        return Ok(());
    };
    let entries: Vec<String> = serde_json::from_str::<serde_json::Value>(&raw)
        .ok()
        .and_then(|v| v.get("entries").cloned())
        .and_then(|e| serde_json::from_value(e).ok())
        .unwrap_or_default();
    ctx.say(if entries.is_empty() {
        "No entries.".to_string()
    } else {
        format!("{} entries: {}", entries.len(), entries.join(", "))
    })
    .await?;
    Ok(())
}

/// Show one giveaway's data. Mirrors !get-data.ts.
#[poise::command(slash_command, prefix_command, rename = "get-data")]
pub async fn gw_get_data(
    ctx: Ctx<'_>,
    #[description = "Giveaway message id"] message_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mid: u64 = message_id.trim().parse().unwrap_or(0);
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &giveaway_key(mid)).await;
    match raw.and_then(|r| serde_json::from_str::<Giveaway>(&r).ok()) {
        Some(gw) => {
            ctx.say(format!(
                "Prize: {} | Winners: {} | Ended: {} | Entries: {}",
                gw.prize,
                gw.winner_count,
                gw.ended,
                gw.entries.len()
            ))
            .await?
        }
        None => ctx.say("Giveaway not found.").await?,
    };
    Ok(())
}

/// List all giveaways with status. Mirrors !get-all.ts.
#[poise::command(slash_command, prefix_command, rename = "get-all")]
pub async fn gw_get_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut lines = vec![];
    for (k, v) in &rows {
        if let Ok(gw) = serde_json::from_str::<Giveaway>(v) {
            lines.push(format!(
                "{}: {} ({} entries, {})",
                k,
                gw.prize,
                gw.entries.len(),
                if gw.ended { "ended" } else { "live" }
            ));
        }
    }
    ctx.say(if lines.is_empty() {
        "No giveaways.".to_string()
    } else {
        lines.join("\n")
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn winners_are_unique_and_bounded() {
        let entries = vec!["a".into(), "b".into(), "a".into(), "c".into()];
        let w = pick_winners(&entries, 2, 42);
        assert_eq!(w.len(), 2);
        let mut sorted = w.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(sorted.len(), 2);
    }

    #[test]
    fn empty_entries_no_winners() {
        assert!(pick_winners(&[], 3, 1).is_empty());
    }

    #[test]
    fn join_dedupes_entries() {
        let mut entries = vec!["a".to_string()];
        assert!(join_giveaway(&mut entries, "b"));
        assert!(!join_giveaway(&mut entries, "a"));
        assert_eq!(entries.len(), 2);
    }

    #[tokio::test]
    async fn requirement_gates() {
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
        assert!(check_requirement(&pool, "g", 1, &[], "none", "").await);
        assert!(!check_requirement(&pool, "g", 1, &[], "invites", "5").await);
        assert!(!check_requirement(&pool, "g", 1, &[], "messages", "5").await);
        assert!(!check_requirement(&pool, "g", 1, &[7], "roles", "9").await);
        assert!(check_requirement(&pool, "g", 1, &[9], "roles", "9").await);
    }
}
