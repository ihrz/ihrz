#[allow(unused_imports)]
use super::store::*;

// ---- U-OWNER-DUAL: dual-scope owner/blacklist pure core ----
// Every TS owner file branches `run_for_bot_owner` / `run_for_guild_owner`.
// Bot scope = merged config + persisted bot owners (getBotOwner).
// Guild scope = Discord `ownerId` + stored `OWNER.<uid>` rows (getGuildOwner).
// Blacklist rows are `{blacklisted,reason,owner,createdAt}` with a
// legacy plain-string fallback on read.

/// Blacklist pager size (TS `usersPerPage = 5`).
pub const BL_PAGE_SIZE: usize = 5;

/// Blacklist pager collector lifetime (TS `60_000 * 16`, 16 minutes).
pub const BL_COLLECTOR_SECS: u64 = 60 * 16;

/// Cross-guild sweep batching (TS `batchSize = 10`, `delay = 100`).
pub const SWEEP_BATCH: usize = 10;
pub const SWEEP_DELAY_MS: u64 = 100;

/// Cross-guild sweep guild filter (TS `memberCount <= 500`).
pub const SWEEP_MAX_MEMBERS: u64 = 500;

/// Transphobia unblacklist refusal. Hardcoded in TS `unblacklist.ts`
/// (no YAML key); mirrored verbatim.
pub const TRANSPHOBIA_REFUSAL: &str = " | **Transphobia is a dangerous behavior, and in this case, it was even directed towards project staff. I will not remove him from the blacklist.**";
/// One blacklist row. Mirrors the TS entry shape.
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct BlEntry {
    pub reason: Option<String>,
    pub owner: Option<String>,
    pub created_at_ms: Option<i64>,
}

/// Encode a blacklist entry. Mirrors the TS `blacklistTable.set(id, {...})`.
pub fn bl_entry_json(reason: &str, owner_id: u64, created_at_ms: i64) -> String {
    serde_json::json!({
        "blacklisted": true,
        "reason": reason,
        "owner": owner_id.to_string(),
        "createdAt": created_at_ms,
    })
    .to_string()
}

/// Decode a blacklist row, accepting the legacy plain-string shape.
/// A JSON doc yields its leaves; anything else is the reason itself.
pub fn parse_bl_entry(raw: &str) -> BlEntry {
    let Ok(serde_json::Value::Object(map)) = serde_json::from_str::<serde_json::Value>(raw) else {
        return BlEntry {
            reason: Some(raw.to_string()),
            ..Default::default()
        };
    };
    let owner = map.get("owner").and_then(|v| {
        v.as_str()
            .map(|s| s.to_string())
            .or_else(|| v.as_u64().map(|n| n.to_string()))
    });
    BlEntry {
        reason: map
            .get("reason")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        owner,
        created_at_ms: map
            .get("createdAt")
            .and_then(|v| v.as_i64().or_else(|| v.as_u64().map(|n| n as i64))),
    }
}

/// Rebuild an entry with a new reason, preserving owner/createdAt.
/// Mirrors the TS `blacklistTable.set(`${id}.reason`, ...)` leaf write.
pub fn bl_entry_with_reason(raw: &str, new_reason: &str) -> String {
    let old = parse_bl_entry(raw);
    let mut map = serde_json::Map::new();
    map.insert("blacklisted".to_string(), serde_json::Value::Bool(true));
    map.insert(
        "reason".to_string(),
        serde_json::Value::String(new_reason.to_string()),
    );
    if let Some(owner) = old.owner {
        map.insert("owner".to_string(), serde_json::Value::String(owner));
    }
    if let Some(created) = old.created_at_ms {
        map.insert(
            "createdAt".to_string(),
            serde_json::Value::Number(serde_json::Number::from(created)),
        );
    }
    serde_json::Value::Object(map).to_string()
}

/// Transphobia guard from TS `run_for_bot_owner` (unblacklist).
pub fn is_transphobia_reason(reason: &str) -> bool {
    reason.to_lowercase().contains("transphobia")
}

/// Format one blacklist line. Mirrors the TS page-content map.
pub fn format_bl_line(user_id: u64, entry: &BlEntry, unknown: &str, no_reason: &str) -> String {
    let date = entry
        .created_at_ms
        .map(format_bl_date)
        .unwrap_or_else(|| unknown.to_string());
    format!(
        "<@{user_id}>\n├─ {date}\n├─ `{}`\n├─ By {}",
        entry.reason.as_deref().unwrap_or(no_reason),
        entry.owner.as_deref().unwrap_or(unknown)
    )
}

