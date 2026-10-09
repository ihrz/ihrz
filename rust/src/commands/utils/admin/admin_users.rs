use super::*;

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
    // Mirrors !admin-users.ts: the guild owner and the bot itself are
    // excluded from the admin scan.
    let self_id = ctx.serenity_context().cache.current_user().id;
    let admins: Vec<String> = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| {
            g.members
                .values()
                .filter(|m| m.user.id != g.owner_id && m.user.id != self_id)
                .filter(|m| {
                    m.roles.iter().any(|r| {
                        g.roles
                            .get(r)
                            .map(|role| role.permissions.administrator())
                            .unwrap_or(false)
                    })
                })
                .map(|m| format_admin_member(&m.to_string(), m.user.bot))
                .collect()
        })
        .unwrap_or_default();
    let code = crate::db::guild_lang(&ctx.data().pool, ctx.guild_id().map(|g| g.get())).await;
    ctx.say(if admins.is_empty() {
        crate::lang::get(&code, "all_admins_nobody_admins")
            .unwrap_or_else(|| "There is no administrator in this guild!".to_string())
    } else {
        admins.join(", ")
    })
    .await?;
    Ok(())
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
}
