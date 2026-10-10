// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/confession/confession.ts
// (+ !channel.ts, !config.ts, !cooldown.ts, !thread.ts).
//
// TS keys: <guild>.CONFESSION.channel, <guild>.GUILD.CONFESSION.panel,
// <guild>.GUILD.CONFESSION.thread, <guild>.GUILD.CONFESSION.cooldown,
// <guild>.GUILD.CONFESSION.ALL_CONFESSIONS.<n>.
//
// NOTE (TS writer/reader key mismatch, kept for interop): TS !config.ts
// writes the legacy `CONFESSION.disable` boolean, but the TS readers
// (new-confession-button.ts, confess flow) check the namespaced
// `GUILD.CONFESSION.disable`. Rust writes real JSON booleans to both
// keys and treats either one as disabling. The `"false"` legacy string
// never reads as disabled: readers only match `"1"`/`"true"`
// (bool-or-string tolerant, both sides).

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// "on" => enabled, "off" => disabled. Mirrors !config.ts action choices
/// with the TS exact `===` match (no case folding): anything else,
/// including "ON", is a silent no-op.
pub fn parse_on_off(action: &str) -> Option<bool> {
    match action {
        "on" => Some(true),
        "off" => Some(false),
        _ => None,
    }
}

/// "yes" => create a thread, "no" => skip it. Mirrors !thread.ts choices
/// with the TS exact `===` match (no case folding).
pub fn parse_yes_no(action: &str) -> Option<bool> {
    match action {
        "yes" => Some(true),
        "no" => Some(false),
        _ => None,
    }
}

/// Parse "3h"/"30m"/"10s" (combined segments allowed) into milliseconds.
/// Mirrors iHorizonTimeCalculator.to_ms (src/core/functions/ms.ts),
/// including the month/year units (mo/mois/month/months,
/// y/yr/yrs/year/years/an/ans) and the FR day/week variants
/// (j/jour/jours, sm/semaine/semaines).
pub fn parse_cooldown_ms(input: &str) -> Option<u64> {
    let s: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    if s.is_empty() {
        return None;
    }
    let bytes = s.as_bytes();
    let mut i = 0;
    let mut total = 0.0_f64;
    let mut matched = false;
    while i < bytes.len() {
        let start = i;
        while i < bytes.len() && (bytes[i].is_ascii_digit() || bytes[i] == b'.') {
            i += 1;
        }
        if start == i {
            return None;
        }
        let num: f64 = s[start..i].parse().ok()?;
        let ustart = i;
        while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
            i += 1;
        }
        if ustart == i {
            return None;
        }
        let mult = match s[ustart..i].to_ascii_lowercase().as_str() {
            "ms" | "msec" | "millisecond" | "milliseconds" | "milliseconde" | "millisecondes" => {
                1.0
            }
            "s" | "sec" | "secs" | "second" | "seconds" | "seconde" | "secondes" => 1_000.0,
            "m" | "min" | "mins" | "minute" | "minutes" => 60_000.0,
            "h" | "hr" | "hrs" | "hour" | "hours" | "heure" | "heures" => 3_600_000.0,
            "d" | "day" | "days" | "j" | "jour" | "jours" => 86_400_000.0,
            "w" | "sm" | "week" | "weeks" | "semaine" | "semaines" => 604_800_000.0,
            "mo" | "mois" | "month" | "months" => 2_592_000_000.0,
            "y" | "yr" | "yrs" | "year" | "years" | "an" | "ans" => 31_557_600_000.0,
            _ => return None,
        };
        total += num * mult;
        matched = true;
    }
    if !matched || total <= 0.0 {
        return None;
    }
    Some(total as u64)
}

/// Compact duration label. Mirrors timeCalculator.to_beautiful_string.
pub fn beautiful_duration(ms: u64) -> String {
    if ms.is_multiple_of(86_400_000) {
        return format!("{}d", ms / 86_400_000);
    }
    if ms.is_multiple_of(3_600_000) {
        return format!("{}h", ms / 3_600_000);
    }
    if ms.is_multiple_of(60_000) {
        return format!("{}m", ms / 60_000);
    }
    if ms.is_multiple_of(1_000) {
        return format!("{}s", ms / 1_000);
    }
    format!("{ms}ms")
}

