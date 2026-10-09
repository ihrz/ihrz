use super::*;

/// Hug command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "hug")]
pub async fn hug(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    social_gif(
        &ctx,
        &user,
        "hug",
        "hug_embed_title",
        "<@${interaction.user.id}> gives a hug to <@${hug.id}>",
        0xFFB6C1,
        "${hug.id}",
    )
    .await
}
