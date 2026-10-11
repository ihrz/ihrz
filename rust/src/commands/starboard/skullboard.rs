use super::*;

/// Skullboard config action choice. Mirrors the `action` option
/// `choices` in skullboard.ts:73-89: slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SkullConfigAction {
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

impl SkullConfigAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Skullboard thread action choice. Mirrors the `action` option
/// `choices` in skullboard.ts:211-231 (straight apostrophe in `Don't
/// create thread`): slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SkullThreadAction {
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

impl SkullThreadAction {
    /// TS `value` (`yes` / `no`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
        }
    }
}

/// Skullboard parent command. Mirrors skullboard.ts (no parent aliases in TS).
#[poise::command(
    slash_command,
    prefix_command,
    category = "starboard",
    rename = "skullboard",
    subcommands("skull_config", "skull_channel", "skull_threshold", "skull_thread"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn skullboard(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Enable or disable the module. Mirrors skullboard !config.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("skullboardconfig"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: SkullConfigAction,
) -> Result<(), anyhow::Error> {
    let enabled = matches!(action, SkullConfigAction::On);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.enabled = if enabled {
        "yes".to_string()
    } else {
        "no".to_string()
    };
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_config_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Skullboard module is now ${action}**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", if enabled { "on" } else { "off" });
    ctx.say(text).await?;
    Ok(())
}

/// Change the board channel. Mirrors skullboard !channel.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "channel",
    aliases("skullboardchannel"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_channel(
    ctx: Ctx<'_>,
    #[description = "Target channel"]
    #[channel_types("Text", "News")]
    #[rename = "to"]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.channel = channel.id.get().to_string();
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let chan = format!("<#{}>", channel.id.get());
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_channel_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Skullboard channel is now defined to be: ${channel.toString()}**. Now, when server members react '💀' to messages and the threshold of **`${baseData.threshold}`** is exceeded, the message is sent to ${channel.toString()}!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${channel.toString()}", &chan)
    .replace("${baseData.threshold}", &cfg.threshold.to_string());
    ctx.say(text).await?;
    Ok(())
}

/// Skulls needed (2-10). Mirrors skullboard !threshold.ts (clamped).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "threshold",
    aliases("skullboardthreshold"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_threshold(
    ctx: Ctx<'_>,
    #[description = "Skulls needed (2-10)"] amount: i64,
) -> Result<(), anyhow::Error> {
    // TS quirk: only out-of-range amounts are stored; in-range amounts
    // echo back while the stored threshold is left untouched.
    let (display, store) = resolve_threshold_reply_and_store(amount);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    if let Some(next) = store {
        cfg.threshold = next;
    }
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "skullboard_threshold_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel!",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${amount}", &display.to_string());
    ctx.say(text).await?;
    Ok(())
}

/// Toggle thread creation. Mirrors skullboard !create-thread.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create-thread",
    aliases("skullboardthread"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn skull_thread(
    ctx: Ctx<'_>,
    #[description = "yes or no"] action: SkullThreadAction,
) -> Result<(), anyhow::Error> {
    let create = matches!(action, SkullThreadAction::Yes);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "skullboard").await;
    cfg.create_thread = create;
    save_board(&ctx.data().pool, &gid, "skullboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    // TS skullboard create-thread reuses the starboard yes/no strings.
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
        "skullboard_create_thread_command_ok",
        "${client.iHorizon_Emojis.Yes} | Now, when server members react '💀' to messages and the threshold of **`${amount}`** is exceeded, the message is sent to the specific channel **`${action}`**",
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
    fn skullboard_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = SkullConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["Power On".to_string(), "Power Off".to_string()]);
        assert_eq!(SkullConfigAction::On.as_str(), "on");
        assert_eq!(SkullConfigAction::Off.as_str(), "off");
        assert_eq!(
            SkullConfigAction::from_name("on"),
            Some(SkullConfigAction::On)
        );
        assert_eq!(SkullConfigAction::from_name("bogus"), None);
        assert_eq!(
            SkullConfigAction::from_index(1),
            Some(SkullConfigAction::Off)
        );
        let threads: Vec<_> = SkullThreadAction::list()
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
        assert_eq!(SkullThreadAction::Yes.as_str(), "yes");
        assert_eq!(SkullThreadAction::No.as_str(), "no");
        assert_eq!(
            SkullThreadAction::from_name("no"),
            Some(SkullThreadAction::No)
        );
        assert_eq!(
            SkullThreadAction::from_name("CREATE THREAD"),
            Some(SkullThreadAction::Yes)
        );
        assert_eq!(
            SkullThreadAction::from_index(0),
            Some(SkullThreadAction::Yes)
        );
        let list = SkullConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        let threads = SkullThreadAction::list();
        assert_eq!(
            threads[1].localizations.get("fr").map(String::as_str),
            Some("Ne pas créer un fil")
        );
        assert_eq!(
            SkullThreadAction::Yes.localized_name("ru"),
            Some("create_thread")
        );
    }
}
