use super::*;

/// Duck picture. Mirrors fun !duck.ts (random-d.uk).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "duck")]
pub async fn duck(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `animal_pic`.
    animal_pic(
        &ctx,
        "https://random-d.uk/api/v2/random",
        "url",
        "duck_embed_title",
        "Quack :duck:",
    )
    .await
}
