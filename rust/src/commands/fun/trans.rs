use super::*;

/// Translate text (MyMemory free API). Mirrors !trans.ts text path
/// (image render pending).
#[poise::command(slash_command, prefix_command, category = "fun", rename = "trans")]
pub async fn trans(
    ctx: Ctx<'_>,
    #[description = "Text"] text: String,
    #[description = "Target lang (e.g. fr, en, ja)"] target: Option<String>,
) -> Result<(), anyhow::Error> {
    let target = target.unwrap_or_else(|| "en".to_string());
    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair=autodetect|{}",
        pct_encode(&text),
        pct_encode(&target)
    );
    let body = match http_client().get(&url).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => String::new(),
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match parse_translation(&body) {
        Some(t) => {
            ctx.say(t).await?;
        }
        None => {
            ctx.say(
                crate::lang::get(&code, "msg_translation_failed")
                    .unwrap_or_else(|| "Translation failed.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}
