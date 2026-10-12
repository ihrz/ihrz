use super::*;
use poise::serenity_prelude as serenity;

// Set/reset/list per-command rate limits. Mirrors
// HybridCommands/guildconfig/commandlimit.ts (Admin-only, YAML replies,
// #11304c sorted list embed; storage stays the monolith
// UTILS.COMMAND_LIMITS map since Rust kv has no nested paths).
/// Command-limit action choice. Mirrors the `action` option `choices`
/// in commandlimit.ts:146-181: slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum CommandLimitAction {
    #[name = "Set"]
    #[name_localized("fr", "Définir")]
    #[name_localized("ja", "set")]
    #[name_localized("ru", "set")]
    #[name_localized("es-ES", "set")]
    Set,
    #[name = "Reset"]
    #[name_localized("fr", "Réinitialiser")]
    #[name_localized("ja", "reset")]
    #[name_localized("ru", "reset")]
    #[name_localized("es-ES", "reset")]
    Reset,
    #[name = "List"]
    #[name_localized("fr", "Lister")]
    #[name_localized("ja", "list")]
    #[name_localized("ru", "list")]
    #[name_localized("es-ES", "list")]
    List,
}

impl CommandLimitAction {
    /// TS `value` (`set` / `reset` / `list`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Set => "set",
            Self::Reset => "reset",
            Self::List => "list",
        }
    }
}

/// Case-sensitive substring-or-prefix filter for the `command`
/// autocomplete, first 25. Mirrors `commandlimit.ts` autocomplete
/// (`choice.includes(value) || choice.startsWith(value)`, slice 25).
/// Pure so both the poise hook below and unit tests share it.
pub fn autocomplete_command_choices(paths: &[String], focused: &str) -> Vec<String> {
    paths
        .iter()
        .filter(|p| p.contains(focused) || p.starts_with(focused))
        .take(25)
        .cloned()
        .collect()
}

/// Poise autocomplete for the `command` option (TS autocomplete with an
/// async handler). Case-sensitive substring, 25 cap, exactly like TS.
/// FAILED-unexpressible as a static ChoiceParameter: the list is built
/// at runtime from the live command registry (`getCommandChoices(client)`
/// walking `client.commands`, commandlimit.ts:38-60/341-360), so it can
/// only be an autocomplete handler, never a fixed enum.
/// NOTE: `events_handler.rs` keeps a raw Autocomplete responder arm for
/// `commandlimit` (out of scope here) — it must skip this command now
/// that poise answers, or Discord sees a double-ack.
async fn commandlimit_command_autocomplete(_ctx: Ctx<'_>, partial: &str) -> Vec<String> {
    autocomplete_command_choices(&registered_paths(), partial)
}

