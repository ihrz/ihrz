use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    ctx.say(if rows.is_empty() {
        "No giveaways.".to_string()
    } else {
        rows.join("\n")
    })
    .await?;
    Ok(())
}

/// List all giveaways with status. Mirrors !get-all.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "get-all",
    aliases("gall"),
    default_member_permissions = "MANAGE_MESSAGES"
)]
pub async fn gw_get_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'GIVEAWAY.%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut lines = vec![];
    for (k, v) in &rows {
        if let Ok(gw) = serde_json::from_str::<Giveaway>(v) {
            lines.push(format!(
                "{}: {} ({} entries, {})",
                k,
                gw.prize,
                gw.entries.len(),
                if gw.ended { "ended" } else { "live" }
            ));
        }
    }
    ctx.say(if lines.is_empty() {
        "No giveaways.".to_string()
    } else {
        lines.join("\n")
    })
    .await?;
    Ok(())
}
