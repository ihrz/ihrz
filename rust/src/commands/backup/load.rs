use super::*;

/// D3-BACKUP: snapshot reads go through `bkp_get` (named `backups`
/// table primary, legacy per-user kv fallback). TS stores full guild
/// snapshots in the `backups` table (row ID = backupID, `json` = bare
/// BackupData) via src/core/backup/src/index.ts:300, while metasTable
/// only holds per-user `{guildName, categoryCount, channelCount}`
/// pointers (!create.ts:89).
///
/// One snapshot shape for the restore path below. Rust kv rows store
/// BackupInfos; TS `backups`-table rows store the bare BackupData, so wrap
/// the latter (size unknown -> 0.0; only used for display upstream).
fn normalize_snapshot(snap: &serde_json::Value) -> Option<BackupInfos> {
    if let Ok(infos) = serde_json::from_value::<BackupInfos>(snap.clone()) {
        return Some(infos);
    }
    let data: BackupData = serde_json::from_value(snap.clone()).ok()?;
    Some(BackupInfos {
        id: data.id.clone(),
        size: 0.0,
        data,
    })
}

/// Load your backup to initialize!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "load",
    // No "restore" alias: TS only registers the backup-load prefix
    // name (backup.ts prefixName), so the port keeps backup-load alone.
    aliases("backup-load"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn backup_load(
    ctx: Ctx<'_>,
    #[description = "Backup id"]
    #[rename = "backup-id"]
    backup_id: String,
) -> Result<(), anyhow::Error> {
    // Defer up front: the restore rewrites roles/channels/emojis/bans,
    // past the 3s interaction token (backup.ts:260 `thinking: true`).
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Owner gate. Mirrors !load.ts:57 (GUILD.BACKUP.onlyOwner; unset also
    // means owner-only, like the TS `state === undefined` branch).
    if super::backup::backup_only_owner(&ctx.data().pool, &gid).await {
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
    }
    // Bot Administrator precheck. Mirrors the members.me gate in !load.ts:72.
    if !super::backup::bot_is_guild_admin(&ctx).await {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_i_dont_have_perm_on_load",
                "I don't have permission `ADMINISTRATOR`",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    if backup_id.trim().is_empty() {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_unvalid_id_on_load",
                ":x: | You must specify a valid backup ID!",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    // Per-user ownership. Mirrors the BACKUPS.<uid>.<id> check in
    // !load.ts:90 (strangers get backup_this_is_not_your_backup).
    // `bkp_get` reads the named `backups` table first with the legacy
    // per-user kv row as fallback, so TS-created snapshots (shared row
    // only) stay loadable; `bkp_owns` keeps the stranger gate strict
    // because a shared-table row alone never proves ownership. Kept
    // deliberately: without the owner/admin fallback, snapshots taken
    // by the TS bot would be unloadable from the port.
    let uid = ctx.author().id.get();
    // Trimmed (deliberate keep): TS matches the raw id verbatim, but
    // slash/prefix input often carries stray whitespace; trimming only
    // widens exact-id hits, never mismatches.
    let id = backup_id.trim();
    let raw = if super::backup::bkp_owns(&ctx.data().pool, uid, id).await
        || super::backup::invoker_is_owner_or_admin(&ctx).await
    {
        super::backup::bkp_get(&ctx.data().pool, uid, id).await
    } else {
        None
    };
    let Some(raw) = raw else {
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
    };
    // Fetch failure mirrors the fetchBackup().catch leg in !load.ts:145
    // (console.error + bare No-emoji channel message): the row exists
    // but is not even JSON, so there is nothing to restore.
    let snap: serde_json::Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("backup {id} snapshot unreadable: {e}");
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.channel_id().say(ctx.http(), no).await?;
            return Ok(());
        }
    };
    // Destructive restore needs an explicit yes. Mirrors the
    // promptYesOrNo gate in backup/!load.ts (abort -> backup_not_load).
    let content = crate::commands::lang_for(
        &ctx,
        "backup_load_confirm",
        "${interaction.member.user.toString()},\n# EXTREMELY DANGEROUS ACTION\n# Are you sure you want to load this backup?\nThis will replace all current channels, roles, emojis, bans, configuration... of your server.\nTHIS ACTION IS IRREVERSIBLE!",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &ctx.author().to_string(),
    );
    let yes = crate::commands::lang_for(&ctx, "var_confirm", "Confirm").await;
    let no = crate::commands::lang_for(&ctx, "embed_btn_cancel", "Cancel").await;
    if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, true).await? {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_not_load",
                "The backup was not loaded, the action was canceled at your request.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    // G11: the `{entries}` kv-dump shape IS written by Rust
    // (`legacy_config_backup` in backup/mod.rs, the no-guild-cache
    // path of create), so this branch stays: it restores those dumps
    // key by key.
    let entries = snap
        .get("entries")
        .and_then(|e| e.as_array())
        .cloned()
        .unwrap_or_default();
    if entries.is_empty() {
        // Full guild snapshots (BackupInfos) restore Discord objects via
        // U-BACKUP-LOAD recreation (never a kv merge). TS `backups`-table
        // rows hold the bare BackupData, so normalize first.
        if let Some(infos) = normalize_snapshot(&snap) {
            let Some(guild_id) = ctx.guild_id() else {
                return Ok(());
            };
            let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
                .await
                .unwrap_or_else(|| "✅".to_string());
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "backup_waiting_on_load",
                    "${client.iHorizon_Emojis.Yes} - Loading...",
                )
                .await
                .replace("${client.iHorizon_Emojis.Yes}", &yes),
            )
            .await?;
            let opts = crate::commands::backup_restore::default_load_options();
            // TS !load.ts sends no success message after the restore
            // (only the waiting notice before it), so stay silent here.
            let _ = crate::commands::backup_restore::restore_backup(
                ctx.http(),
                guild_id,
                &infos.data,
                &opts,
            )
            .await;
            return Ok(());
        }
        // Corrupt snapshot: neither kv entries nor a guild backup.
        // Mirrors the backup_error_on_load catch in !load.ts:137.
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_error_on_load",
                ":x: | Sorry, an error occurred... Please check that I have administrator permissions!",
            )
            .await
            .replace("${backupID}", backup_id.trim()),
        )
        .await?;
        return Ok(());
    }
    let mut restored = 0;
    for e in entries {
        if let (Some(k), Some(v)) = (
            e.get("k").and_then(|x| x.as_str()),
            e.get("v").and_then(|x| x.as_str()),
        ) {
            crate::db::kv_set(&ctx.data().pool, &gid, k, v).await?;
            restored += 1;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_restored_keys")
            .map(|s| s.replace("{restored}", &restored.to_string()))
            .unwrap_or_else(|| format!("Restored {restored} keys.")),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::super::backup::{bkp_get, bkp_owns, bkp_set};
    use super::normalize_snapshot;

    /// Minimal TS `backups`-table row: the bare BackupData written by
    /// src/core/backup/src/index.ts:300 (no id/size/data wrapper).
    fn ts_backup_data(id: &str) -> String {
        serde_json::json!({
            "name": "TS Guild",
            "verificationLevel": 2,
            "explicitContentFilter": 1,
            "defaultMessageNotifications": 0,
            "widget": { "enabled": false },
            "channels": { "categories": [], "others": [] },
            "roles": [],
            "bans": [],
            "emojis": [],
            "members": [],
            "createdTimestamp": 1700000000000i64,
            "guildID": "111",
            "id": id
        })
        .to_string()
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn bare_backup_data_wraps_like_ts_fetch() {
        // fetchBackup wraps BackupData into {data, id, size}; load must
        // accept the bare row the same way.
        let snap: serde_json::Value = serde_json::from_str(&ts_backup_data("ts1")).unwrap();
        assert!(snap.get("entries").is_none());
        let infos = normalize_snapshot(&snap).expect("TS row normalizes");
        assert_eq!(infos.id, "ts1");
        assert_eq!(infos.data.guild_id, "111");
        assert_eq!(infos.data.name, "TS Guild");
    }

    #[test]
    fn rust_kv_snapshot_passes_through() {
        let snap = serde_json::json!({
            "id": "kv1",
            "size": 1.5,
            "data": {
                "name": "Kv Guild",
                "verificationLevel": 0,
                "explicitContentFilter": 0,
                "defaultMessageNotifications": 0,
                "widget": { "enabled": false },
                "channels": { "categories": [], "others": [] },
                "roles": [],
                "bans": [],
                "emojis": [],
                "members": [],
                "createdTimestamp": 0,
                "guildID": "222",
                "id": "kv1"
            }
        });
        let infos = normalize_snapshot(&snap).expect("kv row normalizes");
        assert_eq!((infos.id.as_str(), infos.size), ("kv1", 1.5));
        assert!(normalize_snapshot(&serde_json::json!({"entries": []})).is_none());
        assert!(normalize_snapshot(&serde_json::json!({"nonsense": true})).is_none());
    }

    #[tokio::test]
    async fn ts_table_missing_means_no_fallback_row() {
        // Fresh Rust-only db has no TS `backups` table and no kv row:
        // `bkp_get` is None, never an error (mirrors fetchBackup
        // rejecting -> not-your-backup).
        let pool = mem_pool().await;
        assert_eq!(bkp_get(&pool, 7, "whatever").await, None);
    }

    #[tokio::test]
    async fn ts_table_row_reads_by_global_id() {
        // Seed-then-read through the driver: backup_set writes the TS
        // `backups` row, `bkp_get` reads it back by global ID even with
        // no per-user kv row (TS-created snapshot, owner/admin path).
        let pool = mem_pool().await;
        crate::db::ensure_backups_table(&pool).await.unwrap();
        crate::db::backup_set(&pool, "snowflake19", &ts_backup_data("snowflake19"))
            .await
            .unwrap();
        let raw = bkp_get(&pool, 99, "snowflake19").await;
        assert_eq!(raw.as_deref(), Some(ts_backup_data("snowflake19").as_str()));
        assert!(!bkp_owns(&pool, 99, "snowflake19").await);
        assert_eq!(bkp_get(&pool, 99, "other-id").await, None);
    }

    #[tokio::test]
    async fn shared_table_wins_with_kv_fallback() {
        // D3-BACKUP resolution order used by backup_load: named table
        // first (fresher: TS-side edits only touch the table), legacy kv
        // row fallback, None when neither exists.
        let pool = mem_pool().await;
        bkp_set(&pool, 7, "both", "kv-row").await.unwrap();
        crate::db::backup_set(&pool, "both", "ts-row")
            .await
            .unwrap();
        assert_eq!(bkp_get(&pool, 7, "both").await.as_deref(), Some("ts-row"));
        // Legacy-only row (kv, no table row) still surfaces.
        crate::db::kv_set(&pool, "0", "BACKUPS.8.legacy", "kv-only")
            .await
            .unwrap();
        assert_eq!(
            bkp_get(&pool, 8, "legacy").await.as_deref(),
            Some("kv-only")
        );
        // Neither kv row nor TS row -> None.
        assert_eq!(bkp_get(&pool, 9, "neither").await, None);
    }
}
