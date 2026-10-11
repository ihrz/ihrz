use super::*;
use super::{punishpub::punishpub, report::report, rolesaver::rolesaver};

/// Subcommand for newfeatures category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "newfeatures",
    subcommands("punishpub", "report", "rolesaver"),
    subcommand_required
)]
pub async fn newfeatures(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
