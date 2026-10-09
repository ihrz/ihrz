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
    let owner_only = matches!(scope.to_ascii_lowercase().as_str(), "owner");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.BACKUP.onlyOwner",
        if owner_only { "1" } else { "0" },
    )
    .await?;
    ctx.say(if owner_only {
        "Backups restricted to guild owner."
    } else {
        "Backups open to admins."
    })
    .await?;
    Ok(())
}
