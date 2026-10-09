use super::*;

/// Squirrel picture. Mirrors fun !squirrel.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "squirrel")]
pub async fn squirrel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/squirrel",
        "image",
        "squirrel_embed_title",
        "chit-chit 🐿️",
    )
    .await
}
