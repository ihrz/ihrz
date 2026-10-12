use super::*;
use poise::serenity_prelude as serenity;

/// Rank-role load with legacy key/shape fallback: the new TS map key
/// (`GUILD.XP_LEVELING.ranksRoles`) wins, the legacy vec key
/// (`GUILD.RANKS.roles`) reads back and promotes into the map shape.
/// A legacy hit promotes into the new key so rows migrate lazily; pair
/// with `save_rank_roles_routed` (dual-write) so kv-only readers stay fresh.
pub async fn load_rank_roles_routed(pool: &crate::db::Pool, guild_id: &str) -> Vec<RankRole> {
    use crate::commands::owner::main::{routed_get, routed_set};
    if let Some(raw) = routed_get(pool, guild_id, guild_id, super::GUILD_ROLES_NEW).await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            let roles = super::rank_roles_from_value(&v);
            // Normalize legacy-shaped rows parked under the new key.
            if !matches!(v, serde_json::Value::Object(_)) && !roles.is_empty() {
                let _ = routed_set(
                    pool,
                    guild_id,
                    guild_id,
                    super::GUILD_ROLES_NEW,
                    &serde_json::to_string(&super::rank_roles_to_map(&roles)).unwrap_or_default(),
                )
                .await;
            }
            if !roles.is_empty() || matches!(v, serde_json::Value::Object(_)) {
                return roles;
            }
        }
    }
    if let Some(raw) = routed_get(pool, guild_id, guild_id, super::GUILD_ROLES_OLD).await {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
            let roles = super::rank_roles_from_value(&v);
            if !roles.is_empty() {
                let _ = routed_set(
                    pool,
                    guild_id,
                    guild_id,
                    super::GUILD_ROLES_NEW,
                    &serde_json::to_string(&super::rank_roles_to_map(&roles)).unwrap_or_default(),
                )
                .await;
                return roles;
            }
        }
    }
    Vec::new()
}

/// Rank-role store: TS map shape on the new key, legacy vec shape on
/// the old key, so both readers stay fresh while rows migrate.
pub async fn save_rank_roles_routed(
    pool: &crate::db::Pool,
    guild_id: &str,
    roles: &[RankRole],
) -> anyhow::Result<()> {
    use crate::commands::owner::main::routed_set;
    routed_set(
        pool,
        guild_id,
        guild_id,
        super::GUILD_ROLES_NEW,
        &serde_json::to_string(&super::rank_roles_to_map(roles))?,
    )
    .await?;
    routed_set(
        pool,
        guild_id,
        guild_id,
        super::GUILD_ROLES_OLD,
        &serde_json::to_string(roles)?,
    )
    .await
}

/// Descending level order for the role-list embed. Mirrors the TS
/// `!roles.ts:84` sort (`parseInt(levelB) - parseInt(levelA)`); the
/// caller slices 5 rows per page (`itemsPerPage`).
pub fn sort_rank_roles_desc(roles: &mut [RankRole]) {
    roles.sort_by_key(|r| std::cmp::Reverse(r.level));
}

/// Pure embed-field text for one rank role. Mirrors `!roles.ts:104-114`:
/// the field name is `ranks_config_autofields_name` with `${level}`, the
/// value is `ranks_config_autofields_value` with `${level}` + `${roleId}`.
pub fn rank_role_field_text(name_tpl: &str, value_tpl: &str, role: &RankRole) -> (String, String) {
    (
        name_tpl.replace("${level}", &role.level.to_string()),
        value_tpl
            .replace("${level}", &role.level.to_string())
            .replace("${roleId}", &role.role_id),
    )
}

/// Component/modal ids for the add/remove flows. Namespaced so the
/// panel loop can filter on the `rk-roles-` prefix.
pub const ADD_BUTTON_ID: &str = "rk-roles-add";
pub const REMOVE_BUTTON_ID: &str = "rk-roles-remove";
pub const RETURN_BUTTON_ID: &str = "rk-roles-return";
pub const ADD_SELECT_ID: &str = "rk-roles-add-select";
pub const REMOVE_SELECT_ID: &str = "rk-roles-remove-select";
pub const LEVEL_MODAL_ID: &str = "rk-roles-level-modal";
pub const LEVEL_FIELD_ID: &str = "rk-roles-level-input";

