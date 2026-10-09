use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "load",
    aliases("restore"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn backup_load(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Owner gate. Mirrors !load.ts (GUILD.BACKUP.onlyOwner; unset also
    // means owner-only, like the TS `state === undefined` branch).
    let only_owner = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.BACKUP.onlyOwner")
        .await
        .as_deref()
        != Some("0");
    if only_owner {
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
    let raw = super::backup::bkp_get(&ctx.data().pool, &gid, backup_id.trim()).await;
    let Some(raw) = raw else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "backup_backup_doesnt_exist")
                .unwrap_or_else(|| "Error: this backup doesn't exist.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let snap: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
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
    let entries = snap
        .get("entries")
        .and_then(|e| e.as_array())
        .cloned()
        .unwrap_or_default();
    if entries.is_empty() {
        // Full guild snapshots (BackupInfos) restore Discord objects via
        // U-BACKUP-LOAD recreation (never a kv merge).
        if let Ok(infos) = serde_json::from_value::<BackupInfos>(snap.clone()) {
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
            let (roles, channels, emojis, bans) = crate::commands::backup_restore::restore_backup(
                ctx.http(),
                guild_id,
                &infos.data,
                &opts,
            )
            .await;
            ctx.say(format!(
                "Restored {roles} roles, {channels} channels, {emojis} emojis, {bans} bans."
            ))
            .await?;
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
