use super::*;

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
            ctx.say(format!("Unknown preset \"{p}\" (chill, guard or extreme)."))
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
            ctx.say(format!("Unknown punishment \"{p}\" (mute, kick or ban)."))
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
            Some(n) if cfg.set_number("punishTime", n) => {}
            _ => {
                ctx.say(format!("Invalid duration \"{raw}\" (e.g. 15m)."))
                    .await?;
                return Ok(());
            }
        }
    }
    if let Some(n) = max_interval {
        if !cfg.set_number("maxInterval", n) {
            ctx.say("max_interval must be a positive millisecond count.")
                .await?;
            return Ok(());
        }
    }
    if let Some(t) = threshold {
        cfg.set_number("Threshold", t);
    }
    save_antispam(&ctx.data().pool, &gid, &cfg).await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let state = if cfg.enabled { "on" } else { "off" };
    ctx.say(
        crate::lang::get(&code, "msg_antispam_config_updated")
            .map(|s| {
                s.replace("${state}", state)
                    .replace("${threshold}", &cfg.threshold.to_string())
            })
            .unwrap_or_else(|| format!("Antispam {state} (threshold {}).", cfg.threshold)),
    )
    .await?;
    Ok(())
}
