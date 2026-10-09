use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_remove(
    ctx: Ctx<'_>,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut entries = load_entries(&ctx.data().pool, &gid).await;
    let before = entries.len();
    entries.retain(|e| e.id_or_username != author.trim());
    if entries.len() == before {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_not_found").unwrap_or_else(|| "Not found.".to_string()),
        )
        .await?;
        return Ok(());
    }
    save_entries(&ctx.data().pool, &gid, &entries).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_notifier_entry_removed")
            .unwrap_or_else(|| "Notifier entry removed.".to_string()),
    )
    .await?;
    Ok(())
}
