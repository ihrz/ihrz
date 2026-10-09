use super::*;

/// List archived confessions (mods). Mirrors ALL_CONFESSIONS store read.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn confession_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GUILD.CONFESSION.ALL_CONFESSIONS.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let n = rows.len();
    ctx.say(
        crate::lang::get(&code, "msg_archived_confessions")
            .map(|s| s.replace("{}", &n.to_string()))
            .unwrap_or_else(|| format!("{n} archived confessions.")),
    )
    .await?;
    Ok(())
}
