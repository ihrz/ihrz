use super::*;
use poise::serenity_prelude as serenity;

// `set welcomer` leaf (`guildconfig.ts` `set` group: no options,
// Administrator) and `!welcomer.ts` panel entry: opens the interactive
// welcomer panel (`openWelcomerPanel` in
// `SlashCommands/guildconfig/welcomerPanel.ts`) on the join section as
// Components V2 (Container + TextDisplay + Separator + MediaGallery via
// `welcomer_panel::v2` raw REST, since serenity 0.12 has no V2
// builders): placeholder followup, then the full `render()` edit.
// Message/embed/dm modals (`welcomer-*-modal` / `welcomer-*-input`),
// the dangerous-role confirm and the banner editors run in
// `welcomer_panel::main::handle_welcomer_component` (global component
// dispatch in `events_handler`), which also re-renders the disabled
// form past the 800s collector window like the TS collector `end`
// handler.
/// Open the welcomer configuration panel
#[poise::command(
    slash_command,
    prefix_command,
    rename = "welcomer",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Configurer le module de bienvenue (messages, salons, image)"),
    description_localized("ja", "ウェルカムモジュール（メッセージ・チャンネル・画像）を設定！"),
    description_localized("ru", "Настроить модуль приветствия (сообщения, каналы, изображение)!"),
    description_localized(
        "es-ES",
        "Configurar el módulo de bienvenida (mensajes, canales, imagen)!"
    )
)]
pub async fn gc_welcomer(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return).
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    // Ack-first: panel state load + reply run past the 3s slash window.
    ctx.defer().await?;
    let poise::Context::Application(actx) = ctx else {
        return Ok(());
    };
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    use crate::commands::welcomer_panel::{main as wp_main, v2 as wp_v2};
    // Placeholder followup then the full render() edit, like
    // interactionSend + render() in TS. Join section never previews.
    let app_id = actx.serenity_context.cache.current_user().id.get();
    let token = actx.interaction.token.clone();
    let channel_id = actx.channel_id().get();
    let ph_id = wp_v2::webhook_followup_v2(
        app_id,
        &token,
        &[wp_main::panel_placeholder_v2(&code, "join")],
    )
    .await
    .map_err(|e| anyhow::anyhow!(e))?;
    let roles: Vec<serenity::RoleId> = actx
        .author_member()
        .await
        .map(|m| m.roles.clone())
        .unwrap_or_default();
    let author = actx.author().clone();
    let (components, files) = wp_main::render_panel_message(
        actx.serenity_context,
        pool,
        &gid,
        &code,
        guild_id,
        &author,
        &roles,
        false,
    )
    .await?;
    wp_v2::patch_message_v2(channel_id, ph_id, &components, files)
        .await
        .map_err(|e| anyhow::anyhow!(e))?;
    Ok(())
}

/// Summary fields for the welcomer stored state. Pure for testability;
/// kept for the `guildconfig::main` overview test.
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
