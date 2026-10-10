use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "tweet")]
pub async fn tweet(
    ctx: Ctx<'_>,
    // Required like the TS slash option (`user`, required: true in fun.ts).
    #[description = "Member"] user: poise::serenity_prelude::User,
    // `#[rest]` so prefix keeps multi-word comments like the TS
    // `longString(args, 1)` path (slash uses `getString("comment")`).
    #[description = "Comment"]
    #[rest]
    comment: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // NOTE: `!tweet.ts` gates on `messageArgs.length < 1`, but
    // `"".split(" ")` yields `[""]`, so the gate never fires: TS accepts
    // whitespace-only comments and so do we (no `has_comment` gate).
    // Display preference mirrors `user.globalName || user.displayName ||
    // user.username` (serenity `display_name()` is global-name-or-username),
    // truncated at 15 chars. Comment, display name and handle all go
    // through `sanitizing` like the TS `sanitizing(...)` replaces, so raw
    // mentions/markdown cannot leak into the template.
    let display = crate::funcs::sanitizing(&tweet_display_name(&user));
    let handle = tweet_handle(&crate::funcs::sanitizing(&user.name));
    let comment = crate::funcs::sanitizing(&comment);
    // Four independent `rand` draws; every stat goes through the number
    // beautifier like the TS `{likes}`/`{retweets}`/`{replies}`/`{views}`
    // replaces (`client.func.numberBeautifuer`).
    let s = tweet_stats();
    let likes = crate::funcs::format_number(s.likes as f64);
    let retweets = crate::funcs::format_number(s.retweets as f64);
    let replies = crate::funcs::format_number(s.replies as f64);
    let views = crate::funcs::format_number(s.views as f64);
    // html2png tweet-card render pending; text shape ported.
    ctx.say(
        crate::lang::get(&code, "fun_tweet_pending")
            .map(|t| {
                t.replace("${display}", &display)
                    .replace("${handle}", &handle)
                    .replace("${comment}", &comment)
                    .replace("${likes}", &likes)
                    .replace("${retweets}", &retweets)
                    .replace("${replies}", &replies)
                    .replace("${views}", &views)
            })
            .unwrap_or_else(|| {
                format!(
                    "{display} {handle}: {comment} ({likes} likes, {retweets} RTs, {replies} replies, {views} views, render pending)"
                )
            }),
    )
    .await?;
    Ok(())
}
