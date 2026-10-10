use super::*;

/// Hug command. Mirrors fun !hug.ts.
// Target defaults to the invoker on prefix (`|| interaction.author`);
// single deny lives in `social_gif` (see below).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "hug")]
pub async fn hug(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        user.as_ref(),
        "hug",
        "hug_embed_title",
        "<@${interaction.user.id}> gives a hug to <@${hug.id}> ❤️",
        0xFFB6C1,
        "${hug.id}",
    )
    .await
}
