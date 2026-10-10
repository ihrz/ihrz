use super::*;
use poise::serenity_prelude as serenity;

/// Collector lifetime from !admin-users.ts (`1_60_000`).
pub const ADMIN_USERS_COLLECTOR_SECS: u64 = 160;

/// List admins. Mirrors admin-users/admin-roles (cache scan).
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "admin-users",
    aliases("alladmin", "allperms", "alladmins", "adminusers"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn admin_users(ctx: Ctx<'_>) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Mirrors !admin-users.ts: the guild owner and the bot itself are
    // excluded from the admin scan.
    let self_id = ctx.serenity_context().cache.current_user().id;
    let snapshot = ctx.serenity_context().cache.guild(guild_id).map(|g| {
        let owner = g.owner_id;
        let icon = g.icon_url();
        let list: Vec<(serenity::UserId, Vec<serenity::RoleId>, bool)> = g
            .members
            .values()
            .filter(|m| m.user.id != owner && m.user.id != self_id)
            .filter(|m| {
                m.roles.iter().any(|r| {
                    g.roles
                        .get(r)
                        .map(|role| role.permissions.administrator())
                        .unwrap_or(false)
                })
            })
            .map(|m| (m.user.id, m.roles.clone(), m.user.bot))
            .collect();
        let roles = g.roles.clone();
        (owner, icon, list, roles)
    });
    let (owner_id, icon_url, admins, roles) =
        snapshot.unwrap_or((ctx.author().id, None, vec![], Default::default()));
    if admins.is_empty() {
        ctx.say(t("all_admins_nobody_admins")).await?;
        return Ok(());
    }
    let entries: Vec<String> = admins
        .iter()
        .map(|(uid, _, bot)| format_admin_member(&format!("<@{uid}>", uid = uid.get()), *bot))
        .collect();
    let pages = admin_user_pages(&entries, &t("all_admins_embed_title"));
    let total = pages.len();
    let page_word = crate::lang::get(&code, "var_page").unwrap_or_else(|| "Page".to_string());
    let not_for_you = t("help_not_for_you");
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let footer_icon = footer_bytes.is_some();
    let mk_embed = |cur: usize, hide_bots: bool| {
        let (title, desc) = pages[cur].clone();
        serenity::CreateEmbed::default()
            .colour(serenity::Colour::from_rgb(0x01, 0x01, 0x01))
            .title(title)
            .description(filter_admin_bots(&desc, hide_bots))
            .footer(
                serenity::CreateEmbedFooter::new(crate::commands::shared::footer_page_text(
                    &footer_name,
                    &page_word,
                    (cur + 1) as u64,
                    total as u64,
                ))
                .icon_url(if footer_icon {
                    "attachment://footer_icon.png".to_string()
                } else {
                    String::new()
                }),
            )
            .timestamp(serenity::Timestamp::now())
    };
    let mk_row = |hide_bots: bool| {
        serenity::CreateActionRow::Buttons(vec![
            serenity::CreateButton::new("previousPage")
                .label("<<<")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("nextPage")
                .label(">>>")
                .style(serenity::ButtonStyle::Secondary),
            serenity::CreateButton::new("trash-button-embed")
                .label(t("all_admins_unrank_button_label"))
                .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
                .style(serenity::ButtonStyle::Danger),
            serenity::CreateButton::new("filter-bot")
                .emoji(serenity::ReactionType::Unicode("🤖".to_string()))
                .style(if hide_bots {
                    serenity::ButtonStyle::Success
                } else {
                    serenity::ButtonStyle::Danger
                }),
        ])
    };
    let mut reply = poise::CreateReply::default()
        .embed(mk_embed(0, false))
        .components(vec![mk_row(false)]);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    let handle = ctx.send(reply).await?;
    let mut msg = handle.into_message().await?;
    let author = ctx.author().id;
    let mut cur = 0usize;
    let mut hide_bots = false;
    loop {
        let press = msg
            .await_component_interaction(ctx.serenity_context().shard.clone())
            .timeout(std::time::Duration::from_secs(ADMIN_USERS_COLLECTOR_SECS))
            .await;
        let Some(press) = press else { break };
        if press.user.id != author {
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
            "previousPage" => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                cur = (cur + total - 1) % total;
            }
            "nextPage" => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                cur = (cur + 1) % total;
            }
            "filter-bot" => {
                let _ = press
                    .create_response(ctx.http(), serenity::CreateInteractionResponse::Acknowledge)
                    .await;
                hide_bots = !hide_bots;
            }
            "trash-button-embed" => {
                if press.user.id == owner_id {
                    let _ = press
                        .create_response(
                            ctx.http(),
                            serenity::CreateInteractionResponse::Acknowledge,
                        )
                        .await;
                    let loading = crate::emojis::app_emoji_markup(ctx.http(), "Discord_Loading")
                        .await
                        .unwrap_or_else(|| "…".to_string());
                    let _ = msg
                        .edit(
                            ctx.http(),
                            serenity::EditMessage::new()
                                .content(loading)
                                .suppress_embeds(true)
                                .components(vec![]),
                        )
                        .await;
                    let mut good = 0u64;
                    let mut bad = 0u64;
                    for (uid, member_roles, _) in &admins {
                        let keep = keep_non_admin_roles(&roles, member_roles);
                        if guild_id
                            .edit_member(
                                ctx.http(),
                                *uid,
                                serenity::EditMember::new()
                                    .roles(keep)
                                    .audit_log_reason("[AdminUsers] clearing admin on server"),
                            )
                            .await
                            .is_ok()
                        {
                            good += 1;
                        } else {
                            bad += 1;
                        }
                    }
                    let mut done = serenity::CreateEmbed::default()
                        .colour(serenity::Colour::from_rgb(0x00, 0x7F, 0xFF))
                        .timestamp(serenity::Timestamp::now())
                        .description(fill_unrank_result(
                            &t("all_admins_unrank_embed_desc"),
                            &author.to_string(),
                            good,
                            bad,
                        ))
                        .footer(
                            serenity::CreateEmbedFooter::new(footer_name.clone()).icon_url(
                                if footer_icon {
                                    "attachment://footer_icon.png".to_string()
                                } else {
                                    String::new()
                                },
                            ),
                        );
                    if let Some(thumb) = icon_url.clone() {
                        done = done.thumbnail(thumb);
                    }
                    let _ = msg
                        .edit(
                            ctx.http(),
                            serenity::EditMessage::new()
                                .content("")
                                .embeds(vec![done])
                                .components(vec![]),
                        )
                        .await;
                    return Ok(());
                }
                let _ = press
                    .create_response(
                        ctx.http(),
                        serenity::CreateInteractionResponse::Message(
                            serenity::CreateInteractionResponseMessage::new()
                                .content(t("all_admins_unrank_not_owner"))
                                .ephemeral(true),
                        ),
                    )
                    .await;
                break;
            }
            _ => continue,
        }
        let _ = press
            .create_response(
                ctx.http(),
                serenity::CreateInteractionResponse::UpdateMessage(
                    serenity::CreateInteractionResponseMessage::new()
                        .embed(mk_embed(cur, hide_bots))
                        .components(vec![mk_row(hide_bots)]),
                ),
            )
            .await;
    }
    let _ = msg
        .edit(
            ctx.http(),
            serenity::EditMessage::new().components(vec![admin_users_dead_row(hide_bots)]),
        )
        .await;
    Ok(())
}

