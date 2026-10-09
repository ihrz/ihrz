use super::*;

/// Table-first economy-disabled read with legacy kv fallback (keys
/// unchanged). Mirrors the `ECONOMY.disabled === true` guard (a real
/// boolean; the legacy Rust "1" shape is still accepted). A legacy hit
/// promotes into the table; pair with `routed_set` writes (dual-write)
/// so kv-only readers stay fresh.
pub async fn economy_disabled_routed(pool: &crate::db::Pool, guild_id: &str) -> bool {
    match crate::commands::owner::main::routed_get(pool, guild_id, guild_id, "ECONOMY.disabled")
        .await
    {
        Some(v) => {
            let t = v.trim();
            if let Ok(b) = serde_json::from_str::<bool>(t) {
                return b;
            }
            t == "1" || t.eq_ignore_ascii_case("true")
        }
        None => false,
    }
}

/// Mirrors `!config.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn eco_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    // Mirrors !config.ts: only the exact states "on"/"off" change anything.
    // Any other input (typo, ...) leaves the module untouched — it must
    // never disable the economy on a typo.
    let state = action.trim();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    let disabled = economy_disabled_routed(&ctx.data().pool, &gid).await;
    let enabled = state == "on";
    if enabled {
        if !disabled {
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_enable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already on.".to_string()),
            )
            .await?;
        } else {
            // TS `db.set(..., false)`: a real boolean, not "0".
            crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                "ECONOMY.disabled",
                "false",
            )
            .await?;
            ctx.say(
                crate::lang::get(&code, "economy_disable_set_enable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy on.".to_string()),
            )
            .await?;
            let author = user_mention(ctx.author().id.get());
            let state_label = crate::commands::lang_for(&ctx, "var_on", "enabled").await;
            post_economy_log(
                &ctx,
                "economy_logs_config_title",
                "economy_logs_config_desc",
                &[("author", &author), ("state", &state_label)],
            )
            .await?;
        }
    } else if state == "off" {
        if disabled {
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_disable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already off.".to_string()),
            )
            .await?;
        } else {
            // TS `db.set(..., true)`: a real boolean, not "1".
            crate::commands::owner::main::routed_set(
                &ctx.data().pool,
                &gid,
                &gid,
                "ECONOMY.disabled",
                "true",
            )
            .await?;
            ctx.say(
                crate::lang::get(&code, "economy_disable_set_disable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy off.".to_string()),
            )
            .await?;
            let author = user_mention(ctx.author().id.get());
            let state_label = crate::commands::lang_for(&ctx, "var_off", "disabled").await;
            post_economy_log(
                &ctx,
                "economy_logs_config_title",
                "economy_logs_config_desc",
                &[("author", &author), ("state", &state_label)],
            )
            .await?;
        }
    }
    // TS posts the ihorizon log for EVERY call, including garbage
    // states (the call sits outside the on/off branches).
    let title =
        crate::commands::lang_for(&ctx, "economy_disable_logs_embed_title", "Economy Logs").await;
    let desc = crate::commands::lang_for(
        &ctx,
        "economy_disable_logs_embed_desc",
        "<@${interaction.user.id}> has put the Economy Module to `${state}`!",
    )
    .await
    .replace("${interaction.user.id}", &author_id)
    .replace("${state}", state);
    post_ihorizon_log(&ctx, &title, &desc).await;
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
    async fn disabled_flag_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::{routed_get, routed_set, tbl_get_value};
        let pool = mem_pool().await;
        // Table-first read falls back to the legacy row and promotes it.
        crate::db::kv_set(&pool, "g", "ECONOMY.disabled", "true")
            .await
            .unwrap();
        assert_eq!(
            routed_get(&pool, "g", "g", "ECONOMY.disabled")
                .await
                .as_deref(),
            Some("true")
        );
        assert!(tbl_get_value(&pool, "g", "ECONOMY.disabled")
            .await
            .is_some());
        // Writes land in both stores so locked legacy readers stay fresh.
        routed_set(&pool, "g", "g", "ECONOMY.disabled", "false")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "ECONOMY.disabled")
                .await
                .as_deref(),
            Some("false")
        );
        assert_eq!(
            routed_get(&pool, "g", "g", "ECONOMY.disabled")
                .await
                .as_deref(),
            Some("false")
        );
    }

    #[tokio::test]
    async fn routed_owner_parses_bool_and_legacy_shapes() {
        use super::economy_disabled_routed;
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        assert!(!economy_disabled_routed(&pool, "g").await);
        crate::db::kv_set(&pool, "g", "ECONOMY.disabled", "true")
            .await
            .unwrap();
        assert!(economy_disabled_routed(&pool, "g").await);
        // Legacy hit promotes into the table handle.
        assert!(tbl_get_value(&pool, "g", "ECONOMY.disabled")
            .await
            .is_some());
        crate::db::kv_set(&pool, "h", "ECONOMY.disabled", "1")
            .await
            .unwrap();
        assert!(economy_disabled_routed(&pool, "h").await);
        crate::db::kv_set(&pool, "i", "ECONOMY.disabled", "false")
            .await
            .unwrap();
        assert!(!economy_disabled_routed(&pool, "i").await);
    }
}