/// Multi-unit duration label with the guild language's short unit
/// names. Mirrors timeCalculator.to_beautiful_string(ms, lang) short
/// form (no separator): `units` is [year, month, week, day, hour,
/// minute, second] (`var_year`, `var_mo`, `var_w`, `var_d`, `var_h`,
/// `var_m`, `var_s`); a sub-second remainder renders as `Nms` and
/// zero renders as `0` + the minute name, like TS.
pub fn beautiful_duration_lang(ms: u64, units: [&str; 7]) -> String {
    let factors = [
        31_557_600_000u64,
        2_592_000_000,
        604_800_000,
        86_400_000,
        3_600_000,
        60_000,
        1_000,
    ];
    let mut rest = ms;
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

/// Load the seven short duration unit names for a guild language.
/// Mirrors the `lang.var_year` / `var_mo` / ... lookups in
/// to_beautiful_string; fallbacks are the en-US short names.
pub fn duration_unit_names(lang_code: &str) -> [String; 7] {
    let get = |k: &str, fb: &str| crate::lang::get(lang_code, k).unwrap_or_else(|| fb.to_string());
    [
        get("var_year", "y"),
        get("var_mo", "mo"),
        get("var_w", "w"),
        get("var_d", "d"),
        get("var_h", "h"),
        get("var_m", "m"),
        get("var_s", "s"),
    ]
}

/// Remaining cooldown ms before next confession; 0 = allowed.
/// Mirrors per-user last-confession check in the confess submit flow.
///
/// C3 decision: per-guild persistent `CONFESSION_LAST.<userId>` under the
/// guild scope, NOT the TS global volatile `tempTable`
/// (`CONFESSION_COOLDOWN.<userId>` shared across guilds, lost on
/// restart). Cross-guild blocking is a TS bug (confessing in guild A
/// must not block guild B); per-guild matches the per-guild
/// `GUILD.CONFESSION.cooldown` config, and persistence survives
/// restarts. Both the confess and reply flows share the key, like TS.
pub fn confession_cooldown_left(last_ms: Option<u64>, cooldown_ms: u64, now_ms: u64) -> u64 {
    match last_ms {
        None => 0,
        Some(last) => last.saturating_add(cooldown_ms).saturating_sub(now_ms),
    }
}

/// Resolve the confession post channel: GUILD.CONFESSION.panel JSON
/// ({channelId, messageId}) wins, CONFESSION.channel plain id is the
/// fallback written by /confession channel. Returns
/// (channel_id, bound_panel_message_id).
pub fn panel_target(panel_raw: Option<&str>, fallback: Option<&str>) -> (Option<u64>, Option<u64>) {
    if let Some(raw) = panel_raw {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) {
            // TS writes string snowflakes; accept JSON numbers too so
            // migrated rows resolve the same way.
            let ch = snowflake_field(&v, "channelId");
            if ch.is_some() {
                return (ch, snowflake_field(&v, "messageId"));
            }
        }
    }
    (fallback.and_then(|s| s.parse().ok()), None)
}

/// True when a stored disable value means "disabled". Accepts the TS
/// legacy boolean form (`CONFESSION.disable`, written by !config.ts) and
/// the namespaced `"1"` form (`GUILD.CONFESSION.disable`).
pub fn confession_disabled_value(raw: Option<&str>) -> bool {
    matches!(
        raw.map(|s| s.trim().to_ascii_lowercase()).as_deref(),
        Some("1") | Some("true")
    )
}

/// True when the confession module is disabled in this guild. Reads both
/// the legacy `CONFESSION.disable` key and `GUILD.CONFESSION.disable`;
/// either one disables, matching the TS readers.
pub async fn is_confession_disabled(pool: &crate::db::Pool, gid: &str) -> bool {
    let legacy = crate::db::kv_get(pool, gid, "CONFESSION.disable").await;
    let namespaced = crate::db::kv_get(pool, gid, "GUILD.CONFESSION.disable").await;
    confession_disabled_value(legacy.as_deref()) || confession_disabled_value(namespaced.as_deref())
}

/// Parameters for [`post_confession_log`] (keeps the arg count low).
pub struct ConfessionLog<'a> {
    pub gid: &'a str,
    pub lang_code: &'a str,
    pub title_key: &'a str,
    pub code: &'a str,
    pub text: &'a str,
    pub author_id: u64,
}

/// Post the `## <title>: <code>` mod-log embed with an author-reveal
/// button to GUILD.SERVER_LOGS.confession. Mirrors the log block shared
/// by new-confession-button.ts and confessionres.ts: a dead channel key
/// is deleted. Returns false when no log channel is configured.
pub async fn post_confession_log(
    http: &std::sync::Arc<serenity::Http>,
    pool: &crate::db::Pool,
    log: &ConfessionLog<'_>,
) -> bool {
    let log_key = "GUILD.SERVER_LOGS.confession";
    let gid = log.gid;
    let Some(ch) = crate::db::kv_get(pool, gid, log_key).await else {
        return false;
    };
    let Ok(ch_id) = ch.parse::<u64>() else {
        let _ = crate::db::kv_del(pool, gid, log_key).await;
        return false;
    };
    let title = crate::lang::get(log.lang_code, log.title_key).unwrap_or_default();
    let btn_label = crate::lang::get(log.lang_code, "userinfo_button_label").unwrap_or_default();
    let reveal = serenity::CreateButton::new(format!("confession-author%{}", log.author_id))
        .label(btn_label)
        .style(serenity::ButtonStyle::Secondary);
    let log_embed = serenity::CreateEmbed::default()
        .colour(0x010101)
        .description(format!(
            "## {title}: {code}\n{text}",
            code = log.code,
            text = log.text
        ))
        .timestamp(serenity::Timestamp::now());
    if serenity::ChannelId::new(ch_id)
        .send_message(
            http,
            serenity::CreateMessage::new()
                .embed(log_embed)
                .button(reveal),
        )
        .await
        .is_err()
    {
        let _ = crate::db::kv_del(pool, gid, log_key).await;
    }
    true
}

/// Parse the `confess-private` modal field. Mirrors the TS
/// `case_private` checkbox (default true): anonymous unless the user
/// gives an explicit no-like answer. Native modals have no checkbox,
/// so a short yes/no field carries it (max 3 chars); only the exact
/// no-like spellings (`no`, `n`, `non`) take the public path —
/// anything else, including typos, stays anonymous like the TS
/// default-true checkbox.
pub fn parse_confession_private(raw: Option<&str>) -> bool {
    !matches!(
        raw.map(|s| s.trim().to_ascii_lowercase()).as_deref(),
        Some("no") | Some("n") | Some("non")
    )
}

