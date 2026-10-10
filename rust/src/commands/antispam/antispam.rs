use super::*;
use super::{
    bypass_roles::as_bypass_roles, ignore_channels::as_ignore_channels, manage::as_config,
};

/// Run-less group root for the antispam category.
// The TS `!manage` collector UI is flattened to the `config` leaf
// (`as_config`, registered below with the `mng` / `antimng` prefix
// aliases, so `!antispam mng` keeps working); bypass roles/channels
// are their own leaves. A bare invocation raises SubcommandRequired
// (mapped to help in `bot.rs`) before this body runs, on both paths.
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
