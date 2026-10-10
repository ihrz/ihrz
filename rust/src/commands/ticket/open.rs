use super::*;
use poise::serenity_prelude as serenity;

/// Reopen grant bits (TS TicketReOpen edit: View + Send + Attach +
/// ReadHistory).
pub fn reopen_grant() -> serenity::Permissions {
    serenity::Permissions::VIEW_CHANNEL
        | serenity::Permissions::SEND_MESSAGES
        | serenity::Permissions::ATTACH_FILES
        | serenity::Permissions::READ_MESSAGE_HISTORY
}

/// Merge the reopen grant into the owner's existing overwrite, like TS
/// `permissionOverwrites.edit` (PATCH merge). `create_permission` is a
/// PUT that would replace the overwrite and drop unrelated bits.
pub fn merge_reopen_overwrite(
    author_id: u64,
    allow: serenity::Permissions,
    deny: serenity::Permissions,
) -> serenity::PermissionOverwrite {
    let grant = reopen_grant();
    serenity::PermissionOverwrite {
        allow: allow | grant,
        deny: deny - grant,
        kind: serenity::PermissionOverwriteType::Member(serenity::UserId::new(author_id)),
    }
}

#[poise::command(slash_command, prefix_command, rename = "open")]
pub async fn ticket_open(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors !open.ts -> TicketReOpen (ticketsManager.ts:1709): the
    // command only runs inside a ticket channel, where it re-grants
    // the owner (View/Send/Attach/History), replies open_command_work
    // and posts the onReopen logs embed. It never creates a channel.
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "open_disabled_command").await {
        return Ok(());
    }
    let channel_id = ctx.channel_id();
    if ticket_guard_in_ticket(&ctx, pool, &gid, &code, channel_id, "open_not_in_ticket").await {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let entries = delete::ticket_entries_routed(pool, &gid).await;
    let Some(author_id) = ticket_owner_id(&entries, &channel_id.get().to_string()) else {
        ctx.say(
            crate::lang::get(&code, "open_command_error")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let http = ctx.serenity_context().http.clone();
    // TS uses permissionOverwrites.edit (merge into the existing
    // overwrite); read it first so the PUT below merges like the PATCH.
    let (allow, deny) = channel_id
        .to_channel(&http)
        .await
        .ok()
        .and_then(|c| c.guild())
        .and_then(|gc| {
            gc.permission_overwrites.iter().find_map(|o| match o.kind {
                serenity::PermissionOverwriteType::Member(id) if id.get() == author_id => {
                    Some((o.allow, o.deny))
                }
                _ => None,
            })
        })
        .unwrap_or((
            serenity::Permissions::empty(),
            serenity::Permissions::empty(),
        ));
    if channel_id
        .create_permission(&http, merge_reopen_overwrite(author_id, allow, deny))
        .await
        .is_err()
    {
        ctx.say(
            crate::lang::get(&code, "open_command_error")
                .unwrap_or_else(|| "An error occurred, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    }
    ctx.say(t("open_command_work").replace(
        "${interaction.channel}",
        &format!("<#{}>", channel_id.get()),
    ))
    .await?;
    post_ticket_reopen_log(&http, pool, &gid, &code, channel_id, ctx.author().id.get()).await;
    Ok(())
}

/// onReopen logs embed for the reopen flow above (title + desc with
/// the `${interaction.user}` / `${interaction.channel.id}` slots,
/// footer file, timestamp). Mirrors TicketReOpen:1744.
async fn post_ticket_reopen_log(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    gid: &str,
    lang_code: &str,
    channel_id: serenity::ChannelId,
    actor_id: u64,
) {
    let Some(logs) = ticket_logs_channel(pool, gid).await else {
        return;
    };
    let t = |k: &str| crate::lang::get(lang_code, k).unwrap_or_default();
    let desc = t("event_ticket_logsChannel_onReopen_embed_desc")
        .replace("${interaction.user}", &format!("<@{actor_id}>"))
        .replace("${interaction.channel.id}", &channel_id.get().to_string());
    let (footer_name, footer_icon) = ticket_footer(http, pool, gid).await;
    let embed = ticket_embed_footer(
        serenity::CreateEmbed::default()
            .colour(0x008000_u32)
            .title(t("event_ticket_logsChannel_onReopen_embed_title"))
            .description(desc)
            .timestamp(serenity::Timestamp::now()),
        &footer_name,
        footer_icon.is_some(),
    );
    let mut log_msg = serenity::CreateMessage::new().embed(embed);
    if let Some(icon) = footer_icon {
        log_msg = log_msg.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let _ = logs.send_message(http, log_msg).await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reopen_merge_adds_grant_and_clears_deny() {
        let out = merge_reopen_overwrite(
            7,
            serenity::Permissions::empty(),
            serenity::Permissions::VIEW_CHANNEL | serenity::Permissions::MANAGE_MESSAGES,
        );
        // Grant bits land in allow and leave deny.
        assert!(out.allow.contains(reopen_grant()));
        assert!(!out.deny.intersects(reopen_grant()));
        // Unrelated deny bits survive the merge (no replace-drop).
        assert!(out.deny.contains(serenity::Permissions::MANAGE_MESSAGES));
        assert!(matches!(
            out.kind,
            serenity::PermissionOverwriteType::Member(id) if id.get() == 7
        ));
    }

    #[test]
    fn reopen_merge_keeps_unrelated_allow() {
        let out = merge_reopen_overwrite(
            9,
            serenity::Permissions::MANAGE_CHANNELS,
            serenity::Permissions::empty(),
        );
        assert!(out.allow.contains(serenity::Permissions::MANAGE_CHANNELS));
        assert!(out.allow.contains(reopen_grant()));
        assert!(out.deny.is_empty());
    }
}
