use super::*;
use super::{
    create::tag_create, delete::tag_delete, edit::tag_edit, info::tag_info, list::tag_list,
    use_::tag_use, wlroles_create::tag_wl_create, wlroles_use::tag_wl_use,
};

/// Subcommand for the category of tags message
#[poise::command(
    slash_command,
    prefix_command,
    category = "tags",
    rename = "tag",
    subcommands(
        "tag_create",
        "tag_use",
        "tag_edit",
        "tag_delete",
        "tag_list",
        "tag_info",
        "tag_wl_use",
        "tag_wl_create"
    ),
    subcommand_required
)]
pub async fn tag(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
