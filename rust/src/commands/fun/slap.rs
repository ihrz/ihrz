use super::*;

// Slap command. Mirrors fun !slap.ts.
// `user` is required like the TS slash option (`required: true` in
// fun.ts): poise raises an argument error on a bare prefix call, so the
// prefix path has no invoker fallback (TS slap had none either —
// `slap?.id` rendered "undefined" — while hug/kiss fell back to the
// invoker via `|| interaction.author`, both dropped here since the
// option is required). The invoker fallback still documented inside
// `social_gif` is unreachable defensive cover; single deny lives there
// too (see below).
/// Slap a member with a social GIF embed. Mirrors fun !slap.ts.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "slap")]
pub async fn slap(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        Some(&user),
        "slap",
        "slap_embed_description",
        "<@${interaction.user.id}> slaps <@${slap.id}> 😓",
        0x42FF08,
        "${slap.id}",
    )
    .await
}
