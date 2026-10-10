use super::*;

/// Rename a tag (admin or creator only).
// Mirrors !edit.ts, except the TS fall-through rename after the perm
// deny is NOT copied: this port returns after the deny (TS bug).
#[poise::command(slash_command, prefix_command, rename = "edit")]
pub async fn tag_edit(
    ctx: Ctx<'_>,
    #[description = "Current name"]
    #[rename = "current_tag_name"]
    current: String,
    #[description = "New name"]
    #[rename = "new_tag_name"]
    new: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let current = current.trim().to_string();
    let mut store = load_tags(&ctx.data().pool, &gid).await;
    let Some(entry) = store.stored_tags.remove(&current) else {
        ctx.say(
            crate::lang::get(&code, "tag_doesnt_exist")
                .map(|s| s.replace("${tag_name}", &current))
                .unwrap_or_else(|| "The tag `${tag_name}` doesn't exist!".to_string()),
        )
        .await?;
        return Ok(());
    };
    let is_admin = ctx
        .author_member()
        .await
        .and_then(|m| m.permissions)
        .map(|p| p.administrator())
        .unwrap_or(false);
    if !is_admin && entry.create_by != ctx.author().id.get().to_string() {
        // Put the entry back: the rename must not happen on deny.
        store.stored_tags.insert(current.clone(), entry);
        ctx.say(
            crate::lang::get(&code, "tag_edit_error_perm").unwrap_or_else(|| {
                "Only an administrator or the tag creator can edit it.".to_string()
            }),
        )
        .await?;
        return Ok(());
    }
    let new = new.trim().to_string();
    if !valid_tag_name(&new) {
        // Restore the original on bad new name.
        store.stored_tags.insert(current.clone(), entry);
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
