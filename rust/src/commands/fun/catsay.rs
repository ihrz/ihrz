use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "catsay")]
pub async fn catsay(
    ctx: Ctx<'_>,
    #[description = "Text (max 70 chars)"] text: Option<String>,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let text = truncate_catsay_text(text.as_deref().unwrap_or(""));
    // cataas renders server-side: direct image URL, no local render needed.
    let embed = poise::serenity_prelude::CreateEmbed::default().image(catsay_image_url(&text));
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
