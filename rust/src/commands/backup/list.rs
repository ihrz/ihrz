use super::*;

/// List pager customIds. Byte-exact with !list.ts:148-153
/// (`previous` / `next`, Secondary, `<<<` / `>>>`).
pub const LIST_PREV_ID: &str = "previous";
pub const LIST_NEXT_ID: &str = "next";

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

/// Bounded icon download. `shared::download_bytes` has no timeout, so a
/// stalled connection would hold this (already deferred) handler past
/// any caller's patience and the list would never ack; a slow icon
/// degrades to no icon exactly like a failed download (the
/// no-`icon_url` branch below).
async fn bounded_download(url: &str) -> Option<Vec<u8>> {
    tokio::time::timeout(
        std::time::Duration::from_secs(8),
        crate::commands::shared::download_bytes(url),
    )
    .await
    .ok()
    .flatten()
}

/// List your backup(s)!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    aliases("backup-list"),
    name_localized("fr", "listé"),
    name_localized("ja", "list"),
    name_localized("ru", "list"),
    name_localized("es-ES", "list"),
    description_localized("fr", "Listé toute vos backup(s)"),
    description_localized("ja", "バックアップを一覧表示！"),
    description_localized("ru", "Показать ваши резервные копии!"),
    description_localized("es-ES", "Listar tus copias de seguridad!")
)]
pub async fn backup_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let uid = ctx.author().id.get();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // The list leaf registers no option in backup.ts and always renders
    // the full per-user list (no single-backup detail branch).
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
        if let Some(bytes) = bounded_download(&url).await {
            author_files.push(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
        } else {
            author = serenity::CreateEmbedAuthor::new(author_label.clone());
        }
    } else {
        author = serenity::CreateEmbedAuthor::new(author_label.clone());
    }

    // Paginated per-user list, 5 per page (itemsPerPage in !list.ts:37).
    let rows = super::backup::bkp_scan_user(&ctx.data().pool, uid).await;
    let tpl = crate::lang::get(&code, "backup_string_see_another_v").unwrap_or_else(|| {
        ":placard:・Categories Count: `${result.categoryCount}`\n:hash:・Channels Count: `${result.channelCount}`"
            .to_string()
    });
    let fields: Vec<(String, String)> = rows
        .iter()
        // Skip unreadable rows like the `if (result)` guard in
        // !list.ts:100: an empty field value is rejected by the
        // Discord API, so one corrupt row must not break the reply.
        .filter_map(|(id, raw)| {
            super::backup::backup_summary(raw).map(|(name, cats, chans)| {
                super::backup::backup_field(&name, id, cats, chans, &tpl)
            })
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
    let (fname, fbytes) = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        crate::commands::shared::footer_parts(&ctx, &gid),
    )
    .await
    .unwrap_or_else(|_| (crate::commands::shared::bot_footer_name(None), None));
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
            .author(author.clone());
        // No icon means omit the icon reference entirely: an empty-string
        // icon_url would be a dangling reference, and attaching the file
        // without a reference would render it as an orphan attachment.
        embed = if fbytes.is_some() {
            embed.footer(
                serenity::CreateEmbedFooter::new(footer).icon_url("attachment://footer_icon.png"),
            )
        } else {
            embed.footer(serenity::CreateEmbedFooter::new(footer))
        };
        embed = embed.timestamp(serenity::Timestamp::now());
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
            serenity::CreateButton::new(LIST_PREV_ID)
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(page == 0 || fields.is_empty()),
            serenity::CreateButton::new(LIST_NEXT_ID)
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
            id if id == LIST_PREV_ID => page = page.saturating_sub(1),
            id if id == LIST_NEXT_ID => {
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
    fn pager_ids_are_byte_exact_with_ts() {
        // !list.ts:148-153 (`previous` / `next`); every other Rust
        // pager (banlist, allwebhooks, tag/list) already uses these.
        assert_eq!(LIST_PREV_ID, "previous");
        assert_eq!(LIST_NEXT_ID, "next");
    }

    #[test]
    fn author_falls_back_to_display_name_like_ts() {
        // `username || displayName` in !list.ts:117-121.
        assert_eq!(list_author_name("Kisakay", Some("Kisa")), "Kisakay");
        assert_eq!(list_author_name("", Some("Kisa")), "Kisa");
        assert_eq!(list_author_name("  ", None), "");
        assert_eq!(list_author_name("", None), "");
    }

    #[tokio::test]
    async fn bounded_download_gives_up_like_a_failed_fetch() {
        // Nothing listens on the discard port: connection refused must
        // resolve to None well inside the 8s bound (a stalled icon
        // degrades to no icon instead of holding the ack).
        let out = tokio::time::timeout(
            std::time::Duration::from_secs(15),
            super::bounded_download("http://127.0.0.1:9/user_icon.png"),
        )
        .await
        .expect("bounded download resolves inside its own bound");
        assert!(out.is_none());
    }
}
