use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "removeinvites",
    aliases("rinvites", "subinv"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn inv_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let cur = load_invites(&ctx.data().pool, &gid, uid).await;
    let next = remove_invites(&cur, amount.max(0));
    save_invites(&ctx.data().pool, &gid, uid, &next).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "removeinvites_confirmation_embed_description")
            .map(|s| {
                s.replace("${amount}", &amount.to_string())
                    .replace("${user}", &format!("<@{uid}>"))
            })
            .unwrap_or_else(|| format!("Removed {amount} invites (total {})", next.invites)),
    )
    .await?;
    Ok(())
}
