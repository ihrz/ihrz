use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "list-react"
)]
pub async fn list_react(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GUILD.REACT_MSG.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if rows.is_empty() {
        crate::lang::get(&code, "list_react_nothing_found")
            .unwrap_or_else(|| "No custom reacts.".to_string())
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}
