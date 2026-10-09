use super::*;
use super::{add::blogger_add, list::blogger_list, remove::blogger_remove, status::blogger_status};

#[poise::command(
    slash_command,
    prefix_command,
    category = "blogger",
    rename = "blogger",
    subcommands("blogger_add", "blogger_remove", "blogger_list", "blogger_status")
)]
pub async fn blogger(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
