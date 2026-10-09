use super::*;

/// List bots. Mirrors !allbots.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "allbots",
    aliases("allb", "bots"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn allbots(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let bots: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.user.bot)
                .map(|m| m.user.tag())
                .collect()
        })
        .unwrap_or_default();
    ctx.say(if bots.is_empty() {
        "No bots.".to_string()
    } else {
        bots.join(", ")
    })
    .await?;
    Ok(())
}
