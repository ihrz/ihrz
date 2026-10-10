use super::*;

/// Slap command. Mirrors fun !slap.ts.
// Deliberate deviation (documented): TS has no no-target fallback and
// renders `${slap.id}` as "undefined" (`slap?.id`), while hug/kiss fall
// back to the invoker. Slapping yourself reads better than slapping
// "undefined", so the invoker fallback from `social_gif` applies here too.
// Single deny lives in `social_gif` (see below).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "slap")]
pub async fn slap(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        user.as_ref(),
        "slap",
        "slap_embed_description",
        "<@${interaction.user.id}> slaps <@${slap.id}> 😓",
        0x42FF08,
        "${slap.id}",
    )
    .await
}