/// Anonymous confession modal flow for `new-confession-button`.
/// Mirrors the TS panel modal chain: show modal -> cooldown gate ->
/// anonymous post in the panel channel. Manual implementation following
/// poise's execute_modal_generic (raw serenity Context here).
pub async fn handle_confess_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    // Disabled module ignores panel clicks. Mirrors the disable gate in
    // new-confession-button.ts; both the legacy `CONFESSION.disable`
    // boolean and `GUILD.CONFESSION.disable` disable.
    if is_confession_disabled(pool, &gid).await {
        return Ok(());
    }
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    // Cooldown is checked BEFORE the panel binding (TS order in
    // new-confession-button.ts: cooldown reply wins over the silent
    // panel guard, so a stale-panel click while on cooldown answers).
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let cooldown: u64 = crate::db::kv_get(pool, &gid, "GUILD.CONFESSION.cooldown")
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(300_000);
    let last_key = format!("CONFESSION_LAST.{}", comp.user.id.get());
    let last: Option<u64> = crate::db::kv_get(pool, &gid, &last_key)
        .await
        .and_then(|s| s.parse().ok());
    let left = confession_cooldown_left(last, cooldown, now);
    if left > 0 {
        let units = duration_unit_names(&lang_code);
        let pretty = beautiful_duration_lang(
            left,
            [
                units[0].as_str(),
                units[1].as_str(),
                units[2].as_str(),
                units[3].as_str(),
                units[4].as_str(),
                units[5].as_str(),
                units[6].as_str(),
            ],
        );
        let msg = crate::lang::get(&lang_code, "monthly_cooldown_error")
            .unwrap_or_default()
            .replace("${time}", &pretty);
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(msg)
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    // Clicks must come from the bound panel message (channel + message),
    // or at least the panel channel. Mirrors the channelId/messageId
    // guard in new-confession-button.ts.
    let panel_raw = crate::db::kv_get(pool, &gid, "GUILD.CONFESSION.panel").await;
    let fallback = crate::db::kv_get(pool, &gid, "CONFESSION.channel").await;
    let (target_ch, bound_msg) = panel_target(panel_raw.as_deref(), fallback.as_deref());
    let Some(target_ch) = target_ch else {
        return Ok(());
    };
    if let Some(mid) = bound_msg {
        if comp.channel_id.get() != target_ch || comp.message.id.get() != mid {
            return Ok(());
        }
    } else if comp.channel_id.get() != target_ch {
        return Ok(());
    }
    // Short code linking the post to confessionres% replies. Mirrors
    // generatePassword({ length: 6, numbers: true, lowercase: true }).
    let code = crate::funcs::generate_password(
        &crate::funcs::PasswordOptions {
            length: 6,
            numbers: true,
            symbols: false,
            lowercase: true,
            uppercase: false,
            exclude_similar: false,
            exclude: String::new(),
            strict: false,
        },
        now,
    )
    .unwrap_or_else(|_| format!("{now:06}"));
    let mut posted_id: Option<u64> = None;
    let mut thread_id: Option<u64> = None;
    let title = crate::lang::get(&lang_code, "confession_module_modal_title").unwrap_or_default();
    let label = crate::lang::get(&lang_code, "confession_module_modal_components1_label")
        .unwrap_or_default();
    let placeholder = crate::lang::get(
        &lang_code,
        "confession_module_modal_components1_placeholder",
    )
    .unwrap_or_default();
    // Privacy toggle. Mirrors the `case_private` checkbox (default true)
    // in new-confession-button.ts; native modals have no checkbox, so a
    // short yes/no field carries it (empty = private like the TS default).
    let private_label = crate::lang::get(&lang_code, "confession_module_modal_components2_label")
        .unwrap_or_else(|| "Is this private?".to_string());
    let modal = serenity::CreateModal::new("confess-modal", title).components(vec![
        serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Paragraph,
                label,
                "confess-text",
            )
            .placeholder(placeholder)
            .min_length(2)
            .max_length(2500),
        ),
        serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                private_label,
                "confess-private",
            )
            .placeholder("yes")
            .min_length(1)
            .max_length(3),
        ),
    ]);
    comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
        .await?;
    let Some(submit) = crate::commands::await_modal_submit(ctx, comp, "confess-modal").await else {
        return Ok(());
    };
    let mut text = String::new();
    let mut private_raw: Option<String> = None;
    for row in &submit.data.components {
        if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first() {
            if input.custom_id == "confess-text" {
                text = input.value.clone().unwrap_or_default();
            } else if input.custom_id == "confess-private" {
                private_raw = input.value.clone();
            }
        }
    }
    // `case_private` default true: anonymous unless the input is an
    // explicit no-like answer (`no`/`n`/`non`).
    let private = parse_confession_private(private_raw.as_deref());
    text = crate::funcs::mask_link(&text);
    if text.len() < 2 {
        return Ok(());
    }
    let _ = submit
        .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let thread_on = crate::db::kv_get(pool, &gid, "GUILD.CONFESSION.thread")
        .await
        .map(|v| v == "yes")
        .unwrap_or(false);
    // Public embed title mirrors `### <field> #<code>` in
    // new-confession-button.ts.
    let field = crate::lang::get(&lang_code, "help_confession_fields").unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .description(format!("### {field} #{code}\n\n`{text}`"))
        .colour(2829617)
        .timestamp(serenity::Timestamp::now());
    // Public path (checkbox off): author avatar attachment + name footer.
    // Mirrors the `!view` branch (user_icon.png, globalName||username).
    let mut files: Vec<serenity::CreateAttachment> = Vec::new();
    if !private {
        let name = comp
            .user
            .global_name
            .clone()
            .unwrap_or_else(|| comp.user.name.clone());
        if let Some(url) = comp.user.avatar_url() {
            if let Some(bytes) = crate::commands::shared::download_bytes(&url).await {
                files.push(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
                embed = embed.footer(
                    serenity::CreateEmbedFooter::new(name).icon_url("attachment://user_icon.png"),
                );
            } else {
                embed = embed.footer(serenity::CreateEmbedFooter::new(name));
            }
        } else {
            embed = embed.footer(serenity::CreateEmbedFooter::new(name));
        }
    }
    let mut message = serenity::CreateMessage::new().embed(embed);
    for file in files {
        message = message.add_file(file);
    }
    // Unique nonce per confession post. Mirrors `enforceNonce: true` +
    // the generated nonce in new-confession-button.ts. The same
    // timestamp doubles as the post-time cooldown/archive stamp below.
    let post_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    message = message
        .nonce(serenity::model::channel::Nonce::String(format!(
            "confession-{code}-{post_ms}"
        )))
        .enforce_nonce(true);
    // Thread mode gets the anonymous-reply button (customId
    // `confessionres%<code>`); without a thread there is no reply
    // surface, mirroring new-confession-button.ts.
    if thread_on {
        let respond_label =
            crate::lang::get(&lang_code, "confession_channel_button_name").unwrap_or_default();
        message = message.button(
            serenity::CreateButton::new(format!("{CONFESSIONRES_PREFIX}{code}"))
                .label(respond_label)
                .style(serenity::ButtonStyle::Secondary),
        );
    }
    if let Ok(posted) = serenity::ChannelId::new(target_ch)
        .send_message(&ctx.http, message)
        .await
    {
        posted_id = Some(posted.id.get());
        if thread_on {
            if let Ok(thread) = posted
                .channel_id
                .create_thread_from_message(
                    &ctx.http,
                    posted.id,
                    serenity::CreateThread::new(format!("{field} #{code}"))
                        .audit_log_reason("Pic Only"),
                )
                .await
            {
                // Mirrors `x.edit({ invitable: true, locked: false,
                // archived: false })` after startThread in
                // new-confession-button.ts.
                let _ = ctx
                    .http
                    .edit_thread(
                        thread.id,
                        &serenity::EditThread::new()
                            .invitable(true)
                            .locked(false)
                            .archived(false),
                        None,
                    )
                    .await;
                thread_id = Some(thread.id.get());
            }
        }
    }
    // Cooldown stamped at post time (mirrors the tempTable.set(Date.now())
    // after posting in new-confession-button.ts), not at click time.
    let _ = crate::db::kv_set(pool, &gid, &last_key, &post_ms.to_string()).await;
    // Moderation archive (mirrors GUILD.CONFESSION.ALL_CONFESSIONS).
    // code/message_id/thread_id link confessionres% replies to this post.
    // C10 compat: field names follow the TS array shape
    // (code/userId/timestamp/private/threadChannel/messageId); ids are
    // strings like discord.js snowflakes. `content` is a Rust-only extra
    // (TS stores no body). Dual-written via routed_set so both the
    // table walk and the legacy kv scan see the row.
    let _ = crate::commands::owner::main::routed_set(
        pool,
        &gid,
        &gid,
        &format!("GUILD.CONFESSION.ALL_CONFESSIONS.{post_ms}"),
        &serde_json::json!({
            "code": code,
            "userId": comp.user.id.get().to_string(),
            "timestamp": post_ms,
            "private": private,
            "threadChannel": thread_id.map(|t| t.to_string()),
            "messageId": posted_id.map(|m| m.to_string()),
            "content": text.trim(),
        })
        .to_string(),
    )
    .await;
    // Mod log mirrors the SERVER_LOGS.confession post in
    // new-confession-button.ts (title key confession_embed_logs_title).
    post_confession_log(
        &ctx.http,
        pool,
        &ConfessionLog {
            gid: &gid,
            lang_code: &lang_code,
            title_key: "confession_embed_logs_title",
            code: &code,
            text: &text,
            author_id: comp.user.id.get(),
        },
    )
    .await;
    // Panel rotation. Mirrors new-confession-button.ts: delete the old
    // panel message, repost it, rebind GUILD.CONFESSION.panel to the new
    // ids. The repost keeps the old embed body but refreshes the bot
    // footer (footerBuilder + footerAttachmentBuilder); the button is
    // rebuilt from its previous label so the click flow survives.
    // Best-effort, silent.
    if let Some(mid) = bound_msg {
        if let Ok(panel_msg) = serenity::ChannelId::new(target_ch)
            .message(&ctx.http, serenity::MessageId::new(mid))
            .await
        {
            let old_embed = panel_msg.embeds.first().cloned();
            // The received row shape is navigated as JSON (established
            // rolereactions precedent): find our button id, keep its label.
            let old_label = serde_json::to_value(&panel_msg.components)
                .ok()
                .and_then(|v| v.as_array().cloned())
                .unwrap_or_default()
                .iter()
                .flat_map(|row| {
                    row.get("components")
                        .and_then(|c| c.as_array())
                        .cloned()
                        .unwrap_or_default()
                })
                .find(|c| {
                    c.get("custom_id").and_then(|id| id.as_str())
                        == Some(channel::CONFESSION_PANEL_BUTTON_ID)
                })
                .and_then(|c| {
                    c.get("label")
                        .and_then(|l| l.as_str())
                        .map(|s| s.to_string())
                });
            let _ = panel_msg.delete(&ctx.http).await;
            if let (Some(re_embed), Some(label)) = (old_embed, old_label) {
                // Fresh footer on the repost. Mirrors footerBuilder +
                // footerAttachmentBuilder in the TS rotation repost: the
                // old embed is not reused verbatim, the bot footer only
                // refreshes here.
                let footer_name = crate::db::kv_get(pool, &gid, "BOT.botName")
                    .await
                    .filter(|s| !s.trim().is_empty())
                    .unwrap_or_else(|| "iHorizon".to_string());
                let footer_icon = crate::db::kv_get(pool, &gid, "BOT.botPFP")
                    .await
                    .and_then(|s| crate::emojis::base64_decode(&s));
                let mut repost = serenity::CreateMessage::new()
                    .embed(serenity::CreateEmbed::from(re_embed).footer(
                        serenity::CreateEmbedFooter::new(&footer_name).icon_url(
                            if footer_icon.is_some() {
                                "attachment://footer_icon.png".to_string()
                            } else {
                                String::new()
                            },
                        ),
                    ))
                    .button(
                        serenity::CreateButton::new(channel::CONFESSION_PANEL_BUTTON_ID)
                            .label(label)
                            .style(serenity::ButtonStyle::Secondary),
                    );
                if let Some(bytes) = footer_icon {
                    repost = repost
                        .add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
                }
                if let Ok(posted) = serenity::ChannelId::new(target_ch)
                    .send_message(&ctx.http, repost)
                    .await
                {
                    let _ = crate::commands::owner::main::routed_set(
                        pool,
                        &gid,
                        &gid,
                        "GUILD.CONFESSION.panel",
                        &channel::panel_store_json(target_ch, posted.id.get()),
                    )
                    .await;
                }
            }
        }
    }
    Ok(())
}

