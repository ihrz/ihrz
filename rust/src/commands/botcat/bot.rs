use super::*;
use super::{
    andru::andru, botinfo::botinfo_full, ether::ether, help::help, invite::invite, iris::iris,
    kisakay::kisakay, link::links, noaimie::noaimie, ping::ping, say::say, setserverlang::setlang,
    status::status,
};

#[poise::command(
    slash_command,
    prefix_command,
    category = "bot",
    rename = "bot",
    subcommands(
        "botinfo_full",
        "ping",
        "help",
        "say",
        "setlang",
        "invite",
        "links",
        "status",
        "noaimie",
        "andru",
        "ether",
        "iris",
        "kisakay"
    )
)]
pub async fn bot(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
