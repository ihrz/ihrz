use super::*;

/// Get the list of all guild roles whose have admin permissions
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "admin-roles",
    aliases("allrolesadmin", "adminroles", "adminrole", "allpa"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Obtenez la liste de tous les roles de la guilde disposant d'autorisations d'administrateur"),
    description_localized("ja", "管理者権限を持つ全サーバーロールのリストを取得"),
    description_localized("ru", "Получить список всех ролей с правами администратора"),
    description_localized("es-ES", "Obtener la lista de todos los roles del servidor que tienen permisos de administrador"),
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
