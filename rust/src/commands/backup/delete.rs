use super::*;
use poise::serenity_prelude as serenity;

/// Confirm embed color. Mirrors !delete.ts:91 (`#ff1100`).
pub const DELETE_INITIAL_COLOR: u32 = 0xff1100;
/// Confirmed-delete embed color. Mirrors !delete.ts:145 (`#6aa84f`).
pub const DELETE_DONE_COLOR: u32 = 0x6aa84f;
/// Cancel embed color. Mirrors !delete.ts:156 (`#0460a5`).
pub const DELETE_CANCEL_COLOR: u32 = 0x0460a5;
/// Expired-confirm embed color. Mirrors !delete.ts:170 (`#ce7e00`).
pub const DELETE_TIMESUP_COLOR: u32 = 0xce7e00;

/// Confirm collector wait. Mirrors !delete.ts:125 (`time: 15000`).
pub const DELETE_CONFIRM_SECS: u64 = 15;

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
    // Confirm embed with the stored snapshot stats. Mirrors the
    // EmbedBuilder in !delete.ts:84-98 (title + #ff1100 + field with
    // guild name, id and counts).
    let (guild_name, category_count, channel_count) = delete_snapshot_stats(raw.as_deref());
    let title = crate::commands::lang_for(
        &ctx,
        "backup_really_want",
        "${client.iHorizon_Emojis.Warning_Icon} Do you really want to delete this backup?",
    )
    .await
    .replace("${client.iHorizon_Emojis.Warning_Icon}", &warn);
    let field_value = render_delete_field(
        &crate::commands::lang_for(
            &ctx,
            "backup_string_see_v",
            ":placard:・Categories Count: `${data.categoryCount}`\n:hash:・Channels Count: `${data.channelCount}`",
        )
        .await,
        category_count,
        channel_count,
    );
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .colour(serenity::Colour::new(DELETE_INITIAL_COLOR))
        .timestamp(serenity::Timestamp::now())
        .field(
            delete_field_name(&guild_name, backup_id.trim()),
            field_value,
            false,
        );
    // Destructive delete needs an explicit yes. Mirrors the
    // backup-trash-button / backup-cancel-button collector in
    // !delete.ts:100-159 (confirm -> succefully_deleted, cancel ->
    // cancel_deletion, expiry -> timesup_deletion).
    let yes_label =
        crate::commands::lang_for(&ctx, "backup_confirm_button", "Yes, delete this backup").await;
    let no_label = crate::commands::lang_for(&ctx, "backup_cancel_button", "Cancel Action").await;
    let row = serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new("backup-trash-button")
            .style(serenity::ButtonStyle::Danger)
            .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
            .label(&yes_label),
        serenity::CreateButton::new("backup-cancel-button")
            .style(serenity::ButtonStyle::Primary)
            .label(&no_label),
    ]);
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(embed)
                .components(vec![row]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let pressed = msg
        .await_component_interaction(ctx.serenity_context().shard.clone())
        .timeout(std::time::Duration::from_secs(DELETE_CONFIRM_SECS))
        .filter(move |i| {
            i.user.id == author
                && (i.data.custom_id == "backup-trash-button"
                    || i.data.custom_id == "backup-cancel-button")
        })
        .await;
    // Acknowledge like the TS `deferUpdate()` so Discord does not
    // flag the interaction as failed.
    if let Some(pressed) = pressed.as_ref() {
        let _ = pressed
            .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
            .await;
    }
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let (title, color) = match pressed.as_ref().map(|i| i.data.custom_id.as_str()) {
        Some("backup-trash-button") => {
            super::backup::bkp_del(&ctx.data().pool, uid, backup_id.trim()).await?;
            (
                crate::commands::lang_for(
                    &ctx,
                    "backup_embed_title_succefully_deleted",
                    "${client.iHorizon_Emojis.Yes} The backup was successfully deleted!",
                )
                .await
                .replace("${client.iHorizon_Emojis.Yes}", &yes),
                DELETE_DONE_COLOR,
            )
        }
        Some("backup-cancel-button") => (
            crate::commands::lang_for(
                &ctx,
                "backup_embed_title_cancel_deletion",
                "${client.iHorizon_Emojis.Yes} The backup was kept!",
            )
            .await
            .replace("${client.iHorizon_Emojis.Yes}", &yes),
            DELETE_CANCEL_COLOR,
        ),
        // Collector expired with no answer: the backup is kept.
        // Mirrors the `end` handler in !delete.ts:161-172.
        _ => (
            crate::commands::lang_for(
                &ctx,
                "backup_embed_title_timesup_deletion",
                "${client.iHorizon_Emojis.No} Time's UP. The backup was kept!",
            )
            .await
            .replace("${client.iHorizon_Emojis.No}", &no),
            DELETE_TIMESUP_COLOR,
        ),
    };
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .embed(
                    serenity::CreateEmbed::default()
                        .title(title)
                        .colour(serenity::Colour::new(color)),
                )
                .components(vec![]),
        )
        .await;
    Ok(())
}

/// Confirm field name. Mirrors !delete.ts:94
/// (``${guildName} - (||${backupID}||)``).
pub fn delete_field_name(guild_name: &str, backup_id: &str) -> String {
    format!("{guild_name} - (||{backup_id}||)")
}

/// Render the confirm field value (`backup_string_see_v`).
pub fn render_delete_field(template: &str, category_count: usize, channel_count: usize) -> String {
    template
        .replace("${data.categoryCount}", &category_count.to_string())
        .replace("${data.channelCount}", &channel_count.to_string())
}

/// Snapshot stats for the confirm field, read back from the stored
/// BackupInfos (guild name + category/channel counts). Falls back
/// to the id with zero counts when the snapshot is missing or
/// unreadable.
pub fn delete_snapshot_stats(stored: Option<&str>) -> (String, usize, usize) {
    let parsed = stored
        .and_then(|s| serde_json::from_str::<crate::backup_types::BackupInfos>(s).ok())
        .map(|infos| {
            let cats = infos.data.channels.categories.len();
            let chans: usize = infos
                .data
                .channels
                .categories
                .iter()
                .map(|c| c.children.len())
                .sum();
            (infos.data.name, cats, chans)
        })
        .unwrap_or_default();
    if parsed.0.is_empty() {
        (stored.unwrap_or_default().to_string(), 0, 0)
    } else {
        parsed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn outcome_colors_match_ts() {
        assert_eq!(DELETE_INITIAL_COLOR, 0xff1100);
        assert_eq!(DELETE_DONE_COLOR, 0x6aa84f);
        assert_eq!(DELETE_CANCEL_COLOR, 0x0460a5);
        assert_eq!(DELETE_TIMESUP_COLOR, 0xce7e00);
        assert_eq!(DELETE_CONFIRM_SECS, 15);
    }

    #[test]
    fn field_renders_name_and_counts() {
        assert_eq!(delete_field_name("Guild", "abc"), "Guild - (||abc||)");
        assert_eq!(
            render_delete_field(
                "cats `${data.categoryCount}` chans `${data.channelCount}`",
                2,
                5
            ),
            "cats `2` chans `5`"
        );
    }

    #[test]
    fn snapshot_stats_fallback_on_garbage() {
        assert_eq!(delete_snapshot_stats(None), (String::new(), 0, 0));
        assert_eq!(
            delete_snapshot_stats(Some("not json")),
            ("not json".to_string(), 0, 0)
        );
    }
}
