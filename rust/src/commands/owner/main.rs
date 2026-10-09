use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

pub fn blacklist_key(user_id: u64) -> String {
    format!("BLACKLIST.{user_id}")
}

// ---- U-D3-NAMEDTABLES: table-handle routing core ----
// Mirrors the TS `db.table(name)` handles from Events/client/ready.ts
// via `crate::backends::Backend` — the D1 pattern the sibling units
// already use (`Backend::sqlite(pool).table(scope)`, keys unchanged,
// table-first read with legacy kv fallback).
//
// Writes go to BOTH the table handle and legacy kv (dual-write). The
// siblings write table-only, but these tables still have readers in
// files this unit cannot touch (scheduler sweeps, button handlers and
// loaders in locked mod.rs files, db.rs gates, the member-join guard):
// dual-write keeps those readers correct while the table handle
// becomes the primary store. Reads prefer the table and fall back to
// legacy kv, promoting hits so rows migrate lazily. Deletes clear
// both stores.

/// Bot-global legacy scope, mirrors the kv `guild_id = "0"` rows.
pub const GLOBAL_SCOPE: &str = "0";

/// Table-handle backend over the sqlite kv store. Mirrors the
/// `guild_backend` helper in the sibling units.
pub fn table_backend(pool: &crate::db::Pool) -> crate::backends::Backend {
    crate::backends::Backend::sqlite(pool.clone())
}

/// Table-handle read as plain text. Values written via `tbl_set` keep
/// their JSON shape in store, so this returns the canonical text form:
/// strings unwrapped, anything else re-serialized (matches the legacy
/// kv text rows, which callers `from_str` back into structs).
pub async fn tbl_get(pool: &crate::db::Pool, table: &str, key: &str) -> Option<String> {
    let backend = table_backend(pool);
    let v: serde_json::Value = backend.table(table).get(key).await.ok()??;
    match v {
        serde_json::Value::String(s) => Some(s),
        other => serde_json::to_string(&other).ok(),
    }
}

/// Table-handle read as a JSON doc, for walking nested dotted-key
/// roots (`SCHEDULE`, `GIVEAWAY`, `BACKUP`).
pub async fn tbl_get_value(
    pool: &crate::db::Pool,
    table: &str,
    key: &str,
) -> Option<serde_json::Value> {
    let backend = table_backend(pool);
    backend
        .table(table)
        .get::<serde_json::Value>(key)
        .await
        .ok()
        .flatten()
}

/// All rows of one table handle. Used for cross-scope bulk loops
/// (the authrestore secret scan over the global table).
pub async fn tbl_all(pool: &crate::db::Pool, table: &str) -> Vec<(String, serde_json::Value)> {
    let backend = table_backend(pool);
    backend
        .table(table)
        .all()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|row| (row.id, row.value))
        .collect()
}

/// Table-handle write of plain text (dual of `tbl_get`).
pub async fn tbl_set(
    pool: &crate::db::Pool,
    table: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    let backend = table_backend(pool);
    // Store JSON documents as values (TS object semantics); plain strings
    // that are not valid JSON stay strings (legacy kv parity).
    let v: serde_json::Value =
        serde_json::from_str(value).unwrap_or(serde_json::Value::String(value.to_string()));
    backend.table(table).set(key, v).await
}

/// Table-handle delete. Pre-checks existence first: a dotted delete on
/// a missing root would otherwise persist an empty doc. Returns true
/// when the table held the row.
pub async fn tbl_del(pool: &crate::db::Pool, table: &str, key: &str) -> anyhow::Result<bool> {
    if tbl_get_value(pool, table, key).await.is_none() {
        return Ok(false);
    }
    let backend = table_backend(pool);
    let removed = backend.table(table).delete(key).await?;
    Ok(removed > 0)
}

/// Walk a nested table doc by path segments. Backend tables store
/// dotted keys (`SCHEDULE.1.A`) as nested objects under the root
/// (`SCHEDULE`), so bulk loops walk instead of prefix-scanning.
pub fn walk_path<'v>(v: &'v serde_json::Value, path: &[&str]) -> Option<&'v serde_json::Value> {
    let mut cur = v;
    for part in path {
        cur = cur.get(*part)?;
    }
    Some(cur)
}

