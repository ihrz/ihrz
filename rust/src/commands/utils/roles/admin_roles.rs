use super::*;

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
