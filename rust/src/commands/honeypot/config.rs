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

/// 4-row interactive panel. Mirrors `buildComponents` in `!config.ts`:
/// trap channel select, logs channel select, action string select, then
/// the send/preview/toggle button row. `disabled` renders the collector
/// `end` leg (every row disabled once the 240s lifetime lapses).
pub fn build_panel_components(
    t: &(dyn Fn(&str) -> String + Send + Sync),
    enabled: bool,
    action: &str,
    disabled: bool,
) -> Vec<serenity::CreateActionRow> {
    let ph = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };
    let channel_menu = |id: &'static str, key: &str, fb: &str| {
        serenity::CreateSelectMenu::new(
            id,
            serenity::CreateSelectMenuKind::Channel {
                channel_types: Some(vec![serenity::ChannelType::Text]),
                default_channels: None,
            },
        )
        .placeholder(ph(key, fb))
        .min_values(1)
        .max_values(1)
        .disabled(disabled)
    };
    let opt = |value: &str, key: &str, fb: &str| {
        serenity::CreateSelectMenuOption::new(ph(key, fb), value.to_string())
            .default_selection(action == value)
    };
    let action_menu = serenity::CreateSelectMenu::new(
        HONEYPOT_ACTION_SELECT_ID,
        serenity::CreateSelectMenuKind::String {
            options: vec![
                opt("kick", "honeypot_config_select_action_kick", "Kick users"),
                opt("ban", "honeypot_config_select_action_ban", "Ban users"),
                opt(
                    "none",
                    "honeypot_config_select_action_none",
                    "Delete messages only",
                ),
            ],
        },
    )
    .placeholder(ph(
        "honeypot_config_select_action_placeholder",
        "Select the action to apply",
    ))
    .disabled(disabled);
    let (toggle_key, danger) = toggle_button(enabled);
    let toggle_label = ph(
        toggle_key,
        if enabled {
            "Disable Honeypot"
        } else {
            "Enable Honeypot"
        },
    );
    vec![
        serenity::CreateActionRow::SelectMenu(channel_menu(
            HONEYPOT_TRAP_SELECT_ID,
            "honeypot_config_select_trap_placeholder",
            "Select the trap channel",
        )),
        serenity::CreateActionRow::SelectMenu(channel_menu(
            HONEYPOT_LOGS_SELECT_ID,
            "honeypot_config_select_logs_placeholder",
            "Select the logs channel",
        )),
        serenity::CreateActionRow::SelectMenu(action_menu),
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(HONEYPOT_SEND_BUTTON_ID)
                .style(serenity::ButtonStyle::Primary)
                .label(ph("honeypot_config_button_send", "Send Embed"))
                .disabled(disabled),
            serenity::CreateButton::new(HONEYPOT_PREVIEW_BUTTON_ID)
                .style(serenity::ButtonStyle::Secondary)
                .label(ph("honeypot_config_button_preview", "Preview"))
                .disabled(disabled),
            serenity::CreateButton::new(HONEYPOT_TOGGLE_BUTTON_ID)
                .style(if danger {
                    serenity::ButtonStyle::Danger
                } else {
                    serenity::ButtonStyle::Success
                })
                .label(toggle_label)
                .disabled(disabled),
        ]),
    ]
}

/// Stateless 240s collector gate. Mirrors
/// `createMessageComponentCollector({ time: 240_000 })` plus the `end`
/// leg that disables the panel: presses older than the panel lifetime
/// only re-render the disabled panel, never mutate state.
pub fn panel_expired(posted_unix_secs: i64, now_unix_secs: i64) -> bool {
    (now_unix_secs - posted_unix_secs) * 1000 >= HONEYPOT_PANEL_TIMEOUT_MS as i64
}

/// Trap-channel change rule. Mirrors
/// `if (config.channelId !== nextChannelId) config.messageId = undefined`.
pub fn trap_change_resets_message(old_trap_id: &str, next_trap_id: &str) -> bool {
    old_trap_id.trim() != next_trap_id.trim()
}

