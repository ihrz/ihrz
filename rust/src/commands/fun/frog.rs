use super::*;

/// Get a picture of frog!
#[poise::command(slash_command, prefix_command, category = "fun", rename = "frog")]
// Mirrors fun !frog.ts (animality).
pub async fn frog(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `animal_pic`.
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/frog",
        "image",
        "frog_embed_title",
        "croak-croak 🐸",
    )
    .await
}
