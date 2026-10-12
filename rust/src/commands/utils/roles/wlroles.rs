use super::*;
use poise::serenity_prelude as serenity;

// Interactive whitelist-roles panel. Mirrors !wlroles.ts exactly: the
// TS subcommand takes NO options — it posts the config embed with a
// role multi-select (customId `utils-wlRoles-role-selecter`, min 0 /
// max 25, current list pre-selected) plus a save button (customId
// `utils-wlRoles-save-button`), and drives everything through 240s
// collectors. Selecting replaces the pending list (empty clears it);
// save writes the whole array. The invented `wlroles-add` (flat Role
// param) / `wlroles-list` leaves have no TS basis; they now delegate
// to this panel (see wlroles_add.rs / wlroles_list.rs).
pub const WLROLES_SELECT_ID: &str = "utils-wlRoles-role-selecter";
pub const WLROLES_SAVE_ID: &str = "utils-wlRoles-save-button";
const DANGER_YES_ID: &str = "dangerous_roles_confirm_yes";
const DANGER_NO_ID: &str = "dangerous_roles_confirm_no";
const CHOICE_TIMEOUT_ID: &str = "utils-wlRoles-choice-timeOut";
const PANEL_TIMEOUT_SECS: u64 = 240;
const DANGER_TIMEOUT_SECS: u64 = 20;

/// Dangerous-permission flag checks. Mirrors
/// `getDangerousPermissions` (`method.ts`): each entry pairs a
/// serenity permission bit with its `setjoinroles_var_perm_*` lang key.
pub fn dangerous_perm_keys() -> Vec<(poise::serenity_prelude::Permissions, &'static str)> {
    use poise::serenity_prelude::Permissions as P;
    vec![
        (P::ADMINISTRATOR, "setjoinroles_var_perm_admin"),
        (P::MANAGE_GUILD, "setjoinroles_var_perm_manage_guild"),
        (P::MANAGE_ROLES, "setjoinroles_var_perm_manage_role"),
        (P::MENTION_EVERYONE, "setjoinroles_var_perm_use_mention"),
        (P::BAN_MEMBERS, "setjoinroles_var_perm_ban_members"),
        (P::KICK_MEMBERS, "setjoinroles_var_perm_kick_members"),
        (P::MANAGE_WEBHOOKS, "setjoinroles_var_perm_manage_webhooks"),
        (P::MANAGE_CHANNELS, "setjoinroles_var_perm_manage_channels"),
        (
            P::MANAGE_GUILD_EXPRESSIONS,
            "setjoinroles_var_perm_manage_expression",
        ),
        (
            P::VIEW_CREATOR_MONETIZATION_ANALYTICS,
            "setjoinroles_var_perm_view_monetization_analytics",
        ),
    ]
}

/// Lang keys of the dangerous permissions held by `perms`.
/// Mirrors the `roleDangerousPermissions` loop in !wlroles.ts.
pub fn role_danger_keys(perms: poise::serenity_prelude::Permissions) -> Vec<&'static str> {
    dangerous_perm_keys()
        .into_iter()
        .filter(|(flag, _)| perms.contains(*flag))
        .map(|(_, key)| key)
        .collect()
}

/// Bot permission union + highest role position from the guild cache.
/// Mirrors the derogation.rs snapshot; `None` when uncached.
fn bot_snapshot(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
) -> Option<(poise::serenity_prelude::Permissions, u16)> {
    let bot_id = ctx.serenity_context().cache.current_user().id;
    let guild = ctx.serenity_context().cache.guild(guild_id)?;
    let member = guild.members.get(&bot_id)?.clone();
    let mut perms = poise::serenity_prelude::Permissions::empty();
    let mut top = 0u16;
    for r in &member.roles {
        if let Some(role) = guild.roles.get(r) {
            perms |= role.permissions;
            top = top.max(role.position);
        }
    }
    Some((perms, top))
}

/// Cached role view needed by the select leg (name / position /
/// permissions for the danger + hierarchy guards).
fn cached_role(
    ctx: &Ctx<'_>,
    guild_id: poise::serenity_prelude::GuildId,
    role_id: poise::serenity_prelude::RoleId,
) -> Option<(String, u16, poise::serenity_prelude::Permissions)> {
    let guild = ctx.serenity_context().cache.guild(guild_id)?;
    let role = guild.roles.get(&role_id)?;
    Some((role.name.clone(), role.position, role.permissions))
}

