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

/// Show the welcomer setup and how to configure it.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "wc-panel",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn gc_wc_panel(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // UX split (documented, not a regression): `openWelcomerPanel`
    // (`SlashCommands/guildconfig/welcomerPanel.ts`, ~1800 lines) is a
    // stateful Components-V2 guided panel (section select,
    // channel/role pickers, modals, live banner preview, 800s
    // collector) with no poise equivalent at this scope, so it is NOT
    // ported 1:1. This command renders the same stored state as one
    // summary embed and points at the atomic setters above that
    // persist the same `GUILD.GUILD_CONFIG` keys the panel writes.
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let cfg = load_guild_config(pool, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(0xFFB3CC)
        .title(
            crate::lang::get(&code, "msg_welcomer_panel_title")
                .unwrap_or_else(|| "Welcomer panel".to_string()),
        )
        .description(
            crate::lang::get(&code, "msg_welcomer_panel_hint").unwrap_or_else(|| {
                "Use wc-channel / wc-embed / wc-text / wc-components to configure join and leave messages."
                    .to_string()
            }),
        )
        .timestamp(serenity::Timestamp::now());
    for (name, value, inline) in welcomer_panel_fields(&cfg) {
        embed = embed.field(name, value, inline);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    Ok(())
}

/// Summary fields for the welcomer overview. Pure for testability.
pub fn welcomer_panel_fields(cfg: &serde_json::Value) -> Vec<(String, String, bool)> {
    let str_of = |key: &str| cfg.get(key).and_then(|v| v.as_str()).unwrap_or("");
    let chan = |key: &str| {
        let id = str_of(key);
        if id.is_empty() {
            "Not set".to_string()
        } else {
            format!("<#{id}>")
        }
    };
    let on_off = |key: &str, default: bool| {
        let on = cfg.get(key).and_then(|v| v.as_bool()).unwrap_or(default);
        if on {
            "on".to_string()
        } else {
            "off".to_string()
        }
    };
    let roles = match cfg.get("joinroles") {
        Some(serde_json::Value::Array(a)) => {
            let ids: Vec<String> = a
                .iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect();
            if ids.is_empty() {
                "Not set".to_string()
            } else {
                ids.iter()
                    .map(|id| format!("<@&{id}>"))
                    .collect::<Vec<_>>()
                    .join(", ")
            }
        }
        Some(serde_json::Value::String(s)) if !s.is_empty() => format!("<@&{s}>"),
        _ => "Not set".to_string(),
    };
    vec![
        ("Join channel".to_string(), chan("join"), true),
        ("Leave channel".to_string(), chan("leave"), true),
        (
            "Join message".to_string(),
            {
                let m = str_of("joinmessage");
                if m.is_empty() {
                    "Not set".to_string()
                } else {
                    format!("```{m}```")
                }
            },
            false,
        ),
        (
            "Leave message".to_string(),
            {
                let m = str_of("leavemessage");
                if m.is_empty() {
                    "Not set".to_string()
                } else {
                    format!("```{m}```")
                }
            },
            false,
        ),
        ("Join roles".to_string(), roles, false),
        (
            "Join text / components".to_string(),
            format!(
                "{} / {}",
                on_off("joinTextEnabled", true),
                on_off("joinComponentsEnabled", true)
            ),
            true,
        ),
        (
            "Leave text / components".to_string(),
            format!(
                "{} / {}",
                on_off("leaveTextEnabled", true),
                on_off("leaveComponentsEnabled", true)
            ),
            true,
        ),
    ]
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
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn blob_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        let cfg = serde_json::json!({"join": "11", "joinroles": "22"});
        save_guild_config_routed(&pool, "g1", &cfg).await.unwrap();
        assert_eq!(load_guild_config(&pool, "g1").await, cfg);
        // Table handle holds the blob under the GUILD root.
        let routed =
            crate::commands::owner::main::routed_get(&pool, "g1", "g1", "GUILD.GUILD_CONFIG")
                .await
                .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&routed).unwrap(),
            serde_json::json!({"join": "11", "joinroles": "22"})
        );
        // Legacy flat row stays fresh for unmigrated readers.
        let legacy = crate::db::kv_get(&pool, "g1", "GUILD.GUILD_CONFIG")
            .await
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
