// iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
// Licensed under CC-BY-NC-SA-4.0.
// Mirrors src/Interaction/HybridCommands/confession/confession.ts
// (+ !channel.ts, !config.ts, !cooldown.ts, !thread.ts).
//
// TS keys: <guild>.CONFESSION.channel, <guild>.GUILD.CONFESSION.panel,
// <guild>.GUILD.CONFESSION.disable, <guild>.GUILD.CONFESSION.thread,
// <guild>.GUILD.CONFESSION.cooldown.

use crate::bot::Ctx;
use poise::serenity_prelude as serenity;

/// "on" => enabled, "off" => disabled. Mirrors !config.ts action choices.
pub fn parse_on_off(action: &str) -> Option<bool> {
    match action.to_ascii_lowercase().as_str() {
        "on" => Some(true),
        "off" => Some(false),
        _ => None,
    }
}

/// "yes" => create a thread, "no" => skip it. Mirrors !thread.ts choices.
pub fn parse_yes_no(action: &str) -> Option<bool> {
    match action.to_ascii_lowercase().as_str() {
        "yes" => Some(true),
        "no" => Some(false),
        _ => None,
    }
}

/// Parse "3h"/"30m"/"10s" (combined segments allowed) into milliseconds.
/// Mirrors iHorizonTimeCalculator.to_ms (src/core/functions/ms.ts).
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
            "ms" | "msec" | "millisecond" | "milliseconds" => 1.0,
            "s" | "sec" | "secs" | "second" | "seconds" => 1_000.0,
            "m" | "min" | "mins" | "minute" | "minutes" => 60_000.0,
            "h" | "hr" | "hrs" | "hour" | "hours" => 3_600_000.0,
            "d" | "day" | "days" => 86_400_000.0,
            "w" | "week" | "weeks" => 604_800_000.0,
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

/// Remaining cooldown ms before next confession; 0 = allowed.
/// Mirrors per-user last-confession check in the confess submit flow.
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
            let ch = v
                .get("channelId")
                .and_then(|c| c.as_str())
                .and_then(|s| s.parse().ok());
            if ch.is_some() {
                let msg = v
                    .get("messageId")
                    .and_then(|m| m.as_str())
                    .and_then(|s| s.parse().ok());
                return (ch, msg);
            }
        }
    }
    (fallback.and_then(|s| s.parse().ok()), None)
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
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(gid)
            .bind(log_key)
            .execute(pool)
            .await;
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
        let _ = sqlx::query("DELETE FROM kv WHERE guild_id = ? AND key_name = ?")
            .bind(gid)
            .bind(log_key)
            .execute(pool)
            .await;
    }
    true
}

/// Parse the `confess-private` modal field. Mirrors the TS
/// `case_private` checkbox (default true): empty/yes-like stays
/// anonymous, only an explicit no-like answer takes the public path.
pub fn parse_confession_private(raw: Option<&str>) -> bool {
    matches!(
        raw.map(|s| s.trim().to_ascii_lowercase()).as_deref(),
        None | Some("") | Some("yes") | Some("y") | Some("true") | Some("oui") | Some("o")
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
    // new-confession-button.ts ("1" is written by /confession config off).
    if crate::db::kv_get(pool, &gid, "GUILD.CONFESSION.disable")
        .await
        .as_deref()
        == Some("1")
    {
        return Ok(());
    }
    let lang_code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
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
        let msg = crate::lang::get(&lang_code, "monthly_cooldown_error")
            .unwrap_or_default()
            .replace("${time}", &beautiful_duration(left));
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
    // `case_private` default true: empty/yes-like stays anonymous, only
    // an explicit no-like answer takes the public path (avatar footer).
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
                    serenity::CreateThread::new(format!("{field} #{code}")),
                )
                .await
            {
                thread_id = Some(thread.id.get());
            }
        }
    }
    let _ = crate::db::kv_set(pool, &gid, &last_key, &now.to_string()).await;
    // Moderation archive (mirrors GUILD.CONFESSION.ALL_CONFESSIONS).
    // code/message_id/thread_id link confessionres% replies to this post.
    let _ = crate::db::kv_set(
        pool,
        &gid,
        &format!("GUILD.CONFESSION.ALL_CONFESSIONS.{now}"),
        &serde_json::json!({
            "author": comp.user.id.get().to_string(),
            "content": text.trim(),
            "at": now,
            "code": code,
            "message_id": posted_id,
            "thread_id": thread_id,
            "private": private,
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
    // ids. The old embed is reused verbatim (its bot footer only changes
    // when the bot profile changes); the button is rebuilt from its
    // previous label so the click flow survives. Best-effort, silent.
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
                let repost = serenity::CreateMessage::new()
                    .embed(serenity::CreateEmbed::from(re_embed))
                    .button(
                        serenity::CreateButton::new(channel::CONFESSION_PANEL_BUTTON_ID)
                            .label(label)
                            .style(serenity::ButtonStyle::Secondary),
                    );
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

/// Author reveal button (mod-only). Mirrors confessionauthor.ts
/// (customId `confession-author%<userId>`).
pub async fn handle_confession_author(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
) -> anyhow::Result<()> {
    let Some(target) = comp.data.custom_id.split('%').nth(1) else {
        return Ok(());
    };
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
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(format!("Author: <@{target_id}>"))
                .ephemeral(true),
        ),
    )
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

/// Find an archived confession by code. Mirrors the ALL_CONFESSIONS
/// array find in confessionres.ts; the Rust archive is one kv row per
/// confession (`GUILD.CONFESSION.ALL_CONFESSIONS.<ts>`).
pub async fn find_confession_by_code(
    pool: &crate::db::Pool,
    gid: &str,
    code: &str,
) -> Option<serde_json::Value> {
    let keys: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT key_name FROM kv WHERE guild_id = ? AND key_name LIKE 'GUILD.CONFESSION.ALL_CONFESSIONS.%'",
    )
    .bind(gid)
    .fetch_all(pool)
    .await
    .unwrap_or_default();
    for key in keys {
        if let Some(raw) = crate::db::kv_get(pool, gid, &key).await {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                if v.get("code").and_then(|c| c.as_str()) == Some(code) {
                    return Some(v);
                }
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
        let msg = crate::lang::get(&lang_code, "monthly_cooldown_error")
            .unwrap_or_default()
            .replace("${time}", &beautiful_duration(left));
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
    if let Some(thread_id) = entry.get("thread_id").and_then(|t| t.as_u64()) {
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
        assert!(!parse_confession_private(Some("no")));
        assert!(!parse_confession_private(Some("Non")));
        assert!(!parse_confession_private(Some("bogus")));
    }

    #[test]
    fn on_off_parses_config_choices() {
        assert_eq!(parse_on_off("on"), Some(true));
        assert_eq!(parse_on_off("off"), Some(false));
        assert_eq!(parse_on_off("bogus"), None);
    }

    #[test]
    fn yes_no_parses_thread_choices() {
        assert_eq!(parse_yes_no("yes"), Some(true));
        assert_eq!(parse_yes_no("no"), Some(false));
        assert_eq!(parse_yes_no("maybe"), None);
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
