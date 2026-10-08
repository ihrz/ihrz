// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/SlashCommands/suggestion/* +
// src/Events/suggestion/onNewMessage.ts.
//
// TS keys: SUGGEST.{channel, disable}, SUGGESTION.<code>
// {author, msgId, threadId} (+ status managed here).

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Suggestion {
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub msg_id: String,
    #[serde(default)]
    pub thread_id: String,
    #[serde(default)]
    pub status: String,
}

pub fn suggestion_key(code: &str) -> String {
    format!("SUGGESTION.{code}")
}

/// 6-char uppercase code. Mirrors TS suggestCode generation.
pub fn gen_suggest_code(seed: u64) -> String {
    const ALPHA: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut state = if seed == 0 { 0x9E3779B97F4A7C15 } else { seed };
    let mut out = String::with_capacity(6);
    for _ in 0..6 {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        out.push(ALPHA[(state % ALPHA.len() as u64) as usize] as char);
    }
    out
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "suggestion",
    rename = "setsuggest",
    subcommands("setsuggest_channel", "setsuggest_config"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setsuggest(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "channel")]
pub async fn setsuggest_channel(
    ctx: Ctx<'_>,
    #[description = "Suggestions channel"]
    #[channel_types("Text")]
    channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "SUGGEST.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    ctx.say("Suggestions channel set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn setsuggest_config(
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
        "SUGGEST.disable",
        if enabled { "0" } else { "1" },
    )
    .await?;
    ctx.say(if enabled {
        "Suggestions on."
    } else {
        "Suggestions off."
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "suggestion",
    rename = "suggest",
    subcommands("suggest_accept", "suggest_deny", "suggest_delete", "suggest_reply")
)]
pub async fn suggest(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

async fn set_status(
    ctx: &Ctx<'_>,
    code: &str,
    status: &str,
    reply: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, &suggestion_key(code.trim())).await;
    let Some(raw) = raw else {
        ctx.say("Suggestion not found.").await?;
        return Ok(());
    };
    let mut s: Suggestion = serde_json::from_str(&raw).unwrap_or_default();
    s.status = status.to_string();
    if let Ok(thread_id) = s.thread_id.parse::<u64>() {
        if thread_id != 0 {
            let _ = poise::serenity_prelude::ChannelId::new(thread_id)
                .say(
                    &ctx.http(),
                    format!(
                        "Suggestion {code} is now {status}.{}",
                        reply.clone().unwrap_or_default()
                    ),
                )
                .await;
        }
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &suggestion_key(code.trim()),
        &serde_json::to_string(&s)?,
    )
    .await?;
    ctx.say(format!(
        "Suggestion {code} {status}.{}",
        reply.map(|r| format!(" Reply: {r}")).unwrap_or_default()
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "accept")]
pub async fn suggest_accept(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
) -> Result<(), anyhow::Error> {
    set_status(&ctx, &code, "accepted", None).await
}

#[poise::command(slash_command, prefix_command, rename = "deny")]
pub async fn suggest_deny(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
) -> Result<(), anyhow::Error> {
    set_status(&ctx, &code, "denied", None).await
}

#[poise::command(slash_command, prefix_command, rename = "reply")]
pub async fn suggest_reply(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
    #[description = "Reply"] reply: String,
) -> Result<(), anyhow::Error> {
    set_status(&ctx, &code, "replied", Some(reply)).await
}

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn suggest_delete(
    ctx: Ctx<'_>,
    #[description = "Code"] code: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(suggestion_key(code.trim()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Suggestion deleted.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn code_is_6_upper_alnum() {
        let c = gen_suggest_code(42);
        assert_eq!(c.len(), 6);
        assert!(c
            .chars()
            .all(|x| x.is_ascii_uppercase() || x.is_ascii_digit()));
        assert_eq!(suggestion_key("ABC"), "SUGGESTION.ABC");
    }
}
