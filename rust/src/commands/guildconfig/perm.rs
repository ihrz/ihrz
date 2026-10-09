use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-set",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_set(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
    #[description = "Required level 0-9"] level: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut perms = load_cmd_perms(&ctx.data().pool, &gid, command.trim())
        .await
        .unwrap_or_default();
    perms.level = Some(level.clamp(0, 9) as u8);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &perm_key(command.trim()),
        &serde_json::to_string(&perms)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_permission_level_set")
            .unwrap_or_else(|| "Permission level set.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-user",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_user(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
    #[description = "Member"] user: serenity::User,
    #[description = "Level 0-9"] level: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let level = level.clamp(0, 9);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("UTILS.USER_PERMS.{}", user.id.get()),
        &level.to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "perm_set_ok")
            .map(|s| {
                s.replace("${user.toString()}", &user.to_string())
                    .replace("${perm}", &level.to_string())
            })
            .unwrap_or_else(|| format!("User level set for {command}.")),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_list(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let perms = load_cmd_perms(&ctx.data().pool, &gid, command.trim()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(match perms {
        Some(p) => crate::lang::get(&code, "msg_perm_list_detail")
            .map(|s| {
                s.replace("${level}", &format!("{:?}", p.level))
                    .replace("${users}", &p.users.join(","))
                    .replace("${roles}", &p.roles.join(","))
            })
            .unwrap_or_else(|| {
                format!(
                    "level {:?}, users [{}], roles [{}]",
                    p.level,
                    p.users.join(","),
                    p.roles.join(",")
                )
            }),
        None => crate::lang::get(&code, "msg_perm_list_default")
            .unwrap_or_else(|| "Default permissions.".to_string()),
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-reset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_reset(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(perm_key(command.trim()))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "perm_set_command_reset")
            .unwrap_or_else(|| "This command has been reset".to_string()),
    )
    .await?;
    Ok(())
}

/// Change per-command grants and level.
// Mirrors the change action in !command.ts: level set (0 clears),
// role/user toggle, change summary, row deleted when emptied.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-change",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_change(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: String,
    #[description = "Level 0-9 (0 clears)"] permission: Option<i64>,
    #[description = "Role to toggle"] custom_role: Option<serenity::Role>,
    #[description = "User to toggle"] custom_user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let command = command.trim().to_string();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let mut perms = load_cmd_perms(pool, &gid, &command)
        .await
        .unwrap_or_default();
    let mut changes: Vec<String> = vec![];
    if let Some(p) = permission {
        let normalized = match p.clamp(0, 9) as u8 {
            0 => None,
            n => Some(n),
        };
        if normalized != perms.level {
            let none = t("var_none");
            changes.push(format!(
                "{}: {} ➡️ {}",
                t("perm_set_chng_perm_lvl"),
                perm_level_label(perms.level, &none),
                perm_level_label(normalized, &none)
            ));
            perms.level = normalized;
        }
    }
    if let Some(role) = &custom_role {
        let id = role.id.get().to_string();
        let mention = format!("<@&{id}>");
        if toggle_grant(&mut perms.roles, &id) {
            changes.push(format!("{}: {mention}", t("perm_set_add_role")));
        } else {
            changes.push(format!("{}: {mention}", t("perm_rmv_role")));
        }
    }
    if let Some(user) = &custom_user {
        let id = user.id.get().to_string();
        let mention = format!("<@{id}>");
        if toggle_grant(&mut perms.users, &id) {
            changes.push(format!("{}: {mention}", t("perm_set_add_usr")));
        } else {
            changes.push(format!("{}: {mention}", t("perm_rmv_usr")));
        }
    }
    let parts = command.split_whitespace().count();
    let kind = match parts {
        1 => t("var_command"),
        2 => t("var_subcommand"),
        _ => t("var_subcommand_group"),
    };
    if !has_perm_requirements(&perms) {
        sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind(perm_key(&command))
            .execute(pool)
            .await?;
        ctx.say(format!(
            "{kind}: {command}\n {}",
            t("perm_set_command_reset")
        ))
        .await?;
    } else {
        let summary = if changes.is_empty() {
            t("perm_set_no_modified")
        } else {
            changes.join("\n")
        };
        crate::db::kv_set(
            pool,
            &gid,
            &perm_key(&command),
            &serde_json::to_string(&perms).unwrap_or_default(),
        )
        .await?;
        ctx.say(format!("{kind}: {command}\n\n{summary}")).await?;
    }
    Ok(())
}

/// Delete stored permissions for one command.
// Mirrors the delete action in !command.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-delete",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_delete(
    ctx: Ctx<'_>,
    #[description = "Command name"] command: Option<String>,
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let Some(cmd) = command
        .map(|c| c.trim().to_string())
        .filter(|c| !c.is_empty())
    else {
        ctx.say(t("perm_command_delete_specify_command")).await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if load_cmd_perms(pool, &gid, &cmd).await.is_none() {
        ctx.say(t("perm_command_delete_dont_exist")).await?;
        return Ok(());
    }
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(perm_key(&cmd))
        .execute(pool)
        .await?;
    ctx.say(t("perm_command_delete_command_deleted").replace("${commands}", &cmd))
        .await?;
    Ok(())
}

/// List every command permission, grouped and paged.
// Mirrors the list action in !command.ts (15 fields per page;
// page param replaces the prev/next collector).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-list-all",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_list_all(
    ctx: Ctx<'_>,
    #[description = "Page number"] page: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let entries = load_all_cmd_perms(pool, &gid).await;
    if entries.is_empty() {
        ctx.say(t("perm_list_no_command_set")).await?;
        return Ok(());
    }
    let live: std::collections::HashSet<String> = ctx
        .guild_id()
        .map(|g| {
            ctx.cache()
                .guild(g)
                .map(|gd| gd.roles.keys().map(|r| r.get().to_string()).collect())
                .unwrap_or_default()
        })
        .unwrap_or_default();
    let fields = perm_list_fields(&entries, &t("var_permission"), Some(&live));
    let pages = fields.len().div_ceil(15).max(1);
    let page = (page.unwrap_or(1).max(1) as usize).min(pages);
    let mut embed = serenity::CreateEmbed::default()
        .colour(0x010101)
        .title(format!("{} ({page}/{pages})", t("var_permission")))
        .timestamp(serenity::Timestamp::now());
    for (name, value, inline) in fields.iter().skip((page - 1) * 15).take(15) {
        embed = embed.field(name, value, *inline);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Bulk-remove one permission/role/user across commands.
// Mirrors the delete-all action in !command.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-delete-all",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_delete_all(
    ctx: Ctx<'_>,
    #[description = "Level 0-9"] permission: Option<i64>,
    #[description = "Role to strip"] custom_role: Option<serenity::Role>,
    #[description = "User to strip"] custom_user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |key: &str| crate::lang::get(&code, key).unwrap_or_default();
    let set_count = [
        permission.is_some(),
        custom_role.is_some(),
        custom_user.is_some(),
    ]
    .into_iter()
    .filter(|b| *b)
    .count();
    if set_count == 0 {
        ctx.say(t("perm_command_delete_all_one")).await?;
        return Ok(());
    }
    if set_count > 1 {
        ctx.say(t("perm_command_delete_all_one_option")).await?;
        return Ok(());
    }
    let entries = load_all_cmd_perms(pool, &gid).await;
    if entries.is_empty() {
        ctx.say(t("perm_list_no_command_set")).await?;
        return Ok(());
    }
    let mut changes: Vec<String> = vec![];
    if let Some(p) = permission {
        let level = p.clamp(0, 9) as u8;
        for (cmd, perms) in &entries {
            if perms.level.unwrap_or(0) == level && level > 0 {
                sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                    .bind(&gid)
                    .bind(perm_key(cmd))
                    .execute(pool)
                    .await?;
                changes.push(format!("- {cmd} ({}: {level})\n", t("var_level")));
            }
        }
    } else if let Some(role) = &custom_role {
        let id = role.id.get().to_string();
        for (cmd, perms) in &entries {
            if perms.roles.iter().any(|r| r == &id) {
                let mut next = perms.clone();
                next.roles.retain(|r| r != &id);
                if !has_perm_requirements(&next) {
                    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                        .bind(&gid)
                        .bind(perm_key(cmd))
                        .execute(pool)
                        .await?;
                } else {
                    crate::db::kv_set(
                        pool,
                        &gid,
                        &perm_key(cmd),
                        &serde_json::to_string(&next).unwrap_or_default(),
                    )
                    .await?;
                }
                changes.push(format!("- {cmd} ({}: @{})\n", t("var_roles"), role.name));
            }
        }
    } else if let Some(user) = &custom_user {
        let id = user.id.get().to_string();
        for (cmd, perms) in &entries {
            if perms.users.iter().any(|u| u == &id) {
                let mut next = perms.clone();
                next.users.retain(|u| u != &id);
                if !has_perm_requirements(&next) {
                    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
                        .bind(&gid)
                        .bind(perm_key(cmd))
                        .execute(pool)
                        .await?;
                } else {
                    crate::db::kv_set(
                        pool,
                        &gid,
                        &perm_key(cmd),
                        &serde_json::to_string(&next).unwrap_or_default(),
                    )
                    .await?;
                }
                changes.push(format!("- {cmd} ({}: {id})\n", t("var_user")));
            }
        }
    }
    if changes.is_empty() {
        ctx.say(t("perm_command_delete_all_zero_change")).await?;
        return Ok(());
    }
    let (kind, value) = if let Some(p) = permission {
        (t("var_permission"), p.clamp(0, 9).to_string())
    } else if let Some(role) = &custom_role {
        (t("var_roles"), format!("<@&{}>", role.id.get()))
    } else if let Some(user) = &custom_user {
        (t("var_user"), format!("<@{}>", user.id.get()))
    } else {
        (String::new(), String::new())
    };
    let mut msg = format!("```diff\n{}```", changes.concat());
    msg += &t("perm_command_delete_all_command_ok")
        .replace("${changes.length}", &changes.len().to_string())
        .replace("${type}", &kind)
        .replace("${value}", &value);
    ctx.say(msg).await?;
    Ok(())
}

/// Create the Perm 1-9 roles when missing.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-roles-create",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_roles_create(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if !is_guild_owner(ctx).await {
        ctx.say(
            crate::lang::get(&code, "perm_roles_not_owner").unwrap_or_else(|| {
                "Only the server owner can add permission level roles.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let outcome: anyhow::Result<String> = async {
        let mut map = load_perm_roles(pool, &gid).await;
        let guild_id = ctx.guild_id().unwrap();
        let live = guild_id.roles(ctx.http()).await.unwrap_or_default();
        let mut created: Vec<String> = vec![];
        for n in 1..=9i64 {
            let name = perm_level_name(n);
            let key = n.to_string();
            let keep = map
                .get(&key)
                .and_then(|r| r.parse::<u64>().ok())
                .map(|r| live.contains_key(&serenity::RoleId::new(r)))
                .unwrap_or(false);
            if keep {
                continue;
            }
            let role = guild_id
                .create_role(ctx.http(), serenity::EditRole::new().name(&name))
                .await?;
            map.insert(key, role.id.get().to_string());
            created.push(name);
        }
        crate::db::kv_set(pool, &gid, "UTILS.roles", &serde_json::to_string(&map)?).await?;
        Ok(if created.is_empty() {
            crate::lang::get(&code, "perm_roles_already_upate").unwrap_or_default()
        } else {
            crate::lang::get(&code, "perm_roles_created_role")
                .unwrap_or_default()
                .replace("${createdRoles.join(', ')}", &created.join(", "))
        })
    }
    .await;
    match outcome {
        Ok(msg) => {
            ctx.say(msg).await?;
        }
        Err(_) => {
            let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "perm_roles_error").unwrap_or_else(|| {
                    "An error occurred while creating or updating the roles.".to_string()
                }),
            )
            .await?;
        }
    }
    Ok(())
}

/// Point a perm level at a role.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "perm-roles-edit",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_perm_roles_edit(
    ctx: Ctx<'_>,
    #[description = "Level 1-9"] level: i64,
    #[description = "Role"] role: serenity::Role,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if !is_guild_owner(ctx).await {
        ctx.say(
            crate::lang::get(&code, "perm_roles_not_owner").unwrap_or_else(|| {
                "Only the server owner can add permission level roles.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    if !(1..=9).contains(&level) {
        ctx.say(
            crate::lang::get(&code, "msg_level_must_be_1_9")
                .unwrap_or_else(|| "Level must be 1-9.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut map = load_perm_roles(pool, &gid).await;
    map.insert(level.to_string(), role.id.get().to_string());
    crate::db::kv_set(
        pool,
        &gid,
        "UTILS.roles",
        &serde_json::to_string(&map).unwrap_or_default(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "perm_edit_roles_command_ok")
            .unwrap_or_default()
            .replace("${permName}", &perm_level_name(level))
            .replace("${strRole}", &format!("<@&{}>", role.id.get())),
    )
    .await?;
    Ok(())
}
