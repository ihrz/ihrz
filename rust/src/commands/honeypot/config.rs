use super::*;
use poise::serenity_prelude as serenity;

/// Credit URL shown in the trap/config footers. Mirrors HONEYPOT_CREDIT_URL.
pub const HONEYPOT_CREDIT_URL: &str = "https://github.com/RiskyMH/honeypot";
/// Embed colour used by every honeypot embed. Mirrors HONEYPOT_EMBED_COLOR.
pub const HONEYPOT_EMBED_COLOR: u32 = 0xD88A3D;
/// Native ban message-deletion window for the trap sanction (2h, mirrors
/// HONEYPOT_WINDOW_MS / deleteMessageSeconds).
pub const HONEYPOT_BAN_DELETE_SECS: u32 = 7200;
/// Interactive panel lifetime. Mirrors the 240s component collector in
/// `!config.ts` (`createMessageComponentCollector({ time: 240_000 })`).
pub const HONEYPOT_PANEL_TIMEOUT_MS: u64 = 240_000;
/// Panel component ids. Mirror the customIds in `buildComponents` +
/// the collector legs in `!config.ts`.
pub const HONEYPOT_TRAP_SELECT_ID: &str = "honeypot-config-trap-channel";
pub const HONEYPOT_LOGS_SELECT_ID: &str = "honeypot-config-logs-channel";
pub const HONEYPOT_ACTION_SELECT_ID: &str = "honeypot-config-action";
pub const HONEYPOT_SEND_BUTTON_ID: &str = "honeypot-config-send";
pub const HONEYPOT_PREVIEW_BUTTON_ID: &str = "honeypot-config-preview";
pub const HONEYPOT_TOGGLE_BUTTON_ID: &str = "honeypot-config-toggle";

/// Manager gate. Mirrors `canManageHoneypot` in `!config.ts`:
/// guild administrators pass, otherwise the protection allowlist
/// (`ALLOWLIST.list.<uid>` = `{allowed: true}`) decides.
pub fn can_manage_honeypot(is_admin: bool, allowlisted: bool) -> bool {
    is_admin || allowlisted
}

/// Toggle button wiring. Mirrors the `honeypot-config-toggle` leg:
/// an enabled trap offers Disable (danger style), otherwise Enable
/// (success style). Returns the lang key plus danger flag.
pub fn toggle_button(enabled: bool) -> (&'static str, bool) {
    if enabled {
        ("honeypot_config_button_disable", true)
    } else {
        ("honeypot_config_button_enable", false)
    }
}

/// Effective admin bit for the invoker: OR of their cached roles plus
/// @everyone (mirrors the moderation role-hierarchy resolution).
pub async fn invoker_is_admin(ctx: Ctx<'_>) -> bool {
    // Clone out of the cache guard first: CacheRef is not Send and must
    // not be held across awaits.
    let Some((guild_id, roles)) = ctx.guild().map(|g| (g.id, g.roles.clone())) else {
        return false;
    };
    let author_roles = ctx
        .author_member()
        .await
        .map(|m| m.roles.clone())
        .unwrap_or_default();
    let everyone = serenity::RoleId::new(guild_id.get());
    let mut perms = serenity::Permissions::empty();
    for r in &author_roles {
        if let Some(role) = roles.get(r) {
            perms |= role.permissions;
        }
    }
    if let Some(everyone_role) = roles.get(&everyone) {
        perms |= everyone_role.permissions;
    }
    perms.administrator()
}

/// Normalize a configured action to kick/ban/none. Mirrors the TS
/// HoneypotSchema action switch (unknown values fall through to none).
pub fn parse_honeypot_action(s: Option<&str>) -> &'static str {
    match s.map(str::trim).unwrap_or("none") {
        "kick" => "kick",
        "ban" => "ban",
        _ => "none",
    }
}

/// TS toggle guard: enabling requires a logs channel first
/// (honeypot_config_missing_logs_channel).
pub fn honeypot_enable_allowed(logs_channel_id: &str) -> bool {
    !logs_channel_id.trim().is_empty()
}

