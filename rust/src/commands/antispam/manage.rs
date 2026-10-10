use super::*;

/// Config the message when user earn new xp level message!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "config",
    aliases("mng", "antimng"),
    default_member_permissions = "ADMINISTRATOR"
)]
#[allow(clippy::too_many_arguments)]
pub async fn as_config(
    ctx: Ctx<'_>,
    #[description = "preset: chill, guard or extreme"] preset: Option<String>,
    #[description = "on or off"] enabled: Option<bool>,
    #[description = "ignore bots"] ignore_bots: Option<bool>,
    #[description = "delete spam messages"] remove_messages: Option<bool>,
    #[description = "mute, kick or ban"] punishment_type: Option<String>,
    #[description = "mute duration, e.g. 15m"] punish_time: Option<String>,
    #[description = "max interval between messages in ms"] max_interval: Option<i64>,
    #[description = "messages threshold (2-20)"] threshold: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Preset first (mirrors the !manage preset select, which preserves the
    // bypass lists — those live under separate keys, so nothing to keep
    // here), then per-field overrides mirroring the !manage modals/selects.
    let mut cfg: AntispamConfig = match preset.as_deref() {
        Some(p) => match AntispamConfig::preset(p) {
            Some(pc) => pc,
            None => load_antispam(&ctx.data().pool, &gid).await,
        },
        None => load_antispam(&ctx.data().pool, &gid).await,
    };
    if let Some(p) = preset.as_deref() {
        if AntispamConfig::preset(p).is_none() {
            ctx.say(invalid_choice(&code, p, "chill, guard or extreme"))
                .await?;
            return Ok(());
        }
    }
    if let Some(v) = enabled {
        cfg.set_bool("Enabled", v);
    }
    if let Some(v) = ignore_bots {
        cfg.set_bool("ignoreBots", v);
    }
    if let Some(v) = remove_messages {
        cfg.set_bool("removeMessages", v);
    }
    if let Some(p) = punishment_type.as_deref() {
        if !cfg.set_punishment(p) {
            ctx.say(invalid_choice(&code, p, "mute, kick or ban"))
                .await?;
            return Ok(());
        }
    }
    if let Some(raw) = punish_time.as_deref() {
        let ms = raw
            .parse::<i64>()
            .ok()
            .or_else(|| crate::commands::shared::parse_duration_ms(raw));
        match ms {
            // Mirrors the !manage time-modal leg: parsed durations must be
            // positive (set_number rejects <= 0 like the TS to_ms check).
            Some(n) if cfg.set_number("punishTime", n) => {}
            _ => {
                // Exact TS key for a rejected modal time value.
                let msg = crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                    .or_else(|| crate::lang::get(&code, "msg_antispam_invalid_duration"))
                    .unwrap_or_else(|| format!("Invalid duration \"{raw}\" (e.g. 15m)."));
                ctx.say(msg).await?;
                return Ok(());
            }
        }
    }
    if let Some(n) = max_interval {
        // Mirrors the !manage maxInterval modal leg (wantedValueType time).
        if !cfg.set_number("maxInterval", n) {
            let msg = crate::lang::get(&code, "too_new_account_invalid_time_on_enable")
                .or_else(|| crate::lang::get(&code, "msg_antispam_invalid_duration"))
                .unwrap_or_else(|| {
                    "max_interval must be a positive millisecond count.".to_string()
                });
            ctx.say(msg).await?;
            return Ok(());
        }
    }
    if let Some(t) = threshold {
        // Threshold stores raw like the TS number modal (no clamp).
        cfg.set_number("Threshold", t);
    }
    save_antispam(&ctx.data().pool, &gid, &cfg).await?;
    let state = if cfg.enabled { "on" } else { "off" };
    // Full manage summary when the key exists, short config line fallback.
    let msg = crate::lang::get(&code, "msg_antispam_manage_updated")
        .map(|s| {
            s.replace("${state}", state)
                .replace("${threshold}", &cfg.threshold.to_string())
                .replace("${punishment}", &cfg.punishment_type)
                .replace(
                    "${punish_time}",
                    &crate::funcs::beautiful_ms(cfg.punish_time_ms as f64),
                )
                .replace(
                    "${max_interval}",
                    &crate::funcs::beautiful_ms(cfg.max_interval_ms as f64),
                )
                .replace("${ignore_bots}", &cfg.ignore_bots.to_string())
                .replace("${remove_messages}", &cfg.remove_messages.to_string())
        })
        .or_else(|| {
            crate::lang::get(&code, "msg_antispam_config_updated").map(|s| {
                s.replace("${state}", state)
                    .replace("${threshold}", &cfg.threshold.to_string())
            })
        })
        .unwrap_or_else(|| format!("Antispam {state} (threshold {}).", cfg.threshold));
    ctx.say(msg).await?;
    Ok(())
}

/// Rejection line for an unknown preset/punishment choice.
fn invalid_choice(lang_code: &str, got: &str, want: &str) -> String {
    crate::lang::get(lang_code, "msg_antispam_invalid_choice")
        .map(|t| {
            t.replace("${choice}", got)
                .replace("${want}", want)
                .replace("{choice}", got)
                .replace("{want}", want)
        })
        .unwrap_or_else(|| format!("Unknown choice \"{got}\" ({want})."))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_choice_echoes_input() {
        let msg = invalid_choice("en-US", "bogus", "mute, kick or ban");
        assert!(msg.contains("bogus"));
        assert!(msg.contains("mute, kick or ban"));
    }

    #[test]
    fn manage_ranges_match_ts_modal_legs() {
        // Threshold is stored raw (TS parseInt, no clamp).
        let mut cfg = AntispamConfig::default();
        cfg.set_number("Threshold", 50);
        assert_eq!(cfg.threshold, 50);
        cfg.set_number("Threshold", 0);
        assert_eq!(cfg.threshold, 0);
        // Durations must be positive (TS to_ms leg rejects the rest).
        assert!(!cfg.set_number("punishTime", 0));
        assert!(!cfg.set_number("punishTime", -1));
        assert!(cfg.set_number("punishTime", 60_000));
        assert!(!cfg.set_number("maxInterval", 0));
        assert!(!cfg.set_number("maxInterval", -5));
        assert!(cfg.set_number("maxInterval", 2700));
        // Presets mirror AntiSpamPreset incl. Threshold values.
        assert_eq!(AntispamConfig::preset("chill").unwrap().threshold, 7);
        assert_eq!(AntispamConfig::preset("guard").unwrap().threshold, 5);
        assert_eq!(AntispamConfig::preset("extreme").unwrap().threshold, 3);
        assert!(AntispamConfig::preset("bogus").is_none());
    }
}
