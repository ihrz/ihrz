use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "suggestion",
    rename = "setsuggest",
    subcommands("setsuggest_channel", "setsuggest_config")
)]
pub async fn setsuggest(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setsuggest_channel(
    ctx: Ctx<'_>,
    #[description = "Suggestions channel"]
    #[channel_types("Text")]
    channel: poise::serenity_prelude::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    save_suggest_string(
        &ctx.data().pool,
        &gid,
        "SUGGEST.channel",
        &channel.id.get().to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "setsuggest_channel_command_work")
            .map(|s| {
                s.replace("${interaction.user}", &ctx.author().to_string())
                    .replace("${channel}", &format!("<#{}>", channel.id.get()))
            })
            .unwrap_or_else(|| {
                "${interaction.user}, you have set the Suggestion Module's channel to ${channel}!"
                    .to_string()
            }),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setsuggest_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    save_suggest_string(
        &ctx.data().pool,
        &gid,
        "SUGGEST.disable",
        if enabled { "0" } else { "1" },
    )
    .await?;
    ctx.say(if enabled {
        "Suggestions on."
    } else {
        "Suggestions off."
    })
    .await?;
    Ok(())
}
