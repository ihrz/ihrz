use super::*;

/// Lastfm power choice. Mirrors the `power` option `choices` in
/// lastfm.ts:64-80: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum LastfmPower {
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

impl LastfmPower {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Enable or disable Last.fm scrobbling for your account.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    description_localized("fr", "Activez ou désactivez le scrobbling Last.fm pour votre compte."),
    description_localized("ja", "アカウントのLast.fmスクロブルを有効化または無効化。"),
    description_localized("ru", "Включить или отключить скробблинг Last.fm для вашего аккаунта."),
    description_localized(
        "es-ES",
        "Habilitar o deshabilitar el scrobbling de Last.fm para tu cuenta."
    )
)]
pub async fn lastfm_config(
    ctx: Ctx<'_>,
    // TS SlashCommands/lastfm/!config.ts reads getString("power", true).
    #[description = "Power On or Power Off the module"]
    #[description_localized("fr", "Activer ou désactiver le module")]
    #[description_localized("ja", "モジュールをオンまたはオフ")]
    #[description_localized("ru", "Включить или выключить модуль")]
    #[description_localized("es-ES", "Encender o Apagar el módulo")]
    #[rename = "power"]
    action: LastfmPower,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action, LastfmPower::On);
    crate::commands::lastfm::save_guild_lastfm(&ctx.data().pool, &gid, enabled).await?;
    ctx.say(if enabled {
        "Last.fm on."
    } else {
        "Last.fm off."
    })
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lastfm_power_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = LastfmPower::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["Power On".to_string(), "Power Off".to_string()]);
        assert_eq!(LastfmPower::On.as_str(), "on");
        assert_eq!(LastfmPower::Off.as_str(), "off");
        assert_eq!(LastfmPower::from_name("on"), Some(LastfmPower::On));
        assert_eq!(LastfmPower::from_name("POWER OFF"), Some(LastfmPower::Off));
        assert_eq!(LastfmPower::from_name("bogus"), None);
        assert_eq!(LastfmPower::from_index(0), Some(LastfmPower::On));
        assert_eq!(LastfmPower::from_index(1), Some(LastfmPower::Off));
        let list = LastfmPower::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(LastfmPower::Off.localized_name("fr"), Some("Désactiver"));
    }
}