/// Post the wlroles audit embed to the `ihorizon-logs` channel.
/// Mirrors `client.func.ihorizon_logs` via
/// `crate::funcs::logs_channel_id`; silent when absent.
async fn post_wlroles_log(ctx: &Ctx<'_>, guild_id: poise::serenity_prelude::GuildId, code: &str) {
    use poise::serenity_prelude as serenity;
    let Ok(channels) = guild_id.channels(ctx.http()).await else {
        return;
    };
    let list: Vec<(u64, String)> = channels
        .iter()
        .map(|(id, c)| (id.get(), c.name.clone()))
        .collect();
    let Some(log_id) = crate::funcs::logs_channel_id(&list) else {
        return;
    };
    let title = crate::lang::get(code, "utils_wlRoles_logsEmbed_title")
        .unwrap_or_else(|| "Whitelist Roles Modules".to_string());
    let desc = crate::lang::get(code, "utils_wlRoles_logsEmbed_desc")
        .map(|s| {
            s.replace(
                "${interaction.member?.user.toString()}",
                &format!("<@{}>", ctx.author().id.get()),
            )
        })
        .unwrap_or_else(|| format!("<@{}> has edited wlRoles", ctx.author().id.get()));
    let embed = serenity::CreateEmbed::default()
        .title(title)
        .description(desc);
    let _ = serenity::ChannelId::new(log_id)
        .send_message(ctx.http(), serenity::CreateMessage::new().embed(embed))
        .await;
}

/// Define allowed roles for addrole & delrole command
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "wlroles",
    aliases("wlrole"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Définir les rôles autorisés pour les commandes addrole et delrole"
    ),
    description_localized("ja", "addrole と delrole コマンドの許可ロールを定義"),
    description_localized("ru", "Определить разрешенные роли для команд addrole и delrole"),
    description_localized(
        "es-ES",
        "Definir roles permitidos para los comandos addrole y delrole"
    )
)]
// Option-less panel, mirroring the TS subcommand (no `options:` in
// utils.ts): embed + role-select + save button, all state through
// the collectors below.
pub async fn wlroles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    run_wlroles_panel(&ctx).await
}

