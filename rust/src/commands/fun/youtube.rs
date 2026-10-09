use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "youtube")]
pub async fn youtube(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    #[description = "Comment"] comment: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !has_comment(&comment) {
        ctx.say(
            crate::lang::get(&code, "fun_var_good_sentence")
                .unwrap_or_else(|| "Please, send a good sentence!".to_string()),
        )
        .await?;
        return Ok(());
    }
    let name = user
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let display = truncate_display_name(&name);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    let likes = youtube_likes(now).to_string();
    // html2png comment-card render pending; text shape ported.
    ctx.say(
        crate::lang::get(&code, "fun_youtube_pending")
            .map(|s| {
                s.replace("${display}", &display)
                    .replace("${comment}", &comment)
                    .replace("${likes}", &likes)
            })
            .unwrap_or_else(|| format!("{display}: {comment} ({likes} likes, render pending)")),
    )
    .await?;
    Ok(())
}
