use super::*;

/// Routed board scan: `USER.<uid>.XP_LEVELING` rows walked first, then
/// legacy-only `RANKS.<uid>` rows. Table values win on uid conflicts,
/// mirroring the D3 merged-scan precedent (economy board_rows).
async fn board_rows(pool: &crate::db::Pool, guild_id: &str) -> Vec<(u64, RankEntry)> {
    use crate::commands::owner::main::{legacy_scan, tbl_get_value};
    use std::collections::BTreeMap;
    let mut merged: BTreeMap<u64, RankEntry> = BTreeMap::new();
    // Legacy compat first (lowest priority): dual-written rows keep both.
    for (k, v) in legacy_scan(pool, guild_id, "RANKS.").await {
        let Ok(id): Result<u64, _> = k.strip_prefix("RANKS.").unwrap_or("").parse() else {
            continue;
        };
        if let Ok(e) = serde_json::from_str::<RankEntry>(&v) {
            merged.insert(id, e);
        }
    }
    if let Some(root) = tbl_get_value(pool, guild_id, "RANKS").await {
        if let Some(obj) = root.as_object() {
            for (id_s, doc) in obj {
                let Ok(id): Result<u64, _> = id_s.parse() else {
                    continue;
                };
                if let Ok(e) = serde_json::from_value::<RankEntry>(doc.clone()) {
                    merged.insert(id, e);
                }
            }
        }
    }
    for (k, v) in legacy_scan(pool, guild_id, "USER.").await {
        let rest = match k.strip_prefix("USER.") {
            Some(r) => r,
            None => continue,
        };
        let (id, tail) = match rest.split_once('.') {
            Some(p) => p,
            None => continue,
        };
        if tail != "XP_LEVELING" {
            continue;
        }
        let Ok(id): Result<u64, _> = id.parse() else {
            continue;
        };
        if let Ok(e) = serde_json::from_str::<RankEntry>(&v) {
            merged.insert(id, e);
        }
    }
    if let Some(root) = tbl_get_value(pool, guild_id, "USER").await {
        if let Some(obj) = root.as_object() {
            for (id_s, node) in obj {
                let Ok(id): Result<u64, _> = id_s.parse() else {
                    continue;
                };
                if let Some(doc) = node.get("XP_LEVELING") {
                    if let Ok(e) = serde_json::from_value::<RankEntry>(doc.clone()) {
                        merged.insert(id, e);
                    }
                }
            }
        }
    }
    let mut parsed: Vec<(u64, RankEntry)> = merged.into_iter().collect();
    parsed.sort_by_key(|a| std::cmp::Reverse(a.1.xptotal));
    parsed
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "leaderboard",
    aliases("rankslb")
)]
pub async fn ranks_leaderboard(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let parsed = board_rows(&ctx.data().pool, &gid).await;
    let svg = crate::cards::podium_svg(
        &parsed
            .iter()
            .take(8)
            .map(|(uid, e)| (format!("<@{uid}>"), e.xptotal))
            .collect::<Vec<_>>(),
    );
    let lvl_word = crate::lang::get(&code, "var_level").unwrap_or_else(|| "Level".to_string());
    let top: Vec<String> = parsed
        .iter()
        .take(15)
        .enumerate()
        .map(|(i, (uid, e))| {
            format!(
                "{}. <@{uid}> — {lvl_word} {} ({} XP)",
                i + 1,
                e.level,
                e.xptotal
            )
        })
        .collect();
    ctx.send(
        poise::CreateReply::default()
            .content(if top.is_empty() {
                crate::lang::get(&code, "perm_list_no_user")
                    .unwrap_or_else(|| "No user found".to_string())
            } else {
                top.join("\n")
            })
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                svg.into_bytes(),
                "podium.svg",
            )),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::board_rows;

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
    async fn board_merges_table_and_legacy_rows_table_wins() {
        use crate::commands::owner::main::table_backend;
        let pool = mem_pool().await;
        // New-key legacy kv row.
        crate::db::kv_set(
            &pool,
            "g",
            "USER.1.XP_LEVELING",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        // Leaf rows under a blob path never double-count.
        crate::db::kv_set(&pool, "g", "USER.1.XP_LEVELING.xp", "9999")
            .await
            .unwrap();
        // Table-only row (dual-written shape, no legacy row).
        table_backend(&pool)
            .table("g")
            .set(
                "USER.2.XP_LEVELING",
                serde_json::json!({"level": 1, "xp": 0, "xptotal": 100}),
            )
            .await
            .unwrap();
        let rows = board_rows(&pool, "g").await;
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].0, 1);
        assert_eq!(rows[1].0, 2);
        assert!(board_rows(&pool, "other").await.is_empty());
        // Dual-written uid: table value wins over the legacy row.
        crate::db::kv_set(
            &pool,
            "g",
            "USER.2.XP_LEVELING",
            r#"{"level":9,"xp":0,"xptotal":9000}"#,
        )
        .await
        .unwrap();
        let rows = board_rows(&pool, "g").await;
        assert_eq!(rows[0].0, 1);
        assert_eq!(rows[0].1.xptotal, 210);
        assert_eq!(rows[1].1.xptotal, 100);
        // Legacy RANKS. rows stay visible for compat.
        crate::db::kv_set(&pool, "g", "RANKS.3", r#"{"level":1,"xp":0,"xptotal":50}"#)
            .await
            .unwrap();
        let rows = board_rows(&pool, "g").await;
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[2].0, 3);
        assert_eq!(rows[2].1.xptotal, 50);
    }

    #[tokio::test]
    async fn xp_leveling_guild_leaves_new_key_wins_legacy_promotes() {
        use crate::commands::ranks::{
            migrated_get, GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD, GUILD_XPCHANNEL_NEW,
            GUILD_XPCHANNEL_OLD_LIST, GUILD_XPCHANNEL_OLD_SINGLE,
        };
        let pool = mem_pool().await;
        // Legacy-only rows read through the migrated loader and promote.
        crate::db::kv_set(&pool, "g", GUILD_XPCHANNEL_OLD_LIST, r#"["5"]"#)
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", GUILD_MESSAGE_OLD, "gg {user}")
            .await
            .unwrap();
        let raw = migrated_get(
            &pool,
            "g",
            GUILD_XPCHANNEL_NEW,
            &[GUILD_XPCHANNEL_OLD_SINGLE, GUILD_XPCHANNEL_OLD_LIST],
        )
        .await
        .unwrap();
        assert_eq!(
            serde_json::from_str::<Vec<String>>(&raw).unwrap(),
            vec!["5".to_string()]
        );
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("gg {user}")
        );
        assert!(crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
            .await
            .is_some());
        // New-key row wins over the legacy row on conflict.
        crate::commands::ranks::migrated_set(
            &pool,
            "g",
            GUILD_MESSAGE_NEW,
            &[GUILD_MESSAGE_OLD],
            "new tpl",
        )
        .await
        .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("new tpl")
        );
        assert!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .is_some()
                && migrated_get(&pool, "other", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                    .await
                    .is_none()
        );
    }
}
