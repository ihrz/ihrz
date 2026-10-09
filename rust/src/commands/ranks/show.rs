use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    aliases("rsee", "look", "level")
)]
pub async fn ranks_show(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let e = load_rank(&ctx.data().pool, &gid, uid).await;
    let name = user
        .as_ref()
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let svg = crate::cards::rank_card_svg(&name, e.level, e.xp, xp_needed(e.level + 1), e.xptotal);
    ctx.send(
        poise::CreateReply::default()
            .content(format!(
                "Level {} — {}/{} XP (total {})",
                e.level,
                e.xp,
                xp_needed(e.level + 1),
                e.xptotal
            ))
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                svg.into_bytes(),
                "rank.svg",
            )),
    )
    .await?;
    Ok(())
}
