use super::*;
use super::{
    create::gw_create,
    end::gw_end,
    get_all::{gw_get_all, gw_list},
    get_data::gw_get_data,
    list_entries::gw_entries,
    reroll::gw_reroll,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "giveaway",
    rename = "gw",
    subcommands(
        "gw_create",
        "gw_end",
        "gw_reroll",
        "gw_list",
        "gw_entries",
        "gw_get_data",
        "gw_get_all"
    )
)]
pub async fn giveaway(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
