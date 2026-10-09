use super::*;

/// Block bot joins. Mirrors blockBot config (GUILD.BLOCK_BOT).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "blockbot",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_blockbot(
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
        "GUILD.BLOCK_BOT",
        if enabled { "1" } else { "0" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if enabled {
        crate::lang::get(&code, "blockbot_command_work_on_enable").unwrap_or_else(|| {
            "**You have enabled the `BlockBot`**\nNow bots **can't** be added to this guild!"
                .to_string()
        })
    } else {
        crate::lang::get(&code, "blockbot_command_work_on_disable").unwrap_or_else(|| {
            "**You have disabled the `BlockBot`**\nNow bots **can** be added to this guild!"
                .to_string()
        })
    })
    .await?;
    Ok(())
}
