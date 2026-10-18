use super::*;
use poise::serenity_prelude as serenity;

/// Lastfm power choice. Mirrors the `power` option `choices` in
/// lastfm.ts:64-80: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum LastfmPower {
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

impl LastfmPower {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Status embed for the caller's Last.fm row. Mirrors
/// `lastFMScrobbler.generateUserEmbed` (color 2829617, title
/// `lastfm_embed_title` with `${userLabel}`, status / account /
/// connected-at fields, the latter as `<t:...:F>` from the ms
/// `connectedAt` like the TS `Math.floor(connectedAt / 1000)`).
pub async fn lastfm_user_embed(
    ctx: &Ctx<'_>,
    settings: &serde_json::Value,
) -> serenity::CreateEmbed {
    macro_rules! t {
        ($key:expr, $fb:expr $(,)?) => {
            crate::commands::lang_for(ctx, $key, $fb).await
        };
    }
    let enabled = settings
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let title = t!("lastfm_embed_title", "Last.fm configuration")
        .replace("${userLabel}", &ctx.author().name);
    let status = t!(
        if enabled {
            "var_enabled"
        } else {
            "var_disabled"
        },
        if enabled { "Enabled" } else { "Disabled" },
    );
    let account = settings
        .get("username")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .unwrap_or(t!("var_none", "None"));
    let mut embed = serenity::CreateEmbed::new()
        .color(2829617)
        .title(title)
        .field(t!("lastfm_embed_field_status", "Status"), status, true)
        .field(
            t!("lastfm_embed_field_account", "Connected account"),
            account,
            true,
        );
    // `if (settings?.connectedAt)` is a truthiness gate (0/missing
    // omit the field) and the stamp is `Math.floor(ms / 1000)`
    // (floor, so -500 -> -1): `as_i64` keeps negative rows visible
    // like the TS, `!= 0` mirrors the falsy-0 omit, `div_euclid` is
    // the exact floor-division mirror (battery scratch
    // `slice-w4s73-embed.cjs`, green 22/22).
    if let Some(ms) = settings
        .get("connectedAt")
        .and_then(|v| v.as_i64())
        .filter(|ms| *ms != 0)
    {
        embed = embed.field(
            t!("lastfm_embed_field_connected_at", "Connected on"),
            format!("<t:{}:F>", ms.div_euclid(1000)),
            true,
        );
    }
    embed
}

/// Enable or disable Last.fm scrobbling for your account.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    description_localized("fr", "Activez ou désactivez le scrobbling Last.fm pour votre compte."),
    description_localized("ja", "アカウントのLast.fmスクロブルを有効化または無効化。"),
    description_localized("ru", "Включить или отключить скробблинг Last.fm для вашего аккаунта."),
    description_localized(
        "es-ES",
        "Habilitar o deshabilitar el scrobbling de Last.fm para tu cuenta."
    )
)]
pub async fn lastfm_config(
    ctx: Ctx<'_>,
    // TS SlashCommands/lastfm/!config.ts reads getString("power", true).
    #[description = "Power On or Power Off the module"]
    #[description_localized("fr", "Activer ou désactiver le module")]
    #[description_localized("ja", "モジュールをオンまたはオフ")]
    #[description_localized("ru", "Включить или выключить модуль")]
    #[description_localized("es-ES", "Encender o Apagar el módulo")]
    #[rename = "power"]
    action: LastfmPower,
) -> Result<(), anyhow::Error> {
    // Per-USER switch (TS `setEnabled(interaction.user.id, enabled)`
    // on the `<uid>.lastfm` profile row): never the guild row. The old
    // `GUILD.LASTFM` write had no TS counterpart and no Rust reader.
    let pool = &ctx.data().pool;
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let yes = crate::emojis::app_emoji_markup(ctx.http(), "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    macro_rules! msg_for {
        ($key:expr, $fb:expr $(,)?) => {
            crate::commands::lang_for(&ctx, $key, $fb)
                .await
                .replace("${client.iHorizon_Emojis.Yes}", &yes)
                .replace("${client.iHorizon_Emojis.No}", &no)
        };
    }

    let uid = ctx.author().id.get();
    let enabled = matches!(action, LastfmPower::On);

    // `!config.ts` guard order (`enabled && !isConfigured()`): the
    // missing-config reply fires ONLY on the enable leg. Power-off always
    // reaches `setEnabled` (row write + live drop), even while the bot is
    // unconfigured — the old unconditional gate answered
    // `lastfm_module_not_configured` on power-off too, so an active session
    // could never be disabled after a key rotation/removal.
    // Battery: scratch `slice-w4s85-configgate.cjs`, green 10/10.
    if lastfm_config_missing_gate_fires(
        enabled,
        super::scrobbler::lastfm_configured(
            &ctx.data().config.lastfm_api_key,
            &ctx.data().config.lastfm_shared_secret,
        ),
    ) {
        let msg = msg_for!("lastfm_module_not_configured", "Last.fm is not configured.");
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }

    let settings = super::lastfm_settings(pool, uid).await;

    // `setEnabled` mirror: enabling needs a stored session
    // (`sessionKey` + `username`, i.e. a past `/lastfm login`); without
    // one TS answers `lastfm_config_login_required`.
    if enabled
        && !settings
            .as_ref()
            .map(super::lastfm_has_session)
            .unwrap_or(false)
    {
        let msg = msg_for!(
            "lastfm_config_login_required",
            "Login with /lastfm login first.",
        );
        ctx.send(poise::CreateReply::default().content(msg).ephemeral(true))
            .await?;
        return Ok(());
    }

    // Merge `{enabled}` over the stored row, preserving username /
    // sessionKey / connectedAt (TS `{...(settings || {}), enabled}`).
    // Disabling keeps the row intact (only `enabled` flips — unlike
    // `invalidate`, the sessionKey survives) but still drops the user
    // from every live session (TS `setEnabled` runs
    // `removeUserFromActiveSessions` on the `!enabled` leg, never a
    // finalize POST).
    let mut obj = settings.unwrap_or(serde_json::json!({}));
    if !obj.is_object() {
        obj = serde_json::json!({});
    }
    obj["enabled"] = serde_json::json!(enabled);
    super::save_lastfm_settings(pool, uid, &obj).await?;
    if !enabled {
        crate::lavalink::manager().lastfm_user_disabled(uid).await;
    }

    let content = msg_for!(
        if enabled {
            "lastfm_config_enabled"
        } else {
            "lastfm_config_disabled"
        },
        if enabled {
            "Last.fm scrobbling enabled."
        } else {
            "Last.fm scrobbling disabled."
        },
    );
    let embed = lastfm_user_embed(&ctx, &obj).await;
    // TS marks both subcommands `ephemeral: true`.
    ctx.send(
        poise::CreateReply::default()
            .content(content)
            .embed(embed)
            .ephemeral(true),
    )
    .await?;
    Ok(())
}

