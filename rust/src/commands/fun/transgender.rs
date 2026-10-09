use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "transgender"
)]
pub async fn transgender(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.unwrap_or_else(|| ctx.author().clone());
    let avatar = u.face();
    // Canvas fetch pending; URL shape ported.
    ctx.say(transgender_url(&avatar)).await?;
    Ok(())
}
