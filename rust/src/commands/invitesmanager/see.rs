use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "invites",
    aliases("i", "invsee")
)]
pub async fn inv_see(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let target = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let s = load_invites(&ctx.data().pool, &gid, target).await;
    ctx.say(format!(
        "Invites: {} (bonus {}, leaves {})",
        s.invites, s.bonus, s.leaves
    ))
    .await?;
    Ok(())
}
