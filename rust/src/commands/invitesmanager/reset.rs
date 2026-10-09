use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "reset",
    aliases("inv-delete-all", "invreset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn inv_reset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "resetallinvites_warning_msg",
        "Delete all invite data? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    delete_all_invites(&ctx.data().pool, &gid).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Successfully deleted!".to_string()),
    )
    .await?;
    Ok(())
}