/// Routed read: table handle first, legacy kv fallback with lazy
/// promotion into the table.
pub async fn routed_get(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
) -> Option<String> {
    if let Some(v) = tbl_get(pool, table, key).await {
        return Some(v);
    }
    let legacy = crate::db::kv_get(pool, legacy_scope, key).await?;
    let _ = tbl_set(pool, table, key, &legacy).await;
    Some(legacy)
}

/// Routed write: legacy kv first (unmigrated kv readers stay fresh),
/// then the table handle.
pub async fn routed_set(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
    value: &str,
) -> anyhow::Result<()> {
    crate::db::kv_set(pool, legacy_scope, key, value).await?;
    tbl_set(pool, table, key, value).await?;
    Ok(())
}

/// Routed delete: clears both stores. Returns true when a row existed
/// in either store.
pub async fn routed_del(
    pool: &crate::db::Pool,
    table: &str,
    legacy_scope: &str,
    key: &str,
) -> anyhow::Result<bool> {
    let had_legacy = crate::db::kv_get(pool, legacy_scope, key).await.is_some();
    crate::db::kv_del(pool, legacy_scope, key).await?;
    let had_table = tbl_del(pool, table, key).await.unwrap_or(false);
    Ok(had_legacy || had_table)
}

/// Legacy kv prefix rows for one scope (the fallback half of table
/// bulk loops; the Backend surface has no prefix scan).
pub async fn legacy_scan(
    pool: &crate::db::Pool,
    scope: &str,
    prefix: &str,
) -> Vec<(String, String)> {
    let like = format!("{prefix}%");
    sqlx::query_as::<_, (String, String)>(
        "SELECT key_name, value FROM kv WHERE guild_id = ? AND key_name LIKE ?",
    )
    .bind(scope)
    .bind(like)
    .fetch_all(pool)
    .await
    .unwrap_or_default()
}

/// Legacy kv prefix delete for one scope.
pub async fn legacy_del_prefix(
    pool: &crate::db::Pool,
    scope: &str,
    prefix: &str,
) -> anyhow::Result<()> {
    let like = format!("{prefix}%");
    sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name LIKE ?")
        .bind(scope)
        .bind(like)
        .execute(pool)
        .await?;
    Ok(())
}

/// Named `blacklist` table handle. Legacy scope "0" and
/// `BLACKLIST.<uid>` keys are unchanged.
pub const BLACKLIST_TABLE: &str = "blacklist";

/// Routed blacklist read. Mirrors `blacklistTable.get(userId)`.
pub async fn bl_get(pool: &crate::db::Pool, user_id: u64) -> Option<String> {
    routed_get(pool, BLACKLIST_TABLE, GLOBAL_SCOPE, &blacklist_key(user_id)).await
}

/// Routed blacklist write (dual-write, mirrors `blacklistTable.set`).
pub async fn bl_set(pool: &crate::db::Pool, user_id: u64, value: &str) -> anyhow::Result<()> {
    routed_set(
        pool,
        BLACKLIST_TABLE,
        GLOBAL_SCOPE,
        &blacklist_key(user_id),
        value,
    )
    .await
}

/// Routed blacklist delete (both stores).
pub async fn bl_del(pool: &crate::db::Pool, user_id: u64) -> anyhow::Result<()> {
    let _ = routed_del(pool, BLACKLIST_TABLE, GLOBAL_SCOPE, &blacklist_key(user_id)).await;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    category = "owner",
    rename = "owner",
    aliases("addowner", "owneradd", "owners", "ownerlist"),
    subcommands(
        "owner_list",
        "owner_add",
        "owner_remove",
        "owner_blacklist",
        "owner_unblacklist",
        "owner_blinfo",
        "owner_bledit"
    )
)]
pub async fn owner(_ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "list")]
pub async fn owner_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Merged view: config owners + persisted owner table.
    // Mirrors getBotOwner() in ownerHelper.ts.
    let owners = crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if owners.is_empty() {
        crate::lang::get(&code, "owner_list_empty").unwrap_or_else(|| "No bot owners.".to_string())
    } else {
        owners.join(", ")
    })
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "add")]
pub async fn owner_add(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Mirrors addGuildOwner (`set(`${guildId}.OWNER.${userId}`)`).
    crate::db::add_guild_owner(&ctx.data().pool, &gid, user.id.get()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "owner_is_now_owner")
            .unwrap_or_else(|| {
                "${member.user.username} is now an owner of the iHorizon Project!".to_string()
            })
            .replace("${member.user.username}", &user.tag()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "remove", aliases("unowner"))]