/// Sub-flow wait. Mirrors the TS `awaitMessageComponent({ time: 600_000 })`
/// legs; capped at 180s to match the panel collector so a stalled menu
/// restores the panel instead of outliving it.
pub const FLOW_WAIT_SECS: u64 = 180;

/// Rank roles panel (`roles`).
// TS `ranks.ts:44-61` + `!roles.ts`: the single `roles` sub —
// Administrator-gated panel showing the rank roles as embed fields
// (highest level first, 5 per page like `!roles.ts:79-133`), with
// prev/next paging plus the add flow (`!roles.ts:227-371`: role select,
// 4-char level modal, 25-role cap, duplicate check, dangerous-permission
// warn follow-up) and the remove flow (`!roles.ts:374-464`: level select
// menu). No slash subs — everything runs inside the panel collector.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "roles",
    aliases("rroles", "ranks-roles"),
    default_member_permissions = "ADMINISTRATOR",
    description_localized(
        "fr",
        "Lorsque l'utilisateur atteint un niveau de rang, attribuez-lui un rôle !"
    ),
    description_localized("ja", "ユーザーがランクレベルを獲得したらロールを付与！"),
    description_localized("ru", "Когда пользователь получает уровень ранга, выдать роль!"),
    description_localized("es-ES", "Cuando el usuario gana un nivel de rango, darle un rol!")
)]
pub async fn ranks_roles(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let guild_id_opt = ctx.guild_id();
    let mut roles = load_rank_roles_routed(&ctx.data().pool, &gid).await;
    // Descending like the TS embed (`!roles.ts:84`:
    // `parseInt(levelB) - parseInt(levelA)`).
    sort_rank_roles_desc(&mut roles);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str, fb: &str| crate::lang::get(&code, k).unwrap_or_else(|| fb.to_string());
    // Field templates mirror `!roles.ts:104-121`: per-role autofields,
    // and the single no-roles field when the map is empty (the TS panel
    // always shows the embed, never a plain-text empty reply).
    let name_tpl = t("ranks_config_autofields_name", "Level ${level}");
    let value_tpl = t("ranks_config_autofields_value", "Role: <@&${roleId}>");
    let no_name = t("ranks_config_nofields_name", "No Roles Configured");
    let no_value = t(
        "ranks_config_nofields_value",
        "Set up rank roles to reward active members!",
    );
    let title = t("ranks_config_embed_title", "Rank Roles Configuration");
    let desc = t(
        "ranks_config_embed_desc",
        "Customize your server's XP-based role rewards!",
    );
    let not_for_you = t("help_not_for_you", "This interaction is not for you");
    let add_label = t("ranks_config_btn_add_name", "Add Role");
    let remove_label = t("ranks_config_btn_remove_name", "Remove Role");
    let return_label = t("backup_cancel_button", "Cancel Action");
    // 5 rows per page like the TS `itemsPerPage` (`!roles.ts:79`).
    let per_page = 5usize;
    let mut total_pages = roles.len().div_ceil(per_page).max(1);
    let icon = ctx
        .guild_id()
        .and_then(|g| ctx.cache().guild(g))
        .and_then(|g| g.icon_url());
    let mk_embed = |roles: &[RankRole], page: usize, total_pages: usize| {
        let start = page * per_page;
        let fields: Vec<(String, String)> = if roles.is_empty() {
            vec![(no_name.clone(), no_value.clone())]
        } else {
            roles
                .iter()
                .skip(start)
                .take(per_page)
                .map(|r| rank_role_field_text(&name_tpl, &value_tpl, r))
                .collect()
        };
        let footer = crate::lang::get(&code, "ranks_config_help_footer")
            .map(|s| {
                s.replace("${currentPage}", &(page + 1).to_string())
                    .replace("${totalPage}", &total_pages.to_string())
                    .replace("${totalRanks}", &roles.len().to_string())
            })
            .unwrap_or_else(|| {
                format!(
                    "Page {}/{} • Total Ranks: {}",
                    page + 1,
                    total_pages,
                    roles.len()
                )
            });
        let mut embed = serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0x5865F2)
            .description(desc.clone())
            .footer({
                let mut f = serenity::CreateEmbedFooter::new(footer);
                if let Some(url) = icon.clone() {
                    f = f.icon_url(url);
                }
                f
            })
            .timestamp(serenity::Timestamp::now());
        for (name, value) in fields {
            embed = embed.field(name, value, false);
        }
        embed
    };
    // TS `createActionRow` (`!roles.ts:135-164`): prev + add + remove +
    // next in one row.
    let mk_row = |page: usize, total_pages: usize| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("rk-roles-prev")
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(page == 0),
            serenity::CreateButton::new(ADD_BUTTON_ID)
                .style(serenity::ButtonStyle::Success)
                .label(add_label.clone()),
            serenity::CreateButton::new(REMOVE_BUTTON_ID)
                .style(serenity::ButtonStyle::Danger)
                .label(remove_label.clone()),
            serenity::CreateButton::new("rk-roles-next")
                .style(serenity::ButtonStyle::Secondary)
                .label(">>>")
                .disabled(page + 1 >= total_pages),
        ])
    };
    // TS `createReturnRow` (`!roles.ts:166-173`).
    let mk_return_row = || {
        serenity::CreateActionRow::Buttons(vec![serenity::CreateButton::new(RETURN_BUTTON_ID)
            .style(serenity::ButtonStyle::Secondary)
            .label(return_label.clone())])
    };
    // Re-render the panel after a flow finishes, fails, or times out
    // (TS edits `content: null, embeds, components` on every exit leg).
    let restore_panel = |roles: &[RankRole], page: usize, total_pages: usize| {
        serenity::EditMessage::new()
            .content("")
            .embed(mk_embed(roles, page, total_pages))
            .components(vec![mk_row(page, total_pages)])
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(&roles, 0, total_pages))
                .components(vec![mk_row(0, total_pages)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    let author_id = ctx.author().id;
    // Mirrors the 3-minute button collector; only the invoker may drive
    // the panel (others get the ephemeral `help_not_for_you` reply like TS).
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(180))
            .await;
        let Some(press) = press else { break };
        if !press.data.custom_id.starts_with("rk-roles-") {
            continue;
        }
        if press.user.id != author_id {
            let _ = press
                .create_response(
                    ctx.http(),
                    serenity::CreateInteractionResponse::Message(
                        serenity::CreateInteractionResponseMessage::new()
                            .content(not_for_you.clone())
                            .ephemeral(true),
                    ),
                )
                .await;
            continue;
        }
        match press.data.custom_id.as_str() {
            "rk-roles-prev" => {
                page = page.saturating_sub(1);
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .embed(mk_embed(&roles, page, total_pages))
                                .components(vec![mk_row(page, total_pages)]),
                        ),
                    )
                    .await;
            }
            "rk-roles-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .embed(mk_embed(&roles, page, total_pages))
                                .components(vec![mk_row(page, total_pages)]),
                        ),
                    )
                    .await;
            }
            ADD_BUTTON_ID => {
                // Add flow (`!roles.ts:227-371`). Fresh read so the cap
                // check sees concurrent edits.
                let current = load_rank_roles_routed(&ctx.data().pool, &gid).await;
                if super::rank_roles_at_cap(&current) {
                    let _ = press
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Message(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content(t(
                                        "ranks_config_add_max_roles",
                                        "You've reached the maximum number of rank roles (25).",
                                    ))
                                    .ephemeral(true),
                            ),
                        )
                        .await;
                    continue;
                }
                let menu = serenity::CreateSelectMenu::new(
                    ADD_SELECT_ID,
                    serenity::CreateSelectMenuKind::Role {
                        default_roles: None,
                    },
                )
                .placeholder(t("ranks_config_add_role_menu_placeholder", "Select a role"))
                .min_values(1)
                .max_values(1);
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t(
                                    "ranks_config_awaiting1_response",
                                    "Select the role you want to assign to a specific level.",
                                ))
                                .components(vec![
                                    serenity::CreateActionRow::SelectMenu(menu),
                                    mk_return_row(),
                                ]),
                        ),
                    )
                    .await;
                // Wait for the role pick (or return). Other users are
                // gated like the panel; anything else is ignored. The
                // pick interaction is retained: the level modal is shown
                // on it, like `iHorizonModalResolve(response1)`.
                let pick: Option<(serenity::ComponentInteraction, serenity::RoleId)> = loop {
                    let Some(pick) = msg
                        .await_component_interaction(ctx.serenity_context().shard.clone())
                        .timeout(std::time::Duration::from_secs(FLOW_WAIT_SECS))
                        .await
                    else {
                        break None;
                    };
                    if pick.user.id != author_id {
                        let _ = pick
                            .create_response(
                                ctx.http(),
                                serenity::CreateInteractionResponse::Message(
                                    serenity::CreateInteractionResponseMessage::new()
                                        .content(not_for_you.clone())
                                        .ephemeral(true),
                                ),
                            )
                            .await;
                        continue;
                    }
                    if pick.data.custom_id == RETURN_BUTTON_ID {
                        let _ = pick
                            .create_response(
                                ctx.http(),
                                serenity::CreateInteractionResponse::UpdateMessage(
                                    serenity::CreateInteractionResponseMessage::new()
                                        .content("")
                                        .embed(mk_embed(&roles, page, total_pages))
                                        .components(vec![mk_row(page, total_pages)]),
                                ),
                            )
                            .await;
                        break None;
                    }
                    if pick.data.custom_id != ADD_SELECT_ID {
                        continue;
                    }
                    let picked_role = match &pick.data.kind {
                        serenity::ComponentInteractionDataKind::RoleSelect { values } => {
                            values.first().copied()
                        }
                        _ => None,
                    };
                    if let Some(role_id) = picked_role {
                        break Some((pick, role_id));
                    }
                };
                let Some((pick, role_id)) = pick else {
                    // Timeout with no pick: restore the panel (the
                    // return leg already restored it itself).
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                };
                // Resolve mention + permission bits for the duplicate
                // check and the dangerous-permission warn follow-up
                // (`!roles.ts:271-282`).
                let cached_role = guild_id_opt
                    .and_then(|g| ctx.cache().guild(g))
                    .and_then(|gd| gd.roles.get(&role_id).cloned());
                let perm_bits = cached_role
                    .as_ref()
                    .map(|r| r.permissions.bits())
                    .unwrap_or(0);
                let dangerous = super::dangerous_role_perm_names(perm_bits);
                let mention = format!("<@&{}>", role_id.get());
                let role_id_str = role_id.get().to_string();
                // Level modal (`!roles.ts:284-301`): required, 1..4 chars.
                let modal_title = t("ranks_config_add_modal_title", "Set Level for Role");
                let mut opts = crate::modal_helper::ModalOptions::new(&modal_title, LEVEL_MODAL_ID);
                opts.defer_update = false;
                opts.fields.push(crate::modal_helper::ModalField::Text(
                    crate::modal_helper::TextField {
                        custom_id: LEVEL_FIELD_ID.to_string(),
                        label: t(
                            "ranks_config_add_modal_fields1_placeholder",
                            "Level Requirement",
                        ),
                        placeholder: None,
                        style: crate::modal_helper::TextStyle::Short,
                        required: true,
                        max_length: Some(4),
                        min_length: Some(1),
                        value: None,
                    },
                ));
                let Ok(modal) = crate::modal_helper::build_modal(&opts) else {
                    let _ = pick
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::UpdateMessage(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content("")
                                    .embed(mk_embed(&roles, page, total_pages))
                                    .components(vec![mk_row(page, total_pages)]),
                            ),
                        )
                        .await;
                    continue;
                };
                if pick
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Modal(modal),
                    )
                    .await
                    .is_err()
                {
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                }
                let Some(submit) = crate::commands::await_modal_submit(
                    ctx.serenity_context(),
                    &pick,
                    LEVEL_MODAL_ID,
                )
                .await
                else {
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                };
                // `parseInt` validation (`!roles.ts:306-319`).
                let level_input = crate::modal_helper::text_value(&submit, LEVEL_FIELD_ID);
                let Some(level) = super::parse_rank_level_input(&level_input) else {
                    let _ = submit
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Message(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content(t(
                                        "ranks_config_add_invalid_level",
                                        "Invalid level! Please enter a positive number.",
                                    ))
                                    .ephemeral(true),
                            ),
                        )
                        .await;
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                };
                // Duplicate check (`!roles.ts:321-335`), re-read so a
                // concurrent edit cannot double-assign the role.
                let mut updated = load_rank_roles_routed(&ctx.data().pool, &gid).await;
                if super::is_duplicate_rank_role(&updated, &role_id_str) {
                    let _ = submit
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Message(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content(
                                        t(
                                            "ranks_config_add_invalid_role",
                                            "The role {role} already exists. The role can only be assigned to one level.",
                                        )
                                        .replace("{role}", &mention),
                                    )
                                    .ephemeral(true),
                            ),
                        )
                        .await;
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                }
                updated.push(RankRole {
                    role_id: role_id_str,
                    level,
                });
                sort_rank_roles_desc(&mut updated);
                if save_rank_roles_routed(&ctx.data().pool, &gid, &updated)
                    .await
                    .is_err()
                {
                    let _ = submit
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Message(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content(t(
                                        "ranks_config_add_save_error",
                                        "Could not save rank roles. Please try again.",
                                    ))
                                    .ephemeral(true),
                            ),
                        )
                        .await;
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                }
                roles = updated;
                total_pages = roles.len().div_ceil(per_page).max(1);
                page = page.min(total_pages - 1);
                // Success reply (`!roles.ts:350-355`), then the
                // dangerous-permission warn follow-up (`!roles.ts:357-368`)
                // when the role holds flagged permissions.
                let _ = submit
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(
                                    t(
                                        "ranks_config_add_command_work",
                                        "Role ${selectedRole} added for level ${level}!",
                                    )
                                    .replace("${selectedRole}", &mention)
                                    .replace("${level}", &level.to_string()),
                                )
                                .ephemeral(true),
                        ),
                    )
                    .await;
                if !dangerous.is_empty() {
                    let _ = submit
                        .create_followup(
                            ctx.http(),
                            serenity::CreateInteractionResponseFollowup::new()
                                .content(
                                    t(
                                        "ranks_config_add_command_warn",
                                        "# WARN Warning: The role ${selectedRole} has the following sensitive permissions:\n\n${_}",
                                    )
                                    .replace("${selectedRole}", &mention)
                                    .replace("${_}", &dangerous.join("\n")),
                                )
                                .ephemeral(true),
                        )
                        .await;
                }
                let _ = msg
                    .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                    .await;
            }
            REMOVE_BUTTON_ID => {
                // Remove flow (`!roles.ts:374-464`). Fresh read so the
                // menu lists concurrent edits.
                let mut current = load_rank_roles_routed(&ctx.data().pool, &gid).await;
                sort_rank_roles_desc(&mut current);
                if current.is_empty() {
                    let _ = press
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Message(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content(t(
                                        "ranks_config_remove_no_rank",
                                        "There are no rank roles configured to remove.",
                                    ))
                                    .ephemeral(true),
                            ),
                        )
                        .await;
                    continue;
                }
                // One option per level (`!roles.ts:393-410`): the label
                // uses the `{level}` template, the value is the level.
                let level_label = t("ranks_config_var_level", "Level {level}");
                let opt_desc = t(
                    "ranks_config_remove_string_menu_desc",
                    "Remove role at level ${level}",
                );
                let options: Vec<serenity::CreateSelectMenuOption> = current
                    .iter()
                    .map(|r| {
                        serenity::CreateSelectMenuOption::new(
                            level_label.replace("{level}", &r.level.to_string()),
                            r.level.to_string(),
                        )
                        .description(opt_desc.replace("${level}", &r.level.to_string()))
                    })
                    .collect();
                let menu = serenity::CreateSelectMenu::new(
                    REMOVE_SELECT_ID,
                    serenity::CreateSelectMenuKind::String { options },
                )
                .placeholder(t(
                    "ranks_config_remove_string_menu1_placeholder",
                    "Select a role to remove",
                ));
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::UpdateMessage(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t(
                                    "ranks_config_remove_awaiting_response",
                                    "Select the role you want to remove.",
                                ))
                                .components(vec![
                                    serenity::CreateActionRow::SelectMenu(menu),
                                    mk_return_row(),
                                ]),
                        ),
                    )
                    .await;
                // Retain the select press for the confirm reply.
                let picked: Option<(serenity::ComponentInteraction, String)> = loop {
                    let Some(pick) = msg
                        .await_component_interaction(ctx.serenity_context().shard.clone())
                        .timeout(std::time::Duration::from_secs(FLOW_WAIT_SECS))
                        .await
                    else {
                        break None;
                    };
                    if pick.user.id != author_id {
                        let _ = pick
                            .create_response(
                                ctx.http(),
                                serenity::CreateInteractionResponse::Message(
                                    serenity::CreateInteractionResponseMessage::new()
                                        .content(not_for_you.clone())
                                        .ephemeral(true),
                                ),
                            )
                            .await;
                        continue;
                    }
                    if pick.data.custom_id == RETURN_BUTTON_ID {
                        let _ = pick
                            .create_response(
                                ctx.http(),
                                serenity::CreateInteractionResponse::UpdateMessage(
                                    serenity::CreateInteractionResponseMessage::new()
                                        .content("")
                                        .embed(mk_embed(&roles, page, total_pages))
                                        .components(vec![mk_row(page, total_pages)]),
                                ),
                            )
                            .await;
                        break None;
                    }
                    if pick.data.custom_id != REMOVE_SELECT_ID {
                        continue;
                    }
                    let picked_level = match &pick.data.kind {
                        serenity::ComponentInteractionDataKind::StringSelect { values } => {
                            values.first().cloned()
                        }
                        _ => None,
                    };
                    if let Some(v) = picked_level {
                        break Some((pick, v));
                    }
                };
                let Some((pick, level_str)) = picked else {
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                };
                let level: u64 = level_str.parse().unwrap_or(0);
                let mut updated = load_rank_roles_routed(&ctx.data().pool, &gid).await;
                remove_rank_role(&mut updated, level);
                if save_rank_roles_routed(&ctx.data().pool, &gid, &updated)
                    .await
                    .is_err()
                {
                    let _ = pick
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Message(
                                serenity::CreateInteractionResponseMessage::new()
                                    .content(t(
                                        "ranks_config_add_save_error",
                                        "Could not save rank roles. Please try again.",
                                    ))
                                    .ephemeral(true),
                            ),
                        )
                        .await;
                    let _ = msg
                        .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                        .await;
                    continue;
                }
                roles = updated;
                total_pages = roles.len().div_ceil(per_page).max(1);
                page = page.min(total_pages - 1);
                let _ = pick
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(
                                    t(
                                        "ranks_config_remove_command_work",
                                        "Role for level ${levelToRemove} has been removed!",
                                    )
                                    .replace("${levelToRemove}", &level_str),
                                )
                                .ephemeral(true),
                        ),
                    )
                    .await;
                let _ = msg
                    .edit(ctx.http(), restore_panel(&roles, page, total_pages))
                    .await;
            }
            _ => continue,
        }
    }
    // Clear the row when the collector ends, like the TS end handler
    // (`collector.on("end")` edits `components: []`).
    let _ = msg
        .edit(ctx.http(), serenity::EditMessage::new().components(vec![]))
        .await;
    Ok(())
}

