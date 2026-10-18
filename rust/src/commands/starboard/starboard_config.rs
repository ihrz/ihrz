use super::*;

/// Starboard config action choice. Mirrors the `action` option
/// `choices` in starboard.ts:76-92: slash shows the localized display
/// names, the handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum StarboardConfigAction {
    #[name = "on"]
    #[name_localized("en-US", "Power On")]
    #[name_localized("en-GB", "Power On")]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "power_on")]
    #[name_localized("ru", "power_on")]
    #[name_localized("es-ES", "power_on")]
    On,
    #[name = "off"]
    #[name_localized("en-US", "Power Off")]
    #[name_localized("en-GB", "Power Off")]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "power_off")]
    #[name_localized("ru", "power_off")]
    #[name_localized("es-ES", "power_off")]
    Off,
}

impl StarboardConfigAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Enable or disable the module. Mirrors !config.ts.
// Prefix alias "starboarconfig" keeps the exact TS prefixName (typo included).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("starboarconfig"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn starboard_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: StarboardConfigAction,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the Administrator leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::ADMINISTRATOR,
    )
    .await
    {
        return Ok(());
    }
    let enabled = matches!(action, StarboardConfigAction::On);
    let Some(gid) = ctx.guild_id().map(|g| g.get().to_string()) else {
        return Ok(());
    };
    let mut cfg = load_board(&ctx.data().pool, &gid, "starboard").await;
    cfg.enabled = if enabled {
        "yes".to_string()
    } else {
        "no".to_string()
    };
    save_board(&ctx.data().pool, &gid, "starboard", &cfg).await?;
    let yes = yes_markup(ctx.http()).await;
    let text = crate::commands::lang_for(
        &ctx,
        "starboard_config_command_ok",
        "${client.iHorizon_Emojis.Yes} | **Starboard module is now ${action}**",
    )
    .await
    .replace("${client.iHorizon_Emojis.Yes}", &yes)
    .replace("${action}", if enabled { "on" } else { "off" });
    ctx.say(text).await?;
    Ok(())
}
