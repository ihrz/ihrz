use super::*;

/// Table-first tuning-leaf read with legacy kv fallback (keys unchanged).
/// Mirrors the mod.rs `leaf_num` owner over the routed store: a legacy hit
/// promotes into the table so rows migrate lazily.
pub async fn leaf_num_routed(pool: &crate::db::Pool, guild_id: &str, key: &str) -> Option<f64> {
    crate::commands::owner::main::routed_get(pool, guild_id, guild_id, key)
        .await
        .and_then(|s| parse_leaf_num(&s))
}

/// Table-first claim-tuning load (leaf-first, then legacy blob, then
/// default), mirroring the mod.rs `load_tuning` owner over the routed
/// store. A stored 0 stays 0, mirroring the TS `??` fallback which only
/// applies to null.
pub async fn load_tuning_routed(pool: &crate::db::Pool, guild_id: &str, kind: &str) -> ClaimTuning {
    let def = default_tuning(kind);
    let legacy = crate::commands::owner::main::routed_get(
        pool,
        guild_id,
        guild_id,
        &format!("ECONOMY.settings.{kind}"),
    )
    .await
    .and_then(|s| blob_tuning(&s, kind));
    let amount = leaf_num_routed(pool, guild_id, &format!("ECONOMY.settings.{kind}.amount"))
        .await
        .or_else(|| legacy.as_ref().map(|t| t.amount))
        .unwrap_or(def.amount);
    let cooldown_ms = leaf_num_routed(pool, guild_id, &format!("ECONOMY.settings.{kind}.cooldown"))
        .await
        .map(|f| f as i64)
        .or_else(|| legacy.map(|t| t.cooldown_ms))
        .unwrap_or(def.cooldown_ms);
    ClaimTuning {
        amount,
        cooldown_ms,
    }
}

/// Mirrors `!set-cooldown.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-cooldown",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_set_cooldown(
    ctx: Ctx<'_>,
    #[description = "rob, work"] kind: CooldownKind,
    #[description = "Cooldown (e.g. 10s, 1h)"] cooldown: String,
) -> Result<(), anyhow::Error> {
    if disabled_reply(&ctx).await? {
        return Ok(());
    }
    let Some(ms) = crate::commands::schedule::main::parse_duration_ms(&cooldown) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "economy_manage_rewards_cooldown_invalid_time")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &format!("ECONOMY.settings.{}.cooldown", kind.key()),
        &serde_json::to_string(&ms)?,
    )
    .await?;
    // TS replies (and logs) with `stime = to_beautiful_string(time)`,
    // not the raw input.
    let units = time_units(&ctx).await;
    let stime = beautiful_ms_lang(ms as f64, &units);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "economy_manage_rewards_cooldown_command_ok")
            .map(|s| s.replace("${type}", kind.key()).replace("${stime}", &stime))
            .unwrap_or_else(|| "Cooldown updated.".to_string()),
    )
    .await?;
    let author = user_mention(ctx.author().id.get());
    // TS logs the type uppercased.
    let kind_s = kind.key().to_uppercase();
    let time_s = stime;
    post_economy_log(
        &ctx,
        "economy_logs_set_cooldown_title",
        "economy_logs_set_cooldown_desc",
        &[("author", &author), ("type", &kind_s), ("time", &time_s)],
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{leaf_num_routed, load_tuning_routed};

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
    async fn defaults_apply_without_rows() {
        let pool = mem_pool().await;
        let t = load_tuning_routed(&pool, "g", "daily").await;
        assert_eq!((t.amount, t.cooldown_ms), (500.0, 86_400_000));
        assert!(leaf_num_routed(&pool, "g", "ECONOMY.settings.daily.amount")
            .await
            .is_none());
    }

    #[tokio::test]
    async fn leaf_rows_win_and_promote_to_table() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "ECONOMY.settings.work.amount", "75")
            .await
            .unwrap();
        crate::db::kv_set(&pool, "g", "ECONOMY.settings.work.cooldown", "60000")
            .await
            .unwrap();
        let t = load_tuning_routed(&pool, "g", "work").await;
        assert_eq!((t.amount, t.cooldown_ms), (75.0, 60_000));
        assert!(tbl_get_value(&pool, "g", "ECONOMY.settings.work.amount")
            .await
            .is_some());
    }

    #[tokio::test]
    async fn legacy_blob_falls_back_and_zero_stays_zero() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "ECONOMY.settings.rob",
            r#"{"amount":10,"cooldown":3000000}"#,
        )
        .await
        .unwrap();
        let t = load_tuning_routed(&pool, "g", "rob").await;
        assert_eq!((t.amount, t.cooldown_ms), (10.0, 3_000_000));
        crate::db::kv_set(&pool, "h", "ECONOMY.settings.daily.amount", "0")
            .await
            .unwrap();
        let z = load_tuning_routed(&pool, "h", "daily").await;
        assert_eq!(z.amount, 0.0);
    }
}
