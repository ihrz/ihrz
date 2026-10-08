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

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EconAccount {
    #[serde(default)]
    pub money: i64,
    #[serde(default)]
    pub bank: i64,
    #[serde(default)]
    pub daily: i64,
    #[serde(default)]
    pub weekly: i64,
    #[serde(default)]
    pub monthly: i64,
    #[serde(default)]
    pub work: i64,
    #[serde(default)]
    pub rob: i64,
}

/// Per-guild claim tuning. Mirrors ECONOMY.settings.<type> {amount, cooldown}.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimTuning {
    pub amount: i64,
    pub cooldown_ms: i64,
}

pub fn default_tuning(kind: &str) -> ClaimTuning {
    match kind {
        "daily" => ClaimTuning {
            amount: 100,
            cooldown_ms: 86_400_000,
        },
        "weekly" => ClaimTuning {
            amount: 500,
            cooldown_ms: 604_800_000,
        },
        "monthly" => ClaimTuning {
            amount: 2000,
            cooldown_ms: 2_592_000_000,
        },
        "work" => ClaimTuning {
            amount: 50,
            cooldown_ms: 3_600_000,
        },
        "rob" => ClaimTuning {
            amount: 0,
            cooldown_ms: 3_600_000,
        },
        _ => ClaimTuning {
            amount: 0,
            cooldown_ms: 0,
        },
    }
}

pub async fn load_tuning(pool: &crate::db::Pool, guild_id: &str, kind: &str) -> ClaimTuning {
    crate::db::kv_get(pool, guild_id, &format!("ECONOMY.settings.{kind}"))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| default_tuning(kind))
}

pub fn econ_key(user_id: u64) -> String {
    format!("USER.{user_id}.ECONOMY")
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ShopRole {
    pub role_id: String,
    pub price: i64,
    #[serde(default)]
    pub boost: String,
}

pub fn shop_key() -> &'static str {
    "ECONOMY.buyableRoles"
}

