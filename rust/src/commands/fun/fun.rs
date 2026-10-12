use super::groups::{fun_animals, fun_image, fun_interaction, fun_random, fun_style};
use super::{config::fun_config, grosbg::grosbg};
use crate::bot::Ctx;

/// Subcommand for fun category!
// Grouped to stay under Discord's 25-option cap: the five TS
// SubcommandGroups (animals/image/interaction/style/random) render as
// nested SUBCOMMAND_GROUP options, `config` stays a direct subcommand
// like in TS, and `grosbg` stays direct too — it is not part of the TS
// `fun` definition (MessageCommands/bot/@.ts port kept as a leaf here),
// so no invented group membership. A bare invocation raises
// SubcommandRequired (mapped to help in `bot.rs`) before this body
// runs, on both paths.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "fun",
    subcommands(
        "fun_animals",
        "fun_image",
        "fun_interaction",
        "fun_style",
        "fun_random",
        "fun_config",
        "grosbg"
    ),
    subcommand_required,
    name_localized("fr", "fun"),
    name_localized("ja", "fun"),
    name_localized("ru", "fun"),
    name_localized("es-ES", "fun"),
    description_localized("fr", "Commande sous-groupé pour la catégorie d'amusement"),
    description_localized("ja", "Funカテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории развлечений!"),
    description_localized("es-ES", "Subcomando para la categoría de diversión!")
)]
pub async fn fun(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
