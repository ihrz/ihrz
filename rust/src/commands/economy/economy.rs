use super::*;
use super::{
    add::eco_role_add, balance::eco_balance, balance_add::eco_balance_add,
    balance_remove::eco_balance_remove, boost_set::eco_boost_set, config::eco_config,
    daily::eco_daily, delete::eco_role_delete, deposit::eco_deposit, greset::eco_greset,
    leaderboard::eco_leaderboard, list::eco_role_list, monthly::eco_monthly, pay::eco_pay,
    rob::eco_rob, set_cooldown::eco_set_cooldown, set_money::eco_set_money, shop::eco_shop,
    ureset::eco_ureset, weekly::eco_weekly, withdraw::eco_withdraw, work::eco_work,
};

/// Parent group. Mirrors the TS `economy` HybridCommand definition.
// (src/Interaction/HybridCommands/economy/economy.ts): 17 direct
// Subcommands plus two SubcommandGroups — `role` (add/delete/list) and
// `manage-rewards` (set-money/set-cooldown) — rendered as nested poise
// groups (a nested command WITH subcommands renders as a
// SubcommandGroup, WITHOUT as a Subcommand; every node keeps its
// slash leg or `create_as_subcommand` drops it). Same pattern as the
// /fun groups in `fun::groups`. Options follow the TS declaration
// order, keeping /economy under Discord's 25-option cap (19 entries).
//
// ECROLE GATE (dropped, acceptable): the TS `role` SubcommandGroup
// carries prefixName `ecrole` plus an Administrator gate over children
// that only require ManageGuild. The nested leaves keep their own TS
// names, prefix aliases (`economy-role-add` etc.) and per-command
// permissions; the extra parent-group gate and the `ecrole` group
// prefix path are not reproduced.
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "economy",
    subcommands(
        "eco_balance_add",
        "eco_balance_remove",
        "eco_balance",
        "eco_config",
        "eco_leaderboard",
        "eco_deposit",
        "eco_daily",
        "eco_monthly",
        "eco_weekly",
        "eco_pay",
        "eco_rob",
        "eco_withdraw",
        "eco_work",
        "eco_role",
        "eco_boost_set",
        "eco_manage_rewards",
        "eco_shop",
        "eco_ureset",
        "eco_greset"
    ),
    subcommand_required,
    name_localized("fr", "économie"),
    name_localized("ja", "economy"),
    name_localized("ru", "economy"),
    name_localized("es-ES", "economy"),
    description_localized("fr", "Commande sous-groupé pour la catégorie d'économie"),
    description_localized("ja", "経済カテゴリのサブコマンド！"),
    description_localized("ru", "Подкоманда для категории экономики!"),
    description_localized("es-ES", "Subcomando para la categoría de economía!")
)]
pub async fn economy(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Set a role for a certain amount of money!
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "role",
    subcommands("eco_role_add", "eco_role_delete", "eco_role_list"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Définir un rôle pour un certain montant d'argent"),
    description_localized("ja", "特定の金額でロールを設定！"),
    description_localized("ru", "Установить роль за определенную сумму!"),
    description_localized("es-ES", "Establecer un rol por una cierta cantidad de dinero!")
)]
pub async fn eco_role(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

/// Manage how much money you can get from daily, weekly and monthly!
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "manage-rewards",
    subcommands("eco_set_money", "eco_set_cooldown"),
    description_localized(
        "fr",
        "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement"
    ),
    description_localized("ja", "デイリー、ウィークリー、マンスリーで獲得できる金額を管理！"),
    description_localized(
        "ru",
        "Управлять количеством денег, получаемых ежедневно, еженедельно и ежемесячно!"
    ),
    description_localized(
        "es-ES",
        "Gestionar cuánto dinero puedes obtener de diario, semanal y mensual!"
    )
)]
pub async fn eco_manage_rewards(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}
