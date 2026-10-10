use super::*;
use poise::serenity_prelude as serenity;

const SELECT_ID: &str = "mod-rolepanel-role-select";
const APPLY_ID: &str = "mod-rolepanel-apply-button";
/// Setup collectors live 240s each, like the TS `time: 240_000`.
const SETUP_TIMEOUT_SECS: u64 = 240;

/// Cached hierarchy/permissions snapshot for the setup validation.
struct Snap {
    bot_top: u16,
    author_top: u16,
    owner_id: u64,
    bot_perms: serenity::Permissions,
    author_perms: serenity::Permissions,
}

fn guild_perms(
    roles: &std::collections::HashMap<serenity::RoleId, serenity::Role>,
    ids: &[serenity::RoleId],
    guild_id: serenity::GuildId,
) -> serenity::Permissions {
    let mut perms = serenity::Permissions::empty();
    for id in ids {
        if let Some(role) = roles.get(id) {
            perms |= role.permissions;
        }
    }
    if let Some(everyone) = roles.get(&serenity::RoleId::new(guild_id.get())) {
        perms |= everyone.permissions;
    }
    if perms.administrator() {
        perms = serenity::Permissions::all();
    }
    perms
}

/// SCREAMING_SNAKE -> PascalCase, matching the discord.js permission
/// names used in the TS `rolepanel_role_missing_permissions` text
/// (e.g. MANAGE_ROLES -> ManageRoles).
fn pascal_perm_name(flag: &str) -> String {
    flag.split('_')
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => {
                    first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase()
                }
                None => String::new(),
            }
        })
        .collect()
}

/// Permissions the role grants that the author lacks, rendered like the
/// TS `` `ManageRoles`, `SendMessages` `` list.
fn missing_perm_names(
    role_perms: serenity::Permissions,
    author_perms: serenity::Permissions,
) -> Vec<String> {
    role_perms
        .iter_names()
        .filter(|(_, flag)| !author_perms.contains(*flag))
        .map(|(name, _)| format!("`{}`", pascal_perm_name(name)))
        .collect()
}

/// Refused-role reason. Mirrors getRefusedRoleReason in !rolepanel.ts,
/// including the missing-permissions check.
fn setup_refused_reason(
    role: &serenity::Role,
    guild_id: serenity::GuildId,
    snap: &Snap,
    author_id: u64,
    t: &impl Fn(&str) -> String,
) -> Option<String> {
    if role.id.get() == guild_id.get() || role.managed {
        return Some(t("rolepanel_role_managed_or_everyone"));
    }
    if snap.bot_top <= role.position {
        return Some(t("rolepanel_role_too_high_bot"));
    }
    if snap.owner_id != author_id && snap.author_top <= role.position {
        return Some(t("rolepanel_role_too_high_user"));
    }
    if !snap.author_perms.administrator() {
        let missing = missing_perm_names(role.permissions, snap.author_perms);
        if !missing.is_empty() {
            return Some(
                t("rolepanel_role_missing_permissions")
                    .replace("${permissions}", &missing.join(", ")),
            );
        }
    }
    None
}

/// Prefix self-words resolving to the author. Mirrors the
/// `["myself", "self", "me", "moi"]` check in resolveTargetMember
/// (!rolepanel.ts); compared lowercase like the TS
/// `args?.[0]?.toLowerCase()`.
fn is_self_word(s: &str) -> bool {
    matches!(s.to_lowercase().as_str(), "myself" | "self" | "me" | "moi")
}

/// Mention (`<@id>` / `<@!id>`) or raw id from the member arg.
fn parse_user_id_arg(s: &str) -> Option<serenity::UserId> {
    let t = s.trim();
    let inner = t
        .strip_prefix("<@")
        .and_then(|r| r.strip_suffix('>'))
        .map(|r| r.strip_prefix('!').unwrap_or(r))
        .unwrap_or(t);
    inner
        .parse::<u64>()
        .ok()
        .filter(|n| *n != 0)
        .map(serenity::UserId::new)
}

/// Audit-log reason stamped on role add/remove, mirroring the TS
/// `` `[RolePanel] Author: ${author.id}` `` reasons.
fn rolepanel_audit_reason(author_id: u64) -> String {
    format!("[RolePanel] Author: {author_id}")
}