/// Run the wlroles interactive panel. Shared by `wlroles` and the
/// legacy `wlroles-add` / `wlroles-list` leaves (which have no TS
/// basis as separate subcommands).
pub async fn run_wlroles_panel(ctx: &Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let gid = guild_id.get().to_string();
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let not_for_you = t("help_not_for_you");

    // TS: db value or []; a lone non-array value wraps to one element.
    let raw = crate::commands::owner::main::routed_get(pool, &gid, &gid, "UTILS.wlRoles").await;
    let mut pending: Vec<String> = raw
        .and_then(|s| {
            serde_json::from_str::<serde_json::Value>(&s)
                .ok()
                .map(|v| match v {
                    serde_json::Value::Array(a) => a
                        .into_iter()
                        .filter_map(|x| {
                            x.as_str()
                                .map(|s| s.to_string())
                                .or_else(|| x.as_u64().map(|n| n.to_string()))
                        })
                        .collect(),
                    serde_json::Value::String(s) => vec![s],
                    _ => vec![],
                })
        })
        .unwrap_or_default();

    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(render_wlroles_embed(&t, &pending))
                .components(panel_rows(&t, &pending, false)),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let http = ctx.http();
    let author = ctx.author().id;
    // Roles confirmed through the dangerous-permission dialog; like
    // the TS `confirmedDangerousRoles` set they skip re-prompting.
    let mut confirmed_dangerous: std::collections::HashSet<String> =
        std::collections::HashSet::new();
    // Roles already warned as too high; like the TS
    // `tooHighterRoles` set they warn only once.
    let mut warned_high: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut saved = false;
    let deadline = tokio::time::Instant::now() + std::time::Duration::from_secs(PANEL_TIMEOUT_SECS);
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let Some(press) = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(remaining)
            .await
        else {
            break;
        };
        if press.user.id != author {
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        let id = press.data.custom_id.clone();
        if id == WLROLES_SELECT_ID {
            // Mirrors the select leg: pending takes the full
            // selection (empty clears), then the guard chain.
            if let serenity::ComponentInteractionDataKind::RoleSelect { values } = &press.data.kind
            {
                pending = values.iter().map(|r| r.get().to_string()).collect();
            }
            // Bot must hold ManageRoles, like the TS handler gate.
            let (bot_perms, bot_top) = bot_snapshot(ctx, guild_id).unwrap_or_default();
            if !bot_perms.manage_roles() {
                let _ = press
                    .create_response(
                        http,
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(if t("setjoinroles_var_perm_issue").is_empty() {
                                    "I do not have permission to manage roles.".to_string()
                                } else {
                                    t("setjoinroles_var_perm_issue")
                                })
                                .ephemeral(true),
                        ),
                    )
                    .await;
                continue;
            }
            // Per-role guard scan, mirroring the TS loop: danger
            // names via getDangerousPermissions, hierarchy vs the
            // bot's highest role.
            let mut dangerous: Vec<(String, String, Vec<String>)> = vec![];
            let mut too_high: Vec<(String, String, u16)> = vec![];
            for role_id in pending.clone() {
                let Ok(num) = role_id.parse::<u64>() else {
                    continue;
                };
                let Some((name, position, perms)) =
                    cached_role(ctx, guild_id, serenity::RoleId::new(num))
                else {
                    continue;
                };
                let keys = role_danger_keys(perms);
                if !keys.is_empty() && !confirmed_dangerous.contains(&role_id) {
                    let names: Vec<String> = keys
                        .iter()
                        .map(|k| {
                            crate::lang::get(&code, k)
                                .filter(|s| !s.is_empty())
                                .unwrap_or_else(|| k.to_string())
                        })
                        .collect();
                    dangerous.push((role_id.clone(), name.clone(), names));
                }
                if bot_top as i32 <= position as i32 && !warned_high.contains(&role_id) {
                    too_high.push((role_id, name.clone(), position));
                }
            }
            if !dangerous.is_empty() {
                handle_dangerous_confirm(ctx, &press, &dangerous, &mut confirmed_dangerous, &t)
                    .await;
                let _ = msg
                    .edit(
                        http,
                        serenity::EditMessage::new()
                            .embeds(vec![render_wlroles_embed(&t, &pending)]),
                    )
                    .await;
            } else if !too_high.is_empty() {
                for (role_id, _, _) in &too_high {
                    warned_high.insert(role_id.clone());
                }
                handle_too_high(ctx, &press, &too_high, &t).await;
            } else {
                let _ = press
                    .create_response(
                        http,
                        serenity::CreateInteractionResponse::Defer(
                            serenity::CreateInteractionResponseMessage::new(),
                        ),
                    )
                    .await;
                let _ = msg
                    .edit(
                        http,
                        serenity::EditMessage::new()
                            .embeds(vec![render_wlroles_embed(&t, &pending)]),
                    )
                    .await;
            }
        } else if id == WLROLES_SAVE_ID {
            // Mirrors the save leg: persist the pending array, ack by
            // turning the save button green, audit-log, stop.
            let _ = press
                .create_response(
                    http,
                    serenity::CreateInteractionResponse::Defer(
                        serenity::CreateInteractionResponseMessage::new(),
                    ),
                )
                .await;
            crate::commands::owner::main::routed_set(
                pool,
                &gid,
                &gid,
                "UTILS.wlRoles",
                &serde_json::to_string(&pending)?,
            )
            .await?;
            saved = true;
            post_wlroles_log(ctx, guild_id, &code).await;
            break;
        }
    }
    // Collector `end` leg: disable the rows like TS (after a save the
    // button keeps its green confirmed style).
    let _ = msg
        .edit(
            http,
            serenity::EditMessage::new().components(panel_rows(&t, &pending, saved)),
        )
        .await;
    Ok(())
}

