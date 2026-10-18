use super::*;

/// List administrator roles with owner-gated strip. Mirrors
/// utils/util !admin-roles.ts (5/page wrap-around pager + trash
/// button stripping Administrator with good/bad counts; the TS
/// 160s collector has no stateless equivalent).
pub const ADMIN_ROLES_PREFIX: &str = "admin-roles:";

pub const ADMIN_ROLES_PER_PAGE: usize = 5;

/// Pure pager. Mirrors the pages build (managed -> "🤖 (BOT)").
pub fn admin_role_pages(roles: &[(u64, bool)], title_tpl: &str) -> Vec<(String, String)> {
    let mut pages = Vec::new();
    for (i, chunk) in roles.chunks(ADMIN_ROLES_PER_PAGE).enumerate() {
        let title = title_tpl.replace("${i / rolesPerPage + 1}", &(i + 1).to_string());
        let desc = chunk
            .iter()
            .map(|(id, managed)| {
                if *managed {
                    format!("<@&{id}> 🤖 (BOT)")
                } else {
                    format!("<@&{id}>")
                }
            })
            .collect::<Vec<_>>()
            .join("\n");
        pages.push((title, desc));
    }
    pages
}

fn admin_roles_row(invoker: u64, page: usize, remove_lbl: &str) -> serenity::CreateActionRow {
    serenity::CreateActionRow::Buttons(vec![
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:prev"))
            .label("<<<")
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:next"))
            .label(">>>")
            .style(serenity::ButtonStyle::Secondary),
        serenity::CreateButton::new(format!("{ADMIN_ROLES_PREFIX}{invoker}:{page}:trash"))
            .label(remove_lbl)
            .emoji(serenity::ReactionType::Unicode("🗑️".to_string()))
            .style(serenity::ButtonStyle::Danger),
    ])
}

/// Collect (role_id, managed) admin roles, sorted by id.
pub fn collect_admin_roles(
    roles: &std::collections::HashMap<serenity::RoleId, serenity::Role>,
) -> Vec<(u64, bool)> {
    let mut out: Vec<(u64, bool)> = roles
        .iter()
        .filter(|(_, r)| r.permissions.administrator())
        .map(|(id, r)| (id.get(), r.managed))
        .collect();
    out.sort_by_key(|(id, _)| *id);
    out
}

/// Post one pager page. Mirrors createEmbed + footer builders.
pub async fn post_admin_page(
    ctx: &Ctx<'_>,
    gid: &str,
    page: usize,
    pages: &[(String, String)],
) -> Result<(), anyhow::Error> {
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, ctx.guild_id().map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (name, icon_bytes) = footer_parts(ctx, gid).await;
    let footer_text = crate::commands::shared::footer_page_text(
        &name,
        &t("var_page"),
        (page + 1) as u64,
        pages.len() as u64,
    );
    let mut footer = serenity::CreateEmbedFooter::new(footer_text);
    if icon_bytes.is_some() {
        footer = footer.icon_url("attachment://footer_icon.png");
    }
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(1, 1, 1))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(footer)
        .timestamp(serenity::Timestamp::now());
    let mut reply = poise::CreateReply::default()
        .embed(embed)
        .components(vec![admin_roles_row(
            ctx.author().id.get(),
            page,
            &t("admin_roles_remove_button_label"),
        )]);
    if let Some(bytes) = icon_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    ctx.send(reply).await?;
    Ok(())
}

/// Route an admin-roles pager/strip interaction.
pub async fn handle_admin_roles_component(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let gid = guild_id.get().to_string();
    let Some(rest) = comp.data.custom_id.strip_prefix(ADMIN_ROLES_PREFIX) else {
        return;
    };
    let mut parts = rest.splitn(3, ':');
    let (invoker, page, action) = match (parts.next(), parts.next(), parts.next()) {
        (Some(a), Some(b), Some(c)) => (
            a.parse::<u64>().unwrap_or(0),
            b.parse::<usize>().unwrap_or(0),
            c,
        ),
        _ => return,
    };
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    if comp.user.id.get() != invoker {
        ephemeral_admin_roles(http, comp, t("help_not_for_you")).await;
        return;
    }
    // Fresh role snapshot over HTTP (stateless: no cached pages).
    let snapshot: Vec<(u64, serenity::Role)> = http
        .get_guild_roles(guild_id)
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|r| (r.id.get(), r))
        .collect();
    let admin: Vec<(u64, bool)> = snapshot
        .iter()
        .filter(|(_, r)| r.permissions.administrator())
        .map(|(id, r)| (*id, r.managed))
        .collect();
    if admin.is_empty() {
        return;
    }
    let pages = admin_role_pages(&admin, &t("admin_roles_embed_title"));
    match action {
        "prev" | "next" => {
            let page = if action == "next" {
                (page + 1) % pages.len()
            } else {
                (page + pages.len() - 1) % pages.len()
            };
            update_admin_page(http, pool, &gid, comp, invoker, page, &pages).await;
        }
        _ => {
            // Trash: guild owner only. Mirrors the ownerId check.
            let owner = guild_id
                .to_partial_guild(http)
                .await
                .map(|g| g.owner_id.get())
                .unwrap_or(0);
            if comp.user.id.get() != owner {
                ephemeral_admin_roles(http, comp, t("admin_roles_remove_not_owner")).await;
                return;
            }
            strip_admin_roles(http, pool, comp, &snapshot).await;
        }
    }
}

