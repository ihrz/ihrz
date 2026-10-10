// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/invitesmanager/*.
//
// TS keys: <guild>.USER.<uid>.INVITES {invites, regular, bonus, leaves}.
// Leaderboard scans USER table sorted desc with 15/page pagination.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct InviteStats {
    #[serde(default)]
    pub invites: i64,
    #[serde(default)]
    pub regular: i64,
    #[serde(default)]
    pub bonus: i64,
    #[serde(default)]
    pub leaves: i64,
}

pub fn invites_key(user_id: u64) -> String {
    format!("USER.{user_id}.INVITES")
}

/// Guild-table backend for D1 routing (keys unchanged).
fn guild_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-routed read with legacy flat-row fallback. Writers store under
/// `tbl:<gid>`; legacy `(gid, key)` rows stay readable.
async fn table_value_or_legacy(
    pool: &crate::db::Pool,
    guild_id: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(v)) = table.get::<serde_json::Value>(key).await {
        return Some(v);
    }
    let s = crate::db::kv_get(pool, guild_id, key).await?;
    serde_json::from_str(&s)
        .ok()
        .or(Some(serde_json::Value::String(s)))
}

pub fn add_invites(s: &InviteStats, amount: i64) -> InviteStats {
    InviteStats {
        invites: s.invites + amount,
        regular: s.regular,
        bonus: s.bonus + amount,
        leaves: s.leaves,
    }
}

pub fn remove_invites(s: &InviteStats, amount: i64) -> InviteStats {
    // Mirrors TS `db.sub` (no floor): negative totals are allowed.
    InviteStats {
        invites: s.invites - amount,
        regular: s.regular,
        bonus: s.bonus - amount,
        leaves: s.leaves,
    }
}

/// Legacy `USER.<uid>.INVITES.BY` compat: TS `recordInviterStats`
/// (joinMessage.ts) writes `{inviter, invite}`, while the Rust join path
/// writes a raw-id string. Accept object, numeric, or raw-id forms.
pub fn parse_inviter_by(v: &serde_json::Value) -> Option<u64> {
    match v {
        serde_json::Value::Number(n) => n
            .as_u64()
            .or_else(|| n.as_i64().and_then(|i| u64::try_from(i).ok())),
        serde_json::Value::String(s) => parse_inviter_by_str(s),
        serde_json::Value::Object(m) => m.get("inviter").and_then(parse_inviter_by),
        _ => None,
    }
}

/// Parse a raw BY leaf: plain id, JSON number, quoted id, or a
/// JSON-encoded legacy `{inviter, invite}` object.
pub fn parse_inviter_by_str(s: &str) -> Option<u64> {
    let t = s.trim();
    if let Ok(id) = t.parse::<u64>() {
        return Some(id);
    }
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(t) {
        if let Some(id) = parse_inviter_by(&v) {
            return Some(id);
        }
    }
    t.trim_matches('"').parse::<u64>().ok()
}

