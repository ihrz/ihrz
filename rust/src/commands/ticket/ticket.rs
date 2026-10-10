use super::*;

use super::{
    add_member::ticket_add, close::ticket_close, config::ticket_config, delete::ticket_delete,
    log_channel::ticket_log_channel, open::ticket_open, panel::ticket_panel, remind::ticket_remind,
    remove_member::ticket_remove, rename::ticket_rename, set_category::ticket_set_category,
    set_here::ticket_set_here, transcript::ticket_transcript, unlink::ticket_unlink,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "ticket",
    rename = "ticket",
    subcommands(
        "ticket_config",
        "ticket_panel",
        "ticket_open",
        "ticket_close",
        "ticket_add",
        "ticket_remove",
        "ticket_log_channel",
        "ticket_set_category",
        "ticket_set_here",
        "ticket_delete",
        "ticket_remind",
        "ticket_rename",
        "ticket_transcript",
        "ticket_unlink"
    )
)]
pub async fn ticket(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
