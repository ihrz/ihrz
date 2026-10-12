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

/// Log-title lang key for a sanction result. Mirrors getLogActionLabel in
/// `src/core/modules/honeypotManager.ts` (used by sendLogs for the title
/// and the result row): kick/ban get dedicated keys, `none` maps to
/// `honeypot_log_action_none` ("No action taken"), anything else
/// (e.g. `failed`) falls through to `honeypot_action_failed`.
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
        &f(claim_log_key(data.action_result), data.action_result),
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
            f(claim_log_key(data.action_result), data.action_result),
            true,
        );
    if let Some(url) = data.first_image_url {
        if !url.trim().is_empty() {
            embed = embed.image(url.to_string());
        }
    }
    embed
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
        // A failed sanction renders the TS getLogActionLabel default
        // (`honeypot_action_failed`), never the none key.
        assert!(dbg2.contains("honeypot_action_failed"));
        assert!(!dbg2.contains("honeypot_log_action_none"));
    }
}
