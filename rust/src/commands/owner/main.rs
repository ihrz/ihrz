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
    aliases("addowner", "owneradd", "owners", "ownerlist"),
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "owner_is_now_owner")
            .map(|s| s.replace("${member.user.username}", &user.tag()))
            .unwrap_or_else(|| format!("{} is now guild owner.", user.tag())),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "remove", aliases("unowner"))]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "unowner_command_work")
            .map(|s| s.replace("${member.username}", &user.tag()))
            .unwrap_or_else(|| "Guild owner removed.".to_string()),
    )
    .await?;
    Ok(())
}

/// Bot-owner gate. Mirrors ownerHelper.isBotOwner for bot-level ops.
async fn require_bot_owner<'a>(ctx: &Ctx<'a>) -> bool {
    if crate::funcs::is_bot_owner(ctx.author().id.get(), &ctx.data().config.owners) {
        return true;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "blacklist_not_owner")
        .unwrap_or_else(|| "Bot owner only.".to_string());
    let _ = ctx.say(msg).await;
    false
}

#[poise::command(slash_command, prefix_command, rename = "blacklist", aliases("bl"))]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "blacklist_command_work")
            .map(|s| s.replace("${member.user.username}", &user.tag()))
            .unwrap_or_else(|| format!("{} blacklisted.", user.tag())),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "unblacklist", aliases("unbl"))]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "unblacklist_command_work")
            .map(|s| s.replace("${member.id}", &user.id.get().to_string()))
            .unwrap_or_else(|| "Unblacklisted.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "blinfo",
    aliases("blacklistinfo", "lookbl", "blook")
)]
pub async fn owner_blinfo(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    let reason = crate::db::kv_get(&ctx.data().pool, "0", &blacklist_key(user.id.get())).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(match reason {
        Some(r) => format!("{} blacklisted: {r}", user.tag()),
        None => crate::lang::get(&code, "unblacklist_not_blacklisted")
            .map(|s| s.replace("${member.id}", &user.id.get().to_string()))
            .unwrap_or_else(|| "Not blacklisted.".to_string()),
    })
    .await?;
    Ok(())
}

/// Edit a blacklist reason. Mirrors !bledit.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "bledit",
    aliases("blacklistedit", "editbl")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "bledit_reason_updated")
            .unwrap_or_else(|| "Reason updated.".to_string()),
    )
    .await?;
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
