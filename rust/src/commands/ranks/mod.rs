// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/ranks/*.
//
// TS keys: GUILD.XP_LEVELING {disable, xpchannels, bypassChannels[],
// message, ranksRoles{}}, USER.<uid>.XP_LEVELING {level, xp, xptotal}.
// XP engine (message counting) lives in events; card/podHTML->PNG render
// pending (see PORT_INVENTORY.md).
//
// Legacy Rust keys (GUILD.RANKS.*, RANKS.<uid>) still read back and
// promote into the XP_LEVELING keys on load; saves dual-write both so
// kv-only readers (events_handler, leaderboard) stay fresh.

use crate::bot::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RankEntry {
    #[serde(default)]
    pub level: u64,
    #[serde(default)]
    pub xp: u64,
    #[serde(default)]
    pub xptotal: u64,
}

/// Canonical TS guild keys (DbGuildXpLeveling).
pub const GUILD_DISABLE_NEW: &str = "GUILD.XP_LEVELING.disable";
pub const GUILD_XPCHANNEL_NEW: &str = "GUILD.XP_LEVELING.xpchannels";
pub const GUILD_BYPASS_NEW: &str = "GUILD.XP_LEVELING.bypassChannels";
pub const GUILD_MESSAGE_NEW: &str = "GUILD.XP_LEVELING.message";
pub const GUILD_ROLES_NEW: &str = "GUILD.XP_LEVELING.ranksRoles";
/// Legacy Rust guild keys (pre-TS-parity). Read back as fallback.
pub const GUILD_DISABLE_OLD: &str = "GUILD.RANKS.disable";
pub const GUILD_XPCHANNEL_OLD_SINGLE: &str = "GUILD.RANKS.channel";
pub const GUILD_XPCHANNEL_OLD_LIST: &str = "GUILD.RANKS.xpChannels";
pub const GUILD_BYPASS_OLD: &str = "GUILD.RANKS.ignoreChannels";
pub const GUILD_MESSAGE_OLD: &str = "GUILD.RANKS.message";
pub const GUILD_ROLES_OLD: &str = "GUILD.RANKS.roles";

/// Canonical TS user key (XpLevelingUserSchema).
pub fn user_key_new(user_id: u64) -> String {
    format!("USER.{user_id}.XP_LEVELING")
}

/// Legacy Rust user key. Read back as fallback.
pub fn user_key_old(user_id: u64) -> String {
    format!("RANKS.{user_id}")
}

pub fn ranks_key(user_id: u64) -> String {
    user_key_new(user_id)
}

/// Routed read with old-key fallback: the new (TS-parity) key wins, a
/// legacy hit promotes into the new key so rows migrate lazily.
pub async fn migrated_get(
    pool: &crate::db::Pool,
    guild_id: &str,
    new_key: &str,
    old_keys: &[&str],
) -> Option<String> {
    use crate::commands::owner::main::{routed_get, routed_set};
    if let Some(v) = routed_get(pool, guild_id, guild_id, new_key).await {
        return Some(v);
    }
    for old in old_keys {
        if let Some(v) = routed_get(pool, guild_id, guild_id, old).await {
            let _ = routed_set(pool, guild_id, guild_id, new_key, &v).await;
            return Some(v);
        }
    }
    None
}

/// Routed write to the new key plus every legacy key (same bytes), so
/// old-key readers stay fresh while rows migrate.
pub async fn migrated_set(
    pool: &crate::db::Pool,
    guild_id: &str,
    new_key: &str,
    old_keys: &[&str],
    value: &str,
) -> anyhow::Result<()> {
    use crate::commands::owner::main::routed_set;
    routed_set(pool, guild_id, guild_id, new_key, value).await?;
    for old in old_keys {
        routed_set(pool, guild_id, guild_id, old, value).await?;
    }
    Ok(())
}

/// Routed delete across the new key and every legacy key. Returns true
/// when a row existed in either store under any of the keys.
pub async fn migrated_del(
    pool: &crate::db::Pool,
    guild_id: &str,
    new_key: &str,
    old_keys: &[&str],
) -> anyhow::Result<bool> {
    use crate::commands::owner::main::routed_del;
    let mut had = routed_del(pool, guild_id, guild_id, new_key).await?;
    for old in old_keys {
        if routed_del(pool, guild_id, guild_id, old).await? {
            had = true;
        }
    }
    Ok(had)
}

