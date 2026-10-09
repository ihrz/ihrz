use super::*;
use poise::serenity_prelude as serenity;

/// Set the join/leave channel (clears when omitted).
// Mirrors the panel channel pickers (GUILD.GUILD_CONFIG.join/leave).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wc-channel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_wc_channel(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "Channel (omit to clear)"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(join) = welcomer_kind(&kind) else {
        ctx.say(
            crate::lang::get(&code, "msg_use_join_or_leave")
                .unwrap_or_else(|| "Use join or leave.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    let field = if join { "join" } else { "leave" };
    welcomer_set(
        &mut cfg,
        field,
        channel.map(|c| serde_json::Value::String(c.id.get().to_string())),
    );
    save_guild_config_routed(pool, &gid, &cfg).await?;
    ctx.say(
        crate::lang::get(&code, "msg_welcomer_channel_updated")
            .unwrap_or_else(|| "Welcomer channel updated.".to_string()),
    )
    .await?;
    Ok(())
}

/// Set the join/leave embed id (clears when omitted).
// Mirrors the panel embed setters (joinEmbedId/leaveEmbedId).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wc-embed",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_wc_embed(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "Embed id (omit to clear)"] embed_id: Option<String>,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let Some(join) = welcomer_kind(&kind) else {
        ctx.say(
            crate::lang::get(&code, "msg_use_join_or_leave")
                .unwrap_or_else(|| "Use join or leave.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    let field = if join { "joinEmbedId" } else { "leaveEmbedId" };
    welcomer_set(
        &mut cfg,
        field,
        embed_id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .map(serde_json::Value::String),
    );
    save_guild_config_routed(pool, &gid, &cfg).await?;
    ctx.say(
        crate::lang::get(&code, "msg_welcomer_embed_updated")
            .unwrap_or_else(|| "Welcomer embed updated.".to_string()),
    )
    .await?;
    Ok(())
}

/// Toggle the join/leave text message.
// Mirrors the panel text toggles (joinTextEnabled/leaveTextEnabled).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wc-text",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_wc_text(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let (Some(join), Some(enabled)) = (
        welcomer_kind(&kind),
        crate::commands::security::main::parse_on_off(&action),
    ) else {
        ctx.say(
            crate::lang::get(&code, "msg_use_join_leave_and_on_off")
                .unwrap_or_else(|| "Use join/leave and on/off.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    welcomer_set(
        &mut cfg,
        if join {
            "joinTextEnabled"
        } else {
            "leaveTextEnabled"
        },
        Some(serde_json::Value::Bool(enabled)),
    );
    save_guild_config_routed(pool, &gid, &cfg).await?;
    ctx.say(
        crate::lang::get(&code, "msg_welcomer_text_updated")
            .unwrap_or_else(|| "Welcomer text updated.".to_string()),
    )
    .await?;
    Ok(())
}

/// Toggle the join/leave components.
// Mirrors the panel component toggles
// (joinComponentsEnabled/leaveComponentsEnabled).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wc-components",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_wc_components(
    ctx: Ctx<'_>,
    #[description = "join or leave"] kind: String,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let (Some(join), Some(enabled)) = (
        welcomer_kind(&kind),
        crate::commands::security::main::parse_on_off(&action),
    ) else {
        ctx.say(
            crate::lang::get(&code, "msg_use_join_leave_and_on_off")
                .unwrap_or_else(|| "Use join/leave and on/off.".to_string()),
        )
        .await?;
        return Ok(());
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let mut cfg = load_guild_config(pool, &gid).await;
    welcomer_set(
        &mut cfg,
        if join {
            "joinComponentsEnabled"
        } else {
            "leaveComponentsEnabled"
        },
        Some(serde_json::Value::Bool(enabled)),
    );
    save_guild_config_routed(pool, &gid, &cfg).await?;
    ctx.say(
        crate::lang::get(&code, "msg_welcomer_components_updated")
            .unwrap_or_else(|| "Welcomer components updated.".to_string()),
    )
    .await?;
    Ok(())
}

/// Table-first guild-config blob write with legacy fallback. Same key
/// (`GUILD.GUILD_CONFIG`) and same JSON shape as `save_guild_config`;
/// the table handle is primary and the flat legacy row stays fresh for
/// unmigrated kv readers (U-D3 dual-write precedent). Reads already
/// prefer the table via `load_guild_config`.
pub async fn save_guild_config_routed(
    pool: &crate::db::Pool,
    gid: &str,
    cfg: &serde_json::Value,
) -> anyhow::Result<()> {
    save_guild_config(pool, gid, cfg).await?;
    crate::db::kv_set(pool, gid, "GUILD.GUILD_CONFIG", &cfg.to_string()).await?;
    Ok(())
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

    #[tokio::test]
    async fn blob_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        let cfg = serde_json::json!({"join": "11", "joinroles": "22"});
        save_guild_config_routed(&pool, "g1", &cfg).await.unwrap();
        assert_eq!(load_guild_config(&pool, "g1").await, cfg);
        // Table handle holds the blob under the GUILD root.
        let routed: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'tbl:g1' AND key_name = 'GUILD'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&routed).unwrap(),
            serde_json::json!({"GUILD_CONFIG": {"join": "11", "joinroles": "22"}})
        );
        // Legacy flat row stays fresh for unmigrated readers.
        let legacy: String = sqlx::query_scalar::<_, String>(
            "SELECT value FROM kv WHERE guild_id = 'g1' AND key_name = 'GUILD.GUILD_CONFIG'",
        )
        .fetch_optional(&pool)
        .await
        .unwrap()
        .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            cfg
        );
        // Other guilds are isolated.
        assert_eq!(load_guild_config(&pool, "g2").await, serde_json::json!({}));
    }

    #[tokio::test]
    async fn blob_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        let cfg = serde_json::json!({"joindm": "hello"});
        crate::db::kv_set(&pool, "g1", "GUILD.GUILD_CONFIG", &cfg.to_string())
            .await
            .unwrap();
        assert_eq!(load_guild_config(&pool, "g1").await, cfg);
    }
}
