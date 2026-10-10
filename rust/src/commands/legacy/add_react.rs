use super::*;

/// Add reaction by iHorizon when user send message
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "add-react",
    aliases("react-add", "addreact", "reactadd")
)]
pub async fn add_react(
    ctx: Ctx<'_>,
    #[description = "Trigger (exact match)"] trigger: String,
    #[description = "Response"] response: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("GUILD.REACT_MSG.{}", trigger.trim().to_ascii_lowercase()),
        response.trim(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "add_react_command_work")
            .map(|s| {
                s.replace(
                    "${interaction.member?.id}",
                    &ctx.author().id.get().to_string(),
                )
                .replace(
                    "${message.toLowerCase()}",
                    &trigger.trim().to_ascii_lowercase(),
                )
                .replace("{emoji}", response.trim())
            })
            .unwrap_or_else(|| "<@${interaction.member?.id}>, now when a member sends `${message.toLowerCase()}`, the bot will **react** with {emoji}".to_string()),
    )
    .await?;
    Ok(())
}
