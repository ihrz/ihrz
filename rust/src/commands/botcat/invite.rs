use super::*;

/// Get the bot invite link. Mirrors invite.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    aliases("inviteme", "oauth")
)]
pub async fn invite(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let app_id = ctx.serenity_context().cache.current_user().id;
    let url = format!(
        "https://discord.com/api/oauth2/authorize?client_id={app_id}&permissions=8&scope=bot"
    );
    ctx.say(url).await?;
    Ok(())
}