pub async fn owner_remove(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Mirrors removeGuildOwner (`delete(`${guildId}.OWNER.${userId}`)`).
    crate::db::remove_guild_owner(&ctx.data().pool, &gid, user.id.get()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "unowner_command_work")
            .map(|s| s.replace("${member.username}", &user.tag()))
            .unwrap_or_else(|| "${member.username} is no longer an owner".to_string()),
    )
    .await?;
    Ok(())
}

/// Bot-owner gate. Mirrors ownerHelper.isBotOwner for bot-level ops
/// (merged config + persisted table, i.e. getBotOwner()).
async fn require_bot_owner<'a>(ctx: &Ctx<'a>) -> bool {
    let owners = crate::db::bot_owner_ids(&ctx.data().pool, &ctx.data().config.owners).await;
    if owners
        .iter()
        .any(|o| o == &ctx.author().id.get().to_string())
    {
        return true;
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let msg = crate::lang::get(&code, "blacklist_not_owner").unwrap_or_else(|| {
        "You are not an owner of the iHorizon Project. You can't use this command.".to_string()
    });
    let _ = ctx.say(msg).await;
    false
}

#[poise::command(slash_command, prefix_command, rename = "blacklist", aliases("bl"))]
pub async fn owner_blacklist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "Reason"] reason: Option<String>,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    bl_set(
        &ctx.data().pool,
        user.id.get(),
        &reason.unwrap_or_else(|| {
            crate::lang::get(&code, "blacklist_var_no_reason")
                .unwrap_or_else(|| "No reason found".to_string())
        }),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "blacklist_command_work")
            .unwrap_or_else(|| "${member.user.username} is now blacklisted".to_string())
            .replace("${member.user.username}", &user.tag()),
    )
    .await?;
    Ok(())
}

#[poise::command(slash_command, prefix_command, rename = "unblacklist", aliases("unbl"))]
pub async fn owner_unblacklist(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    bl_del(&ctx.data().pool, user.id.get()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "unblacklist_command_work")
            .map(|s| s.replace("${member.id}", &user.id.get().to_string()))
            .unwrap_or_else(|| "<@${member.id}> is no longer blacklisted".to_string()),
    )
    .await?;
    Ok(())
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "blinfo",
    aliases("blacklistinfo", "lookbl", "blook")
)]
pub async fn owner_blinfo(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    let reason = bl_get(&ctx.data().pool, user.id.get()).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(match reason {
        Some(r) => crate::lang::get(&code, "owner_blinfo_line")
            .map(|s| s.replace("${user}", &user.tag()).replace("${reason}", &r))
            .unwrap_or_else(|| format!("{} blacklisted: {r}", user.tag())),
        None => crate::lang::get(&code, "unblacklist_not_blacklisted")
            .map(|s| s.replace("${member.id}", &user.id.get().to_string()))
            .unwrap_or_else(|| "<@${member.id}> was not blacklisted".to_string()),
    })
    .await?;
    Ok(())
}

