use super::*;

// Seconds for a `timeConversion[duration]` key. Mirrors the table in
// util !cooldown.ts exactly: only these 14 keys change the channel
// rate limit. The TS prefix leg reads the raw first arg
// (`string(args, 0)`), so anything else (`1`, `5`, `90s`) hits
// `Number(undefined)` → NaN — a fire-and-forget no-op on the Discord
// call — while the ok reply still sends with
// `to_beautiful_string(input)`. poise 0.6 cannot express that split
// with a `ChoiceParameter` enum (off-list prefix input fails with
// `InvalidChoice` before the body runs), so the param stays a plain
// free-text string on both paths — the same precedent as the economy
// tuning commands — and the body constrains the edit to this table.
pub fn time_conversion_secs(input: &str) -> Option<u16> {
    Some(match input {
        "0" => 0,
        "5s" => 5,
        "10s" => 10,
        "15s" => 15,
        "30s" => 30,
        "1m" => 60,
        "2m" => 120,
        "5m" => 300,
        "10m" => 600,
        "15m" => 900,
        "30m" => 1800,
        "1h" => 3600,
        "2h" => 7200,
        "6h" => 21600,
        _ => return None,
    })
}

/// Set a cooldown in the current channel
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
    #[description = "The duration of the slowmode"]
    duration: Option<String>,
) -> Result<(), anyhow::Error> {
    // A missing prefix arg crashes to_ms in TS (silent on prefix);
    // slash always supplies the required option, so None only
    // happens on the prefix leg.
    let Some(raw) = duration.as_deref() else {
        return Ok(());
    };
    // Known timeConversion keys edit the channel; anything else skips
    // the edit (TS `Number(undefined)` → NaN no-op) but still answers
    // the ok reply with `to_beautiful_string(input)`.
    if let Some(secs) = time_conversion_secs(raw) {
        return apply_slowmode(ctx, secs, None).await;
    }
    let Some((_guild_id, code)) = slowmode_gate(&ctx).await else {
        return Ok(());
    };
    let pretty = crate::commands::guildconfig::beautiful_ms_lang(crate::funcs::time_ms(raw), &code);
    reply_cooldown_ok(&ctx, &code, &pretty).await
}

/// Bot-side ManageChannels gate + guild lang. Mirrors the TS check
/// that runs before either the edit or the reply. Returns None after
/// answering the denial (or outside guilds), so callers just stop.
async fn slowmode_gate(ctx: &Ctx<'_>) -> Option<(poise::serenity_prelude::GuildId, String)> {
    let guild_id = ctx.guild_id()?;
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    if bot_guild_permissions(ctx, guild_id).manage_channels() {
        return Some((guild_id, code));
    }
    let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
        .await
        .unwrap_or_else(|| "❌".to_string());
    let msg = crate::lang::get(&code, "unban_bot_dont_have_permission")
        .unwrap_or_default()
        .replace("${client.iHorizon_Emojis.No}", &no);
    let _ = ctx.say(msg).await;
    None
}

/// Send the ok reply. Mirrors the `util_cooldown_command_ok` send
/// (`${duration_in_string}` filled with the guild-lang short label).
async fn reply_cooldown_ok(ctx: &Ctx<'_>, code: &str, pretty: &str) -> Result<(), anyhow::Error> {
    ctx.say(
        crate::lang::get(code, "util_cooldown_command_ok")
            .map(|s| s.replace("${duration_in_string}", pretty))
            .unwrap_or_else(|| format!("Slowmode {pretty}.")),
    )
    .await?;
    Ok(())
}

/// Shared slowmode edit. Mirrors !cooldown.ts (unslowmode.ts delegates
/// with `0`): bot ManageChannels gate, current-channel default, edit +
/// ok reply.
pub async fn apply_slowmode(
    ctx: Ctx<'_>,
    secs: u16,
    channel_id: Option<poise::serenity_prelude::ChannelId>,
) -> Result<(), anyhow::Error> {
    let Some((_guild_id, code)) = slowmode_gate(&ctx).await else {
        return Ok(());
    };
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
            poise::serenity_prelude::EditChannel::new()
                .rate_limit_per_user(secs)
                .audit_log_reason(&format!(
                    "Slow command executed by {}",
                    ctx.author().id.get()
                )),
        )
        .await?;
    // TS fills `${duration_in_string}` with `to_beautiful_string`
    // using the guild lang; mirror with the lang-aware helper.
    let pretty = crate::commands::guildconfig::beautiful_ms_lang(f64::from(secs) * 1000.0, &code);
    reply_cooldown_ok(&ctx, &code, &pretty).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn time_conversion_table_mirrors_ts() {
        // Byte-exact keys of `timeConversion` in util !cooldown.ts.
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
            assert_eq!(time_conversion_secs(label), Some(secs), "key {label}");
        }
    }

    #[test]
    fn time_conversion_rejects_unknown_like_ts_nan_leg() {
        // TS `Number(timeConversion[input])` → NaN for anything off the
        // table: the channel edit is skipped, but the ok reply still
        // sends with `to_beautiful_string(input)`. Display names and
        // bare numbers alike take this leg (the old `ChoiceParameter`
        // `InvalidChoice` parse failure this fix removes).
        for unknown in [
            "",
            "1",
            "5",
            "90s",
            "5 seconds",
            "5 SECONDS",
            "None",
            "none",
            "5minutes",
            "10x",
        ] {
            assert_eq!(time_conversion_secs(unknown), None, "input {unknown}");
        }
        // ...while ms.ts still parses these into a reply label:
        // `to_ms("1")` is 0, `to_ms("90s")` is 90000.
        assert_eq!(crate::funcs::time_ms("1"), 0.0);
        assert_eq!(crate::funcs::time_ms("90s"), 90_000.0);
    }
}
