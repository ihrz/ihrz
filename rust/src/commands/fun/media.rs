use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "caracteres")]
pub async fn caracteres(
    ctx: Ctx<'_>,
    #[description = "Text to transform"] text: String,
    #[description = "Style: Bold, Full, Circled"] style: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let style = style.unwrap_or_else(|| "Bold".to_string());
    match caracteres_convert(&text, &style) {
        Some(out) => {
            ctx.say(
                crate::lang::get(&code, "msg_style_out")
                    .map(|s| s.replace("{style}", &style).replace("{out}", &out))
                    .unwrap_or_else(|| format!("**{style}**: {out}")),
            )
            .await?;
        }
        None => {
            ctx.say(format!(
                "Unknown style `{style}`. Available: {}",
                caracteres_styles().join(", ")
            ))
            .await?;
        }
    }
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "transgender"
)]
pub async fn transgender(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let u = user.unwrap_or_else(|| ctx.author().clone());
    let avatar = u.face();
    // Canvas fetch pending; URL shape ported.
    ctx.say(transgender_url(&avatar)).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "youtube")]
pub async fn youtube(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    #[description = "Comment"] comment: String,
) -> Result<(), anyhow::Error> {
    if !has_comment(&comment) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "fun_var_good_sentence")
                .unwrap_or_else(|| "Please, send a good sentence.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = user
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let display = truncate_display_name(&name);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    // html2png comment-card render pending; text shape ported.
    ctx.say(format!(
        "{display}: {comment} ({} likes, render pending)",
        youtube_likes(now)
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "tweet")]
pub async fn tweet(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    #[description = "Comment"] comment: String,
) -> Result<(), anyhow::Error> {
    if !has_comment(&comment) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "fun_var_good_sentence")
                .unwrap_or_else(|| "Please, send a good sentence.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = user
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let display = truncate_display_name(&name);
    let handle = tweet_handle(&ctx.author().name);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    let s = tweet_stats(now);
    // html2png tweet-card render pending; text shape ported.
    ctx.say(format!(
        "{display} {handle}: {comment} ({} likes, {} RTs, {} replies, {} views, render pending)",
        s.likes, s.retweets, s.replies, s.views
    ))
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "bubbles")]
pub async fn bubbles(
    ctx: Ctx<'_>,
    #[description = "Image"] image: poise::serenity_prelude::Attachment,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !bubbles_valid_content_type(image.content_type.as_deref()) {
        ctx.say(
            crate::lang::get(&code, "msg_invalid_image_type")
                .unwrap_or_else(|| "Invalid image type.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // GIF render (html2png bubbles template) pending; validation shape ported.
    ctx.say(format!(
        "{} (render pending for {})",
        bubbles_output_name(),
        image.url
    ))
    .await?;
    Ok(())
}

/// Translate text (MyMemory free API). Mirrors !trans.ts text path
/// (image render pending).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "trans")]
pub async fn trans(
    ctx: Ctx<'_>,
    #[description = "Text"] text: String,
    #[description = "Target lang (e.g. fr, en, ja)"] target: Option<String>,
) -> Result<(), anyhow::Error> {
    let target = target.unwrap_or_else(|| "en".to_string());
    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair=autodetect|{}",
        pct_encode(&text),
        pct_encode(&target)
    );
    let body = match http_client().get(&url).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => String::new(),
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match parse_translation(&body) {
        Some(t) => {
            ctx.say(t).await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "msg_translation_failed")
                    .unwrap_or_else(|| "Translation failed.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
