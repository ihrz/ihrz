use super::*;
use poise::serenity_prelude as serenity;

/// True when the winner count is usable. Mirrors the
/// `isNaN(...) || <= 0` guard in !create.ts (failure replies
/// `start_is_not_valid`).
pub fn validate_winners(n: i64) -> bool {
    n > 0
}

/// Map a winner count to the stored count. Mirrors `getNumber("winner")`
/// (slash Number, gw.ts) + `number(args, 0)` (prefix) with the
/// `isNaN || parseInt(...) <= 0` guard in !create.ts:77-85: validity is
/// judged on the truncated value (parseInt semantics, so 0.5 -> 0 ->
/// `start_is_not_valid`), while a valid fractional count ceils to the
/// stored u32 so it covers the request (2.5 -> 3, kept). Non-finite
/// input maps to 0 so the `start_is_not_valid` guard below rejects it
/// in-handler.
pub fn winners_from_number(n: f64) -> i64 {
    if !n.is_finite() || n.trunc() <= 0.0 {
        0
    } else {
        n.ceil() as i64
    }
}

/// Parse the raw prefix winner word, like `number(args, 0)` in
/// !create.ts:60-85, through the same Number guard above.
pub fn parse_winners_count(raw: &str) -> i64 {
    raw.trim()
        .parse::<f64>()
        .ok()
        .map(winners_from_number)
        .unwrap_or(0)
}

/// Truncate the prize to the TS `substring(0, 256)` limit. JS strings
/// count UTF-16 code units, so astral characters (emoji) take two
/// slots; splitting a surrogate pair yields a lone surrogate, rendered
/// here as the Unicode replacement character.
pub fn truncate_prize(prize: &str) -> String {
    let units: Vec<u16> = prize.encode_utf16().take(256).collect();
    String::from_utf16_lossy(&units)
}

/// Image-source gate. Mirrors !create.ts:74 (the prefix path forces
/// `imageUrl` to `""`, so no embed image is ever set from prefix).
pub fn resolve_image_source(is_prefix: bool, image: Option<&str>) -> Option<&str> {
    if is_prefix {
        None
    } else {
        image.filter(|u| !u.is_empty())
    }
}

/// Requirement-value gate. Mirrors !create.ts:102-134.
/// Returns the failing lang key, or None when valid.
pub fn requirement_error_key(requirement: &str, value: &str) -> Option<&'static str> {
    match requirement {
        "invites" if !crate::funcs_resolve::is_number(value) => {
            Some("start_invalid_invites_req_value")
        }
        "messages" if !crate::funcs_resolve::is_number(value) => {
            Some("start_invalid_messages_req_value")
        }
        "roles" if value.trim().parse::<u64>().is_err() => Some("start_invalid_roles_req_value"),
        _ => None,
    }
}

/// Roles-requirement gate. Mirrors `!interaction.guild.roles.cache.has(value)`
/// in !create.ts:124-134: a numeric id is not enough, the role must resolve
/// against the guild. `guild_has_role` is the cache/HTTP resolution result;
/// `None` (guild unreadable) rejects like the TS cache miss, it never falls
/// back to accepting a bare number.
pub fn roles_requirement_invalid(value: &str, guild_has_role: Option<bool>) -> bool {
    if value.trim().parse::<u64>().is_err() {
        return true;
    }
    !guild_has_role.unwrap_or(false)
}

/// Resolve whether the roles-requirement value names a role in the guild.
/// Cache first, HTTP fallback (same pattern as the antispam leg: serenity
/// may leave the cache cold where discord.js always populates it).
/// Returns `None` when the value is not a role id or the guild id is unknown.
/// Verdict (HTTP fallback kept, lead sign-off): the fallback only ever
/// narrows — a bare numeric id never passes without guild resolution, and
/// `None` (guild unreadable) rejects like the TS cache miss.
pub async fn roles_requirement_guild_has(ctx: Ctx<'_>, value: &str) -> Option<bool> {
    let rid = value
        .trim()
        .parse::<u64>()
        .map(serenity::RoleId::new)
        .ok()?;
    let cached = ctx.guild().map(|g| g.roles.contains_key(&rid));
    if cached == Some(true) {
        return cached;
    }
    if let Some(gid) = ctx.guild_id() {
        if let Ok(roles) = ctx.serenity_context().http.get_guild_roles(gid).await {
            return Some(roles.iter().any(|role| role.id == rid));
        }
    }
    cached
}

