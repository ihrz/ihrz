use super::*;

/// Mirrors `!history.ts`: 30d TTL purge on read, 10/page embed,
/// `.txt` export, delete action.
///
/// TS parity record (music.ts): `history` carries
/// `permission: PermissionFlagsBits.Administrator` while every other
/// music subcommand is `permission: null`. Slash parity comes from
/// `default_member_permissions` below; prefix commands bypass
/// Discord's gate, so non-admins are refused again at runtime.
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
    let current = page.unwrap_or(1).clamp(1, pages as i64) as usize;
    let lines: Vec<String> = history_page(&list, current - 1)
        .iter()
        .map(|e| format_history_line(e))
        .collect();
    let guild_name = ctx
        .serenity_context()
        .cache
        .guild(serenity::GuildId::new(gid))
        .map(|g| g.name.clone())
        .unwrap_or_else(|| "Music".to_string());
    let title = crate::lang::get(&code, "history_embed_title")
        .map(|s| {
            s.replace("${interaction.guild?.name}", &guild_name)
                .replace("${i / usersPerPage + 1}", &current.to_string())
        })
        .unwrap_or_else(|| format!("{guild_name} Music's History | Page {current}"));
    let footer = crate::lang::get(&code, "history_embed_footer_text")
        .map(|s| {
            s.replace("${currentPage + 1}", &current.to_string())
                .replace("${pages.length}", &pages.to_string())
        })
        .unwrap_or_else(|| format!("iHorizon | Page {current}/{pages}"));
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(lines.join("\n"))
        .footer(serenity::CreateEmbedFooter::new(footer))
        .colour(0x00CC1A)
        .timestamp(serenity::Timestamp::now());
    let attachment = serenity::CreateAttachment::bytes(
        history_export_txt(&list).into_bytes(),
        HISTORY_EXPORT_NAME,
    );
    ctx.send(
        poise::CreateReply::default()
            .embed(embed)
            .attachment(attachment),
    )
    .await?;
    Ok(())
}
