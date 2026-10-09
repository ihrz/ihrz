use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "caracteres")]
pub async fn caracteres(
    ctx: Ctx<'_>,
    #[description = "Text to transform"] text: String,
    #[description = "Style: Bold, Full, Circled"] style: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let style = style.unwrap_or_else(|| "Bold".to_string());
    match caracteres_convert(&text, &style) {
        Some(out) => {
            ctx.say(
                crate::lang::get(&code, "msg_style_out")
                    .map(|s| s.replace("{style}", &style).replace("{out}", &out))
                    .unwrap_or_else(|| format!("**{style}**: {out}")),
            )
            .await?;
        }
        None => {
            ctx.say(format!(
                "Unknown style `{style}`. Available: {}",
                caracteres_styles().join(", ")
            ))
            .await?;
        }
    }
    Ok(())
}