/// Pure remove helper: drop the entry at `level`. Returns true when
/// something was removed. Unit-testable without Discord.
pub fn remove_rank_role(roles: &mut Vec<RankRole>, level: u64) -> bool {
    let before = roles.len();
    roles.retain(|r| r.level != level);
    roles.len() != before
}

#[cfg(test)]
mod tests {
    use super::rank_role_field_text;
    use super::sort_rank_roles_desc;
    use super::{load_rank_roles_routed, remove_rank_role, save_rank_roles_routed, RankRole};

    async fn mem_pool() -> crate::db::Pool {
        crate::db::memory_pool().await
    }

    #[test]
    fn role_list_sorts_desc_and_pages_five_per_page() {
        // Seven roles: desc by level like the TS embed, sliced 5 + 2
        // like `itemsPerPage` pagination.
        let mut roles: Vec<RankRole> = [3u64, 30, 1, 12, 7, 25, 9]
            .into_iter()
            .map(|level| RankRole {
                role_id: format!("r{level}"),
                level,
            })
            .collect();
        sort_rank_roles_desc(&mut roles);
        let levels: Vec<u64> = roles.iter().map(|r| r.level).collect();
        assert_eq!(levels, vec![30, 25, 12, 9, 7, 3, 1]);
        let per_page = 5usize;
        let total_pages = roles.len().div_ceil(per_page);
        assert_eq!(total_pages, 2);
        let page0: Vec<u64> = roles.iter().take(per_page).map(|r| r.level).collect();
        let page1: Vec<u64> = roles.iter().skip(per_page).map(|r| r.level).collect();
        assert_eq!(page0, vec![30, 25, 12, 9, 7]);
        assert_eq!(page1, vec![3, 1]);
    }