/// XP needed for next level. Mirrors TS level curve (level * 500).
pub fn xp_needed(level: u64) -> u64 {
    level.saturating_mul(500).max(500)
}

/// Coins rewarded on level-up. Mirrors ranks/onNewMessage.ts:
/// `randomNumber * memberBoost` credited via addCoins. The boost is the
/// float-preserving shop multiplier (already fallen back to 1 by
/// `member_boost_f64`); the product stays float like the TS number.
pub fn coins_for_levelup(xp_gain: u64, boost_mult: f64) -> f64 {
    (xp_gain as f64) * boost_mult
}

/// Apply one message of XP with TS onNewMessage.ts parity: the event
/// path defaults a missing/zero level to 1 (`baseData?.level || 1`),
/// then a SINGLE strict-`<` level-up per message. The TS compares the
/// PRE-add xp (`level * 500 < baseData?.xp` on the stale object fetched
/// before the `db.add` calls, `:55-57,:81`), so the threshold is tested
/// against the xp value BEFORE crediting `amount`; credit lands on both
/// `xp` and `xptotal` either way, and a crossing subtracts the crossed
/// threshold and bumps the stored level by 1.
/// Returns (new_entry, leveled).
pub fn apply_xp(mut e: RankEntry, amount: u64) -> (RankEntry, bool) {
    let base = if e.level == 0 { 1 } else { e.level };
    let threshold = base.saturating_mul(500);
    // PRE-add comparison: stale `baseData.xp` like TS (fresh rows carry
    // xp 0/undefined, so the first messages never level).
    let leveled = threshold < e.xp;
    e.xp = e.xp.saturating_add(amount);
    e.xptotal = e.xptotal.saturating_add(amount);
    if leveled {
        e.xp = e.xp.saturating_sub(threshold);
        e.level += 1;
        (e, true)
    } else {
        (e, false)
    }
}

pub async fn load_rank(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> RankEntry {
    // Routed owner: table-first with legacy fallback (see show.rs).
    show::load_rank_routed(pool, guild_id, user_id).await
}

/// Routed owner: dual-write (table + legacy kv) so kv-only readers stay fresh.
pub async fn save_rank(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    entry: &RankEntry,
) -> anyhow::Result<()> {
    show::save_rank_routed(pool, guild_id, user_id, entry).await
}

/// Ignore-list helpers. Mirrors !ignore-channels.ts
/// (GUILD.XP_LEVELING.bypassChannels[], legacy GUILD.RANKS.ignoreChannels[]).
pub fn toggle_ignore(mut list: Vec<String>, channel_id: &str) -> (Vec<String>, bool) {
    if let Some(pos) = list.iter().position(|c| c == channel_id) {
        list.remove(pos);
        (list, false)
    } else {
        list.push(channel_id.to_string());
        (list, true)
    }
}

async fn load_ignore(pool: &crate::db::Pool, guild_id: &str) -> Vec<String> {
    ignore_channels::load_ignore_routed(pool, guild_id).await
}

/// Level-role rewards. Mirrors !roles.ts
/// (GUILD.XP_LEVELING.ranksRoles{}, legacy GUILD.RANKS.roles[]).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RankRole {
    pub role_id: String,
    pub level: u64,
}

/// Vec form (legacy) -> TS map form (`{ "<level>": "<roleId>" }`).
pub fn rank_roles_to_map(roles: &[RankRole]) -> serde_json::Map<String, serde_json::Value> {
    let mut map = serde_json::Map::new();
    for r in roles {
        map.insert(
            r.level.to_string(),
            serde_json::Value::String(r.role_id.clone()),
        );
    }
    map
}

/// TS map form -> vec form. Unknown levels are skipped; numbers coerce.
pub fn rank_roles_from_map(map: &serde_json::Map<String, serde_json::Value>) -> Vec<RankRole> {
    let mut out = Vec::new();
    for (level, role) in map {
        let Ok(level) = level.parse::<u64>() else {
            continue;
        };
        let role_id = match role {
            serde_json::Value::String(s) => s.clone(),
            other => other.to_string().trim_matches('"').to_string(),
        };
        out.push(RankRole { role_id, level });
    }
    out.sort_by_key(|r| r.level);
    out
}

