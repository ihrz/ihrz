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

/// Role add command.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-add",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_role_add(
    ctx: Ctx<'_>,
    #[description = "Role"] role: serenity::Role,
    // String like the TS level modal (`!roles.ts:284-319`): prefix input
    // keeps leading-digit `parseInt` semantics (`"12ab"` -> 12) instead
    // of a hard integer parse failure.
    #[description = "Level"] level: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let say = |key: &str, fallback: &str| {
        crate::lang::get(&code, key).unwrap_or_else(|| fallback.to_string())
    };
    let id = role.id.get().to_string();
    let roles = load_rank_roles_routed(&ctx.data().pool, &gid).await;
    // Cap gate first: mirrors `!roles.ts:227-237` — the 25-role check runs
    // before the role picker and the level modal parse (`:303-319`), so a
    // full roster reports `ranks_config_add_max_roles` even for a level
    // input that would otherwise fail validation.
    if super::rank_roles_at_cap(&roles) {
        ctx.say(say(
            "ranks_config_add_max_roles",
            "You've reached the maximum number of rank roles (25).",
        ))
        .await?;
        return Ok(());
    }
    // Level gate (mirrors the `!roles.ts:306-319` modal parse:
    // `parseInt`, NaN or `<= 0` rejected; leading digits win on
    // prefix input like `"12ab"`).
    let Some(lvl) = super::parse_rank_level_input(&level) else {
        ctx.say(say(
            "ranks_config_add_invalid_level",
            "Invalid level: use a number between 1 and 9999.",
        ))
        .await?;
        return Ok(());
    };
    // Duplicate role (mirrors `!roles.ts:321-335`).
    if super::is_duplicate_rank_role(&roles, &id) {
        ctx.say(
            say(
                "ranks_config_add_invalid_role",
                "Role <@&id> is already a rank reward.",
            )
            .replace("{role}", &format!("<@&{id}>")),
        )
        .await?;
        return Ok(());
    }
    let mut roles = roles;
    // Map-key overwrite: mirrors `!roles.ts:338`
    // (`ranksConfig.ranksRoles[level] = selectedRole.id`) — assigning an
    // already-used level replaces its role instead of stacking a second
    // entry on the same level.
    roles.retain(|r| r.level != lvl);
    roles.push(RankRole {
        role_id: id.clone(),
        level: lvl,
    });
    save_rank_roles_routed(&ctx.data().pool, &gid, &roles).await?;
    ctx.say(
        say(
            "ranks_config_add_command_work",
            "Role <@&r> added for level L!",
        )
        .replace("${selectedRole}", &format!("<@&{}>", role.id.get()))
        .replace("${level}", &lvl.to_string()),
    )
    .await?;
    // Dangerous-permission warning (mirrors `!roles.ts:357-368`).
    let held = super::dangerous_role_perm_names(role.permissions.bits());
    if !held.is_empty() {
        let joined = held.join("\n");
        ctx.send(
            poise::CreateReply::default()
                .content(
                    say(
                        "ranks_config_add_command_warn",
                        "Warning: <@&r> holds dangerous permissions:\nP",
                    )
                    .replace("${selectedRole}", &format!("<@&{}>", role.id.get()))
                    .replace("${_}", &joined),
                )
                .ephemeral(true),
        )
        .await?;
    }
    Ok(())
}

