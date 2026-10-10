use super::*;

// Kiss command. Mirrors fun !kiss.ts.
// `user` is required like the TS slash option (`required: true` in
// fun.ts): poise raises an argument error on a bare prefix call, so
// the TS prefix invoker fallback (`|| interaction.author`) is
// intentionally dropped. The invoker fallback still documented inside
// `social_gif` is unreachable defensive cover; single deny lives there
// too (see below).
/// Kiss a member with a social GIF embed. Mirrors fun !kiss.ts.
#[poise::command(slash_command, prefix_command, category = "fun", rename = "kiss")]
pub async fn kiss(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `social_gif`.
    social_gif(
        &ctx,
        Some(&user),
        "kiss",
        "kiss_embed_description",
        "<@${interaction.user.id}> gives a kiss to <@${kiss.id}> 💏",
        0xFF0884,
        "${kiss.id}",
    )
    .await
}
