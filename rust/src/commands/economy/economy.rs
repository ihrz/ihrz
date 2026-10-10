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
// (src/Interaction/HybridCommands/economy/economy.ts).
//
// FLAT DECISION (R4/R6): TS registers two SubcommandGroups under
// /economy — `role` (add/delete/list) and `manage-rewards`
// (set-money/set-cooldown). poise 0.6 has no SubcommandGroup support
// (no group construct in poise/poise_macros 0.6.2), so all 23 leaf
// commands register flat under /economy. Precedent: antispam flattens
// its collector UI the same way. Revisit if poise is upgraded.
//
// ECROLE GATE (dropped, acceptable): the TS `role` SubcommandGroup carries
// prefixName `ecrole` plus an Administrator gate over children that only
// require ManageGuild. The flat leaf commands keep their own TS names,
// prefix aliases and per-command permissions; the extra parent-group gate
// and the `ecrole` group prefix path are not reproduced.
//
// ECO_BUY (keep-as-addition): TS has no /economy buy subcommand — buys
// happen only through the shop select-menu collector (!shop.ts). The
// Rust side keeps `eco_buy` (/economy buy) as a deliberate addition:
// it reuses the shared `do_buy` core (owned-restore, funds check,
// money + ownedRoles writes, role grant), so parity of the purchase
// gates is tested in one place.
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
