use crate::bot::Ctx;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Tolerant i64 leaf/object field. The shared live DB is written by the TS
/// side with JS numbers (floats possible via getNumber inputs), so a strict
/// i64 would fail the whole account parse and reset it to default.
fn de_i64<'de, D>(d: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    struct V;
    impl<'de> Visitor<'de> for V {
        type Value = i64;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("an integer or float")
        }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<i64, E> {
            Ok(v)
        }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<i64, E> {
            Ok(v as i64)
        }
        fn visit_f64<E: de::Error>(self, v: f64) -> Result<i64, E> {
            Ok(v as i64)
        }
        fn visit_none<E: de::Error>(self) -> Result<i64, E> {
            Ok(0)
        }
        fn visit_unit<E: de::Error>(self) -> Result<i64, E> {
            Ok(0)
        }
        fn visit_some<D2>(self, d: D2) -> Result<i64, D2::Error>
        where
            D2: serde::Deserializer<'de>,
        {
            d.deserialize_any(V)
        }
    }
    d.deserialize_any(V)
}

/// Tolerant f64: JSON numbers, numeric strings, null/missing.
fn de_f64<'de, D>(d: D) -> Result<f64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    struct V;
    impl<'de> Visitor<'de> for V {
        type Value = f64;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("a number")
        }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<f64, E> {
            Ok(v as f64)
        }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<f64, E> {
            Ok(v as f64)
        }
        fn visit_f64<E: de::Error>(self, v: f64) -> Result<f64, E> {
            Ok(v)
        }
        fn visit_str<E: de::Error>(self, v: &str) -> Result<f64, E> {
            v.trim()
                .parse::<f64>()
                .map_err(|_| E::custom("not a number"))
        }
        fn visit_none<E: de::Error>(self) -> Result<f64, E> {
            Ok(0.0)
        }
        fn visit_unit<E: de::Error>(self) -> Result<f64, E> {
            Ok(0.0)
        }
        fn visit_some<D2>(self, d: D2) -> Result<f64, D2::Error>
        where
            D2: serde::Deserializer<'de>,
        {
            d.deserialize_any(V)
        }
    }
    d.deserialize_any(V)
}

/// Tolerant optional boost: numbers, "xN"/numeric legacy strings, null.
fn de_opt_f64<'de, D>(d: D) -> Result<Option<f64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    struct V;
    impl<'de> Visitor<'de> for V {
        type Value = Option<f64>;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("a number or null")
        }
        fn visit_none<E: de::Error>(self) -> Result<Option<f64>, E> {
            Ok(None)
        }
        fn visit_unit<E: de::Error>(self) -> Result<Option<f64>, E> {
            Ok(None)
        }
        fn visit_some<D2>(self, d: D2) -> Result<Option<f64>, D2::Error>
        where
            D2: serde::Deserializer<'de>,
        {
            d.deserialize_any(V)
        }
        fn visit_i64<E: de::Error>(self, v: i64) -> Result<Option<f64>, E> {
            Ok(Some(v as f64))
        }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<Option<f64>, E> {
            Ok(Some(v as f64))
        }
        fn visit_f64<E: de::Error>(self, v: f64) -> Result<Option<f64>, E> {
            Ok(Some(v))
        }
        fn visit_str<E: de::Error>(self, v: &str) -> Result<Option<f64>, E> {
            let t = v.trim().trim_start_matches('x').trim();
            if t.is_empty() {
                return Ok(None);
            }
            t.parse::<f64>()
                .map(Some)
                .map_err(|_| E::custom("not a boost"))
        }
    }
    d.deserialize_option(V)
}

fn de_owned_roles<'de, D>(d: D) -> Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Visitor};
    struct V;
    impl<'de> Visitor<'de> for V {
        type Value = Vec<String>;
        fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
            f.write_str("an array of role ids")
        }
        fn visit_none<E: de::Error>(self) -> Result<Vec<String>, E> {
            Ok(Vec::new())
        }
        fn visit_unit<E: de::Error>(self) -> Result<Vec<String>, E> {
            Ok(Vec::new())
        }
        fn visit_some<D2>(self, d: D2) -> Result<Vec<String>, D2::Error>
        where
            D2: serde::Deserializer<'de>,
        {
            d.deserialize_any(V)
        }
        fn visit_seq<A: serde::de::SeqAccess<'de>>(
            self,
            mut seq: A,
        ) -> Result<Vec<String>, A::Error> {
            let mut out = Vec::new();
            while let Some(v) = seq.next_element::<serde_json::Value>()? {
                if let Some(s) = v.as_str() {
                    out.push(s.to_string());
                } else if let Some(n) = v.as_u64() {
                    out.push(n.to_string());
                } else if let Some(n) = v.as_i64() {
                    out.push(n.to_string());
                }
            }
            Ok(out)
        }
    }
    d.deserialize_option(V)
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EconAccount {
    #[serde(default, deserialize_with = "de_i64")]
    pub money: i64,
    #[serde(default, deserialize_with = "de_i64")]
    pub bank: i64,
    #[serde(default, deserialize_with = "de_i64")]
    pub daily: i64,
    #[serde(default, deserialize_with = "de_i64")]
    pub weekly: i64,
    #[serde(default, deserialize_with = "de_i64")]
    pub monthly: i64,
    #[serde(default, deserialize_with = "de_i64")]
    pub work: i64,
    #[serde(default, deserialize_with = "de_i64")]
    pub rob: i64,
    /// Mirrors `ownedRoles: string[]` on EconomyUserSchema
    /// (src/Interaction/HybridCommands/economy/!shop.ts).
    #[serde(default, rename = "ownedRoles", deserialize_with = "de_owned_roles")]
    pub owned_roles: Vec<String>,
}

/// Raw float add on the integer wallet, truncating toward zero.
/// Mirrors `db.add`/`db.sub` with a float amount over an int balance.
pub fn add_money(a: &mut EconAccount, delta: f64) {
    a.money = (a.money as f64 + delta) as i64;
}

/// Per-guild claim tuning. Mirrors the
/// `ECONOMY.settings.<kind>.amount` / `.cooldown` leaf keys.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimTuning {
    pub amount: f64,
    pub cooldown_ms: i64,
}

pub fn default_tuning(kind: &str) -> ClaimTuning {
    match kind {
        // Defaults mirror the TS `??` fallbacks in !daily/!weekly/
        // !monthly.ts (amounts) and their cooldown lookups.
        "daily" => ClaimTuning {
            amount: 500.0,
            cooldown_ms: 86_400_000,
        },
        "weekly" => ClaimTuning {
            amount: 1000.0,
            cooldown_ms: 604_800_000,
        },
        "monthly" => ClaimTuning {
            amount: 5000.0,
            cooldown_ms: 2_592_000_000,
        },
        "work" => ClaimTuning {
            amount: 50.0,
            cooldown_ms: 3_600_000,
        },
        // TS `?? 3000000` fallback in economy/!rob.ts
        // (ECONOMY.settings.rob.cooldown, not the work default).
        "rob" => ClaimTuning {
            amount: 0.0,
            cooldown_ms: 3_000_000,
        },
        _ => ClaimTuning {
            amount: 0.0,
            cooldown_ms: 0,
        },
    }
}

/// Parse a bare JSON number (or quoted number) from a leaf row.
fn parse_leaf_num(s: &str) -> Option<f64> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    if let Ok(v) = serde_json::from_str::<f64>(t) {
        return Some(v);
    }
    t.trim_matches('"').trim().parse::<f64>().ok()
}

async fn leaf_num(pool: &crate::db::Pool, guild_id: &str, key: &str) -> Option<f64> {
    crate::db::kv_get(pool, guild_id, key)
        .await
        .and_then(|s| parse_leaf_num(&s))
}

/// Legacy-blob fallback for servers tuned by the older Rust shape
/// (`ECONOMY.settings.<kind>` holding `{amount, cooldown_ms}`).
fn blob_tuning(raw: &str, kind: &str) -> Option<ClaimTuning> {
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    let o = v.as_object()?;
    let amount = o
        .get("amount")
        .and_then(|n| n.as_f64().or_else(|| n.as_i64().map(|i| i as f64)))
        .unwrap_or_else(|| default_tuning(kind).amount);
    let cooldown = o
        .get("cooldown_ms")
        .or_else(|| o.get("cooldown"))
        .and_then(|n| n.as_f64().or_else(|| n.as_i64().map(|i| i as f64)))
        .map(|f| f as i64)
        .unwrap_or_else(|| default_tuning(kind).cooldown_ms);
    Some(ClaimTuning {
        amount,
        cooldown_ms: cooldown,
    })
}

