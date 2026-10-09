use super::*;

/// Panda picture. Mirrors fun !panda.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "panda")]
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
