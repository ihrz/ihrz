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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "invites_confirmation_embed_description")
            .unwrap_or_else(|| {
                "<@${member.user.id}> has `${inv || 0}` invites (`${Regular || 0}` regular, `${bonus || 0}` bonus, `${leaves || 0}` leaves)."
                    .to_string()
            })
            .replace("${member.user.id}", &target.to_string())
            .replace("${inv || 0}", &s.invites.to_string())
            .replace("${Regular || 0}", &s.regular.to_string())
            .replace("${bonus || 0}", &s.bonus.to_string())
            .replace("${leaves || 0}", &s.leaves.to_string()),
    )
    .await?;
    Ok(())
}
