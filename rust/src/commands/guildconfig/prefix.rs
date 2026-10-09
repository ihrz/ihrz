use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "setprefix",
    aliases("prefix", "changeprefix"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_prefix(
    ctx: Ctx<'_>,
    #[description = "New prefix (1-5 chars)"] prefix: String,
) -> Result<(), anyhow::Error> {
    let prefix = prefix.trim().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if prefix.is_empty() {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_specify_prefix")
                .unwrap_or_else(|| "Prefix must be 1-5 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if prefix.len() > 5 {
        ctx.say(
            crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_too_long")
                .unwrap_or_else(|| "Prefix must be 1-5 characters.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::db::kv_set(&ctx.data().pool, &gid, "GUILD.PREFIX", &prefix).await?;
    ctx.say(
        crate::lang::get(&code, "guildconfig_setbot_prefix_prefix_is_good")
            .map(|s| s.replace("${formatedPrefix}", &prefix))
            .unwrap_or_else(|| format!("Prefix set to `{prefix}`.")),
    )
    .await?;
    Ok(())
}
