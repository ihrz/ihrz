use super::*;

/// List admins. Mirrors admin-users/admin-roles (cache scan).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "admin-users",
    aliases("alladmin", "allperms", "alladmins", "adminusers"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn admin_users(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let admins: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| {
                    m.roles.iter().any(|r| {
                        g.roles
                            .get(r)
                            .map(|role| role.permissions.administrator())
                            .unwrap_or(false)
                    })
                })
                .map(|m| m.user.tag())
                .collect()
        })
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if admins.is_empty() {
        crate::lang::get(&code, "all_admins_nobody_admins")
            .unwrap_or_else(|| "There is no administrator in this guild!".to_string())
    } else {
        admins.join(", ")
    })
    .await?;
    Ok(())
}
