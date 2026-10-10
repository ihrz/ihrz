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

#[derive(Debug, Clone, Default, Deserialize)]
pub struct EconAccount {
    /// Wallet + bank stay floats end-to-end: TS `db.add`/`db.sub` keep
    /// JS numbers (`!balance-add.ts`, `!pay.ts`), and legacy int rows
    /// promote via `de_f64` (`visit_i64`) instead of truncating.
    #[serde(default, deserialize_with = "de_f64")]
    pub money: f64,
    #[serde(default, deserialize_with = "de_f64")]
    pub bank: f64,
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

/// Integer-valued floats serialize as integers so the shared-DB shape
/// matches what TS writes (`2`, not `2.0`); real fractions keep their
/// decimals. Same `num_json` rule as `ShopEntry`.
impl Serialize for EconAccount {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut m = s.serialize_map(Some(8))?;
        m.serialize_entry("money", &num_json(self.money))?;
        m.serialize_entry("bank", &num_json(self.bank))?;
        m.serialize_entry("daily", &self.daily)?;
        m.serialize_entry("weekly", &self.weekly)?;
        m.serialize_entry("monthly", &self.monthly)?;
        m.serialize_entry("work", &self.work)?;
        m.serialize_entry("rob", &self.rob)?;
        m.serialize_entry("ownedRoles", &self.owned_roles)?;
        m.end()
    }
}

/// Raw float add on the float wallet. Mirrors `db.add`/`db.sub` with a
/// float amount: no truncation, fractions persist (`!balance-add.ts`).
pub fn add_money(a: &mut EconAccount, delta: f64) {
    a.money += delta;
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

/// Insertion-ordered buyable-roles map. Mirrors the TS
/// `ECONOMY.buyableRoles` plain object: `Object.entries` (and
/// `economyHelper.generateRoleFields`, whose `.sort` compares whole role
/// objects so `Number(...)` is NaN and the sort is a no-op) observes
/// insertion order. A BTreeMap would reorder by role id instead, so this
/// keeps entries in document order: re-inserts update in place (like JS
/// assignment), delete + re-add moves to the end (like JS).
#[derive(Debug, Clone, Default)]
pub struct ShopMap(Vec<(String, ShopEntry)>);

impl ShopMap {
    pub fn new() -> Self {
        Self(Vec::new())
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn get(&self, role_id: &str) -> Option<&ShopEntry> {
        self.0.iter().find(|(id, _)| id == role_id).map(|(_, e)| e)
    }

    pub fn contains_key(&self, role_id: &str) -> bool {
        self.0.iter().any(|(id, _)| id == role_id)
    }

    pub fn insert(&mut self, role_id: String, entry: ShopEntry) {
        if let Some(slot) = self.0.iter_mut().find(|(id, _)| *id == role_id) {
            slot.1 = entry;
        } else {
            self.0.push((role_id, entry));
        }
    }

    pub fn remove(&mut self, role_id: &str) {
        self.0.retain(|(id, _)| id != role_id);
    }

    pub fn iter(&self) -> impl Iterator<Item = &(String, ShopEntry)> {
        self.0.iter()
    }
}

impl FromIterator<(String, ShopEntry)> for ShopMap {
    fn from_iter<I: IntoIterator<Item = (String, ShopEntry)>>(iter: I) -> Self {
        let mut map = ShopMap::new();
        for (k, v) in iter {
            map.insert(k, v);
        }
        map
    }
}

impl Serialize for ShopMap {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut m = s.serialize_map(Some(self.0.len()))?;
        for (k, v) in &self.0 {
            m.serialize_entry(k, v)?;
        }
        m.end()
    }
}

impl<'de> Deserialize<'de> for ShopMap {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct OrderedMap;
        impl<'de> serde::de::Visitor<'de> for OrderedMap {
            type Value = ShopMap;
            fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                f.write_str("an object map of role id to shop entry")
            }
            fn visit_map<A: serde::de::MapAccess<'de>>(
                self,
                mut map: A,
            ) -> Result<ShopMap, A::Error> {
                // serde_json streams object pairs in document order, so
                // collecting here preserves the TS insertion order.
                let mut out = ShopMap::new();
                while let Some((k, v)) = map.next_entry::<String, ShopEntry>()? {
                    out.insert(k, v);
                }
                Ok(out)
            }
        }
        d.deserialize_map(OrderedMap)
    }
}

pub fn shop_key() -> &'static str {
    "ECONOMY.buyableRoles"
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