/// Fixed requirement choice. Mirrors the `choices` list on the
/// `requirement` option in gw.ts:119-174: slash shows the localized
/// display names, `gw_requirement_value` maps each variant back to the
/// TS `value` stored as `requirement.type`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, poise::ChoiceParameter)]
pub enum GwRequirement {
    #[name = "none"]
    #[name_localized("en-US", "None")]
    #[name_localized("en-GB", "None")]
    #[name_localized("fr", "Aucun")]
    #[name_localized("ja", "none")]
    #[name_localized("ru", "none")]
    #[name_localized("es-ES", "none")]
    None,
    #[name = "invites"]
    #[name_localized("en-US", "Need Specific invitations amount")]
    #[name_localized("en-GB", "Need Specific invitations amount")]
    #[name_localized("fr", "Besoin d'un nombre spécifique d'invitations")]
    #[name_localized("ja", "need_specific_invitations_amount")]
    #[name_localized("ru", "need_specific_invitations_amount")]
    #[name_localized("es-ES", "need_specific_invitations_amount")]
    Invites,
    #[name = "messages"]
    #[name_localized("en-US", "Need specific messages number")]
    #[name_localized("en-GB", "Need specific messages number")]
    #[name_localized("fr", "Besoin d'un nombre spécifique de messages")]
    #[name_localized("ja", "need_specific_messages_number")]
    #[name_localized("ru", "need_specific_messages_number")]
    #[name_localized("es-ES", "need_specific_messages_number")]
    Messages,
    #[name = "roles"]
    #[name_localized("en-US", "Need specific roles")]
    #[name_localized("en-GB", "Need specific roles")]
    #[name_localized("fr", "Besoin de rôles spécifiques")]
    #[name_localized("ja", "need_specific_roles")]
    #[name_localized("ru", "need_specific_roles")]
    #[name_localized("es-ES", "need_specific_roles")]
    Roles,
}

/// TS choice `value` for a requirement.
pub fn gw_requirement_value(choice: GwRequirement) -> &'static str {
    match choice {
        GwRequirement::None => "none",
        GwRequirement::Invites => "invites",
        GwRequirement::Messages => "messages",
        GwRequirement::Roles => "roles",
    }
}

/// Normalize a raw requirement word to the stored `requirement.type`.
/// Mirrors !create.ts:102-134: only invites/messages/roles arm a gate,
/// so a missing value (None) or any unknown word (TS stores it verbatim)
/// behaves like "none" and maps to it here.
pub fn normalize_requirement(raw: Option<&str>) -> &'static str {
    match raw {
        Some("invites") => "invites",
        Some("messages") => "messages",
        Some("roles") => "roles",
        _ => "none",
    }
}

