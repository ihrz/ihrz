use super::*;

/// Rolesaver action choice. Mirrors the `action` option `choices` in
/// rolesaver.ts:59-76: slash shows the localized display names, the
/// handler maps each variant back to the TS `value`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum RolesaverAction {
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

impl RolesaverAction {
    /// TS `value` (`on` / `off`).
    pub fn as_str(self) -> &'static str {
        match self {
            Self::On => "on",
            Self::Off => "off",
        }
    }
}

/// Rolesaver settings choice. Mirrors the `settings` option `choices`
/// in rolesaver.ts:97-114: slash shows the localized display names,
/// the handler maps each variant back to the TS `value` read by
/// `norm_rolesaver_settings`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum RolesaverSettings {
    #[name = "yes"]
    #[name_localized("en-US", "Yes")]
    #[name_localized("en-GB", "Yes")]
    #[name_localized("fr", "Oui")]
    #[name_localized("ja", "yes")]
    #[name_localized("ru", "yes")]
    #[name_localized("es-ES", "yes")]
    Yes,
    #[name = "no"]
    #[name_localized("en-US", "No")]
    #[name_localized("en-GB", "No")]
    #[name_localized("fr", "Non")]
    #[name_localized("ja", "no")]
    #[name_localized("ru", "no")]
    #[name_localized("es-ES", "no")]
    No,
}

impl RolesaverSettings {
    /// TS `value` read by `norm_rolesaver_settings`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
        }
    }
}