/// Disabled row for the timeout cleanup (TS `end` clears components).
fn admin_users_dead_row(hide_bots: bool) -> serenity::CreateActionRow {
    let btn = |id: &str, label: &str| {
        serenity::CreateButton::new(id)
            .label(label)
            .style(serenity::ButtonStyle::Secondary)
            .disabled(true)
    };
    serenity::CreateActionRow::Buttons(vec![
        btn("previousPage", "<<<"),
        btn("nextPage", ">>>"),
        serenity::CreateButton::new("trash-button-embed")
            .label("🗑️")
            .style(serenity::ButtonStyle::Danger)
            .disabled(true),
        serenity::CreateButton::new("filter-bot")
            .emoji(serenity::ReactionType::Unicode("🤖".to_string()))
            .style(if hide_bots {
                serenity::ButtonStyle::Success
            } else {
                serenity::ButtonStyle::Danger
            })
            .disabled(true),
    ])
}

/// Role ids to keep: drop every role granting Administrator.
/// Pure part of the TS `filtered_roles` build in !admin-users.ts:190.
pub fn keep_non_admin_roles(
    roles: &std::collections::HashMap<serenity::RoleId, serenity::Role>,
    member_roles: &[serenity::RoleId],
) -> Vec<serenity::RoleId> {
    member_roles
        .iter()
        .filter(|r| {
            roles
                .get(r)
                .map(|role| !role.permissions.administrator())
                .unwrap_or(true)
        })
        .cloned()
        .collect()
}