/// Start a giveaway!
#[poise::command(
    slash_command,
    prefix_command,
    rename = "create",
    aliases("gstart", "gcreate", "gw-create"),
    default_member_permissions = "MANAGE_MESSAGES",
    name_localized("fr", "créer"),
    name_localized("ja", "create"),
    name_localized("ru", "create"),
    name_localized("es-ES", "create"),
    description_localized("fr", "Commencer un giveaway"),
    description_localized("ja", "ギブアウェイを開始！"),
    description_localized("ru", "Начать розыгрыш!"),
    description_localized("es-ES", "Iniciar un sorteo!")
)]
pub async fn gw_create(
    ctx: Ctx<'_>,
    // Option (not required): TS reads `getNumber("winner")` /
    // `number(args, 0)` (both nullable, !create.ts) while the slash
    // schema marks it required (gw.ts). Poise types it as f64 so the
    // slash path carries a true Number like gw.ts; a missing/invalid
    // count fails the in-handler guard and answers `start_is_not_valid`
    // instead of a poise parse error on the bare form.
    #[name_localized("fr", "gagnants")]
    #[name_localized("ja", "winner")]
    #[name_localized("ru", "winner")]
    #[name_localized("es-ES", "winner")]
    #[description_localized("fr", "Nombre de gagnants pour les cadeaux")]
    #[description_localized("ja", "ギブアウェイの当選者数")]
    #[description_localized("ru", "Количество победителей розыгрыша")]
    #[description_localized("es-ES", "Número de ganadores del sorteo")]
    #[description = "Number of winner for the giveaways"]
    #[rename = "winner"]
    winners: Option<f64>,
    #[name_localized("fr", "temps")]
    #[name_localized("ja", "time")]
    #[name_localized("ru", "time")]
    #[name_localized("es-ES", "time")]
    #[description_localized("fr", "La durée des cadeaux")]
    #[description_localized("ja", "ギブアウェイの開催時間")]
    #[description_localized("ru", "Длительность розыгрыша")]
    #[description_localized("es-ES", "La duración del sorteo")]
    #[description = "The time duration of the giveaways"]
    time: String,
    // Option (not required): TS reads `getString("requirement")` /
    // `string(args, 2)` (both nullable, !create.ts) while the slash
    // schema marks it required (gw.ts). Slash-Option is deliberate (same
    // pattern as `winners` above): a missing word must reach the
    // in-handler gates. The dropdown constrains slash input to the TS
    // choices; a missing value maps to "none" below like before.
    #[description_localized("fr", "Le prérequis pour rentrer dans le giveaways")]
    #[description_localized("ja", "ギブアウェイ参加要件")]
    #[description_localized("ru", "Требование для участия в розыгрыше")]
    #[description_localized("es-ES", "El requisito para entrar en el sorteo")]
    #[description = "The requirement to enter into the giveaway"]
    requirement: Option<GwRequirement>,
    // Option (not required): TS stores `(prize || "").substring(0,256)`
    // (!create.ts:140), so a missing prize creates with an empty prize.
    #[name_localized("fr", "prix")]
    #[name_localized("ja", "prize")]
    #[name_localized("ru", "prize")]
    #[name_localized("es-ES", "prize")]
    #[description_localized("fr", "Le prix du giveaway")]
    #[description_localized("ja", "ギブアウェイの賞品")]
    #[description_localized("ru", "Приз розыгрыша")]
    #[description_localized("es-ES", "El premio del sorteo")]
    #[description = "The giveaway's prize"]
    prize: Option<String>,
    #[description_localized("fr", "La valeur du prérequis pour entrer dans le giveaway")]
    #[description_localized("ja", "要件の値")]
    #[description_localized("ru", "Значение требования")]
    #[description_localized("es-ES", "El valor del requisito")]
    #[description = "The requirement value"]
    #[rename = "requirement-value"]
    requirement_value: Option<String>,
    #[description_localized("fr", "le lien d'une image qui seras inclu dans l'embed du giveaway")]
    #[description_localized("ja", "ギブアウェイの埋め込みに表示される画像")]
    #[description_localized("ru", "Изображение в эмбеде розыгрыша")]
    #[description_localized("es-ES", "Imagen mostrada en el embed del sorteo")]
    #[description = "Image showed on the giveaway's embed"]
    image: Option<String>,
) -> Result<(), anyhow::Error> {
    // Ack-first like the TS `thinking: true` on `gw` (gw.ts:419): the
    // handler below does store + HTTP work (guild icon snapshot,
    // role resolution, image probe) before answering, so defer up
    // front instead of risking the 3s interaction timeout. Later
    // `say`/`send` calls become followups, like the TS deferred
    // `interactionSend` path.
    ctx.defer().await?;
    let pool_early = &ctx.data().pool;
    let code_early = crate::db::guild_lang(pool_early, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors !create.ts:77-85 (raw count validated in-handler:
    // NaN / <= 0 -> start_is_not_valid). Both paths carry the raw
    // Number (slash f64 option, prefix word parsed as f64), mapped
    // here through the TS getNumber + parseInt guard with ceil kept.
    // Missing (None) maps to 0 like the TS NaN path, so the guard
    // below answers `start_is_not_valid`.
    let winners = winners.map(winners_from_number).unwrap_or(0);
    if !validate_winners(winners) {
        ctx.say(crate::lang::get(&code_early, "start_is_not_valid").unwrap_or_default())
            .await?;
        return Ok(());
    }
    // Mirrors !create.ts:87-99 (bad duration -> start_time_not_valid,
    // checked before the requirement gates like the TS order
    // winners -> duration -> requirement). The duration goes through
    // the full timeCalculator mirror (compound sums, FR/EN aliases).
    let delta = super::gw_parse_duration_ms(&time);
    let Some(delta) = delta else {
        ctx.say(crate::lang::get(&code_early, "start_time_not_valid")
                .map(|s| {
                    s.replace(
                        "${interaction.user}",
                        &format!("<@{}>", ctx.author().id.get()),
                    )
                })
                .unwrap_or_else(|| "${interaction.user}, the giveaway duration you specified is invalid, please try again!".to_string()),
        )
        .await?;
        return Ok(());
    };
    // Mirrors !create.ts:101-134 (requirement-value gates). The choice
    // maps back to the TS value, then normalizes (missing folds to
    // "none" like before).
    let requirement = normalize_requirement(requirement.map(gw_requirement_value));
    let req_value = requirement_value.unwrap_or_default();
    // Roles resolve against the guild like
    // `interaction.guild.roles.cache.has(value)` in !create.ts:124-134:
    // unknown ids are rejected with start_invalid_roles_req_value and
    // never stored. (The numeric pre-check in requirement_error_key alone
    // is not enough — it accepted any parseable id.)
    if requirement == "roles" {
        if roles_requirement_invalid(
            &req_value,
            roles_requirement_guild_has(ctx, &req_value).await,
        ) {
            let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
                .await
                .unwrap_or_default();
            ctx.say(
                crate::lang::get(&code_early, "start_invalid_roles_req_value")
                    .unwrap_or_default()
                    .replace("${client.iHorizon_Emojis.No}", &no),
            )
            .await?;
            return Ok(());
        }
    } else if let Some(key) = requirement_error_key(requirement, &req_value) {
        let no = crate::emojis::app_emoji_markup(&ctx.serenity_context().http, "No")
            .await
            .unwrap_or_default();
        ctx.say(
            crate::lang::get(&code_early, key)
                .unwrap_or_default()
                .replace("${client.iHorizon_Emojis.No}", &no),
        )
        .await?;
        return Ok(());
    }
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let now = crate::commands::schedule::main::now_ms();
    // Prefix invocations carry no image option (TS forces imageUrl
    // to "" on the prefix path); slash honors a valid image URL.
    // The footer snapshot and the image-URL probe are independent,
    // so they run concurrently instead of sequentially.
    let is_prefix = matches!(ctx, poise::Context::Prefix(_));
    let pool = &ctx.data().pool;
    let image_candidate = resolve_image_source(is_prefix, image.as_deref());
    let ((footer_name, footer_icon), image_ok) = tokio::join!(
        giveaway_footer(pool, &ctx.serenity_context().http, &gid),
        async {
            match image_candidate {
                Some(url) => crate::funcs::is_image_url(url).await,
                None => false,
            }
        },
    );
    let gw = Giveaway {
        guild_id: gid.clone(),
        channel_id: ctx.channel_id().get().to_string(),
        winner_count: winners as u32,
        // TS prefix leaves prize undefined, slash marks it required;
        // either way the stored value is `(prize || "")` sliced to 256
        // (!create.ts:140), so None stores empty here too.
        prize: truncate_prize(prize.as_deref().unwrap_or("")),
        hosted_by: ctx.author().id.get().to_string(),
        expire_in_ms: now + delta,
        ended: false,
        entries: vec![],
        winners: vec![],
        requirement: requirement.to_string(),
        requirement_value: req_value,
        is_valid: true,
        embed_image_url: match image_candidate {
            Some(url) if image_ok => Some(url.to_string()),
            _ => None,
        },
    };
    // Rich board post. Mirrors create() in giveawaysManager.ts.
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (end_r, end_d) = stamp_pair(gw.expire_in_ms);
    let desc = t("event_gw_embed_desc")
        .replace("${end_string}", &end_r)
        .replace("${end_string2}", &end_d)
        .replace("${data.hostedBy}", &gw.hosted_by)
        .replace("${winners_amount}", &gw.winner_count.to_string());
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::new(GW_COLOR))
        .title(gw.prize.clone())
        .description(desc)
        .timestamp(unix_ts(gw.expire_in_ms / 1000));
    embed = giveaway_embed_footer(embed, &footer_name, footer_icon.is_some());
    embed = apply_giveaway_image(embed, gw.embed_image_url.as_deref());
    let mut reply =
        poise::CreateReply::default()
            .embed(embed)
            .components(vec![giveaway_entry_row(&t(
                "event_gw_entries_button_title",
            ))]);
    if let Some(icon) = footer_icon {
        reply = reply.attachment(serenity::CreateAttachment::bytes(icon, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mid = handle.message().await?.id.get();
    super::gw::store_set(&ctx.data().pool, &gid, mid, &serde_json::to_string(&gw)?).await?;
    // Audit log first, then the success confirmation. Mirrors !create.ts
    // (note the TS quirk: the create log uses reroll_logs_embed_title).
    let channel_mention = format!("<#{}>", ctx.channel_id().get());
    let log_title = crate::lang::get(&code, "reroll_logs_embed_title")
        .unwrap_or_else(|| "Giveaways Logs".to_string());
    let log_desc = render_start_log(
        &crate::lang::get(&code, "start_logs_embed_description").unwrap_or_else(|| {
            "<@${interaction.user.id}> started a giveaway in: ${giveawayChannel}".to_string()
        }),
        ctx.author().id.get(),
        &channel_mention,
    );
    post_gw_log(&ctx, &log_title, &log_desc).await;
    ctx.say(render_start_confirmation(
        &crate::lang::get(&code, "start_confirmation_command")
            .unwrap_or_else(|| "Giveaway started in ${giveawayChannel}!".to_string()),
        &channel_mention,
    ))
    .await?;
    Ok(())
}

/// Render the create confirmation (`start_confirmation_command`).
pub fn render_start_confirmation(template: &str, channel_mention: &str) -> String {
    template.replace("${giveawayChannel}", channel_mention)
}

/// Render the create audit-log description
/// (`start_logs_embed_description`).
pub fn render_start_log(template: &str, user_id: u64, channel_mention: &str) -> String {
    template
        .replace("${interaction.user.id}", &user_id.to_string())
        .replace("${giveawayChannel}", channel_mention)
}

/// Post one #bf0bb9 embed to the name-contains `ihorizon-logs`
/// channel. Mirrors ihorizon_logs.ts (best-effort, silent when
/// missing). Shared by the giveaway create/end/reroll confirmations.
pub async fn post_gw_log(ctx: &Ctx<'_>, title: &str, description: &str) {
    use poise::serenity_prelude::{CreateEmbed, CreateMessage};
    let Some(guild_id) = ctx.guild_id() else {
        return;
    };
    let Ok(channels) = ctx.http().get_channels(guild_id).await else {
        return;
    };
    let Some(ch) = channels.iter().find(|c| c.name.contains("ihorizon-logs")) else {
        return;
    };
    let embed = CreateEmbed::default()
        .colour(serenity::Colour::new(0xbf0bb9))
        .title(title.to_string())
        .description(description.to_string());
    let _ = ch
        .id
        .send_message(ctx.http(), CreateMessage::new().embed(embed))
        .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn start_confirmation_and_log_renders() {
        assert_eq!(
            render_start_confirmation("Giveaway started in ${giveawayChannel}!", "<#7>"),
            "Giveaway started in <#7>!"
        );
        assert_eq!(
            render_start_log(
                "<@${interaction.user.id}> started a giveaway in: ${giveawayChannel}",
                42,
                "<#7>"
            ),
            "<@42> started a giveaway in: <#7>"
        );
    }

    #[test]
    fn winners_guard_mirrors_ts() {
        assert!(!validate_winners(0));
        assert!(!validate_winners(-3));
        assert!(validate_winners(1));
        assert!(validate_winners(20));
    }

    #[test]
    fn winners_number_maps_like_ts_get_number() {
        // Slash Number (f64) through the same guard: validity on the
        // truncated value (parseInt semantics: 0.5 -> 0 -> invalid),
        // valid fractions ceil kept (2.5 -> 3); non-finite maps to 0
        // for `start_is_not_valid`.
        assert_eq!(winners_from_number(3.0), 3);
        assert_eq!(winners_from_number(2.5), 3);
        assert_eq!(winners_from_number(3.9), 4);
        assert_eq!(winners_from_number(0.5), 0);
        assert_eq!(winners_from_number(0.9), 0);
        assert_eq!(winners_from_number(0.0), 0);
        assert_eq!(winners_from_number(-2.0), 0);
        assert_eq!(winners_from_number(f64::NAN), 0);
        assert_eq!(winners_from_number(f64::INFINITY), 0);
        assert!(validate_winners(winners_from_number(2.5)));
        assert!(!validate_winners(winners_from_number(0.5)));
        assert!(!validate_winners(winners_from_number(f64::NAN)));
    }

    #[test]
    fn winners_raw_string_parses_like_ts_number() {
        // !create.ts:77-80 (`isNaN || parseInt <= 0` -> start_is_not_valid).
        // Sub-unit counts reject (parseInt("0.5") == 0); valid fractions
        // ceil (2.5 -> 3, kept) so the stored u32 covers the request;
        // anything else unusable maps to 0 for the guard.
        assert_eq!(parse_winners_count("3"), 3);
        assert_eq!(parse_winners_count(" 2 "), 2);
        assert_eq!(parse_winners_count("2.5"), 3);
        assert_eq!(parse_winners_count("3.9"), 4);
        assert_eq!(parse_winners_count("0.5"), 0);
        assert_eq!(parse_winners_count("abc"), 0);
        assert_eq!(parse_winners_count(""), 0);
        assert_eq!(parse_winners_count("0"), 0);
        assert_eq!(parse_winners_count("-2"), 0);
        assert_eq!(parse_winners_count("NaN"), 0);
        assert_eq!(parse_winners_count("inf"), 0);
        assert!(validate_winners(parse_winners_count("3")));
        assert!(validate_winners(parse_winners_count("2.5")));
        assert!(!validate_winners(parse_winners_count("0.5")));
        assert!(!validate_winners(parse_winners_count("abc")));
        assert!(!validate_winners(parse_winners_count("0")));
        assert!(!validate_winners(parse_winners_count("-2")));
    }

    #[test]
    fn prize_truncates_at_256_utf16_units() {
        // Like JS `substring(0, 256)`: BMP chars take one slot, astral
        // characters (emoji) take two.
        let long = "p".repeat(300);
        assert_eq!(truncate_prize(&long).encode_utf16().count(), 256);
        assert_eq!(truncate_prize("prize"), "prize");
        let emoji = "😀".repeat(200);
        let cut = truncate_prize(&emoji);
        assert_eq!(cut.encode_utf16().count(), 256);
        assert_eq!(cut.chars().count(), 128);
    }

    #[test]
    fn prefix_path_ignores_image() {
        assert_eq!(resolve_image_source(true, Some("https://x/y.png")), None);
        assert_eq!(
            resolve_image_source(false, Some("https://x/y.png")),
            Some("https://x/y.png")
        );
        assert_eq!(resolve_image_source(false, None), None);
        assert_eq!(resolve_image_source(false, Some("")), None);
    }

    #[test]
    fn requirement_choices_cover_ts_values() {
        // gw.ts:119+ choice names, values and localizations.
        use poise::ChoiceParameter as _;
        assert_eq!(gw_requirement_value(GwRequirement::None), "none");
        assert_eq!(gw_requirement_value(GwRequirement::Invites), "invites");
        assert_eq!(gw_requirement_value(GwRequirement::Messages), "messages");
        assert_eq!(gw_requirement_value(GwRequirement::Roles), "roles");
        let names: Vec<String> = vec![
            GwRequirement::None,
            GwRequirement::Invites,
            GwRequirement::Messages,
            GwRequirement::Roles,
        ]
        .into_iter()
        .map(|c| c.name().to_string())
        .collect();
        assert_eq!(names, vec!["none", "invites", "messages", "roles",]);
        assert_eq!(
            GwRequirement::from_name("invites"),
            Some(GwRequirement::Invites)
        );
        assert_eq!(
            GwRequirement::from_name("roles"),
            Some(GwRequirement::Roles)
        );
        assert_eq!(GwRequirement::from_name("bogus"), None);
        assert_eq!(GwRequirement::from_index(0), Some(GwRequirement::None));
        assert_eq!(GwRequirement::from_index(3), Some(GwRequirement::Roles));
        let list = GwRequirement::list();
        assert_eq!(
            list[0].localizations.get("fr").map(String::as_str),
            Some("Aucun")
        );
        assert_eq!(
            list[1].localizations.get("fr").map(String::as_str),
            Some("Besoin d'un nombre spécifique d'invitations")
        );
        assert_eq!(
            list[2].localizations.get("ja").map(String::as_str),
            Some("need_specific_messages_number")
        );
        assert_eq!(
            list[3].localizations.get("es-ES").map(String::as_str),
            Some("need_specific_roles")
        );
        assert_eq!(GwRequirement::None.localized_name("fr"), Some("Aucun"));
    }

    #[test]
    fn requirement_gates_mirror_ts() {
        assert_eq!(
            requirement_error_key("invites", "abc"),
            Some("start_invalid_invites_req_value")
        );
        assert_eq!(requirement_error_key("invites", "5"), None);
        assert_eq!(
            requirement_error_key("messages", ""),
            Some("start_invalid_messages_req_value")
        );
        assert_eq!(requirement_error_key("messages", "10"), None);
        assert_eq!(
            requirement_error_key("roles", "not-a-role"),
            Some("start_invalid_roles_req_value")
        );
        assert_eq!(requirement_error_key("roles", "123"), None);
        assert_eq!(requirement_error_key("none", ""), None);
    }

    #[test]
    fn requirement_unknown_maps_none_like_ts() {
        // !create.ts stores any prefix word verbatim, but only
        // invites/messages/roles arm a gate, so unknown words (and a
        // missing value) behave like "none".
        assert_eq!(normalize_requirement(None), "none");
        assert_eq!(normalize_requirement(Some("none")), "none");
        assert_eq!(normalize_requirement(Some("invites")), "invites");
        assert_eq!(normalize_requirement(Some("messages")), "messages");
        assert_eq!(normalize_requirement(Some("roles")), "roles");
        assert_eq!(normalize_requirement(Some("garbage")), "none");
        assert_eq!(normalize_requirement(Some("")), "none");
        assert_eq!(normalize_requirement(Some("Invites")), "none");
    }

    #[test]
    fn roles_requirement_resolves_against_guild() {
        // Non-numeric values never resolve (!create.ts rejects: cache.has
        // is false for them).
        assert!(roles_requirement_invalid("not-a-role", Some(true)));
        assert!(roles_requirement_invalid("", None));
        // Numeric but unknown to the guild (or guild unreadable) rejects:
        // a bare parseable id must never be stored.
        assert!(roles_requirement_invalid("123", Some(false)));
        assert!(roles_requirement_invalid("123", None));
        // Only a guild-confirmed role passes.
        assert!(!roles_requirement_invalid("123", Some(true)));
    }
}
