use super::*;

/// Add/remove a role for every member. Mirrors !massiverole.ts.
#[poise::command(
    slash_command,
    prefix_command,
    category = "utils",
    rename = "massiverole",
    aliases("massrole", "massroles"),
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn massiverole(
    ctx: Ctx<'_>,
    #[description = "add or sub"] action: String,
    #[description = "Role"] role: poise::serenity_prelude::Role,
) -> Result<(), anyhow::Error> {
    let Some(guild_id) = ctx.guild_id() else {
        return Ok(());
    };
    let pool = &ctx.data().pool;
    let code = crate::db::guild_lang(pool, Some(guild_id.get())).await;
    let t = |k: &str| crate::lang::get(&code, k).unwrap_or_default();
    // Rate-limit guard. Mirrors the memberCount >= 10000 check.
    let member_count = ctx
        .serenity_context()
        .cache
        .guild(guild_id)
        .map(|g| g.member_count)
        .unwrap_or(0);
    if member_count >= 10000 {
        ctx.say(t("massiverole_too_much_member")).await?;
        return Ok(());
    }
    let add = is_add_action(&action);
    let members = guild_id
        .members(ctx.http(), None, None)
        .await
        .unwrap_or_default();
    let total = members.len();
    let targets: Vec<serenity::UserId> = members
        .iter()
        .filter(|m| m.roles.contains(&role.id) != add)
        .map(|m| m.user.id)
        .collect();
    // Skipped = already-had (add) / no-longer-had (sub).
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
    let reason = if add {
        "[Massrole] Module"
    } else {
        "[MassiveRole] Command"
    };
    let result =
        crate::funcs::process_batch_full(&targets, 10, 150, None::<fn(usize, usize)>, |uid| {
            async move {
                let Ok(member) = guild_id.member(&http, uid).await else {
                    return false;
                };
                let out = if add {
                    member.add_role(&http, role_id).await
                } else {
                    member.remove_role(&http, role_id).await
                };
                // Audit reason parity is best-effort: serenity role
                // add/remove helpers take no reason parameter.
                let _ = reason;
                out.is_ok()
            }
        })
        .await;
    let desc = fill_work(
        &t(if add {
            "massiverole_add_command_work"
        } else {
            "massiverole_sub_command_work"
        }),
        &ctx.author().to_string(),
        result.success,
        skipped,
        result.failed,
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

/// TS add branch runs for anything but sub/remove/del/off.
pub fn is_add_action(action: &str) -> bool {
    !matches!(
        action.to_ascii_lowercase().as_str(),
        "sub" | "remove" | "del" | "off"
    )
}

/// Fill the `${membersToProcess.length}` progress template.
pub fn fill_progress(template: &str, n: usize) -> String {
    template.replace("${membersToProcess.length}", &n.to_string())
}

/// Fill the `${interaction.user}` / `${a}` / `${s}` / `${e}` / `${role}` work template.
pub fn fill_work(
    template: &str,
    invoker: &str,
    added: usize,
    skipped: usize,
    errors: usize,
    role: &str,
) -> String {
    template
        .replace("${interaction.user}", invoker)
        .replace("${a}", &added.to_string())
        .replace("${s}", &skipped.to_string())
        .replace("${e}", &errors.to_string())
        .replace("${role}", role)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn action_parses_like_ts() {
        assert!(is_add_action("add"));
        assert!(is_add_action("ADD"));
        assert!(is_add_action("whatever"));
        assert!(!is_add_action("sub"));
        assert!(!is_add_action("remove"));
        assert!(!is_add_action("del"));
        assert!(!is_add_action("off"));
    }

    #[test]
    fn templates_fill() {
        assert_eq!(
            fill_progress("Adding to ${membersToProcess.length} members...", 7),
            "Adding to 7 members..."
        );
        assert_eq!(
            fill_work(
                "${interaction.user} ${a}/${s}/${e} ${role}",
                "<@1>",
                2,
                3,
                4,
                "<@&9>"
            ),
            "<@1> 2/3/4 <@&9>"
        );
    }
}
