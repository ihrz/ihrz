use super::*;

/// Re-ban the members unbanned by unban-all. Mirrors unbanall !undo.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-undo",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn unban_undo(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let raw =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.unban_members").await;
    let list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    if list.is_empty() {
        ctx.say(t("unbanall_undo_command_err")).await?;
        return Ok(());
    }
    // Immediate progress reply, then batched re-bans (5/200ms).
    // Mirrors batch_undo_unban + processBatchAsync.
    ctx.say(fill_progress(&t("batch_undo_unban"), list.len()))
        .await?;
    let http = ctx.http();
    let mut rebanned = 0usize;
    let mut failed = 0usize;
    let chunks = list.chunks(5).len();
    for (i, chunk) in list.chunks(5).enumerate() {
        for id in chunk {
            let mut ok = false;
            if let Ok(uid) = id.parse::<u64>() {
                if guild_id
                    .ban(http, serenity::UserId::new(uid), 0)
                    .await
                    .is_ok()
                {
                    ok = true;
                }
            }
            if ok {
                rebanned += 1;
            } else {
                failed += 1;
            }
        }
        if i + 1 < chunks {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    }
    // Clear the unban list and send the final result.
    // Mirrors the TS db.set([]) + action_unban_undo_embed_desc.
    let _ = crate::commands::owner::main::routed_set(pool, &gid, &gid, "UTILS.unban_members", "[]")
        .await;
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_default();
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_default();
    let desc = fill_desc(
        &t("action_unban_undo_embed_desc"),
        &yes,
        rebanned,
        &no,
        failed,
    );
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(2829617_u32)
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    if let Some(thumb) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url())
    {
        embed = embed.thumbnail(thumb);
    }
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Fill the `${unbanned_members.length}` progress template.
pub fn fill_progress(template: &str, n: usize) -> String {
    template.replace("${unbanned_members.length}", &n.to_string())
}

/// Fill the Yes/count/No/count undo result template.
pub fn fill_desc(template: &str, yes: &str, ok: usize, no: &str, failed: usize) -> String {
    template
        .replace("${client.iHorizon_Emojis.Yes}", yes)
        .replace("${banned_members.length}", &ok.to_string())
        .replace("${client.iHorizon_Emojis.No}", no)
        .replace("${cannot_ban}", &failed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_progress("Re-banning ${unbanned_members.length}...", 6),
            "Re-banning 6..."
        );
        assert_eq!(
            fill_desc(
                "${client.iHorizon_Emojis.Yes} banned `${banned_members.length}` ${client.iHorizon_Emojis.No} failed `${cannot_ban}`",
                "Y",
                5,
                "N",
                1
            ),
            "Y banned `5` N failed `1`"
        );
    }
}
