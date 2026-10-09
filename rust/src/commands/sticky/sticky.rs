use super::*;
use super::{
    disable::sticky_disable, embed::sticky_embed, list::sticky_list, refresh::sticky_refresh,
    show::sticky_show, text::sticky_text,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "sticky",
    rename = "sticky",
    subcommands(
        "sticky_text",
        "sticky_embed",
        "sticky_disable",
        "sticky_show",
        "sticky_list",
        "sticky_refresh"
    )
)]
pub async fn sticky(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
