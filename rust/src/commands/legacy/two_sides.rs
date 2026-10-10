use super::*;

/// two-sides meme generator (alias meme2). Mirrors @two-sides.ts.
// SCOPE (prefix-only vs dual): the TS source declares
// `type: "PREFIX_IHORIZON_COMMAND"` (prefix-only intent). This port
// keeps dual registration (slash + prefix) like every other legacy
// @-command: narrowing one command alone would fragment the registry,
// so prefix-only narrowing is deferred to a port-wide legacy-scope
// pass. Do not flip this registration without that pass.
#[poise::command(
    slash_command,
    prefix_command,
    category = "misc",
    rename = "two-sides",
    aliases("meme2")
)]
pub async fn two_sides(
    ctx: Ctx<'_>,
    #[description = "First image URL (or attach)"] image1: Option<String>,
    #[description = "Second image URL (or attach)"] image2: Option<String>,
) -> Result<(), anyhow::Error> {
    let (first_att, last_att) = prefix_attachment_urls(&ctx);
    let url1 = image1.or(first_att);
    let url2 = image2.or(last_att);
    if let Some(stop) = meme_gate(&ctx, &[url1.clone(), url2.clone()]).await {
        if !stop.is_empty() {
            ctx.say(stop).await?;
        }
        return Ok(());
    }
    let (url1, url2) = (url1.unwrap_or_default(), url2.unwrap_or_default());
    let msg_id = ctx.id();
    let assets = meme_assets_dir("two-sides");
    let temp = crate::funcs::media_temp_dir();
    let outcome = async {
        let (resized1, mt1) = prep_meme_image(&url1, "beforeSucksResized", msg_id, None).await?;
        let (resized2, mt2) = prep_meme_image(&url2, "bigSucksResized", msg_id, None).await?;
        let template = crate::funcs::kdenlive_open(&assets.join("meme2.kdenlive"))?;
        let data = kdenlive_substitute(
            &template,
            ("{two-sides_var}", &temp.display().to_string()),
            &[
                ("part1.mp4", &assets.join("part1.mp4").display().to_string()),
                ("part2.mp4", &assets.join("part2.mp4").display().to_string()),
                ("part3.mp4", &assets.join("part3.mp4").display().to_string()),
                ("screen1.png", &resized1.display().to_string()),
                ("screen1.width", &mt1.0.to_string()),
                ("screen1.height", &mt1.1.to_string()),
                ("screen2.png", &resized2.display().to_string()),
                ("screen2.width", &mt2.0.to_string()),
                ("screen2.height", &mt2.1.to_string()),
            ],
        );
        Ok::<_, anyhow::Error>((data, vec![resized1, resized2]))
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
