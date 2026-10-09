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
    #[description = "Window (e.g. 10s, 1m, 1h)"] window: Option<String>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let raw = crate::db::kv_get(pool, &gid, "UTILS.COMMAND_LIMITS").await;
    let mut map: HashMap<String, CommandLimit> = raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
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
        crate::db::kv_set(
            pool,
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
    crate::db::kv_set(
        pool,
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
