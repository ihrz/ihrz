use super::*;
use poise::serenity_prelude as serenity;

/// Resolve the free-text `action` word to the TS `!config.ts:46-69`
/// branch: exact `"on"` enables, exact `"off"` disables, anything
/// else (missing, bogus, the old power-on/enable extras, case
/// variants) falls through silently — the TS `if / else if` has no
/// trailing else, so prod answers those legs with silence, never a
/// usage embed. Pure for unit tests.
pub fn setsuggest_config_enabled(action: Option<&str>) -> Option<bool> {
    match action {
        Some("on") => Some(true),
        Some("off") => Some(false),
        _ => None,
    }
}

/// Subcommand for setsuggest category!
// TS order (`setsuggest.ts:42-141`): config, channel.
#[poise::command(
    slash_command,
    prefix_command,
    category = "suggestion",
    rename = "setsuggest",
    subcommands("setsuggest_config", "setsuggest_channel"),
    subcommand_required
)]
pub async fn setsuggest(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Set the channel where user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("suggest-channel"),
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
    // !channel.ts (title + description + color + bot footer + file).
    let title = crate::commands::lang_for(
        &ctx,
        "setsuggest_channel_embed_title",
        "Suggestion Module has been set here!",
    )
    .await;
    let desc = crate::commands::lang_for(&ctx, "setsuggest_channel_embed_desc", "Now, all users who are permitted to send messages here can suggest something by simply sending a message!").await;
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let embed = crate::commands::shared::embed_with_footer(
        serenity::CreateEmbed::default()
            .title(title)
            .description(desc)
            .colour(0x01_01_01),
        &fname,
        fbytes.is_some(),
    );
    let mut setup = serenity::CreateMessage::new().embed(embed);
    if let Some(bytes) = fbytes {
        setup = setup.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let _ = channel.id.send_message(ctx.http(), setup).await;
    Ok(())
}

/// Config the message when user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("suggest-config"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn setsuggest_config(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Que veux-tu faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    #[description = "What you want to do ?"]
    // Free-text on purpose: the TS handler compares the raw string
    // (`action === "on" / "off"`, setsuggest.ts choices are
    // slash-UI-only values) and falls through silently on anything
    // else. A choice enum would make poise answer missing/bogus
    // prefix words with a usage-error embed prod never sends.
    action: Option<String>,
) -> Result<(), anyhow::Error> {
    // TS fall-through (!config.ts:46-69): only exact on/off act.
    let Some(enabled) = setsuggest_config_enabled(action.as_deref()) else {
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
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

#[cfg(test)]
mod tests {
    use super::setsuggest_config_enabled;

    #[test]
    fn setsuggest_config_matches_ts_exact_branches_and_silent_fallthrough() {
        // TS `action === "on"` / `=== "off"` (!config.ts:46-69).
        assert_eq!(setsuggest_config_enabled(Some("on")), Some(true));
        assert_eq!(setsuggest_config_enabled(Some("off")), Some(false));
        // No trailing else in TS: missing, bogus, the old
        // power-on/enable extras and case variants all fall through
        // silently (no reply, no write).
        assert_eq!(setsuggest_config_enabled(None), None);
        assert_eq!(setsuggest_config_enabled(Some("")), None);
        assert_eq!(setsuggest_config_enabled(Some("bogus")), None);
        assert_eq!(setsuggest_config_enabled(Some("power on")), None);
        assert_eq!(setsuggest_config_enabled(Some("enable")), None);
        assert_eq!(setsuggest_config_enabled(Some("On")), None);
        assert_eq!(setsuggest_config_enabled(Some("OFF")), None);
        assert_eq!(setsuggest_config_enabled(Some(" on")), None);
    }
}
