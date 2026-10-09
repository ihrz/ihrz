use super::*;

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
                    .unwrap_or_else(|| "Error retrieving dog image.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
