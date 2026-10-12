use super::*;

// Mirrors `!volume.ts:60-79` (`parseInt(String(query))`, `setVolume` +
// `customVolume` re-apply). Two recorded differences: non-numeric
// input is refused instead of storing NaN, and the reply shows the
// clamped level actually applied (TS echoes the raw query, so
// `!volume 500` would claim 500% while playing 100%).
//
/// Volume-level choice. Mirrors the `level` option `choices` in
/// music.ts:294-304 (`VOLUMES`, music.ts:30-43): slash shows `10%`
/// … `100%` (same label in every locale), the handler maps each
/// variant back to the TS `value` (`10` … `100`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum VolumeChoice {
    #[name = "10%"]
    #[name_localized("fr", "10%")]
    #[name_localized("ja", "10%")]
    #[name_localized("ru", "10%")]
    #[name_localized("es-ES", "10%")]
    #[name = "10"]
    V10,
    #[name = "20%"]
    #[name_localized("fr", "20%")]
    #[name_localized("ja", "20%")]
    #[name_localized("ru", "20%")]
    #[name_localized("es-ES", "20%")]
    #[name = "20"]
    V20,
    #[name = "30%"]
    #[name_localized("fr", "30%")]
    #[name_localized("ja", "30%")]
    #[name_localized("ru", "30%")]
    #[name_localized("es-ES", "30%")]
    #[name = "30"]
    V30,
    #[name = "35%"]
    #[name_localized("fr", "35%")]
    #[name_localized("ja", "35%")]
    #[name_localized("ru", "35%")]
    #[name_localized("es-ES", "35%")]
    #[name = "35"]
    V35,
    #[name = "45%"]
    #[name_localized("fr", "45%")]
    #[name_localized("ja", "45%")]
    #[name_localized("ru", "45%")]
    #[name_localized("es-ES", "45%")]
    #[name = "45"]
    V45,
    #[name = "55%"]
    #[name_localized("fr", "55%")]
    #[name_localized("ja", "55%")]
    #[name_localized("ru", "55%")]
    #[name_localized("es-ES", "55%")]
    #[name = "55"]
    V55,
    #[name = "60%"]
    #[name_localized("fr", "60%")]
    #[name_localized("ja", "60%")]
    #[name_localized("ru", "60%")]
    #[name_localized("es-ES", "60%")]
    #[name = "60"]
    V60,
    #[name = "70%"]
    #[name_localized("fr", "70%")]
    #[name_localized("ja", "70%")]
    #[name_localized("ru", "70%")]
    #[name_localized("es-ES", "70%")]
    #[name = "70"]
    V70,
    #[name = "80%"]
    #[name_localized("fr", "80%")]
    #[name_localized("ja", "80%")]
    #[name_localized("ru", "80%")]
    #[name_localized("es-ES", "80%")]
    #[name = "80"]
    V80,
    #[name = "90%"]
    #[name_localized("fr", "90%")]
    #[name_localized("ja", "90%")]
    #[name_localized("ru", "90%")]
    #[name_localized("es-ES", "90%")]
    #[name = "90"]
    V90,
    #[name = "95%"]
    #[name_localized("fr", "95%")]
    #[name_localized("ja", "95%")]
    #[name_localized("ru", "95%")]
    #[name_localized("es-ES", "95%")]
    #[name = "95"]
    V95,
    #[name = "100%"]
    #[name_localized("fr", "100%")]
    #[name_localized("ja", "100%")]
    #[name_localized("ru", "100%")]
    #[name_localized("es-ES", "100%")]
    #[name = "100"]
    V100,
}

impl VolumeChoice {
    /// TS `value` parsed by `parse_volume_query`.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::V10 => "10",
            Self::V20 => "20",
            Self::V30 => "30",
            Self::V35 => "35",
            Self::V45 => "45",
            Self::V55 => "55",
            Self::V60 => "60",
            Self::V70 => "70",
            Self::V80 => "80",
            Self::V90 => "90",
            Self::V95 => "95",
            Self::V100 => "100",
        }
    }
}
/// change the volume of the player in the guild
///
/// Set the playback volume (10-100).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "volume",
    description_localized("fr", "changer le son du player sur le serveur"),
    description_localized("ja", "サーバーのプレイヤーの音量を変更"),
    description_localized("ru", "изменить громкость плеера на сервере"),
    description_localized("es-ES", "cambiar el volumen del reproductor en el servidor")
)]
pub async fn m_volume(
    ctx: Ctx<'_>,
    #[description_localized("fr", "le niveau du son")]
    #[description_localized("ja", "音楽レベル")]
    #[description_localized("ru", "уровень музыки")]
    #[description_localized("es-ES", "el nivel de música")]
    #[description = "the music level"]
    level: VolumeChoice,
) -> Result<(), anyhow::Error> {
    let Some(gid) = guild_id_of(&ctx) else {
        return Ok(());
    };
    let code = lang_code(&ctx).await;
    let Some(want) = parse_volume_query(level.as_str()) else {
        say_key(
            &ctx,
            &code,
            "music_volume_invalid",
            "Invalid volume: give a number between 10 and 100.",
        )
        .await?;
        return Ok(());
    };
    let m = synced_mgr(&ctx).await;
    let snap = m.snapshot(gid).await;
    if snap.as_ref().and_then(|s| s.current.clone()).is_none() || voice_channel_of(&ctx).is_none() {
        say_key(
            &ctx,
            &code,
            "pause_nothing_playing",
            "There is nothing playing",
        )
        .await?;
        return Ok(());
    }
    let v = m.with_player(gid, |p| p.set_volume(i64::from(want))).await;
    if let Ok((node, session)) = m.live_node_and_session(gid).await {
        let _ = m.rest_set_volume(&node, &session, gid, v).await;
    }
    let yes = emoji_markup(&ctx, "Yes", "✅").await;
    let msg = crate::lang::get(&code, "music_volume_command_ok")
        .map(|s| {
            s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                .replace("${Number(query)}", &v.to_string())
        })
        .unwrap_or_else(|| format!("Volume set to `{v}`%"));
    ctx.say(msg).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn volume_choices_mirror_ts_volumes_names_values_and_locales() {
        use poise::ChoiceParameter as _;
        let names: Vec<_> = VolumeChoice::list().into_iter().map(|c| c.name).collect();
        assert_eq!(
            names,
            vec![
                "10%", "20%", "30%", "35%", "45%", "55%", "60%", "70%", "80%", "90%", "95%",
                "100%",
            ]
        );
        assert_eq!(VolumeChoice::V10.as_str(), "10");
        assert_eq!(VolumeChoice::V100.as_str(), "100");
        assert_eq!(VolumeChoice::from_name("80%"), Some(VolumeChoice::V80));
        assert_eq!(VolumeChoice::from_name("100"), Some(VolumeChoice::V100));
        assert_eq!(VolumeChoice::from_name("75"), None);
        assert_eq!(VolumeChoice::from_index(0), Some(VolumeChoice::V10));
        assert_eq!(VolumeChoice::from_index(11), Some(VolumeChoice::V100));
        assert_eq!(VolumeChoice::from_index(12), None);
        let list = VolumeChoice::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("10%")
        );
        assert_eq!(
            list[11].localizations.get("es-ES").map(String::as_str),
            Some("100%")
        );
        assert_eq!(VolumeChoice::V35.localized_name("ja"), Some("35%"));
    }
}
