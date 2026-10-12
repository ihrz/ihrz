use super::*;
use super::{
    bypass_roles::as_bypass_roles, ignore_channels::as_ignore_channels, manage::as_config,
};

/// Run-less group root for the antispam category.
// Mirrors antispam.ts: `manage` (interactive config panel),
// `bypass-roles` (interactive role-select panel) and
// `ignore-channels` (interactive channel-select panel) are the three
// leaves, each TS-identical (no invented subcommands/params). A bare
// invocation raises SubcommandRequired (mapped to help in `bot.rs`)
// before this body runs, on both paths.
#[poise::command(
    slash_command,
    prefix_command,
    category = "antispam",
    rename = "antispam",
    subcommands("as_config", "as_bypass_roles", "as_ignore_channels"),
    subcommand_required
)]
pub async fn antispam(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
