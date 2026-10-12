use super::*;
use poise::serenity_prelude as serenity;

/// Current calendar year. Mirrors `new Date().getFullYear()` in the
/// `!set-birthday.ts` year modal (year must be `1900..=now`).
pub fn current_year() -> i32 {
    chrono::Local::now()
        .format("%Y")
        .to_string()
        .parse()
        // Clock broken: fall back to the old static bound.
        .unwrap_or(2100)
}

/// TS `parseInt` intake for one modal field. Trimmed decimal only; the
/// TS modals cap input length (2/2/4 chars) so prefix-garbage shapes
/// like `parseInt("6abc")` cannot arrive through the real flow.
fn parse_field(raw: &str) -> Option<i64> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    t.parse::<i64>().ok()
}

/// TS-exact per-modal ranges (`!set-birthday.ts` checks each modal as a
/// bare range: month `1..=12`, day `1..=31`, year `1900..=current year`).
/// Combined date validity (Feb 31) is accepted here exactly like the TS
/// day modal accepts it; `show.rs` renders it with the same JS-Date
/// rollover the TS `!show.ts` gets from `new Date(...)`.
pub fn valid_month_value(v: i64) -> bool {
    (1..=12).contains(&v)
}

pub fn valid_day_value(v: i64) -> bool {
    (1..=31).contains(&v)
}

pub fn valid_year_value(v: i64, now: i32) -> bool {
    (1900..=i64::from(now)).contains(&v)
}

/// Embed display for one birthday part. TS substitutes the raw value or
/// `null` (`String.replace` coerces `null` to `"null"`), mirrored here.
fn part_or_null(v: Option<i64>) -> String {
    v.map(|n| n.to_string())
        .unwrap_or_else(|| "null".to_string())
}

