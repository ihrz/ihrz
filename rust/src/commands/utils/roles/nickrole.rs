use super::*;

/// Mass-assign a role by nickname match. Mirrors !nickrole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "nickrole",
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn nickrole(
    ctx: Ctx<'_>,
    #[description = "add or sub"] action: String,
    #[description = "Nickname part"] nickname: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    let part = nickname.to_lowercase();
    let add = !matches!(
        action.to_ascii_lowercase().as_str(),
        "sub" | "remove" | "del" | "off"
    );
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let total = members.len();
    // TS matches globalName or nickname (case-insensitive) and skips
    // members already in the target state.
    let targets: Vec<serenity::UserId> = members
        .iter()
        .filter(|m| {
            let has = m.roles.contains(&role.id);
            if has == add {
                return false;
            }
            let nick = m.nick.as_deref().unwrap_or("");
            let global = m.user.global_name.as_deref().unwrap_or("");
            nick_matches_part(nick, global, &m.user.name, &part)
        })
        .map(|m| m.user.id)
        .collect();
    let skipped = total.saturating_sub(targets.len());
    // Immediate progress reply, edited with the final embed.
    // Mirrors ogInteraction + processBatchAsync (10/150ms).
    let progress_tpl = if add {
        t("batch_massiverole_process")
    } else {
        t("batch_unmassiverole_process")
    };
    let progress = ctx.say(fill_progress(&progress_tpl, targets.len())).await?;
    let http = ctx.http();
    let role_id = role.id;
    let result = crate::funcs::process_batch_full(
        &targets,
        10,
        150,
        None::<fn(usize, usize)>,
        |uid| async move {
            let Ok(member) = guild_id.member(&http, uid).await else {
                return false;
            };
            let out = if add {
                member.add_role(&http, role_id).await
            } else {
                member.remove_role(&http, role_id).await
            };
            out.is_ok()
        },
    )
    .await;
    let desc = fill_work(
        &t(if add {
            "nickrole_add_command_work"
        } else {
            "nickrole_sub_command_work"
        }),
        &ctx.author().to_string(),
        result.success,
        skipped,
        result.failed,
        &part,
        &role.to_string(),
    );
    let gid = guild_id.get().to_string();
    let (footer_name, footer_bytes) = footer_parts(&ctx, &gid).await;
    let mut embed = serenity::CreateEmbed::default()
        .colour(serenity::Colour::from_rgb(0, 127, 255))
        .timestamp(serenity::Timestamp::now())
        .description(desc);
    embed = embed_with_footer(embed, &footer_name, footer_bytes.is_some());
    if let Some(thumb) = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .and_then(|g| g.icon_url())
    {
        embed = embed.thumbnail(thumb);
    }
    let mut reply = poise::CreateReply::default().content("").embed(embed);
    if let Some(bytes) = footer_bytes {
        reply = reply.attachment(serenity::CreateAttachment::bytes(bytes, "footer_icon.png"));
    }
    progress.edit(ctx, reply).await?;
    Ok(())
}

/// Case-insensitive substring match over nickname, global name and
/// username. Mirrors the TS globalName/nickname filter.
pub fn nick_matches_part(nick: &str, global_name: &str, username: &str, part: &str) -> bool {
    let part = part.to_lowercase();
    nick.to_lowercase().contains(&part)
        || global_name.to_lowercase().contains(&part)
        || username.to_lowercase().contains(&part)
}

/// Fill the `${membersToProcess.length}` progress template.
pub fn fill_progress(template: &str, n: usize) -> String {
    template.replace("${membersToProcess.length}", &n.to_string())
}

/// Fill the nickrole work template (`${part_of_nickname}` extra).
pub fn fill_work(
    template: &str,
    invoker: &str,
    matched: usize,
    skipped: usize,
    errors: usize,
    part: &str,
    role: &str,
) -> String {
    template
        .replace("${interaction.user}", invoker)
        .replace("${a}", &matched.to_string())
        .replace("${s}", &skipped.to_string())
        .replace("${e}", &errors.to_string())
        .replace("${part_of_nickname}", part)
        .replace("${role}", role)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nickname_matching_matches_ts() {
        assert!(nick_matches_part("CoolGuy", "", "user", "cool"));
        assert!(nick_matches_part("", "Cool Name", "user", "cool"));
        assert!(nick_matches_part("", "", "CoolUser", "cool"));
        assert!(!nick_matches_part("Bob", "Rob", "bob", "cool"));
        assert!(!nick_matches_part("", "", "", "x"));
    }

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_progress("Removing from ${membersToProcess.length}...", 4),
            "Removing from 4..."
        );
        assert_eq!(
            fill_work("${a} got ${role} for `${part_of_nickname}` skip ${s} err ${e} by ${interaction.user}", "<@1>", 1, 2, 3, "cool", "<@&9>"),
            "1 got <@&9> for `cool` skip 2 err 3 by <@1>"
        );
    }
}
