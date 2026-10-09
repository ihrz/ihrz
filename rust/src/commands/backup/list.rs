use super::*;

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn backup_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<String> = super::backup::bkp_scan(&ctx.data().pool, &gid)
        .await
        .into_iter()
        .map(|(k, _)| k)
        .collect();
    // Mirrors the generateEmbed description switch in !list.ts:114
    // (all_of_your_backup vs backup_doesnt_exist).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let description = if rows.is_empty() {
        crate::lang::get(&code, "backup_backup_doesnt_exist")
            .unwrap_or_else(|| "Error: this backup doesn't exist.".to_string())
    } else {
        let head = crate::lang::get(&code, "backup_all_of_your_backup")
            .unwrap_or_else(|| "**All of your backups:**".to_string());
        format!("{head}\n{}", rows.join("\n"))
    };
    let embed = poise::serenity_prelude::CreateEmbed::default().description(description);
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
