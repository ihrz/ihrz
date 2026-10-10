use super::*;
use poise::serenity_prelude as serenity;

/// When a Streamer/Youtuber/Twitcher publish a video, iHorizon send a message in channel
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn notifier_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text", "News")]
    target: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the ManageGuild leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::MANAGE_GUILD,
    )
    .await
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    // Already-set guard (TS !channel.ts:56).
    let current = load_notifier_string(&ctx.data().pool, &gid, "NOTIFIER.channelId").await;
    if current.as_deref() == Some(target.id.get().to_string().as_str()) {
        ctx.say(
            say(
                "joinghostping_add_already_set",
                "The channel ${channel} is already set!",
            )
            .replace("${channel}", &format!("<#{}>", target.id.get())),
        )
        .await?;
        return Ok(());
    }
    // Config log (TS ihorizon_logs leg; best-effort like the other
    // config setters). TS replaces `${interaction.user.id}` with the
    // member mention, but the YAML template already wraps the token in
    // `<@...>` (`<@${interaction.user.id}> ...`), so the raw id is
    // inserted here: a mention string would double-wrap into
    // `<@<@id>>`, exactly the malformed text TS renders today.
    let author_id = ctx.author().id.get().to_string();
    let title = say(
        "notifier_config_channel_logsEmbed_title",
        "Notifier Channel Module",
    );
    crate::commands::economy::post_ihorizon_log(
        &ctx,
        &title,
        &say(
            "notifier_config_channel_logsEmbed_desc",
            "Notify channel updated.",
        )
        .replace("${interaction.user.id}", &author_id)
        .replace("${channel}", &format!("<#{}>", target.id.get())),
    )
    .await;
    save_notifier_string(
        &ctx.data().pool,
        &gid,
        "NOTIFIER.channelId",
        &target.id.get().to_string(),
    )
    .await?;
    ctx.say(
        say(
            "notifier_config_message_command_ok",
            "Now, when a streamer or YouTuber publishes a video, I will send a message in ${channel.toString()}",
        )
        .replace(
            "${channel.toString()}",
            &format!("<#{}>", target.id.get()),
        ),
    )
    .await?;
    Ok(())
}