/// serenity-Context twin of `ensure_trap_channel_id` for the panel legs
/// (same rule: reuse the stored text channel, else create `default_name`
/// at position 0).
// Edition 2021: no let-chains, hence the matches! guard.
async fn ensure_trap_channel_http(
    http: &std::sync::Arc<serenity::Http>,
    guild_id: serenity::GuildId,
    stored_id: &str,
    default_name: &str,
) -> Option<String> {
    if !stored_id.trim().is_empty() {
        if let Ok(n) = stored_id.trim().parse::<u64>() {
            let is_text = matches!(
                serenity::ChannelId::new(n).to_channel(http).await,
                Ok(serenity::Channel::Guild(ref g))
                    if g.kind == serenity::ChannelType::Text
            );
            if is_text {
                return Some(stored_id.trim().to_string());
            }
        }
    }
    let builder = serenity::CreateChannel::new(default_name).kind(serenity::ChannelType::Text);
    let created = guild_id.create_channel(http, builder).await.ok()?;
    let _ = created
        .id
        .edit(http, serenity::EditChannel::new().position(0))
        .await;
    Some(created.id.get().to_string())
}

/// serenity-Context twin of `send_trap_lure`: delete the previous lure,
/// post a fresh trap embed, return the new message id.
async fn post_trap_lure_http(
    http: &std::sync::Arc<serenity::Http>,
    trap_channel_id: u64,
    prev_message_id: Option<u64>,
    t: &(dyn Fn(&str) -> String + Send + Sync),
) -> Option<u64> {
    let channel_id = serenity::ChannelId::new(trap_channel_id);
    if let Some(mid) = prev_message_id {
        let _ = channel_id
            .delete_message(http, serenity::MessageId::new(mid))
            .await;
    }
    channel_id
        .send_message(
            http,
            serenity::CreateMessage::new().embed(build_trap_embed(t)),
        )
        .await
        .ok()
        .map(|m| m.id.get())
}

/// Ensure the trap channel then post the lure. Mirrors `sendTrapEmbed`
/// (auto-create included); returns `(trap_id, message_id)`.
async fn ensure_and_post_lure(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    trap_id: &str,
    prev_message_id: Option<u64>,
    default_name: &str,
    custom_desc: Option<&str>,
    t: &(dyn Fn(&str) -> String + Send + Sync),
) -> Option<(u64, u64)> {
    let ensured = ensure_trap_channel_http(&ctx.http, guild_id, trap_id, default_name).await?;
    let trap_n: u64 = ensured.parse().ok()?;
    // Custom lure message overrides the default embed description,
    // like the slash-config path.
    let t2 = |k: &str| {
        if k == "honeypot_trap_embed_desc" {
            if let Some(m) = custom_desc {
                if !m.trim().is_empty() {
                    return m.to_string();
                }
            }
        }
        t(k)
    };
    let mid = post_trap_lure_http(&ctx.http, trap_n, prev_message_id, &t2).await?;
    Some((trap_n, mid))
}

/// Effective admin bit for a panel press. serenity-Context twin of
/// `invoker_is_admin` (same role-hierarchy OR including @everyone).
async fn panel_invoker_is_admin(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
) -> bool {
    let Ok(guild_roles) = ctx.http.get_guild_roles(guild_id).await else {
        return false;
    };
    let Ok(member) = guild_id.member(&ctx.http, user_id).await else {
        return false;
    };
    let everyone = serenity::RoleId::new(guild_id.get());
    let mut perms = serenity::Permissions::empty();
    for r in &member.roles {
        if let Some(role) = guild_roles.iter().find(|gr| &gr.id == r) {
            perms |= role.permissions;
        }
    }
    if let Some(everyone_role) = guild_roles.iter().find(|gr| gr.id == everyone) {
        perms |= everyone_role.permissions;
    }
    perms.administrator()
}

