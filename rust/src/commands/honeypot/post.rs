use super::*;
use poise::serenity_prelude as serenity;

/// Sanction applied when the lure is claimed. Mirrors
/// applyConfiguredAction: the configured action wins, never a fixed ban.
/// Unknown actions fall through to message-deletion only.
pub fn resolve_claim_sanction(action: &str) -> &'static str {
    match action {
        "kick" => "kick",
        "ban" => "ban",
        _ => "none",
    }
}

/// Native ban message-deletion window for the claim sanction, in seconds.
/// Mirrors deleteMessageSeconds (HONEYPOT_WINDOW_MS = 2h).
pub const CLAIM_BAN_DELETE_SECS: u32 = 7200;

/// DM lang key for a sanction result. Mirrors getDMActionMessage.
pub fn claim_dm_key(result: &str) -> &'static str {
    match result {
        "ban" => "honeypot_dm_action_banned",
        "kick" => "honeypot_dm_action_kicked",
        "none" => "honeypot_dm_action_none",
        _ => "honeypot_action_failed",
    }
}

/// Log-title lang key for a sanction result. Mirrors getLogActionLabel.
pub fn claim_log_key(result: &str) -> &'static str {
    match result {
        "ban" => "honeypot_log_action_ban",
        "kick" => "honeypot_log_action_kick",
        "none" => "honeypot_log_action_none",
        _ => "honeypot_action_failed",
    }
}

/// Logs post guard. Mirrors sendLogs: no logs channel means no log post.
pub fn should_post_claim_log(logs_channel_id: &str) -> bool {
    !logs_channel_id.trim().is_empty()
}

/// Sanction pre-check. Mirrors the `member?.kickable` / `member?.bannable`
/// guards at the top of `applyConfiguredAction` in honeypotManager.ts:
/// an unactionable member degrades the result to `failed`, otherwise the
/// configured action stands.
pub fn sanction_applicable(action: &str, kickable: bool, bannable: bool) -> &'static str {
    match action {
        "kick" if !kickable => "failed",
        "ban" if !bannable => "failed",
        "kick" => "kick",
        "ban" => "ban",
        _ => "none",
    }
}

/// Plain-data input for the trap log embed. Mirrors the `sendLogs`
/// fields: author/channel rows, `triggerCount`, deleted count, embed
/// count, DM status, message text, attachments, stickers, the result row
/// and the first image attachment.
pub struct ClaimLogData<'a> {
    pub author_mention: &'a str,
    pub author_id: &'a str,
    pub channel_mention: &'a str,
    pub trigger_count: u64,
    pub deleted_count: u64,
    pub embed_count: usize,
    pub dm_delivered: bool,
    pub message_content: &'a str,
    pub attachment_urls: &'a str,
    pub sticker_names: &'a str,
    pub first_image_url: Option<&'a str>,
    pub action_result: &'a str,
}

