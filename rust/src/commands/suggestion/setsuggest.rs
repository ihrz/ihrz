use super::*;
use poise::serenity_prelude as serenity;

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
    let pool = &ctx.data().pool;
    let new_id = channel.id.get().to_string();

    // Mirrors !channel.ts: no-op when already set to that channel.
    if load_suggest_string(pool, &gid, "SUGGEST.channel")
        .await
        .as_deref()
        == Some(new_id.as_str())
    {
        let text = crate::commands::lang_for(
            &ctx,
            "setsuggest_channel_already_set_with_that",
            "${interaction.user}, the Suggestion Module's channel is already set in ${channel}!",
        )
        .await
        .replace("${interaction.user}", &ctx.author().to_string())
        .replace("${channel}", &format!("<#{new_id}>"));
        ctx.say(text).await?;
        return Ok(());
    }

    save_suggest_string(pool, &gid, "SUGGEST.channel", &new_id).await?;
    let text = crate::commands::lang_for(
        &ctx,
        "setsuggest_channel_command_work",
        "${interaction.user}, you have set the Suggestion Module's channel to ${channel}!",
    )
    .await
    .replace("${interaction.user}", &ctx.author().to_string())
    .replace("${channel}", &format!("<#{new_id}>"));
    ctx.say(text).await?;

    // Setup notice in the new channel. Mirrors the setupEmbed post in
    // !channel.ts (footer file attachment has no Rust equivalent: kept
    // title + description + color).
    let title = crate::commands::lang_for(
        &ctx,
        "setsuggest_channel_embed_title",
        "Suggestion Module has been set here!",
    )
    .await;
    let desc = crate::commands::lang_for(&ctx, "setsuggest_channel_embed_desc", "Now, all users who are permitted to send messages here can suggest something by simply sending a message!").await;
    let _ = channel
        .id
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new().embed(
                serenity::CreateEmbed::default()
                    .title(title)
                    .description(desc)
                    .colour(0x01_01_01),
            ),
        )
        .await;
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
    let pool = &ctx.data().pool;
    // TS choices are on/off; accept the membercount-style power variants too.
    let enabled = matches!(
        action.to_ascii_lowercase().as_str(),
        "on" | "power on" | "enable"
    );
    // JSON boolean write, mirroring !config.ts `db.set(..., false/true)`.
    save_suggest_disable(pool, &gid, !enabled).await?;
    let key = if enabled {
        "setsuggest_disable_pw_on"
    } else {
        "setsuggest_disable_pw_off"
    };
    let text = crate::commands::lang_for(
        &ctx,
        key,
        if enabled {
            "Suggestions on."
        } else {
            "Suggestions off."
        },
    )
    .await
    .replace("${interaction.user}", &ctx.author().to_string());
    ctx.say(text).await?;
    Ok(())
}
