use super::*;

/// Add bubble on top of your own image
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "bubbles",
    description_localized("fr", "ajouter une bulle au dessus de votre image"),
    description_localized("ja", "自分の画像の上に吹き出しを追加"),
    description_localized("ru", "Добавить пузырек поверх вашего изображения"),
    description_localized("es-ES", "Añadir burbuja encima de tu propia imagen")
)]
pub async fn bubbles(
    ctx: Ctx<'_>,
    #[description_localized("fr", "fichier image")]
    #[description_localized("ja", "画像ファイル")]
    #[description_localized("ru", "файл изображения")]
    #[description_localized("es-ES", "archivo de imagen")]
    #[description = "image file"]
    image: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!bubbles.ts`: no fun_guard here.
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !crate::funcs::is_valid_image_type(image.content_type.as_deref()) {
        // Mirrors the `client.iHorizon_Emojis.No` deny reply in `!bubbles.ts`.
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(no).await?;
        return Ok(());
    }
    // GIF render (html2png bubbles template) pending; validation shape ported.
    let file = bubbles_output_name();
    ctx.say(
        crate::lang::get(&code, "fun_bubbles_pending")
            .map(|s| s.replace("${file}", file).replace("${url}", &image.url))
            .unwrap_or_else(|| format!("{file} (render pending for {})", image.url)),
    )
    .await?;
    Ok(())
}
