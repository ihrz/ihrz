use super::*;
use super::{
    add_react::add_react, antiexe::antiexe, autofeur::autofeur, fexini::fexini,
    help_browser::help_browser, help_main::help_main, helpall::helpall, kawaeine::kawaeine,
    langstats::langstats, list_react::list_react, nitrofdp::nitrofdp,
    rap_vs_reality::rap_vs_reality, remove_react::remove_react, securewebhook::securewebhook,
    shardinfo::shardinfo, status_embed::status_embed, two_sides::two_sides, updates::updates,
    welcomer::welcomer,
};

/// Subcommand for legacy category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "legacy",
    rename = "legacy",
    subcommands(
        "add_react",
        "antiexe",
        "autofeur",
        "fexini",
        "helpall",
        "help_browser",
        "help_main",
        "kawaeine",
        "langstats",
        "list_react",
        "nitrofdp",
        "rap_vs_reality",
        "remove_react",
        "securewebhook",
        "shardinfo",
        "status_embed",
        "two_sides",
        "updates",
        "welcomer"
    ),
    subcommand_required
)]
pub async fn legacy(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
