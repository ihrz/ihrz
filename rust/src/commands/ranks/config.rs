use super::*;

/// Config action choice. Mirrors the `action` option `choices` in
/// ranks.ts:90-121: slash shows the localized display names, the
/// handler maps each variant back to the TS `value` read by
/// `config_value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum RanksConfigAction {
    #[name = "on"]
    #[name_localized("en-US", "Power On the module (send message when user earn xp level)")]
    #[name_localized("en-GB", "Power On the module (send message when user earn xp level)")]
    #[name_localized(
        "fr",
        "Activer le module (envoyer un message lorsque l'utilisateur gagne un niveau XP)"
    )]
    #[name_localized("ja", "power_on_the_module_send_message")]
    #[name_localized("ru", "power_on_the_module_send_message")]
    #[name_localized("es-ES", "power_on_the_module_send_message")]
    On,
    #[name = "off"]
    #[name_localized(
        "en-US",
        "Power Off the module (don't send any message but user still earn xp level)"
    )]
    #[name_localized(
        "en-GB",
        "Power Off the module (don't send any message but user still earn xp level)"
    )]
    #[name_localized("fr", "Désactiver le module (ne pas envoyer de message mais l'utilisateur gagne toujours un niveau XP)")]
    #[name_localized("ja", "power_off_the_module_don_t_send_")]
    #[name_localized("ru", "power_off_the_module_don_t_send_")]
    #[name_localized("es-ES", "power_off_the_module_don_t_send_")]
    Off,
    #[name = "disable"]
    #[name_localized(
        "en-US",
        "Disable the module (don't send any message and user don't earn xp level)"
    )]
    #[name_localized(
        "en-GB",
        "Disable the module (don't send any message and user don't earn xp level)"
    )]
    #[name_localized("fr", "Désactiver le module (ne pas envoyer de message et l'utilisateur ne gagne pas de niveau XP)")]
    #[name_localized("ja", "disable_the_module_don_t_send_an")]
    #[name_localized("ru", "disable_the_module_don_t_send_an")]
    #[name_localized("es-ES", "disable_the_module_don_t_send_an")]
    Disable,
}

impl RanksConfigAction {
    /// TS `value` read by `config_value`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
            Self::Disable => "disable",
        }
    }
}

/// Third disable state. Mirrors `ranks/!config.ts:50,69,88`: the prefix
/// path compares with case-sensitive `==`, so only the exact inputs
/// `on` / `off` / `disable` act — `ON` or `OFF` do nothing in TS.
/// `on` stores the native boolean `true`, `off` the native boolean
/// `false` (TS `client.db.set` writes real booleans, and the announce
/// gate compares `xpTurn === false`), `disable` stores the string
/// `"disable"` (nothing is gained — see `xp_gain_blocked`).
/// Unknown input does nothing, like TS.
pub fn config_value(action: &str) -> Option<serde_json::Value> {
    match action {
        "on" => Some(serde_json::Value::Bool(true)),
        "off" => Some(serde_json::Value::Bool(false)),
        "disable" => Some(serde_json::Value::String("disable".to_string())),
        _ => None,
    }
}