/// List rank roles (highest level first, 5 per page).
// The TS `roles` panel (`ranks.ts:44-60`) requires Administrator for
// the whole panel (list included), so this leaf carries the same gate.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-list",
    aliases("rroles", "ranks-roles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_role_list(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_rank_roles_routed(&ctx.data().pool, &gid).await;
    // Descending like the TS embed (`!roles.ts:84`:
    // `parseInt(levelB) - parseInt(levelA)`).
    sort_rank_roles_desc(&mut roles);
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    if roles.is_empty() {
        ctx.say(
            crate::lang::get(&code, "msg_rank_roles_empty")
                .unwrap_or_else(|| "No rank roles.".to_string()),
        )
        .await?;
        return Ok(());
    }
    let row = |r: &RankRole| {
        crate::lang::get(&code, "msg_rank_role_row")
            .map(|s| {
                s.replace("{roleId}", &r.role_id)
                    .replace("{level}", &r.level.to_string())
            })
            .unwrap_or_else(|| format!("<@&{}> — lvl {}", r.role_id, r.level))
    };
    let title = crate::lang::get(&code, "ranks_config_embed_title")
        .unwrap_or_else(|| "Rank Roles Configuration".to_string());
    let desc = crate::lang::get(&code, "ranks_config_embed_desc")
        .unwrap_or_else(|| "Customize your server's XP-based role rewards!".to_string());
    let not_for_you = crate::lang::get(&code, "help_not_for_you")
        .unwrap_or_else(|| "This interaction is not for you.".to_string());
    // 5 rows per page like the TS `itemsPerPage` (`!roles.ts:79`).
    let per_page = 5usize;
    let total_pages = roles.len().div_ceil(per_page).max(1);
    let icon = ctx
        .guild_id()
        .and_then(|g| ctx.cache().guild(g))
        .and_then(|g| g.icon_url());
    let mk_embed = |page: usize| {
        let start = page * per_page;
        let body = roles
            .iter()
            .skip(start)
            .take(per_page)
            .map(row)
            .collect::<Vec<_>>()
            .join("\n");
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
        let embed = serenity::CreateEmbed::default()
            .title(title.clone())
            .colour(0x5865F2)
            .description(format!("{desc}\n\n{body}"))
            .footer({
                let mut f = serenity::CreateEmbedFooter::new(footer);
                if let Some(url) = icon.clone() {
                    f = f.icon_url(url);
                }
                f
            })
            .timestamp(serenity::Timestamp::now());
        embed
    };
    let mk_row = |page: usize| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("rk-roles-prev")
                .style(serenity::ButtonStyle::Secondary)
                .label("<<<")
                .disabled(page == 0),
            serenity::CreateButton::new("rk-roles-next")
                .style(serenity::ButtonStyle::Secondary)
                .label(">>>")
                .disabled(page + 1 >= total_pages),
        ])
    };
    let handle = ctx
        .send(
            poise::CreateReply::default()
                .embed(mk_embed(0))
                .components(vec![mk_row(0)]),
        )
        .await?;
    let mut msg = handle.into_message().await?;
    let mut page = 0usize;
    let author_id = ctx.author().id;
    // Mirrors the 3-minute button collector; only the invoker may turn
    // pages (others get the ephemeral `help_not_for_you` reply like TS).
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
            "rk-roles-prev" => page = page.saturating_sub(1),
            "rk-roles-next" => {
                if page + 1 < total_pages {
                    page += 1;
                }
            }
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(page))
                        .components(vec![mk_row(page)]),
                ),
            )
            .await;
    }
    // Disable the row when the collector ends, like the TS end handler.
    let end_row = serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new("rk-roles-prev")
            .style(serenity::ButtonStyle::Secondary)
            .label("<<<")
            .disabled(true),
        serenity::CreateButton::new("rk-roles-next")
            .style(serenity::ButtonStyle::Secondary)
            .label(">>>")
            .disabled(true),
    ]);
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![end_row]),
        )
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

/// Remove the rank role set for a level.
#[poise::command(
    slash_command,
    prefix_command,
    rename = "role-remove",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn ranks_role_remove(
    ctx: Ctx<'_>,
    // String like the add flow: leading-digit `parseInt` semantics on
    // prefix input (`!roles.ts:306`), invalid input hits `no_rank`.
    #[description = "Level"] level: String,
) -> Result<(), anyhow::Error> {
    let gid = ctx
        .guild_id()
        .map(|g| g.get().to_string())
        .unwrap_or_default();
    let mut roles = load_rank_roles_routed(&ctx.data().pool, &gid).await;
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    // Mirrors the `remove_role` flow (`!roles.ts:373+`): nothing to
    // remove replies with `ranks_config_remove_no_rank`.
    let parsed = super::parse_rank_level_input(&level).unwrap_or(0);
    if !remove_rank_role(&mut roles, parsed) {
        ctx.say(
            crate::lang::get(&code, "ranks_config_remove_no_rank")
                .unwrap_or_else(|| "There are no rank roles configured to remove.".to_string()),
        )
        .await?;
        return Ok(());
    }
    save_rank_roles_routed(&ctx.data().pool, &gid, &roles).await?;
    let removed = parsed.to_string();
    ctx.say(
        crate::lang::get(&code, "ranks_config_remove_command_work")
            .map(|s| s.replace("${levelToRemove}", &removed))
            .unwrap_or_else(|| format!("Role for level {removed} has been removed!")),
    )
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
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
