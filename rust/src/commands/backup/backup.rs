use super::*;
use super::{
    create::backup_create, delete::backup_delete, list::backup_list, load::backup_load,
    manage::backup_manage,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "backup",
    rename = "backup",
    subcommands(
        "backup_create",
        "backup_list",
        "backup_load",
        "backup_delete",
        "backup_manage"
    )
)]
pub async fn backup(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
