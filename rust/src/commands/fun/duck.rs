use super::*;

/// Get a picture of duck!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "duck",
    name_localized("fr", "cannard"),
    name_localized("ja", "duck"),
    name_localized("ru", "duck"),
    name_localized("es-ES", "duck"),
    description_localized("fr", "Obtenez une photo de cannard"),
    description_localized("ja", "アヒルの画像を取得！"),
    description_localized("ru", "Получить картинку утки!"),
    description_localized("es-ES", "Obtener una imagen de un pato!")
)]
// Mirrors fun !duck.ts (random-d.uk).
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
