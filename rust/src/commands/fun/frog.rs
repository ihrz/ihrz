use super::*;

/// Get a picture of frog!
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "frog",
    description_localized("fr", "Obtenez une photo de grenouille"),
    description_localized("ja", "カエルの画像を取得！"),
    description_localized("ru", "Получить картинку лягушки!"),
    description_localized("es-ES", "Obtener una imagen de una rana!")
)]
// Mirrors fun !frog.ts (animality).
pub async fn frog(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Single deny: the disabled-category check lives in `animal_pic`.
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/frog",
        "image",
        "frog_embed_title",
        "croak-croak 🐸",
    )
    .await
}
