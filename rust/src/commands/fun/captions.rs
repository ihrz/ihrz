use super::*;

/// `captions` HTML template (`src/assets/html/captions.html`, driven
/// by `images.captions` in `src/core/images.ts`).
const CAPTIONS_CARD_TEMPLATE: &str = include_str!("../../../../src/assets/html/captions.html");

/// html2png options mirror (`images.captions`: `.meme-container`,
/// no viewport overrides).
const CAPTIONS_OPTIONS_JSON: &str =
    r#"{"omitBackground":true,"selectElement":true,"elementSelector":".meme-container"}"#;

/// Fill the `captions` template. Mirrors the replaces in
/// `images.captions(img, text)` (`{X}` source image, `{Z}` caption).
pub fn captions_card_html(image_url: &str, text: &str) -> String {
    CAPTIONS_CARD_TEMPLATE
        .replace("{X}", image_url)
        .replace("{Z}", text)
}

/// Output filename. Mirrors `name: "captions.gif"` in `!captions.ts`.
pub fn captions_output_name() -> &'static str {
    "captions.gif"
}

/// html2png element selector. Mirrors `images.captions` (`captions.html`).
pub fn captions_template_selector() -> &'static str {
    ".meme-container"
}

/// Template variables for `captions.html`: `{X}` is the source image,
/// `{Z}` is the caption text. Mirrors `images.captions(img, text)`.
pub fn captions_render_vars(image_url: &str, text: &str) -> (String, String) {
    (image_url.to_string(), text.to_string())
}

