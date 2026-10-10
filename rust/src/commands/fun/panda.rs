use super::*;

/// Get a picture of panda!
#[poise::command(slash_command, prefix_command, category = "fun", rename = "panda")]
// Mirrors fun !panda.ts (animality).
// Guarded via `animal_pic` (single deny, like every sibling): no outer
// `fun_guard` here so a disabled category replies exactly once.
pub async fn panda(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/panda",
        "image",
        "panda_embed_title",
        "Mwaa 🐼",
    )
    .await
}
