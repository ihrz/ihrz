use super::*;

/// Remove Streamer/Youtuber/Twitcher
#[poise::command(
    slash_command,
    prefix_command,
    rename = "remove",
    aliases("author-remove"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_remove(
    ctx: Ctx<'_>,
    #[description = "twitch or youtube"] platform: String,
    #[description = "Author id or username"] author: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // `author` compared verbatim (no trim: TS `===` on the raw
    // option value).
    let entries = load_entries(&ctx.data().pool, &gid).await;
    // Platform-scoped lookup (TS authorExist + remove filter match
    // platform AND id_or_username with `===` on both).
    if !entry_exists(&entries, &platform, &author) {
        ctx.say(say(
            "notifier_author_add_author_doesnt_exist",
            "Author doesn't exist. Please verify the ID.",
        ))
        .await?;
        return Ok(());
    }
    let kept: Vec<NotifierEntry> = entries
        .into_iter()
        .filter(|e| !(e.platform == platform && e.id_or_username == author))
        .collect();
    save_entries(&ctx.data().pool, &gid, &kept).await?;
    let (authors, config) = authors_and_config_embeds(&ctx.data().pool, &gid, &code).await;
    ctx.send(poise::CreateReply::default().embed(authors).embed(config))
        .await?;
    Ok(())
}
