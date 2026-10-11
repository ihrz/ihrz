use super::*;
use poise::serenity_prelude as serenity;

/// Config action choice. Mirrors the `action` option `choices` in
/// confession.ts:122-138: slash shows the localized display names,
/// the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum ConfessionConfigAction {
    #[name = "Power On"]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    #[name = "on"]
    On,
    #[name = "Power Off"]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    #[name = "off"]
    Off,
}

impl ConfessionConfigAction {
    /// TS `value` parsed by `parse_on_off`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Audit entry for enable/disable. Mirrors `client.func.ihorizon_logs`
/// in !config.ts (called on both `on` and `off`; the off branch keeps
/// the TS quirk of reusing the on-enable title). Best-effort, silent
/// when the `ihorizon-logs` channel is missing.
pub async fn post_config_log(
    http: &serenity::Http,
    guild_id: serenity::GuildId,
    lang_code: &str,
    author_id: u64,
    enabled: bool,
) {
    let Ok(channels) = http.get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let title = crate::lang::get(lang_code, "confession_log_embed_title_on_enable")
        .unwrap_or_else(|| "Confession Enable/Disable".to_string());
    let desc_key = if enabled {
        "confession_log_embed_desc_on_enable"
    } else {
        "confession_log_embed_desc_on_disabled"
    };
    let desc = crate::lang::get(lang_code, desc_key)
        .map(|s| s.replace("${interaction.user}", &format!("<@{author_id}>")))
        .unwrap_or_else(|| format!("<@{author_id}> toggled the Confession module."));
    let embed = serenity::CreateEmbed::default()
        .colour(0xbf_0b_b9)
        .title(title)
        .description(desc);
    let _ = ch
        .id
        .send_message(http, serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Enable or disable the confession module. Mirrors !config.ts.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("confess-config"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized("fr", "Activer ou désactiver le module"),
    description_localized("ja", "告白モジュールを有効化または無効化！"),
    description_localized("ru", "Включить или отключить модуль признаний!"),
    description_localized("es-ES", "Habilitar o Deshabilitar el módulo de confesiones!")
)]
pub async fn confession_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: ConfessionConfigAction,
) -> Result<(), anyhow::Error> {
    // Unknown actions are a silent no-op, mirroring !config.ts (its
    // if/else-if simply falls through with no reply).
    let action = action.as_str();
    let Some(enabled) = parse_on_off(action) else {
        return Ok(());
    };
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    // TS !config.ts writes the legacy `CONFESSION.disable` boolean; keep
    // the namespaced `GUILD.CONFESSION.disable` too so both readers
    // agree. Disable stores `"true"`; enable deletes both rows (never
    // writes `"false"`: legacy rows migrate on read — deleted, treated as
    // enabled (see is_confession_disabled) — same verdict as
    // ticket/config.rs).
    if enabled {
        crate::commands::owner::main::routed_del(pool, &gid, &gid, "CONFESSION.disable").await?;
        crate::commands::owner::main::routed_del(pool, &gid, &gid, "GUILD.CONFESSION.disable")
            .await?;
    } else {
        crate::commands::owner::main::routed_set(pool, &gid, &gid, "CONFESSION.disable", "true")
            .await?;
        crate::commands::owner::main::routed_set(
            pool,
            &gid,
            &gid,
            "GUILD.CONFESSION.disable",
            "true",
        )
        .await?;
    }
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let key = if enabled {
        "confession_disable_command_work_on"
    } else {
        "confession_disable_command_work_off"
    };
    ctx.say(crate::lang::get(&code, key).unwrap_or_else(|| key.to_string()))
        .await?;
    // Audit entry on both states, mirroring ihorizon_logs in !config.ts.
    if let Some(guild_id) = ctx.guild_id() {
        post_config_log(ctx.http(), guild_id, &code, ctx.author().id.get(), enabled).await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::ConfessionConfigAction;

    #[test]
    fn config_action_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = ConfessionConfigAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["Power On".to_string(), "Power Off".to_string()]);
        assert_eq!(ConfessionConfigAction::On.as_str(), "on");
        assert_eq!(ConfessionConfigAction::Off.as_str(), "off");
        assert_eq!(
            ConfessionConfigAction::from_name("on"),
            Some(ConfessionConfigAction::On)
        );
        assert_eq!(
            ConfessionConfigAction::from_name("POWER OFF"),
            Some(ConfessionConfigAction::Off)
        );
        assert_eq!(ConfessionConfigAction::from_name("maybe"), None);
        assert_eq!(
            ConfessionConfigAction::from_index(0),
            Some(ConfessionConfigAction::On)
        );
        assert_eq!(
            ConfessionConfigAction::from_index(1),
            Some(ConfessionConfigAction::Off)
        );
        let list = ConfessionConfigAction::list();
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
            Some("power_on")
        );
        assert_eq!(
            list[1].localizations.get("es-ES").map(String::as_str),
            Some("power_off")
        );
    }

    #[test]
    fn confession_config_registers_description_localizations() {
        let cmd = super::confession_config();
        assert_eq!(
            cmd.description_localizations.get("fr").map(String::as_str),
            Some("Activer ou désactiver le module")
        );
        assert_eq!(
            cmd.description_localizations.get("ja").map(String::as_str),
            Some("告白モジュールを有効化または無効化！")
        );
        assert_eq!(
            cmd.description_localizations.get("ru").map(String::as_str),
            Some("Включить или отключить модуль признаний!")
        );
        assert_eq!(
            cmd.description_localizations
                .get("es-ES")
                .map(String::as_str),
            Some("Habilitar o Deshabilitar el módulo de confesiones!")
        );
    }
}
