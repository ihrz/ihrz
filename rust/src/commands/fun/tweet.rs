use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "tweet")]
pub async fn tweet(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    #[description = "Comment"] comment: String,
) -> Result<(), anyhow::Error> {
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
    let handle = tweet_handle(&ctx.author().name);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(1);
    let s = tweet_stats(now);
    // html2png tweet-card render pending; text shape ported.
    ctx.say(
        crate::lang::get(&code, "fun_tweet_pending")
            .map(|t| {
                t.replace("${display}", &display)
                    .replace("${handle}", &handle)
                    .replace("${comment}", &comment)
                    .replace("${likes}", &s.likes.to_string())
                    .replace("${retweets}", &s.retweets.to_string())
                    .replace("${replies}", &s.replies.to_string())
                    .replace("${views}", &s.views.to_string())
            })
            .unwrap_or_else(|| {
                format!(
                    "{display} {handle}: {comment} ({} likes, {} RTs, {} replies, {} views, render pending)",
                    s.likes, s.retweets, s.replies, s.views
                )
            }),
    )
    .await?;
    Ok(())
}
