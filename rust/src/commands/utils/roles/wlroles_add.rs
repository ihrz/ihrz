use super::*;

/// Dangerous-permission flag checks. Mirrors
/// `getDangerousPermissions` (`method.ts`): each entry pairs a
/// serenity permission bit with its `setjoinroles_var_perm_*` lang key.
pub fn dangerous_perm_keys() -> Vec<(poise::serenity_prelude::Permissions, &'static str)> {
    use poise::serenity_prelude::Permissions as P;
    vec![
        (P::ADMINISTRATOR, "setjoinroles_var_perm_admin"),
        (P::MANAGE_GUILD, "setjoinroles_var_perm_manage_guild"),
        (P::MANAGE_ROLES, "setjoinroles_var_perm_manage_role"),
        (P::MENTION_EVERYONE, "setjoinroles_var_perm_use_mention"),
        (P::BAN_MEMBERS, "setjoinroles_var_perm_ban_members"),
        (P::KICK_MEMBERS, "setjoinroles_var_perm_kick_members"),
        (P::MANAGE_WEBHOOKS, "setjoinroles_var_perm_manage_webhooks"),
        (P::MANAGE_CHANNELS, "setjoinroles_var_perm_manage_channels"),
        (
            P::MANAGE_GUILD_EXPRESSIONS,
            "setjoinroles_var_perm_manage_expression",
        ),
        (
            P::VIEW_CREATOR_MONETIZATION_ANALYTICS,
            "setjoinroles_var_perm_view_monetization_analytics",
        ),
    ]
}

/// Lang keys of the dangerous permissions held by `perms`.
/// Mirrors the `roleDangerousPermissions` loop in !wlroles.ts.
pub fn role_danger_keys(perms: poise::serenity_prelude::Permissions) -> Vec<&'static str> {
    dangerous_perm_keys()
        .into_iter()
        .filter(|(flag, _)| perms.contains(*flag))
        .map(|(_, key)| key)
        .collect()
}

/// Bot permission union + highest role position from the guild cache.
/// Mirrors the derogation.rs snapshot; `None` when uncached.
fn bot_snapshot(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
) -> Option<(poise::serenity_prelude::Permissions, u16)> {
    let bot_id = ctx.serenity_context().cache.current_user().id;
    let guild = ctx.serenity_context().cache.guild(guild_id)?;
    let member = guild.members.get(&bot_id)?.clone();
    let mut perms = poise::serenity_prelude::Permissions::empty();
    let mut top = 0u16;
    for r in &member.roles {
        if let Some(role) = guild.roles.get(r) {
            perms |= role.permissions;
            top = top.max(role.position);
        }
    }
    Some((perms, top))
}

/// Post the wlroles audit embed to the `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs` via
/// `crate::funcs::logs_channel_id`; silent when absent.
async fn post_wlroles_log(ctx: &Ctx<'_>, guild_id: poise::serenity_prelude::GuildId, code: &str) {
    use poise::serenity_prelude as serenity;
    let Ok(channels) = guild_id.channels(ctx.http()).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let title = crate::lang::get(code, "utils_wlRoles_logsEmbed_title")
        .unwrap_or_else(|| "Whitelist Roles Modules".to_string());
    let desc = crate::lang::get(code, "utils_wlRoles_logsEmbed_desc")
        .map(|s| {
            s.replace(
                "${interaction.member?.user.toString()}",
                &format!("<@{}>", ctx.author().id.get()),
            )
        })
        .unwrap_or_else(|| format!("<@{}> has edited wlRoles", ctx.author().id.get()));
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(desc);
    let _ = serenity::ChannelId::new(log_id)
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Whitelist roles for protected commands. Mirrors !wlroles.ts (flattened).
// Single-role take on the TS role-select panel, keeping its guards:
// bot ManageRoles gate (`setjoinroles_var_perm_issue`), hierarchy
// guard (`setjoinroles_too_highter_roles`), dangerous-permission
// confirmation (`setjoinroles_warn_*`), ihorizon audit log
// (`utils_wlRoles_logsEmbed_*`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn wlroles_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Bot must hold ManageRoles, like the TS RoleSelect handler gate.
    let (bot_perms, bot_top) = bot_snapshot(&ctx, guild_id).unwrap_or_default();
    if !bot_perms.manage_roles() {
        ctx.send(
            poise::CreateReply::default()
                .content(if t("setjoinroles_var_perm_issue").is_empty() {
                    "I do not have permission to manage roles.".to_string()
                } else {
                    t("setjoinroles_var_perm_issue")
                })
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    // Hierarchy guard: the bot cannot whitelist a role at or above its
    // own highest role. Mirrors `handleTooHighterRoles`.
    if bot_top <= role.position {
        let embed = serenity::CreateEmbed::default()
            .title(t("setjoinroles_warn_title"))
            .description(t("setjoinroles_too_highter_roles"))
            .field(
                format!("@{} ({})", role.name, role.id.get()),
                format!("<@&{}>: `{}`", role.id.get(), role.position),
                false,
            );
        ctx.send(poise::CreateReply::default().embed(embed).ephemeral(true))
            .await?;
        return Ok(());
    }
    // Dangerous-permission confirmation. Mirrors
    // `handleDangerousRolesConfirmation` (20s Yes/No, timeout label).
    let danger_keys = role_danger_keys(role.permissions);
    if !danger_keys.is_empty() {
        let perm_names: Vec<String> = danger_keys
            .iter()
            .map(|k| {
                crate::lang::get(&code, k)
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| k.to_string())
            })
            .collect();
        let warn = serenity::CreateEmbed::default()
            .title(t("setjoinroles_warn_title"))
            .description(t("setjoinroles_warn_dangerous_perm"))
            .field(
                format!("@{} ({})", role.name, role.id.get()),
                perm_names
                    .iter()
                    .map(|p| format!("`{p}`"))
                    .collect::<Vec<_>>()
                    .join(", "),
                false,
            );
        let row = || {
            serenity::CreateActionRow::Buttons(vec![
                serenity::CreateButton::new("wlroles-danger-yes")
                    .label(t("var_yes"))
                    .style(serenity::ButtonStyle::Danger),
                serenity::CreateButton::new("wlroles-danger-no")
                    .label(t("var_no"))
                    .style(serenity::ButtonStyle::Secondary),
            ])
        };
        let handle = ctx
            .send(
                poise::CreateReply::default()
                    .embed(warn)
                    .components(vec![row()])
                    .ephemeral(true),
            )
            .await?;
        let mut msg = handle.into_message().await?;
        let author_id = ctx.author().id;
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(20))
            .await;
        let Some(press) = press else {
            // Timeout: disabled `setjoinroles_timesup_button` label.
            let done = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
                "wlroles-danger-timeout",
            )
            .label(t("setjoinroles_timesup_button"))
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true)]);
            let _ = msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new().components(vec![done]),
                )
                .await;
            return Ok(());
        };
        if press.user.id != author_id {
            return Ok(());
        }
        let confirmed = press.data.custom_id.as_str() == "wlroles-danger-yes";
        // Ack by disabling the buttons in place.
        let done = serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("wlroles-danger-yes")
                .label(t("var_yes"))
                .style(serenity::ButtonStyle::Danger)
                .disabled(true),
            serenity::CreateButton::new("wlroles-danger-no")
                .label(t("var_no"))
                .style(serenity::ButtonStyle::Secondary)
                .disabled(true),
        ]);
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new().components(vec![done]),
                ),
            )
            .await;
        if !confirmed {
            // `setjoinroles_action_canceled` label, like the TS No path.
            let canceled = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
                "wlroles-danger-canceled",
            )
            .label(t("setjoinroles_action_canceled"))
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true)]);
            let _ = msg
                .edit(
                    ctx.http(),
                    serenity::EditMessage::new().components(vec![canceled]),
                )
                .await;
            return Ok(());
        }
    }
    let raw = crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.wlRoles").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = role.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::commands::owner::main::routed_set(
            pool,
            &gid,
            &gid,
            "UTILS.wlRoles",
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    ctx.say(
        crate::lang::get(&code, "msg_whitelist_role_added")
            .unwrap_or_else(|| "Whitelist role added.".to_string()),
    )
    .await?;
    // ihorizon audit log, like the TS save-button handler.
    post_wlroles_log(&ctx, guild_id, &code).await;
    Ok(())
}

