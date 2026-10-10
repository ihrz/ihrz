use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "reset",
    aliases("inv-delete-all", "invreset", "invites-reset"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn inv_reset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "resetallinvites_warning_msg",
        "**Are you really sure you want to delete all of the Invite Manager's data?\nThis action is permanent and you can't roll it back.**\n**This action is destructive!!**",
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
    if let Some(log_gid) = ctx.guild_id() {
        let author_mention = format!("<@{}>", ctx.author().id.get());
        post_inv_log(
            &ctx,
            log_gid,
            crate::lang::get(&code, "resetallinvites_logs_embed_title")
                .unwrap_or_else(|| "Invite Manager Logs (DANGEROUS ACTION)".to_string()),
            crate::lang::get(&code, "resetallinvites_logs_embed_desc").unwrap_or_else(|| {
                "${interaction.member.user.toString()} has deleted all data of the Invites Manager!"
                    .to_string()
            })
            .replace("${interaction.member.user.toString()}", &author_mention),
        )
        .await;
    }
    Ok(())
}
