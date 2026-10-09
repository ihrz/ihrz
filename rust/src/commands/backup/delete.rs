use super::*;

#[poise::command(slash_command, prefix_command, rename = "delete")]
pub async fn backup_delete(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: String,
) -> Result<(), anyhow::Error> {
    // Ownership gate first, like the BACKUPS.<uid>.<id> check in
    // !delete.ts:59 (strangers get backup_this_is_not_your_backup).
    let uid = ctx.author().id.get();
    let raw = super::backup::bkp_get(&ctx.data().pool, uid, backup_id.trim()).await;
    if !backup_id.trim().is_empty() && raw.is_none() {
        let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_this_is_not_your_backup",
                "${client.iHorizon_Emojis.No} | This is not your backup!",
            )
            .await
            .replace("${client.iHorizon_Emojis.No}", &no),
        )
        .await?;
        return Ok(());
    }
    // Existence gate next, like the data_2 check in !delete.ts:77.
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
    super::backup::bkp_del(&ctx.data().pool, uid, backup_id.trim()).await?;
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
