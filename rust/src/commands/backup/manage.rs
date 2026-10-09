use super::*;

/// Restrict backups to guild owner. Mirrors !manage.ts (onlyOwner).
#[poise::command(slash_command, prefix_command, rename = "manage")]
pub async fn backup_manage(
    ctx: Ctx<'_>,
    #[description = "owner or admin"] scope: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Owner gate. Mirrors !manage.ts:53 (backup_manage_nique_tes_mort).
    let is_owner = ctx
        .guild()
        .map(|g| g.owner_id.get() == ctx.author().id.get())
        .unwrap_or(true);
    if !is_owner {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_manage_nique_tes_mort",
                "Access denied. This command is reserved for the server owner.\n# You cannot disable backup protection to compromise the server's security.\n# Any abuse attempt will be reported and blocked.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let owner_only = matches!(scope.to_ascii_lowercase().as_str(), "owner");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.BACKUP.onlyOwner",
        if owner_only { "1" } else { "0" },
    )
    .await?;
    // Mirrors the allowed_user_string switch in !manage.ts:72
    // (backup_manage_owner / backup_manage_admin).
    let allowed = crate::commands::lang_for(
        &ctx,
        if owner_only {
            "backup_manage_owner"
        } else {
            "backup_manage_admin"
        },
        if owner_only {
            "server owner"
        } else {
            "all administrators"
        },
    )
    .await;
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "backup_manage_command_ok",
            "The backup module has been updated. From now on, ${allowed_user_string} can perform backup creation/loading on this server.",
        )
        .await
        .replace("${allowed_user_string}", &allowed),
    )
    .await?;
    Ok(())
}
