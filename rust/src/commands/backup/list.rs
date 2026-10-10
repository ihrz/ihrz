use super::*;

/// List embed color. Mirrors !list.ts:123 (`#bf0bb9`).
pub const BACKUP_LIST_COLOR: u32 = 0xbf0bb9;

#[poise::command(slash_command, prefix_command, rename = "list", aliases("backup-list"))]
pub async fn backup_list(
    ctx: Ctx<'_>,
    #[description = "Backup id"] backup_id: Option<String>,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let uid = ctx.author().id.get();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Author icon snapshot, like the `user_icon.png` file in !list.ts:173-179
    // (confession download_bytes pattern; never a raw CDN URL).
    let mut author = serenity::CreateEmbedAuthor::new(ctx.author().name.clone())
        .icon_url("attachment://user_icon.png");
    let mut author_files: Vec<serenity::CreateAttachment> = vec![];
    if let Some(url) = ctx.author().avatar_url() {
        if let Some(bytes) = crate::commands::shared::download_bytes(&url).await {
            author_files.push(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
        } else {
            author = serenity::CreateEmbedAuthor::new(ctx.author().name.clone());
        }
    } else {
        author = serenity::CreateEmbedAuthor::new(ctx.author().name.clone());
    }

    // Backup-id detail view. Mirrors the BACKUPS.<uid>.<id> gate in
    // !list.ts:64 (strangers get backup_this_is_not_your_backup).
    if let Some(id) = backup_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        let Some(raw) = super::backup::bkp_get(&ctx.data().pool, uid, id).await else {
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
        let (name, cats, chans) =
            super::backup::backup_summary(&raw).unwrap_or_else(|| (id.to_string(), 0, 0));
        let tpl = crate::lang::get(&code, "backup_string_see_v").unwrap_or_else(|| {
            ":placard:・Categories Count: `${data.categoryCount}`\n:hash:・Channels Count: `${data.channelCount}`"
                .to_string()
        });
        let embed = serenity::CreateEmbed::default()
            .title(format!("{name} - (||{id}||)"))
            .description(super::backup::backup_detail_value(cats, chans, &tpl))
            .colour(serenity::Colour::new(BACKUP_LIST_COLOR))
            .author(author.clone())
            .timestamp(serenity::Timestamp::now());
        let mut reply = poise::CreateReply::default().embed(embed);
        for file in author_files.clone() {
            reply = reply.attachment(file);
        }
        ctx.send(reply).await?;
        return Ok(());
    }

    // Paginated per-user list, 5 per page (itemsPerPage in !list.ts:37).
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
        match press.data.custom_id.as_str() {
            "backup-list-prev" => page = page.saturating_sub(1),
            "backup-list-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            _ => continue,
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
