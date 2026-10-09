use super::*;

/// Frog picture. Mirrors fun !frog.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "frog")]
pub async fn frog(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/frog",
        "image",
        "frog_embed_title",
        "croak-croak 🐸",
    )
    .await
}