async fn ephemeral_admin_roles(
    http: &serenity::Http,
    comp: &serenity::ComponentInteraction,
    content: String,
) {
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::Message(
                serenity::CreateInteractionResponseMessage::new()
                    .content(content)
                    .ephemeral(true),
            ),
        )
        .await;
}

async fn update_admin_page(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    gid: &str,
    comp: &serenity::ComponentInteraction,
    invoker: u64,
    page: usize,
    pages: &[(String, String)],
) {
    let code = crate::db::guild_lang(pool, comp.guild_id.map(|g| g.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let (name, icon_bytes) = crate::commands::shared::footer_parts_pool(pool, gid).await;
    let footer_text = crate::commands::shared::footer_page_text(
        &name,
        &t("var_page"),
        (page + 1) as u64,
        pages.len() as u64,
    );
    let with_icon = icon_bytes.is_some();
    let mut footer = serenity::CreateEmbedFooter::new(footer_text);
    if with_icon {
        footer = footer.icon_url("attachment://footer_icon.png");
    }
    let embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(1, 1, 1))
        .title(pages[page].0.clone())
        .description(pages[page].1.clone())
        .footer(footer)
        .timestamp(serenity::Timestamp::now());
    let _ = comp
        .create_response(
            http,
            serenity::CreateInteractionResponse::UpdateMessage(
                serenity::CreateInteractionResponseMessage::new()
                    .embed(embed)
                    .components(vec![admin_roles_row(
                        invoker,
                        page,
                        &t("admin_roles_remove_button_label"),
                    )]),
            ),
        )
        .await;
}

/// Strip Administrator from every admin role. Mirrors the trash flow
/// (loading state, good/bad counts, #007fff result embed).
async fn strip_admin_roles(
    http: &serenity::Http,
    pool: &crate::db::Pool,
    comp: &serenity::ComponentInteraction,
    snapshot: &[(u64, serenity::Role)],
) {
    let Some(guild_id) = comp.guild_id else {
        return;
    };
    let _ = comp
        .create_response(http, serenity::CreateInteractionResponse::Acknowledge)
        .await;
    let mut good = 0u64;
    let mut bad = 0u64;
    for (id, role) in snapshot {
        if !role.permissions.administrator() {
            continue;
        }
        let mut perms = role.permissions;
        perms.remove(serenity::Permissions::ADMINISTRATOR);
        match guild_id
            .edit_role(
                http,
                serenity::RoleId::new(*id),
                serenity::EditRole::new()
                    .permissions(perms)
                    .audit_log_reason("[AdminRoles] removing admin permission from role"),
            )
            .await
        {
            Ok(_) => good += 1,
            Err(_) => bad += 1,
        }
    }
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let desc = t("admin_roles_remove_embed_desc")
        .replace(
            "${interaction.member?.user.toString()}",
            &comp.user.to_string(),
        )
        .replace("${good}", &good.to_string())
        .replace("${bad}", &bad.to_string());
    let icon = guild_id
        .to_partial_guild(http)
        .await
        .ok()
        .and_then(|g| g.icon_url())
        .unwrap_or_default();
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    if !icon.is_empty() {
        embed = embed.thumbnail(icon);
    }
    let _ = comp
        .edit_response(
            http,
            serenity::EditInteractionResponse::new()
                .embed(embed)
                .components(vec![]),
        )
        .await;
}

#[cfg(test)]
mod admin_roles_tests {
    use super::{admin_role_pages, ADMIN_ROLES_PER_PAGE};

    #[test]
    fn pager_matches_ts_layout() {
        let roles: Vec<(u64, bool)> = (1u64..=7).map(|i| (i, i == 2)).collect();
        let pages = admin_role_pages(&roles, "List | Page ${i / rolesPerPage + 1}");
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].0, "List | Page 1");
        assert_eq!(pages[1].0, "List | Page 2");
        assert_eq!(pages[0].1.lines().count(), ADMIN_ROLES_PER_PAGE);
        assert!(pages[0].1.contains("<@&2> 🤖 (BOT)"));
        assert!(pages[0].1.contains("<@&1>"));
        assert!(!pages[0].1.contains("<@&1> 🤖"));
        assert_eq!(pages[1].1.lines().count(), 2);
        assert!(admin_role_pages(&[], "T").is_empty());
    }
}
