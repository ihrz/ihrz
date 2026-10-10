use super::*;
use poise::serenity_prelude as serenity;

/// Save-messages budget. Mirrors !create.ts:70
/// (`svMsg === "yes" ? 100 : 0`): exact `"yes"` match, and a missing
/// prefix arg (None, no poise parse error) falls into the 0 leg like
/// the TS `string(args, 0)` undefined case.
pub fn save_messages_budget(save_messages: Option<&str>) -> u64 {
    if save_messages == Some("yes") {
        100
    } else {
        0
    }
}

/// Webhook URL or webhook code
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create",
    aliases("bcreate", "backup-create"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn backup_create(
    ctx: Ctx<'_>,
    #[description = "Save messages (yes/no)"]
    #[rename = "save-message"]
    save_messages: String,
) -> Result<(), anyhow::Error> {
    // Defer up front: the snapshot walks message pages plus per-emoji
    // image fetches, past the 3s interaction token (backup.ts:260
    // `thinking: true`).
    ctx.defer().await?;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Owner gate. Mirrors !create.ts:53 (GUILD.BACKUP.onlyOwner; unset
    // also means owner-only, like the TS `state === undefined` branch).
    // Clone out of the cache guard: the guard is not Send across awaits.
    let (is_owner, guild) = match ctx.guild() {
        Some(g) => (g.owner_id.get() == ctx.author().id.get(), Some(g.clone())),
        None => (false, None),
    };
    if super::backup::backup_only_owner(&ctx.data().pool, &gid).await && !is_owner {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "backup_manage_nique_tes_mort",
                "Access denied. This command is reserved for the server owner.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
    let Some(guild) = guild else {
        return legacy_config_backup(&ctx, &gid).await;
    };
    let opts = CreateOptions {
        backup_id: None,
        max_messages_per_channel: Some(save_messages_budget(Some(save_messages.as_str()))),
        json_save: Some(true),
        json_beautify: Some(true),
        do_not_backup: Some(vec![]),
        backup_members: Some(false),
        save_images: Some(true),
    };
    let id = gen_backup_id();
    let data = collect_backup_data(
        ctx.http(),
        &guild,
        &opts,
        &id,
        crate::commands::schedule::main::now_ms(),
    )
    .await;
    let json = serde_json::to_string(&data).unwrap_or_default();
    let infos = BackupInfos {
        id: id.clone(),
        size: backup_size_kb(json.len() as u64),
        data,
    };
    let stored = serde_json::to_string(&infos).unwrap_or_default();
    // Per-user ownership: mirrors the BACKUPS.<uid>.<id> write in !create.ts:89.
    let uid = ctx.author().id.get();
    super::backup::bkp_set(&ctx.data().pool, uid, &id, &stored).await?;
    // Shared snapshot row: mirrors the `backups`-table write in
    // src/core/backup/src/index.ts:300 (row ID = backupID, `json` =
    // bare BackupData) so TS load/delete paths see Rust-made backups.
    // Best-effort like the TS fire-and-forget: a missing table never
    // fails the create.
    let _ = crate::db::ensure_backups_table(&ctx.data().pool).await;
    let _ = crate::db::backup_set(&ctx.data().pool, &id, &json).await;
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "backup_command_work_on_creation",
            ":white_check_mark: Backup successfully created.",
        )
        .await,
    )
    .await?;
    ctx.say(
        crate::commands::lang_for(
            &ctx,
            "backup_command_work_info_on_creation",
            "The backup has been created! ID: `${backupData.id}`!",
        )
        .await
        .replace("${backupData.id}", &id),
    )
    .await?;
    // Creation audit embed after the snapshot is stored. Mirrors the
    // ihorizon_logs call in !create.ts:104-111.
    post_backup_create_log(&ctx).await;
    Ok(())
}

/// Render the creation audit-log description
/// (`backup_logs_embed_description_on_creation`).
pub fn render_backup_create_log(template: &str, user_id: u64) -> String {
    template.replace("${interaction.user.id}", &user_id.to_string())
}

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors ihorizon_logs.ts (best-effort, silent when
/// missing).
pub async fn post_backup_create_log(ctx: &Ctx<'_>) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let title =
        crate::commands::lang_for(ctx, "backup_logs_embed_title_on_creation", "Backup Logs").await;
    let description = render_backup_create_log(
        &crate::commands::lang_for(
            ctx,
            "backup_logs_embed_description_on_creation",
            "<@${interaction.user.id}> created a backup!",
        )
        .await,
        ctx.author().id.get(),
    );
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(serenity::Colour::new(0xbf0bb9))
        .title(title)
        .description(description);
    let _ = ch
        .id
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_budget_matches_ts_branches() {
        // Exact "yes" only (!create.ts:70); missing arg -> 0, no error.
        assert_eq!(save_messages_budget(Some("yes")), 100);
        assert_eq!(save_messages_budget(Some("no")), 0);
        assert_eq!(save_messages_budget(Some("YES")), 0);
        assert_eq!(save_messages_budget(None), 0);
    }

    #[test]
    fn create_log_renders_user_slot() {
        assert_eq!(
            render_backup_create_log("<@${interaction.user.id}> created a backup!", 42),
            "<@42> created a backup!"
        );
    }
}
