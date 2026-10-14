use super::*;

/// Security config action choice. Mirrors the `action` option
/// `choices` in security.ts:124-140: slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum SecurityConfigAction {
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

impl SecurityConfigAction {
    /// TS `value` parsed by `parse_on_off`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Disable or enable the Security Module feature!
// Verdict (ADMINISTRATOR default, kept): mirrors the TS per-leg
// `permission: Administrator` gate (`security.ts`, config leg).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("security-config"),
    default_member_permissions = "ADMINISTRATOR",
    name_localized("fr", "statut"),
    name_localized("ja", "config"),
    name_localized("ru", "config"),
    name_localized("es-ES", "config"),
    description_localized("fr", "Désactiver ou activer la fonctionnalité du module de sécurité"),
    description_localized("ja", "セキュリティモジュール機能を無効化または有効化！"),
    description_localized("ru", "Отключить или включить модуль безопасности!"),
    description_localized(
        "es-ES",
        "Deshabilitar o habilitar la función del módulo de seguridad!"
    )
)]
pub async fn security_config(
    ctx: Ctx<'_>,
    // TS security.ts config leg (`action` option):
    // `description: "What the action you want to do?"` + locales.
    #[description_localized("fr", "Quelle est l'action que vous souhaitez faire ?")]
    #[description_localized("ja", "実行したいアクションは？")]
    #[description_localized("ru", "Какое действие вы хотите выполнить?")]
    #[description_localized("es-ES", "Cual es la acción que quieres realizar?")]
    #[description = "What the action you want to do?"]
    action: SecurityConfigAction,
) -> Result<(), anyhow::Error> {
    let Some(enabled) = parse_on_off(action.as_str()) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_use_on_off").unwrap_or_else(|| "Use on/off.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let Some(gid) = guild_id_str(&ctx).await else {
        return Ok(());
    };
    save_security_bool(
        &ctx.data().pool,
        &gid,
        "SECURITY.disable",
        disable_flag(enabled),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "security_disable_pw_on"
    } else {
        "security_disable_pw_off"
    };
    let msg = crate::lang::get(&code, key)
        .map(|s| s.replace("${interaction.user}", &ctx.author().to_string()))
        .unwrap_or_else(|| key.to_string());
    ctx.say(msg).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn security_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = SecurityConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(SecurityConfigAction::On.as_str(), "on");
        assert_eq!(SecurityConfigAction::Off.as_str(), "off");
        assert_eq!(
            SecurityConfigAction::from_name("on"),
            Some(SecurityConfigAction::On)
        );
        assert_eq!(
            SecurityConfigAction::from_name("off"),
            Some(SecurityConfigAction::Off)
        );
        assert_eq!(SecurityConfigAction::from_name("maybe"), None);
        assert_eq!(
            SecurityConfigAction::from_index(0),
            Some(SecurityConfigAction::On)
        );
        assert_eq!(
            SecurityConfigAction::from_index(1),
            Some(SecurityConfigAction::Off)
        );
        let list = SecurityConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            SecurityConfigAction::Off.localized_name("fr"),
            Some("Désactiver")
        );
    }

    #[test]
    fn security_config_param_mirrors_ts_action_option() {
        // TS security.ts config leg: `action` string option, required,
        // `description: "What the action you want to do?"` + locales;
        // prefixName `security-config`.
        let cmd = super::security_config();
        assert!(cmd.aliases.iter().any(|a| a == "security-config"));
        assert_eq!(cmd.parameters.len(), 1);
        let p = &cmd.parameters[0];
        assert_eq!(p.name, "action");
        assert!(p.required);
        assert_eq!(
            p.description.as_deref(),
            Some("What the action you want to do?")
        );
        assert_eq!(
            p.description_localizations.get("fr").map(String::as_str),
            Some("Quelle est l'action que vous souhaitez faire ?")
        );
        assert_eq!(
            p.description_localizations.get("ja").map(String::as_str),
            Some("実行したいアクションは？")
        );
        assert_eq!(
            p.description_localizations.get("ru").map(String::as_str),
            Some("Какое действие вы хотите выполнить?")
        );
        assert_eq!(
            p.description_localizations.get("es-ES").map(String::as_str),
            Some("Cual es la acción que quieres realizar?")
        );
    }
}
