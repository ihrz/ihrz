use super::*;

/// Delete a role for a certain amount of money!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "delete",
    aliases("tag-delete"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn tag_delete(
    ctx: Ctx<'_>,
    #[description = "Tag name"] tag_name: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    if store.stored_tags.remove(tag_name.trim()).is_none() {
        ctx.say(
            crate::lang::get(&code, "tag_delete_dnt_exist")
                .map(|s| s.replace("${tag_name}", &tag_name))
                .unwrap_or_else(|| "The tag `${tag_name}` doesn't exist.".to_string()),
        )
        .await?;
        return Ok(());
    }
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_delete_command_ok")
            .map(|s| s.replace("${tag_name}", &tag_name))
            .unwrap_or_else(|| "The tag `${tag_name}` has been deleted.".to_string()),
    )
    .await?;
    Ok(())
}
