use super::*;

/// Restrict backups to guild owner. Mirrors !manage.ts (onlyOwner).
/// Owner-only scope resolution. Mirrors !manage.ts:61-65: slash offers
/// only the `owner`/`admin` choices (backup.ts:230-251), and the prefix
/// path reads the raw word at args[1] (`string(args, 1)`); only the
/// exact `"owner"` string enables owner-only, everything else
/// (unknown words, missing arg) falls into the admin leg.
pub fn manage_owner_only(scope: Option<&str>) -> bool {
    scope == Some("owner")
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "manage",
    aliases("backup-manager")
)]
pub async fn backup_manage(
    ctx: Ctx<'_>,
    #[description = "owner or admin"]
    #[rename = "only_guild_owner"]
    scope: Option<String>,
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
    let owner_only = manage_owner_only(scope.as_deref());
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

#[cfg(test)]
mod tests {
    use super::manage_owner_only;

    #[test]
    fn scope_matches_ts_branches() {
        // Exact "owner" only (!manage.ts:61); unknown/missing -> admin.
        assert!(manage_owner_only(Some("owner")));
        assert!(!manage_owner_only(Some("admin")));
        assert!(!manage_owner_only(Some("OWNER")));
        assert!(!manage_owner_only(Some("whatever")));
        assert!(!manage_owner_only(None));
    }
}
