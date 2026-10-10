use super::*;

/// Fixed slowmode durations. Mirrors the `duration` option choices in
/// utils/util/util.ts (`None`, `5 seconds`, ..., `6 hours`) combined
/// with the `timeConversion` table in util !cooldown.ts: the choice
/// label is the conversion key (`0`, `5s`, ..., `6h`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum DurationChoice {
    #[name = "0"]
    Off,
    #[name = "5s"]
    S5,
    #[name = "10s"]
    S10,
    #[name = "15s"]
    S15,
    #[name = "30s"]
    S30,
    #[name = "1m"]
    M1,
    #[name = "2m"]
    M2,
    #[name = "5m"]
    M5,
    #[name = "10m"]
    M10,
    #[name = "15m"]
    M15,
    #[name = "30m"]
    M30,
    #[name = "1h"]
    H1,
    #[name = "2h"]
    H2,
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

/// Slowmode. Mirrors util cooldown (!cooldown.ts) + unslowmode bridge.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "slowmode",
    aliases("unslowmode", "setcooldown", "coldown", "slow")
)]
pub async fn slowmode(
    ctx: Ctx<'_>,
    #[description = "Duration"] duration: Option<DurationChoice>,
    #[description = "Channel, defaults to current"] channel: Option<
        poise::serenity_prelude::GuildChannel,
    >,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Bot-side ManageChannels gate, like the TS
    // `members.me.permissions.has(ManageChannels)` check.
    if !bot_guild_permissions(&ctx, guild_id).manage_channels() {
        let no = crate::emojis::app_emoji_markup(ctx.http(), "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.send(
            poise::CreateReply::default()
                .content(
                    t("unban_bot_dont_have_permission")
                        .replace("${client.iHorizon_Emojis.No}", &no),
                )
                .ephemeral(true),
        )
        .await?;
        return Ok(());
    }
    let secs = duration.map(duration_seconds).unwrap_or(0);
    let ch_id = match &channel {
        Some(c) => c.id,
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
    // TS fills `${duration_in_string}` with the `to_beautiful_string`
    // short form; mirrored with `beautiful_ms`.
    let pretty = crate::funcs::beautiful_ms(f64::from(secs) * 1000.0);
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
    fn duration_choice_rejects_unknown_label() {
        assert_eq!(DurationChoice::from_name("5 minutes"), None);
        assert_eq!(DurationChoice::from_name(""), None);
    }
}
