use super::*;
use super::{
    create::backup_create, delete::backup_delete, list::backup_list, load::backup_load,
    manage::backup_manage,
};

/// Subcommand for backup category!
#[poise::command(
    slash_command,
    prefix_command,
    category = "backup",
    rename = "backup",
    subcommands(
        "backup_create",
        "backup_list",
        "backup_load",
        "backup_delete",
        "backup_manage"
    ),
    subcommand_required
)]
pub async fn backup(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

// ---- U-BACKUP-OWN: per-user ownership ----
// TS keeps snapshots in metasTable under BACKUPS.<uid>.<id> (see
// !create.ts:89, !list.ts:67, !load.ts:93, !delete.ts:61): a backup
// belongs to the creating user, and load/delete/list gate strangers
// with backup_this_is_not_your_backup. The Rust kv store is
// guild-scoped, so the metasTable equivalent lives under guild "0"
// (same convention as the bot-scope helpers in core/mod.rs).
use crate::commands::owner::main::legacy_scan;

/// metasTable-equivalent scope for per-user backup rows.
pub const BACKUPS_SCOPE: &str = "0";
/// Nested root holding every per-user snapshot (metasTable parity).
pub const BACKUPS_ROOT: &str = "BACKUPS";
/// List page size. Mirrors itemsPerPage in !list.ts:37.
pub const BACKUPS_PER_PAGE: usize = 5;

/// metasTable key for one user's backup. Mirrors
/// `BACKUPS.${userId}.${backupId}`.
pub fn backup_user_key(user_id: u64, backup_id: &str) -> String {
    format!("{BACKUPS_ROOT}.{user_id}.{backup_id}")
}

/// kv prefix selecting one user's backups (bulk loop half).
pub fn user_backup_prefix(user_id: u64) -> String {
    format!("{BACKUPS_ROOT}.{user_id}.")
}

/// Snapshot read: named `backups` table first (TS parity —
/// src/core/backup/src/index.ts:300 keys rows by global backupID),
/// legacy per-user kv row fallback (never dropped: Rust-only snapshots
/// predate the table write).
/// NOTE: no lazy promotion — kv rows hold the full BackupInfos while
/// the table holds the bare BackupData; promoting would corrupt the TS
/// shape. Callers needing an ownership proof use `bkp_owns`, never this
/// fallback: a shared-table row alone never proves ownership.
pub async fn bkp_get(pool: &crate::db::Pool, user_id: u64, backup_id: &str) -> Option<String> {
    if let Some(shared) = crate::db::backup_get(pool, backup_id).await {
        return Some(shared);
    }
    crate::db::kv_get(pool, BACKUPS_SCOPE, &backup_user_key(user_id, backup_id)).await
}

pub async fn bkp_set(
    pool: &crate::db::Pool,
    user_id: u64,
    backup_id: &str,
    value: &str,
) -> anyhow::Result<()> {
    // Dual-write (routed_set pattern): legacy kv row first so
    // unmigrated per-user readers stay fresh, then the named table row.
    crate::db::kv_set(
        pool,
        BACKUPS_SCOPE,
        &backup_user_key(user_id, backup_id),
        value,
    )
    .await?;
    crate::db::ensure_backups_table(pool).await?;
    crate::db::backup_set(pool, backup_id, value).await
}

pub async fn bkp_del(pool: &crate::db::Pool, user_id: u64, backup_id: &str) -> anyhow::Result<()> {
    // Clears both stores (routed_del pattern): the per-user pointer and
    // the shared snapshot row (`client.backup.remove(backupID)` in
    // !delete.ts:134).
    crate::db::kv_del(pool, BACKUPS_SCOPE, &backup_user_key(user_id, backup_id)).await?;
    crate::db::backup_del(pool, backup_id).await
}

/// Ownership pointer check (kv only, never the shared table). Gates the
/// stranger rejection like the `BACKUPS.<uid>.<id>` lookup in
/// !delete.ts:59 / !list.ts:64 / !load.ts:90.
pub async fn bkp_owns(pool: &crate::db::Pool, user_id: u64, backup_id: &str) -> bool {
    crate::db::kv_get(pool, BACKUPS_SCOPE, &backup_user_key(user_id, backup_id))
        .await
        .is_some()
}

/// One user's backups as (id, snapshot) pairs, sorted by id.
/// Deliberate keep: TS walks the `BACKUPS.${userId}` object in
/// insertion order (!list.ts:87-105); the kv port sorts so pages are
/// stable across restarts.
pub async fn bkp_scan_user(pool: &crate::db::Pool, user_id: u64) -> Vec<(String, String)> {
    let prefix = user_backup_prefix(user_id);
    let mut rows = legacy_scan(pool, BACKUPS_SCOPE, &prefix).await;
    rows.sort();
    rows.into_iter()
        .filter_map(|(k, v)| k.strip_prefix(&prefix).map(|id| (id.to_string(), v)))
        .collect()
}

/// onlyOwner flag. TS !manage.ts stores booleans, the Rust port stores
/// "1"/"0"; both read back as text here. Unset (None) is owner-only,
/// like the TS `state === undefined` branch.
pub fn backup_owner_only(raw: Option<&str>) -> bool {
    match raw {
        None => true,
        Some(s) => {
            let s = s.trim().to_ascii_lowercase();
            s != "0" && s != "false"
        }
    }
}

/// Guild's onlyOwner flag (GUILD.BACKUP.onlyOwner).
pub async fn backup_only_owner(pool: &crate::db::Pool, gid: &str) -> bool {
    let raw = crate::db::kv_get(pool, gid, "GUILD.BACKUP.onlyOwner").await;
    backup_owner_only(raw.as_deref())
}

/// Bot Administrator gate. Mirrors the members.me check in !load.ts:73.
pub async fn bot_is_guild_admin(ctx: &Ctx<'_>) -> bool {
    let Some(guild_id) = ctx.guild_id() else {
        return false;
    };
    let bot_id = ctx.serenity_context().cache.current_user().id;
    // Snapshot out of the cache guard: the guard is not Send across awaits.
    if let Some(guild) = ctx.guild() {
        if let Some(member) = guild.members.get(&bot_id) {
            return guild.member_permissions(member).administrator();
        }
    }
    // Cache miss: fetch our member row, then compute against the cached roles.
    if let Ok(member) = guild_id.member(ctx.http(), bot_id).await {
        if let Some(guild) = ctx.guild() {
            return guild.member_permissions(&member).administrator();
        }
    }
    false
}

/// Display summary parsed from a stored BackupInfos doc:
/// (guild name, category count, channel count). Mirrors the
/// `{guildName, categoryCount, channelCount}` meta written in
/// !create.ts:82-91 (children only; `others` are never counted).
/// TS per-user rows hold exactly that bare meta (the full snapshot
/// lives in the shared `backups` table), so accept both shapes.
pub fn backup_summary(raw: &str) -> Option<(String, usize, usize)> {
    if let Ok(infos) = serde_json::from_str::<BackupInfos>(raw) {
        let cats = infos.data.channels.categories.len();
        let chans = infos
            .data
            .channels
            .categories
            .iter()
            .map(|c| c.children.len())
            .sum::<usize>();
        return Some((infos.data.name, cats, chans));
    }
    backup_meta(raw)
}

/// Bare TS meta row (`{guildName, categoryCount, channelCount}` from
/// !create.ts:82-91): the per-user pointer shape, without a snapshot.
pub fn backup_meta(raw: &str) -> Option<(String, usize, usize)> {
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    Some((
        v.get("guildName")?.as_str()?.to_string(),
        v.get("categoryCount")?.as_u64()? as usize,
        v.get("channelCount")?.as_u64()? as usize,
    ))
}

/// One list row. Mirrors !list.ts:101
/// (`${guildName} - (||${id}||)` + backup_string_see_another_v).
pub fn backup_field(
    guild_name: &str,
    backup_id: &str,
    categories: usize,
    channels: usize,
    tpl: &str,
) -> (String, String) {
    let name = format!("{guild_name} - (||{backup_id}||)");
    let value = tpl
        .replace("${result.categoryCount}", &categories.to_string())
        .replace("${result.channelCount}", &channels.to_string());
    (name, value)
}

/// Page count for the 5-per-page list pager.
pub fn page_count(total: usize) -> usize {
    total.div_ceil(BACKUPS_PER_PAGE)
}

/// True when the invoker owns the guild or holds ADMINISTRATOR.
/// Gates the shared-snapshot fallback in load: strangers without a
/// per-user pointer get backup_this_is_not_your_backup (!load.ts:90).
pub async fn invoker_is_owner_or_admin(ctx: &Ctx<'_>) -> bool {
    let author = ctx.author().id;
    let Some(guild) = ctx.guild() else {
        return false;
    };
    if guild.owner_id == author {
        return true;
    }
    guild
        .members
        .get(&author)
        .map(|m| guild.member_permissions(m).administrator())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::super::gen_backup_id;
    use super::{
        backup_field, backup_meta, backup_owner_only, backup_summary, backup_user_key, bkp_del,
        bkp_get, bkp_owns, bkp_scan_user, bkp_set, page_count, user_backup_prefix,
        BACKUPS_PER_PAGE, BACKUPS_ROOT, BACKUPS_SCOPE,
    };

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    fn sample_snapshot() -> String {
        serde_json::json!({
            "id": "abc123",
            "size": 1.5,
            "data": {
                "name": "Test Guild",
                "verificationLevel": 0,
                "explicitContentFilter": 0,
                "defaultMessageNotifications": 0,
                "widget": { "enabled": false },
                "channels": {
                    "categories": [
                        { "name": "cat", "permissions": [], "children": [] }
                    ],
                    "others": []
                },
                "roles": [],
                "bans": [],
                "emojis": [],
                "members": [],
                "createdTimestamp": 0,
                "guildID": "999",
                "id": "abc123"
            }
        })
        .to_string()
    }

    #[test]
    fn keys_mirror_metastable_shape() {
        assert_eq!(BACKUPS_ROOT, "BACKUPS");
        assert_eq!(BACKUPS_SCOPE, "0");
        assert_eq!(BACKUPS_PER_PAGE, 5);
        assert_eq!(backup_user_key(7, "abc"), "BACKUPS.7.abc");
        assert_eq!(user_backup_prefix(7), "BACKUPS.7.");
        assert_eq!(gen_backup_id().len(), 16);
    }

    #[test]
    fn owner_flag_matches_ts_branches() {
        // Unset (undefined/null in TS) is owner-only.
        assert!(backup_owner_only(None));
        // Rust manage writes "1"/"0".
        assert!(backup_owner_only(Some("1")));
        assert!(!backup_owner_only(Some("0")));
        // TS manage writes booleans.
        assert!(backup_owner_only(Some("true")));
        assert!(!backup_owner_only(Some("false")));
        assert!(!backup_owner_only(Some("FALSE")));
    }

    #[test]
    fn summary_and_fields_mirror_ts_templates() {
        let (name, cats, chans) = backup_summary(&sample_snapshot()).unwrap();
        assert_eq!((name.as_str(), cats, chans), ("Test Guild", 1, 0));
        assert!(backup_summary("not json").is_none());
        let (fname, fvalue) = backup_field(
            "Test Guild",
            "abc123",
            1,
            0,
            ":placard:・`${result.categoryCount}` :hash:・`${result.channelCount}`",
        );
        assert_eq!(fname, "Test Guild - (||abc123||)");
        assert_eq!(fvalue, ":placard:・`1` :hash:・`0`");
    }

    #[test]
    fn summary_counts_children_only_like_create_meta() {
        // !create.ts:75-80 counts category children only; `others`
        // never land in channelCount.
        let raw = sample_snapshot().replace(
            "\"others\":[]",
            "\"others\":[{\"type\":2,\"name\":\"lonely\",\"permissions\":[],\"bitrate\":64000,\"userLimit\":0},{\"type\":2,\"name\":\"stray\",\"permissions\":[],\"bitrate\":64000,\"userLimit\":0}]",
        );
        let (_, cats, chans) = backup_summary(&raw).unwrap();
        assert_eq!((cats, chans), (1, 0));
    }

    #[test]
    fn summary_accepts_bare_ts_meta_rows() {
        // !create.ts:82-91 per-user pointer shape (no snapshot).
        let meta = r#"{"guildName":"TS Guild","categoryCount":3,"channelCount":12}"#;
        assert_eq!(backup_summary(meta), Some(("TS Guild".to_string(), 3, 12)));
        assert_eq!(backup_meta(meta), Some(("TS Guild".to_string(), 3, 12)));
        assert!(backup_meta("not json").is_none());
        assert!(backup_meta(r#"{"guildName":"x"}"#).is_none());
    }

    #[test]
    fn pages_hold_five_each() {
        assert_eq!(page_count(0), 0);
        assert_eq!(page_count(1), 1);
        assert_eq!(page_count(5), 1);
        assert_eq!(page_count(6), 2);
        assert_eq!(page_count(11), 3);
    }

    #[tokio::test]
    async fn bkp_roundtrip_per_user_key() {
        let pool = mem_pool().await;
        assert_eq!(bkp_get(&pool, 7, "id1").await, None);
        bkp_set(&pool, 7, "id1", "{\"n\":1}").await.unwrap();
        assert_eq!(bkp_get(&pool, 7, "id1").await.as_deref(), Some("{\"n\":1}"));
        // metasTable-equivalent row, verbatim key.
        assert_eq!(
            crate::db::kv_get(&pool, "0", "BACKUPS.7.id1")
                .await
                .as_deref(),
            Some("{\"n\":1}")
        );
        bkp_del(&pool, 7, "id1").await.unwrap();
        assert_eq!(bkp_get(&pool, 7, "id1").await, None);
        assert_eq!(crate::db::kv_get(&pool, "0", "BACKUPS.7.id1").await, None);
    }

    #[tokio::test]
    async fn users_are_isolated_like_ts() {
        let pool = mem_pool().await;
        bkp_set(&pool, 7, "shared", "mine").await.unwrap();
        // Ownership pointers and scans stay per-user (!delete.ts:59,
        // !list.ts:64): another user owns nothing and scans nothing, so
        // the delete/list gates (on `bkp_owns`) reject strangers before
        // any delete runs.
        assert!(!bkp_owns(&pool, 8, "shared").await);
        assert!(bkp_scan_user(&pool, 8).await.is_empty());
        assert_eq!(bkp_get(&pool, 7, "shared").await.as_deref(), Some("mine"));
        bkp_del(&pool, 7, "shared").await.unwrap();
        assert!(!bkp_owns(&pool, 7, "shared").await);
        assert_eq!(bkp_get(&pool, 7, "shared").await, None);
    }

    #[tokio::test]
    async fn bkp_scan_user_returns_sorted_ids() {
        let pool = mem_pool().await;
        bkp_set(&pool, 7, "b-id", "2").await.unwrap();
        bkp_set(&pool, 7, "a-id", "1").await.unwrap();
        bkp_set(&pool, 8, "a-id", "other").await.unwrap();
        let rows = bkp_scan_user(&pool, 7).await;
        assert_eq!(
            rows,
            vec![
                ("a-id".to_string(), "1".to_string()),
                ("b-id".to_string(), "2".to_string()),
            ]
        );
    }

    #[tokio::test]
    async fn bkp_get_prefers_named_table_with_kv_fallback() {
        // D3-BACKUP: named `backups` table is primary, the per-user kv
        // row is the legacy fallback (never dropped).
        let pool = mem_pool().await;
        assert_eq!(bkp_get(&pool, 7, "id1").await, None);
        // Legacy-only row (pre-table snapshot) still reads.
        crate::db::kv_set(&pool, "0", "BACKUPS.7.legacy", "v1")
            .await
            .unwrap();
        assert_eq!(bkp_get(&pool, 7, "legacy").await.as_deref(), Some("v1"));
        // Table row wins when both stores hold the id (fresher: TS-side
        // edits only touch the table).
        crate::db::ensure_backups_table(&pool).await.unwrap();
        crate::db::backup_set(&pool, "legacy", "v2").await.unwrap();
        assert_eq!(bkp_get(&pool, 7, "legacy").await.as_deref(), Some("v2"));
        // Other users share the table row (global backupID); ownership
        // stays a kv-pointer question answered by `bkp_owns`.
        assert_eq!(bkp_get(&pool, 8, "legacy").await.as_deref(), Some("v2"));
        assert!(!bkp_owns(&pool, 8, "legacy").await);
    }

    #[tokio::test]
    async fn bkp_set_dual_writes_both_stores() {
        let pool = mem_pool().await;
        bkp_set(&pool, 7, "id1", "v1").await.unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "0", "BACKUPS.7.id1")
                .await
                .as_deref(),
            Some("v1")
        );
        assert_eq!(
            crate::db::backup_get(&pool, "id1").await.as_deref(),
            Some("v1")
        );
        assert_eq!(bkp_get(&pool, 7, "id1").await.as_deref(), Some("v1"));
    }

    #[tokio::test]
    async fn bkp_del_clears_both_stores() {
        // Mirrors `client.backup.remove(backupID)` in !delete.ts:134 plus
        // the per-user pointer delete; a missing id stays a harmless
        // no-op (callers rely on the best-effort contract).
        let pool = mem_pool().await;
        bkp_del(&pool, 7, "gone").await.unwrap();
        assert_eq!(crate::db::backup_get(&pool, "gone").await, None);
        bkp_set(&pool, 7, "gone", "v1").await.unwrap();
        bkp_del(&pool, 7, "gone").await.unwrap();
        assert_eq!(bkp_get(&pool, 7, "gone").await, None);
        assert_eq!(crate::db::kv_get(&pool, "0", "BACKUPS.7.gone").await, None);
        assert_eq!(crate::db::backup_get(&pool, "gone").await, None);
        // Second delete of the same missing row is equally harmless.
        bkp_del(&pool, 7, "gone").await.unwrap();
        assert_eq!(bkp_get(&pool, 7, "gone").await, None);
    }

    #[tokio::test]
    async fn bkp_owns_checks_kv_pointer_only() {
        // A shared-table row alone never proves ownership (!delete.ts:59:
        // strangers get backup_this_is_not_your_backup).
        let pool = mem_pool().await;
        crate::db::ensure_backups_table(&pool).await.unwrap();
        crate::db::backup_set(&pool, "shared", "ts-row")
            .await
            .unwrap();
        assert!(!bkp_owns(&pool, 7, "shared").await);
        assert!(!bkp_owns(&pool, 8, "shared").await);
        bkp_set(&pool, 7, "shared", "mine").await.unwrap();
        assert!(bkp_owns(&pool, 7, "shared").await);
        assert!(!bkp_owns(&pool, 8, "shared").await);
        bkp_del(&pool, 7, "shared").await.unwrap();
        assert!(!bkp_owns(&pool, 7, "shared").await);
    }
}
