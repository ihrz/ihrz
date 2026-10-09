use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "add",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_add(
    ctx: Ctx<'_>,
    #[description = "twitch, youtube or kick"] platform: String,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    if !valid_platform(&platform) {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_platform_twitch_youtube_kick")
                .unwrap_or_else(|| "Bad platform (twitch, youtube, kick).".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut entries = load_entries(&ctx.data().pool, &gid).await;
    let entry = NotifierEntry {
        id_or_username: author.trim().to_string(),
        platform: platform.to_ascii_lowercase(),
    };
    if !entries.contains(&entry) {
        entries.push(entry);
        save_entries(&ctx.data().pool, &gid, &entries).await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_notifier_entry_added")
            .unwrap_or_else(|| "Notifier entry added.".to_string()),
    )
    .await?;
    Ok(())
}
