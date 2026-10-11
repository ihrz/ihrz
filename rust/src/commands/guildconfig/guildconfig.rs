use super::*;

use super::{
    autologs::gc_autologs, autoreact::gc_autoreact, autoreact::gc_autoreact_list,
    autoreact::gc_autoreact_remove, autoreact::gc_autoreact_toggle, block::gc_block, bot::gc_bot,
    commandlimit::gc_commandlimit, config::gc_config, join_ghostping::gc_join_ghostping,
    perm_parent::gc_perm, set::gc_set, setlogschannel::gc_setlogs, setup::gc_setup,
    support::gc_support,
};

/// Guild configuration commands.
// Discord caps a command at 25 direct options, so the leaves live
// under TS-canonical groups: `block` / `bot` / `config` / `set`
// (mirroring the `guildconfig.ts` SubcommandGroups), `perm`
// (`perm.ts`), `join-ghostping` (`join-ghostping.ts`), while
// `automod` registers top-level beside this parent (already wired
// in `commands/mod.rs`, mirroring its own TS `automod` parent).
// The `autoreact` / `commandlimit` / `setlogs` / `support` leaves
// stay direct: TS defines each as its own top-level command
// (`HybridCommands/guildconfig/*`), so the lead can promote them
// out of here without touching the leaves.
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
        "gc_commandlimit",
        "gc_setlogs",
        "gc_support",
        "gc_autoreact",
        "gc_autoreact_list",
        "gc_autoreact_remove",
        "gc_autoreact_toggle",
        "gc_autologs"
    ),
    subcommand_required
)]
pub async fn guildconfig(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
