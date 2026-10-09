use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Config audit log, like the ihorizon_logs calls in !config.ts.
    if let Some(guild_id) = ctx.guild_id() {
        post_ticket_config_log(
            ctx.http(),
            guild_id,
            &code,
            if enabled {
                "disableticket_logs_embed_title_enable"
            } else {
                "disableticket_logs_embed_title_disable"
            },
            if enabled {
                "disableticket_logs_embed_description_enable"
            } else {
                "disableticket_logs_embed_description_disable"
            },
            ctx.author().id.get(),
        )
        .await;
    }
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.TICKET.disable",
        if enabled { "0" } else { "1" },
    )
    .await?;
    ctx.say(
        crate::lang::get(
            &code,
            if enabled {
                "disableticket_command_work_enable"
            } else {
                "disableticket_command_work_disable"
            },
        )
        .unwrap_or_else(|| {
            if enabled {
                "Tickets on.".to_string()
            } else {
                "Tickets off.".to_string()
            }
        }),
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
    async fn disable_flag_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g", "g", "GUILD.TICKET.disable", "1")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.TICKET.disable")
                .await
                .as_deref(),
            Some("1")
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.TICKET.disable")
            .await
            .is_some());
    }
}
