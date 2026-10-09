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
    ctx.say(if top.is_empty() {
        "No invites.".to_string()
    } else {
        top.join("\n")
    })
    .await?;
    Ok(())
}