pub async fn load_tuning(pool: &crate::db::Pool, guild_id: &str, kind: &str) -> ClaimTuning {
    let def = default_tuning(kind);
    // Leaf-first, then legacy blob, then default (a stored 0 stays 0,
    // mirroring the TS `??` fallback which only applies to null).
    let legacy = crate::db::kv_get(pool, guild_id, &format!("ECONOMY.settings.{kind}"))
        .await
        .and_then(|s| blob_tuning(&s, kind));
    let amount = leaf_num(pool, guild_id, &format!("ECONOMY.settings.{kind}.amount"))
        .await
        .or_else(|| legacy.as_ref().map(|t| t.amount))
        .unwrap_or(def.amount);
    let cooldown_ms = leaf_num(pool, guild_id, &format!("ECONOMY.settings.{kind}.cooldown"))
        .await
        .map(|f| f as i64)
        .or_else(|| legacy.map(|t| t.cooldown_ms))
        .unwrap_or(def.cooldown_ms);
    ClaimTuning {
        amount,
        cooldown_ms,
    }
}

pub fn econ_key(user_id: u64) -> String {
    format!("USER.{user_id}.ECONOMY")
}

/// One shop entry. Mirrors `EconomyRole { price: number; boost?: number }`
/// (types/database_structure.d.ts); stored in the `ECONOMY.buyableRoles`
/// object map keyed by role id.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct ShopEntry {
    #[serde(default, deserialize_with = "de_f64")]
    pub price: f64,
    #[serde(default, deserialize_with = "de_opt_f64")]
    pub boost: Option<f64>,
}

/// Integer-valued floats serialize as integers so the shared-DB shape
/// matches what TS writes (`2`, not `2.0`).
fn num_json(v: f64) -> serde_json::Value {
    if v.is_finite() && v.fract() == 0.0 && v >= i64::MIN as f64 && v <= i64::MAX as f64 {
        serde_json::Value::from(v as i64)
    } else if v.is_finite() {
        serde_json::Value::from(v)
    } else {
        serde_json::Value::Null
    }
}

impl Serialize for ShopEntry {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut m = s.serialize_map(Some(if self.boost.is_some() { 2 } else { 1 }))?;
        m.serialize_entry("price", &num_json(self.price))?;
        if let Some(b) = self.boost {
            m.serialize_entry("boost", &num_json(b))?;
        }
        m.end()
    }
}

pub type ShopMap = BTreeMap<String, ShopEntry>;

pub fn shop_key() -> &'static str {
    "ECONOMY.buyableRoles"
}

/// Load the shop object map. Accepts the TS map shape plus the legacy
/// Rust Vec shape (`[{role_id, price, boost}]`) for old rows.
pub async fn load_shop(pool: &crate::db::Pool, guild_id: &str) -> ShopMap {
    let Some(raw) = crate::db::kv_get(pool, guild_id, shop_key()).await else {
        return BTreeMap::new();
    };
    if let Ok(map) = serde_json::from_str::<ShopMap>(&raw) {
        return map;
    }
    // Legacy Vec shape fallback.
    fn entry_nums(entry: &serde_json::Value) -> (f64, Option<f64>) {
        let price = entry
            .get("price")
            .and_then(|p| p.as_f64().or_else(|| p.as_i64().map(|i| i as f64)))
            .unwrap_or(0.0);
        let boost = entry.get("boost").and_then(|b| {
            b.as_f64().or_else(|| {
                b.as_i64().map(|i| i as f64).or_else(|| {
                    b.as_str().and_then(|s| {
                        let t = s.trim().trim_start_matches('x').trim();
                        if t.is_empty() {
                            None
                        } else {
                            t.parse::<f64>().ok()
                        }
                    })
                })
            })
        });
        (price, boost)
    }
    fn entry_id(entry: &serde_json::Value) -> Option<String> {
        entry
            .get("role_id")
            .and_then(|r| {
                r.as_str().map(|s| s.to_string()).or_else(|| {
                    r.as_u64()
                        .map(|n| n.to_string())
                        .or_else(|| r.as_i64().map(|n| n.to_string()))
                })
            })
            .filter(|s| !s.is_empty())
    }
    let mut out = BTreeMap::new();
    if let Ok(vec) = serde_json::from_str::<Vec<serde_json::Value>>(&raw) {
        for entry in vec {
            if let Some(role_id) = entry_id(&entry) {
                let (price, boost) = entry_nums(&entry);
                out.insert(role_id, ShopEntry { price, boost });
            }
        }
    }
    out
}

