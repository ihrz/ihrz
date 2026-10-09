use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("lb-invites", "invlb", "inviteslb")
)]
pub async fn inv_lb(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut parsed: Vec<(u64, InviteStats)> = load_all_invites(&ctx.data().pool, &gid).await;
    parsed = sort_leaderboard(parsed);
    let page = crate::executor::paginate(&parsed, 1, 15);
    let top: Vec<String> = page
        .iter()
        .enumerate()
        .map(|(i, (uid, s))| format!("{}. <@{uid}> — {}", i + 1, s.invites))
        .collect();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let header = crate::lang::get(&code, "leaderboard_default_text")
        .unwrap_or_else(|| "**__Leaderboard__**".to_string());
    ctx.say(if top.is_empty() {
        crate::lang::get(&code, "invites_leaderboard_empty")
            .unwrap_or_else(|| "No invites.".to_string())
    } else {
        format!("{header}\n{}", top.join("\n"))
    })
    .await?;
    Ok(())
}