/// Apply-result message. Mirrors buildApplyMessage in !rolepanel.ts.
fn build_apply_message(
    added: &[String],
    removed: &[String],
    refused: &[String],
    t: &impl Fn(&str) -> String,
) -> String {
    let mut lines = vec![];
    if !added.is_empty() {
        lines.push(t("rolepanel_apply_added").replace("${roles}", &added.join(", ")));
    }
    if !removed.is_empty() {
        lines.push(t("rolepanel_apply_removed").replace("${roles}", &removed.join(", ")));
    }
    if !refused.is_empty() {
        lines.push(t("rolepanel_apply_refused").replace("${roles}", &refused.join(", ")));
    }
    let out = lines.join("\n");
    if out.is_empty() {
        t("var_none")
    } else {
        out
    }
}

/// Interactive role setup: select roles, apply to a member.
#[poise::command(
    slash_command,
    prefix_command,
    category = "moderation",
    rename = "rolepanel",
    default_member_permissions = "MANAGE_ROLES"
)]
pub async fn mod_rolepanel(
    ctx: Ctx<'_>,
    #[description = "Member the panel is for (default yourself)"] member: Option<String>,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    let author_id = ctx.author().id.get();
    // Target member (TS resolveTargetMember): no arg or a self-word
    // (myself/self/me/moi) -> the author; a mention/id -> that member;
    // anything else -> ban_dont_found_member.
    let arg = member.as_deref().map(str::trim).unwrap_or("");
    let target = if arg.is_empty() || is_self_word(arg) {
        match ctx.author_member().await {
            Some(m) => m.into_owned(),
            None => return Ok(()),
        }
    } else {
        let found = match parse_user_id_arg(arg) {
            Some(id) => guild_id.member(ctx.http(), id).await.ok(),
            None => None,
        };
        match found {
            Some(m) => m,
            None => {
                ctx.say(t("ban_dont_found_member", "🔍 | Cannot find this member"))
                    .await?;
                return Ok(());
            }
        }
    };
    let target_id = target.user.id;
    let target_mention = format!("<@{target_id}>");
    let roles = guild_id.roles(ctx.http()).await.unwrap_or_default();
    let bot_id = ctx.serenity_context().cache.current_user().id;
    let bot_roles = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.members.get(&bot_id).map(|m| m.roles.clone()))
        .unwrap_or_default();
    let author_roles = ctx
        .author_member()
        .await
        .map(|m| m.roles.clone())
        .unwrap_or_default();
    let owner_id = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.owner_id.get())
        .unwrap_or(author_id);
    let snap = Snap {
        bot_top: top_of(&roles, &bot_roles),
        author_top: top_of(&roles, &author_roles),
        owner_id,
        bot_perms: guild_perms(&roles, &bot_roles, guild_id),
        author_perms: guild_perms(&roles, &author_roles, guild_id),
    };
    // TS collectors filter on the author id, so foreign presses are
    // silently ignored (banlist is the only list that replies).
    let none_word = t("var_none", "None");
    let tl = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Setup embed, mirroring the TS title/desc/roles-field/refused-field.
    let mk_setup_embed = |valid: &[serenity::Role], refused: &[String]| -> serenity::CreateEmbed {
        let mut embed = serenity::CreateEmbed::default()
            .title(t("rolepanel_setup_embed_title", "Role panel setup"))
            .description(
                t(
                    "rolepanel_setup_embed_desc",
                    "Select roles to add or remove from ${member}. If ${member} already has a selected role, it will be removed. Unauthorized roles will be ignored.",
                )
                .replace("${member}", &target_mention),
            )
            .colour(0x016C9A)
            .field(
                t("rolepanel_setup_embed_roles_field", "Allowed roles"),
                if valid.is_empty() {
                    none_word.clone()
                } else {
                    valid
                        .iter()
                        .map(|r| format!("<@&{}>", r.id.get()))
                        .collect::<Vec<_>>()
                        .join(", ")
                },
                false,
            );
        if !refused.is_empty() {
            embed = embed.field(
                t("rolepanel_setup_embed_refused_field", "Refused roles"),
                refused.join("\n").chars().take(1024).collect::<String>(),
                false,
            );
        }
        if let Some(url) = ctx
            .serenity_context()
            .cache
            .guild(guild_id)
            .and_then(|g| g.icon_url())
        {
            embed = embed.thumbnail(url);
        }
        embed
    };
    let menu = serenity::CreateSelectMenu::new(
        SELECT_ID,
        serenity::CreateSelectMenuKind::Role {
            default_roles: None,
        },
    )
    .placeholder(t(
        "rolepanel_setup_select_placeholder",
        "Select roles to offer",
    ))
    .min_values(1)
    .max_values(25);
    let mut apply = serenity::CreateButton::new(APPLY_ID).style(serenity::ButtonStyle::Success);
    if let Some((id, name, _)) = crate::emojis::cached_emoji_entry(ctx.http(), "Yes").await {
        apply = apply.emoji(serenity::ReactionType::Custom {
            animated: false,
            id: serenity::EmojiId::new(id),
            name: Some(name),
        });
    } else {
        apply = apply.emoji(serenity::ReactionType::Unicode("✅".to_string()));
    }
    let select_row = || serenity::CreateActionRow::SelectMenu(menu.clone());
    let button_row = |disabled: bool| {
        let mut b = apply.clone();
        if disabled {
            b = b.disabled(true);
        }
        serenity::CreateActionRow::Buttons(vec![b])
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_setup_embed(&[], &[]))
                .components(vec![select_row(), button_row(false)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let mut selected: Vec<serenity::Role> = vec![];
    // Single loop drives both collectors (role select + apply button),
    // author-gated like the TS filters.
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(SETUP_TIMEOUT_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id.get() != author_id {
            continue;
        }
        if press.data.custom_id == SELECT_ID {
            // TS replies `setjoinroles_var_perm_issue` when the bot
            // cannot manage roles.
            if !snap.bot_perms.manage_roles() {
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t(
                                    "setjoinroles_var_perm_issue",
                                    "I do not have permission to manage roles.",
                                ))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                continue;
            }
            let ids = match &press.data.kind {
                serenity::ComponentInteractionDataKind::RoleSelect { values } => values.clone(),
                _ => continue,
            };
            let mut valid = vec![];
            let mut refused = vec![];
            for rid in ids {
                let Some(role) = roles.get(&rid) else {
                    continue;
                };
                match setup_refused_reason(role, guild_id, &snap, author_id, &tl) {
                    Some(why) => refused.push(format!("<@&{}>: {why}", rid.get())),
                    None => valid.push(role.clone()),
                }
            }
            selected = valid.clone();
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new()
                            .embed(mk_setup_embed(&valid, &refused)),
                    ),
                )
                .await;
        } else if press.data.custom_id == APPLY_ID {
            if selected.is_empty() {
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t(
                                    "rolepanel_setup_no_roles",
                                    "No valid role has been selected.",
                                ))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                continue;
            }
            let mut added = vec![];
            let mut removed = vec![];
            let mut refused_apply = vec![];
            let audit_reason = rolepanel_audit_reason(author_id);
            for role in &selected {
                if let Some(why) = setup_refused_reason(role, guild_id, &snap, author_id, &tl) {
                    refused_apply.push(format!("<@&{}>: {why}", role.id.get()));
                    continue;
                }
                let has = guild_id
                    .member(ctx.http(), target_id)
                    .await
                    .map(|m| m.roles.contains(&role.id))
                    .unwrap_or(false);
                if has {
                    // TS awaits each add/remove with no .catch: the first
                    // failure aborts the apply (no result embed, no log).
                    ctx.http()
                        .remove_member_role(guild_id, target_id, role.id, Some(&audit_reason))
                        .await?;
                    removed.push(format!("<@&{}>", role.id.get()));
                } else {
                    ctx.http()
                        .add_member_role(guild_id, target_id, role.id, Some(&audit_reason))
                        .await?;
                    added.push(format!("<@&{}>", role.id.get()));
                }
            }
            let done = serenity::CreateEmbed::default()
                .title(t("rolepanel_setup_embed_title", "Role panel setup"))
                .description(build_apply_message(&added, &removed, &refused_apply, &tl))
                .colour(0x016C9A);
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::UpdateMessage(
                        serenity::CreateInteractionResponseMessage::new().embed(done),
                    ),
                )
                .await;
            if !added.is_empty() || !removed.is_empty() {
                post_mod_log(
                    ctx.http(),
                    guild_id,
                    t("rolepanel_logs_embed_title_apply", "Role panel usage logs"),
                    t(
                        "rolepanel_logs_embed_desc_apply",
                        "<@${interaction.user.id}> changed roles for <@${member.id}> through a panel. Added: ${addedRoles} | Removed: ${removedRoles}",
                    )
                    .replace("${interaction.user.id}", &author_id.to_string())
                    .replace("${member.id}", &target_id.get().to_string())
                    .replace(
                        "${addedRoles}",
                        &(if added.is_empty() {
                            none_word.clone()
                        } else {
                            added.join(", ")
                        }),
                    )
                    .replace(
                        "${removedRoles}",
                        &(if removed.is_empty() {
                            none_word.clone()
                        } else {
                            removed.join(", ")
                        }),
                    ),
                )
                .await;
            }
            break;
        }
    }
    // TS `end` handler disables both rows.
    let mut dead_select = menu.clone();
    dead_select = dead_select.disabled(true);
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![
                serenity::CreateActionRow::SelectMenu(dead_select),
                button_row(true),
            ]),
        )
        .await;
    Ok(())
}

