use super::*;

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn backup_delete(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Existence gate first, like the data_2 check in !delete.ts:77.
    let raw = crate::db::kv_get(
        &ctx.data().pool,
        &format!("{gid}-backups"),
        &backup_key(backup_id.trim()),
    )
    .await;
    if raw.is_none() {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_backup_doesnt_exist",
                "Error: this backup doesn't exist.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let warn = crate::emojis::app_emoji_markup(ctx.http(), "Warning_Icon")
        .await
        .unwrap_or_else(|| "⚠️".to_string());
    // Destructive delete needs an explicit yes. Mirrors the
    // backup-trash-button / backup-cancel-button collector in !delete.ts
    // (confirm -> succefully_deleted, cancel -> cancel_deletion).
    let content = crate::commands::lang_for(
        &ctx,
        "backup_really_want",
        "${client.iHorizon_Emojis.Warning_Icon} Do you really want to delete this backup?",
    )
    .await
    .replace("${client.iHorizon_Emojis.Warning_Icon}", &warn);
    let yes =
        crate::commands::lang_for(&ctx, "backup_confirm_button", "Yes, delete this backup").await;
    let no = crate::commands::lang_for(&ctx, "backup_cancel_button", "Cancel Action").await;
    if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, true).await? {
        let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
            .await
            .unwrap_or_else(|| "✅".to_string());
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_embed_title_cancel_deletion",
                "${client.iHorizon_Emojis.Yes} The backup was kept!",
            )
            .await
            .replace("${client.iHorizon_Emojis.Yes}", &yes),
        )
        .await?;
        return Ok(());
    }
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(format!("{gid}-backups"))
        .bind(backup_key(backup_id.trim()))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "backup_embed_title_succefully_deleted")
            .map(|s| s.replace("${client.iHorizon_Emojis.Yes}", &yes))
            .unwrap_or_else(|| {
                "${client.iHorizon_Emojis.Yes} The backup was successfully deleted!"
                    .replace("${client.iHorizon_Emojis.Yes}", &yes)
            }),
    )
    .await?;
    Ok(())
}