/// Mirrors `handleDangerousRolesConfirmation`: ephemeral warn embed
/// with Yes/No, 20s to answer. Yes marks the roles confirmed;
/// No shows the canceled label; timeout shows the times-up label.
async fn handle_dangerous_confirm(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    dangerous: &[(String, String, Vec<String>)],
    confirmed: &mut std::collections::HashSet<String>,
    t: &impl Fn(&str) -> String,
) {
    let http = ctx.http();
    let mut warn = serenity::CreateEmbed::default()
        .title(t("setjoinroles_warn_title"))
        .description(t("setjoinroles_warn_dangerous_perm"));
    for (_, name, perm_names) in dangerous {
        warn = warn.field(
            format!("@{name}"),
            perm_names
                .iter()
                .map(|p| format!("`{p}`"))
                .collect::<Vec<_>>()
                .join(", "),
            false,
        );
    }
    let row = || {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(DANGER_YES_ID)
                .label(t("var_yes"))
                .style(serenity::ButtonStyle::Danger),
            serenity::CreateButton::new(DANGER_NO_ID)
                .label(t("var_no"))
                .style(serenity::ButtonStyle::Secondary),
        ])
    };
    if press
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(warn)
                    .components(vec![row()])
                    .ephemeral(true),
            ),
        )
        .await
        .is_err()
    {
        return;
    }
    let Ok(mut warn_msg) = press.get_response(http).await else {
        return;
    };
    let answer = warn_msg
        .await_component_interaction(ctx.serenity_context().shard.clone())
        .timeout(std::time::Duration::from_secs(DANGER_TIMEOUT_SECS))
        .await;
    let Some(answer) = answer else {
        // Timeout: disabled `setjoinroles_timesup_button` label.
        let done = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
            CHOICE_TIMEOUT_ID,
        )
        .label(t("setjoinroles_timesup_button"))
        .style(serenity::ButtonStyle::Secondary)
        .disabled(true)]);
        let _ = warn_msg
            .edit(http, serenity::EditMessage::new().components(vec![done]))
            .await;
        return;
    };
    if answer.data.custom_id.as_str() == DANGER_YES_ID {
        for (role_id, _, _) in dangerous {
            confirmed.insert(role_id.clone());
        }
        let done = serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new(DANGER_YES_ID)
                .label(t("var_yes"))
                .style(serenity::ButtonStyle::Danger)
                .disabled(true),
            serenity::CreateButton::new(DANGER_NO_ID)
                .label(t("var_no"))
                .style(serenity::ButtonStyle::Secondary)
                .disabled(true),
        ]);
        let _ = answer
            .create_response(
                http,
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new().components(vec![done]),
                ),
            )
            .await;
    } else {
        // `setjoinroles_action_canceled` label, like the TS No path.
        let canceled = serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(
            CHOICE_TIMEOUT_ID,
        )
        .label(t("setjoinroles_action_canceled"))
        .style(serenity::ButtonStyle::Secondary)
        .disabled(true)]);
        let _ = answer
            .create_response(
                http,
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new().components(vec![canceled]),
                ),
            )
            .await;
    }
}

/// Mirrors `handleTooHighterRoles`: ephemeral warn embed listing the
/// roles above the bot (no panel update, like TS).
async fn handle_too_high(
    ctx: &Ctx<'_>,
    press: &serenity::ComponentInteraction,
    too_high: &[(String, String, u16)],
    t: &impl Fn(&str) -> String,
) {
    let http = ctx.http();
    let bot_top = ctx
        .guild_id()
        .and_then(|g| bot_snapshot(ctx, g).map(|(_, top)| top))
        .unwrap_or(0);
    let mut embed = serenity::CreateEmbed::default()
        .title(t("setjoinroles_warn_title"))
        .description(t("setjoinroles_too_highter_roles"));
    for (role_id, name, position) in too_high {
        embed = embed.field(
            format!("@{name} ({role_id})"),
            format!("<@&{role_id}>: `{position}` vs bot: `{bot_top}`"),
            false,
        );
    }
    let _ = press
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .ephemeral(true),
            ),
        )
        .await;
}

/// Panel embed. Mirrors !wlroles.ts: `#475387`, title + desc keys,
/// single field of `<@&id>` mentions with the none fallback.
fn render_wlroles_embed(t: &impl Fn(&str) -> String, pending: &[String]) -> serenity::CreateEmbed {
    serenity::CreateEmbed::default()
        .title(t("utils_wlroles_embed_title"))
        .colour(0x475387_u32)
        .description(t("utils_wlroles_embed_desc"))
        .field(
            t("setjoinroles_help_embed_fields_1_name"),
            wlroles_field(pending, &t("setjoinroles_var_none")),
            false,
        )
}

/// Panel rows: role multi-select (min 0 / max 25, current list as
/// defaults) + save button (💾 Primary; green Yes-check when saved).
fn panel_rows(
    t: &impl Fn(&str) -> String,
    pending: &[String],
    saved: bool,
) -> Vec<serenity::CreateActionRow> {
    let _ = t;
    let defaults: Vec<serenity::RoleId> = pending
        .iter()
        .filter_map(|r| r.parse::<u64>().ok().map(serenity::RoleId::new))
        .collect();
    let menu = serenity::CreateSelectMenu::new(
        WLROLES_SELECT_ID,
        serenity::CreateSelectMenuKind::Role {
            default_roles: (!defaults.is_empty()).then_some(defaults),
        },
    )
    .min_values(0)
    .max_values(25);
    let mut save = serenity::CreateButton::new(WLROLES_SAVE_ID)
        .style(serenity::ButtonStyle::Primary)
        .emoji('💾');
    if saved {
        save = serenity::CreateButton::new(WLROLES_SAVE_ID)
            .style(serenity::ButtonStyle::Success)
            .emoji('✅')
            .disabled(true);
    }
    vec![
        serenity::CreateActionRow::SelectMenu(menu),
        serenity::CreateActionRow::Buttons(vec![save]),
    ]
}