/// Component handler: toggle the role encoded in the button custom_id.
/// Called from events_handler.rs `interaction_create` when
/// `custom_id.starts_with("rolepanel:")`. Kept for panels posted by the
/// previous channel-targeted version of this command.
pub async fn handle_rolepanel_button(
    ctx: &serenity::Context,
    comp: &serenity::ComponentInteraction,
) -> anyhow::Result<()> {
    let Some(guild_id) = comp.guild_id else {
        return Ok(());
    };
    let Some(role_id) = parse_rolepanel_custom_id(&comp.data.custom_id) else {
        return Ok(());
    };
    // No pool in a component ctx: resolve the lang code from the
    // interaction locales (guild first, like the per-guild language).
    let code = pick_button_lang_code(comp.guild_locale.as_deref(), &comp.locale);
    // Validate the role before toggling (managed/everyone + bot hierarchy).
    let roles = guild_id.roles(&ctx.http).await.unwrap_or_default();
    let Some(role) = roles.get(&role_id) else {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(button_role_not_found(code))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    };
    let bot_id = ctx.cache.current_user().id;
    let bot_top = guild_id
        .member(&ctx.http, bot_id)
        .await
        .ok()
        .map(|m| top_of(&roles, &m.roles))
        .unwrap_or(u16::MAX);
    if role.id.get() == guild_id.get() || role.managed || bot_top <= role.position {
        comp.create_response(
            &ctx.http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(button_refused(code, &format!("<@&{}>", role.id.get())))
                    .ephemeral(true),
            ),
        )
        .await?;
        return Ok(());
    }
    let member = guild_id.member(&ctx.http, comp.user.id).await?;
    let has = member.roles.contains(&role_id);
    let audit_reason = rolepanel_audit_reason(comp.user.id.get());
    if has {
        ctx.http
            .remove_member_role(guild_id, comp.user.id, role_id, Some(&audit_reason))
            .await?;
    } else {
        ctx.http
            .add_member_role(guild_id, comp.user.id, role_id, Some(&audit_reason))
            .await?;
    }
    comp.create_response(
        &ctx.http,
        serenity::CreateInteractionResponse::Message(
            serenity::CreateInteractionResponseMessage::new()
                .content(button_toggled(code, has, &format!("<@&{}>", role_id.get())))
                .ephemeral(true),
        ),
    )
    .await?;
    Ok(())
}

