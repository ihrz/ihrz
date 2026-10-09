use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "GUILD.RANKS.disable",
        if enabled { "0" } else { "1" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(
            &code,
            if enabled {
                "disablexp_command_work_enable"
            } else {
                "disablexp_command_work_disable"
            },
        )
        .unwrap_or_else(|| {
            if enabled {
                "Ranks on.".to_string()
            } else {
                "Ranks off.".to_string()
            }
        }),
    )
    .await?;
    Ok(())
}
