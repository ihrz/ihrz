use super::*;
use poise::serenity_prelude as serenity;

/// Unlock a channel. Mirrors !unlock.ts: neutral overwrite, not delete.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "unlock",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn mod_unlock(
    ctx: Ctx<'_>,
    #[description = "Role to unlock (default @everyone)"] role: Option<serenity::Role>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS (!unlock.ts): uneditable channel -> setrankroles_command_error.
    let Some(current) = ctx.guild_channel().await else {
        let no = emoji(&ctx, "No", "❌").await;
        ctx.say(render_unlock_error(&t("setrankroles_command_error"), &no))
            .await?;
        return Ok(());
    };
    let target = role
        .map(|r| r.id)
        .unwrap_or_else(|| serenity::RoleId::new(guild_id.get()));
    // TS writes {SendMessages: null, Connect: null}: only those two are
    // cleared, every other overwrite flag survives the PUT.
    let (allow, deny) = current
        .permission_overwrites
        .iter()
        .find(|o| o.kind == serenity::PermissionOverwriteType::Role(target))
        .map(|o| (o.allow, o.deny))
        .unwrap_or((
            serenity::Permissions::empty(),
            serenity::Permissions::empty(),
        ));
    let (allow, deny) = merge_unlock_overwrite(allow, deny);
    let _ = current
        .id
        .create_permission(
            ctx.http(),
            serenity::PermissionOverwrite {
                allow,
                deny,
                kind: serenity::PermissionOverwriteType::Role(target),
            },
        )
        .await;
    ctx.say(
        crate::lang::get(&code, "unlock_embed_message_description")
            .unwrap_or_else(|| "Channel unlocked.".to_string()),
    )
    .await?;
    post_mod_log(
        ctx.http(),
        guild_id,
        t("unlock_logs_embed_title"),
        t("unlock_logs_embed_description")
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string())
            .replace("${interaction.channel.id}", &current.id.get().to_string()),
    )
    .await;
    Ok(())
}

/// Clear only SendMessages + Connect from an existing overwrite.
/// Mirrors the TS `permissionOverwrites.edit(role, {SendMessages: null,
/// Connect: null})`: those two flags are neutralized, every other flag
/// is preserved. Pure for tests.
fn merge_unlock_overwrite(
    allow: serenity::Permissions,
    deny: serenity::Permissions,
) -> (serenity::Permissions, serenity::Permissions) {
    let bits = serenity::Permissions::SEND_MESSAGES | serenity::Permissions::CONNECT;
    (allow & !bits, deny & !bits)
}

/// Render the `setrankroles_command_error` branch. Pure for tests.
fn render_unlock_error(template: &str, no_emoji: &str) -> String {
    template.replace("${client.iHorizon_Emojis.No}", no_emoji)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_error_placeholder() {
        assert_eq!(
            render_unlock_error("${client.iHorizon_Emojis.No} boom", "❌"),
            "❌ boom"
        );
    }

    #[test]
    fn merge_clears_only_send_and_connect() {
        use poise::serenity_prelude::Permissions;
        let (allow, deny) = merge_unlock_overwrite(
            Permissions::SEND_MESSAGES | Permissions::VIEW_CHANNEL,
            Permissions::CONNECT | Permissions::MANAGE_MESSAGES,
        );
        assert!(!allow.send_messages());
        assert!(allow.view_channel());
        assert!(!deny.connect());
        assert!(deny.manage_messages());
        // Empty overwrite stays empty (neutral), like TS null/null.
        let (allow, deny) = merge_unlock_overwrite(Permissions::empty(), Permissions::empty());
        assert!(allow.is_empty() && deny.is_empty());
    }

    #[test]
    fn en_us_command_error_key_exists() {
        let s = crate::lang::get("en-US", "setrankroles_command_error").unwrap_or_default();
        assert!(s.contains("${client.iHorizon_Emojis.No}"));
    }
}
