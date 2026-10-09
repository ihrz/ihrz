use super::*;

/// Enable/disable fun commands. Mirrors fun !config.ts (GUILD.FUN.states).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn fun_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::backends::Backend::sqlite(ctx.data().pool.clone())
        .table(&gid)
        .set("GUILD.FUN.states", if enabled { "1" } else { "0" })
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let action_type = crate::lang::get(
        &code,
        if enabled {
            "var_enabled"
        } else {
            "var_disabled"
        },
    )
    .unwrap_or_else(|| {
        if enabled {
            "Enabled".to_string()
        } else {
            "Disabled".to_string()
        }
    });
    ctx.say(
        crate::lang::get(&code, "fun_disable_command_msg")
            .unwrap_or_else(|| {
                "${interaction.member?.user.toString()}, you have ${action_type} the fun category!"
                    .to_string()
            })
            .replace("${action_type}", &action_type)
            .replace(
                "${interaction.member?.user.toString()}",
                &format!("<@{}>", ctx.author().id.get()),
            ),
    )
    .await?;
    Ok(())
}
