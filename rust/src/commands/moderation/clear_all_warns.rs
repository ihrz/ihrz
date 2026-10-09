use super::*;

/// Clear all warns. Mirrors !clear-all-warns.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "clear-all-warns",
    aliases(
        "clearallwarns",
        "clearallwarn",
        "clearsanctionsall",
        "clearsanctionall"
    ),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_clear_all_warns(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "clear_allwarns_confirmation_message",
        "Delete ALL warns? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.WARNS'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "clear_allwarns_command_ok")
            .unwrap_or_else(|| "All warns cleared.".to_string()),
    )
    .await?;
    Ok(())
}
