use super::*;

/// Collector lifetime, mirroring TS `time: 60_000 * 15` (15 minutes).
pub const HISTORY_COLLECTOR_SECS: u64 = 900;

/// Wrap-around page step, mirroring the TS collect leg
/// (`(currentPage ± 1 + pages.length) % pages.length`).
pub fn step_history_page(current: usize, pages: usize, next: bool) -> usize {
    if pages == 0 {
        return 0;
    }
    if next {
        (current + 1) % pages
    } else {
        (current + pages - 1) % pages
    }
}

/// Mirrors `!history.ts`: 30d TTL purge on read, 10/page embed,
/// `.txt` export, delete action.
///
/// TS parity record (music.ts): `history` carries
/// `permission: PermissionFlagsBits.Administrator` while every other
/// music subcommand is `permission: null`. Slash parity comes from
/// `default_member_permissions` below; prefix commands bypass
/// Discord's gate, so non-admins are refused again at runtime.
///
/// The `page` / `clear` params set the initial page and the wipe path;
/// previous/next/delete buttons drive an invoker-only collector on top.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "history",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn m_history(
    ctx: Ctx<'_>,
    #[description = "Page number"] page: Option<i64>,
    #[description = "Delete the history"] clear: Option<bool>,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    if !caller_is_admin(&ctx).await {
        say_key(
            &ctx,
            &code,
            "music_history_no_permission",
            "You need the Administrator permission to view the music history.",
        )
        .await?;
        return Ok(());
    };
    let key = gid.to_string();
    let now = now_ms();
    let raw = crate::db::kv_get(&ctx.data().pool, &key, HISTORY_KEY).await;
    let (list, was_legacy) = raw
        .as_deref()
        .map(|s| decode_history(s, now))
        .unwrap_or_default();
    let total = list.len();
    let list = prune_history(list, now);
    // Persist TTL purges and the one-time TS `{embed, buffer}` migration.
    if raw.is_some() && (was_legacy || list.len() != total) {
        if let Ok(json) = serde_json::to_string(&list) {
            let _ = crate::db::kv_set(&ctx.data().pool, &key, HISTORY_KEY, &json).await;
        }
    }

    if clear == Some(true) {
        let _ = crate::db::kv_del(&ctx.data().pool, &key, HISTORY_KEY).await;
        let embed = serenity::CreateEmbed::default()
            .title(
                crate::lang::get(&code, "history_delete_embed_title")
                    .unwrap_or_else(|| "History Deleted".to_string()),
            )
            .description(
                crate::lang::get(&code, "history_delete_embed_desc").unwrap_or_else(|| {
                    "The music history has been successfully deleted.".to_string()
                }),
            )
            .colour(0xFF0000)
            .timestamp(serenity::Timestamp::now());
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
        return Ok(());
    }

    if list.is_empty() {
        say_key(
            &ctx,
            &code,
            "history_no_entries",
            "There are no entries in the music history.",
        )
        .await?;
        return Ok(());
    }

    let pages = history_page_count(list.len()).max(1);
    let mut current = page.unwrap_or(1).clamp(1, pages as i64) as usize - 1;
    let guild_name = ctx
        .serenity_context()
        .cache
        .guild(serenity::GuildId::new(gid))
        .map(|g| g.name.clone())
        .unwrap_or_else(|| "Music".to_string());
    let mk_embed = |page_idx: usize| {
        let lines: Vec<String> = history_page(&list, page_idx)
            .iter()
            .map(|e| format_history_line(e))
            .collect();
        let shown = page_idx + 1;
        let title = crate::lang::get(&code, "history_embed_title")
            .map(|s| {
                s.replace("${interaction.guild?.name}", &guild_name)
                    .replace("${i / usersPerPage + 1}", &shown.to_string())
            })
            .unwrap_or_else(|| format!("{guild_name} Music's History | Page {shown}"));
        let footer = crate::lang::get(&code, "history_embed_footer_text")
            .map(|s| {
                s.replace("${currentPage + 1}", &shown.to_string())
                    .replace("${pages.length}", &pages.to_string())
            })
            .unwrap_or_else(|| format!("iHorizon | Page {shown}/{pages}"));
        serenity::CreateEmbed::default()
            .title(title)
            .description(lines.join("\n"))
            .footer(serenity::CreateEmbedFooter::new(footer))
            .colour(0x00CC1A)
            .timestamp(serenity::Timestamp::now())
    };
    // TS customIds (`previousPage` / `nextPage` / `deleteHistory`).
    let mk_row = |disabled: bool| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("previousPage")
                .label("<<<")
                .style(serenity::ButtonStyle::Secondary)
                .disabled(disabled),
            serenity::CreateButton::new("nextPage")
                .label(">>>")
                .style(serenity::ButtonStyle::Secondary)
                .disabled(disabled),
            serenity::CreateButton::new("deleteHistory")
                .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
                .style(serenity::ButtonStyle::Danger)
                .disabled(disabled),
        ])
    };
    let attachment = serenity::CreateAttachment::bytes(
        history_export_txt(&list).into_bytes(),
        HISTORY_EXPORT_NAME,
    );
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(current))
                .attachment(attachment)
                .components(vec![mk_row(false)]),
        )
        .await?;
    let Ok(mut msg) = handle.into_message().await else {
        return Ok(());
    };
    let author_id = ctx.author().id;
    let not_for_you = crate::lang::get(&code, "help_not_for_you")
        .unwrap_or_else(|| "This interaction is not for you.".to_string());
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(HISTORY_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author_id {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "previousPage" => {
                current = step_history_page(current, pages, false);
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .embed(mk_embed(current))
                                .components(vec![mk_row(false)]),
                        ),
                    )
                    .await;
            }
            "nextPage" => {
                current = step_history_page(current, pages, true);
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .embed(mk_embed(current))
                                .components(vec![mk_row(false)]),
                        ),
                    )
                    .await;
            }
            "deleteHistory" => {
                let _ = crate::db::kv_del(&ctx.data().pool, &key, HISTORY_KEY).await;
                let confirm = serenity::CreateEmbed::default()
                    .title(
                        crate::lang::get(&code, "history_delete_embed_title")
                            .unwrap_or_else(|| "History Deleted".to_string()),
                    )
                    .description(
                        crate::lang::get(&code, "history_delete_embed_desc").unwrap_or_else(|| {
                            "The music history has been successfully deleted.".to_string()
                        }),
                    )
                    .colour(0xFF0000)
                    .timestamp(serenity::Timestamp::now());
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .embed(confirm)
                                .components(vec![mk_row(true)]),
                        ),
                    )
                    .await;
                break;
            }
            _ => continue,
        }
    }
    // Disable the row when the collector ends, like the TS end handler.
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![mk_row(true)]),
        )
        .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{step_history_page, HISTORY_COLLECTOR_SECS};

    #[test]
    fn collector_matches_ts_15_minutes() {
        assert_eq!(HISTORY_COLLECTOR_SECS, 900);
    }

    #[test]
    fn page_step_wraps_like_ts_modulo() {
        assert_eq!(step_history_page(0, 3, false), 2);
        assert_eq!(step_history_page(2, 3, true), 0);
        assert_eq!(step_history_page(1, 3, true), 2);
        assert_eq!(step_history_page(1, 3, false), 0);
    }

    #[test]
    fn page_step_single_page_stays() {
        assert_eq!(step_history_page(0, 1, true), 0);
        assert_eq!(step_history_page(0, 1, false), 0);
        assert_eq!(step_history_page(0, 0, true), 0);
    }
}
