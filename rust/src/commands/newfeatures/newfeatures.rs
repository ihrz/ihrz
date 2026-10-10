use super::*;
use super::{nightmode::nightmode, punishpub::punishpub, report::report, rolesaver::rolesaver};

#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "newfeatures",
    subcommands("nightmode", "punishpub", "report", "rolesaver")
)]
pub async fn newfeatures(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