/// Render the wlroles setup-panel field. Mirrors the !wlroles.ts embed
/// field (`<@&id>` joins, `setjoinroles_var_none` fallback).
pub fn wlroles_field(role_ids: &[String], none: &str) -> String {
    if role_ids.is_empty() {
        none.to_string()
    } else {
        role_ids
            .iter()
            .map(|id| format!("<@&{id}>"))
            .collect::<Vec<_>>()
            .join(", ")
    }
}

#[cfg(test)]
mod tests {
    use super::wlroles_field;
    use super::{dangerous_perm_keys, role_danger_keys};
    use super::{
        CHOICE_TIMEOUT_ID, DANGER_NO_ID, DANGER_YES_ID, WLROLES_SAVE_ID, WLROLES_SELECT_ID,
    };
    use crate::commands::owner::main as routed;

    async fn memory_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[tokio::test]
    async fn wlroles_table_routing_with_legacy_fallback() {
        let pool = memory_pool().await;
        routed::routed_set(&pool, "g", "g", "UTILS.wlRoles", r#"["7"]"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "UTILS.wlRoles")
                .await
                .as_deref(),
            Some(r#"["7"]"#)
        );
        // Legacy-only row still reads.
        crate::db::kv_set(&pool, "h", "UTILS.wlRoles", r#"["9"]"#)
            .await
            .unwrap();
        assert_eq!(
            routed::routed_get(&pool, "h", "h", "UTILS.wlRoles")
                .await
                .as_deref(),
            Some(r#"["9"]"#)
        );
        // Delete clears both stores.
        assert!(routed::routed_del(&pool, "g", "g", "UTILS.wlRoles")
            .await
            .unwrap());
        assert_eq!(
            routed::routed_get(&pool, "g", "g", "UTILS.wlRoles").await,
            None
        );
    }

    #[test]
    fn field_mentions_roles_or_none() {
        assert_eq!(wlroles_field(&[], "None"), "None");
        assert_eq!(
            wlroles_field(&["7".to_string(), "8".to_string()], "None"),
            "<@&7>, <@&8>"
        );
    }

    #[test]
    fn danger_keys_mirror_get_dangerous_permissions() {
        use poise::serenity_prelude::Permissions as P;
        // Ten flags, mirroring the method.ts table order.
        let keys = dangerous_perm_keys();
        assert_eq!(keys.len(), 10);
        assert_eq!(
            keys.iter().map(|(_, k)| *k).collect::<Vec<_>>(),
            vec![
                "setjoinroles_var_perm_admin",
                "setjoinroles_var_perm_manage_guild",
                "setjoinroles_var_perm_manage_role",
                "setjoinroles_var_perm_use_mention",
                "setjoinroles_var_perm_ban_members",
                "setjoinroles_var_perm_kick_members",
                "setjoinroles_var_perm_manage_webhooks",
                "setjoinroles_var_perm_manage_channels",
                "setjoinroles_var_perm_manage_expression",
                "setjoinroles_var_perm_view_monetization_analytics",
            ]
        );
        // Admin-only role flags just admin; empty role flags nothing.
        assert_eq!(
            role_danger_keys(P::ADMINISTRATOR),
            vec!["setjoinroles_var_perm_admin"]
        );
        assert!(role_danger_keys(P::empty()).is_empty());
        assert!(role_danger_keys(P::SEND_MESSAGES).is_empty());
        assert_eq!(
            role_danger_keys(P::MANAGE_GUILD_EXPRESSIONS),
            vec!["setjoinroles_var_perm_manage_expression"]
        );
    }

    #[test]
    fn panel_custom_ids_are_ts_byte_exact() {
        // CustomIds copied byte-for-byte from !wlroles.ts (note the
        // `selecter` spelling and the `wlRoles` casing).
        assert_eq!(WLROLES_SELECT_ID, "utils-wlRoles-role-selecter");
        assert_eq!(WLROLES_SAVE_ID, "utils-wlRoles-save-button");
        assert_eq!(DANGER_YES_ID, "dangerous_roles_confirm_yes");
        assert_eq!(DANGER_NO_ID, "dangerous_roles_confirm_no");
        assert_eq!(CHOICE_TIMEOUT_ID, "utils-wlRoles-choice-timeOut");
    }
}
