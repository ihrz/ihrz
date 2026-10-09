use super::*;

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn backup_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'BACKUP.%'",
    )
    .bind(format!("{gid}-backups"))
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No backups.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}
