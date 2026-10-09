// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/economy/* (23 files).
//
// TS keys: ECONOMY.disabled, ECONOMY.settings.{daily|weekly|monthly|work|rob}
// {amount, cooldown}, ECONOMY.buyableRoles[], USER.<uid>.ECONOMY
// {money, bank, daily, weekly, monthly, work, rob, ownedRoles[]}.
//
// Shop/roles/boosts UI (collectors, podium PNG) pending; the money loop,
// cooldowns, pay/rob/deposit/withdraw/leaderboard are fully ported.

pub mod main;
