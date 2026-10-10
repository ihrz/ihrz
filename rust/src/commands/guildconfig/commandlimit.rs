use super::*;
use poise::serenity_prelude as serenity;

// Set/reset/list per-command rate limits. Mirrors
// HybridCommands/guildconfig/commandlimit.ts (Admin-only, YAML replies,
// #11304c sorted list embed; storage stays the monolith
// UTILS.COMMAND_LIMITS map since Rust kv has no nested paths).
/// Manage command rate limits.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "commandlimit",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_commandlimit(
    ctx: Ctx<'_>,
    #[description = "set, reset or list"] action: String,
    #[description = "Command name"] command: Option<String>,
    #[description = "Max uses"] count: Option<i64>,
    #[description = "Window (e.g. 10s, 1m, 1h)"]
    #[rename = "window-time"]
    window: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let raw = load_command_limits_routed(pool, &gid).await;
    let mut map: HashMap<String, CommandLimit> = raw;
    if action.eq_ignore_ascii_case("list") {
        if map.is_empty() {
            ctx.say(t("commandlimit_list_empty")).await?;
            return Ok(());
        }
        let mut entries: Vec<(&String, &CommandLimit)> = map.iter().collect();
        entries.sort_by(|a, b| a.0.cmp(b.0));
        let desc = entries
            .iter()
            .map(|(path, limit)| {
                t("commandlimit_list_item")
                    .replace("${command}", path)
                    .replace("${limit}", &format_limit(limit, &code))
            })
            .collect::<Vec<_>>()
            .join("\n");
        let embed = serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(0x11304c))
            .title(t("commandlimit_list_title"))
            .description(desc);
        ctx.send(poise::CreateReply::default().embed(embed)).await?;
        return Ok(());
    }
    let Some(cmd) = command.as_deref().map(str::trim).filter(|s| !s.is_empty()) else {
        ctx.say(t("commandlimit_missing_command")).await?;
        return Ok(());
    };
    if !registered_paths().iter().any(|p| p == cmd) {
        ctx.say(t("var_unreachable_command")).await?;
        return Ok(());
    }
    if action.eq_ignore_ascii_case("reset") {
        if map.remove(cmd).is_none() {
            ctx.say(t("commandlimit_reset_missing").replace("${command}", cmd))
                .await?;
            return Ok(());
        }
        crate::commands::owner::main::routed_set(
            pool,
            &gid,
            &gid,
            "UTILS.COMMAND_LIMITS",
            &serde_json::to_string(&map)?,
        )
        .await?;
        ctx.say(t("commandlimit_reset_success").replace("${command}", cmd))
            .await?;
        return Ok(());
    }
    let window_ms = window.as_deref().map(crate::funcs::time_ms).unwrap_or(0.0);
    let Some(n) = count.filter(|c| *c > 0) else {
        ctx.say(t("commandlimit_invalid_value")).await?;
        return Ok(());
    };
    if window_ms <= 0.0 {
        ctx.say(t("commandlimit_invalid_value")).await?;
        return Ok(());
    }
    let limit = CommandLimit {
        count: n as u32,
        window_ms: window_ms as i64,
    };
    map.insert(cmd.to_string(), limit.clone());
    crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        "UTILS.COMMAND_LIMITS",
        &serde_json::to_string(&map)?,
    )
    .await?;
    ctx.say(
        t("commandlimit_set_success")
            .replace("${command}", cmd)
            .replace("${limit}", &format_limit(&limit, &code)),
    )
    .await?;
    Ok(())
}

/// Table-first command-limits read with legacy fallback. Same key
/// (`UTILS.COMMAND_LIMITS`) and same map shape as the inline read it
/// replaces; the table handle is primary and a legacy-only row still
/// resolves via `routed_get` (lazy promotion).
pub async fn load_command_limits_routed(
    pool: &crate::db::Pool,
    gid: &str,
) -> HashMap<String, CommandLimit> {
    crate::commands::owner::main::routed_get(pool, gid, gid, "UTILS.COMMAND_LIMITS")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn limits_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        let map = serde_json::json!({"ban": {"count": 2, "window_ms": 60_000}});
        crate::commands::owner::main::routed_set(
            &pool,
            "g1",
            "g1",
            "UTILS.COMMAND_LIMITS",
            &map.to_string(),
        )
        .await
        .unwrap();
        let routed =
            crate::commands::owner::main::routed_get(&pool, "g1", "g1", "UTILS.COMMAND_LIMITS")
                .await
                .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&routed).unwrap(),
            map
        );
        let legacy = crate::db::kv_get(&pool, "g1", "UTILS.COMMAND_LIMITS")
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&legacy).unwrap(),
            map
        );
        let loaded = load_command_limits_routed(&pool, "g1").await;
        assert_eq!(loaded["ban"].count, 2);
        assert_eq!(loaded["ban"].window_ms, 60_000);
        assert!(load_command_limits_routed(&pool, "g2").await.is_empty());
    }

    #[tokio::test]
    async fn limits_read_falls_back_to_legacy_only_row() {
        let pool = memory_pool().await;
        crate::db::kv_set(
            &pool,
            "g1",
            "UTILS.COMMAND_LIMITS",
            &serde_json::json!({"kick": {"count": 1, "window_ms": 10_000}}).to_string(),
        )
        .await
        .unwrap();
        let loaded = load_command_limits_routed(&pool, "g1").await;
        assert_eq!(loaded["kick"].count, 1);
    }
}