/// Edit a blacklist reason. Mirrors !bledit.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "bledit",
    aliases("blacklistedit", "editbl")
)]
pub async fn owner_bledit(
    ctx: Ctx<'_>,
    #[description = "Member"] user: serenity::User,
    #[description = "New reason"] reason: String,
) -> Result<(), anyhow::Error> {
    if !require_bot_owner(&ctx).await {
        return Ok(());
    }
    bl_set(&ctx.data().pool, user.id.get(), reason.trim()).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "bledit_reason_updated")
            .unwrap_or_else(|| "Reason updated.".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn key_layout() {
        assert_eq!(blacklist_key(1), "BLACKLIST.1");
        assert_eq!(BLACKLIST_TABLE, "blacklist");
    }

    #[test]
    fn dotted_keys_walk_nested_docs() {
        let v: serde_json::Value = serde_json::json!({"7": "spam"});
        assert_eq!(walk_path(&v, &["7"]).and_then(|x| x.as_str()), Some("spam"));
        assert_eq!(walk_path(&v, &["9"]), None);
    }

    #[tokio::test]
    async fn table_handle_roundtrip_nests_and_deletes_cleanly() {
        let pool = mem_pool().await;
        assert_eq!(tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7").await, None);
        tbl_set(&pool, BLACKLIST_TABLE, "BLACKLIST.7", "spam")
            .await
            .unwrap();
        assert_eq!(
            tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
                .await
                .as_deref(),
            Some("spam")
        );
        // Dotted keys nest under the root instead of flat rows.
        let root = tbl_get_value(&pool, BLACKLIST_TABLE, "BLACKLIST")
            .await
            .unwrap();
        assert_eq!(
            walk_path(&root, &["7"]).and_then(|x| x.as_str()),
            Some("spam")
        );
        assert!(tbl_del(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
            .await
            .unwrap());
        assert!(!tbl_del(&pool, BLACKLIST_TABLE, "BLACKLIST.7")
            .await
            .unwrap());
        assert_eq!(tbl_get(&pool, BLACKLIST_TABLE, "BLACKLIST.7").await, None);
    }

    #[tokio::test]
    async fn blacklist_roundtrip_hits_table_handle() {
        let pool = mem_pool().await;
        assert_eq!(bl_get(&pool, 7).await, None);
        bl_set(&pool, 7, "spam").await.unwrap();
        assert_eq!(bl_get(&pool, 7).await.as_deref(), Some("spam"));
        // Dual-write: legacy kv readers (db.rs gate, member-join guard)
        // still see the row under the unchanged key.
        assert_eq!(
            crate::db::kv_get(&pool, "0", &blacklist_key(7))
                .await
                .as_deref(),
            Some("spam")
        );
        // And the table handle serves the same row.
        assert_eq!(
            tbl_get(&pool, BLACKLIST_TABLE, &blacklist_key(7))
                .await
                .as_deref(),
            Some("spam")
        );
        bl_del(&pool, 7).await.unwrap();
        assert_eq!(bl_get(&pool, 7).await, None);
        assert_eq!(crate::db::kv_get(&pool, "0", &blacklist_key(7)).await, None);
    }

    #[tokio::test]
    async fn blacklist_falls_back_to_legacy_kv_and_promotes() {
        let pool = mem_pool().await;
        // Legacy-only row (written before the migration, no named table).
        crate::db::kv_set(&pool, "0", &blacklist_key(9), "old")
            .await
            .unwrap();
        assert_eq!(bl_get(&pool, 9).await.as_deref(), Some("old"));
        // Promoted: a second read hits the named table even when the
        // legacy row is gone.
        crate::db::kv_del(&pool, "0", &blacklist_key(9))
            .await
            .unwrap();
        assert_eq!(bl_get(&pool, 9).await.as_deref(), Some("old"));
    }

    #[tokio::test]
    async fn routed_del_reports_existence_across_stores() {
        let pool = mem_pool().await;
        assert!(!routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
        crate::db::kv_set(&pool, "0", &blacklist_key(3), "x")
            .await
            .unwrap();
        assert!(routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
        assert!(!routed_del(&pool, BLACKLIST_TABLE, "0", &blacklist_key(3))
            .await
            .unwrap());
    }

    #[tokio::test]
    async fn legacy_scan_lists_scope_prefix() {
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "GIVEAWAY.1", "a")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "GIVEAWAY.2", "b")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "OTHER.3", "c").await.unwrap();
        let rows = legacy_scan(&pool, "g", "GIVEAWAY.").await;
        assert_eq!(
            rows,
            vec![
                ("GIVEAWAY.1".to_string(), "a".to_string()),
                ("GIVEAWAY.2".to_string(), "b".to_string()),
            ]
        );
        legacy_del_prefix(&pool, "g", "GIVEAWAY.").await.unwrap();
        assert!(legacy_scan(&pool, "g", "GIVEAWAY.").await.is_empty());
        assert_eq!(
            crate::db::kv_get(&pool, "g", "OTHER.3").await.as_deref(),
            Some("c")
        );
    }
}
