use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "support",
    aliases("soutien"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_support(
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
        "GUILD.SUPPORT",
        if enabled { "1" } else { "0" },
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if enabled {
        ctx.say("Support on.").await?;
    } else {
        let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
        ctx.say(
            crate::lang::get(&code, "support_command_work_on_disable")
                .map(|s| s.replace("${interaction.guild.name}", &guild_name))
                .unwrap_or_else(|| "You have set up the support module for **${interaction.guild.name}**.\nNobody will receive a role now!".to_string()),
        )
        .await?;
    }
    Ok(())
}
