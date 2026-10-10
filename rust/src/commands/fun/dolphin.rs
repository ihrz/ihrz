use super::*;

/// Get a picture of dolphin!
#[poise::command(slash_command, prefix_command, category = "fun", rename = "dolphin")]
// Mirrors fun !dolphin.ts (animality).
pub async fn dolphin(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `animal_pic`.
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/dolphin",
        "image",
        "dolphin_embed_title",
        "eee-eee-click-click 🐬",
    )
    .await
}
