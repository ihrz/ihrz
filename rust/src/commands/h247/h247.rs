use super::*;
use super::{info::h247_info, join::h247_join, leave::h247_leave};

/// Subcommand for h247 category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "h247",
    rename = "h247",
    subcommands("h247_join", "h247_leave", "h247_info"),
    default_member_permissions = "ADMINISTRATOR",
    subcommand_required
)]
pub async fn h247(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
