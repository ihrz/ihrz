use super::*;

/// Cat command. Mirrors !cat.ts (edgecats/thecatapi fetch).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "cat")]
pub async fn cat(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let text = match http_client().get(catsay_search_url()).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => String::new(),
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match parse_cat_json(&text) {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default().image(u);
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "msg_cat_api_down")
                    .unwrap_or_else(|| "Cat API down.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// Dog command. Mirrors !dog.ts (random-d.uk fetch).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "dog")]
pub async fn dog(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let text = match http_client()
        .get(animal_api_url("dog").unwrap_or("dogs"))
        .send()
        .await
    {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => String::new(),
    };
    match parse_dog_json(&text) {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default().image(u);
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "dogs_embed_command_error")
                    .unwrap_or_else(|| "Dog API down.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

/// Duck picture. Mirrors fun !duck.ts (random-d.uk).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "duck")]
pub async fn duck(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://random-d.uk/api/v2/random",
        "url",
        "duck_embed_title",
        "Quack :duck:",
    )
    .await
}

/// Dolphin picture. Mirrors fun !dolphin.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "dolphin")]
pub async fn dolphin(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/dolphin",
        "image",
        "dolphin_embed_title",
        "dolphin",
    )
    .await
}

/// Fox picture. Mirrors fun !fox.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "fox")]
pub async fn fox(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/fox",
        "image",
        "fox_embed_title",
        "fox",
    )
    .await
}

/// Frog picture. Mirrors fun !frog.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "frog")]
pub async fn frog(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/frog",
        "image",
        "frog_embed_title",
        "frog",
    )
    .await
}

/// Panda picture. Mirrors fun !panda.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "panda")]
pub async fn panda(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/panda",
        "image",
        "panda_embed_title",
        "panda",
    )
    .await
}

/// Squirrel picture. Mirrors fun !squirrel.ts (animality).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "squirrel")]
pub async fn squirrel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    animal_pic(
        &ctx,
        "https://api.animality.xyz/all/squirrel",
        "image",
        "squirrel_embed_title",
        "squirrel",
    )
    .await
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "catsay")]
pub async fn catsay(
    ctx: Ctx<'_>,
    #[description = "Text (max 70 chars)"] text: Option<String>,
) -> Result<(), anyhow::Error> {
    let text = truncate_catsay_text(text.as_deref().unwrap_or(""));
    // cataas renders server-side: direct image URL, no local render needed.
    let embed = poise::serenity_prelude::CreateEmbed::default().image(catsay_image_url(&text));
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}
