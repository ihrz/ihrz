use super::*;

/// Output filename. Mirrors `name: "catsay.png"` in `!catsay.ts`.
pub fn catsay_output_name() -> &'static str {
    "catsay.png"
}

/// html2png element selector. Mirrors `images.catsay` (`catsay.html`).
pub fn catsay_template_selector() -> &'static str {
    ".meme-container"
}

/// Template variables for `catsay.html`: `{X}` is the cat image from
/// thecatapi, `{Z}` is the speech text. Mirrors `images.catsay(img, text)`.
pub fn catsay_render_vars(image_url: &str, text: &str) -> (String, String) {
    (image_url.to_string(), text.to_string())
}

/// Down-API reply. Mirrors the catch-path `fun_var_down_api` in `!catsay.ts`.
async fn catsay_down(ctx: &Ctx<'_>, code: &str) -> Result<(), anyhow::Error> {
    ctx.say(
        crate::lang::get(code, "fun_var_down_api")
            .unwrap_or_else(|| "Error: Seems like the API is down!".to_string()),
    )
    .await?;
    Ok(())
}
/// Cat say (insert text here)
#[poise::command(slash_command, prefix_command, category = "fun", rename = "catsay")]
pub async fn catsay(
    ctx: Ctx<'_>,
    // `#[rest]` mirrors the prefix `longString(args, 0)` (whole tail,
    // was single-word before); `Option` mirrors its `|| null` empty
    // case, answered with the TS checkCommandArgs usage embed.
    #[description = "Text (max 70 chars)"]
    #[rest]
    text: Option<String>,
) -> Result<(), anyhow::Error> {
    // Bare call first: TS checkCommandArgs validates before run, so
    // usage wins over the thecatapi fetch and the fun kill-switch.
    let Some(text) = text else {
        usage_reply(&ctx, "catsay").await?;
        return Ok(());
    };
    // Mirrors `!catsay.ts`: the thecatapi search runs BEFORE the
    // disabled-category check.
    // Mirrors the thecatapi search call in `!catsay.ts`
    // (`mime_types=jpg,png`).
    let cat_url = match reqwest::Client::new().get(catsay_search_url()).send().await {
        Ok(resp) => match resp.text().await {
            Ok(text) => parse_cat_json(&text),
            Err(_) => None,
        },
        Err(_) => None,
    };
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(cat_url) = cat_url else {
        catsay_down(&ctx, &code).await?;
        return Ok(());
    };
    // Mirrors `.slice(0, 70)` on the text option.
    let text = truncate_catsay_text(&text);
    let (_img_var, _text_var) = catsay_render_vars(&cat_url, &text);
    // Speech-bubble render (`html2png` catsay template, `.meme-container`)
    // pending; the fetched thecatapi image is sent directly with the text
    // as the description so no input is lost. Footer mirrors TS.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let embed = crate::commands::shared::embed_with_footer(
        poise::serenity_prelude::CreateEmbed::default()
            .colour(0x010101)
            .description(&text)
            .image(cat_url)
            .timestamp(poise::serenity_prelude::Timestamp::now()),
        &fname,
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

/// Missing-input usage embed. Mirrors checkCommandArgs/sendErrorMessage
/// for this command's single required String option (`required: true`
/// in fun.ts): an empty prefix tail parses as `None`, so the command
/// replays the same `hybridcommands_args_error_embed_desc` caret embed
/// TS sends (`!catsay [string]`, caret on the missing arg). Both lang
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
mod catsay_tests {
    use super::*;

    #[test]
    fn catsay_shape_matches_ts() {
        assert_eq!(catsay_output_name(), "catsay.png");
        assert_eq!(catsay_template_selector(), ".meme-container");
        // thecatapi search URL mirrors the TS axios call.
        assert_eq!(
            catsay_search_url(),
            "https://api.thecatapi.com/v1/images/search?mime_types=jpg,png"
        );
        // Template vars: {X} = cat image, {Z} = speech text.
        let (x, z) = catsay_render_vars("https://cdn/cat.jpg", "meow");
        assert_eq!(x, "https://cdn/cat.jpg");
        assert_eq!(z, "meow");
        // Text truncation mirrors `.slice(0, 70)`.
        assert_eq!(truncate_catsay_text(&"a".repeat(100)).chars().count(), 70);
        // thecatapi JSON shape ([{"url": ...}]).
        assert_eq!(
            parse_cat_json(r#"[{"url":"https://cdn/c.jpg"}]"#).as_deref(),
            Some("https://cdn/c.jpg")
        );
        assert_eq!(parse_cat_json("[]"), None);
    }
}