// Settings constraint (O6): the TS option offers `yes`/`no` choices
// (optional, absent -> `"None"`). Poise slash choices can't express
// the absent leg on one parameter, so free-text input outside the
// `yes`/`no` domain (prefix path, or any client bypassing choices)
// is coerced to `"None"`, keeping stored values in the TS domain
// {`yes`, `no`, `None`}.
/// Constrain a raw `settings` value to the TS choice domain.
/// `yes`/`no` (case-insensitive) pass through; anything else —
/// including absent — becomes `"None"`, mirroring
/// `getString("settings") || "None"` for the unconstrained path.
pub fn norm_rolesaver_settings(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_ascii_lowercase()) {
        Some(s) if s == "yes" => "yes".to_string(),
        Some(s) if s == "no" => "no".to_string(),
        _ => "None".to_string(),
    }
}
/// Rolesaver on/off switch (blob shape + embeds like
/// SlashCommands/newfeatures/rolesaver.ts).
#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "rolesaver",
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Ré-attribuer les anciens rôles lorsque l'utilisateur rejoint le serveur"
    ),
    description_localized("ja", "ユーザーが再参加した時に以前のロールを再付与！"),
    description_localized("ru", "Вернуть старые роли при повторном входе!"),
    description_localized(
        "es-ES",
        "Volver a dar roles antiguos cuando el usuario se reúne al servidor!"
    )
)]
pub async fn rolesaver(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: RolesaverAction,
    #[description = "Restore admin roles: yes or no"] settings: Option<RolesaverSettings>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (footer_name, footer_bytes) = crate::commands::utils::footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default().colour(serenity::Colour::new(0x3725a4));
    let mut reply = poise::CreateReply::default();
    // TS switches on exact `action === "on"` / `=== "off"` (slash
    // choices); any other value silently does nothing — no embed, no
    // store write.
    let action = action.as_str();
    if action == "on" {
        let settings = norm_rolesaver_settings(settings.map(|s| s.as_str()));
        let embed = serenity::CreateEmbed::default()
            .colour(serenity::Colour::new(0x3725a4))
            .title(t("rolesaver_embed_title"))
            .description(t("rolesaver_embed_desc"))
            .field(
                t("rolesaver_embed_fields_1_name"),
                format!("`{action}`"),
                false,
            )
            .field(
                t("rolesaver_embed_fields_2_name"),
                format!("`{settings}`"),
                false,
            )
            .field(t("rolesaver_embed_fields_3_name"), "`None`", false);
        let embed =
            crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
        reply = reply.embed(embed);
        if let Some(bytes) = footer_bytes {
            reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
        }
        ctx.send(reply).await?;
        crate::db::tbl_set_json(
            &ctx.data().pool,
            &gid,
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({
                "enable": true,
                "timeout": "None",
                "admin": settings,
            }),
        )
        .await?;
        return Ok(());
    }
    // TS `else if (action === "off")`: unknown actions return silently
    // above instead of running the off leg.
    if action != "off" {
        return Ok(());
    }
    if !load_rolesaver_cfg(&ctx.data().pool, &gid).await.enabled {
        ctx.say(t("rolesaver_on_off_already_set")).await?;
        return Ok(());
    }
    embed = embed
        .title(t("rolesaver_on_off_embed_title"))
        .description(t("rolesaver_on_off_embed_desc"))
        .field(
            t("rolesaver_on_off_embed_fields_1_name"),
            format!("`{action}`"),
            false,
        );
    let embed =
        crate::commands::utils::embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    reply = reply.embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    let _ = crate::db::tbl_del(&ctx.data().pool, &gid, "GUILD.GUILD_CONFIG.rolesaver").await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::RolesaverSettings;
    use super::{norm_rolesaver_settings, RolesaverAction};

    #[test]
    fn rolesaver_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = RolesaverAction::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(names, vec!["on".to_string(), "off".to_string()]);
        assert_eq!(RolesaverAction::On.as_str(), "on");
        assert_eq!(RolesaverAction::Off.as_str(), "off");
        assert_eq!(RolesaverAction::from_name("on"), Some(RolesaverAction::On));
        assert_eq!(
            RolesaverAction::from_name("off"),
            Some(RolesaverAction::Off)
        );
        assert_eq!(RolesaverAction::from_name("bogus"), None);
        assert_eq!(RolesaverAction::from_index(0), Some(RolesaverAction::On));
        assert_eq!(RolesaverAction::from_index(1), Some(RolesaverAction::Off));
        let settings: Vec<_> = RolesaverSettings::list()
            .into_iter()
            .map(|c| c.name)
            .collect();
        assert_eq!(settings, vec!["yes".to_string(), "no".to_string()]);
        assert_eq!(RolesaverSettings::Yes.as_str(), "yes");
        assert_eq!(RolesaverSettings::No.as_str(), "no");
        assert_eq!(
            RolesaverSettings::from_name("yes"),
            Some(RolesaverSettings::Yes)
        );
        assert_eq!(
            RolesaverSettings::from_name("no"),
            Some(RolesaverSettings::No)
        );
        assert_eq!(RolesaverSettings::from_name("bogus"), None);
        assert_eq!(
            RolesaverSettings::from_index(1),
            Some(RolesaverSettings::No)
        );
        // Values still feed norm_rolesaver_settings (absent -> "None").
        assert_eq!(
            norm_rolesaver_settings(Some(RolesaverSettings::Yes.as_str())),
            "yes"
        );
        assert_eq!(norm_rolesaver_settings(None), "None");
        let list = RolesaverAction::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        let settings = RolesaverSettings::list();
        assert_eq!(
            settings[0].localizations.get("fr").map(String::as_str),
            Some("Oui")
        );
        assert_eq!(
            settings[1].localizations.get("fr").map(String::as_str),
            Some("Non")
        );
    }
    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn rolesaver_on_off_roundtrip_through_loader() {
        let pool = mem_pool().await;
        // Off leg starts disabled (no rows).
        assert!(!super::super::load_rolesaver_cfg(&pool, "g").await.enabled);
        // On leg: structured dual write.
        crate::db::tbl_set_json(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({"enable": true, "timeout": "None", "admin": "yes"}),
        )
        .await
        .unwrap();
        let cfg = super::super::load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(!cfg.skip_admin);
        // Off leg: routed delete clears both stores.
        crate::db::tbl_del(&pool, "g", "GUILD.GUILD_CONFIG.rolesaver")
            .await
            .unwrap();
        assert!(!super::super::load_rolesaver_cfg(&pool, "g").await.enabled);
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.GUILD_CONFIG.rolesaver").await,
            None
        );
    }

    #[tokio::test]
    async fn rolesaver_admin_no_skips_admin() {
        let pool = mem_pool().await;
        crate::db::tbl_set_json(
            &pool,
            "g",
            "GUILD.GUILD_CONFIG.rolesaver",
            &serde_json::json!({"enable": true, "timeout": "None", "admin": "no"}),
        )
        .await
        .unwrap();
        let cfg = super::super::load_rolesaver_cfg(&pool, "g").await;
        assert!(cfg.enabled);
        assert!(cfg.skip_admin);
    }
}
