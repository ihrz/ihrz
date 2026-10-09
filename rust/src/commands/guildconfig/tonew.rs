use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "toonew",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_toonew(
    ctx: Ctx<'_>,
    #[description = "Minimum age (e.g. 7d) or off"] age: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_mention = format!("<@{}>", ctx.author().id.get());
    if age.trim().eq_ignore_ascii_case("off") {
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind("GUILD.BLOCK_NEW_ACCOUNT")
            .execute(&ctx.data().pool)
            .await;
        ctx.say(
            crate::lang::get(&code, "too_new_account_command_work_on_disable")
                .map(|s| s.replace("${interaction.user}", &author_mention))
                .unwrap_or_else(|| "Age check off.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(ms) = crate::commands::shared::parse_duration_ms(&age) else {
        ctx.say(
            crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
        return Ok(());
    };
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.BLOCK_NEW_ACCOUNT",
        &serde_json::json!({"state": true, "req": ms}).to_string(),
    )
    .await?;
    let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
    let beautiful = crate::funcs::beautiful_ms(ms as f64);
    ctx.say(
        crate::lang::get(&code, "too_new_account_command_work_on_enable")
            .map(|s| {
                s.replace("${interaction.user}", &author_mention)
                    .replace("${interaction.guild?.name}", &guild_name)
                    .replace("${beautifulTime}", &beautiful)
            })
            .unwrap_or_else(|| "Age check on.".to_string()),
    )
    .await?;
    Ok(())
}
