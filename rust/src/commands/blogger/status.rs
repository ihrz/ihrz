use super::*;

/// Blogger power choice. Mirrors the `power` on/off choices in
/// blogger.ts:205-221 (display names `Power On` / `Power Off`,
/// localized per locale).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum BloggerPower {
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

/// Get the bot status!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "status",
    default_member_permissions = "MANAGE_GUILD"
)]
pub async fn blogger_status(
    ctx: Ctx<'_>,
    #[description = "on or off"] power: BloggerPower,
) -> Result<(), anyhow::Error> {
    // Prefix native-permission gate (U-MSV-FIX14): TS `checkNativePermission`
    // enforces the ManageGuild leaf on both paths; Discord covers slash,
    // so the body gates prefix here with the same `var_dont_have_perm` denial.
    if crate::commands::shared::deny_without_prefix_perm(
        &ctx,
        poise::serenity_prelude::Permissions::MANAGE_GUILD,
    )
    .await
    {
        return Ok(());
    }
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // TS `!status.ts` reads `power` (choices on/off); only On enables.
    let enabled = matches!(power, BloggerPower::On);
    // TS `!status.ts` writes a real boolean
    // (`client.db.set(key, enabled)`); the TS reader (`Blogger.ts`
    // refresh: `if (!entry.value.enabled) continue`) uses JS truthiness,
    // where the string "0" is truthy — so a "0"/"1" string write could
    // never disable the module. Store a JSON boolean like TS.
    crate::backends::Backend::sqlite(ctx.data().pool.clone())
        .table(&gid)
        .set("BLOGGER.enabled", enabled)
        .await?;
    // Lang status line + configuration embed (TS !status.ts sends
    // blogger_config_status_enabled/disabled + generateConfigurationEmbed).
    let content = if enabled {
        say(
            "blogger_config_status_enabled",
            "Blogger module has been **enabled**. RSS feeds will be monitored.",
        )
    } else {
        say(
            "blogger_config_status_disabled",
            "Blogger module has been **disabled**. RSS feeds will not be monitored.",
        )
    };
    let total = load_blogs(&ctx.data().pool, &gid).await.len();
    ctx.send(
        poise::CreateReply::default()
            .content(content)
            .embed(config_embed(&code, enabled, total)),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blogger_power_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = BloggerPower::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["Power On".to_string(), "Power Off".to_string()]);
        assert_eq!(BloggerPower::from_name("on"), Some(BloggerPower::On));
        assert_eq!(
            BloggerPower::from_name("POWER OFF"),
            Some(BloggerPower::Off)
        );
        assert_eq!(BloggerPower::from_name("bogus"), None);
        assert_eq!(BloggerPower::from_index(0), Some(BloggerPower::On));
        assert_eq!(BloggerPower::from_index(1), Some(BloggerPower::Off));
        let list = BloggerPower::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
        assert_eq!(BloggerPower::On.localized_name("ja"), Some("power_on"));
    }
}
