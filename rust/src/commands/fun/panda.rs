use super::*;

/// Get a picture of panda!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "panda",
    description_localized("fr", "Obtenez une photo de panda"),
    description_localized("ja", "パンダの画像を取得！"),
    description_localized("ru", "Получить картинку панды!"),
    description_localized("es-ES", "Obtener una imagen de un panda!")
)]
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