/// Author name, profile URL, and mention for the reveal embed.
/// Pure part of [`handle_confession_author`] (runtime data only, no
/// YAML): username + profile link + `<@id>` mention.
pub fn confession_author_parts(username: &str, target_id: u64) -> (String, String, String) {
    (
        username.to_string(),
        format!("https://discordapp.com/users/{target_id}"),
        format!("Author: <@{target_id}>"),
    )
}

/// Author reveal button (mod-only). Mirrors confessionauthor.ts
/// (customId `confession-author%<userId>`).
///
/// C4 adjudication: (1) admin gate KEPT — TS has no permission check
/// at all, so anyone clicking the log button learns the author's
/// identity; the Rust gate (administrator only, silent deny) is an
/// intentional security hardening, matching the ADMINISTRATOR gates on
/// the confession subcommands. (2) embed-vs-text: TS sends a rich
/// embed (author name + avatar + profile URL + mention, #010101), so
/// the plain-text reply is upgraded to that embed shape here. The bot
/// footer (footerBuilder + footerAttachmentBuilder) is attached like
/// TS; avatar bytes are snapshotted as an attachment per the
/// Components V2 rule, never a raw CDN URL. An empty/missing id gets
/// the TS ephemeral `❌` fallback.
pub async fn handle_confession_author(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let target = comp.data.custom_id.split('%').nth(1).unwrap_or_default();
    if target.is_empty() {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content("❌")
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let Ok(target_id) = target.parse::<u64>() else {
        return Ok(());
    };
    let member = comp.member.as_ref();
    let is_admin = member
        .map(|m| m.permissions.map(|p| p.administrator()).unwrap_or(false))
        .unwrap_or(false);
    if !is_admin {
        return Ok(());
    }
    let Ok(user) = serenity::UserId::new(target_id).to_user(&ctx.http).await else {
        return Ok(());
    };
    let (name, profile_url, mention) = confession_author_parts(&user.name, target_id);
    let mut author = serenity::CreateEmbedAuthor::new(name).url(profile_url);
    let mut files: Vec<serenity::CreateAttachment> = Vec::new();
    if let Some(url) = user.avatar_url() {
        if let Some(bytes) = crate::commands::shared::download_bytes(&url).await {
            files.push(serenity::CreateAttachment::bytes(bytes, "user_icon.png"));
            author = author.icon_url("attachment://user_icon.png");
        }
    }
    // Bot footer. Mirrors footerBuilder + footerAttachmentBuilder in
    // confessionauthor.ts (stored BOT.botName / BOT.botPFP).
    let gid = comp
        .guild_id
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let footer_name = crate::db::kv_get(pool, &gid, "BOT.botName")
        .await
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "iHorizon".to_string());
    let footer_icon = crate::db::kv_get(pool, &gid, "BOT.botPFP")
        .await
        .and_then(|s| crate::emojis::base64_decode(&s));
    let embed = serenity::CreateEmbed::default()
        .colour(0x010101)
        .author(author)
        .description(mention)
        .footer(
            serenity::CreateEmbedFooter::new(&footer_name).icon_url(if footer_icon.is_some() {
                "attachment://footer_icon.png".to_string()
            } else {
                String::new()
            }),
        )
        .timestamp(serenity::Timestamp::now());
    let mut msg = serenity::CreateInteractionResponseMessage::new()
        .embed(embed)
        .ephemeral(true);
    if let Some(bytes) = footer_icon {
        msg = msg.add_file(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    for file in files {
        msg = msg.add_file(file);
    }
    comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Message(msg))
        .await?;
    Ok(())
}

/// Custom-id prefix of the anonymous-reply button posted with each
/// confession thread. Mirrors new-confession-button.ts
/// (`confessionres%<code>`), routed by prefix in buttonHandler.ts.
pub const CONFESSIONRES_PREFIX: &str = "confessionres%";

/// Extract the confession code from a confessionres custom id.
pub fn confessionres_code(custom_id: &str) -> Option<&str> {
    let code = custom_id.strip_prefix(CONFESSIONRES_PREFIX)?;
    if code.is_empty() {
        None
    } else {
        Some(code)
    }
}

/// True when an archive doc carries this confession code.
/// Accepts the Rust per-row shape and TS-era rows: the TS array items
/// store `code` as a string, but migrated rows may carry it numeric,
/// so both spellings match (stringified compare).
pub fn confession_matches_code(entry: &serde_json::Value, code: &str) -> bool {
    match entry.get("code") {
        Some(v) if v.as_str() == Some(code) => true,
        Some(v) => v.as_u64().map(|n| n.to_string() == code).unwrap_or(false),
        None => false,
    }
}

/// One snowflake-ish id out of an archive doc: TS string snowflakes,
/// JSON numbers, or null (missing). Accepts every spelling so TS-era
/// rows resolve the same way Rust-written ones do.
fn snowflake_field(entry: &serde_json::Value, key: &str) -> Option<u64> {
    entry.get(key).and_then(|v| {
        v.as_str()
            .and_then(|s| s.parse().ok())
            .or_else(|| v.as_u64())
    })
}

/// Thread channel id of an archive doc. Accepts the Rust `thread_id`
/// (number) and the TS `threadChannel` (string snowflake, number, or
/// null) so migrated TS archives still resolve.
pub fn entry_thread_id(entry: &serde_json::Value) -> Option<u64> {
    snowflake_field(entry, "thread_id").or_else(|| snowflake_field(entry, "threadChannel"))
}

/// Find an archived confession by code. Mirrors the ALL_CONFESSIONS
/// array find in confessionres.ts.
///
/// C10 compat: the Rust archive is one row per confession
/// (`GUILD.CONFESSION.ALL_CONFESSIONS.<ts>`) while TS pushes into an
/// array at `GUILD.CONFESSION.ALL_CONFESSIONS`. Read both halves like
/// `list::load_archived_keys` does (table walk incl. a migrated
/// TS-array doc, plus the legacy kv scan) instead of kv-only, and
/// match both field-name variants via [`confession_matches_code`].
pub async fn find_confession_by_code(
    pool: &crate::db::Pool,
    gid: &str,
    code: &str,
) -> Option<serde_json::Value> {
    use crate::commands::owner::main as routed;
    if let Some(root) = routed::tbl_get_value(pool, gid, "GUILD").await {
        if let Some(all) = routed::walk_path(&root, &["CONFESSION", "ALL_CONFESSIONS"]) {
            if let Some(obj) = all.as_object() {
                for v in obj.values() {
                    if confession_matches_code(v, code) {
                        return Some(v.clone());
                    }
                }
            } else if let Some(arr) = all.as_array() {
                for v in arr {
                    if confession_matches_code(v, code) {
                        return Some(v.clone());
                    }
                }
            }
        }
    }
    for (_, value) in routed::legacy_scan(pool, gid, "GUILD.CONFESSION.ALL_CONFESSIONS.").await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&value) {
            if confession_matches_code(&v, code) {
                return Some(v);
            }
        }
    }
    None
}

