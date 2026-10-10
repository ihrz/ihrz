use super::*;

/// Config the message when user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn pfps_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(&action) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_use_on_off").unwrap_or_else(|| "Use on/off.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let flag = if enabled { "0" } else { "1" };
    save_pfps_string(&ctx.data().pool, &gid, "PFPS.disable", flag).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "pfps_config_command_action_on"
    } else {
        "pfps_config_command_action_off"
    };
    ctx.say(
        crate::lang::get(&code, key)
            .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
            .unwrap_or_else(|| key.to_string()),
    )
    .await?;
    Ok(())
}