/// Add text on top of your own image
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "captions",
    description_localized("fr", "ajouter du texte au dessus de votre image"),
    description_localized("ja", "自分の画像の上にテキストを追加"),
    description_localized("ru", "Добавить текст поверх вашего изображения"),
    description_localized("es-ES", "Añadir texto encima de tu propia imagen")
)]
pub async fn captions(
    ctx: Ctx<'_>,
    #[description_localized("fr", "fichier image")]
    #[description_localized("ja", "画像ファイル")]
    #[description_localized("ru", "файл изображения")]
    #[description_localized("es-ES", "archivo de imagen")]
    #[description = "image file"]
    image: poise::serenity_prelude::Attachment,
    #[description_localized("fr", "votre texte")]
    #[description_localized("ja", "あなたの字幕")]
    #[description_localized("ru", "ваши подписи")]
    #[description_localized("es-ES", "tus subtítulos")]
    #[description = "your captions"]
    // `#[rest]` mirrors the prefix `longString(args, 0)` (whole tail) in
    // `!captions.ts`; slash uses `getString("query", true)`. `Option`
    // mirrors its empty case, answered with the TS checkCommandArgs usage
    // embed like catsay/morse/question.
    #[rest]
    query: Option<String>,
) -> Result<(), anyhow::Error> {
    // No disabled-category check in `!captions.ts`: no fun_guard here
    // (parity: no deny where TS has none).
    // Bare call first (TS checkCommandArgs runs before the command body).
    let Some(query) = query else {
        usage_reply(&ctx, "captions").await?;
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `client.func.validImageType(image.contentType)` in `!captions.ts`
    // (exact allowlist: png/jpeg/jpg/gif/webp); the deny is the `No`
    // app-emoji reply like `!captions.ts` and `!bubbles.ts`.
    if !crate::funcs::is_valid_image_type(image.content_type.as_deref()) {
        deny_no_emoji(&ctx).await;
        return Ok(());
    }
    // Gateway leg (`images.captions` in `src/core/images.ts`): the
    // filled `captions.html` through HorizonGateway. The gateway
    // returns a PNG still (attached as `captions.png`); failure keeps
    // the pending-text reply below (it reuses the shared bubbles
    // pending template: no YAML edits allowed, so no captions-specific
    // key may be introduced).
    if let Some(base) = ctx.data().config.gateway_internal() {
        let token = crate::config::api_token().unwrap_or_default();
        let html = captions_card_html(&image.url, &query);
        if let Ok(png) = crate::funcs::gateway_render_html(
            &base,
            &token,
            &html,
            CAPTIONS_OPTIONS_JSON,
            &[],
            Some(std::time::Duration::from_secs(30)),
        )
        .await
        {
            use poise::serenity_prelude as serenity;
            let embed = serenity::CreateEmbed::default().image("attachment://captions.png");
            ctx.send(
                poise::CreateReply::default()
                    .embed(embed)
                    .attachment(serenity::CreateAttachment::bytes(png, "captions.png")),
            )
            .await?;
            return Ok(());
        }
    }
    // The GIF producer `captions()` in src/core/images.ts renders the
    // `captions.html` template through `html2png` (headless Chromium,
    // `.meme-container` selector): standing exclusion, no renderer exists
    // in the Rust tree, so no GIF can be produced here. The text reply
    // below is the placeholder surface (it reuses the shared bubbles
    // pending template: no YAML edits allowed, so no captions-specific
    // key may be introduced).
    let file = captions_output_name();
    ctx.say(
        crate::lang::get(&code, "fun_bubbles_pending")
            .map(|s| {
                s.replace("${file}", file)
                    .replace("${url}", &image.url)
                    .replace("${query}", &query)
            })
            .unwrap_or_else(|| format!("{file} (render pending for {})", image.url)),
    )
    .await?;
    Ok(())
}

/// Missing-input usage embed. Mirrors checkCommandArgs/sendErrorMessage
/// for this command's single required String option (`required: true`
/// in fun.ts): an empty prefix tail parses as `None`, so the command
/// replays the same `hybridcommands_args_error_embed_desc` caret embed
/// TS sends (`!captions [string]`, caret on the missing arg). Both lang
/// keys already exist in YAML, so no new key is needed.
async fn usage_reply(ctx: &Ctx<'_>, cmd: &str) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let gid = ctx.guild_id().map(|g| g.get());
    let code = crate::db::guild_lang(pool, gid).await;
    let prefix = crate::db::guild_prefix(pool, gid, &ctx.data().config.prefix).await;
    let token = "[string]".to_string();
    let desc = crate::funcs_send::args_error_description(
        &code,
        cmd,
        &prefix,
        cmd,
        &crate::funcs_send::args_error_line(&[("string".to_string(), true)]),
        &crate::funcs_send::error_position(&prefix, cmd, &[token], 0),
        "string",
    );
    let footer = crate::lang::get(&code, "hybridcommands_embed_footer_text")
        .unwrap_or_else(|| {
            "Options within [...] are required, while those within <...> are optional.\nUse the command: ${botPrefix}help [command] for more information."
                .to_string()
        })
        .replace("${botPrefix}", &prefix);
    let gid_str = gid.map(|g| g.to_string()).unwrap_or_default();
    let (_, fbytes) = crate::commands::shared::footer_parts(ctx, &gid_str).await;
    let embed = crate::commands::shared::embed_with_footer(
        poise::serenity_prelude::CreateEmbed::default()
            .description(desc)
            .colour(0xED_4245_u32),
        &footer,
        fbytes.is_some(),
    );
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = fbytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
}

#[cfg(test)]
mod captions_tests {
    use super::*;

    #[test]
    fn captions_shape_matches_ts() {
        assert_eq!(captions_output_name(), "captions.gif");
        assert_eq!(captions_template_selector(), ".meme-container");
        let (x, z) = captions_render_vars("https://cdn/x.png", "hi");
        assert_eq!(x, "https://cdn/x.png");
        assert_eq!(z, "hi");
        // Guard mirrors the exact TS allowlist (incl. webp, excl. svg).
        assert!(crate::funcs::is_valid_image_type(Some("image/webp")));
        assert!(crate::funcs::is_valid_image_type(Some("IMAGE/PNG")));
        assert!(!crate::funcs::is_valid_image_type(Some("image/svg+xml")));
        assert!(!crate::funcs::is_valid_image_type(None));
    }

    #[test]
    fn captions_card_fill_replaces_xz() {
        let html = captions_card_html("https://cdn/x.png", "hi");
        assert!(!html.contains("{X}"));
        assert!(!html.contains("{Z}"));
        assert!(html.contains("https://cdn/x.png"));
        assert!(html.contains("hi"));
    }

    #[test]
    fn query_is_optional_so_bare_prefix_reaches_usage() {
        // `!captions <image>` with no text must reach `usage_reply` (TS
        // checkCommandArgs caret embed), not a framework parse error:
        // the `query` param stays `Option` like catsay/morse/question.
        let cmds = crate::commands::all();
        let fun = cmds.iter().find(|c| c.name == "fun").expect("fun missing");
        let image = fun
            .subcommands
            .iter()
            .find(|c| c.name == "image")
            .expect("image missing");
        let captions = image
            .subcommands
            .iter()
            .find(|c| c.name == "captions")
            .expect("captions missing");
        let p = captions
            .parameters
            .iter()
            .find(|x| x.name == "query")
            .expect("param query");
        assert!(!p.required);
    }
}