/// Default trap channel name with exact en-US fallback. Mirrors
/// lang.honeypot_default_channel_name.
pub fn default_trap_channel_name(lang_name: Option<String>) -> String {
    lang_name.unwrap_or_else(|| "🍯・general-chat".to_string())
}

/// Action label for the status embed. Mirrors ActionInEmbed.
pub fn action_status_label(action: &str, t: &(dyn Fn(&str) -> String + Send + Sync)) -> String {
    match action {
        "ban" => t("honeypot_config_select_action_ban"),
        "kick" => t("honeypot_config_select_action_kick"),
        _ => t("honeypot_config_select_action_del_messages"),
    }
}

/// Trap lure embed. Mirrors buildTrapEmbed (colour, thumbnail, title,
/// description, credit footer with ${url}).
pub fn build_trap_embed(t: &(dyn Fn(&str) -> String + Send + Sync)) -> serenity::CreateEmbed {
    let footer = t("honeypot_trap_embed_footer").replace("${url}", HONEYPOT_CREDIT_URL);
    let footer = if footer.trim().is_empty() {
        format!("Inspired by RiskyMH's Honeypot bot, check it out!\n{HONEYPOT_CREDIT_URL}")
    } else {
        footer
    };
    let title = t("honeypot_trap_embed_title");
    let desc = t("honeypot_trap_embed_desc");
    serenity::CreateEmbed::default()
        .colour(HONEYPOT_EMBED_COLOR)
        .thumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
        .title(if title.trim().is_empty() {
            "DO NOT SEND MESSAGES IN THIS CHANNEL".to_string()
        } else {
            title
        })
        .description(if desc.trim().is_empty() {
            "*This channel is used to catch spam bots.*\n*Any message sent here **WILL** trigger the server's automated protection.*".to_string()
        } else {
            desc
        })
        .footer(serenity::CreateEmbedFooter::new(footer))
}

/// Status panel embed. Mirrors buildConfigEmbed: status/action/
/// trap-channel/logs-channel/message fields plus notes and credit rows.
pub fn build_status_embed(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    enabled: bool,
    action: &str,
    trap_channel_id: &str,
    logs_channel_id: &str,
    message_url: Option<&str>,
) -> serenity::CreateEmbed {
    let none = t("var_none");
    let none = if none.trim().is_empty() {
        "None".to_string()
    } else {
        none
    };
    let on = t("var_enabled");
    let off = t("var_disabled");
    let status = if enabled {
        if on.trim().is_empty() {
            "Enabled".to_string()
        } else {
            on
        }
    } else if off.trim().is_empty() {
        "Disabled".to_string()
    } else {
        off
    };
    let title = t("honeypot_config_embed_title");
    let desc = t("honeypot_config_embed_desc");
    let f = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };
    serenity::CreateEmbed::default()
        .colour(HONEYPOT_EMBED_COLOR)
        .thumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
        .title(if title.trim().is_empty() {
            "Honeypot Configuration".to_string()
        } else {
            title
        })
        .description(if desc.trim().is_empty() {
            "Configure the trap channel, the logs channel, and the automatic action used when someone starts sending messages in the *Honeypot* channel.".to_string()
        } else {
            desc
        })
        .field(f("honeypot_config_embed_field_status", "Status"), status, true)
        .field(
            f("honeypot_config_embed_field_action", "Action"),
            action_status_label(action, t),
            true,
        )
        .field(
            f("honeypot_config_embed_field_trap_channel", "Trap Channel"),
            if trap_channel_id.trim().is_empty() {
                none.clone()
            } else {
                format!("<#{}>", trap_channel_id.trim())
            },
            true,
        )
        .field(
            f("honeypot_config_embed_field_logs_channel", "Logs Channel"),
            if logs_channel_id.trim().is_empty() {
                none.clone()
            } else {
                format!("<#{}>", logs_channel_id.trim())
            },
            true,
        )
        .field(
            f("honeypot_config_embed_field_message", "Sent Message"),
            message_url.unwrap_or(none.as_str()).to_string(),
            false,
        )
        .field(
            f("honeypot_config_embed_field_notes", "Notes"),
            f(
                "honeypot_config_notes_value",
                "- **Place the iHorizon role above every member role, for maximum efficiency.**",
            ),
            false,
        )
        .field(
            f("honeypot_config_embed_field_credit", "Credits"),
            t("honeypot_config_credit_value").replace("${url}", HONEYPOT_CREDIT_URL),
            false,
        )
}

