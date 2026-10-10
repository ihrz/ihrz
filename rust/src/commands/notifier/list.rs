use super::*;

/// Show Streamer/Youtuber/Twitcher
#[poise::command(
    slash_command,
    prefix_command,
    rename = "list",
    aliases("author-list"),
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the ManageGuild leaf on both paths (`notifier.ts:225`;
    // `list` is gated like the other legs); Discord covers slash, so the
    // body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::MANAGE_GUILD,
    )
    .await
    {
        return Ok(());
    }
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
