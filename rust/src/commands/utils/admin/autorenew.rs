use super::*;

/// Auto-renew a channel on a timer.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "autorenew",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn autorenew(
    ctx: Ctx<'_>,
    #[description = "Channel"]
    #[channel_types("Text", "Voice")]
    channel: poise::serenity_prelude::GuildChannel,
    #[description = "Every (e.g. 1h, 7d) or off"] every: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let key = format!("UTILS.renew_channel.{}", channel.id.get());
    if every.trim().eq_ignore_ascii_case("off") {
        let _ = crate::commands::owner::main::routed_del(&ctx.data().pool, &gid, &gid, &key).await;
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_auto_renew_off")
                .unwrap_or_else(|| "Auto-renew off.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let Some(ms) = crate::commands::shared::parse_duration_ms(&every) else {
        let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
        ctx.say(
            crate::lang::get(&code, "msg_bad_duration")
                .unwrap_or_else(|| "Bad duration.".to_string()),
        )
        .await?;
        return Ok(());
    };
    // Bounds mirror util !autorenew.ts: 1 minute .. 30 days
    // (60_000 .. 2_629_800_000 ms).
    match classify_autorenew(Some(ms)) {
        AutorenewDecision::TooShort => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "util_autorenew_time_too_short").unwrap_or_else(|| {
                    "The time between channel renewals must be more than 1 minute".to_string()
                }),
            )
            .await?;
            return Ok(());
        }
        AutorenewDecision::TooLong => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "util_autorenew_time_too_long").unwrap_or_else(|| {
                    "The time between channel renewals must be less than 30 days".to_string()
                }),
            )
            .await?;
            return Ok(());
        }
        AutorenewDecision::BadDuration => {
            let code =
                crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
            ctx.say(
                crate::lang::get(&code, "msg_bad_duration")
                    .unwrap_or_else(|| "Bad duration.".to_string()),
            )
            .await?;
            return Ok(());
        }
        AutorenewDecision::Ok(_) => {}
    }
    let now = crate::commands::shared::now_ms();
    crate::commands::owner::main::routed_set(
        &ctx.data().pool,
        &gid,
        &gid,
        &key,
        &serde_json::json!({"timestamp": now, "maxTime": ms}).to_string(),
    )
    .await?;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let yes = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "Yes")
        .await
        .unwrap_or_else(|| "✅".to_string());
    ctx.say(
        crate::lang::get(&code, "util_autorenew_command_ok")
            .map(|s| {
                s.replace("${client.iHorizon_Emojis.Yes}", &yes)
                    .replace("${channel.toString()}", &format!("<#{}>", channel.id.get()))
                    .replace("${time}", &every)
            })
            .unwrap_or_else(|| "${client.iHorizon_Emojis.Yes} Now, the ${channel.toString()} channel is automatically deleted-created (renewed) every ${time}!\nTo stop the channel from being renewed, just delete it by yourself.".to_string()),
    )
    .await?;
    Ok(())
}

/// Renew bounds from util !autorenew.ts: below 1 minute is too short,
/// above 30 days (2_629_800_000 ms) is too long.
pub const AUTORENEW_MIN_MS: i64 = 60_000;
/// 30 days in ms, the TS `parseTime > 2_629_800_000` ceiling.
pub const AUTORENEW_MAX_MS: i64 = 2_629_800_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AutorenewDecision {
    Ok(i64),
    TooShort,
    TooLong,
    BadDuration,
}

/// Pure bound classifier, unit-tested. `None` (unparsable input) maps
/// to BadDuration.
pub fn classify_autorenew(ms: Option<i64>) -> AutorenewDecision {
    match ms {
        None => AutorenewDecision::BadDuration,
        Some(v) if v < AUTORENEW_MIN_MS => AutorenewDecision::TooShort,
        Some(v) if v > AUTORENEW_MAX_MS => AutorenewDecision::TooLong,
        Some(v) => AutorenewDecision::Ok(v),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bounds_mirror_ts() {
        assert_eq!(classify_autorenew(None), AutorenewDecision::BadDuration);
        assert_eq!(
            classify_autorenew(Some(59_999)),
            AutorenewDecision::TooShort
        );
        assert_eq!(
            classify_autorenew(Some(60_000)),
            AutorenewDecision::Ok(60_000)
        );
        assert_eq!(
            classify_autorenew(Some(2_629_800_000)),
            AutorenewDecision::Ok(2_629_800_000)
        );
        assert_eq!(
            classify_autorenew(Some(2_629_800_001)),
            AutorenewDecision::TooLong
        );
    }
}
