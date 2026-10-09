use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "add-react"
)]
pub async fn add_react(
    ctx: Ctx<'_>,
    #[description = "Trigger (exact match)"] trigger: String,
    #[description = "Response"] response: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("GUILD.REACT_MSG.{}", trigger.trim().to_ascii_lowercase()),
        response.trim(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "add_react_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.member?.id}",
                    &ctx.author().id.get().to_string(),
                )
                .replace(
                    "${message.toLowerCase()}",
                    &trigger.trim().to_ascii_lowercase(),
                )
                .replace("{emoji}", response.trim())
            })
            .unwrap_or_else(|| "Custom react added.".to_string()),
    )
    .await?;
    Ok(())
}

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

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "remove-react"
)]
pub async fn remove_react(
    ctx: Ctx<'_>,
    #[description = "Trigger"] trigger: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(format!(
            "GUILD.REACT_MSG.{}",
            trigger.trim().to_ascii_lowercase()
        ))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "remove_react_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.member?.id}",
                    &ctx.author().id.get().to_string(),
                )
                .replace(
                    "${message.toLowerCase()}",
                    &trigger.trim().to_ascii_lowercase(),
                )
            })
            .unwrap_or_else(|| "Custom react removed.".to_string()),
    )
    .await?;
    Ok(())
}
