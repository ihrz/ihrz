use super::*;
use poise::serenity_prelude as serenity;

/// Table-first rank load with legacy kv fallback (keys unchanged).
/// A legacy hit promotes into the table so rows migrate lazily; pair
/// with `save_rank_routed` (dual-write) so kv-only readers
/// (`load_rank`, the XP event path) stay fresh.
pub async fn load_rank_routed(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> RankEntry {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, &ranks_key(user_id))
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Table-first rank store with legacy kv dual-write (keys unchanged).
pub async fn save_rank_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    entry: &RankEntry,
) -> anyhow::Result<()> {
    crate::commands::owner::main::routed_set(
        pool,
        guild_id,
        guild_id,
        &ranks_key(user_id),
        &serde_json::to_string(entry)?,
    )
    .await
}

#[poise::command(
    slash_command,
    prefix_command,
    rename = "show",
    aliases("rsee", "look", "level")
)]
pub async fn ranks_show(
    ctx: Ctx<'_>,
    #[description = "Member"] user: Option<serenity::User>,
) -> Result<(), anyhow::Error> {
    let uid = user
        .as_ref()
        .map(|u| u.id.get())
        .unwrap_or_else(|| ctx.author().id.get());
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let e = load_rank_routed(&ctx.data().pool, &gid, uid).await;
    let name = user
        .as_ref()
        .map(|u| u.name.clone())
        .unwrap_or_else(|| ctx.author().name.clone());
    let svg = crate::cards::rank_card_svg(&name, e.level, e.xp, xp_needed(e.level + 1), e.xptotal);
    ctx.send(
        poise::CreateReply::default()
            .content(format!(
                "Level {} — {}/{} XP (total {})",
                e.level,
                e.xp,
                xp_needed(e.level + 1),
                e.xptotal
            ))
            .attachment(poise::serenity_prelude::CreateAttachment::bytes(
                svg.into_bytes(),
                "rank.svg",
            )),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{load_rank_routed, save_rank_routed};
    use crate::commands::ranks::RankEntry;

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
    async fn legacy_row_reads_and_promotes_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":2,"xp":10,"xptotal":210}"#,
        )
        .await
        .unwrap();
        let e = load_rank_routed(&pool, "g", 1).await;
        assert_eq!((e.level, e.xp, e.xptotal), (2, 10, 210));
        // Legacy hit promotes into the table handle.
        let promoted = tbl_get_value(&pool, "g", "RANKS.1").await.unwrap();
        assert_eq!(promoted.get("level").and_then(|v| v.as_u64()), Some(2));
        // Unknown users still default.
        assert_eq!(load_rank_routed(&pool, "g", 9).await.level, 0);
    }

    #[tokio::test]
    async fn table_wins_over_legacy_on_conflict() {
        use crate::commands::owner::main::table_backend;
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":9,"xp":0,"xptotal":9000}"#,
        )
        .await
        .unwrap();
        table_backend(&pool)
            .table("g")
            .set(
                "RANKS.1",
                serde_json::json!({"level": 1, "xp": 5, "xptotal": 105}),
            )
            .await
            .unwrap();
        let e = load_rank_routed(&pool, "g", 1).await;
        assert_eq!((e.level, e.xp, e.xptotal), (1, 5, 105));
    }

    #[tokio::test]
    async fn save_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        let entry = RankEntry {
            level: 3,
            xp: 7,
            xptotal: 307,
        };
        save_rank_routed(&pool, "g", 4, &entry).await.unwrap();
        // kv-only readers (load_rank, XP event path) stay fresh.
        let legacy = crate::db::kv_get(&pool, "g", "RANKS.4").await.unwrap();
        assert_eq!(
            serde_json::from_str::<RankEntry>(&legacy).unwrap().xptotal,
            307
        );
        let stored = tbl_get_value(&pool, "g", "RANKS.4").await.unwrap();
        assert_eq!(stored.get("level").and_then(|v| v.as_u64()), Some(3));
        // Round-trip through the routed loader.
        assert_eq!(load_rank_routed(&pool, "g", 4).await.xptotal, 307);
    }
}
