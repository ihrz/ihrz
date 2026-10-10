use super::*;

/// Remove reaction by iHorizon when user send message
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "remove-react",
    aliases("react-remove", "removereact", "reactremove")
)]
pub async fn remove_react(
    ctx: Ctx<'_>,
    #[description = "Trigger"] trigger: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("GUILD.REACT_MSG.{}", trigger.trim().to_ascii_lowercase()),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "remove_react_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.member?.id}",
                    &ctx.author().id.get().to_string(),
                )
                .replace(
                    "${message.toLowerCase()}",
                    &trigger.trim().to_ascii_lowercase(),
                )
            })
            .unwrap_or_else(|| "<@${interaction.member?.id}>, now when a member sends `${message.toLowerCase()}`, the bot will **no longer react**.".to_string()),
    )
    .await?;
    Ok(())
}
