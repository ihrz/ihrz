use super::*;

/// List embed color. Mirrors !list.ts:123 (`#bf0bb9`).
pub const BACKUP_LIST_COLOR: u32 = 0xbf0bb9;

/// Author name with member display-name fallback. Mirrors
/// !list.ts:117-121 (`username || displayName`).
pub fn list_author_name(username: &str, display_name: Option<&str>) -> String {
    if username.trim().is_empty() {
        display_name.unwrap_or_default().to_string()
    } else {
        username.to_string()
    }
}

/// Trimmed backup id to ownership-check, or None when no gate
/// applies. Mirrors the `backupID &&` truthiness in !list.ts:64-65
/// (missing/blank ids skip the gate and render the full list).
pub fn list_gate_id(backup_id: Option<&str>) -> Option<&str> {
    backup_id.map(str::trim).filter(|s| !s.is_empty())
}

/// List all sticky channels
#[poise::command(slash_command, prefix_command, rename = "list", aliases("backup-list"))]
pub async fn backup_list(
    ctx: Ctx<'_>,
    // Option (not required): TS reads `getString("backup-id")` /
    // `string(args, 0)` (both nullable, !list.ts:58-62) while the list
    // leaf registers no slash option (backup.ts), so this only ever
    // fills on the prefix path. A given-but-unowned id answers
    // `backup_this_is_not_your_backup` like !list.ts:64-77; the id
    // never selects a detail view (TS always renders the full list).
    #[description = "Backup id (ownership check only)"]
    #[rename = "backup-id"]
    backup_id: Option<String>,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let uid = ctx.author().id.get();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Prefix ownership gate. Mirrors !list.ts:64-77 (`backupID &&
    // !get(BACKUPS.<uid>.<backupID>)` -> backup_this_is_not_your_backup).
    // ADOPT (recorded): strict per-user check only, no owner/admin
    // shared-table fallback (unlike load.rs) — TS has none here either.
    if let Some(owned) = list_gate_id(backup_id.as_deref()) {
        if super::backup::bkp_get(&ctx.data().pool, uid, owned)
            .await
            .is_none()
        {
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
    }
    // Member display-name fallback, like `username || displayName` in
    // !list.ts:117-121. Icon stays a snapshot file (never a raw CDN
    // URL), like the `user_icon.png` file in !list.ts:173-179
    // (confession download_bytes pattern). Deliberate keep: when the
    // download fails TS still attaches an empty `user_icon.png`
    // (broken file); the port drops the icon reference instead so no
    // dangling attachment is rendered.
    let member_display = ctx
        .author_member()
        .await
        .map(|m| m.display_name().to_string());
    let author_label = list_author_name(&ctx.author().name, member_display.as_deref());
    let mut author = serenity::CreateEmbedAuthor::new(author_label.clone())
        .icon_url("attachment://user_icon.png");
    let mut author_files: Vec<serenity::CreateAttachment> = vec![];
    if let Some(url) = ctx.author().avatar_url() {
        if let Some(bytes) = crate::commands::shared::download_bytes(&url).await {
            author_files.push(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
        } else {
            author = serenity::CreateEmbedAuthor::new(author_label.clone());
        }
    } else {
        author = serenity::CreateEmbedAuthor::new(author_label.clone());
    }

    // Paginated per-user list, 5 per page (itemsPerPage in !list.ts:37).
    // NOTE: the list subcommand registers no backup-id option in
    // backup.ts, so the Option param above only fills on the prefix
    // path (!list.ts:58-77 gates ownership there too); it never renders
    // a single-backup view, so there is no detail branch here either.
    let rows = super::backup::bkp_scan_user(&ctx.data().pool, uid).await;
    let tpl = crate::lang::get(&code, "backup_string_see_another_v").unwrap_or_else(|| {
        ":placard:・Categories Count: `${result.categoryCount}`\n:hash:・Channels Count: `${result.channelCount}`"
            .to_string()
    });
    let fields: Vec<(String, String)> = rows
        .iter()
        .map(|(id, raw)| match super::backup::backup_summary(raw) {
            Some((name, cats, chans)) => super::backup::backup_field(&name, id, cats, chans, &tpl),
            None => (id.clone(), String::new()),
        })
        .collect();
    // Mirrors the generateEmbed description switch in !list.ts:110
    // (all_of_your_backup vs backup_doesnt_exist).
    let head = if fields.is_empty() {
        crate::lang::get(&code, "backup_backup_doesnt_exist")
            .unwrap_or_else(|| "Error: this backup doesn't exist.".to_string())
    } else {
        crate::lang::get(&code, "backup_all_of_your_backup")
            .unwrap_or_else(|| "**All of your backups:**".to_string())
    };
    let total_pages = super::backup::page_count(fields.len());
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let mk_embed = |page: usize| {
        let footer = crate::commands::shared::footer_page_text(
            &fname,
            &page_word,
            if fields.is_empty() {
                1
            } else {
                (page + 1) as u64
            },
            total_pages.max(1) as u64,
        );
        let mut embed = serenity::CreateEmbed::default()
            .description(head.clone())
            .colour(serenity::Colour::new(BACKUP_LIST_COLOR))
            .author(author.clone())
            .footer(
                serenity::CreateEmbedFooter::new(footer).icon_url(if fbytes.is_some() {
                    "attachment://footer_icon.png".to_string()
                } else {
                    String::new()
                }),
            )
            .timestamp(serenity::Timestamp::now());
        for (name, value) in fields
            .iter()
            .skip(page * super::backup::BACKUPS_PER_PAGE)
            .take(super::backup::BACKUPS_PER_PAGE)
        {
            embed = embed.field(name.clone(), value.clone(), false);
        }
        embed
    };
    // Mirrors generateButtons in !list.ts:145 (<<< / >>>, Secondary).
    let mk_row = |page: usize| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("backup-list-prev")
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(page == 0 || fields.is_empty()),
            serenity::CreateButton::new("backup-list-next")
                .style(serenity::ButtonStyle::Secondary)
                .label(">>>")
                .disabled(page + 1 >= total_pages || fields.is_empty()),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0))
        .components(vec![mk_row(0)]);
    if let Some(bytes) = fbytes.clone() {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    // Mirrors the `user_icon.png` file in !list.ts:171-179.
    for file in author_files {
        reply = reply.attachment(file);
    }
    let handle = ctx.send(reply).await?;
    if fields.is_empty() {
        return Ok(());
    }
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    // Mirrors the 60s button collector in !list.ts:189.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60))
            .await;
        let Some(press) = press else { break };
        // Deliberate keep: TS steps the page without bounds
        // (!list.ts:192-203, prev on page 0 renders an empty slice);
        // the port clamps so the pager never shows a blank page.
        // S8: TS updates on every press (!list.ts:192-203, no filter),
        // so unknown buttons get an ack-and-ignore here instead of a
        // bare `continue`, which would leave the press unanswered
        // ("interaction failed").
        match press.data.custom_id.as_str() {
            "backup-list-prev" => page = page.saturating_sub(1),
            "backup-list-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            _ => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                continue;
            }
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(page))
                        .components(vec![mk_row(page)]),
                ),
            )
            .await;
    }
    // Clear the row when the collector ends, like the TS end handler.
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn author_falls_back_to_display_name_like_ts() {
        // `username || displayName` in !list.ts:117-121.
        assert_eq!(list_author_name("Kisakay", Some("Kisa")), "Kisakay");
        assert_eq!(list_author_name("", Some("Kisa")), "Kisa");
        assert_eq!(list_author_name("  ", None), "");
        assert_eq!(list_author_name("", None), "");
    }

    #[test]
    fn gate_id_trims_and_skips_blank_like_ts() {
        // `backupID &&` in !list.ts:64-65.
        assert_eq!(list_gate_id(Some("abc")), Some("abc"));
        assert_eq!(list_gate_id(Some("  abc  ")), Some("abc"));
        assert_eq!(list_gate_id(None), None);
        assert_eq!(list_gate_id(Some("")), None);
        assert_eq!(list_gate_id(Some("   ")), None);
    }
}