/// Ephemeral panel reply (TS `i.reply` with the ephemeral flag).
async fn panel_ephemeral(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Re-render the panel in place (TS `renderPanel`: status embed plus the
/// 4-row components). `disabled` renders the collector `end` leg.
async fn panel_update(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    guild_id: u64,
    cfg: &serde_json::Value,
    t: &(dyn Fn(&str) -> String + Send + Sync),
    disabled: bool,
) {
    let enabled = cfg
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let action = parse_honeypot_action(cfg.get("action").and_then(|v| v.as_str()));
    let trap = cfg
        .get("channelId")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let logs = cfg
        .get("logsChannelId")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    let msg_url: Option<String> = (|| {
        let trap_n: u64 = trap.trim().parse().ok()?;
        let mid: u64 = cfg
            .get("messageId")
            .and_then(|v| v.as_str())?
            .trim()
            .parse()
            .ok()?;
        Some(crate::funcs::message_url(guild_id, trap_n, mid))
    })();
    let embed = build_status_embed(t, enabled, action, trap, logs, msg_url.as_deref());
    let rows = build_panel_components(t, enabled, action, disabled);
    let _ = comp
        .create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(rows),
            ),
        )
        .await;
}

/// Ephemeral follow-up after a panel re-render (TS legs that call
/// `renderPanel()` and then `i.reply`, e.g. send/toggle confirmations).
async fn panel_followup(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_followup(
            &ctx.http,
            serenity::CreateInteractionResponseFollowup::new()
                .content(content)
                .ephemeral(true),
        )
        .await;
}