/// Set your birthday. Mirrors `!set-birthday.ts`.
///
/// STRUCTURE (TS-exact): the TS `profil.ts` entry declares `set-birthday`
/// with NO options — the values arrive through the button/modal flow, not
/// slash args — so this subcommand takes no parameters on either path.
/// Button customIds (`set_month` / `set_day` / `set_year` / `set_confirm`),
/// modal customIds + field ids + min/max lengths, embed keys and per-field
/// reply keys all mirror the TS file.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "set-birthday",
    aliases("birthday", "anniversaire"),
    category = "profil",
    name_localized("fr", "définir-anniversaire"),
    name_localized("ja", "set-birthday"),
    name_localized("ru", "set-birthday"),
    name_localized("es-ES", "set-birthday"),
    description_localized("fr", "Définissez votre anniversaire sur le profil iHorizon"),
    description_localized("ja", "iHorizonプロフィールに誕生日を設定！"),
    description_localized("ru", "Установить день рождения в профиле iHorizon!"),
    description_localized("es-ES", "Establecer tu cumpleaños en el perfil de iHorizon!")
)]
pub async fn profil_birthday(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let lang_code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&lang_code, k).unwrap_or_default();
    let tx = |k: &str, fallback: &str| {
        let v = t(k);
        if v.is_empty() {
            fallback.to_string()
        } else {
            v
        }
    };

    let user_id = ctx.author().id.get();
    let mut p = super::profil::load_profil_routed(pool, user_id).await;
    let mut month: Option<i64> = p.bday_month.map(i64::from);
    let mut day: Option<i64> = p.bday_day.map(i64::from);
    let mut year: Option<i64> = p.bday_year.map(i64::from);

    let sparkles = crate::emojis::app_emoji_markup(ctx.http(), "Sparkles")
        .await
        .unwrap_or_default();
    let crown = crate::emojis::app_emoji_markup(ctx.http(), "Crown")
        .await
        .unwrap_or_default();
    let pin = crate::emojis::app_emoji_markup(ctx.http(), "Pin")
        .await
        .unwrap_or_default();
    let mention = format!("<@{user_id}>");

    let title = tx("profil_birthday_embed_title", "Set your birthday!");
    let intro_tpl = tx(
        "profil_birthday_embed_introduction",
        "Hey, ${interaction.member?.toString()}\nIn order to celebrate it, it's time to set it!\n",
    );
    let current_tpl = tx(
        "profil_birthday_embed_current_birthday",
        "**Current birthday**: `${birthday.month}/${birthday.day}/${birthday.year}` (MM/DD/YYYY)",
    );
    // TS builds the description as introduction + current-birthday line.
    let render_desc = |month: Option<i64>, day: Option<i64>, year: Option<i64>| -> String {
        let intro = intro_tpl
            .replace("${client.iHorizon_Emojis.Sparkles}", &sparkles)
            .replace("${client.iHorizon_Emojis.Crown}", &crown)
            .replace("${interaction.member?.toString()}", &mention);
        let current = current_tpl
            .replace("${client.iHorizon_Emojis.Pin}", &pin)
            .replace("${birthday.month}", &part_or_null(month))
            .replace("${birthday.day}", &part_or_null(day))
            .replace("${birthday.year}", &part_or_null(year));
        format!("{intro}{current}")
    };

    // TS button row: month/day/year (Secondary + calendar emoji) + confirm
    // (Success + Yes app emoji). Missing app emojis leave buttons text-only.
    let cal = serenity::ReactionType::Unicode("📅".to_string());
    let yes_emoji: Option<serenity::ReactionType> =
        crate::emojis::cached_emoji_entry(ctx.http(), "Yes")
            .await
            .map(|(id, full, animated)| serenity::ReactionType::Custom {
                animated,
                id: serenity::EmojiId::new(id),
                name: Some(full),
            });
    let mk_row = |disabled: bool| {
        let month_btn = serenity::CreateButton::new("set_month")
            .style(serenity::ButtonStyle::Secondary)
            .label(tx("profil_birthday_month_button_label", "Set month"))
            .emoji(cal.clone())
            .disabled(disabled);
        let day_btn = serenity::CreateButton::new("set_day")
            .style(serenity::ButtonStyle::Secondary)
            .label(tx("profil_birthday_day_button_label", "Set day"))
            .emoji(cal.clone())
            .disabled(disabled);
        let year_btn = serenity::CreateButton::new("set_year")
            .style(serenity::ButtonStyle::Secondary)
            .label(tx("profil_birthday_year_button_label", "Set year"))
            .emoji(cal.clone())
            .disabled(disabled);
        let mut confirm_btn = serenity::CreateButton::new("set_confirm")
            .style(serenity::ButtonStyle::Success)
            .label(tx("var_confirm", "Confirm"))
            .disabled(disabled);
        if let Some(e) = yes_emoji.clone() {
            confirm_btn = confirm_btn.emoji(e);
        }
        serenity::CreateActionRow::Buttons(vec![month_btn, day_btn, year_btn, confirm_btn])
    };

    let mk_embed = |month: Option<i64>, day: Option<i64>, year: Option<i64>| {
        serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0x0092cc)
            .description(render_desc(month, day, year))
    };

    // Thumbnail: snapshot the avatar (never a raw CDN URL), like `show.rs`.
    let face_url = ctx.author().face();
    let face_bytes = crate::image64::image64(&face_url).await;
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let (fname, fbytes) = crate::commands::shared::footer_parts(&ctx, &gid).await;
    let mut embed = mk_embed(month, day, year);
    embed = if face_bytes.is_some() {
        embed.thumbnail("attachment://avatar.png")
    } else {
        embed.thumbnail(face_url)
    };
    embed = crate::commands::shared::embed_with_footer(embed, &fname, fbytes.is_some());

    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(vec![mk_row(false)]);
    if let Some(bytes) = face_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "avatar.png"));
    }
    if let Some(bytes) = fbytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;

    let author_id = ctx.author().id;
    let not_for_you = tx("help_not_for_you", "This interaction is not for you");
    // Mirrors the TS collector (`time: 1_800_000`, Button only, invoker
    // only). The cosmetic 3.5s embed-color rotation is intentionally not
    // ported.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(1800))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author_id {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "set_confirm" => {
                // TS replies ephemeral `ticket_panel_saved_conf` and stops.
                let done = tx("ticket_panel_saved_conf", "Saved.");
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(done)
                                .ephemeral(true),
                        ),
                    )
                    .await;
                break;
            }
            "set_month" | "set_day" | "set_year" => {
                if run_birthday_modal(
                    &ctx, &press, &lang_code, pool, user_id, &mut p, &mut month, &mut day,
                    &mut year,
                )
                .await?
                {
                    // TS re-renders the embed on the original message after
                    // each field save (buttons stay enabled).
                    let _ = msg
                        .edit(
                            ctx.http(),
                            serenity::EditMessage::new().embed(mk_embed(month, day, year)),
                        )
                        .await;
                }
            }
            _ => continue,
        }
    }

    // TS end handler: final description + disabled buttons.
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new()
                .embed(mk_embed(month, day, year))
                .components(vec![mk_row(true)]),
        )
        .await;
    Ok(())
}