/// Render the wlroles setup-panel field. Mirrors the !wlroles.ts embed
/// field (`<@&id>` joins, `setjoinroles_var_none` fallback).
pub fn wlroles_field(role_ids: &[String], none: &str) -> String {
    if role_ids.is_empty() {
        none.to_string()
    } else {
        role_ids
            .iter()
            .map(|id| format!("<@&{id}>"))
            .collect::<Vec<_>>()
            .join(", ")
    }
}

#[cfg(test)]
mod tests {
    use super::wlroles_field;
    use super::{dangerous_perm_keys, role_danger_keys};
    use crate::commands::owner::main as routed;

    async fn memory_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:").unwrap();
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn wlroles_table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        routed::routed_set(&pool, "g", "g", "UTILS.wlRoles", r#"["7"]"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "UTILS.wlRoles")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
        // Legacy-only row still reads.
        crate::db::kv_set(&pool, "h", "UTILS.wlRoles", r#"["9"]"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "h", "h", "UTILS.wlRoles")
                .await
                .as_deref(),
            Some(r#"["9"]"#)
        );
        // Delete clears both stores.
        assert!(routed::routed_del(&pool, "g", "g", "UTILS.wlRoles")
            .await
            .unwrap());
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "UTILS.wlRoles").await,
            None
        );
    }

    #[test]
    fn field_mentions_roles_or_none() {
        assert_eq!(wlroles_field(&[], "None"), "None");
        assert_eq!(
            wlroles_field(&["7".to_string(), "8".to_string()], "None"),
            "<@&7>, <@&8>"
        );
    }

    #[test]
    fn danger_keys_mirror_get_dangerous_permissions() {
        use poise::serenity_prelude::Permissions as P;
        // Ten flags, mirroring the method.ts table order.
        let keys = dangerous_perm_keys();
        assert_eq!(keys.len(), 10);
        assert_eq!(
            keys.iter().map(|(_, k)| *k).collect::<Vec<_>>(),
            vec![
                "setjoinroles_var_perm_admin",
                "setjoinroles_var_perm_manage_guild",
                "setjoinroles_var_perm_manage_role",
                "setjoinroles_var_perm_use_mention",
                "setjoinroles_var_perm_ban_members",
                "setjoinroles_var_perm_kick_members",
                "setjoinroles_var_perm_manage_webhooks",
                "setjoinroles_var_perm_manage_channels",
                "setjoinroles_var_perm_manage_expression",
                "setjoinroles_var_perm_view_monetization_analytics",
            ]
        );
        // Admin-only role flags just admin; empty role flags nothing.
        assert_eq!(
            role_danger_keys(P::ADMINISTRATOR),
            vec!["setjoinroles_var_perm_admin"]
        );
        assert!(role_danger_keys(P::empty()).is_empty());
        assert!(role_danger_keys(P::SEND_MESSAGES).is_empty());
        assert_eq!(
            role_danger_keys(P::MANAGE_GUILD_EXPRESSIONS),
            vec!["setjoinroles_var_perm_manage_expression"]
        );
    }
}
