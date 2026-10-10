use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "create",
    aliases("bcreate", "backup-create"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn backup_create(
    ctx: Ctx<'_>,
    #[description = "Save messages (yes/no)"] save_messages: Option<String>,
) -> Result<(), anyhow::Error> {
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
    // TS !create.ts: save-message "yes" -> 100 msgs/channel, else 0.
    let save_yes = save_messages
        .as_deref()
        .map(|s| s.eq_ignore_ascii_case("yes"))
        .unwrap_or(false);
    let opts = CreateOptions {
        backup_id: None,
        max_messages_per_channel: Some(if save_yes { 100 } else { 0 }),
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
    fn create_log_renders_user_slot() {
        assert_eq!(
            render_backup_create_log("<@${interaction.user.id}> created a backup!", 42),
            "<@42> created a backup!"
        );
    }
}
