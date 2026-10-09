use super::*;

use std::collections::HashMap;

/// Hierarchy snapshot for the addrole/delrole guard chain.
/// Mirrors utils !addrole.ts / !delrole.ts. `None` when the guild is
/// not cached: guards are skipped, never blocking.
struct RoleGuards {
    bot_admin: bool,
    bot_top: u16,
    author_top: u16,
    owner_id: u64,
}

fn role_top(roles: &HashMap<serenity::RoleId, serenity::Role>, ids: &[serenity::RoleId]) -> u16 {
    ids.iter()
        .filter_map(|r| roles.get(r))
        .map(|r| r.position)
        .max()
        .unwrap_or(0)
}

fn has_admin(roles: &HashMap<serenity::RoleId, serenity::Role>, ids: &[serenity::RoleId]) -> bool {
    ids.iter().any(|r| {
        roles
            .get(r)
            .map(|role| role.permissions.administrator())
            .unwrap_or(false)
    })
}

async fn role_guards(ctx: &Ctx<'_>, guild_id: serenity::GuildId) -> Option<RoleGuards> {
    let (bot_roles, author_roles, roles, owner_id) = {
        let cache = &ctx.serenity_context().cache;
        let guild = cache.guild(guild_id)?;
        let bot = guild.members.get(&cache.current_user().id)?.clone();
        let author_roles = cache
            .guild(guild_id)?
            .members
            .get(&ctx.author().id)
            .map(|m| m.roles.clone())
            .unwrap_or_default();
        (bot.roles, author_roles, guild.roles.clone(), guild.owner_id)
    };
    let bot_admin = has_admin(&roles, &bot_roles);
    Some(RoleGuards {
        bot_admin,
        bot_top: role_top(&roles, &bot_roles),
        author_top: role_top(&roles, &author_roles),
        owner_id: owner_id.get(),
    })
}

async fn app_emoji(http: &serenity::Http, name: &str, fallback: &str) -> String {
    crate::emojis::app_emoji_markup(http, name)
        .await
        .unwrap_or_else(|| fallback.to_string())
}

