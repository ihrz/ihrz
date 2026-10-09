use super::*;

/// Reset all guild ranks. Mirrors !greset.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_uranks_are_you_sure",
        "Delete all rank data for ALL members? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'RANKS.%'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "All ranks reset.".to_string()),
    )
    .await?;
    Ok(())
}
