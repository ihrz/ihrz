use super::*;

use super::{
    add_member::ticket_add, close::ticket_close, config::ticket_config, delete::ticket_delete,
    log_channel::ticket_log_channel, open::ticket_open, panel::ticket_panel, remind::ticket_remind,
    remove_member::ticket_remove, rename::ticket_rename, set_category::ticket_set_category,
    set_here::ticket_set_here, transcript::ticket_transcript, unlink::ticket_unlink,
};

/// Subcommand for ticket category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "ticket",
    rename = "ticket",
    subcommands(
        "ticket_config",
        "ticket_panel",
        "ticket_open",
        "ticket_close",
        "ticket_add",
        "ticket_remove",
        "ticket_log_channel",
        "ticket_set_category",
        "ticket_set_here",
        "ticket_delete",
        "ticket_remind",
        "ticket_rename",
        "ticket_transcript",
        "ticket_unlink"
    ),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour la catégorie de ticket"),
    description_localized("ja", "チケットカテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории тикетов!"),
    description_localized("es-ES", "Subcomando para la categoría de tickets!")
)]
pub async fn ticket(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn ticket_parent_registers_description_localizations() {
        let cmd = super::ticket();
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Commande sous-groupé pour la catégorie de ticket")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("チケットカテゴリのサブコマンド！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Подкоманда для категории тикетов!")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Subcomando para la categoría de tickets!")
        );
    }
}
