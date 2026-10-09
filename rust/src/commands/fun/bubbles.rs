use super::*;

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
    let file = bubbles_output_name();
    ctx.say(
        crate::lang::get(&code, "fun_bubbles_pending")
            .map(|s| s.replace("${file}", file).replace("${url}", &image.url))
            .unwrap_or_else(|| format!("{file} (render pending for {})", image.url)),
    )
    .await?;
    Ok(())
}
