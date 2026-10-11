use super::*;

use super::{
    autologs::gc_autologs, block::gc_block, bot::gc_bot, config::gc_config,
    join_ghostping::gc_join_ghostping, perm_parent::gc_perm, set::gc_set, setup::gc_setup,
};

/// Guild configuration commands.
// Discord caps a command at 25 direct options, so the leaves live
// under TS-canonical groups: `block` / `bot` / `config` / `set`
// (mirroring the `guildconfig.ts` SubcommandGroups), `perm`
// (`perm.ts`), `join-ghostping` (`join-ghostping.ts`), while
// `automod` registers top-level beside this parent (already wired
// in `commands/mod.rs`, mirroring its own TS `automod` parent).
// FLATTEN-B3: the `autoreact` / `commandlimit` / `setlogs` /
// `support` leaves are top-level now (TS defines each as its own
// top-level command in `HybridCommands/guildconfig/*`), registered
// in `commands/mod.rs::all()` beside this parent.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "guildconfig",
    subcommands(
        "gc_setup",
        "gc_block",
        "gc_bot",
        "gc_config",
        "gc_set",
        "gc_perm",
        "gc_join_ghostping",
        "gc_autologs"
    ),
    subcommand_required
)]
pub async fn guildconfig(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
