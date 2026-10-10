use super::*;
use poise::serenity_prelude as serenity;

/// Reset one user's ranks. Mirrors !ureset.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "ureset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_ureset(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_uranks_are_you_sure",
        "**Are you really sure you want to delete all rank data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let _ = crate::commands::owner::main::routed_del(
        &ctx.data().pool,
        &gid,
        &gid,
        &ranks_key(user.id.get()),
    )
    .await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Successfully deleted!".to_string()),
    )
    .await?;
    Ok(())
}
