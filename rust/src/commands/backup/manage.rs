use super::*;

/// Backup scope choice. Mirrors the `only_guild_owner` option
/// `choices` in backup.ts:132-153: slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum BackupScopeChoice {
    #[name = "owner"]
    #[name_localized("en-US", "Only owner")]
    #[name_localized("en-GB", "Only owner")]
    #[name_localized("fr", "Seulement le propriétaire")]
    #[name_localized("ja", "only_owner")]
    #[name_localized("ru", "only_owner")]
    #[name_localized("es-ES", "only_owner")]
    Owner,
    #[name = "admin"]
    #[name_localized("en-US", "All admin(s)")]
    #[name_localized("en-GB", "All admin(s)")]
    #[name_localized("fr", "Tous les administrateurs")]
    #[name_localized("ja", "all_admin_s")]
    #[name_localized("ru", "all_admin_s")]
    #[name_localized("es-ES", "all_admin_s")]
    Admin,
}

impl BackupScopeChoice {
    /// TS `value` compared in `!manage.ts:61`
    /// (`only_guild_owner == "owner"`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Owner => "owner",
            Self::Admin => "admin",
        }
    }
}

/// Restrict backups to guild owner. Mirrors !manage.ts (onlyOwner).
/// SCOPE VERDICT (S7, deliberate diverge, documented): TS reads the
/// scope word at `args[1]` — the SECOND word (`string(args, 1)` in
/// !manage.ts:50) — while the prefix dispatcher strips the command and
/// subcommand names first, so `args[0]` is already the first user word
/// (messageCommandHandler.ts:108-141, both the `backup-manager` direct
/// path and the `backup manage` subcommand path). A bare
/// `!backup-manager owner` therefore yields `args == ["owner"]`,
/// `args[1]` is undefined, and TS silently lands in the admin leg; only
/// a two-word invocation (`!backup-manager <anything> owner`) hits the
/// owner leg. Mirroring `args[1]` would replicate that off-by-one, so
/// the port keeps the first word: poise `Option<String>` binds the
/// first word after the subcommand, and only the exact `"owner"`
/// string enables owner-only — everything else (unknown words, missing
/// arg) falls into the admin leg, matching the TS slash choices
/// (`owner`/`admin`, `required: true`, backup.ts:230-253) and the TS
/// `only_guild_owner == "owner"` comparison (!manage.ts:61).
pub fn manage_owner_only(scope: Option<&str>) -> bool {
    scope == Some("owner")
}

/// Manage the backup system into this guild
#[poise::command(
    slash_command,
    prefix_command,
    rename = "manage",
    aliases("backup-manager"),
    description_localized("fr", "Gérer le système de backup sur le serveur"),
    description_localized("ja", "このサーバーのバックアップシステムを管理"),
    description_localized("ru", "Управление системой резервного копирования"),
    description_localized(
        "es-ES",
        "Gestionar el sistema de copias de seguridad en este servidor"
    )
)]
pub async fn backup_manage(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Faire fonctionner le système de backup uniquement pour le propriétaire du serveur discord.")]
    #[description_localized("ja", "バックアップシステムをサーバーオーナーのみに制限")]
    #[description_localized(
        "ru",
        "Сделать систему резервного копирования доступной только владельцу сервера"
    )]
    #[description_localized("es-ES", "Hacer que el sistema de copias de seguridad solo funcione para el propietario del servidor")]
    #[description = "Make the backup system only working for guild owner"]
    #[rename = "only_guild_owner"]
    scope: Option<BackupScopeChoice>,
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
    let owner_only = manage_owner_only(scope.map(|s| s.as_str()));
    // Dual-write (table handle primary, legacy kv row kept fresh),
    // mirroring the `bkp_set` routed pattern.
    super::backup::backup_only_owner_set(&ctx.data().pool, &gid, owner_only).await?;
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
    use super::BackupScopeChoice;

    #[test]
    fn scope_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = BackupScopeChoice::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            names,
            vec!["owner".to_string(), "admin".to_string()]
        );
        assert_eq!(BackupScopeChoice::Owner.as_str(), "owner");
        assert_eq!(BackupScopeChoice::Admin.as_str(), "admin");
        assert_eq!(
            BackupScopeChoice::from_name("owner"),
            Some(BackupScopeChoice::Owner)
        );
        assert_eq!(
            BackupScopeChoice::from_name("admin"),
            Some(BackupScopeChoice::Admin)
        );
        assert_eq!(BackupScopeChoice::from_name("everyone"), None);
        assert_eq!(
            BackupScopeChoice::from_index(0),
            Some(BackupScopeChoice::Owner)
        );
        assert_eq!(
            BackupScopeChoice::from_index(1),
            Some(BackupScopeChoice::Admin)
        );
        let list = BackupScopeChoice::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Seulement le propriétaire")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Tous les administrateurs")
        );
        assert_eq!(
            list[0].localizations.get("ja").map(String::as_str),
            Some("only_owner")
        );
        assert_eq!(
            list[1].localizations.get("es-ES").map(String::as_str),
            Some("all_admin_s")
        );
        assert_eq!(
            BackupScopeChoice::Owner.localized_name("fr"),
            Some("Seulement le propriétaire")
        );
    }

    #[test]
    fn scope_matches_ts_branches() {
        // Exact "owner" only (!manage.ts:61); unknown/missing -> admin.
        assert!(manage_owner_only(Some("owner")));
        assert!(!manage_owner_only(Some("admin")));
        assert!(!manage_owner_only(Some("OWNER")));
        assert!(!manage_owner_only(Some("whatever")));
        assert!(!manage_owner_only(None));
    }

    #[tokio::test]
    async fn manage_save_roundtrips_through_routed_flag() {
        // R4: the manage save path dual-writes via
        // `backup_only_owner_set`, so the routed read observes it.
        let pool = crate::db::memory_pool().await;
        super::backup::backup_only_owner_set(&pool, "g", manage_owner_only(Some("owner")))
            .await
            .unwrap();
        assert!(super::backup::backup_only_owner(&pool, "g").await);
        super::backup::backup_only_owner_set(&pool, "g", manage_owner_only(Some("admin")))
            .await
            .unwrap();
        assert!(!super::backup::backup_only_owner(&pool, "g").await);
    }
}
