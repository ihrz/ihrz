use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "tweet")]
pub async fn tweet(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    #[description = "Comment"] comment: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // NOTE: `!tweet.ts` gates on `messageArgs.length < 1`, but
    // `"".split(" ")` yields `[""]`, so the gate never fires: TS accepts
    // whitespace-only comments and so do we (no `has_comment` gate).
    // Mirrors `user.globalName || user.displayName || user.username`
    // (target user, defaulting to the invoker) and `@${user.username}`.
    let u = user.unwrap_or_else(|| ctx.author().clone());
    let display = truncate_display_name(u.display_name());
    let handle = tweet_handle(&u.name);
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