async fn save_shop(pool: &crate::db::Pool, guild_id: &str, roles: &ShopMap) -> anyhow::Result<()> {
    crate::db::kv_set(pool, guild_id, shop_key(), &serde_json::to_string(roles)?).await
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
/// economyHelper.getMemberBoost (highest matching numeric boost,
/// missing counts as 0, result falls back to 1).
pub fn member_boost(shop_json: &str, member_roles: &[u64]) -> i64 {
    let v: serde_json::Value = match serde_json::from_str(shop_json) {
        Ok(v) => v,
        Err(_) => return 1,
    };
    fn num(v: &serde_json::Value) -> Option<f64> {
        if let Some(n) = v.as_f64() {
            return Some(n);
        }
        if let Some(n) = v.as_i64() {
            return Some(n as f64);
        }
        v.as_str().and_then(|s| {
            let t = s.trim().trim_start_matches('x').trim();
            if t.is_empty() {
                None
            } else {
                t.parse::<f64>().ok()
            }
        })
    }
    let mut best = 0.0f64;
    let check = |role_id: &str, boost: Option<f64>, member_roles: &[u64], best: &mut f64| {
        if let Ok(n) = role_id.parse::<u64>() {
            if member_roles.contains(&n) {
                let b = boost.unwrap_or(0.0);
                if b > *best {
                    *best = b;
                }
            }
        }
    };
    match &v {
        serde_json::Value::Object(map) => {
            for (role_id, data) in map {
                let boost = data.get("boost").and_then(num);
                check(role_id, boost, member_roles, &mut best);
            }
        }
        // Legacy Rust Vec shape.
        serde_json::Value::Array(arr) => {
            for entry in arr {
                let role_id = entry
                    .get("role_id")
                    .and_then(|r| {
                        r.as_str().map(|s| s.to_string()).or_else(|| {
                            r.as_u64()
                                .map(|n| n.to_string())
                                .or_else(|| r.as_i64().map(|n| n.to_string()))
                        })
                    })
                    .unwrap_or_default();
                let boost = entry.get("boost").and_then(num);
                check(&role_id, boost, member_roles, &mut best);
            }
        }
        _ => {}
    }
    (best as i64).max(1)
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

/// JS-like number display: integral floats render without decimals
/// (`(10).toString() === "10"`), others render as-is.
pub fn fmt_num(v: f64) -> String {
    if v.is_finite() && v.fract() == 0.0 && v >= i64::MIN as f64 && v <= i64::MAX as f64 {
        (v as i64).to_string()
    } else {
        v.to_string()
    }
}

fn commas(n: i64) -> String {
    let neg = n < 0;
    let mut digits: Vec<char> = n.abs().to_string().chars().collect();
    let mut out = String::new();
    while digits.len() > 3 {
        let tail: String = digits.split_off(digits.len() - 3).into_iter().collect();
        out = format!(",{tail}{out}");
    }
    let head: String = digits.into_iter().collect();
    out = format!("{head}{out}");
    if neg {
        format!("-{out}")
    } else {
        out
    }
}

/// Mirrors numberBeautifuer formatNumber (T/B/M/K + toLocaleString).
pub fn format_num(n: f64) -> String {
    let neg = n < 0.0;
    let a = n.abs();
    let sign = if neg { "-" } else { "" };
    if a >= 1_000_000_000_000.0 {
        return format!("{sign}{:.1}T", a / 1_000_000_000_000.0);
    }
    if a >= 1_000_000_000.0 {
        return format!("{sign}{:.1}B", a / 1_000_000_000.0);
    }
    if a >= 1_000_000.0 {
        return format!("{sign}{:.1}M", a / 1_000_000.0);
    }
    if a >= 1_000.0 {
        return format!("{sign}{:.1}K", a / 1_000.0);
    }
    if n.is_finite() && n.fract() == 0.0 && a <= i64::MAX as f64 {
        return format!("{sign}{}", commas(a as i64));
    }
    format!("{sign}{a}")
}

/// Mirrors `iHorizonTimeCalculator.to_beautiful_string` short form, with
/// the guild language's unit names (`var_year`, `var_mo`, ...).
pub fn beautiful_ms_lang(ms: f64, u: &[String; 8]) -> String {
    if !ms.is_finite() || ms < 0.0 {
        return format!("0{}", u[5]);
    }
    let mut rest = ms as u64;
    let factors = [
        31_557_600_000u64,
        2_592_000_000,
        604_800_000,
        86_400_000,
        3_600_000,
        60_000,
        1_000,
        1,
    ];
    let mut result = String::new();
    for (i, factor) in factors.iter().enumerate() {
        if rest >= *factor {
            let value = rest / *factor;
            result.push_str(&format!("{}{}", value, u[i]));
            rest %= *factor;
            if rest == 0 {
                break;
            }
        }
    }
    if result.is_empty() {
        format!("0{}", u[5])
    } else {
        result
    }
}

/// Load the eight short duration unit names for the guild language.
pub async fn time_units(ctx: &Ctx<'_>) -> [String; 8] {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let get = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    [
        get("var_year", "y"),
        get("var_mo", "mo"),
        get("var_w", "w"),
        get("var_d", "d"),
        get("var_h", "h"),
        get("var_m", "m"),
        get("var_s", "s"),
        "ms".to_string(),
    ]
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

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs` channel.
/// Mirrors ihorizon_logs.ts (best-effort, silent when missing).
pub async fn post_ihorizon_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|c| (c.id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(0xBF0BB9)
        .title(title.to_string())
        .description(description.to_string());
    let _ = poise::serenity_prelude::ChannelId::new(log_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

/// User mention for economy log placeholders.
pub fn user_mention(user_id: u64) -> String {
    format!("<@{user_id}>")
}

/// Role mention for economy log placeholders.
pub fn role_mention(role_id: u64) -> String {
    format!("<@&{role_id}>")
}

fn guild_name(ctx: &Ctx<'_>) -> String {
    ctx.guild_id()
        .and_then(|id| {
            ctx.serenity_context()
                .cache
                .guild(id)
                .map(|g| g.name.clone())
        })
        .unwrap_or_else(|| "this server".to_string())
}

async fn coin_markup(ctx: &Ctx<'_>) -> String {
    crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Coin")
        .await
        .unwrap_or_else(|| "🪙".to_string())
}

async fn wallet_markup(ctx: &Ctx<'_>) -> String {
    crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Wallet")
        .await
        .unwrap_or_else(|| "💼".to_string())
}

async fn no_markup(ctx: &Ctx<'_>) -> String {
    crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string())
}

/// Role-field rows mirroring
/// `economyHelper.generateRoleFields` ("Role N" / roles + price +
/// `Boost: x<b||1>`, inline).
async fn role_fields(ctx: &Ctx<'_>, shop: &ShopMap) -> Vec<(String, String, bool)> {
    let roles_word = crate::commands::lang_for(ctx, "var_roles", "Roles").await;
    let price_word = crate::commands::lang_for(ctx, "var_price", "Price").await;
    shop.iter()
        .enumerate()
        .map(|(i, (role_id, e))| {
            let boost = e.boost.unwrap_or(1.0);
            (
                format!("Role {}", i + 1),
                format!(
                    "{roles_word}: <@&{role_id}>\n{price_word}: {}\nBoost: x{}",
                    fmt_num(e.price),
                    fmt_num(boost)
                ),
                true,
            )
        })
        .collect()
}

/// The shared "Buyable Roles" embed used by role-add, role-delete,
/// role-list and boost-set replies. Mirrors the TS embeds
/// (`economy_boost_embed_title` / `economy_boost_embed_desc`, #0097ff).
async fn buyable_roles_embed(
    ctx: &Ctx<'_>,
    shop: &ShopMap,
) -> poise::serenity_prelude::CreateEmbed {
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(crate::commands::lang_for(ctx, "economy_boost_embed_title", "Buyable Roles").await)
        .description(
            crate::commands::lang_for(ctx, "economy_boost_embed_desc", "Buyable roles.").await,
        )
        .colour(0x0097FF)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    for (name, value, inline) in role_fields(ctx, shop).await {
        embed = embed.field(name, value, inline);
    }
    embed
}

async fn send_with_footer(
    ctx: &Ctx<'_>,
    embed: poise::serenity_prelude::CreateEmbed,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (fname, fbytes) = crate::commands::shared::footer_parts(ctx, &gid).await;
    let embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());
    let mut reply = poise::CreateReply::default().embed(embed);
    if let Some(bytes) = fbytes {
        reply = reply.attachment(poise::serenity_prelude::CreateAttachment::bytes(
            bytes,
            "footer_icon.png",
        ));
    }
    ctx.send(reply).await?;
    Ok(())
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
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
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
    let coin = coin_markup(&ctx).await;
    let wallet = wallet_markup(&ctx).await;
    let member_name = user.as_ref().map(|u| u.name.clone()).unwrap_or_else(|| {
        ctx.author()
            .global_name
            .clone()
            .unwrap_or_else(|| ctx.author().name.clone())
    });
    let who = user
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_else(|| ctx.author().to_string());
    let shop_json = crate::db::kv_get(&ctx.data().pool, &gid, shop_key())
        .await
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let total = a.money + a.bank;
    // Mirrors !balance.ts: #e3c6ff embed, "`name`'s Wallet" title,
    // wallet desc, bank / money / boost fields with Coin suffix.
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xE3C6FF)
        .title(format!("`{member_name}`'s Wallet"))
        .description(
            crate::lang::get(&code, "balance_he_have_wallet")
                .map(|s| {
                    s.replace("${user}", &who)
                        .replace("${bal}", &total.to_string())
                        .replace("${client.iHorizon_Emojis.Wallet}", &wallet)
                })
                .unwrap_or_else(|| format!("Wallet: {total}")),
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", a.bank),
            true,
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields2_name")
                .unwrap_or_else(|| "Wallet".to_string()),
            format!("{}{coin}", a.money),
            true,
        )
        .field(
            crate::lang::get(&code, "var_boost").unwrap_or_else(|| "Boost".to_string()),
            format!("{boost}x"),
            true,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), uid).await {
            embed = embed.thumbnail(member.avatar_url().unwrap_or_else(|| member.user.face()));
        }
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "pay")]
pub async fn eco_pay(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
    #[description = "Amount"] amount: f64,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS: `amount.toString().includes("-")` — only negatives are rejected.
    if amount.to_string().contains('-') {
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
    let a = load_econ(&ctx.data().pool, &gid, from).await;
    // TS: `if (amount && member < amount)` — falsy amounts (0) skip the
    // check and flow through to a no-op add/sub + success reply.
    if amount != 0.0 && (a.money as f64) < amount {
        ctx.say(
            crate::lang::get(&code, "pay_dont_have_enought_to_give")
                .unwrap_or_else(|| "Not enough money.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS replies BEFORE mutating (interactionSend, then db.add/sub).
    let payer = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    ctx.say(
        crate::lang::get(&code, "pay_command_work")
            .map(|s| {
                s.replace("${interaction.user.username}", &payer)
                    .replace(
                        "${user.user.username}",
                        &user
                            .global_name
                            .clone()
                            .unwrap_or_else(|| user.name.clone()),
                    )
                    .replace("${amount}", &fmt_num(amount))
            })
            .unwrap_or_else(|| format!("Paid {}.", fmt_num(amount))),
    )
    .await?;
    let mut a = a;
    let mut b = load_econ(&ctx.data().pool, &gid, to).await;
    add_money(&mut b, amount);
    add_money(&mut a, -amount);
    save_econ(&ctx.data().pool, &gid, from, &a).await?;
    save_econ(&ctx.data().pool, &gid, to, &b).await?;
    let author = user_mention(from);
    let target = user_mention(to);
    let amt = fmt_num(amount);
    post_economy_log(
        &ctx,
        "economy_logs_pay_title",
        "economy_logs_pay_desc",
        &[("author", &author), ("target", &target), ("amount", &amt)],
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "rob")]
pub async fn eco_rob(
    ctx: Ctx<'_>,
    #[description = "Member"] user: poise::serenity_prelude::User,
) -> Result<(), anyhow::Error> {
    use rand::Rng;
    // Disabled guard first, like !rob.ts.
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS default `?? 3000000` for ECONOMY.settings.rob.cooldown.
    let tune = load_tuning(&ctx.data().pool, &gid, "rob").await;
    let from = ctx.author().id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, from).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let now = now_ms();
    if a.rob != 0 && tune.cooldown_ms - (now - a.rob) > 0 {
        let units = time_units(&ctx).await;
        let time = beautiful_ms_lang((tune.cooldown_ms - (now - a.rob)) as f64, &units);
        let text = crate::lang::get(&code, "work_cooldown_error")
            .map(|s| {
                s.replace("${interaction.user.id}", &from.to_string())
                    .replace("${time}", &time)
            })
            .unwrap_or_else(|| "Rob on cooldown.".to_string());
        // TS replies with flags [1 << 6] (ephemeral).
        ctx.send(poise::CreateReply::default().content(text).ephemeral(true))
            .await?;
        return Ok(());
    }
    let mut b = load_econ(&ctx.data().pool, &gid, user.id.get()).await;
    // Both sides need 250+ (`author < 250`, `targetuser < 250`); unset
    // balances read as 0 (never the string "null" — kept correct).
    if a.money < 250 {
        ctx.say(
            crate::lang::get(&code, "rob_dont_enought_error")
                .unwrap_or_else(|| "Rob failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    if b.money < 250 {
        let target_name = user
            .global_name
            .clone()
            .unwrap_or_else(|| user.name.clone());
        ctx.say(
            crate::lang::get(&code, "rob_him_dont_enought_error")
                .map(|s| s.replace("${user.user.username}", &target_name))
                .unwrap_or_else(|| "Rob failed.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // `Math.floor(Math.random() * 200) + 1` (1..=200).
    let loot: i64 = rand::thread_rng().gen_range(1..=200i64);
    // TS replies with the embed BEFORE mutating (interactionSend,
    // then db.sub/add/set).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .colour(0xA4CB80)
        .description(
            crate::lang::get(&code, "rob_embed_description")
                .map(|s| {
                    s.replace("${interaction.user.id}", &from.to_string())
                        .replace("${user.id}", &user.id.get().to_string())
                        .replace("${random}", &loot.to_string())
                })
                .unwrap_or_else(|| format!("Robbed {loot}.")),
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    b.money -= loot;
    a.money += loot;
    a.rob = now;
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
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "deposit", aliases("dep"))]
pub async fn eco_deposit(
    ctx: Ctx<'_>,
    #[description = "Amount or all"] amount: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = ctx.author().id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !deposit.ts: `toDeposit === "all"` takes the wallet, then
    // `isNaN(Number(...))` / `Number(...) <= 0` gate on the not-integer
    // key, and only `toDeposit > balance` (Number comparison, untruncated)
    // gates on cannot-abuse. The stored move uses parseInt truncation.
    let raw = amount.trim();
    let num: f64 = if raw == "all" {
        a.money as f64
    } else {
        match ts_number(raw) {
            Some(v) => v,
            None => {
                not_integer_reply(&ctx, &code).await?;
                return Ok(());
            }
        }
    };
    if num <= 0.0 || !num.is_finite() {
        not_integer_reply(&ctx, &code).await?;
        return Ok(());
    }
    let n: i64 = if raw == "all" {
        a.money
    } else {
        parse_ts_int(raw).unwrap_or(0)
    };
    if num > a.money as f64 {
        let no = no_markup(&ctx).await;
        ctx.say(
            crate::lang::get(&code, "deposit_cannot_abuse")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Invalid amount.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS mutates first, then replies with the embed (fresh bank value),
    // then posts the economy log.
    a.money -= n;
    a.bank += n;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    let author = user_mention(uid);
    let money = n.to_string();
    let coin = coin_markup(&ctx).await;
    let display = if raw == "all" {
        n.to_string()
    } else {
        raw.to_string()
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::lang::get(&code, "daily_embed_title")
                    .unwrap_or_else(|| "Deposit".to_string()),
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xA4CB80)
        .title(
            crate::lang::get(&code, "deposit_embed_title").unwrap_or_else(|| "Deposit".to_string()),
        )
        .description(
            crate::lang::get(&code, "deposit_embed_desc")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Coin}", &coin)
                        .replace("${interaction.user}", &author)
                        .replace("${toDeposit}", &display)
                })
                .unwrap_or_else(|| format!("Deposited {n}.")),
        )
        .field(
            crate::lang::get(&code, "deposit_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", a.bank),
            false,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    send_with_footer(&ctx, embed).await?;
    post_economy_log(
        &ctx,
        "economy_logs_deposit_title",
        "economy_logs_deposit_desc",
        &[("author", &author), ("money", &money)],
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "withdraw")]
pub async fn eco_withdraw(
    ctx: Ctx<'_>,
    #[description = "Amount or all"] amount: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = ctx.author().id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !withdraw.ts: `toWithdraw === "all"` takes the bank, then
    // `isNaN(Number(...))` gates on not-integer, `parseInt(...) <= 0`
    // gates on not-integer, and only `parseInt(...) > bank` gates on
    // cannot-abuse. The stored move uses parseInt truncation.
    let raw = amount.trim();
    if raw != "all" && ts_number(raw).is_none() {
        not_integer_reply(&ctx, &code).await?;
        return Ok(());
    }
    let n: i64 = if raw == "all" {
        a.bank
    } else {
        parse_ts_int(raw).unwrap_or(0)
    };
    if n <= 0 {
        not_integer_reply(&ctx, &code).await?;
        return Ok(());
    }
    if n > a.bank {
        let no = no_markup(&ctx).await;
        ctx.say(
            crate::lang::get(&code, "withdraw_cannot_abuse")
                .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                .unwrap_or_else(|| "Invalid amount.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS mutates first, then replies with the embed (fresh bank value),
    // then posts the economy log.
    a.bank -= n;
    a.money += n;
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    let author = user_mention(uid);
    let money = n.to_string();
    let coin = coin_markup(&ctx).await;
    let display = if raw == "all" {
        n.to_string()
    } else {
        raw.to_string()
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::lang::get(&code, "daily_embed_title")
                    .unwrap_or_else(|| "Withdraw".to_string()),
            )
            .icon_url(ctx.author().face()),
        )
        .colour(0xA4CB80)
        .title(
            crate::lang::get(&code, "withdraw_embed_title")
                .unwrap_or_else(|| "Withdraw".to_string()),
        )
        .description(
            crate::lang::get(&code, "withdraw_embed_desc")
                .map(|s| {
                    s.replace("${client.iHorizon_Emojis.Coin}", &coin)
                        .replace("${interaction.user}", &author)
                        .replace("${toWithdraw}", &display)
                })
                .unwrap_or_else(|| format!("Withdrew {n}.")),
        )
        .field(
            crate::lang::get(&code, "withdraw_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", a.bank),
            false,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    send_with_footer(&ctx, embed).await?;
    post_economy_log(
        &ctx,
        "economy_logs_withdraw_title",
        "economy_logs_withdraw_desc",
        &[("author", &author), ("money", &money)],
    )
    .await?;
    Ok(())
}

fn medal_for(rank: usize) -> &'static str {
    match rank {
        0 => "🥇",
        1 => "🥈",
        2 => "🥉",
        _ => "💰",
    }
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("eclb", "eco-lb", "economy-lb")
)]
pub async fn eco_leaderboard(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    use poise::serenity_prelude as serenity;
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Blob rows only (`USER.<id>.ECONOMY` exactly); leaf rows under a
    // blob path must not double-count.
    let rows: Vec<(String, String)> = sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.ECONOMY%'",
    )
    .bind(&gid)
    .fetch_all(&ctx.data().pool)
    .await
    .unwrap_or_default();
    let mut parsed: Vec<(u64, i64, i64)> = rows
        .iter()
        .filter_map(|(k, v)| {
            let rest = k.strip_prefix("USER.")?;
            let (id, tail) = rest.split_once('.')?;
            if tail != "ECONOMY" {
                return None;
            }
            let id: u64 = id.parse().ok()?;
            let a: EconAccount = serde_json::from_str(v).ok()?;
            Some((id, a.money + a.bank, a.bank))
        })
        .collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1));
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if parsed.is_empty() {
        ctx.say(
            crate::lang::get(&code, "perm_list_no_user")
                .unwrap_or_else(|| "No economy data.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let coin = coin_markup(&ctx).await;
    let bank_name =
        crate::lang::get(&code, "balance_embed_fields1_name").unwrap_or_else(|| "Bank".to_string());
    let money_name = crate::lang::get(&code, "balance_embed_fields2_name")
        .unwrap_or_else(|| "Wallet".to_string());
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let title = crate::lang::get(&code, "economy_leaderboard_embed_title")
        .map(|s| s.replace("${interaction.guild.name}", &guild_name(&ctx)))
        .unwrap_or_else(|| "Economy leaderboard".to_string());
    // Text podium for the top 3, mirroring the podium PNG content
    // (username + formatted wealth).
    let podium: Vec<String> = parsed
        .iter()
        .take(3)
        .enumerate()
        .map(|(i, (uid, total, _))| {
            format!(
                "{} <@{uid}> — **{}**",
                medal_for(i),
                format_num(*total as f64)
            )
        })
        .collect();
    let items_per_page = 10usize;
    let total_pages = parsed.len().div_ceil(items_per_page);
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let mk_embed = |page: usize| {
        let start = page * items_per_page;
        let lines: Vec<String> = parsed
            .iter()
            .skip(start)
            .take(items_per_page)
            .enumerate()
            .map(|(i, (uid, total, bank))| {
                let rank = start + i;
                let money = total - bank;
                format!(
                    "{} **{}** ・ <@{uid}>\n  ┖ {coin} **{}** ({bank_name}) + **{}** ({money_name})",
                    medal_for(rank),
                    rank + 1,
                    format_num(*bank as f64),
                    format_num(money as f64),
                )
            })
            .collect();
        let desc = if page == 0 {
            format!("{}\n\n{}", podium.join("\n"), lines.join("\n"))
        } else {
            lines.join("\n")
        };
        let footer = crate::commands::shared::footer_page_text(
            &fname,
            &page_word,
            (page + 1) as u64,
            total_pages as u64,
        );
        serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0xFFD700)
            .description(desc)
            .footer(
                serenity::CreateEmbedFooter::new(footer).icon_url(if fbytes.is_some() {
                    "attachment://footer_icon.png".to_string()
                } else {
                    String::new()
                }),
            )
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = |page: usize| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("eco-lb-first")
                .style(serenity::ButtonStyle::Primary)
                .label("<<<")
                .disabled(page == 0),
            serenity::CreateButton::new("eco-lb-prev")
                .style(serenity::ButtonStyle::Primary)
                .label("<")
                .disabled(page == 0),
            serenity::CreateButton::new("eco-lb-page")
                .style(serenity::ButtonStyle::Secondary)
                .label(format!("{page_word} {}/{}", page + 1, total_pages))
                .disabled(true),
            serenity::CreateButton::new("eco-lb-next")
                .style(serenity::ButtonStyle::Primary)
                .label(">")
                .disabled(page + 1 >= total_pages),
            serenity::CreateButton::new("eco-lb-last")
                .style(serenity::ButtonStyle::Primary)
                .label(">>>")
                .disabled(page + 1 >= total_pages),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0))
        .components(vec![mk_row(0)]);
    if let Some(bytes) = fbytes.clone() {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    // Mirrors the 15-minute button collector; no author filter in TS.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(60 * 15))
            .await;
        let Some(press) = press else { break };
        if !press.data.custom_id.starts_with("eco-lb-") {
            continue;
        }
        match press.data.custom_id.as_str() {
            "eco-lb-first" => page = 0,
            "eco-lb-prev" => page = page.saturating_sub(1),
            "eco-lb-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            "eco-lb-last" => page = total_pages - 1,
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(page))
                        .components(vec![mk_row(page)]),
                ),
            )
            .await;
    }
    // Disable the row when the collector ends, like the TS end handler.
    let end_row = serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new("eco-lb-first")
            .style(serenity::ButtonStyle::Secondary)
            .label("<<<")
            .disabled(true),
        serenity::CreateButton::new("eco-lb-prev")
            .style(serenity::ButtonStyle::Secondary)
            .label("<")
            .disabled(true),
        serenity::CreateButton::new("eco-lb-page")
            .style(serenity::ButtonStyle::Primary)
            .label(format!("{page_word} {}/{}", page + 1, total_pages))
            .disabled(true),
        serenity::CreateButton::new("eco-lb-next")
            .style(serenity::ButtonStyle::Secondary)
            .label(">")
            .disabled(true),
        serenity::CreateButton::new("eco-lb-last")
            .style(serenity::ButtonStyle::Secondary)
            .label(">>>")
            .disabled(true),
    ]);
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![end_row]),
        )
        .await;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "shop")]
pub async fn eco_shop(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let shop = load_shop(pool, &gid).await;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let uid = ctx.author().id.get();
    let base = load_econ(pool, &gid, uid).await;
    // Restore sweep: re-grant owned roles the member is missing, like
    // the !shop.ts owned-roles loop ("[Economy Shop] Role was not given
    // to the user."). Purchases themselves go through /economy buy.
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            for role_id in &base.owned_roles {
                if let Ok(rid) = role_id.parse::<u64>() {
                    let role = poise::serenity_prelude::RoleId::new(rid);
                    if !member.roles.contains(&role) {
                        let _ = member.add_role(ctx.http(), role).await;
                    }
                }
            }
        }
    }
    if shop.is_empty() {
        ctx.say(
            crate::lang::get(&code, "economy_shop_not_set")
                .unwrap_or_else(|| "Shop is empty.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let shop_json = crate::db::kv_get(pool, &gid, shop_key())
        .await
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let coin = coin_markup(&ctx).await;
    // Mirrors the !shop.ts embed (title with guild name, #45f712,
    // desc, bank / money / boost fields, footer).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(
            crate::lang::get(&code, "economy_shop_embed_title")
                .map(|s| s.replace("${interaction.guild.name}", &guild_name(&ctx)))
                .unwrap_or_else(|| "Shop".to_string()),
        )
        .colour(0x45F712)
        .description(
            crate::lang::get(&code, "economy_shop_embed_desc")
                .unwrap_or_else(|| "Buy roles with your money.".to_string()),
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields1_name")
                .unwrap_or_else(|| "Bank".to_string()),
            format!("{}{coin}", base.bank),
            true,
        )
        .field(
            crate::lang::get(&code, "balance_embed_fields2_name")
                .unwrap_or_else(|| "Wallet".to_string()),
            format!("{}{coin}", base.money),
            true,
        )
        .field(
            crate::lang::get(&code, "var_boost").unwrap_or_else(|| "Boost".to_string()),
            format!("{boost}x"),
            true,
        )
        .timestamp(poise::serenity_prelude::Timestamp::now());
    send_with_footer(&ctx, embed).await?;
    Ok(())
}

/// Shared purchase core for /economy buy (and the shop flow): returns
/// the reply text after performing the TS collector steps
/// (already-owned restore, funds check, money + ownedRoles writes,
/// role grant). Replies are ephemeral, like the TS collector replies.
async fn do_buy(
    ctx: &Ctx<'_>,
    role_id: u64,
    role_name: &str,
) -> Result<Option<String>, anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let text = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let shop = load_shop(pool, &gid).await;
    let Some(item) = shop.get(&role_id.to_string()) else {
        return Ok(Some(text(
            "economy_shop_not_available",
            "Role not in shop.",
        )));
    };
    let price = item.price;
    let uid = ctx.author().id.get();
    let mut a = load_econ(pool, &gid, uid).await;
    // Owned-role path (!shop.ts collector): already-owned roles are
    // re-granted if missing and never charged.
    if a.owned_roles.iter().any(|r| r == &role_id.to_string()) {
        if let Some(guild_id) = ctx.guild_id() {
            if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
                let role = poise::serenity_prelude::RoleId::new(role_id);
                if !member.roles.contains(&role) {
                    let _ = member.add_role(ctx.http(), role).await;
                }
            }
        }
        return Ok(Some(text(
            "economy_shop_already_own_role",
            "You already own this role.",
        )));
    }
    if (a.money as f64) < price {
        return Ok(Some(text(
            "economy_shop_not_enough_money",
            "Not enough money.",
        )));
    }
    a.money = (a.money as f64 - price) as i64;
    a.owned_roles.push(role_id.to_string());
    save_econ(pool, &gid, uid, &a).await?;
    if let Some(guild_id) = ctx.guild_id() {
        if let Ok(member) = guild_id.member(ctx.http(), ctx.author().id).await {
            let _ = member
                .add_role(ctx.http(), poise::serenity_prelude::RoleId::new(role_id))
                .await;
        }
    }
    Ok(Some(
        text(
            "economy_shop_role_purchased",
            "Bought {roleName} for ${role.price}.",
        )
        .replace("{roleName}", role_name)
        .replace("${role.price}", &fmt_num(price)),
    ))
}

#[poise::command(slash_command, prefix_command, rename = "buy")]
pub async fn eco_buy(
    ctx: Ctx<'_>,
    #[description = "Role to buy"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    if let Some(reply) = do_buy(&ctx, role.id.get(), &role.name).await? {
        ctx.send(poise::CreateReply::default().content(reply).ephemeral(true))
            .await?;
    }
    Ok(())
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
    #[description = "Price"] price: f64,
) -> Result<(), anyhow::Error> {
    // NOTE: !add.ts has no disabled gate — none here either.
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
    // TS blocks at >= 20 keys even for updates, and stores the raw
    // amount (negatives allowed).
    if roles.len() >= 20 {
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
    roles.insert(
        id.clone(),
        ShopEntry {
            price,
            boost: roles.get(&id).and_then(|e| e.boost),
        },
    );
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    // TS replies with the buyable-roles embed, then posts the log.
    send_with_footer(&ctx, buyable_roles_embed(&ctx, &roles).await).await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    let price_s = fmt_num(price);
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
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_shop(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let id = role.id.get().to_string();
    if roles.is_empty() {
        ctx.say(
            crate::lang::get(&code, "economy_role_add_no_role")
                .unwrap_or_else(|| "Role not in shop.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS deletes unconditionally (missing ids included), then saves,
    // replies with the buyable-roles embed, and logs.
    roles.remove(&id);
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    send_with_footer(&ctx, buyable_roles_embed(&ctx, &roles).await).await?;
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
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let roles = load_shop(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if roles.is_empty() {
        ctx.say(
            crate::lang::get(&code, "economy_role_list_no_buyable_roles")
                .unwrap_or_else(|| "Shop is empty.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS replies with the role-list embed (title + desc + role fields).
    let mut embed = poise::serenity_prelude::CreateEmbed::default()
        .title(
            crate::lang::get(&code, "economy_role_list_embed_title")
                .unwrap_or_else(|| "Buyable Roles".to_string()),
        )
        .description(
            crate::lang::get(&code, "economy_role_list_embed_desc")
                .unwrap_or_else(|| "Buyable roles.".to_string()),
        )
        .colour(0x0097FF)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    for (name, value, inline) in role_fields(&ctx, &roles).await {
        embed = embed.field(name, value, inline);
    }
    send_with_footer(&ctx, embed).await?;
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
    #[description = "Boost (e.g. 2)"] boost: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_shop(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let id = role.id.get().to_string();
    if !roles.contains_key(&id) {
        ctx.say(
            crate::lang::get(&code, "economy_boost_role_not_found")
                .unwrap_or_else(|| "Role not in shop.".to_string()),
        )
        .await?;
        return Ok(());
    }
    // TS `parseInt(...)` on the boost string; the stored shape is a
    // number (unparseable input lands on 0, like NaN would).
    let amount = parse_ts_int(boost.trim()).unwrap_or(0) as f64;
    let keep_price = roles.get(&id).map(|e| e.price).unwrap_or(0.0);
    roles.insert(
        id,
        ShopEntry {
            price: keep_price,
            boost: Some(amount),
        },
    );
    save_shop(&ctx.data().pool, &gid, &roles).await?;
    // TS replies with the buyable-roles embed, then logs boostModifying.
    send_with_footer(&ctx, buyable_roles_embed(&ctx, &roles).await).await?;
    let author = user_mention(ctx.author().id.get());
    let role_m = role_mention(role.id.get());
    let amt = fmt_num(amount);
    post_economy_log(
        &ctx,
        "economy_logs_boost_role_title",
        "economy_logs_boost_role_desc",
        &[("author", &author), ("role", &role_m), ("amount", &amt)],
    )
    .await?;
    Ok(())
}

/// Reward kinds exposed by the TS registry for set-money
/// (economy.ts: daily / weekly / monthly only).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum RewardKind {
    #[name = "daily"]
    Daily,
    #[name = "weekly"]
    Weekly,
    #[name = "monthly"]
    Monthly,
}

impl RewardKind {
    pub fn key(self) -> &'static str {
        match self {
            RewardKind::Daily => "daily",
            RewardKind::Weekly => "weekly",
            RewardKind::Monthly => "monthly",
        }
    }
}

/// Cooldown kinds exposed by the TS registry for set-cooldown
/// (economy.ts: rob / work only).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum CooldownKind {
    #[name = "rob"]
    Rob,
    #[name = "work"]
    Work,
}

impl CooldownKind {
    pub fn key(self) -> &'static str {
        match self {
            CooldownKind::Rob => "rob",
            CooldownKind::Work => "work",
        }
    }
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
    // Mirrors !config.ts: only the exact states "on"/"off" change anything.
    // Any other input (typo, ...) leaves the module untouched — it must
    // never disable the economy on a typo.
    let state = action.trim();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    let disabled = economy_disabled(&ctx.data().pool, &gid).await;
    let enabled = state == "on";
    if enabled {
        if !disabled {
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_enable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already on.".to_string()),
            )
            .await?;
        } else {
            // TS `db.set(..., false)`: a real boolean, not "0".
            crate::db::kv_set(&ctx.data().pool, &gid, "ECONOMY.disabled", "false").await?;
            ctx.say(
                crate::lang::get(&code, "economy_disable_set_enable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy on.".to_string()),
            )
            .await?;
            let author = user_mention(ctx.author().id.get());
            let state_label = crate::commands::lang_for(&ctx, "var_on", "enabled").await;
            post_economy_log(
                &ctx,
                "economy_logs_config_title",
                "economy_logs_config_desc",
                &[("author", &author), ("state", &state_label)],
            )
            .await?;
        }
    } else if state == "off" {
        if disabled {
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_disable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already off.".to_string()),
            )
            .await?;
        } else {
            // TS `db.set(..., true)`: a real boolean, not "1".
            crate::db::kv_set(&ctx.data().pool, &gid, "ECONOMY.disabled", "true").await?;
            ctx.say(
                crate::lang::get(&code, "economy_disable_set_disable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy off.".to_string()),
            )
            .await?;
            let author = user_mention(ctx.author().id.get());
            let state_label = crate::commands::lang_for(&ctx, "var_off", "disabled").await;
            post_economy_log(
                &ctx,
                "economy_logs_config_title",
                "economy_logs_config_desc",
                &[("author", &author), ("state", &state_label)],
            )
            .await?;
        }
    }
    // TS posts the ihorizon log for EVERY call, including garbage
    // states (the call sits outside the on/off branches).
    let title =
        crate::commands::lang_for(&ctx, "economy_disable_logs_embed_title", "Economy Logs").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "economy_disable_logs_embed_desc",
        "<@${interaction.user.id}> has put the Economy Module to `${state}`!",
    )
    .await
    .replace("${interaction.user.id}", &author_id)
    .replace("${state}", state);
    post_ihorizon_log(&ctx, &title, &desc).await;
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
    #[description = "Amount"] amount: f64,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS replies BEFORE mutating (interactionSend, then db.add).
    ctx.say(
        crate::lang::get(&code, "addmoney_command_work")
            .map(|s| {
                s.replace("${user.user.id}", &uid.to_string())
                    .replace("${amount.value}", &fmt_num(amount))
            })
            .unwrap_or_else(|| format!("Added {}.", fmt_num(amount))),
    )
    .await?;
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    // No clamp: TS `db.add` is raw arithmetic (negatives subtract,
    // floats persist).
    add_money(&mut a, amount);
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    let invoker_id = ctx.author().id.get().to_string();
    let title =
        crate::commands::lang_for(&ctx, "addmoney_logs_embed_title", "Money addition").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "addmoney_logs_embed_description",
        "${interaction.user.id} added ${amount.value} to ${user.user.id}",
    )
    .await
    .replace("${interaction.user.id}", &invoker_id)
    .replace("${amount.value}", &fmt_num(amount))
    .replace("${user.user.id}", &uid.to_string());
    post_ihorizon_log(&ctx, &title, &desc).await;
    let author = user_mention(ctx.author().id.get());
    let target = user_mention(uid);
    let amt = fmt_num(amount);
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
    #[description = "Amount"] amount: f64,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let uid = user.id.get();
    let mut a = load_econ(&ctx.data().pool, &gid, uid).await;
    // No clamp: TS `db.sub` is raw arithmetic (balance may go negative).
    add_money(&mut a, -amount);
    save_econ(&ctx.data().pool, &gid, uid, &a).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // TS posts the ihorizon log BEFORE replying with the embed, and the
    // economy log after.
    let invoker_id = ctx.author().id.get().to_string();
    let title =
        crate::commands::lang_for(&ctx, "removemoney_logs_embed_title", "Money removal").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "removemoney_logs_embed_description",
        "${interaction.user.id} removed ${amount} from ${user.user.id}",
    )
    .await
    .replace("${interaction.user.id}", &invoker_id)
    .replace("${amount}", &fmt_num(amount))
    .replace("${user.user.id}", &uid.to_string());
    post_ihorizon_log(&ctx, &title, &desc).await;
    // Mirrors the !balance-remove.ts embed (title + Amount / Balance
    // Updated fields, #bc0116).
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .author(
            poise::serenity_prelude::CreateEmbedAuthor::new(
                crate::lang::get(&code, "removemoney_embed_title")
                    .unwrap_or_else(|| "Removed Money!".to_string()),
            )
            .icon_url(ctx.author().face()),
        )
        .field(
            crate::lang::get(&code, "removemoney_embed_fields")
                .unwrap_or_else(|| "Amount".to_string()),
            format!("{}$", fmt_num(amount)),
            false,
        )
        .field(
            crate::lang::get(&code, "removemoney_embed_second_fields")
                .unwrap_or_else(|| "Balance Updated".to_string()),
            format!("{}$", a.money),
            false,
        )
        .colour(0xBC0116)
        .timestamp(poise::serenity_prelude::Timestamp::now());
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    let author = user_mention(ctx.author().id.get());
    let target = user_mention(uid);
    let amt = fmt_num(amount);
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
    #[description = "daily, weekly, monthly"] kind: RewardKind,
    #[description = "Amount"] amount: f64,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS `db.set` on the leaf key stores the raw amount.
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("ECONOMY.settings.{}.amount", kind.key()),
        &serde_json::to_string(&num_json(amount))?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "economy_manage_rewards_set_money")
            .map(|s| {
                s.replace("${type}", kind.key())
                    .replace("${money}", &fmt_num(amount))
            })
            .unwrap_or_else(|| "Tuning updated.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    let money = fmt_num(amount);
    // TS logs the type uppercased.
    let kind_s = kind.key().to_uppercase();
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
    #[description = "rob, work"] kind: CooldownKind,
    #[description = "Cooldown (e.g. 10s, 1h)"] cooldown: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let Some(ms) = crate::commands::schedule::main::parse_duration_ms(&cooldown) else {
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
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        &format!("ECONOMY.settings.{}.cooldown", kind.key()),
        &serde_json::to_string(&ms)?,
    )
    .await?;
    // TS replies (and logs) with `stime = to_beautiful_string(time)`,
    // not the raw input.
    let units = time_units(&ctx).await;
    let stime = beautiful_ms_lang(ms as f64, &units);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "economy_manage_rewards_cooldown_command_ok")
            .map(|s| s.replace("${type}", kind.key()).replace("${stime}", &stime))
            .unwrap_or_else(|| "Cooldown updated.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    // TS logs the type uppercased.
    let kind_s = kind.key().to_uppercase();
    let time_s = stime;
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
    #[description = "Member"] user: Option<poise::serenity_prelude::User>,
) -> Result<(), anyhow::Error> {
    // NOTE: !ureset.ts has no disabled gate — none here either.
    // TS defaults to the invoker when no member is given.
    let target = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    // Cancel replies with setjoinroles_action_canceled via
    // prompt_reset_confirm, like the TS else branch.
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
    // Delete the blob row plus any leaf rows under it (TS deletes the
    // whole `USER.<id>.ECONOMY` subtree).
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND (key_name = ? OR key_name LIKE ?)")
        .bind(&gid)
        .bind(econ_key(target))
        .bind(format!("{}.%", econ_key(target)))
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Economy reset for user.".to_string()),
    )
    .await?;
    let title = crate::commands::lang_for(
        &ctx,
        "reset_ueconomy_logs_embed_title",
        "Economy Module Logs (DANGEROUS ACTION)",
    )
    .await;
    let desc = crate::commands::lang_for(
        &ctx,
        "reset_ueconomy_logs_embed_desc",
        "${interaction.member.user.toString()} has deleted all economy module data for ${user.toString()}!",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &user_mention(ctx.author().id.get()),
    )
    .replace("${user.toString()}", &user_mention(target));
    post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // NOTE: !greset.ts has no disabled gate — none here either.
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
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE 'USER.%.ECONOMY%'")
        .bind(&gid)
        .execute(&ctx.data().pool)
        .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "All economy reset.".to_string()),
    )
    .await?;
    let title = crate::commands::lang_for(
        &ctx,
        "reset_geconomy_logs_embed_title",
        "Economy Module Logs (VERY DANGEROUS ACTION)",
    )
    .await;
    let desc = crate::commands::lang_for(
        &ctx,
        "reset_geconomy_logs_embed_desc",
        "${interaction.member.user.toString()} has deleted all economy module data for **EVERYONE**!",
    )
    .await
    .replace(
        "${interaction.member.user.toString()}",
        &user_mention(ctx.author().id.get()),
    );
    post_ihorizon_log(&ctx, &title, &desc).await;
    Ok(())
}

/// Whether the economy module is off. Mirrors the
/// `ECONOMY.disabled === true` guard (a real boolean; the legacy Rust
/// "1" shape is still accepted).
pub async fn economy_disabled(pool: &crate::db::Pool, guild_id: &str) -> bool {
    match crate::db::kv_get(pool, guild_id, "ECONOMY.disabled").await {
        Some(v) => {
            let t = v.trim();
            if let Ok(b) = serde_json::from_str::<bool>(t) {
                return b;
            }
            t == "1" || t.eq_ignore_ascii_case("true")
        }
        None => false,
    }
}

/// Send the standard disabled-module reply. Returns true when the
/// caller must stop. Mirrors the `ECONOMY.disabled === true` guard
/// (`economy_disable_msg` + `${interaction.user.id}`) at the top of
/// every economy subcommand except config (the toggle itself),
/// role-add, ureset and greset (which have no gate in TS).
pub async fn disabled_reply(ctx: &Ctx<'_>) -> Result<bool, anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(false);
    };
    let gid = guild_id.get().to_string();
    if !economy_disabled(&ctx.data().pool, &gid).await {
        return Ok(false);
    }
    ctx.say(
        crate::commands::lang_for(ctx, "economy_disable_msg", "Economy is disabled.")
            .await
            .replace("${interaction.user.id}", &ctx.author().id.get().to_string()),
    )
    .await?;
    Ok(true)
}

/// JS `parseInt` semantics for deposit/withdraw amounts: optional sign,
/// leading ASCII digits, trailing garbage ignored ("10.9" -> 10).
/// Returns None when there are no leading digits (JS NaN).
pub fn parse_ts_int(raw: &str) -> Option<i64> {
    let t = raw.trim();
    let mut chars = t.chars();
    let mut out = String::new();
    if matches!(chars.clone().next(), Some('+') | Some('-')) {
        out.push(chars.next().unwrap_or('+'));
    }
    let mut any = false;
    for c in chars {
        if c.is_ascii_digit() {
            out.push(c);
            any = true;
        } else {
            break;
        }
    }
    if !any {
        return None;
    }
    out.parse::<i64>().ok()
}

/// JS `Number()` probe for the not-integer gate. Mirrors
/// `isNaN(Number(input))` (f64 covers decimals/exponents).
pub fn ts_number(raw: &str) -> Option<f64> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    t.parse::<f64>().ok()
}

/// Send the not-a-number reply. Mirrors the
/// `temporary_voice_limit_button_not_integer` branch of
/// !deposit.ts/!withdraw.ts (note the `${interaction.client...}`
/// placeholder shape on that key).
pub async fn not_integer_reply(ctx: &Ctx<'_>, code: &str) -> Result<(), anyhow::Error> {
    let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    ctx.say(
        crate::lang::get(code, "temporary_voice_limit_button_not_integer")
            .map(|s| {
                s.replace("${interaction.client.iHorizon_Emojis.No}", &no)
                    .replace("${client.iHorizon_Emojis.No}", &no)
            })
            .unwrap_or_else(|| "Not a number.".to_string()),
    )
    .await?;
    Ok(())
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
/// (tuning + boost amount, cooldown error, reward embed with Coin
/// suffix, reply BEFORE the money add + timestamp store).
pub async fn claim_inner(
    ctx: &Ctx<'_>,
    text_keys: &ClaimText<'_>,
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
        let units = time_units(ctx).await;
        let time = beautiful_ms_lang((tune.cooldown_ms - (now - last)) as f64, &units);
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
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(ctx).await);
    let amount = tune.amount * boost as f64;
    // TS replies with the embed BEFORE adding the money.
    let coin = coin_markup(ctx).await;
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
            format!("{}{coin}", fmt_num(amount)),
            false,
        );
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    add_money(&mut account, amount);
    match kind {
        "daily" => account.daily = now,
        "weekly" => account.weekly = now,
        "monthly" => account.monthly = now,
        _ => account.work = now,
    }
    save_econ(pool, &gid, uid, &account).await?;
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
        false,
    )
    .await
}

/// Work for a random payout.
// Mirrors economy !work.ts (1..=1024 times boost, ephemeral
// cooldown reply, gold embed, reply BEFORE the money add).
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
        let units = time_units(&ctx).await;
        let time = beautiful_ms_lang((tune.cooldown_ms - (now - account.work)) as f64, &units);
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
        .unwrap_or_else(|| "{}".to_string());
    let boost = member_boost(&shop_json, &invoker_roles(&ctx).await);
    let amount = rand::thread_rng().gen_range(1..=1024) * boost;
    let display = ctx
        .author()
        .global_name
        .clone()
        .unwrap_or_else(|| ctx.author().name.clone());
    // TS replies with the embed BEFORE adding the money.
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
    account.money += amount;
    account.work = now;
    save_econ(pool, &gid, uid, &account).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use poise::ChoiceParameter as _;

    #[test]
    fn boost_picks_highest_match_numeric() {
        let shop = r#"{"1":{"price":10,"boost":3},"2":{"price":5,"boost":2}}"#;
        assert_eq!(member_boost(shop, &[2]), 2);
        assert_eq!(member_boost(shop, &[1, 2]), 3);
        assert_eq!(member_boost(shop, &[9]), 1);
        assert_eq!(member_boost("nope", &[1]), 1);
        // Missing boost counts as 0, result falls back to 1.
        assert_eq!(member_boost(r#"{"1":{"price":10}}"#, &[1]), 1);
        // Legacy shapes still read.
        let legacy_arr =
            r#"[{"role_id":"1","price":10,"boost":"x3"},{"role_id":"2","price":5,"boost":"x2"}]"#;
        assert_eq!(member_boost(legacy_arr, &[2]), 2);
        assert_eq!(member_boost(legacy_arr, &[1, 2]), 3);
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
        assert_eq!(default_tuning("daily").amount, 500.0);
        assert_eq!(default_tuning("daily").cooldown_ms, 86_400_000);
        assert_eq!(default_tuning("weekly").amount, 1000.0);
        assert_eq!(default_tuning("weekly").cooldown_ms, 604_800_000);
        assert_eq!(default_tuning("monthly").amount, 5000.0);
        assert_eq!(default_tuning("monthly").cooldown_ms, 2_592_000_000);
        assert_eq!(default_tuning("work").cooldown_ms, 3_600_000);
        // `?? 3000000` in economy/!rob.ts.
        assert_eq!(default_tuning("rob").cooldown_ms, 3_000_000);
    }

    #[test]
    fn parse_ts_int_truncates_like_js_parseint() {
        assert_eq!(parse_ts_int("10"), Some(10));
        assert_eq!(parse_ts_int("10.9"), Some(10));
        assert_eq!(parse_ts_int("  -3abc"), Some(-3));
        assert_eq!(parse_ts_int("abc"), None);
        assert_eq!(parse_ts_int(""), None);
        assert_eq!(ts_number("abc"), None);
        assert_eq!(ts_number("1e3"), Some(1000.0));
        assert_eq!(ts_number(""), None);
    }

    #[test]
    fn fmt_num_matches_js_tostring_for_ints() {
        assert_eq!(fmt_num(10.0), "10");
        assert_eq!(fmt_num(-3.0), "-3");
        assert_eq!(fmt_num(10.5), "10.5");
    }

    #[test]
    fn format_num_matches_beautifuer() {
        assert_eq!(format_num(999.0), "999");
        assert_eq!(format_num(1500.0), "1.5K");
        assert_eq!(format_num(2_500_000.0), "2.5M");
        assert_eq!(format_num(1_234.0), "1.2K");
        assert_eq!(format_num(-1500.0), "-1.5K");
    }

    #[test]
    fn beautiful_ms_lang_uses_unit_names() {
        let u = [
            "y".to_string(),
            "mo".to_string(),
            "w".to_string(),
            "d".to_string(),
            "h".to_string(),
            "m".to_string(),
            "s".to_string(),
            "ms".to_string(),
        ];
        assert_eq!(beautiful_ms_lang(86_400_000.0, &u), "1d");
        assert_eq!(beautiful_ms_lang(3_600_000.0 + 60_000.0, &u), "1h1m");
        assert_eq!(beautiful_ms_lang(0.0, &u), "0m");
    }

    #[test]
    fn reward_and_cooldown_kinds_match_registry() {
        assert_eq!(RewardKind::from_name("daily"), Some(RewardKind::Daily));
        assert_eq!(RewardKind::from_name("weekly"), Some(RewardKind::Weekly));
        assert_eq!(RewardKind::from_name("monthly"), Some(RewardKind::Monthly));
        assert_eq!(RewardKind::from_name("work"), None);
        assert_eq!(CooldownKind::from_name("rob"), Some(CooldownKind::Rob));
        assert_eq!(CooldownKind::from_name("work"), Some(CooldownKind::Work));
        assert_eq!(CooldownKind::from_name("daily"), None);
        assert_eq!(RewardKind::Daily.key(), "daily");
        assert_eq!(CooldownKind::Rob.key(), "rob");
    }

    #[test]
    fn leaf_num_parses_json_numbers() {
        assert_eq!(parse_leaf_num("500"), Some(500.0));
        assert_eq!(parse_leaf_num(" 86400000 "), Some(86_400_000.0));
        assert_eq!(parse_leaf_num("\"1e3\""), Some(1000.0));
        assert_eq!(parse_leaf_num(""), None);
    }

    #[test]
    fn shop_entry_serializes_int_shaped() {
        let mut shop = ShopMap::new();
        shop.insert(
            "1".to_string(),
            ShopEntry {
                price: 100.0,
                boost: Some(2.0),
            },
        );
        let s = serde_json::to_string(&shop).unwrap();
        assert_eq!(s, r#"{"1":{"price":100,"boost":2}}"#);
    }

    #[test]
    fn econ_account_parses_ts_shapes() {
        let a: EconAccount =
            serde_json::from_str(r#"{"money":10.5,"bank":null,"ownedRoles":["1",2]}"#).unwrap();
        assert_eq!(a.money, 10);
        assert_eq!(a.bank, 0);
        assert_eq!(a.owned_roles, vec!["1".to_string(), "2".to_string()]);
    }

    #[test]
    fn pay_math() {
        let mut a = EconAccount {
            money: 100,
            ..Default::default()
        };
        let mut b = EconAccount::default();
        add_money(&mut a, -30.0);
        add_money(&mut b, 30.0);
        assert_eq!((a.money, b.money), (70, 30));
    }
}
