use super::*;
use poise::serenity_prelude as serenity;

/// Sync a category's overwrites to children. Mirrors !sync.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "sync",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn syncchan(
    ctx: Ctx<'_>,
    #[description = "Category"] category: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    // Snapshot under the cache guard, then release before any await
    // so the command future stays Send.
    let snapshot = ctx.serenity_context().cache.guild(guild_id).map(|g| {
        let cat = g.channels.get(&category.id).cloned();
        let kids: Vec<(serenity::ChannelId, Vec<serenity::PermissionOverwrite>)> = g
            .channels
            .values()
            .filter(|c| c.parent_id == Some(category.id))
            .map(|c| (c.id, c.permission_overwrites.clone()))
            .collect();
        let cat_name = cat.as_ref().map(|c| c.name.clone());
        let parent = cat.map(|c| c.permission_overwrites);
        (cat_name, parent, kids)
    });
    let Some((cat_name, parent, children)) = snapshot else {
        return Ok(());
    };
    let cat_name = cat_name.unwrap_or_default();
    let parent = parent.unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Only inherit into unlocked children, like the TS permissionsLocked
    // gate; each inherit is one overwrites edit (= lockPermissions()).
    let mut changed: Vec<serenity::ChannelId> = vec![];
    for (child_id, child_ows) in &children {
        if overwrites_locked(child_ows, &parent) {
            continue;
        }
        if child_id
            .edit(
                ctx.http(),
                serenity::EditChannel::new().permissions(parent.clone()),
            )
            .await
            .is_ok()
        {
            changed.push(*child_id);
        }
    }
    let changes = sync_changes_text(&changed);
    let desc = if changes.is_empty() {
        t("util_sync_embed_description_0")
    } else {
        fill_sync_desc(&t("util_sync_embed_description_1"), &cat_name, &changes)
    };
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0x58, 0x65, 0xF2))
        .description(desc)
        .footer(
            serenity::CreateEmbedFooter::new(footer_name).icon_url(if footer_bytes.is_some() {
                "attachment://footer_icon.png".to_string()
            } else {
                String::new()
            }),
        )
        .timestamp(serenity::Timestamp::now());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Sort key for an overwrite. Mirrors the TS permissionsLocked check.
fn overwrite_sort_key(o: &serenity::PermissionOverwrite) -> (u8, u64, u64, u64) {
    let (disc, id) = match o.kind {
        serenity::PermissionOverwriteType::Role(id) => (0, id.get()),
        serenity::PermissionOverwriteType::Member(id) => (1, id.get()),
        _ => (2, 0),
    };
    (disc, id, o.allow.bits(), o.deny.bits())
}

/// True when the child's overwrites already match the parent's,
/// order-insensitively (the TS `permissionsLocked` gate).
pub fn overwrites_locked(
    child: &[serenity::PermissionOverwrite],
    parent: &[serenity::PermissionOverwrite],
) -> bool {
    if child.len() != parent.len() {
        return false;
    }
    let mut a: Vec<_> = child.iter().map(overwrite_sort_key).collect();
    let mut b: Vec<_> = parent.iter().map(overwrite_sort_key).collect();
    a.sort_unstable();
    b.sort_unstable();
    a == b
}

/// Render the changed channel list (`• <#id>` per line, like TS).
pub fn sync_changes_text(changed: &[serenity::ChannelId]) -> String {
    changed
        .iter()
        .map(|c| format!("• <#{}>", c.get()))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Fill `util_sync_embed_description_1` (`${category?.name}`, `${changes}`).
pub fn fill_sync_desc(template: &str, cat_name: &str, changes: &str) -> String {
    template
        .replace("${category?.name}", cat_name)
        .replace("${changes}", changes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ow(role: u64, allow: u64, deny: u64) -> serenity::PermissionOverwrite {
        serenity::PermissionOverwrite {
            allow: serenity::Permissions::from_bits_truncate(allow),
            deny: serenity::Permissions::from_bits_truncate(deny),
            kind: serenity::PermissionOverwriteType::Role(serenity::RoleId::new(role)),
        }
    }

    #[test]
    fn lock_gate_matches_ts() {
        let parent = vec![ow(1, 8, 0), ow(2, 0, 8)];
        // Same set, different order: locked.
        assert!(overwrites_locked(&[ow(2, 0, 8), ow(1, 8, 0)], &parent));
        // Different length: unlocked.
        assert!(!overwrites_locked(&parent[..1], &parent));
        // Same length, different bits: unlocked.
        assert!(!overwrites_locked(&[ow(1, 8, 0), ow(2, 0, 0)], &parent));
        // Empty both: locked.
        assert!(overwrites_locked(&[], &[]));
    }

    #[test]
    fn changes_list_uses_bullets() {
        let ids = vec![serenity::ChannelId::new(10), serenity::ChannelId::new(20)];
        assert_eq!(sync_changes_text(&ids), "• <#10>\n• <#20>");
        assert_eq!(sync_changes_text(&[]), "");
    }

    #[test]
    fn desc_fill_replaces_both_placeholders() {
        let out = fill_sync_desc(
            "sync `#${category?.name}`:\n\n${changes}",
            "general",
            "• <#1>",
        );
        assert_eq!(out, "sync `#general`:\n\n• <#1>");
    }
}
