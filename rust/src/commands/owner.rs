// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/owner/* via ownerHelper +
// blacklistTable. Bot-level owners come from config (env OWNERS); guild
// owners live in kv. Blacklist: bot table BLACKLIST.<uid> {reason} +
// guild table <guild>.BLACKLIST.<uid>. Eval is intentionally NOT ported
// (arbitrary code execution has no Rust equivalent).

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub fn blacklist_key(user_id: u64) -> String {
    format!("BLACKLIST.{user_id}")
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "owner",
    subcommands(
        "owner_list",
        "owner_add",
        "owner_remove",
        "owner_blacklist",
        "owner_unblacklist",
        "owner_blinfo",
        "owner_bledit"
    )
)]
pub async fn owner(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn owner_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let cfg_owners = ctx.data().config.owners.clone();
    ctx.say(if cfg_owners.is_empty() {
        "No bot owners.".to_string()
    } else {
        cfg_owners.join(", ")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "add")]
pub async fn owner_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("GUILD.OWNER.{}", user.id.get());
    crate::db::kv_set(&ctx.data().pool, &gid, &key, "1").await?;
    ctx.say(format!("{} is now guild owner.", user.tag()))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "remove")]
pub async fn owner_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(format!("GUILD.OWNER.{}", user.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Guild owner removed.").await?;
    Ok(())
}

/// Bot-owner gate. Mirrors ownerHelper.isBotOwner for bot-level ops.
async fn require_bot_owner<'a>(ctx: &Ctx<'a>) -> bool {
    if crate::funcs::is_bot_owner(ctx.author().id.get(), &ctx.data().config.owners) {
        return true;
    }
    let _ = ctx.say("Bot owner only.").await;
    false
}

#[poise::command(slash_command, prefix_command, rename = "blacklist")]
pub async fn owner_blacklist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
        "0",
        &blacklist_key(user.id.get()),
        &reason.unwrap_or_else(|| "No reason".to_string()),
    )
    .await?;
    ctx.say(format!("{} blacklisted.", user.tag())).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "unblacklist")]
pub async fn owner_unblacklist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    sqlx::query("DELETE FROM kv WHERE guild_id = '0' AND key_name = ?")
        .bind(blacklist_key(user.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Unblacklisted.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "blinfo")]
pub async fn owner_blinfo(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    let reason = crate::db::kv_get(&ctx.data().pool, "0", &blacklist_key(user.id.get())).await;
    ctx.say(match reason {
        Some(r) => format!("{} blacklisted: {r}", user.tag()),
        None => "Not blacklisted.".to_string(),
    })
    .await?;
    Ok(())
}

/// Edit a blacklist reason. Mirrors !bledit.ts.
#[poise::command(slash_command, prefix_command, rename = "bledit")]
pub async fn owner_bledit(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "New reason"] reason: String,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
        "0",
        &blacklist_key(user.id.get()),
        reason.trim(),
    )
    .await?;
    ctx.say("Reason updated.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_layout() {
        assert_eq!(blacklist_key(1), "BLACKLIST.1");
    }
}
