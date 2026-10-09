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
        // Defaults mirror the TS `??` fallbacks in !daily/!weekly/
        // !monthly.ts (amounts) and their cooldown lookups.
        "daily" => ClaimTuning {
            amount: 500,
            cooldown_ms: 86_400_000,
        },
        "weekly" => ClaimTuning {
            amount: 1000,
            cooldown_ms: 604_800_000,
        },
        "monthly" => ClaimTuning {
            amount: 5000,
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

/// Economy log channel key. Mirrors getEconomyChannel
/// (`GUILD.SERVER_LOGS.economy`, silent when unset).
pub const ECONOMY_LOG_KEY: &str = "GUILD.SERVER_LOGS.economy";

/// Post one #f1c232 economy log embed. Mirrors sendEmbed in
/// economyLogs.ts (title/desc keys + {placeholder} replacements;
/// {coin} always resolves to the Coin app emoji).
pub async fn post_economy_log(
    ctx: &Ctx<'_>,
    title_key: &str,
    desc_key: &str,
    pairs: &[(&str, &str)],
) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude::{ChannelId, CreateEmbed, CreateMessage, Timestamp};
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let channel_id: Option<u64> = crate::db::kv_get(pool, &gid, ECONOMY_LOG_KEY)
        .await
        .and_then(|s| s.trim().parse().ok());
    let Some(channel_id) = channel_id else {
        return Ok(());
    };
    let mut desc = crate::commands::lang_for(ctx, desc_key, desc_key).await;
    for (k, v) in pairs {
        desc = desc.replace(&format!("{{{k}}}"), v);
    }
    if desc.contains("{coin}") {
        let coin = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Coin")
            .await
            .unwrap_or_else(|| "🪙".to_string());
        desc = desc.replace("{coin}", &coin);
    }
    let embed = CreateEmbed::default()
        .colour(0xF1C232)
        .title(crate::commands::lang_for(ctx, title_key, title_key).await)
        .description(desc)
        .timestamp(Timestamp::now());
    ChannelId::new(channel_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await?;
    Ok(())
}

/// User mention for economy log placeholders.
pub fn user_mention(user_id: u64) -> String {
    format!("<@{user_id}>")
}

/// Role mention for economy log placeholders.
pub fn role_mention(role_id: u64) -> String {
    format!("<@&{role_id}>")
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "balance",
    aliases("wallet", "coins", "bal")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let wallet = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Wallet")
        .await
        .unwrap_or_else(|| "💼".to_string());
    let who = user
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_else(|| ctx.author().to_string());
    let total = a.money + a.bank;
    ctx.say(
        crate::lang::get(&code, "balance_he_have_wallet")
            .map(|s| {
                s.replace("${user}", &who)
                    .replace("${bal}", &total.to_string())
                    .replace("${client.iHorizon_Emojis.Wallet}", &wallet)
            })
            .unwrap_or_else(|| format!("Wallet: {} | Bank: {}", a.money, a.bank)),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "pay")]
pub async fn eco_pay(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: i64,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if amount <= 0 {
        ctx.say(
            crate::lang::get(&code, "pay_negative_number_error")
                .unwrap_or_else(|| "Amount must be positive.".to_string()),
        )
        .await?;
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
        ctx.say(
            crate::lang::get(&code, "pay_dont_have_enought_to_give")
                .unwrap_or_else(|| "Not enough money.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut b = load_econ(&ctx.data().pool, &gid, to).await;
    a.money -= amount;
    b.money += amount;
    save_econ(&ctx.data().pool, &gid, from, &a).await?;
    save_econ(&ctx.data().pool, &gid, to, &b).await?;
    let author = user_mention(from);
    let target = user_mention(to);
    let amt = amount.to_string();
    post_economy_log(
        &ctx,
        "economy_logs_pay_title",
        "economy_logs_pay_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    let payer = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    ctx.say(
        crate::lang::get(&code, "pay_command_work")
            .map(|s| {
                s.replace("${interaction.user.username}", &payer)
                    .replace("${user.user.username}", &user.tag())
                    .replace("${amount}", &amount.to_string())
            })
            .unwrap_or_else(|| format!("Paid {amount}.")),
    )
    .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let remain = cooldown_remaining(a.rob, 3_600_000, now_ms());
    if remain > 0 {
        let time = crate::funcs::beautiful_ms(remain as f64);
        let author = ctx.author().id.get().to_string();
        ctx.say(
            crate::lang::get(&code, "work_cooldown_error")
                .map(|s| {
                    s.replace("${interaction.user.id}", &author)
                        .replace("${time}", &time)
                })
                .unwrap_or_else(|| "Rob on cooldown.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let mut b = load_econ(&ctx.data().pool, &gid, user.id.get()).await;
    let loot = (b.money / 10).clamp(0, 100);
    b.money -= loot;
    a.money += loot;
    a.rob = now_ms();
    save_econ(&ctx.data().pool, &gid, from, &a).await?;
    save_econ(&ctx.data().pool, &gid, user.id.get(), &b).await?;
    let author = user_mention(from);
    let target = user_mention(user.id.get());
    let amt = loot.to_string();
    post_economy_log(
        &ctx,
        "economy_logs_rob_title",
        "economy_logs_rob_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "rob_embed_description")
            .map(|s| {
                s.replace("${interaction.user.id}", &from.to_string())
                    .replace("${user.id}", &user.id.get().to_string())
                    .replace("${random}", &loot.to_string())
            })
            .unwrap_or_else(|| format!("Robbed {loot}.")),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "deposit", aliases("dep"))]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let n = if amount.trim().eq_ignore_ascii_case("all") {
        a.money
    } else {
        amount.trim().parse().unwrap_or(0)
    };
    if n <= 0 || n > a.money {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "deposit_cannot_abuse")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Invalid amount.".to_string()),
        )
        .await?;
        return Ok(());
    }
    a.money -= n;
    a.bank += n;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    let author = user_mention(uid);
    let money = n.to_string();
    post_economy_log(
        &ctx,
        "economy_logs_deposit_title",
        "economy_logs_deposit_desc",
        &[("author", &author), ("money", &money)],
    )
    .await?;
    let coin = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Coin")
        .await
        .unwrap_or_else(|| "🪙".to_string());
    ctx.say(
        crate::lang::get(&code, "deposit_embed_desc")
            .map(|s| {
                s.replace("${interaction.user}", &author)
                    .replace("${toDeposit}", &money)
                    .replace("${client.iHorizon_Emojis.Coin}", &coin)
            })
            .unwrap_or_else(|| format!("Deposited {n}.")),
    )
    .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let n = if amount.trim().eq_ignore_ascii_case("all") {
        a.bank
    } else {
        amount.trim().parse().unwrap_or(0)
    };
    if n <= 0 || n > a.bank {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            crate::lang::get(&code, "withdraw_cannot_abuse")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Invalid amount.".to_string()),
        )
        .await?;
        return Ok(());
    }
    a.bank -= n;
    a.money += n;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    let author = user_mention(uid);
    let money = n.to_string();
    post_economy_log(
        &ctx,
        "economy_logs_withdraw_title",
        "economy_logs_withdraw_desc",
        &[("author", &author), ("money", &money)],
    )
    .await?;
    let coin = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Coin")
        .await
        .unwrap_or_else(|| "🪙".to_string());
    ctx.say(
        crate::lang::get(&code, "withdraw_embed_desc")
            .map(|s| {
                s.replace("${interaction.user}", &author)
                    .replace("${toWithdraw}", &money)
                    .replace("${client.iHorizon_Emojis.Coin}", &coin)
            })
            .unwrap_or_else(|| format!("Withdrew {n}.")),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("eclb", "eco-lb", "economy-lb")
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let top: Vec<String> = parsed
        .iter()
        .take(15)
        .enumerate()
        .map(|(i, (uid, total))| format!("{}. <@{uid}> — {total}", i + 1))
        .collect();
    ctx.say(if top.is_empty() {
        crate::lang::get(&code, "perm_list_no_user")
            .unwrap_or_else(|| "No economy data.".to_string())
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if roles.is_empty() {
        crate::lang::get(&code, "economy_shop_not_set")
            .unwrap_or_else(|| "Shop is empty.".to_string())
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(item) = roles
        .iter()
        .find(|r| r.role_id == role.id.get().to_string())
    else {
        ctx.say(
            crate::lang::get(&code, "economy_shop_not_available")
                .unwrap_or_else(|| "Role not in shop.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    if a.money < item.price {
        ctx.say(
            crate::lang::get(&code, "economy_shop_not_enough_money")
                .unwrap_or_else(|| "Not enough money.".to_string()),
        )
        .await?;
        return Ok(());
    }
    a.money -= item.price;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            let _ = member.add_role(ctx.http(), role.id).await;
        }
    }
    ctx.say(
        crate::lang::get(&code, "economy_shop_role_purchased")
            .map(|s| {
                s.replace("{roleName}", &role.name)
                    .replace("${role.price}", &item.price.to_string())
            })
            .unwrap_or_else(|| format!("Bought {} for {}.", role.name, item.price)),
    )
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
    default_member_permissions = "MANAGE_GUILD"
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
    // Warn before selling a role with dangerous permissions. Mirrors
    // the roleDangerousPermissions promptYesOrNo gate in economy/!add.ts
    // (abort -> economy_role_add_canceled).
    let perm_keys: [(&str, &str); 10] = [
        ("setjoinroles_var_perm_admin", "Administrator"),
        ("setjoinroles_var_perm_manage_guild", "Manage Server"),
        ("setjoinroles_var_perm_manage_role", "Manage Roles"),
        ("setjoinroles_var_perm_use_mention", "Mention Everyone"),
        ("setjoinroles_var_perm_ban_members", "Ban Members"),
        ("setjoinroles_var_perm_kick_members", "Kick Members"),
        ("setjoinroles_var_perm_manage_webhooks", "Manage Webhooks"),
        ("setjoinroles_var_perm_manage_channels", "Manage Channels"),
        (
            "setjoinroles_var_perm_manage_expression",
            "Manage Expressions",
        ),
        (
            "setjoinroles_var_perm_view_monetization_analytics",
            "View Monetization Analytics",
        ),
    ];
    let mut owned = Vec::with_capacity(10);
    for (key, fallback) in perm_keys {
        owned.push(crate::commands::lang_for(&ctx, key, fallback).await);
    }
    let names: [&str; 10] = owned
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>()
        .try_into()
        .unwrap_or(["?"; 10]);
    let dangerous = crate::funcs::dangerous_role_perms(role.permissions.bits(), names);
    if !dangerous.is_empty() {
        let listed = dangerous
            .iter()
            .map(|n| format!("`{n}`"))
            .collect::<Vec<_>>()
            .join(", ");
        let content = crate::commands::lang_for(
            &ctx,
            "economy_role_add_prompt_dangerous",
            "Are you sure? Dangerous permissions: ${stringDangerousPermissions}",
        )
        .await
        .replace("${stringDangerousPermissions}", &listed);
        let yes = crate::commands::lang_for(&ctx, "var_yes", "Yes").await;
        let no = crate::commands::lang_for(&ctx, "var_no", "No").await;
        if !crate::commands::prompt_yes_or_no(&ctx, content, yes, no, true).await? {
            ctx.say(
                crate::commands::lang_for(
                    &ctx,
                    "economy_role_add_canceled",
                    "Role not added to the shop.",
                )
                .await,
            )
            .await?;
            return Ok(());
        }
    }
    if roles.len() >= 20 && !roles.iter().any(|r| r.role_id == id) {
        ctx.say(
            crate::commands::lang_for(
                &ctx,
                "economy_role_add_max_20_roles",
                "You can only have up to 20 buyable roles.",
            )
            .await,
        )
        .await?;
        return Ok(());
    }
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "msg_shop_role_added")
            .unwrap_or_else(|| "Shop role added.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    let price_s = price.max(0).to_string();
    post_economy_log(
        &ctx,
        "economy_logs_role_add_title",
        "economy_logs_role_add_desc",
        &[("author", &author), ("role", &role_m), ("amount", &price_s)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-delete",
    default_member_permissions = "MANAGE_GUILD"
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let id = role.id.get().to_string();
    let before = roles.len();
    roles.retain(|r| r.role_id != id);
    if roles.len() == before {
        ctx.say(
            crate::lang::get(&code, "economy_role_add_no_role")
                .unwrap_or_else(|| "Role not in shop.".to_string()),
        )
        .await?;
        return Ok(());
    }
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    ctx.say(
        crate::lang::get(&code, "msg_shop_role_removed")
            .unwrap_or_else(|| "Shop role removed.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    post_economy_log(
        &ctx,
        "economy_logs_role_remove_title",
        "economy_logs_role_remove_desc",
        &[("author", &author), ("role", &role_m)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-list",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn eco_role_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = load_shop(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if roles.is_empty() {
        crate::lang::get(&code, "economy_role_list_no_buyable_roles")
            .unwrap_or_else(|| "Shop is empty.".to_string())
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
    default_member_permissions = "MANAGE_GUILD"
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let id = role.id.get().to_string();
    let Some(existing) = roles.iter_mut().find(|r| r.role_id == id) else {
        ctx.say(
            crate::lang::get(&code, "economy_boost_role_not_found")
                .unwrap_or_else(|| "Role not in shop.".to_string()),
        )
        .await?;
        return Ok(());
    };
    existing.boost = boost.trim().to_string();
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    ctx.say(crate::lang::get(&code, "msg_boost_set").unwrap_or_else(|| "Boost set.".to_string()))
        .await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    let amt = boost.trim().trim_start_matches('x').to_string();
    post_economy_log(
        &ctx,
        "economy_logs_boost_role_title",
        "economy_logs_boost_role_desc",
        &[("author", &author), ("role", &role_m), ("amount", &amt)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    ctx.say(if enabled {
        crate::lang::get(&code, "economy_disable_set_enable")
            .map(|s| s.replace("${interaction.user.id}", &author_id))
            .unwrap_or_else(|| "Economy on.".to_string())
    } else {
        crate::lang::get(&code, "economy_disable_set_disable")
            .map(|s| s.replace("${interaction.user.id}", &author_id))
            .unwrap_or_else(|| "Economy off.".to_string())
    })
    .await?;
    let author = user_mention(ctx.author().id.get());
    let state = crate::commands::lang_for(
        &ctx,
        if enabled { "var_on" } else { "var_off" },
        if enabled { "enabled" } else { "disabled" },
    )
    .await;
    post_economy_log(
        &ctx,
        "economy_logs_config_title",
        "economy_logs_config_desc",
        &[("author", &author), ("state", &state)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "balance-add",
    default_member_permissions = "ADMINISTRATOR"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "addmoney_command_work")
            .map(|s| {
                s.replace("${user.user.id}", &uid.to_string())
                    .replace("${amount.value}", &amount.max(0).to_string())
            })
            .unwrap_or_else(|| format!("Added {} (wallet {}).", amount.max(0), a.money)),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    let target = user_mention(uid);
    let amt = amount.max(0).to_string();
    post_economy_log(
        &ctx,
        "economy_logs_add_money_title",
        "economy_logs_add_money_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "balance-remove",
    default_member_permissions = "ADMINISTRATOR"
)]
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
    let author = user_mention(ctx.author().id.get());
    let target = user_mention(uid);
    let amt = amount.max(0).to_string();
    post_economy_log(
        &ctx,
        "economy_logs_remove_money_title",
        "economy_logs_remove_money_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-money",
    default_member_permissions = "ADMINISTRATOR"
)]
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "economy_manage_rewards_set_money")
            .map(|s| {
                s.replace("${type}", kind.trim())
                    .replace("${money}", &amount.max(0).to_string())
            })
            .unwrap_or_else(|| "Tuning updated.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    let money = amount.max(0).to_string();
    let kind_s = kind.trim().to_string();
    post_economy_log(
        &ctx,
        "economy_logs_set_money_title",
        "economy_logs_set_money_desc",
        &[("author", &author), ("money", &money), ("type", &kind_s)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-cooldown",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_set_cooldown(
    ctx: Ctx<'_>,
    #[description = "daily, weekly, monthly, work, rob"] kind: String,
    #[description = "Cooldown (e.g. 10s, 1h)"] cooldown: String,
) -> Result<(), anyhow::Error> {
    let Some(ms) = crate::commands::schedule::parse_duration_ms(&cooldown) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "economy_manage_rewards_cooldown_invalid_time")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "economy_manage_rewards_cooldown_command_ok")
            .map(|s| {
                s.replace("${type}", kind.trim())
                    .replace("${stime}", cooldown.trim())
            })
            .unwrap_or_else(|| "Cooldown updated.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    let kind_s = kind.trim().to_string();
    let time_s = cooldown.trim().to_string();
    post_economy_log(
        &ctx,
        "economy_logs_set_cooldown_title",
        "economy_logs_set_cooldown_desc",
        &[("author", &author), ("type", &kind_s), ("time", &time_s)],
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "ureset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_ureset(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_ueconomy_are_you_sure",
        "Delete all economy data for this user? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
        .bind(&gid)
        .bind(econ_key(user.id.get()))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Economy reset for user.".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_geconomy_are_you_sure",
        "Delete all economy data for ALL members? This is irreversible.",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.ECONOMY'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "All economy reset.".to_string()),
    )
    .await?;
    Ok(())
}

/// Whether the economy module is off. Mirrors the
/// `ECONOMY.disabled === true` guard (accepts the Rust "1" shape too).
pub async fn economy_disabled(pool: &crate::db::Pool, guild_id: &str) -> bool {
    matches!(
        crate::db::kv_get(pool, guild_id, "ECONOMY.disabled").await,
        Some(v) if v == "1" || v.eq_ignore_ascii_case("true")
    )
}

/// Invoker role ids for the shop boost multiplier.
pub async fn invoker_roles(ctx: &Ctx<'_>) -> Vec<u64> {
    ctx.author_member()
        .await
        .map(|m| m.roles.iter().map(|r| r.get()).collect())
        .unwrap_or_default()
}

/// Text keys for one timed claim. Keeps claim_inner's arity down.
pub struct ClaimText<'a> {
    pub kind: &'a str,
    pub title_key: &'a str,
    pub desc_key: &'a str,
    pub fields_key: &'a str,
    pub cooldown_key: &'a str,
}

/// Shared timed-claim flow. Mirrors !daily/!weekly/!monthly.ts
/// (tuning + boost amount, cooldown error, reward embed, money add,
/// timestamp store). `work` passes its random amount via
/// `amount_override`.
pub async fn claim_inner(
    ctx: &Ctx<'_>,
    text_keys: &ClaimText<'_>,
    amount_override: Option<i64>,
    ephemeral_cooldown: bool,
) -> Result<(), anyhow::Error> {
    let kind = text_keys.kind;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    if economy_disabled(pool, &gid).await {
        ctx.say(
            crate::commands::lang_for(ctx, "economy_disable_msg", "Economy is disabled.")
                .await
                .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
        )
        .await?;
        return Ok(());
    }
    let tune = load_tuning(pool, &gid, kind).await;
    let uid = ctx.author().id.get();
    let mut account = load_econ(pool, &gid, uid).await;
    let last = match kind {
        "daily" => account.daily,
        "weekly" => account.weekly,
        "monthly" => account.monthly,
        _ => account.work,
    };
    let now = now_ms();
    if last != 0 && tune.cooldown_ms - (now - last) > 0 {
        let time = crate::funcs::beautiful_ms((tune.cooldown_ms - (now - last)) as f64);
        let text = crate::commands::lang_for(ctx, text_keys.cooldown_key, "Wait ${time}.")
            .await
            .replace("${time}", &time);
        if ephemeral_cooldown {
            ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
                .await?;
        } else {
            ctx.say(text).await?;
        }
        return Ok(());
    }
    let shop_json = crate::db::kv_get(pool, &gid, shop_key())
        .await
        .unwrap_or_else(|| "[]".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(ctx).await);
    let amount = amount_override.unwrap_or(tune.amount * boost);
    account.money += amount;
    match kind {
        "daily" => account.daily = now,
        "weekly" => account.weekly = now,
        "monthly" => account.monthly = now,
        _ => account.work = now,
    }
    save_econ(pool, &gid, uid, &account).await?;
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::commands::lang_for(ctx, text_keys.title_key, kind).await,
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xA4CB80)
        .description(crate::commands::lang_for(ctx, text_keys.desc_key, "").await)
        .field(
            crate::commands::lang_for(ctx, text_keys.fields_key, "Collected").await,
            amount.to_string(),
            false,
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Claim daily reward. Mirrors economy !daily.ts.
#[poise::command(slash_command, prefix_command, category = "economy", rename = "daily")]
pub async fn eco_daily(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    claim_inner(
        &ctx,
        &ClaimText {
            kind: "daily",
            title_key: "daily_embed_title",
            desc_key: "daily_embed_description",
            fields_key: "daily_embed_fields",
            cooldown_key: "daily_cooldown_error",
        },
        None,
        false,
    )
    .await
}

/// Claim weekly reward. Mirrors economy !weekly.ts.
#[poise::command(slash_command, prefix_command, category = "economy", rename = "weekly")]
pub async fn eco_weekly(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    claim_inner(
        &ctx,
        &ClaimText {
            kind: "weekly",
            title_key: "weekly_embed_title",
            desc_key: "weekly_embed_description",
            fields_key: "weekly_embed_fields",
            cooldown_key: "weekly_cooldown_error",
        },
        None,
        false,
    )
    .await
}

/// Claim monthly reward. Mirrors economy !monthly.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "economy",
    rename = "monthly"
)]
pub async fn eco_monthly(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    claim_inner(
        &ctx,
        &ClaimText {
            kind: "monthly",
            title_key: "monthly_embed_title",
            desc_key: "monthly_embed_description",
            fields_key: "monthly_embed_fields",
            cooldown_key: "monthly_cooldown_error",
        },
        None,
        false,
    )
    .await
}

/// Work for a random payout.
// Mirrors economy !work.ts (1..=1024 times boost, ephemeral
// cooldown reply, gold embed).
#[poise::command(slash_command, prefix_command, category = "economy", rename = "work")]
pub async fn eco_work(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use rand::Rng;
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    if economy_disabled(pool, &gid).await {
        ctx.say(
            crate::commands::lang_for(&ctx, "economy_disable_msg", "Economy is disabled.")
                .await
                .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
        )
        .await?;
        return Ok(());
    }
    let tune = load_tuning(pool, &gid, "work").await;
    let uid = ctx.author().id.get();
    let mut account = load_econ(pool, &gid, uid).await;
    let now = now_ms();
    if account.work != 0 && tune.cooldown_ms - (now - account.work) > 0 {
        let time = crate::funcs::beautiful_ms((tune.cooldown_ms - (now - account.work)) as f64);
        let text = crate::commands::lang_for(
            &ctx,
            "economy_cooldown_error",
            "Wait ${time} before you can execute this command again!",
        )
        .await
        .replace("${time}", &time);
        ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
            .await?;
        return Ok(());
    }
    let shop_json = crate::db::kv_get(pool, &gid, shop_key())
        .await
        .unwrap_or_else(|| "[]".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let amount = rand::thread_rng().gen_range(1..=1024) * boost;
    account.money += amount;
    account.work = now;
    save_econ(pool, &gid, uid, &account).await?;
    let display = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::commands::lang_for(&ctx, "work_embed_author", "It paid off!")
                    .await
                    .replace("${interaction.user.username}", &display),
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xF1D488)
        .description(
            crate::commands::lang_for(&ctx, "work_embed_description", "Earned ${amount}$!")
                .await
                .replace("${interaction.user.username}", &display)
                .replace("${amount}", &amount.to_string()),
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
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
        // Defaults from the `??` fallbacks in
        // !daily/!weekly/!monthly/!work.ts.
        assert_eq!(default_tuning("daily").amount, 500);
        assert_eq!(default_tuning("daily").cooldown_ms, 86_400_000);
        assert_eq!(default_tuning("weekly").amount, 1000);
        assert_eq!(default_tuning("weekly").cooldown_ms, 604_800_000);
        assert_eq!(default_tuning("monthly").amount, 5000);
        assert_eq!(default_tuning("monthly").cooldown_ms, 2_592_000_000);
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