/// Trap log embed. Mirrors `sendLogs` in honeypotManager.ts (field set,
/// `var_none` fallbacks, `truncate`, first-image, result row). Never
/// hardcodes user-visible text: every label resolves through `t` with an
/// exact en-US fallback.
pub fn build_claim_log_embed(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    data: &ClaimLogData,
) -> serenity::CreateEmbed {
    let f = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };
    let none = f("var_none", "None");
    let trunc = |s: &str| super::truncate_field(s);
    let msg_text = if data.message_content.trim().is_empty() {
        f("honeypot_log_no_content", "No text content")
    } else {
        data.message_content.to_string()
    };
    let dm = if data.dm_delivered {
        f("honeypot_log_dm_open", "Delivered")
    } else {
        f("honeypot_log_dm_closed", "Closed or unreachable")
    };
    let attachments = if data.attachment_urls.trim().is_empty() {
        none.clone()
    } else {
        data.attachment_urls.to_string()
    };
    let stickers = if data.sticker_names.trim().is_empty() {
        none.clone()
    } else {
        data.sticker_names.to_string()
    };
    let title = f("honeypot_log_title", "Honeypot Triggered - ${action}").replace(
        "${action}",
        &f(
            match data.action_result {
                "ban" => "honeypot_log_action_ban",
                "kick" => "honeypot_log_action_kick",
                "none" => "honeypot_log_action_none",
                _ => "honeypot_action_failed",
            },
            data.action_result,
        ),
    );
    let mut embed = serenity::CreateEmbed::default()
        .colour(super::config::HONEYPOT_EMBED_COLOR)
        .thumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
        .title(title)
        .field(
            f("honeypot_log_field_author", "Author"),
            trunc(&format!("{}\n`{}`", data.author_mention, data.author_id)),
            true,
        )
        .field(
            f("honeypot_log_field_channel", "Channel"),
            data.channel_mention.to_string(),
            true,
        )
        .field(
            f(
                "honeypot_log_field_triggered_messages",
                "Triggered Messages",
            ),
            format!("`{}`", data.trigger_count),
            true,
        )
        .field(
            f("honeypot_log_field_deleted_messages", "Deleted Messages"),
            format!("`{}`", data.deleted_count),
            true,
        )
        .field(
            f("honeypot_log_field_embeds", "Embeds"),
            format!("`{}`", data.embed_count),
            true,
        )
        .field(f("honeypot_log_field_dm_status", "DM Status"), dm, true)
        .field(
            f("honeypot_log_field_message", "Deleted Message"),
            trunc(&msg_text),
            false,
        )
        .field(
            f("honeypot_log_field_attachments", "Attachments"),
            trunc(&attachments),
            false,
        )
        .field(
            f("honeypot_log_field_stickers", "Stickers"),
            trunc(&stickers),
            false,
        )
        .field(
            f("honeypot_log_field_result", "Result"),
            f(
                match data.action_result {
                    "ban" => "honeypot_log_action_ban",
                    "kick" => "honeypot_log_action_kick",
                    "none" => "honeypot_log_action_none",
                    _ => "honeypot_action_failed",
                },
                data.action_result,
            ),
            true,
        );
    if let Some(url) = data.first_image_url {
        if !url.trim().is_empty() {
            embed = embed.image(url.to_string());
        }
    }
    embed
}