/// Member boost multiplier from shop roles, float-preserving. Mirrors
/// economyHelper.getMemberBoost (highest matching numeric boost,
/// missing counts as 0, result falls back to 1 like TS `|| 1`).
pub fn member_boost_f64(shop_json: &str, member_roles: &[u64]) -> f64 {
    let v: serde_json::Value = match serde_json::from_str(shop_json) {
        Ok(v) => v,
        Err(_) => return 1.0,
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
    if best > 0.0 {
        best
    } else {
        1.0
    }
}

/// Member boost multiplier from shop roles, integer-truncated.
/// Only integer-display call sites keep this (the balance `Nx` field);
/// claim/work amounts use [`member_boost_f64`] so fractional boosts
/// (e.g. x1.5) survive the multiply like the TS number.
pub fn member_boost(shop_json: &str, member_roles: &[u64]) -> i64 {
    (member_boost_f64(shop_json, member_roles) as i64).max(1)
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
    // Table-first with legacy kv fallback (lazy promotion via routed_get);
    // legacy-only rows written by the TS side still resolve.
    let channel_id: Option<u64> =
        crate::commands::owner::main::routed_get(pool, &gid, &gid, ECONOMY_LOG_KEY)
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
        .title(
            crate::commands::lang_for(
                ctx,
                "economy_boost_embed_title",
                "Economy System - Buyable Roles",
            )
            .await,
        )
        .description(
            crate::commands::lang_for(
                ctx,
                "economy_boost_embed_desc",
                "All buyable roles are listed below.",
            )
            .await,
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

// Free-text option values for the tuning commands (`set-money` kind,
// `set-cooldown` kind, `boost-set` boost, `config` action).
//
// The TS options are `String` options with slash `choices`
// (economy.ts: `type`, `boost`, `action`) while the prefix path takes
// the raw text verbatim (`method.string` / `method.number`) and stores
// it with no registry check. poise 0.6 cannot express that split in one
// command: `#[choices]` forces an Integer option, and a
// `ChoiceParameter` enum rejects off-list prefix input with
// `InvalidChoice` before the body runs (a duplicate slash-only +
// prefix-only pair is no good either — both dispatches take the first
// name match). So these params stay plain `String` on both paths (no
// slash dropdown), and each body constrains to its slash choice values
// with an invalid-value error reply instead of the TS verbatim store
// (a deliberate divergence, documented per command):
// `set-money` kind in daily|weekly|monthly, `set-cooldown` kind in
// rob|work, `boost-set` boost in 1-5 (`parse_ts_int`, `parseInt`
// semantics), `config` action in on|off (unknown actions also skip the
// ihorizon log TS still posts). Only the `set-cooldown` duration still
// travels verbatim.

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
    if !config::economy_disabled_routed(&ctx.data().pool, &gid).await {
        return Ok(false);
    }
    ctx.say(
        crate::commands::lang_for(ctx, "economy_disable_msg", "<@${interaction.user.id}>, the `Economy Module` in this guild is **disabled**. You can't use the economy module anymore!")
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

/// Daily disabled-message quirk. Mirrors `!daily.ts:71`, which replaces the
/// typo `"${interaction.member.user.od}"` — a search string that never
/// matches, so the template (YAML `economy_disable_msg`, holding
/// `${interaction.user.id}`) is sent raw with the placeholder visible.
/// Every other economy subcommand substitutes correctly, so only the daily
/// claim uses this. TS is frozen; the quirk is mirrored, not fixed.
pub fn daily_disabled_text(template: &str, user_id: u64) -> String {
    template.replace("${interaction.member.user.od}", &user_id.to_string())
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
    if config::economy_disabled_routed(pool, &gid).await {
        let template =
            crate::commands::lang_for(ctx, "economy_disable_msg", "<@${interaction.user.id}>, the `Economy Module` in this guild is **disabled**. You can't use the economy module anymore!").await;
        let uid = ctx.author().id.get();
        let text = if kind == "daily" {
            daily_disabled_text(&template, uid)
        } else {
            template.replace("${interaction.user.id}", &uid.to_string())
        };
        ctx.say(text).await?;
        return Ok(());
    }
    let tune = set_cooldown::load_tuning_routed(pool, &gid, kind).await;
    let uid = ctx.author().id.get();
    let mut account = balance::load_econ_routed(pool, &gid, uid).await;
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
    let shop = shop::load_shop_routed(pool, &gid).await;
    let shop_json = serde_json::to_string(&shop).unwrap_or_else(|_| "{}".to_string());
    let boost = member_boost_f64(&shop_json, &invoker_roles(ctx).await);
    // Float math like TS `amount * getMemberBoost` (!daily.ts and sibs).
    let amount = tune.amount * boost;
    // Reply/persist order differs per kind: `!weekly.ts:102-113` writes the
    // money add + timestamp BEFORE the reply, while `!daily.ts` and
    // `!monthly.ts` reply first and persist after. Mirror both.
    let weekly_first = kind == "weekly";
    if weekly_first {
        add_money(&mut account, amount);
        match kind {
            "daily" => account.daily = now,
            "weekly" => account.weekly = now,
            "monthly" => account.monthly = now,
            _ => account.work = now,
        }
        balance::save_econ_routed(pool, &gid, uid, &account).await?;
    }
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
    if !weekly_first {
        add_money(&mut account, amount);
        match kind {
            "daily" => account.daily = now,
            "weekly" => account.weekly = now,
            "monthly" => account.monthly = now,
            _ => account.work = now,
        }
        balance::save_econ_routed(pool, &gid, uid, &account).await?;
    }
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
    fn float_boost_preserves_fractions() {
        // Fractional shop boosts survive (TS `getMemberBoost` number).
        let shop = r#"{"1":{"price":10,"boost":1.5},"2":{"price":5,"boost":2}}"#;
        assert_eq!(member_boost_f64(shop, &[1]), 1.5);
        assert_eq!(member_boost_f64(shop, &[1, 2]), 2.0);
        assert_eq!(member_boost_f64(shop, &[9]), 1.0);
        assert_eq!(member_boost_f64("nope", &[1]), 1.0);
        assert_eq!(member_boost_f64(r#"{"1":{"price":10}}"#, &[1]), 1.0);
        // Integer truncation stays on the i64 wrapper for integer callers.
        assert_eq!(member_boost(shop, &[1]), 1);
        assert_eq!(member_boost(shop, &[1, 2]), 2);
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
    fn tuning_params_stay_free_text_like_ts() {
        // The TS options are String options (`type`, `boost`, `action` in
        // economy.ts) with slash choices, while prefix passes raw text.
        // The Rust params are plain `String` (see the free-text note):
        // off-list values flow through verbatim, and boost text parses
        // with `parseInt` semantics (`method.number`, NaN -> 0).
        assert_eq!(parse_ts_int("2"), Some(2));
        assert_eq!(parse_ts_int("2.5"), Some(2));
        assert_eq!(parse_ts_int("x2"), None);
        assert_eq!(parse_ts_int("").or(Some(0)), Some(0));
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
    fn daily_disabled_message_goes_out_raw_like_ts() {
        // !daily.ts:71 replaces the typo "${interaction.member.user.od}",
        // which never matches: the template is sent raw, placeholder and
        // all, while every other subcommand substitutes the caller id.
        let template = "<@1>, disabled! ${interaction.user.id}";
        assert_eq!(daily_disabled_text(template, 1), template);
        assert_eq!(
            template.replace("${interaction.user.id}", "1"),
            "<@1>, disabled! 1"
        );
    }

    #[test]
    fn shop_keeps_insertion_order_not_key_order() {
        // economyHelper.generateRoleFields observes insertion order (its
        // `.sort` compares whole role objects, so it is a no-op).
        let raw = r#"{"999":{"price":10},"111":{"price":20},"50":{"price":30}}"#;
        let shop: ShopMap = serde_json::from_str(raw).unwrap();
        let ids: Vec<&str> = shop.iter().map(|(id, _)| id.as_str()).collect();
        assert_eq!(ids, vec!["999", "111", "50"]);
        // Round-trip keeps document order, unlike a BTreeMap.
        assert_eq!(serde_json::to_string(&shop).unwrap(), raw);
    }

    #[test]
    fn shop_reinsert_updates_in_place_like_js() {
        let mut shop: ShopMap =
            serde_json::from_str(r#"{"a":{"price":1},"b":{"price":2}}"#).unwrap();
        shop.insert(
            "a".to_string(),
            ShopEntry {
                price: 9.0,
                boost: None,
            },
        );
        let ids: Vec<&str> = shop.iter().map(|(id, _)| id.as_str()).collect();
        assert_eq!(ids, vec!["a", "b"]);
        assert_eq!(shop.get("a").map(|e| e.price), Some(9.0));
        shop.remove("a");
        shop.insert(
            "a".to_string(),
            ShopEntry {
                price: 9.0,
                boost: None,
            },
        );
        let ids: Vec<&str> = shop.iter().map(|(id, _)| id.as_str()).collect();
        assert_eq!(ids, vec!["b", "a"]);
    }

    #[test]
    fn econ_account_parses_ts_shapes() {
        let a: EconAccount =
            serde_json::from_str(r#"{"money":10.5,"bank":null,"ownedRoles":["1",2]}"#).unwrap();
        // Floats persist end-to-end (no truncation on read); legacy ints
        // promote.
        assert_eq!(a.money, 10.5);
        assert_eq!(a.bank, 0.0);
        assert_eq!(a.owned_roles, vec!["1".to_string(), "2".to_string()]);
        let b: EconAccount = serde_json::from_str(r#"{"money":100,"bank":50}"#).unwrap();
        assert_eq!((b.money, b.bank), (100.0, 50.0));
    }

    #[test]
    fn econ_account_serializes_int_shaped_like_ts() {
        // Shared-DB shape: integer-valued floats write as ints.
        let a = EconAccount {
            money: 40.0,
            bank: 2.0,
            ..Default::default()
        };
        let v = serde_json::to_value(&a).unwrap();
        assert_eq!(v.get("money").and_then(|x| x.as_i64()), Some(40));
        assert_eq!(v.get("bank").and_then(|x| x.as_i64()), Some(2));
        let f = EconAccount {
            money: 10.5,
            ..Default::default()
        };
        assert_eq!(
            serde_json::to_value(&f)
                .unwrap()
                .get("money")
                .and_then(|x| x.as_f64()),
            Some(10.5)
        );
    }

    #[test]
    fn pay_math() {
        let mut a = EconAccount {
            money: 100.0,
            ..Default::default()
        };
        let mut b = EconAccount::default();
        add_money(&mut a, -30.0);
        add_money(&mut b, 30.0);
        assert_eq!((a.money, b.money), (70.0, 30.0));
    }

    #[test]
    fn add_money_keeps_fractions_like_db_add() {
        // `db.add` with a float over a float balance: no truncation.
        let mut a = EconAccount {
            money: 10.5,
            ..Default::default()
        };
        add_money(&mut a, 0.25);
        assert_eq!(a.money, 10.75);
    }

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn owner_econ_delegates_to_routed() {
        use crate::commands::economy::balance::{load_econ_routed, save_econ_routed};
        use crate::commands::owner::main::{table_backend, tbl_get_value};
        let pool = mem_pool().await;
        // Legacy-only row surfaces through the routed owner.
        crate::db::kv_set(&pool, "g", "USER.1.ECONOMY", r#"{"money":100,"bank":50}"#)
            .await
            .unwrap();
        let a = load_econ_routed(&pool, "g", 1).await;
        assert_eq!((a.money, a.bank), (100.0, 50.0));
        // Table-only row wins (no legacy row present).
        table_backend(&pool)
            .table("g")
            .set(
                "USER.2.ECONOMY",
                serde_json::json!({"money": 777, "bank": 0}),
            )
            .await
            .unwrap();
        assert_eq!(load_econ_routed(&pool, "g", 2).await.money, 777.0);
        assert_eq!(load_econ_routed(&pool, "g", 9).await.money, 0.0);
        // Routed save dual-writes: kv readers and the table stay fresh.
        let account = EconAccount {
            money: 40.0,
            bank: 2.0,
            ..Default::default()
        };
        save_econ_routed(&pool, "g", 4, &account).await.unwrap();
        let legacy = crate::db::kv_get(&pool, "g", "USER.4.ECONOMY")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<EconAccount>(&legacy).unwrap().money,
            40.0
        );
        let stored = tbl_get_value(&pool, "g", "USER.4.ECONOMY").await.unwrap();
        assert_eq!(stored.get("bank").and_then(|v| v.as_i64()), Some(2));
        assert_eq!(load_econ_routed(&pool, "g", 4).await.money, 40.0);
    }

    #[test]
    fn economy_log_colour_matches_sendembed() {
        assert_eq!(ECONOMY_LOG_COLOUR, 0xF1C232);
        assert_eq!(ECONOMY_LOG_KEY, "GUILD.SERVER_LOGS.economy");
    }

    #[tokio::test]
    async fn economy_log_channel_routed_reads_legacy_and_promotes() {
        use crate::commands::owner::main::{table_backend, tbl_get_value};
        let pool = mem_pool().await;
        // Legacy-only row (TS writer shape) resolves through the routed
        // read used by post_economy_log and promotes into the table.
        crate::db::kv_set(&pool, "g", ECONOMY_LOG_KEY, "12345")
            .await
            .unwrap();
        let raw = crate::commands::owner::main::routed_get(&pool, "g", "g", ECONOMY_LOG_KEY).await;
        assert_eq!(raw.as_deref(), Some("12345"));
        assert!(tbl_get_value(&pool, "g", ECONOMY_LOG_KEY).await.is_some());
        // Table wins on conflict.
        table_backend(&pool)
            .table("g")
            .set(ECONOMY_LOG_KEY, serde_json::json!("777"))
            .await
            .unwrap();
        let raw = crate::commands::owner::main::routed_get(&pool, "g", "g", ECONOMY_LOG_KEY).await;
        assert_eq!(raw.as_deref(), Some("777"));
        // Unset guilds stay silent (None -> post_economy_log returns).
        assert_eq!(
            crate::commands::owner::main::routed_get(&pool, "n", "n", ECONOMY_LOG_KEY).await,
            None
        );
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