/// Routed BY read (guild table first, legacy flat row second) with legacy
/// shape compat. Leave-decrement consumers must use this instead of a raw
/// `parse::<u64>` so pre-migration rows still decrement.
pub async fn load_inviter_by(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Option<u64> {
    let raw = table_value_or_legacy(pool, guild_id, &format!("USER.{user_id}.INVITES.BY")).await?;
    parse_inviter_by(&raw)
}

/// Post an invites audit embed to the `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs`; silent when absent.
pub async fn post_inv_log(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    title: String,
    description: String,
) {
    let Ok(channels) = guild_id.channels(ctx.http()).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let embed = poise::serenity_prelude::CreateEmbed::default()
        .title(title)
        .description(description);
    let _ = poise::serenity_prelude::ChannelId::new(log_id)
        .send_message(
            ctx.http(),
            poise::serenity_prelude::CreateMessage::new().embed(embed),
        )
        .await;
}

/// Sort desc by invites, stable by user id asc. Mirrors leaderboard tri.
pub fn sort_leaderboard(mut rows: Vec<(u64, InviteStats)>) -> Vec<(u64, InviteStats)> {
    rows.sort_by(|a, b| b.1.invites.cmp(&a.1.invites).then(a.0.cmp(&b.0)));
    rows
}

pub async fn load_invites(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> InviteStats {
    table_value_or_legacy(pool, guild_id, &invites_key(user_id))
        .await
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

pub async fn save_invites(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    stats: &InviteStats,
) -> anyhow::Result<()> {
    guild_backend(pool)
        .table(guild_id)
        .set(&invites_key(user_id), stats)
        .await
}

/// Every tracked user row: guild-table `USER` subtree (`<uid>.INVITES`)
/// first, legacy `USER.%.INVITES` rows filling gaps (table wins).
pub async fn load_all_invites(pool: &crate::db::Pool, guild_id: &str) -> Vec<(u64, InviteStats)> {
    let mut by_user: std::collections::HashMap<u64, InviteStats> = std::collections::HashMap::new();
    let backend = guild_backend(pool);
    if let Ok(Some(root)) = backend
        .table(guild_id)
        .get::<serde_json::Value>("USER")
        .await
    {
        if let Some(users) = root.as_object() {
            for (id, v) in users {
                if id.is_empty() || id.contains('.') {
                    continue;
                }
                let Some(entry) = v.get("INVITES") else {
                    continue;
                };
                if let (Ok(uid), Ok(s)) = (
                    id.parse::<u64>(),
                    serde_json::from_value::<InviteStats>(entry.clone()),
                ) {
                    by_user.insert(uid, s);
                }
            }
        }
    }
    // LIKE `USER.%.INVITES` has a middle wildcard: scan the `USER.` rows
    // via the driver; the loop below keeps only exact-shape hits.
    let rows: Vec<(String, String)> = crate::db::kv_scan_prefix(pool, guild_id, "USER.").await;
    for (k, v) in &rows {
        let Some(id) = k
            .strip_prefix("USER.")
            .and_then(|s| s.strip_suffix(".INVITES"))
        else {
            continue;
        };
        if id.is_empty() || id.contains('.') {
            continue;
        }
        if let Ok(uid) = id.parse::<u64>() {
            if by_user.contains_key(&uid) {
                continue;
            }
            if let Ok(s) = serde_json::from_str::<InviteStats>(v) {
                by_user.insert(uid, s);
            }
        }
    }
    let mut out: Vec<(u64, InviteStats)> = by_user.into_iter().collect();
    out.sort_by_key(|a| a.0);
    out
}

/// Reset path: drops every `<uid>.INVITES` entry from the guild table
/// plus every legacy `USER.%.INVITES` row.
pub async fn delete_all_invites(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    let backend = guild_backend(pool);
    let table = backend.table(guild_id);
    if let Ok(Some(root)) = table.get::<serde_json::Value>("USER").await {
        if let Some(users) = root.as_object() {
            let ids: Vec<String> = users
                .keys()
                .filter(|k| !k.is_empty() && !k.contains('.'))
                .cloned()
                .collect();
            for id in ids {
                let _ = table.delete(&format!("USER.{id}.INVITES")).await;
            }
        }
    }
    // LIKE `USER.%.INVITES` has a middle wildcard: scan the `USER.` rows
    // via the driver and delete the exact-shape hits.
    for (k, _) in crate::db::kv_scan_prefix(pool, guild_id, "USER.").await {
        let Some(id) = k
            .strip_prefix("USER.")
            .and_then(|s| s.strip_suffix(".INVITES"))
        else {
            continue;
        };
        if id.is_empty() || id.contains('.') {
            continue;
        }
        crate::db::kv_del(pool, guild_id, &k).await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_goes_to_bonus_not_regular() {
        let s = add_invites(&InviteStats::default(), 5);
        assert_eq!(s.invites, 5);
        assert_eq!(s.bonus, 5);
        assert_eq!(s.regular, 0);
    }

    #[test]
    fn remove_matches_db_sub_no_floor() {
        // TS uses `db.sub` with no clamp: negatives are allowed.
        let s = remove_invites(
            &InviteStats {
                invites: 3,
                bonus: 3,
                ..Default::default()
            },
            10,
        );
        assert_eq!(s.invites, -7);
        assert_eq!(s.bonus, -7);
    }

    #[test]
    fn inviter_by_accepts_legacy_object_and_raw_forms() {
        // Legacy TS shape written by recordInviterStats.
        let obj: serde_json::Value =
            serde_json::from_str(r#"{"inviter":"123","invite":"abc"}"#).unwrap();
        assert_eq!(parse_inviter_by(&obj), Some(123));
        let obj_num: serde_json::Value =
            serde_json::from_str(r#"{"inviter":456,"invite":"abc"}"#).unwrap();
        assert_eq!(parse_inviter_by(&obj_num), Some(456));
        // Raw-id string (Rust join path) and JSON number.
        assert_eq!(
            parse_inviter_by(&serde_json::Value::String("789".to_string())),
            Some(789)
        );
        assert_eq!(parse_inviter_by(&serde_json::json!(321)), Some(321));
        assert_eq!(parse_inviter_by_str("  654  "), Some(654));
        assert_eq!(
            parse_inviter_by_str(r#"{"inviter":"987","invite":"xyz"}"#),
            Some(987)
        );
        assert_eq!(parse_inviter_by_str("not-an-id"), None);
    }

    #[test]
    fn leaderboard_sorts_desc_then_id() {
        let rows = vec![
            (
                2,
                InviteStats {
                    invites: 5,
                    ..Default::default()
                },
            ),
            (
                1,
                InviteStats {
                    invites: 5,
                    ..Default::default()
                },
            ),
            (
                3,
                InviteStats {
                    invites: 9,
                    ..Default::default()
                },
            ),
        ];
        let sorted = sort_leaderboard(rows);
        assert_eq!(sorted[0].0, 3);
        assert_eq!(sorted[1].0, 1);
        assert_eq!(sorted[2].0, 2);
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        save_invites(
            &pool,
            "g1",
            7,
            &InviteStats {
                invites: 3,
                bonus: 3,
                ..Default::default()
            },
        )
        .await
        .unwrap();
        assert_eq!(load_invites(&pool, "g1", 7).await.invites, 3);
        // Table-routed rows live under `tbl:<gid>`, never as flat legacy rows.
        let legacy: Option<String> = crate::db::kv_get(&pool, "g1", "USER.7.INVITES").await;
        assert_eq!(legacy, None);
        // Legacy rows still read (single + union scan).
        crate::db::kv_set(&pool, "g1", &invites_key(9), r#"{"invites":5}"#)
            .await
            .unwrap();
        assert_eq!(load_invites(&pool, "g1", 9).await.invites, 5);
        assert_eq!(load_all_invites(&pool, "g1").await.len(), 2);
        // Table wins over legacy for the same user.
        crate::db::kv_set(&pool, "g1", &invites_key(7), r#"{"invites":99}"#)
            .await
            .unwrap();
        assert_eq!(load_invites(&pool, "g1", 7).await.invites, 3);
        // Reset clears both stores.
        delete_all_invites(&pool, "g1").await.unwrap();
        assert!(load_all_invites(&pool, "g1").await.is_empty());
        assert_eq!(load_invites(&pool, "g1", 9).await.invites, 0);
    }
}

pub mod addinvites;
pub mod invites;
pub mod leaderboard;
pub mod removeinvites;
pub mod reset;
pub mod see;

/// Old registry path (`invitesmanager::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::addinvites::*;
    pub use super::invites::*;
    pub use super::leaderboard::*;
    pub use super::removeinvites::*;
    pub use super::reset::*;
    pub use super::see::*;
    pub use super::*;
}

/// Older registry path (`invitesmanager::inv::*`) kept working.
#[allow(unused_imports)]
pub mod inv {
    pub use super::addinvites::*;
    pub use super::invites::*;
    pub use super::leaderboard::*;
    pub use super::removeinvites::*;
    pub use super::reset::*;
    pub use super::see::*;
    pub use super::*;
}