    #[test]
    fn role_fields_substitute_level_and_role_id() {
        // Template mechanics of `!roles.ts:104-114`: every `${level}`
        // and `${roleId}` slot is filled, nothing else is touched.
        let role = RankRole {
            role_id: "7".to_string(),
            level: 5,
        };
        let (name, value) = rank_role_field_text(
            "Level ${level}",
            "Role: <@&${roleId}>\nUnlocked at level ${level}",
            &role,
        );
        assert_eq!(name, "Level 5");
        assert_eq!(value, "Role: <@&7>\nUnlocked at level 5");
    }

    #[test]
    fn remove_drops_level_entry() {
        let mut roles = vec![
            RankRole {
                role_id: "7".to_string(),
                level: 5,
            },
            RankRole {
                role_id: "8".to_string(),
                level: 9,
            },
        ];
        assert!(remove_rank_role(&mut roles, 5));
        assert_eq!(roles.len(), 1);
        assert_eq!(roles[0].level, 9);
        assert!(!remove_rank_role(&mut roles, 5));
    }

    #[test]
    fn add_guards_cap_duplicate_and_level_parse() {
        // Add-flow gates (`!roles.ts:228-335`) via the shared helpers:
        // 25-role cap, duplicate role id, modal level validation.
        let full: Vec<RankRole> = (1u64..=25)
            .map(|level| RankRole {
                role_id: format!("r{level}"),
                level,
            })
            .collect();
        assert!(super::super::rank_roles_at_cap(&full));
        assert!(!super::super::rank_roles_at_cap(&full[..24]));
        assert!(super::super::is_duplicate_rank_role(&full, "r5"));
        assert!(!super::super::is_duplicate_rank_role(&full, "r99"));
        assert_eq!(super::super::parse_rank_level_input("12"), Some(12));
        assert_eq!(super::super::parse_rank_level_input("12a"), Some(12));
        assert_eq!(super::super::parse_rank_level_input("0"), None);
        assert_eq!(super::super::parse_rank_level_input("-3"), None);
        assert_eq!(super::super::parse_rank_level_input(""), None);
        assert_eq!(super::super::parse_rank_level_input("12345"), None);
        assert_eq!(super::super::parse_rank_level_input("abc"), None);
    }