/// Dual-shape parse: TS map (`ranksRoles`) or legacy vec (`roles[]`).
pub fn rank_roles_from_value(v: &serde_json::Value) -> Vec<RankRole> {
    match v {
        serde_json::Value::Object(map) => rank_roles_from_map(map),
        serde_json::Value::Array(arr) => arr
            .iter()
            .filter_map(|e| serde_json::from_value(e.clone()).ok())
            .collect(),
        _ => Vec::new(),
    }
}

async fn load_rank_roles(pool: &crate::db::Pool, guild_id: &str) -> Vec<RankRole> {
    roles::load_rank_roles_routed(pool, guild_id).await
}

/// Highest rank role at or below `new_level` (TS `!roles.ts` add flow
/// picks `ranksRoles[level]`; the level-up path in
/// `Events/ranks/onNewMessage.ts:103-158` picks the highest role with
/// `roleLevel <= newLevel`, assigns it, and removes every other
/// configured rank role the member holds).
/// Returns (role_to_assign, roles_to_remove): `role_to_assign` is Some
/// only when the member does not already hold it; `roles_to_remove`
/// holds the member's other configured rank-role ids.
pub fn rank_role_assignment(
    roles: &[RankRole],
    new_level: u64,
    member_role_ids: &[String],
) -> (Option<String>, Vec<String>) {
    let best = roles
        .iter()
        .filter(|r| r.level <= new_level)
        .max_by_key(|r| r.level)
        .map(|r| r.role_id.clone());
    let Some(assign) = best else {
        return (None, Vec::new());
    };
    let remove = roles
        .iter()
        .map(|r| r.role_id.clone())
        .filter(|id| *id != assign && member_role_ids.iter().any(|m| m == id))
        .collect();
    if member_role_ids.iter().any(|m| m == &assign) {
        (None, remove)
    } else {
        (Some(assign), remove)
    }
}

/// Rank-role table cap. Mirrors `!roles.ts:228-237`: past 25 configured
/// roles the add flow is rejected with `ranks_config_add_max_roles`.
pub const MAX_RANK_ROLES: usize = 25;

/// True when no more rank roles may be configured.
pub fn rank_roles_at_cap(roles: &[RankRole]) -> bool {
    roles.len() >= MAX_RANK_ROLES
}

/// True when `role_id` is already a configured rank-role reward.
/// Mirrors `!roles.ts:321-335` (`ranks_config_add_invalid_role`).
pub fn is_duplicate_rank_role(roles: &[RankRole], role_id: &str) -> bool {
    roles.iter().any(|r| r.role_id == role_id)
}

/// Validate the level modal input. Mirrors `!roles.ts:284-319`: the
/// modal caps at 4 chars (`maxLength: 4`), `parseInt`, and rejects NaN
/// or `<= 0` with `ranks_config_add_invalid_level`. Returns the level
/// on success.
pub fn parse_rank_level_input(input: &str) -> Option<u64> {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed.len() > 4 {
        return None;
    }
    match trimmed.parse::<i64>() {
        Ok(n) if n > 0 => Some(n as u64),
        _ => None,
    }
}

/// Dangerous-role warning flags. Mirrors `getDangerousPermissions`
/// (`core/functions/method.ts`): (Discord permission bit, English
/// fallback name). Names fall back to English because the TS names are
/// guild-lang strings and YAML stays untouched; callers prefer the
/// `setjoinroles_var_perm_*` keys when present.
pub const DANGEROUS_ROLE_PERMS: &[(u64, &str)] = &[
    (0x0000_0008, "Administrator"),
    (0x0000_0020, "Manage Server"),
    (0x1000_0000, "Manage Roles"),
    (0x0002_0000, "Mention Everyone"),
    (0x0000_0004, "Ban Members"),
    (0x0000_0002, "Kick Members"),
    (0x2000_0000, "Manage Webhooks"),
    (0x0000_0010, "Manage Channels"),
    (0x4000_0000, "Manage Expressions"),
    (0x0008_0000, "View Creator Monetization Analytics"),
];