/// Anonymous reply to a confession thread. Mirrors
/// Interaction/Components/Buttons/confessionres.ts: cooldown gate ->
/// modal -> masked reply posted into the confession thread -> mod log
/// embed with author-reveal button on GUILD.SERVER_LOGS.confession.
pub async fn handle_confession_response(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) -> anyhow::Result<()> {
    let Some(code) = confessionres_code(&comp.data.custom_id) else {
        return Ok(());
    };
    let code = code.to_string();
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let Some(entry) = find_confession_by_code(pool, &gid, &code).await else {
        return Ok(());
    };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let cooldown: u64 = crate::db::kv_get(pool, &gid, "GUILD.CONFESSION.cooldown")
        .await
        .and_then(|s| s.parse().ok())
        .unwrap_or(300_000);
    let last_key = format!("CONFESSION_LAST.{}", comp.user.id.get());
    let last: Option<u64> = crate::db::kv_get(pool, &gid, &last_key)
        .await
        .and_then(|s| s.parse().ok());
    let left = confession_cooldown_left(last, cooldown, now);
    if left > 0 {
        let units = duration_unit_names(&lang_code);
        let pretty = beautiful_duration_lang(
            left,
            [
                units[0].as_str(),
                units[1].as_str(),
                units[2].as_str(),
                units[3].as_str(),
                units[4].as_str(),
                units[5].as_str(),
                units[6].as_str(),
            ],
        );
        let msg = crate::lang::get(&lang_code, "monthly_cooldown_error")
            .unwrap_or_default()
            .replace("${time}", &pretty);
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(msg)
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let title = crate::lang::get(&lang_code, "confession_module_modal_title").unwrap_or_default();
    let label = crate::lang::get(&lang_code, "confession_module_modal_components1_label")
        .unwrap_or_default();
    let placeholder = crate::lang::get(
        &lang_code,
        "confession_module_modal_components1_placeholder",
    )
    .unwrap_or_default();
    let modal = serenity::CreateModal::new("confessionres-modal", title).components(vec![
        serenity::CreateActionRow::InputText(
            serenity::CreateInputText::new(serenity::InputTextStyle::Paragraph, label, "case_name")
                .placeholder(placeholder)
                .min_length(2)
                .max_length(2500),
        ),
    ]);
    comp.create_response(&ctx.http, serenity::CreateInteractionResponse::Modal(modal))
        .await?;
    let Some(submit) = crate::commands::await_modal_submit(ctx, comp, "confessionres-modal").await
    else {
        return Ok(());
    };
    let mut text = String::new();
    for row in &submit.data.components {
        if let Some(serenity::ActionRowComponent::InputText(input)) = row.components.first() {
            if input.custom_id == "case_name" {
                text = input.value.clone().unwrap_or_default();
            }
        }
    }
    text = crate::funcs::mask_link(&text);
    if text.len() < 2 {
        return Ok(());
    }
    let _ = submit
        .create_response(ctx, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let embed = serenity::CreateEmbed::default()
        .colour(2829617)
        .description(format!("`{text}`"))
        .timestamp(serenity::Timestamp::now());
    if let Some(thread_id) = entry_thread_id(&entry) {
        let _ = serenity::ChannelId::new(thread_id)
            .send_message(&ctx.http, serenity::CreateMessage::new().embed(embed))
            .await;
    }
    post_confession_log(
        &ctx.http,
        pool,
        &ConfessionLog {
            gid: &gid,
            lang_code: &lang_code,
            title_key: "confession_1_embed_log_title",
            code: &code,
            text: &text,
            author_id: comp.user.id.get(),
        },
    )
    .await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_defaults_to_anonymous_like_ts_checkbox() {
        assert!(parse_confession_private(None));
        assert!(parse_confession_private(Some("")));
        assert!(parse_confession_private(Some("yes")));
        assert!(parse_confession_private(Some(" YES ")));
        assert!(parse_confession_private(Some("oui")));
        // Only exact no-like spellings go public; typos stay anonymous.
        assert!(!parse_confession_private(Some("no")));
        assert!(!parse_confession_private(Some("Non")));
        assert!(!parse_confession_private(Some("n")));
        assert!(!parse_confession_private(Some("non")));
        assert!(parse_confession_private(Some("bogus")));
    }

    #[test]
    fn on_off_parses_config_choices() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
        assert_eq!(parse_on_off("bogus"), None);
        // TS exact `===`: no case folding, no trimming.
        assert_eq!(parse_on_off("ON"), None);
        assert_eq!(parse_on_off("OFF"), None);
        assert_eq!(parse_on_off(" on"), None);
    }

    #[test]
    fn disable_reads_legacy_boolean_and_namespaced_one() {
        assert!(confession_disabled_value(Some("true")));
        assert!(confession_disabled_value(Some("TRUE")));
        assert!(confession_disabled_value(Some("1")));
        assert!(confession_disabled_value(Some(" 1 ")));
        assert!(!confession_disabled_value(Some("false")));
        assert!(!confession_disabled_value(Some("0")));
        assert!(!confession_disabled_value(Some("bogus")));
        assert!(!confession_disabled_value(None));
    }

    #[test]
    fn yes_no_parses_thread_choices() {
        assert_eq!(parse_yes_no("yes"), Some(true));
        assert_eq!(parse_yes_no("no"), Some(false));
        assert_eq!(parse_yes_no("maybe"), None);
        // TS exact `===`: no case folding.
        assert_eq!(parse_yes_no("YES"), None);
        assert_eq!(parse_yes_no("No"), None);
    }

    #[test]
    fn cooldown_parses_ts_formats() {
        assert_eq!(parse_cooldown_ms("3h"), Some(10_800_000));
        assert_eq!(parse_cooldown_ms("30m"), Some(1_800_000));
        assert_eq!(parse_cooldown_ms("10s"), Some(10_000));
        assert_eq!(parse_cooldown_ms("1h30m"), Some(5_400_000));
        assert_eq!(parse_cooldown_ms("0s"), None);
        assert_eq!(parse_cooldown_ms("bogus"), None);
        assert_eq!(parse_cooldown_ms(""), None);
    }

    #[test]
    fn cooldown_parses_month_year_and_fr_units() {
        // ms.ts factors: mo = 2_592_000_000, y = 31_557_600_000.
        assert_eq!(parse_cooldown_ms("4mo"), Some(10_368_000_000));
        assert_eq!(parse_cooldown_ms("1month"), Some(2_592_000_000));
        assert_eq!(parse_cooldown_ms("2months"), Some(5_184_000_000));
        assert_eq!(parse_cooldown_ms("1mois"), Some(2_592_000_000));
        assert_eq!(parse_cooldown_ms("4y"), Some(126_230_400_000));
        assert_eq!(parse_cooldown_ms("1yr"), Some(31_557_600_000));
        assert_eq!(parse_cooldown_ms("2years"), Some(63_115_200_000));
        assert_eq!(parse_cooldown_ms("1an"), Some(31_557_600_000));
        assert_eq!(parse_cooldown_ms("3ans"), Some(94_672_800_000));
        assert_eq!(parse_cooldown_ms("1sm"), Some(604_800_000));
        assert_eq!(parse_cooldown_ms("2semaines"), Some(1_209_600_000));
        assert_eq!(parse_cooldown_ms("1semaine"), Some(604_800_000));
        assert_eq!(parse_cooldown_ms("1j"), Some(86_400_000));
        assert_eq!(parse_cooldown_ms("3jours"), Some(259_200_000));
        assert_eq!(parse_cooldown_ms("1jour"), Some(86_400_000));
        assert_eq!(parse_cooldown_ms("2heures"), Some(7_200_000));
        assert_eq!(parse_cooldown_ms("1millisecondes"), Some(1));
        assert_eq!(parse_cooldown_ms("1h30m"), Some(5_400_000));
    }

    #[test]
    fn beautiful_lang_renders_multi_unit_with_short_names() {
        let en = ["y", "mo", "w", "d", "h", "m", "s"];
        assert_eq!(beautiful_duration_lang(10_800_000, en), "3h");
        assert_eq!(beautiful_duration_lang(5_400_000, en), "1h30m");
        assert_eq!(beautiful_duration_lang(90_000, en), "1m30s");
        assert_eq!(beautiful_duration_lang(1_500, en), "1s500ms");
        assert_eq!(beautiful_duration_lang(0, en), "0m");
        assert_eq!(beautiful_duration_lang(2_592_000_000, en), "1mo");
        assert_eq!(beautiful_duration_lang(31_557_600_000, en), "1y");
        let fr = [
            "an(s)",
            "mois",
            "semaine(s)",
            "jour(s)",
            "heure(s)",
            "minute(s)",
            "seconde(s)",
        ];
        assert_eq!(
            beautiful_duration_lang(5_400_000, fr),
            "1heure(s)30minute(s)"
        );
        assert_eq!(beautiful_duration_lang(0, fr), "0minute(s)");
    }

    #[test]
    fn beautiful_duration_roundtrips_whole_units() {
        assert_eq!(beautiful_duration(10_800_000), "3h");
        assert_eq!(beautiful_duration(1_800_000), "30m");
        assert_eq!(beautiful_duration(10_000), "10s");
        assert_eq!(beautiful_duration(86_400_000), "1d");
        assert_eq!(beautiful_duration(1_500), "1500ms");
    }

    #[test]
    fn cooldown_left_logic() {
        assert_eq!(confession_cooldown_left(None, 1000, 5000), 0);
        assert_eq!(confession_cooldown_left(Some(1000), 500, 2000), 0);
        assert_eq!(confession_cooldown_left(Some(1000), 5000, 2000), 4000);
    }

    #[test]
    fn confessionres_code_parses() {
        assert_eq!(confessionres_code("confessionres%abc123"), Some("abc123"));
        assert_eq!(confessionres_code("confessionres%"), None);
        assert_eq!(confessionres_code("other%x"), None);
    }

    #[test]
    fn author_parts_carry_ts_reveal_shape() {
        let (name, url, mention) = confession_author_parts("kisakay", 123);
        assert_eq!(name, "kisakay");
        assert_eq!(url, "https://discordapp.com/users/123");
        assert_eq!(mention, "Author: <@123>");
    }

    #[test]
    fn archive_code_matches_ts_and_rust_shapes() {
        let ts = serde_json::json!({
            "code": "abc123",
            "userId": "7",
            "timestamp": 1,
            "private": true,
            "threadChannel": null,
            "messageId": "9",
        });
        let rust = serde_json::json!({
            "code": "abc123",
            "userId": "7",
            "timestamp": 1,
            "private": true,
            "threadChannel": "10",
            "messageId": "9",
            "content": "hi",
        });
        assert!(confession_matches_code(&ts, "abc123"));
        assert!(confession_matches_code(&rust, "abc123"));
        assert!(!confession_matches_code(&ts, "nope"));
        assert!(!confession_matches_code(&serde_json::json!({}), "abc123"));
        // TS-era numeric codes resolve the same way (stringified).
        assert!(confession_matches_code(
            &serde_json::json!({"code": 42}),
            "42"
        ));
        assert!(!confession_matches_code(
            &serde_json::json!({"code": 42}),
            "43"
        ));
    }

    #[test]
    fn thread_id_reads_ts_string_and_rust_number() {
        assert_eq!(
            entry_thread_id(&serde_json::json!({"threadChannel": "123"})),
            Some(123)
        );
        assert_eq!(
            entry_thread_id(&serde_json::json!({"thread_id": 456})),
            Some(456)
        );
        assert_eq!(
            entry_thread_id(&serde_json::json!({"threadChannel": null})),
            None
        );
        assert_eq!(entry_thread_id(&serde_json::json!({})), None);
    }

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn find_by_code_reads_legacy_ts_shape() {
        let pool = memory_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.CONFESSION.ALL_CONFESSIONS.1",
            &serde_json::json!({
                "code": "tscode",
                "userId": "7",
                "timestamp": 1,
                "private": true,
                "threadChannel": "123",
                "messageId": "9",
            })
            .to_string(),
        )
        .await
        .unwrap();
        let found = find_confession_by_code(&pool, "g", "tscode").await.unwrap();
        assert_eq!(entry_thread_id(&found), Some(123));
        assert!(find_confession_by_code(&pool, "g", "missing")
            .await
            .is_none());
    }

    #[test]
    fn panel_target_prefers_json_then_fallback() {
        let json = r#"{"channelId":"11","messageId":"22"}"#;
        assert_eq!(panel_target(Some(json), Some("99")), (Some(11), Some(22)));
        assert_eq!(panel_target(None, Some("99")), (Some(99), None));
        assert_eq!(panel_target(Some("broken"), Some("99")), (Some(99), None));
        assert_eq!(panel_target(None, None), (None, None));
        assert_eq!(
            panel_target(Some(r#"{"channelId":"x"}"#), None),
            (None, None)
        );
        // TS-era numeric embedded ids resolve the same way.
        assert_eq!(
            panel_target(Some(r#"{"channelId":11,"messageId":22}"#), None),
            (Some(11), Some(22))
        );
    }
}

pub mod channel;
#[allow(clippy::module_inception)]
pub mod confession;
pub mod config;
pub mod cooldown;
pub mod list;
pub mod thread;

/// Old registry path (`confession::main::*`) kept working.
#[allow(clippy::module_inception)]
#[allow(unused_imports)]
pub mod main {
    pub use super::confession::*;
    pub use super::config::*;
    pub use super::cooldown::*;
    pub use super::list::*;
    pub use super::thread::*;
    pub use super::*;
    pub use channel::*;
}