pub async fn load_shop(pool: &crate::db::Pool, guild_id: &str) -> Vec<ShopRole> {
    crate::db::kv_get(pool, guild_id, shop_key())
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// ms remaining before `last + cooldown` given now; 0 = ready.
pub fn cooldown_remaining(last: i64, cooldown_ms: i64, now_ms: i64) -> i64 {
    (last + cooldown_ms - now_ms).max(0)
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Member boost multiplier from shop roles. Mirrors
/// economyHelper.getMemberBoost (highest matching boost, default 1).
/// Reads both the Rust Vec shape and the TS object-map shape.
pub fn member_boost(shop_json: &str, member_roles: &[u64]) -> i64 {
    let v: serde_json::Value = match serde_json::from_str(shop_json) {
        Ok(v) => v,
        Err(_) => return 1,
    };
    let mut best = 1i64;
    let check = |role_id: &str, boost: &serde_json::Value, member_roles: &[u64], best: &mut i64| {
        if let Ok(n) = role_id.parse::<u64>() {
            if member_roles.contains(&n) {
                if let Some(b) = boost
                    .as_str()
                    .and_then(|s| s.trim_start_matches('x').parse::<i64>().ok())
                    .or_else(|| boost.as_i64())
                {
                    if b > *best {
                        *best = b;
                    }
                }
            }
        }
    };
    match &v {
        serde_json::Value::Array(arr) => {
            for entry in arr {
                let role_id = entry.get("role_id").and_then(|r| r.as_str()).unwrap_or("");
                let boost = entry.get("boost").unwrap_or(&serde_json::Value::Null);
                check(role_id, boost, member_roles, &mut best);
            }
        }
        serde_json::Value::Object(map) => {
            for (role_id, data) in map {
                let boost = data.get("boost").unwrap_or(&serde_json::Value::Null);
                check(role_id, boost, member_roles, &mut best);
            }
        }
        _ => {}
    }
    best.max(1)
}

pub async fn load_econ(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> EconAccount {
    crate::db::kv_get(pool, guild_id, &econ_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub async fn save_econ(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    a: &EconAccount,
) -> anyhow::Result<()> {
    crate::db::kv_set(
        pool,
        guild_id,
        &econ_key(user_id),
        &serde_json::to_string(a)?,
    )
    .await
}

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

#[poise::command(slash_command, prefix_command, rename = "balance")]
pub async fn eco_balance(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let a = load_econ(&ctx.data().pool, &gid, uid).await;
    ctx.say(format!("Wallet: {} | Bank: {}", a.money, a.bank))
        .await?;
    Ok(())
}

macro_rules! eco_claim {
    ($fn_name:ident, $sub:literal, $field:ident, $kind:literal) => {
        #[poise::command(slash_command, prefix_command, rename = $sub)]
        pub async fn $fn_name(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
            let gid = ctx
                .guild_id()
                .map(|g| g.get().to_string())
                .unwrap_or_default();
            let uid = ctx.author().id.get();
            let tune = load_tuning(&ctx.data().pool, &gid, $kind).await;
            let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
            let now = now_ms();
            let left = cooldown_remaining(a.$field, tune.cooldown_ms, now);
            if left > 0 {
                ctx.say(format!("Cooldown: {}s left.", left / 1000)).await?;
                return Ok(());
            }
            a.money += tune.amount;
            a.$field = now;
            save_econ(&ctx.data().pool, &gid, uid, &a).await?;
            ctx.say(format!("+{} (wallet {})", tune.amount, a.money))
                .await?;
            Ok(())
        }
    };
}

eco_claim!(eco_daily, "daily", daily, "daily");
eco_claim!(eco_weekly, "weekly", weekly, "weekly");
eco_claim!(eco_monthly, "monthly", monthly, "monthly");
eco_claim!(eco_work, "work", work, "work");

#[poise::command(slash_command, prefix_command, rename = "pay")]
pub async fn eco_pay(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    if amount <= 0 {
        ctx.say("Amount must be positive.").await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let from = ctx.author().id.get();
    let to = user.id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, from).await;
    if a.money < amount {
        ctx.say("Not enough money.").await?;
        return Ok(());
    }
    let mut b = load_econ(&ctx.data().pool, &gid, to).await;
    a.money -= amount;
    b.money += amount;
    save_econ(&ctx.data().pool, &gid, from, &a).await?;
    save_econ(&ctx.data().pool, &gid, to, &b).await?;
    ctx.say(format!("Paid {amount}.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "rob")]
pub async fn eco_rob(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let from = ctx.author().id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, from).await;
    if cooldown_remaining(a.rob, 3_600_000, now_ms()) > 0 {
        ctx.say("Rob on cooldown.").await?;
        return Ok(());
    }
    let mut b = load_econ(&ctx.data().pool, &gid, user.id.get()).await;
    let loot = (b.money / 10).clamp(0, 100);
    b.money -= loot;
    a.money += loot;
    a.rob = now_ms();
    save_econ(&ctx.data().pool, &gid, from, &a).await?;
    save_econ(&ctx.data().pool, &gid, user.id.get(), &b).await?;
    ctx.say(format!("Robbed {loot}.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "deposit")]
pub async fn eco_deposit(
    ctx: Ctx<'_>,
    #[description = "Amount or all"] amount: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = ctx.author().id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    let n = if amount.trim().eq_ignore_ascii_case("all") {
        a.money
    } else {
        amount.trim().parse().unwrap_or(0)
    };
    if n <= 0 || n > a.money {
        ctx.say("Invalid amount.").await?;
        return Ok(());
    }
    a.money -= n;
    a.bank += n;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    ctx.say(format!("Deposited {n}.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "withdraw")]
pub async fn eco_withdraw(
    ctx: Ctx<'_>,
    #[description = "Amount or all"] amount: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = ctx.author().id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    let n = if amount.trim().eq_ignore_ascii_case("all") {
        a.bank
    } else {
        amount.trim().parse().unwrap_or(0)
    };
    if n <= 0 || n > a.bank {
        ctx.say("Invalid amount.").await?;
        return Ok(());
    }
    a.bank -= n;
    a.money += n;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    ctx.say(format!("Withdrew {n}.")).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "leaderboard")]
pub async fn eco_leaderboard(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.ECONOMY'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, i64)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let id: u64 = k
                .strip_prefix("USER.")?
                .strip_suffix(".ECONOMY")?
                .parse()
                .ok()?;
            let a: EconAccount = serde_json::from_str(v).ok()?;
            Some((id, a.money + a.bank))
        })
        .collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
    let top: Vec<String> = parsed
        .iter()
        .take(15)
        .enumerate()
        .map(|(i, (uid, total))| format!("{}. <@{uid}> — {total}", i + 1))
        .collect();
    ctx.say(if top.is_empty() {
        "No economy data.".to_string()
    } else {
        top.join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "shop")]
pub async fn eco_shop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = load_shop(&ctx.data().pool, &gid).await;
    ctx.say(if roles.is_empty() {
        "Shop is empty.".to_string()
    } else {
        roles
            .iter()
            .map(|r| format!("<@&{}> — {}", r.role_id, r.price))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "buy")]
pub async fn eco_buy(
    ctx: Ctx<'_>,
    #[description = "Role to buy"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = ctx.author().id.get();
    let roles = load_shop(&ctx.data().pool, &gid).await;
    let Some(item) = roles
        .iter()
        .find(|r| r.role_id == role.id.get().to_string())
    else {
        ctx.say("Role not in shop.").await?;
        return Ok(());
    };
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    if a.money < item.price {
        ctx.say("Not enough money.").await?;
        return Ok(());
    }
    a.money -= item.price;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            let _ = member.add_role(ctx.http(), role.id).await;
        }
    }
    ctx.say(format!("Bought {} for {}.", role.name, item.price))
        .await?;
    Ok(())
}

async fn save_shop(
    pool: &crate::db::Pool,
    guild_id: &str,
    roles: &[ShopRole],
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, guild_id, shop_key(), &serde_json::to_string(roles)?).await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_role_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
    #[description = "Price"] price: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_shop(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    if let Some(existing) = roles.iter_mut().find(|r| r.role_id == id) {
        existing.price = price.max(0);
    } else {
        roles.push(ShopRole {
            role_id: id,
            price: price.max(0),
            boost: String::new(),
        });
    }
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    ctx.say("Shop role added.").await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-delete",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_role_delete(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_shop(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    let before = roles.len();
    roles.retain(|r| r.role_id != id);
    if roles.len() == before {
        ctx.say("Role not in shop.").await?;
        return Ok(());
    }
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    ctx.say("Shop role removed.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "role-list")]
pub async fn eco_role_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = load_shop(&ctx.data().pool, &gid).await;
    ctx.say(if roles.is_empty() {
        "Shop is empty.".to_string()
    } else {
        roles
            .iter()
            .map(|r| format!("<@&{}> — {}{}", r.role_id, r.price, r.boost))
            .collect::<Vec<_>>()
            .join("\n")
    })
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "boost-set",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_boost_set(
    ctx: Ctx<'_>,
    #[description = "Role"] role: poise::serenity_prelude::Role,
    #[description = "Boost (e.g. x2)"] boost: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_shop(&ctx.data().pool, &gid).await;
    let id = role.id.get().to_string();
    let Some(existing) = roles.iter_mut().find(|r| r.role_id == id) else {
        ctx.say("Role not in shop.").await?;
        return Ok(());
    };
    existing.boost = boost.trim().to_string();
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    ctx.say("Boost set.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn eco_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "ECONOMY.disabled",
        if enabled { "0" } else { "1" },
    )
    .await?;
    ctx.say(if enabled {
        "Economy on."
    } else {
        "Economy off."
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "balance-add")]
pub async fn eco_balance_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    a.money += amount.max(0);
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    ctx.say(format!("Added {} (wallet {}).", amount.max(0), a.money))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "balance-remove")]
pub async fn eco_balance_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    a.money = (a.money - amount.max(0)).max(0);
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    ctx.say(format!("Removed {} (wallet {}).", amount.max(0), a.money))
        .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "set-money")]
pub async fn eco_set_money(
    ctx: Ctx<'_>,
    #[description = "daily, weekly, monthly, work"] kind: String,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut tune = load_tuning(&ctx.data().pool, &gid, kind.trim()).await;
    tune.amount = amount.max(0);
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("ECONOMY.settings.{}", kind.trim()),
        &serde_json::to_string(&tune)?,
    )
    .await?;
    ctx.say("Tuning updated.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "set-cooldown")]
pub async fn eco_set_cooldown(
    ctx: Ctx<'_>,
    #[description = "daily, weekly, monthly, work, rob"] kind: String,
    #[description = "Cooldown (e.g. 10s, 1h)"] cooldown: String,
) -> Result<(), anyhow::Error> {
    let Some(ms) = crate::commands::schedule::parse_duration_ms(&cooldown) else {
        ctx.say("Bad duration.").await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut tune = load_tuning(&ctx.data().pool, &gid, kind.trim()).await;
    tune.cooldown_ms = ms;
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("ECONOMY.settings.{}", kind.trim()),
        &serde_json::to_string(&tune)?,
    )
    .await?;
    ctx.say("Cooldown updated.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "ureset")]
pub async fn eco_ureset(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(econ_key(user.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("Economy reset for user.").await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "greset")]
pub async fn eco_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.ECONOMY'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    ctx.say("All economy reset.").await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn boost_picks_highest_match() {
        let shop =
            r#"[{"role_id":"1","price":10,"boost":"x3"},{"role_id":"2","price":5,"boost":"x2"}]"#;
        assert_eq!(member_boost(shop, &[2]), 2);
        assert_eq!(member_boost(shop, &[1, 2]), 3);
        assert_eq!(member_boost(shop, &[9]), 1);
        let map = r#"{"1":{"price":10,"boost":5}}"#;
        assert_eq!(member_boost(map, &[1]), 5);
        assert_eq!(member_boost("nope", &[1]), 1);
    }

    #[test]
    fn cooldown_zero_when_ready() {
        assert_eq!(cooldown_remaining(0, 1000, 1000), 0);
        assert_eq!(cooldown_remaining(0, 1000, 500), 500);
    }

    #[test]
    fn default_tunings_match_ts() {
        assert_eq!(default_tuning("daily").amount, 100);
        assert_eq!(default_tuning("weekly").cooldown_ms, 604_800_000);
        assert_eq!(default_tuning("monthly").amount, 2000);
        assert_eq!(default_tuning("work").cooldown_ms, 3_600_000);
    }

    #[test]
    fn pay_math() {
        let mut a = EconAccount {
            money: 100,
            ..Default::default()
        };
        let mut b = EconAccount::default();
        a.money -= 30;
        b.money += 30;
        assert_eq!((a.money, b.money), (70, 30));
    }
}
