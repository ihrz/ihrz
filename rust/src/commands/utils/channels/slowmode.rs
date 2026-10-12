use super::*;

/// Fixed slowmode durations. Mirrors the `duration` option choices in
/// utils/util/util.ts:294-407 (`None`, `5 seconds`, ..., `6 hours`)
/// combined with the `timeConversion` table in util !cooldown.ts: the
/// slash label is the display name (`None`, `5 seconds`, ...), the
/// handler maps each variant back to the TS `value` (`0`, `5s`, ...,
/// `6h`), which doubles as the prefix alias.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum DurationChoice {
    #[name = "None"]
    #[name_localized("fr", "Aucun")]
    #[name_localized("ja", "none")]
    #[name_localized("ru", "none")]
    #[name_localized("es-ES", "none")]
    #[name = "0"]
    Off,
    #[name = "5 seconds"]
    #[name_localized("fr", "5 secondes")]
    #[name_localized("ja", "5_seconds")]
    #[name_localized("ru", "5_seconds")]
    #[name_localized("es-ES", "5_seconds")]
    #[name = "5s"]
    S5,
    #[name = "10 seconds"]
    #[name_localized("fr", "10 secondes")]
    #[name_localized("ja", "10_seconds")]
    #[name_localized("ru", "10_seconds")]
    #[name_localized("es-ES", "10_seconds")]
    #[name = "10s"]
    S10,
    #[name = "15 seconds"]
    #[name_localized("fr", "15 secondes")]
    #[name_localized("ja", "15_seconds")]
    #[name_localized("ru", "15_seconds")]
    #[name_localized("es-ES", "15_seconds")]
    #[name = "15s"]
    S15,
    #[name = "30 seconds"]
    #[name_localized("fr", "30 secondes")]
    #[name_localized("ja", "30_seconds")]
    #[name_localized("ru", "30_seconds")]
    #[name_localized("es-ES", "30_seconds")]
    #[name = "30s"]
    S30,
    #[name = "1 minute"]
    #[name_localized("fr", "1 minute")]
    #[name_localized("ja", "1_minute")]
    #[name_localized("ru", "1_minute")]
    #[name_localized("es-ES", "1_minute")]
    #[name = "1m"]
    M1,
    #[name = "2 minutes"]
    #[name_localized("fr", "2 minutes")]
    #[name_localized("ja", "2_minutes")]
    #[name_localized("ru", "2_minutes")]
    #[name_localized("es-ES", "2_minutes")]
    #[name = "2m"]
    M2,
    #[name = "5 minutes"]
    #[name_localized("fr", "5 minutes")]
    #[name_localized("ja", "5_minutes")]
    #[name_localized("ru", "5_minutes")]
    #[name_localized("es-ES", "5_minutes")]
    #[name = "5m"]
    M5,
    #[name = "10 minutes"]
    #[name_localized("fr", "10 minutes")]
    #[name_localized("ja", "10_minutes")]
    #[name_localized("ru", "10_minutes")]
    #[name_localized("es-ES", "10_minutes")]
    #[name = "10m"]
    M10,
    #[name = "15 minutes"]
    #[name_localized("fr", "15 minutes")]
    #[name_localized("ja", "15_minutes")]
    #[name_localized("ru", "15_minutes")]
    #[name_localized("es-ES", "15_minutes")]
    #[name = "15m"]
    M15,
    #[name = "30 minutes"]
    #[name_localized("fr", "30 minutes")]
    #[name_localized("ja", "30_minutes")]
    #[name_localized("ru", "30_minutes")]
    #[name_localized("es-ES", "30_minutes")]
    #[name = "30m"]
    M30,
    #[name = "1 hour"]
    #[name_localized("fr", "1 heure")]
    #[name_localized("ja", "1_hour")]
    #[name_localized("ru", "1_hour")]
    #[name_localized("es-ES", "1_hour")]
    #[name = "1h"]
    H1,
    #[name = "2 hours"]
    #[name_localized("fr", "2 heures")]
    #[name_localized("ja", "2_hours")]
    #[name_localized("ru", "2_hours")]
    #[name_localized("es-ES", "2_hours")]
    #[name = "2h"]
    H2,
    #[name = "6 hours"]
    #[name_localized("fr", "6 heures")]
    #[name_localized("ja", "6_hours")]
    #[name_localized("ru", "6_hours")]
    #[name_localized("es-ES", "6_hours")]
    #[name = "6h"]
    H6,
}

/// Seconds for a duration choice. Mirrors `timeConversion[duration]`
/// in util !cooldown.ts.
pub fn duration_seconds(choice: DurationChoice) -> u16 {
    match choice {
        DurationChoice::Off => 0,
        DurationChoice::S5 => 5,
        DurationChoice::S10 => 10,
        DurationChoice::S15 => 15,
        DurationChoice::S30 => 30,
        DurationChoice::M1 => 60,
        DurationChoice::M2 => 120,
        DurationChoice::M5 => 300,
        DurationChoice::M10 => 600,
        DurationChoice::M15 => 900,
        DurationChoice::M30 => 1800,
        DurationChoice::H1 => 3600,
        DurationChoice::H2 => 7200,
        DurationChoice::H6 => 21600,
    }
}

