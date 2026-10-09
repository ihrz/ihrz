use super::*;

/// Fox picture. Mirrors fun !fox.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "fox")]
pub async fn fox(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/fox",
        "image",
        "fox_embed_title",
        "fox",
    )
    .await
}
