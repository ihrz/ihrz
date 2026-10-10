use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "youtube")]
pub async fn youtube(
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
    // NOTE: `!youtube.ts` gates on `messageArgs.length < 1`, but
    // `"".split(" ")` yields `[""]`, so the gate never fires: TS accepts
    // whitespace-only comments and so do we (no `has_comment` gate).
    // Mirrors `user.globalName || user.username` (required target user),
    // truncated at 15 chars.
    let display = youtube_display_name(user.global_name.as_deref(), &user.name);
    let likes = crate::funcs::format_number(youtube_likes() as f64);
    // html2png comment-card render pending; text shape ported. Likes go
    // through the number beautifier like `{likes}` in `!youtube.ts`
    // (`client.func.numberBeautifuer`).
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