/// Set a cooldown in the current channel. Mirrors util cooldown (!cooldown.ts).
// Canonical slash name is `cooldown` (TS util/util.ts); `slowmode`
// stays as a prefix/slash alias. Disable via the `0` choice.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "cooldown",
    aliases("slowmode", "setcooldown", "coldown", "slow"),
    default_member_permissions = "MANAGE_CHANNELS",
    description_localized("fr", "Mettre un coodlown dans le salon actuel"),
    description_localized("ja", "現在のチャンネルにクールダウンを設定"),
    description_localized("ru", "Установить задержку в текущем канале"),
    description_localized("es-ES", "Establecer un enfriamiento en el canal actual")
)]
pub async fn slowmode(
    ctx: Ctx<'_>,
    #[name_localized("fr", "durée")]
    #[name_localized("ja", "duration")]
    #[name_localized("ru", "duration")]
    #[name_localized("es-ES", "duration")]
    #[description_localized("fr", "La durée du slow mode")]
    #[description_localized("ja", "低速モードの時間")]
    #[description_localized("ru", "Длительность замедленного режима")]
    #[description_localized("es-ES", "La duración del modo lento")]
    #[description = "Duration"]
    duration: DurationChoice,
) -> Result<(), anyhow::Error> {
    let secs = duration_seconds(duration);
    apply_slowmode(ctx, secs, None).await
}

/// Shared slowmode edit. Mirrors !cooldown.ts (unslowmode.ts delegates
/// with `0`): bot ManageChannels gate, current-channel default, edit +
/// ok reply.
pub async fn apply_slowmode(
    ctx: Ctx<'_>,
    secs: u16,
    channel_id: Option<poise::serenity_prelude::ChannelId>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Bot-side ManageChannels gate, like the TS
    // `members.me.permissions.has(ManageChannels)` check. The TS reply
    // is a plain public message (interactionSend without flags).
    if !bot_guild_permissions(&ctx, guild_id).manage_channels() {
        let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(t("unban_bot_dont_have_permission").replace("${client.iHorizon_Emojis.No}", &no))
            .await?;
        return Ok(());
    }
    let ch_id = match channel_id {
        Some(id) => id,
        None => match ctx.guild_channel().await {
            Some(c) => c.id,
            None => return Ok(()),
        },
    };
    ch_id
        .edit(
            ctx.http(),
            poise::serenity_prelude::EditChannel::new().rate_limit_per_user(secs),
        )
        .await?;
    // TS fills `${duration_in_string}` with `to_beautiful_string`
    // using the guild lang; mirror with the lang-aware helper.
    let pretty = crate::commands::guildconfig::beautiful_ms_lang(f64::from(secs) * 1000.0, &code);
    ctx.say(
        crate::lang::get(&code, "util_cooldown_command_ok")
            .map(|s| s.replace("${duration_in_string}", &pretty))
            .unwrap_or_else(|| format!("Slowmode {pretty}.")),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use poise::ChoiceParameter as _;

    #[test]
    fn duration_choice_full_map() {
        let cases = [
            ("0", 0u16),
            ("5s", 5),
            ("10s", 10),
            ("15s", 15),
            ("30s", 30),
            ("1m", 60),
            ("2m", 120),
            ("5m", 300),
            ("10m", 600),
            ("15m", 900),
            ("30m", 1800),
            ("1h", 3600),
            ("2h", 7200),
            ("6h", 21600),
        ];
        assert_eq!(cases.len(), 14);
        for (label, secs) in cases {
            let choice = DurationChoice::from_name(label).unwrap_or_else(|| {
                panic!("unknown duration label {label}");
            });
            assert_eq!(duration_seconds(choice), secs);
        }
    }

    #[test]
    fn duration_choice_names_and_locales_mirror_ts() {
        // Display names, byte-exact from util.ts:294+.
        let names: Vec<_> = DurationChoice::list().into_iter().map(|c| c.name).collect();
        assert_eq!(
            names,
            vec![
                "None",
                "5 seconds",
                "10 seconds",
                "15 seconds",
                "30 seconds",
                "1 minute",
                "2 minutes",
                "5 minutes",
                "10 minutes",
                "15 minutes",
                "30 minutes",
                "1 hour",
                "2 hours",
                "6 hours",
            ]
        );
        // Display names parse too (main names), values stay aliases.
        assert_eq!(DurationChoice::from_name("None"), Some(DurationChoice::Off));
        assert_eq!(
            DurationChoice::from_name("5 minutes"),
            Some(DurationChoice::M5)
        );
        assert_eq!(
            DurationChoice::from_name("6 HOURS"),
            Some(DurationChoice::H6)
        );
        assert_eq!(DurationChoice::from_index(0), Some(DurationChoice::Off));
        assert_eq!(DurationChoice::from_index(13), Some(DurationChoice::H6));
        assert_eq!(DurationChoice::from_index(14), None);
        let list = DurationChoice::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Aucun")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("5 secondes")
        );
        assert_eq!(
            list[11].localizations.get("fr").map(String::as_str),
            Some("1 heure")
        );
        assert_eq!(
            list[13].localizations.get("fr").map(String::as_str),
            Some("6 heures")
        );
        assert_eq!(
            list[5].localizations.get("ja").map(String::as_str),
            Some("1_minute")
        );
        assert_eq!(DurationChoice::Off.localized_name("fr"), Some("Aucun"));
        assert_eq!(DurationChoice::H2.localized_name("es-ES"), Some("2_hours"));
    }

    #[test]
    fn duration_choice_rejects_unknown_label() {
        assert_eq!(DurationChoice::from_name("5 min"), None);
        assert_eq!(DurationChoice::from_name(""), None);
    }
}
