use super::*;

/// Pfps action choice. Mirrors the `action` option `choices` in
/// pfps.ts:106-122: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum PfpsConfigAction {
    #[name = "on"]
    #[name_localized("en-US", "Power On")]
    #[name_localized("en-GB", "Power On")]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    On,
    #[name = "off"]
    #[name_localized("en-US", "Power Off")]
    #[name_localized("en-GB", "Power Off")]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    Off,
}

impl PfpsConfigAction {
    /// TS `value` parsed by `parse_on_off`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Config the message when user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn pfps_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: PfpsConfigAction,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(action.as_str()) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_use_on_off").unwrap_or_else(|| "Use on/off.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let flag = if enabled { "0" } else { "1" };
    save_pfps_string(&ctx.data().pool, &gid, "PFPS.disable", flag).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "pfps_config_command_action_on"
    } else {
        "pfps_config_command_action_off"
    };
    ctx.say(
        crate::lang::get(&code, key)
            .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
            .unwrap_or_else(|| key.to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pfps_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = PfpsConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(PfpsConfigAction::On.as_str(), "on");
        assert_eq!(PfpsConfigAction::Off.as_str(), "off");
        assert_eq!(
            PfpsConfigAction::from_name("on"),
            Some(PfpsConfigAction::On)
        );
        assert_eq!(
            PfpsConfigAction::from_name("off"),
            Some(PfpsConfigAction::Off)
        );
        assert_eq!(PfpsConfigAction::from_name("maybe"), None);
        assert_eq!(PfpsConfigAction::from_index(0), Some(PfpsConfigAction::On));
        assert_eq!(PfpsConfigAction::from_index(1), Some(PfpsConfigAction::Off));
        let list = PfpsConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            PfpsConfigAction::Off.localized_name("fr"),
            Some("Désactiver")
        );
    }
}
