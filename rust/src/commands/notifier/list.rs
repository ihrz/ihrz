use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Authors + configuration embeds (TS !list.ts sends
    // generateAuthorsEmbed + generateConfigurationEmbed).
    if load_entries(&ctx.data().pool, &gid).await.is_empty() {
        ctx.say(
            crate::lang::get(&code, "msg_notifier_list_empty")
                .unwrap_or_else(|| "No notifier entries.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let (authors, config) = authors_and_config_embeds(&ctx.data().pool, &gid, &code).await;
    ctx.send(poise::CreateReply::default().embed(authors).embed(config))
        .await?;
    Ok(())
}
