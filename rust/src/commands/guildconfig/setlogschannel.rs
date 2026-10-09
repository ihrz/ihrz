use super::*;
use poise::serenity_prelude as serenity;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "setlogs",
    aliases("logs", "setlog"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_setlogs(
    ctx: Ctx<'_>,
    #[description = "Log type"] log_type: String,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if !valid_log_type(&log_type) {
        ctx.say(
            crate::lang::get(&code, "msg_bad_log_type")
                .unwrap_or_else(|| "Bad log type.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = log_channel_key(&log_type);
    match channel {
        Some(ch) => {
            crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                &key,
                &ch.id.get().to_string(),
            )
            .await?;
            let cid = ch.id.get().to_string();
            ctx.say(
                crate::lang::get(&code, "setlogschannel_command_work")
                    .map(|s| {
                        s.replace("${argsid.id}", &cid)
                            .replace("${typeOfLogs}", &log_type)
                    })
                    .unwrap_or_else(|| format!("Logs {log_type} set.")),
            )
            .await?;
        }
        None => {
            let _ = crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, &key)
                .await?;
            let guild_name = ctx.guild().map(|g| g.name.clone()).unwrap_or_default();
            ctx.say(
                crate::lang::get(&code, "setlogschannel_command_work_on_delete")
                    .map(|s| s.replace("${interaction.guild.name}", &guild_name))
                    .unwrap_or_else(|| format!("Logs {log_type} cleared.")),
            )
            .await?;
        }
    }
    Ok(())
}

/// Key for one log type. Unchanged (`GUILD.SERVER_LOGS.<type>`).
pub fn log_channel_key(log_type: &str) -> String {
    format!("GUILD.SERVER_LOGS.{log_type}")
}

/// Table-first log-channel read with legacy fallback. Same key and same
/// plain-id shape as the event emitters' reads; the table handle is
/// primary and a legacy-only row still resolves via `routed_get` (lazy
/// promotion).
pub async fn load_log_channel_routed(
    pool: &crate::db::Pool,
    gid: &str,
    log_type: &str,
) -> Option<String> {
    crate::commands::owner::main::routed_get(pool, gid, gid, &log_channel_key(log_type)).await
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
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
    fn log_key_unchanged() {
        assert_eq!(
            log_channel_key("moderation"),
            "GUILD.SERVER_LOGS.moderation"
        );
        assert_eq!(log_channel_key("all"), "GUILD.SERVER_LOGS.all");
    }

    #[tokio::test]
    async fn log_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            &log_channel_key("moderation"),
            "123",
        )
        .await
        .unwrap();
        let routed: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'tbl:g1' AND key_name = 'GUILD'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        let doc: serde_json::Value = serde_json::from_str(&routed).unwrap();
        assert_eq!(
            doc.pointer("/SERVER_LOGS/moderation").unwrap(),
            &serde_json::json!(123)
        );
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "moderation")
                .await
                .as_deref(),
            Some("123")
        );
        assert_eq!(load_log_channel_routed(&pool, "g1", "voice").await, None);
        assert_eq!(
            load_log_channel_routed(&pool, "g2", "moderation").await,
            None
        );
    }

    #[tokio::test]
    async fn log_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(&pool, "g1", &log_channel_key("voice"), "456")
            .await
            .unwrap();
        assert_eq!(
            load_log_channel_routed(&pool, "g1", "voice")
                .await
                .as_deref(),
            Some("456")
        );
    }

    #[tokio::test]
    async fn log_clear_removes_both_stores() {
        let pool = memory_pool().await;
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            &log_channel_key("ticket"),
            "789",
        )
        .await
        .unwrap();
        let removed =
            crate::commands::owner::main::routed_del(&pool, "g1", "g1", &log_channel_key("ticket"))
                .await
                .unwrap();
        assert!(removed);
        assert_eq!(load_log_channel_routed(&pool, "g1", "ticket").await, None);
    }
}
