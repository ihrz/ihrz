use super::*;

/// Unban everyone, storing the list for undo. Mirrors unbanall !all.ts.
// TS decl: command `unban-all` (prefix `unbanall`), alias `massunban`.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "unban-all",
    aliases("unbanall", "massunban"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn unban_all(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let bans = guild_id
        .bans(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    if bans.is_empty() {
        ctx.say(t("action_unban_all_no_banned_members")).await?;
        return Ok(());
    }
    // Immediate progress reply, then batched unbans (5/200ms).
    // Mirrors batch_unbanall_process + processBatchAsync.
    ctx.say(fill_progress(&t("batch_unbanall_process"), bans.len()))
        .await?;
    let ids: Vec<serenity::UserId> = bans.iter().map(|b| b.user.id).collect();
    let http = ctx.http();
    // Batched unbans (5/200ms). Mirrors processBatchAsync; only
    // actually-unbanned ids are stored for undo.
    let mut unbanned: Vec<String> = vec![];
    let mut failed = 0usize;
    let chunks = ids.chunks(5).len();
    for (i, chunk) in ids.chunks(5).enumerate() {
        for uid in chunk {
            if guild_id.unban(http, *uid).await.is_ok() {
                unbanned.push(uid.get().to_string());
            } else {
                failed += 1;
            }
        }
        if i + 1 < chunks {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    }
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "UTILS.unban_members",
        &serde_json::to_string(&unbanned)?,
    )
    .await?;
    // Final result embed. Mirrors action_unban_all_embed_desc.
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_default();
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_default();
    let desc = fill_desc(
        &t("action_unban_all_embed_desc"),
        &yes,
        unbanned.len(),
        &no,
        failed,
    );
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(2829617_u32)
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    if let Some(thumb) = guild_thumb(&ctx, guild_id).await {
        embed = embed.thumbnail(thumb);
    }
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Guild icon, falling back to the bot avatar. Mirrors the TS thumbnail.
async fn guild_thumb(ctx: &Ctx<'_>, guild_id: serenity::GuildId) -> Option<String> {
    let cache = &ctx.serenity_context().cache;
    if let Some(icon) = cache.guild(guild_id).and_then(|g| g.icon_url()) {
        return Some(icon);
    }
    cache.current_user().avatar_url()
}

/// Fill the `${banned_members.size}` progress template.
pub fn fill_progress(template: &str, n: usize) -> String {
    template.replace("${banned_members.size}", &n.to_string())
}

/// Fill the Yes/count/No/count result template.
pub fn fill_desc(template: &str, yes: &str, ok: usize, no: &str, failed: usize) -> String {
    template
        .replace("${client.iHorizon_Emojis.Yes}", yes)
        .replace("${unbanned_members.length}", &ok.to_string())
        .replace("${client.iHorizon_Emojis.No}", no)
        .replace("${cannot_unban}", &failed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_progress("Unbanning ${banned_members.size} members...", 5),
            "Unbanning 5 members..."
        );
        assert_eq!(
            fill_desc(
                "${client.iHorizon_Emojis.Yes} unbanned `${unbanned_members.length}` ${client.iHorizon_Emojis.No} failed `${cannot_unban}`",
                "<:Y:1>",
                4,
                "<:N:2>",
                1
            ),
            "<:Y:1> unbanned `4` <:N:2> failed `1`"
        );
    }
}
