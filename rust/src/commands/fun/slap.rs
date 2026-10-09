use super::*;

/// Slap command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "slap")]
pub async fn slap(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    social_gif(
        &ctx,
        &user,
        "slap",
        "slap_embed_description",
        "<@${interaction.user.id}> slaps <@${slap.id}> 😓",
        0x42FF08,
        "${slap.id}",
    )
    .await
}
