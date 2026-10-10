use super::*;
use poise::serenity_prelude as serenity;

/// Table-first rank load with legacy key fallback
/// (`USER.<uid>.XP_LEVELING`, legacy `RANKS.<uid>`).
/// A legacy hit promotes into the new key so rows migrate lazily; pair
/// with `save_rank_routed` (dual-write) so legacy rows stay fresh for
/// direct kv readers.
pub async fn load_rank_routed(pool: &crate::db::Pool, guild_id: &str, user_id: u64) -> RankEntry {
    let new_key = super::user_key_new(user_id);
    let old_key = super::user_key_old(user_id);
    super::migrated_get(pool, guild_id, &new_key, &[&old_key])
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

/// Rank store on the new key with legacy kv dual-write (keys migrated).
pub async fn save_rank_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    user_id: u64,
    entry: &RankEntry,
) -> anyhow::Result<()> {
    let new_key = super::user_key_new(user_id);
    let old_key = super::user_key_old(user_id);
    super::migrated_set(
        pool,
        guild_id,
        &new_key,
        &[&old_key],
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
    let need = xp_needed(e.level + 1);
    let remaining = need.saturating_sub(e.xp);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirror the TS !show embed text (level_embed_* keys) alongside the card.
    let title = crate::lang::get(&code, "level_embed_title")
        .map(|s| s.replace("${user.username}", &name))
        .unwrap_or_else(|| format!("__**XP Level**__: `{name}`"));
    let progress = crate::lang::get(&code, "level_embed_fields1_value")
        .map(|s| {
            s.replace("${currentxp}", &e.xp.to_string())
                .replace("${xpNeeded}", &need.to_string())
        })
        .unwrap_or_else(|| format!("`{}/{}`", e.xp, need));
    let level = crate::lang::get(&code, "level_embed_fields2_value")
        .map(|s| s.replace("${level}", &e.level.to_string()))
        .unwrap_or_else(|| format!("`{}`", e.level));
    let desc = crate::lang::get(&code, "level_embed_description")
        .map(|s| s.replace("${expNeededForLevelUp}", &remaining.to_string()))
        .unwrap_or_else(|| {
            format!("`{remaining}` **experience points needed for the next level!**")
        });
    let svg = crate::cards::rank_card_svg(&name, e.level, e.xp, need, e.xptotal);
    ctx.send(
        poise::CreateReply::default()
            .content(format!("{title}\n{progress} {level}\n{desc}"))
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
    async fn legacy_key_reads_and_promotes_to_new_key() {
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
        // Legacy hit promotes into the new TS-parity key.
        let promoted = crate::db::kv_get(&pool, "g", "USER.1.XP_LEVELING")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<RankEntry>(&promoted).unwrap().level,
            2
        );
        // Unknown users still default.
        assert_eq!(load_rank_routed(&pool, "g", 9).await.level, 0);
    }

    #[tokio::test]
    async fn new_key_wins_over_legacy_on_conflict() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "RANKS.1",
            r#"{"level":9,"xp":0,"xptotal":9000}"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(
            &pool,
            "g",
            "USER.1.XP_LEVELING",
            r#"{"level":1,"xp":5,"xptotal":105}"#,
        )
        .await
        .unwrap();
        let e = load_rank_routed(&pool, "g", 1).await;
        assert_eq!((e.level, e.xp, e.xptotal), (1, 5, 105));
    }

    #[tokio::test]
    async fn save_dual_writes_new_and_legacy_keys() {
        let pool = mem_pool().await;
        let entry = RankEntry {
            level: 3,
            xp: 7,
            xptotal: 307,
        };
        save_rank_routed(&pool, "g", 4, &entry).await.unwrap();
        // Routed save dual-writes, so legacy rows stay fresh for direct kv readers.
        let legacy = crate::db::kv_get(&pool, "g", "RANKS.4").await.unwrap();
        assert_eq!(
            serde_json::from_str::<RankEntry>(&legacy).unwrap().xptotal,
            307
        );
        let stored = crate::db::kv_get(&pool, "g", "USER.4.XP_LEVELING")
            .await
            .unwrap();
        assert_eq!(serde_json::from_str::<RankEntry>(&stored).unwrap().level, 3);
        // Round-trip through the routed loader.
        assert_eq!(load_rank_routed(&pool, "g", 4).await.xptotal, 307);
    }
}