/// Add role. Mirrors utils !addrole.ts (guards run before mutation).
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
    let pool = &ctx.data().pool;
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = app_emoji(ctx.http(), "No", "❌").await;
    let stop = app_emoji(ctx.http(), "Stop", "⛔").await;
    // Whitelist first. Mirrors `(await client.db.get(...UTILS.wlRoles)) || []`.
    let allowed: Vec<String> = crate::db::kv_get(pool, &gid, "UTILS.wlRoles")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    if !allowed.contains(&role.id.get().to_string()) && !allowed.is_empty() {
        ctx.say(t("utils_addrole_not_wl").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let Ok(member) = guild_id.member(ctx.http(), user.id).await else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    let guards = role_guards(&ctx, guild_id).await;
    // Bot needs Administrator. Mirrors backup_i_dont_have_permission.
    if let Some(g) = &guards {
        if !g.bot_admin {
            ctx.say(t("backup_i_dont_have_permission")).await?;
            return Ok(());
        }
    }
    let author_id = ctx.author().id.get();
    let owner_id = guards.as_ref().map(|g| g.owner_id).unwrap_or(author_id);
    let author_top = guards.as_ref().map(|g| g.author_top).unwrap_or(u16::MAX);
    let bot_top = guards.as_ref().map(|g| g.bot_top).unwrap_or(u16::MAX);
    let target_top = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| role_top(&g.roles, &member.roles));
    if let Some(target_pos) = target_top {
        if author_top <= target_pos && author_id != user.id.get() && owner_id != author_id {
            ctx.say(
                t("utils_addrole_highter_or_egal_roles_msg")
                    .replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
    }
    // Admin-level escalation guard (addrole only, no delrole twin).
    if role.permissions.administrator() {
        let target_admin = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| has_admin(&g.roles, &member.roles))
            .unwrap_or(true);
        if !target_admin {
            ctx.say(t("utils_addrole_cant_level")).await?;
            return Ok(());
        }
    }
    if bot_top <= role.position {
        ctx.say(t("utils_addrole_try2brain")).await?;
        return Ok(());
    }
    // No TS key covers an add failure (TS throws to the executor);
    // the crash reporter is the matching error path.
    member.add_role(ctx.http(), role.id).await?;
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

/// Remove role. Mirrors utils !delrole.ts (guards before mutation).
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
    let pool = &ctx.data().pool;
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let no = app_emoji(ctx.http(), "No", "❌").await;
    let stop = app_emoji(ctx.http(), "Stop", "⛔").await;
    // Whitelist first. Mirrors `(await client.db.get(...UTILS.wlRoles)) || []`.
    let allowed: Vec<String> = crate::db::kv_get(pool, &gid, "UTILS.wlRoles")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    if !allowed.contains(&role.id.get().to_string()) && !allowed.is_empty() {
        ctx.say(t("utils_delrole_not_wl").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let Ok(member) = guild_id.member(ctx.http(), user.id).await else {
        ctx.say(t("ban_dont_found_member")).await?;
        return Ok(());
    };
    let guards = role_guards(&ctx, guild_id).await;
    // Bot needs Administrator. Mirrors backup_i_dont_have_permission.
    if let Some(g) = &guards {
        if !g.bot_admin {
            ctx.say(t("backup_i_dont_have_permission")).await?;
            return Ok(());
        }
    }
    let author_id = ctx.author().id.get();
    let owner_id = guards.as_ref().map(|g| g.owner_id).unwrap_or(author_id);
    let author_top = guards.as_ref().map(|g| g.author_top).unwrap_or(u16::MAX);
    let bot_top = guards.as_ref().map(|g| g.bot_top).unwrap_or(u16::MAX);
    let target_top = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| role_top(&g.roles, &member.roles));
    if let Some(target_pos) = target_top {
        if author_top <= target_pos && author_id != user.id.get() && owner_id != author_id {
            ctx.say(
                t("utils_delrole_highter_or_egal_roles_msg")
                    .replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
    }
    if bot_top <= role.position {
        ctx.say(t("utils_delrole_try2brain")).await?;
        return Ok(());
    }
    // No TS key covers a remove failure (TS throws to the executor);
    // the crash reporter is the matching error path.
    member.remove_role(ctx.http(), role.id).await?;
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
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // TS falls back to the invoker when prefix resolution fails, and
    // replies perm_list_no_user only when both are missing.
    let target_id = user.id;
    let member = match guild_id.member(ctx.http(), target_id).await {
        Ok(m) => m,
        Err(_) => {
            ctx.say(t("perm_list_no_user")).await?;
            return Ok(());
        }
    };
    // Author-hierarchy guard. Mirrors !derank.ts
    // (utils_delrole_highter_or_egal_roles_msg).
    let guards = role_guards(&ctx, guild_id).await;
    let author_id = ctx.author().id.get();
    let owner_id = guards.as_ref().map(|g| g.owner_id).unwrap_or(author_id);
    let author_top = guards.as_ref().map(|g| g.author_top).unwrap_or(u16::MAX);
    let target_top = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| role_top(&g.roles, &member.roles));
    if let Some(target_pos) = target_top {
        if author_top <= target_pos && owner_id != author_id {
            let stop = app_emoji(ctx.http(), "Stop", "⛔").await;
            ctx.say(
                t("utils_delrole_highter_or_egal_roles_msg")
                    .replace("${client.iHorizon_Emojis.Stop}", &stop),
            )
            .await?;
            return Ok(());
        }
    }
    // Never strip @everyone. Mirrors the TS everyone filter.
    let everyone = serenity::RoleId::new(guild_id.get());
    let roles: Vec<poise::serenity_prelude::RoleId> = member
        .roles
        .iter()
        .copied()
        .filter(|r| *r != everyone)
        .collect();
    if roles.is_empty() {
        ctx.say(t("derank_no_role")).await?;
        return Ok(());
    }
    let mut good = 0;
    let mut bad = 0;
    for role in roles {
        if member.remove_role(ctx.http(), role).await.is_ok() {
            good += 1;
        } else {
            bad += 1;
        }
    }
    if good == 0 && bad > 0 {
        ctx.say(t("derank_msg_failed")).await?;
        return Ok(());
    }
    ctx.say(
        t("derank_msg_desc_embed")
            .replace("${good}", &good.to_string())
            .replace("${bad}", &bad.to_string())
            .replace("${member.id}", &target_id.get().to_string()),
    )
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
