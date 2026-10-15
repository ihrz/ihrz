use super::*;

/// Ticket config action choice. Mirrors the `action` option `choices`
/// in ticket.ts:185-204: slash shows the localized display names, the
/// handler maps each variant back to the TS `value` read by
/// `parse_config_action`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum TicketConfigAction {
    #[name = "off"]
    #[name_localized("en-US", "Remove the module")]
    #[name_localized("en-GB", "Remove the module")]
    #[name_localized("fr", "Supprimer le module")]
    #[name_localized("ja", "remove_the_module")]
    #[name_localized("ru", "remove_the_module")]
    #[name_localized("es-ES", "remove_the_module")]
    Off,
    #[name = "on"]
    #[name_localized("en-US", "Power on the module")]
    #[name_localized("en-GB", "Power on the module")]
    #[name_localized("fr", "Activer le module")]
    #[name_localized("ja", "power_on_the_module")]
    #[name_localized("ru", "power_on_the_module")]
    #[name_localized("es-ES", "power_on_the_module")]
    On,
}

impl TicketConfigAction {
    /// TS `value` read by `parse_config_action`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Off => "off",
            Self::On => "on",
        }
    }
}

/// Parse the config action. Mirrors !config.ts:50/68 — only the exact
/// `on` / `off` values act (slash choices lock to those); anything else
/// is a silent no-op, never a disable.
pub fn parse_config_action(action: &str) -> Option<bool> {
    match action {
        "on" => Some(true),
        "off" => Some(false),
        _ => None,
    }
}

/// Disable ticket commands on a guild!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("ticket-config"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Désactiver les commande de ticket au seins du serveur"),
    description_localized("ja", "サーバーでチケットコマンドを無効化！"),
    description_localized("ru", "Отключить команды тикетов на сервере!"),
    description_localized("es-ES", "Deshabilitar los comandos de ticket en un servidor!")
)]
pub async fn ticket_config(
    ctx: Ctx<'_>,
    // Option (not required): TS reads `getString("action")`
    // (!config.ts:45, nullable) and the prefix path reads
    // `string(args, 0)` (nullable); an unknown value is a silent
    // no-op (neither the `off` nor the `on` leg). A required poise
    // choice would parse-error on the bare prefix form instead.
    #[description = "What you want to do ?"]
    #[description_localized("fr", "Que veux-tu faire? ")]
    #[description_localized("ja", "何をしたいですか？")]
    #[description_localized("ru", "Что вы хотите сделать?")]
    #[description_localized("es-ES", "Que quieres hacer?")]
    action: Option<TicketConfigAction>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let Some(action) = action else {
        return Ok(());
    };
    let Some(enabled) = parse_config_action(action.as_str()) else {
        return Ok(());
    };
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
    // Enable deletes the row: legacy pre-U-ETERNAL-68 `"false"` rows
    // migrate on read (deleted, treated as enabled — see ticket_disabled),
    // so writers never store `"false"`. TS `set(key, false)` is natively
    // falsy; absence is the strings-only equivalent (same verdict as
    // guildconfig/support.rs: never write a falsy-looking string a TS
    // truthiness check reads).
    // Disable stores `"true"` in both stores.
    if enabled {
        crate::commands::owner::main::routed_del(
            &ctx.data().pool,
            &gid,
            &gid,
            "GUILD.TICKET.disable",
        )
        .await?;
    } else {
        crate::commands::owner::main::routed_set(
            &ctx.data().pool,
            &gid,
            &gid,
            "GUILD.TICKET.disable",
            "true",
        )
        .await?;
    }
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
    use super::parse_config_action;
    use super::TicketConfigAction;

    #[test]
    fn ticket_config_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        // TS order: off first, then on.
        let names: Vec<_> = TicketConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["off".to_string(), "on".to_string()]);
        assert_eq!(TicketConfigAction::Off.as_str(), "off");
        assert_eq!(TicketConfigAction::On.as_str(), "on");
        assert_eq!(
            TicketConfigAction::from_name("off"),
            Some(TicketConfigAction::Off)
        );
        assert_eq!(
            TicketConfigAction::from_name("on"),
            Some(TicketConfigAction::On)
        );
        assert_eq!(TicketConfigAction::from_name("bogus"), None);
        assert_eq!(
            TicketConfigAction::from_index(0),
            Some(TicketConfigAction::Off)
        );
        assert_eq!(
            TicketConfigAction::from_index(1),
            Some(TicketConfigAction::On)
        );
        let list = TicketConfigAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Supprimer le module")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Activer le module")
        );
        assert_eq!(
            TicketConfigAction::On.localized_name("ja"),
            Some("power_on_the_module")
        );
    }
    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn only_exact_on_off_act() {
        assert_eq!(parse_config_action("on"), Some(true));
        assert_eq!(parse_config_action("off"), Some(false));
        // Anything else is a silent no-op, never a disable.
        for bad in [
            "", "ON", "OFF", "power on", "enable", "disable", " on", "on ",
        ] {
            assert_eq!(parse_config_action(bad), None, "input: {bad:?}");
        }
    }

    #[tokio::test]
    async fn disable_flag_dual_writes_table_and_legacy() {
        use crate::commands::owner::main::tbl_get_value;
        let pool = mem_pool().await;
        crate::commands::owner::main::routed_set(&pool, "g", "g", "GUILD.TICKET.disable", "true")
            .await
            .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.TICKET.disable")
                .await
                .as_deref(),
            Some("true")
        );
        assert!(tbl_get_value(&pool, "g", "GUILD.TICKET.disable")
            .await
            .is_some());
    }
}
