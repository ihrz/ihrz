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
    // NOTE: `!youtube.ts` gates on `messageArgs.length < 1`, but
    // `"".split(" ")` yields `[""]`, so the gate never fires: TS accepts
    // whitespace-only comments and so do we (no `has_comment` gate).
    // Mirrors `user.globalName || user.username` (target user, defaulting
    // to the invoker), truncated at 15 chars.
    let u = user.unwrap_or_else(|| ctx.author().clone());
    let display = youtube_display_name(u.global_name.as_deref(), &u.name);
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
