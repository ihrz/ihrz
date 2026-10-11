use super::*;

use super::channels::{chan_hide, chan_hideall, chan_unhide, chan_unhideall};

/// Run-less group root. Mirrors the TS `channel` command.
// (src/Interaction/HybridCommands/utils/chanel/channel.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "channel",
    subcommands("chan_hide", "chan_unhide", "chan_unhideall", "chan_hideall"),
    subcommand_required
)]
pub async fn channel(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
