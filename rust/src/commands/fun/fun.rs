use super::*;
use super::{
    bubbles::bubbles, captions::captions, caracteres::caracteres, cat::cat, catsay::catsay,
    config::fun_config, dice::dice, dog::dog, dolphin::dolphin, duck::duck, fox::fox, frog::frog,
    gay::gay, grosbg::grosbg, hack::hack, heads_tails::coinflip, hug::hug, kiss::kiss, love::love,
    morse::morse, number::number, panda::panda, poll::poll, question::question, rate::rate,
    sixseven::sixseven, slap::slap, squirrel::squirrel, stench::stench, togif::togif, trans::trans,
    transgender::transgender, tweet::tweet, youtube::youtube,
};

/// Run-less group root for fun commands. Mirrors TS `fun` HybridCommand.
// `fun_config` is registered in the leaf list below, so the config
// panel stays reachable via `/fun config` and `!fun config`. A bare
// invocation raises SubcommandRequired (mapped to help in `bot.rs`)
// before this body runs, on both paths.
#[poise::command(
    slash_command,
    prefix_command,
    category = "fun",
    rename = "fun",
    subcommands(
        "bubbles",
        "captions",
        "caracteres",
        "cat",
        "catsay",
        "fun_config",
        "dice",
        "dog",
        "dolphin",
        "duck",
        "fox",
        "frog",
        "gay",
        "grosbg",
        "hack",
        "coinflip",
        "hug",
        "kiss",
        "love",
        "morse",
        "number",
        "panda",
        "poll",
        "question",
        "rate",
        "sixseven",
        "slap",
        "squirrel",
        "stench",
        "togif",
        "trans",
        "transgender",
        "tweet",
        "youtube"
    ),
    subcommand_required
)]
pub async fn fun(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
