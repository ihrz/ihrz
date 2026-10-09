use super::*;

/// kawaeine meme generator (alias meme3). Mirrors @kawaeine.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "misc",
    rename = "kawaeine",
    aliases("meme3")
)]
pub async fn kawaeine(
    ctx: Ctx<'_>,
    #[description = "Image URL (or attach one)"] image1: Option<String>,
) -> Result<(), anyhow::Error> {
    let (first_att, _) = prefix_attachment_urls(&ctx);
    let url = image1.or(first_att);
    if let Some(stop) = meme_gate(&ctx, std::slice::from_ref(&url)).await {
        if !stop.is_empty() {
            ctx.say(stop).await?;
        }
        return Ok(());
    }
    let url = url.unwrap_or_default();
    let msg_id = ctx.id();
    let assets = meme_assets_dir("kawaeine");
    let temp = crate::funcs::media_temp_dir();
    let outcome = async {
        let (resized, _) =
            prep_meme_image(&url, "beforeSucksResized", msg_id, Some((1920, 1080))).await?;
        let template = crate::funcs::kdenlive_open(&assets.join("meme3.kdenlive"))?;
        let data = kdenlive_substitute(
            &template,
            ("{kawaeine_var}", &temp.display().to_string()),
            &[
                (
                    "before.mp4",
                    &assets.join("before.mp4").display().to_string(),
                ),
                ("after.mp4", &assets.join("after.mp4").display().to_string()),
                ("oof.mp3", &assets.join("oof.mp3").display().to_string()),
                ("placeholder.png", &resized.display().to_string()),
            ],
        );
        Ok::<_, anyhow::Error>((data, vec![resized]))
    }
    .await;
    match outcome {
        Ok((data, resized)) => run_meme(&ctx, data, &resized).await,
        Err(e) => {
            ctx.say(format!("An error occurred: {e}")).await?;
            Ok(())
        }
    }
}
