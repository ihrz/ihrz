use super::*;

/// Removew role to user
// Prefix null-flow: TS `method.role()` returns null for an unresolvable
// role and the body still runs its guard chain (`?.` everywhere), so the
// role param is `Option` (missing -> None) plus `discard_spare_arguments`
// (present-but-bad token is swallowed by the wildcard instead of
// hard-erroring as ArgumentParse before the body). Slash surface keeps
// the same `user` / `role` names and types; only requiredness relaxes.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "delrole",
    discard_spare_arguments,
    default_member_permissions = "MANAGE_ROLES",
    description_localized("fr", "Enlever un rôle à un utilisateur"),
    description_localized("ja", "ユーザーからロールを削除"),
    description_localized("ru", "Удалить роль у пользователя"),
    description_localized("es-ES", "Quitar rol al usuario")
)]
pub async fn delrole(
    ctx: Ctx<'_>,
    #[description_localized("fr", "L'utilisateur que vous voulez enlever le rôle")]
    #[description_localized("ja", "ロールを削除したいユーザー")]
    #[description_localized("ru", "Пользователь, у которого нужно удалить роль")]
    #[description_localized("es-ES", "El usuario al que quieres quitar el rol")]
    #[description = "The user you want to remove role"]
    user: poise::serenity_prelude::User,
    #[description_localized("fr", "Le role que vous voulez enlever a l'utilisateur")]
    #[description_localized("ja", "ユーザーから削除したいロール")]
    #[description_localized("ru", "Роль, которую нужно убрать у пользователя")]
    #[description_localized("es-ES", "El rol que quieres quitar al usuario")]
    #[description = "The role you want to remove to the user"]
    // Nullable: mirrors TS `method.role()` returning null on prefix
    // (!delrole.ts reads `role?.id`, `role?.position`, ...).
    role: Option<poise::serenity_prelude::Role>,
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
    // Whitelist first. Mirrors `(await client.db.get(...UTILS.wlRoles)) || []`
    // with `role?.id`: a null role never matches, so a non-empty list
    // answers not_wl exactly like TS.
    let allowed: Vec<String> =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.wlRoles")
            .await
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
    if !wl_allows_role(&allowed, role.as_ref().map(|r| r.id.get())) {
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
    // `me.highest.position <= role?.position` is false for a null role,
    // so the leg is skipped then.
    if role.as_ref().is_some_and(|r| bot_top <= r.position) {
        ctx.say(t("utils_delrole_try2brain")).await?;
        return Ok(());
    }
    // Null role past every guard: TS would throw inside
    // `user.roles.remove(undefined)` (executor error); answer the
    // repo-wide role-parse denial instead so prefix never hard-errors.
    let Some(role) = role else {
        let msg = crate::lang::get(&code, "addrolereact_role_not_found")
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "Role not found.".to_string());
        ctx.say(msg).await?;
        return Ok(());
    };
    // Audit reason mirrors TS (`[DelRole] Author: ${author.id}`). The
    // Member helper takes no reason, so the HTTP leg carries it (like
    // massiverole.rs). No TS key covers a remove failure (TS throws to
    // the executor); the crash reporter is the matching error path.
    let reason = format!("[DelRole] Author: {}", ctx.author().id.get());
    ctx.http()
        .remove_member_role(guild_id, user.id, role.id, Some(&reason))
        .await?;
    // TS answers with an embed carrying the description (no plain
    // content, no color/footer).
    let embed = serenity::CreateEmbed::default().description(
        crate::lang::get(&code, "utils_delrole_command_ok")
            .map(|s| {
                s.replace("${author.toString()}", &ctx.author().to_string())
                    .replace("${role?.toString()}", &role.to_string())
                    .replace("${user.toString()}", &user.to_string())
            })
            .unwrap_or_else(|| format!("{} lost {}.", user.tag(), role.name)),
    );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
