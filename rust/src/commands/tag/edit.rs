use super::*;

#[poise::command(slash_command, prefix_command, rename = "edit")]
pub async fn tag_edit(
    ctx: Ctx<'_>,
    #[description = "Current name"] current: String,
    #[description = "New name"] new: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store
        .stored_tags
        .remove(&current.trim().to_ascii_lowercase())
    else {
        ctx.say(
            crate::lang::get(&code, "tag_doesnt_exist")
                .map(|s| s.replace("${tag_name}", &current))
                .unwrap_or_else(|| "The tag `${tag_name}` doesn't exist!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let new = new.trim().to_ascii_lowercase();
    if !valid_tag_name(&new) {
        ctx.say(
            crate::lang::get(&code, "msg_bad_new_name")
                .unwrap_or_else(|| "Bad new name.".to_string()),
        )
        .await?;
        return Ok(());
    }
    store.stored_tags.insert(new.clone(), entry);
    save_tags(&ctx.data().pool, &gid, &store).await?;
    ctx.say(
        crate::lang::get(&code, "tag_edit_command_ok")
            .map(|s| {
                s.replace("${current_tag_name}", &current)
                    .replace("${new_tag_name}", &new)
            })
            .unwrap_or_else(|| format!("Tag renamed to `{new}`.")),
    )
    .await?;
    Ok(())
}
