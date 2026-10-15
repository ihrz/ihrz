use super::*;

/// `bubbles` HTML template (`src/assets/html/bubbles.html`, driven by
/// `images.bubbles` in `src/core/images.ts`).
const BUBBLES_CARD_TEMPLATE: &str = include_str!("../../../../src/assets/html/bubbles.html");

/// html2png options mirror (`images.bubbles`: `.meme-container`,
/// no viewport overrides).
const BUBBLES_OPTIONS_JSON: &str =
    r#"{"omitBackground":true,"selectElement":true,"elementSelector":".meme-container"}"#;

/// Fill the `bubbles` template. Mirrors the replace in
/// `images.bubbles(img)` (`{X}` source image).
pub fn bubbles_card_html(image_url: &str) -> String {
    BUBBLES_CARD_TEMPLATE.replace("{X}", image_url)
}

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
    // Gateway leg (`images.bubbles` in `src/core/images.ts`): the
    // filled `bubbles.html` through HorizonGateway. `html2png`
    // returns PNG bytes, but TS attaches them as `bubbles.gif`
    // (`!bubbles.ts:54`) with no embed — mirror that verbatim
    // (filename + bare file); failure keeps the pending-text reply.
    if let Some(base) = ctx.data().config.gateway_internal() {
        let token = crate::config::api_token().unwrap_or_default();
        let html = bubbles_card_html(&image.url);
        if let Ok(png) = crate::funcs::gateway_render_html(
            &base,
            &token,
            &html,
            BUBBLES_OPTIONS_JSON,
            &[],
            Some(std::time::Duration::from_secs(30)),
        )
        .await
        {
            use poise::serenity_prelude as serenity;
            ctx.send(
                poise::CreateReply::default()
                    .attachment(serenity::CreateAttachment::bytes(png, "bubbles.gif")),
            )
            .await?;
            return Ok(());
        }
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

#[cfg(test)]
mod bubbles_card_tests {
    use super::*;

    #[test]
    fn bubbles_card_fill_replaces_x() {
        let html = bubbles_card_html("https://cdn/x.png");
        assert!(!html.contains("{X}"));
        assert!(html.contains("https://cdn/x.png"));
    }
}