/// Auto-create the trap channel when enabling without one. Mirrors
/// ensureTrapChannel: reuse the stored id when it still resolves to a text
/// channel, otherwise create `honeypot_default_channel_name` at position 0.
#[allow(clippy::collapsible_if, clippy::collapsible_match)]
async fn ensure_trap_channel_id(
    ctx: Ctx<'_>,
    guild_id: serenity::GuildId,
    stored_id: &str,
    default_name: &str,
) -> Option<String> {
    if !stored_id.trim().is_empty() {
        if let Ok(n) = stored_id.trim().parse::<u64>() {
            if let Ok(ch) = serenity::ChannelId::new(n).to_channel(ctx.http()).await {
                if let serenity::Channel::Guild(g) = ch {
                    if g.kind == serenity::ChannelType::Text {
                        return Some(stored_id.trim().to_string());
                    }
                }
            }
        }
    }
    let builder = serenity::CreateChannel::new(default_name).kind(serenity::ChannelType::Text);
    let created = guild_id.create_channel(ctx.http(), builder).await.ok()?;
    let _ = created
        .id
        .edit(ctx.http(), serenity::EditChannel::new().position(0))
        .await;
    Some(created.id.get().to_string())
}

/// Post (or refresh) the trap lure embed in the trap channel. Mirrors
/// sendTrapEmbed: delete the previous lure message, send a fresh trap
/// embed, persist channelId/messageId.
async fn send_trap_lure(
    ctx: Ctx<'_>,
    trap_channel_id: u64,
    prev_message_id: Option<u64>,
    t: &(dyn Fn(&str) -> String + Send + Sync),
) -> Option<u64> {
    let channel_id = serenity::ChannelId::new(trap_channel_id);
    if let Some(mid) = prev_message_id {
        let _ = channel_id
            .delete_message(ctx.http(), serenity::MessageId::new(mid))
            .await;
    }
    channel_id
        .send_message(
            ctx.http(),
            serenity::CreateMessage::new().embed(build_trap_embed(t)),
        )
        .await
        .ok()
        .map(|m| m.id.get())
}