/// English fallback names of the dangerous permissions held by
/// `perm_bits` (serenity `Permissions::bits()`). Mirrors the
/// `!roles.ts:271-282` scan feeding the `ranks_config_add_command_warn`
/// follow-up.
pub fn dangerous_role_perm_names(perm_bits: u64) -> Vec<String> {
    DANGEROUS_ROLE_PERMS
        .iter()
        .filter(|(flag, _)| perm_bits & flag == *flag)
        .map(|(_, name)| name.to_string())
        .collect()
}

/// Compact number display. Mirrors `core/functions/numberBeautifuer.ts`
/// (`formatNumber`, used for the podium `{N_xp}` slots): K/M/B/T with
/// one decimal, otherwise the plain integer with locale grouping
/// (grouping uses `,` like `toLocaleString` en-US).
pub fn beautify_number(num: u64) -> String {
    let n = num as f64;
    if n >= 1_000_000_000_000.0 {
        return format!("{:.1}T", n / 1_000_000_000_000.0);
    }
    if n >= 1_000_000_000.0 {
        return format!("{:.1}B", n / 1_000_000_000.0);
    }
    if n >= 1_000_000.0 {
        return format!("{:.1}M", n / 1_000_000.0);
    }
    if n >= 1_000.0 {
        return format!("{:.1}K", n / 1_000.0);
    }
    let s = num.to_string();
    let mut out = String::with_capacity(s.len() + s.len() / 3);
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(c);
    }
    out
}

/// Minimum level-up template length. Mirrors the `!message.ts:145`
/// modal `minLength: 2` (Discord rejects shorter submissions).
pub const MIN_XP_MESSAGE_LEN: usize = 2;

/// True when a custom level-up template passes the modal length gate.
pub fn xp_message_valid(template: &str) -> bool {
    template.chars().count() >= MIN_XP_MESSAGE_LEN
}

/// Prefix-command detection. Mirrors `parseMessageCommand`
/// (`Events/interaction/messageCommandHandler.ts`): a message consumed
/// as a prefix command never earns XP. The full TS run (cooldowns,
/// perms, dispatch) lives in poise outside the event path, so this
/// mirrors the cheap prefix gate — content starts with the guild prefix
/// (or a bot mention prefix) followed by a command token. Over-skips
/// only unknown `prefix + gibberish` messages; every real prefix
/// command is caught.
pub fn message_is_prefix_command(content: &str, prefix: &str, bot_id: u64) -> bool {
    let after = if !prefix.is_empty() && content.starts_with(prefix) {
        Some(&content[prefix.len()..])
    } else {
        mention_prefix_rest(content, bot_id)
    };
    match after {
        Some(rest) => !rest.trim_start().is_empty(),
        None => false,
    }
}

fn mention_prefix_rest(content: &str, bot_id: u64) -> Option<&str> {
    for cand in [format!("<@{bot_id}>"), format!("<@!{bot_id}>")] {
        if content.starts_with(&cand) {
            return Some(&content[cand.len()..]);
        }
    }
    None
}

pub mod channel;
pub mod config;
pub mod greset;
pub mod ignore_channels;
pub mod leaderboard;
pub mod message;
#[allow(clippy::module_inception)]
pub mod ranks;
pub mod roles;
pub mod show;
pub mod ureset;

/// Old registry path (`ranks::main::*`) kept working.
#[allow(unused_imports)]
pub mod main {
    pub use super::channel::*;
    pub use super::config::*;
    pub use super::greset::*;
    pub use super::ignore_channels::*;
    pub use super::leaderboard::*;
    pub use super::message::*;
    pub use super::ranks::*;
    pub use super::roles::*;
    pub use super::show::*;
    pub use super::ureset::*;
    pub use super::*;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xp_curve_starts_at_500() {
        assert_eq!(xp_needed(0), 500);
        assert_eq!(xp_needed(1), 500);
        assert_eq!(xp_needed(2), 1000);
        assert_eq!(xp_needed(5), 2500);
    }

