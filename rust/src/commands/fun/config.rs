use super::*;

/// Config action choice. Mirrors the `action` option `choices` in
/// fun.ts:1293-1318: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum FunConfigAction {
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

impl FunConfigAction {
    /// TS `value` stored under `GUILD.FUN.states`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Disable the fun category.
// The raw action string is stored under `GUILD.FUN.states`; anything but
// `"off"` counts as enabled (`action === "off" ? var_disabled : var_enabled`).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "config",
    aliases("fconfig"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Désactiver la catégorie fun"),
    description_localized("ja", "Funカテゴリを無効化"),
    description_localized("ru", "Отключить категорию развлечений"),
    description_localized("es-ES", "Deshabilitar la categoría de diversión")
)]
pub async fn fun_config(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Que voulez-vous faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    #[description = "What do you want to do?"]
    action: FunConfigAction,
) -> Result<(), anyhow::Error> {
    let action = action.as_str();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Mirrors `await client.db.set(..., action)`: the raw action is stored.
    crate::backends::Backend::sqlite(ctx.data().pool.clone())
        .table(&gid)
        .set("GUILD.FUN.states", action)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors `action === "off" ? lang.var_disabled : lang.var_enabled`.
    let action_type = crate::lang::get(
        &code,
        if action == "off" {
            "var_disabled"
        } else {
            "var_enabled"
        },
    )
    .unwrap_or_else(|| {
        if action == "off" {
            "Disabled".to_string()
        } else {
            "Enabled".to_string()
        }
    });
    ctx.say(
        crate::lang::get(&code, "fun_disable_command_msg")
            .unwrap_or_else(|| {
                "${interaction.member?.user.toString()}, you have ${action_type} the fun category!"
                    .to_string()
            })
            .replace("${action_type}", &action_type)
            .replace(
                "${interaction.member?.user.toString()}",
                &format!("<@{}>", ctx.author().id.get()),
            ),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fun_config_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = FunConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["Power On".to_string(), "Power Off".to_string()]);
        assert_eq!(FunConfigAction::On.as_str(), "on");
        assert_eq!(FunConfigAction::Off.as_str(), "off");
        assert_eq!(FunConfigAction::from_name("on"), Some(FunConfigAction::On));
        assert_eq!(
            FunConfigAction::from_name("POWER OFF"),
            Some(FunConfigAction::Off)
        );
        assert_eq!(FunConfigAction::from_name("maybe"), None);
        assert_eq!(FunConfigAction::from_index(0), Some(FunConfigAction::On));
        assert_eq!(FunConfigAction::from_index(1), Some(FunConfigAction::Off));
        let list = FunConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
        assert_eq!(FunConfigAction::On.localized_name("fr"), Some("Activer"));
    }
}
