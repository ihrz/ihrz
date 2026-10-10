use super::*;

/// API endpoint. Mirrors the axios call in !dog.ts.
pub fn dog_api_url() -> &'static str {
    "https://dog.ceo/api/breeds/image/random"
}

/// Parse dog.ceo JSON ({"message": <url>, "status": ...}).
pub fn parse_dog_ceo_json(raw: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(raw)
        .ok()?
        .get("message")?
        .as_str()
        .map(|s| s.to_string())
}

/// Dog command. Mirrors !dog.ts (dog.ceo fetch, message field).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "dog")]
pub async fn dog(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let text = match http_client().get(dog_api_url()).send().await {
        Ok(r) => match r.text().await {
            Ok(t) => t,
            Err(error) => {
                // Mirrors `logger.err(err)` in the `!dog.ts` catch path.
                tracing::error!("dog image body failed: {error}");
                String::new()
            }
        },
        Err(error) => {
            // Mirrors `logger.err(err)` in the `!dog.ts` catch path.
            tracing::error!("dog image fetch failed: {error}");
            String::new()
        }
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match parse_dog_ceo_json(&text) {
        Some(u) => {
            let embed = poise::serenity_prelude::CreateEmbed::default()
                .image(u)
                .title(
                    crate::lang::get(&code, "dogs_embed_title")
                        .unwrap_or_else(|| "🐶 woof-woof.".to_string()),
                )
                .timestamp(poise::serenity_prelude::Timestamp::now());
            ctx.send(poise::CreateReply::default().embed(embed)).await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "dogs_embed_command_error")
                    .unwrap_or_else(|| "Error retrieving dog image.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod dog_tests {
    use super::*;

    #[test]
    fn endpoint_is_dog_ceo() {
        assert_eq!(dog_api_url(), "https://dog.ceo/api/breeds/image/random");
    }

    #[test]
    fn parses_message_field() {
        let raw = r#"{"message":"https://images.dog.ceo/breeds/hound/x.jpg","status":"success"}"#;
        assert_eq!(
            parse_dog_ceo_json(raw).as_deref(),
            Some("https://images.dog.ceo/breeds/hound/x.jpg")
        );
        assert_eq!(parse_dog_ceo_json("nope"), None);
        assert_eq!(parse_dog_ceo_json(r#"{"url":"https://x/d.png"}"#), None);
    }
}