    #[test]
    fn levelup_reward_scales_with_boost() {
        assert_eq!(coins_for_levelup(35, 1.0), 35.0);
        assert_eq!(coins_for_levelup(37, 3.0), 111.0);
        // Float-preserving like the TS `randomNumber * memberBoost`.
        assert_eq!(coins_for_levelup(35, 2.5), 87.5);
    }

    #[test]
    fn apply_xp_levels_up_on_pre_add_threshold() {
        // TS compares the PRE-add xp (stale baseData): level 1 with 501
        // banked crosses 500 even before this message's credit lands.
        let (e, leveled) = apply_xp(
            RankEntry {
                level: 1,
                xp: 501,
                xptotal: 501,
            },
            35,
        );
        assert!(leveled);
        assert_eq!(e.level, 2);
        assert_eq!(e.xp, 36);
        assert_eq!(e.xptotal, 536);
    }

    #[test]
    fn apply_xp_single_strict_levelup_per_message() {
        // Fresh row defaults to effective level 1 (`|| 1` in TS) but the
        // stale xp is 0, so the first messages never level even with a
        // huge gain (credit still lands on xp/xptotal).
        let (e, leveled) = apply_xp(RankEntry::default(), 35);
        assert!(!leveled);
        assert_eq!((e.level, e.xp, e.xptotal), (0, 35, 35));
        // Strict `<` on the PRE-add value: exactly at the threshold does
        // NOT level; the credit still lands.
        let (e, leveled) = apply_xp(
            RankEntry {
                level: 1,
                xp: 500,
                xptotal: 500,
            },
            35,
        );
        assert!(!leveled);
        assert_eq!((e.level, e.xp), (1, 535));
        // One message levels at most once, even far past the curve; the
        // stale check fires once and the whole credit is kept.
        let (e, leveled) = apply_xp(
            RankEntry {
                level: 1,
                xp: 600,
                xptotal: 600,
            },
            5000,
        );
        assert!(leveled);
        assert_eq!((e.level, e.xp, e.xptotal), (2, 5100, 5600));
    }

    #[test]
    fn apply_xp_no_level() {
        let (e, leveled) = apply_xp(RankEntry::default(), 50);
        assert!(!leveled);
        assert_eq!(e.level, 0);
    }

    #[test]
    fn rank_roles_map_roundtrip() {
        let roles = vec![
            RankRole {
                role_id: "7".to_string(),
                level: 5,
            },
            RankRole {
                role_id: "9".to_string(),
                level: 2,
            },
        ];
        let map = rank_roles_to_map(&roles);
        assert_eq!(map.get("5").and_then(|v| v.as_str()), Some("7"));
        assert_eq!(
            rank_roles_from_map(&map),
            vec![
                RankRole {
                    role_id: "9".to_string(),
                    level: 2
                },
                RankRole {
                    role_id: "7".to_string(),
                    level: 5
                },
            ]
        );
    }

    #[test]
    fn rank_roles_from_legacy_vec() {
        let v = serde_json::json!([{"role_id": "7", "level": 5}]);
        assert_eq!(
            rank_roles_from_value(&v),
            vec![RankRole {
                role_id: "7".to_string(),
                level: 5
            }]
        );
    }

    #[test]
    fn rank_role_assignment_picks_highest_at_or_below_and_cleans_stale() {
        let roles = vec![
            RankRole {
                role_id: "low".to_string(),
                level: 2,
            },
            RankRole {
                role_id: "high".to_string(),
                level: 5,
            },
        ];
        // New level 7, member holds the old low role: assign high,
        // remove low.
        assert_eq!(
            rank_role_assignment(&roles, 7, &["low".to_string()]),
            (Some("high".to_string()), vec!["low".to_string()])
        );
        // Already holding the right role: no assign, still cleans stale.
        assert_eq!(
            rank_role_assignment(&roles, 7, &["low".to_string(), "high".to_string()]),
            (None, vec!["low".to_string()])
        );
        // New level below every role: nothing to do.
        assert_eq!(
            rank_role_assignment(&roles, 1, &[]),
            (None, Vec::<String>::new())
        );
        // Highest role AT the level wins over lower ones.
        assert_eq!(
            rank_role_assignment(&roles, 5, &[]),
            (Some("high".to_string()), Vec::<String>::new())
        );
    }