/// Storage encoding of a [`config_value`]: native JSON booleans stay
/// bare (`true` / `false`, never quoted), strings stay raw so the read
/// side (and the TS runtime) sees the same JSON value either way.
pub fn config_stored_value(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

/// Enable, soften or fully disable the XP module.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("rconfig"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Configurer le message lorsque l'utilisateur gagne un nouveau message de niveau XP"
    ),
    description_localized("ja", "ユーザーが新しいXPレベルを獲得した時のメッセージを設定！"),
    description_localized("ru", "Настроить сообщение при получении нового уровня XP!"),
    description_localized(
        "es-ES",
        "Configurar el mensaje cuando el usuario gana un nuevo nivel de XP!"
    )
)]
pub async fn ranks_config(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Que voulez-vous faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    #[description = "on, off or disable"]
    action: RanksConfigAction,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let Some(value) = config_value(action.as_str()) else {
        return Ok(());
    };
    // Mirrors `ranks/!config.ts`: the audit log posts BEFORE the write,
    // then the row is set, then the reply (`:51-68`, `:70-87`, `:89-106`).
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    // `off` and `disable` share the disable log embed in TS; only the
    // reply key differs (`disablexp_command_work_disable_entierly`).
    let (title_key, desc_key, reply_key, reply_fb) = match &value {
        serde_json::Value::Bool(true) => (
            "disablexp_logs_embed_title_enable",
            "disablexp_logs_embed_description_enable",
            "disablexp_command_work_enable",
            "You have successfully enabled XP.",
        ),
        serde_json::Value::String(_) => (
            "disablexp_logs_embed_title_disable",
            "disablexp_logs_embed_description_disable",
            "disablexp_command_work_disable_entierly",
            "You have successfully disabled the ranks module! (No more messages, and users will not earn levels)",
        ),
        _ => (
            "disablexp_logs_embed_title_disable",
            "disablexp_logs_embed_description_disable",
            "disablexp_command_work_disable",
            "You have successfully disabled XP.",
        ),
    };
    let title = crate::lang::get(&code, title_key).unwrap_or_else(|| "XP config.".to_string());
    let desc = crate::lang::get(&code, desc_key)
        .map(|s| s.replace("${interaction.user.id}", &author_id))
        .unwrap_or_else(|| "XP config updated.".to_string());
    crate::commands::economy::post_ihorizon_log(&ctx, &title, &desc).await;
    super::migrated_set(
        &ctx.data().pool,
        &gid,
        super::GUILD_DISABLE_NEW,
        &[super::GUILD_DISABLE_OLD],
        &config_stored_value(&value),
    )
    .await?;
    ctx.say(crate::lang::get(&code, reply_key).unwrap_or_else(|| reply_fb.to_string()))
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::RanksConfigAction;
    use super::{config_stored_value, config_value};

    #[test]
    fn ranks_config_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = RanksConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["on", "off", "disable",]);
        assert_eq!(RanksConfigAction::On.as_str(), "on");
        assert_eq!(RanksConfigAction::Off.as_str(), "off");
        assert_eq!(RanksConfigAction::Disable.as_str(), "disable");
        assert_eq!(
            RanksConfigAction::from_name("disable"),
            Some(RanksConfigAction::Disable)
        );
        assert_eq!(
            RanksConfigAction::from_name("off"),
            Some(RanksConfigAction::Off)
        );
        assert_eq!(RanksConfigAction::from_name("bogus"), None);
        assert_eq!(
            RanksConfigAction::from_index(0),
            Some(RanksConfigAction::On)
        );
        assert_eq!(
            RanksConfigAction::from_index(2),
            Some(RanksConfigAction::Disable)
        );
        assert_eq!(RanksConfigAction::from_index(3), None);
        let list = RanksConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer le module (envoyer un message lorsque l'utilisateur gagne un niveau XP)")
        );
        assert_eq!(
            list[2].localizations.get("fr").map(String::as_str),
            Some("Désactiver le module (ne pas envoyer de message et l'utilisateur ne gagne pas de niveau XP)")
        );
        assert_eq!(
            list[1].localizations.get("ja").map(String::as_str),
            Some("power_off_the_module_don_t_send_")
        );
    }

    #[test]
    fn config_writes_native_json_booleans() {
        // `on` / `off` store native JSON booleans (TS `client.db.set`
        // writes real booleans), `disable` the raw string.
        assert_eq!(config_value("on"), Some(serde_json::Value::Bool(true)));
        assert_eq!(config_value("off"), Some(serde_json::Value::Bool(false)));
        assert_eq!(
            config_value("disable"),
            Some(serde_json::Value::String("disable".to_string()))
        );
        assert_eq!(config_value("ON"), None);
        assert_eq!(config_value("bogus"), None);
        assert_eq!(config_value("Disable"), None);
        assert_eq!(config_value(""), None);
        // No trim: TS compares with case-sensitive `==`, so padded
        // input matches nothing.
        assert_eq!(config_value(" on"), None);
        assert_eq!(config_value("off "), None);
        assert_eq!(config_value("on\n"), None);
        // Storage encoding: booleans stay bare (never quoted), the
        // string stays raw — the same JSON value on both runtimes.
        assert_eq!(config_stored_value(&config_value("on").unwrap()), "true");
        assert_eq!(config_stored_value(&config_value("off").unwrap()), "false");
        assert_eq!(
            config_stored_value(&config_value("disable").unwrap()),
            "disable"
        );
    }
}