/// Manage command rate limits.
#[poise::command(
    slash_command,
    prefix_command,
    category = "guildconfig",
    rename = "commandlimit",
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Gérer les limites de commandes"),
    description_localized("ja", "コマンドのレート制限を管理"),
    description_localized("ru", "Управление лимитами команд"),
    description_localized("es-ES", "Gestionar límites de velocidad de comandos")
)]
pub async fn gc_commandlimit(
    ctx: Ctx<'_>,
    #[description = "Action to apply on command limits"]
    #[description_localized("fr", "Action à appliquer sur les limites de commandes")]
    #[description_localized("ja", "コマンド制限に適用するアクション")]
    #[description_localized("ru", "Действие для применения к лимитам команд")]
    #[description_localized("es-ES", "Acción a aplicar en los límites de comandos")]
    action: CommandLimitAction,
    #[description = "Search the command or subcommand"]
    #[description_localized("fr", "Rechercher la commande ou la sous-commande")]
    #[description_localized("ja", "コマンドまたはサブコマンドを検索")]
    #[description_localized("ru", "Искать команду или подкоманду")]
    #[description_localized("es-ES", "Buscar el comando o subcomando")]
    #[autocomplete = "commandlimit_command_autocomplete"]
    command: Option<String>,
    #[description = "Maximum number of uses in the window"]
    #[description_localized("fr", "Nombre maximum d'utilisations dans la fenêtre")]
    #[description_localized("ja", "ウィンドウ内の最大使用回数")]
    #[description_localized("ru", "Максимальное количество использований в окне")]
    #[description_localized("es-ES", "Número máximo de usos en la ventana")]
    count: Option<i64>,
    #[description = "Time window like 10s, 1m, 5m, 1h"]
    #[description_localized("fr", "Fenêtre de temps comme 10s, 1m, 5m, 1h")]
    #[description_localized("ja", "時間枠（例: 10s, 1m, 5m, 1h）")]
    #[description_localized("ru", "Временное окно, например 10с, 1м, 5м, 1ч")]
    #[description_localized("es-ES", "Ventana de tiempo como 10s, 1m, 5m, 1h")]
    #[rename = "window-time"]
    window: Option<String>,
) -> Result<(), anyhow::Error> {
    // Mirrors the TS guard (`!interaction.guild` -> silent return):
    // without a guild there is no per-guild COMMAND_LIMITS map.
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let raw = load_command_limits_routed(pool, &gid).await;
    let mut map: HashMap<String, CommandLimit> = raw;
    // The dropdown constrains slash input to the TS choices; prefix
    // words resolve case-insensitively through the choice names, so
    // `list`/`LIST` both reach the list leg below (TS `===` would send
    // case variants down the set path — accepted divergence, the value
    // mapping itself stays exact).
    let action = action.as_str();
    if action == "list" {
        if map.is_empty() {
            ctx.say(t("commandlimit_list_empty")).await?;
            return Ok(());
        }
        let mut entries: Vec<(&String, &CommandLimit)> = map.iter().collect();
        // TS sorts with `localeCompare` (locale-aware, case-insensitive
        // first); approximate with a caseless compare + byte tiebreak.
        entries.sort_by(|a, b| {
            a.0.to_lowercase()
                .cmp(&b.0.to_lowercase())
                .then_with(|| a.0.cmp(b.0))
        });
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
    if action == "reset" {
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

    #[test]
    fn commandlimit_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = CommandLimitAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["Set", "Reset", "List"]);
        assert_eq!(CommandLimitAction::Set.as_str(), "set");
        assert_eq!(CommandLimitAction::Reset.as_str(), "reset");
        assert_eq!(CommandLimitAction::List.as_str(), "list");
        assert_eq!(
            CommandLimitAction::from_name("set"),
            Some(CommandLimitAction::Set)
        );
        assert_eq!(
            CommandLimitAction::from_name("RESET"),
            Some(CommandLimitAction::Reset)
        );
        assert_eq!(
            CommandLimitAction::from_name("LIST"),
            Some(CommandLimitAction::List)
        );
        assert_eq!(CommandLimitAction::from_name("bogus"), None);
        assert_eq!(
            CommandLimitAction::from_index(0),
            Some(CommandLimitAction::Set)
        );
        assert_eq!(
            CommandLimitAction::from_index(2),
            Some(CommandLimitAction::List)
        );
        assert_eq!(CommandLimitAction::from_index(3), None);
        let list = CommandLimitAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Définir")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Réinitialiser")
        );
        assert_eq!(
            list[2].localizations.get("fr").map(String::as_str),
            Some("Lister")
        );
        assert_eq!(CommandLimitAction::Set.localized_name("ja"), Some("set"));
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn limit_serde_matches_ts_window_ms_key() {
        // TS writes `{count, windowMs}`; the struct must serialize to
        // that exact shape for cross-compat with the TS enforcer.
        let limit = CommandLimit {
            count: 2,
            window_ms: 60_000,
        };
        let v = serde_json::to_value(&limit).unwrap();
        assert_eq!(v, serde_json::json!({"count": 2, "windowMs": 60_000}));
        // New rows deserialize, and so do pre-fix `window_ms` rows.
        let from_new: CommandLimit =
            serde_json::from_value(serde_json::json!({"count": 2, "windowMs": 60_000})).unwrap();
        assert_eq!(from_new.window_ms, 60_000);
        let from_legacy: CommandLimit =
            serde_json::from_value(serde_json::json!({"count": 1, "window_ms": 10_000})).unwrap();
        assert_eq!(from_legacy.window_ms, 10_000);
    }

    #[test]
    fn autocomplete_filters_case_sensitive_substring_capped_at_25() {
        let paths = vec![
            "ban".to_string(),
            "commandlimit".to_string(),
            "Ban appeal".to_string(),
        ];
        assert_eq!(
            autocomplete_command_choices(&paths, "an"),
            vec![
                "ban".to_string(),
                "commandlimit".to_string(),
                "Ban appeal".to_string()
            ]
        );
        // Case-sensitive like TS `includes`: "AN" matches nothing.
        assert!(autocomplete_command_choices(&paths, "AN").is_empty());
        assert_eq!(
            autocomplete_command_choices(&paths, ""),
            vec![
                "ban".to_string(),
                "commandlimit".to_string(),
                "Ban appeal".to_string()
            ]
        );
        let many: Vec<String> = (0..40).map(|i| format!("cmd{i}")).collect();
        assert_eq!(autocomplete_command_choices(&many, "cmd").len(), 25);
    }

    #[tokio::test]
    async fn limits_write_routes_to_table_and_legacy() {
        let pool = memory_pool().await;
        let map = serde_json::json!({"ban": {"count": 2, "windowMs": 60_000}});
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
            &serde_json::json!({"kick": {"count": 1, "windowMs": 10_000}}).to_string(),
        )
        .await
        .unwrap();
        let loaded = load_command_limits_routed(&pool, "g1").await;
        assert_eq!(loaded["kick"].count, 1);
    }
}