    #[test]
    fn rank_role_guards_cap_duplicate_and_level() {
        let full: Vec<RankRole> = (1..=25)
            .map(|l| RankRole {
                role_id: l.to_string(),
                level: l as u64,
            })
            .collect();
        assert!(rank_roles_at_cap(&full));
        assert!(!rank_roles_at_cap(&full[..24]));
        assert!(is_duplicate_rank_role(&full, "7"));
        assert!(!is_duplicate_rank_role(&full, "99"));
        assert_eq!(parse_rank_level_input("5"), Some(5));
        assert_eq!(parse_rank_level_input(" 12 "), Some(12));
        assert_eq!(parse_rank_level_input("0"), None);
        assert_eq!(parse_rank_level_input("-3"), None);
        assert_eq!(parse_rank_level_input("abc"), None);
        assert_eq!(parse_rank_level_input(""), None);
        assert_eq!(parse_rank_level_input("12345"), None);
    }

    #[test]
    fn dangerous_perm_names_match_ts_flags() {
        // Administrator (0x8) + BanMembers (0x4).
        assert_eq!(
            dangerous_role_perm_names(0xC),
            vec!["Administrator".to_string(), "Ban Members".to_string()]
        );
        assert!(dangerous_role_perm_names(0).is_empty());
        assert_eq!(dangerous_role_perm_names(0x8).len(), 1);
    }

    #[test]
    fn beautify_number_matches_ts_format() {
        assert_eq!(beautify_number(999), "999");
        assert_eq!(beautify_number(1000), "1.0K");
        assert_eq!(beautify_number(1500), "1.5K");
        assert_eq!(beautify_number(2_500_000), "2.5M");
        assert_eq!(beautify_number(3_000_000_000), "3.0B");
        assert_eq!(beautify_number(1_500_000_000_000), "1.5T");
    }

    #[test]
    fn xp_message_length_gate_matches_modal() {
        assert!(!xp_message_valid("a"));
        assert!(!xp_message_valid(""));
        assert!(xp_message_valid("ab"));
        assert!(xp_message_valid("gg {user}"));
    }

    #[test]
    fn prefix_command_detection_matches_ts_gate() {
        assert!(message_is_prefix_command("?ranks show", "?", 123));
        assert!(message_is_prefix_command("? ranks", "?", 123));
        assert!(!message_is_prefix_command("hello ?", "?", 123));
        assert!(!message_is_prefix_command("?", "?", 123));
        assert!(!message_is_prefix_command("?  ", "?", 123));
        assert!(message_is_prefix_command("<@123>ranks", "?", 123));
        assert!(message_is_prefix_command("<@!123> ranks", "?", 123));
        assert!(!message_is_prefix_command("<@123>", "?", 123));
        assert!(!message_is_prefix_command("hi", "?", 123));
    }

    async fn mem_pool() -> crate::db::Pool {
        use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
        use std::str::FromStr;
        let opts = SqliteConnectOptions::from_str("sqlite::memory:")
            .unwrap()
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE kv (guild_id TEXT NOT NULL, key_name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id, key_name))",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[tokio::test]
    async fn owner_load_rank_prefers_new_key() {
        let pool = mem_pool().await;
        // Legacy-only row surfaces through the owner and promotes.
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_rank(&pool, "g", 1).await.level, 2);
        assert!(crate::db::kv_get(&pool, "g", "USER.1.XP_LEVELING")
            .await
            .is_some());
        // New-key row wins over the legacy row on conflict.
        migrated_set(
            &pool,
            "g",
            &user_key_new(2),
            &[&user_key_old(2)],
            r#"{"level":5,"xp":1,"xptotal":501}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.2",
            r#"{"level":9,"xp":0,"xptotal":9000}"#,
        )
        .await
        .unwrap();
        assert_eq!(load_rank(&pool, "g", 2).await.level, 5);
        assert_eq!(load_rank(&pool, "g", 9).await.level, 0);
    }

    #[tokio::test]
    async fn migrated_set_dual_writes_old_and_new() {
        let pool = mem_pool().await;
        migrated_set(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD], "gg")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
                .await
                .as_deref(),
            Some("gg")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_OLD)
                .await
                .as_deref(),
            Some("gg")
        );
        assert!(
            migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
    }
}
