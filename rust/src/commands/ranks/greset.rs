use super::*;

/// Routed guild wipe: legacy `RANKS.%` rows plus the table `RANKS` root.
async fn clear_guild_ranks(pool: &crate::db::Pool, guild_id: &str) -> anyhow::Result<()> {
    use crate::commands::owner::main::{legacy_del_prefix, tbl_del};
    legacy_del_prefix(pool, guild_id, "RANKS.").await?;
    let _ = tbl_del(pool, guild_id, "RANKS").await;
    Ok(())
}

/// Reset all guild ranks. Mirrors !greset.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "greset",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_greset(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    if !crate::commands::prompt_reset_confirm(
        &ctx,
        "reset_uranks_are_you_sure",
        "**Are you really sure you want to delete all rank data?\nThis action is permanent and you cannot undo it.**\n**This action is destructive!!**",
    )
    .await?
    {
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    clear_guild_ranks(&ctx.data().pool, &gid).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(
        crate::lang::get(&code, "resetallinvites_succes_on_delete")
            .unwrap_or_else(|| "Successfully deleted!".to_string()),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::clear_guild_ranks;

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
    async fn greset_clears_legacy_and_table_roots() {
        use crate::commands::owner::main::{legacy_scan, table_backend, tbl_get_value};
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", "RANKS.1", r#"{"level":1}"#)
            .await
            .unwrap();
        table_backend(&pool)
            .table("g")
            .set("RANKS.2", serde_json::json!({"level": 3}))
            .await
            .unwrap();
        // Unrelated guild config survives the wipe.
        crate::db::kv_set(&pool, "g", "GUILD.RANKS.disable", "0")
            .await
            .unwrap();
        clear_guild_ranks(&pool, "g").await.unwrap();
        assert!(legacy_scan(&pool, "g", "RANKS.").await.is_empty());
        assert_eq!(tbl_get_value(&pool, "g", "RANKS").await, None);
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.disable")
                .await
                .as_deref(),
            Some("0")
        );
    }
}