/// Panel press router for the six `honeypot-config-*` custom ids.
/// Stateless 240s-collector equivalent: message-age expiry renders the
/// disabled `end` leg, the invoker guard rejects other users (even admins)
/// like the TS `collect` check, the manager gate reuses `can_manage_honeypot`
/// (admin bit plus the protection allowlist), then each leg mirrors its
/// TS `collect` branch (selects persist + re-render, preview is
/// ephemeral, send/toggle post the lure + confirm).
pub async fn handle_panel_press(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
    pool: &crate::db::Pool,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let fb = |k: &str, fb: &str| {
        let v = t(k);
        if v.trim().is_empty() {
            fb.to_string()
        } else {
            v
        }
    };

    let mut cfg: serde_json::Value = load_honeypot_raw(pool, &gid)
        .await
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({
            "enabled": false,
            "action": "none",
            "createdBy": comp.user.id.get().to_string(),
            "lastTriggeredAt": 0,
        }));

    // Collector `end` leg: expired panels only re-render disabled.
    let now = serenity::Timestamp::now().unix_timestamp();
    if panel_expired(comp.message.timestamp.unix_timestamp(), now) {
        panel_update(ctx, comp, guild_id.get(), &cfg, &t, true).await;
        return;
    }

    // Invoker-only panel (mirrors the TS `collect` guard
    // `i.user.id !== interaction.user.id` → ephemeral `help_not_for_you`):
    // even another administrator must open their own panel. The opener id
    // is the stored `createdBy`, read before any leg overwrites it.
    let opener = cfg
        .get("createdBy")
        .and_then(|v| v.as_str())
        .unwrap_or_default();
    if !opener.is_empty() && comp.user.id.get().to_string() != opener {
        panel_ephemeral(
            ctx,
            comp,
            fb("help_not_for_you", "This interaction is not for you"),
        )
        .await;
        return;
    }

    // Manager gate (mirrors canManageHoneypot): administrators pass,
    // otherwise the protection allowlist decides.
    let allow_rows = crate::commands::protection::protect::load_allowlist(pool, &gid).await;
    let allowlisted =
        crate::commands::protection::protect::allowlist_contains(&allow_rows, comp.user.id.get());
    if !can_manage_honeypot(
        panel_invoker_is_admin(ctx, guild_id, comp.user.id).await,
        allowlisted,
    ) {
        panel_ephemeral(
            ctx,
            comp,
            fb(
                "honeypot_config_not_allowed",
                "You must be an administrator or be in the allowlist to configure Honeypot.",
            ),
        )
        .await;
        return;
    }

    let id = comp.data.custom_id.as_str();
    if id == HONEYPOT_TRAP_SELECT_ID || id == HONEYPOT_LOGS_SELECT_ID {
        let next: Option<String> = match &comp.data.kind {
            serenity::ComponentInteractionDataKind::ChannelSelect { values } => {
                values.first().map(|c| c.get().to_string())
            }
            _ => None,
        };
        let Some(next) = next else { return };
        if id == HONEYPOT_TRAP_SELECT_ID {
            let old = cfg
                .get("channelId")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            if trap_change_resets_message(&old, &next) {
                if let Some(obj) = cfg.as_object_mut() {
                    obj.remove("messageId");
                }
            }
            cfg["channelId"] = serde_json::json!(next);
        } else {
            cfg["logsChannelId"] = serde_json::json!(next);
        }
        cfg["createdBy"] = serde_json::json!(comp.user.id.get().to_string());
        let _ = save_honeypot(pool, &gid, &cfg).await;
        panel_update(ctx, comp, guild_id.get(), &cfg, &t, false).await;
        return;
    }

    if id == HONEYPOT_ACTION_SELECT_ID {
        let next = match &comp.data.kind {
            serenity::ComponentInteractionDataKind::StringSelect { values } => {
                values.first().cloned().unwrap_or_default()
            }
            _ => return,
        };
        cfg["action"] = serde_json::json!(parse_honeypot_action(Some(&next)));
        cfg["createdBy"] = serde_json::json!(comp.user.id.get().to_string());
        let _ = save_honeypot(pool, &gid, &cfg).await;
        panel_update(ctx, comp, guild_id.get(), &cfg, &t, false).await;
        return;
    }

    if id == HONEYPOT_PREVIEW_BUTTON_ID {
        let _ = comp
            .create_response(
                &ctx.http,
                serenity::CreateInteractionResponse::Message(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(build_trap_embed(&t))
                        .ephemeral(true),
                ),
            )
            .await;
        return;
    }

    if id == HONEYPOT_SEND_BUTTON_ID {
        let trap = cfg
            .get("channelId")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let prev_mid = cfg
            .get("messageId")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u64>().ok());
        let custom = cfg
            .get("message")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let def =
            default_trap_channel_name(crate::lang::get(&code, "honeypot_default_channel_name"));
        match ensure_and_post_lure(ctx, guild_id, &trap, prev_mid, &def, custom.as_deref(), &t)
            .await
        {
            Some((trap_n, mid)) => {
                cfg["channelId"] = serde_json::json!(trap_n.to_string());
                cfg["messageId"] = serde_json::json!(mid.to_string());
                cfg["createdBy"] = serde_json::json!(comp.user.id.get().to_string());
                let _ = save_honeypot(pool, &gid, &cfg).await;
                panel_update(ctx, comp, guild_id.get(), &cfg, &t, false).await;
                panel_followup(
                    ctx,
                    comp,
                    fb(
                        "honeypot_config_send_success",
                        "The Honeypot embed has been sent in ${channel}.",
                    )
                    .replace("${channel}", &format!("<#{trap_n}>")),
                )
                .await;
            }
            None => {
                panel_ephemeral(
                    ctx,
                    comp,
                    fb(
                        "honeypot_config_generic_error",
                        "An error occurred while updating Honeypot.",
                    ),
                )
                .await;
            }
        }
        return;
    }

    if id == HONEYPOT_TOGGLE_BUTTON_ID {
        let enabled = cfg
            .get("enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        if enabled {
            cfg["enabled"] = serde_json::json!(false);
            cfg["createdBy"] = serde_json::json!(comp.user.id.get().to_string());
            let _ = save_honeypot(pool, &gid, &cfg).await;
            panel_update(ctx, comp, guild_id.get(), &cfg, &t, false).await;
            panel_followup(
                ctx,
                comp,
                fb(
                    "honeypot_config_disable_success",
                    "Honeypot is now disabled.",
                ),
            )
            .await;
            return;
        }
        let logs = cfg
            .get("logsChannelId")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        if !honeypot_enable_allowed(&logs) {
            panel_ephemeral(
                ctx,
                comp,
                fb(
                    "honeypot_config_missing_logs_channel",
                    "You must configure a logs channel before enabling Honeypot.",
                ),
            )
            .await;
            return;
        }
        let trap = cfg
            .get("channelId")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let prev_mid = cfg
            .get("messageId")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u64>().ok());
        let custom = cfg
            .get("message")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let def =
            default_trap_channel_name(crate::lang::get(&code, "honeypot_default_channel_name"));
        match ensure_and_post_lure(ctx, guild_id, &trap, prev_mid, &def, custom.as_deref(), &t)
            .await
        {
            Some((trap_n, mid)) => {
                cfg["enabled"] = serde_json::json!(true);
                cfg["channelId"] = serde_json::json!(trap_n.to_string());
                cfg["messageId"] = serde_json::json!(mid.to_string());
                cfg["createdBy"] = serde_json::json!(comp.user.id.get().to_string());
                let _ = save_honeypot(pool, &gid, &cfg).await;
                panel_update(ctx, comp, guild_id.get(), &cfg, &t, false).await;
                panel_followup(
                    ctx,
                    comp,
                    fb(
                        "honeypot_config_enable_success",
                        "Honeypot is now enabled in ${channel}.",
                    )
                    .replace("${channel}", &format!("<#{trap_n}>")),
                )
                .await;
            }
            None => {
                panel_ephemeral(
                    ctx,
                    comp,
                    fb(
                        "honeypot_config_generic_error",
                        "An error occurred while updating Honeypot.",
                    ),
                )
                .await;
            }
        }
    }
}

