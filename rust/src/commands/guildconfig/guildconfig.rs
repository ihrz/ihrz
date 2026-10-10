use super::*;

use super::{
    autologs::gc_autologs, automod::gc_automod, autoreact::gc_autoreact,
    autoreact::gc_autoreact_list, autoreact::gc_autoreact_remove, autoreact::gc_autoreact_toggle,
    blockbot::gc_blockbot, commandlimit::gc_commandlimit, ghost::gc_ghost_add,
    ghost::gc_ghost_list, ghost::gc_ghost_remove, joindm::gc_joindm, joinrole::gc_joinrole,
    perm::gc_perm_change, perm::gc_perm_delete, perm::gc_perm_delete_all, perm::gc_perm_list,
    perm::gc_perm_list_all, perm::gc_perm_reset, perm::gc_perm_roles_create,
    perm::gc_perm_roles_edit, perm::gc_perm_set, perm::gc_perm_user, prefix::gc_prefix,
    restore::gc_config_restore, save::gc_config_save, setlogschannel::gc_setlogs, setup::gc_setup,
    show::gc_show, support::gc_support, tonew::gc_toonew, welcomer::gc_wc_channel,
    welcomer::gc_wc_components, welcomer::gc_wc_embed, welcomer::gc_wc_panel, welcomer::gc_wc_text,
};

/// Parent group. Mirrors the TS `guildconfig` SlashCommand definition.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "guildconfig",
    subcommands(
        "gc_commandlimit",
        "gc_setlogs",
        "gc_support",
        "gc_autoreact",
        "gc_autoreact_list",
        "gc_autoreact_remove",
        "gc_autoreact_toggle",
        "gc_prefix",
        "gc_ghost_add",
        "gc_ghost_remove",
        "gc_ghost_list",
        "gc_perm_set",
        "gc_perm_user",
        "gc_perm_list",
        "gc_perm_reset",
        "gc_perm_change",
        "gc_perm_delete",
        "gc_perm_list_all",
        "gc_perm_delete_all",
        "gc_wc_channel",
        "gc_wc_embed",
        "gc_wc_text",
        "gc_wc_components",
        "gc_wc_panel",
        "gc_config_save",
        "gc_config_restore",
        "gc_perm_roles_create",
        "gc_perm_roles_edit",
        "gc_show",
        "gc_autologs",
        "gc_setup",
        "gc_automod",
        "gc_blockbot",
        "gc_toonew",
        "gc_joindm",
        "gc_joinrole"
    ),
    subcommand_required
)]
pub async fn guildconfig(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
