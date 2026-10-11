use super::*;
use super::{
    channel::security_channel, config::security_config, role_to_give::security_give,
    role_to_remove::security_remove,
};

/// Subcommand for security category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "security",
    rename = "security",
    subcommands(
        "security_channel",
        "security_config",
        "security_give",
        "security_remove"
    ),
    subcommand_required,
    name_localized("fr", "sécurité"),
    name_localized("ja", "security"),
    name_localized("ru", "security"),
    name_localized("es-ES", "security"),
    description_localized("fr", "Commande sous-groupé pour la catégorie de securité"),
    description_localized("ja", "セキュリティカテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории безопасности!"),
    description_localized("es-ES", "Subcomando para la categoría de seguridad!")
)]
pub async fn security(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn security_registers_name_and_description_localizations() {
        let cmd = super::security();
        assert_eq!(
            cmd.name_localizations.get("fr").map(String::as_str),
            Some("sécurité")
        );
        assert_eq!(
            cmd.name_localizations.get("ja").map(String::as_str),
            Some("security")
        );
        assert_eq!(
            cmd.name_localizations.get("ru").map(String::as_str),
            Some("security")
        );
        assert_eq!(
            cmd.name_localizations.get("es-ES").map(String::as_str),
            Some("security")
        );
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous-groupé pour la catégorie de securité")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("セキュリティカテゴリのサブコマンド！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Подкоманда для категории безопасности!")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Subcomando para la categoría de seguridad!")
        );
    }
}
