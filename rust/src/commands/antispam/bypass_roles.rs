use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "bypass-roles",
    aliases("bproles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn as_bypass_roles(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = "GUILD.ANTISPAM.BYPASS_ROLES";
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, key).await;
    let mut list: Vec<String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let id = role.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        crate::db::kv_set(&ctx.data().pool, &gid, key, &serde_json::to_string(&list)?).await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_bypass_role_added")
            .unwrap_or_else(|| "Bypass role added.".to_string()),
    )
    .await?;
    Ok(())
}
