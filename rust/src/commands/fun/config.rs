use super::*;

/// Enable/disable fun commands. Mirrors fun !config.ts.
// The raw action string is stored under `GUILD.FUN.states`; anything but
// `"off"` counts as enabled (`action === "off" ? var_disabled : var_enabled`).
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
    // Mirrors `await client.db.set(..., action)`: the raw action is stored.
    crate::backends::Backend::sqlite(ctx.data().pool.clone())
        .table(&gid)
        .set("GUILD.FUN.states", action.as_str())
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `action === "off" ? lang.var_disabled : lang.var_enabled`.
    let action_type = crate::lang::get(
        &code,
        if action == "off" {
            "var_disabled"
        } else {
            "var_enabled"
        },
    )
    .unwrap_or_else(|| {
        if action == "off" {
            "Disabled".to_string()
        } else {
            "Enabled".to_string()
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