/// Lang code for the button handler: guild locale first (mirrors the
/// per-guild language), then the invoking user's locale.
fn pick_button_lang_code(guild_locale: Option<&str>, user_locale: &str) -> &'static str {
    guild_locale
        .map(crate::lang::locale_lang_code)
        .unwrap_or_else(|| crate::lang::locale_lang_code(user_locale))
}

/// `addrolereact_role_not_found` reply (exact en-US fallback).
fn button_role_not_found(code: &str) -> String {
    crate::lang::get(code, "addrolereact_role_not_found")
        .unwrap_or_else(|| "Role not found.".to_string())
}

/// `rolepanel_apply_refused` reply (exact en-US fallback).
fn button_refused(code: &str, role_mention: &str) -> String {
    crate::lang::get(code, "rolepanel_apply_refused")
        .map(|s| s.replace("${roles}", role_mention))
        .unwrap_or_else(|| format!("Roles refused: {role_mention}"))
}

/// `rolepanel_apply_removed` / `rolepanel_apply_added` toggle reply
/// (exact en-US fallbacks).
fn button_toggled(code: &str, had_role: bool, role_mention: &str) -> String {
    let key = if had_role {
        "rolepanel_apply_removed"
    } else {
        "rolepanel_apply_added"
    };
    crate::lang::get(code, key)
        .map(|s| s.replace("${roles}", role_mention))
        .unwrap_or_else(|| {
            if had_role {
                format!("Roles removed: {role_mention}")
            } else {
                format!("Roles added: {role_mention}")
            }
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn self_words_resolve_to_author() {
        for w in ["myself", "self", "me", "moi", "ME", "Moi", " me "] {
            assert!(is_self_word(w.trim()), "self word: {w}");
        }
        assert!(!is_self_word(""));
        assert!(!is_self_word("<@123>"));
        assert!(!is_self_word("someone"));
    }

    #[test]
    fn member_arg_parses_mention_or_id() {
        assert_eq!(
            parse_user_id_arg("<@123>"),
            Some(serenity::UserId::new(123))
        );
        assert_eq!(
            parse_user_id_arg("<@!123>"),
            Some(serenity::UserId::new(123))
        );
        assert_eq!(parse_user_id_arg("123"), Some(serenity::UserId::new(123)));
        assert_eq!(
            parse_user_id_arg("  123  "),
            Some(serenity::UserId::new(123))
        );
        assert_eq!(parse_user_id_arg("me"), None);
        assert_eq!(parse_user_id_arg("0"), None);
        assert_eq!(parse_user_id_arg("abc"), None);
    }

    #[test]
    fn button_lang_prefers_guild_locale() {
        assert_eq!(pick_button_lang_code(Some("fr"), "en-US"), "fr-FR");
        assert_eq!(pick_button_lang_code(None, "en-US"), "en-US");
    }

    #[test]
    fn button_replies_use_lang_templates() {
        assert_eq!(button_refused("en-US", "<@&1>"), "Roles refused: <@&1>");
        assert_eq!(
            button_toggled("en-US", true, "<@&1>"),
            "Roles removed: <@&1>"
        );
        assert_eq!(
            button_toggled("en-US", false, "<@&1>"),
            "Roles added: <@&1>"
        );
        assert_eq!(button_role_not_found("en-US"), "Role not found.");
    }

    #[test]
    fn en_us_rolepanel_button_keys_exist() {
        for key in [
            "addrolereact_role_not_found",
            "rolepanel_apply_added",
            "rolepanel_apply_removed",
            "rolepanel_apply_refused",
        ] {
            assert!(
                crate::lang::get("en-US", key).is_some(),
                "missing en-US key: {key}"
            );
        }
    }

    #[test]
    fn audit_reason_matches_ts() {
        assert_eq!(
            rolepanel_audit_reason(123),
            "[RolePanel] Author: 123".to_string()
        );
    }

    #[test]
    fn pascal_perm_names() {
        assert_eq!(pascal_perm_name("MANAGE_ROLES"), "ManageRoles");
        assert_eq!(pascal_perm_name("SEND_MESSAGES"), "SendMessages");
        assert_eq!(pascal_perm_name("ADMINISTRATOR"), "Administrator");
        assert_eq!(pascal_perm_name("VIEW_CHANNEL"), "ViewChannel");
    }

    #[test]
    fn apply_message_lines() {
        let t = |k: &str| match k {
            "rolepanel_apply_added" => "Roles added: ${roles}".to_string(),
            "rolepanel_apply_removed" => "Roles removed: ${roles}".to_string(),
            "rolepanel_apply_refused" => "Roles refused: ${roles}".to_string(),
            _ => "None".to_string(),
        };
        let out = build_apply_message(
            &["<@&1>".to_string()],
            &["<@&2>".to_string()],
            &["<@&3>".to_string()],
            &t,
        );
        assert!(out.contains("Roles added: <@&1>"));
        assert!(out.contains("Roles removed: <@&2>"));
        assert!(out.contains("Roles refused: <@&3>"));
        assert_eq!(build_apply_message(&[], &[], &[], &t), "None".to_string());
    }

    #[test]
    fn missing_perm_render() {
        let missing = missing_perm_names(
            serenity::Permissions::MANAGE_ROLES | serenity::Permissions::SEND_MESSAGES,
            serenity::Permissions::SEND_MESSAGES,
        );
        assert_eq!(missing, vec!["`ManageRoles`".to_string()]);
        assert!(missing_perm_names(
            serenity::Permissions::SEND_MESSAGES,
            serenity::Permissions::SEND_MESSAGES,
        )
        .is_empty());
    }
}
