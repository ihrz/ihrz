use super::*;
use poise::serenity_prelude as serenity;

// `set welcomer` leaf (`guildconfig.ts` `set` group: no options,
// Administrator) and `!welcomer.ts` panel entry: opens the interactive
// welcomer panel (`openWelcomerPanel` in
// `SlashCommands/guildconfig/welcomerPanel.ts`) on the join section.
//
// The option-less leaf only posts the panel embed plus the section
// select, channel/role pickers and buttons (builders in
// `welcomer_panel::main`, byte-exact customIds: `welcomer-section`,
// `welcomer-channel-join` / `welcomer-channel-leave`,
// `welcomer-roles-pick`,
// `welcomer-{join,leave}-{set,reset,embed-set,embed-reset,text-toggle,components-toggle}`,
// `welcomer-dm-set` / `welcomer-dm-reset`, `welcomer-channels-reset`,
// `welcomer-banner-*`). Message/embed/dm modals
// (`welcomer-*-modal` / `welcomer-*-input`), the dangerous-role confirm
// and the banner editors run in
// `welcomer_panel::main::handle_welcomer_component` (global component
// dispatch in `events_handler`), which also re-renders disabled rows
// past the 800s collector window like the TS collector `end` handler.
// (An earlier port flattened this surface to direct `wc-*` slash
// options; those had no TS basis and are removed by this rewrite.)
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
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let default_message =
        crate::lang::get(&code, "setjoinmessage_image_default_text").unwrap_or_default();
    let st = crate::commands::welcomer_panel::main::load_panel_state(
        pool,
        &gid,
        "join",
        &default_message,
    )
    .await;
    let embed = serenity::CreateEmbed::default()
        .colour(crate::commands::welcomer_panel::main::PANEL_ACCENT)
        .description(crate::commands::welcomer_panel::main::panel_description(
            &st, &code,
        ));
    ctx.send(poise::CreateReply::default().embed(embed).components(
        crate::commands::welcomer_panel::main::panel_rows(&st, &code),
    ))
    .await?;
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
