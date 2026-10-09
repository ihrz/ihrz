use super::*;

/// Derogation fake-admin role. Mirrors util !derogation.ts.
// No member param; role id stored at GUILD.UTILS.DEROGATION.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "derogation",
    aliases("dero", "alldero"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn derogation(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    // Bot must hold ManageRoles + ManageChannels, like the TS gate.
    let bot_id = ctx.serenity_context().cache.current_user().id;
    let bot_perms = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.members.get(&bot_id).cloned())
        .map(|m| {
            let roles = ctx
                .serenity_context()
                .cache
                .guild(guild_id)
                .map(|g| g.roles.clone())
                .unwrap_or_default();
            let mut perms = poise::serenity_prelude::Permissions::empty();
            for r in &m.roles {
                if let Some(role) = roles.get(r) {
                    perms |= role.permissions;
                }
            }
            perms
        })
        .unwrap_or_default();
    if !(bot_perms.manage_roles() && bot_perms.manage_channels()) {
        ctx.send(
            poise::CreateReply::default()
                .content(
                    crate::lang::get(&code, "setjoinroles_var_perm_issue")
                        .unwrap_or_else(|| "I do not have permission to manage roles.".to_string()),
                )
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let wanted = poise::serenity_prelude::Permissions::all()
        .difference(poise::serenity_prelude::Permissions::ADMINISTRATOR);
    // Stored role id (plain string, like the TS db.set(role.id)).
    let stored: Option<String> =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, derogation_key())
            .await
            .and_then(|s| {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                    v.as_str().map(str::to_string)
                } else if s.chars().all(|c| c.is_ascii_digit()) && !s.is_empty() {
                    Some(s)
                } else {
                    None
                }
            });
    let mut role_id: Option<u64> =
        stored
            .as_deref()
            .and_then(|s| s.parse().ok())
            .and_then(|id: u64| {
                ctx.serenity_context().cache.guild(guild_id).and_then(|g| {
                    g.roles
                        .get(&poise::serenity_prelude::RoleId::new(id))
                        .map(|_| id)
                })
            });
    let mut created = false;
    if role_id.is_none() {
        match guild_id
            .create_role(
                ctx.http(),
                poise::serenity_prelude::EditRole::new()
                    .name("managed by iHorizon")
                    .permissions(wanted),
            )
            .await
        {
            Ok(role) => {
                role_id = Some(role.id.get());
                created = true;
                crate::commands::owner::main::routed_set(
                    pool,
                    &gid,
                    &gid,
                    derogation_key(),
                    &role.id.get().to_string(),
                )
                .await?;
            }
            Err(_) => {
                ctx.send(
                    poise::CreateReply::default()
                        .content(
                            crate::lang::get(&code, "setjoinroles_var_perm_issue").unwrap_or_else(
                                || "I do not have permission to manage roles.".to_string(),
                            ),
                        )
                        .ephemeral(true),
                )
                .await?;
                return Ok(());
            }
        }
    }
    let role_id = role_id.unwrap_or_default();
    let ser_role_id = poise::serenity_prelude::RoleId::new(role_id);
    // Re-sync base permissions when they drifted.
    let current_perms = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.roles.get(&ser_role_id).map(|r| r.permissions));
    if current_perms.map(|p| p != wanted).unwrap_or(false) {
        let _ = guild_id
            .edit_role(
                ctx.http(),
                ser_role_id,
                poise::serenity_prelude::EditRole::new().permissions(wanted),
            )
            .await;
    }
    // Channel sync with counters, mirroring the TS overwrite walk.
    let channels: Vec<poise::serenity_prelude::GuildChannel> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.channels.values().cloned().collect())
        .unwrap_or_default();
    let mut updated = 0;
    let mut failed = 0;
    let mut missing = 0;
    for ch in &channels {
        let ow = ch.permission_overwrites.iter().find(|o| {
            matches!(
                o.kind,
                poise::serenity_prelude::PermissionOverwriteType::Role(id) if id == ser_role_id
            )
        });
        let (allow, deny) = ow.map(|o| (o.allow, o.deny)).unwrap_or((
            poise::serenity_prelude::Permissions::empty(),
            poise::serenity_prelude::Permissions::empty(),
        ));
        let missing_some = wanted.iter().any(|p| !allow.contains(p));
        let unexpected_deny = deny.iter().any(|p| wanted.contains(p));
        let needs_sync = ow.is_none() || !allow.view_channel() || missing_some || unexpected_deny;
        if !needs_sync {
            continue;
        }
        missing += 1;
        let mut allow = wanted;
        allow.insert(poise::serenity_prelude::Permissions::VIEW_CHANNEL);
        if ch
            .id
            .create_permission(
                ctx.http(),
                poise::serenity_prelude::PermissionOverwrite {
                    allow,
                    deny: poise::serenity_prelude::Permissions::empty(),
                    kind: poise::serenity_prelude::PermissionOverwriteType::Role(ser_role_id),
                },
            )
            .await
            .is_ok()
        {
            updated += 1;
        } else {
            failed += 1;
        }
    }
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let key = if created {
        "utils_derogation_created"
    } else if missing > 0 {
        "utils_derogation_resynced"
    } else {
        "utils_derogation_already_exists"
    };
    ctx.say(
        crate::lang::get(&code, key)
            .map(|s| {
                s.replace("${role}", &format!("<@&{role_id}>"))
                    .replace("${updatedChannels}", &updated.to_string())
                    .replace("${failedChannels}", &failed.to_string())
                    .replace("${missingChannels}", &missing.to_string())
                    .replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${client.iHorizon_Emojis.No}", &no)
            })
            .unwrap_or_else(|| "Derogation added.".to_string()),
    )
    .await?;
    Ok(())
}
