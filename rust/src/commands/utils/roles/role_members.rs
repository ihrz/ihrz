use super::*;

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
