use super::*;

/// Get a picture of squirrel!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "squirrel",
    description_localized("fr", "Obtenez une photo d'Écureuil"),
    description_localized("ja", "リスの画像を取得！"),
    description_localized("ru", "Получить картинку белки!"),
    description_localized("es-ES", "Obtener una imagen de una ardilla!")
)]
// Mirrors fun !squirrel.ts (animality).
pub async fn squirrel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `animal_pic`.
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/squirrel",
        "image",
        "squirrel_embed_title",
        "chit-chit 🐿️",
    )
    .await
}
