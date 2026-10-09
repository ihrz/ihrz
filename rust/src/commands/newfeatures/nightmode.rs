use super::*;

#[poise::command(
    slash_command,
    prefix_command,
    category = "newfeatures",
    rename = "nightmode",
    aliases("modenuit", "nuit", "night", "mode-nuit", "night-mode"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nightmode(
    ctx: Ctx<'_>,
    #[description = "on or off"] action: String,
    #[description = "Start hour 0-23"] start: Option<i64>,
    #[description = "End hour 0-23"] end: Option<i64>,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    let mut cfg = NightmodeConfig {
        enabled,
        start_hour: 22,
        end_hour: 7,
    };
    if let Some(s) = start {
        if !valid_hour(s) {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "nightmode_invalid_hour_morning")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "${client.iHorizon_Emojis.No} Start time is not valid. Use format: 21:30 or 2130".to_string()),
            )
            .await?;
            return Ok(());
        }
        cfg.start_hour = s as u8;
    }
    if let Some(e) = end {
        if !valid_hour(e) {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
                .await
                .unwrap_or_else(|| "❌".to_string());
            ctx.say(
                crate::lang::get(&code, "nightmode_invalid_hour_night")
                    .map(|s| s.replace("${client.iHorizon_Emojis.No}", &no))
                    .unwrap_or_else(|| "${client.iHorizon_Emojis.No} End time is not valid. Use format: 06:15 or 0615".to_string()),
            )
            .await?;
            return Ok(());
        }
        cfg.end_hour = e as u8;
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.NIGHT_MODE",
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let state = if enabled { "on" } else { "off" };
    ctx.say(
        crate::lang::get(&code, "msg_nightmode_updated")
            .map(|s| {
                s.replace("${state}", state)
                    .replace("${start}", &cfg.start_hour.to_string())
                    .replace("${end}", &cfg.end_hour.to_string())
            })
            .unwrap_or_else(|| {
                format!("Nightmode {state} ({}h-{}h).", cfg.start_hour, cfg.end_hour)
            }),
    )
    .await?;
    Ok(())
}
