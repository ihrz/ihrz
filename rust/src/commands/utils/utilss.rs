use super::*;

use super::voice::renewvc;

/// Run-less group root. Mirrors the TS `utilss` command.
// (src/Interaction/HybridCommands/utils/utilss/utilss.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "utilss",
    subcommands("renewvc"),
    subcommand_required
)]
pub async fn utilss(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
