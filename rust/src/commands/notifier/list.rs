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
    // Authors + configuration embeds, always both (TS !list.ts sends
    // generateAuthorsEmbed + generateConfigurationEmbed even when the
    // watch list is empty).
    let (authors, config) = authors_and_config_embeds(&ctx.data().pool, &gid, &code).await;
    ctx.send(poise::CreateReply::default().embed(authors).embed(config))
        .await?;
    Ok(())
}
