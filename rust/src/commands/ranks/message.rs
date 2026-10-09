use super::*;

/// Custom level-up message template.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "message",
    aliases("msg"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_msg(
    ctx: Ctx<'_>,
    #[description = "Template (empty to clear)"] template: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    match template
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
    {
        Some(t) => {
            crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                "GUILD.RANKS.message",
                &t,
            )
            .await?;
            ctx.say(
                crate::lang::get(&code, "msg_level_up_message_set")
                    .unwrap_or_else(|| "Level-up message set.".to_string()),
            )
            .await?;
        }
        None => {
            crate::commands::owner::main::routed_del(
                &ctx.data().pool,
                &gid,
                &gid,
                "GUILD.RANKS.message",
            )
            .await?;
            ctx.say(
                crate::lang::get(&code, "msg_level_up_message_cleared")
                    .unwrap_or_else(|| "Level-up message cleared.".to_string()),
            )
            .await?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
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
    async fn message_key_roundtrips_through_both_stores() {
        use crate::commands::owner::main::{routed_del, routed_get, routed_set};
        let pool = mem_pool().await;
        assert_eq!(
            routed_get(&pool, "g", "g", "GUILD.RANKS.message").await,
            None
        );
        routed_set(&pool, "g", "g", "GUILD.RANKS.message", "gg {user}")
            .await
            .unwrap();
        assert_eq!(
            routed_get(&pool, "g", "g", "GUILD.RANKS.message")
                .await
                .as_deref(),
            Some("gg {user}")
        );
        // Locked legacy readers still see the write.
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.message")
                .await
                .as_deref(),
            Some("gg {user}")
        );
        assert!(routed_del(&pool, "g", "g", "GUILD.RANKS.message")
            .await
            .unwrap());
        assert_eq!(
            routed_get(&pool, "g", "g", "GUILD.RANKS.message").await,
            None
        );
        assert!(!routed_del(&pool, "g", "g", "GUILD.RANKS.message")
            .await
            .unwrap());
    }
}
