use super::*;

#[poise::command(slash_command, prefix_command, category = "fun", rename = "youtube")]
pub async fn youtube(
    ctx: Ctx<'_>,
    // Optional on prefix (falls back to the invoker like the TS
    // `|| interaction.author` path in !youtube.ts); the TS slash schema
    // marks `user` required:true (fun.ts) so slash callers always pass it.
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
    // `#[rest]` so prefix keeps multi-word comments like the TS
    // `longString(args, 1)` path (slash uses `getString("comment")`).
    #[description = "Comment"]
    #[rest]
    comment: String,
) -> Result<(), anyhow::Error> {
    if fun_guard(&ctx).await {
        return Ok(());
    }
    let user = user.as_ref().unwrap_or_else(|| ctx.author());
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // NOTE: `!youtube.ts` gates on `messageArgs.length < 1`, but
    // `"".split(" ")` yields `[""]`, so the gate never fires: TS accepts
    // whitespace-only comments and so do we (no `has_comment` gate).
    // Mirrors `user.globalName || user.username` (required target user),
    // truncated at 15 chars.
    let display = youtube_display_name(user.global_name.as_deref(), &user.name);
    let likes = crate::funcs::format_number(youtube_likes() as f64);
    // Standing exclusion: the TS card renders via `client.func.html2png`
    // (headless Chromium, comment-card selector); no renderer exists in
    // the Rust tree, so the text shape below is the ported surface. Likes go
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