/// Config the message when user earn new xp level message!
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
    let mut prev_msg = if prev_msg.trim().is_empty() {
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

    // TS trap-select leg (`if (config.channelId !== nextChannelId)
    // config.messageId = undefined`): a changed trap channel invalidates
    // the stored lure message id (compared after auto-create so the final
    // id decides).
    if trap_change_resets_message(&prev_str("channelId"), &trap_id) {
        prev_msg = None;
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
    // Live 4-row panel: the reply stays interactive for 240s via the
    // `honeypot-config-*` arms in events_handler.rs (stateless collector
    // equivalent of the TS `createMessageComponentCollector`).
    ctx.send(
        poise::CreateReply::default()
            .embed(status)
            .components(build_panel_components(&t, enabling, &action, false)),
    )
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
    fn panel_expiry_matches_240s_collector() {
        assert!(!panel_expired(1000, 1000));
        assert!(!panel_expired(1000, 1000 + 239));
        assert!(panel_expired(1000, 1000 + 240));
        assert!(panel_expired(1000, 1000 + 10_000));
        // Clock skew never expires the panel.
        assert!(!panel_expired(2000, 1000));
    }

    #[test]
    fn trap_change_resets_message_id_like_ts() {
        assert!(!trap_change_resets_message("111", "111"));
        assert!(!trap_change_resets_message("", ""));
        assert!(!trap_change_resets_message(" 111 ", "111"));
        assert!(trap_change_resets_message("111", "222"));
        assert!(trap_change_resets_message("", "222"));
        assert!(trap_change_resets_message("111", ""));
    }

    #[test]
    fn panel_builds_four_rows_with_ts_ids() {
        let t = |k: &str| match k {
            "honeypot_config_button_enable" => "Enable Honeypot".to_string(),
            "honeypot_config_button_disable" => "Disable Honeypot".to_string(),
            v => v.to_string(),
        };
        let rows = build_panel_components(&t, false, "none", false);
        assert_eq!(rows.len(), 4);
        let dbg = format!("{rows:?}");
        for id in [
            HONEYPOT_TRAP_SELECT_ID,
            HONEYPOT_LOGS_SELECT_ID,
            HONEYPOT_ACTION_SELECT_ID,
            HONEYPOT_SEND_BUTTON_ID,
            HONEYPOT_PREVIEW_BUTTON_ID,
            HONEYPOT_TOGGLE_BUTTON_ID,
        ] {
            assert!(dbg.contains(id), "missing {id}");
        }
        assert!(dbg.contains("Enable Honeypot"));
        assert!(dbg.contains("Success"));
        // Action options carry the kick/ban/none values.
        assert!(dbg.contains("kick"));
        assert!(dbg.contains("ban"));
        assert!(dbg.contains("none"));
        // Enabled trap offers Disable in danger style.
        let rows_on = build_panel_components(&t, true, "ban", false);
        let dbg_on = format!("{rows_on:?}");
        assert!(dbg_on.contains("Disable Honeypot"));
        assert!(dbg_on.contains("Danger"));
        // Collector end leg: every row disabled.
        let rows_end = build_panel_components(&t, true, "ban", true);
        let dbg_end = format!("{rows_end:?}");
        assert!(dbg_end.contains("disabled: true"));
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
