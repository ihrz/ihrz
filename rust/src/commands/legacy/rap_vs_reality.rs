use super::*;

/// rap-vs-reality meme generator (alias meme1). Mirrors @rap-vs-reality.ts.
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
    rename = "rap-vs-reality",
    aliases("meme1")
)]
pub async fn rap_vs_reality(
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
    let assets = meme_assets_dir("rap-vs-reality");
    let temp = crate::funcs::media_temp_dir();
    let outcome = async {
        let (resized1, _) =
            prep_meme_image(&url1, "beforeSucksResized", msg_id, Some((1920, 1080))).await?;
        let (resized2, _) =
            prep_meme_image(&url2, "bigSucksResized", msg_id, Some((1920, 1080))).await?;
        let template = crate::funcs::kdenlive_open(&assets.join("meme1.kdenlive"))?;
        let data = kdenlive_substitute(
            &template,
            ("{rap-vs-reality_var}", &temp.display().to_string()),
            &[
                ("part1.mp4", &assets.join("part1.mp4").display().to_string()),
                ("part2.mp4", &assets.join("part2.mp4").display().to_string()),
                ("part3.mp4", &assets.join("part3.mp4").display().to_string()),
                ("part4.mp4", &assets.join("part4.mp4").display().to_string()),
                ("overlay1.png", &resized1.display().to_string()),
                ("overlay2.png", &resized2.display().to_string()),
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
