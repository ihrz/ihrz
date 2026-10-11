use super::*;
use super::{
    channel::confession_channel, config::confession_config, cooldown::confession_cooldown,
    list::confession_list, thread::confession_thread,
};

/// Parent group. Mirrors the TS `confession` HybridCommand definition.
#[poise::command(
    slash_command,
    prefix_command,
    category = "confession",
    rename = "confession",
    subcommands(
        "confession_channel",
        "confession_config",
        "confession_thread",
        "confession_cooldown",
        "confession_list"
    ),
    subcommand_required,
    description_localized("fr", "Commande sous-groupé pour le module de confession"),
    description_localized("ja", "告白カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории признаний!"),
    description_localized("es-ES", "Subcomando para la categoría de confesiones!")
)]
pub async fn confession(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
