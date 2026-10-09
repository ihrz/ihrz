use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_ignore_add(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (next, added) = toggle_ignore(
        load_ignore(&ctx.data().pool, &gid).await,
        &channel.id.get().to_string(),
    );
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.RANKS.ignoreChannels",
        &serde_json::to_string(&next)?,
    )
    .await?;
    ctx.say(if added {
        "Channel ignored for XP."
    } else {
        "Channel unignored."
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-list",
    aliases("ignore")
)]
pub async fn ranks_ignore_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let list = load_ignore(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if list.is_empty() {
        crate::lang::get(&code, "setjoinroles_var_none")
            .unwrap_or_else(|| "No ignored channels.".to_string())
    } else {
        list.join(", ")
    })
    .await?;
    Ok(())
}