#[poise::command(slash_command, prefix_command, rename = "post")]
pub async fn honeypot_post(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();

    // Trap lure embed (never hardcoded user-visible text) with the claim
    // button row. NOTE (deliberate extension, no TS counterpart): the TS
    // trap is message-based only; the Claim button gives lurkers a one-tap
    // claim handled by `handle_honeypot_claim`, which honors the
    // configured action via resolve_claim_sanction + posts to the logs
    // channel (see should_post_claim_log), never a fixed ban.
    let embed = super::config::build_trap_embed(&t);
    let claim_label = crate::lang::get(&code, "honeypot_claim_button_label")
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "Claim".to_string());
    let button = serenity::CreateButton::new(HONEYPOT_CUSTOM_ID)
        .label(claim_label)
        .style(serenity::ButtonStyle::Danger);
    let sent = ctx
        .channel_id()
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new().embed(embed).button(button),
        )
        .await?;

    // Track the lure message (config.messageId), preserving the rest of
    // the trap blob like the TS sendTrapEmbed flow.
    let prev: serde_json::Value = load_honeypot_raw(&ctx.data().pool, &gid)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}));
    let mut cfg = if prev.is_object() {
        prev
    } else {
        serde_json::json!({})
    };
    if let Some(obj) = cfg.as_object_mut() {
        obj.insert(
            "channelId".into(),
            serde_json::json!(ctx.channel_id().get().to_string()),
        );
        obj.insert(
            "messageId".into(),
            serde_json::json!(sent.id.get().to_string()),
        );
    }
    save_honeypot(&ctx.data().pool, &gid, &cfg).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claim_sanction_honors_action_never_fixed_ban() {
        assert_eq!(resolve_claim_sanction("ban"), "ban");
        assert_eq!(resolve_claim_sanction("kick"), "kick");
        // "none" and unknown values must NOT escalate to a ban.
        assert_eq!(resolve_claim_sanction("none"), "none");
        assert_eq!(resolve_claim_sanction(""), "none");
        assert_eq!(resolve_claim_sanction("bogus"), "none");
    }

    #[test]
    fn ban_window_is_two_hours() {
        assert_eq!(CLAIM_BAN_DELETE_SECS, 7200);
    }

    #[test]
    fn dm_and_log_keys_cover_results() {
        assert_eq!(claim_dm_key("ban"), "honeypot_dm_action_banned");
        assert_eq!(claim_dm_key("kick"), "honeypot_dm_action_kicked");
        assert_eq!(claim_dm_key("none"), "honeypot_dm_action_none");
        assert_eq!(claim_dm_key("failed"), "honeypot_action_failed");
        assert_eq!(claim_log_key("ban"), "honeypot_log_action_ban");
        assert_eq!(claim_log_key("kick"), "honeypot_log_action_kick");
        assert_eq!(claim_log_key("none"), "honeypot_log_action_none");
        assert_eq!(claim_log_key("failed"), "honeypot_action_failed");
    }

    #[test]
    fn logs_post_needs_channel() {
        assert!(!should_post_claim_log(""));
        assert!(!should_post_claim_log("   "));
        assert!(should_post_claim_log("123"));
    }

    #[test]
    fn sanction_precheck_mirrors_ts_guards() {
        assert_eq!(sanction_applicable("kick", true, false), "kick");
        assert_eq!(sanction_applicable("ban", false, true), "ban");
        assert_eq!(sanction_applicable("kick", false, true), "failed");
        assert_eq!(sanction_applicable("ban", true, false), "failed");
        assert_eq!(sanction_applicable("none", true, true), "none");
        assert_eq!(sanction_applicable("bogus", true, true), "none");
    }

    #[test]
    fn log_embed_covers_ts_sendlogs_fields() {
        let t = |k: &str| match k {
            "var_none" => "None".to_string(),
            "honeypot_log_title" => "Honeypot Triggered - ${action}".to_string(),
            "honeypot_log_action_ban" => "Banned user".to_string(),
            "honeypot_log_dm_open" => "Delivered".to_string(),
            "honeypot_log_no_content" => "No text content".to_string(),
            v => v.to_string(),
        };
        let data = ClaimLogData {
            author_mention: "<@1>",
            author_id: "1",
            channel_mention: "<#2>",
            trigger_count: 3,
            deleted_count: 5,
            embed_count: 1,
            dm_delivered: true,
            message_content: "spam",
            attachment_urls: "",
            sticker_names: "",
            first_image_url: Some("https://img/x.png"),
            action_result: "ban",
        };
        let dbg = format!("{:?}", build_claim_log_embed(&t, &data));
        for needle in [
            "<@1>",
            "<#2>",
            "`3`",
            "`5`",
            "Banned user",
            "Delivered",
            "None",
            "https://img/x.png",
        ] {
            assert!(dbg.contains(needle), "missing {needle}");
        }
        // Empty message + closed DMs fall back to lang keys.
        let t2 = |k: &str| match k {
            "honeypot_log_dm_closed" => "Closed".to_string(),
            v => v.to_string(),
        };
        let data2 = ClaimLogData {
            author_mention: "<@1>",
            author_id: "1",
            channel_mention: "<#2>",
            trigger_count: 1,
            deleted_count: 0,
            embed_count: 0,
            dm_delivered: false,
            message_content: "   ",
            attachment_urls: "",
            sticker_names: "",
            first_image_url: None,
            action_result: "failed",
        };
        let dbg2 = format!("{:?}", build_claim_log_embed(&t2, &data2));
        assert!(dbg2.contains("honeypot_log_no_content"));
        assert!(dbg2.contains("Closed"));
    }
}
