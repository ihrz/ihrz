use super::*;

/// Starboard config action choice. Mirrors the `action` option
/// `choices` in starboard.ts:76-92: slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum StarboardConfigAction {
    #[name = "Power On"]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    #[name = "on"]
    On,
    #[name = "Power Off"]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    #[name = "off"]
    Off,
}

impl StarboardConfigAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Starboard thread action choice. Mirrors the `action` option
/// `choices` in starboard.ts:214-234 (note the straight apostrophe in
/// `Don't create thread`): slash shows the localized display names,
/// the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum StarboardThreadAction {
    #[name = "Create thread"]
    #[name_localized("fr", "Créer un fil")]
    #[name_localized("ja", "create_thread")]
    #[name_localized("ru", "create_thread")]
    #[name_localized("es-ES", "create_thread")]
    #[name = "yes"]
    Yes,
    #[name = "Don't create thread"]
    #[name_localized("fr", "Ne pas créer un fil")]
    #[name_localized("ja", "don_t_create_thread")]
    #[name_localized("ru", "don_t_create_thread")]
    #[name_localized("es-ES", "don_t_create_thread")]
    #[name = "no"]
    No,
}

impl StarboardThreadAction {
    /// TS `value` (`yes` / `no`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
        }
    }
}

// No parent aliases in TS.
// Mirrors the starboard.ts parent description verbatim.
/// SubCommand group for Starboard category
#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "starboard",
    subcommands(
        "starboard_config",
        "starboard_channel",
        "starboard_threshold",
        "starboard_thread"
    ),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn starboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Enable or disable the module. Mirrors !config.ts.
// Prefix alias "starboarconfig" keeps the exact TS prefixName (typo included).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("starboarconfig"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: StarboardConfigAction,
) -> Result<(), anyhow::Error> {
    let enabled = matches!(action, StarboardConfigAction::On);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.enabled = if enabled {
        "yes".to_string()
    } else {
        "no".to_string()
    };
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_config_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Starboard module is now ${action}**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", if enabled { "on" } else { "off" });
    ctx.say(text).await?;
    Ok(())
}

/// Change the board channel. Mirrors !channel.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("starboard-channel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_channel(
    ctx: Ctx<'_>,
    #[description = "Target channel"]
    #[channel_types("Text", "News")]
    #[rename = "to"]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.channel = channel.id.get().to_string();
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let chan = format!("<#{}>", channel.id.get());
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_channel_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Starboard channel is now defined to be: ${channel.toString()}**. Now, when server members react '⭐' to messages and the threshold of **`${baseData.threshold}`** is exceeded, the message is sent to the ${channel.toString()}!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${channel.toString()}", &chan)
    .replace("${baseData.threshold}", &cfg.threshold.to_string());
    ctx.say(text).await?;
    Ok(())
}

/// Stars needed (2-10). Mirrors !threshold.ts (clamped, see clamp_threshold).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "threshold",
    aliases("starboardthreshold"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_threshold(
    ctx: Ctx<'_>,
    #[description = "Stars needed (2-10)"] amount: i64,
) -> Result<(), anyhow::Error> {
    // TS quirk: only out-of-range amounts are stored; in-range amounts
    // echo back while the stored threshold is left untouched.
    let (display, store) = resolve_threshold_reply_and_store(amount);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    if let Some(next) = store {
        cfg.threshold = next;
    }
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_threshold_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '⭐' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${amount}", &display.to_string());
    ctx.say(text).await?;
    Ok(())
}

/// Toggle thread creation. Mirrors !create-thread.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create-thread",
    aliases("starboardthread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: StarboardThreadAction,
) -> Result<(), anyhow::Error> {
    let create = matches!(action, StarboardThreadAction::Yes);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.create_thread = create;
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let action_text = crate::commands::lang_for(
        &ctx,
        if create {
            "starboard_create_thread_yes"
        } else {
            "starboard_create_thread_no"
        },
        if create {
            "and a discussion thread will be created"
        } else {
            "and a discussion thread will not be created"
        },
    )
    .await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_create_thread_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '⭐' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel **`${action}`**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", &action_text)
    .replace("${amount}", &cfg.threshold.to_string());
    ctx.say(text).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starboard_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = StarboardConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["Power On".to_string(), "Power Off".to_string()]);
        assert_eq!(StarboardConfigAction::On.as_str(), "on");
        assert_eq!(StarboardConfigAction::Off.as_str(), "off");
        assert_eq!(
            StarboardConfigAction::from_name("on"),
            Some(StarboardConfigAction::On)
        );
        assert_eq!(
            StarboardConfigAction::from_name("POWER OFF"),
            Some(StarboardConfigAction::Off)
        );
        assert_eq!(StarboardConfigAction::from_name("bogus"), None);
        assert_eq!(
            StarboardConfigAction::from_index(1),
            Some(StarboardConfigAction::Off)
        );
        let threads: Vec<_> = StarboardThreadAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            threads,
            vec![
                "Create thread".to_string(),
                "Don't create thread".to_string()
            ]
        );
        assert_eq!(StarboardThreadAction::Yes.as_str(), "yes");
        assert_eq!(StarboardThreadAction::No.as_str(), "no");
        assert_eq!(
            StarboardThreadAction::from_name("yes"),
            Some(StarboardThreadAction::Yes)
        );
        assert_eq!(
            StarboardThreadAction::from_name("DON'T CREATE THREAD"),
            Some(StarboardThreadAction::No)
        );
        assert_eq!(StarboardThreadAction::from_name("bogus"), None);
        assert_eq!(
            StarboardThreadAction::from_index(0),
            Some(StarboardThreadAction::Yes)
        );
        let list = StarboardConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        let threads = StarboardThreadAction::list();
        assert_eq!(
            threads[0].localizations.get("fr").map(String::as_str),
            Some("Créer un fil")
        );
        assert_eq!(
            threads[1].localizations.get("fr").map(String::as_str),
            Some("Ne pas créer un fil")
        );
        assert_eq!(
            StarboardThreadAction::No.localized_name("ja"),
            Some("don_t_create_thread")
        );
    }
}