/// Pure `!config.ts` gate mirror (`enabled && !isConfigured()`): the
/// missing-config reply fires only when enabling while unconfigured.
/// Power-off always proceeds to the `setEnabled` write + live drop
/// (battery cases off+nocfg), and enabling while configured never
/// trips the gate (the login leg below answers instead).
/// Battery: scratch `slice-w4s85-configgate.cjs`, green 10/10.
fn lastfm_config_missing_gate_fires(enabled: bool, configured: bool) -> bool {
    enabled && !configured
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_missing_gate_matches_ts_enabled_and_guard() {
        assert!(lastfm_config_missing_gate_fires(true, false));
        assert!(!lastfm_config_missing_gate_fires(true, true));
        assert!(!lastfm_config_missing_gate_fires(false, true));
        assert!(!lastfm_config_missing_gate_fires(false, false));
    }

    #[test]
    fn lastfm_power_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = LastfmPower::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(LastfmPower::On.as_str(), "on");
        assert_eq!(LastfmPower::Off.as_str(), "off");
        assert_eq!(LastfmPower::from_name("on"), Some(LastfmPower::On));
        assert_eq!(LastfmPower::from_name("off"), Some(LastfmPower::Off));
        assert_eq!(LastfmPower::from_name("bogus"), None);
        assert_eq!(LastfmPower::from_index(0), Some(LastfmPower::On));
        assert_eq!(LastfmPower::from_index(1), Some(LastfmPower::Off));
        let list = LastfmPower::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(LastfmPower::Off.localized_name("fr"), Some("Désactiver"));
    }
}
