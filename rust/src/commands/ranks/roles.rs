use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_role_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: serenity::Role,
    #[description = "Level"] level: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_rank_roles(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    roles.retain(|r| r.role_id != id);
    roles.push(RankRole {
        role_id: id,
        level: level.max(1) as u64,
    });
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.RANKS.roles",
        &serde_json::to_string(&roles)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let lvl = level.max(1) as u64;
    ctx.say(
        crate::lang::get(&code, "ranks_config_add_command_work")
            .map(|s| {
                s.replace("${selectedRole}", &format!("<@&{}>", role.id.get()))
                    .replace("${level}", &lvl.to_string())
            })
            .unwrap_or_else(|| "Rank role added.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "role-list", aliases("rroles"))]
pub async fn ranks_role_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = load_rank_roles(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if roles.is_empty() {
        crate::lang::get(&code, "msg_rank_roles_empty")
            .unwrap_or_else(|| "No rank roles.".to_string())
    } else {
        roles
            .iter()
            .map(|r| {
                crate::lang::get(&code, "msg_rank_role_row")
                    .map(|s| {
                        s.replace("{roleId}", &r.role_id)
                            .replace("{level}", &r.level.to_string())
                    })
                    .unwrap_or_else(|| format!("<@&{}> — lvl {}", r.role_id, r.level))
            })
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}
