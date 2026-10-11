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
// Discord's 25-option cap (5 groups + config + grosbg = 7 options;
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
// No `subcommand_required` on the groups: a group node can never be
// invoked over slash (Discord forces a leaf), and on prefix a bare
// `!fun animals` falls into the no-run help fallback in bot.rs like
// any other run-less node.

/// Fun commands related to animals.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "animals",
    subcommands("cat", "dog", "duck", "panda", "fox", "dolphin", "frog", "squirrel")
)]
pub async fn fun_animals(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Fun commands related about image.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "image",
    subcommands(
        "catsay",
        "togif",
        "captions",
        "bubbles",
        "youtube",
        "tweet",
        "transgender"
    )
)]
pub async fn fun_image(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Interaction between users.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "interaction",
    subcommands("sixseven", "hack", "kiss", "love", "poll", "question", "slap", "hug")
)]
pub async fn fun_interaction(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Fun commands related about text style.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "style",
    subcommands("caracteres", "morse")
)]
pub async fn fun_style(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Fun slash related to luck (chance).
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "random",
    subcommands("dice", "coinflip", "number", "gay", "rate", "trans", "stench")
)]
pub async fn fun_random(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
