use super::*;

/// Dump guild config keys. Mirrors guildconfig !show.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_show(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND (key_name LIKE 'GUILD.%' OR key_name LIKE 'UTILS.%' OR key_name LIKE 'COUNTER.%')",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No config stored.".to_string()
    } else {
        rows.iter()
            .take(25)
            .map(|(k, v)| format!("{k} = {}", v.chars().take(80).collect::<String>()))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}
