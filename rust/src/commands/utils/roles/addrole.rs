use super::*;

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