#[poise::command(slash_command, prefix_command, rename = "config")]
pub async fn honeypot_config(
    ctx: Ctx<'_>,
    #[description = "on or off"] power: String,
    #[description = "Action: kick, ban or none"] action: Option<String>,
    #[description = "Channel for the lure"]
    #[channel_types("Text")]
    channel: Option<serenity::GuildChannel>,
    #[description = "Channel for the logs"]
    #[channel_types("Text")]
    logs_channel: Option<serenity::GuildChannel>,
    #[description = "Custom lure message"] message: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(&ctx.data().pool, Some(guild_id.get())).await;
    // Manager gate (mirrors canManageHoneypot): administrators pass,
    // otherwise the protection allowlist decides.
    let allow_rows =
        crate::commands::protection::protect::load_allowlist(&ctx.data().pool, &gid).await;
    let allowlisted = crate::commands::protection::protect::allowlist_contains(
        &allow_rows,
        ctx.author().id.get(),
    );
    if !can_manage_honeypot(invoker_is_admin(ctx).await, allowlisted) {
        let msg = crate::lang::get(&code, "honeypot_config_not_allowed").unwrap_or_else(|| {
            "You must be an administrator or be in the allowlist to configure Honeypot.".to_string()
        });
        ctx.say(msg).await?;
        return Ok(());
    }
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let fb = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };

    // Preserve fields the panel owns across edits (createdBy,
    // lastTriggeredAt, messageId), like the TS collector flow.
    let prev: serde_json::Value = load_honeypot_raw(&ctx.data().pool, &gid)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::Value::Null);
    let prev_str = |k: &str| {
        prev.get(k)
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string()
    };
    let prev_msg = prev
        .get("messageId")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let prev_msg = if prev_msg.trim().is_empty() {
        None
    } else {
        Some(prev_msg.to_string())
    };

    let enabling = matches!(
        power.to_ascii_lowercase().as_str(),
        "on" | "power on" | "enable"
    );
    let action = parse_honeypot_action(
        action
            .as_deref()
            .or_else(|| prev.get("action").and_then(|a| a.as_str())),
    )
    .to_string();
    let mut trap_id = channel
        .as_ref()
        .map(|c| c.id.get().to_string())
        .unwrap_or_else(|| prev_str("channelId"));
    let mut logs_id = logs_channel
        .as_ref()
        .map(|c| c.id.get().to_string())
        .unwrap_or_else(|| prev_str("logsChannelId"));
    if logs_id.trim().is_empty() {
        logs_id = prev_str("logsChannelId");
    }
    let custom_message = message.or_else(|| {
        let m = prev_str("message");
        if m.is_empty() {
            None
        } else {
            Some(m)
        }
    });

    if enabling {
        // TS toggle guard: a logs channel is required before enabling.
        if !honeypot_enable_allowed(&logs_id) {
            ctx.say(fb(
                "honeypot_config_missing_logs_channel",
                "You must configure a logs channel before enabling Honeypot.",
            ))
            .await?;
            return Ok(());
        }
        // Auto-create the trap channel when none is configured.
        if trap_id.trim().is_empty() {
            let def =
                default_trap_channel_name(crate::lang::get(&code, "honeypot_default_channel_name"));
            match ensure_trap_channel_id(ctx, guild_id, "", &def).await {
                Some(id) => trap_id = id,
                None => {
                    ctx.say(fb(
                        "honeypot_config_generic_error",
                        "An error occurred while updating Honeypot.",
                    ))
                    .await?;
                    return Ok(());
                }
            }
        }
    }

    let author_id = ctx.author().id.get().to_string();
    let prev_triggered = prev
        .get("lastTriggeredAt")
        .cloned()
        .unwrap_or(serde_json::json!(0));
    let mut cfg = serde_json::json!({
        "enabled": enabling,
        "action": action,
        "channelId": trap_id,
        "logsChannelId": logs_id,
        "createdBy": author_id,
        "lastTriggeredAt": prev_triggered,
    });
    if let Some(m) = prev_msg.as_deref() {
        cfg["messageId"] = serde_json::json!(m);
    }
    if let Some(m) = custom_message.as_deref() {
        cfg["message"] = serde_json::json!(m);
    }

    // Post the lure embed on enable (sendTrapEmbed), then persist messageId.
    let mut message_url: Option<String> = None;
    if enabling {
        if let Ok(trap_n) = trap_id.trim().parse::<u64>() {
            let prev_mid = cfg
                .get("messageId")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<u64>().ok());
            // Custom lure message overrides the default embed description.
            let t2 = |k: &str| {
                if k == "honeypot_trap_embed_desc" {
                    if let Some(m) = custom_message.as_deref() {
                        if !m.trim().is_empty() {
                            return m.to_string();
                        }
                    }
                }
                t(k)
            };
            if let Some(mid) = send_trap_lure(ctx, trap_n, prev_mid, &t2).await {
                cfg["messageId"] = serde_json::json!(mid.to_string());
                message_url = Some(crate::funcs::message_url(guild_id.get(), trap_n, mid));
            } else {
                ctx.say(fb(
                    "honeypot_config_generic_error",
                    "An error occurred while updating Honeypot.",
                ))
                .await?;
                return Ok(());
            }
        }
    } else if let (Some(mid), true) = (
        cfg.get("messageId").and_then(|v| v.as_str()),
        !trap_id.trim().is_empty(),
    ) {
        let mid_n: u64 = mid.parse().unwrap_or(0);
        let trap_n: u64 = trap_id.trim().parse().unwrap_or(0);
        message_url = Some(crate::funcs::message_url(guild_id.get(), trap_n, mid_n));
    }

    save_honeypot(&ctx.data().pool, &gid, &cfg).await?;
    let status = build_status_embed(
        &t,
        enabling,
        &action,
        &trap_id,
        &logs_id,
        message_url.as_deref(),
    );
    ctx.send(poise::CreateReply::default().embed(status))
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_parses_with_none_default() {
        assert_eq!(parse_honeypot_action(None), "none");
        assert_eq!(parse_honeypot_action(Some("kick")), "kick");
        assert_eq!(parse_honeypot_action(Some("ban")), "ban");
        assert_eq!(parse_honeypot_action(Some("BAN")), "none");
        assert_eq!(parse_honeypot_action(Some("bogus")), "none");
        assert_eq!(parse_honeypot_action(Some("")), "none");
    }

    #[test]
    fn enable_requires_logs_channel() {
        assert!(!honeypot_enable_allowed(""));
        assert!(!honeypot_enable_allowed("   "));
        assert!(honeypot_enable_allowed("123"));
    }

    #[test]
    fn manager_gate_mirrors_ts_allowlist_path() {
        assert!(can_manage_honeypot(true, false));
        assert!(can_manage_honeypot(false, true));
        assert!(can_manage_honeypot(true, true));
        assert!(!can_manage_honeypot(false, false));
    }

    #[test]
    fn panel_ids_and_timeout_match_ts_collector() {
        assert_eq!(HONEYPOT_PANEL_TIMEOUT_MS, 240_000);
        assert_eq!(HONEYPOT_TRAP_SELECT_ID, "honeypot-config-trap-channel");
        assert_eq!(HONEYPOT_LOGS_SELECT_ID, "honeypot-config-logs-channel");
        assert_eq!(HONEYPOT_ACTION_SELECT_ID, "honeypot-config-action");
        assert_eq!(HONEYPOT_SEND_BUTTON_ID, "honeypot-config-send");
        assert_eq!(HONEYPOT_PREVIEW_BUTTON_ID, "honeypot-config-preview");
        assert_eq!(HONEYPOT_TOGGLE_BUTTON_ID, "honeypot-config-toggle");
    }

    #[test]
    fn toggle_button_wiring_matches_ts_leg() {
        assert_eq!(
            toggle_button(true),
            ("honeypot_config_button_disable", true)
        );
        assert_eq!(
            toggle_button(false),
            ("honeypot_config_button_enable", false)
        );
    }

    #[test]
    fn default_name_falls_back_exact() {
        assert_eq!(
            default_trap_channel_name(None),
            "🍯・general-chat".to_string()
        );
        assert_eq!(
            default_trap_channel_name(Some("custom".to_string())),
            "custom".to_string()
        );
    }

    #[test]
    fn trap_embed_uses_credit_url_and_fallbacks() {
        let t = |k: &str| match k {
            "honeypot_trap_embed_title" => "T".to_string(),
            "honeypot_trap_embed_desc" => "D".to_string(),
            "honeypot_trap_embed_footer" => "see ${url}".to_string(),
            _ => String::new(),
        };
        let e = build_trap_embed(&t);
        let dbg = format!("{e:?}");
        assert!(dbg.contains(HONEYPOT_CREDIT_URL));
        // Empty table falls back to exact en-US strings.
        let t2 = |_: &str| String::new();
        let e2 = build_trap_embed(&t2);
        let dbg2 = format!("{e2:?}");
        assert!(dbg2.contains("DO NOT SEND MESSAGES IN THIS CHANNEL"));
    }

    #[test]
    fn status_embed_mentions_channels_and_action() {
        let t = |k: &str| match k {
            "var_none" => "None".to_string(),
            "var_enabled" => "Enabled".to_string(),
            "var_disabled" => "Disabled".to_string(),
            "honeypot_config_select_action_ban" => "Ban users".to_string(),
            "honeypot_config_select_action_kick" => "Kick users".to_string(),
            "honeypot_config_select_action_del_messages" => "Delete messages".to_string(),
            "honeypot_config_credit_value" => "see ${url}".to_string(),
            v => v.to_string(),
        };
        let e = build_status_embed(&t, true, "ban", "111", "222", Some("https://x"));
        let dbg = format!("{e:?}");
        assert!(dbg.contains("<#111>"));
        assert!(dbg.contains("<#222>"));
        assert!(dbg.contains("Ban users"));
        assert!(dbg.contains(HONEYPOT_CREDIT_URL));
        let e2 = build_status_embed(&t, false, "none", "", "", None);
        let dbg2 = format!("{e2:?}");
        assert!(dbg2.contains("None"));
    }
}