/// Admin-users pager size from !admin-users.ts.
pub const ADMIN_USERS_PER_PAGE: usize = 5;

/// Format one admin entry. Bots get the `🤖 (BOT)` suffix, mirroring
/// the TS page-content map.
pub fn format_admin_member(mention: &str, is_bot: bool) -> String {
    if is_bot {
        format!("{mention}🤖 (BOT)")
    } else {
        mention.to_string()
    }
}

/// Build pager pages (5 entries each). The title template's
/// `${i / usersPerPage + 1}` placeholder becomes the 1-based page no.
pub fn admin_user_pages(entries: &[String], title_tpl: &str) -> Vec<(String, String)> {
    entries
        .chunks(ADMIN_USERS_PER_PAGE)
        .enumerate()
        .map(|(i, chunk)| {
            (
                title_tpl.replace("${i / usersPerPage + 1}", &(i + 1).to_string()),
                chunk.join("\n"),
            )
        })
        .collect()
}

/// Bot filter toggle. When hiding bots, drop lines ending with `(BOT)`.
pub fn filter_admin_bots(description: &str, hide_bots: bool) -> String {
    if !hide_bots {
        return description.to_string();
    }
    description
        .split('\n')
        .filter(|line| !line.ends_with("(BOT)"))
        .collect::<Vec<_>>()
        .join("\n")
}

/// Fill `all_admins_unrank_embed_desc`
/// (`${interaction.member?.user.toString()}`, `${good}`, `${bad}`).
pub fn fill_unrank_result(template: &str, invoker: &str, good: u64, bad: u64) -> String {
    template
        .replace("${interaction.member?.user.toString()}", invoker)
        .replace("${good}", &good.to_string())
        .replace("${bad}", &bad.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bot_suffix_mirrors_ts() {
        assert_eq!(format_admin_member("<@1>", false), "<@1>");
        assert_eq!(format_admin_member("<@2>", true), "<@2>🤖 (BOT)");
    }

    #[test]
    fn pages_chunk_by_five() {
        let entries: Vec<String> = (0..6).map(|i| format!("<@{i}>")).collect();
        let pages = admin_user_pages(&entries, "Admins | Page ${i / usersPerPage + 1}");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "Admins | Page 1");
        assert_eq!(pages[1].0, "Admins | Page 2");
        assert_eq!(pages[1].1, "<@5>");
    }

    #[test]
    fn bot_filter_drops_bot_lines() {
        let desc = "<@1>\n<@2>🤖 (BOT)";
        assert_eq!(filter_admin_bots(desc, false), desc);
        assert_eq!(filter_admin_bots(desc, true), "<@1>");
    }

    #[test]
    fn unrank_result_fills() {
        assert_eq!(
            fill_unrank_result(
                "${interaction.member?.user.toString()} unranked **${good}** failed **${bad}**",
                "<@9>",
                2,
                1,
            ),
            "<@9> unranked **2** failed **1**"
        );
    }

    #[test]
    fn collector_window_is_160s() {
        assert_eq!(ADMIN_USERS_COLLECTOR_SECS, 160);
    }

    #[test]
    fn keep_is_fail_open_for_uncached_roles() {
        use std::collections::HashMap;
        let roles: HashMap<serenity::RoleId, serenity::Role> = HashMap::new();
        let member = vec![serenity::RoleId::new(1), serenity::RoleId::new(2)];
        // Unknown roles are kept (fail-open, like the TS cache filter).
        assert_eq!(keep_non_admin_roles(&roles, &member), member);
    }
}
