use super::*;
use poise::serenity_prelude as serenity;

/// Localized short duration like TS `to_beautiful_string(ms, lang)`:
/// localized unit names concatenated without separator, zero falls
/// back to `0` + the minute name. `units` is
/// [year, month, week, day, hour, minute, second] (`var_year`,
/// `var_mo`, `var_w`, `var_d`, `var_h`, `var_m`, `var_s`).
pub fn beautiful_duration(ms: i64, units: [&str; 7]) -> String {
    let factors = [
        31_557_600_000i64,
        2_592_000_000,
        604_800_000,
        86_400_000,
        3_600_000,
        60_000,
        1_000,
    ];
    let mut rest = ms.max(0);
    let mut out = String::new();
    for (unit, factor) in units.iter().zip(factors) {
        if rest >= factor {
            out.push_str(&format!("{}{}", rest / factor, unit));
            rest %= factor;
        }
    }
    if rest > 0 {
        out.push_str(&format!("{rest}ms"));
    }
    if out.is_empty() {
        format!("0{}", units[5])
    } else {
        out
    }
}

/// Remind the ticket owner (TicketRemind pipeline).
#[poise::command(
    slash_command,
    prefix_command,
    rename = "remind",
    default_member_permissions = "MANAGE_CHANNELS"
)]
pub async fn ticket_remind(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    // Mirrors !remind.ts guards (disable + delete_not_in_ticket; TS
    // uses the delete key on this path too).
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    if ticket_guard_disabled(&ctx, pool, &gid, &lang_code, "ticket_disabled_command").await {
        return Ok(());
    }
    let channel_id = ctx.channel_id();
    if ticket_guard_in_ticket(
        &ctx,
        pool,
        &gid,
        &lang_code,
        channel_id,
        "delete_not_in_ticket",
    )
    .await
    {
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let http = ctx.serenity_context().http.clone();
    let entries = delete::ticket_entries_routed(pool, &gid).await;
    let Some(owner_id) = ticket_owner_id(&entries, &channel_id.get().to_string()) else {
        ctx.say(t("open_not_in_ticket")).await?;
        return Ok(());
    };
    // Last owner message out of the last 100 (TicketRemind:2099).
    let recent = channel_id
        .messages(&http, serenity::GetMessages::new().limit(100))
        .await
        .unwrap_or_default();
    let last_owner = recent
        .iter()
        .filter(|m| m.author.id.get() == owner_id)
        .max_by_key(|m| m.timestamp.unix_timestamp());
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let time = match last_owner {
        Some(m) => {
            let ts_ms = m.timestamp.unix_timestamp() * 1000;
            let units = [
                t("var_year"),
                t("var_mo"),
                t("var_w"),
                t("var_d"),
                t("var_h"),
                t("var_m"),
                t("var_s"),
            ];
            let refs = [
                units[0].as_str(),
                units[1].as_str(),
                units[2].as_str(),
                units[3].as_str(),
                units[4].as_str(),
                units[5].as_str(),
                units[6].as_str(),
            ];
            beautiful_duration(now_ms - ts_ms, refs)
        }
        None => t("var_never"),
    };
    let channel_link = format!("https://discord.com/channels/{gid}/{}", channel_id.get());
    let field_value = match last_owner {
        Some(m) => format!("[{time}]({channel_link}/{})", m.id.get()),
        None => format!("[{time}]({channel_link})"),
    };
    let (footer_name, footer_icon) = ticket_footer(&http, pool, &gid).await;
    let mut foot = serenity::CreateEmbedFooter::new(footer_name);
    if footer_icon.is_some() {
        foot = foot.icon_url("attachment://footer_icon.png");
    }
    let embed = serenity::CreateEmbed::default()
        .title(t("ticket_remind_embed_title"))
        .description(t("ticket_remind_embed_desc"))
        .field(t("ticket_remind_embed_fields_1_name"), field_value, false)
        .colour(serenity::Colour::RED)
        .footer(foot);
    let mut dm = serenity::CreateMessage::new()
        .content(&channel_link)
        .embed(embed);
    if let Some(icon) = footer_icon {
        dm = dm.add_file(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    if dm_user(&http, owner_id, dm).await {
        ctx.say(t("ticket_remind_command_ok")).await?;
    } else {
        let no = crate::emojis::app_emoji_markup(&http, "No")
            .await
            .unwrap_or_else(|| "❌".to_string());
        ctx.say(
            t("utils_dm_cant")
                .replace("${client.iHorizon_Emojis.No}", &no)
                .replace("${targetMember.toString()}", &format!("<@{owner_id}>")),
        )
        .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn en() -> [&'static str; 7] {
        [
            "year(s)",
            "month(s)",
            "week(s)",
            "day(s)",
            "hour(s)",
            "minute(s)",
            "second(s)",
        ]
    }

    #[test]
    fn duration_concatenates_localized_units() {
        assert_eq!(beautiful_duration(3_600_000, en()), "1hour(s)");
        assert_eq!(beautiful_duration(90_000, en()), "1minute(s)30second(s)");
        assert_eq!(beautiful_duration(500, en()), "500ms");
    }

    #[test]
    fn duration_zero_falls_back_to_minutes() {
        assert_eq!(beautiful_duration(0, en()), "0minute(s)");
        assert_eq!(beautiful_duration(-5, en()), "0minute(s)");
    }

    #[test]
    fn duration_covers_large_units() {
        assert_eq!(
            beautiful_duration(2 * 86_400_000 + 3_600_000, en()),
            "2day(s)1hour(s)"
        );
    }
}
