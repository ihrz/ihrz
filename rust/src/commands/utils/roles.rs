use super::*;

/// Add role. Mirrors utils !addrole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "addrole",
    default_member_permissions = "MANAGE_ROLES"
)]
pub async fn addrole(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let member = guild_id.member(ctx.http(), user.id).await?;
    member.add_role(ctx.http(), role.id).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "utils_addrole_command_ok")
            .map(|s| {
                s.replace("${author.toString()}", &ctx.author().to_string())
                    .replace("${role?.toString()}", &role.to_string())
                    .replace("${user.toString()}", &user.to_string())
            })
            .unwrap_or_else(|| format!("{} got {}.", user.tag(), role.name)),
    )
    .await?;
    Ok(())
}

/// Remove role. Mirrors utils !delrole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "delrole",
    default_member_permissions = "MANAGE_ROLES"
)]
pub async fn delrole(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let member = guild_id.member(ctx.http(), user.id).await?;
    member.remove_role(ctx.http(), role.id).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    ctx.say(
        crate::lang::get(&code, "utils_delrole_command_ok")
            .map(|s| {
                s.replace("${author.toString()}", &ctx.author().to_string())
                    .replace("${role?.toString()}", &role.to_string())
                    .replace("${user.toString()}", &user.to_string())
            })
            .unwrap_or_else(|| format!("{} lost {}.", user.tag(), role.name)),
    )
    .await?;
    Ok(())
}

/// Mass-assign a role by nickname match. Mirrors !nickrole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nickrole",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nickrole(
    ctx: Ctx<'_>,
    #[description = "add or remove"] action: String,
    #[description = "Nickname part"] nickname: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let add = !matches!(
        action.to_ascii_lowercase().as_str(),
        "remove" | "del" | "off"
    );
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let part = nickname.to_ascii_lowercase();
    let mut n = 0;
    for m in &members {
        let nick = m.nick.clone().unwrap_or_default().to_ascii_lowercase();
        let name = m.user.name.to_ascii_lowercase();
        if nick.contains(&part) || name.contains(&part) {
            if let Ok(full) = guild_id.member(ctx.http(), m.user.id).await {
                let ok = if add {
                    full.add_role(ctx.http(), role.id).await.is_ok()
                } else {
                    full.remove_role(ctx.http(), role.id).await.is_ok()
                };
                if ok {
                    n += 1;
                }
            }
        }
    }
    ctx.say(format!("Done for {n} members.")).await?;
    Ok(())
}

/// Role member cap. Mirrors !rolelimit.ts (GUILD.UTILS.ROLE_LIMIT.<role>).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "rolelimit",
    aliases("limitrole", "limitoles", "roleslimit"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn rolelimit(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
    #[description = "Max members (0 to clear)"] limit: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("GUILD.UTILS.ROLE_LIMIT.{}", role.id.get());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match limit.unwrap_or(0) {
        0 => {
            let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                .bind(&gid)
                .bind(&key)
                .execute(&ctx.data().pool)
                .await;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_cleared")
                    .unwrap_or_else(|| "Role limit cleared.".to_string()),
            )
            .await?;
        }
        n => {
            crate::db::kv_set(&ctx.data().pool, &gid, &key, &n.max(1).to_string()).await?;
            ctx.say(
                crate::lang::get(&code, "msg_role_limit_set")
                    .unwrap_or_else(|| "Role limit set.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// List role members. Mirrors role-members.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "role-members",
    aliases("rolemembers", "rolemember"),
    default_member_permissions = "MANAGE_ROLES"
)]
pub async fn role_members(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let members: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.roles.contains(&role.id))
                .map(|m| m.user.tag())
                .collect()
        })
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if members.is_empty() {
        crate::lang::get(&code, "util_role_members_no_one")
            .unwrap_or_else(|| "Nobody has this role.".to_string())
    } else {
        members.join(", ")
    })
    .await?;
    Ok(())
}

/// Add/remove a role for every member. Mirrors !massiverole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massiverole",
    aliases("massrole", "massroles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn massiverole(
    ctx: Ctx<'_>,
    #[description = "add or remove"] action: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let add = !matches!(
        action.to_ascii_lowercase().as_str(),
        "remove" | "del" | "off"
    );
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let mut n = 0;
    for m in &members {
        if let Ok(full) = guild_id.member(ctx.http(), m.user.id).await {
            let ok = if add {
                full.add_role(ctx.http(), role.id).await.is_ok()
            } else {
                full.remove_role(ctx.http(), role.id).await.is_ok()
            };
            if ok {
                n += 1;
            }
        }
    }
    ctx.say(format!("Done for {n} members.")).await?;
    Ok(())
}

/// Remove all roles from a member. Mirrors !derank.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "derank",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn derank(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let member = guild_id.member(ctx.http(), user.id).await?;
    let roles: Vec<poise::serenity_prelude::RoleId> = member.roles.to_vec();
    let mut n = 0;
    for role in roles {
        if member.remove_role(ctx.http(), role).await.is_ok() {
            n += 1;
        }
    }
    let _ = member;
    ctx.say(format!("Removed {n} roles from {}.", user.tag()))
        .await?;
    Ok(())
}

/// Pager entry. Mirrors the admin-roles list run.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "admin-roles",
    aliases("allrolesadmin", "adminroles", "adminrole", "allpa"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn admin_roles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let roles = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| collect_admin_roles(&g.roles))
        .unwrap_or_default();
    if roles.is_empty() {
        ctx.say(t("admin_roles_nobody_roles")).await?;
        return Ok(());
    }
    let pages = admin_role_pages(&roles, &t("admin_roles_embed_title"));
    post_admin_page(&ctx, &gid, 0, &pages).await
}

/// Whitelist roles for protected commands. Mirrors !wlroles.ts (flattened).
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
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.wlRoles").await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = role.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(
            &ctx.data().pool,
            &gid,
            "UTILS.wlRoles",
            &serde_json::to_string(&list)?,
        )
        .await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_whitelist_role_added")
            .unwrap_or_else(|| "Whitelist role added.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn wlroles_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    show_wlroles_list(&ctx).await
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles",
    aliases("wlrole"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn wlroles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    show_wlroles_list(&ctx).await
}
