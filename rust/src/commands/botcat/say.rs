use super::*;

/// Send a message through the bot. Mirrors say.ts (`"> " + content`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn say(
    ctx: Ctx<'_>,
    #[description = "What you want the bot to say"] content: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let footer = crate::lang::get(&code, "say_footer_msg")
        .map(|s| {
            s.replace(
                "${interaction.user}",
                &format!("<@{}>", ctx.author().id.get()),
            )
        })
        .unwrap_or_default();
    ctx.say(format!("> {content}{footer}")).await?;
    Ok(())
}
