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
        "none" => "honeypot_log_action_none",
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

#[poise::command(slash_command, prefix_command, rename = "post")]
pub async fn honeypot_post(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();

    // Trap lure embed (never hardcoded user-visible text) with the claim
    // button row. The claim path must honor the configured action via
    // resolve_claim_sanction + post to the logs channel (see
    // should_post_claim_log), never a fixed ban.
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
        assert_eq!(claim_dm_key("none"), "honeypot_log_action_none");
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
}
