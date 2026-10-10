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
            super::migrated_set(
                &ctx.data().pool,
                &gid,
                super::GUILD_MESSAGE_NEW,
                &[super::GUILD_MESSAGE_OLD],
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
            super::migrated_del(
                &ctx.data().pool,
                &gid,
                super::GUILD_MESSAGE_NEW,
                &[super::GUILD_MESSAGE_OLD],
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
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::{migrated_del, migrated_get, migrated_set};
        let pool = mem_pool().await;
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD]).await,
            None
        );
        migrated_set(
            &pool,
            "g",
            GUILD_MESSAGE_NEW,
            &[GUILD_MESSAGE_OLD],
            "gg {user}",
        )
        .await
        .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("gg {user}")
        );
        // Locked legacy readers still see the write.
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_OLD)
                .await
                .as_deref(),
            Some("gg {user}")
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
        assert!(
            !migrated_del(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .unwrap()
        );
    }

    #[tokio::test]
    async fn legacy_message_key_reads_and_promotes() {
        use super::{GUILD_MESSAGE_NEW, GUILD_MESSAGE_OLD};
        use crate::commands::ranks::migrated_get;
        let pool = mem_pool().await;
        crate::db::kv_set(&pool, "g", GUILD_MESSAGE_OLD, "hi {user}")
            .await
            .unwrap();
        assert_eq!(
            migrated_get(&pool, "g", GUILD_MESSAGE_NEW, &[GUILD_MESSAGE_OLD])
                .await
                .as_deref(),
            Some("hi {user}")
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", GUILD_MESSAGE_NEW)
                .await
                .as_deref(),
            Some("hi {user}")
        );
    }
}
