use super::*;

/// Kiss command.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "kiss")]
pub async fn kiss(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    social_gif(
        &ctx,
        &user,
        "kiss",
        "kiss_embed_description",
        "<@${interaction.user.id}> gives a kiss to <@${kiss.id}> 💏",
        0xFF0884,
        "${kiss.id}",
    )
    .await
}
