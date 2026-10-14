use super::*;
use poise::serenity_prelude as serenity;

/// Setsuggest config action choice. Mirrors the `action` option `choices`
/// in setsuggest.ts:71-92 (`config`): slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SetsuggestAction {
    #[name = "on"]
    #[name_localized("en-US", "Power On the Suggestion Module")]
    #[name_localized("en-GB", "Power On the Suggestion Module")]
    #[name_localized("fr", "Activer le module de suggestion")]
    #[name_localized("ja", "power_on_the_suggestion_module")]
    #[name_localized("ru", "power_on_the_suggestion_module")]
    #[name_localized("es-ES", "power_on_the_suggestion_module")]
    On,
    #[name = "off"]
    #[name_localized("en-US", "Power Off the Suggestion Module")]
    #[name_localized("en-GB", "Power Off the Suggestion Module")]
    #[name_localized("fr", "Désactiver le module de suggestion")]
    #[name_localized("ja", "power_off_the_suggestion_module")]
    #[name_localized("ru", "power_off_the_suggestion_module")]
    #[name_localized("es-ES", "power_off_the_suggestion_module")]
    Off,
}

impl SetsuggestAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
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
    action: SetsuggestAction,
) -> Result<(), anyhow::Error> {
    let action = action.as_str();
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

#[cfg(test)]
mod tests {
    use super::*;
    use poise::ChoiceParameter as _;

    #[test]
    fn setsuggest_action_choices_mirror_ts_names_values_and_locales() {
        let names: Vec<_> = SetsuggestAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            names,
            vec![
                "on",
                "off"
            ]
        );
        assert_eq!(SetsuggestAction::On.as_str(), "on");
        assert_eq!(SetsuggestAction::Off.as_str(), "off");
        assert_eq!(
            SetsuggestAction::from_name("on"),
            Some(SetsuggestAction::On)
        );
        assert_eq!(
            SetsuggestAction::from_name("off"),
            Some(SetsuggestAction::Off)
        );
        assert_eq!(SetsuggestAction::from_name("bogus"), None);
        assert_eq!(SetsuggestAction::from_index(0), Some(SetsuggestAction::On));
        assert_eq!(SetsuggestAction::from_index(1), Some(SetsuggestAction::Off));
        let list = SetsuggestAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer le module de suggestion")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Désactiver le module de suggestion")
        );
    }
}
