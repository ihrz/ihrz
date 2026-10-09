use super::*;

/// Bug report (5h cooldown, stored).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "report"
)]
pub async fn report(
    ctx: Ctx<'_>,
    #[description = "Message to devs (8+ words)"] message: String,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let uid = ctx.author().id.get();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let last: i64 = crate::db::kv_get(
        &ctx.data().pool,
        &gid,
        &format!("USER.{uid}.REPORT.cooldown"),
    )
    .await
    .and_then(|s| s.parse().ok())
    .unwrap_or(0);
    if now - last < 18_000_000 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_report_cooldown_active")
                .unwrap_or_else(|| "Report cooldown active.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if message.split_whitespace().count() < 8 {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "report_specify")
                .unwrap_or_else(|| "Please specify (8+ words).".to_string()),
        )
        .await?;
        return Ok(());
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("REPORTS.{now}.{uid}"),
        &message,
    )
    .await?;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("USER.{uid}.REPORT.cooldown"),
        &now.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "report_command_work")
            .unwrap_or_else(|| "Report recorded.".to_string()),
    )
    .await?;
    Ok(())
}
