use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ignore-channels",
    aliases("channels"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn as_ignore_channels(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = "GUILD.ANTISPAM.BYPASS_CHANNELS";
    let mut list: Vec<String> = load_string_list(&ctx.data().pool, &gid, key).await;
    let id = channel.id.get().to_string();
    if !list.contains(&id) {
        list.push(id);
        save_string_list(&ctx.data().pool, &gid, key, &list).await?;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_ignore_channel_added")
            .unwrap_or_else(|| "Ignore channel added.".to_string()),
    )
    .await?;
    Ok(())
}
