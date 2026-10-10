use super::*;

// Hug command. Mirrors fun !hug.ts.
// `user` is required like the TS slash option (`required: true` in
// fun.ts): poise raises an argument error on a bare prefix call, so
// the TS prefix invoker fallback (`|| interaction.author`) is
// intentionally dropped. The invoker fallback still documented inside
// `social_gif` is unreachable defensive cover; single deny lives there
// too (see below).
/// Hug a member with a social GIF embed. Mirrors fun !hug.ts.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "hug")]
pub async fn hug(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        Some(&user),
        "hug",
        "hug_embed_title",
        "<@${interaction.user.id}> gives a hug to <@${hug.id}> ❤️",
        0xFFB6C1,
        "${hug.id}",
    )
    .await
}
