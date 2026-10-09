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
