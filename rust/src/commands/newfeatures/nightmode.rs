use super::*;

/// Nightmode quick toggle (guild owner only).
// The TS panel (enable/notify/hours/derank/timezone selects + bot
// whitelist, 30 min collectors) has no dispatch hook here; this keeps
// the owner gate and on/off + hour args while preserving the full blob
// (including minutes, notify, derank, utc, wl_bots — never reset).
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
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Guild-owner gate (TS: interaction.guild.ownerId check). HTTP
    // fetch only: holding the cache Guild across an await is not Send.
    let is_guild_owner = match ctx.guild_id() {
        Some(gid) => ctx
            .http()
            .get_guild(gid)
            .await
            .map(|g| g.owner_id == ctx.author().id)
            .unwrap_or(false),
        None => false,
    };
    if !is_guild_owner {
        ctx.say(
            crate::lang::get(&code, "blockbot_not_owner")
                .unwrap_or_else(|| ":x: **You are not the Owner of the server!**".to_string()),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    // Load the full blob (defaults = TS fallback literal), never reset it.
    let mut cfg: NightmodeConfig = crate::db::kv_get(&ctx.data().pool, &gid, "UTILS.NIGHT_MODE")
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(NightmodeConfig {
            enabled: false,
            notify: true,
            time: [21, 0, 9, 0],
            wl_bots: Vec::new(),
            derank_bot: true,
            utc: 1,
        });
    let enabled = matches!(action.to_ascii_lowercase().as_str(), "on" | "power on");
    cfg.enabled = enabled;
    if let Some(s) = start {
        if !valid_hour(s) {
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
        cfg.time[0] = s as u8;
        // Minutes are preserved (O5): the args only carry hours, and
        // zeroing time[1] here would wipe panel-set minutes.
    }
    if let Some(e) = end {
        if !valid_hour(e) {
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
        cfg.time[2] = e as u8;
        // Minutes are preserved (O5): see above.
    }
    crate::db::kv_set(
        &ctx.data().pool,
        &gid,
        "UTILS.NIGHT_MODE",
        &serde_json::to_string(&cfg)?,
    )
    .await?;
    let state = if enabled { "on" } else { "off" };
    let window = time_beautifuer(cfg.time);
    ctx.say(
        crate::lang::get(&code, "msg_nightmode_updated")
            .map(|s| {
                s.replace("${state}", state)
                    .replace("${start}", &cfg.time[0].to_string())
                    .replace("${end}", &cfg.time[2].to_string())
            })
            .unwrap_or_else(|| {
                format!(
                    "Nightmode {state} ({window}, notify {}, derank {}, UTC{}).",
                    if cfg.notify { "on" } else { "off" },
                    if cfg.derank_bot { "on" } else { "off" },
                    cfg.utc,
                )
            }),
    )
    .await?;
    Ok(())
}

/// One clock reading. Mirrors time_beautifuer_with_minutes: 24h renders
/// `HH:MM` zero-padded, 12h renders `H:MMAM/PM` with the TS period rule
/// (hour < 12 || hour == 24 -> AM; hour % 12 == 0 shows 12).
pub fn time_beautifuer_with_minutes(hour: u8, minute: u8, twelve_hour: bool) -> String {
    if twelve_hour {
        let period = if hour < 12 || hour == 24 { "AM" } else { "PM" };
        let display = match hour % 12 {
            0 => 12,
            h => h,
        };
        format!("{display}:{minute:02}{period}")
    } else {
        format!("{hour:02}:{minute:02}")
    }
}

/// Whole night window label. Mirrors time_beautifuer for the 4-slot
/// format [startHour, startMinute, endHour, endMinute]:
/// `start24 - end24 (start12 - end12)`.
pub fn time_beautifuer(range: [u8; 4]) -> String {
    let start24 = time_beautifuer_with_minutes(range[0], range[1], false);
    let end24 = time_beautifuer_with_minutes(range[2], range[3], false);
    let start12 = time_beautifuer_with_minutes(range[0], range[1], true);
    let end12 = time_beautifuer_with_minutes(range[2], range[3], true);
    format!("{start24} - {end24} ({start12} - {end12})")
}

/// UTC offset (hours) to IANA zone. Mirrors utcTimezones in
/// src/core/locales.ts exactly — including the missing +8 slot (the TS
/// table jumps from +7 Asia/Bangkok to +9 Asia/Tokyo), so unknown
/// offsets stay None like the TS `utcTimezones[utc]` undefined leg.
pub fn utc_timezone_name(offset_hours: i8) -> Option<&'static str> {
    Some(match offset_hours {
        -11 => "Pacific/Pago_Pago",
        -10 => "Pacific/Honolulu",
        -9 => "America/Anchorage",
        -8 => "America/Los_Angeles",
        -7 => "America/Denver",
        -6 => "America/Chicago",
        -5 => "America/New_York",
        -4 => "America/Halifax",
        -3 => "America/Argentina/Buenos_Aires",
        -2 => "America/Noronha",
        -1 => "Atlantic/Azores",
        0 => "Etc/UTC",
        1 => "Europe/Paris",
        2 => "Europe/Athens",
        3 => "Europe/Moscow",
        4 => "Asia/Dubai",
        5 => "Asia/Karachi",
        6 => "Asia/Dhaka",
        7 => "Asia/Bangkok",
        9 => "Asia/Tokyo",
        10 => "Australia/Sydney",
        11 => "Pacific/Noumea",
        12 => "Pacific/Auckland",
        13 => "Pacific/Tongatapu",
        14 => "Pacific/Kiritimati",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::{time_beautifuer, time_beautifuer_with_minutes, utc_timezone_name};

    #[test]
    fn minutes_render_matches_ts() {
        // Doc example: 21:30 -> "21:30" / "9:30PM".
        assert_eq!(time_beautifuer_with_minutes(21, 30, false), "21:30");
        assert_eq!(time_beautifuer_with_minutes(21, 30, true), "9:30PM");
        assert_eq!(time_beautifuer_with_minutes(0, 5, false), "00:05");
        assert_eq!(time_beautifuer_with_minutes(0, 5, true), "12:05AM");
        assert_eq!(time_beautifuer_with_minutes(12, 0, true), "12:00PM");
        assert_eq!(time_beautifuer_with_minutes(9, 7, true), "9:07AM");
    }

    #[test]
    fn window_label_matches_ts() {
        assert_eq!(
            time_beautifuer([22, 0, 7, 30]),
            "22:00 - 07:30 (10:00PM - 7:30AM)"
        );
    }

    #[test]
    fn utc_table_matches_ts() {
        assert_eq!(utc_timezone_name(0), Some("Etc/UTC"));
        assert_eq!(utc_timezone_name(1), Some("Europe/Paris"));
        assert_eq!(utc_timezone_name(-5), Some("America/New_York"));
        assert_eq!(utc_timezone_name(9), Some("Asia/Tokyo"));
        // The TS table has no +8 entry.
        assert_eq!(utc_timezone_name(8), None);
        assert_eq!(utc_timezone_name(99), None);
    }
}
