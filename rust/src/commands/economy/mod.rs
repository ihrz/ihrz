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

/// Economy log channel key. Mirrors getEconomyChannel
/// (`GUILD.SERVER_LOGS.economy`, silent when unset).
pub const ECONOMY_LOG_KEY: &str = "GUILD.SERVER_LOGS.economy";

/// Embed colour for every economy log. Mirrors sendEmbed's `#f1c232`.
pub const ECONOMY_LOG_COLOUR: u32 = 0xF1C232;

/// Apply `{placeholder}` pairs to a log description template. Pure part
/// of sendEmbed in economyLogs.ts: each TS call chains
/// `.replace("{x}", v)` for its own placeholders, then resolves
/// `{coin}` to the Coin app emoji. `coin_markup` is injected so the
/// replacement stays offline-testable; pass `None` to leave `{coin}`.
pub fn apply_log_pairs(
    template: &str,
    pairs: &[(&str, &str)],
    coin_markup: Option<&str>,
) -> String {
    let mut desc = template.to_string();
    for (k, v) in pairs {
        desc = desc.replace(&format!("{{{k}}}"), v);
    }
    if let Some(coin) = coin_markup {
        desc = desc.replace("{coin}", coin);
    }
    desc
}

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
    let template = crate::commands::lang_for(ctx, desc_key, desc_key).await;
    let coin = if template.contains("{coin}") {
        Some(
            crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Coin")
                .await
                .unwrap_or_else(|| "🪙".to_string()),
        )
    } else {
        None
    };
    let desc = apply_log_pairs(&template, pairs, coin.as_deref());
    let embed = CreateEmbed::default()
        .colour(ECONOMY_LOG_COLOUR)
        .title(crate::commands::lang_for(ctx, title_key, title_key).await)
        .description(desc)
        .timestamp(Timestamp::now());
    // Fire-and-forget like the TS `sendEmbed` (returns void, the
    // `channel.send` is never awaited): log delivery must not fail
    // the command that already replied.
    let _ = ChannelId::new(channel_id)
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
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

pub mod add;
pub mod balance;
pub mod balance_add;
pub mod balance_remove;
pub mod boost_set;
pub mod config;
pub mod daily;
pub mod delete;
pub mod deposit;
#[allow(clippy::module_inception)]
pub mod economy;
pub mod greset;
pub mod leaderboard;
pub mod list;
pub mod monthly;
pub mod pay;
pub mod rob;
pub mod set_cooldown;
pub mod set_money;
pub mod shop;
pub mod ureset;
pub mod weekly;
pub mod withdraw;
pub mod work;

/// Old registry path (`economy::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::add::*;
    pub use super::balance::*;
    pub use super::balance_add::*;
    pub use super::balance_remove::*;
    pub use super::boost_set::*;
    pub use super::config::*;
    pub use super::daily::*;
    pub use super::delete::*;
    pub use super::deposit::*;
    pub use super::economy::*;
    pub use super::greset::*;
    pub use super::leaderboard::*;
    pub use super::list::*;
    pub use super::monthly::*;
    pub use super::pay::*;
    pub use super::rob::*;
    pub use super::set_cooldown::*;
    pub use super::set_money::*;
    pub use super::shop::*;
    pub use super::ureset::*;
    pub use super::weekly::*;
    pub use super::withdraw::*;
    pub use super::work::*;
    pub use super::*;
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

    #[test]
    fn economy_log_colour_matches_sendembed() {
        assert_eq!(ECONOMY_LOG_COLOUR, 0xF1C232);
        assert_eq!(ECONOMY_LOG_KEY, "GUILD.SERVER_LOGS.economy");
    }

    #[test]
    fn log_pairs_replace_like_economy_logs_ts() {
        let out = apply_log_pairs(
            "{author} gave {target} {amount} {coin}",
            &[("author", "<@1>"), ("target", "<@2>"), ("amount", "10")],
            Some("<:Coin:3>"),
        );
        assert_eq!(out, "<@1> gave <@2> 10 <:Coin:3>");
        let out = apply_log_pairs(
            "{author} set {role} x{amount}",
            &[("author", "<@1>"), ("role", "<@&7>"), ("amount", "3")],
            None,
        );
        assert_eq!(out, "<@1> set <@&7> x3");
        // No coin markup injected: placeholder survives like the TS
        // path that never replaces it (callers always pass pairs).
        let out = apply_log_pairs("{amount} {coin}", &[("amount", "5")], None);
        assert_eq!(out, "5 {coin}");
    }
}
