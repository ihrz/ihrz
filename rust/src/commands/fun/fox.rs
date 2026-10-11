use super::*;

/// Get a picture of fox!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "fox",
    description_localized("fr", "Obtenez une photo de renard"),
    description_localized("ja", "キツネの画像を取得！"),
    description_localized("ru", "Получить картинку лисы!"),
    description_localized("es-ES", "Obtener una imagen de un zorro!")
)]
// Mirrors fun !fox.ts (animality).
pub async fn fox(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `animal_pic`.
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/fox",
        "image",
        "fox_embed_title",
        "wa-pa-pa-pa-pa 🦊",
    )
    .await
}