/// One TS modal step (`set_month` / `set_day` / `set_year`): show the modal
/// (TS title/label/2-2-4 lengths), validate the bare range, reject
/// already-set values, save the single leaf. Returns true when a value was
/// stored (caller re-renders the embed).
#[allow(clippy::too_many_arguments)]
async fn run_birthday_modal(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    lang_code: &str,
    pool: &crate::db::Pool,
    user_id: u64,
    profil: &mut super::Profil,
    month: &mut Option<i64>,
    day: &mut Option<i64>,
    year: &mut Option<i64>,
) -> Result<bool, anyhow::Error> {
    use crate::modal_helper::{ModalField, ModalOptions, TextField, TextStyle};

    let tx = |k: &str, fallback: &str| {
        let v = crate::lang::get(lang_code, k).unwrap_or_default();
        if v.is_empty() {
            fallback.to_string()
        } else {
            v
        }
    };

    let field = press.data.custom_id.split('_').nth(1).unwrap_or("");
    let (modal_id, field_id, title_key, title_fb, label_key, label_fb, max_len, min_len) =
        match field {
            "month" => (
                "set_month",
                "month",
                "profil_birthday_modal2_title",
                "Enter your birth month",
                "profil_birthday_modal2_fields1_label",
                "Month",
                2u16,
                2u16,
            ),
            "day" => (
                "set_day",
                "day",
                "profil_birthday_modal3_title",
                "Enter your birth day",
                "profil_birthday_modal3_fields1_label",
                "Day",
                2u16,
                2u16,
            ),
            _ => (
                "set_year",
                "year",
                "profil_birthday_modal1_title",
                "Enter your birth year",
                "profil_birthday_modal1_fields1_label",
                "Year",
                4u16,
                4u16,
            ),
        };
    let mut opts = ModalOptions::new(&tx(title_key, title_fb), modal_id);
    opts.defer_update = false;
    opts.fields = vec![ModalField::Text(TextField {
        custom_id: field_id.to_string(),
        label: tx(label_key, label_fb),
        placeholder: None,
        style: TextStyle::Short,
        required: true,
        max_length: Some(max_len),
        min_length: Some(min_len),
        value: None,
    })];
    let modal = match crate::modal_helper::build_modal(&opts) {
        Ok(m) => m,
        Err(_) => return Ok(false),
    };
    if press
        .create_response(
            ctx.http(),
            serenity::CreateInteractionResponse::Modal(modal),
        )
        .await
        .is_err()
    {
        return Ok(false);
    }
    let Some(submit) =
        crate::commands::await_modal_submit(ctx.serenity_context(), press, modal_id).await
    else {
        return Ok(false);
    };
    let raw = crate::modal_helper::text_value(&submit, field_id);
    let value = parse_field(&raw);

    // TS per-field gates: bare range first, then the already-set check.
    let (valid, current) = match field {
        "month" => (value.is_some_and(valid_month_value), *month),
        "day" => (value.is_some_and(valid_day_value), *day),
        _ => (
            value.is_some_and(|v| valid_year_value(v, current_year())),
            *year,
        ),
    };
    let (invalid_key, invalid_fb, set_key, set_fb, already_key, already_fb) = match field {
        "month" => (
            "profil_birthday_invalid_month",
            "Invalid month! Please enter a valid month.",
            "profil_birthday_month_set",
            "Your month has been set!",
            "profil_birthday_month_already_set",
            "Your month is already set.",
        ),
        "day" => (
            "profil_birthday_invalid_day",
            "Invalid day! Please enter a valid day.",
            "profil_birthday_day_set",
            "Your day has been set!",
            "profil_birthday_day_already_set",
            "Your day is already set.",
        ),
        _ => (
            "profil_birthday_invalid_year",
            "Invalid year! Please enter a valid year.",
            "profil_birthday_year_set",
            "Your year has been set!",
            "profil_birthday_year_already_set",
            "Your year is already set.",
        ),
    };
    // TS answers the modal submit ephemerally (`modal.reply`, ephemeral flag).
    let answer = |content: String| async move {
        let _ = submit
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .content(content)
                        .ephemeral(true),
                ),
            )
            .await;
    };
    let v = match value {
        Some(v) if valid => v,
        _ => {
            answer(tx(invalid_key, invalid_fb)).await;
            return Ok(false);
        }
    };
    if current == Some(v) {
        answer(tx(already_key, already_fb)).await;
        return Ok(false);
    }
    match field {
        "month" => {
            profil.bday_month = u8::try_from(v).ok();
            *month = profil.bday_month.map(i64::from);
        }
        "day" => {
            profil.bday_day = u8::try_from(v).ok();
            *day = profil.bday_day.map(i64::from);
        }
        _ => {
            profil.bday_year = i32::try_from(v).ok();
            *year = profil.bday_year.map(i64::from);
        }
    }
    super::profil::save_profil_routed(pool, user_id, profil).await?;
    answer(tx(set_key, set_fb)).await;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::{parse_field, part_or_null, valid_day_value, valid_month_value, valid_year_value};

    #[test]
    fn modal_ranges_mirror_ts_bare_checks() {
        // TS month modal: parseInt 1..=12.
        assert!(valid_month_value(1));
        assert!(valid_month_value(12));
        assert!(!valid_month_value(0));
        assert!(!valid_month_value(13));
        // TS day modal: bare parseInt 1..=31 (Feb 31 passes, like TS).
        assert!(valid_day_value(1));
        assert!(valid_day_value(31));
        assert!(!valid_day_value(0));
        assert!(!valid_day_value(32));
        // TS year modal: 1900..=current year.
        let now = super::current_year();
        assert!(valid_year_value(1900, now));
        assert!(valid_year_value(now.into(), now));
        assert!(!valid_year_value(1899, now));
        assert!(!valid_year_value(i64::from(now) + 1, now));
    }

    #[test]
    fn field_intake_trims_and_rejects_garbage() {
        assert_eq!(parse_field("6"), Some(6));
        assert_eq!(parse_field(" 06 "), Some(6));
        assert_eq!(parse_field("2005"), Some(2005));
        assert_eq!(parse_field(""), None);
        assert_eq!(parse_field("abc"), None);
    }

    #[test]
    fn embed_parts_render_null_like_ts_replace() {
        assert_eq!(part_or_null(Some(6)), "6");
        assert_eq!(part_or_null(None), "null");
    }
}
