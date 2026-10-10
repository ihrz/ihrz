use super::*;

/// API endpoint. Mirrors the axios call in !cat.ts.
pub fn cat_api_url() -> &'static str {
    "http://edgecats.net/random"
}

/// Resolve the embed image from an edgecats.net/random response body.
/// Mirrors `.setImage(res.data)`: a URL body is used as-is, otherwise
/// the endpoint itself serves as the image.
pub fn resolve_cat_image(body: &str) -> String {
    let t = body.trim().trim_matches('"').trim().to_string();
    if t.starts_with("http") {
        t
    } else {
        cat_api_url().to_string()
    }
}

/// Down-API reply. Mirrors the `fun_var_down_api` deny shared with the
/// other animal picture commands (`animal_pic`).
async fn cat_down(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "fun_var_down_api")
            .unwrap_or_else(|| "Error: Seems like the API is down!".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, category = "fun", rename = "cat")]
pub async fn cat(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    // TS has no catch here (fetch failure stays silent); a dead API should
    // not render a broken embed, so deny loudly like the other animal
    // picture commands (`fun_var_down_api`).
    let text = match http_client().get(cat_api_url()).send().await {
        Ok(r) => match r.text().await {
            Ok(t) => t,
            Err(_) => {
                return cat_down(&ctx).await;
            }
        },
        Err(_) => {
            return cat_down(&ctx).await;
        }
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .image(resolve_cat_image(&text))
        .title(
            crate::lang::get(&code, "cats_embed_title").unwrap_or_else(|| "Meow :cat:".to_string()),
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[cfg(test)]
mod cat_tests {
    use super::*;

    #[test]
    fn endpoint_is_edgecats() {
        assert_eq!(cat_api_url(), "http://edgecats.net/random");
    }

    #[test]
    fn resolves_url_body_or_falls_back() {
        assert_eq!(
            resolve_cat_image("https://edgecats.net/x.png\n"),
            "https://edgecats.net/x.png"
        );
        assert_eq!(
            resolve_cat_image("\"https://edgecats.net/x.png\""),
            "https://edgecats.net/x.png"
        );
        assert_eq!(resolve_cat_image(""), cat_api_url());
        assert_eq!(resolve_cat_image("<binary>"), cat_api_url());
    }
}