/// Build 5-per-page pager pages. The title template's
/// `${i / usersPerPage + 1}` placeholder becomes the 1-based page no.
pub fn bl_pages(
    entries: &[(u64, BlEntry)],
    title_tpl: &str,
    unknown: &str,
    no_reason: &str,
) -> Vec<(String, String)> {
    entries
        .chunks(BL_PAGE_SIZE)
        .enumerate()
        .map(|(i, chunk)| {
            let title = title_tpl.replace("${i / usersPerPage + 1}", &(i + 1).to_string());
            let desc = chunk
                .iter()
                .map(|(uid, e)| format_bl_line(*uid, e, unknown, no_reason))
                .collect::<Vec<_>>()
                .join("\n");
            (title, desc)
        })
        .collect()
}

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/// `MMM DD YYYY` for unix millis. Mirrors `format(date, "MMM DD YYYY")`.
pub fn format_bl_date(ms: i64) -> String {
    let days = ms.div_euclid(86_400_000);
    // Civil-from-days (Howard Hinnant's algorithm).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    format!("{} {:02} {}", MONTHS[(m - 1) as usize], d, year)
}
/// Guild-scoped raw blacklist row. Mirrors
/// `client.db.get(`${guildId}.BLACKLIST.${userId}`)`.
pub async fn gbl_raw(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Option<String> {
    routed_get(pool, guild_id, guild_id, &blacklist_key(user_id)).await
}

/// Guild-scoped reason lookup (entry shape + legacy fallback).
pub async fn gbl_get(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> Option<String> {
    gbl_raw(pool, guild_id, user_id)
        .await
        .map(|raw| parse_bl_entry(&raw).reason.unwrap_or(raw))
}

/// Guild-scoped blacklist write (dual-write, keys unchanged).
pub async fn gbl_set(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    value: &str,
) -> anyhow::Result<()> {
    routed_set(pool, guild_id, guild_id, &blacklist_key(user_id), value).await
}

/// Guild-scoped blacklist delete (both stores). Returns true when a row
/// existed in either store, mirroring `client.db.delete` returning the
/// previous value (which the TS unblacklist guild leg uses as its
/// existence check).
pub async fn gbl_del(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> anyhow::Result<bool> {
    routed_del(pool, guild_id, guild_id, &blacklist_key(user_id)).await
}

/// Merge table-handle rows with legacy kv rows for one blacklist scope.
/// Table wins on conflict; sorted by numeric uid for stable pages.
/// Order note (O8, cosmetic): TS renders insertion order while this
/// keeps numeric-uid order, so page contents can differ in sequence
/// but never in membership. Numeric order is kept deliberately for
/// stable pagination across merged stores.
fn merge_bl_rows(
    table_rows: Vec<(String, String)>,
    legacy_rows: Vec<(String, String)>,
) -> Vec<(u64, BlEntry)> {
    use std::collections::HashMap;
    let mut raws: HashMap<u64, String> = HashMap::new();
    for (key, value) in legacy_rows {
        if let Some(uid) = key
            .strip_prefix("BLACKLIST.")
            .and_then(|s| s.parse::<u64>().ok())
        {
            raws.entry(uid).or_insert(value);
        }
    }
    for (key, value) in table_rows {
        if let Some(uid) = key
            .strip_prefix("BLACKLIST.")
            .and_then(|s| s.parse::<u64>().ok())
        {
            raws.insert(uid, value);
        }
    }
    let mut out: Vec<(u64, BlEntry)> = raws
        .into_iter()
        .map(|(uid, raw)| (uid, parse_bl_entry(&raw)))
        .collect();
    out.sort_by_key(|(uid, _)| *uid);
    out
}

/// Raw leaf text of a nested table doc child: JSON docs re-serialized,
/// pre-encoded strings decoded once.
fn leaf_raw(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        other => serde_json::to_string(other).unwrap_or_default(),
    }
}

/// All global blacklist entries (named table + legacy scope "0").
pub async fn bl_list(pool: &crate::db::Pool) -> Vec<(u64, BlEntry)> {
    let mut table_rows: Vec<(String, String)> = vec![];
    if let Some(root) = tbl_get_value(pool, BLACKLIST_TABLE, "BLACKLIST").await {
        if let Some(map) = root.as_object() {
            for (uid, v) in map {
                table_rows.push((format!("BLACKLIST.{uid}"), leaf_raw(v)));
            }
        }
    }
    merge_bl_rows(
        table_rows,
        legacy_scan(pool, GLOBAL_SCOPE, "BLACKLIST.").await,
    )
}

/// All guild-scoped blacklist entries (table `gid` + legacy scope `gid`).
pub async fn gbl_list(pool: &crate::db::Pool, guild_id: &str) -> Vec<(u64, BlEntry)> {
    let mut table_rows: Vec<(String, String)> = vec![];
    if let Some(root) = tbl_get_value(pool, guild_id, "BLACKLIST").await {
        if let Some(map) = root.as_object() {
            for (uid, v) in map {
                table_rows.push((format!("BLACKLIST.{uid}"), leaf_raw(v)));
            }
        }
    }
    merge_bl_rows(table_rows, legacy_scan(pool, guild_id, "BLACKLIST.").await)
}
