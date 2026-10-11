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

/// Config action choice. Mirrors the `action` option `choices` in
/// economy.ts:214-229: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum EcoConfigAction {
    #[name = "Enable the module"]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "enable_the_module")]
    #[name_localized("ru", "enable_the_module")]
    #[name_localized("es-ES", "enable_the_module")]
    #[name = "on"]
    On,
    #[name = "Disable the module"]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "disable_the_module")]
    #[name_localized("ru", "disable_the_module")]
    #[name_localized("es-ES", "disable_the_module")]
    #[name = "off"]
    Off,
}

impl EcoConfigAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Mirrors `!config.ts`.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("ecconfig"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Désactiver entièrement le module d'économie sur un serveur"),
    description_localized("ja", "サーバーの経済モジュールを無効化"),
    description_localized("ru", "Отключить экономический модуль на сервере"),
    description_localized("es-ES", "Deshabilitar el módulo de economía en tu servidor")
)]
pub async fn eco_config(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Que voulez-vous faire ?")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    #[description = "on or off"]
    action: EcoConfigAction,
) -> Result<(), anyhow::Error> {
    // CONSTRAINED (deliberate divergence from `!config.ts`): the TS
    // slash `choices` admit only `on` | `off`, but the prefix path reads
    // free text and an unknown action falls through both branches while
    // still posting the ihorizon log below. Here an unknown action posts
    // no log, writes nothing, and replies with the invalid-action error.
    // Matching stays case-sensitive with no trim, like TS (`===`).
    let state = action.as_str();
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let author_id = ctx.author().id.get().to_string();
    if state != "on" && state != "off" {
        ctx.say(
            crate::lang::get(&code, "msg_economy_config_invalid")
                .unwrap_or_else(|| "Invalid action: use on or off.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let disabled = economy_disabled_routed(&ctx.data().pool, &gid).await;
    let enabled = state == "on";
    if enabled {
        if !disabled {
            // Mirrors the early `return` in !config.ts: a no-op reply
            // posts no economy log and no ihorizon log.
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_enable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already on.".to_string()),
            )
            .await?;
            return Ok(());
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
            // Same early return as the already_enable no-op above.
            ctx.say(
                crate::lang::get(&code, "economy_disable_already_disable")
                    .map(|s| s.replace("${interaction.user.id}", &author_id))
                    .unwrap_or_else(|| "Economy already off.".to_string()),
            )
            .await?;
            return Ok(());
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
    // The ihorizon log sits inside each on/off branch: an unknown action
    // returns early above (constrained), so unlike TS it posts no log.
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
    use super::EcoConfigAction;

    #[test]
    fn eco_config_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = EcoConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(
            names,
            vec![
                "Enable the module".to_string(),
                "Disable the module".to_string()
            ]
        );
        assert_eq!(EcoConfigAction::On.as_str(), "on");
        assert_eq!(EcoConfigAction::Off.as_str(), "off");
        assert_eq!(EcoConfigAction::from_name("on"), Some(EcoConfigAction::On));
        assert_eq!(
            EcoConfigAction::from_name("DISABLE THE MODULE"),
            Some(EcoConfigAction::Off)
        );
        assert_eq!(EcoConfigAction::from_name("maybe"), None);
        assert_eq!(EcoConfigAction::from_index(0), Some(EcoConfigAction::On));
        assert_eq!(EcoConfigAction::from_index(1), Some(EcoConfigAction::Off));
        let list = EcoConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
        assert_eq!(
            list[0].localizations.get("ja").map(String::as_str),
            Some("enable_the_module")
        );
        assert_eq!(
            list[1].localizations.get("es-ES").map(String::as_str),
            Some("disable_the_module")
        );
    }
    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
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
