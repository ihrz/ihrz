use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "refresh",
    aliases("sticky-refresh"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn sticky_refresh(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let user = format!("<@{}", ctx.author().id.get());
    let chan = format!("<#{}>", channel.id.get());
    let status = if let Some(guild_id) = ctx.guild_id() {
        let sctx = ctx.serenity_context();
        refresh_queued(
            &sctx.http,
            &sctx.cache,
            &ctx.data().pool,
            &gid,
            guild_id,
            channel.id,
        )
        .await
        .status
    } else {
        StickyStatus::MissingConfig
    };
    let key = match status {
        StickyStatus::MissingConfig => "sticky_refresh_command_not_found",
        StickyStatus::MissingEmbed => "sticky_refresh_command_missing_embed",
        StickyStatus::MissingPermissions => "sticky_refresh_command_missing_permissions",
        StickyStatus::Sent => "sticky_refresh_command_work",
    };
    let no = no_markup(&ctx.serenity_context().http).await;
    let mut pairs = vec![
        ("${client.iHorizon_Emojis.No}", no.as_str()),
        ("${interaction.user}", user.as_str()),
        ("${channel}", chan.as_str()),
    ];
    let yes;
    if status == StickyStatus::Sent {
        yes = yes_markup(&ctx.serenity_context().http).await;
        pairs.push(("${client.iHorizon_Emojis.Yes}", yes.as_str()));
    }
    ctx.say(fill(&t(key), &pairs)).await?;
    Ok(())
}
