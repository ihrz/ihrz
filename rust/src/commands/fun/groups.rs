use super::*;
use super::{
    bubbles::bubbles, captions::captions, caracteres::caracteres, cat::cat, catsay::catsay,
    dice::dice, dog::dog, dolphin::dolphin, duck::duck, fox::fox, frog::frog, gay::gay, hack::hack,
    heads_tails::coinflip, hug::hug, kiss::kiss, love::love, morse::morse, number::number,
    panda::panda, poll::poll, question::question, rate::rate, sixseven::sixseven, slap::slap,
    squirrel::squirrel, stench::stench, togif::togif, trans::trans, transgender::transgender,
    tweet::tweet, youtube::youtube,
};

// Run-less subgroup roots for /fun. Mirror the SubcommandGroups in
// src/Interaction/HybridCommands/fun/fun.ts: poise 0.6 has no group
// construct, but a nested command with subcommands and no action
// renders as a SUBCOMMAND_GROUP in the slash payload automatically
// (poise Command::create_as_subcommand), which brings /fun back under
// Discord's 25-option cap (5 groups + config = 6 options;
// biggest group is 8 leaves).
//
// PREFIX VERDICT (checked against TS dispatch): `!fun dice` does NOT
// work in TS — parseMessageCommand (messageCommandHandler.ts) matches
// only one level under `fun`, and `dice` lives under the `random`
// group, so it falls through to the run-less parent (help embed).
// `!fun random dice` does NOT work in TS either: the matched group
// option carries no `run`, so runCommand shows the help embed just
// the same. Grouped leaves are reachable on prefix only via their
// direct leaf registrations (`!dice`, `!cat`, ..., `!fconfig`).
// Poise dispatches hierarchically, so here `!fun random dice` (and
// `/fun random dice`) is the canonical path; the short `!fun dice`
// form stays unavailable on both paths, exactly like TS. The direct
// `!dice` leaf shortcut has no poise equivalent while leaves live
// nested (accepted U-SLASHGROUPS tradeoff, same as every parent).
// No `subcommand_required` exemption on the groups: a bare prefix
// `!fun animals` raises SubcommandRequired, which bot.rs maps to the
// operator-directed no-run path (invoking message deleted, no reply).
// Without the flag poise ran the run-less Ok(()) body and stayed
// silent, leaving the message behind — unlike every other parent and
// unlike prod, which answers the bare group with the help embed
// ("Fun Menu d'aide": the redundant-help reply stays dropped per
// operator direction, but the delete+silence cleanup must still run).

/// Fun commands related to animals
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "animals",
    subcommand_required,
    subcommands("cat", "dog", "duck", "panda", "fox", "dolphin", "frog", "squirrel"),
    name_localized("fr", "animaux"),
    name_localized("ja", "animals"),
    name_localized("ru", "animals"),
    name_localized("es-ES", "animals"),
    description_localized("fr", "commande liée au animaux"),
    description_localized("ja", "動物関連のFunコマンド"),
    description_localized("ru", "Развлекательные команды с животными"),
    description_localized("es-ES", "Comandos divertidos relacionados con animales")
)]
pub async fn fun_animals(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Fun commands related about image
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "image",
    subcommand_required,
    subcommands(
        "catsay",
        "togif",
        "captions",
        "bubbles",
        "youtube",
        "tweet",
        "transgender"
    ),
    description_localized("fr", "Commande lié à des manipulation d'image"),
    description_localized("ja", "画像関連のFunコマンド"),
    description_localized("ru", "Развлекательные команды с изображениями"),
    description_localized("es-ES", "Comandos divertidos relacionados con imágenes")
)]
pub async fn fun_image(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Interaction between users
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "interaction",
    subcommand_required,
    subcommands("sixseven", "hack", "kiss", "love", "poll", "question", "slap", "hug"),
    description_localized("fr", "Interaction entre utilisateurs"),
    description_localized("ja", "ユーザー間の交流"),
    description_localized("ru", "Взаимодействие между пользователями"),
    description_localized("es-ES", "Interacción entre usuarios")
)]
pub async fn fun_interaction(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Fun commands related about text style
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "style",
    subcommand_required,
    subcommands("caracteres", "morse"),
    description_localized("fr", "Commandes fun à propos de la stylisation du texte"),
    description_localized("ja", "テキストスタイル関連のFunコマンド"),
    description_localized("ru", "Развлекательные команды со стилями текста"),
    description_localized("es-ES", "Comandos divertidos relacionados con estilos de texto")
)]
pub async fn fun_style(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Fun slash related to luck (chance)
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "random",
    subcommand_required,
    subcommands("dice", "coinflip", "number", "gay", "rate", "trans", "stench"),
    name_localized("fr", "hasard"),
    name_localized("ja", "random"),
    name_localized("ru", "random"),
    name_localized("es-ES", "random"),
    description_localized("fr", "Commande liée au hasard"),
    description_localized("ja", "運（確率）関連のFunコマンド"),
    description_localized("ru", "Развлекательные команды, связанные с удачей"),
    description_localized("es-ES", "Comandos divertidos relacionados con la suerte (azar)")
)]
pub async fn fun_random(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[cfg(test)]
mod group_no_run_tests {
    use super::{fun_animals, fun_image, fun_interaction, fun_random, fun_style};

    /// Every run-less fun group must raise SubcommandRequired on a bare
    /// prefix invocation so bot.rs runs the operator-directed no-run
    /// cleanup (invoking message deleted, no reply). Without the flag
    /// poise silently ran the empty body and left the message behind
    /// (live: bare `.fun random` / `.fun style` silent + kept; prod
    /// answers the bare group with the "Fun Menu d'aide" embed, whose
    /// redundant-help reply stays dropped per operator direction).
    #[test]
    fn all_fun_groups_require_a_subcommand() {
        for (name, cmd) in [
            ("animals", fun_animals()),
            ("image", fun_image()),
            ("interaction", fun_interaction()),
            ("style", fun_style()),
            ("random", fun_random()),
        ] {
            assert!(!cmd.subcommands.is_empty(), "{name} must keep its leaves");
            assert!(
                cmd.subcommand_required,
                "{name} bare prefix must hit the no-run cleanup, not Ok(()) silence"
            );
        }
    }
}
