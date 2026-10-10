use super::*;

/// Kiss command. Mirrors fun !kiss.ts.
// Target defaults to the invoker on prefix (`|| interaction.author`);
// single deny lives in `social_gif` (see below).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "kiss")]
pub async fn kiss(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        user.as_ref(),
        "kiss",
        "kiss_embed_description",
        "<@${interaction.user.id}> gives a kiss to <@${kiss.id}> 💏",
        0xFF0884,
        "${kiss.id}",
    )
    .await
}
