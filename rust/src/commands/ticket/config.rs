use super::*;

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

/// Config the message when user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ticket_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let Some(enabled) = parse_config_action(&action) else {
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
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        "GUILD.TICKET.disable",
        // Real JSON booleans like TS (`client.db.set(key, true/false)`,
        // sqlite driver JSON-stringifies); readers stay tolerant of the
        // legacy `"0"`/`"1"` strings on both sides.
        if enabled { "false" } else { "true" },
    )
    .await?;
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
