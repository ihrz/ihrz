use super::*;

/// Partner ad (fr-only). Mirrors MessageCommands/misc/@fexini.ts.
#[poise::command(slash_command, prefix_command, category = "bot", rename = "fexini")]
pub async fn fexini(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let locale = ctx
        .guild()
        .map(|g| g.preferred_locale.clone())
        .unwrap_or_default();
    let Some(ad) = fexini_ad_for_locale(&locale) else {
        return Ok(());
    };
    let reply = ctx.say(ad).await?;
    // TS deletes the reply and the invoking message after 10s (each
    // guarded by deletability there; delete failures are tolerated
    // here the same way).
    let invoker = match &ctx {
        Ctx::Prefix(p) => Some((p.msg.channel_id, p.msg.id)),
        _ => None,
    };
    if let Ok(sent) = reply.message().await {
        let http = ctx.serenity_context().http.clone();
        let (channel_id, message_id) = (sent.channel_id, sent.id);
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
            let _ = http.delete_message(channel_id, message_id, None).await;
            if let Some((inv_channel_id, inv_message_id)) = invoker {
                let _ = http
                    .delete_message(inv_channel_id, inv_message_id, None)
                    .await;
            }
        });
    }
    Ok(())
}

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

/// rap-vs-reality meme generator (alias meme1). Mirrors @rap-vs-reality.ts.
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

/// two-sides meme generator (alias meme2). Mirrors @two-sides.ts.
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

/// Fake nitro gift codes file (fr guilds). Mirrors nitrofdp.ts.
#[poise::command(slash_command, prefix_command, category = "utils", rename = "nitrofdp")]
pub async fn nitrofdp(
    ctx: Ctx<'_>,
    #[description = "Amount of nitro"] amount: Option<i64>,
) -> Result<(), anyhow::Error> {
    let is_fr = ctx
        .guild()
        .map(|g| g.preferred_locale.to_lowercase().contains("fr"))
        .unwrap_or(false);
    if !is_fr {
        return Ok(());
    }
    let mut n = amount.unwrap_or(1).max(1) as usize;
    if n > 275_000 {
        n = 10_000;
    }
    let opts = crate::funcs::PasswordOptions {
        length: 16,
        numbers: true,
        symbols: false,
        lowercase: true,
        uppercase: true,
        exclude_similar: false,
        exclude: String::new(),
        strict: false,
    };
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    let codes = crate::funcs::generate_multiple_passwords(n, &opts, seed)
        .map_err(|e| anyhow::anyhow!(e))?;
    let body = codes
        .iter()
        .map(|c| format!("https://discord.gift/{c}"))
        .collect::<Vec<_>>()
        .join("\n");
    ctx.channel_id()
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new().add_file(serenity::CreateAttachment::bytes(
                body.into_bytes(),
                "fake_nitro.txt",
            )),
        )
        .await?;
    Ok(())
}
