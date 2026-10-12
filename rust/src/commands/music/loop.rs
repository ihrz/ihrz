use super::*;

/// Loop-mode choice. Mirrors the `mode` option `choices` in
/// music.ts:97-118: slash shows `Off` / `On` (localized), the handler
/// maps each variant back to the TS `value` (`off` / `track`).
///
/// Recorded narrowing (choices-driven): TS `!loop.ts` forwards any
/// prefix string to `setRepeatMode` (typed `off | track | queue`), so
/// prefix `queue` used to work; the dropdown now constrains both paths
/// to the two slash choices, and prefix `queue` is rejected by the
/// framework. `parse_loop` still knows `queue` for its own unit tests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum LoopModeChoice {
    #[name = "Off"]
    #[name_localized("fr", "Désactiver")]
    #[name_localized("ja", "off")]
    #[name_localized("ru", "off")]
    #[name_localized("es-ES", "off")]
    #[name = "off"]
    Off,
    #[name = "On"]
    #[name_localized("fr", "Activer")]
    #[name_localized("ja", "on")]
    #[name_localized("ru", "on")]
    #[name_localized("es-ES", "on")]
    #[name = "track"]
    Track,
}

impl LoopModeChoice {
    /// TS `value` passed to `parse_loop` / `loop_glyph`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Off => "off",
            Self::Track => "track",
        }
    }
}

/// Set loop mode of the guild!
///
/// Loop repeat mode (off/track dropdown, mirrors `!loop.ts`).
// The old prefix `queue` spelling is retired with the dropdown (see
// the enum above): both paths now accept only the two slash choices.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "loop",
    name_localized("fr", "boucle"),
    name_localized("ja", "loop"),
    name_localized("ru", "loop"),
    name_localized("es-ES", "loop"),
    description_localized("fr", "Changer l'état de la boucle sur le serveur"),
    description_localized("ja", "サーバーのループモードを設定！"),
    description_localized("ru", "Установить режим повтора на сервере!"),
    description_localized("es-ES", "Establecer el modo de bucle del servidor!")
)]
pub async fn m_loop(
    ctx: Ctx<'_>,
    #[description_localized("fr", "Status de la boucle")]
    #[description_localized("ja", "ループタイプ")]
    #[description_localized("ru", "Тип повтора")]
    #[description_localized("es-ES", "Tipo de bucle")]
    #[description = "Loop Type"]
    mode: LoopModeChoice,
) -> Result<(), anyhow::Error> {
    let code = lang_code(&ctx).await;
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let mgr = synced_mgr(&ctx).await;
    let snap = mgr.snapshot(gid).await;
    let voice = voice_channel_of(&ctx);
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice.is_none() {
        say_key(&ctx, &code, "loop_no_queue", "There is no queue!").await?;
        return Ok(());
    }
    if guard_same_voice(
        &ctx,
        &code,
        voice,
        bot_voice_channel(&ctx, gid, snap.as_ref().and_then(|s| s.voice_channel)),
    )
    .await
    {
        return Ok(());
    }
    let Some(m) = parse_loop(mode.as_str()) else {
        // TS `!loop.ts` never validates: `setRepeatMode(mode)` with an
        // unknown mode just fails silently (caught + logged). Stay
        // silent too — no `msg_use_off_track` reply.
        return Ok(());
    };
    let live_mode: crate::lavalink::LoopMode = m.into();
    mgr.with_player(gid, |p| p.loop_mode = Some(live_mode))
        .await;
    let glyph = loop_glyph(mode.as_str());
    let msg = crate::lang::get(&code, "loop_command_work")
        .map(|s| s.replace("{mode}", glyph))
        .unwrap_or_else(|| format!("{glyph} | Updated loop mode"));
    ctx.say(msg).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loop_mode_choices_mirror_ts_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = LoopModeChoice::list().into_iter().map(|c| c.name).collect();
        assert_eq!(names, vec!["Off".to_string(), "On".to_string()]);
        assert_eq!(LoopModeChoice::Off.as_str(), "off");
        assert_eq!(LoopModeChoice::Track.as_str(), "track");
        assert_eq!(LoopModeChoice::from_name("off"), Some(LoopModeChoice::Off));
        assert_eq!(
            LoopModeChoice::from_name("TRACK"),
            Some(LoopModeChoice::Track)
        );
        assert_eq!(LoopModeChoice::from_name("ON"), Some(LoopModeChoice::Track));
        assert_eq!(LoopModeChoice::from_name("queue"), None);
        assert_eq!(LoopModeChoice::from_index(0), Some(LoopModeChoice::Off));
        assert_eq!(LoopModeChoice::from_index(1), Some(LoopModeChoice::Track));
        let list = LoopModeChoice::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Désactiver")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Activer")
        );
        assert_eq!(
            list[1].localizations.get("ja").map(String::as_str),
            Some("on")
        );
        assert_eq!(LoopModeChoice::Track.localized_name("fr"), Some("Activer"));
    }
}
