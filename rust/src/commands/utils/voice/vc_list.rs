use super::*;

// Show mode for the vc list. Mirrors the `show-mode` option choices
// in utils.ts:101-116 (`Large`/`Short`, values `large`/`short`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum VcShowMode {
    #[name = "Large"]
    #[name_localized("fr", "Complet")]
    #[name_localized("ja", "large")]
    #[name_localized("ru", "large")]
    #[name_localized("es-ES", "large")]
    Large,
    #[name = "Short"]
    #[name_localized("fr", "Court")]
    #[name_localized("ja", "short")]
    #[name_localized("ru", "short")]
    #[name_localized("es-ES", "short")]
    Short,
}

/// Get the voice states of the guild!
// TS decl (utils.ts `vc`): permission ManageGuild, no cooldown.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "vc",
    default_member_permissions = "MANAGE_GUILD",
    description_localized("fr", "Obtenez les états des vocaux du serveur"),
    description_localized("ja", "サーバーのボイス状態を取得！"),
    description_localized("ru", "Получить состояния голосовых каналов!"),
    description_localized("es-ES", "Obtener los estados de voz del servidor!")
)]
pub async fn vc_list(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Mode d'affichage (complet, court)")]
    #[description_localized("ja", "表示モード（大、簡易）")]
    #[description_localized("ru", "Режим отображения (большой, краткий)")]
    #[description_localized("es-ES", "Modo de visualización (grande, breve)")]
    #[description = "Show mode (large, brief)"]
    #[rename = "show-mode"]
    mode: Option<VcShowMode>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let http = ctx.serenity_context().http.clone();
    let is_large = matches!(mode, Some(VcShowMode::Large));
    // TS fetches members when the cache is empty. The cache guard
    // is scoped so no !Send guard crosses an await.
    let snapshot = {
        let cache = &ctx.serenity_context().cache;
        cache.guild(guild_id).map(|g| {
            (
                g.members.keys().copied().collect::<Vec<_>>(),
                g.presences.clone(),
                g.voice_states.clone(),
                g.name.clone(),
                g.member_count,
                g.premium_subscription_count.unwrap_or(0),
                // Pin png + size 4096 like
                // `iconURL({ size: 4096, extension: "png" })` in !vc.ts.
                g.icon.map(|h| {
                    format!(
                        "https://cdn.discordapp.com/icons/{}/{}.png?size=4096",
                        guild_id.get(),
                        h
                    )
                }),
                g.icon_url(),
            )
        })
    };
    let Some((member_ids, presences, voice_rows, name, member_count, boosts, icon_png, icon_thumb)) =
        snapshot
    else {
        return Ok(());
    };
    // Empty-cache path mirrors !vc.ts:59 (`if (members.cache.size === 0)
    // await guild.members.fetch()`): the TS fetch repopulates members AND
    // presences, so refresh the presence snapshot after the member refetch
    // instead of keeping the stale empty one (keeps totalOnline correct).
    let (member_ids, presences) = if member_ids.is_empty() {
        let fresh: Vec<poise::serenity_prelude::UserId> = guild_id
            .members(&http, Some(1000), None)
            .await
            .unwrap_or_default()
            .iter()
            .map(|m| m.user.id)
            .collect();
        let presences = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .map(|g| g.presences.clone())
            .unwrap_or(presences);
        (fresh, presences)
    } else {
        (member_ids, presences)
    };
    let statuses: Vec<Option<&str>> = member_ids
        .iter()
        .map(|id| presences.get(id).map(|p| p.status.name()))
        .collect();
    let member_stats = count_member_stats(&statuses);
    let states: Vec<(bool, bool, bool, bool, bool)> = voice_rows
        .values()
        .map(|v| {
            (
                v.channel_id.is_some(),
                v.self_stream.unwrap_or(false),
                v.self_deaf,
                v.self_mute,
                v.self_video,
            )
        })
        .collect();
    let voice_stats = count_voice_stats(&states);
    let total_online = member_stats.dnd + member_stats.online + member_stats.idle;
    let mut dominant = "#010101".to_string();
    if let Some(url) = icon_png {
        if let Ok((c1, _)) = crate::funcs::image_dominant_color(&url).await {
            dominant = c1;
        }
    }
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let labels = [
        t("var_member"),
        t("var_online"),
        t("var_online_call"),
        t("var_stream"),
        t("var_boosts"),
        t("var_camera"),
        t("var_muted"),
    ];
    let emo_names = [
        "Server_Stats",
        "VC_Limit",
        "Desktop_Online",
        "Streaming",
        "Server_Booster",
        "Camera",
        "Mute",
    ];
    let values = [
        member_count.to_string(),
        total_online.to_string(),
        voice_stats.total.to_string(),
        voice_stats.streaming.to_string(),
        boosts.to_string(),
        voice_stats.self_video.to_string(),
        voice_stats.self_deaf.to_string(),
    ];
    let larges = [false, false, false, false, false, true, true];
    let mut owned: Vec<(String, String, String, bool)> = vec![];
    for i in 0..7 {
        owned.push((
            stat_emoji(&http, emo_names[i]).await,
            labels[i].clone(),
            values[i].clone(),
            larges[i],
        ));
    }
    let refs: Vec<(&str, &str, String, bool)> = owned
        .iter()
        .map(|(a, b, c, d)| (a.as_str(), b.as_str(), c.clone(), *d))
        .collect();
    let colour = u32::from_str_radix(dominant.trim_start_matches('#'), 16).unwrap_or(0x010101);
    let mut embed = serenity::CreateEmbed::default()
        .title(format!("{} {} !", name, t("var_vc_stats")))
        .colour(serenity::Colour::new(colour))
        .description(vc_description(&refs, is_large));
    if let Some(thumb) = icon_thumb {
        embed = embed.thumbnail(thumb);
    }
    ctx.send(poise::CreateReply::default().embed(embed)).await?;
    if matches!(ctx, poise::Context::Application(_)) {
        let tick = stat_emoji(&http, "GreenTick").await;
        ctx.send(poise::CreateReply::default().content(tick).ephemeral(true))
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vc_show_mode_choices_mirror_ts_names_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = VcShowMode::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["Large".to_string(), "Short".to_string()]);
        assert_eq!(VcShowMode::from_name("large"), Some(VcShowMode::Large));
        assert_eq!(VcShowMode::from_name("SHORT"), Some(VcShowMode::Short));
        assert_eq!(VcShowMode::from_name("bogus"), None);
        assert_eq!(VcShowMode::from_index(0), Some(VcShowMode::Large));
        assert_eq!(VcShowMode::from_index(1), Some(VcShowMode::Short));
        let list = VcShowMode::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Complet")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Court")
        );
        assert_eq!(VcShowMode::Large.localized_name("ja"), Some("large"));
    }
}
