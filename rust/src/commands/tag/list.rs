use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn tag_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let store = load_tags(&ctx.data().pool, &gid).await;
    let mut names: Vec<String> = store.stored_tags.keys().cloned().collect();
    names.sort();
    ctx.say(if names.is_empty() {
        crate::lang::get(&code, "tag_list_no_anything")
            .unwrap_or_else(|| "There are no tags saved on this guild!".to_string())
    } else {
        names.join(", ")
    })
    .await?;
    Ok(())
}
