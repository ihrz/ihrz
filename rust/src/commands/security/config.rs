use super::*;

/// Config the message when user earn new xp level message!
// Verdict (ADMINISTRATOR default, kept): mirrors the TS per-leg
// `permission: Administrator` gate (`security.ts`, config leg).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn security_config(
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
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    save_security_bool(
        &ctx.data().pool,
        &gid,
        "SECURITY.disable",
        disable_flag(enabled),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "security_disable_pw_on"
    } else {
        "security_disable_pw_off"
    };
    let msg = crate::lang::get(&code, key)
        .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
        .unwrap_or_else(|| key.to_string());
    ctx.say(msg).await?;
    Ok(())
}