    #[tokio::test]
    async fn legacy_vec_reads_and_promotes_to_map() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.RANKS.roles",
            r#"[{"role_id":"7","level":5}]"#,
        )
        .await
        .unwrap();
        assert_eq!(
            load_rank_roles_routed(&pool, "g").await,
            vec![RankRole {
                role_id: "7".to_string(),
                level: 5
            }]
        );
        // Promoted into the TS map shape on the new key.
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.ranksRoles")
                .await
                .as_deref(),
            Some(r#"{"5":"7"}"#)
        );
        assert!(load_rank_roles_routed(&pool, "g9").await.is_empty());
    }

    #[tokio::test]
    async fn new_map_wins_over_legacy_vec() {
        let pool = mem_pool().await;
        crate::db::kv_set(
            &pool,
            "g",
            "GUILD.RANKS.roles",
            r#"[{"role_id":"7","level":5}]"#,
        )
        .await
        .unwrap();
        crate::db::kv_set(&pool, "g", "GUILD.XP_LEVELING.ranksRoles", r#"{"9":"8"}"#)
            .await
            .unwrap();
        assert_eq!(
            load_rank_roles_routed(&pool, "g").await,
            vec![RankRole {
                role_id: "8".to_string(),
                level: 9
            }]
        );
    }

    #[tokio::test]
    async fn save_dual_writes_map_and_legacy_vec() {
        let pool = mem_pool().await;
        save_rank_roles_routed(
            &pool,
            "g",
            &[RankRole {
                role_id: "7".to_string(),
                level: 5,
            }],
        )
        .await
        .unwrap();
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.XP_LEVELING.ranksRoles")
                .await
                .as_deref(),
            Some(r#"{"5":"7"}"#)
        );
        assert_eq!(
            crate::db::kv_get(&pool, "g", "GUILD.RANKS.roles")
                .await
                .as_deref(),
            Some(r#"[{"role_id":"7","level":5}]"#)
        );
    }
}
