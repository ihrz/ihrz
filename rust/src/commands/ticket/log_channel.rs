use super::*;
use poise::serenity_prelude as serenity;

/// Ticket logs channel. Mirrors !log-channel.ts (used by close transcript).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "log-channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_log_channel(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text")]
    channel: serenity::GuildChannel,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    // Mirrors !log-channel.ts: disable guard.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &code, "ticket_disabled_command").await {
        return Ok(());
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.TICKET.logs",
        &channel.id.get().to_string(),
    )
    .await?;
    ctx.say(
        crate::lang::get(&code, "ticket_logchannel_embed_desc")
            .map(|s| {
                s.replace(
                    "${interaction.user}",
                    &format!("<@{}>", ctx.author().id.get()),
                )
                .replace("${channel}", &format!("<#{}>", channel.id.get()))
            })
            .unwrap_or_else(|| "Ticket logs channel set.".to_string()),
    )
    .await?;
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
    async fn logs_flag_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g", "g", "GUILD.TICKET.logs", "456")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.TICKET.logs")
                .await
                .as_deref(),
            Some("456")
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.TICKET.logs")
            .await
            .is_some());
    }
}
