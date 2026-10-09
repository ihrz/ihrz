use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "hack")]
pub async fn hack(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    ctx.say(hack_lines(&user.tag()).join("\n")).await?;
    Ok(())
}
