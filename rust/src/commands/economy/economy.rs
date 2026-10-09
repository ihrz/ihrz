use super::*;
use super::{
    add::eco_role_add,
    balance::eco_balance,
    balance_add::eco_balance_add,
    balance_remove::eco_balance_remove,
    boost_set::eco_boost_set,
    config::eco_config,
    daily::eco_daily,
    delete::eco_role_delete,
    deposit::eco_deposit,
    greset::eco_greset,
    leaderboard::eco_leaderboard,
    list::eco_role_list,
    monthly::eco_monthly,
    pay::eco_pay,
    rob::eco_rob,
    set_cooldown::eco_set_cooldown,
    set_money::eco_set_money,
    shop::{eco_buy, eco_shop},
    ureset::eco_ureset,
    weekly::eco_weekly,
    withdraw::eco_withdraw,
    work::eco_work,
};

/// Parent group. Mirrors the TS `economy` HybridCommand definition.
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "economy",
    subcommands(
        "eco_balance",
        "eco_daily",
        "eco_weekly",
        "eco_monthly",
        "eco_work",
        "eco_pay",
        "eco_rob",
        "eco_deposit",
        "eco_withdraw",
        "eco_leaderboard",
        "eco_shop",
        "eco_buy",
        "eco_role_add",
        "eco_role_delete",
        "eco_role_list",
        "eco_boost_set",
        "eco_config",
        "eco_balance_add",
        "eco_balance_remove",
        "eco_set_money",
        "eco_set_cooldown",
        "eco_ureset",
        "eco_greset"
    )
)]
pub async fn economy(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
