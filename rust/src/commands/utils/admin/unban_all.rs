use super::*;

/// Unban everyone, storing the list for undo. Mirrors unbanall !all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-all",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn unban_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    if bans.is_empty() {
        ctx.say(
            crate::lang::get(&code, "action_unban_all_no_banned_members")
                .unwrap_or_else(|| "There are no banned members.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut unbanned = vec![];
    for ban in &bans {
        if guild_id.unban(ctx.http(), ban.user.id).await.is_ok() {
            unbanned.push(ban.user.id.get().to_string());
        }
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.unban_members",
        &serde_json::to_string(&unbanned)?,
    )
    .await?;
    ctx.say(format!("Unbanned {}.", unbanned.len())).await?;
    Ok(())
}
