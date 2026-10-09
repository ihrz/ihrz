use super::*;

/// Nickname-role rule (GUILD.RANK_ROLES.nicknames).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "setmentionrole",
    aliases("setrank", "setranks", "rankset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setmentionrole(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Role"] role: Option<poise::serenity_prelude::Role>,
    #[description = "Nickname part"] part: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    if action.trim().eq_ignore_ascii_case("off") {
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(&gid)
            .bind("GUILD.RANK_ROLES.nicknames")
            .execute(&ctx.data().pool)
            .await;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "setrankroles_command_work_disable")
                .map(|s| s.replace("${interaction.user.id}", &ctx.author().id.get().to_string()))
                .unwrap_or_else(|| {
                    "<@${interaction.user.id}>, you have deleted the rank role!".to_string()
                }),
        )
        .await?;
        return Ok(());
    }
    let (Some(role), Some(part)) = (role, part) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "setrankroles_not_roles_typed")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| {
                    "${client.iHorizon_Emojis.No} You have not included any roles in your command!"
                        .to_string()
                }),
        )
        .await?;
        return Ok(());
    };
    let raw = crate::db::kv_get(&ctx.data().pool, &gid, "GUILD.RANK_ROLES.nicknames").await;
    let mut map: std::collections::HashMap<String, String> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    map.insert(part.trim().to_string(), role.id.get().to_string());
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.RANK_ROLES.nicknames",
        &serde_json::to_string(&map)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "setrankroles_command_work")
            .map(|s| s.replace("${argsid}", &role.id.get().to_string()))
            .unwrap_or_else(|| {
                "Now, when you ping me `@iHorizon` I will add the following roles: <@&${argsid}>"
                    .to_string()
            }),
    )
    .await?;
    Ok(())
}
