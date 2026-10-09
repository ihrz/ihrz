use super::*;

/// Dolphin picture. Mirrors fun !dolphin.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "dolphin")]
pub async fn dolphin(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/dolphin",
        "image",
        "dolphin_embed_title",
        "dolphin",
    )
    .await
}
