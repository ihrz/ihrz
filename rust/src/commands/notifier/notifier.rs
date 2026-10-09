use super::*;
use super::{
    add::notifier_add, channel::notifier_channel, list::notifier_list, message::notifier_message,
    remove::notifier_remove,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "notifier",
    rename = "notifier",
    subcommands(
        "notifier_add",
        "notifier_remove",
        "notifier_list",
        "notifier_channel",
        "notifier_message"
    )
)]
pub async fn notifier(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
