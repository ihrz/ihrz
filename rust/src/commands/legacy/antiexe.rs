use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "antiexe",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn antiexe(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "UTILS.antiExe",
        if enabled { "1" } else { "0" },
    )
    .await?;
    ctx.say(if enabled {
        "AntiExe on."
    } else {
        "AntiExe off."
    })
    .await?;
    Ok(())
}
